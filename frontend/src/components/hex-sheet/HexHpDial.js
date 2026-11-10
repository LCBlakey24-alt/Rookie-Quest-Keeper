import React, { useEffect, useMemo, useRef, useState } from 'react';

import { INNER_RADIUS, OUTER_RADIUS, hexVertex, hexVertices, pointsAttribute, wheelViewBox } from './hexGeometry';
import {
  DEGREES_PER_HP,
  DRAG_THRESHOLD_DEGREES,
  angleStep,
  deltaForRotation,
  hpAdjustment,
  pointerAngle,
  rotationForDelta,
} from './hpDial';

const CENTRE_RADIUS = INNER_RADIUS - 4;
const RETURN_MS = 420;

function shrink(points, factor) {
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  return points.map(([x, y]) => [cx + (x - cx) * (1 - factor), cy + (y - cy) * (1 - factor)]);
}

const O = (i) => hexVertex(i, OUTER_RADIUS);
const I = (i) => hexVertex(i, INNER_RADIUS);

/**
 * Four regions on the dial: Hit Points across the two upper wedges, Temp HP
 * across the two lower ones, and a −1 / +1 wedge on each side for anyone
 * who would rather tap than turn.
 */
const REGIONS = [
  { id: 'hp', points: [O(5), O(0), O(1), I(1), I(0), I(5)], label: 'HIT POINTS', at: [0, -63] },
  { id: 'plus', points: [O(1), O(2), I(2), I(1)], label: '+1', at: [63, 0] },
  { id: 'temp', points: [O(2), O(3), O(4), I(4), I(3), I(2)], label: 'TEMP HP', at: [0, 63] },
  { id: 'minus', points: [O(4), O(5), I(5), I(4)], label: '−1', at: [-63, 0] },
];

// One notch per hit point of turn, so the rotation reads as steps.
const NOTCHES = Array.from({ length: Math.round(360 / DEGREES_PER_HP) }, (_, index) => index * DEGREES_PER_HP);

const signed = (value) => (value > 0 ? `+${value}` : `${value}`);

function buzz() {
  try { navigator.vibrate?.(6); } catch { /* not supported: fine */ }
}

/**
 * The rotary HP dial.
 *
 * Turn the outer hexagon clockwise to add, anticlockwise to subtract; the
 * centre stays still and shows the change. Nothing is saved until the
 * centre is tapped, and nothing is reported as saved until the server says
 * so (`onConfirm` resolves true). Then the dial turns smoothly home.
 */
export default function HexHpDial({ character, initialTarget = 'hp', onConfirm, onCancel }) {
  const [target, setTarget] = useState(initialTarget);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [returning, setReturning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const svgRef = useRef(null);
  const drag = useRef(null);
  const lastDelta = useRef(0);
  const returnTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(returnTimer.current), []);

  const delta = deltaForRotation(rotation);
  const adjustment = useMemo(() => hpAdjustment(character, target, delta), [character, target, delta]);
  const targetName = target === 'temp' ? 'temporary hit points' : 'hit points';
  const shortName = target === 'temp' ? 'Temp HP' : 'HP';
  const before = target === 'temp'
    ? Number(character?.temporary_hit_points ?? character?.temp_hp ?? 0) || 0
    : null;

  const setDelta = (next) => {
    setStatus('');
    setRotation(rotationForDelta(next));
  };

  const chooseTarget = (next) => {
    if (saving) return;
    setTarget(next);
    setRotation(0);
    setStatus('');
  };

  const centreOf = () => {
    const box = svgRef.current.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };

  const onPointerDown = (event) => {
    if (saving || event.button > 0) return;
    if (event.target.closest('[data-dial-centre]')) return;
    const [cx, cy] = centreOf();
    drag.current = {
      pointerId: event.pointerId,
      lastAngle: pointerAngle(event.clientX, event.clientY, cx, cy),
      startRotation: rotation,
      travelled: 0,
      region: event.target.closest('[data-region]')?.getAttribute('data-region') || null,
    };
    lastDelta.current = deltaForRotation(rotation);
    svgRef.current.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const [cx, cy] = centreOf();
    const angle = pointerAngle(event.clientX, event.clientY, cx, cy);
    const step = angleStep(state.lastAngle, angle);
    state.lastAngle = angle;
    state.travelled += step;
    if (!dragging && Math.abs(state.travelled) < DRAG_THRESHOLD_DEGREES) return;
    if (!dragging) {
      setDragging(true);
      setReturning(false);
      setStatus('');
    }
    // The dial follows the finger continuously; only the number steps.
    const next = state.startRotation + state.travelled;
    setRotation(next);
    const nextDelta = deltaForRotation(next);
    if (nextDelta !== lastDelta.current) {
      lastDelta.current = nextDelta;
      buzz();
    }
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    svgRef.current.releasePointerCapture?.(event.pointerId);
    if (dragging) {
      setDragging(false);
      return; // the dial stays where it was let go; nothing is saved yet
    }
    // A tap rather than a turn.
    if (state.region === 'hp' || state.region === 'temp') chooseTarget(state.region);
    if (state.region === 'plus') setDelta(delta + 1);
    if (state.region === 'minus') setDelta(delta - 1);
  };

  const confirm = async () => {
    if (saving) return;
    if (!delta) {
      setStatus('Turn the dial to choose an amount.');
      return;
    }
    if (!adjustment) {
      setStatus(target === 'hp' && delta > 0 ? 'Already at maximum hit points.' : 'Nothing to change.');
      return;
    }
    setSaving(true);
    setStatus('Saving…');
    const saved = await onConfirm?.(target, delta, adjustment);
    setSaving(false);
    if (!saved) {
      setStatus('Not saved. Tap the centre to try again, or cancel.');
      return;
    }
    setStatus('Saved');
    setReturning(true);
    setRotation(0);
    returnTimer.current = window.setTimeout(() => setReturning(false), RETURN_MS);
  };

  const cancel = () => {
    if (saving) return;
    setRotation(0);
    setStatus('');
    onCancel?.();
  };

  const onKeyDown = (event) => {
    if (saving) return;
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (keys[event.key]) {
      event.preventDefault();
      setDelta(delta + keys[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      confirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  const preview = adjustment
    ? (target === 'temp' ? `Temp ${before} → ${adjustment.result.tempHp}` : `HP → ${adjustment.result.currentHp} / ${adjustment.result.maxHp}`)
    : '';
  const idle = !delta && !dragging;
  const centreLine = saving ? 'Saving…' : idle ? shortName : signed(delta);
  const centreSub = saving ? '' : idle ? 'turn the dial' : (dragging ? preview : (adjustment ? 'tap to confirm' : 'no change'));

  return (
    <div className="hex-hp" data-testid="hex-hp-dial">
      <svg
        ref={svgRef}
        className={`hex-wheel hex-hp__svg${dragging ? ' is-rotating' : ''}${returning ? ' is-returning' : ''}`}
        viewBox={wheelViewBox()}
        role="group"
        aria-label="Hit point dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <polygon className="hex-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} aria-hidden="true" />
        <g className="hex-hp__rotor" style={{ transform: `rotate(${rotation}deg)` }} data-testid="hex-hp-rotor" data-rotation={Math.round(rotation)}>
          {REGIONS.map((region) => (
            <g key={region.id} data-region={region.id} className={`hex-hp__region hex-hp__region--${region.id}${target === region.id ? ' is-selected' : ''}`}>
              <polygon className="hex-wheel__wedge" points={pointsAttribute(shrink(region.points, 0.03))} />
              <text className="hex-hp__label" x={region.at[0]} y={region.at[1]} fontSize={region.id === 'hp' || region.id === 'temp' ? 9 : 14} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
                {region.label}
              </text>
            </g>
          ))}
          {NOTCHES.map((angle) => {
            const radians = ((angle - 90) * Math.PI) / 180;
            const r1 = OUTER_RADIUS * 0.8;
            const r2 = OUTER_RADIUS * 0.86;
            return <line key={angle} className="hex-hp__notch" x1={r1 * Math.cos(radians)} y1={r1 * Math.sin(radians)} x2={r2 * Math.cos(radians)} y2={r2 * Math.sin(radians)} aria-hidden="true" />;
          })}
        </g>
        <g
          className={`hex-wheel__centre hex-hp__centre${delta > 0 ? ' is-positive' : delta < 0 ? ' is-negative' : ''}`}
          data-dial-centre
          role="button"
          tabIndex={0}
          aria-label={delta ? `Confirm ${signed(delta)} ${targetName}${preview ? `, ${preview}` : ''}` : `Choose an amount of ${targetName}`}
          aria-disabled={saving ? 'true' : undefined}
          data-testid="hex-hp-confirm"
          onClick={confirm}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); confirm(); } }}
        >
          <polygon className="hex-wheel__centre-shape" points={pointsAttribute(hexVertices(CENTRE_RADIUS))} />
          <text className="hex-wheel__centre-label" x={0} y={-4} fontSize={idle || saving ? 12 : 20} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{centreLine}</text>
          <text className="hex-wheel__centre-sublabel" x={0} y={13} fontSize={5.4} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{centreSub}</text>
        </g>
      </svg>

      <div className="hex-hp__controls">
        <div className="hex-hp__targets" role="radiogroup" aria-label="Adjust which pool">
          <button type="button" role="radio" aria-checked={target === 'hp'} onClick={() => chooseTarget('hp')} data-testid="hex-hp-target-hp">Hit Points</button>
          <button type="button" role="radio" aria-checked={target === 'temp'} onClick={() => chooseTarget('temp')} data-testid="hex-hp-target-temp">Temp HP</button>
        </div>
        <div
          className="hex-hp__slider"
          role="slider"
          tabIndex={0}
          aria-label={`Change to ${targetName}`}
          aria-valuemin={-999}
          aria-valuemax={999}
          aria-valuenow={delta}
          aria-valuetext={`${signed(delta)} ${targetName}`}
          onKeyDown={onKeyDown}
          data-testid="hex-hp-slider"
        >
          {signed(delta)}
        </div>
        <button type="button" className="hex-sheet__text-button" onClick={cancel} disabled={saving} data-testid="hex-hp-cancel">Cancel</button>
      </div>
      <p className="hex-hp__status" role="status" aria-live="polite" data-testid="hex-hp-status">{status}</p>
    </div>
  );
}
