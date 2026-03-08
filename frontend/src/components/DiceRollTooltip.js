import React, { useState, useEffect } from 'react';
import { Dice6, X, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'rook_dice_tooltip_shown';

/**
 * First-time tooltip to help users understand clickable dice boxes
 */
export function DiceRollTooltip() {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check if tooltip has been shown before
    const hasShown = localStorage.getItem(STORAGE_KEY);
    if (!hasShown) {
      // Find a dice roll button to position near
      const timer = setTimeout(() => {
        const diceButton = document.querySelector('[data-testid^="dice-roll-"]');
        if (diceButton) {
          const rect = diceButton.getBoundingClientRect();
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 10
          });
          setShow(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998
        }}
        onClick={handleDismiss}
      />
      
      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #1F1F1F, #262626)',
          border: '2px solid #F2A541',
          padding: '20px 24px',
          maxWidth: '320px',
          zIndex: 9999,
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)',
          animation: 'tooltipPulse 2s ease-in-out infinite'
        }}
      >
        {/* Arrow pointing up */}
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '10px solid #F2A541'
          }}
        />
        
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Dice6 size={20} color="#F2A541" />
          </div>
          <h3 style={{ 
            color: '#F2A541', 
            fontSize: '16px', 
            fontWeight: '400',
            margin: 0
          }}>
            Click to Roll Dice!
          </h3>
        </div>
        
        <p style={{ 
          color: '#B3B3B3', 
          fontSize: '14px', 
          lineHeight: '1.6',
          margin: '0 0 16px'
        }}>
          Any <span style={{ color: '#F2A541', fontWeight: '400' }}>blue box with a number</span> is 
          clickable! Click ability modifiers, skill bonuses, saves, or attack rolls to instantly roll dice.
        </p>

        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}>
          <Sparkles size={16} color="#F59E0B" />
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>
            <strong style={{ color: '#F59E0B' }}>Pro tip:</strong> Natural 20s show green, natural 1s show red!
          </span>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '10px',
            background: '#F2A541',
            border: 'none',
            color: '#000',
            fontWeight: '400',
            cursor: 'pointer'
          }}
        >
          Got it!
        </button>
      </div>

      <style>{`
        @keyframes tooltipPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.5); }
        }
      `}</style>
    </>
  );
}

/**
 * Reset tooltip for testing
 */
export function resetDiceTooltip() {
  localStorage.removeItem(STORAGE_KEY);
}

export default DiceRollTooltip;
