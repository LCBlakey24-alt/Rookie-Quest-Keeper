import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, CheckCircle2, Dices, Smartphone, Sparkles, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import { getAnimationTarget, rollDiceNotation } from '@/data/diceRoller';
import apiClient from '@/lib/apiClient';
import { loadDisplayState, subscribeDisplayState, subscribeRemoteDisplayState } from '@/lib/liveDisplayBus';
import { DICE_ROLLER_MODES, diceRollerModeLabel, loadDiceRollerMode, saveDiceRollerMode } from '@/lib/diceRollerPreferences';
import './FloatingDiceRoller.css';
import './FloatingDiceRollerMode.css';
import './FloatingDiceRollerExperience.css';

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];
const HISTORY_LIMIT = 5;

function cleanFormula(value = '') {
  return String(value || '').replace(/\s+/g, '').trim();
}

function describe(result) {
  const diceText = (result.rolls || [])
    .map(roll => `d${roll.sides}: ${roll.result}${roll.dropped ? ' dropped' : roll.exploded ? ' exploding' : ''}`)
    .join(' • ');
  const modifierText = result.modifier ? ` ${result.modifier > 0 ? '+' : '-'} ${Math.abs(result.modifier)}` : '';
  return `${diceText}${modifierText} = ${result.total}`;
}

function cleanKey(value) {
  return String(value || '').trim().toLowerCase();
}

function identityKeys(value = {}) {
  return [
    value.id,
    value.character_id,
    value.characterId,
    value.player_id,
    value.playerId,
    value.user_id,
    value.userId,
    value.name,
    value.character_name,
    value.characterName,
    value.display_name,
    value.displayName,
    value.playerName,
    value.player_name,
    value.actor,
  ].map(cleanKey).filter(Boolean);
}

function identitiesOverlap(left = {}, right = {}) {
  const leftKeys = new Set(identityKeys(left));
  return identityKeys(right).some(key => leftKeys.has(key));
}

function campaignIdFromPath(pathname = '') {
  const match = pathname.match(/\/campaigns?\/([^/]+)/i);
  return match?.[1] || '';
}

function characterIdFromPath(pathname = '') {
  const match = pathname.match(/\/characters\/([^/]+)/i);
  return match?.[1] || '';
}

function activeGroupCheck(displayState, playerContext) {
  if (displayState?.mode !== 'group-check') return null;
  const payload = displayState.payload || {};
  if (payload.status === 'closed') return null;
  const party = Array.isArray(payload.party) ? payload.party : [];
  const results = Array.isArray(payload.results) ? payload.results : [];
  const hasPlayerContext = Boolean(playerContext?.characterId || playerContext?.characterName);
  const playerTargeted = !hasPlayerContext || party.length === 0 || party.some(player => identitiesOverlap(player, playerContext));
  if (!playerTargeted) return null;
  return {
    payload,
    hasRolled: hasPlayerContext && results.some(result => identitiesOverlap(result, playerContext)),
  };
}

export default function FloatingDiceRoller() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [customFormula, setCustomFormula] = useState('2d6+3');
  const [history, setHistory] = useState([]);
  const [rollFlicker, setRollFlicker] = useState(null);
  const [rollMode, setRollMode] = useState(loadDiceRollerMode);
  const [playerContext, setPlayerContext] = useState(null);
  const [displayState, setDisplayState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const pathname = location.pathname || '';
    const characterId = characterIdFromPath(pathname);
    const pathCampaignId = campaignIdFromPath(pathname);

    if (!characterId) {
      setPlayerContext(pathCampaignId ? { campaignId: pathCampaignId, characterId: '', characterName: '' } : null);
      return () => { cancelled = true; };
    }

    apiClient.get(`/characters/${characterId}`).then(response => {
      if (cancelled) return;
      const character = response.data || {};
      const campaignId = character.campaign_id || character.campaignId || character.campaign?.id || character.current_campaign_id || '';
      setPlayerContext({
        campaignId,
        characterId: character.id || characterId,
        character_id: character.id || characterId,
        characterName: character.name || character.character_name || '',
        character_name: character.name || character.character_name || '',
        name: character.name || character.character_name || '',
      });
    }).catch(() => {
      if (!cancelled) setPlayerContext(null);
    });

    return () => { cancelled = true; };
  }, [location.pathname]);

  useEffect(() => {
    const campaignId = playerContext?.campaignId;
    if (!campaignId) {
      setDisplayState(null);
      return undefined;
    }
    setDisplayState(loadDisplayState(campaignId));
    const unsubscribeLocal = subscribeDisplayState(campaignId, setDisplayState);
    const unsubscribeRemote = subscribeRemoteDisplayState(campaignId, setDisplayState);
    return () => { unsubscribeLocal(); unsubscribeRemote(); };
  }, [playerContext?.campaignId]);

  const latestTotal = history[0]?.total;
  const hasLatestTotal = Number.isFinite(Number(latestTotal));
  const requestedCheck = useMemo(() => activeGroupCheck(displayState, playerContext), [displayState, playerContext]);
  const toggleLabel = useMemo(() => {
    if (requestedCheck) return `Dice roller. GM requested ${requestedCheck.payload.check_name || requestedCheck.payload.title || 'a group check'}`;
    return hasLatestTotal ? `Dice roller. Last roll ${latestTotal}` : 'Open dice roller';
  }, [hasLatestTotal, latestTotal, requestedCheck]);

  const chooseRollMode = (mode) => {
    const savedMode = saveDiceRollerMode(mode);
    setRollMode(savedMode);
    toast.success(`Dice mode set to ${diceRollerModeLabel(savedMode)}`, {
      description: savedMode === DICE_ROLLER_MODES.TWO_D
        ? 'Lighter 2D rolls for phones, tablets, low-power devices, or reduced motion.'
        : 'Full cinematic dice formation for devices that can handle more animation.',
      duration: 1800,
    });
  };

  const performRoll = (notation, label = notation, options = {}) => {
    const formula = cleanFormula(notation);
    const result = rollDiceNotation(formula, options);
    if (!formula || !result.rolls.length) {
      toast.error('Could not roll dice', { description: `${notation || 'Empty formula'} is not a valid dice formula.` });
      return;
    }

    const rollRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      notation: formula,
      total: result.total,
      detail: describe(result),
    };

    setHistory(current => [rollRecord, ...current].slice(0, HISTORY_LIMIT));
    setRollFlicker({
      ...result,
      label: `${label}: ${formula}`,
      animationValue: getAnimationTarget(result),
      rollMode,
    });

    toast(`${label}: ${result.total}`, {
      description: `${describe(result)} · ${diceRollerModeLabel(rollMode)}`,
      icon: <Dices size={18} />,
      duration: 1400,
    });
  };

  const rollCustom = () => performRoll(customFormula, 'Custom Roll');
  const rollRequestedCheck = () => {
    if (!requestedCheck) return;
    const payload = requestedCheck.payload || {};
    const label = payload.check_name || payload.title || 'Requested Check';
    performRoll(payload.notation || '1d20', label);
  };

  return (
    <div className={`rq-floating-dice ${requestedCheck ? 'has-group-check-request' : ''}`} aria-label="Floating dice roller">
      {open && (
        <section className="rq-floating-dice__panel" data-testid="dice-roller-panel" aria-label="Dice roller panel">
          <header className="rq-floating-dice__header">
            <div className="rq-floating-dice__title">
              <strong>DICE ROLLER</strong>
              <span>Quick rolls for checks, saves, damage, and table chaos.</span>
            </div>
            <button type="button" className="rq-floating-dice__close" data-testid="dice-roller-close" aria-label="Close dice roller" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </header>

          <div className="rq-floating-dice__body">
            {requestedCheck && (
              <div className="rq-floating-dice__group-check" data-testid="dice-group-check-request">
                <div>
                  <span><Bell size={14} /> GM requested</span>
                  <strong>{requestedCheck.payload.check_name || requestedCheck.payload.title || 'Group Check'}</strong>
                  <small>{requestedCheck.payload.ability || 'Ability check'}{requestedCheck.payload.dc ? ` · DC ${requestedCheck.payload.dc}` : ''}</small>
                </div>
                <button type="button" onClick={rollRequestedCheck} data-testid="roll-requested-check-btn">
                  {requestedCheck.hasRolled ? <CheckCircle2 size={14} /> : <Dices size={14} />}
                  {requestedCheck.hasRolled ? 'Reroll' : 'Roll now'}
                </button>
              </div>
            )}

            <div className="rq-floating-dice__render-mode" data-testid="dice-render-mode-selector" aria-label="Dice render mode">
              <div>
                <span><Smartphone size={14} /> Render mode</span>
                <small>{rollMode === DICE_ROLLER_MODES.TWO_D ? 'Performance-safe rolling' : 'Full cinematic rolling'}</small>
              </div>
              <div className="rq-floating-dice__mode-toggle" role="group" aria-label="Choose 2D or 3D dice animation">
                <button
                  type="button"
                  className={rollMode === DICE_ROLLER_MODES.TWO_D ? 'is-active' : ''}
                  data-testid="dice-mode-2d"
                  aria-pressed={rollMode === DICE_ROLLER_MODES.TWO_D}
                  onClick={() => chooseRollMode(DICE_ROLLER_MODES.TWO_D)}
                >
                  2D Lite
                </button>
                <button
                  type="button"
                  className={rollMode === DICE_ROLLER_MODES.THREE_D ? 'is-active' : ''}
                  data-testid="dice-mode-3d"
                  aria-pressed={rollMode === DICE_ROLLER_MODES.THREE_D}
                  onClick={() => chooseRollMode(DICE_ROLLER_MODES.THREE_D)}
                >
                  3D
                </button>
              </div>
            </div>

            <div className="rq-floating-dice__quick-grid" aria-label="Quick dice buttons">
              {QUICK_DICE.map(sides => (
                <button
                  key={sides}
                  type="button"
                  className="rq-floating-dice__button"
                  data-testid={`roll-d${sides}-btn`}
                  onClick={() => performRoll(`1d${sides}`, `1d${sides}`)}
                >
                  d{sides}
                </button>
              ))}
            </div>

            <div className="rq-floating-dice__modes">
              <button type="button" className="rq-floating-dice__mode" data-testid="roll-advantage-btn" onClick={() => performRoll('1d20', 'Advantage', { rollType: 'advantage' })}>
                <Swords size={15} /> Advantage
              </button>
              <button type="button" className="rq-floating-dice__mode" data-testid="roll-disadvantage-btn" onClick={() => performRoll('1d20', 'Disadvantage', { rollType: 'disadvantage' })}>
                <Sparkles size={15} /> Disadvantage
              </button>
            </div>

            <div className="rq-floating-dice__custom">
              <input
                data-testid="custom-dice-input"
                aria-label="Custom dice formula"
                value={customFormula}
                onChange={(event) => setCustomFormula(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') rollCustom();
                }}
                placeholder="e.g. 2d6+3"
              />
              <button type="button" className="rq-floating-dice__custom-button" data-testid="custom-roll-btn" onClick={rollCustom}>Roll</button>
            </div>

            <div className="rq-floating-dice__history" aria-label="Recent dice results">
              <span className="rq-floating-dice__history-title">Recent results</span>
              {history.length === 0 ? (
                <div className="rq-floating-dice__empty">No rolls yet — pick a die and let fate start gossiping.</div>
              ) : history.map(item => (
                <div key={item.id} className="rq-floating-dice__result" data-testid="roll-result" title={item.detail}>
                  <span>{item.notation} · {item.label}</span>
                  <strong>{item.total}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        className="rq-floating-dice__toggle"
        data-testid="dice-roller-toggle"
        aria-label={toggleLabel}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <Dices size={25} />
      </button>

      {rollFlicker && (
        <DiceRollFlicker
          isOpen={Boolean(rollFlicker)}
          onClose={() => setRollFlicker(null)}
          label={rollFlicker.label}
          rolls={rollFlicker.rolls}
          modifier={rollFlicker.modifier}
          total={rollFlicker.total}
          animationValue={rollFlicker.animationValue}
          isCrit={rollFlicker.isCrit}
          isFumble={rollFlicker.isFumble}
          theme="player"
          rollMode={rollFlicker.rollMode}
        />
      )}
    </div>
  );
}
