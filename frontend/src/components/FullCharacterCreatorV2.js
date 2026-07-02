import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, BookOpen, Check, ChevronLeft, ChevronRight, Dices, Shield, Sparkles, Swords, Wand2 } from 'lucide-react';

import apiClient from '@/lib/apiClient';
import { BACKGROUNDS, CLASSES, EDITIONS, RACES, getProficiencyBonus } from '@/data/characterRules5e';
import { CANTRIPS_KNOWN, SPELLCASTING_CLASSES, SPELLS_KNOWN, getSpellSlotsForCaster, getSpellsForClass } from '@/data/spellDatabase';
import './FullCharacterCreatorV2.css';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const LABELS = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const STANDARD = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };
const LEVEL_ONE_SUBCLASS = new Set(['Cleric', 'Sorcerer', 'Warlock']);
const SPELL_CLASSES = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
const FEATS = ['None', 'Alert', 'Crafter', 'Healer', 'Lucky', 'Magic Initiate', 'Savage Attacker', 'Skilled', 'Tavern Brawler', 'Tough'];
const DRAFT_KEY = 'rqk.full_character_creator_v2.safe';

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const fmt = (value) => value >= 0 ? `+${value}` : `${value}`;
const clamp = (value) => Math.max(3, Math.min(20, Number.parseInt(value, 10) || 10));
const isChoiceLang = (value) => /choice|additional/i.test(String(value || ''));
const searchMatch = (spell, search) => {
  const needle = String(search || '').trim().toLowerCase();
  if (!needle) return true;
  if (needle.includes('damage') && spell.damage) return true;
  if ((needle.includes('heal') || needle.includes('healing')) && spell.healing) return true;
  return [spell.name, spell.school, spell.description, spell.damage, spell.damageType, spell.healing].filter(Boolean).join(' ').toLowerCase().includes(needle);
};

function defaultDraft() {
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
    scores: STANDARD,
    floatingAsi: {},
    selectedSkills: [],
    selectedCantrips: [],
    selectedSpells: [],
    extraFeat: 'None',
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
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return stored ? { ...defaultDraft(), ...stored, scores: { ...STANDARD, ...(stored.scores || {}) } } : defaultDraft();
  } catch {
    return defaultDraft();
  }
}

function classSkillOptions(classData) {
  if (!classData) return [];
  if (classData.skillChoices === 'any') return ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
  return arr(classData.skillChoices);
}

function spellRequirements(characterClass, scores) {
  if (!SPELL_CLASSES.has(characterClass)) return { cantrips: 0, spells: 0, type: 'none' };
  if (characterClass === 'Wizard') return { cantrips: 3, spells: 6, type: 'spellbook' };
  if (characterClass === 'Cleric') return { cantrips: 3, spells: Math.max(1, mod(scores.wisdom) + 1), type: 'prepared' };
  if (characterClass === 'Druid') return { cantrips: 2, spells: Math.max(1, mod(scores.wisdom) + 1), type: 'prepared' };
  return { cantrips: CANTRIPS_KNOWN[characterClass]?.[1] || 0, spells: SPELLS_KNOWN[characterClass]?.[1] || 0, type: 'known' };
}

function toSpellEntry(spell, fallbackLevel) {
  return {
    ...(spell || {}),
    name: spell?.name || String(spell || ''),
    level: Number(spell?.level ?? fallbackLevel),
    school: spell?.school || '',
    description: spell?.description || '',
  };
}

function abilityBonus({ edition, raceData, subrace, backgroundData, floatingAsi }) {
  const bonus = Object.fromEntries(ABILITIES.map((ability) => [ability, 0]));
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

export default function FullCharacterCreatorV2({ editMode = false }) {
  const navigate = useNavigate();
  const { characterId } = useParams();
  const [draft, setDraft] = useState(loadDraft);
  const [loading, setLoading] = useState(Boolean(editMode && characterId));
  const [saving, setSaving] = useState(false);
  const [spellSearch, setSpellSearch] = useState('');

  const raceData = RACES[draft.race] || {};
  const classData = CLASSES[draft.characterClass] || {};
  const backgroundData = BACKGROUNDS[draft.background] || {};
  const subclassAllowed = draft.edition === '2014' && LEVEL_ONE_SUBCLASS.has(draft.characterClass);
  const subraces = Object.keys(raceData.subraces || {});
  const bonus = abilityBonus({ edition: draft.edition, raceData, subrace: draft.subrace, backgroundData, floatingAsi: draft.floatingAsi });
  const finalScores = Object.fromEntries(ABILITIES.map((ability) => [ability, clamp(draft.scores[ability]) + (bonus[ability] || 0)]));
  const proficiencyBonus = getProficiencyBonus(1);
  const hp = Math.max(1, (classData.hitDie || 8) + mod(finalScores.constitution));
  const ac = 10 + mod(finalScores.dexterity);
  const backgroundSkills = arr(backgroundData.skillProficiencies);
  const skillOptions = classSkillOptions(classData).filter((skill) => !backgroundSkills.includes(skill));
  const skillTarget = Number(classData.skillCount || 0);
  const allSkills = Array.from(new Set([...backgroundSkills, ...draft.selectedSkills]));
  const floatingBudget = draft.edition === '2014' ? Number(raceData.asi2014?.choice || 0) : 0;
  const floatingSpent = Object.values(draft.floatingAsi || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const baseLanguages = arr(raceData.languages).filter((language) => !isChoiceLang(language));
  const spellReq = spellRequirements(draft.characterClass, finalScores);
  const spellLists = getSpellsForClass(draft.characterClass) || {};
  const cantripPool = arr(spellLists.cantrips || spellLists[0]);
  const levelOnePool = arr(spellLists[1]);
  const visibleCantrips = cantripPool.filter((spell) => searchMatch(spell, spellSearch));
  const visibleSpells = levelOnePool.filter((spell) => searchMatch(spell, spellSearch));
  const hasSpells = spellReq.cantrips > 0 || spellReq.spells > 0;
  const steps = [
    { id: 'basics', label: 'Basics', icon: Shield },
    { id: 'abilities', label: 'Abilities', icon: Dices },
    { id: 'skills', label: 'Skills', icon: Swords },
    { id: 'feats', label: 'Feats', icon: Sparkles },
    ...(hasSpells ? [{ id: 'spells', label: 'Spells', icon: Wand2 }] : []),
    { id: 'equipment', label: 'Equipment', icon: Backpack },
    { id: 'review', label: 'Review', icon: BookOpen },
  ];
  const step = Math.min(Number(draft.step || 0), steps.length - 1);
  const stepId = steps[step]?.id || 'basics';

  useEffect(() => {
    if (!editMode) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, step }));
  }, [draft, step, editMode]);

  useEffect(() => {
    if (!editMode || !characterId) return;
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/characters/${characterId}`);
        if (cancelled) return;
        setDraft((prev) => ({
          ...prev,
          name: data.name || '',
          edition: data.edition || (String(data.ruleset_id || '').includes('2024') ? '2024' : '2014'),
          race: data.race || 'Human',
          subrace: data.subrace || '',
          characterClass: data.character_class || 'Fighter',
          subclass: data.subclass || '',
          background: data.background || 'Soldier',
          alignment: data.alignment || 'Neutral',
          scores: Object.fromEntries(ABILITIES.map((ability) => [ability, Number(data[ability] || 10)])),
          selectedSkills: arr(data.skill_proficiencies),
          selectedCantrips: arr(data.cantrips_known || data.cantrips).map((spell) => spell.name || spell),
          selectedSpells: [...arr(data.spells_known || data.known_spells), ...arr(data.spellbook), ...arr(data.spells_prepared || data.prepared_spells)].map((spell) => spell.name || spell),
          customEquipment: arr(data.starting_equipment).join('\n'),
          equipmentMode: 'custom',
          personalityTrait: data.personality_trait || data.personality_traits || '',
          ideal: data.ideal || data.ideals || '',
          bond: data.bond || data.bonds || '',
          flaw: data.flaw || data.flaws || '',
          backstory: data.backstory || '',
        }));
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Could not load character for editing');
        navigate('/characters');
      } finally {
        setLoading(false);
      }
    }
    loadCharacter();
    return () => { cancelled = true; };
  }, [editMode, characterId, navigate]);

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const setStep = (nextStep) => update({ step: Math.max(0, Math.min(steps.length - 1, nextStep)) });
  const setScore = (ability, value) => update({ scores: { ...draft.scores, [ability]: clamp(value) } });
  const chosenFeat = draft.extraFeat !== 'None' ? draft.extraFeat : (draft.edition === '2024' ? backgroundData.originFeat2024 || '' : '');

  function validate() {
    if (stepId === 'basics') {
      if (!draft.name.trim()) return 'Give your character a name.';
      if (!draft.race || !draft.characterClass || !draft.background) return 'Choose species, class and background.';
      if (subraces.length && !draft.subrace) return 'Choose a subrace/species option.';
      if (subclassAllowed && arr(classData.subclasses).length && !draft.subclass) return 'Choose your level 1 subclass/patron/domain.';
    }
    if (stepId === 'abilities' && floatingBudget && floatingSpent !== floatingBudget) return `Assign ${floatingBudget} floating ability bonus${floatingBudget === 1 ? '' : 'es'}.`;
    if (stepId === 'skills' && draft.selectedSkills.length !== skillTarget) return `Choose ${skillTarget} class skill${skillTarget === 1 ? '' : 's'}.`;
    if (stepId === 'spells') {
      if (draft.selectedCantrips.length !== spellReq.cantrips) return `Choose ${spellReq.cantrips} cantrip${spellReq.cantrips === 1 ? '' : 's'}.`;
      if (draft.selectedSpells.length !== spellReq.spells) return `Choose ${spellReq.spells} level 1 spell${spellReq.spells === 1 ? '' : 's'}.`;
    }
    return '';
  }

  function toggleList(field, value, max = Infinity) {
    const current = arr(draft[field]);
    update({ [field]: current.includes(value) ? current.filter((item) => item !== value) : current.length >= max ? current : [...current, value] });
  }

  function startingEquipment() {
    if (draft.equipmentMode === 'gold') return ['Starting gold instead of gear — confirm shopping with GM'];
    if (draft.equipmentMode === 'custom') return draft.customEquipment.split('\n').map((item) => item.trim()).filter(Boolean);
    return Array.from(new Set([...arr(classData.startingEquipment), ...arr(backgroundData.equipment)]));
  }

  function spellFields() {
    const classInfo = SPELLCASTING_CLASSES[draft.characterClass];
    if (!classInfo || !hasSpells) return {};
    const ability = classInfo.ability;
    const abilityMod = mod(finalScores[ability]);
    const slots = getSpellSlotsForCaster(classInfo, 1);
    const cantrips = draft.selectedCantrips.map((name) => toSpellEntry(cantripPool.find((spell) => spell.name === name) || { name }, 0));
    const spells = draft.selectedSpells.map((name) => toSpellEntry(levelOnePool.find((spell) => spell.name === name) || { name }, 1));
    const preparedLimit = Math.max(1, abilityMod + 1);
    return {
      spellcasting_ability: ability,
      spell_save_dc: 8 + proficiencyBonus + abilityMod,
      spell_attack_bonus: proficiencyBonus + abilityMod,
      spell_slots: slots,
      spell_slots_remaining: slots,
      cantrips_known: cantrips,
      ...(spellReq.type === 'spellbook'
        ? { spellbook: spells, spells_prepared: spells.slice(0, preparedLimit) }
        : spellReq.type === 'prepared'
          ? { spells_known: spells, spells_prepared: spells }
          : { spells_known: spells }),
    };
  }

  async function saveCharacter() {
    const problem = validate();
    if (problem) { toast.error(problem); return; }
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
      saving_throw_proficiencies: arr(classData.savingThrows),
      armor_proficiencies: arr(classData.armorProficiencies),
      weapon_proficiencies: arr(classData.weaponProficiencies),
      tool_proficiencies: arr(backgroundData.toolProficiencies),
      languages: baseLanguages,
      racial_traits: [...arr(raceData.traits), ...arr(raceData.subraces?.[draft.subrace]?.traits)].map((trait) => ({ name: String(trait).split(' (')[0], description: String(trait) })),
      class_features: arr(classData.features?.[1]).filter((name) => name && name !== '---').map((name) => ({ name, description: `${draft.characterClass} feature gained at level 1.` })),
      feats: chosenFeat ? [{ name: chosenFeat, source: draft.edition === '2024' ? 'origin' : 'optional' }] : [],
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
        const id = response.data?.character_id || response.data?.character?.id || response.data?.id;
        toast.success('Character created');
        navigate(id ? `/characters/${id}` : '/characters');
      }
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save character');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="full-creator-page"><div className="full-creator-loading">Loading character…</div></main>;

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button type="button" onClick={() => navigate('/characters')}><ArrowLeft size={17} /> Characters</button>
        <div>
          <p>Player character builder</p>
          <h1>{editMode ? 'Edit Character' : 'Full Character Creation'}</h1>
          <span>Safe creator flow for abilities, skills, feats, spells and equipment.</span>
        </div>
        <button type="button" onClick={() => navigate('/home')}>Dashboard</button>
      </header>

      <nav className="full-creator-steps" aria-label="Character creation steps">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={index === step ? 'active' : ''} onClick={() => setStep(index)}><Icon size={16} /><span>{item.label}</span></button>;
        })}
      </nav>

      <section className="full-creator-layout">
        <article className="full-creator-panel">
          {stepId === 'basics' && <Basics draft={draft} update={update} subraces={subraces} classData={classData} subclassAllowed={subclassAllowed} />}
          {stepId === 'abilities' && <Abilities draft={draft} update={update} setScore={setScore} finalScores={finalScores} floatingBudget={floatingBudget} floatingSpent={floatingSpent} toggleFloating={(ability) => {
            const next = { ...draft.floatingAsi };
            if (next[ability]) delete next[ability];
            else if (floatingSpent < floatingBudget) next[ability] = 1;
            update({ floatingAsi: next });
          }} />}
          {stepId === 'skills' && <Skills backgroundSkills={backgroundSkills} skillOptions={skillOptions} selected={draft.selectedSkills} target={skillTarget} toggle={(skill) => toggleList('selectedSkills', skill, skillTarget)} />}
          {stepId === 'feats' && <Feats draft={draft} update={update} originFeat={backgroundData.originFeat2024} />}
          {stepId === 'spells' && <Spells spellSearch={spellSearch} setSpellSearch={setSpellSearch} spellReq={spellReq} visibleCantrips={visibleCantrips} visibleSpells={visibleSpells} selectedCantrips={draft.selectedCantrips} selectedSpells={draft.selectedSpells} toggleCantrip={(name) => toggleList('selectedCantrips', name, spellReq.cantrips)} toggleSpell={(name) => toggleList('selectedSpells', name, spellReq.spells)} />}
          {stepId === 'equipment' && <Equipment draft={draft} update={update} equipment={startingEquipment()} />}
          {stepId === 'review' && <Review draft={draft} update={update} hp={hp} ac={ac} skills={allSkills} feat={chosenFeat} spellCount={draft.selectedCantrips.length + draft.selectedSpells.length} hasSpells={hasSpells} />}
        </article>

        <aside className="full-creator-preview">
          <p>Live sheet preview</p>
          <h2>{draft.name || 'Unnamed Character'}</h2>
          <span>{draft.race}{draft.subrace ? ` (${draft.subrace})` : ''} • {draft.characterClass} • Lv 1</span>
          <div className="full-creator-mini-grid"><strong>{hp}</strong><span>HP</span><strong>{ac}</strong><span>AC</span><strong>{fmt(mod(finalScores.dexterity))}</strong><span>Init</span></div>
          <div className="full-creator-score-grid">{ABILITIES.map((ability) => <div key={ability}><span>{LABELS[ability]}</span><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></div>)}</div>
          <small>Skills: {allSkills.length ? allSkills.join(', ') : 'choose skills'}</small>
          {hasSpells && <small>Spells: {draft.selectedCantrips.length}/{spellReq.cantrips} cantrips, {draft.selectedSpells.length}/{spellReq.spells} spells</small>}
        </aside>
      </section>

      <footer className="full-creator-footer">
        <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}><ChevronLeft size={16} /> Previous</button>
        {step < steps.length - 1
          ? <button type="button" onClick={() => { const problem = validate(); if (problem) toast.error(problem); else setStep(step + 1); }}>Next <ChevronRight size={16} /></button>
          : <button type="button" onClick={saveCharacter} disabled={saving}><Check size={16} /> {saving ? 'Saving…' : editMode ? 'Save Changes' : 'Create Character'}</button>}
      </footer>
    </main>
  );
}

function Title({ icon: Icon, title, text }) {
  return <div className="full-creator-section-title"><Icon size={21} /><div><h2>{title}</h2><p>{text}</p></div></div>;
}

function Chip({ active, onClick, children }) {
  return <button type="button" className={active ? 'active' : ''} onClick={onClick}>{children}</button>;
}

function Choice({ title, children }) {
  return <section className="full-creator-choice-block"><h3>{title}</h3><div>{children}</div></section>;
}

function Basics({ draft, update, subraces, classData, subclassAllowed }) {
  return <>
    <Title icon={Shield} title="Core choices" text="Name, rules edition, species, class, background and level-one choices." />
    <div className="full-creator-form-grid">
      <label><span>Name</span><input value={draft.name} onChange={(event) => update({ name: event.target.value })} /></label>
      <label><span>Edition</span><select value={draft.edition} onChange={(event) => update({ edition: event.target.value })}>{Object.entries(EDITIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
      <label><span>Species / Race</span><select value={draft.race} onChange={(event) => update({ race: event.target.value, subrace: '', floatingAsi: {} })}>{Object.keys(RACES).map((name) => <option key={name}>{name}</option>)}</select></label>
      {subraces.length > 0 && <label><span>Subrace</span><select value={draft.subrace} onChange={(event) => update({ subrace: event.target.value })}><option value="">Choose…</option>{subraces.map((name) => <option key={name}>{name}</option>)}</select></label>}
      <label><span>Class</span><select value={draft.characterClass} onChange={(event) => update({ characterClass: event.target.value, subclass: '', selectedSkills: [], selectedCantrips: [], selectedSpells: [] })}>{Object.keys(CLASSES).map((name) => <option key={name}>{name}</option>)}</select></label>
      {subclassAllowed && <label><span>Level 1 subclass</span><select value={draft.subclass} onChange={(event) => update({ subclass: event.target.value })}><option value="">Choose…</option>{arr(classData.subclasses).map((name) => <option key={name}>{name}</option>)}</select></label>}
      <label><span>Background</span><select value={draft.background} onChange={(event) => update({ background: event.target.value, extraFeat: 'None' })}>{Object.keys(BACKGROUNDS).map((name) => <option key={name}>{name}</option>)}</select></label>
      <label><span>Alignment</span><select value={draft.alignment} onChange={(event) => update({ alignment: event.target.value })}>{['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'].map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>
  </>;
}

function Abilities({ draft, update, setScore, finalScores, floatingBudget, floatingSpent, toggleFloating }) {
  return <>
    <Title icon={Dices} title="Ability scores" text="Use the standard array, then adjust each score." />
    <button type="button" onClick={() => update({ scores: STANDARD })}>Reset to standard array</button>
    <div className="full-creator-score-editor">{ABILITIES.map((ability) => <label key={ability}><span>{LABELS[ability]}</span><input type="number" min="3" max="20" value={draft.scores[ability]} onChange={(event) => setScore(ability, event.target.value)} /><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></label>)}</div>
    {floatingBudget > 0 && <Choice title={`Floating species bonus ${floatingSpent}/${floatingBudget}`}>{ABILITIES.map((ability) => <Chip key={ability} active={Boolean(draft.floatingAsi[ability])} onClick={() => toggleFloating(ability)}>{LABELS[ability]} +1</Chip>)}</Choice>}
  </>;
}

function Skills({ backgroundSkills, skillOptions, selected, target, toggle }) {
  return <>
    <Title icon={Swords} title="Skill proficiencies" text="Background skills are automatic. Choose class skills here." />
    <div className="full-creator-auto-box"><strong>Background skills</strong><span>{backgroundSkills.length ? backgroundSkills.join(', ') : 'None listed'}</span></div>
    <Choice title={`Class skills ${selected.length}/${target}`}>{skillOptions.map((skill) => <Chip key={skill} active={selected.includes(skill)} onClick={() => toggle(skill)}>{skill}</Chip>)}</Choice>
  </>;
}

function Feats({ draft, update, originFeat }) {
  return <>
    <Title icon={Sparkles} title="Feats" text="Confirm the 2024 origin feat or optional table feat." />
    {draft.edition === '2024' && <div className="full-creator-auto-box"><strong>Suggested origin feat</strong><span>{originFeat || 'Choose one below'}</span></div>}
    <label className="full-creator-wide-label"><span>{draft.edition === '2024' ? 'Origin feat override' : 'Optional feat'}</span><select value={draft.extraFeat} onChange={(event) => update({ extraFeat: event.target.value })}>{FEATS.map((name) => <option key={name}>{name}</option>)}</select></label>
  </>;
}

function Spells({ spellSearch, setSpellSearch, spellReq, visibleCantrips, visibleSpells, selectedCantrips, selectedSpells, toggleCantrip, toggleSpell }) {
  return <>
    <Title icon={Wand2} title="Spell choices" text="Search, tap to select, and fill the required spell choices." />
    <input className="full-creator-search" value={spellSearch} onChange={(event) => setSpellSearch(event.target.value)} placeholder="Search name, school, damage, healing…" />
    {spellReq.cantrips > 0 && <Choice title={`Cantrips ${selectedCantrips.length}/${spellReq.cantrips}`}>{visibleCantrips.length ? visibleCantrips.map((spell) => <SpellChip key={spell.name} spell={spell} active={selectedCantrips.includes(spell.name)} onClick={() => toggleCantrip(spell.name)} />) : <p className="full-creator-note">No cantrips match this search.</p>}</Choice>}
    {spellReq.spells > 0 && <Choice title={`Level 1 spells ${selectedSpells.length}/${spellReq.spells}`}>{visibleSpells.length ? visibleSpells.map((spell) => <SpellChip key={spell.name} spell={spell} active={selectedSpells.includes(spell.name)} onClick={() => toggleSpell(spell.name)} />) : <p className="full-creator-note">No spells match this search.</p>}</Choice>}
  </>;
}

function SpellChip({ spell, active, onClick }) {
  return <button type="button" className={`full-creator-spell-chip ${active ? 'active' : ''}`} onClick={onClick}><strong>{spell.name}</strong><span>{spell.school || 'Spell'}</span><em>{spell.description || ''}</em></button>;
}

function Equipment({ draft, update, equipment }) {
  return <>
    <Title icon={Backpack} title="Equipment" text="Pick recommended gear, starting gold, or type your own kit." />
    <div className="full-creator-equipment-modes">{['recommended', 'gold', 'custom'].map((mode) => <button key={mode} type="button" className={draft.equipmentMode === mode ? 'active' : ''} onClick={() => update({ equipmentMode: mode })}>{mode === 'recommended' ? 'Recommended gear' : mode === 'gold' ? 'Starting gold' : 'Custom kit'}</button>)}</div>
    {draft.equipmentMode === 'custom' && <textarea value={draft.customEquipment} onChange={(event) => update({ customEquipment: event.target.value })} placeholder={'Longsword\nShield\nExplorer pack'} />}
    <div className="full-creator-equipment-list">{equipment.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
  </>;
}

function Review({ draft, update, hp, ac, skills, feat, spellCount, hasSpells }) {
  return <>
    <Title icon={BookOpen} title="Review and save" text="Add roleplay notes, check the preview, then create the saved character." />
    <div className="full-creator-form-grid">
      <label><span>Personality trait</span><input value={draft.personalityTrait} onChange={(event) => update({ personalityTrait: event.target.value })} /></label>
      <label><span>Ideal</span><input value={draft.ideal} onChange={(event) => update({ ideal: event.target.value })} /></label>
      <label><span>Bond</span><input value={draft.bond} onChange={(event) => update({ bond: event.target.value })} /></label>
      <label><span>Flaw</span><input value={draft.flaw} onChange={(event) => update({ flaw: event.target.value })} /></label>
    </div>
    <label className="full-creator-wide-label"><span>Backstory notes</span><textarea value={draft.backstory} onChange={(event) => update({ backstory: event.target.value })} /></label>
    <div className="full-creator-review-grid"><ReviewItem label="HP" value={hp} /><ReviewItem label="AC" value={ac} /><ReviewItem label="Skills" value={skills.length} /><ReviewItem label="Feat" value={feat || 'None'} /><ReviewItem label="Equipment" value={draft.equipmentMode} /><ReviewItem label="Spells" value={hasSpells ? spellCount : 'None'} /></div>
  </>;
}

function ReviewItem({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
