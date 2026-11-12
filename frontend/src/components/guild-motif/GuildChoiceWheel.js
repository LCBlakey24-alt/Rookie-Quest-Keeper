import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import '@/styles/guildTokens.css';
import { angleStep, fitRingLabels, optionAtTop, pointerAngle, readsUpsideDown, rotationForOption, settleRotation } from './choiceWheel';
import './GuildChoiceWheel.css';

const R = 100;
const RING_OUTER = 84; // inside the hexagon's flat sides (86.6)
const RING_INNER = 56;
const LABEL_RADIUS = 70;
const DRAG_THRESHOLD = 6;

const polar = (degrees, radius) => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [radius * Math.cos(radians), radius * Math.sin(radians)];
};
const hexPoints = (radius) => [0, 1, 2, 3, 4, 5].map((index) => polar(60 * index, radius).map((n) => n.toFixed(2)).join(',')).join(' ');

function segmentPath(index, step) {
  const start = index * step - step / 2;
  const end = start + step;
  const [ax, ay] = polar(start, RING_OUTER);
  const [bx, by] = polar(end, RING_OUTER);
  const [cx, cy] = polar(end, RING_INNER);
  const [dx, dy] = polar(start, RING_INNER);
  return `M ${ax} ${ay} A ${RING_OUTER} ${RING_OUTER} 0 0 1 ${bx} ${by} L ${cx} ${cy} A ${RING_INNER} ${RING_INNER} 0 0 0 ${dx} ${dy} Z`;
}

function buzz() {
  try { navigator.vibrate?.(4); } catch { /* not supported */ }
}

/**
 * A choice wheel: the options sit on a ring inside the hexagon and the one
 * resting under the pointer at the top is selected. Drag the ring round,
 * tap a segment, or use the arrow keys. Ring labels turn with the ring: full
 * names sized to fit their wedge, so a wheel with more options (homebrew or
 * community races and classes) has smaller wedges and smaller names, or a
 * wheel's own short labels where it gives them. The centre shows the
 * selected option's full name.
 * (A radiogroup, not a listbox: the app styles every listbox as a panel.)
 *
 * `onChange` fires when the wheel comes to rest on a different option, not
 * for every option that passes the pointer during a drag, so spinning past
 * a class does not briefly select it.
 *
 * @param {object} props
 * @param {{ id: string, label: string, short?: string, pips?: { total: number, left: number } }[]} props.options
 *   `pips` draws a row of dots under the wedge's label (lit = left)
 * @param {string} props.value          id of the selected option
 * @param {(id: string) => void} props.onChange
 * @param {string} props.label          accessible name, e.g. "Class"
 * @param {string} [props.caption]      small text above the name in the centre
 * @param {(id: string) => void} [props.onConfirm]  makes the centre hexagon a
 *   Confirm button for the selected option (also Enter on the wheel). Without
 *   it the centre only shows the selection.
 * @param {string[]} [props.disabledIds] options shown dimmed that cannot be chosen
 * @param {string} [props.centreText]    replaces the selected name in the centre
 * @param {string} [props.centreNote]    small line under the centre text
 * @param {string} [props.confirmLabel]  word on the centre button (default CONFIRM)
 * @param {string} [props.confirmAria]   accessible name for the centre button
 * @param {boolean} [props.compact]      a smaller wheel, one of several on screen
 */
export default function GuildChoiceWheel({
  options, value, onChange, label, caption, onConfirm,
  disabledIds = [], centreText, centreNote, confirmLabel = 'CONFIRM', confirmAria, compact = false,
}) {
  const count = options.length;
  const step = 360 / Math.max(1, count);
  // Ring labels: a wheel's own short label where it gives one (dice sizes,
  // spell levels), otherwise the full name sized to fit its wedge.
  const ringLabels = useMemo(() => fitRingLabels(
    options.map((option) => option.label),
    step,
    (index) => ({ radius: options[index].pips ? LABEL_RADIUS + 3 : LABEL_RADIUS, singleOnly: Boolean(options[index].pips) }),
  ), [options, step]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === value));

  const [rotation, setRotation] = useState(() => rotationForOption(selectedIndex, 0, count));
  const [preview, setPreview] = useState(selectedIndex);
  const [dragging, setDragging] = useState(false);
  const rotationRef = useRef(rotation);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const turnTo = (next) => {
    rotationRef.current = next;
    setRotation(next);
  };

  // Follow a selection made elsewhere (the list view, a loaded draft).
  useEffect(() => {
    if (drag.current) return;
    setPreview(selectedIndex);
    turnTo(rotationForOption(selectedIndex, rotationRef.current, count));
  }, [selectedIndex, count]);

  const disabled = useMemo(() => new Set(disabledIds), [disabledIds]);
  const isDisabled = (index) => disabled.has(options[index]?.id);

  const commit = (index) => {
    // A dimmed option cannot be chosen: turn back to the current one.
    if (isDisabled(index) && index !== selectedIndex) {
      buzz();
      setPreview(selectedIndex);
      turnTo(rotationForOption(selectedIndex, rotationRef.current, count));
      return;
    }
    setPreview(index);
    turnTo(rotationForOption(index, rotationRef.current, count));
    if (index !== selectedIndex) {
      buzz();
      onChange(options[index].id);
    }
  };

  const centreOf = () => {
    const box = svgRef.current.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };

  const onPointerDown = (event) => {
    if (event.button > 0 || count === 0) return;
    const [cx, cy] = centreOf();
    drag.current = {
      pointerId: event.pointerId,
      last: pointerAngle(event.clientX, event.clientY, cx, cy),
      start: rotationRef.current,
      travelled: 0,
      lastIndex: preview,
      segment: event.target.closest?.('[data-wheel-index]')?.getAttribute('data-wheel-index'),
    };
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const [cx, cy] = centreOf();
    const angle = pointerAngle(event.clientX, event.clientY, cx, cy);
    state.travelled += angleStep(state.last, angle);
    state.last = angle;
    if (!dragging && Math.abs(state.travelled) < DRAG_THRESHOLD) return;
    if (!dragging) {
      svgRef.current.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    const next = state.start + state.travelled;
    turnTo(next);
    const atTop = optionAtTop(next, count);
    if (atTop !== state.lastIndex) {
      state.lastIndex = atTop;
      setPreview(atTop);
      buzz();
    }
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (dragging) {
      svgRef.current.releasePointerCapture?.(event.pointerId);
      setDragging(false);
      commit(optionAtTop(settleRotation(rotationRef.current, count), count));
      return;
    }
    if (state.segment !== undefined && state.segment !== null) commit(Number(state.segment));
  };

  const onKeyDown = (event) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (keys[event.key]) {
      event.preventDefault();
      // Step to the next option that can be chosen, if any.
      let next = selectedIndex;
      for (let tries = 0; tries < count; tries += 1) {
        next = (next + keys[event.key] + count) % count;
        if (!isDisabled(next)) break;
      }
      commit(next);
    } else if (event.key === 'Home') {
      event.preventDefault();
      commit(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      commit(count - 1);
    } else if (event.key === 'Enter' && onConfirm && options[selectedIndex]) {
      event.preventDefault();
      onConfirm(options[selectedIndex].id);
    }
  };

  const shown = options[preview] || options[selectedIndex];
  const name = centreText !== undefined && preview === selectedIndex ? String(centreText) : (shown?.label || '');
  const nameClass = name.length > 9 ? ' is-long' : name.length > 6 ? ' is-medium' : '';

  return (
    <div className={`guild-wheel${onConfirm ? ' has-confirm' : ''}${compact ? ' is-compact' : ''}`} data-testid="guild-choice-wheel">
      <svg
        ref={svgRef}
        className={`guild-wheel__svg${dragging ? ' is-dragging' : ''}`}
        viewBox="-91 -104 182 208"
        data-hex-radius={R}
        role="radiogroup"
        tabIndex={0}
        aria-label={`${label}: turn the wheel or use the arrow keys`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <defs>
          {/* Soft light just inside an edge: a blurred stroke clipped to its own shape, so nothing spills outside. */}
          <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6" /></filter>
          <clipPath id={`${uid}-case`}><polygon points={hexPoints(R)} /></clipPath>
          <clipPath id={`${uid}-core`}><polygon points={hexPoints(48)} /></clipPath>
          {options.map((option, index) => (
            <clipPath key={option.id} id={`${uid}-seg-${index}`}><path d={segmentPath(index, step)} /></clipPath>
          ))}
        </defs>
        <polygon className="guild-wheel__case" points={hexPoints(R)} />
        <polygon className="guild-wheel__glow guild-wheel__glow--case" points={hexPoints(R)} clipPath={`url(#${uid}-case)`} filter={`url(#${uid}-blur)`} />
        <circle className="guild-wheel__rim" cx="0" cy="0" r={RING_OUTER} />
        <g className="guild-wheel__ring" style={{ transform: `rotate(${rotation}deg)` }}>
          {options.map((option, index) => {
            const [lx, ly] = polar(index * step, LABEL_RADIUS);
            const isSelected = index === selectedIndex;
            const isPreview = index === preview;
            return (
              <g
                key={option.id}
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                data-wheel-index={index}
                aria-disabled={isDisabled(index) || undefined}
                className={`guild-wheel__segment${isSelected ? ' is-selected' : ''}${isPreview ? ' is-preview' : ''}${isDisabled(index) ? ' is-disabled' : ''}`}
                style={{ '--wheel-order': index }}
              >
                <path className="guild-wheel__face" d={segmentPath(index, step)} />
                {/* Light blue inside every wedge; orange inside the one at the top. */}
                <path className="guild-wheel__glow" d={segmentPath(index, step)} clipPath={`url(#${uid}-seg-${index})`} filter={`url(#${uid}-blur)`} />
                <path className="guild-wheel__edge" d={segmentPath(index, step)} />
                {/* Printed on the ring: the label turns with its segment, and
                    flips on the lower half so it always reads upright. */}
                <g transform={`rotate(${index * step + (readsUpsideDown(index * step + rotation) ? 180 : 0)} ${lx} ${ly})`} aria-hidden="true">
                  {option.short ? (
                    <text x={lx} y={option.pips ? ly - 4 : ly} textAnchor="middle" dominantBaseline="central">{option.short}</text>
                  ) : ringLabels[index].lines.map((line) => (
                    // Each line sits on its own radius, measured up the wedge's centre line.
                    <text
                      key={line.text}
                      className="guild-wheel__label"
                      x={lx}
                      y={ly - (line.radius - LABEL_RADIUS) - (option.pips ? 4 : 0)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: `${ringLabels[index].size}px` }}
                      {...(line.squeeze ? { textLength: line.squeeze, lengthAdjust: 'spacingAndGlyphs' } : {})}
                    >
                      {line.text}
                    </text>
                  ))}
                  {/* Optional dots under the label, e.g. spell slots left of a level. */}
                  {option.pips && Array.from({ length: Math.min(9, Number(option.pips.total) || 0) }, (_, pip) => {
                    const total = Math.min(9, Number(option.pips.total) || 0);
                    return (
                      <circle
                        key={pip}
                        className={`guild-wheel__pip${pip < (Number(option.pips.left) || 0) ? ' is-lit' : ''}`}
                        cx={lx + (pip - (total - 1) / 2) * 5.2}
                        cy={ly + 6}
                        r={1.8}
                      />
                    );
                  })}
                </g>
              </g>
            );
          })}
        </g>
        <path className="guild-wheel__pointer" d="M -7 -97 L 7 -97 L 0 -86 Z" aria-hidden="true" />
        <polygon className="guild-wheel__core" points={hexPoints(48)} />
        <polygon className="guild-wheel__glow guild-wheel__glow--core" points={hexPoints(48)} clipPath={`url(#${uid}-core)`} filter={`url(#${uid}-blur)`} />
        {caption && <text className="guild-wheel__caption" x="0" y="-18" textAnchor="middle" aria-hidden="true">{caption}</text>}
        <text className={`guild-wheel__name${nameClass}`} x="0" y={caption ? 6 : 0} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{name}</text>
        {onConfirm && <text className="guild-wheel__confirm-label" x="0" y="27" textAnchor="middle" aria-hidden="true">{confirmLabel}</text>}
        {!onConfirm && centreNote && <text className="guild-wheel__note" x="0" y="28" textAnchor="middle" aria-hidden="true">{centreNote}</text>}
      </svg>
      {/* The centre hexagon as a real button laid over the drawing, so it is
          reachable and announced on its own rather than inside the ring. */}
      {onConfirm && options[selectedIndex] && (
        <button
          type="button"
          className="guild-wheel__confirm"
          onClick={() => onConfirm(options[selectedIndex].id)}
          aria-label={confirmAria || `Confirm ${options[selectedIndex].label}`}
          data-testid="guild-choice-wheel-confirm"
        />
      )}
      <p className="guild-wheel__status" role="status" aria-live="polite" data-testid="guild-choice-wheel-status">
        {options[selectedIndex]?.label} selected
      </p>
    </div>
  );
}
