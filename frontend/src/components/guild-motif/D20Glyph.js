import React from 'react';

const round = (n) => Math.round(n * 100) / 100;
const vertex = (index, radius) => {
  const angle = ((-90 + 60 * index) * Math.PI) / 180;
  return [round(radius * Math.cos(angle)), round(radius * Math.sin(angle))];
};

/**
 * Geometry of the d20 symbol: the icosahedron seen face-on, as a hexagon
 * outline around a front triangle, with lines from each corner of the
 * triangle to the hexagon corners beside it. Exported for tests.
 */
export function d20GlyphGeometry(radius) {
  const hex = [0, 1, 2, 3, 4, 5].map((index) => vertex(index, radius));
  const t = radius * 0.56;
  const triangle = [[0, round(-t)], [round(t * 0.92), round(t * 0.62)], [round(-t * 0.92), round(t * 0.62)]];
  const [top, right, left] = triangle;
  // Each triangle corner joins the hexagon corners nearest it.
  const spokes = [
    [top, hex[5]], [top, hex[0]], [top, hex[1]],
    [right, hex[1]], [right, hex[2]], [right, hex[3]],
    [left, hex[3]], [left, hex[4]], [left, hex[5]],
  ];
  return { hex, triangle, spokes };
}

/**
 * The d20 symbol, drawn inside an SVG at (cx, cy). Decorative: the control
 * it sits in carries the accessible name.
 */
export default function D20Glyph({ cx = 0, cy = 0, radius = 18, className = '', label = '20' }) {
  const { hex, triangle, spokes } = d20GlyphGeometry(radius);
  const points = (list) => list.map(([x, y]) => `${round(x + cx)},${round(y + cy)}`).join(' ');
  return (
    <g className={`d20-glyph ${className}`.trim()} aria-hidden="true" data-testid="d20-glyph">
      <polygon className="d20-glyph__outline" points={points(hex)} />
      {spokes.map(([[x1, y1], [x2, y2]]) => (
        <line key={`${x1},${y1}-${x2},${y2}`} className="d20-glyph__edge" x1={round(x1 + cx)} y1={round(y1 + cy)} x2={round(x2 + cx)} y2={round(y2 + cy)} />
      ))}
      <polygon className="d20-glyph__face" points={points(triangle)} />
      {label ? (
        <text className="d20-glyph__label" x={cx} y={round(cy + radius * 0.14)} textAnchor="middle" dominantBaseline="central" fontSize={round(radius * 0.42)}>{label}</text>
      ) : null}
    </g>
  );
}
