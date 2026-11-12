import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Volume2, VolumeX } from 'lucide-react';

import { getCurrentHp, getMaxHp, getTempHp } from '@/components/clean-sheet/cleanSheetUtils';
import GlowPolygon, { GlowFilter, useSvgId } from './GlowPolygon';
import { DEAL_DURATION_MS, DEAL_STAGGER_MS } from './HexWheel';
import { INNER_RADIUS, OUTER_RADIUS, hexVertex, hexVertices, pointsAttribute, wheelViewBox } from './hexGeometry';
import {
  DEGREES_PER_HP,
  DRAG_THRESHOLD_DEGREES,
  FLICK_STOP_SPEED,
  angleStep,
  coastStep,
  deltaForRotation,
  flickVelocity,
  hpAdjustment,
  pointerAngle,
  rotationForDelta,
  settledRotation,
} from './hpDial';
import { isDialSoundOn, playDialTick, setDialSoundOn } from './dialSound';

const CENTRE_RADIUS = INNER_RADIUS - 4;
const RETURN_MS = 420;

// The round dial that appears inside the hexagon once a half is chosen.
const RING_RADIUS = 74;
const TRAIL_RADIUS = 55;
const MINOR_TICK_DEGREES = DEGREES_PER_HP / 3;
const TICKS = Array.from({ length: Math.round(360 / MINOR_TICK_DEGREES) }, (_, index) => ({
  angle: index * MINOR_TICK_DEGREES,
  major: index % 3 === 0, // one long tick per hit point
}));

/**
 * The hexagon in two halves, split across the middle with a small gap: Hit
 * Points on top, Temp HP below. Each half runs from the outer rim to the
 * inner hexagon.
 */
const GAP = 1.6;
const O = (i) => hexVertex(i, OUTER_RADIUS);
const I = (i) => hexVertex(i, INNER_RADIUS);
const TOP_HALF = [[O(4)[0], -GAP], O(5), O(0), O(1), [O(2)[0], -GAP], [I(2)[0], -GAP], I(1), I(0), I(5), [I(4)[0], -GAP]];
const BOTTOM_HALF = TOP_HALF.map(([x, y]) => [x, -y]);
const HALVES = [
  { id: 'hp', points: pointsAttribute(TOP_HALF), name: 'HIT POINTS', labelY: -76, valueY: -59 },
  { id: 'temp', points: pointsAttribute(BOTTOM_HALF), name: 'TEMP HP', labelY: 76, valueY: 59 },
];

const signed = (value) => (value > 0 ? `+${value}` : `${value}`);

function buzz() {
  try { navigator.vibrate?.(6); } catch { /* not supported: fine */ }
}

/** The orange arc from the top of the ring to where the dial has turned. */
function trailPath(rotation) {
  const sweep = Math.max(-359.9, Math.min(359.9, rotation));
  if (Math.abs(sweep) < 0.5) return '';
  const end = ((sweep - 90) * Math.PI) / 180;
  const x = TRAIL_RADIUS * Math.cos(end);
  const y = TRAIL_RADIUS * Math.sin(end);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const clockwise = sweep > 0 ? 1 : 0;
  return `M 0 ${-TRAIL_RADIUS} A ${TRAIL_RADIUS} ${TRAIL_RADIUS} 0 ${large} ${clockwise} ${x.toFixed(2)} ${y.toFixed(2)}`;
}

/**
 * The HP dial.
 *
 * The hexagon is split in two: Hit Points on top, Temp HP below. Tap a half
 * and a round dial drops into the hexagon with 0 in the centre. Turn it
 * clockwise to add, anticlockwise to take away; it clicks once per hit
 * point. Damage to Hit Points comes off Temp HP first. Nothing is saved
 * until the centre is tapped, and nothing is reported as saved until the
 * server says so (`onConfirm` resolves true). Then the dial turns home.
 *
 * One thumb: the dial follows a finger moving along just one side of it,
 * and a quick flick keeps it spinning after the finger lifts, slowing down
 * and settling on a whole hit point -- so a thumb on the edge of the
 * screen can spin it without reaching round the whole wheel.
 *
 * Without turning: the − / + buttons and the slider (arrow keys, Page
 * Up/Down, Enter, Escape) do the same job.
 */
export default function HexHpDial({ character, initialTarget = 'hp', onConfirm, onCancel }) {
  const [target, setTarget] = useState(initialTarget);
  const [armed, setArmed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [returning, setReturning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [soundOn, setSoundOn] = useState(isDialSoundOn);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const lastDelta = useRef(0);
  const returnTimer = useRef(null);
  const rotationRef = useRef(0);
  const coast = useRef(null);
  const filterId = useSvgId('hex-hp-glow');

  useEffect(() => () => {
    window.clearTimeout(returnTimer.current);
    if (coast.current) window.cancelAnimationFrame(coast.current.frame);
  }, []);

  const turnTo = (next) => {
    rotationRef.current = next;
    setRotation(next);
  };

  const stopCoasting = () => {
    if (!coast.current) return;
    window.cancelAnimationFrame(coast.current.frame);
    coast.current = null;
    turnTo(settledRotation(rotationRef.current));
  };

  const startCoasting = (velocity) => {
    const state = { velocity, last: performance.now(), frame: 0 };
    coast.current = state;
    const frame = () => {
      if (coast.current !== state) return;
      const now = performance.now();
      const elapsed = Math.max(0, Math.min(48, now - state.last));
      state.last = now;
      const step = coastStep(state.velocity, elapsed);
      state.velocity = step.velocity;
      const next = rotationRef.current + step.distance;
      turnTo(next);
      const nextDelta = deltaForRotation(next);
      if (nextDelta !== lastDelta.current) {
        lastDelta.current = nextDelta;
        tick();
      }
      if (Math.abs(state.velocity) < FLICK_STOP_SPEED) {
        stopCoasting();
        return;
      }
      state.frame = window.requestAnimationFrame(frame);
    };
    state.frame = window.requestAnimationFrame(frame);
  };

  const delta = deltaForRotation(rotation);
  const adjustment = useMemo(() => hpAdjustment(character, target, delta), [character, target, delta]);
  const targetName = target === 'temp' ? 'temporary hit points' : 'hit points';
  const shortName = target === 'temp' ? 'Temp HP' : 'HP';
  const maxHp = getMaxHp(character || {});
  const currentHp = Math.min(getCurrentHp(character || {}), maxHp);
  const tempHp = getTempHp(character || {});
  const values = { hp: `${currentHp} / ${maxHp}`, temp: `${tempHp}` };

  const tick = () => {
    buzz();
    playDialTick();
  };

  const setDelta = (next) => {
    if (saving) return;
    stopCoasting();
    setArmed(true);
    setStatus('');
    if (next !== delta) tick();
    turnTo(rotationForDelta(next));
  };

  const chooseTarget = (next) => {
    if (saving) return;
    if (armed && next === target) return;
    stopCoasting();
    setTarget(next);
    setArmed(true);
    turnTo(0);
    setStatus('');
  };

  const centreOf = () => {
    const box = svgRef.current.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };

  const onPointerDown = (event) => {
    if (saving || event.button > 0) return;
    if (event.target.closest('[data-dial-centre]')) return;
    stopCoasting(); // a touch catches a spinning dial
    const [cx, cy] = centreOf();
    drag.current = {
      pointerId: event.pointerId,
      lastAngle: pointerAngle(event.clientX, event.clientY, cx, cy),
      startRotation: rotationRef.current,
      travelled: 0,
      samples: [],
      region: event.target.closest('[data-region]')?.getAttribute('data-region') || null,
    };
    lastDelta.current = deltaForRotation(rotationRef.current);
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const [cx, cy] = centreOf();
    const angle = pointerAngle(event.clientX, event.clientY, cx, cy);
    const step = angleStep(state.lastAngle, angle);
    state.lastAngle = angle;
    state.travelled += step;
    state.samples.push({ t: performance.now(), total: state.travelled });
    if (state.samples.length > 8) state.samples.shift();
    if (!dragging && Math.abs(state.travelled) < DRAG_THRESHOLD_DEGREES) return;
    if (!dragging) {
      // Only now take the pointer: a plain tap must still reach the half
      // it landed on as an ordinary click.
      svgRef.current.setPointerCapture?.(event.pointerId);
      setDragging(true);
      setReturning(false);
      setStatus('');
      if (!armed) {
        setArmed(true);
        if (state.region) setTarget(state.region);
      }
    }
    // The dial follows the finger continuously; only the number steps.
    const next = state.startRotation + state.travelled;
    turnTo(next);
    const nextDelta = deltaForRotation(next);
    if (nextDelta !== lastDelta.current) {
      lastDelta.current = nextDelta;
      tick();
    }
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (dragging) {
      svgRef.current.releasePointerCapture?.(event.pointerId);
      setDragging(false); // the dial stays where it was let go; nothing is saved yet
      const velocity = flickVelocity(state.samples, performance.now());
      if (velocity) startCoasting(velocity);
    }
  };

  const confirm = async () => {
    if (saving) return;
    stopCoasting(); // confirm what the dial shows now
    // Read the dial itself: a coast that was just stopped has not re-rendered yet.
    const amount = deltaForRotation(rotationRef.current);
    const change = hpAdjustment(character, target, amount);
    if (!armed) {
      setStatus('Tap Hit Points or Temp HP first.');
      return;
    }
    if (!amount) {
      setStatus('Turn the dial to choose an amount.');
      return;
    }
    if (!change) {
      setStatus(target === 'hp' && amount > 0 ? 'Already at maximum hit points.' : 'Nothing to change.');
      return;
    }
    setSaving(true);
    setStatus('Saving…');
    const saved = await onConfirm?.(target, amount, change);
    setSaving(false);
    if (!saved) {
      setStatus('Not saved. Tap the centre to try again, or cancel.');
      return;
    }
    setStatus('Saved');
    setReturning(true);
    turnTo(0);
    returnTimer.current = window.setTimeout(() => {
      setReturning(false);
      setArmed(false);
    }, RETURN_MS);
  };

  const cancel = () => {
    if (saving) return;
    stopCoasting();
    turnTo(0);
    setArmed(false);
    setStatus('');
    onCancel?.();
  };

  const toggleSound = () => {
    setDialSoundOn(!soundOn);
    setSoundOn(!soundOn);
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
    ? (target === 'temp' ? `Temp ${tempHp} → ${adjustment.result.tempHp}` : `HP ${currentHp} → ${adjustment.result.currentHp}`)
    : '';
  const showRing = armed || returning;
  let centreLine;
  let centreSub;
  if (saving) {
    centreLine = 'Saving…';
    centreSub = '';
  } else if (!armed) {
    centreLine = 'Tap a half';
    centreSub = 'to start';
  } else if (!delta) {
    centreLine = '0';
    centreSub = `${shortName} · turn the dial`;
  } else {
    centreLine = signed(delta);
    centreSub = dragging ? preview : (adjustment ? `${preview} · tap to confirm` : 'no change');
  }
  const bigCentre = armed && !saving;

  return (
    <div className="hex-hp" data-testid="hex-hp-dial">
      <svg
        ref={svgRef}
        className={`hex-wheel hex-hp__svg${armed ? ' is-armed' : ''}${dragging ? ' is-rotating' : ''}${returning ? ' is-returning' : ''}`}
        viewBox={wheelViewBox()}
        role="group"
        aria-label="Hit point dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <GlowFilter id={filterId} />
        <polygon className="hex-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} aria-hidden="true" />
        <g role="radiogroup" aria-label="Adjust which pool">
          {HALVES.map((half, order) => (
            <g
              key={half.id}
              data-region={half.id}
              className={`hex-wheel__deal hex-hp__half${target === half.id ? ' is-selected' : ''}`}
              style={{ animationDelay: `${order * DEAL_STAGGER_MS}ms`, animationDuration: `${DEAL_DURATION_MS}ms` }}
              role="radio"
              tabIndex={0}
              aria-checked={target === half.id}
              aria-label={`${half.id === 'temp' ? 'Temp HP' : 'Hit Points'}, ${values[half.id]}`}
              data-testid={`hex-hp-target-${half.id}`}
              onClick={() => chooseTarget(half.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  chooseTarget(half.id);
                }
              }}
            >
              <GlowPolygon className="hex-wheel__wedge" points={half.points} filterId={filterId} />
              <text className="hex-hp__label" x={0} y={half.labelY} fontSize={6.4} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{half.name}</text>
              <text className="hex-hp__value" x={0} y={half.valueY} fontSize={15} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{values[half.id]}</text>
            </g>
          ))}
        </g>

        {showRing && (
          <g className="hex-hp__ring" aria-hidden="true" data-testid="hex-hp-ring">
            <circle className="hex-hp__ring-face" cx={0} cy={0} r={RING_RADIUS} />
            <g className="hex-hp__rotor" style={{ transform: `rotate(${rotation}deg)` }} data-testid="hex-hp-rotor" data-rotation={Math.round(rotation)}>
              {TICKS.map(({ angle, major }) => {
                const radians = ((angle - 90) * Math.PI) / 180;
                const r1 = major ? 60 : 65;
                const r2 = 70;
                return (
                  <line
                    key={angle}
                    className={major ? 'hex-hp__notch' : 'hex-hp__notch hex-hp__notch--minor'}
                    x1={r1 * Math.cos(radians)}
                    y1={r1 * Math.sin(radians)}
                    x2={r2 * Math.cos(radians)}
                    y2={r2 * Math.sin(radians)}
                  />
                );
              })}
            </g>
            <path className="hex-hp__trail" d={trailPath(rotation)} />
            <polygon className="hex-hp__pointer" points={`0,${-RING_RADIUS} -5,${-RING_RADIUS - 8} 5,${-RING_RADIUS - 8}`} />
          </g>
        )}

        <g
          className={`hex-wheel__centre hex-hp__centre${delta > 0 ? ' is-positive' : delta < 0 ? ' is-negative' : ''}`}
          data-dial-centre
          role="button"
          tabIndex={0}
          aria-label={delta ? `Confirm ${signed(delta)} ${targetName}${preview ? `, ${preview}` : ''}` : (armed ? `Turn the dial to choose an amount of ${targetName}` : 'Tap Hit Points or Temp HP to start')}
          aria-disabled={saving ? 'true' : undefined}
          data-testid="hex-hp-confirm"
          onClick={confirm}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); confirm(); } }}
        >
          <GlowPolygon className="hex-wheel__centre-shape" points={pointsAttribute(hexVertices(CENTRE_RADIUS))} filterId={filterId} />
          <text className="hex-wheel__centre-label" x={0} y={-5} fontSize={bigCentre ? 20 : 9} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{centreLine}</text>
          <text className="hex-wheel__centre-sublabel" x={0} y={12} fontSize={centreSub.length > 22 ? 4.2 : 5.2} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{centreSub}</text>
        </g>
      </svg>

      <div className="hex-hp__controls">
        <button type="button" className="hex-hp__step" aria-label="Take away 1" onClick={() => setDelta(delta - 1)} disabled={saving} data-testid="hex-hp-minus">
          <span className="hex-glass" aria-hidden="true" />
          <Minus size={18} aria-hidden="true" />
        </button>
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
        <button type="button" className="hex-hp__step" aria-label="Add 1" onClick={() => setDelta(delta + 1)} disabled={saving} data-testid="hex-hp-plus">
          <span className="hex-glass" aria-hidden="true" />
          <Plus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="hex-hp__step" aria-label="Dial click sound" aria-pressed={soundOn} onClick={toggleSound} data-testid="hex-hp-sound">
          <span className="hex-glass" aria-hidden="true" />
          {soundOn ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
        </button>
        <button type="button" className="hex-sheet__text-button" onClick={cancel} disabled={saving} data-testid="hex-hp-cancel"><span className="hex-glass" aria-hidden="true" />Cancel</button>
      </div>
      <p className="hex-hp__status" role="status" aria-live="polite" data-testid="hex-hp-status">{status}</p>
    </div>
  );
}
