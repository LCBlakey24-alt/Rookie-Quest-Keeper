import React, { useId } from 'react';
import { normaliseFog } from '@/lib/fogOfWar';

// This layer sits over BOTH the map and its creature tokens. Unrevealed enemies
// must never bleed through an opaque fog overlay on the player screen.
export default function FogMask({ fog, editor = false }) {
  const id = useId().replace(/:/g, '_');
  const value = normaliseFog(fog);
  if (!value.enabled) return null;
  return (
    <svg data-testid="player-fog-mask" viewBox="0 0 100 100" preserveAspectRatio="none"
      aria-hidden="true" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      <defs>
        <mask id={id}>
          <rect x="0" y="0" width="100" height="100" fill="white" />
          {value.reveals.map((spot, i) => <ellipse key={i} cx={spot.x} cy={spot.y} rx={spot.radius} ry={spot.radius} fill="black" />)}
        </mask>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill={editor ? 'rgba(3,10,20,0.68)' : '#030a14'} mask={`url(#${id})`} />
      {editor && value.reveals.map((spot, i) => <ellipse key={i} cx={spot.x} cy={spot.y} rx={spot.radius} ry={spot.radius} fill="none" stroke="#e3bd6d" strokeWidth=".35" strokeDasharray="1 .5" />)}
    </svg>
  );
}
