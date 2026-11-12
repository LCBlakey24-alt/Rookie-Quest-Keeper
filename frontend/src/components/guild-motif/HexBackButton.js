import React from 'react';
import { Link } from 'react-router-dom';

import '@/styles/guildTokens.css';
import './HexBackButton.css';

const POINTS = [0, 1, 2, 3, 4, 5]
  .map((index) => {
    const angle = ((-90 + 60 * index) * Math.PI) / 180;
    return `${(20 * Math.cos(angle)).toFixed(2)},${(20 * Math.sin(angle)).toFixed(2)}`;
  })
  .join(' ');

/**
 * The app's one back button: an arrow inside a hexagon. Used in the top-left
 * corner of every page that is not the home dashboard, so "back" looks and
 * behaves the same everywhere.
 */
export default function HexBackButton({ to = '/home', label = 'Back to home dashboard', className = '', ...rest }) {
  return (
    <Link to={to} className={`hex-back ${className}`.trim()} aria-label={label} title={label} data-testid="hex-back" {...rest}>
      <svg viewBox="-24 -24 48 48" width="44" height="44" aria-hidden="true" focusable="false">
        <polygon className="hex-back__case" points={POINTS} />
        <path className="hex-back__arrow" d="M 7 0 H -7 M -1.5 -6 L -7.5 0 L -1.5 6" />
      </svg>
    </Link>
  );
}
