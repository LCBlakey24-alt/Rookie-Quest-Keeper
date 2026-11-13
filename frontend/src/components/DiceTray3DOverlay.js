import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, X } from 'lucide-react';

import FlatDiceResultOverlay from '@/components/FlatDiceResultOverlay';
import { createDiceTray, expandPercentileDice, specForDie } from '@/components/dice3d/diceTrayScene';
import { seedFromKey } from '@/components/dice3d/diceFaceReading';
import { getDye } from '@/components/dice3d/diceDyes';
import { HEX_CLIP, locateHexWindow } from '@/components/dice3d/hexWindow';
import { loadDiceDyeId } from '@/lib/diceDyePreference';
import './DiceTray3DOverlay.css';

/**
 * Physical dice, thrown into a tray.
 *
 * Takes the same props as FlatDiceResultOverlay, so DiceRollFlicker can pick
 * either. The result is never decided here: data/diceRoller.js has already
 * rolled, and diceTrayScene lays the numbers out so the face that lands
 * upwards is the one the engine chose.
 *
 * This overlay hands back to the flat one whenever it cannot honestly show
 * the throw -- no WebGL, a die with no polyhedron (a homebrew d7), or a
 * throw where some die ends up cocked against a wall. A wrong or missing
 * number at the table is far worse than a plain result card.
 */

function hexToInt(hex) {
  return parseInt(String(hex).replace('#', ''), 16);
}

function withAlpha(hex, alpha) {
  const value = hexToInt(hex);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * The scene's palette, built from the dye the player chose.
 *
 * Only `support` and `bodyMuted` are fixed: the first is the ledger blue
 * fill light, which tints shadowed faces rather than painting them, and
 * the second is the multiplier that dims a dropped die regardless of its
 * colour.
 */
function paletteFor(dye) {
  return {
    body: dye.body,
    ink: dye.ink,
    inkMuted: withAlpha(dye.ink, 0.55),
    bodyMuted: 0xd4d9de,
    crit: dye.crit,
    fumble: dye.fumble,
    glow: dye.glow || null,
    glowStops: dye.glowStops || null,
    edge: hexToInt(dye.edge),
    support: 0x3c92e0,
  };
}

/** How long settled dice rest on screen before the total is shown. */
export const REVEAL_PAUSE_MS = 450;
/** Pull the camera back in the hexagon so the dice stay clear of its corners. */
const HEX_FRAME_SCALE = 1.25;

/**
 * With several dice, show each one: "5 + 2 + 1 = 8" rather than "8 = 8".
 * The formula from DiceRollFlicker starts with the dice subtotal, so that
 * number is replaced by the kept dice; a lone die, or any die counted
 * negatively, leaves the formula as it was.
 */
export function spelledFormula(rolls, formulaText) {
  const kept = (Array.isArray(rolls) ? rolls : []).filter((die) => die && !die.dropped);
  if (kept.length < 2 || kept.some((die) => Number(die.sign) < 0) || !/^-?\d+/.test(String(formulaText || ''))) return formulaText;
  return String(formulaText).replace(/^-?\d+/, kept.map((die) => die.result).join(' + '));
}

function supportsWebGl() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (error) {
    return false;
  }
}

export default function DiceTray3DOverlay(props) {
  const { rollId, dyeId, total, label, rollDetail, formulaText, rolls, isRevealed, isCrit, isFumble, onRevealNow, onClose, shape, anchorSelector, resultTone } = props;
  const isHex = shape === 'hex';

  // The hexagon window sits over the wheel's own hexagon (or mid-screen),
  // and follows it if the page scrolls or the window is resized.
  const [hexWindow, setHexWindow] = useState(() => (isHex ? locateHexWindow(anchorSelector) : null));
  useEffect(() => {
    if (!isHex) return undefined;
    const update = () => setHexWindow(locateHexWindow(anchorSelector));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isHex, anchorSelector]);

  // Snapshot the chosen colour for this roll. Changing the picker during a
  // throw does not recolour moving dice; a new roll gets the new material.
  const dyeSnapshotRef = useRef({ rollId: null, dye: null });
  if (!dyeSnapshotRef.current.dye || (rollId && dyeSnapshotRef.current.rollId !== rollId)) {
    dyeSnapshotRef.current = { rollId: rollId || null, dye: getDye(dyeId || loadDiceDyeId()) };
  }
  const palette = useMemo(() => paletteFor(dyeSnapshotRef.current.dye), [rollId]);

  const canvasRef = useRef(null);
  const trayRef = useRef(null);
  const frameRef = useRef(null);
  const seedRef = useRef(null);
  const seedRollIdRef = useRef(null);
  const [failed, setFailed] = useState(false);

  if (seedRef.current === null || (rollId && seedRollIdRef.current !== rollId)) {
    seedRollIdRef.current = rollId || null;
    seedRef.current = seedFromKey(`${rollId || label}-${Date.now()}-${Math.random()}`);
  }

  /*
   * The throw is keyed on what the dice are, not on the identity of the
   * array holding them.
   *
   * CleanCharacterSheet builds its `rolls` inline with .filter().map(), so
   * every re-render of the sheet -- an HP change, a tab switch -- produces
   * a new array of new objects. Depending on that identity restarted the
   * throw in mid-air on the surface players roll from most. A signature of
   * the dice themselves is stable across those re-renders and still
   * changes for a genuinely new roll.
   */
  const diceSignature = useMemo(() => {
    const values = (Array.isArray(rolls) ? rolls : [])
      .map((die) => `${die?.sides}:${die?.result}:${die?.dropped ? 1 : 0}`)
      .join('|');
    // Same numerical dice on a new roll must create a new physical throw.
    return `${rollId || 'legacy'}:${values}`;
  }, [rolls, rollId]);

  // Every die has to be renderable; one unsupported die means the whole
  // throw falls back, rather than showing a pool with a die missing from it.
  const specsRef = useRef(null);
  const specsKeyRef = useRef(null);
  if (specsKeyRef.current !== diceSignature) {
    specsKeyRef.current = diceSignature;
    const list = Array.isArray(rolls) ? rolls : [];
    // A d100 is thrown as its real pair: a tens die and a units d10.
    const built = expandPercentileDice(list).map(specForDie);
    specsRef.current = list.length && built.every(Boolean) ? built : null;
  }
  const specs = specsRef.current;

  const canRender = Boolean(specs) && !failed && supportsWebGl();

  // The parent's inline reveal callback changes during harmless rerenders.
  // Keep the physics callback stable so that alone cannot restart a throw.
  const onRevealNowRef = useRef(onRevealNow);
  useEffect(() => { onRevealNowRef.current = onRevealNow; }, [onRevealNow]);
  // Once the dice have come to rest, let them sit still for a moment before
  // the total appears, so the player sees the face that landed first.
  const revealTimerRef = useRef(null);
  const handleSettled = useCallback(() => {
    window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => onRevealNowRef.current?.(), REVEAL_PAUSE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), []);

  useEffect(() => {
    const holder = canvasRef.current;
    if (!canRender || !holder) return undefined;

    // Every throw gets a canvas of its own. dispose() forces the WebGL
    // context to be lost (so the browser's small context limit is never
    // exhausted), and a lost context cannot be had again from the same
    // canvas: re-running this effect on the old canvas -- which React's
    // StrictMode does on every mount in development -- found no context and
    // silently fell back to the flat card.
    const canvas = document.createElement('canvas');
    canvas.className = 'rq-dice-tray__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    holder.appendChild(canvas);

    let tray;
    try {
      tray = createDiceTray({ canvas, palette, frameScale: isHex ? HEX_FRAME_SCALE : 1 });
    } catch (error) {
      canvas.remove();
      setFailed(true);
      return undefined;
    }
    trayRef.current = tray;

    const stage = frameRef.current;
    const applySize = () => {
      if (!stage) return;
      const { width, height } = stage.getBoundingClientRect();
      tray.resize(width, height);
    };
    applySize();

    const thrown = tray.roll(specsRef.current, { seed: seedRef.current, onSettled: handleSettled });
    if (!thrown) {
      // No seed produced a throw where every die landed flat.
      tray.dispose();
      canvas.remove();
      trayRef.current = null;
      setFailed(true);
      return undefined;
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applySize) : null;
    if (observer && stage) observer.observe(stage);

    return () => {
      observer?.disconnect();
      tray.dispose();
      canvas.remove();
      trayRef.current = null;
    };
    // specsRef is read rather than listed: the signature is what decides
    // whether this is a new throw.
  }, [canRender, diceSignature, handleSettled, palette, isHex]);

  if (!canRender) {
    return <FlatDiceResultOverlay {...props} />;
  }

  const outcome = isCrit ? 'is-crit' : isFumble ? 'is-fumble' : '';
  const tone = resultTone === 'success' || resultTone === 'failure' ? ` is-tone-${resultTone}` : '';

  if (isHex && hexWindow) {
    const { left, top, width, height } = hexWindow;
    return (
      // No scrim: the rest of the sheet stays clear and usable while the
      // hexagon sits over the wheel. Close with the X, Escape, or wait.
      <div className="rq-dice-tray rq-dice-tray--hex" data-testid="dice-tray-overlay" role="dialog" aria-modal="false" aria-label="Dice roll">
        <section
          className={`rq-dice-hex ${outcome}${tone}${isRevealed ? ' is-revealed' : ''}`}
          style={{ left, top, width, height }}
          data-testid="dice-tray-hex"
        >
          <div className="rq-dice-hex__stage" ref={frameRef} style={{ clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP }}>
            <div ref={canvasRef} className="rq-dice-tray__canvas-holder" />
          </div>
          <svg className="rq-dice-hex__case" viewBox="-86.6 -100 173.2 200" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="rq-dice-hex-clip"><polygon points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" /></clipPath>
            </defs>
            <polygon className="rq-dice-hex__glow" points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" clipPath="url(#rq-dice-hex-clip)" />
            <polygon className="rq-dice-hex__edge" points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" />
          </svg>
          <span className="rq-dice-hex__label">{label || 'Roll'}</span>
          <div className="rq-dice-hex__result" aria-live="polite">
            {isRevealed ? (
              <>
                <strong data-testid="dice-tray-total">{total}</strong>
                <span data-testid="dice-tray-formula">{spelledFormula(rolls, formulaText)}</span>
              </>
            ) : (
              <>
                <span className="rq-dice-tray__rolling">Rolling…</span>
                <button type="button" className="rq-dice-hex__skip" onClick={onRevealNow}>Skip</button>
              </>
            )}
          </div>
          <button type="button" className="rq-dice-hex__close" aria-label="Close roll" onClick={onClose}>
            <X size={16} />
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="rq-dice-tray" data-testid="dice-tray-overlay" role="dialog" aria-modal="true" aria-label="Dice roll">
      <button type="button" className="rq-dice-tray__scrim" aria-label="Dismiss roll" onClick={onClose} />

      <section className={`rq-dice-tray__panel ${outcome}${tone}`}>
        <header className="rq-dice-tray__header">
          <div>
            <span className="rq-dice-tray__eyebrow"><Dices size={14} /> {label || 'Roll'}</span>
          </div>
          <button type="button" className="rq-dice-tray__close" aria-label="Close roll" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="rq-dice-tray__stage" ref={frameRef}>
          <div ref={canvasRef} className="rq-dice-tray__canvas-holder" />
          {!isRevealed && (
            <button type="button" className="rq-dice-tray__skip" onClick={onRevealNow}>
              Skip
            </button>
          )}
        </div>

        <div className="rq-dice-tray__result" aria-live="polite">
          {isRevealed ? (
            <>
              <strong data-testid="dice-tray-total">{total}</strong>
              <span>{formulaText}</span>
              <small>{rollDetail}</small>
            </>
          ) : (
            <strong className="rq-dice-tray__rolling">Rolling…</strong>
          )}
        </div>
      </section>
    </div>
  );
}
