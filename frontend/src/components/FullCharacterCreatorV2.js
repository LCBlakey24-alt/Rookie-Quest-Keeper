import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, BookOpen, Check, ChevronLeft, ChevronRight, Dices, ScrollText, Shield, Sparkles, Swords, Wand2 } from 'lucide-react';

import apiClient from '@/lib/apiClient';
import { BACKGROUNDS, CLASSES, EDITIONS, RACES, getProficiencyBonus } from '@/data/characterRules5e';
import { CANTRIPS_KNOWN, SPELLCASTING_CLASSES, SPELLS_KNOWN, getSpellSlotsForCaster, getSpellsForClass } from '@/data/spellDatabase';
import './FullCharacterCreatorV2.css';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ABILITY_LABELS = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const STANDARD_ARRAY = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };
const QUICK_ARRAYS = {
  strength: { strength: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  dexterity: { dexterity: 15, constitution: 14, wisdom: 13, intelligence: 12, charisma: 10, strength: 8 },
  constitution: { constitution: 15, strength: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  intelligence: { intelligence: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, strength: 8 },
  wisdom: { wisdom: 15, constitution: 14, dexterity: 13, strength: 12, intelligence: 10, charisma: 8 },
  charisma: { charisma: 15, constitution: 14, dexterity: 13, wisdom: 12, intelligence: 10, strength: 8 },
};
const LEVEL_ONE_SUBCLASS_2014 = new Set(['Cleric', 'Sorcerer', 'Warlock']);
const EXTRA_LANGUAGES = ['Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];
const FEAT_OPTIONS = ['None', 'Alert', 'Crafter', 'Healer', 'Lucky', 'Magic Initiate', 'Savage Attacker', 'Skilled', 'Tavern Brawler', 'Tough'];
const SPELL_CREATE_CLASSES = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
const DRAFT_KEY = 'rqk.full_character_creator_v2';

const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
const clampScore = (value) => Math.max(3, Math.min(20, Number.parseInt(value, 10) || 10));
const arrayFrom = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const choiceLanguage = (value) => /choice|additional/i.test(String(value || ''));
const toSpellPayload = (spell) => ({ name: spell.name, level: Number(spell.level || 0), school: spell.school || '', description: spell.description || '' });

function initialDraft() {
  return {
    step: 0,
    name: '',
    edition: '2014',
    race: 'Human',
    subrace: '',
    characterClass: 'Fighter',
    subclass: '',
    background: 'Soldier',
    alignment: 'Neutral',
    scores: STANDARD_ARRAY,
    floatingAsi: {},
    languageChoices: [],
    selectedSkills: [],
    extraFeat: 'None',
    selectedCantrips: [],
    selectedSpells: [],
    equipmentMode: 'recommended',
    customEquipment: '',
    personalityTrait: '',
    ideal: '',
    bond: '',
    flaw: '',
    backstory: '',
  };
}

function loadDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return initialDraft();
    return { ...initialDraft(), ...parsed, scores: { ...STANDARD_ARRAY, ...(parsed.scores || {}) } };
  } catch {
    return initialDraft();
  }
}

function getId(record) {
  return record?.id || record?._id || record?.character_id || record?.characterId || '';
}

function spellRequirements(characterClass, scores) {
  if (!SPELL_CREATE_CLASSES.has(characterClass)) return { cantrips: 0, spells: 0, type: 'none' };
  if (characterClass === 'Wizard') return { cantrips: 3, spells: 6, type: 'spellbook' };
  if (characterClass === 'Cleric') return { cantrips: 3, spells: Math.max(1, mod(scores.wisdom) + 1), type: 'prepared' };
  if (characterClass === 'Druid') return { cantrips: 2, spells: Math.max(1, mod(scores.wisdom) + 1), type: 'prepared' };
  return { cantrips: CANTRIPS_KNOWN[characterClass]?.[1] || 0, spells: SPELLS_KNOWN[characterClass]?.[1] || 0, type: 'known' };
}

function abilityBonusFor({ edition, raceData, subrace, backgroundData, floatingAsi }) {
  const bonus = ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: 0 }), {});
  if (edition === '2024') {
    Object.entries(backgroundData?.asi2024 || {}).forEach(([ability, value]) => {
      if (bonus[ability] !== undefined) bonus[ability] += Number(value) || 0;
    });
    return bonus;
  }

  const asi = raceData?.asi2014 || {};
  if (asi.all) ABILITIES.forEach((ability) => { bonus[ability] += Number(asi.all) || 0; });
  Object.entries(asi).forEach(([ability, value]) => {
    if (ability !== 'choice' && bonus[ability] !== undefined) bonus[ability] += Number(value) || 0;
  });
  Object.entries(raceData?.subraces?.[subrace]?.asi2014 || {}).forEach(([ability, value]) => {
    if (bonus[ability] !== undefined) bonus[ability] += Number(value) || 0;
  });
  Object.entries(floatingAsi || {}).forEach(([ability, value]) => {
    if (bonus[ability] !== undefined) bonus[ability] += Number(value) || 0;
  });
  return bonus;
}

function deriveTraits(raceData, subrace) {
  return [...arrayFrom(raceData?.traits), ...arrayFrom(raceData?.subraces?.[subrace]?.traits)].map((trait) => ({ name: String(trait).split(' (')[0], description: String(trait) }));
}

function deriveFeatures(classData, characterClass) {
  return arrayFrom(classData?.features?.[1]).filter(name => name && name !== '---').map(name => ({ name, description: `${characterClass} feature gained at level 1.` }));
}

function classSkillOptions(classData) {
  if (!classData) return [];
  if (classData.skillChoices === 'any') return ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
  return arrayFrom(classData.skillChoices);
}

export default function FullCharacterCreatorV2({ editMode = false }) {
  const navigate = useNavigate();
  const { characterId } = useParams();
  const savedDraft = useMemo(loadDraft, []);
  const [draft, setDraft] = useState(savedDraft);
  const [loading, setLoading] = useState(Boolean(editMode && characterId));
  const [saving, setSaving] = useState(false);
  const [spellSearch, setSpellSearch] = useState('');

  const raceData = RACES[draft.race] || {};
  const classData = CLASSES[draft.characterClass] || {};
  const backgroundData = BACKGROUNDS[draft.background] || {};
  const availableSubraces = Object.keys(raceData.subraces || {});
  const subclassAllowed = draft.edition === '2014' && LEVEL_ONE_SUBCLASS_2014.has(draft.characterClass);
  const bonus = abilityBonusFor({ edition: draft.edition, raceData, subrace: draft.subrace, backgroundData, floatingAsi: draft.floatingAsi });
  const finalScores = ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: clampScore(draft.scores[ability]) + (bonus[ability] || 0) }), {});
  const proficiencyBonus = getProficiencyBonus(1);
  const hp = Math.max(1, (classData.hitDie || 8) + mod(finalScores.constitution));
  const ac = 10 + mod(finalScores.dexterity);
  const backgroundSkills = arrayFrom(backgroundData.skillProficiencies);
  const skillOptions = classSkillOptions(classData).filter(skill => !backgroundSkills.includes(skill));
  const skillTarget = Number(classData.skillCount || 0);
  const allSkills = Array.from(new Set([...backgroundSkills, ...draft.selectedSkills]));
  const floatingBudget = draft.edition === '2014' ? Number(raceData.asi2014?.choice || 0) : 0;
  const floatingSpent = Object.values(draft.floatingAsi || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const languageBudget = arrayFrom(raceData.languages).filter(choiceLanguage).length + (Number(backgroundData.languages || 0) || 0);
  const baseLanguages = arrayFrom(raceData.languages).filter(language => !choiceLanguage(language));
  const spellReq = spellRequirements(draft.characterClass, finalScores);
  const spellLevels = getSpellsForClass(draft.characterClass) || {};
  const cantripPool = arrayFrom(spellLevels[0]);
  const levelOnePool = arrayFrom(spellLevels[1]);
  const visibleCantrips = cantripPool.filter(spell => !spellSearch || spell.name.toLowerCase().includes(spellSearch.toLowerCase()));
  const visibleSpells = levelOnePool.filter(spell => !spellSearch || spell.name.toLowerCase().includes(spellSearch.toLowerCase()));
  const showSpells = spellReq.cantrips > 0 || spellReq.spells > 0;
  const steps = [
    { id: 'basics', label: 'Basics', icon: Shield },
    { id: 'abilities', label: 'Abilities', icon: Dices },
    { id: 'skills', label: 'Skills', icon: Swords },
    { id: 'feats', label: 'Feats', icon: Sparkles },
    ...(showSpells ? [{ id: 'spells', label: 'Spells', icon: Wand2 }] : []),
    { id: 'equipment', label: 'Equipment', icon: Backpack },
    { id: 'review', label: 'Review', icon: Check },
  ];
  const step = Math.min(draft.step || 0, steps.length - 1);
  const stepId = steps[step].id;

  useEffect(() => {
    if (editMode) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, step }));
  }, [draft, step, editMode]);

  useEffect(() => {
    if (!editMode || !characterId) return;
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/characters/${characterId}`);
        if (cancelled) return;
        setDraft(prev => ({
          ...prev,
          name: data.name || '',
          edition: data.edition || (String(data.ruleset_id || '').includes('2024') ? '2024' : '2014'),
          race: data.race || 'Human',
          subrace: data.subrace || '',
          characterClass: data.character_class || 'Fighter',
          subclass: data.subclass || '',
          background: data.background || 'Soldier',
          alignment: data.alignment || 'Neutral',
          scores: ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: Number(data[ability] || 10) }), {}),
          selectedSkills: arrayFrom(data.skill_proficiencies),
          languageChoices: arrayFrom(data.languages).filter(language => !arrayFrom(RACES[data.race]?.languages).includes(language)),
          selectedCantrips: arrayFrom(data.cantrips_known).map(spell => spell.name || spell),
          selectedSpells: [...arrayFrom(data.spells_known), ...arrayFrom(data.spells_prepared)].map(spell => spell.name || spell),
          extraFeat: arrayFrom(data.feats)[0]?.name || 'None',
          customEquipment: arrayFrom(data.starting_equipment).join('\n'),
          equipmentMode: 'custom',
          personalityTrait: data.personality_trait || '',
          ideal: data.ideal || '',
          bond: data.bond || '',
          flaw: data.flaw || '',
          backstory: data.backstory || '',
        }));
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Could not load character for editing');
        navigate('/player');
      } finally {
        setLoading(false);
      }
    }
    loadCharacter();
    return () => { cancelled = true; };
  }, [editMode, characterId, navigate]);

  const update = (patch) => setDraft(prev => ({ ...prev, ...patch }));
  const updateScore = (ability, value) => update({ scores: { ...draft.scores, [ability]: clampScore(value) } });
  const next = () => {
    const problem = validationMessage();
    if (problem) { toast.error(problem); return; }
    update({ step: Math.min(steps.length - 1, step + 1) });
  };
  const prev = () => update({ step: Math.max(0, step - 1) });

  function validationMessage() {
    if (stepId === 'basics') {
      if (!draft.name.trim()) return 'Give your character a name.';
      if (!draft.race || !draft.characterClass || !draft.background) return 'Choose a species, class, and background.';
      if (availableSubraces.length && !draft.subrace) return 'Choose a subrace/species option.';
      if (subclassAllowed && classData.subclasses?.length && !draft.subclass) return 'Choose your level 1 subclass/patron/domain.';
    }
    if (stepId === 'abilities') {
      if (floatingBudget && floatingSpent !== floatingBudget) return `Assign ${floatingBudget} floating ability bonus${floatingBudget === 1 ? '' : 'es'}.`;
    }
    if (stepId === 'skills') {
      if (draft.selectedSkills.length !== skillTarget) return `Choose ${skillTarget} class skill${skillTarget === 1 ? '' : 's'}.`;
    }
    if (stepId === 'feats') {
      if (draft.edition === '2024' && !chosenFeatName()) return 'Choose or confirm your origin feat.';
    }
    if (stepId === 'spells') {
      if (draft.selectedCantrips.length !== spellReq.cantrips) return `Choose ${spellReq.cantrips} cantrip${spellReq.cantrips === 1 ? '' : 's'}.`;
      if (draft.selectedSpells.length !== spellReq.spells) return `Choose ${spellReq.spells} level 1 spell${spellReq.spells === 1 ? '' : 's'}.`;
    }
    return '';
  }

  function chosenFeatName() {
    if (draft.edition === '2024') return draft.extraFeat !== 'None' ? draft.extraFeat : backgroundData.originFeat2024 || '';
    return draft.extraFeat !== 'None' ? draft.extraFeat : '';
  }

  function toggleSkill(skill) {
    update({
      selectedSkills: draft.selectedSkills.includes(skill)
        ? draft.selectedSkills.filter(item => item !== skill)
        : draft.selectedSkills.length >= skillTarget ? draft.selectedSkills : [...draft.selectedSkills, skill]
    });
  }

  function toggleFloating(ability) {
    const current = Number(draft.floatingAsi[ability] || 0);
    const nextMap = { ...draft.floatingAsi };
    if (current) delete nextMap[ability];
    else if (floatingSpent < floatingBudget) nextMap[ability] = 1;
    update({ floatingAsi: nextMap });
  }

  function toggleLanguage(language) {
    const selected = draft.languageChoices.includes(language);
    update({ languageChoices: selected ? draft.languageChoices.filter(item => item !== language) : draft.languageChoices.length >= languageBudget ? draft.languageChoices : [...draft.languageChoices, language] });
  }

  function toggleSpell(name, field, max) {
    const current = draft[field] || [];
    update({ [field]: current.includes(name) ? current.filter(item => item !== name) : current.length >= max ? current : [...current, name] });
  }

  function startingEquipment() {
    if (draft.equipmentMode === 'gold') return ['Starting gold instead of gear — confirm shopping with GM'];
    if (draft.equipmentMode === 'custom') return draft.customEquipment.split('\n').map(item => item.trim()).filter(Boolean);
    return Array.from(new Set([...arrayFrom(classData.startingEquipment), ...arrayFrom(backgroundData.equipment)]));
  }

  function spellFields() {
    const classInfo = SPELLCASTING_CLASSES[draft.characterClass];
    if (!classInfo || !showSpells) return {};
    const ability = classInfo.ability;
    const spellMod = mod(finalScores[ability]);
    const slots = getSpellSlotsForCaster(classInfo, 1);
    const cantrips = draft.selectedCantrips.map(name => toSpellPayload(cantripPool.find(spell => spell.name === name) || { name, level: 0 }));
    const spells = draft.selectedSpells.map(name => toSpellPayload(levelOnePool.find(spell => spell.name === name) || { name, level: 1 }));
    return {
      spellcasting_ability: ability,
      spell_save_dc: 8 + proficiencyBonus + spellMod,
      spell_attack_bonus: proficiencyBonus + spellMod,
      spell_slots: slots,
      spell_slots_remaining: slots,
      cantrips_known: cantrips,
      ...(spellReq.type === 'prepared' ? { spells_prepared: spells } : { spells_known: spells }),
    };
  }

  async function saveCharacter() {
    const problem = validationMessage();
    if (problem) { toast.error(problem); return; }

    const featName = chosenFeatName();
    const languages = Array.from(new Set([...baseLanguages, ...draft.languageChoices]));
    const payload = {
      name: draft.name.trim(),
      race: draft.race,
      subrace: draft.subrace || '',
      character_class: draft.characterClass,
      subclass: subclassAllowed ? draft.subclass || '' : '',
      background: draft.background,
      edition: draft.edition,
      rules_edition: draft.edition,
      ruleset_id: draft.edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
      alignment: draft.alignment,
      level: 1,
      strength: finalScores.strength,
      dexterity: finalScores.dexterity,
      constitution: finalScores.constitution,
      intelligence: finalScores.intelligence,
      wisdom: finalScores.wisdom,
      charisma: finalScores.charisma,
      max_hit_points: hp,
      current_hit_points: hp,
      armor_class: ac,
      speed: raceData.subraces?.[draft.subrace]?.speed || raceData.speed || 30,
      proficiency_bonus: proficiencyBonus,
      skill_proficiencies: allSkills,
      saving_throw_proficiencies: arrayFrom(classData.savingThrows),
      armor_proficiencies: arrayFrom(classData.armorProficiencies),
      weapon_proficiencies: arrayFrom(classData.weaponProficiencies),
      tool_proficiencies: arrayFrom(backgroundData.toolProficiencies),
      languages,
      racial_traits: deriveTraits(raceData, draft.subrace),
      class_features: deriveFeatures(classData, draft.characterClass),
      feats: featName ? [{ name: featName, source: draft.edition === '2024' ? 'origin' : 'optional' }] : [],
      equipment_choice: draft.equipmentMode,
      starting_equipment: startingEquipment(),
      personality_trait: draft.personalityTrait,
      ideal: draft.ideal,
      bond: draft.bond,
      flaw: draft.flaw,
      backstory: draft.backstory,
      ...spellFields(),
    };

    try {
      setSaving(true);
      if (editMode && characterId) {
        await apiClient.patch(`/characters/${characterId}`, payload);
        toast.success('Character updated');
        navigate(`/characters/${characterId}`);
      } else {
        const response = await apiClient.post('/characters', payload);
        localStorage.removeItem(DRAFT_KEY);
        const id = response.data?.character_id || getId(response.data?.character);
        toast.success('Character created');
        navigate(id ? `/characters/${id}` : '/player');
      }
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save character');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="full-creator-page"><div className="full-creator-loading">Loading character…</div></main>;
  }

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button type="button" onClick={() => navigate('/player')}><ArrowLeft size={17} /> Player</button>
        <div>
          <p>Player character builder</p>
          <h1>{editMode ? 'Edit Character' : 'Full Character Creation'}</h1>
          <span>Build a saved sheet with abilities, skills, feats, spells, and equipment.</span>
        </div>
        <button type="button" onClick={() => navigate('/home')}>Dashboard</button>
      </header>

      <nav className="full-creator-steps" aria-label="Character creation steps">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={index === step ? 'active' : ''} onClick={() => update({ step: index })}><Icon size={16} /><span>{item.label}</span></button>;
        })}
      </nav>

      <section className="full-creator-layout">
        <article className="full-creator-panel">
          {stepId === 'basics' && renderBasics()}
          {stepId === 'abilities' && renderAbilities()}
          {stepId === 'skills' && renderSkills()}
          {stepId === 'feats' && renderFeats()}
          {stepId === 'spells' && renderSpells()}
          {stepId === 'equipment' && renderEquipment()}
          {stepId === 'review' && renderReview()}
        </article>

        <aside className="full-creator-preview">
          <p>Live sheet preview</p>
          <h2>{draft.name || 'Unnamed Character'}</h2>
          <span>{draft.race}{draft.subrace ? ` (${draft.subrace})` : ''} • {draft.characterClass} • Lv 1</span>
          <div className="full-creator-mini-grid"><strong>{hp}</strong><span>HP</span><strong>{ac}</strong><span>AC</span><strong>{fmt(mod(finalScores.dexterity))}</strong><span>Init</span></div>
          <div className="full-creator-score-grid">{ABILITIES.map(ability => <div key={ability}><span>{ABILITY_LABELS[ability]}</span><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></div>)}</div>
          <small>Skills: {allSkills.length ? allSkills.join(', ') : 'choose skills'}</small>
          {showSpells && <small>Spells: {draft.selectedCantrips.length}/{spellReq.cantrips} cantrips, {draft.selectedSpells.length}/{spellReq.spells} spells</small>}
        </aside>
      </section>

      <footer className="full-creator-footer">
        <button type="button" onClick={prev} disabled={step === 0}><ChevronLeft size={16} /> Previous</button>
        {step < steps.length - 1 ? <button type="button" onClick={next}>Next <ChevronRight size={16} /></button> : <button type="button" onClick={saveCharacter} disabled={saving}><Check size={16} /> {saving ? 'Saving…' : editMode ? 'Save Changes' : 'Create Character'}</button>}
      </footer>
    </main>
  );

  function renderSectionTitle(icon, title, subtitle) {
    const Icon = icon;
    return <div className="full-creator-section-title"><Icon size={21} /><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
  }

  function renderBasics() {
    return <>
      {renderSectionTitle(Shield, 'Core choices', 'Name, rules edition, species, class, background, and level-one subclass choices.')}
      <div className="full-creator-form-grid">
        <label><span>Name</span><input value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="Javen Crow" /></label>
        <label><span>Edition</span><select value={draft.edition} onChange={e => update({ edition: e.target.value })}>{Object.entries(EDITIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
        <label><span>Species / Race</span><select value={draft.race} onChange={e => update({ race: e.target.value, subrace: '', floatingAsi: {}, languageChoices: [] })}>{Object.keys(RACES).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        {availableSubraces.length > 0 && <label><span>Subrace</span><select value={draft.subrace} onChange={e => update({ subrace: e.target.value })}><option value="">Choose…</option>{availableSubraces.map(name => <option key={name} value={name}>{name}</option>)}</select></label>}
        <label><span>Class</span><select value={draft.characterClass} onChange={e => update({ characterClass: e.target.value, subclass: '', selectedSkills: [], selectedCantrips: [], selectedSpells: [] })}>{Object.keys(CLASSES).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        {subclassAllowed && <label><span>Level 1 subclass</span><select value={draft.subclass} onChange={e => update({ subclass: e.target.value })}><option value="">Choose…</option>{arrayFrom(classData.subclasses).map(name => <option key={name} value={name}>{name}</option>)}</select></label>}
        <label><span>Background</span><select value={draft.background} onChange={e => update({ background: e.target.value, languageChoices: [], extraFeat: 'None' })}>{Object.keys(BACKGROUNDS).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        <label><span>Alignment</span><select value={draft.alignment} onChange={e => update({ alignment: e.target.value })}>{['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'].map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
      {languageBudget > 0 && <ChoiceBlock title={`Language choices ${draft.languageChoices.length}/${languageBudget}`}>{EXTRA_LANGUAGES.map(language => <Chip key={language} active={draft.languageChoices.includes(language)} onClick={() => toggleLanguage(language)}>{language}</Chip>)}</ChoiceBlock>}
      {!subclassAllowed && arrayFrom(classData.subclasses).length > 0 && <p className="full-creator-note">This class usually chooses a subclass later. The sheet will be ready for that at level-up.</p>}
    </>;
  }

  function renderAbilities() {
    return <>
      {renderSectionTitle(Dices, 'Ability scores', 'Use a quick array, then adjust each score. Final scores include species/background bonuses.')}
      <div className="full-creator-chip-row"><button type="button" onClick={() => update({ scores: STANDARD_ARRAY })}>Standard array</button>{ABILITIES.map(ability => <button key={ability} type="button" onClick={() => update({ scores: QUICK_ARRAYS[ability] })}>{ABILITY_LABELS[ability]} focus</button>)}</div>
      <div className="full-creator-score-editor">{ABILITIES.map(ability => <label key={ability}><span>{ABILITY_LABELS[ability]}</span><input type="number" min="3" max="20" value={draft.scores[ability]} onChange={e => updateScore(ability, e.target.value)} /><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></label>)}</div>
      {floatingBudget > 0 && <ChoiceBlock title={`Floating species bonus ${floatingSpent}/${floatingBudget}`}>{ABILITIES.map(ability => <Chip key={ability} active={Boolean(draft.floatingAsi[ability])} onClick={() => toggleFloating(ability)}>{ABILITY_LABELS[ability]} +1</Chip>)}</ChoiceBlock>}
    </>;
  }

  function renderSkills() {
    return <>
      {renderSectionTitle(Swords, 'Skill proficiencies', 'Background skills are automatic. Choose your class skill proficiencies here.')}
      <div className="full-creator-auto-box"><strong>Background skills</strong><span>{backgroundSkills.length ? backgroundSkills.join(', ') : 'None listed'}</span></div>
      <ChoiceBlock title={`Class skills ${draft.selectedSkills.length}/${skillTarget}`}>{skillOptions.map(skill => <Chip key={skill} active={draft.selectedSkills.includes(skill)} onClick={() => toggleSkill(skill)}>{skill}</Chip>)}</ChoiceBlock>
    </>;
  }

  function renderFeats() {
    return <>
      {renderSectionTitle(Sparkles, 'Feats and origin features', 'Confirm the 2024 origin feat, or add an optional level-one feat if your table uses one.')}
      {draft.edition === '2024' && <div className="full-creator-auto-box"><strong>Suggested origin feat</strong><span>{backgroundData.originFeat2024 || 'Choose one below'}</span></div>}
      <label className="full-creator-wide-label"><span>{draft.edition === '2024' ? 'Origin feat override' : 'Optional feat'}</span><select value={draft.extraFeat} onChange={e => update({ extraFeat: e.target.value })}>{FEAT_OPTIONS.map(name => <option key={name}>{name}</option>)}</select></label>
    </>;
  }

  function renderSpells() {
    return <>
      {renderSectionTitle(Wand2, 'Spell choices', `${draft.characterClass} level 1 spell setup. Choose exactly what the sheet should save.`)}
      <input className="full-creator-search" value={spellSearch} onChange={e => setSpellSearch(e.target.value)} placeholder="Search spell names…" />
      {spellReq.cantrips > 0 && <ChoiceBlock title={`Cantrips ${draft.selectedCantrips.length}/${spellReq.cantrips}`}>{visibleCantrips.map(spell => <SpellChip key={spell.name} spell={spell} active={draft.selectedCantrips.includes(spell.name)} onClick={() => toggleSpell(spell.name, 'selectedCantrips', spellReq.cantrips)} />)}</ChoiceBlock>}
      {spellReq.spells > 0 && <ChoiceBlock title={`Level 1 spells ${draft.selectedSpells.length}/${spellReq.spells}`}>{visibleSpells.map(spell => <SpellChip key={spell.name} spell={spell} active={draft.selectedSpells.includes(spell.name)} onClick={() => toggleSpell(spell.name, 'selectedSpells', spellReq.spells)} />)}</ChoiceBlock>}
    </>;
  }

  function renderEquipment() {
    const equipment = startingEquipment();
    return <>
      {renderSectionTitle(Backpack, 'Equipment choice', 'Pick recommended starting equipment, starting gold, or type your own kit.')}
      <div className="full-creator-equipment-modes">{['recommended', 'gold', 'custom'].map(mode => <button key={mode} type="button" className={draft.equipmentMode === mode ? 'active' : ''} onClick={() => update({ equipmentMode: mode })}>{mode === 'recommended' ? 'Recommended gear' : mode === 'gold' ? 'Starting gold' : 'Custom kit'}</button>)}</div>
      {draft.equipmentMode === 'custom' && <textarea value={draft.customEquipment} onChange={e => update({ customEquipment: e.target.value })} placeholder={'Longsword\nShield\nExplorer pack'} />}
      <div className="full-creator-equipment-list">{equipment.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
    </>;
  }

  function renderReview() {
    return <>
      {renderSectionTitle(BookOpen, 'Review and save', 'Add roleplay notes, check the sheet preview, then create the saved character.')}
      <div className="full-creator-form-grid">
        <label><span>Personality trait</span><input value={draft.personalityTrait} onChange={e => update({ personalityTrait: e.target.value })} /></label>
        <label><span>Ideal</span><input value={draft.ideal} onChange={e => update({ ideal: e.target.value })} /></label>
        <label><span>Bond</span><input value={draft.bond} onChange={e => update({ bond: e.target.value })} /></label>
        <label><span>Flaw</span><input value={draft.flaw} onChange={e => update({ flaw: e.target.value })} /></label>
      </div>
      <label className="full-creator-wide-label"><span>Backstory notes</span><textarea value={draft.backstory} onChange={e => update({ backstory: e.target.value })} placeholder="Where they came from, what they want, and why they adventure…" /></label>
      <div className="full-creator-review-grid"><ReviewItem label="HP" value={hp} /><ReviewItem label="AC" value={ac} /><ReviewItem label="Skills" value={allSkills.length} /><ReviewItem label="Feat" value={chosenFeatName() || 'None'} /><ReviewItem label="Equipment" value={draft.equipmentMode} /><ReviewItem label="Spells" value={showSpells ? `${draft.selectedCantrips.length + draft.selectedSpells.length}` : 'None'} /></div>
    </>;
  }
}

function ChoiceBlock({ title, children }) {
  return <section className="full-creator-choice-block"><h3>{title}</h3><div>{children}</div></section>;
}

function Chip({ active, onClick, children }) {
  return <button type="button" className={active ? 'active' : ''} onClick={onClick}>{children}</button>;
}

function SpellChip({ spell, active, onClick }) {
  return <button type="button" className={`full-creator-spell-chip ${active ? 'active' : ''}`} onClick={onClick}><strong>{spell.name}</strong><span>{spell.school || 'Spell'}</span><em>{spell.description || ''}</em></button>;
}

function ReviewItem({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
