import React from 'react';

/**
 * ROOK AI Assistant Icon Component
 * R.O.O.K = Roleplaying Organization Operations Keeper
 */
export const RookIcon = ({ size = 24, className = '', style = {} }) => {
  return (
    <img 
      src="/rqk-mascot.png" 
      alt="ROOK AI"
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
      src="/rqk-logo-mascot.png" 
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
      src="/rqk-logo-text.png" 
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
    fontFamily: 'Cityworm, sans-serif',
    transition: 'all 0.2s ease'
  };

  const variants = {
    default: {
      background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
      color: '#22D3EE',
      border: '1px solid rgba(34, 211, 238, 0.3)'
    },
    glow: {
      background: 'linear-gradient(135deg, #22D3EE 0%, #3B82F6 100%)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)'
    },
    outline: {
      background: 'transparent',
      color: '#22D3EE',
      border: '2px solid #22D3EE'
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
