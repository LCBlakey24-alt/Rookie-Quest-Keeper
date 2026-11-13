import React from 'react';

import '@/styles/guildTokens.css';
import './HexLoader.css';
import '@/styles/hexLoadingScreens.css';

/*
 * The app's loading mark: a hexagon turning slowly one way with the sheet's
 * wheel (six wedges round a centre hexagon) turning the other way inside it.
 * The hexagon's edge is the ordinary pink -> violet -> blue Neon Coast edge,
 * the wheel's the warm peach -> pink -> gold, each with a soft glow kept
 * inside the shape (DESIGN_SYSTEM §3). It stands still for reduced motion.
 *
 * It never claims progress: there is no percentage, only movement.
 */
const point = (radius, degrees) => {
  const angle = (degrees * Math.PI) / 180;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
};
const fmt = ([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`;
const hexagon = (radius) => [0, 1, 2, 3, 4, 5].map((step) => fmt(point(radius, step * 60 - 90))).join(' ');

const OUTER_HEX = hexagon(100);
const OUTER_GLOW = hexagon(93);
const CENTRE_HEX = hexagon(30);
const RING_OUTER = 70;
const RING_INNER = 40;
const GAP = 4; // degrees between wedges

function wedgePath(index) {
  const start = index * 60 - 90 + GAP / 2;
  const end = start + 60 - GAP;
  const [ox1, oy1] = point(RING_OUTER, start);
  const [ox2, oy2] = point(RING_OUTER, end);
  const [ix2, iy2] = point(RING_INNER, end);
  const [ix1, iy1] = point(RING_INNER, start);
  return `M${ox1.toFixed(2)} ${oy1.toFixed(2)} A${RING_OUTER} ${RING_OUTER} 0 0 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)} `
    + `L${ix2.toFixed(2)} ${iy2.toFixed(2)} A${RING_INNER} ${RING_INNER} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
}
const WEDGES = [0, 1, 2, 3, 4, 5].map(wedgePath);

let loaderCount = 0;

/**
 * size: 'sm' (36px, inline beside text), 'md' (84px, the default) or
 * 'lg' (160px, the full-page route loader). label adds a status line under
 * the mark (and makes it a polite live region); withLogo puts the Rookie
 * mark in the centre hexagon.
 */
export default function HexLoader({ size = 'md', label = '', withLogo = false, className = '' }) {
  const id = React.useMemo(() => {
    loaderCount += 1;
    return `rq-hex-loader-${loaderCount}`;
  }, []);
  const mark = (
    <svg className="rq-hex-loader__mark" viewBox="-108 -108 216 216" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-cool`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="rq-hex-loader__stop-c1" />
          <stop offset="50%" className="rq-hex-loader__stop-c2" />
          <stop offset="100%" className="rq-hex-loader__stop-c3" />
        </linearGradient>
        <linearGradient id={`${id}-hot`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="rq-hex-loader__stop-h1" />
          <stop offset="50%" className="rq-hex-loader__stop-h2" />
          <stop offset="100%" className="rq-hex-loader__stop-h3" />
        </linearGradient>
        <clipPath id={`${id}-centre`}><polygon points={CENTRE_HEX} /></clipPath>
      </defs>
      <g className="rq-hex-loader__case">
        <polygon className="rq-hex-loader__case-glow" points={OUTER_GLOW} stroke={`url(#${id}-cool)`} />
        <polygon className="rq-hex-loader__case-edge" points={OUTER_HEX} stroke={`url(#${id}-cool)`} />
      </g>
      <g className="rq-hex-loader__wheel">
        {WEDGES.map((d, index) => (
          <path key={d} className={`rq-hex-loader__wedge rq-hex-loader__wedge--${index}`} d={d} stroke={`url(#${id}-hot)`} />
        ))}
      </g>
      <polygon className="rq-hex-loader__centre" points={CENTRE_HEX} stroke={`url(#${id}-hot)`} />
      {withLogo && (
        <image
          className="rq-hex-loader__logo"
          href="/brand/rqk-hex-logo-360.png"
          x="-26" y="-26" width="52" height="52"
          clipPath={`url(#${id}-centre)`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
    </svg>
  );
  return (
    <div
      className={`rq-hex-loader rq-hex-loader--${size}${className ? ` ${className}` : ''}`}
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
      data-testid="hex-loader"
    >
      {mark}
      {label && <p className="rq-hex-loader__label">{label}</p>}
    </div>
  );
}
