import React from 'react';

import '@/styles/guildTokens.css';

/**
 * The Neon Coast gradients every glowing SVG edge strokes with, defined once
 * for the whole page. CSS reaches them through --guild-stroke-cool and
 * --guild-stroke-hot (url(#rq-glow-cool) and url(#rq-glow-hot)); each shape
 * gets the gradient across its own bounding box.
 *
 * The SVG is zero-sized rather than display:none, because browsers do not
 * paint gradients defined inside an undisplayed SVG.
 */
export default function GuildGlowDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true" focusable="false" data-testid="guild-glow-defs">
      <defs>
        <linearGradient id="rq-glow-cool" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3d8b" />
          <stop offset="0.5" stopColor="#b04dff" />
          <stop offset="1" stopColor="#4fb3ff" />
        </linearGradient>
        <linearGradient id="rq-glow-hot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb066" />
          <stop offset="0.5" stopColor="#ff5fa0" />
          <stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
