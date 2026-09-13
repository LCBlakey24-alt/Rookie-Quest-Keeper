import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Dices,
  Server,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import { CLASS_FEATURES } from '@/data/classFeatures';
import {
  CANTRIPS_KNOWN,
  SPELLCASTING_CLASSES,
  getSpellsForClass,
} from '@/data/spellDatabase';
import { classHasEditionSpellcasting, getEditionMaxSpellLevel } from '@/data/editionSpellSlotRules';
import {
  getKnownSpellTarget,
  getPreparedSpellCapacity,
  getSpellSelectionMode,
  getWizardSpellbookTarget,
} from '@/data/spellPreparationRules';
import { ABILITIES, ABILITY_SHORT, ASI_LEVELS, HIT_DICE } from '@/data/levelUpData';
import {
  needsSubclassChoice,
  normaliseClassLevels,
  resolveExistingClassName,
  subclassForClass,
} from '@/data/levelUpProgressionRules';
import { getFeatsForRuleset } from '@/data/rules/feats/featRegistry';
import { CLASSES, MULTICLASS_REQUIREMENTS, getMulticlassOptions } from '@/data/characterRules5e';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "New Rocker", Georgia, serif)';

const theme = {
  bg: 'var(--rq-bg-main)',
  panel: 'var(--rq-bg-panel)',
  card: 'var(--rq-card)',
  accent: 'var(--rq-accent-primary)',
  accentSoft: 'var(--rq-accent-soft)',
  secondary: 'var(--rq-secondary)',
  text: 'var(--rq-text-primary)',
  line: 'var(--rq-border-default)',
  strongLine: 'var(--rq-border-strong)',
};

const normaliseName = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const displayClass = (value = '') => {
  const raw = String(value || '').trim();
  return raw ? raw.slice(0, 1).toUpperCase() + raw.slice(1) : 'Fighter';
};
const abilityScore = (character, ability) => Number(character?.[ability] || 10);
const abilityMod = (score) => Math.floor((Number(score || 10) - 10) / 2);
const abilityLabel = (ability) => ABILITY_SHORT[ability] || String(ability || '').slice(0, 3).toUpperCase();
const editionFor = (character) => String(character?.edition || character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';

function statsFor(character) {
  return {
    strength: abilityScore(character, 'strength'),
    dexterity: abilityScore(character, 'dexterity'),
    constitution: abilityScore(character, 'constitution'),
    intelligence: abilityScore(character, 'intelligence'),
    wisdom: abilityScore(character, 'wisdom'),
    charisma: abilityScore(character, 'charisma'),
  };
}

function requirementText(className) {
  const req = MULTICLASS_REQUIREMENTS[className];
  if (!req) return 'No requirement data.';
  if (Array.isArray(req.or)) {
    return req.or.map((option) => Object.entries(option).map(([ability, score]) => `${abilityLabel(ability)} ${score}`).join(' and ')).join(' or ');
  }
  return Object.entries(req).map(([ability, score]) => `${abilityLabel(ability)} ${score}`).join(' and ');
}

function lastKnownCount(table = {}, level = 1) {
  let count = 0;
  Object.entries(table || {}).forEach(([rawLevel, rawCount]) => {
    if (Number(rawLevel) <= Number(level)) count = Number(rawCount) || count;
  });
  return count;
}

function localGain(table = {}, before = 0, after = before + 1) {
  return Math.max(0, lastKnownCount(table, after) - lastKnownCount(table, before));
}

function localSubclassOptions(className) {
  const classData = CLASS_FEATURES[String(className || '').toLowerCase()];
  return Object.entries(classData?.subclasses || {}).map(([key, subclass]) => ({
    id: key,
    name: subclass?.name || key,
    description: subclass?.description || 'Subclass option from local rules data.',
  }));
}

function normaliseSubclassOptions(preflight, className) {
  const remote = preflight?.subclass_options || [];
  if (remote.length) {
    return remote.map((option) => typeof option === 'object'
      ? { id: option.id || option.name, name: option.name || option.id, description: option.description || '' }
      : { id: String(option), name: String(option), description: '' });
  }
  return localSubclassOptions(className);
}

function normaliseFeatOptions(preflight, character) {
  const edition = preflight?.edition || editionFor(character);
  const local = getFeatsForRuleset({ edition, category: 'general' });
  const localByName = new Map(local.map((feat) => [normaliseName(feat.name), feat]));
  const remote = preflight?.feat_options || preflight?.general_feat_options || [];
  if (!remote.length) return local;
  return remote.map((option) => {
    if (typeof option === 'object') return option;
    return localByName.get(normaliseName(option)) || { name: String(option), description: 'Server-approved feat option.' };
  });
}

function spellListFor(className, maxLevel) {
  const data = getSpellsForClass(className) || {};
  const cantrips = data.cantrips || [];
  const spells = [];
  for (let level = 1; level <= Math.min(9, Number(maxLevel || 0)); level += 1) {
    (data[level] || []).forEach((spell) => spells.push({ ...spell, level }));
  }
  return { cantrips, spells };
}

function namesFrom(list) {
  return (Array.isArray(list) ? list : []).map((item) => normaliseName(item?.name || item)).filter(Boolean);
}

function spellChoiceLabel(mode, count) {
  if (mode === 'spellbook') return `Spellbook spells · choose ${count}`;
  if (mode === 'prepared') return `Prepared spells · choose ${count}`;
  return `Known spells · choose ${count}`;
}

function spellChoiceSummary(mode, cantripGain, spellGain) {
  const pieces = [];
  if (cantripGain > 0) pieces.push(`${cantripGain} cantrip${cantripGain === 1 ? '' : 's'}`);
  if (spellGain > 0) {
    const noun = mode === 'spellbook' ? 'spellbook spell' : mode === 'prepared' ? 'prepared spell' : 'known spell';
    pieces.push(`${spellGain} ${noun}${spellGain === 1 ? '' : 's'}`);
  }
  return pieces.length ? `${pieces.join(' and ')} to choose.` : 'No new spell-list choices required at this class level.';
}

export default function LevelUpWizard({ character, isOpen, onClose, onLevelUp }) {
  const currentLevel = Number(character?.level || 1);
  const newLevel = currentLevel + 1;
  const classLevels = useMemo(() => normaliseClassLevels(character), [character]);
  const currentClasses = useMemo(() => Object.keys(classLevels), [classLevels]);
  const primaryClass = resolveExistingClassName(character, character?.character_class);
  const characterStats = useMemo(() => statsFor(character), [character]);
  const multiclassOptions = useMemo(() => (
    getMulticlassOptions(characterStats, currentClasses)
      .filter((className) => !currentClasses.some((owned) => normaliseName(owned) === normaliseName(className)))
  ), [characterStats, currentClasses]);

  const [mode, setMode] = useState('existing');
  const [existingClass, setExistingClass] = useState(primaryClass);
  const [newClass, setNewClass] = useState('');
  const [preflight, setPreflight] = useState(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [hpMethod, setHpMethod] = useState('average');
  const [hpRoll, setHpRoll] = useState(null);
  const [manualHpRoll, setManualHpRoll] = useState('');
  const [selectedSubclass, setSelectedSubclass] = useState('');
  const [choiceType, setChoiceType] = useState('');
  const [asiChoices, setAsiChoices] = useState({ ability1: '', ability2: '' });
  const [selectedFeat, setSelectedFeat] = useState(null);
  const [selectedNewSpells, setSelectedNewSpells] = useState([]);
  const [selectedNewCantrips, setSelectedNewCantrips] = useState([]);
  const [saving, setSaving] = useState(false);

  const isMulticlass = mode === 'new';
  const characterClass = displayClass(isMulticlass ? (newClass || multiclassOptions[0] || '') : existingClass);
  const classLevelBefore = isMulticlass ? 0 : Number(classLevels[characterClass] || 0);
  const classLevelAfter = classLevelBefore + 1;
  const edition = preflight?.edition || editionFor(character);
  const existingSubclass = isMulticlass ? '' : subclassForClass(character, characterClass);

  useEffect(() => {
    if (!isOpen) return;
    setMode('existing');
    setExistingClass(primaryClass);
    setNewClass('');
    setStepIndex(0);
  }, [isOpen, primaryClass]);

  useEffect(() => {
    if (mode === 'new' && !newClass && multiclassOptions.length) setNewClass(multiclassOptions[0]);
  }, [mode, newClass, multiclassOptions]);

  useEffect(() => {
    setSelectedSubclass(isMulticlass ? '' : subclassForClass(character, characterClass));
    setChoiceType('');
    setAsiChoices({ ability1: '', ability2: '' });
    setSelectedFeat(null);
    setSelectedNewSpells([]);
    setSelectedNewCantrips([]);
    setHpMethod('average');
    setHpRoll(null);
    setManualHpRoll('');
    setStepIndex(0);
  }, [characterClass, isMulticlass, character]);

  useEffect(() => {
    if (!isOpen || !character?.id || isMulticlass || !characterClass) {
      if (isMulticlass) {
        setPreflight(null);
        setPreflightError('');
        setPreflightLoading(false);
      }
      return undefined;
    }

    let cancelled = false;
    setPreflight(null);
    setPreflightError('');
    setPreflightLoading(true);
    apiClient.get(`/characters/${character.id}/level-up-options`, {
      params: { target_level: newLevel, target_class: characterClass },
    }).then((response) => {
      if (!cancelled) setPreflight(response.data);
    }).catch((error) => {
      if (!cancelled) {
        setPreflightError(error?.formattedDetail || error?.response?.data?.detail || 'Server progression check failed. Local rules will be used.');
      }
    }).finally(() => {
      if (!cancelled) setPreflightLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, character?.id, isMulticlass, characterClass, newLevel]);

  if (!isOpen || !character) return null;

  const hitDie = Number((!isMulticlass && preflight?.hit_die) || HIT_DICE[characterClass] || CLASSES[characterClass]?.hitDie || 8);
  const conMod = abilityMod(character.constitution);
  const averageDie = Math.floor(hitDie / 2) + 1;
  const averageHp = Math.max(1, averageDie + conMod);
  const manualHpRollValue = Number(manualHpRoll);
  const validManualRoll = Number.isInteger(manualHpRollValue) && manualHpRollValue >= 1 && manualHpRollValue <= hitDie;
  const hpGain = hpMethod === 'roll'
    ? (hpRoll ? Math.max(1, hpRoll + conMod) : null)
    : hpMethod === 'manual'
      ? (validManualRoll ? Math.max(1, manualHpRollValue + conMod) : null)
      : averageHp;

  const localNeedsSubclass = needsSubclassChoice({ character, className: characterClass, classLevelAfter, edition });
  const needsSubclass = isMulticlass
    ? localNeedsSubclass
    : preflight?.can_choose_subclass !== undefined ? Boolean(preflight.can_choose_subclass) : localNeedsSubclass;
  const subclassOptions = normaliseSubclassOptions(isMulticlass ? null : preflight, characterClass);
  const castingSubclass = selectedSubclass || existingSubclass;
  const castingCharacter = {
    ...character,
    character_class: characterClass,
    subclass: castingSubclass,
    level: classLevelAfter,
    class_levels: { [characterClass]: classLevelAfter },
    classes: [{ name: characterClass, level: classLevelAfter, subclass: castingSubclass }],
    rules_edition: edition,
  };
  const isSpellcaster = classHasEditionSpellcasting(castingCharacter, characterClass, classLevelAfter);
  const maxSpellLevel = isSpellcaster
    ? getEditionMaxSpellLevel(castingCharacter, characterClass, classLevelAfter)
    : 0;
  const { cantrips, spells } = spellListFor(characterClass, maxSpellLevel);
  const localCantripGain = localGain(CANTRIPS_KNOWN[characterClass] || {}, classLevelBefore, classLevelAfter);
  const cantripGain = !isMulticlass && preflight?.cantrips_to_learn !== undefined
    ? Number(preflight.cantrips_to_learn || 0)
    : localCantripGain;

  const localSelectionMode = getSpellSelectionMode({ className: characterClass, edition });
  const spellChoiceMode = !isMulticlass && preflight?.spell_selection_mode
    ? preflight.spell_selection_mode
    : localSelectionMode;
  const localKnownBefore = getKnownSpellTarget({ className: characterClass, level: classLevelBefore, edition });
  const localKnownAfter = getKnownSpellTarget({ className: characterClass, level: classLevelAfter, edition });
  const localKnownGain = Math.max(0, localKnownAfter - localKnownBefore);
  const localSpellbookGain = characterClass === 'Wizard'
    ? Math.max(0, getWizardSpellbookTarget(classLevelAfter) - getWizardSpellbookTarget(classLevelBefore))
    : 0;
  const castingAbility = SPELLCASTING_CLASSES[characterClass]?.ability;
  const castingAbilityScore = castingAbility ? abilityScore(character, castingAbility) : 10;
  const localPreparedBefore = getPreparedSpellCapacity({
    className: characterClass,
    level: classLevelBefore,
    edition,
    abilityScore: castingAbilityScore,
  });
  const localPreparedAfter = getPreparedSpellCapacity({
    className: characterClass,
    level: classLevelAfter,
    edition,
    abilityScore: castingAbilityScore,
  });
  const localPreparedGain = Math.max(0, localPreparedAfter - localPreparedBefore);
  const preparedCapacityBefore = !isMulticlass && preflight?.prepared_spell_capacity_before !== undefined
    ? Number(preflight.prepared_spell_capacity_before || 0)
    : localPreparedBefore;
  const preparedCapacityAfter = !isMulticlass && preflight?.prepared_spell_capacity !== undefined
    ? Number(preflight.prepared_spell_capacity || 0)
    : localPreparedAfter;
  const preparedCapacityGain = !isMulticlass && preflight?.prepared_spell_capacity_gain !== undefined
    ? Number(preflight.prepared_spell_capacity_gain || 0)
    : localPreparedGain;
  const permanentSpellGain = !isMulticlass && preflight?.spells_to_learn !== undefined
    ? Number(preflight.spells_to_learn || 0)
    : spellChoiceMode === 'spellbook' ? localSpellbookGain : localKnownGain;
  const spellChoiceGain = spellChoiceMode === 'prepared' ? preparedCapacityGain : permanentSpellGain;
  const hasSpellChoices = isSpellcaster && (cantripGain > 0 || spellChoiceGain > 0);
  const preparedCapacityNote = spellChoiceMode === 'spellbook' && preparedCapacityAfter > preparedCapacityBefore;

  const localAsiLevels = ASI_LEVELS[characterClass] || ASI_LEVELS.default || [];
  const localIsAsiLevel = localAsiLevels.includes(classLevelAfter);
  const isAsiLevel = isMulticlass
    ? localIsAsiLevel
    : preflight?.is_asi_level !== undefined ? Boolean(preflight.is_asi_level) : localIsAsiLevel;
  const featOptions = normaliseFeatOptions(preflight, character);
  const existingSpellNames = new Set(namesFrom([...(character.spells_known || []), ...(character.spells_prepared || []), ...(character.spellbook || [])]));
  const existingCantripNames = new Set(namesFrom(character.cantrips_known || character.cantrips || []));

  const steps = [
    { id: 'class', label: 'Class' },
    { id: 'overview', label: 'Check' },
    { id: 'hp', label: 'HP' },
    ...(needsSubclass ? [{ id: 'subclass', label: 'Subclass' }] : []),
    ...(hasSpellChoices ? [{ id: 'spells', label: 'Spells' }] : []),
    ...(isAsiLevel ? [{ id: 'asi', label: 'ASI / Feat' }] : []),
    { id: 'confirm', label: 'Confirm' },
  ];
  const activeStep = steps[Math.min(stepIndex, steps.length - 1)]?.id || 'class';

  const toggleSpell = (spell, setter, selected, limit) => {
    setter((previous) => {
      const exists = previous.some((entry) => normaliseName(entry.name) === normaliseName(spell.name));
      if (exists) return previous.filter((entry) => normaliseName(entry.name) !== normaliseName(spell.name));
      if (previous.length >= limit) return previous;
      return [...previous, selected];
    });
  };

  const canProceed = () => {
    if (activeStep === 'class') return isMulticlass ? Boolean(characterClass) : Boolean(existingClass);
    if (activeStep === 'overview') return isMulticlass || !preflightLoading;
    if (activeStep === 'hp') return hpMethod === 'average' || (hpMethod === 'roll' && hpRoll) || (hpMethod === 'manual' && validManualRoll);
    if (activeStep === 'subclass') return Boolean(selectedSubclass);
    if (activeStep === 'spells') return selectedNewCantrips.length >= cantripGain && selectedNewSpells.length >= spellChoiceGain;
    if (activeStep === 'asi') {
      if (choiceType === 'asi') return Boolean(asiChoices.ability1 && asiChoices.ability2);
      if (choiceType === 'feat') return Boolean(selectedFeat);
      return false;
    }
    return true;
  };

  const submitLevelUp = async () => {
    if (!hpGain || saving) return;
    const payload = {
      new_level: newLevel,
      new_class: characterClass,
      hp_method: hpMethod,
      hp_roll: hpMethod === 'roll' ? hpRoll : hpMethod === 'manual' ? manualHpRollValue : null,
    };
    if (isMulticlass) payload.multiclass = true;
    if (needsSubclass && selectedSubclass) payload.subclass = selectedSubclass;
    if (isAsiLevel) {
      payload.choice_type = choiceType || 'standard';
      if (choiceType === 'asi') payload.asi_choices = asiChoices;
      if (choiceType === 'feat' && selectedFeat) {
        payload.feat_choice = { name: selectedFeat.name, description: selectedFeat.description || '' };
      }
    }
    if (selectedNewSpells.length) payload.new_spells = selectedNewSpells.map((spell) => ({ name: spell.name, level: spell.level || 1, school: spell.school || '' }));
    if (selectedNewCantrips.length) payload.new_cantrips = selectedNewCantrips.map((spell) => ({ name: spell.name, level: 0, school: spell.school || '' }));

    try {
      setSaving(true);
      const endpoint = isMulticlass ? `/characters/${character.id}/multiclass` : `/characters/${character.id}/level-up`;
      await apiClient.post(endpoint, payload);
      toast.success(`${character.name} reached level ${newLevel}`, {
        description: `${isMulticlass ? `Added ${characterClass}. ` : `${characterClass} advanced. `}HP increased by ${hpGain}.`,
      });
      onLevelUp?.(newLevel);
      onClose?.();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not level up character');
    } finally {
      setSaving(false);
    }
  };

  const rollHp = () => {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    setHpMethod('roll');
    setHpRoll(roll);
    toast.success(`Rolled ${roll} on d${hitDie}`);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <section style={styles.modal} onClick={(event) => event.stopPropagation()} data-testid="level-up-wizard">
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Character progression</p>
            <h2 style={styles.title}>Level Up</h2>
            <p style={styles.subtitle}>{character.name} · {isMulticlass ? `Add ${characterClass}` : `Advance ${characterClass}`} · Level {currentLevel} → {newLevel}</p>
          </div>
          <button type="button" onClick={onClose} style={styles.iconButton} aria-label="Close level up"><X size={18} /></button>
        </header>

        <nav style={styles.stepRail} aria-label="Level up steps">
          {steps.map((step, index) => (
            <span key={step.id} style={styles.stepPill(index === stepIndex, index < stepIndex)}>
              {index < stepIndex ? <Check size={13} /> : index + 1} {step.label}
            </span>
          ))}
        </nav>

        <div style={styles.body}>
          {activeStep === 'class' && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Choose where this level goes</h3>
              <p style={styles.copy}>A multiclass character can continue any class it already owns, or add a completely new class if the ability requirements are met.</p>

              <div style={styles.choiceGrid}>
                {currentClasses.map((className) => {
                  const active = !isMulticlass && normaliseName(existingClass) === normaliseName(className);
                  return (
                    <button
                      key={className}
                      type="button"
                      onClick={() => { setMode('existing'); setExistingClass(className); }}
                      style={styles.choiceCard(active)}
                    >
                      <strong>Continue {className}</strong>
                      <span>Class level {classLevels[className]} → {Number(classLevels[className]) + 1}</span>
                      {subclassForClass(character, className) && <small>{subclassForClass(character, className)}</small>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  disabled={!multiclassOptions.length}
                  style={styles.choiceCard(isMulticlass, !multiclassOptions.length)}
                >
                  <strong>Add a new class</strong>
                  <span>{multiclassOptions.length ? `${multiclassOptions.length} legal option${multiclassOptions.length === 1 ? '' : 's'}` : 'No legal options from current ability scores'}</span>
                </button>
              </div>

              {isMulticlass && (
                <div style={styles.list}>
                  {multiclassOptions.map((className) => (
                    <button key={className} type="button" onClick={() => setNewClass(className)} style={styles.wideChoice(normaliseName(newClass) === normaliseName(className))}>
                      <strong>{className}</strong>
                      <span>d{HIT_DICE[className] || CLASSES[className]?.hitDie || 8} hit die · {requirementText(className)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeStep === 'overview' && (
            <section style={styles.section}>
              <StatusBanner loading={preflightLoading} checked={Boolean(preflight)} error={preflightError} localOnly={isMulticlass} />
              <div style={styles.summaryGrid}>
                <Summary label="Class" value={characterClass} />
                <Summary label="Total level" value={`${currentLevel} → ${newLevel}`} />
                <Summary label="Class level" value={`${classLevelBefore} → ${classLevelAfter}`} />
                <Summary label="Rules" value={`${edition} rules`} />
                <Summary label="Hit die" value={`d${hitDie}`} />
              </div>
              <div style={styles.checklist}>
                <CheckLine active={needsSubclass} text={needsSubclass ? 'Subclass choice is required at this class level.' : 'No new subclass choice required.'} />
                <CheckLine active={isAsiLevel} text={isAsiLevel ? 'ASI or feat choice is due for this class.' : 'No ASI or feat choice at this class level.'} />
                <CheckLine active={hasSpellChoices} text={spellChoiceSummary(spellChoiceMode, cantripGain, spellChoiceGain)} />
                {preparedCapacityNote && (
                  <CheckLine
                    active
                    text={`Prepared spell capacity increases ${preparedCapacityBefore} → ${preparedCapacityAfter}; choose the active prepared list from the spellbook on the character sheet.`}
                  />
                )}
              </div>
            </section>
          )}

          {activeStep === 'hp' && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Choose hit points</h3>
              <div style={styles.choiceGrid}>
                <button type="button" onClick={() => setHpMethod('average')} style={styles.choiceCard(hpMethod === 'average')}>
                  <strong>Take average</strong><span>{averageDie} {conMod >= 0 ? `+${conMod}` : conMod} CON = +{averageHp} HP</span>
                </button>
                <button type="button" onClick={rollHp} style={styles.choiceCard(hpMethod === 'roll')}>
                  <strong>Roll d{hitDie}</strong><span>{hpRoll ? `Rolled ${hpRoll}; +${Math.max(1, hpRoll + conMod)} HP` : 'Roll digitally.'}</span>
                </button>
                <button type="button" onClick={() => setHpMethod('manual')} style={styles.choiceCard(hpMethod === 'manual')}>
                  <strong>Physical roll</strong><span>Enter your table roll.</span>
                </button>
              </div>
              {hpMethod === 'manual' && (
                <label style={styles.field}>
                  <span>d{hitDie} result</span>
                  <input type="number" min="1" max={hitDie} value={manualHpRoll} onChange={(event) => setManualHpRoll(event.target.value)} style={styles.input} />
                  {manualHpRoll && !validManualRoll && <em style={styles.error}>Enter a whole number from 1 to {hitDie}.</em>}
                </label>
              )}
              <div style={styles.result}><Dices size={18} /> HP gain: <strong>{hpGain ? `+${hpGain}` : 'pending'}</strong></div>
            </section>
          )}

          {activeStep === 'subclass' && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Choose {characterClass} subclass</h3>
              <p style={styles.copy}>This choice belongs specifically to your {characterClass} levels. It will not overwrite a subclass on another class.</p>
              <div style={styles.list}>
                {subclassOptions.map((option) => (
                  <button key={option.id || option.name} type="button" onClick={() => setSelectedSubclass(option.name)} style={styles.wideChoice(normaliseName(selectedSubclass) === normaliseName(option.name))}>
                    <strong>{option.name}</strong><span>{option.description || 'Subclass option.'}</span>
                  </button>
                ))}
                {!subclassOptions.length && (
                  <label style={styles.field}>
                    <span>Subclass name</span>
                    <input value={selectedSubclass} onChange={(event) => setSelectedSubclass(event.target.value)} style={styles.input} placeholder="Enter campaign/homebrew subclass" />
                    <small>Built-in options were not available, so homebrew/campaign names can be entered directly.</small>
                  </label>
                )}
              </div>
            </section>
          )}

          {activeStep === 'spells' && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Choose spell progression</h3>
              {cantripGain > 0 && (
                <SpellPicker
                  title={`Cantrips · choose ${cantripGain}`}
                  spells={cantrips}
                  selected={selectedNewCantrips}
                  existingNames={existingCantripNames}
                  limit={cantripGain}
                  onToggle={(spell) => toggleSpell(spell, setSelectedNewCantrips, { ...spell, level: 0 }, cantripGain)}
                />
              )}
              {spellChoiceGain > 0 && (
                <SpellPicker
                  title={spellChoiceLabel(spellChoiceMode, spellChoiceGain)}
                  spells={spells}
                  selected={selectedNewSpells}
                  existingNames={existingSpellNames}
                  limit={spellChoiceGain}
                  onToggle={(spell) => toggleSpell(spell, setSelectedNewSpells, spell, spellChoiceGain)}
                />
              )}
              {spellChoiceMode === 'prepared' && spellChoiceGain > 0 && (
                <p style={styles.copy}>These choices are saved to this class’s prepared spell list rather than the legacy known-spells list.</p>
              )}
              {spellChoiceMode === 'spellbook' && spellChoiceGain > 0 && (
                <p style={styles.copy}>These spells are added to the Wizard spellbook. Prepared spells remain a separate loadout chosen from that book.</p>
              )}
            </section>
          )}

          {activeStep === 'asi' && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Ability increase or feat</h3>
              <div style={styles.choiceGrid}>
                <button type="button" onClick={() => setChoiceType('asi')} style={styles.choiceCard(choiceType === 'asi')}><strong>Ability Score Improvement</strong><span>Increase two abilities by +1, including the same ability twice up to 20.</span></button>
                <button type="button" onClick={() => setChoiceType('feat')} style={styles.choiceCard(choiceType === 'feat')}><strong>Feat</strong><span>Choose an available general feat.</span></button>
              </div>
              {choiceType === 'asi' && (
                <div style={styles.summaryGrid}>
                  {[1, 2].map((slot) => (
                    <label key={slot} style={styles.field}>
                      <span>Increase {slot}</span>
                      <select value={asiChoices[`ability${slot}`]} onChange={(event) => setAsiChoices((prev) => ({ ...prev, [`ability${slot}`]: event.target.value }))} style={styles.input}>
                        <option value="">Choose ability…</option>
                        {ABILITIES.map((ability) => <option key={ability} value={ability}>{abilityLabel(ability)} · {abilityScore(character, ability)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}
              {choiceType === 'feat' && (
                <div style={styles.list}>
                  {featOptions.map((feat) => (
                    <button key={feat.name} type="button" onClick={() => setSelectedFeat(feat)} style={styles.wideChoice(selectedFeat?.name === feat.name)}>
                      <strong>{feat.name}</strong><span>{feat.description || feat.prereq || 'Available feat.'}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeStep === 'confirm' && (
            <section style={styles.section}>
              <StatusBanner loading={false} checked={Boolean(preflight)} error={preflightError} localOnly={isMulticlass} />
              <h3 style={styles.sectionTitle}>Confirm progression</h3>
              <div style={styles.summaryGrid}>
                <Summary label="Character" value={character.name} />
                <Summary label="Progression" value={isMulticlass ? `Add ${characterClass}` : `Advance ${characterClass}`} />
                <Summary label="Total level" value={`${currentLevel} → ${newLevel}`} />
                <Summary label="Class level" value={`${characterClass} ${classLevelAfter}`} />
                <Summary label="HP" value={`+${hpGain || 0}`} />
                {needsSubclass && <Summary label="Subclass" value={selectedSubclass} />}
                {choiceType === 'feat' && selectedFeat && <Summary label="Feat" value={selectedFeat.name} />}
                {choiceType === 'asi' && <Summary label="ASI" value={`${abilityLabel(asiChoices.ability1)} +1, ${abilityLabel(asiChoices.ability2)} +1`} />}
                {!!selectedNewCantrips.length && <Summary label="Cantrips" value={selectedNewCantrips.map((spell) => spell.name).join(', ')} />}
                {!!selectedNewSpells.length && <Summary label={spellChoiceMode === 'spellbook' ? 'Spellbook' : spellChoiceMode === 'prepared' ? 'Prepared' : 'Spells'} value={selectedNewSpells.map((spell) => spell.name).join(', ')} />}
                {preparedCapacityNote && <Summary label="Prepared capacity" value={`${preparedCapacityBefore} → ${preparedCapacityAfter}`} />}
              </div>
            </section>
          )}
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0 || saving} style={styles.secondaryButton}><ChevronLeft size={16} /> Back</button>
          {activeStep === 'confirm' ? (
            <button type="button" onClick={submitLevelUp} disabled={!canProceed() || saving} style={styles.primaryButton}><Sparkles size={16} /> {saving ? 'Levelling…' : `Confirm Level ${newLevel}`}</button>
          ) : (
            <button type="button" onClick={() => canProceed() && setStepIndex((index) => Math.min(index + 1, steps.length - 1))} disabled={!canProceed()} style={styles.primaryButton}>Next <ChevronRight size={16} /></button>
          )}
        </footer>
      </section>
    </div>
  );
}

function StatusBanner({ loading, checked, error, localOnly }) {
  if (loading) return <div style={styles.status(theme.accent)}><Server size={18} /> Checking this class progression with the server…</div>;
  if (checked) return <div style={styles.status(theme.secondary)}><Server size={18} /> {localOnly ? 'Local preview ready; final rules are checked when you confirm.' : 'This class progression has been checked by the server.'}</div>;
  if (localOnly) return <div style={styles.status(theme.accent)}><Server size={18} /> New-class choices use local requirement checks first; the backend validates the multiclass when you confirm.</div>;
  return <div style={styles.status(theme.accent)}><AlertTriangle size={18} /> {error || 'Using local backup progression data.'}</div>;
}

function Summary({ label, value }) {
  return <div style={styles.summary}><span>{label}</span><strong>{value || '—'}</strong></div>;
}

function CheckLine({ active, text }) {
  return <div style={styles.checkLine(active)}><Check size={15} /> {text}</div>;
}

function SpellPicker({ title, spells, selected, existingNames, limit, onToggle }) {
  return (
    <div style={styles.spellPicker}>
      <div style={styles.pickerHeader}><strong>{title}</strong><span>{selected.length}/{limit}</span></div>
      <div style={styles.spellButtons}>
        {spells.map((spell) => {
          const key = normaliseName(spell.name);
          const alreadyKnown = existingNames.has(key);
          const active = selected.some((entry) => normaliseName(entry.name) === key);
          const blocked = alreadyKnown || (!active && selected.length >= limit);
          return (
            <button key={`${spell.level || 0}-${spell.name}`} type="button" onClick={() => !blocked && onToggle(spell)} disabled={blocked} style={styles.spellButton(active, blocked)} title={alreadyKnown ? 'Already on this character' : ''}>
              {spell.name}{alreadyKnown ? ' · known' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.86)', display: 'grid', placeItems: 'center', padding: 12, fontFamily: fontStack, color: theme.text },
  modal: { width: 'min(920px, 100%)', maxHeight: '94dvh', display: 'grid', gridTemplateRows: 'auto auto minmax(0,1fr) auto', background: theme.panel, border: `1px solid ${theme.line}`, overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 14, padding: '16px 16px 13px', borderBottom: `1px solid ${theme.line}`, background: theme.bg },
  eyebrow: { margin: '0 0 4px', fontSize: 10, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.text },
  title: { margin: 0, fontFamily: titleFont, fontSize: 'clamp(34px,5vw,56px)', lineHeight: .92, color: theme.text },
  subtitle: { margin: '7px 0 0', fontSize: 13, color: theme.text },
  iconButton: { width: 38, height: 38, display: 'grid', placeItems: 'center', border: `1px solid ${theme.line}`, background: theme.card, color: theme.text, cursor: 'pointer' },
  stepRail: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: 10, borderBottom: `1px solid ${theme.line}` },
  stepPill: (active, done) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 8px', background: active ? theme.accent : done ? theme.accentSoft : theme.card, border: `1px solid ${active ? theme.accent : theme.line}`, color: theme.text, fontSize: 10, fontWeight: 950, textTransform: 'uppercase' }),
  body: { padding: 'clamp(12px,2vw,18px)', overflowY: 'auto', minHeight: 0 },
  section: { display: 'grid', gap: 13 },
  sectionTitle: { margin: 0, fontSize: 22, fontWeight: 950, color: theme.text },
  copy: { margin: 0, lineHeight: 1.5, fontSize: 13, color: theme.text },
  choiceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 },
  choiceCard: (active, disabled = false) => ({ minHeight: 92, display: 'grid', alignContent: 'start', gap: 6, textAlign: 'left', padding: 12, background: active ? theme.accentSoft : theme.card, color: theme.text, border: `1px solid ${active ? theme.accent : theme.line}`, opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: fontStack }),
  list: { display: 'grid', gap: 7, maxHeight: 350, overflowY: 'auto' },
  wideChoice: (active) => ({ display: 'grid', gap: 5, textAlign: 'left', padding: 11, background: active ? theme.accentSoft : theme.card, color: theme.text, border: `1px solid ${active ? theme.accent : theme.line}`, cursor: 'pointer', fontFamily: fontStack }),
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8 },
  summary: { display: 'grid', gap: 5, padding: 11, background: theme.card, border: `1px solid ${theme.line}` },
  checklist: { display: 'grid', gap: 7 },
  checkLine: (active) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: active ? theme.accentSoft : theme.card, border: `1px solid ${theme.line}`, color: theme.text, fontSize: 13 }),
  field: { display: 'grid', gap: 6, color: theme.text, fontSize: 11, fontWeight: 900, textTransform: 'uppercase' },
  input: { width: '100%', boxSizing: 'border-box', minHeight: 42, background: theme.bg, border: `1px solid ${theme.strongLine}`, color: theme.text, padding: '0 10px', fontFamily: fontStack, colorScheme: 'dark' },
  error: { color: '#ff7f9f', textTransform: 'none', fontStyle: 'normal' },
  result: { display: 'flex', alignItems: 'center', gap: 8, padding: 11, background: theme.bg, border: `1px solid ${theme.line}` },
  status: (colour) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: 11, background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `5px solid ${colour}`, fontSize: 12, fontWeight: 850 }),
  spellPicker: { display: 'grid', gap: 8, padding: 11, background: theme.card, border: `1px solid ${theme.line}` },
  pickerHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 },
  spellButtons: { display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 220, overflowY: 'auto' },
  spellButton: (active, disabled) => ({ border: `1px solid ${active ? theme.accent : theme.line}`, background: active ? theme.accentSoft : theme.bg, color: theme.text, padding: '7px 9px', opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }),
  footer: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: 11, borderTop: `1px solid ${theme.line}`, background: theme.bg },
  primaryButton: { minHeight: 40, border: 0, background: theme.accent, color: theme.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack },
  secondaryButton: { minHeight: 40, border: `1px solid ${theme.line}`, background: theme.card, color: theme.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', fontWeight: 900, cursor: 'pointer', fontFamily: fontStack },
};
