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

const STARTING_GOLD_2014_BY_CLASS = {
  Barbarian: { formula: '2d4 × 10 gp', dice: 2, die: 4, multiplier: 10, average: 50 },
  Bard: { formula: '5d4 × 10 gp', dice: 5, die: 4, multiplier: 10, average: 125 },
  Cleric: { formula: '5d4 × 10 gp', dice: 5, die: 4, multiplier: 10, average: 125 },
  Druid: { formula: '2d4 × 10 gp', dice: 2, die: 4, multiplier: 10, average: 50 },
  Fighter: { formula: '5d4 × 10 gp', dice: 5, die: 4, multiplier: 10, average: 125 },
  Monk: { formula: '5d4 gp', dice: 5, die: 4, multiplier: 1, average: 13 },
  Paladin: { formula: '5d4 × 10 gp', dice: 5, die: 4, multiplier: 10, average: 125 },
  Ranger: { formula: '5d4 × 10 gp', dice: 5, die: 4, multiplier: 10, average: 125 },
  Rogue: { formula: '4d4 × 10 gp', dice: 4, die: 4, multiplier: 10, average: 100 },
  Sorcerer: { formula: '3d4 × 10 gp', dice: 3, die: 4, multiplier: 10, average: 75 },
  Warlock: { formula: '4d4 × 10 gp', dice: 4, die: 4, multiplier: 10, average: 100 },
  Wizard: { formula: '4d4 × 10 gp', dice: 4, die: 4, multiplier: 10, average: 100 },
};

const STARTING_GOLD_2024 = { formula: '50 gp', dice: 0, die: 0, multiplier: 1, average: 50, fixed: true };

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const fmt = (value) => value >= 0 ? `+${value}` : `${value}`;
const clamp = (value) => Math.max(3, Math.min(20, Number.parseInt(value, 10) || 10));
const isChoiceLang = (value) => /choice|additional/i.test(String(value || ''));
const displayName = (value) => typeof value === 'string' ? value : value?.name || value?.title || String(value || '');
const spellName = (spell) => typeof spell === 'string' ? spell : spell?.name || '';
const getStartingGoldRule = (characterClass, edition) => edition === '2024' ? STARTING_GOLD_2024 : STARTING_GOLD_2014_BY_CLASS[characterClass] || { formula: '4d4 × 10 gp', dice: 4, die: 4, multiplier: 10, average: 100 };
const normalizeEquipmentMode = (mode) => mode === 'gold' ? 'gold' : 'equipment';
const rollStartingGold = (rule) => {
  if (rule.fixed) return rule.average;
  let total = 0;
  for (let i = 0; i < Number(rule.dice || 0); i += 1) total += 1 + Math.floor(Math.random() * Number(rule.die || 1));
  return total * Number(rule.multiplier || 1);
};
const searchMatch = (spell, search) => {
  const needle = String(search || '').trim().toLowerCase();
  if (!needle) return true;
  if (typeof spell === 'string') return spell.toLowerCase().includes(needle);
  if (needle.includes('damage') && spell.damage) return true;
  if ((needle.includes('heal') || needle.includes('healing')) && spell.healing) return true;
  return [spell.name, spell.school, spell.description, spell.damage, spell.damageType, spell.healing].filter(Boolean).join(' ').toLowerCase().includes(needle);
};

function defaultDraft() {
  return {
    step: 0,
    name: '',
    edition: '2014',
    startingLevel: 1,
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
    equipmentMode: 'equipment',
    rolledStartingGold: 0,
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
    return stored ? { ...defaultDraft(), ...stored, equipmentMode: normalizeEquipmentMode(stored.equipmentMode), rolledStartingGold: Number(stored.rolledStartingGold || 0), startingLevel: 1, scores: { ...STANDARD, ...(stored.scores || {}) } } : defaultDraft();
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
  const name = spellName(spell) || String(spell || '');
  return {
    ...(typeof spell === 'object' && spell ? spell : {}),
    name,
    level: Number(typeof spell === 'object' ? spell?.level ?? fallbackLevel : fallbackLevel),
    school: typeof spell === 'object' ? spell?.school || '' : '',
    description: typeof spell === 'object' ? spell?.description || '' : '',
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

function bonusText(bonus) {
  const entries = Object.entries(bonus || {}).filter(([, value]) => Number(value) > 0);
  return entries.length ? entries.map(([ability, value]) => `${LABELS[ability]} +${value}`).join(', ') : 'No direct ability bonus here';
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
  const equipmentMode = normalizeEquipmentMode(draft.equipmentMode);
  const speciesLabel = draft.edition === '2024' ? 'Species' : 'Race';
  const startingLevel = 1;
  const subclassAllowed = draft.edition === '2014' && LEVEL_ONE_SUBCLASS.has(draft.characterClass);
  const classChoicesRequired = subclassAllowed && arr(classData.subclasses).length > 0;
  const subraces = Object.keys(raceData.subraces || {});
  const bonus = abilityBonus({ edition: draft.edition, raceData, subrace: draft.subrace, backgroundData, floatingAsi: draft.floatingAsi });
  const finalScores = Object.fromEntries(ABILITIES.map((ability) => [ability, clamp(draft.scores[ability]) + (bonus[ability] || 0)]));
  const proficiencyBonus = getProficiencyBonus(startingLevel);
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
  const startingGoldRule = getStartingGoldRule(draft.characterClass, draft.edition);
  const startingGold = equipmentMode === 'gold' ? (startingGoldRule.fixed ? startingGoldRule.average : Number(draft.rolledStartingGold || 0)) : 0;
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
  const equipmentComplete = equipmentMode === 'equipment' || (equipmentMode === 'gold' && (startingGoldRule.fixed || startingGold > 0));
  const spellsComplete = !hasSpells || (draft.selectedCantrips.length === spellReq.cantrips && draft.selectedSpells.length === spellReq.spells);
  const abilitiesComplete = ABILITIES.every((ability) => Number.isFinite(Number(finalScores[ability])) && finalScores[ability] >= 3 && finalScores[ability] <= 30) && (!floatingBudget || floatingSpent === floatingBudget);
  const completionByStep = {
    setup: Boolean(draft.name.trim() && draft.edition),
    species: Boolean(draft.race && (!subraces.length || draft.subrace)),
    class: Boolean(draft.characterClass && (!classChoicesRequired || draft.subclass) && draft.selectedSkills.length === skillTarget && spellsComplete),
    background: Boolean(draft.background && draft.alignment && (!featRequired || chosenFeat)),
    abilities: abilitiesComplete,
    equipment: equipmentComplete,
    review: true,
  };
  const steps = [
    { id: 'setup', label: 'Setup', icon: Sparkles },
    { id: 'species', label: speciesLabel, icon: Shield },
    { id: 'class', label: 'Class', icon: Swords },
    { id: 'background', label: 'Background', icon: BookOpen },
    { id: 'abilities', label: 'Abilities', icon: Dices },
    { id: 'equipment', label: 'Equipment', icon: Backpack },
    { id: 'review', label: 'Review', icon: Check },
  ];
  const step = Math.min(Number(draft.step || 0), steps.length - 1);
  const stepId = steps[step]?.id || 'setup';
  const currentStep = steps[step] || steps[0];
  const journeyPercent = steps.length > 1 ? Math.round((step / (steps.length - 1)) * 100) : 100;
  const firstIncompleteStepId = steps.find((item) => item.id !== 'review' && !completionByStep[item.id])?.id;
  const firstIncompleteStepIndex = Math.max(0, steps.findIndex((item) => item.id === firstIncompleteStepId));

  useEffect(() => {
    if (!editMode) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, equipmentMode, step, startingLevel: 1 }));
  }, [draft, equipmentMode, step, editMode]);

  useEffect(() => {
    if (!editMode || !characterId) return;
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/characters/${characterId}`);
        if (cancelled) return;
        const loadedGold = Number(data.gold || data.currency?.gold || 0);
        setDraft((prev) => ({
          ...prev,
          name: data.name || '',
          edition: data.edition || (String(data.ruleset_id || '').includes('2024') ? '2024' : '2014'),
          startingLevel: Number(data.level || 1),
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
          customEquipment: '',
          equipmentMode: loadedGold > 0 && !arr(data.starting_equipment).length ? 'gold' : 'equipment',
          rolledStartingGold: loadedGold,
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
    if (stepId === 'setup') {
      if (!draft.name.trim()) return 'Give your character a name.';
      if (!draft.edition) return 'Choose the rules edition.';
    }
    if (stepId === 'species') {
      if (!draft.race) return `Choose a ${speciesLabel.toLowerCase()}.`;
      if (subraces.length && !draft.subrace) return `Choose a ${speciesLabel.toLowerCase()} option.`;
    }
    if (stepId === 'class') {
      if (!draft.characterClass) return 'Choose a class.';
      if (classChoicesRequired && !draft.subclass) return 'Choose your level 1 subclass, patron, or domain.';
      if (draft.selectedSkills.length !== skillTarget) return `Choose ${skillTarget} class skill${skillTarget === 1 ? '' : 's'}.`;
      if (!spellsComplete) return `Choose ${spellReq.cantrips} cantrip${spellReq.cantrips === 1 ? '' : 's'} and ${spellReq.spells} level 1 spell${spellReq.spells === 1 ? '' : 's'}.`;
    }
    if (stepId === 'background') {
      if (!draft.background || !draft.alignment) return 'Choose a background and alignment.';
      if (featRequired && !chosenFeat) return 'Choose or confirm your 2024 origin feat.';
    }
    if (stepId === 'abilities' && !abilitiesComplete) return floatingBudget && floatingSpent !== floatingBudget ? `Assign ${floatingBudget} floating ability bonus${floatingBudget === 1 ? '' : 'es'}.` : 'Check your ability scores.';
    if (stepId === 'equipment' && !equipmentComplete) return draft.edition === '2014' ? 'Roll starting gold or choose starting equipment.' : 'Choose starting equipment or starting gold.';
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
    if (equipmentMode === 'gold') return [];
    return Array.from(new Set([...arr(classData.startingEquipment), ...arr(backgroundData.equipment)]));
  }

  function spellFields() {
    const classInfo = SPELLCASTING_CLASSES[draft.characterClass];
    if (!classInfo || !hasSpells) return {};
    const ability = classInfo.ability;
    const abilityMod = mod(finalScores[ability]);
    const slots = getSpellSlotsForCaster(classInfo, 1);
    const cantrips = draft.selectedCantrips.map((name) => toSpellEntry(cantripPool.find((spell) => spellName(spell) === name) || { name }, 0));
    const spells = draft.selectedSpells.map((name) => toSpellEntry(levelOnePool.find((spell) => spellName(spell) === name) || { name }, 1));
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

    if (!draft.edition) priority.push('Rules edition is missing. Choose 2014 or 2024 before saving.');
    else complete.push('Rules edition is selected.');

    if (!draft.race || !draft.characterClass || !draft.background) priority.push(`${speciesLabel}, class, and background must all be selected.`);
    else complete.push(`${speciesLabel}, class, and background are selected.`);

    if (subraces.length && !draft.subrace) priority.push(`Choose a ${speciesLabel.toLowerCase()} option for this ${speciesLabel.toLowerCase()}.`);
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
    if (languageChoices > 0) later.push(`This ${speciesLabel.toLowerCase()} has an extra language choice. Pick the exact language later if it is not handled here yet.`);
    if (!racialTraits.length) later.push(`${speciesLabel} traits are missing from the rules data. You can still save, but the traits section may need review.`);
    if (!classFeatures.length) later.push('Class features are missing from the rules data. You can still save, but the features section may need review.');

    if (featRequired && !chosenFeat) priority.push('Choose or confirm your 2024 origin feat before saving.');
    if (!equipmentComplete) priority.push(draft.edition === '2014' ? 'Roll starting gold or choose starting equipment before saving.' : 'Choose starting equipment or starting gold before saving.');
    if (equipmentMode === 'equipment' && !equipmentList.length) priority.push('No starting equipment is listed. Choose starting gold instead.');
    if (equipmentMode === 'gold') later.push(startingGoldRule.fixed ? `Starting gold selected: ${startingGold} gp.` : `Starting gold rolled using ${startingGoldRule.formula}: ${startingGold} gp.`);

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
      equipment_choice: equipmentMode === 'gold' ? (startingGoldRule.fixed ? 'starting_gold_fixed' : 'starting_gold_rolled') : 'starting_equipment',
      starting_gold_formula: equipmentMode === 'gold' ? startingGoldRule.formula : '',
      starting_equipment: equipmentList,
      equipment,
      inventory: equipment,
      equipped: inferEquipped(equipmentList),
      currency: { copper: 0, silver: 0, electrum: 0, gold: startingGold, platinum: 0 },
      gold: startingGold,
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
    if (report.priority.length) {
      setStep(firstIncompleteStepIndex);
      toast.error('Complete the required choices before saving.');
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
  const canSave = stepId === 'review' && report.priority.length === 0;

  if (loading) return <main className="full-creator-page"><div className="full-creator-loading">Loading character…</div></main>;

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button type="button" onClick={() => navigate('/characters')}><ArrowLeft size={17} /> Characters</button>
        <div>
          <p>Level 1 full builder</p>
          <h1>{editMode ? 'Edit Character' : 'Create Character'}</h1>
          <span>Start with setup, then move through each builder section one page at a time.</span>
        </div>
        <button type="button" onClick={() => navigate('/home')}>Dashboard</button>
      </header>

      <section className="full-creator-progress-card" aria-label="Character creation progress">
        <div className="full-creator-progress-heading">
          <span>{currentStep?.label || 'Step'}</span>
          <strong>{journeyPercent}% complete</strong>
        </div>
        <div className="full-creator-progress-track" aria-hidden="true">
          <span style={{ width: `${journeyPercent}%` }} />
        </div>
        <p>{canSave ? 'All required choices are complete. Review and save when ready.' : 'Move through each section to complete the character.'}</p>
      </section>

      <section className="full-creator-workspace">
        <nav className="full-creator-steps" aria-label="Character creation steps">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const isComplete = item.id === 'review' ? canSave : Boolean(completionByStep[item.id]);
            return <button key={item.id} type="button" className={`${index === step ? 'active' : ''} ${isComplete ? 'is-complete' : ''}`} onClick={() => setStep(index)}><Icon size={16} /><span>{item.label}</span></button>;
          })}
        </nav>

        <section className="full-creator-layout">
          <article className="full-creator-panel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <p className="full-creator-swipe-hint">Swipe left for next • swipe right for previous</p>
            {stepId === 'setup' && <Setup draft={draft} update={update} />}
            {stepId === 'species' && <Species draft={draft} update={update} subraces={subraces} raceData={raceData} racialTraits={racialTraits} baseLanguages={baseLanguages} languageChoices={languageChoices} bonus={bonus} speciesLabel={speciesLabel} />}
            {stepId === 'class' && <ClassStep draft={draft} update={update} classData={classData} classChoicesRequired={classChoicesRequired} backgroundSkills={backgroundSkills} skillOptions={skillOptions} selectedSkills={draft.selectedSkills} skillTarget={skillTarget} toggleSkill={(skill) => toggleList('selectedSkills', skill, skillTarget)} hasSpells={hasSpells} spellSearch={spellSearch} setSpellSearch={setSpellSearch} spellReq={spellReq} visibleCantrips={visibleCantrips} visibleSpells={visibleSpells} selectedCantrips={draft.selectedCantrips} selectedSpells={draft.selectedSpells} toggleCantrip={(name) => toggleList('selectedCantrips', name, spellReq.cantrips)} toggleSpell={(name) => toggleList('selectedSpells', name, spellReq.spells)} />}
            {stepId === 'background' && <Background draft={draft} update={update} featRequired={featRequired} originFeat={backgroundData.originFeat2024} />}
            {stepId === 'abilities' && <Abilities draft={draft} update={update} setScore={setScore} finalScores={finalScores} floatingBudget={floatingBudget} floatingSpent={floatingSpent} toggleFloating={(ability) => {
              const next = { ...draft.floatingAsi };
              if (next[ability]) delete next[ability];
              else if (floatingSpent < floatingBudget) next[ability] = 1;
              update({ floatingAsi: next });
            }} />}
            {stepId === 'equipment' && <Equipment draft={draft} update={update} equipment={equipmentList} startingGoldRule={startingGoldRule} startingGold={startingGold} />}
            {stepId === 'review' && <Review draft={draft} update={update} hp={hp} ac={ac} skills={allSkills} feat={chosenFeat} spellCount={draft.selectedCantrips.length + draft.selectedSpells.length} hasSpells={hasSpells} report={report} journeyPercent={journeyPercent} />}
          </article>

          <aside className="full-creator-preview">
            <p>Live sheet preview</p>
            <h2>{draft.name || 'Unnamed Character'}</h2>
            <span>{draft.edition} rules • {draft.race}{draft.subrace ? ` (${draft.subrace})` : ''} • {draft.characterClass} • Lv 1</span>
            <div className="full-creator-mini-grid"><strong>{hp}</strong><span>HP</span><strong>{ac}</strong><span>AC</span><strong>{fmt(mod(finalScores.dexterity))}</strong><span>Init</span></div>
            <div className="full-creator-score-grid">{ABILITIES.map((ability) => <div key={ability}><span>{LABELS[ability]}</span><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></div>)}</div>
            <small>Skills: {allSkills.length ? allSkills.join(', ') : 'choose skills'}</small>
            {hasSpells && <small>Spells: {draft.selectedCantrips.length}/{spellReq.cantrips} cantrips, {draft.selectedSpells.length}/{spellReq.spells} spells</small>}
            <small>{equipmentMode === 'gold' ? `Gold: ${startingGold || 'not rolled'} gp` : 'Starting equipment selected'}</small>
            <small>{canSave ? report.later.length ? `${report.later.length} reminder${report.later.length === 1 ? '' : 's'} for later` : 'Ready to create' : `${journeyPercent}% through builder`}</small>
          </aside>
        </section>
      </section>

      <footer className="full-creator-footer">
        <button type="button" onClick={goPrevious} disabled={step === 0}><ChevronLeft size={16} /> Previous</button>
        {step < steps.length - 1
          ? <button type="button" onClick={goNext}>Next <ChevronRight size={16} /></button>
          : <button type="button" onClick={saveCharacter} disabled={saving || !canSave}><Check size={16} /> {saving ? 'Saving…' : canSave ? editMode ? 'Save Changes' : 'Create Character' : 'Complete choices'}</button>}
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

function Setup({ draft, update }) {
  return <>
    <Title icon={Sparkles} title="Character setup" text="Start with name, rules edition, and starting level. Higher starting levels will come after the level-up pass." />
    <div className="full-creator-form-grid">
      <label><span>Character name</span><input value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Pip, Javen, Thorne, Mira…" autoFocus /></label>
      <label><span>Rules edition</span><select value={draft.edition} onChange={(event) => update({ edition: event.target.value, floatingAsi: {}, extraFeat: 'None', rolledStartingGold: 0 })}>{Object.entries(EDITIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
      <label><span>Starting level</span><select value="1" disabled><option value="1">Level 1</option></select></label>
    </div>
    <div className="full-creator-auto-box"><strong>{EDITIONS[draft.edition]?.name || 'Edition selected'}</strong><span>{EDITIONS[draft.edition]?.description || 'The builder will use this ruleset for wording and choices.'}</span></div>
  </>;
}

function Species({ draft, update, subraces, raceData, racialTraits, baseLanguages, languageChoices, bonus, speciesLabel }) {
  const speed = raceData.subraces?.[draft.subrace]?.speed || raceData.speed || 30;
  return <>
    <Title icon={Shield} title={`Choose ${speciesLabel.toLowerCase()}`} text={`Pick your character's ${speciesLabel.toLowerCase()} and review what it gives them.`} />
    <div className="full-creator-form-grid">
      <label><span>{speciesLabel}</span><select value={draft.race} onChange={(event) => update({ race: event.target.value, subrace: '', floatingAsi: {} })}>{Object.keys(RACES).map((name) => <option key={name}>{name}</option>)}</select></label>
      {subraces.length > 0 && <label><span>{speciesLabel} option</span><select value={draft.subrace} onChange={(event) => update({ subrace: event.target.value })}><option value="">Choose…</option>{subraces.map((name) => <option key={name}>{name}</option>)}</select></label>}
    </div>
    <section className="full-creator-auto-box">
      <strong>{draft.race}{draft.subrace ? ` — ${draft.subrace}` : ''}</strong>
      <span>{raceData.description || `Review the ${speciesLabel.toLowerCase()} traits before moving on.`}</span>
    </section>
    <div className="full-creator-review-grid">
      <ReviewItem label="Speed" value={`${speed} ft`} />
      <ReviewItem label="Size" value={raceData.size || 'Medium'} />
      <ReviewItem label="Ability bonus" value={draft.edition === '2024' ? 'From background' : bonusText(bonus)} />
      <ReviewItem label="Languages" value={[...baseLanguages, languageChoices ? `${languageChoices} choice` : ''].filter(Boolean).join(', ') || 'None listed'} />
    </div>
    <Choice title="Traits preview">
      {racialTraits.length ? racialTraits.slice(0, 8).map((trait) => <span className="full-creator-note" key={trait.description}>{trait.description}</span>) : <span className="full-creator-note">No traits listed yet.</span>}
    </Choice>
  </>;
}

function ClassStep({ draft, update, classData, classChoicesRequired, backgroundSkills, skillOptions, selectedSkills, skillTarget, toggleSkill, hasSpells, spellSearch, setSpellSearch, spellReq, visibleCantrips, visibleSpells, selectedCantrips, selectedSpells, toggleCantrip, toggleSpell }) {
  return <>
    <Title icon={Swords} title="Choose class" text="Class handles class, subclass, skills, spells, and class-linked choices." />
    <div className="full-creator-form-grid">
      <label><span>Class</span><select value={draft.characterClass} onChange={(event) => update({ characterClass: event.target.value, subclass: '', selectedSkills: [], selectedCantrips: [], selectedSpells: [], rolledStartingGold: 0 })}>{Object.keys(CLASSES).map((name) => <option key={name}>{name}</option>)}</select></label>
      {classChoicesRequired && <label><span>Level 1 subclass</span><select value={draft.subclass} onChange={(event) => update({ subclass: event.target.value })}><option value="">Choose…</option>{arr(classData.subclasses).map((option) => <option key={displayName(option)} value={displayName(option)}>{displayName(option)}</option>)}</select></label>}
    </div>
    <div className="full-creator-review-grid">
      <ReviewItem label="Hit die" value={`d${classData.hitDie || 8}`} />
      <ReviewItem label="Primary" value={String(classData.primaryAbility || 'varies').toUpperCase()} />
      <ReviewItem label="Skills" value={classData.skillCount || 0} />
      <ReviewItem label="Saves" value={arr(classData.savingThrows).join(', ') || 'None listed'} />
    </div>
    <Skills backgroundSkills={backgroundSkills} skillOptions={skillOptions} selected={selectedSkills} target={skillTarget} toggle={toggleSkill} />
    {hasSpells && <Spells spellSearch={spellSearch} setSpellSearch={setSpellSearch} spellReq={spellReq} visibleCantrips={visibleCantrips} visibleSpells={visibleSpells} selectedCantrips={selectedCantrips} selectedSpells={selectedSpells} toggleCantrip={toggleCantrip} toggleSpell={toggleSpell} />}
  </>;
}

function Background({ draft, update, featRequired, originFeat }) {
  const backgroundData = BACKGROUNDS[draft.background] || {};
  return <>
    <Title icon={BookOpen} title="Choose background" text="Pick where your character came from. Origin feat lives here for 2024 characters." />
    <div className="full-creator-form-grid">
      <label><span>Background</span><select value={draft.background} onChange={(event) => update({ background: event.target.value, extraFeat: 'None' })}>{Object.keys(BACKGROUNDS).map((name) => <option key={name}>{name}</option>)}</select></label>
      <label><span>Alignment</span><select value={draft.alignment} onChange={(event) => update({ alignment: event.target.value })}>{['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'].map((name) => <option key={name}>{name}</option>)}</select></label>
      {featRequired && <label><span>Origin feat</span><select value={draft.extraFeat} onChange={(event) => update({ extraFeat: event.target.value })}>{['None', ...getFeatsForRuleset({ edition: draft.edition, category: 'origin' }).map(feat => feat.name)].map((name) => <option key={name}>{name}</option>)}</select></label>}
    </div>
    {featRequired && <div className="full-creator-auto-box"><strong>Suggested origin feat</strong><span>{originFeat || 'Choose one above'}</span></div>}
    <div className="full-creator-review-grid">
      <ReviewItem label="Skills" value={arr(backgroundData.skillProficiencies).join(', ') || 'None listed'} />
      <ReviewItem label="Tools" value={arr(backgroundData.toolProficiencies).join(', ') || 'None listed'} />
      <ReviewItem label="Equipment" value={arr(backgroundData.equipment).slice(0, 2).join(', ') || 'None listed'} />
    </div>
  </>;
}

function Abilities({ draft, update, setScore, finalScores, floatingBudget, floatingSpent, toggleFloating }) {
  return <>
    <Title icon={Dices} title="Ability scores" text="Use the standard array for now, or manually adjust each score." />
    <button type="button" onClick={() => update({ scores: STANDARD })}>Reset to standard array</button>
    <div className="full-creator-score-editor">{ABILITIES.map((ability) => <label key={ability}><span>{LABELS[ability]}</span><input type="number" min="3" max="20" value={draft.scores[ability]} onChange={(event) => setScore(ability, event.target.value)} /><strong>{finalScores[ability]}</strong><em>{fmt(mod(finalScores[ability]))}</em></label>)}</div>
    {floatingBudget > 0 && <Choice title={`Floating species bonus ${floatingSpent}/${floatingBudget}`}>{ABILITIES.map((ability) => <Chip key={ability} active={Boolean(draft.floatingAsi[ability])} onClick={() => toggleFloating(ability)}>{LABELS[ability]} +1</Chip>)}</Choice>}
  </>;
}

function Skills({ backgroundSkills, skillOptions, selected, target, toggle }) {
  return <>
    <div className="full-creator-auto-box"><strong>Background skills</strong><span>{backgroundSkills.length ? backgroundSkills.join(', ') : 'None listed'}</span></div>
    <Choice title={`Class skills ${selected.length}/${target}`}>{skillOptions.map((skill) => <Chip key={skill} active={selected.includes(skill)} onClick={() => toggle(skill)}>{skill}</Chip>)}</Choice>
  </>;
}

function Spells({ spellSearch, setSpellSearch, spellReq, visibleCantrips, visibleSpells, selectedCantrips, selectedSpells, toggleCantrip, toggleSpell }) {
  return <>
    <Choice title={`Cantrips ${selectedCantrips.length}/${spellReq.cantrips}`}>
      <input className="full-creator-search" value={spellSearch} onChange={(event) => setSpellSearch(event.target.value)} placeholder="Search spells, damage, healing…" />
      {spellReq.cantrips > 0 && (visibleCantrips.length ? visibleCantrips.map((spell) => <SpellChip key={spellName(spell)} spell={spell} active={selectedCantrips.includes(spellName(spell))} onClick={() => toggleCantrip(spellName(spell))} />) : <p className="full-creator-note">No cantrips match this search.</p>)}
    </Choice>
    {spellReq.spells > 0 && <Choice title={`Level 1 spells ${selectedSpells.length}/${spellReq.spells}`}>{visibleSpells.length ? visibleSpells.map((spell) => <SpellChip key={spellName(spell)} spell={spell} active={selectedSpells.includes(spellName(spell))} onClick={() => toggleSpell(spellName(spell))} />) : <p className="full-creator-note">No spells match this search.</p>}</Choice>}
  </>;
}

function SpellChip({ spell, active, onClick }) {
  const entry = toSpellEntry(spell, spell?.level || 0);
  return <button type="button" className={`full-creator-spell-chip ${active ? 'active' : ''}`} onClick={onClick}><strong>{entry.name}</strong><span>{entry.school || 'Spell'}</span><em>{entry.description || ''}</em></button>;
}

function Equipment({ draft, update, equipment, startingGoldRule, startingGold }) {
  const equipmentMode = normalizeEquipmentMode(draft.equipmentMode);
  const is2024 = draft.edition === '2024';
  return <>
    <Title icon={Backpack} title="Equipment" text={is2024 ? 'Choose starting equipment or the fixed 2024 starting gold option.' : 'Choose starting equipment or roll starting gold by class.'} />
    <div className="full-creator-equipment-modes">
      <button type="button" className={equipmentMode === 'equipment' ? 'active' : ''} onClick={() => update({ equipmentMode: 'equipment', customEquipment: '', rolledStartingGold: 0 })}>Starting equipment</button>
      <button type="button" className={equipmentMode === 'gold' ? 'active' : ''} onClick={() => update({ equipmentMode: 'gold', customEquipment: '', rolledStartingGold: is2024 ? STARTING_GOLD_2024.average : 0 })}>{is2024 ? 'Starting gold' : 'Roll starting gold'}</button>
    </div>
    {equipmentMode === 'gold' ? (
      <>
        {!startingGoldRule.fixed && <button type="button" onClick={() => update({ rolledStartingGold: rollStartingGold(startingGoldRule) })}>Roll {startingGoldRule.formula}</button>}
        <div className="full-creator-review-grid">
          <ReviewItem label={startingGoldRule.fixed ? 'Gold option' : 'Gold roll'} value={startingGoldRule.formula} />
          <ReviewItem label="Saved gold" value={startingGold ? `${startingGold} gp` : 'Not rolled yet'} />
        </div>
      </>
    ) : (
      <div className="full-creator-equipment-list">{equipment.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
    )}
  </>;
}

function Review({ draft, update, hp, ac, skills, feat, spellCount, hasSpells, report, journeyPercent }) {
  return <>
    <Title icon={BookOpen} title="Review and save" text={journeyPercent === 100 ? 'Check the saved sheet details, add optional story notes, then save.' : 'Move through the previous sections before saving.'} />
    <ReadinessPanel report={report} />
    <div className="full-creator-form-grid">
      <label><span>Personality trait</span><input value={draft.personalityTrait} onChange={(event) => update({ personalityTrait: event.target.value })} /></label>
      <label><span>Ideal</span><input value={draft.ideal} onChange={(event) => update({ ideal: event.target.value })} /></label>
      <label><span>Bond</span><input value={draft.bond} onChange={(event) => update({ bond: event.target.value })} /></label>
      <label><span>Flaw</span><input value={draft.flaw} onChange={(event) => update({ flaw: event.target.value })} /></label>
    </div>
    <label className="full-creator-wide-label"><span>Backstory notes</span><textarea value={draft.backstory} onChange={(event) => update({ backstory: event.target.value })} /></label>
    <div className="full-creator-review-grid"><ReviewItem label="HP" value={hp} /><ReviewItem label="AC" value={ac} /><ReviewItem label="Skills" value={skills.length} /><ReviewItem label="Feat" value={feat || 'None'} /><ReviewItem label="Equipment" value={normalizeEquipmentMode(draft.equipmentMode) === 'gold' ? 'starting gold' : 'starting equipment'} /><ReviewItem label="Spells" value={hasSpells ? spellCount : 'None'} /></div>
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
