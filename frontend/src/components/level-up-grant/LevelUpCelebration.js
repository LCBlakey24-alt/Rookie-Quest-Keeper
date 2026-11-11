import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import './LevelUpCelebration.css';

const R = 100;
const vertex = (i, r) => {
  const a = ((-90 + 60 * i) * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
};
const hex = (r) => [0, 1, 2, 3, 4, 5].map((i) => vertex(i, r)).join(' ');
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

/**
 * "Levelled up!": the Rookie motif (hexagon, ring, smaller hexagon) with the
 * ring of ticks sweeping round and the new level arriving in the centre.
 * Shown once per GM grant. "Level up now" goes to the wizard; "Later" (or
 * Escape) closes it and the sheet keeps a "Level up ready" reminder.
 *
 * The level-up wizard reuses it when a level is confirmed, with its own
 * message and a single button (`secondaryLabel={null}`).
 */
export default function LevelUpCelebration({
  grant,
  onLevelUp,
  onLater,
  title = 'Levelled up!',
  message,
  primaryLabel = 'Level up now',
  secondaryLabel = 'Later',
}) {
  const primaryRef = useRef(null);
  useEffect(() => { primaryRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onLater?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLater]);

  const overlay = (
    <div className="rq-levelup" data-testid="level-up-celebration">
      {/* A native dialog (not role="dialog"): the app's layered dialog-panel styles key on the role attribute. */}
      <dialog open className="rq-levelup__stage" aria-modal="true" aria-labelledby="rq-levelup-title">
        <svg className="rq-levelup__motif" viewBox="-110 -115 220 230" aria-hidden="true">
          <defs>
            <filter id="rq-levelup-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
          </defs>
          <polygon className="rq-levelup__case-glow" points={hex(R)} filter="url(#rq-levelup-soft)" />
          <polygon className="rq-levelup__case" points={hex(R)} />
          <circle className="rq-levelup__ring" cx="0" cy="0" r="84" />
          <circle className="rq-levelup__pulse" cx="0" cy="0" r="84" />
          <g className="rq-levelup__ticks">
            {TICKS.map((angle) => {
              const a = ((angle - 90) * Math.PI) / 180;
              return <line key={angle} x1={62 * Math.cos(a)} y1={62 * Math.sin(a)} x2={80 * Math.cos(a)} y2={80 * Math.sin(a)} style={{ animationDelay: `${angle * 3}ms` }} />;
            })}
          </g>
          <polygon className="rq-levelup__core-glow" points={hex(50)} filter="url(#rq-levelup-soft)" />
          <polygon className="rq-levelup__core" points={hex(50)} />
          <text className="rq-levelup__from" x="0" y="4" textAnchor="middle" dominantBaseline="central">{grant.from_level}</text>
          <text className="rq-levelup__to" x="0" y="4" textAnchor="middle" dominantBaseline="central">{grant.to_level}</text>
          <text className="rq-levelup__caption" x="0" y="-30" textAnchor="middle" dominantBaseline="central">LEVEL</text>
        </svg>
        <h2 id="rq-levelup-title" className="rq-levelup__title">{title}</h2>
        <p className="rq-levelup__text">
          {message || (
            <>
              <strong>{grant.character_name}</strong> can now reach level {grant.to_level}
              {grant.campaign_name ? <span> · {grant.campaign_name}</span> : null}
            </>
          )}
        </p>
        <div className="rq-levelup__actions">
          <button ref={primaryRef} type="button" className="rq-levelup__primary" onClick={onLevelUp} data-testid="level-up-now">{primaryLabel}</button>
          {secondaryLabel && <button type="button" className="rq-levelup__secondary" onClick={onLater} data-testid="level-up-later">{secondaryLabel}</button>}
        </div>
      </dialog>
    </div>
  );
  // On the body, so no transformed or clipped app-shell ancestor can shrink it.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}
