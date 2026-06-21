import React from 'react';
import { Award, Check } from 'lucide-react';
import { toast } from 'sonner';

import { StepHeader } from '@/components/character-builder/BuilderPrimitives';
import { traitChipStyle } from '@/components/character-builder/builderTheme';

export default function SkillsStep({
  allSkills,
  background,
  backgroundSkills,
  classSkillCount,
  classSkillOptions,
  selectedSkills,
  toggleSkill,
  stats,
  asiBonus,
  hasHalfElfVersatility,
  versatilitySkills,
  setVersatilitySkills,
  formatModifier,
  theme,
  labelStyle,
}) {
  return (
    <div>
      <StepHeader icon={Award} title="Choose Your Skills" subtitle={`Pick ${classSkillCount} class skill${classSkillCount === 1 ? '' : 's'} (background already grants others)`} color={theme.sunset.pink} />

      {backgroundSkills.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ fontSize: '12px', color: theme.sunset.gold, marginBottom: '6px', fontWeight: 600 }}>
            Granted by {background}:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {backgroundSkills.map(skill => <span key={skill} style={{ ...traitChipStyle, background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }}><Check size={12} /> {skill}</span>)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '12px', fontSize: '13px', color: theme.text.muted }}>
        Selected: <strong style={{ color: selectedSkills.length === classSkillCount ? '#10B981' : theme.sunset.gold }}>{selectedSkills.length}</strong> / {classSkillCount}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
        {Object.entries(allSkills).map(([skill, ability]) => {
          const fromBackground = backgroundSkills.includes(skill);
          const canChoose = classSkillOptions.includes(skill);
          const selected = selectedSkills.includes(skill);
          const disabled = fromBackground || !canChoose;
          const finalAbility = Number(stats[ability]) + (asiBonus[ability] || 0);
          const modifier = Math.floor((finalAbility - 10) / 2);
          const isProficient = fromBackground || selected;
          return (
            <button
              key={skill}
              type="button"
              disabled={disabled}
              onClick={() => toggleSkill(skill)}
              data-testid={`skill-toggle-${skill.replace(/ /g, '-').toLowerCase()}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: '8px',
                background: fromBackground ? 'rgba(245, 158, 11, 0.12)' : selected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(31, 31, 35, 0.5)',
                border: `1px solid ${fromBackground ? 'rgba(245, 158, 11, 0.3)' : selected ? theme.borderActive : theme.border}`,
                color: disabled && !fromBackground ? theme.text.muted : theme.text.primary,
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !fromBackground ? 0.45 : 1,
                fontSize: '13px', textAlign: 'left', transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isProficient && <Check size={12} color={fromBackground ? theme.sunset.gold : theme.sunset.purple} />}
                {skill}
                <span style={{ fontSize: '10px', color: theme.text.muted }}>({ability.slice(0, 3).toUpperCase()})</span>
              </span>
              <span style={{ fontWeight: 600, color: isProficient ? theme.sunset.pink : theme.text.muted }}>
                {formatModifier(isProficient ? modifier + 2 : modifier)}
              </span>
            </button>
          );
        })}
      </div>

      {hasHalfElfVersatility && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.06)', border: `1px solid ${theme.border}` }}>
          <label style={labelStyle}>
            Half-Elf: Skill Versatility — pick 2 extra skills
            {' — '}
            <span style={{ color: versatilitySkills.length === 2 ? '#10B981' : theme.sunset.gold, textTransform: 'none' }}>
              {versatilitySkills.length}/2 picked
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Any two skills of your choice. Cannot overlap with class or background skills.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
            {Object.keys(allSkills).map(skill => {
              const alreadyProficient = backgroundSkills.includes(skill) || selectedSkills.includes(skill);
              const selected = versatilitySkills.includes(skill);
              const disabled = alreadyProficient;
              return (
                <button
                  key={skill}
                  type="button"
                  disabled={disabled}
                  data-testid={`versatility-${skill.replace(/ /g, '-').toLowerCase()}`}
                  onClick={() => {
                    setVersatilitySkills(prev => {
                      if (prev.includes(skill)) return prev.filter(item => item !== skill);
                      if (prev.length >= 2) { toast.info('Only 2 versatility skills allowed'); return prev; }
                      return [...prev, skill];
                    });
                  }}
                  style={{
                    padding: '7px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left',
                    background: selected ? 'rgba(239, 68, 68, 0.2)' : disabled ? 'rgba(239, 68, 68, 0.05)' : 'rgba(31, 31, 35, 0.5)',
                    border: `1px solid ${selected ? theme.sunset.pink : theme.border}`,
                    color: disabled ? theme.text.muted : theme.text.primary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1
                  }}
                >
                  {selected ? '✓ ' : ''}{skill}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
