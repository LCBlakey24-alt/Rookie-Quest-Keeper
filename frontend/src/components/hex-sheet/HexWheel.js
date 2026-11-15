import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  INNER_RADIUS,
  OUTER_RADIUS,
  READING_ORDER,
  RING_OUTER,
  edgeTextRotation,
  fitFontSize,
  hexVertices,
  pointsAttribute,
  polarPoint,
  slotAngle,
  slotSegment,
  wheelViewBox,
} from './hexGeometry';
import GlowPolygon, { GlowFilter, useSvgId } from './GlowPolygon';
import D20Glyph from '@/components/guild-motif/D20Glyph';
import { angleStep, pointerAngle } from '@/components/guild-motif/choiceWheel';
import { GLIDE_EASING, addSpinSample, glideDuration, releaseVelocity, spinTarget, startSpinSamples } from '@/components/guild-motif/wheelSpin';

const CENTRE_RADIUS = INNER_RADIUS - 4;
const DRAG_THRESHOLD = 6;
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function labelArc(slot) {
  const radius = RING_OUTER - 7;
  const [x1, y1] = polarPoint(slot * 60 + 3, radius);
  const [x2, y2] = polarPoint(slot * 60 + 57, radius);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}

/**
 * Changing view deals the new wedges out one at a time, clockwise from the
 * upper left, while the centre stays put. The whole wheel is in place well
 * inside a second: the last wedge starts at 5 x 60 ms and lands 200 ms later.
 */
export const DEAL_STAGGER_MS = 60;
export const DEAL_DURATION_MS = 200;

function activate(event, handler) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handler?.();
  }
}

/**
 * The transforming wheel: a round ring of six wedges inside a hexagon, with
 * a hexagon button in the middle (the approved wheel, docs/DESIGN_SYSTEM.md
 * §6a). Each wedge faces one of the hexagon's sides.
 *
 * `variant="menu"` writes each wedge's label across the wedge, following
 * its edge. `variant="stat"` writes a small name along the outer edge and a
 * large upright value in the middle of the wedge -- the Core Abilities
 * layout, where the modifier is what matters.
 *
 * Wedges are real buttons for assistive tech and the keyboard: Tab reaches
 * them, Enter or Space selects, and the arrow keys move round the wheel.
 * Changing `viewKey` deals the wedges out again, so the player sees the
 * wheel transform rather than jump.
 */
export default function HexWheel({ wedges = [], centre, variant = 'menu', viewKey = 'main', label = 'Character wheel', glowingFrame = false, turnable = false }) {
  const wedgeRefs = useRef({});
  const filterId = useSvgId('hex-glow');
  const labelPathId = useSvgId('hex-label');
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClick = useRef(false);
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const [glideMs, setGlideMs] = useState(0);
  const bySlot = new Map(wedges.map((wedge) => [wedge.slot, wedge]));

  const turnTo = useCallback((next, duration = 0) => {
    rotationRef.current = next;
    setGlideMs(duration);
    setRotation(next);
  }, []);
  // The unturned wheel starts with a divider at 12 o'clock. Rest with a
  // wedge centred there after the first turn, then move one wedge at a time.
  const stepWheel = useCallback(direction => {
    const position = (rotationRef.current - 30) / 60;
    const next = direction > 0 ? Math.floor(position + 1e-6) + 1 : Math.ceil(position - 1e-6) - 1;
    turnTo(30 + next * 60, 240);
  }, [turnTo]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!turnable || !svg) return undefined;
    let wheelDelta = 0;
    let lastWheelAt = 0;
    const onWheel = event => {
      // Ctrl+wheel is browser zoom (including a trackpad pinch), not a turn.
      if (event.ctrlKey || !event.target.closest?.('[data-slot]')) return;
      const delta = (event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 800 : 1);
      if (!delta) return;
      event.preventDefault();
      const now = clock();
      if (now - lastWheelAt > 200) wheelDelta = 0;
      lastWheelAt = now;
      wheelDelta += delta;
      // Trackpads emit a stream of small events; accumulate them so a single
      // gesture does not turn a full wedge for every tiny movement.
      if (Math.abs(wheelDelta) >= 80) {
        stepWheel(wheelDelta > 0 ? 1 : -1);
        wheelDelta = 0;
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [turnable, stepWheel]);

  const centreOfWheel = () => {
    const rect = svgRef.current.getBoundingClientRect();
    return [rect.left + rect.width / 2, rect.top + rect.height / 2];
  };

  const onPointerDown = event => {
    if (!turnable || event.button > 0 || !event.target.closest?.('[data-slot]')) return;
    const [x, y] = centreOfWheel();
    dragRef.current = { id: event.pointerId, last: pointerAngle(event.clientX, event.clientY, x, y), start: rotationRef.current, travelled: 0, dragging: false, samples: startSpinSamples(clock(), rotationRef.current) };
    setGlideMs(0);
  };

  const onPointerMove = event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const [x, y] = centreOfWheel();
    const angle = pointerAngle(event.clientX, event.clientY, x, y);
    drag.travelled += angleStep(drag.last, angle);
    drag.last = angle;
    if (!drag.dragging && Math.abs(drag.travelled) < DRAG_THRESHOLD) return;
    if (!drag.dragging) { drag.dragging = true; svgRef.current.setPointerCapture?.(event.pointerId); }
    const next = drag.start + drag.travelled;
    turnTo(next);
    drag.samples = addSpinSample(drag.samples, clock(), next);
  };

  const onPointerEnd = event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.dragging) return;
    suppressClick.current = true;
    if (svgRef.current.hasPointerCapture?.(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    const target = spinTarget(rotationRef.current - 30, drag.start - 30, releaseVelocity(drag.samples, clock()), 60) + 30;
    turnTo(target, glideDuration(rotationRef.current, target));
    // A drag's synthetic click follows pointerup in the same task.
    setTimeout(() => { suppressClick.current = false; }, 0);
  };

  const onPointerCancel = event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    // A cancelled gesture has no intentional release velocity. Settle in
    // place rather than continuing to spin or opening a destination.
    if (drag.dragging) turnTo(Math.round((rotationRef.current - 30) / 60) * 60 + 30);
  };

  const moveFocus = (slot, step) => {
    const order = READING_ORDER;
    const start = order.indexOf(slot);
    for (let offset = 1; offset <= order.length; offset += 1) {
      const next = order[(start + step * offset + order.length * 6) % order.length];
      const target = wedgeRefs.current[next];
      if (target && bySlot.get(next) && !bySlot.get(next).disabled) {
        target.focus();
        return;
      }
    }
  };

  const onWedgeKey = (event, wedge) => {
    if (turnable && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      stepWheel(event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(wedge.slot, 1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(wedge.slot, -1);
      return;
    }
    if (!wedge.disabled) activate(event, wedge.onSelect);
  };

  return (
    <svg
      ref={svgRef}
      className={`hex-wheel hex-wheel--${variant}`}
      viewBox={wheelViewBox()}
      data-hex-radius={OUTER_RADIUS + 2}
      role="group"
      aria-label={turnable ? `${label}. Drag or scroll to turn; use arrow keys when focused on a section.` : label}
      data-testid="hex-wheel"
      data-view={viewKey}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerCancel}
      onClickCapture={event => {
        if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
      }}
    >
      <GlowFilter id={filterId} />
      {turnable && <defs>{READING_ORDER.map(slot => <path key={slot} id={`${labelPathId}-${slot}`} d={labelArc(slot)} />)}</defs>}
      {glowingFrame ? (
        <g aria-hidden="true">
          <GlowPolygon className="hex-wheel__frame hex-wheel__frame--glowing" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} filterId={filterId} />
        </g>
      ) : (
        <polygon className="hex-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} aria-hidden="true" />
      )}
      <g className="hex-wheel__view" key={viewKey} style={turnable ? { transform: `rotate(${rotation}deg)`, transitionDuration: `${glideMs}ms`, transitionTimingFunction: GLIDE_EASING } : undefined}>
        {READING_ORDER.map((slot, order) => {
          const deal = { animationDelay: `${order * DEAL_STAGGER_MS}ms`, animationDuration: `${DEAL_DURATION_MS}ms` };
          const wedge = bySlot.get(slot);
          const polygon = pointsAttribute(slotSegment(slot));
          if (!wedge) {
            return (
              <g key={slot} className="hex-wheel__deal hex-wheel__slot--empty" style={deal} data-deal-order={order} aria-hidden="true">
                <GlowPolygon className="hex-wheel__wedge hex-wheel__wedge--empty" points={polygon} filterId={filterId} />
              </g>
            );
          }
          const [cx, cy] = polarPoint(slotAngle(slot), 63);
          // Short labels (a die size) read faster upright; names follow the edge.
          const rotation = wedge.upright ? 0 : edgeTextRotation(slot);
          return (
            <g
              key={slot}
              ref={(node) => { wedgeRefs.current[slot] = node; }}
              className={`hex-wheel__deal hex-wheel__slot${wedge.disabled ? ' is-disabled' : ''}${wedge.active ? ' is-active' : ''}${wedge.className ? ` ${wedge.className}` : ''}`}
              role="button"
              aria-pressed={wedge.pressed === undefined ? undefined : Boolean(wedge.pressed)}
              tabIndex={wedge.disabled ? -1 : 0}
              aria-label={wedge.ariaLabel || wedge.label}
              aria-disabled={wedge.disabled ? 'true' : undefined}
              data-slot={slot}
              data-deal-order={order}
              style={deal}
              data-testid={`hex-wedge-${wedge.id}`}
              onClick={() => { if (!wedge.disabled) wedge.onSelect?.(); }}
              onKeyDown={(event) => onWedgeKey(event, wedge)}
            >
              <GlowPolygon className="hex-wheel__wedge" points={polygon} filterId={filterId} />
              {variant === 'menu' && (
                <text
                  className="hex-wheel__label"
                  x={cx}
                  y={cy}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  fontSize={fitFontSize(wedge.label, 60, 10.5)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {wedge.label}
                </text>
              )}
              {variant === 'stat' && (() => {
                const [ex, ey] = polarPoint(slotAngle(slot), RING_OUTER - 8.5);
                // The value sits towards the inside of the ring, clear of the
                // name printed along its outer edge.
                const [vx, vy] = polarPoint(slotAngle(slot), 55);
                return (
                  <>
                    {turnable ? (
                    <text className="hex-wheel__edge-label" fontSize={Math.min(6.6, 62 / (Math.max(1, String(wedge.edgeLabel || wedge.label).length) * 0.72))} textAnchor="middle" aria-hidden="true">
                      <textPath href={`#${labelPathId}-${slot}`} startOffset="50%">{String(wedge.edgeLabel || wedge.label).toUpperCase()}</textPath>
                    </text>
                    ) : <text
                      className="hex-wheel__edge-label"
                      x={ex}
                      y={ey}
                      transform={`rotate(${rotation} ${ex} ${ey})`}
                      fontSize={fitFontSize(wedge.edgeLabel || wedge.label, 70, 6.6)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      aria-hidden="true"
                    >
                      {String(wedge.edgeLabel || wedge.label).toUpperCase()}
                    </text>}
                    <text className="hex-wheel__value" x={vx} y={vy} fontSize={21} textAnchor="middle" dominantBaseline="central" aria-hidden="true" transform={turnable ? `rotate(${slotAngle(slot)} ${vx} ${vy})` : undefined}>
                      {wedge.value}
                    </text>
                    {wedge.sublabel && (
                      <text className="hex-wheel__sublabel" x={vx} y={vy + 12} fontSize={6} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
                        {wedge.sublabel}
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          );
        })}
      </g>
      {centre && (
        <g
          className="hex-wheel__centre"
          role="button"
          tabIndex={0}
          aria-label={centre.ariaLabel || centre.label}
          data-testid="hex-centre"
          onClick={() => centre.onSelect?.()}
          onKeyDown={(event) => activate(event, centre.onSelect)}
        >
          <GlowPolygon className="hex-wheel__centre-shape" points={pointsAttribute(hexVertices(CENTRE_RADIUS))} filterId={filterId} />
          {centre.icon === 'd20' ? (
            <D20Glyph radius={21} />
          ) : (
            <text className="hex-wheel__centre-label" x={0} y={centre.sublabel ? -4 : 0} fontSize={fitFontSize(centre.label, 52, 15)} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
              {centre.label}
            </text>
          )}
          {centre.sublabel && (
            <text className="hex-wheel__centre-sublabel" x={0} y={11} fontSize={6} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
              {centre.sublabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
