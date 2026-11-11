import React from 'react';

import './GuildMotif.css';

const R = 100;
const vertex = (index, radius) => {
  const angle = ((-90 + 60 * index) * Math.PI) / 180;
  return `${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`;
};
const hexPoints = (radius) => [0, 1, 2, 3, 4, 5].map((index) => vertex(index, radius)).join(' ');
const TICK_COUNT = 36;

/** How many of the ring's ticks are lit for a 0-1 progress value. */
export function litTicks(progress, count = TICK_COUNT) {
  const value = Number(progress);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(count, Math.max(1, Math.round(Math.min(1, value) * count)));
}

/**
 * The Rookie motif: a hexagon, a ring of ticks inside it and a smaller
 * hexagon in the middle. The ring fills clockwise from the top as
 * `progress` goes from 0 to 1, and the centre shows a short value under a
 * caption (a level, a step number).
 *
 * Decorative by default: pass `label` to give it an accessible name.
 */
export default function GuildMotif({ caption, value, progress = 0, size = 64, label, className = '' }) {
  const lit = litTicks(progress);
  const text = String(value ?? '');
  return (
    <svg
      className={`guild-motif ${className}`.trim()}
      viewBox="-110 -115 220 230"
      width={size}
      height={size * (230 / 220)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      data-testid="guild-motif"
      data-lit={lit}
    >
      <polygon className="guild-motif__case" points={hexPoints(R)} />
      <circle className="guild-motif__ring" cx="0" cy="0" r="84" />
      {Array.from({ length: TICK_COUNT }, (_, index) => (
        <line
          key={index}
          className={`guild-motif__tick${index < lit ? ' is-lit' : ''}`}
          x1="0"
          y1="-80"
          x2="0"
          y2="-62"
          transform={`rotate(${index * (360 / TICK_COUNT)})`}
        />
      ))}
      <polygon className="guild-motif__core" points={hexPoints(50)} />
      {caption && <text className="guild-motif__caption" x="0" y="-20" textAnchor="middle">{caption}</text>}
      <text className={`guild-motif__value${text.length > 2 ? ' is-long' : ''}`} x="0" y={caption ? 16 : 4} textAnchor="middle" dominantBaseline="middle">{text}</text>
    </svg>
  );
}
