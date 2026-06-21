import React from 'react';

/**
 * ROOK AI Assistant Icon Component
 * R.O.O.K = Roleplaying Organization Operations Keeper
 */
export const RookIcon = ({ size = 24, className = '', style = {} }) => {
  return (
    <img
      src="/images/logo-mini.png"
      alt="ROOK"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        ...style
      }}
    />
  );
};

/**
 * ROOK Logo Component (full logo with mascot)
 */
export const RookLogo = ({ height = 40, className = '', style = {} }) => {
  return (
    <img
      src="/images/logo-main.png"
      alt="Rookie Quest Keeper"
      height={height}
      className={className}
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain',
        ...style
      }}
    />
  );
};

/**
 * RQK Text Logo Component
 */
export const RQKTextLogo = ({ height = 32, className = '', style = {} }) => {
  return (
    <img
      src="/images/logo-main.png"
      alt="Rookie Quest Keeper"
      height={height}
      className={className}
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain',
        ...style
      }}
    />
  );
};

/**
 * ROOK Badge - for use in buttons and panels
 */
export const RookBadge = ({
  label = 'ROOK',
  size = 'default',
  variant = 'default' // 'default', 'glow', 'outline'
}) => {
  const sizes = {
    small: { icon: 16, fontSize: '12px', padding: '4px 8px', gap: '4px' },
    default: { icon: 20, fontSize: '14px', padding: '6px 12px', gap: '6px' },
    large: { icon: 28, fontSize: '16px', padding: '8px 16px', gap: '8px' }
  };

  const s = sizes[size] || sizes.default;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: s.gap,
    padding: s.padding,
    borderRadius: '8px',
    fontSize: s.fontSize,
    fontWeight: '700',
    fontFamily: "var(--rq-font-display, 'Fraunces', 'RQKDisplay', serif)",
    transition: 'all 0.2s ease'
  };

  const variants = {
    default: {
      background: 'var(--rq-accent-soft, rgba(192, 138, 61, 0.14))',
      color: 'var(--rq-accent-hover, #E0B15C)',
      border: '1px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))'
    },
    glow: {
      background: 'linear-gradient(135deg, var(--rq-accent-primary, #C08A3D) 0%, var(--rq-accent-hover, #E0B15C) 100%)',
      color: 'var(--rq-text-inverse, #120C08)',
      border: 'none',
      boxShadow: '0 4px 20px rgba(192, 138, 61, 0.34)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--rq-accent-hover, #E0B15C)',
      border: '2px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))'
    }
  };

  return (
    <span style={{ ...baseStyle, ...variants[variant] }}>
      <RookIcon size={s.icon} />
      {label}
    </span>
  );
};

export default RookIcon;
