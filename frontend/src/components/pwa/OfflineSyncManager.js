import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudUpload, Package, RefreshCw, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { getOfflineCacheScope } from '@/offline/offlineApiCache';
import {
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


/** Where a queued combat record reads the character's current combat state. */
export function combatStatePath(record = {}) {
  return `/campaigns/${encodeURIComponent(record.campaignId)}/characters/${encodeURIComponent(record.characterId)}/combat-state`;
}

/** Where a queued combat change is applied, atomically against its baseline. */
export function combatApplyPath(record = {}) {
  return `${combatStatePath(record)}/apply`;
}

/** A request option binding the request to the account that queued the work. */
const asAccount = (scope, options = {}) => ({ ...options, rqkExpectedAuthScope: scope });

/** True when replay must stop: the signed-in account is no longer `scope`. */
const accountChanged = (scope, error = null) => Boolean(error?.rqkAuthScopeChanged) || getOfflineCacheScope() !== scope;

/** The cloud combat state a 409 from the apply endpoint carries, if any. */
const conflictState = (error) => error?.response?.data?.detail?.state || null;

/**
 * Apply one queued combat change for the account that queued it. The server
 * compares the baseline and writes in one step, so a change from another
 * device between the read and the write is reported, not overwritten, and a
 * retry after a lost response is recognised as already applied.
 * Returns 'applied' | 'conflict'; throws on transport errors.
 */
export async function applyQueuedCombatState(record, scope, expected = record.baseState) {
  try {
    await apiClient.post(combatApplyPath(record), { expected, state: record.state }, asAccount(scope, { timeout: 15000 }));
    return { outcome: 'applied' };
  } catch (error) {
    if (error?.response?.status === 409) return { outcome: 'conflict', state: conflictState(error) || {} };
    throw error;
  }
}

export default function OfflineSyncManager() {
  const [records, setRecords] = useState([]);
  const [lootRecords, setLootRecords] = useState([]);
  const [closures, setClosures] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const syncingRef = useRef(false);
  // The account whose queue is on screen; replay and buttons act for it only.
  const scopeRef = useRef(getOfflineCacheScope());

  const load = useCallback(async () => {
    scopeRef.current = getOfflineCacheScope();
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
    // Every request below is bound to this account. A sign-out or account
    // switch at any await stops the replay; the old account's unsent work
    // stays queued under its own account, and is never sent with, removed by
    // or shown to the new one.
    const scope = getOfflineCacheScope();
    try {
      const [queued, queuedLoot, queuedClosures] = await Promise.all([
        listOfflineCombatSyncs(),
        listOfflineCombatLootSyncs(),
        listOfflineCombatClosures(),
      ]);

      let stopped = false;
      for (const record of queued.filter(item => item.status !== 'conflict' && (item.scope ?? scope) === scope)) {
        if (accountChanged(scope)) { stopped = true; break; }
        try {
          // Through the campaign: the owner or the character's GM may apply.
          const result = await applyQueuedCombatState(record, scope);
          if (accountChanged(scope)) { stopped = true; break; }
          if (result.outcome === 'conflict') {
            await markOfflineCombatConflict(record.key, result.state, 'Cloud combat state changed while this device was offline.');
            continue;
          }
          await removeOfflineCombatSync(record.key);
        } catch (error) {
          if (accountChanged(scope, error)) { stopped = true; break; }
          if (!error?.response || error?.response?.status === 401) break;
          await markOfflineCombatError(record.key, error?.response?.data?.detail || error?.message || 'Sync failed');
        }
      }

      for (const record of stopped ? [] : queuedLoot.filter(item => (item.scope ?? scope) === scope)) {
        if (accountChanged(scope)) { stopped = true; break; }
        try {
          await apiClient.post(
            `/campaigns/${record.campaignId}/inventory/offline-sync`,
            { operation_id: record.operationId, item: record.item },
            asAccount(scope, { timeout: 15000 })
          );
          if (accountChanged(scope)) { stopped = true; break; }
          await apiClient.get(`/campaigns/${record.campaignId}/inventory`, asAccount(scope, { timeout: 15000 })).catch(() => null);
          await removeOfflineCombatLootSync(record.key);
        } catch (error) {
          if (accountChanged(scope, error)) { stopped = true; break; }
          if (!error?.response || error?.response?.status === 401) break;
          await markOfflineCombatLootError(record.key, error?.response?.data?.detail || error?.message || 'Loot sync failed');
        }
      }

      // Closing the shared combat display is independent of character conflicts
      // or a loot retry. The fight is over even if one record still needs work.
      for (const record of stopped ? [] : queuedClosures.filter(item => (item.scope ?? scope) === scope)) {
        if (accountChanged(scope)) break;
        const displayRevision = Number(record.displayState?.sequence);
        if (!Number.isSafeInteger(displayRevision) || displayRevision <= 0) {
          // An older queue record had no creation-time revision. Publishing
          // a newly timestamped "combat ended" state here could overwrite a
          // newer battle. Do not clear newer initiative submissions either.
          await removeOfflineCombatClose(record.key);
          toast.warning('Legacy combat display cleanup skipped to protect the current battle');
          continue;
        }
        try {
          await apiClient.put(
            `/campaigns/${record.campaignId}/display-state`,
            record.displayState,
            asAccount(scope, { timeout: 15000 })
          );
          if (accountChanged(scope)) break;
          await apiClient.delete(`/campaigns/${record.campaignId}/combat-initiative/submissions`, asAccount(scope, { timeout: 15000 }));
          if (accountChanged(scope)) break;
          await apiClient.get(`/campaigns/${record.campaignId}/display-state`, asAccount(scope, { timeout: 15000 })).catch(() => null);
          await removeOfflineCombatClose(record.key);
          toast.success('Offline combat cleanup synced');
        } catch (error) {
          if (accountChanged(scope, error)) break;
          if (!error?.response || error?.response?.status === 401) break;
          if (error.response.status === 409) {
            // A newer combat/scene already owns the display. This old
            // closure is obsolete: never delete the new fight's initiative,
            // and don't retry it indefinitely on each reconnect.
            await removeOfflineCombatClose(record.key);
            toast.info('Skipped outdated combat display cleanup; a newer display is active');
            continue;
          }
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

  // After a sign-out or account switch, show only the new account's queue.
  useEffect(() => {
    const check = () => { if (scopeRef.current !== getOfflineCacheScope()) load(); };
    const timer = window.setInterval(check, 2000);
    window.addEventListener('storage', check);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', check);
      window.removeEventListener('focus', check);
    };
  }, [load]);

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

  // Manual conflict actions act only for the account whose queue is shown.
  const shownAccountChanged = () => scopeRef.current !== getOfflineCacheScope();

  const keepCloud = async record => {
    if (shownAccountChanged() || (record.scope ?? scopeRef.current) !== scopeRef.current) { await load(); return; }
    await removeOfflineCombatSync(record.key);
    await load();
    toast.success(`${record.characterName}: kept cloud combat state`);
  };

  const applyOffline = async record => {
    if (!online) {
      toast.error('Reconnect before applying the offline combat state');
      return;
    }
    if (shownAccountChanged() || (record.scope ?? scopeRef.current) !== scopeRef.current) { await load(); return; }
    const scope = scopeRef.current;
    if (!window.confirm(`Apply the offline combat state for ${record.characterName} over the newer cloud combat state?`)) return;
    try {
      // Over the cloud state shown in the conflict, and only if it is still that.
      const result = await applyQueuedCombatState(record, scope, record.serverState || record.baseState);
      if (accountChanged(scope)) { await load(); return; }
      if (result.outcome === 'conflict') {
        await markOfflineCombatConflict(record.key, result.state, 'Cloud combat state changed again.');
        await load();
        toast.error(`${record.characterName}: the cloud changed again. Check it and choose again.`);
        return;
      }
      await removeOfflineCombatSync(record.key);
      await load();
      toast.success(`${record.characterName}: offline combat state applied`);
    } catch (error) {
      if (accountChanged(scope, error)) { await load(); return; }
      toast.error(error?.response?.data?.detail?.message || error?.response?.data?.detail || 'Could not apply offline combat state');
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
