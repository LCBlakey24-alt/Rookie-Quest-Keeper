import { getAsiLevels, getChoicesForStartingLevel } from './classLevelRules';
import { CANTRIPS_KNOWN, SPELLCASTING_CLASSES, SPELLS_KNOWN, getMaxSpellLevel, getSpellsForClass } from './spellDatabase';
import { getWarlockBuilderOptions } from './warlockBuilderOptions';
import { getWarlockMysticArcanumLevels } from './warlockProgression';

export const ABILITY_OPTIONS = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
];

export const WARLOCK_INVOCATION_OPTIONS = [
  'Agonizing Blast',
  'Armor of Shadows',
  'Beast Speech',
  'Beguiling Influence',
  'Devil’s Sight',
  'Eldritch Mind',
  'Eldritch Sight',
  'Eldritch Spear',
  'Eyes of the Rune Keeper',
  'Fiendish Vigor',
  'Mask of Many Faces',
  'Misty Visions',
  'Repelling Blast',
  'Thief of Five Fates',
  'Book of Ancient Secrets',
  'Eldritch Smite',
  'Improved Pact Weapon',
  'Investment of the Chain Master',
  'One with Shadows',
  'Tomb of Levistus',
  'Ascendant Step',
  'Lifedrinker',
  'Shroud of Shadow',
  'Visions of Distant Realms',
  'Witch Sight',
];

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const displayName = (value) => typeof value === 'string' ? value : value?.name || value?.title || String(value || '');
const clampScore = (value) => Math.max(3, Math.min(20, Number(value || 10)));
const abilityMod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);

function targetFromTable(table = {}, level = 1) {
  const numericLevel = Math.max(1, Number(level || 1));
  return Object.entries(table)
    .map(([entryLevel, count]) => [Number(entryLevel), Number(count)])
    .filter(([entryLevel]) => entryLevel <= numericLevel)
    .sort((a, b) => b[0] - a[0])?.[0]?.[1] || 0;
}

function spellEntry(spell, fallbackLevel = 1) {
  if (spell && typeof spell === 'object') {
    return {
      ...spell,
      name: spell.name || spell.title || '',
      level: Number(spell.level ?? fallbackLevel),
      description: spell.description || '',
    };
  }
  return { name: String(spell || ''), level: fallbackLevel, description: '' };
}

function preparedSpellTarget({ className, level = 1, abilities = {} } = {}) {
  const classInfo = SPELLCASTING_CLASSES[className];
  if (!classInfo || classInfo.type !== 'prepared') return 0;
  const numericLevel = Math.max(1, Number(level || 1));
  const abilityScore = Number(abilities?.[classInfo.ability] || abilities?.abilityScores?.[classInfo.ability] || 10);
  const baseLevel = classInfo.halfCaster ? Math.max(1, Math.floor(numericLevel / 2)) : numericLevel;
  return Math.max(1, baseLevel + abilityMod(abilityScore));
}

export function getFeatName(feat) {
  return displayName(feat);
}

export function getFeatOptions({ edition = '2014', level = 1, registryFeats = [], uploadedFeats = [] } = {}) {
  const category = String(edition) === '2024' && Number(level) >= 19 ? 'epic' : 'general';
  const all = [...arr(registryFeats), ...arr(uploadedFeats)];
  const seen = new Set();
  return all
    .filter((feat) => {
      const name = getFeatName(feat);
      if (!name || seen.has(name.toLowerCase())) return false;
      const rulesets = arr(feat.rulesets || feat.editions);
      const matchesEdition = !rulesets.length || rulesets.includes(String(edition));
      const matchesCategory = !feat.category || feat.category === category || (category === 'general' && feat.category === 'origin');
      if (!matchesEdition || !matchesCategory) return false;
      seen.add(name.toLowerCase());
      return true;
    })
    .sort((a, b) => getFeatName(a).localeCompare(getFeatName(b)));
}

export function getSpellChoicePlan({ className, level = 1, abilities = {} } = {}) {
  const maxSpellLevel = getMaxSpellLevel(className, level);
  const spellLists = getSpellsForClass(className) || {};
  const classInfo = SPELLCASTING_CLASSES[className] || null;
  const cantripTarget = targetFromTable(CANTRIPS_KNOWN[className] || {}, level);
  const knownTarget = targetFromTable(SPELLS_KNOWN[className] || {}, level);
  const preparedTarget = preparedSpellTarget({ className, level, abilities });
  const leveledSpells = [];

  for (let spellLevel = 1; spellLevel <= maxSpellLevel; spellLevel += 1) {
    arr(spellLists[spellLevel]).forEach((spell) => leveledSpells.push(spellEntry(spell, spellLevel)));
  }

  return {
    className,
    level: Math.max(1, Number(level || 1)),
    maxSpellLevel,
    spellcastingType: classInfo?.type || null,
    spellcastingAbility: classInfo?.ability || null,
    cantripTarget,
    knownTarget,
    preparedTarget,
    hasKnownSpellPicker: knownTarget > 0,
    hasPreparedSpellPicker: preparedTarget > 0,
    cantripOptions: arr(spellLists.cantrips).map((spell) => spellEntry(spell, 0)),
    spellOptions: leveledSpells,
    arcanumLevels: className === 'Warlock' ? getWarlockMysticArcanumLevels(level) : [],
  };
}

export function getWarlockChoicePlan({ level = 1, edition = '2014' } = {}) {
  const options = getWarlockBuilderOptions({ level, edition });
  return {
    ...options,
    invocationOptions: WARLOCK_INVOCATION_OPTIONS,
  };
}

export function buildStartingLevelChoicePlan({ className, startingLevel = 1, edition = '2014', abilities = {} } = {}) {
  const level = Math.max(1, Math.min(20, Number(startingLevel || 1)));
  const baseChoices = getChoicesForStartingLevel({ className, startingLevel: level, edition });
  const asiLevels = getAsiLevels(className).filter((asiLevel) => asiLevel <= level);
  const spellPlan = getSpellChoicePlan({ className, level, abilities });
  const warlockPlan = className === 'Warlock' ? getWarlockChoicePlan({ level, edition }) : null;
  const manualHooks = [];

  if (['Sorcerer'].includes(className) && level >= 3) {
    manualHooks.push({ type: 'class_choice', level: 3, label: 'Choose Metamagic options.' });
  }
  if (['Bard', 'Rogue'].includes(className) && level >= 3) {
    manualHooks.push({ type: 'class_choice', level: 3, label: 'Choose Expertise or class options as needed.' });
  }
  if (['Fighter', 'Paladin', 'Ranger'].includes(className) && level >= 1) {
    manualHooks.push({ type: 'class_choice', level: 1, label: 'Review fighting style or martial choices.' });
  }

  return {
    level,
    baseChoices,
    asiChoices: asiLevels.map((asiLevel) => ({ id: `asi-${asiLevel}`, level: asiLevel, type: 'asi_or_feat', label: `Level ${asiLevel} ASI / feat` })),
    spellChoices: baseChoices.filter((choice) => choice.type === 'spellcasting_start'),
    subclassChoices: baseChoices.filter((choice) => choice.type === 'subclass'),
    spellPlan,
    warlockPlan,
    manualHooks,
    hasChoices: baseChoices.length > 0 || manualHooks.length > 0 || spellPlan.hasKnownSpellPicker || spellPlan.hasPreparedSpellPicker || Boolean(warlockPlan?.invocationsRequired),
  };
}

export function defaultAsiSelection(existing) {
  return {
    mode: existing?.mode || 'asi',
    abilityOne: existing?.abilityOne || 'strength',
    abilityTwo: existing?.abilityTwo || 'strength',
    featName: existing?.featName || '',
  };
}

export function normaliseSpellSelection(selection = {}, spellPlan = {}) {
  return {
    cantrips: arr(selection.cantrips).slice(0, spellPlan.cantripTarget || 0),
    spells: arr(selection.spells).slice(0, spellPlan.knownTarget || 0),
    prepared: arr(selection.prepared).slice(0, spellPlan.preparedTarget || 0),
    arcanum: selection.arcanum || {},
  };
}

export function normaliseWarlockSelection(selection = {}, warlockPlan = {}) {
  return {
    pactBoon: selection.pactBoon || '',
    invocations: arr(selection.invocations).slice(0, warlockPlan.invocationCount || 0),
  };
}

export function applyStartingLevelChoicesToPayload(payload, selections = {}, featOptions = [], detailSelections = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  const feats = [...arr(payload.feats)];

  Object.entries(selections || {}).forEach(([choiceId, rawSelection]) => {
    if (!choiceId.startsWith('asi-')) return;
    const selection = defaultAsiSelection(rawSelection);
    if (selection.mode === 'feat') {
      const featName = selection.featName;
      if (!featName || feats.some((feat) => getFeatName(feat) === featName)) return;
      const feat = featOptions.find((item) => getFeatName(item) === featName) || { name: featName };
      feats.push({
        name: featName,
        description: feat.description || '',
        source: feat.source || feat.source_label || 'level-up',
        level_choice: Number(choiceId.replace('asi-', '')) || undefined,
      });
      return;
    }

    [selection.abilityOne, selection.abilityTwo].filter(Boolean).forEach((ability) => {
      if (next[ability] === undefined) return;
      next[ability] = clampScore(Number(next[ability] || 10) + 1);
    });
  });

  const spellPlan = detailSelections.spellPlan || {};
  const spellSelection = normaliseSpellSelection(detailSelections.spells, spellPlan);
  if (spellSelection.cantrips.length) {
    const existing = arr(next.cantrips_known || next.cantrips).map((spell) => spellEntry(spell, 0));
    const names = new Set(existing.map((spell) => spell.name));
    spellSelection.cantrips.forEach((name) => {
      if (!name || names.has(name)) return;
      names.add(name);
      const spell = spellPlan.cantripOptions?.find((item) => item.name === name) || { name, level: 0 };
      existing.push(spellEntry(spell, 0));
    });
    next.cantrips_known = existing;
    next.cantrips = existing;
  }

  if (spellSelection.spells.length) {
    const existing = arr(next.spells_known || next.known_spells).map((spell) => spellEntry(spell, spell.level || 1));
    const names = new Set(existing.map((spell) => spell.name));
    spellSelection.spells.forEach((name) => {
      if (!name || names.has(name)) return;
      names.add(name);
      const spell = spellPlan.spellOptions?.find((item) => item.name === name) || { name, level: 1 };
      existing.push(spellEntry(spell, spell.level || 1));
    });
    next.spells_known = existing;
    next.known_spells = existing;
  }

  if (spellSelection.prepared.length) {
    const prepared = spellSelection.prepared.map((name) => {
      const spell = spellPlan.spellOptions?.find((item) => item.name === name) || { name, level: 1 };
      return spellEntry(spell, spell.level || 1);
    });
    next.prepared_spells = prepared;
    next.spells_prepared = prepared;
    next.preparedSpells = prepared;
  }

  const arcanumEntries = Object.entries(spellSelection.arcanum || {}).filter(([, name]) => name);
  if (arcanumEntries.length) {
    next.mystic_arcanum = arcanumEntries.map(([spellLevel, name]) => {
      const spell = spellPlan.spellOptions?.find((item) => item.name === name) || { name, level: Number(spellLevel) };
      return spellEntry(spell, Number(spellLevel));
    });
  }

  const warlockPlan = detailSelections.warlockPlan || {};
  const warlockSelection = normaliseWarlockSelection(detailSelections.warlock, warlockPlan);
  if (warlockSelection.pactBoon) {
    next.pact_boon = warlockSelection.pactBoon;
    next.pactBoon = warlockSelection.pactBoon;
  }
  if (warlockSelection.invocations.length) {
    next.eldritch_invocations = warlockSelection.invocations;
    next.invocations = warlockSelection.invocations;
  }

  next.feats = feats;
  return next;
}
