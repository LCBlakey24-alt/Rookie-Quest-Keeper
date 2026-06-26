import React from 'react';

const titleFont = "'Metal Mania', 'Cinzel Decorative', Georgia, serif";
const logoColor = 'var(--rq-text-primary, #F6EAD2)';

/**
 * Text-based mini mark: R stacked over Q, with a larger K to the right.
 * Transparent by construction; no image background required.
 */
export const RookIcon = ({ size = 24, className = '', style = {} }) => {
  const numericSize = Number(size) || 24;
  return (
    <span
      aria-label="RQK"
      className={className}
      style={{
        width: numericSize,
        height: numericSize,
        display: 'inline-grid',
        gridTemplateColumns: '0.42fr 0.58fr',
        gridTemplateRows: '1fr',
        alignItems: 'center',
        justifyItems: 'center',
        lineHeight: 0.82,
        color: logoColor,
        fontFamily: titleFont,
        fontWeight: 400,
        letterSpacing: '-0.08em',
        background: 'transparent',
        overflow: 'visible',
        ...style,
      }}
    >
      <span style={{ display: 'grid', gridTemplateRows: '1fr 1fr', alignItems: 'center', justifyItems: 'center', width: '100%', height: '100%' }}>
        <span style={{ fontSize: numericSize * 0.48 }}>R</span>
        <span style={{ fontSize: numericSize * 0.48 }}>Q</span>
      </span>
      <span style={{ fontSize: numericSize * 1.08, transform: 'translateX(-5%)' }}>K</span>
    </span>
  );
};

/**
 * Full text wordmark: small Rookie Quest above larger Keeper.
 */
export const RookLogo = ({ height = 54, className = '', style = {} }) => {
  const numericHeight = Number(height) || 54;
  return (
    <span
      aria-label="Rookie Quest Keeper"
      className={className}
      style={{
        display: 'inline-grid',
        gap: 0,
        lineHeight: 0.78,
        color: logoColor,
        fontFamily: titleFont,
        background: 'transparent',
        width: 'max-content',
        maxWidth: '100%',
        ...style,
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: Math.max(12, numericHeight * 0.32),
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        Rookie Quest
      </span>
      <span
        style={{
          display: 'block',
          fontSize: Math.max(28, numericHeight * 0.9),
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Keeper
      </span>
    </span>
  );
};

export const RQKTextLogo = RookLogo;

/**
 * ROOK Badge - for use in buttons and panels.
 */
export const RookBadge = ({
  label = 'ROOK',
  size = 'default',
  variant = 'default'
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
    borderRadius: 0,
    fontSize: s.fontSize,
    fontWeight: '700',
    fontFamily: "var(--rq-body-font, Inter, ui-sans-serif, system-ui, sans-serif)",
    background: 'transparent',
    color: 'var(--rq-accent-hover, #E0B15C)',
    border: '1px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))',
    boxShadow: 'none',
  };

  const variants = {
    default: {},
    glow: {
      background: 'var(--rq-accent-primary, #C08A3D)',
      color: 'var(--rq-text-on-accent, #120C08)',
      border: '1px solid var(--rq-accent-primary, #C08A3D)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--rq-accent-hover, #E0B15C)',
      border: '1px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))'
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
