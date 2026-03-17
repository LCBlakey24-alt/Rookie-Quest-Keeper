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

  const rollDice = () => {
    setRolling(true);
    
    // Animate through random numbers
    let animationCount = 0;
    const animationInterval = setInterval(() => {
      const tempResults = Array.from({ length: diceCount }, () => 
        Math.floor(Math.random() * selectedDice.sides) + 1
      );
      setCurrentResult({
        dice: selectedDice,
        count: diceCount,
        rolls: tempResults,
        total: tempResults.reduce((a, b) => a + b, 0) + modifier,
        modifier: modifier,
        isAnimating: true
      });
      animationCount++;
      
      if (animationCount >= 10) {
        clearInterval(animationInterval);
        
        // Final roll
        const finalResults = Array.from({ length: diceCount }, () => 
          Math.floor(Math.random() * selectedDice.sides) + 1
        );
        const finalTotal = finalResults.reduce((a, b) => a + b, 0) + modifier;
        
        const finalRoll = {
          dice: selectedDice,
          count: diceCount,
          rolls: finalResults,
          total: finalTotal,
          modifier: modifier,
          isAnimating: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCrit: selectedDice.sides === 20 && diceCount === 1 && finalResults[0] === 20,
          isFail: selectedDice.sides === 20 && diceCount === 1 && finalResults[0] === 1
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
          fontFamily: "Eros Book, sans-serif",
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
              fontFamily: "Eros Book, sans-serif",
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
            fontFamily: "Eros Book, sans-serif"
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
            fontFamily: "Eros Book, sans-serif"
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
        onClick={rollDice}
        disabled={rolling}
        className="btn-primary"
        style={{ 
          width: '100%', 
          marginBottom: '16px',
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
              fontFamily: "Eros Book, sans-serif",
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
              fontFamily: "Eros Book, sans-serif",
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
            fontFamily: "Eros Book, sans-serif",
            textShadow: `0 0 20px ${currentResult.dice.color}60`,
            lineHeight: 1
          }}>
            {currentResult.total}
          </div>
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
              fontFamily: "Eros Book, sans-serif"
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
                  fontFamily: "Eros Book, sans-serif"
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
