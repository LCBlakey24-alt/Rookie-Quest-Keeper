import React from 'react';
import { Heart, Shield, Zap, Wind, Sparkles, ArrowUp, Edit3, User } from 'lucide-react';
import { getClassAccent } from '../lib/theme';

const VitalChip = ({ icon: Icon, label, value, color, mutedColor = '#9CA3AF', onClick, testId }) => {
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      data-testid={testId}
      type={interactive ? 'button' : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '5px 9px', borderRadius: '8px',
        background: `${color}15`, border: `1px solid ${color}40`,
        cursor: interactive ? 'pointer' : 'default',
        minWidth: '54px', transition: 'all 0.2s',
        font: 'inherit', color: 'inherit'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: mutedColor, fontWeight: 600 }}>
        <Icon size={11} color={color} /> {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color, marginTop: '1px' }}>{value}</div>
    </Tag>
  );
};

export default function CharacterHeader({
  character, theme, navigate, currentHp, maxHp, tempHp,
  handleHpChange, handleTempHpChange, initiative, ac, speed,
  setShowLevelUpWizard, rollDice, setActiveTab, canUseSpells,
  onToggleInspiration
}) {
  const accent = getClassAccent(character);
  const activeConditions = character?.conditions || [];
  const exhaustion = character?.exhaustion_level || 0;
  const incapacitatingConditions = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
  const isIncapacitated = incapacitatingConditions.some(c => activeConditions.includes(c));
  const mutedColor = theme?.text?.muted || '#9CA3AF';

  return (
    <div className="character-sheet-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
      <button onClick={() => navigate('/home')} data-testid="sheet-back-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(212, 160, 23, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 14px', color: theme.text.primary, cursor: 'pointer', flexShrink: 0 }}>
        <ArrowUp size={18} /> Dashboard
      </button>

      {/* Identity */}
      <div className="character-sheet-identity" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          {character.portrait_url ? (
            <img src={character.portrait_url} alt="" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.accent.primary}`, boxShadow: `0 0 0 1px ${accent.tint}` }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="portrait-fallback" style={{ width: '46px', height: '46px', borderRadius: '50%', background: theme.bg.surface, border: `2px solid ${theme.accent.primary}`, boxShadow: `0 0 0 1px ${accent.tint}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={24} color={theme.text.primary} />
            </div>
          )}
          <span data-testid="class-accent-dot" title={accent.label} style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: accent.icon, border: `2px solid ${theme.bg.primary}`, boxShadow: `0 0 0 1px ${accent.tint}` }} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.18rem', margin: 0, color: theme.accent.primary }}>{character.name}</h1>
          <div style={{ color: theme.text.secondary, fontSize: '12px' }}>
            {character.race}{character.subrace ? ` (${character.subrace})` : ''} • {character.character_class}{character.subclass ? ` (${character.subclass})` : ''} • Lv {character.level || 1}
          </div>
        </div>
      </div>

      {/* Vitals Bar */}
      <div data-testid="vitals-bar" className="character-sheet-vitals" style={{ display: 'flex', gap: '5px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 8px', borderRadius: '8px', background: theme.accent.soft, border: `1px solid ${theme.accent.line}`, minWidth: '82px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: theme.text.muted, fontWeight: 600 }}><Heart size={11} color={theme.accent.primary} /> HP</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <button onClick={() => handleHpChange(-1)} data-testid="hp-decrease" style={{ width: '20px', height: '20px', borderRadius: '4px', background: theme.accent.soft, border: 'none', color: theme.accent.primary, cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span data-testid="current-hp" style={{ fontSize: '15px', fontWeight: 700, color: currentHp <= maxHp / 4 ? theme.accent.primary : theme.text.primary, minWidth: '52px', textAlign: 'center' }}>
              {currentHp}/{maxHp}{tempHp > 0 && <span style={{ color: theme.success, fontSize: '11px' }}> +{tempHp}</span>}
            </span>
            <button onClick={() => handleHpChange(1)} data-testid="hp-increase" style={{ width: '20px', height: '20px', borderRadius: '4px', background: `rgba(16, 185, 129, 0.18)`, border: 'none', color: theme.success, cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </div>

        <VitalChip icon={Shield} label="AC" value={ac} color={theme.accent.primary} mutedColor={mutedColor} testId="vital-ac" />
        <VitalChip icon={Zap} label="INIT" value={initiative >= 0 ? `+${initiative}` : initiative} color={theme.accent.highlight} mutedColor={mutedColor} onClick={() => rollDice('1d20', initiative, 'Initiative')} testId="vital-init" />
        <VitalChip icon={Wind} label="SPD" value={`${speed}ft`} color={theme.accent.secondary} mutedColor={mutedColor} testId="vital-speed" />

        <button onClick={() => onToggleInspiration && onToggleInspiration(!character.inspiration)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', borderRadius: '10px', background: character.inspiration ? `rgba(245, 158, 11, 0.18)` : 'rgba(255, 255, 255, 0.04)', border: `1px solid ${character.inspiration ? 'rgba(245, 158, 11, 0.5)' : theme.border}`, cursor: 'pointer', minWidth: '60px' }} title="Toggle Inspiration">
          <Sparkles size={14} color={character.inspiration ? theme.warning : theme.text.muted} />
          <div style={{ fontSize: '9px', color: character.inspiration ? theme.warning : theme.text.muted, fontWeight: 600, letterSpacing: '0.5px', marginTop: '2px' }}>INSP</div>
        </button>

        {(activeConditions.length > 0 || exhaustion > 0 || isIncapacitated) && (
          <div data-testid="active-conditions-strip" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', padding: '4px 8px', borderRadius: '10px', background: `rgba(239,68,68,0.08)`, border: `1px solid ${theme.accent.line}`, maxWidth: '320px' }}>
            {activeConditions.map(cond => (
              <span key={cond} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', color: theme.text.primary, border: `1px solid ${theme.border}`, textTransform: 'uppercase' }}>{cond}</span>
            ))}
            {exhaustion > 0 && <span title={`Exhaustion ${exhaustion}/6`} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(146, 64, 14, 0.25)', color: theme.warning, border: '1px solid rgba(146, 64, 14, 0.5)', textTransform: 'uppercase' }}>EXHAUSTION {exhaustion}</span>}
          </div>
        )}
      </div>

      <div className="character-sheet-header-actions" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {(character.level || 1) < 20 && (
          <button onClick={() => setShowLevelUpWizard(true)} data-testid="level-up-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.accent.primary, border: `1px solid ${theme.accent.primary}`, borderRadius: '8px', padding: '8px 16px', color: theme.bg.primary, cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
            <ArrowUp size={16} /> Level Up
          </button>
        )}
        <button onClick={() => navigate(`/characters/${character.id}/edit`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(212, 160, 23, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 16px', color: theme.text.primary, cursor: 'pointer' }}>
          <Edit3 size={16} /> Edit
        </button>
      </div>
    </div>
  );

  // onToggleInspiration should be provided by parent to persist the toggle
}
