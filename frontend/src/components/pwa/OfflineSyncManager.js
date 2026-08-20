import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudUpload, Package, RefreshCw, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import {
  combatStateSnapshot,
  combatStatesMatch,
  listOfflineCombatClosures,
  listOfflineCombatLootSyncs,
  listOfflineCombatSyncs,
  markOfflineCombatCloseError,
  markOfflineCombatConflict,
  markOfflineCombatError,
  markOfflineCombatLootError,
  removeOfflineCombatClose,
  removeOfflineCombatLootSync,
  removeOfflineCombatSync,
} from '@/offline/offlineCombatSyncQueue';
import '@/styles/offlineSyncManager.css';

export default function OfflineSyncManager() {
  const [records, setRecords] = useState([]);
  const [lootRecords, setLootRecords] = useState([]);
  const [closures, setClosures] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const syncingRef = useRef(false);

  const load = useCallback(async () => {
    const [nextRecords, nextLoot, nextClosures] = await Promise.all([
      listOfflineCombatSyncs(),
      listOfflineCombatLootSyncs(),
      listOfflineCombatClosures(),
    ]);
    setRecords(nextRecords);
    setLootRecords(nextLoot);
    setClosures(nextClosures);
    return { records: nextRecords, loot: nextLoot, closures: nextClosures };
  }, []);

  const syncPending = useCallback(async () => {
    if (navigator.onLine === false || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const [queued, queuedLoot, queuedClosures] = await Promise.all([
        listOfflineCombatSyncs(),
        listOfflineCombatLootSyncs(),
        listOfflineCombatClosures(),
      ]);

      for (const record of queued.filter(item => item.status !== 'conflict')) {
        try {
          const currentResponse = await apiClient.get(`/characters/${record.characterId}`, { timeout: 15000 });
          if (currentResponse?.rqkOffline) break;
          const cloudState = combatStateSnapshot(currentResponse.data || {});
          if (!combatStatesMatch(cloudState, record.baseState)) {
            await markOfflineCombatConflict(
              record.key,
              cloudState,
              'Cloud combat state changed while this device was offline.'
            );
            continue;
          }

          await apiClient.patch(`/characters/${record.characterId}`, record.state, { timeout: 15000 });
          await apiClient.get(`/characters/${record.characterId}`, { timeout: 15000 }).catch(() => null);
          await removeOfflineCombatSync(record.key);
        } catch (error) {
          if (!error?.response || error?.response?.status === 401) break;
          await markOfflineCombatError(record.key, error?.response?.data?.detail || error?.message || 'Sync failed');
        }
      }

      for (const record of queuedLoot) {
        try {
          await apiClient.post(
            `/campaigns/${record.campaignId}/inventory/offline-sync`,
            { operation_id: record.operationId, item: record.item },
            { timeout: 15000 }
          );
          await apiClient.get(`/campaigns/${record.campaignId}/inventory`, { timeout: 15000 }).catch(() => null);
          await removeOfflineCombatLootSync(record.key);
        } catch (error) {
          if (!error?.response || error?.response?.status === 401) break;
          await markOfflineCombatLootError(record.key, error?.response?.data?.detail || error?.message || 'Loot sync failed');
        }
      }

      // Closing the shared combat display is independent of character conflicts
      // or a loot retry. The fight is over even if one record still needs work.
      for (const record of queuedClosures) {
        try {
          await apiClient.put(
            `/campaigns/${record.campaignId}/display-state`,
            record.displayState || { mode: 'blank', payload: { title: 'Combat ended', subtitle: 'Waiting for the GM' } },
            { timeout: 15000 }
          );
          await apiClient.delete(`/campaigns/${record.campaignId}/combat-initiative/submissions`, { timeout: 15000 });
          await apiClient.get(`/campaigns/${record.campaignId}/display-state`, { timeout: 15000 }).catch(() => null);
          await removeOfflineCombatClose(record.key);
          toast.success('Offline combat cleanup synced');
        } catch (error) {
          if (!error?.response || error?.response?.status === 401) break;
          await markOfflineCombatCloseError(record.key, error?.response?.data?.detail || error?.message || 'Combat cleanup failed');
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await load();
    }
  }, [load]);

  const hasAutoSyncWork = useCallback(next => (
    next.records.some(item => item.status !== 'conflict') || next.loot.length > 0 || next.closures.length > 0
  ), []);

  useEffect(() => {
    load().then(next => {
      if (navigator.onLine && hasAutoSyncWork(next)) syncPending();
    });
  }, [hasAutoSyncWork, load, syncPending]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      syncPending();
    };
    const onOffline = () => setOnline(false);
    const onQueued = () => {
      load().then(next => {
        if (navigator.onLine && hasAutoSyncWork(next)) syncPending();
      });
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('rqk:offline-sync-queued', onQueued);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('rqk:offline-sync-queued', onQueued);
    };
  }, [hasAutoSyncWork, load, syncPending]);

  const conflicts = useMemo(() => records.filter(item => item.status === 'conflict'), [records]);
  const pendingCombat = records.length - conflicts.length;
  const pending = pendingCombat + lootRecords.length + closures.length;
  const total = records.length + lootRecords.length + closures.length;

  if (!total) return null;

  const keepCloud = async record => {
    await removeOfflineCombatSync(record.key);
    await load();
    toast.success(`${record.characterName}: kept cloud combat state`);
  };

  const applyOffline = async record => {
    if (!online) {
      toast.error('Reconnect before applying the offline combat state');
      return;
    }
    if (!window.confirm(`Apply the offline combat state for ${record.characterName} over the newer cloud combat state?`)) return;
    try {
      await apiClient.patch(`/characters/${record.characterId}`, record.state, { timeout: 15000 });
      await apiClient.get(`/characters/${record.characterId}`, { timeout: 15000 }).catch(() => null);
      await removeOfflineCombatSync(record.key);
      await load();
      toast.success(`${record.characterName}: offline combat state applied`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not apply offline combat state');
    }
  };

  return (
    <div className="rqk-sync-control" data-open={open ? 'true' : 'false'}>
      {open && (
        <section className="rqk-sync-card" aria-label="Offline changes">
          <header>
            <span><CloudUpload size={16} /><strong>Offline Changes</strong></span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close offline changes"><X size={14} /></button>
          </header>
          <div className="rqk-sync-card__body">
            {pending > 0 && (
              <div className="rqk-sync-summary" data-tone="pending">
                {syncing ? <RefreshCw size={15} className="rqk-sync-spin" /> : <CloudUpload size={15} />}
                <span><strong>{syncing ? 'Syncing offline changes…' : `${pending} change${pending === 1 ? '' : 's'} waiting`}</strong><small>{online ? 'Rookie will sync safe changes automatically.' : 'They will sync after this device reconnects.'}</small></span>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="rqk-sync-summary" data-tone="conflict">
                <AlertTriangle size={15} />
                <span><strong>{conflicts.length} change{conflicts.length === 1 ? '' : 's'} need a decision</strong><small>The cloud character changed while this device was offline, so Rookie did not overwrite it.</small></span>
              </div>
            )}

            <div className="rqk-sync-list">
              {records.map(record => (
                <article key={record.key} data-conflict={record.status === 'conflict' ? 'true' : 'false'}>
                  <span className="rqk-sync-character"><Swords size={14} /><span><strong>{record.characterName}</strong><small>{record.status === 'conflict' ? 'Conflict · combat state not applied' : 'Combat state queued'}</small></span></span>
                  {record.status === 'conflict' && (
                    <div className="rqk-sync-compare">
                      <span><small>Cloud HP</small><strong>{record.serverState?.current_hit_points ?? '?'}</strong></span>
                      <span><small>Offline HP</small><strong>{record.state?.current_hit_points ?? '?'}</strong></span>
                    </div>
                  )}
                  {record.status === 'conflict' ? (
                    <div className="rqk-sync-actions">
                      <button type="button" onClick={() => keepCloud(record)}><CheckCircle2 size={13} /> Keep Cloud</button>
                      <button type="button" className="rqk-sync-apply" onClick={() => applyOffline(record)} disabled={!online}><CloudUpload size={13} /> Apply Offline</button>
                    </div>
                  ) : (
                    <small className="rqk-sync-waiting">{record.lastError || (online ? 'Waiting for sync attempt…' : 'Stored safely on this device.')}</small>
                  )}
                </article>
              ))}

              {lootRecords.map(record => (
                <article key={record.key}>
                  <span className="rqk-sync-character"><Package size={14} /><span><strong>{record.itemName || 'Combat loot'}</strong><small>Party loot queued</small></span></span>
                  <small className="rqk-sync-waiting">{record.lastError || (online ? 'Waiting for sync attempt…' : 'Stored safely on this device.')}</small>
                </article>
              ))}

              {closures.map(record => (
                <article key={record.key}>
                  <span className="rqk-sync-character"><Swords size={14} /><span><strong>Finish combat cleanup</strong><small>Player display + initiative submissions · campaign {record.campaignId}</small></span></span>
                  <small className="rqk-sync-waiting">{record.lastError || (online ? 'Waiting for sync attempt…' : 'Stored safely on this device.')}</small>
                </article>
              ))}
            </div>

            {online && pending > 0 && !syncing && (
              <button type="button" className="rqk-sync-retry" onClick={syncPending}><RefreshCw size={13} /> Sync Now</button>
            )}
          </div>
        </section>
      )}

      <button type="button" className="rqk-sync-launcher" data-conflict={conflicts.length > 0 ? 'true' : 'false'} onClick={() => setOpen(value => !value)}>
        {conflicts.length > 0 ? <AlertTriangle size={15} /> : syncing ? <RefreshCw size={15} className="rqk-sync-spin" /> : <CloudUpload size={15} />}
        <span>{conflicts.length > 0 ? `${conflicts.length} Sync Conflict${conflicts.length === 1 ? '' : 's'}` : `${total} Offline Change${total === 1 ? '' : 's'}`}</span>
      </button>
    </div>
  );
}
