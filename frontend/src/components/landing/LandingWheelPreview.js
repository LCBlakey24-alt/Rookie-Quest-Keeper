import React from 'react';

import GlowPolygon, { GlowFilter, useSvgId } from '@/components/hex-sheet/GlowPolygon';
import {
  INNER_RADIUS,
  OUTER_RADIUS,
  SLOT,
  edgeTextRotation,
  fitFontSize,
  hexVertices,
  pointsAttribute,
  polarPoint,
  slotAngle,
  slotSegment,
  wheelViewBox,
} from '@/components/hex-sheet/hexGeometry';

/* The character sheet's own sections, where the sheet puts them. */
const SECTIONS = [
  { label: 'Core Abilities', slot: SLOT.UPPER_LEFT },
  { label: 'Skills', slot: SLOT.UPPER_RIGHT },
  { label: 'Magic', slot: SLOT.RIGHT },
  { label: 'Combat', slot: SLOT.LOWER_RIGHT, chosen: true },
  { label: 'Traits & Feats', slot: SLOT.LOWER_LEFT },
  { label: 'Equipment', slot: SLOT.LEFT },
];

/**
 * A still picture of the character sheet's wheel for the landing page: the
 * round ring of wedges inside the hexagon, with the dice button in the
 * middle. Decorative only; it uses the same geometry as the real sheet.
 */
export default function LandingWheelPreview() {
  const filterId = useSvgId('landing-wheel-glow');
  return (
    <svg className="landing-wheel" viewBox={wheelViewBox()} aria-hidden="true" focusable="false" data-testid="landing-wheel-preview">
      <GlowFilter id={filterId} />
      <polygon className="landing-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} />
      {SECTIONS.map(({ label, slot, chosen }) => {
        const [x, y] = polarPoint(slotAngle(slot), 63);
        return (
          <g key={label} className={`landing-wheel__wedge${chosen ? ' is-chosen' : ''}`}>
            <GlowPolygon points={pointsAttribute(slotSegment(slot))} filterId={filterId} />
            <text
              className="landing-wheel__label"
              x={x}
              y={y}
              transform={`rotate(${edgeTextRotation(slot)} ${x} ${y})`}
              fontSize={fitFontSize(label, 60, 10.5)}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label}
            </text>
          </g>
        );
      })}
      <g className="landing-wheel__centre">
        <GlowPolygon points={pointsAttribute(hexVertices(INNER_RADIUS - 4))} filterId={filterId} />
        <text className="landing-wheel__centre-label" x={0} y={0} fontSize={15} textAnchor="middle" dominantBaseline="central">D20</text>
      </g>
    </svg>
  );
}
