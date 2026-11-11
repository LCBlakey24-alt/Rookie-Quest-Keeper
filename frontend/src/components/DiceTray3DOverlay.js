import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, X } from 'lucide-react';

import FlatDiceResultOverlay from '@/components/FlatDiceResultOverlay';
import { createDiceTray, expandPercentileDice, specForDie } from '@/components/dice3d/diceTrayScene';
import { seedFromKey } from '@/components/dice3d/diceFaceReading';
import { getDye } from '@/components/dice3d/diceDyes';
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
    edge: hexToInt(dye.edge),
    support: 0x3c92e0,
  };
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
  const { rollId, dyeId, total, label, rollDetail, formulaText, rolls, isRevealed, isCrit, isFumble, onRevealNow, onClose } = props;

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
  const handleSettled = useCallback(() => {
    onRevealNowRef.current?.();
  }, []);

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
      tray = createDiceTray({ canvas, palette });
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
  }, [canRender, diceSignature, handleSettled, palette]);

  if (!canRender) {
    return <FlatDiceResultOverlay {...props} />;
  }

  const outcome = isCrit ? 'is-crit' : isFumble ? 'is-fumble' : '';

  return (
    <div className="rq-dice-tray" data-testid="dice-tray-overlay" role="dialog" aria-modal="true" aria-label="Dice roll">
      <button type="button" className="rq-dice-tray__scrim" aria-label="Dismiss roll" onClick={onClose} />

      <section className={`rq-dice-tray__panel ${outcome}`}>
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
