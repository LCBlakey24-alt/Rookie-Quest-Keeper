import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, X } from 'lucide-react';

import FlatDiceResultOverlay from '@/components/FlatDiceResultOverlay';
import { createDiceTray, specForDie } from '@/components/dice3d/diceTrayScene';
import { seedFromKey } from '@/components/dice3d/diceFaceReading';
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

const PALETTE = {
  body: '#13293D',
  ink: '#F5F1E8',
  inkMuted: 'rgba(234, 223, 200, 0.45)',
  support: 0x3c92e0,
};

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
      tray = createDiceTray({ canvas: canvasRef.current, palette: PALETTE });
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
  }, [canRender, specs, handleSettled]);

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
