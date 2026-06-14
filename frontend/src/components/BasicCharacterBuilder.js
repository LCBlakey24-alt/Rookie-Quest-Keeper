import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import RookFormFillPanel from '@/components/RookFormFillPanel';
import { RACES, CLASSES, BACKGROUNDS } from '../data/characterRules5e';

// Recommended stat arrays by primary ability
const STAT_ARRAYS = {
  strength:     { strength: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  dexterity:    { dexterity: 15, constitution: 14, wisdom: 13, intelligence: 12, charisma: 10, strength: 8 },
  constitution: { constitution: 15, strength: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  intelligence: { intelligence: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, strength: 8 },
  wisdom:       { wisdom: 15, constitution: 14, dexterity: 13, strength: 12, intelligence: 10, charisma: 8 },
  charisma:     { charisma: 15, constitution: 14, dexterity: 13, wisdom: 12, intelligence: 10, strength: 8 }
};

const GLADIATOR_BACKGROUND = {
  name: 'Gladiator',
  description: 'Arena performer or pit fighter with a fearsome reputation.',
  skillProficiencies: ['Athletics', 'Performance'],
  toolProficiencies: ['Disguise kit', 'Musical instrument'],
  equipment: ['Costume', 'Arena token', 'Common clothes', '15 gp'],
  feature: 'Arena Reputation',
  asi2024: { strength: 2, charisma: 1 },
  originFeat2024: 'Savage Attacker'
};

const BACKGROUND_OPTIONS = {
  ...BACKGROUNDS,
  Gladiator: BACKGROUNDS.Gladiator || GLADIATOR_BACKGROUND,
};

const FIGHTER_FIGHTING_STYLES = [
  'Archery',
  'Defense',
  'Dueling',
  'Great Weapon Fighting',
  'Protection',
  'Two-Weapon Fighting',
];

const FIGHTER_STYLE_HELP = {
  Archery: '+2 to hit with ranged weapon attacks.',
  Defense: '+1 AC while wearing armour.',
  Dueling: '+2 damage with a one-handed melee weapon and no off-hand weapon.',
  'Great Weapon Fighting': 'Reroll very low damage dice with two-handed/heavy melee weapons.',
  Protection: 'Use your reaction to protect a nearby ally with a shield.',
  'Two-Weapon Fighting': 'Add your ability modifier to off-hand weapon damage.',
};

const input = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  background: 'rgba(15,36,64,0.6)', border: '1px solid #D4A017',
  color: '#F8FAFC', fontSize: 14
};

export default function BasicCharacterBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState('Fighter');
  const [race, setRace] = useState('Human');
  const [background, setBackground] = useState('Soldier');
  const [level, setLevel] = useState(1);
  const [edition, setEdition] = useState('2014');
  const [fightingStyle, setFightingStyle] = useState('Defense');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);

  const cls = CLASSES[characterClass];
  const raceData = RACES[race];
  const bgData = BACKGROUND_OPTIONS[background];

  const statBlock = useMemo(() => {
    return STAT_ARRAYS[cls?.primaryAbility] || STAT_ARRAYS.strength;
  }, [cls]);

  // Reset skills when class changes/background changes
  useEffect(() => {
    setSelectedSkills([]);
    if (characterClass === 'Fighter' && !fightingStyle) setFightingStyle('Defense');
    if (characterClass !== 'Fighter') setFightingStyle('');
  }, [characterClass, background, fightingStyle]);

  const skillOptions = useMemo(() => {
    if (!cls) return [];
    return cls.skillChoices === 'any'
      ? ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival']
      : (cls.skillChoices || []);
  }, [cls]);

  const skillCount = cls?.skillCount || 2;
  const bgSkills = bgData?.skillProficiencies || [];

  const applyRookBuild = (patch = {}) => {
    if (patch.name !== undefined) setName(String(patch.name));
    if (patch.character_class && CLASSES[patch.character_class]) setCharacterClass(patch.character_class);
    if (patch.race && RACES[patch.race]) setRace(patch.race);
    if (patch.background && BACKGROUND_OPTIONS[patch.background]) setBackground(patch.background);
    if (patch.fighting_style && FIGHTER_FIGHTING_STYLES.includes(patch.fighting_style)) setFightingStyle(patch.fighting_style);
    if (patch.level !== undefined) {
      const nextLevel = Math.min(20, Math.max(1, Number.parseInt(patch.level, 10) || 1));
      setLevel(nextLevel);
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
    if (characterClass === 'Fighter' && !fightingStyle) {
      return toast.error('Pick a Fighter Fighting Style before creating');
    }
    const conMod = Math.floor(((statBlock.constitution || 10) - 10) / 2);
    const maxHP = Math.max(1, (cls?.hitDie || 8) + conMod);

    setLoading(true);
    try {
      const allSkills = Array.from(new Set([...bgSkills, ...selectedSkills]));
      const baseLanguages = (raceData?.languages || []).filter(l => !l.toLowerCase().includes('choice'));
      const racialTraits = (raceData?.traits || []).map(t => ({
        name: String(t).split(' (')[0],
        description: String(t)
      }));
      const classFeatures = (cls?.features?.[1] || []).map(featureName => ({
        name: featureName,
        description: `${characterClass} feature gained at Level 1`
      }));

      const payload = {
        name: name.trim(),
        creation_mode: 'basic',
        character_class: characterClass,
        race,
        subrace: '',
        level: Number(level),
        background,
        alignment: 'Neutral',
        edition,
        ruleset_id: edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
        ...statBlock,
        max_hit_points: maxHP,
        speed: raceData?.speed || 30,
        skill_proficiencies: allSkills,
        saving_throw_proficiencies: cls?.savingThrows || [],
        armor_proficiencies: cls?.armorProficiencies || [],
        weapon_proficiencies: cls?.weaponProficiencies || [],
        tool_proficiencies: bgData?.toolProficiencies || [],
        languages: baseLanguages,
        fighting_style: characterClass === 'Fighter' ? fightingStyle : '',
        class_features: classFeatures,
        racial_traits: racialTraits,
        starting_equipment: [...(cls?.startingEquipment || []), ...(bgData?.equipment || [])]
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

  return (
    <div style={{ padding: 24, color: '#F8FAFC', background: '#0A1628', minHeight: '100vh' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ color: '#D4A017', margin: 0 }}>Basic Build</h1>
        <p style={{ color: '#94A3B8' }}>Pick the essentials. We auto-fill stats, equipment, and traits.</p>

        <RookFormFillPanel
          title="Describe the character you want to play"
          helperText="Rook can suggest a starter build, then import the class/race/background/level/name into these boxes."
          section="player basic character build"
          fields={[
            { name: 'name', label: 'Character name', field_type: 'text' },
            { name: 'character_class', label: 'Class', field_type: 'select', choices: Object.keys(CLASSES) },
            { name: 'race', label: 'Race/species', field_type: 'select', choices: Object.keys(RACES) },
            { name: 'background', label: 'Background', field_type: 'select', choices: Object.keys(BACKGROUND_OPTIONS) },
            { name: 'fighting_style', label: 'Fighter fighting style', field_type: 'select', choices: FIGHTER_FIGHTING_STYLES },
            { name: 'level', label: 'Starting level', field_type: 'number' },
          ]}
          currentValues={{ name, character_class: characterClass, race, background, fighting_style: fightingStyle, level }}
          onApply={applyRookBuild}
          placeholder="Example: I want to play a sneaky archer who avoids direct fights and talks their way out of trouble."
        />

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <label style={{ fontSize: 12, color: '#94A3B8' }}>Character Name
            <input data-testid="basic-name" style={input} placeholder='Enter name...' value={name} onChange={e => setName(e.target.value)} />
          </label>

          <label style={{ fontSize: 12, color: '#94A3B8' }}>Edition
            <select style={input} value={edition} onChange={e => setEdition(e.target.value)} data-testid="basic-edition">
              <option value='2014'>2014 Rules</option>
              <option value='2024'>2024 Rules</option>
            </select>
          </label>

          <label style={{ fontSize: 12, color: '#94A3B8' }}>Starting Level
            <select style={input} value={level} onChange={e => setLevel(Number(e.target.value))} data-testid="basic-level">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label style={{ fontSize: 12, color: '#94A3B8' }}>Class
            <select style={input} value={characterClass} onChange={e => setCharacterClass(e.target.value)} data-testid="basic-class">
              {Object.keys(CLASSES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {characterClass === 'Fighter' && (
            <div style={{ padding: 12, border: '1px solid rgba(124,58,237,0.55)', borderRadius: 10, background: 'rgba(124,58,237,0.12)' }} data-testid="basic-fighter-style-panel">
              <div style={{ fontSize: 12, color: '#C4B5FD', fontWeight: 800, marginBottom: 6 }}>
                Fighter Fighting Style <span style={{ color: '#FCA5A5' }}>(required at level 1)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
                {FIGHTER_FIGHTING_STYLES.map(style => {
                  const selected = fightingStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFightingStyle(style)}
                      data-testid={`basic-fighter-style-${style.toLowerCase().replace(/ /g, '-')}`}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${selected ? '#8B5CF6' : 'rgba(148,163,184,0.25)'}`,
                        background: selected ? 'rgba(124,58,237,0.35)' : 'rgba(15,36,64,0.72)',
                        color: '#F8FAFC',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: 12 }}>{selected ? '✓ ' : ''}{style}</strong>
                      <span style={{ color: '#CBD5E1', fontSize: 11 }}>{FIGHTER_STYLE_HELP[style]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label style={{ fontSize: 12, color: '#94A3B8' }}>Race
            <select style={input} value={race} onChange={e => setRace(e.target.value)} data-testid="basic-race">
              {Object.keys(RACES).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label style={{ fontSize: 12, color: '#94A3B8' }}>Background
            <select style={input} value={background} onChange={e => setBackground(e.target.value)} data-testid="basic-background">
              {Object.keys(BACKGROUND_OPTIONS).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          {bgData && (
            <div style={{ padding: 10, border: '1px solid rgba(212,160,23,0.45)', borderRadius: 8, color: '#CBD5E1', fontSize: 12, lineHeight: 1.5 }}>
              <strong style={{ color: '#D4A017' }}>{bgData.name}</strong>: {bgData.description}<br />
              Skills: {(bgData.skillProficiencies || []).join(', ') || 'None'}
            </div>
          )}

          <div style={{ padding: 12, border: '1px solid #D4A017', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#D4A017', fontWeight: 700, marginBottom: 6 }}>
              Pick {skillCount} class skill{skillCount === 1 ? '' : 's'} ({selectedSkills.length}/{skillCount})
            </div>
            {bgSkills.length > 0 && (
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
                Granted by {background}: {bgSkills.join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skillOptions.map(skill => {
                const fromBg = bgSkills.includes(skill);
                const sel = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill} type="button"
                    disabled={fromBg}
                    onClick={() => toggleSkill(skill)}
                    data-testid={`basic-skill-${skill.replace(/ /g, '-').toLowerCase()}`}
                    style={{
                      padding: '5px 10px', borderRadius: 6, fontSize: 12,
                      background: fromBg ? 'rgba(212,160,23,0.25)' : sel ? 'rgba(212,160,23,0.4)' : 'rgba(15,36,64,0.6)',
                      border: `1px solid ${fromBg || sel ? '#D4A017' : 'rgba(212,160,23,0.3)'}`,
                      color: '#F8FAFC',
                      cursor: fromBg ? 'not-allowed' : 'pointer',
                      opacity: fromBg ? 0.7 : 1
                    }}>
                    {sel || fromBg ? '✓ ' : ''}{skill}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={loading || selectedSkills.length !== skillCount || (characterClass === 'Fighter' && !fightingStyle)}
            onClick={submit}
            data-testid="basic-submit"
            style={{
              marginTop: 8, padding: '12px 20px', borderRadius: 8, fontWeight: 700,
              background: loading || selectedSkills.length !== skillCount || (characterClass === 'Fighter' && !fightingStyle) ? 'rgba(212,160,23,0.2)' : '#D4A017',
              border: '1px solid #D4A017', color: '#0A1628', cursor: 'pointer', fontSize: 15
            }}>
            {loading ? 'Creating...' : 'Create Character'}
          </button>
          <button onClick={() => navigate('/characters/new')} type="button" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 13 }}>
            ← Back to Modes
          </button>
        </div>
      </div>
    </div>
  );
}
