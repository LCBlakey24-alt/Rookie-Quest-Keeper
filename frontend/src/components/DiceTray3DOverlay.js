import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, X } from 'lucide-react';

import FlatDiceResultOverlay from '@/components/FlatDiceResultOverlay';
import { createDiceTray, specForDie } from '@/components/dice3d/diceTrayScene';
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
  const { total, label, rollDetail, formulaText, rolls, isRevealed, isCrit, isFumble, onRevealNow, onClose } = props;

  // Read once, when the overlay mounts for this roll: a throw already in
  // the air should not change colour underneath the player.
  const dyeRef = useRef(null);
  if (dyeRef.current === null) dyeRef.current = getDye(loadDiceDyeId());
  const palette = useMemo(() => paletteFor(dyeRef.current), []);

  const canvasRef = useRef(null);
  const trayRef = useRef(null);
  const frameRef = useRef(null);
  const seedRef = useRef(null);
  const [failed, setFailed] = useState(false);

  if (seedRef.current === null) {
    seedRef.current = seedFromKey(`${label}-${Date.now()}-${Math.random()}`);
  }

  // Every die has to be renderable; one unsupported die means the whole
  // throw falls back, rather than showing a pool with a die missing from it.
  const specs = useMemo(() => {
    const list = Array.isArray(rolls) ? rolls : [];
    if (!list.length) return null;

    const built = list.map(specForDie);
    return built.every(Boolean) ? built : null;
  }, [rolls]);

  const canRender = Boolean(specs) && !failed && supportsWebGl();

  const handleSettled = useCallback(() => {
    onRevealNow?.();
  }, [onRevealNow]);

  useEffect(() => {
    if (!canRender || !canvasRef.current) return undefined;

    let tray;
    try {
      tray = createDiceTray({ canvas: canvasRef.current, palette });
    } catch (error) {
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

    const thrown = tray.roll(specs, { seed: seedRef.current, onSettled: handleSettled });
    if (!thrown) {
      // No seed produced a throw where every die landed flat.
      tray.dispose();
      trayRef.current = null;
      setFailed(true);
      return undefined;
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applySize) : null;
    if (observer && stage) observer.observe(stage);

    return () => {
      observer?.disconnect();
      tray.dispose();
      trayRef.current = null;
    };
  }, [canRender, specs, handleSettled, palette]);

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
          <canvas ref={canvasRef} className="rq-dice-tray__canvas" aria-hidden="true" />
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
