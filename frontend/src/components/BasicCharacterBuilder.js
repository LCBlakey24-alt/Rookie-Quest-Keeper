import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import RookFormFillPanel from '@/components/RookFormFillPanel';
import { RACES, CLASSES, BACKGROUNDS } from '../data/characterRules5e';
import { buildBasicLanguages, countChoiceLanguages } from '../data/languageChoiceUtils';

// Recommended stat arrays by primary ability
const STAT_ARRAYS = {
  strength:     { strength: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  dexterity:    { dexterity: 15, constitution: 14, wisdom: 13, intelligence: 12, charisma: 10, strength: 8 },
  constitution: { constitution: 15, strength: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  intelligence: { intelligence: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, strength: 8 },
  wisdom:       { wisdom: 15, constitution: 14, dexterity: 13, strength: 12, intelligence: 10, charisma: 8 },
  charisma:     { charisma: 15, constitution: 14, dexterity: 13, wisdom: 12, intelligence: 10, strength: 8 }
};

const input = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 8,
  background: '#18181B',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  color: '#F9FAFB',
  fontSize: 14,
  outline: 'none',
};

const labelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 11,
  color: '#A1A1AA',
  fontWeight: 900,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

const panelStyle = {
  background: 'rgba(39, 39, 43, 0.92)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 12,
  boxShadow: '0 20px 48px rgba(0,0,0,0.34)',
};

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid rgba(239,68,68,0.35)',
  background: 'rgba(239,68,68,0.12)',
  color: '#FECACA',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
};

const clampLevel = (value) => Math.min(20, Math.max(1, Number.parseInt(value, 10) || 1));
const abilityModifier = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const formatModifier = (value) => (value >= 0 ? `+${value}` : `${value}`);

const calculateBasicMaxHp = ({ hitDie = 8, constitution = 10, level = 1 } = {}) => {
  const safeLevel = clampLevel(level);
  const die = Number(hitDie) || 8;
  const conMod = abilityModifier(constitution);
  const firstLevelHp = Math.max(1, die + conMod);
  const laterLevelHp = Math.max(1, Math.floor(die / 2) + 1 + conMod);

  return firstLevelHp + ((safeLevel - 1) * laterLevelHp);
};

const calculateBasicArmorClass = ({ characterClass, statBlock = {} } = {}) => {
  const dexMod = abilityModifier(statBlock.dexterity);
  const conMod = abilityModifier(statBlock.constitution);
  const wisMod = abilityModifier(statBlock.wisdom);

  if (characterClass === 'Barbarian') {
    return {
      value: 10 + dexMod + conMod,
      helper: `Unarmored Defense: 10 + Dex ${formatModifier(dexMod)} + Con ${formatModifier(conMod)}.`,
    };
  }

  if (characterClass === 'Monk') {
    return {
      value: 10 + dexMod + wisMod,
      helper: `Unarmored Defense: 10 + Dex ${formatModifier(dexMod)} + Wis ${formatModifier(wisMod)}.`,
    };
  }

  return {
    value: 10 + dexMod,
    helper: `Base AC: 10 + Dex ${formatModifier(dexMod)}. Armour and shields can be adjusted from the full sheet later.`,
  };
};

const buildClassFeaturesThroughLevel = (cls, characterClass, level) => {
  const safeLevel = clampLevel(level);
  const featuresByLevel = cls?.features || {};

  return Array.from({ length: safeLevel }, (_, index) => index + 1)
    .flatMap(featureLevel => (featuresByLevel[featureLevel] || [])
      .filter(featureName => featureName && featureName !== '---')
      .map(featureName => ({
        name: featureName,
        description: `${characterClass} feature gained at Level ${featureLevel}`,
        level: featureLevel,
      }))
    );
};

export default function BasicCharacterBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState('Fighter');
  const [race, setRace] = useState('Human');
  const [background, setBackground] = useState('Soldier');
  const [level, setLevel] = useState(1);
  const [edition, setEdition] = useState('2014');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);

  const cls = CLASSES[characterClass];
  const raceData = RACES[race];
  const bgData = BACKGROUNDS[background];
  const safeLevel = clampLevel(level);

  const statBlock = useMemo(() => {
    return STAT_ARRAYS[cls?.primaryAbility] || STAT_ARRAYS.strength;
  }, [cls]);

  // Reset skills when class changes/background changes
  useEffect(() => { setSelectedSkills([]); }, [characterClass, background]);

  const skillOptions = useMemo(() => {
    if (!cls) return [];
    return cls.skillChoices === 'any'
      ? ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival']
      : (cls.skillChoices || []);
  }, [cls]);

  const skillCount = cls?.skillCount || 2;
  const bgSkills = bgData?.skillProficiencies || [];
  const backgroundLanguageCount = Number(bgData?.languages || 0);
  const raceLanguageChoiceCount = countChoiceLanguages(raceData?.languages || []);
  const finalLanguages = useMemo(() => buildBasicLanguages({
    raceLanguages: raceData?.languages || [],
    backgroundLanguageCount,
  }), [raceData, backgroundLanguageCount]);
  const maxHP = useMemo(() => calculateBasicMaxHp({
    hitDie: cls?.hitDie,
    constitution: statBlock.constitution,
    level: safeLevel,
  }), [cls, statBlock, safeLevel]);
  const armorPreview = useMemo(() => calculateBasicArmorClass({
    characterClass,
    statBlock,
  }), [characterClass, statBlock]);
  const proficiencyBonus = 2 + Math.floor((safeLevel - 1) / 4);
  const classFeatures = useMemo(() => buildClassFeaturesThroughLevel(cls, characterClass, safeLevel), [cls, characterClass, safeLevel]);
  const startingEquipment = useMemo(() => [
    ...(cls?.startingEquipment || []),
    ...(bgData?.equipment || [])
  ], [cls, bgData]);

  const applyRookBuild = (patch = {}) => {
    if (patch.name !== undefined) setName(String(patch.name));
    if (patch.character_class && CLASSES[patch.character_class]) setCharacterClass(patch.character_class);
    if (patch.race && RACES[patch.race]) setRace(patch.race);
    if (patch.background && BACKGROUNDS[patch.background]) setBackground(patch.background);
    if (patch.level !== undefined) {
      setLevel(clampLevel(patch.level));
    }
  };

  const toggleSkill = (skill) => {
    if (bgSkills.includes(skill)) return;
    setSelectedSkills(prev => {
      if (prev.includes(skill)) return prev.filter(s => s !== skill);
      if (prev.length >= skillCount) {
        toast.info(`Pick only ${skillCount} class skill${skillCount === 1 ? '' : 's'}`);
        return prev;
      }
      return [...prev, skill];
    });
  };

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (selectedSkills.length !== skillCount) {
      return toast.error(`Pick ${skillCount} class skill${skillCount === 1 ? '' : 's'} before creating`);
    }

    setLoading(true);
    try {
      const allSkills = Array.from(new Set([...bgSkills, ...selectedSkills]));
      const racialTraits = (raceData?.traits || []).map(t => ({
        name: String(t).split(' (')[0],
        description: String(t)
      }));

      const payload = {
        name: name.trim(),
        creation_mode: 'basic',
        character_class: characterClass,
        race,
        subrace: '',
        level: safeLevel,
        background,
        alignment: 'Neutral',
        edition,
        ruleset_id: edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
        ...statBlock,
        max_hit_points: maxHP,
        armor_class: armorPreview.value,
        speed: raceData?.speed || 30,
        skill_proficiencies: allSkills,
        saving_throw_proficiencies: cls?.savingThrows || [],
        armor_proficiencies: cls?.armorProficiencies || [],
        weapon_proficiencies: cls?.weaponProficiencies || [],
        tool_proficiencies: bgData?.toolProficiencies || [],
        languages: finalLanguages,
        class_features: classFeatures,
        racial_traits: racialTraits,
        starting_equipment: startingEquipment
      };
      const res = await apiClient.post(`/characters`, payload);
      toast.success('Basic character created!');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character');
    } finally {
      setLoading(false);
    }
  };

  const autoFilledCount = raceLanguageChoiceCount + backgroundLanguageCount;
  const featurePreview = classFeatures.map(feature => feature.name).slice(0, 6).join(', ');
  const extraFeatureCount = Math.max(0, classFeatures.length - 6);

  return (
    <main style={{
      padding: '20px',
      color: '#F9FAFB',
      background: 'radial-gradient(circle at top left, rgba(239,68,68,0.14), transparent 32%), linear-gradient(180deg, #09090B, #18181B)',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/characters/new')}
          type="button"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#D4D4D8',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          ← Back to Modes
        </button>

        <section style={{
          ...panelStyle,
          padding: '18px',
          marginBottom: 14,
          display: 'grid',
          gap: 12,
        }}>
          <span style={pillStyle}>Guided build</span>
          <div>
            <h1 style={{ color: '#FFFFFF', margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1, letterSpacing: -1.4 }}>
              Basic Build
            </h1>
            <p style={{ color: '#A1A1AA', margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, maxWidth: 760 }}>
              Pick the fun choices. ROOK fills in the starter sheet details: ability scores, hit points, base armour class, proficiencies, equipment, traits, and languages.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            <AutoFillCard title="You choose" text="Name, edition, level, class, species, and background." />
            <AutoFillCard title="ROOK fills" text="Stats, HP, base AC, gear, traits, starter language choices, and class features." />
            <AutoFillCard title="Still yours" text="Pick class skills and edit the sheet after creation if needed." />
          </div>
        </section>

        <RookFormFillPanel
          title="Describe the character you want to play"
          helperText="ROOK can suggest a starter build, then import the class/species/background/level/name into these boxes."
          section="player basic character build"
          fields={[
            { name: 'name', label: 'Character name', field_type: 'text' },
            { name: 'character_class', label: 'Class', field_type: 'select', choices: Object.keys(CLASSES) },
            { name: 'race', label: 'Race/species', field_type: 'select', choices: Object.keys(RACES) },
            { name: 'background', label: 'Background', field_type: 'select', choices: Object.keys(BACKGROUNDS) },
            { name: 'level', label: 'Starting level', field_type: 'number' },
          ]}
          currentValues={{ name, character_class: characterClass, race, background, level }}
          onApply={applyRookBuild}
          placeholder="Example: I want to play a sneaky archer who avoids direct fights and talks their way out of trouble."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: 14, marginTop: 16 }}>
          <section style={{ ...panelStyle, padding: 16 }}>
            <h2 style={{ margin: '0 0 12px', color: '#FFFFFF', fontSize: 18 }}>Core choices</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <label style={labelStyle}>Character Name
                <input data-testid="basic-name" style={input} placeholder="Enter name..." value={name} onChange={e => setName(e.target.value)} />
              </label>

              <label style={labelStyle}>Edition
                <select style={input} value={edition} onChange={e => setEdition(e.target.value)} data-testid="basic-edition">
                  <option value="2014">2014 Rules</option>
                  <option value="2024">2024 Rules</option>
                </select>
              </label>

              <label style={labelStyle}>Starting Level
                <select style={input} value={level} onChange={e => setLevel(clampLevel(e.target.value))} data-testid="basic-level">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>

              <label style={labelStyle}>Class
                <select style={input} value={characterClass} onChange={e => setCharacterClass(e.target.value)} data-testid="basic-class">
                  {Object.keys(CLASSES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label style={labelStyle}>Species
                <select style={input} value={race} onChange={e => setRace(e.target.value)} data-testid="basic-race">
                  {Object.keys(RACES).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>

              <label style={labelStyle}>Background
                <select style={input} value={background} onChange={e => setBackground(e.target.value)} data-testid="basic-background">
                  {Object.keys(BACKGROUNDS).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
            </div>
          </section>

          <aside style={{ ...panelStyle, padding: 16 }}>
            <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: 18 }}>Starter sheet preview</h2>
            <p style={{ margin: '6px 0 12px', color: '#A1A1AA', fontSize: 12, lineHeight: 1.45 }}>
              These details will be saved onto the character sheet.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
              <PreviewStat label="HP" value={maxHP} helper={`Level ${safeLevel} average HP`} />
              <PreviewStat label="AC" value={armorPreview.value} helper="Base defence" />
              <PreviewStat label="Prof." value={`+${proficiencyBonus}`} helper="Proficiency bonus" />
              <PreviewStat label="Hit Die" value={`d${cls?.hitDie || 8}`} helper="Class hit die" />
            </div>

            {bgData && (
              <div style={{ display: 'grid', gap: 10 }}>
                <SummaryRow label="AC note" value={armorPreview.helper} />
                <SummaryRow label="Background" value={bgData.name || background} helper={bgData.description} />
                <SummaryRow label="Background skills" value={(bgData.skillProficiencies || []).join(', ') || 'None'} />
                <SummaryRow label="Tools" value={(bgData.toolProficiencies || []).join(', ') || 'None'} />
                <SummaryRow
                  label="Languages"
                  value={finalLanguages.join(', ') || 'None'}
                  helper={autoFilledCount > 0 ? `${autoFilledCount} language choice${autoFilledCount === 1 ? '' : 's'} auto-filled.` : 'Fixed starting languages.'}
                />
                <SummaryRow
                  label={`Class features to level ${safeLevel}`}
                  value={featurePreview || 'No listed class features'}
                  helper={extraFeatureCount > 0 ? `Plus ${extraFeatureCount} more saved to the sheet.` : 'Saved to the character sheet.'}
                />
                <SummaryRow label="Background equipment" value={(bgData.equipment || []).join(', ') || 'None listed'} />
                <SummaryRow label="Primary ability" value={cls?.primaryAbility || 'Strength'} />
              </div>
            )}
          </aside>
        </div>

        <section style={{ ...panelStyle, padding: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: 18 }}>Class skills</h2>
              <p style={{ margin: '5px 0 0', color: '#A1A1AA', fontSize: 12 }}>
                Pick {skillCount} class skill{skillCount === 1 ? '' : 's'}. Background skills are already granted.
              </p>
            </div>
            <span style={pillStyle}>{selectedSkills.length}/{skillCount} picked</span>
          </div>

          {bgSkills.length > 0 && (
            <div style={{ fontSize: 12, color: '#D4D4D8', marginBottom: 10, padding: 10, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, background: 'rgba(255,255,255,0.035)' }}>
              Granted by {background}: <strong>{bgSkills.join(', ')}</strong>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {skillOptions.map(skill => {
              const fromBg = bgSkills.includes(skill);
              const sel = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  disabled={fromBg}
                  onClick={() => toggleSkill(skill)}
                  data-testid={`basic-skill-${skill.replace(/ /g, '-').toLowerCase()}`}
                  style={{
                    padding: '7px 11px',
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 800,
                    background: fromBg ? 'rgba(16,185,129,0.12)' : sel ? 'rgba(239,68,68,0.22)' : '#18181B',
                    border: `1px solid ${fromBg ? 'rgba(16,185,129,0.4)' : sel ? 'rgba(239,68,68,0.75)' : 'rgba(255,255,255,0.11)'}`,
                    color: '#F9FAFB',
                    cursor: fromBg ? 'not-allowed' : 'pointer',
                    opacity: fromBg ? 0.72 : 1
                  }}>
                  {sel || fromBg ? '✓ ' : ''}{skill}
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <button
            disabled={loading || selectedSkills.length !== skillCount}
            onClick={submit}
            data-testid="basic-submit"
            style={{
              padding: '13px 20px',
              borderRadius: 8,
              fontWeight: 900,
              background: loading || selectedSkills.length !== skillCount ? 'rgba(239,68,68,0.18)' : '#EF4444',
              border: '1px solid rgba(239,68,68,0.75)',
              color: '#FFFFFF',
              cursor: loading || selectedSkills.length !== skillCount ? 'not-allowed' : 'pointer',
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}>
            {loading ? 'Creating...' : 'Create Character'}
          </button>
          <span style={{ color: '#A1A1AA', fontSize: 12 }}>
            You can edit the full sheet after creation.
          </span>
        </div>
      </div>
    </main>
  );
}

function AutoFillCard({ title, text }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.035)', borderRadius: 9, padding: 11 }}>
      <strong style={{ display: 'block', color: '#FFFFFF', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 }}>{title}</strong>
      <span style={{ display: 'block', color: '#A1A1AA', fontSize: 12, lineHeight: 1.4, marginTop: 4 }}>{text}</span>
    </div>
  );
}

function PreviewStat({ label, value, helper }) {
  return (
    <div style={{ border: '1px solid rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: 10 }}>
      <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 900, letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 900, marginTop: 2, lineHeight: 1 }}>{value}</div>
      {helper && <div style={{ color: '#A1A1AA', fontSize: 10, lineHeight: 1.3, marginTop: 4 }}>{helper}</div>}
    </div>
  );
}

function SummaryRow({ label, value, helper }) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
      <div style={{ color: '#A1A1AA', fontSize: 10, fontWeight: 900, letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 800, marginTop: 3 }}>{value}</div>
      {helper && <div style={{ color: '#A1A1AA', fontSize: 11, lineHeight: 1.4, marginTop: 3 }}>{helper}</div>}
    </div>
  );
}
