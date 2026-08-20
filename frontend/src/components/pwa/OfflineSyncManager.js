import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudUpload, RefreshCw, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import {
  combatStateSnapshot,
  combatStatesMatch,
  listOfflineCombatClosures,
  listOfflineCombatSyncs,
  markOfflineCombatCloseError,
  markOfflineCombatConflict,
  markOfflineCombatError,
  removeOfflineCombatClose,
  removeOfflineCombatSync,
} from '@/offline/offlineCombatSyncQueue';
import '@/styles/offlineSyncManager.css';

export default function OfflineSyncManager() {
  const [records, setRecords] = useState([]);
  const [closures, setClosures] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const syncingRef = useRef(false);

  const load = useCallback(async () => {
    const [nextRecords, nextClosures] = await Promise.all([
      listOfflineCombatSyncs(),
      listOfflineCombatClosures(),
    ]);
    setRecords(nextRecords);
    setClosures(nextClosures);
    return { records: nextRecords, closures: nextClosures };
  }, []);

  const syncPending = useCallback(async () => {
    if (navigator.onLine === false || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const [queued, queuedClosures] = await Promise.all([
        listOfflineCombatSyncs(),
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

      // Closing the shared combat display is independent of character conflicts.
      // A fight is over even when one character needs a manual cloud/offline choice.
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

  useEffect(() => {
    load().then(next => {
      if (navigator.onLine && (
        next.records.some(item => item.status !== 'conflict') || next.closures.length > 0
      )) syncPending();
    });
  }, [load, syncPending]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      syncPending();
    };
    const onOffline = () => setOnline(false);
    const onQueued = () => {
      load().then(next => {
        if (navigator.onLine && (
          next.records.some(item => item.status !== 'conflict') || next.closures.length > 0
        )) syncPending();
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
  }, [load, syncPending]);

  const conflicts = useMemo(() => records.filter(item => item.status === 'conflict'), [records]);
  const pendingCombat = records.length - conflicts.length;
  const pending = pendingCombat + closures.length;
  const total = records.length + closures.length;

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
