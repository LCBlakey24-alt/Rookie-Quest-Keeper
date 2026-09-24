import {
  SPELLCASTING_CLASSES,
  getCanonicalSpellcastingClass,
} from './spellDatabase';

const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

export const splitHomebrewSpellClasses = (value) => {
  if (Array.isArray(value)) return value.flatMap(splitHomebrewSpellClasses).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[,;/|]+|\band\b/gi)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value ? [value] : [];
};

const displayName = (value) => typeof value === 'string'
  ? value
  : value?.name || value?.title || String(value || '');

const normaliseKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function normaliseSpellClasses(spell = {}) {
  const rawClasses = splitHomebrewSpellClasses(
    spell.classes
    || spell.class_list
    || spell.classList
    || spell.class_names
    || spell.classNames
    || spell.available_classes
    || spell.availableClasses
    || spell.class
    || spell.spell_class,
  );
  const classes = rawClasses
    .map((name) => getCanonicalSpellcastingClass(name))
    .filter(Boolean);

  return rawClasses.length
    ? Array.from(new Set(classes))
    : Object.keys(SPELLCASTING_CLASSES);
}

export function spellEntryFromHomebrew(spell = {}) {
  const damage = spell.damage && typeof spell.damage === 'object'
    ? spell.damage.dice
    : spell.damage;
  const damageType = spell.damage && typeof spell.damage === 'object'
    ? spell.damage.type
    : spell.damageType || spell.damage_type;

  return {
    ...spell,
    name: displayName(spell),
    level: Math.max(0, Math.min(9, Number(spell.level ?? spell.spell_level ?? 0) || 0)),
    school: spell.school || '',
    classes: normaliseSpellClasses(spell),
    description: spell.description || spell.rules_text || '',
    damage,
    damageType,
    source: spell.source_label || spell.source || 'Homebrew Workshop',
    homebrew: true,
  };
}

export function spellListModeFromHomebrewClass(classData = {}) {
  const mode = String(
    classData?.spellcasting?.type
    || classData?.spellcasting?.style
    || classData?.spellcasting?.casting_type
    || classData?.spellcasting?.castingType
    || '',
  ).trim().toLowerCase();

  return ['known', 'prepared', 'spellbook'].includes(mode) ? mode : '';
}

export function spellListLabelFromMode(mode = '') {
  if (mode === 'spellbook') return 'Spellbook';
  if (mode === 'prepared') return 'Prepared';
  if (mode === 'known') return 'Known';
  return 'Spells';
}

export function spellDestinationForHomebrewClass(classData = {}, spellLevel = 1) {
  if (Number(spellLevel || 0) <= 0) return 'cantrips_known';
  const mode = spellListModeFromHomebrewClass(classData);
  if (mode === 'spellbook') return 'spellbook';
  if (mode === 'prepared') return 'spells_prepared';
  return 'spells_known';
}

export function homebrewSpellsForClass(spells = [], className = '', maxSpellLevel = 9) {
  const wanted = normaliseKey(getCanonicalSpellcastingClass(className));
  const maxLevel = Math.max(0, Math.min(9, Number(maxSpellLevel || 0)));

  return asArray(spells)
    .map(spellEntryFromHomebrew)
    .filter((spell) => spell.name)
    .filter((spell) => spell.classes.some((name) => normaliseKey(name) === wanted))
    .filter((spell) => Number(spell.level || 0) === 0 || Number(spell.level || 0) <= maxLevel)
    .map((spell) => ({
      ...spell,
      sourceClass: getCanonicalSpellcastingClass(className),
    }));
}
