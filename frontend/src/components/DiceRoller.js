import React, { useState } from 'react';
import { Dices, RotateCcw, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DICE_TYPES = [
  { sides: 4, label: 'D4', color: '#ef4444' },
  { sides: 6, label: 'D6', color: '#f97316' },
  { sides: 8, label: 'D8', color: '#eab308' },
  { sides: 10, label: 'D10', color: '#F59E0B' },
  { sides: 12, label: 'D12', color: '#06b6d4' },
  { sides: 20, label: 'D20', color: '#4a7dff' },
  { sides: 100, label: 'D100', color: '#a855f7' },
];

function DiceRoller() {
  const [selectedDice, setSelectedDice] = useState({ sides: 20, label: 'D20', color: '#4a7dff' });
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [rollHistory, setRollHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const rollDice = (rollType = 'normal') => {
    setRolling(true);
    
    const isAdvRoll = (rollType === 'advantage' || rollType === 'disadvantage') && selectedDice.sides === 20;
    const effectiveCount = isAdvRoll ? 2 : diceCount;
    
    // Animate through random numbers
    let animationCount = 0;
    const animationInterval = setInterval(() => {
      const tempResults = Array.from({ length: effectiveCount }, () => 
        Math.floor(Math.random() * selectedDice.sides) + 1
      );
      const tempTotal = isAdvRoll 
        ? (rollType === 'advantage' ? Math.max(...tempResults) : Math.min(...tempResults)) + modifier
        : tempResults.reduce((a, b) => a + b, 0) + modifier;
      setCurrentResult({
        dice: selectedDice,
        count: effectiveCount,
        rolls: tempResults,
        total: tempTotal,
        modifier: modifier,
        isAnimating: true,
        rollType
      });
      animationCount++;
      
      if (animationCount >= 10) {
        clearInterval(animationInterval);
        
        // Final roll
        const finalResults = Array.from({ length: effectiveCount }, () => 
          Math.floor(Math.random() * selectedDice.sides) + 1
        );
        const keptValue = isAdvRoll
          ? (rollType === 'advantage' ? Math.max(...finalResults) : Math.min(...finalResults))
          : finalResults.reduce((a, b) => a + b, 0);
        const finalTotal = keptValue + modifier;
        const keptIndex = isAdvRoll ? finalResults.indexOf(rollType === 'advantage' ? Math.max(...finalResults) : Math.min(...finalResults)) : -1;
        
        const finalRoll = {
          dice: selectedDice,
          count: effectiveCount,
          rolls: finalResults,
          total: finalTotal,
          modifier: modifier,
          isAnimating: false,
          rollType,
          keptIndex,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCrit: selectedDice.sides === 20 && (isAdvRoll ? finalResults[keptIndex] === 20 : effectiveCount === 1 && finalResults[0] === 20),
          isFail: selectedDice.sides === 20 && (isAdvRoll ? finalResults[keptIndex] === 1 : effectiveCount === 1 && finalResults[0] === 1)
        };
        
        setCurrentResult(finalRoll);
        setRollHistory(prev => [finalRoll, ...prev.slice(0, 19)]);
        setRolling(false);
      }
    }, 50);
  };

  const clearHistory = () => {
    setRollHistory([]);
  };

  return (
    <div className="glow-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          color: '#ffffff',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: '400',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Dices size={22} style={{ color: '#F59E0B' }} />
          Dice Roller
        </h3>
        <Button
          onClick={() => setShowHistory(!showHistory)}
          className="btn-icon"
          style={{ padding: '6px' }}
          title="Roll History"
        >
          <History size={16} />
        </Button>
      </div>

      {/* Dice Selection */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {DICE_TYPES.map(dice => (
          <button
            key={dice.sides}
            onClick={() => setSelectedDice(dice)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: selectedDice.sides === dice.sides ? `2px solid ${dice.color}` : '2px solid #1e40af',
              background: selectedDice.sides === dice.sides ? `${dice.color}20` : 'transparent',
              color: selectedDice.sides === dice.sides ? dice.color : '#94a3b8',
              fontWeight: '400',
              fontSize: '13px',
              fontFamily: "'Montserrat', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: selectedDice.sides === dice.sides ? `0 0 15px ${dice.color}40` : 'none'
            }}
          >
            {dice.label}
          </button>
        ))}
      </div>

      {/* Count and Modifier */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontSize: '12px', 
            color: '#67e8f9',
            fontWeight: '400',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            Number of Dice
          </label>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Quick select buttons */}
            {[1, 2, 4, 6, 8].map(num => (
              <button
                key={num}
                onClick={() => setDiceCount(num)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: diceCount === num ? '2px solid #F59E0B' : '2px solid #1e40af',
                  background: diceCount === num ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                  color: diceCount === num ? '#F59E0B' : '#94a3b8',
                  fontWeight: '400',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '36px'
                }}
              >
                {num}
              </button>
            ))}
            {/* Custom number input */}
            <input
              type="number"
              min="1"
              max="999"
              value={diceCount}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setDiceCount(Math.max(1, Math.min(999, val)));
              }}
              style={{
                width: '60px',
                padding: '8px',
                borderRadius: '6px',
                border: '2px solid #1e40af',
                background: 'rgba(10, 10, 40, 0.6)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '400',
                textAlign: 'center'
              }}
              title="Enter any number (1-999)"
            />
          </div>
        </div>
        <div style={{ width: '90px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontSize: '12px', 
            color: '#67e8f9',
            fontWeight: '400',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            Modifier
          </label>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '2px solid #1e40af',
              background: 'rgba(10, 10, 40, 0.6)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '400',
              textAlign: 'center'
            }}
          />
        </div>
      </div>

      {/* Roll Button */}
      <Button
        onClick={() => rollDice('normal')}
        disabled={rolling}
        className="btn-primary"
        style={{ 
          width: '100%', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '16px',
          padding: '14px'
        }}
      >
        <Dices size={20} className={rolling ? 'animate-spin' : ''} />
        {rolling ? 'Rolling...' : `Roll ${diceCount}${selectedDice.label}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`}
      </Button>
      
      {/* Advantage / Disadvantage Buttons (D20 only) */}
      {selectedDice.sides === 20 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            data-testid="roll-advantage"
            onClick={() => rollDice('advantage')}
            disabled={rolling}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', cursor: rolling ? 'wait' : 'pointer',
              background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#22C55E', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            Advantage (2d20 keep high)
          </button>
          <button
            data-testid="roll-disadvantage"
            onClick={() => rollDice('disadvantage')}
            disabled={rolling}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', cursor: rolling ? 'wait' : 'pointer',
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#EF4444', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            Disadvantage (2d20 keep low)
          </button>
        </div>
      )}

      {/* Result Display */}
      {currentResult && (
        <div style={{
          background: currentResult.isCrit ? 'rgba(34, 197, 94, 0.2)' : 
                      currentResult.isFail ? 'rgba(239, 68, 68, 0.2)' : 
                      'rgba(10, 10, 40, 0.6)',
          border: `2px solid ${currentResult.isCrit ? '#F59E0B' : 
                               currentResult.isFail ? '#ef4444' : 
                               currentResult.dice.color}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          transition: 'all 0.3s',
          animation: currentResult.isAnimating ? 'none' : 'resultPop 0.3s ease-out'
        }}>
          {currentResult.isCrit && (
            <div style={{ 
              fontSize: '14px', 
              color: '#F59E0B', 
              fontWeight: '800',
              fontFamily: "'Montserrat', sans-serif",
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              ⚔️ Critical Hit! ⚔️
            </div>
          )}
          {currentResult.isFail && (
            <div style={{ 
              fontSize: '14px', 
              color: '#ef4444', 
              fontWeight: '800',
              fontFamily: "'Montserrat', sans-serif",
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              💀 Critical Fail! 💀
            </div>
          )}
          <div style={{ 
            fontSize: '48px', 
            fontWeight: '800', 
            color: currentResult.isCrit ? '#F59E0B' : 
                   currentResult.isFail ? '#ef4444' : 
                   '#ffffff',
            fontFamily: "'Montserrat', sans-serif",
            textShadow: `0 0 20px ${currentResult.dice.color}60`,
            lineHeight: 1
          }}>
            {currentResult.total}
          </div>
          {/* Advantage/Disadvantage indicator */}
          {currentResult.rollType && currentResult.rollType !== 'normal' && !currentResult.isAnimating && (
            <div style={{
              fontSize: '11px', fontWeight: 700, marginTop: '4px',
              color: currentResult.rollType === 'advantage' ? '#22C55E' : '#EF4444',
              textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              {currentResult.rollType === 'advantage' ? 'ADVANTAGE' : 'DISADVANTAGE'}
              <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                ({currentResult.rolls.map((r, i) => (
                  <span key={i} style={{
                    textDecoration: currentResult.keptIndex !== undefined && currentResult.keptIndex !== i ? 'line-through' : 'none',
                    opacity: currentResult.keptIndex !== undefined && currentResult.keptIndex !== i ? 0.5 : 1,
                  }}>
                    {r}{i < currentResult.rolls.length - 1 ? ', ' : ''}
                  </span>
                ))})
              </span>
            </div>
          )}
          <div style={{ 
            fontSize: '13px', 
            color: '#94a3b8', 
            marginTop: '8px',
            fontFamily: 'Inter, sans-serif',
            maxHeight: '80px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {/* For large dice counts, show summary */}
            {currentResult.rolls.length > 12 ? (
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#67e8f9' }}>{currentResult.count}d{currentResult.dice.sides}</span>
                  {' = '}
                  <span style={{ color: '#ffffff' }}>{currentResult.rolls.reduce((a, b) => a + b, 0)}</span>
                  {currentResult.modifier !== 0 && (
                    <span style={{ color: currentResult.modifier > 0 ? '#F59E0B' : '#ef4444' }}>
                      {currentResult.modifier > 0 ? ` + ${currentResult.modifier}` : ` - ${Math.abs(currentResult.modifier)}`}
                    </span>
                  )}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#64748b',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  justifyContent: 'center'
                }}>
                  {currentResult.rolls.map((roll, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        padding: '2px 6px',
                        background: roll === currentResult.dice.sides ? 'rgba(34, 197, 94, 0.3)' :
                                   roll === 1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        color: roll === currentResult.dice.sides ? '#F59E0B' :
                               roll === 1 ? '#ef4444' : '#94a3b8'
                      }}
                    >
                      {roll}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {currentResult.rolls.join(' + ')}
                {currentResult.modifier !== 0 && (
                  <span style={{ color: currentResult.modifier > 0 ? '#F59E0B' : '#ef4444' }}>
                    {currentResult.modifier > 0 ? ` + ${currentResult.modifier}` : ` - ${Math.abs(currentResult.modifier)}`}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Roll History */}
      {showHistory && rollHistory.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontSize: '13px', 
              color: '#67e8f9', 
              fontWeight: '400',
              fontFamily: "'Montserrat', sans-serif"
            }}>
              Recent Rolls
            </span>
            <Button
              onClick={clearHistory}
              className="btn-icon"
              style={{ padding: '4px' }}
              title="Clear History"
            >
              <RotateCcw size={12} />
            </Button>
          </div>
          <div style={{ 
            maxHeight: '150px', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {rollHistory.map((roll, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(10, 10, 40, 0.4)',
                  borderRadius: '6px',
                  border: `1px solid ${roll.isCrit ? '#F59E0B' : roll.isFail ? '#ef4444' : '#1e40af'}`,
                  fontSize: '13px'
                }}
              >
                <span style={{ color: '#94a3b8' }}>
                  {roll.timestamp} • {roll.count}{roll.dice.label}
                  {roll.modifier !== 0 && (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier)}
                </span>
                <span style={{ 
                  fontWeight: '400', 
                  color: roll.isCrit ? '#F59E0B' : roll.isFail ? '#ef4444' : '#ffffff',
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  {roll.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes resultPop {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-spin {
          animation: spin 0.5s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default DiceRoller;
