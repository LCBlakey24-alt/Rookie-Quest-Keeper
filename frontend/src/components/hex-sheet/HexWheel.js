import React, { useRef } from 'react';

import {
  INNER_RADIUS,
  OUTER_RADIUS,
  READING_ORDER,
  edgeLabelPoint,
  edgeTextRotation,
  fitFontSize,
  hexVertices,
  pointsAttribute,
  wedgeCentre,
  wedgePolygon,
  wheelViewBox,
} from './hexGeometry';

const WEDGE_GAP = 0.035; // fraction each wedge shrinks toward its centre
const CENTRE_RADIUS = INNER_RADIUS - 4;

function shrink(points, factor) {
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  return points.map(([x, y]) => [cx + (x - cx) * (1 - factor), cy + (y - cy) * (1 - factor)]);
}

function activate(event, handler) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handler?.();
  }
}

/**
 * The transforming wheel: six wedges round a central hexagon.
 *
 * `variant="menu"` writes each wedge's label across the wedge, following
 * its edge. `variant="stat"` writes a small name along the outer edge and a
 * large upright value in the middle of the wedge -- the Core Abilities
 * layout, where the modifier is what matters.
 *
 * Wedges are real buttons for assistive tech and the keyboard: Tab reaches
 * them, Enter or Space selects, and the arrow keys move round the wheel.
 * Changing `viewKey` replays a short fade so the player sees the wheel
 * transform rather than jump.
 */
export default function HexWheel({ wedges = [], centre, variant = 'menu', viewKey = 'main', label = 'Character wheel' }) {
  const wedgeRefs = useRef({});
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
      role="group"
      aria-label={label}
      data-testid="hex-wheel"
      data-view={viewKey}
    >
      <polygon className="hex-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} aria-hidden="true" />
      <g className="hex-wheel__view" key={viewKey}>
        {READING_ORDER.map((slot) => {
          const wedge = bySlot.get(slot);
          const polygon = pointsAttribute(shrink(wedgePolygon(slot), WEDGE_GAP));
          if (!wedge) {
            return <polygon key={slot} className="hex-wheel__wedge hex-wheel__wedge--empty" points={polygon} aria-hidden="true" />;
          }
          const [cx, cy] = wedgeCentre(slot);
          // Short labels (a die size) read faster upright; names follow the edge.
          const rotation = wedge.upright ? 0 : edgeTextRotation(slot);
          return (
            <g
              key={slot}
              ref={(node) => { wedgeRefs.current[slot] = node; }}
              className={`hex-wheel__slot${wedge.disabled ? ' is-disabled' : ''}${wedge.active ? ' is-active' : ''}`}
              role="button"
              tabIndex={wedge.disabled ? -1 : 0}
              aria-label={wedge.ariaLabel || wedge.label}
              aria-disabled={wedge.disabled ? 'true' : undefined}
              data-slot={slot}
              data-testid={`hex-wedge-${wedge.id}`}
              onClick={() => { if (!wedge.disabled) wedge.onSelect?.(); }}
              onKeyDown={(event) => onWedgeKey(event, wedge)}
            >
              <polygon className="hex-wheel__wedge" points={polygon} />
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
                const [ex, ey] = edgeLabelPoint(slot, 9.5);
                // The value sits a little inside the wedge's centre, midway
                // between the inner hexagon and the name on the rim, so the
                // two never touch on any side of the wheel.
                const vx = cx * 0.89;
                const vy = cy * 0.89;
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
                    <text className="hex-wheel__value" x={vx} y={vy} fontSize={23} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
                      {wedge.value}
                    </text>
                    {wedge.sublabel && (
                      <text className="hex-wheel__sublabel" x={vx} y={vy + 14} fontSize={6} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
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
          <polygon className="hex-wheel__centre-shape" points={pointsAttribute(hexVertices(CENTRE_RADIUS))} />
          <text className="hex-wheel__centre-label" x={0} y={centre.sublabel ? -4 : 0} fontSize={fitFontSize(centre.label, 52, 15)} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
            {centre.label}
          </text>
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
