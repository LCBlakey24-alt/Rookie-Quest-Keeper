import React from 'react';

import '@/styles/guildTokens.css';

/**
 * The theme's gradients (from the --guild-* tokens) every glowing SVG edge strokes with, defined once
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
          <stop offset="0" style={{ stopColor: 'var(--guild-c1, #ff1976)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--guild-c2, #8c36dd)' }} />
          <stop offset="1" style={{ stopColor: 'var(--guild-c3, #5a4bff)' }} />
        </linearGradient>
        <linearGradient id="rq-glow-hot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--guild-h1, #f21751)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--guild-h2, #ff1976)' }} />
          <stop offset="1" style={{ stopColor: 'var(--guild-h3, #ff8fbf)' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
