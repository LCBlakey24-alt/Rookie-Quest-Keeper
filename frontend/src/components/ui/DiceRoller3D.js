import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Dice face configurations for 3D effect
const DICE_FACES = {
  d4: ['1', '2', '3', '4'],
  d6: ['1', '2', '3', '4', '5', '6'],
  d8: ['1', '2', '3', '4', '5', '6', '7', '8'],
  d10: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  d12: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  d20: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
  d100: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '00']
};

const DiceRoller3D = ({ isOpen, onClose, rolls, label, modifier = 0, total, isCrit, isFumble }) => {
  const [phase, setPhase] = useState('rolling'); // rolling, bouncing, final
  const [displayNumbers, setDisplayNumbers] = useState([]);
  const [showTotal, setShowTotal] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPhase('rolling');
      setDisplayNumbers([]);
      setShowTotal(false);
      return;
    }

    // Phase 1: Rolling animation with random numbers
    const rollInterval = setInterval(() => {
      setDisplayNumbers(rolls.map(roll => ({
        ...roll,
        display: Math.floor(Math.random() * roll.sides) + 1
      })));
    }, 50);

    // Phase 2: Stop rolling, show bounce
    setTimeout(() => {
      clearInterval(rollInterval);
      setDisplayNumbers(rolls.map(roll => ({
        ...roll,
        display: roll.result
      })));
      setPhase('bouncing');
    }, 800);

    // Phase 3: Show final with total
    setTimeout(() => {
      setPhase('final');
      setShowTotal(true);
    }, 1500);

    // Auto close after display
    setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearInterval(rollInterval);
  }, [isOpen, rolls, onClose]);

  if (!isOpen) return null;

  const getCritColor = () => {
    if (isCrit) return '#F59E0B'; // Green for nat 20
    if (isFumble) return '#ef4444'; // Red for nat 1
    return '#ee006b'; // Pink default (new theme)
  };

  // New purple/pink theme colors for dice
  const getDiceColor = (sides) => {
    return '#390292'; // All dice use main purple
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(57, 2, 146, 0.95), rgba(238, 0, 107, 0.9))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        cursor: 'pointer'
      }}
    >
      {/* Label */}
      <div style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '24px',
        color: '#94A3B8',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        opacity: phase === 'final' ? 1 : 0.7,
        transition: 'opacity 0.3s'
      }}>
        {label}
      </div>

      {/* Dice Container */}
      <div style={{
        display: 'flex',
        gap: '30px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {displayNumbers.map((die, index) => (
          <div
            key={index}
            style={{
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${getDiceColor(die.sides)}40, ${getDiceColor(die.sides)}20)`,
              border: `3px solid ${getDiceColor(die.sides)}`,
              borderRadius: die.sides === 4 ? '0' : die.sides === 6 ? '16px' : '50%',
              transform: die.sides === 4 ? 'rotate(45deg)' : 'none',
              boxShadow: phase === 'final' 
                ? `0 0 30px ${getDiceColor(die.sides)}80, 0 0 60px ${getDiceColor(die.sides)}40`
                : `0 0 15px ${getDiceColor(die.sides)}40`,
              animation: phase === 'rolling' 
                ? 'diceRoll 0.8s ease-out forwards' 
                : phase === 'bouncing' 
                  ? 'numberBounce 0.7s ease-out forwards'
                  : 'glowPulse 2s ease-in-out infinite',
              transition: 'box-shadow 0.3s'
            }}
          >
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: die.display >= 10 ? '42px' : '52px',
              fontWeight: '700',
              color: die.result === die.sides ? '#F59E0B' : die.result === 1 ? '#ef4444' : '#F8FAFC',
              transform: die.sides === 4 ? 'rotate(-45deg)' : 'none',
              textShadow: `0 0 20px ${getDiceColor(die.sides)}`
            }}>
              {die.display}
            </span>
          </div>
        ))}
      </div>

      {/* Dice Type Labels */}
      <div style={{
        display: 'flex',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {displayNumbers.map((die, index) => (
          <div
            key={index}
            style={{
              width: '120px',
              textAlign: 'center',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '14px',
              color: getDiceColor(die.sides),
              fontWeight: '600',
              letterSpacing: '0.1em'
            }}
          >
            d{die.sides}
          </div>
        ))}
      </div>

      {/* Total Display */}
      {showTotal && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'numberBounce 0.5s ease-out forwards'
        }}>
          {modifier !== 0 && (
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '18px',
              color: '#94A3B8',
              marginBottom: '8px'
            }}>
              {rolls.map(r => r.result).join(' + ')}{modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`}
            </div>
          )}
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '72px',
            fontWeight: '700',
            color: getCritColor(),
            textShadow: `0 0 40px ${getCritColor()}80, 0 0 80px ${getCritColor()}40`,
            animation: isCrit || isFumble ? 'glowPulse 1s ease-in-out infinite' : 'none'
          }}>
            {total}
          </div>
          {isCrit && (
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '24px',
              color: '#F59E0B',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              marginTop: '10px',
              textShadow: '0 0 20px rgba(34, 197, 94, 0.8)'
            }}>
              CRITICAL HIT!
            </div>
          )}
          {isFumble && (
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '24px',
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              marginTop: '10px',
              textShadow: '0 0 20px rgba(239, 68, 68, 0.8)'
            }}>
              CRITICAL MISS!
            </div>
          )}
        </div>
      )}

      {/* Click to close hint */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: '12px',
        color: '#64748b',
        letterSpacing: '0.1em'
      }}>
        Click anywhere to close
      </div>
    </div>,
    document.body
  );
};

// Hook to use the dice roller
export const useDiceRoller = () => {
  const [rollState, setRollState] = useState({
    isOpen: false,
    rolls: [],
    label: '',
    modifier: 0,
    total: 0,
    isCrit: false,
    isFumble: false
  });

  const rollDice = useCallback((diceNotation, modifier = 0, label = 'Roll') => {
    // Parse dice notation like "1d20", "2d6", "1d20+1d8"
    const dicePattern = /(\d+)d(\d+)/g;
    const rolls = [];
    let match;
    let total = modifier;
    let isCrit = false;
    let isFumble = false;

    while ((match = dicePattern.exec(diceNotation)) !== null) {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      
      for (let i = 0; i < count; i++) {
        const result = Math.floor(Math.random() * sides) + 1;
        rolls.push({ sides, result });
        total += result;
        
        // Check for crits on d20
        if (sides === 20) {
          if (result === 20) isCrit = true;
          if (result === 1) isFumble = true;
        }
      }
    }

    setRollState({
      isOpen: true,
      rolls,
      label,
      modifier,
      total,
      isCrit,
      isFumble
    });

    return { rolls, total, isCrit, isFumble };
  }, []);

  const closeRoller = useCallback(() => {
    setRollState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { rollState, rollDice, closeRoller, DiceRoller3D };
};

export default DiceRoller3D;
