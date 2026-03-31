import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DiceRoller3D = ({ isOpen, onClose, rolls, label, modifier = 0, total, isCrit, isFumble, theme = 'gm' }) => {
  const [phase, setPhase] = useState('rolling'); // rolling, bouncing, final
  const [displayNumbers, setDisplayNumbers] = useState([]);
  const [showTotal, setShowTotal] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [edgeGlowIntensity, setEdgeGlowIntensity] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase('rolling');
      setDisplayNumbers([]);
      setShowTotal(false);
      setRotation({ x: 0, y: 0, z: 0 });
      setEdgeGlowIntensity(0);
      return;
    }

    // Phase 1: Rolling animation with random numbers and rotation
    let spinInterval;
    const rollInterval = setInterval(() => {
      setDisplayNumbers(rolls.map(roll => ({
        ...roll,
        display: Math.floor(Math.random() * roll.sides) + 1
      })));
    }, 50);

    // Spin animation
    spinInterval = setInterval(() => {
      setRotation(prev => ({
        x: prev.x + 25,
        y: prev.y + 35,
        z: prev.z + 15
      }));
    }, 30);

    // Phase 2: Stop rolling, show bounce
    setTimeout(() => {
      clearInterval(rollInterval);
      clearInterval(spinInterval);
      setRotation({ x: 0, y: 0, z: 0 });
      setDisplayNumbers(rolls.map(roll => ({
        ...roll,
        display: roll.result
      })));
      setPhase('bouncing');
    }, 800);

    // Phase 3: Show final with total and edge glow
    setTimeout(() => {
      setPhase('final');
      setShowTotal(true);
      // Trigger edge glow animation
      setEdgeGlowIntensity(1);
    }, 1500);

    // Auto close after display
    setTimeout(() => {
      onClose();
    }, 4000);

    return () => {
      clearInterval(rollInterval);
      clearInterval(spinInterval);
    };
  }, [isOpen, rolls, onClose]);

  if (!isOpen) return null;

  // Theme colors
  const colors = theme === 'player' 
    ? { primary: '#4DD0E1', secondary: '#0066FF', glow: 'rgba(77, 208, 225, 0.6)' }
    : { primary: '#8A2BE2', secondary: '#4B0082', glow: 'rgba(138, 43, 226, 0.6)' };

  // Edge glow color based on result
  const getEdgeGlowColor = () => {
    if (isCrit) return { color: '#22C55E', glow: 'rgba(34, 197, 94, 0.8)' }; // Green for nat 20
    if (isFumble) return { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.8)' }; // Red for nat 1
    return { color: colors.primary, glow: colors.glow }; // Theme color for normal
  };

  const edgeGlow = getEdgeGlowColor();

  const getCritColor = () => {
    if (isCrit) return '#22C55E'; // Green for nat 20
    if (isFumble) return '#EF4444'; // Red for nat 1
    return colors.primary;
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
        zIndex: 10000,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      {/* Edge Glow Effect - All 4 sides */}
      {phase === 'final' && (
        <>
          {/* Top edge glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: `linear-gradient(180deg, ${edgeGlow.glow} 0%, transparent 100%)`,
            opacity: edgeGlowIntensity,
            pointerEvents: 'none',
            animation: 'edgeGlowPulse 1.5s ease-in-out infinite',
            zIndex: 1
          }} />
          
          {/* Bottom edge glow */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '150px',
            background: `linear-gradient(0deg, ${edgeGlow.glow} 0%, transparent 100%)`,
            opacity: edgeGlowIntensity,
            pointerEvents: 'none',
            animation: 'edgeGlowPulse 1.5s ease-in-out infinite',
            zIndex: 1
          }} />
          
          {/* Left edge glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '150px',
            background: `linear-gradient(90deg, ${edgeGlow.glow} 0%, transparent 100%)`,
            opacity: edgeGlowIntensity,
            pointerEvents: 'none',
            animation: 'edgeGlowPulse 1.5s ease-in-out infinite',
            zIndex: 1
          }} />
          
          {/* Right edge glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '150px',
            background: `linear-gradient(270deg, ${edgeGlow.glow} 0%, transparent 100%)`,
            opacity: edgeGlowIntensity,
            pointerEvents: 'none',
            animation: 'edgeGlowPulse 1.5s ease-in-out infinite',
            zIndex: 1
          }} />

          {/* Corner intensifiers for critical hits/misses */}
          {(isCrit || isFumble) && (
            <>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle at 0% 0%, ${edgeGlow.glow} 0%, transparent 70%)`,
                opacity: edgeGlowIntensity,
                pointerEvents: 'none',
                animation: 'cornerPulse 1s ease-in-out infinite',
                zIndex: 2
              }} />
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle at 100% 0%, ${edgeGlow.glow} 0%, transparent 70%)`,
                opacity: edgeGlowIntensity,
                pointerEvents: 'none',
                animation: 'cornerPulse 1s ease-in-out infinite',
                animationDelay: '0.25s',
                zIndex: 2
              }} />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle at 0% 100%, ${edgeGlow.glow} 0%, transparent 70%)`,
                opacity: edgeGlowIntensity,
                pointerEvents: 'none',
                animation: 'cornerPulse 1s ease-in-out infinite',
                animationDelay: '0.5s',
                zIndex: 2
              }} />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle at 100% 100%, ${edgeGlow.glow} 0%, transparent 70%)`,
                opacity: edgeGlowIntensity,
                pointerEvents: 'none',
                animation: 'cornerPulse 1s ease-in-out infinite',
                animationDelay: '0.75s',
                zIndex: 2
              }} />
            </>
          )}
        </>
      )}

      {/* Label */}
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: '20px',
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '24px',
        textTransform: 'uppercase',
        letterSpacing: '0.3em',
        fontWeight: '500',
        opacity: phase === 'final' ? 1 : 0.7,
        transition: 'opacity 0.3s',
        zIndex: 10
      }}>
        {label}
      </div>

      {/* Dice Container */}
      <div style={{
        display: 'flex',
        gap: '40px',
        marginBottom: '40px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        perspective: '1000px',
        zIndex: 10
      }}>
        {displayNumbers.map((die, index) => {
          const isHighlight = die.result === die.sides || die.result === 1;
          const dieColor = die.result === die.sides ? '#22C55E' : die.result === 1 ? '#EF4444' : colors.primary;
          
          return (
            <div
              key={index}
              style={{
                width: '140px',
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: phase === 'rolling' 
                  ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
                  : phase === 'bouncing'
                    ? 'rotateX(0deg) rotateY(0deg) scale(1.1)'
                    : 'rotateX(0deg) rotateY(0deg) scale(1)',
                transition: phase === 'rolling' ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Dice shape */}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(145deg, rgba(30, 30, 40, 0.95), rgba(15, 15, 20, 0.98))`,
                border: `4px solid ${dieColor}`,
                borderRadius: die.sides === 4 ? '4px' : die.sides === 6 ? '20px' : '50%',
                boxShadow: phase === 'final' 
                  ? `0 0 50px ${dieColor}80, 0 0 100px ${dieColor}40, inset 0 0 40px ${dieColor}30`
                  : `0 0 25px ${dieColor}50, inset 0 0 20px ${dieColor}15`,
                animation: phase === 'final' && isHighlight ? 'diceGlow 1.5s ease-in-out infinite' : 'none',
                transform: die.sides === 4 ? 'rotate(45deg)' : 'none'
              }}>
                {/* Number */}
                <span style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: die.display >= 10 ? '52px' : '64px',
                  fontWeight: '800',
                  color: phase === 'final' ? (isHighlight ? dieColor : '#FFFFFF') : 'rgba(255, 255, 255, 0.85)',
                  transform: die.sides === 4 ? 'rotate(-45deg)' : 'none',
                  textShadow: phase === 'final' 
                    ? `0 0 40px ${dieColor}, 0 0 80px ${dieColor}90`
                    : '0 0 10px rgba(255,255,255,0.3)',
                  transition: 'color 0.3s, text-shadow 0.3s'
                }}>
                  {die.display}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Display */}
      {showTotal && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeInUp 0.5s ease-out',
          zIndex: 10
        }}>
          {/* Modifier display */}
          {modifier !== 0 && (
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '8px'
            }}>
              {rolls.map(r => r.result).join(' + ')}{modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`}
            </div>
          )}
          
          {/* Total number */}
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '100px',
            fontWeight: '800',
            color: getCritColor(),
            textShadow: `0 0 60px ${getCritColor()}, 0 0 120px ${getCritColor()}70`,
            lineHeight: 1
          }}>
            {total}
          </div>

          {/* Crit/Fumble label */}
          {(isCrit || isFumble) && (
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '28px',
              fontWeight: '700',
              color: isCrit ? '#22C55E' : '#EF4444',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginTop: '16px',
              textShadow: `0 0 30px ${isCrit ? '#22C55E' : '#EF4444'}`,
              animation: 'critTextPulse 0.6s ease-in-out infinite alternate'
            }}>
              {isCrit ? 'NATURAL 20!' : 'NATURAL 1!'}
            </div>
          )}
        </div>
      )}

      {/* Click to close hint */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        fontFamily: "'Manrope', sans-serif",
        fontSize: '13px',
        color: 'rgba(255, 255, 255, 0.25)',
        letterSpacing: '0.1em',
        zIndex: 10
      }}>
        Click anywhere to close
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes edgeGlowPulse {
          0%, 100% { 
            opacity: 0.6;
          }
          50% { 
            opacity: 1;
          }
        }
        
        @keyframes cornerPulse {
          0%, 100% { 
            opacity: 0.5;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.1);
          }
        }
        
        @keyframes diceGlow {
          0%, 100% { 
            box-shadow: 0 0 50px currentColor, 0 0 100px currentColor;
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 80px currentColor, 0 0 150px currentColor;
            transform: scale(1.03);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes critTextPulse {
          from { 
            opacity: 0.85; 
            transform: scale(1); 
            letter-spacing: 0.2em;
          }
          to { 
            opacity: 1; 
            transform: scale(1.05); 
            letter-spacing: 0.25em;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default DiceRoller3D;
