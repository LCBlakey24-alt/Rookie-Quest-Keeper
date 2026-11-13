import React, { useRef } from 'react';

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

const CENTRE_RADIUS = INNER_RADIUS - 4;

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
export default function HexWheel({ wedges = [], centre, variant = 'menu', viewKey = 'main', label = 'Character wheel' }) {
  const wedgeRefs = useRef({});
  const filterId = useSvgId('hex-glow');
  const bySlot = new Map(wedges.map((wedge) => [wedge.slot, wedge]));

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
      className={`hex-wheel hex-wheel--${variant}`}
      viewBox={wheelViewBox()}
      data-hex-radius={OUTER_RADIUS + 2}
      role="group"
      aria-label={label}
      data-testid="hex-wheel"
      data-view={viewKey}
    >
      <GlowFilter id={filterId} />
      <polygon className="hex-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} aria-hidden="true" />
      <g className="hex-wheel__view" key={viewKey}>
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
                    <text
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
                    </text>
                    <text className="hex-wheel__value" x={vx} y={vy} fontSize={21} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
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
