import React from 'react';

import '@/styles/guildTokens.css';
import './HexBackdrop.css';

/** A pointy-top hexagon of radius 100 around (0, 0), like the back button's. */
const HEX = [0, 1, 2, 3, 4, 5]
  .map((index) => {
    const angle = ((-90 + 60 * index) * Math.PI) / 180;
    return `${(100 * Math.cos(angle)).toFixed(2)},${(100 * Math.sin(angle)).toFixed(2)}`;
  })
  .join(' ');

/**
 * The large hexagons behind every page. Each is the app's motif (a ring
 * inside a hexagon) drawn as a faint Neon Coast outline, turning very
 * slowly; sizes, places and speeds live in HexBackdrop.css. Purely
 * decorative: hidden from assistive technology, never takes a click, and
 * still for anyone who prefers reduced motion.
 */
export const BACKDROP_HEXES = ['one', 'two', 'three', 'four', 'five'];

export default function HexBackdrop() {
  return (
    <div className="rq-hex-backdrop" aria-hidden="true" data-testid="hex-backdrop">
      {BACKDROP_HEXES.map((name) => (
        <svg key={name} className={`rq-hex-backdrop__hex rq-hex-backdrop__hex--${name}`} viewBox="-110 -110 220 220" focusable="false">
          <polygon className="rq-hex-backdrop__case" points={HEX} />
          <circle className="rq-hex-backdrop__ring" r="80" />
          <polygon className="rq-hex-backdrop__inner" points={HEX} transform="scale(0.5) rotate(30)" />
        </svg>
      ))}
    </div>
  );
}
