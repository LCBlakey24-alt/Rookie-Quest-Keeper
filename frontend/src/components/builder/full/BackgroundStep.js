import React from 'react';
import { Check, Scroll } from 'lucide-react';
import { getFeatsByEdition } from '../../../data/levelUpData';

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export default function BackgroundStep({
  background,
  setBackground,
  backgroundData,
  mergedBackgrounds,
  edition,
  originFeat,
  setOriginFeat,
  theme,
  StepHeader,
  labelStyle,
  selectStyle,
  traitChipStyle,
}) {
  const backgroundOptions = Object.keys(mergedBackgrounds || {});
  const skillProficiencies = asList(backgroundData?.skillProficiencies || backgroundData?.skills);
  const toolProficiencies = asList(backgroundData?.toolProficiencies || backgroundData?.tools);
  const equipment = asList(backgroundData?.equipment);
  const languageCount = Math.max(0, Number(backgroundData?.languages) || 0);

  return (
    <div>
      <StepHeader
        icon={Scroll}
        title="Choose Your Background"
        subtitle="Your background grants skills, tools, equipment, and sometimes language choices."
        color={theme.sunset.gold}
      />

      <label style={labelStyle}>Background</label>
      <select
        value={background}
        onChange={(event) => setBackground(event.target.value)}
        style={selectStyle}
        data-testid="background-select"
      >
        <option value="">Choose a background...</option>
        {backgroundOptions.map((backgroundName) => (
          <option key={backgroundName} value={backgroundName}>{backgroundName}</option>
        ))}
      </select>

      {backgroundData && (
        <div style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 12,
          background: 'rgba(31, 31, 35, 0.55)',
          border: `1px solid ${theme.border}`,
        }}>
          <h3 style={{ margin: '0 0 6px', color: theme.text.primary, fontSize: 18 }}>
            {backgroundData.name || background}
          </h3>

          {backgroundData.description && (
            <p style={{ margin: '0 0 14px', color: theme.text.secondary, fontSize: 13, lineHeight: 1.5 }}>
              {backgroundData.description}
            </p>
          )}

          <BackgroundGroup title="Skill Proficiencies" items={skillProficiencies} theme={theme} traitChipStyle={traitChipStyle} />
          <BackgroundGroup title="Tool Proficiencies" items={toolProficiencies} theme={theme} traitChipStyle={traitChipStyle} />

          {languageCount > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>
                Languages
              </div>
              <span style={{ ...traitChipStyle, background: theme.accent.soft, borderColor: theme.border }}>
                <Check size={12} /> {languageCount} language choice{languageCount === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {equipment.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>
                Starting Equipment
              </div>
              <div style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 1.5 }}>
                {equipment.join(', ')}
              </div>
            </div>
          )}

          {(backgroundData.feature || backgroundData.featureDesc) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
              {backgroundData.feature && (
                <div style={{ color: theme.sunset.gold, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                  {backgroundData.feature}
                </div>
              )}
              {backgroundData.featureDesc && (
                <div style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 1.5 }}>
                  {backgroundData.featureDesc}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {edition === '2024' && backgroundData && (
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>
            2024 Origin Feat
            <span style={{ color: originFeat ? theme.success : theme.sunset.gold, textTransform: 'none', marginLeft: 6 }}>
              {originFeat ? `✓ ${originFeat}` : '(required in 2024 rules)'}
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Pick a 2024-style Origin feat granted by your background.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {getFeatsByEdition('2024', 'origin').map((feat) => {
              const selected = originFeat === feat.name;
              return (
                <button
                  key={feat.name}
                  type="button"
                  data-testid={`origin-feat-${feat.name.toLowerCase().replace(/\s/g, '-').replace(/[()]/g, '')}`}
                  onClick={() => setOriginFeat(selected ? '' : feat.name)}
                  title={feat.description}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    textAlign: 'left',
                    background: selected ? theme.accent.soft : theme.bg.primary,
                    border: `1px solid ${selected ? theme.borderActive : theme.border}`,
                    color: theme.text.primary,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{selected ? '✓ ' : ''}{feat.name}</div>
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

function BackgroundGroup({ title, items, theme, traitChipStyle }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => (
          <span key={item} style={traitChipStyle}>
            <Check size={12} /> {item}
          </span>
        ))}
      </div>
    </div>
  );
}
