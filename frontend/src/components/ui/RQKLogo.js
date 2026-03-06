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
  const sizes = {
    small: {
      rookieQuest: 'clamp(0.9rem, 2vw, 1.3rem)',
      keeper: 'clamp(1rem, 2.5vw, 1.5rem)',
      lineWidth: '20px',
      lineHeight: '2px',
      gap: '6px',
      letterSpacing: '2px',
      keeperSpacing: '4px'
    },
    default: {
      rookieQuest: 'clamp(1.2rem, 3vw, 1.8rem)',
      keeper: 'clamp(1.4rem, 3.5vw, 2.2rem)',
      lineWidth: '30px',
      lineHeight: '3px',
      gap: '8px',
      letterSpacing: '3px',
      keeperSpacing: '6px'
    },
    large: {
      rookieQuest: 'clamp(2rem, 5vw, 3rem)',
      keeper: 'clamp(2.5rem, 6vw, 4rem)',
      lineWidth: '50px',
      lineHeight: '4px',
      gap: '12px',
      letterSpacing: '6px',
      keeperSpacing: '10px'
    }
  };

  const s = sizes[size] || sizes.default;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      {/* ROOKIE QUEST */}
      <div style={{
        fontSize: s.rookieQuest,
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: s.letterSpacing,
        textTransform: 'uppercase',
        lineHeight: '1',
        textShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
      }}>
        ROOKIE QUEST
      </div>
      
      {/* KEEPER with accent lines */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        marginTop: '-2px'
      }}>
        {/* Left accent line - Blue */}
        <div style={{
          width: s.lineWidth,
          height: s.lineHeight,
          background: 'linear-gradient(90deg, transparent 0%, #3B82F6 100%)',
          borderRadius: '2px',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)'
        }} />
        
        {/* KEEPER text */}
        <div style={{
          fontSize: s.keeper,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          letterSpacing: s.keeperSpacing,
          textTransform: 'uppercase',
          lineHeight: '1',
          background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 50%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.3))'
        }}>
          KEEPER
        </div>
        
        {/* Right accent line - Purple */}
        <div style={{
          width: s.lineWidth,
          height: s.lineHeight,
          background: 'linear-gradient(90deg, #A855F7 0%, transparent 100%)',
          borderRadius: '2px',
          boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)'
        }} />
      </div>

      {/* Optional Tagline */}
      {showTagline && (
        <div style={{
          fontSize: size === 'large' ? '12px' : '10px',
          color: '#22D3EE',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginTop: '8px',
          fontWeight: '600'
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
  const sizes = {
    small: { fontSize: '14px', keeperSize: '16px', lineWidth: '12px' },
    default: { fontSize: '16px', keeperSize: '18px', lineWidth: '16px' }
  };
  const s = sizes[size] || sizes.small;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img src="/rqk-mascot.png" alt="ROOK" style={{ height: '32px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: s.fontSize,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '700',
          color: '#ffffff',
          letterSpacing: '1px',
          lineHeight: '1'
        }}>
          ROOKIE QUEST
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: s.lineWidth,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #3B82F6)',
            borderRadius: '1px'
          }} />
          <span style={{
            fontSize: s.keeperSize,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '900',
            background: 'linear-gradient(180deg, #ffffff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px',
            lineHeight: '1'
          }}>
            KEEPER
          </span>
          <div style={{
            width: s.lineWidth,
            height: '2px',
            background: 'linear-gradient(90deg, #A855F7, transparent)',
            borderRadius: '1px'
          }} />
        </div>
      </div>
    </div>
  );
};

export default RQKLogo;
