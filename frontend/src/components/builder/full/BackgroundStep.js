import React from 'react';
import { Award, Backpack, Scroll, Sparkles } from 'lucide-react';
import { getFeatsForRuleset } from '@/data/rules/feats/featRegistry';
import { DetailPanel, Pill, SelectCard, StepHeader } from '../../character-builder/BuilderPrimitives';
import { detailHeaderStyle, traitChipStyle } from '../../character-builder/builderTheme';

export default function BackgroundStep({
  background,
  setBackground,
  backgroundData,
  mergedBackgrounds,
  edition,
  originFeat,
  setOriginFeat,
  theme,
  labelStyle,
}) {
  return (
    <div>
      <StepHeader icon={Scroll} title="Choose Your Background" subtitle="Your past life shapes your skills and gear" color={theme.sunset.gold} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(mergedBackgrounds).map(([key, b]) => (
          <SelectCard
            key={key} active={background === key} onClick={() => setBackground(key)}
            color={theme.sunset.gold}
            title={b.name}
            subtitle={b.description}
            data-testid={`background-${key}`}
            footer={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {(b.skillProficiencies || []).map(sp => <Pill key={sp} icon="📜">{sp}</Pill>)}
                {edition === '2024' && b.asi2024 && (
                  <Pill icon="✨">
                    {Object.entries(b.asi2024).map(([k, v]) => `+${v} ${k.slice(0, 3).toUpperCase()}`).join(' ')}
                  </Pill>
                )}
              </div>
            }
          />
        ))}
      </div>

      {backgroundData && (
        <DetailPanel title={backgroundData.name} color={theme.sunset.gold}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={detailHeaderStyle}>Granted Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {(backgroundData.skillProficiencies || []).map(s => <span key={s} style={traitChipStyle}><Award size={12} /> {s}</span>)}
              </div>
              {backgroundData.toolProficiencies && (
                <>
                  <div style={detailHeaderStyle}>Tool Proficiencies</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {backgroundData.toolProficiencies.map(t => <span key={t} style={traitChipStyle}><Backpack size={12} /> {t}</span>)}
                  </div>
                </>
              )}
              {backgroundData.feature && (
                <>
                  <div style={detailHeaderStyle}>Feature</div>
                  <div style={traitChipStyle}><Sparkles size={12} /> {backgroundData.feature}</div>
                </>
              )}
            </div>
            <div>
              <div style={detailHeaderStyle}>Starting Equipment</div>
              <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.6 }}>
                {(backgroundData.equipment || []).map((e, i) => <div key={i}>• {e}</div>)}
              </div>
              {edition === '2024' && backgroundData.originFeat2024 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={detailHeaderStyle}>2024 Origin Feat</div>
                  <div style={traitChipStyle}><Sparkles size={12} /> {backgroundData.originFeat2024}</div>
                </div>
              )}
            </div>
          </div>
        </DetailPanel>
      )}

      {/* 2024 Origin Feat picker — required when edition is 2024 */}
      {edition === '2024' && (
        <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: theme.bg.surface, border: `1px solid ${theme.border}` }}>
          <label style={labelStyle}>
            2024 Origin Feat
            <span style={{ color: originFeat ? '#10B981' : '#EF4444', textTransform: 'none', marginLeft: 6 }}>
              {originFeat ? `✓ ${originFeat}` : '(REQUIRED in 2024 rules)'}
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Pick a 2024-style Origin feat granted by your background. (Origin feats are a new 2024 PHB feature replacing the 2014 background ASI flow.)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {getFeatsForRuleset({ edition: '2024', category: 'origin' }).map(feat => {
              const sel = originFeat === feat.name;
              return (
                <button
                  key={feat.name} type="button"
                  data-testid={`origin-feat-${feat.name.toLowerCase().replace(/\s/g, '-').replace(/[()]/g, '')}`}
                  onClick={() => setOriginFeat(sel ? '' : feat.name)}
                  title={feat.description}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 12, textAlign: 'left',
                    background: sel ? 'rgba(239, 68, 68, 0.18)' : theme.bg.primary,
                    border: `1px solid ${sel ? theme.sunset.gold : theme.border}`,
                    color: theme.text.primary, cursor: 'pointer'
                  }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{sel ? '✓ ' : ''}{feat.name}</div>
                  <div style={{ fontSize: 10, color: theme.text.muted, lineHeight: 1.4 }}>{feat.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
