import React, { useId } from 'react';
import { gridTile, normaliseGrid } from './mapGrid';

/**
 * Draws a saved square or hex grid over a map image. Place it inside the
 * same relatively-positioned box as the <img>; it fills that box exactly.
 * `aspect` is the image's height / width (from naturalHeight / naturalWidth).
 */
export default function MapGridOverlay({ grid, aspect }) {
  const id = useId().replace(/:/g, '');
  const settings = normaliseGrid(grid);
  const tile = gridTile(settings);
  if (!tile || !(aspect > 0)) return null;
  const height = 100 * aspect;
  const stroke = settings.colour === 'dark' ? 'var(--rq-map-grid-dark, #0b0614)' : 'var(--rq-map-grid-light, #ffffff)';
  return (
    <svg
      className="rq-map-grid-overlay"
      data-testid="map-grid-overlay"
      data-grid-type={settings.type}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          patternUnits="userSpaceOnUse"
          width={tile.width}
          height={tile.height}
          patternTransform={`translate(${tile.dx} ${tile.dy})`}
        >
          <path d={tile.path} fill="none" style={{ stroke }} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100" height={height} fill={`url(#grid-${id})`} opacity={settings.opacity} />
    </svg>
  );
}
