import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, BookOpen, Check, ChevronLeft, ChevronRight, Dices, Shield, Sparkles, Swords, Wand2 } from 'lucide-react';

import apiClient from '@/lib/apiClient';
import { BACKGROUNDS, CLASSES, EDITIONS, RACES, getProficiencyBonus } from '@/data/characterRules5e';
import { CANTRIPS_KNOWN, SPELLCASTING_CLASSES, SPELLS_KNOWN, getSpellSlotsForCaster, getSpellsForClass } from '@/data/spellDatabase';
import { getFeatsForRuleset } from '@/data/rules/feats/featRegistry';
import { buildInitialClassResources } from '@/data/classResourceRules';
import './FullCharacterCreatorV2.css';
import './FullCharacterCreatorFlow.css';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const LABELS = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const STANDARD = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };
const LEVEL_ONE_SUBCLASS = new Set(['Cleric', 'Sorcerer', 'Warlock']);
const SPELL_CLASSES = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
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

function equipmentEntries(items = []) {
  return arr(items).map((item) => ({ name: String(item), equipped: false }));
}

function inferEquipped(items = []) {
  const lower = items.map((item) => String(item).toLowerCase());
  const hasShield = lower.some((item) => item.includes('shield'));
  const mainHand = items.find((item) => !/armor|armour|mail|shield|pack|kit|tools|clothes|rations|rope|torch/i.test(String(item))) || '';
  return {
    armor: null,
    shield: hasShield ? { name: 'Shield', equipped: true } : null,
    mainHand: mainHand || null,
    offHand: hasShield ? 'Shield' : null,
  };
}

export default function FullCharacterCreatorV2({ editMode = false }) {
  const navigate = useNavigate();
  const { characterId } = useParams();
  const [draft, setDraft] = useState(loadDraft);
  const [loading, setLoading] = useState(Boolean(editMode && characterId));
  const [saving, setSaving] = useState(false);
  const [spellSearch, setSpellSearch] = useState('');
  const [touchStartX, setTouchStartX] = useState(null);

  const raceData = RACES[draft.race] || {};
  const classData = CLASSES[draft.characterClass] || {};
  const backgroundData = BACKGROUNDS[draft.background] || {};
  const subclassAllowed = draft.edition === '2014' && LEVEL_ONE_SUBCLASS.has(draft.characterClass);
  const classChoicesRequired = subclassAllowed && arr(classData.subclasses).length > 0;
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
  const languageChoices = arr(raceData.languages).filter(isChoiceLang).length;
  const racialTraits = [...arr(raceData.traits), ...arr(raceData.subraces?.[draft.subrace]?.traits)].map((trait) => ({ name: String(trait).split(' (')[0], description: String(trait) }));
  const classFeatures = arr(classData.features?.[1]).filter((name) => name && name !== '---').map((name) => ({ name, description: `${draft.characterClass} feature gained at level 1.` }));
  const equipmentList = startingEquipment();
  const spellReq = spellRequirements(draft.characterClass, finalScores);
  const spellLists = getSpellsForClass(draft.characterClass) || {};
  const cantripPool = arr(spellLists.cantrips || spellLists[0]);
  const levelOnePool = arr(spellLists[1]);
  const visibleCantrips = cantripPool.filter((spell) => searchMatch(spell, spellSearch));
  const visibleSpells = levelOnePool.filter((spell) => searchMatch(spell, spellSearch));
  const hasSpells = spellReq.cantrips > 0 || spellReq.spells > 0;
  const chosenFeat = draft.extraFeat !== 'None' ? draft.extraFeat : (draft.edition === '2024' ? backgroundData.originFeat2024 || '' : '');
  const featRequired = draft.edition === '2024';
  const equipmentComplete = draft.equipmentMode === 'custom' ? draft.customEquipment.trim().length > 0 : true;
  const spellsComplete = !hasSpells || (draft.selectedCantrips.length === spellReq.cantrips && draft.selectedSpells.length === spellReq.spells);
  const abilitiesComplete = ABILITIES.every((ability) => Number.isFinite(Number(finalScores[ability])) && finalScores[ability] >= 3 && finalScores[ability] <= 30) && (!floatingBudget || floatingSpent === floatingBudget);
  const completionByStep = {
    species: Boolean(draft.name.trim() && draft.race && (!subraces.length || draft.subrace)),
    class: Boolean(draft.characterClass),
    classChoices: !classChoicesRequired || Boolean(draft.subclass),
    background: Boolean(draft.background && draft.alignment),
    abilities: abilitiesComplete,
    skills: draft.selectedSkills.length === skillTarget,
    feats: !featRequired || Boolean(chosenFeat),
    spells: spellsComplete,
    equipment: equipmentComplete,
    review: true,
  };
  const steps = [
    { id: 'species', label: 'Species', icon: Shield },
    { id: 'class', label: 'Class', icon: Swords },
    ...(classChoicesRequired ? [{ id: 'classChoices', label: 'Class Choices', icon: Sparkles }] : []),
    { id: 'background', label: 'Background', icon: BookOpen },
    { id: 'abilities', label: 'Abilities', icon: Dices },
    { id: 'skills', label: 'Skills', icon: Swords },
    { id: 'feats', label: 'Feats', icon: Sparkles },
    ...(hasSpells ? [{ id: 'spells', label: 'Spells', icon: Wand2 }] : []),
    { id: 'equipment', label: 'Equipment', icon: Backpack },
    { id: 'review', label: 'Review', icon: Check },
  ];
  const requiredStepIds = steps.filter((item) => item.id !== 'review' && (item.id !== 'feats' || featRequired)).map((item) => item.id);
  const completedRequired = requiredStepIds.filter((id) => completionByStep[id]);
  const progressPercent = requiredStepIds.length ? Math.round((completedRequired.length / requiredStepIds.length) * 100) : 100;
  const firstIncompleteStepId = requiredStepIds.find((id) => !completionByStep[id]);
  const firstIncompleteStepIndex = Math.max(0, steps.findIndex((item) => item.id === firstIncompleteStepId));
  const step = Math.min(Number(draft.step || 0), steps.length - 1);
  const stepId = steps[step]?.id || 'species';
  const currentStep = steps[step] || steps[0];

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

  function validate() {
    if (stepId === 'species') {
      if (!draft.name.trim()) return 'Give your character a name.';
      if (!draft.race) return 'Choose a species or race.';
      if (subraces.length && !draft.subrace) return 'Choose a subrace/species option.';
    }
    if (stepId === 'class' && !draft.characterClass) return 'Choose a class.';
    if (stepId === 'classChoices' && classChoicesRequired && !draft.subclass) return 'Choose your level 1 subclass, patron, or domain.';
    if (stepId === 'background' && (!draft.background || !draft.alignment)) return 'Choose a background and alignment.';
    if (stepId === 'abilities' && !abilitiesComplete) return floatingBudget && floatingSpent !== floatingBudget ? `Assign ${floatingBudget} floating ability bonus${floatingBudget === 1 ? '' : 'es'}.` : 'Check your ability scores.';
    if (stepId === 'skills' && draft.selectedSkills.length !== skillTarget) return `Choose ${skillTarget} class skill${skillTarget === 1 ? '' : 's'}.`;
    if (stepId === 'feats' && featRequired && !chosenFeat) return 'Choose or confirm your 2024 origin feat.';
    if (stepId === 'spells' && !spellsComplete) return `Choose ${spellReq.cantrips} cantrip${spellReq.cantrips === 1 ? '' : 's'} and ${spellReq.spells} level 1 spell${spellReq.spells === 1 ? '' : 's'}.`;
    if (stepId === 'equipment' && !equipmentComplete) return 'Add at least one custom equipment item, or choose recommended gear/starting gold.';
    return '';
  }

  function goNext() {
    if (step >= steps.length - 1) return;
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setStep(step + 1);
  }

  function goPrevious() {
    if (step > 0) setStep(step - 1);
  }

  function handleTouchStart(event) {
    setTouchStartX(event.touches?.[0]?.clientX ?? null);
  }

  function handleTouchEnd(event) {
    if (touchStartX === null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(delta) < 60) return;
    if (delta < 0) goNext();
    else goPrevious();
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

  function readinessReport() {
    const priority = [];
    const later = [];
    const complete = [];

    if (!draft.name.trim()) priority.push('Name is missing. The sheet needs a character name before it can be saved.');
    else complete.push('Name is ready.');

    if (!draft.race || !draft.characterClass || !draft.background) priority.push('Species, class, and background must all be selected.');
    else complete.push('Species, class, and background are selected.');

    if (subraces.length && !draft.subrace) priority.push('Choose a subrace/species option for this species.');
    if (classChoicesRequired && !draft.subclass) priority.push('Choose the required level 1 subclass, patron, or domain.');

    if (!abilitiesComplete) priority.push('Ability scores need checking before the character can be saved.');
    else complete.push('Ability scores are ready.');

    if (draft.selectedSkills.length !== skillTarget) priority.push(`Choose ${skillTarget} class skill${skillTarget === 1 ? '' : 's'} before saving.`);
    else complete.push('Skill choices are ready.');

    if (!hp || hp <= 0) priority.push('Hit points could not be calculated.');
    else complete.push('HP is calculated.');

    if (!ac || ac <= 0) priority.push('Armour Class could not be calculated.');
    else complete.push('AC is calculated.');

    if (!arr(classData.savingThrows).length) later.push('Saving throw proficiencies are not listed for this class yet. Check the sheet after saving.');
    else complete.push('Saving throws are ready.');

    if (!baseLanguages.length) later.push('Languages are missing or all language choices are unresolved. You can add these on the sheet later.');
    if (languageChoices > 0) later.push('This species has an extra language choice. Pick the exact language later if it is not handled here yet.');
    if (!racialTraits.length) later.push('Species traits are missing from the rules data. You can still save, but the traits section may need review.');
    if (!classFeatures.length) later.push('Class features are missing from the rules data. You can still save, but the features section may need review.');

    if (featRequired && !chosenFeat) priority.push('Choose or confirm your 2024 origin feat before saving.');
    if (!equipmentComplete) priority.push('Equipment needs a choice before saving.');
    if (!equipmentList.length) priority.push('No starting equipment is listed. Choose starting gold or add custom gear before saving.');
    if (draft.equipmentMode === 'gold') later.push('Starting gold selected. Shopping and exact gear will need finishing later.');

    if (hasSpells) {
      if (!spellsComplete) priority.push(`Spell choices are incomplete: ${draft.selectedCantrips.length}/${spellReq.cantrips} cantrips and ${draft.selectedSpells.length}/${spellReq.spells} level 1 spells.`);
      else complete.push('Spell choices are ready.');
    }

    if (!draft.personalityTrait.trim()) later.push('Personality trait is blank. This can be filled in later.');
    if (!draft.ideal.trim()) later.push('Ideal is blank. This can be filled in later.');
    if (!draft.bond.trim()) later.push('Bond is blank. This can be filled in later.');
    if (!draft.flaw.trim()) later.push('Flaw is blank. This can be filled in later.');

    return { priority, later, complete };
  }

  function buildPayload() {
    const spellData = spellFields();
    const equipment = equipmentEntries(equipmentList);
    const basePayload = {
      name: draft.name.trim(),
      creation_mode: 'full',
      race: draft.race,
      subrace: draft.subrace || '',
      character_class: draft.characterClass,
      subclass: classChoicesRequired ? draft.subclass || '' : '',
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
      temporary_hit_points: 0,
      temp_hp: 0,
      hit_dice: `1d${classData.hitDie || 8}`,
      hit_dice_remaining: 1,
      armor_class: ac,
      speed: raceData.subraces?.[draft.subrace]?.speed || raceData.speed || 30,
      proficiency_bonus: proficiencyBonus,
      skill_proficiencies: allSkills,
      saving_throw_proficiencies: arr(classData.savingThrows),
      armor_proficiencies: arr(classData.armorProficiencies),
      weapon_proficiencies: arr(classData.weaponProficiencies),
      tool_proficiencies: arr(backgroundData.toolProficiencies),
      languages: baseLanguages,
      racial_traits: racialTraits,
      class_features: classFeatures,
      feats: chosenFeat ? [{ name: chosenFeat, source: draft.edition === '2024' ? 'origin' : 'optional' }] : [],
      equipment_choice: draft.equipmentMode,
      starting_equipment: equipmentList,
      equipment,
      inventory: equipment,
      equipped: inferEquipped(equipmentList),
      currency: { copper: 0, silver: 0, electrum: 0, gold: draft.equipmentMode === 'gold' ? 10 : 0, platinum: 0 },
      gold: draft.equipmentMode === 'gold' ? 10 : 0,
      personality_trait: draft.personalityTrait,
      personality_traits: draft.personalityTrait,
      ideal: draft.ideal,
      ideals: draft.ideal,
      bond: draft.bond,
      bonds: draft.bond,
      flaw: draft.flaw,
      flaws: draft.flaw,
      backstory: draft.backstory,
      conditions: [],
      inspiration: false,
      has_inspiration: false,
      ...spellData,
    };
    return { ...basePayload, resources: buildInitialClassResources(basePayload) };
  }

  async function saveCharacter() {
    const report = readinessReport();
    if (progressPercent < 100) {
      setStep(firstIncompleteStepIndex);
      toast.error('Complete the required choices until the progress bar reaches 100%.');
      return;
    }
    if (report.priority.length) {
      setStep(steps.length - 1);
      toast.error('Priority checks need fixing before this character can be created.');
      return;
    }
    const payload = buildPayload();

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
        toast.success(report.later.length ? 'Character created with reminders' : 'Character created and ready');
        navigate(id ? `/characters/${id}` : '/characters');
      }
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save character');
    } finally {
      setSaving(false);
    }
  }

  const report = readinessReport();
  const canSave = progressPercent === 100 && report.priority.length === 0;

  if (loading) return <main className="full-creator-page"><div className="full-creator-loading">Loading character…</div></main>;

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button type="button" onClick={() => navigate('/characters')}><ArrowLeft size={17} /> Characters</button>
        <div>
          <p>Level 1 guided builder</p>
          <h1>{editMode ? 'Edit Character' : 'Create Character'}</h1>
          <span>Swipe or use the buttons to move through each required choice.</span>
        </div>
        <button type="button" onClick={() => navigate('/home')}>Dashboard</button>
      </header>

      <section className="full-creator-progress-card" aria-label="Character creation progress">
        <div className="full-creator-progress-heading">
          <span>{currentStep?.label || 'Step'}</span>
          <strong>{progressPercent}% complete</strong>
        </div>
        <div className="full-creator-progress-track" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <p>{canSave ? 'All required choices are complete. Review and save when ready.' : 'Fill the required choices to reach 100% and unlock saving.'}</p>
      </section>

      <nav className="full-creator-steps" aria-label="Character creation steps">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const isComplete = item.id === 'review' ? progressPercent === 100 : Boolean(completionByStep[item.id]);
          return <button key={item.id} type="button" className={`${index === step ? 'active' : ''} ${isComplete ? 'is-complete' : ''}`} onClick={() => setStep(index)}><Icon size={16} /><span>{item.label}</span></button>;
        })}
      </nav>

      <section className="full-creator-layout">
        <article className="full-creator-panel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <p className="full-creator-swipe-hint">Swipe left for next • swipe right for previous</p>
          {stepId === 'species' && <Species draft={draft} update={update} subraces={subraces} />}
          {stepId === 'class' && <ClassStep draft={draft} update={update} />}
          {stepId === 'classChoices' && <ClassChoices draft={draft} update={update} classData={classData} />}
          {stepId === 'background' && <Background draft={draft} update={update} />}
          {stepId === 'abilities' && <Abilities draft={draft} update={update} setScore={setScore} finalScores={finalScores} floatingBudget={floatingBudget} floatingSpent={floatingSpent} toggleFloating={(ability) => {
            const next = { ...draft.floatingAsi };
            if (next[ability]) delete next[ability];
            else if (floatingSpent < floatingBudget) next[ability] = 1;
            update({ floatingAsi: next });
          }} />}
          {stepId === 'skills' && <Skills backgroundSkills={backgroundSkills} skillOptions={skillOptions} selected={draft.selectedSkills} target={skillTarget} toggle={(skill) => toggleList('selectedSkills', skill, skillTarget)} />}
          {stepId === 'feats' && <Feats draft={draft} update={update} originFeat={backgroundData.originFeat2024} featRequired={featRequired} />}
          {stepId === 'spells' && <Spells spellSearch={spellSearch} setSpellSearch={setSpellSearch} spellReq={spellReq} visibleCantrips={visibleCantrips} visibleSpells={visibleSpells} selectedCantrips={draft.selectedCantrips} selectedSpells={draft.selectedSpells} toggleCantrip={(name) => toggleList('selectedCantrips', name, spellReq.cantrips)} toggleSpell={(name) => toggleList('selectedSpells', name, spellReq.spells)} />}
          {stepId === 'equipment' && <Equipment draft={draft} update={update} equipment={equipmentList} />}
          {stepId === 'review' && <Review draft={draft} update={update} hp={hp} ac={ac} skills={allSkills} feat={chosenFeat} spellCount={draft.selectedCantrips.length + draft.selectedSpells.length} hasSpells={hasSpells} report={report} progressPercent={progressPercent} />}
        </article>

        <aside className="full-creator-preview">
          <p>Live sheet preview</p>
          <h2>{draft.name || 'Unnamed Character'}</h2>
          <span>{draft.race}{draft.subrace ? ` (${draft.subrace})` : ''} • {draft.characterClass} • Lv 1</span>
          <div className="full-creator-mini-grid"><strong>{hp}</strong><span>HP</span><strong>{ac}</strong><span>AC</span><strong>{fmt(mod(finalScores.dexterity))}</strong><span>Init</span></div>
          <div className="full-creator-score-grid">{ABILITIES.map((ability) => <div key={ability}><span>{LABELS[ability]}</span><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></div>)}</div>
          <small>Skills: {allSkills.length ? allSkills.join(', ') : 'choose skills'}</small>
          {hasSpells && <small>Spells: {draft.selectedCantrips.length}/{spellReq.cantrips} cantrips, {draft.selectedSpells.length}/{spellReq.spells} spells</small>}
          <small>{progressPercent < 100 ? `${progressPercent}% complete` : report.later.length ? `${report.later.length} reminder${report.later.length === 1 ? '' : 's'} for later` : 'Ready to create'}</small>
        </aside>
      </section>

      <footer className="full-creator-footer">
        <button type="button" onClick={goPrevious} disabled={step === 0}><ChevronLeft size={16} /> Previous</button>
        {step < steps.length - 1
          ? <button type="button" onClick={goNext}>Next <ChevronRight size={16} /></button>
          : <button type="button" onClick={saveCharacter} disabled={saving || !canSave}><Check size={16} /> {saving ? 'Saving…' : canSave ? editMode ? 'Save Changes' : 'Create Character' : `Complete ${progressPercent}%`}</button>}
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

function Species({ draft, update, subraces }) {
  return <>
    <Title icon={Shield} title="Choose species" text="Start with your character name, rules edition, and species or race." />
    <div className="full-creator-form-grid">
      <label><span>Name</span><input value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Character name" /></label>
      <label><span>Edition</span><select value={draft.edition} onChange={(event) => update({ edition: event.target.value, floatingAsi: {}, extraFeat: 'None' })}>{Object.entries(EDITIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
      <label><span>Species / Race</span><select value={draft.race} onChange={(event) => update({ race: event.target.value, subrace: '', floatingAsi: {} })}>{Object.keys(RACES).map((name) => <option key={name}>{name}</option>)}</select></label>
      {subraces.length > 0 && <label><span>Subrace</span><select value={draft.subrace} onChange={(event) => update({ subrace: event.target.value })}><option value="">Choose…</option>{subraces.map((name) => <option key={name}>{name}</option>)}</select></label>}
    </div>
  </>;
}

function ClassStep({ draft, update }) {
  return <>
    <Title icon={Swords} title="Choose class" text="Pick the main class for this level 1 character." />
    <div className="full-creator-form-grid">
      <label><span>Class</span><select value={draft.characterClass} onChange={(event) => update({ characterClass: event.target.value, subclass: '', selectedSkills: [], selectedCantrips: [], selectedSpells: [] })}>{Object.keys(CLASSES).map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>
  </>;
}

function ClassChoices({ draft, update, classData }) {
  return <>
    <Title icon={Sparkles} title="Class choices" text="Some level 1 classes need a subclass, patron, origin, or domain straight away." />
    <div className="full-creator-form-grid">
      <label><span>Level 1 subclass</span><select value={draft.subclass} onChange={(event) => update({ subclass: event.target.value })}><option value="">Choose…</option>{arr(classData.subclasses).map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>
  </>;
}

function Background({ draft, update }) {
  return <>
    <Title icon={BookOpen} title="Choose background" text="Pick where your character came from, then choose alignment." />
    <div className="full-creator-form-grid">
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

function Feats({ draft, update, originFeat, featRequired }) {
  const featOptions = ['None', ...getFeatsForRuleset({
    edition: draft.edition,
    category: draft.edition === '2024' ? 'origin' : 'general',
  }).map(feat => feat.name)];

  return <>
    <Title icon={Sparkles} title="Feats" text={featRequired ? 'Confirm the 2024 origin feat for this character.' : 'Optional table feat. Leave this as None unless your table starts with a feat.'} />
    {draft.edition === '2024' && <div className="full-creator-auto-box"><strong>Suggested origin feat</strong><span>{originFeat || 'Choose one below'}</span></div>}
    <label className="full-creator-wide-label"><span>{draft.edition === '2024' ? 'Origin feat override' : 'Optional feat'}</span><select value={draft.extraFeat} onChange={(event) => update({ extraFeat: event.target.value })}>{featOptions.map((name) => <option key={name}>{name}</option>)}</select></label>
  </>;
}

function Spells({ spellSearch, setSpellSearch, spellReq, visibleCantrips, visibleSpells, selectedCantrips, selectedSpells, toggleCantrip, toggleSpell }) {
  return <>
    <Title icon={Wand2} title="Spell choices" text="Choose the required starting cantrips and level 1 spells before saving." />
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

function Review({ draft, update, hp, ac, skills, feat, spellCount, hasSpells, report, progressPercent }) {
  return <>
    <Title icon={BookOpen} title="Review and save" text={progressPercent === 100 ? 'Everything required is complete. Add optional story notes, then save.' : 'Complete the missing required choices before saving.'} />
    <ReadinessPanel report={report} />
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

function ReadinessPanel({ report }) {
  const isReady = !report.priority.length && !report.later.length;
  return (
    <section className="full-creator-readiness-panel">
      <div className="full-creator-readiness-hero">
        <strong>{report.priority.length ? 'Priority fixes needed' : isReady ? 'Ready to create' : 'Create now, finish later'}</strong>
        <span>{report.priority.length ? 'These must be fixed before the character sheet can be created.' : isReady ? 'Everything important looks ready for the first saved sheet.' : 'No blockers found. These reminders can be handled after saving.'}</span>
      </div>
      {report.priority.length > 0 && <ReadinessList title="Priority" tone="priority" items={report.priority} />}
      {report.later.length > 0 && <ReadinessList title="Can finish later" tone="later" items={report.later} />}
      {!report.priority.length && !report.later.length && <ReadinessList title="Ready" tone="ready" items={report.complete.slice(0, 7)} />}
    </section>
  );
}

function ReadinessList({ title, tone, items }) {
  return (
    <div className={`full-creator-readiness-list ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
