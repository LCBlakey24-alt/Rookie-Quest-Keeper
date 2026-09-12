import { mergeCharacterClassResources } from '@/data/characterClassResources';
import { HIT_DICE } from '@/data/levelUpData';
import { SPELLCASTING_CLASSES, getMulticlassSpellSlots } from '@/data/spellDatabase';

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

const proficiencyFor = (level = 1) => 2 + Math.floor((Math.max(1, toNumber(level, 1)) - 1) / 4);
const abilityMod = (score = 10) => Math.floor((toNumber(score, 10) - 10) / 2);

function parseClassBreakdown(rawClass = '', fallbackLevel = 1) {
  const raw = String(rawClass || '').trim();
  const safeFallback = Math.max(1, toNumber(fallbackLevel, 1));
  if (!raw) return { primaryClass: 'Fighter', classLevels: { Fighter: safeFallback }, explicit: false };

  const parts = raw.split(/\s*(?:\/|\\|\||,|;)\s*/).filter(Boolean);
  const parsed = [];
  let explicit = parts.length > 0;

  parts.forEach((part) => {
    const match = String(part).match(/^\s*(.+?)\s+(\d{1,2})\s*$/);
    if (!match) {
      explicit = false;
      return;
    }
    parsed.push([displayClass(match[1]), Math.max(1, Math.min(20, toNumber(match[2], 1)))]);
  });

  if (explicit && parsed.length === parts.length && parsed.length > 0) {
    const classLevels = {};
    parsed.forEach(([name, level]) => {
      classLevels[name] = (classLevels[name] || 0) + level;
    });
    return { primaryClass: parsed[0][0], classLevels, explicit: true };
  }

  const primaryClass = displayClass(parts[0] || raw);
  return { primaryClass, classLevels: { [primaryClass]: safeFallback }, explicit: false };
}

function savedClassLevels(payload = {}) {
  const source = payload.class_levels || payload.multiclass_levels;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  return Object.fromEntries(Object.entries(source)
    .filter(([, level]) => toNumber(level, 0) > 0)
    .map(([name, level]) => [displayClass(name), Math.max(1, toNumber(level, 1))]));
}

function classEntries(payload = {}, classLevels = {}, primaryClass = '') {
  const saved = Array.isArray(payload.classes) ? payload.classes : [];
  return Object.entries(classLevels).map(([className, level]) => {
    const previous = saved.find((entry) => normaliseName(
      entry?.name || entry?.class_name || entry?.character_class || entry?.class,
    ) === normaliseName(className)) || {};
    const subclass = previous.subclass || (
      normaliseName(className) === normaliseName(primaryClass) ? payload.subclass || '' : ''
    );
    return { ...previous, name: className, level, subclass };
  });
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

function clampSlots(totals = {}, remaining) {
  const normalizedTotals = Object.fromEntries(Object.entries(totals || {})
    .map(([level, count]) => [String(level), Math.max(0, toNumber(count, 0))]));
  if (!remaining || typeof remaining !== 'object' || Array.isArray(remaining)) return { ...normalizedTotals };
  return Object.fromEntries(Object.entries(normalizedTotals).map(([level, total]) => [
    level,
    Math.min(total, Math.max(0, toNumber(remaining[level] ?? remaining[Number(level)], total))),
  ]));
}

function spellcastingAbility(primaryClass = '', classLevels = {}) {
  const primary = SPELLCASTING_CLASSES[displayClass(primaryClass)];
  if (primary?.ability) return primary.ability;
  for (const className of Object.keys(classLevels)) {
    const found = SPELLCASTING_CLASSES[displayClass(className)];
    if (found?.ability) return found.ability;
  }
  return '';
}

export function canonicalisePreviewCreatedCharacter(payload = {}) {
  const sourceClass = payload.character_class || payload.class_name || payload.class || 'Fighter';
  const parsed = parseClassBreakdown(sourceClass, payload.level || 1);
  let classLevels = parsed.classLevels;

  if (!parsed.explicit) {
    const suppliedLevels = savedClassLevels(payload);
    if (Object.keys(suppliedLevels).length > 0) classLevels = suppliedLevels;
  }

  const primaryClass = parsed.explicit
    ? parsed.primaryClass
    : (Object.keys(classLevels).find((name) => normaliseName(name) === normaliseName(parsed.primaryClass)) || parsed.primaryClass);
  const level = Math.max(1, Object.values(classLevels).reduce((sum, value) => sum + Math.max(0, toNumber(value, 0)), 0));
  const classes = classEntries(payload, classLevels, primaryClass);
  const base = {
    ...payload,
    character_class: primaryClass,
    level,
    class_levels: classLevels,
    multiclass_levels: Object.keys(classLevels).length > 1 ? { ...classLevels } : {},
    multiclass_classes: Object.keys(classLevels),
    classes,
    proficiency_bonus: proficiencyFor(level),
    hit_dice: payload.hit_dice || hitDiceString(classLevels),
    hit_dice_remaining: Math.min(level, Math.max(0, toNumber(payload.hit_dice_remaining, level))),
  };

  if (String(sourceClass).trim() !== primaryClass) base.imported_class_text = String(sourceClass).trim();

  let slotMath = {};
  try {
    slotMath = getMulticlassSpellSlots(classLevels, base) || {};
  } catch {
    slotMath = {};
  }
  const sharedSlots = slotMath.slots && Object.keys(slotMath.slots).length ? slotMath.slots : {};
  const pact = slotMath.pactMagic;
  const pactSlots = pact?.slots > 0 && pact?.level > 0 ? { [String(pact.level)]: pact.slots } : {};
  const suppliedSlots = payload.spell_slots && typeof payload.spell_slots === 'object' && !Array.isArray(payload.spell_slots)
    ? payload.spell_slots
    : {};
  const derivedSlots = Object.keys(sharedSlots).length ? sharedSlots : pactSlots;
  const spellSlots = Object.keys(derivedSlots).length ? derivedSlots : suppliedSlots;

  base.spell_slots = Object.fromEntries(Object.entries(spellSlots || {})
    .map(([slotLevel, count]) => [String(slotLevel), Math.max(0, toNumber(count, 0))]));
  base.spell_slots_remaining = clampSlots(base.spell_slots, payload.spell_slots_remaining);

  const castingAbility = payload.spellcasting_ability || spellcastingAbility(primaryClass, classLevels);
  base.spellcasting_ability = castingAbility;
  if (castingAbility && Object.keys(classLevels).length === 1) {
    const modifier = abilityMod(base[castingAbility]);
    base.spell_save_dc = toNumber(payload.spell_save_dc, 0) || (8 + base.proficiency_bonus + modifier);
    base.spell_attack_bonus = toNumber(payload.spell_attack_bonus, 0) || (base.proficiency_bonus + modifier);
  }

  base.resources = mergeCharacterClassResources(base, classLevels, { initialiseMissing: true });
  return base;
}

export { parseClassBreakdown };
