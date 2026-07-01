import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import CleanCombatTab from '@/components/clean-sheet/CleanCombatTab';
import CleanInventoryTab from '@/components/clean-sheet/CleanInventoryTab';
import CleanLoreTab from '@/components/clean-sheet/CleanLoreTab';
import CleanNotesTab from '@/components/clean-sheet/CleanNotesTab';
import CleanSheetCompactStatus from '@/components/clean-sheet/CleanSheetCompactStatus';
import CleanSheetFeaturesTab from '@/components/clean-sheet/CleanSheetFeaturesTab';
import CleanSheetHeader from '@/components/clean-sheet/CleanSheetHeader';
import CleanSheetOverviewTab from '@/components/clean-sheet/CleanSheetOverviewTab';
import CleanSheetPlayTools from '@/components/clean-sheet/CleanSheetPlayTools';
import CleanSheetTabs from '@/components/clean-sheet/CleanSheetTabs';
import CleanSpellsTab from '@/components/clean-sheet/CleanSpellsTab';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import LevelUpWizard from '@/components/LevelUpWizard';
import RookPlayerHelperTab from '@/components/clean-sheet/RookPlayerHelperTab';
import { deriveArmorClass } from '@/data/characterCombatDerivations';
import { getClassFeatures } from '@/data/classFeatures';
import { restoreClassResources } from '@/data/classResourceRules';
import {
  PASSIVE_SKILLS,
  SHEET_TABS,
  calculateHpDamage,
  calculateHpHealing,
  clampDeathCount,
  featureTypeLabel,
  getCurrentHp,
  getMaxHp,
  getTempHp,
  mod,
  parseHitDie,
  rollD20,
  rollHitDie,
  toArray,
} from '@/components/clean-sheet/cleanSheetUtils';
import '@/components/clean-sheet/CleanCharacterSheetPolish.css';
import '@/components/clean-sheet/CleanSheetListPolish.css';

export default function CleanCharacterSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingHp, setSavingHp] = useState(false);
  const [savingTempHp, setSavingTempHp] = useState(false);
  const [savingQuickState, setSavingQuickState] = useState(false);
  const [hpAmount, setHpAmount] = useState(1);
  const [tempHpAmount, setTempHpAmount] = useState(1);
  const [activeTab, setActiveTab] = useState('stats');
  const [rollBurst, setRollBurst] = useState(null);
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  const [rollHistory, setRollHistory] = useState([]);
  const [showRollHistory, setShowRollHistory] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [rollMode, setRollMode] = useState('normal');
  const [rollBonus, setRollBonus] = useState(0);
  const [concentrationInput, setConcentrationInput] = useState('');
  const [showConcentrationInput, setShowConcentrationInput] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/characters/${characterId}`);
        if (!cancelled) setCharacter(response.data);
      } catch (error) {
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load character');
        if (!cancelled) setCharacter(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCharacter();
    return () => { cancelled = true; };
  }, [characterId]);

  useEffect(() => {
    if (!rollBurst) return undefined;
    const timeout = setTimeout(() => setRollBurst(null), 9000);
    return () => clearTimeout(timeout);
  }, [rollBurst]);

  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = getTempHp(character);
  const dexMod = mod(character?.dexterity);
  const conMod = mod(character?.constitution);
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
  const ac = deriveArmorClass(character);
  const speed = Number(character?.speed ?? 30);
  const skillProficiencies = character?.skill_proficiencies || [];
  const saveProficiencies = character?.saving_throw_proficiencies || [];
  const activeConditions = character?.conditions || [];
  const exhaustionLevel = Number(character?.exhaustion_level || 0);
  const deathSaveSuccesses = clampDeathCount(character?.death_saves_successes);
  const deathSaveFailures = clampDeathCount(character?.death_saves_failures);
  const hasInspiration = Boolean(character?.inspiration || character?.has_inspiration);
  const concentratingOn = character?.concentrating_on || character?.concentration || null;
  const concentratingName = concentratingOn ? (typeof concentratingOn === 'string' ? concentratingOn : concentratingOn?.name || String(concentratingOn)) : null;
  const hitDice = character?.hit_dice || `${character?.level || 1}d8`;
  const hitDieInfo = parseHitDie(hitDice);
  const hitDiceRemaining = Number(character?.hit_dice_remaining ?? character?.level ?? hitDieInfo.total) || 0;
  const showDeathSaves = currentHp <= 0 || deathSaveSuccesses > 0 || deathSaveFailures > 0;

  const passiveScores = useMemo(() => {
    return PASSIVE_SKILLS.map(([skill, ability]) => {
      const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
      return [skill, 10 + mod(character?.[ability]) + (proficient ? proficiencyBonus : 0)];
    });
  }, [character, proficiencyBonus, skillProficiencies]);

  const rulesEdition = String(character?.rules_edition || character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';

  const classFeatureSummary = useMemo(() => {
    const className = character?.character_class;
    const level = Number(character?.level || 1);
    const tableFeatures = getClassFeatures(className, level, rulesEdition);
    const characterFeatures = toArray(character?.features || character?.class_features).map((feature, index) => (
      typeof feature === 'string'
        ? { name: feature, description: 'Saved on this character sheet.', type: 'passive', level: null, source: 'sheet' }
        : { ...feature, name: feature?.name || `Feature ${index + 1}`, source: 'sheet' }
    ));
    const merged = [...tableFeatures, ...characterFeatures];
    const seen = new Set();
    return merged
      .filter(feature => feature?.name && !feature.isChoice)
      .filter(feature => {
        const key = `${feature.name}-${feature.level || ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
  }, [character, rulesEdition]);

  const actionEconomyGroups = useMemo(() => {
    const groups = {
      Action: [],
      'Bonus action': [],
      Reaction: [],
      Passive: [],
    };
    classFeatureSummary.forEach(feature => {
      const label = featureTypeLabel(feature.type);
      if (label === 'Action' || label === 'Special') groups.Action.push(feature);
      else if (label === 'Bonus action') groups['Bonus action'].push(feature);
      else if (label === 'Reaction') groups.Reaction.push(feature);
      else groups.Passive.push(feature);
    });
    return groups;
  }, [classFeatureSummary]);

  const proficiencySummary = useMemo(() => ([
    ['Armor', toArray(character?.armor_proficiencies || character?.proficiencies?.armor)],
    ['Weapons', toArray(character?.weapon_proficiencies || character?.proficiencies?.weapons)],
    ['Tools', toArray(character?.tool_proficiencies || character?.proficiencies?.tools)],
    ['Languages', toArray(character?.languages || character?.proficiencies?.languages)],
  ]), [character]);

  const getSafeAmount = (value) => Math.max(1, Math.min(999, Number(value) || 1));
  const getRollBonus = () => Number(rollBonus) || 0;

  const patchCharacter = async (updates, options = {}) => {
    const previous = character;
    setCharacter(prev => (prev ? { ...prev, ...updates } : prev));
    try {
      const response = await apiClient.patch(`/characters/${characterId}`, updates);
      if (response?.data && typeof response.data === 'object') {
        setCharacter(response.data.character || response.data);
      }
      if (options.success) toast.success(options.success);
      return true;
    } catch (error) {
      setCharacter(previous);
      toast.error(error?.formattedDetail || error?.response?.data?.detail || options.error || 'Could not save character update');
      return false;
    }
  };

  const updateHp = async (delta) => {
    if (!character || savingHp) return;

    const amount = Math.abs(Number(delta) || 0);
    const result = delta < 0
      ? calculateHpDamage({ currentHp, tempHp, maxHp, amount })
      : calculateHpHealing({ currentHp, maxHp, amount });

    const nextHp = result.current_hit_points;
    const updates = {
      current_hit_points: nextHp,
    };

    if (delta < 0) {
      updates.temporary_hit_points = result.temporary_hit_points;
      updates.temp_hp = result.temp_hp;
    }

    if (nextHp > 0 && (deathSaveSuccesses || deathSaveFailures)) {
      updates.death_saves_successes = 0;
      updates.death_saves_failures = 0;
    }

    setSavingHp(true);
    await patchCharacter(updates, { error: 'Could not save HP' });
    setSavingHp(false);

    if (delta < 0 && character?.concentrating_on && result.hpDamage > 0) {
      const damageTaken = result.hpDamage;
      const concentrationDC = Math.max(10, Math.floor(damageTaken / 2));
      const spellName = character.concentrating_on?.name || character.concentrating_on;
      toast.warning(`Concentration check! Concentrating on ${spellName} — DC ${concentrationDC} Constitution save`, { duration: 8000 });
    }
  };

  const updateTempHp = async (delta) => {
    if (!character || savingTempHp) return;
    const nextTempHp = Math.max(0, tempHp + delta);
    setSavingTempHp(true);
    await patchCharacter(
      { temporary_hit_points: nextTempHp, temp_hp: nextTempHp },
      { error: 'Could not save temporary HP' }
    );
    setSavingTempHp(false);
  };

  const makeRoll = (label, modifier) => {
    const totalModifier = (Number(modifier) || 0) + getRollBonus();
    const result = rollD20(totalModifier, rollMode);
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      label,
      ...result,
      baseModifier: Number(modifier) || 0,
      customModifier: getRollBonus(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setRollBurst(entry);
    setRollHistory(prev => [entry, ...prev].slice(0, 12));
  };

  const updateCharacterLocal = (updates) => {
    setCharacter(prev => (prev ? { ...prev, ...updates } : prev));
  };

  const toggleInspiration = async () => {
    if (savingQuickState) return;
    setSavingQuickState(true);
    await patchCharacter(
      { inspiration: !hasInspiration, has_inspiration: !hasInspiration },
      { success: !hasInspiration ? 'Inspiration gained' : 'Inspiration removed', error: 'Could not save inspiration' }
    );
    setSavingQuickState(false);
  };

  const toggleCondition = async (condition) => {
    if (savingQuickState) return;
    const nextConditions = activeConditions.includes(condition)
      ? activeConditions.filter(c => c !== condition)
      : [...activeConditions, condition];
    setSavingQuickState(true);
    await patchCharacter(
      { conditions: nextConditions },
      { error: 'Could not save condition' }
    );
    setSavingQuickState(false);
  };

  const setDeathSaveCount = async (type, index) => {
    const current = type === 'success' ? deathSaveSuccesses : deathSaveFailures;
    const next = current === index + 1 ? index : index + 1;
    const updates = type === 'success'
      ? { death_saves_successes: next }
      : { death_saves_failures: next };
    await patchCharacter(updates, { error: 'Could not save death save' });
  };

  const resetDeathSaves = async () => {
    await patchCharacter(
      { death_saves_successes: 0, death_saves_failures: 0 },
      { success: 'Death saves reset', error: 'Could not reset death saves' }
    );
  };

  const rollDeathSave = async () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const entry = {
      id: `${Date.now()}-death-save`,
      label: 'Death Save',
      d20: roll,
      modifier: 0,
      total: roll,
      mode: 'normal',
      allRolls: [roll],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setRollBurst(entry;
