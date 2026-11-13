import React, { useId, useState } from 'react';

import '@/styles/guildTokens.css';

/*
 * A character's portrait in a hexagon, for the player display (second
 * screen). The edge is the Neon Coast edge (DESIGN_SYSTEM §3): cool
 * (pink -> violet -> blue) for a party member, warm (peach -> pink -> gold)
 * for whoever's turn it is, and red for a visible enemy. A player's
 * portrait also carries a health ring just inside the edge, drawn round the
 * hexagon from the top: green when healthy, amber when hurt, red when
 * bloodied, empty when down. Status colours stay semantic.
 */
const R = 50;
const POINTS = [0, 1, 2, 3, 4, 5].map((step) => {
  const angle = ((step * 60) - 90) * (Math.PI / 180);
  return `${(R * Math.cos(angle)).toFixed(2)},${(R * Math.sin(angle)).toFixed(2)}`;
}).join(' ');
const RING = [0, 1, 2, 3, 4, 5, 0].map((step) => {
  const angle = ((step * 60) - 90) * (Math.PI / 180);
  return `${(44 * Math.cos(angle)).toFixed(2)},${(44 * Math.sin(angle)).toFixed(2)}`;
}).join(' ');
const RING_LENGTH = 44 * 6; // a regular hexagon's side equals its radius

export function healthTone(percent, status) {
  if (status === 'down' || percent <= 0) return 'down';
  if (status === 'bloodied' || percent <= 33) return 'bloodied';
  if (status === 'hurt' || percent <= 66) return 'hurt';
  return 'healthy';
}

export default function DisplayHexPortrait({ imageUrl, name, tone = 'cool', size = 64, hpPercent = null, hpStatus = '' }) {
  const id = useId().replace(/:/g, '');
  const [failed, setFailed] = useState(false);
  const initials = String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('') || '?';
  const showRing = hpPercent !== null && hpPercent !== undefined && Number.isFinite(Number(hpPercent));
  const percent = showRing ? Math.max(0, Math.min(100, Number(hpPercent))) : 0;
  const health = healthTone(percent, hpStatus);
  return (
    <span
      className={`rqk-display-hex rqk-display-hex--${tone}`}
      style={{ width: size, height: size * 1.1547 }}
      data-testid="display-hex-portrait"
      data-tone={tone}
      data-health={showRing ? health : undefined}
    >
      <svg viewBox="-54 -58 108 116" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`${id}-clip`}><polygon points={POINTS} /></clipPath>
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="rqk-display-hex__stop-1" />
            <stop offset="50%" className="rqk-display-hex__stop-2" />
            <stop offset="100%" className="rqk-display-hex__stop-3" />
          </linearGradient>
        </defs>
        <polygon className="rqk-display-hex__fill" points={POINTS} />
        {imageUrl && !failed ? (
          <image href={imageUrl} x="-50" y="-58" width="100" height="116" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-clip)`} onError={() => setFailed(true)} />
        ) : (
          <text className="rqk-display-hex__initials" x="0" y="2" textAnchor="middle" dominantBaseline="central">{initials}</text>
        )}
        <polygon className="rqk-display-hex__glow" points={POINTS} stroke={`url(#${id}-edge)`} clipPath={`url(#${id}-clip)`} />
        <polygon className="rqk-display-hex__edge" points={POINTS} stroke={`url(#${id}-edge)`} />
        {showRing && (
          <>
            <polyline className="rqk-display-hex__ring-track" points={RING} />
            <polyline
              className={`rqk-display-hex__ring rqk-display-hex__ring--${health}`}
              points={RING}
              strokeDasharray={`${(RING_LENGTH * percent) / 100} ${RING_LENGTH}`}
            />
          </>
        )}
      </svg>
    </span>
  );
}
