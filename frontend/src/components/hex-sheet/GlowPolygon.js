import React, { useId } from 'react';

/** A stable, url()-safe id: React's ids contain characters url(#…) dislikes. */
export function useSvgId(prefix) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * The soft blur every glowing edge in one SVG shares. Render it once inside
 * the SVG and pass its id to each GlowPolygon.
 */
export function GlowFilter({ id }) {
  return (
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
    </defs>
  );
}

/**
 * A polygon on the page background whose edge glows inwards only.
 *
 * A wide, blurred stroke is drawn on the edge and clipped to the shape, so
 * the half of the glow that would spill outside is cut away; a thin solid
 * edge goes on top. How strong the glow is comes from CSS (.hex-glow__halo
 * opacity), so hover, focus and selection can turn it up.
 */
export default function GlowPolygon({ points, filterId, className = '' }) {
  const clipId = useSvgId('hex-clip');
  return (
    <g className={`hex-glow ${className}`.trim()}>
      <clipPath id={clipId}>
        <polygon points={points} />
      </clipPath>
      <polygon className="hex-glow__fill" points={points} />
      <polygon className="hex-glow__halo" points={points} clipPath={`url(#${clipId})`} filter={`url(#${filterId})`} />
      <polygon className="hex-glow__edge" points={points} />
    </g>
  );
}
