import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Bell, CheckCircle2, Dices, X } from 'lucide-react';
import { toast } from 'sonner';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import { getAnimationTarget, parseDiceNotation, rollDiceNotation } from '@/data/diceRoller';
import { DICE_DYES } from '@/components/dice3d/diceDyes';
import { preloadDiceTray3D } from '@/components/dice3d/loadDiceTray3D';
import { loadDiceDyeId, saveDiceDyeId } from '@/lib/diceDyePreference';
import apiClient from '@/lib/apiClient';
import { loadDisplayState, subscribeDisplayState, subscribeRemoteDisplayState } from '@/lib/liveDisplayBus';
import './FloatingDiceRoller.css';
import './FloatingDiceRollerExperience.css';
import { characterIdFromPath } from '@/lib/characterRoute';
import GlobalDiceSelectionWheel from '@/components/dice3d/GlobalDiceSelectionWheel';

const HISTORY_LIMIT = 5;
const DiceDyePicker3D = React.lazy(() => import('@/components/dice3d/DiceDyePicker3D'));

function DiceDyePickerFallback({ selectedId, onSelect }) {
  return (
    <div className="rq-floating-dice__swatches">
      {DICE_DYES.map((dye) => (
        <button
          key={dye.id}
          type="button"
          className="rq-floating-dice__swatch"
          data-rq-colour-swatch="true"
          data-testid={`dice-dye-${dye.id}`}
          aria-pressed={selectedId === dye.id}
          aria-label={dye.name}
          title={dye.name}
          style={{ '--swatch-body': dye.body, '--swatch-ink': dye.ink }}
          onClick={() => onSelect(dye.id)}
        >
          <span aria-hidden="true">20</span>
        </button>
      ))}
    </div>
  );
}

function cleanFormula(value = '') {
  return String(value || '').replace(/\s+/g, '').trim();
}

// Advantage and disadvantage need a single d20 plus optional flat modifiers.
// When the formula on screen is already such an expression, roll that, so a
// player asking for advantage on a +5 check keeps the +5. Anything else --
// 2d6+3, an empty box, a half-typed formula -- falls back to a bare d20,
// because the engine rejects advantage on a multi-dice expression and an
// error toast is no use mid-turn.
function d20ExpressionOrFallback(formula) {
  const parsed = parseDiceNotation(formula);
  if (!parsed.valid) return '1d20';

  const diceTerms = parsed.terms.filter(term => term.type === 'dice');
  const isSingleD20 = diceTerms.length === 1
    && diceTerms[0].sign === 1
    && diceTerms[0].count === 1
    && diceTerms[0].sides === 20
    && !diceTerms[0].keepDrop;

  return isSingleD20 ? parsed.normalizedNotation : '1d20';
}

function describe(result) {
  const diceText = (result.rolls || [])
    .map(roll => `${Number(roll.sign) < 0 ? '−' : ''}d${roll.sides}: ${roll.result}${roll.dropped ? ' dropped' : roll.exploded ? ' exploding' : ''}`)
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
  const [selectedSides, setSelectedSides] = useState(20);
  const [rollMode, setRollMode] = useState('normal');
  const [pickerStage, setPickerStage] = useState('style');
  const [wheelPosition, setWheelPosition] = useState(null);
  const [history, setHistory] = useState([]);
  const [rollFlicker, setRollFlicker] = useState(null);
  const [playerContext, setPlayerContext] = useState(null);
  const [dyeId, setDyeId] = useState(loadDiceDyeId);
  const [displayState, setDisplayState] = useState(null);
  const revealedRollIdsRef = useRef(new Set());
  const isCharacterSheet = Boolean(characterIdFromPath(location.pathname || ''));

  useEffect(() => {
    const openDice = () => {
      setPickerStage('style');
      setOpen(true);
    };
    window.addEventListener('rq-dice-open', openDice);
    return () => window.removeEventListener('rq-dice-open', openDice);
  }, []);

  useEffect(() => {
    // The material wheel is already preparing optional WebGL thumbnails.
    // On Android a second simultaneous 3D scene can stall the first touch.
    // Warm the physical tray after moving to die type, before Roll is pressed.
    if (open && pickerStage === 'type') preloadDiceTray3D();
  }, [open, pickerStage]);

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

  useEffect(() => {
    if (!open) return undefined;
    const positionWheel = () => {
      // From Home, the dice replace the *same* hexagon in exactly the same
      // spot. Elsewhere, they appear as a hexagonal wheel centred on screen.
      const anchor = document.querySelector('.rqk-home-hub .hex-wheel') ||
        document.querySelector('.hex-sheet__wheel-anchor .hex-wheel');
      const bounds = anchor?.getBoundingClientRect();
      // Landscape phones have little height. Scale the wheel *as a whole*
      // instead of cropping it or breaking its geometry into a modal.
      const availableWidth = Math.max(180, window.innerWidth - 24);
      const availableHeightWidth = Math.max(180, (window.innerHeight - 100) * (182 / 208));
      const width = Math.min(420, availableWidth, availableHeightWidth, bounds?.width || 390);
      const height = width * (208 / 182);
      const x = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
      const y = bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, x - width / 2));
      const top = Math.max(48, Math.min(window.innerHeight - height - 52, y - height / 2));
      setWheelPosition({ left, top, '--wheel-width': `${width}px` });
    };
    positionWheel();
    window.addEventListener('resize', positionWheel);
    window.addEventListener('scroll', positionWheel, true);
    return () => {
      window.removeEventListener('resize', positionWheel);
      window.removeEventListener('scroll', positionWheel, true);
    };
  }, [open, location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !rollFlicker) setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, rollFlicker]);

  const latestTotal = history[0]?.total;
  const hasLatestTotal = Number.isFinite(Number(latestTotal));
  const requestedCheck = useMemo(() => activeGroupCheck(displayState, playerContext), [displayState, playerContext]);
  const toggleLabel = useMemo(() => {
    if (requestedCheck) return `Dice roller. GM requested ${requestedCheck.payload.check_name || requestedCheck.payload.title || 'a group check'}`;
    return hasLatestTotal ? `Dice roller. Last roll ${latestTotal}` : 'Open dice roller';
  }, [hasLatestTotal, latestTotal, requestedCheck]);

  const performRoll = (notation, label = notation, options = {}) => {
    const formula = cleanFormula(notation);
    const result = rollDiceNotation(formula, options);
    if (!formula || !result.valid || !result.rolls.length) {
      toast.error('Could not roll dice', {
        description: result.error || `${notation || 'Empty formula'} is not a valid dice formula.`,
      });
      return;
    }

    const rollRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      notation: formula,
      total: result.total,
      detail: describe(result),
    };

    setRollFlicker({
      ...result,
      record: rollRecord,
      rollId: rollRecord.id,
      dyeId: loadDiceDyeId(),
      label: `${label}: ${formula}`,
      animationValue: getAnimationTarget(result),
    });

  };

  const revealRoll = (roll) => {
    const record = roll?.record;
    if (!record || revealedRollIdsRef.current.has(record.id)) return;
    revealedRollIdsRef.current.add(record.id);
    setHistory(current => [record, ...current].slice(0, HISTORY_LIMIT));
    toast(`${record.label}: ${record.total}`, {
      description: record.detail,
      icon: <Dices size={18} />,
      duration: 1400,
    });
  };

  const rollCustom = () => performRoll(customFormula, 'Custom Roll');
  const selectSides = (sides) => {
    setSelectedSides(sides);
    if (sides !== 20) setRollMode('normal');
  };
  const rollSelected = () => {
    if (selectedSides === 20 && rollMode !== 'normal') {
      performRoll(d20ExpressionOrFallback(customFormula), rollMode === 'advantage' ? 'Advantage' : 'Disadvantage', { rollType: rollMode });
      return;
    }
    performRoll(`1d${selectedSides}`, `1d${selectedSides}`);
  };
  const rollRequestedCheck = () => {
    if (!requestedCheck) return;
    const payload = requestedCheck.payload || {};
    const label = payload.check_name || payload.title || 'Requested Check';
    performRoll(payload.notation || '1d20', label);
  };

  return (
    <div className={`rq-floating-dice ${isCharacterSheet ? 'is-character-sheet' : 'is-app-shell'} ${requestedCheck ? 'has-group-check-request' : ''}`} aria-label="Floating dice roller">
      {open && createPortal(
        <div className="rq-dice-wheel-overlay" data-testid="dice-wheel-overlay">
          <button
            type="button"
            className="rq-dice-wheel-overlay__dismiss"
            aria-label="Close dice selection"
            onClick={() => setOpen(false)}
          />
          <section
            className="rq-floating-dice__panel rq-floating-dice__panel--wheel"
            data-testid="dice-roller-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Dice wheel"
            style={wheelPosition || undefined}
          >
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

            <div className="rq-floating-dice__journey" aria-label="3D dice selection">
              <div className="rq-floating-dice__journey-header">
                <span>STEP {pickerStage === 'style' ? '1' : '2'} OF 2</span>
                <strong>{pickerStage === 'style' ? 'Dice material' : 'Die type · Roll mode'}</strong>
                {pickerStage === 'type' && (
                  <button type="button" onClick={() => setPickerStage('style')}>Change style</button>
                )}
              </div>

              {pickerStage === 'style' ? (
                <fieldset className="rq-floating-dice__dyes">
                  <legend className="rq-dice-wheel__screenreader">Turn the wheel freely, then press its centre</legend>
                  <React.Suspense fallback={(
                    <>
                      <DiceDyePickerFallback
                        selectedId={dyeId}
                        onSelect={(id) => setDyeId(saveDiceDyeId(id))}
                      />
                      <button type="button" className="rq-floating-dice__style-next" onClick={() => setPickerStage('type')}>Choose die type</button>
                    </>
                  )}>
                    <DiceDyePicker3D
                      selectedId={dyeId}
                      onSelect={(id) => setDyeId(saveDiceDyeId(id))}
                      onConfirm={() => setPickerStage('type')}
                    />
                  </React.Suspense>
                </fieldset>
              ) : (
                <GlobalDiceSelectionWheel
                  selectedSides={selectedSides}
                  onSidesChange={selectSides}
                  rollMode={rollMode}
                  onRollModeChange={setRollMode}
                  onRoll={rollSelected}
                  dyeId={dyeId}
                />
              )}
            </div>

            <details className="rq-dice-wheel__extras">
              <summary>Custom roll and recent results</summary>
            <div className="rq-floating-dice__custom">
              <input
                data-testid="custom-dice-input"
                aria-label="Custom dice formula"
                value={customFormula}
                onChange={(event) => setCustomFormula(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') rollCustom();
                }}
                placeholder="e.g. 2d6+3 or 4d6kh3"
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
            </details>
          </div>
        </section>
        </div>,
        document.body,
      )}

      <button
        type="button"
        className="rq-floating-dice__toggle"
        data-testid="dice-roller-toggle"
        aria-label={toggleLabel}
        aria-expanded={open}
        onPointerEnter={preloadDiceTray3D}
        onFocus={preloadDiceTray3D}
        onTouchStart={preloadDiceTray3D}
        onClick={() => setOpen(current => !current)}
      >
        <Dices size={25} />
      </button>

      {rollFlicker && (
        <DiceRollFlicker
          key={rollFlicker.rollId}
          rollId={rollFlicker.rollId}
          dyeId={rollFlicker.dyeId}
          isOpen={Boolean(rollFlicker)}
          onClose={() => setRollFlicker(null)}
          onReveal={() => revealRoll(rollFlicker)}
          label={rollFlicker.label}
          rolls={rollFlicker.rolls}
          modifier={rollFlicker.modifier}
          total={rollFlicker.total}
          animationValue={rollFlicker.animationValue}
          isCrit={rollFlicker.isCrit}
          isFumble={rollFlicker.isFumble}
          theme="player"
          shape="hex"
          anchorSelector=".rq-dice-wheel-overlay .guild-wheel__svg"
        />
      )}
    </div>
  );
}
