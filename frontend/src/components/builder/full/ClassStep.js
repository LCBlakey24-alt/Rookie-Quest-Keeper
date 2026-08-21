import React from 'react';
import { Shield, Sparkles, Sword } from 'lucide-react';

import ClassSubclassPicker from '@/components/builder/ClassSubclassPicker';
import { DetailPanel, Pill, SelectCard, StepHeader } from '@/components/character-builder/BuilderPrimitives';
import { detailHeaderStyle, traitChipStyle } from '@/components/character-builder/builderTheme';

const list = value => Array.isArray(value) ? value : [];
const featureName = feature => typeof feature === 'string' ? feature : feature?.name || feature?.title || '';

export function normaliseClassForLevelOneDisplay(classData = {}) {
  const rawFeatures = classData?.features;
  const levelOneFeatures = Array.isArray(rawFeatures)
    ? rawFeatures
      .filter(feature => typeof feature === 'string' || Number(feature?.level ?? 1) === 1)
      .map(featureName)
      .filter(Boolean)
    : list(rawFeatures?.[1]).map(featureName).filter(Boolean);

  return {
    savingThrows: list(classData?.savingThrows ?? classData?.saving_throw_proficiencies),
    armorProficiencies: list(classData?.armorProficiencies ?? classData?.armorProf ?? classData?.armor_proficiencies),
    weaponProficiencies: list(classData?.weaponProficiencies ?? classData?.weaponProf ?? classData?.weapon_proficiencies),
    levelOneFeatures,
    startingEquipment: list(classData?.startingEquipment ?? classData?.equipment),
  };
}

export default function ClassStep({
  mergedClasses,
  className,
  setClassName,
  classData,
  edition,
  subclass,
  setSubclass,
  subclassLabel,
  requiresLevelOneSubclass,
  fightingStyle,
  setFightingStyle,
  fightingStyleClasses,
  theme,
  labelStyle,
  inputStyle,
}) {
  const classDisplay = normaliseClassForLevelOneDisplay(classData);

  return (
    <div>
      <StepHeader icon={Sword} title="Choose Your Class" subtitle="Your class defines your role and abilities" color={theme.sunset.purple} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(mergedClasses).map(([key, c]) => (
          <SelectCard
            key={key}
            active={className === key}
            onClick={() => setClassName(key)}
            color={theme.sunset.purple}
            title={c.name}
            subtitle={`Hit Die: d${c.hitDie} • ${c.primaryAbility?.slice(0, 3).toUpperCase()}`}
            data-testid={`class-${key}`}
            footer={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                <Pill icon="❤️">d{c.hitDie} HP</Pill>
                {c.spellcasting && <Pill icon="✦">Spellcaster</Pill>}
                <Pill icon="🛡️">{list(c.savingThrows ?? c.saving_throw_proficiencies).map(s => s.slice(0, 3).toUpperCase()).join('/')}</Pill>
              </div>
            }
          />
        ))}
      </div>

      {classData && (
        <DetailPanel title={`${classData.name} Level 1`} color={theme.sunset.purple}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={detailHeaderStyle}>Saving Throws</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {classDisplay.savingThrows.map(save => (
                  <span key={save} style={traitChipStyle}>
                    <Shield size={12} /> {save.charAt(0).toUpperCase() + save.slice(1)}
                  </span>
                ))}
              </div>
              <div style={detailHeaderStyle}>Armor & Weapons</div>
              <div style={{ fontSize: '13px', color: theme.text.secondary, marginBottom: '12px', lineHeight: 1.6 }}>
                <div><strong>Armor:</strong> {classDisplay.armorProficiencies.length ? classDisplay.armorProficiencies.join(', ') : 'None'}</div>
                <div><strong>Weapons:</strong> {classDisplay.weaponProficiencies.length ? classDisplay.weaponProficiencies.join(', ') : 'None'}</div>
              </div>
            </div>
            <div>
              <div style={detailHeaderStyle}>Level 1 Features</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {classDisplay.levelOneFeatures.map(feature => (
                  <span key={feature} style={traitChipStyle}><Sparkles size={12} /> {feature}</span>
                ))}
              </div>
              <div style={detailHeaderStyle}>Starting Equipment</div>
              <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.6 }}>
                {classDisplay.startingEquipment.map((item, index) => <div key={index}>• {typeof item === 'string' ? item : item?.name || item?.label || 'Equipment'}</div>)}
              </div>
            </div>
          </div>
        </DetailPanel>
      )}

      {className && (
        <ClassSubclassPicker
          className={className}
          edition={edition}
          level={1}
          classes={mergedClasses}
          selectedSubclass={subclass}
          onSubclassChange={setSubclass}
          label={subclassLabel}
          required={requiresLevelOneSubclass}
          requiredText="(REQUIRED at Level 1)"
          optionalText="(chosen later at the appropriate level)"
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          theme={theme}
        />
      )}

      {fightingStyleClasses[className]?.level === 1 && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: theme.accent.soft, border: `1px solid ${theme.accent.line || theme.border}` }}>
          <label style={labelStyle}>
            Fighting Style
            <span style={{ color: theme.danger, textTransform: 'none', marginLeft: 6 }}>
              (REQUIRED at Level 1)
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {fightingStyleClasses[className].styles.map(style => {
              const selected = fightingStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  data-testid={`fighting-style-${style.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => setFightingStyle(selected ? '' : style)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'left',
                    background: selected ? 'rgba(239, 68, 68, 0.18)' : theme.bg.surface,
                    border: `1px solid ${selected ? theme.danger : theme.border}`,
                    color: theme.text.primary, cursor: 'pointer'
                  }}
                >
                  {selected ? '✓ ' : ''}{style}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
