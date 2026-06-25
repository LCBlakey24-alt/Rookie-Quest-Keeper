import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import RookFormFillPanel from '@/components/RookFormFillPanel';
import BasicCatchUpChoicesPanel, { buildCatchUpLevelProgression } from '@/components/builder/BasicCatchUpChoicesPanel';
import { RACES, CLASSES, BACKGROUNDS } from '../data/characterRules5e';
import { buildBasicLanguages, countChoiceLanguages } from '../data/languageChoiceUtils';
import { calculateArmorAc } from '../data/armorRules5e';
import { CANTRIPS_KNOWN, SPELLCASTING_CLASSES, SPELLS_KNOWN, getSpellSlotsForCaster, getSpellsForClass } from '../data/spellDatabase';
import { getStartingLevelChoicePlan } from '@/data/startingLevelChoices2014';

// Starter stat arrays by primary ability
const STAT_ARRAYS = {
  strength:     { strength: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  dexterity:    { dexterity: 15, constitution: 14, wisdom: 13, intelligence: 12, charisma: 10, strength: 8 },
  constitution: { constitution: 15, strength: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  intelligence: { intelligence: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, strength: 8 },
  wisdom:       { wisdom: 15, constitution: 14, dexterity: 13, strength: 12, intelligence: 10, charisma: 8 },
  charisma:     { charisma: 15, constitution: 14, dexterity: 13, wisdom: 12, intelligence: 10, strength: 8 }
};

const BASIC_ARMOR_OPTIONS = [
  { key: 'none', name: 'No armour', category: 'none', helper: 'Clothes or unarmoured defence.' },
  { key: 'Leather', name: 'Leather', category: 'light', helper: 'Light armour: 11 + Dex.' },
  { key: 'StuddedLeather', name: 'Studded Leather', category: 'light', helper: 'Light armour: 12 + Dex.' },
  { key: 'Hide', name: 'Hide', category: 'medium', helper: 'Medium armour: 12 + Dex, max +2.' },
  { key: 'ChainShirt', name: 'Chain Shirt', category: 'medium', helper: 'Medium armour: 13 + Dex, max +2.' },
  { key: 'ScaleMail', name: 'Scale Mail', category: 'medium', helper: 'Medium armour: 14 + Dex, max +2.' },
  { key: 'ChainMail', name: 'Chain Mail', category: 'heavy', helper: 'Heavy armour: flat 16 AC.' },
];

const velvet = {
  appBackground: '#120C08',
  surface: '#21150E',
  card: '#2E1D13',
  raised: '#3A2619',
  gold: '#C08A3D',
  goldHover: '#E0B15C',
  copper: '#A45A32',
  text: '#F5E6C8',
  softText: '#E6D2AA',
  muted: '#CDBA98',
  success: '#7A9B66',
};

const input = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 8,
  background: velvet.card,
  border: '1px solid rgba(192, 138, 61, 0.34)',
  color: velvet.text,
  fontSize: 14,
  outline: 'none',
};

const labelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 11,
  color: velvet.muted,
  fontWeight: 900,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

const panelStyle = {
  background: 'rgba(33, 21, 14, 0.95)',
  border: '1px solid rgba(192, 138, 61, 0.22)',
  borderRadius: 12,
  boxShadow: 'none',
};

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid rgba(192, 138, 61, 0.46)',
  background: 'rgba(192, 138, 61, 0.16)',
  color: velvet.text,
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
};

const velvetPanelStyle = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  border: '1px solid rgba(224, 177, 92, 0.24)',
  background: 'rgba(46, 29, 19, 0.48)',
};

const clampLevel = (value) => Math.min(20, Math.max(1, Number.parseInt(value, 10) || 1));
const abilityModifier = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const formatModifier = (value) => (value >= 0 ? `+${value}` : `${value}`);

const toSpellEntry = (spell) => ({ name: spell.name, level: spell.level || 0, school: spell.school || '', description: spell.description || '' });

const getProgressionCount = (table = {}, level = 1) => {
  let count = 0;
  Object.entries(table).forEach(([entryLevel, value]) => {
    if (Number(entryLevel) <= level) count = Number(value) || count;
  });
  return count;
};

const buildBasicSpellDefaults = ({ characterClass, level, statBlock }) => {
  const classInfo = SPELLCASTING_CLASSES[characterClass];
  if (!classInfo || classInfo.subclassOnly) return {};

  const slots = getSpellSlotsForCaster(classInfo, level);
  if (classInfo.halfCaster && Object.keys(slots).length === 0) return {};

  const ability = classInfo.ability;
  const abilityMod = abilityModifier(statBlock[ability]);
  const proficiency = 2 + Math.floor((level - 1) / 4);
  const spellsByLevel = getSpellsForClass(characterClass);
  const cantripCount = getProgressionCount(CANTRIPS_KNOWN[characterClass], level);
  const cantrips = (spellsByLevel.cantrips || []).slice(0, cantripCount).map(toSpellEntry);
  const maxSpellLevel = Math.max(0, ...Object.keys(slots || {}).map(Number));
  const leveledPool = [];
  for (let spellLevel = 1; spellLevel <= maxSpellLevel; spellLevel += 1) {
    leveledPool.push(...((spellsByLevel[spellLevel] || []).map(spell => ({ ...spell, level: spellLevel }))));
  }

  const fields = {
    spellcasting_ability: ability,
    spell_save_dc: 8 + proficiency + abilityMod,
    spell_attack_bonus: proficiency + abilityMod,
    spell_slots: slots,
    spell_slots_remaining: slots,
    cantrips_known: cantrips,
  };

  if (classInfo.type === 'known' || classInfo.pactMagic) {
    const knownCount = getProgressionCount(SPELLS_KNOWN[characterClass], level);
    fields.spells_known = leveledPool.slice(0, knownCount).map(toSpellEntry);
  } else if (characterClass === 'Wizard') {
    const spellbookCount = Math.max(6, 6 + Math.max(0, level - 1) * 2);
    fields.spells_known = leveledPool.slice(0, spellbookCount).map(toSpellEntry);
    fields.spells_prepared = leveledPool.slice(0, Math.max(1, level + abilityMod)).map(toSpellEntry);
    fields.spell_preparation_loadout = 'rook-balanced';
  } else {
    fields.spells_prepared = leveledPool.slice(0, Math.max(1, level + abilityMod)).map(toSpellEntry);
    fields.spell_preparation_loadout = 'rook-balanced';
  }

  return fields;
};


const calculateBasicMaxHp = ({ hitDie = 8, constitution = 10, level = 1 } = {}) => {
  const safeLevel = clampLevel(level);
  const die = Number(hitDie) || 8;
  const conMod = abilityModifier(constitution);
  const firstLevelHp = Math.max(1, die + conMod);
  const laterLevelHp = Math.max(1, Math.floor(die / 2) + 1 + conMod);

  return firstLevelHp + ((safeLevel - 1) * laterLevelHp);
};

const getArmorName = (armorChoice) => BASIC_ARMOR_OPTIONS.find(option => option.key === armorChoice)?.name || null;
const getArmorHelper = (armorChoice) => BASIC_ARMOR_OPTIONS.find(option => option.key === armorChoice)?.helper || '';

const getArmorProficiencies = (cls) => {
  const profs = (cls?.armorProficiencies || []).map(item => String(item).toLowerCase());
  const hasAll = profs.some(item => item === 'all' || item.includes('all armour') || item.includes('all armor'));

  return {
    light: hasAll || profs.some(item => item.includes('light')),
    medium: hasAll || profs.some(item => item.includes('medium')),
    heavy: hasAll || profs.some(item => item.includes('heavy')),
    shields: profs.some(item => item.includes('shield')),
  };
};

const getAllowedArmorOptions = (cls) => {
  const profs = getArmorProficiencies(cls);
  return BASIC_ARMOR_OPTIONS.filter(option => option.category === 'none' || Boolean(profs[option.category]));
};

const getSuggestedArmorChoice = (cls) => {
  const profs = getArmorProficiencies(cls);
  if (profs.heavy) return 'ChainMail';
  if (profs.medium) return 'ScaleMail';
  if (profs.light) return 'Leather';
  return 'none';
};

const calculateBasicArmorClass = ({ characterClass, statBlock = {}, armorChoice = 'none', shieldEquipped = false } = {}) => {
  const dexMod = abilityModifier(statBlock.dexterity);
  const conMod = abilityModifier(statBlock.constitution);
  const wisMod = abilityModifier(statBlock.wisdom);
  const armor = armorChoice === 'none' ? null : getArmorName(armorChoice);
  const shield = shieldEquipped ? 'Shield' : null;
  let unarmoredAc = 10 + dexMod;
  let unarmoredHelper = `Base AC: 10 + Dex ${formatModifier(dexMod)}.`;

  if (!armor && characterClass === 'Barbarian') {
    unarmoredAc = 10 + dexMod + conMod;
    unarmoredHelper = `Unarmored Defense: 10 + Dex ${formatModifier(dexMod)} + Con ${formatModifier(conMod)}.`;
  }

  if (!armor && characterClass === 'Monk') {
    unarmoredAc = 10 + dexMod + wisMod;
    unarmoredHelper = `Unarmored Defense: 10 + Dex ${formatModifier(dexMod)} + Wis ${formatModifier(wisMod)}.`;
  }

  const value = calculateArmorAc({ armor, shield, dexMod, unarmoredAc });
  const loadout = `${armor || 'No armour'}${shieldEquipped ? ' + Shield' : ''}`;
  const helper = armor
    ? `${loadout}. ${getArmorHelper(armorChoice)}${shieldEquipped ? ' Shield adds +2 AC.' : ''}`
    : `${unarmoredHelper}${shieldEquipped ? ' Shield adds +2 AC.' : ''}`;

  return { value, helper, loadout };
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
  const [armorChoice, setArmorChoice] = useState('ChainMail');
  const [shieldEquipped, setShieldEquipped] = useState(true);
  const [catchUpSelections, setCatchUpSelections] = useState({});
  const [loading, setLoading] = useState(false);

  const cls = CLASSES[characterClass];
  const raceData = RACES[race];
  const bgData = BACKGROUNDS[background];
  const safeLevel = clampLevel(level);
  const startingChoicePlan = useMemo(() => getStartingLevelChoicePlan(characterClass, safeLevel), [characterClass, safeLevel]);
  const armorProficiencies = useMemo(() => getArmorProficiencies(cls), [cls]);
  const allowedArmorOptions = useMemo(() => getAllowedArmorOptions(cls), [cls]);
  const selectedArmorName = armorChoice === 'none' ? null : getArmorName(armorChoice);

  const statBlock = useMemo(() => {
    return STAT_ARRAYS[cls?.primaryAbility] || STAT_ARRAYS.strength;
  }, [cls]);

  // Reset skills when class/background changes
  useEffect(() => { setSelectedSkills([]); }, [characterClass, background]);

  // Keep catch-up selections in step with class/level changes.
  useEffect(() => {
    const validIds = new Set((startingChoicePlan.choices || []).map(choice => choice.id));
    setCatchUpSelections(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => validIds.has(id))));
  }, [startingChoicePlan]);

  // Keep Basic Build defence choices legal and sensible when class changes.
  useEffect(() => {
    const nextArmor = getSuggestedArmorChoice(cls);
    const nextProfs = getArmorProficiencies(cls);
    setArmorChoice(nextArmor);
    setShieldEquipped(Boolean(nextProfs.shields));
  }, [cls]);

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
    armorChoice,
    shieldEquipped,
  }), [characterClass, statBlock, armorChoice, shieldEquipped]);
  const proficiencyBonus = 2 + Math.floor((safeLevel - 1) / 4);
  const spellDefaults = useMemo(() => buildBasicSpellDefaults({ characterClass, level: safeLevel, statBlock }), [characterClass, safeLevel, statBlock]);
  const starterSpellNames = useMemo(() => [
    ...(spellDefaults.cantrips_known || []),
    ...(spellDefaults.spells_known || []),
    ...(spellDefaults.spells_prepared || []),
  ].map(spell => spell.name).filter(Boolean), [spellDefaults]);
  const classFeatures = useMemo(() => buildClassFeaturesThroughLevel(cls, characterClass, safeLevel), [cls, characterClass, safeLevel]);
  const startingEquipment = useMemo(() => Array.from(new Set([
    ...(cls?.startingEquipment || []),
    ...(bgData?.equipment || []),
    selectedArmorName,
    shieldEquipped ? 'Shield' : null,
  ].filter(Boolean))), [cls, bgData, selectedArmorName, shieldEquipped]);

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
      const levelProgression = buildCatchUpLevelProgression(startingChoicePlan, catchUpSelections);

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
        starting_equipment: startingEquipment,
        ...spellDefaults
      };
      const res = await apiClient.post(`/characters`, payload);
      const createdId = res.data?.character_id || res.data?.character?.id;
      if (createdId && Object.keys(levelProgression).length > 0) {
        try {
          await apiClient.patch(`/characters/${createdId}`, { level_progression: levelProgression });
        } catch (progressionError) {
          toast.warning('Character created, but catch-up choices could not be saved yet.');
        }
      }
      toast.success('Basic character created!');
      navigate(`/characters/${createdId}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character');
    } finally {
      setLoading(false);
    }
  };

  const autoFilledCount = raceLanguageChoiceCount + backgroundLanguageCount;
  const featurePreview = classFeatures.map(feature => feature.name).slice(0, 6).join(', ');
  const extraFeatureCount = Math.max(0, classFeatures.length - 6);
  const cannotSubmit = loading || selectedSkills.length !== skillCount;

  return (
    <main style={{
      padding: '20px',
      color: velvet.text,
      background: 'radial-gradient(circle at top left, rgba(224,177,92,0.14), transparent 32%), radial-gradient(circle at top right, rgba(164,90,50,0.18), transparent 34%), linear-gradient(180deg, #120C08, #21150E)',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/characters/new')}
          type="button"
          style={{
            background: 'rgba(46, 29, 19, 0.78)',
            border: '1px solid rgba(192,138,61,0.24)',
            color: velvet.muted,
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
            <h1 style={{ color: velvet.text, margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1, letterSpacing: -1.4 }}>
              Basic Build
            </h1>
            <p style={{ color: velvet.muted, margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, maxWidth: 760 }}>
              Pick the fun choices. ROOK fills in the starter sheet details: ability scores, hit points, armour class, proficiencies, equipment, traits, languages, starter spells, and higher-level catch-up prompts when needed.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            <AutoFillCard title="You choose" text="Name, edition, level, class, species, background, and defence loadout." />
            <AutoFillCard title="ROOK fills" text="Stats, HP, AC, gear, traits, starter language choices, class features, and starter magic where your class needs it." />
            <AutoFillCard title="Catch-up plan" text={safeLevel > 1 ? `${startingChoicePlan.requiredCount} required and ${startingChoicePlan.optionalCount} optional higher-level prompts.` : 'Level 1 starts use the normal creation choices.'} />
            {starterSpellNames.length > 0 && <AutoFillCard title="Starter magic" text={starterSpellNames.slice(0, 5).join(', ')} />}
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
            <h2 style={{ margin: '0 0 12px', color: velvet.text, fontSize: 18 }}>Core choices</h2>
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

            <BasicCatchUpChoicesPanel
              plan={startingChoicePlan}
              selections={catchUpSelections}
              onSelectionChange={setCatchUpSelections}
              velvet={velvet}
              pillStyle={pillStyle}
            />

            <div style={velvetPanelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
                <div>
                  <h3 style={{ margin: 0, color: velvet.text, fontSize: 15 }}>Defence choices</h3>
                  <p style={{ margin: '5px 0 0', color: velvet.muted, fontSize: 12, lineHeight: 1.4 }}>
                    Pick a simple armour and shield loadout. This updates AC and saved starting equipment.
                  </p>
                </div>
                <span style={pillStyle}>{armorPreview.loadout}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                <label style={labelStyle}>Armour
                  <select style={input} value={armorChoice} onChange={e => setArmorChoice(e.target.value)} data-testid="basic-armor-choice">
                    {allowedArmorOptions.map(option => <option key={option.key} value={option.key}>{option.name}</option>)}
                  </select>
                </label>

                <label style={labelStyle}>Shield
                  <button
                    type="button"
                    disabled={!armorProficiencies.shields}
                    onClick={() => setShieldEquipped(prev => !prev)}
                    data-testid="basic-shield-toggle"
                    style={{
                      ...input,
                      textAlign: 'left',
                      cursor: armorProficiencies.shields ? 'pointer' : 'not-allowed',
                      opacity: armorProficiencies.shields ? 1 : 0.55,
                      fontWeight: 900,
                      background: shieldEquipped
                        ? 'rgba(192, 138, 61, 0.24)'
                        : input.background,
                    }}
                  >
                    {shieldEquipped ? '✓ Shield equipped' : armorProficiencies.shields ? 'No shield' : 'No shield proficiency'}
                  </button>
                </label>
              </div>
            </div>
          </section>

          <aside style={{ ...panelStyle, padding: 16 }}>
            <h2 style={{ margin: 0, color: velvet.text, fontSize: 18 }}>Starter sheet preview</h2>
            <p style={{ margin: '6px 0 12px', color: velvet.muted, fontSize: 12, lineHeight: 1.45 }}>
              These details will be saved onto the character sheet.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
              <PreviewStat label="HP" value={maxHP} helper={`Level ${safeLevel} average HP`} />
              <PreviewStat label="AC" value={armorPreview.value} helper="From defence choices" />
              <PreviewStat label="Prof." value={`+${proficiencyBonus}`} helper="Proficiency bonus" />
              <PreviewStat label="Hit Die" value={`d${cls?.hitDie || 8}`} helper="Class hit die" />
            </div>

            {bgData && (
              <div style={{ display: 'grid', gap: 10 }}>
                <SummaryRow label="Armour choice" value={armorPreview.loadout} helper={armorPreview.helper} />
                <SummaryRow label="Background" value={bgData.name || background} helper={bgData.description} />
                <SummaryRow label="Background skills" value={(bgData.skillProficiencies || []).join(', ') || 'None'} />
                <SummaryRow label="Tools" value={(bgData.toolProficiencies || []).join(', ') || 'None'} />
                <SummaryRow
                  label="Languages"
                  value={finalLanguages.join(', ') || 'None'}
                  helper={autoFilledCount > 0 ? `${autoFilledCount} language choice${autoFilledCount === 1 ? '' : 's'} auto-filled.` : 'Fixed starting languages.'}
                />
                <SummaryRow
                  label="Catch-up prompts"
                  value={`${startingChoicePlan.requiredCount} required / ${startingChoicePlan.optionalCount} optional`}
                  helper={startingChoicePlan.summary}
                />
                <SummaryRow
                  label={`Class features to level ${safeLevel}`}
                  value={featurePreview || 'No listed class features'}
                  helper={extraFeatureCount > 0 ? `Plus ${extraFeatureCount} more saved to the sheet.` : 'Saved to the character sheet.'}
                />
                <SummaryRow label="Starting equipment" value={startingEquipment.join(', ') || 'None listed'} />
                <SummaryRow label="Primary ability" value={cls?.primaryAbility || 'Strength'} />
              </div>
            )}
          </aside>
        </div>

        <section style={{ ...panelStyle, padding: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <h2 style={{ margin: 0, color: velvet.text, fontSize: 18 }}>Class skills</h2>
              <p style={{ margin: '5px 0 0', color: velvet.muted, fontSize: 12 }}>
                Pick {skillCount} class skill{skillCount === 1 ? '' : 's'}. Background skills are already granted.
              </p>
            </div>
            <span style={pillStyle}>{selectedSkills.length}/{skillCount} picked</span>
          </div>

          {bgSkills.length > 0 && (
            <div style={{ fontSize: 12, color: velvet.softText, marginBottom: 10, padding: 10, border: '1px solid rgba(122,155,102,0.34)', borderRadius: 8, background: 'rgba(122,155,102,0.10)' }}>
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
                    background: fromBg ? 'rgba(122,155,102,0.12)' : sel ? 'rgba(192,138,61,0.24)' : velvet.card,
                    border: `1px solid ${fromBg ? 'rgba(122,155,102,0.4)' : sel ? 'rgba(224,177,92,0.72)' : 'rgba(192,138,61,0.18)'}`,
                    color: velvet.text,
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
            disabled={cannotSubmit}
            onClick={submit}
            data-testid="basic-submit"
            style={{
              padding: '13px 20px',
              borderRadius: 8,
              fontWeight: 900,
              background: cannotSubmit
                ? 'rgba(192,138,61,0.18)'
                : velvet.gold,
              border: cannotSubmit
                ? '1px solid rgba(192,138,61,0.24)'
                : '1px solid rgba(224,177,92,0.72)',
              color: cannotSubmit ? velvet.muted : velvet.appBackground,
              cursor: cannotSubmit ? 'not-allowed' : 'pointer',
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
              boxShadow: 'none',
            }}>
            {loading ? 'Creating...' : 'Create Character'}
          </button>
          <span style={{ color: velvet.muted, fontSize: 12 }}>
            You can edit the full sheet after creation.
          </span>
        </div>
      </div>
    </main>
  );
}

function AutoFillCard({ title, text }) {
  return (
    <div style={{ border: '1px solid rgba(192,138,61,0.22)', background: 'rgba(46,29,19,0.72)', borderRadius: 9, padding: 11 }}>
      <strong style={{ display: 'block', color: velvet.text, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 }}>{title}</strong>
      <span style={{ display: 'block', color: velvet.muted, fontSize: 12, lineHeight: 1.4, marginTop: 4 }}>{text}</span>
    </div>
  );
}

function PreviewStat({ label, value, helper }) {
  return (
    <div style={{ border: '1px solid rgba(224,177,92,0.24)', background: 'rgba(46,29,19,0.48)', borderRadius: 9, padding: 10 }}>
      <div style={{ color: velvet.muted, fontSize: 10, fontWeight: 900, letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: velvet.text, fontSize: 22, fontWeight: 900, marginTop: 2, lineHeight: 1 }}>{value}</div>
      {helper && <div style={{ color: velvet.muted, fontSize: 10, lineHeight: 1.3, marginTop: 4 }}>{helper}</div>}
    </div>
  );
}

function SummaryRow({ label, value, helper }) {
  return (
    <div style={{ borderTop: '1px solid rgba(192,138,61,0.18)', paddingTop: 10 }}>
      <div style={{ color: velvet.muted, fontSize: 10, fontWeight: 900, letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: velvet.text, fontSize: 13, fontWeight: 800, marginTop: 3 }}>{value}</div>
      {helper && <div style={{ color: velvet.muted, fontSize: 11, lineHeight: 1.4, marginTop: 3 }}>{helper}</div>}
    </div>
  );
}
