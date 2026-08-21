import apiClient from '@/lib/apiClient';
import { listOfflineCombatSyncs } from '@/offline/offlineCombatSyncQueue';

const safeArray = value => Array.isArray(value) ? value : [];

export function overlayQueuedCombatStateOnParty(party, records, campaignId) {
  const campaignKey = String(campaignId || '');
  const byCharacter = new Map(
    safeArray(records)
      .filter(record => String(record?.campaignId || '') === campaignKey && record?.characterId && record?.state)
      .map(record => [String(record.characterId), record.state])
  );

  if (!byCharacter.size) return safeArray(party);

  return safeArray(party).map(player => {
    const characterId = player?.character_id || (player?.source === 'character' ? player?.id : null);
    const state = characterId ? byCharacter.get(String(characterId)) : null;
    if (!state) return player;

    const tempHp = Math.max(0, Number(state.temporary_hit_points || 0));
    return {
      ...player,
      hp: Math.max(0, Number(state.current_hit_points || 0)),
      current_hp: Math.max(0, Number(state.current_hit_points || 0)),
      current_hit_points: Math.max(0, Number(state.current_hit_points || 0)),
      temporary_hit_points: tempHp,
      temp_hp: tempHp,
      conditions: safeArray(state.conditions),
      death_saves_successes: Math.max(0, Number(state.death_saves_successes || 0)),
      death_saves_failures: Math.max(0, Number(state.death_saves_failures || 0)),
      concentrating_on: String(state.concentrating_on || ''),
      rqk_pending_combat_sync: true,
    };
  });
}

let installed = false;

export function installQueuedCombatPartyOverlay() {
  if (installed || !apiClient?.interceptors?.response) return;
  installed = true;

  apiClient.interceptors.response.use(async response => {
    try {
      const url = String(response?.config?.url || '');
      const match = url.match(/\/campaigns\/([^/?#]+)\/live-party(?:[/?#]|$)/);
      if (!match || !Array.isArray(response?.data)) return response;

      const campaignId = decodeURIComponent(match[1]);
      const queued = await listOfflineCombatSyncs();
      const data = overlayQueuedCombatStateOnParty(response.data, queued, campaignId);
      return { ...response, data };
    } catch {
      // The queue overlay is a continuity enhancement. Never make the party
      // feed unusable if IndexedDB is unavailable or a local record is corrupt.
      return response;
    }
  });
}
