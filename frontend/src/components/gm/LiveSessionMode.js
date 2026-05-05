import React, { useState } from 'react';
import { 
  Zap, Dices, Users, Swords, BookOpen, Clock, Sparkles,
  Volume2, FileText, ChevronRight
} from 'lucide-react';
import UnifiedReferenceCenter from '@/components/gm/UnifiedReferenceCenter';

// Quick access panel for fast session control
export default function LiveSessionMode({ 
  theme, 
  players, 
  calendar,
  onRollDice,
  onQuickCombat,
  onOpenTab,
  onGenerateContent,
  isActive,
  onToggle
}) {
  const [quickNotes, setQuickNotes] = useState('');
  
  // Quick action buttons
  const quickActions = [
    { 
      id: 'roll-d20', 
      icon: Dices, 
      label: 'd20', 
      color: theme.accent.primary,
      action: () => onRollDice?.('1d20')
    },
    { 
      id: 'roll-damage', 
      icon: Swords, 
      label: '2d6', 
      color: '#ef4444',
      action: () => onRollDice?.('2d6')
    },
    { 
      id: 'quick-combat', 
      icon: Swords, 
      label: 'Combat', 
      color: theme.accent.gold,
      action: onQuickCombat
    },
    { 
      id: 'generate-npc', 
      icon: Sparkles, 
      label: 'NPC', 
      color: '#10b981',
      action: () => onGenerateContent?.('npc')
    },
  ];

  // Player quick view
  const PlayerQuickView = () => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        fontSize: '11px', 
        fontWeight: '600', 
        color: theme.text.muted, 
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '8px'
      }}>
        Party ({players?.length || 0})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {players?.slice(0, 5).map(player => (
          <div 
            key={player.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: theme.bg.elevated,
              borderRadius: '8px',
              fontSize: '13px'
            }}
          >
            <span style={{ color: theme.text.primary, fontWeight: '500' }}>{player.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: '600' }}>{player.hp || player.max_hp || '?'}</span>
              <span style={{ color: theme.text.muted }}>/</span>
              <span style={{ color: theme.text.secondary }}>{player.max_hp || '?'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Time display
  const TimeDisplay = () => (
    <div style={{
      padding: '12px',
      background: theme.bg.elevated,
      borderRadius: '8px',
      marginBottom: '16px',
      textAlign: 'center'
    }}>
      <Clock size={16} style={{ color: theme.accent.primary, marginBottom: '4px' }} />
      <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text.primary }}>
        {calendar?.custom_months?.[calendar.current_month - 1]?.name || 'Day'} {calendar?.current_day || 1}
      </div>
      <div style={{ fontSize: '11px', color: theme.text.muted }}>
        Year {calendar?.current_year || 1}
      </div>
    </div>
  );

  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: theme.gradient,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 20px ${theme.accent.glow}`,
          zIndex: 1000
        }}
        data-testid="live-session-toggle"
      >
        <Zap size={24} color="#fff" />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '320px',
      height: '100vh',
      background: theme.bg.panel,
      backdropFilter: 'blur(20px)',
      borderLeft: `1px solid ${theme.border}`,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={20} style={{ color: theme.accent.primary }} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', color: theme.text.primary }}>
            Live Session
          </span>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: theme.text.muted
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Quick Actions */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '600', 
            color: theme.text.muted, 
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '10px'
          }}>
            Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={action.action}
                style={{
                  padding: '12px 8px',
                  background: theme.bg.elevated,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                data-testid={`quick-action-${action.id}`}
              >
                <action.icon size={20} style={{ color: action.color }} />
                <span style={{ fontSize: '10px', color: theme.text.secondary, fontWeight: '500' }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Display */}
        <TimeDisplay />

        {/* Player Quick View */}
        <PlayerQuickView />

        {/* Unified Reference */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: theme.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '8px'
          }}>
            Reference
          </div>
          <UnifiedReferenceCenter
            isCompact
            onRollDamage={(notation, label) => onRollDice?.(notation, label)}
          />
        </div>

        {/* Quick Note Input */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '600', 
            color: theme.text.muted, 
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '8px'
          }}>
            Quick Note
          </div>
          <textarea
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            placeholder="Jot something down..."
            style={{
              width: '100%',
              padding: '12px',
              background: theme.bg.elevated,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.text.primary,
              fontSize: '13px',
              resize: 'none',
              height: '80px',
              fontFamily: "'Manrope', sans-serif"
            }}
          />
        </div>

        {/* Navigation Shortcuts */}
        <div>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '600', 
            color: theme.text.muted, 
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '10px'
          }}>
            Quick Navigation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'combat', icon: Swords, label: 'Combat' },
              { id: 'npcs', icon: Users, label: 'NPCs' },
              { id: 'reference-hub', icon: BookOpen, label: 'Reference' },
              { id: 'notes', icon: FileText, label: 'Notes' },
              { id: 'sound', icon: Volume2, label: 'Soundboard' },
            ].map(nav => (
              <button
                key={nav.id}
                onClick={() => onOpenTab?.(nav.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: theme.bg.elevated,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: theme.text.secondary,
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <nav.icon size={16} style={{ color: theme.accent.primary }} />
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onClick={onToggle}
          style={{
            padding: '10px 24px',
            background: theme.bg.elevated,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            color: theme.text.secondary,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          Close Panel
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
