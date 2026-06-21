import React from 'react';

/**
 * Grand ROOKIE QUEST KEEPER Text Logo Component
 * Used across all pages for consistent branding
 */
export const RQKLogo = ({ 
  size = 'default', // 'small', 'default', 'large'
  showTagline = false,
  className = '',
  style = {}
}) => {
  const widths = { small: 180, default: 280, large: 430 };
  const width = widths[size] || widths.default;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <img
        src="/images/logo-main.png"
        alt="Rookie Quest Keeper"
        style={{ width: `min(${width}px, 86vw)`, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 22px rgba(0,0,0,0.45))' }}
      />
      {showTagline && (
        <div style={{
          fontFamily: "var(--rq-font-display, 'Fraunces', 'RQKDisplay', serif)",
          fontSize: size === 'large' ? '13px' : '11px',
          color: 'var(--rq-accent-hover, #E0B15C)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginTop: '8px',
          fontWeight: 900
        }}>
          Campaign Operating System
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline logo for navigation bars
 */
export const RQKLogoInline = ({ size = 'small' }) => {
  const widths = { small: 112, default: 150 };
  const width = widths[size] || widths.small;

  return (
    <img
      src="/images/logo-main.png"
      alt="Rookie Quest Keeper"
      style={{ width, maxWidth: '42vw', height: 'auto', objectFit: 'contain' }}
    />
  );
};

export default RQKLogo;
