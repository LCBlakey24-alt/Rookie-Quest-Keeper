import React, { useMemo } from 'react';
import { TERRAIN_TYPES } from './MapCanvas';

/**
 * A small picture of a saved battle map, drawn from its terrain squares, so
 * the list shows each map instead of the same icon for every one.
 */
export default function TerrainPreview({ terrain, width = 0, height = 0, label = 'Battle map preview' }) {
  const rows = Array.isArray(terrain) ? terrain : [];
  const cols = Math.max(width, ...rows.map((row) => (Array.isArray(row) ? row.length : 0)), 0);
  const rects = useMemo(() => rows.flatMap((row, y) => (Array.isArray(row) ? row : []).map((type, x) => (
    type && type !== 'empty' ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={TERRAIN_TYPES[type]?.color || '#4a4a5a'} /> : null
  ))).filter(Boolean), [rows]);
  if (!cols || !rows.length) return null;
  return (
    <svg viewBox={`0 0 ${cols} ${Math.max(height, rows.length)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}
      style={{ width: '100%', height: '100%', display: 'block', background: TERRAIN_TYPES.empty.color }} data-testid="terrain-preview">
      {rects}
    </svg>
  );
}
