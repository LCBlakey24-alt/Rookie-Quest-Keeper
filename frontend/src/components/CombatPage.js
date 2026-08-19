import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import CombatPageTable from './CombatPageTable';
import { readOfflineApiResponse } from '@/offline/offlineApiCache';
import { combatStateSnapshot, queueOfflineCombatState } from '@/offline/offlineCombatSyncQueue';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * CombatPageTable owns the live fight UI. This wrapper handles the special case
 * where a GM finishes combat with no network connection. It deliberately does
 * not make every failed mutation queueable: only linked character combat state
 * is stored, and the reconnect manager performs a conflict check before sync.
 */
export default function CombatPage() {
  const { campaignId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const source = location.state?.source || 'campaign-prep';

  useEffect(() => {
    if (!campaignId) return undefined;

    const onCaptureClick = async event => {
      const button = event.target?.closest?.('[title="End combat"]');
      if (!button || navigator.onLine !== false) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      // Loot creation is not in the offline mutation queue yet. Do not let a GM
      // leave the fight and unknowingly discard collected loot.
      if (document.querySelector('.combat-loot-save')) {
        toast.warning('Collected loot is still waiting to be saved. Reconnect before ending this combat so Rookie does not lose it.');
        return;
      }

      let checkpoint = null;
      try {
        checkpoint = JSON.parse(localStorage.getItem(`gm.activeCombat.${campaignId}`) || 'null');
      } catch {}
      const combatants = safeArray(checkpoint?.combatants);
      if (!combatants.length) {
        toast.error('Rookie could not find the local combat checkpoint. Keep this combat open until you reconnect.');
        return;
      }

      const legacyPlayers = combatants.filter(item => item.type === 'player' && !item.character_id && item.legacy_player_id);
      if (legacyPlayers.length) {
        toast.warning('This fight contains an older manual-roster player. Keep combat open until you reconnect so their HP is not lost.');
        return;
      }

      if (!window.confirm('Finish this combat offline? Linked character combat state will be stored on this device and synced after you reconnect.')) return;

      const realCharacters = combatants.filter(item => item.type === 'player' && item.character_id);
      let queued = 0;
      for (const combatant of realCharacters) {
        const characterId = combatant.character_id;
        const cached = await readOfflineApiResponse({ method: 'get', url: `/characters/${characterId}` });
        const baseState = cached?.data || combatant;
        const record = await queueOfflineCombatState({
          campaignId,
          characterId,
          characterName: combatant.name,
          baseState,
          state: combatStateSnapshot(combatant),
        });
        if (record) queued += 1;
      }

      if (realCharacters.length && queued !== realCharacters.length) {
        toast.error('Rookie could not safely store every player combat state. Keep this combat open until you reconnect.');
        return;
      }

      try {
        localStorage.removeItem(`gm.activeCombat.${campaignId}`);
        localStorage.setItem(`gm.pendingCombatDisplayClear.${campaignId}`, '1');
      } catch {}

      await publishCampaignDisplayState(campaignId, createDisplayState('blank', {
        title: 'Combat ended offline',
        subtitle: 'Changes waiting to sync',
      })).catch(() => {});

      toast.warning(queued
        ? `Combat ended offline — ${queued} character state change${queued === 1 ? '' : 's'} queued for sync.`
        : 'Combat ended offline.');
      navigate(source === 'live-play' ? `/gm-screen/${campaignId}` : `/campaign/${campaignId}`, { replace: true });
    };

    // Capture phase stops the table's normal online end handler before it can
    // swallow failed PATCH requests and show a misleading success toast.
    document.addEventListener('click', onCaptureClick, true);
    return () => document.removeEventListener('click', onCaptureClick, true);
  }, [campaignId, navigate, source]);

  return <CombatPageTable />;
}
