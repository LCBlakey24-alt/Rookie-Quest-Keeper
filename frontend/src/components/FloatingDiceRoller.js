import React, { useState } from 'react';
import { Dices, X, ChevronUp, Minus } from 'lucide-react';

// Dark Minimalist Theme - RED #E11D48
const theme = {
  bg: {
    black: '#0D0D0D',
    dark: '#141414',
    panel: '#1A1A1A',
    card: '#1F1F1F',
    hover: '#2A2A2A'
  },
  accent: {
    red: '#E11D48',
    redHover: '#F43F5E',
    redSubtle: 'rgba(225, 29, 72, 0.15)'
  },
  text: {
    white: '#FFFFFF',
    secondary: '#B3B3B3',
    muted: '#808080'
  },
  border: 'rgba(255, 255, 255, 0.1)'
};

function FloatingDiceRoller() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [rolls, setRolls] = useState([]);
  const [customDice, setCustomDice] = useState('');

  // Dice types with theme-consistent styling
  const diceTypes = [
    { sides: 4, label: 'd4' },
    { sides: 6, label: 'd6' },
    { sides: 8, label: 'd8' },
    { sides: 10, label: 'd10' },
    { sides: 12, label: 'd12' },
    { sides: 20, label: 'd20' },
    { sides: 100, label: 'd100' },
  ];

  const rollDice = (sides, count = 1) => {
    const results = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      results.push(roll);
      total += roll;
    }
    
    const newRoll = {
      id: Date.now(),
      dice: `${count}d${sides}`,
      results,
      total,
      isCrit: sides === 20 && results.includes(20),
      isFail: sides === 20 && results.includes(1),
      timestamp: new Date().toLocaleTimeString()
    };
    
    setRolls(prev => [newRoll, ...prev.slice(0, 9)]);
  };

  const parseAndRoll = (input) => {
    const match = input.toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (match) {
      const count = parseInt(match[1]) || 1;
      const sides = parseInt(match[2]);
      const modifier = parseInt(match[3]) || 0;
      
      if (sides > 0 && sides <= 100 && count > 0 && count <= 20) {
        const results = [];
        let total = modifier;
        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          results.push(roll);
          total += roll;
        }
        
        const newRoll = {
          id: Date.now(),
          dice: input.toLowerCase(),
          results,
          total,
          modifier,
          isCrit: sides === 20 && results.includes(20),
          isFail: sides === 20 && results.includes(1),
          timestamp: new Date().toLocaleTimeString()
        };
        
        setRolls(prev => [newRoll, ...prev.slice(0, 9)]);
        setCustomDice('');
      }
    }
  };

  const clearRolls = () => setRolls([]);

  // Floating button (closed state) - Bottom LEFT for better UX
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="dice-roller-toggle"
        title="Dice Roller (Press R)"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          width: '56px',
          height: '56px',
          background: theme.accent.red,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.2s',
          boxShadow: '0 4px 20px rgba(225, 29, 72, 0.4)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.accent.redHover;
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.accent.red;
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Dices size={26} color="#fff" />
      </button>
    );
  }

  // Open dice roller panel - Bottom LEFT
  return (
    <div
      data-testid="dice-roller-panel"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        width: isMinimized ? '200px' : '320px',
        background: theme.bg.panel,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        fontFamily: 'Cityworm, sans-serif'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: theme.accent.red,
        cursor: 'move'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Dices size={18} color="#fff" />
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px', letterSpacing: '0.5px' }}>
            DICE ROLLER
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMinimized ? <ChevronUp size={14} color="#fff" /> : <Minus size={14} color="#fff" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            data-testid="dice-roller-close"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={14} color="#fff" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div style={{ padding: '16px' }}>
          {/* Quick Dice Buttons */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '8px',
            marginBottom: '12px'
          }}>
            {diceTypes.map(({ sides, label }) => (
              <button
                key={sides}
                onClick={() => rollDice(sides)}
                data-testid={`roll-d${sides}-btn`}
                style={{
                  padding: '10px 4px',
                  background: theme.bg.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text.white,
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.accent.redSubtle;
                  e.currentTarget.style.borderColor = theme.accent.red;
                  e.currentTarget.style.color = theme.accent.red;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.bg.card;
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.color = theme.text.white;
                }}
              >
                {label}
              </button>
            ))}
            {/* Advantage Button */}
            <button
              onClick={() => {
                const roll1 = Math.floor(Math.random() * 20) + 1;
                const roll2 = Math.floor(Math.random() * 20) + 1;
                setRolls(prev => [{
                  id: Date.now(),
                  dice: '2d20 (Adv)',
                  results: [roll1, roll2],
                  total: Math.max(roll1, roll2),
                  isCrit: Math.max(roll1, roll2) === 20,
                  isFail: Math.max(roll1, roll2) === 1,
                  timestamp: new Date().toLocaleTimeString()
                }, ...prev.slice(0, 9)]);
              }}
              data-testid="roll-advantage-btn"
              style={{
                padding: '10px 4px',
                background: theme.accent.redSubtle,
                border: `1px solid ${theme.accent.red}`,
                color: theme.accent.red,
                fontWeight: '700',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              ADV
            </button>
          </div>

          {/* Custom Roll Input */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={customDice}
              onChange={(e) => setCustomDice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && parseAndRoll(customDice)}
              placeholder="e.g., 2d6+3"
              data-testid="custom-dice-input"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white,
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif'
              }}
            />
            <button
              onClick={() => parseAndRoll(customDice)}
              data-testid="custom-roll-btn"
              style={{
                padding: '10px 16px',
                background: theme.accent.red,
                border: 'none',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Roll
            </button>
          </div>

          {/* Roll History */}
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            background: theme.bg.dark,
            border: `1px solid ${theme.border}`,
            padding: '8px'
          }}>
            {rolls.length === 0 ? (
              <p style={{ color: theme.text.muted, fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                Click a die to roll!
              </p>
            ) : (
              rolls.map((roll) => (
                <div
                  key={roll.id}
                  data-testid="roll-result"
                  style={{
                    padding: '10px 12px',
                    marginBottom: '6px',
                    background: roll.isCrit 
                      ? 'rgba(34, 197, 94, 0.15)' 
                      : roll.isFail 
                        ? 'rgba(239, 68, 68, 0.15)' 
                        : theme.bg.card,
                    border: `1px solid ${roll.isCrit ? '#22c55e' : roll.isFail ? '#ef4444' : theme.border}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: theme.text.muted, fontSize: '11px', fontWeight: '600' }}>{roll.dice}</span>
                    <span style={{ color: theme.text.muted, fontSize: '10px' }}>{roll.timestamp}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ 
                      color: roll.isCrit ? '#22c55e' : roll.isFail ? '#ef4444' : theme.text.white,
                      fontWeight: '800',
                      fontSize: '22px',
                      fontFamily: 'Cityworm, sans-serif'
                    }}>
                      {roll.total}
                    </span>
                    {roll.results.length > 1 && (
                      <span style={{ color: theme.text.muted, fontSize: '11px' }}>
                        ({roll.results.join(' + ')}{roll.modifier ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : ''})
                      </span>
                    )}
                    {roll.isCrit && <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: '700' }}>NAT 20!</span>}
                    {roll.isFail && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>NAT 1!</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {rolls.length > 0 && (
            <button
              onClick={clearRolls}
              data-testid="clear-rolls-btn"
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '8px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                color: theme.text.muted,
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Clear History
            </button>
          )}
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && (
        <div style={{ padding: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[4, 6, 8, 10, 12, 20].map(sides => (
            <button
              key={sides}
              onClick={() => rollDice(sides)}
              style={{
                padding: '6px 10px',
                background: theme.bg.card,
                border: `1px solid ${theme.border}`,
                color: theme.text.white,
                fontWeight: '600',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              d{sides}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FloatingDiceRoller;
