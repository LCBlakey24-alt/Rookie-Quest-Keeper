import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Dice6, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { subscribeRemoteDisplayState } from '@/lib/liveDisplayBus';
import { normaliseRollEvent, recordSessionRoll } from '@/lib/sessionRollStats';
import {
  findGroupCheckResult,
  findTargetedCharacter,
  formatSigned,
  modifierForGroupCheck,
} from './playerGroupCheckUtils';
import '@/styles/playerGroupCheckPrompt.css';

export default function PlayerGroupCheckPrompt({ campaignId, characters = [] }) {
  const [displayState, setDisplayState] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [localResult, setLocalResult] = useState(null);

  useEffect(() => {
    if (!campaignId) return undefined;
    return subscribeRemoteDisplayState(campaignId, setDisplayState);
  }, [campaignId]);

  const payload = displayState?.mode === 'group-check' ? displayState.payload || {} : null;
  const character = useMemo(
    () => payload ? findTargetedCharacter(characters, payload) : null,
    [characters, payload],
  );
  const remoteResult = useMemo(
    () => payload && character ? findGroupCheckResult(character, payload) : null,
    [payload, character],
  );
  const result = remoteResult || localResult;
  const rollInfo = useMemo(
    () => character && payload ? modifierForGroupCheck(character, payload) : { modifier: 0, ability: '' },
    [character, payload],
  );

  useEffect(() => {
    if (!payload || !character) {
      setLocalResult(null);
      return;
    }
    const activeId = payload.group_check_id || payload.id;
    if (localResult?.group_check_id && localResult.group_check_id !== activeId) setLocalResult(null);
  }, [payload, character, localResult]);

  if (!payload || !character || payload.status === 'closed') return null;

  const checkName = payload.check_name || String(payload.title || 'Requested').replace(/\s+Check$/i, '');
  const groupCheckId = payload.group_check_id || payload.id;
  const requestedRollId = payload.id || groupCheckId;

  const roll = async () => {
    if (rolling || result || !groupCheckId) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const modifier = Number(rollInfo.modifier) || 0;
    const total = d20 + modifier;
    const event = normaliseRollEvent({
      actor: character.name || character.character_name || 'Player',
      actor_type: 'player',
      character_id: character.id || character.character_id || '',
      character_name: character.name || character.character_name || 'Player',
      group_check_id: groupCheckId,
      requested_roll_id: requestedRollId,
      check_name: checkName,
      label: `${checkName} Check`,
      notation: `1d20${modifier ? formatSigned(modifier) : ''}`,
      total,
      modifier,
      rolls: [{ sides: 20, result: d20, dropped: false }],
      visibleRolls: [{ sides: 20, result: d20, dropped: false }],
      isCrit: d20 === 20,
      isFumble: d20 === 1,
    });

    setRolling(true);
    setLocalResult(event);
    recordSessionRoll(campaignId, event);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/roll-events`, event);
      if (response?.data) setLocalResult(response.data);
      toast.success(`${checkName}: ${total}`, {
        description: `d20 ${d20}${modifier ? ` ${formatSigned(modifier)}` : ''}${payload.dc ? ` · DC ${payload.dc}` : ''}`,
      });
    } catch (error) {
      setLocalResult(null);
      toast.error(error?.response?.data?.detail || 'Could not send your roll to the GM');
    } finally {
      setRolling(false);
    }
  };

  return (
    <section className="player-group-check" aria-live="polite" data-testid="player-group-check-prompt">
      <div className="player-group-check__icon"><Dice6 size={20} aria-hidden="true" /></div>
      <div className="player-group-check__copy">
        <span>GM roll request</span>
        <h3>{checkName} Check</h3>
        <p>
          Roll for <strong>{character.name || character.character_name || 'your character'}</strong>
          {rollInfo.ability ? ` · ${rollInfo.ability.slice(0, 3).toUpperCase()} ${formatSigned(rollInfo.modifier)}` : ` · ${formatSigned(rollInfo.modifier)}`}
          {payload.dc ? ` · DC ${payload.dc}` : ''}
        </p>
      </div>

      {result ? (
        <div className="player-group-check__result" data-testid="player-group-check-result">
          <CheckCircle2 size={17} aria-hidden="true" />
          <div><span>Submitted</span><strong>{result.total}</strong></div>
        </div>
      ) : (
        <button type="button" onClick={roll} disabled={rolling} className="player-group-check__roll">
          {rolling ? <Loader2 className="player-group-check__spin" size={17} aria-hidden="true" /> : <Dice6 size={17} aria-hidden="true" />}
          {rolling ? 'Sending…' : `Roll ${checkName}`}
        </button>
      )}
    </section>
  );
}
