import React, { useRef, useState } from 'react';

import { POINT_BUY_MAX, POINT_BUY_MIN } from '@/data/abilityScoreMethods';

/*
 * A point-buy dial shaped like a volume knob. Its notches run 8 to 15 round
 * the top of the dial; turning clockwise raises the score one notch at a
 * time, anticlockwise lowers it. A notch the player cannot afford is dimmed
 * and the knob will not turn onto it.
 */
const DEGREES_PER_STEP = 36;
const FIRST_NOTCH = -126; // score 8, measured clockwise from straight up
const DRAG_THRESHOLD = 4;
const SCORES = Array.from({ length: POINT_BUY_MAX - POINT_BUY_MIN + 1 }, (_, index) => POINT_BUY_MIN + index);

const angleOf = (score) => FIRST_NOTCH + (score - POINT_BUY_MIN) * DEGREES_PER_STEP;
const polar = (degrees, radius) => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [radius * Math.cos(radians), radius * Math.sin(radians)];
};

function pointerAngle(event, box) {
  const x = event.clientX - (box.left + box.width / 2);
  const y = event.clientY - (box.top + box.height / 2);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function smallestTurn(from, to) {
  let step = to - from;
  while (step > 180) step -= 360;
  while (step < -180) step += 360;
  return step;
}

function buzz() {
  try { navigator.vibrate?.(6); } catch { /* not supported */ }
}

/**
 * @param {object} props
 * @param {string} props.label      ability name, e.g. "Dexterity"
 * @param {number} props.value      current base score (8-15)
 * @param {(score: number) => boolean} props.canSet  whether a score is allowed
 * @param {(score: number) => void} props.onChange
 * @param {number} props.remaining  points left, shown in the centre
 */
export default function AbilityKnob({ label, value, canSet, onChange, remaining }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const [turning, setTurning] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const score = Number(value) || POINT_BUY_MIN;

  // Move one notch at a time towards `target`, stopping at the first notch
  // that is not allowed, so a fast turn can never skip past the budget.
  const stepTowards = (target) => {
    let current = score;
    let stopped = false;
    const direction = Math.sign(target - current);
    while (current !== target) {
      const next = current + direction;
      if (!canSet(next)) {
        stopped = true;
        break;
      }
      current = next;
    }
    setBlocked(stopped);
    if (current !== score || stopped) buzz();
    if (current !== score) onChange(current);
  };

  const onPointerDown = (event) => {
    if (event.button > 0) return;
    const box = svgRef.current.getBoundingClientRect();
    drag.current = { id: event.pointerId, last: pointerAngle(event, box), travelled: 0, start: score, box };
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const angle = pointerAngle(event, state.box);
    state.travelled += smallestTurn(state.last, angle);
    state.last = angle;
    if (!turning && Math.abs(state.travelled) < DRAG_THRESHOLD) return;
    if (!turning) {
      svgRef.current.setPointerCapture?.(event.pointerId);
      setTurning(true);
    }
    const steps = Math.trunc(state.travelled / DEGREES_PER_STEP);
    const target = Math.max(POINT_BUY_MIN, Math.min(POINT_BUY_MAX, state.start + steps));
    if (target !== score) stepTowards(target);
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    if (turning) svgRef.current.releasePointerCapture?.(event.pointerId);
    setTurning(false);
  };

  const onKeyDown = (event) => {
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (keys[event.key]) {
      event.preventDefault();
      stepTowards(Math.max(POINT_BUY_MIN, Math.min(POINT_BUY_MAX, score + keys[event.key])));
    } else if (event.key === 'Home') {
      event.preventDefault();
      stepTowards(POINT_BUY_MIN);
    } else if (event.key === 'End') {
      event.preventDefault();
      stepTowards(POINT_BUY_MAX);
    }
  };

  const [ix, iy] = polar(angleOf(score), 50);
  const [ox, oy] = polar(angleOf(score), 64);
  const arcStart = polar(angleOf(POINT_BUY_MIN), 74);
  const arcNow = polar(angleOf(score), 74);
  const large = angleOf(score) - angleOf(POINT_BUY_MIN) > 180 ? 1 : 0;

  return (
    <div className="ability-knob" data-testid="ability-knob">
      <svg
        ref={svgRef}
        className={`ability-knob__svg${turning ? ' is-turning' : ''}`}
        viewBox="-100 -100 200 200"
        role="slider"
        tabIndex={0}
        aria-label={`${label} score`}
        aria-valuemin={POINT_BUY_MIN}
        aria-valuemax={POINT_BUY_MAX}
        aria-valuenow={score}
        aria-valuetext={`${label} ${score}, ${remaining} points left`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <path
          className="ability-knob__track"
          d={`M ${polar(angleOf(POINT_BUY_MIN), 74).join(' ')} A 74 74 0 1 1 ${polar(angleOf(POINT_BUY_MAX), 74).join(' ')}`}
        />
        {score > POINT_BUY_MIN && (
          <path className="ability-knob__spent" d={`M ${arcStart.join(' ')} A 74 74 0 ${large} 1 ${arcNow.join(' ')}`} />
        )}
        {SCORES.map((notch) => {
          const [nx, ny] = polar(angleOf(notch), 88);
          const allowed = notch === score || canSet(notch);
          return (
            <text
              key={notch}
              className={`ability-knob__notch${notch === score ? ' is-current' : ''}${allowed ? '' : ' is-unaffordable'}`}
              x={nx}
              y={ny}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              {notch}
            </text>
          );
        })}
        <circle className="ability-knob__body" cx={0} cy={0} r={62} />
        <line className="ability-knob__indicator" x1={ix} y1={iy} x2={ox} y2={oy} />
        <text className="ability-knob__label" x={0} y={-18} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{label.slice(0, 3).toUpperCase()}</text>
        <text className="ability-knob__value" x={0} y={6} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{score}</text>
        <text className="ability-knob__left" x={0} y={30} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{remaining} left</text>
      </svg>
      <p className="ability-knob__hint" role="status" aria-live="polite" data-testid="ability-knob-status">
        {blocked ? 'Not enough points for that.' : 'Turn clockwise to raise, anticlockwise to lower.'}
      </p>
    </div>
  );
}
