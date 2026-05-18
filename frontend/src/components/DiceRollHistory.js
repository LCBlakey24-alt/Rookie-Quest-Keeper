import React, { useState } from 'react';
import { History, X, Share2, Trophy, Skull, ChevronRight } from 'lucide-react';

const DiceRollHistory = ({ history = [], theme = 'player', onShare }) => {
  const [isOpen, setIsOpen] = useState(false);

  const colors = { primary: '#EF4444', bg: 'rgba(31, 31, 35, 0.95)', border: 'rgba(239, 68, 68, 0.25)' };

  if (history.length === 0) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="dice-history-toggle"
        style={{
          position: 'fixed', right: isOpen ? '320px' : '0', top: '50%',
          transform: 'translateY(-50%)',
          background: colors.bg, border: `1px solid ${colors.border}`,
          borderRight: isOpen ? 'none' : `1px solid ${colors.border}`,
          borderRadius: isOpen ? '8px 0 0 8px' : '8px 0 0 8px',
          padding: '12px 8px', cursor: 'pointer', zIndex: 9998,
          color: colors.primary, transition: 'right 0.3s ease',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        }}
      >
        <History size={18} />
        <span style={{ fontSize: '9px', fontWeight: 600, writingMode: 'vertical-lr' }}>
          ROLLS ({history.length})
        </span>
      </button>

      {/* History Panel */}
      <div
        data-testid="dice-history-panel"
        style={{
          position: 'fixed', right: isOpen ? '0' : '-320px', top: 0, bottom: 0,
          width: '320px', background: colors.bg,
          borderLeft: `1px solid ${colors.border}`,
          zIndex: 9997, transition: 'right 0.3s ease',
          display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px', borderBottom: `1px solid ${colors.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} color={colors.primary} />
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Roll History</span>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Rolls List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {history.map((roll, i) => (
            <div
              key={i}
              data-testid={`roll-history-${i}`}
              style={{
                padding: '10px 12px', marginBottom: '6px', borderRadius: '10px',
                background: roll.isCrit ? 'rgba(34,197,94,0.08)' : roll.isFumble ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${roll.isCrit ? 'rgba(34,197,94,0.25)' : roll.isFumble ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {roll.isCrit && <Trophy size={14} color="#22C55E" />}
                  {roll.isFumble && <Skull size={14} color="#EF4444" />}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{roll.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '18px', fontWeight: 800,
                    color: roll.isCrit ? '#22C55E' : roll.isFumble ? '#EF4444' : colors.primary,
                  }}>
                    {roll.total}
                  </span>
                  {(roll.isCrit || roll.isFumble) && onShare && (
                    <button
                      onClick={() => onShare(roll)}
                      data-testid={`share-roll-${i}`}
                      style={{
                        background: 'none', border: `1px solid ${roll.isCrit ? '#22C55E40' : '#EF444440'}`,
                        borderRadius: '4px', padding: '2px 6px', cursor: 'pointer',
                        color: roll.isCrit ? '#22C55E' : '#EF4444', fontSize: '10px',
                        display: 'flex', alignItems: 'center', gap: '3px',
                      }}
                    >
                      <Share2 size={10} /> Share
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  [{roll.rolls?.map(r => `d${r.sides}:${r.result}`).join(', ')}]
                  {roll.modifier !== 0 && ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}`}
                </span>
                <span style={{ fontSize: '9px', color: '#475569' }}>{roll.time}</span>
              </div>
              {roll.isCrit && <div style={{ fontSize: '10px', color: '#22C55E', fontWeight: 600, marginTop: '2px' }}>NATURAL 20!</div>}
              {roll.isFumble && <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: 600, marginTop: '2px' }}>NATURAL 1!</div>}
            </div>
          ))}
        </div>

        {/* Stats Footer */}
        <div style={{
          padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
          display: 'flex', justifyContent: 'space-around',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E' }}>
              {history.filter(r => r.isCrit).length}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>NAT 20s</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#EF4444' }}>
              {history.filter(r => r.isFumble).length}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>NAT 1s</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.primary }}>
              {history.length > 0 ? Math.round(history.reduce((s, r) => s + r.total, 0) / history.length) : 0}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>AVG</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B' }}>
              {history.length}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>TOTAL</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceRollHistory;
