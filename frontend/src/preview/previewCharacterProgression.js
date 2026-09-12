import { ASI_LEVELS, HIT_DICE } from '@/data/levelUpData';
import { CANTRIPS_KNOWN, SPELLS_KNOWN, getMulticlassSpellSlots } from '@/data/spellDatabase';
import { buildPactMagicResource, getNormalSpellPool, getPactMagicPool } from '@/data/spellcastingPools';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normaliseName = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const displayClass = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return 'Fighter';
  return raw.slice(0, 1).toUpperCase() + raw.slice(1);
};

const abilityMod = (score = 10) => Math.floor((toNumber(score, 10) - 10) / 2);
const proficiencyFor = (level = 1) => 2 + Math.floor((Math.max(1, toNumber(level, 1)) - 1) / 4);
const copy = (value) => JSON.parse(JSON.stringify(value));

export function normalisePreviewClassLevels(character = {}) {
  const saved = character.class_levels || character.multiclass_levels || {};
  const entries = Object.entries(saved).filter(([, level]) => toNumber(level, 0) > 0);
  if (entries.length) {
    return Object.fromEntries(entries.map(([className, level]) => [displayClass(className), toNumber(level, 0)]));
  }
  return { [displayClass(character.character_class || 'Fighter')]: Math.max(1, toNumber(character.level, 1)) };
}

function hitDiceString(classLevels = {}) {
  const totals = {};
  Object.entries(classLevels).forEach(([className, level]) => {
    const die = HIT_DICE[displayClass(className)] || 8;
    totals[die] = (totals[die] || 0) + Math.max(0, toNumber(level, 0));
  });
  return Object.entries(totals)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([die, count]) => `${count}d${die}`)
    .join(' + ') || '1d8';
}

function lastKnownCount(table = {}, level = 1) {
  let count = 0;
  Object.entries(table || {}).forEach(([rawLevel, rawCount]) => {
    if (Number(rawLevel) <= Number(level)) count = Number(rawCount) || count;
  });
  return count;
}

function learnedBetween(table = {}, before = 1, after = before + 1) {
  return Math.max(0, lastKnownCount(table, after) - lastKnownCount(table, before));
}

function editionFor(character = {}) {
  const raw = character.rules_edition || character.edition || character.ruleset_id || '2014';
  return String(raw).includes('2024') ? '2024' : '2014';
}

function subclassUnlockLevel(className, edition) {
  if (edition === '2024') return 3;
  const key = normaliseName(className);
  if (['cleric', 'sorcerer', 'warlock'].includes(key)) return 1;
  if (['druid', 'wizard'].includes(key)) return 2;
  return 3;
}

function preserveSlotState(oldTotals = {}, oldRemaining = {}, newTotals = {}) {
  const next = {};
  Object.entries(newTotals || {}).forEach(([level, rawTotal]) => {
    const total = Math.max(0, toNumber(rawTotal, 0));
    const previousTotal = Math.max(0, toNumber(oldTotals?.[level], 0));
    const previousLeft = Math.max(0, Math.min(previousTotal, toNumber(oldRemaining?.[level], previousTotal)));
    const gained = Math.max(0, total - previousTotal);
    next[String(level)] = Math.min(total, previousLeft + gained);
  });
  return next;
}

function appendUniqueSpells(existing = [], additions = []) {
  const output = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(output.map(item => normaliseName(item?.name || item)));
  (Array.isArray(additions) ? additions : []).forEach((item) => {
    const key = normaliseName(item?.name || item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });
  return output;
}

function progressionTargetClass(character, payload, multiclass) {
  return displayClass(multiclass ? payload.new_class : character.character_class || 'Fighter');
}

export function getPreviewLevelUpOptions(character = {}) {
  const currentLevel = Math.max(1, toNumber(character.level, 1));
  const targetLevel = currentLevel + 1;
  const classLevels = normalisePreviewClassLevels(character);
  const characterClass = displayClass(character.character_class || Object.keys(classLevels)[0] || 'Fighter');
  const classLevelBefore = Math.max(1, toNumber(classLevels[characterClass], currentLevel));
  const classLevelAfter = classLevelBefore + 1;
  const edition = editionFor(character);
  const unlockLevel = subclassUnlockLevel(characterClass, edition);
  const nextCharacter = {
    ...character,
    level: targetLevel,
    class_levels: { ...classLevels, [characterClass]: classLevelAfter },
  };
  const slotMath = getMulticlassSpellSlots(nextCharacter.class_levels, nextCharacter);
  const asiLevels = ASI_LEVELS[characterClass] || ASI_LEVELS.default || [];

  return {
    character_id: character.id,
    character_name: character.name || '',
    character_class: characterClass,
    edition,
    ruleset_id: character.ruleset_id || `dnd5e_${edition}`,
    current_level: currentLevel,
    target_level: targetLevel,
    hit_die: HIT_DICE[characterClass] || 8,
    proficiency_bonus: proficiencyFor(targetLevel),
    previous_proficiency_bonus: proficiencyFor(currentLevel),
    spell_slots: slotMath?.slots || {},
    previous_spell_slots: character.spell_slots || {},
    spells_to_learn: learnedBetween(SPELLS_KNOWN[characterClass] || {}, classLevelBefore, classLevelAfter),
    cantrips_to_learn: learnedBetween(CANTRIPS_KNOWN[characterClass] || {}, classLevelBefore, classLevelAfter),
    is_asi_level: asiLevels.includes(classLevelAfter),
    asi_levels: asiLevels,
    can_choose_subclass: !character.subclass && classLevelAfter >= unlockLevel,
    subclass_unlock_level: unlockLevel,
    subclass_options: [],
    feat_options: [],
    general_feat_options: [],
    origin_feat_options: [],
    class_levels: classLevels,
    progression_reference: { source: 'local-preview' },
  };
}

export function applyPreviewCharacterLevelUp(character = {}, payload = {}, { multiclass = false } = {}) {
  const currentLevel = Math.max(1, toNumber(character.level, 1));
  const requestedLevel = toNumber(payload.new_level, currentLevel + 1);
  if (requestedLevel !== currentLevel + 1) {
    const error = new Error(`Can only level up from ${currentLevel} to ${currentLevel + 1}.`);
    error.status = 400;
    throw error;
  }

  const targetClass = progressionTargetClass(character, payload, multiclass);
  if (multiclass && !String(payload.new_class || '').trim()) {
    const error = new Error('Choose a class before multiclassing.');
    error.status = 400;
    throw error;
  }

  const oldClassLevels = normalisePreviewClassLevels(character);
  if (multiclass && Object.keys(oldClassLevels).some(name => normaliseName(name) === normaliseName(targetClass))) {
    const error = new Error(`${targetClass} is already on this character. Continue that class through normal level up.`);
    error.status = 400;
    throw error;
  }

  const nextClassLevels = { ...oldClassLevels };
  const existingTargetName = Object.keys(nextClassLevels).find(name => normaliseName(name) === normaliseName(targetClass));
  const targetKey = existingTargetName || targetClass;
  nextClassLevels[targetKey] = Math.max(0, toNumber(nextClassLevels[targetKey], 0)) + 1;

  const hitDie = HIT_DICE[targetClass] || 8;
  const conMod = abilityMod(character.constitution);
  const hpMethod = String(payload.hp_method || (payload.hp_roll != null ? 'roll' : 'average')).toLowerCase();
  const rawRoll = toNumber(payload.hp_roll, 0);
  if (['roll', 'manual'].includes(hpMethod) && rawRoll <= 0) {
    const error = new Error('A hit point roll is required for rolled/manual HP.');
    error.status = 400;
    throw error;
  }
  const hpGain = Math.max(1, (['roll', 'manual'].includes(hpMethod) ? rawRoll : Math.floor(hitDie / 2) + 1) + conMod);
  const oldMaxHp = Math.max(1, toNumber(character.max_hit_points, 1));
  const oldCurrentHp = Math.max(0, Math.min(oldMaxHp, toNumber(character.current_hit_points, oldMaxHp)));
  const newMaxHp = oldMaxHp + hpGain;

  const next = {
    ...copy(character),
    level: requestedLevel,
    class_levels: nextClassLevels,
    multiclass_levels: Object.keys(nextClassLevels).length > 1 ? { ...nextClassLevels } : {},
    multiclass_classes: Object.keys(nextClassLevels),
    proficiency_bonus: proficiencyFor(requestedLevel),
    max_hit_points: newMaxHp,
    current_hit_points: Math.min(newMaxHp, oldCurrentHp + hpGain),
    hit_dice: hitDiceString(nextClassLevels),
    hit_dice_remaining: Math.min(requestedLevel, Math.max(0, toNumber(character.hit_dice_remaining, currentLevel)) + 1),
    updated_at: new Date().toISOString(),
  };

  if (!multiclass && payload.subclass) next.subclass = payload.subclass;

  if (payload.choice_type === 'asi' && payload.asi_choices) {
    [payload.asi_choices.ability1, payload.asi_choices.ability2].forEach((ability) => {
      if (!ABILITIES.includes(ability)) return;
      next[ability] = Math.min(20, toNumber(next[ability], 10) + 1);
    });
  }

  if (payload.choice_type === 'feat' && payload.feat_choice) {
    const feat = typeof payload.feat_choice === 'string'
      ? { name: payload.feat_choice, description: '' }
      : payload.feat_choice;
    next.feats = [...(Array.isArray(character.feats) ? character.feats : []), {
      ...feat,
      level_taken: requestedLevel,
      source: 'level_up',
    }];
  }

  next.spells_known = appendUniqueSpells(character.spells_known, payload.new_spells);
  next.cantrips_known = appendUniqueSpells(character.cantrips_known, payload.new_cantrips);

  const oldSlotMath = getMulticlassSpellSlots(oldClassLevels, character);
  const newSlotMath = getMulticlassSpellSlots(nextClassLevels, next);
  const oldNormalPool = getNormalSpellPool(character, oldSlotMath);
  const newNormalTotals = newSlotMath?.slots || {};
  next.spell_slots = { ...newNormalTotals };
  next.spell_slots_remaining = preserveSlotState(
    oldNormalPool.totals,
    oldNormalPool.remaining,
    newNormalTotals,
  );

  const oldPactPool = getPactMagicPool(character, oldSlotMath);
  const nextPactShape = newSlotMath?.pactMagic;
  if (nextPactShape?.slots > 0 && nextPactShape?.level > 0) {
    const spent = oldPactPool.available ? Math.max(0, oldPactPool.total - oldPactPool.current) : 0;
    const pactPool = {
      available: true,
      level: nextPactShape.level,
      total: nextPactShape.slots,
      current: Math.max(0, nextPactShape.slots - spent),
      restore: 'short-rest',
    };
    next.resources = buildPactMagicResource(character.resources || {}, pactPool, pactPool.current);
  }

  const progression = { ...(character.level_progression || {}) };
  progression[String(requestedLevel)] = {
    type: multiclass ? 'multiclass' : (payload.choice_type || 'standard'),
    class: targetClass,
    class_level: nextClassLevels[targetKey],
    class_levels: { ...nextClassLevels },
    hp_method: hpMethod,
    hp_roll: ['roll', 'manual'].includes(hpMethod) ? rawRoll : null,
    hp_gained: hpGain,
    subclass: payload.subclass || undefined,
    feat: payload.feat_choice?.name || undefined,
    asi_choices: payload.asi_choices || undefined,
    applied_at: next.updated_at,
  };
  next.level_progression = progression;

  return next;
}
