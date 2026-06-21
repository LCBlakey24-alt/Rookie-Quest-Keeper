import React from 'react';
import { Languages, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';

import { ABILITIES } from '@/lib/characterRules';
import { DetailPanel, Pill, SelectCard, StepHeader } from '@/components/character-builder/BuilderPrimitives';
import { traitChipStyle } from '@/components/character-builder/builderTheme';

export default function RaceStep({
  mergedRaces,
  race,
  setRace,
  raceData,
  subrace,
  setSubrace,
  availableSubraces,
  edition,
  floatingAsi,
  setFloatingAsi,
  floatingAsiBudget,
  totalFloatingSpent,
  languageBudget,
  chosenLanguages,
  setChosenLanguages,
  extraLanguageOptions,
  theme,
  labelStyle,
}) {
  return (
    <div>
      <StepHeader icon={User} title="Choose Your Race" subtitle="Your ancestry shapes your traits and abilities" color={theme.sunset.pink} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(mergedRaces).map(([key, r]) => (
          <SelectCard
            key={key}
            active={race === key}
            onClick={() => setRace(key)}
            color={theme.sunset.pink}
            title={r.name}
            subtitle={r.description}
            data-testid={`race-${key}`}
            footer={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                <Pill icon="🏃">{r.speed}ft</Pill>
                <Pill icon="📐">{r.size}</Pill>
                {edition === '2014' && r.asi2014 && (
                  <Pill icon="✨">{r.asi2014.all
                    ? `+${r.asi2014.all} All`
                    : Object.entries(r.asi2014).filter(([k]) => k !== 'choice').map(([k, v]) => `+${v} ${k.slice(0, 3).toUpperCase()}`).join(' ')}</Pill>
                )}
              </div>
            }
          />
        ))}
      </div>

      {raceData && (
        <DetailPanel title={`${raceData.name} Traits`} color={theme.sunset.pink}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {raceData.traits.map((trait, index) => (
              <div key={index} style={traitChipStyle}><Sparkles size={12} style={{ flexShrink: 0 }} /> {trait}</div>
            ))}
          </div>
          {raceData.languages && (
            <div style={{ fontSize: '13px', color: theme.text.secondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Languages size={14} /> Languages: {raceData.languages.join(', ')}
            </div>
          )}
        </DetailPanel>
      )}

      {availableSubraces.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <label style={labelStyle}>Choose Subrace</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {availableSubraces.map(sr => {
              const sub = raceData.subraces[sr];
              return (
                <SelectCard
                  key={sr}
                  active={subrace === sr}
                  onClick={() => setSubrace(sr)}
                  color={theme.sunset.pink}
                  title={sr}
                  subtitle={(sub.traits || []).slice(0, 1).join(', ') || 'Subrace'}
                  data-testid={`subrace-${sr}`}
                  footer={
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {edition === '2014' && sub.asi2014 && Object.entries(sub.asi2014).map(([ability, value]) => (
                        <Pill key={ability} icon="✨">+{value} {ability.slice(0, 3).toUpperCase()}</Pill>
                      ))}
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {edition === '2014' && floatingAsiBudget > 0 && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: theme.accent.soft, border: `1px solid ${theme.accent.line || theme.border}` }}>
          <label style={labelStyle}>
            Distribute {floatingAsiBudget} floating +1{floatingAsiBudget === 1 ? '' : 's'}
            {' — '}
            <span style={{ color: totalFloatingSpent === floatingAsiBudget ? theme.success : (theme.accent?.primary || theme.accent), textTransform: 'none' }}>
              {totalFloatingSpent}/{floatingAsiBudget} assigned
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Pick {floatingAsiBudget} different abilities to each gain +1. Cannot stack on the same ability.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            {ABILITIES.map(ability => {
              const fixed = (raceData?.asi2014?.[ability] || 0) > 0;
              const chosen = !!floatingAsi[ability];
              const disabled = fixed;
              return (
                <button
                  key={ability}
                  type="button"
                  disabled={disabled}
                  data-testid={`floating-asi-${ability}`}
                  onClick={() => {
                    setFloatingAsi(prev => {
                      const next = { ...prev };
                      if (next[ability]) delete next[ability];
                      else if (totalFloatingSpent < floatingAsiBudget) next[ability] = 1;
                      else toast.info(`Only ${floatingAsiBudget} floating +1s allowed`);
                      return next;
                    });
                  }}
                  style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: chosen ? 'rgba(16, 185, 129, 0.18)' : disabled ? theme.accent.soft : theme.bg.surface,
                    border: `1px solid ${chosen ? theme.success : disabled ? theme.accent.line : theme.border}`,
                    color: disabled ? theme.text.muted : theme.text.primary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1, fontSize: 12, fontWeight: 600
                  }}
                >
                  {chosen ? '✓ ' : ''}{ability.charAt(0).toUpperCase() + ability.slice(1)}
                  {fixed && <span style={{ fontSize: 9, display: 'block', color: theme.text.muted }}>Already +{raceData.asi2014[ability]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {languageBudget > 0 && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: theme.accent.soft, border: `1px solid ${theme.accent.line || theme.border}` }}>
          <label style={labelStyle}>
            Choose {languageBudget} extra language{languageBudget === 1 ? '' : 's'}
            {' — '}
            <span style={{ color: chosenLanguages.length === languageBudget ? theme.success : (theme.accent?.primary || theme.accent), textTransform: 'none' }}>
              {chosenLanguages.length}/{languageBudget} picked
            </span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {extraLanguageOptions.filter(language => !(raceData?.languages || []).includes(language)).map(language => {
              const selected = chosenLanguages.includes(language);
              return (
                <button
                  key={language}
                  type="button"
                  data-testid={`language-${language.toLowerCase()}`}
                  onClick={() => {
                    setChosenLanguages(prev => {
                      if (prev.includes(language)) return prev.filter(item => item !== language);
                      if (prev.length >= languageBudget) {
                        toast.info(`Only ${languageBudget} language${languageBudget === 1 ? '' : 's'} can be chosen`);
                        return prev;
                      }
                      return [...prev, language];
                    });
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12,
                    background: selected ? theme.accent.soft : theme.bg.surface,
                    border: `1px solid ${selected ? (theme.accent?.primary || theme.accent) : theme.border}`,
                    color: theme.text.primary, cursor: 'pointer'
                  }}
                >
                  {selected ? '✓ ' : ''}{language}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
