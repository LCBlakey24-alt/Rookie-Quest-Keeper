import { SPELLCASTING_CLASSES } from './spellDatabase';
import { getPreparedSpellCapacity, getSpellSelectionMode, normaliseSpellEdition } from './spellPreparationRules';

const normaliseName = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function characterRulesEdition(character = {}) {
  return normaliseSpellEdition(character.rules_edition || character.edition || character.ruleset_id || '2014');
}

export function canonicalSpellClassName(className = '') {
  return Object.keys(SPELLCASTING_CLASSES).find((name) => normaliseName(name) === normaliseName(className)) || String(className || '').trim();
}

export function getCharacterSpellListMode(character = {}, className = '') {
  const canonical = canonicalSpellClassName(className);
  return getSpellSelectionMode({ className: canonical, edition: characterRulesEdition(character) });
}

export function getCharacterPreparedCapacity(character = {}, className = '', classLevel = 0) {
  const canonical = canonicalSpellClassName(className);
  const info = SPELLCASTING_CLASSES[canonical];
  const abilityScore = info?.ability ? Number(character?.[info.ability] || 10) : 10;
  return getPreparedSpellCapacity({
    className: canonical,
    level: Number(classLevel || 0),
    edition: characterRulesEdition(character),
    abilityScore,
  });
}

export function getSpellListDestination(character = {}, className = '', spellLevel = 1) {
  if (Number(spellLevel || 0) <= 0) return 'cantrips_known';
  const mode = getCharacterSpellListMode(character, className);
  if (mode === 'spellbook') return 'spellbook';
  if (mode === 'prepared') return 'spells_prepared';
  return 'spells_known';
}

export function getSpellListLabel(character = {}, className = '') {
  const mode = getCharacterSpellListMode(character, className);
  if (mode === 'spellbook') return 'Spellbook';
  if (mode === 'prepared') return 'Prepared';
  if (mode === 'known') return 'Known';
  return 'Spells';
}

export function tagSpellSource(spell = {}, className = '') {
  if (!spell || typeof spell !== 'object') return spell;
  const canonical = canonicalSpellClassName(className || spell.sourceClass || spell.source_class || '');
  return canonical ? { ...spell, sourceClass: canonical } : { ...spell };
}

export function spellBelongsToClass(spell = {}, className = '') {
  const source = spell?.sourceClass || spell?.source_class || spell?.className || spell?.class_name;
  if (!source) return true; // Legacy saves did not persist source class.
  return normaliseName(source) === normaliseName(canonicalSpellClassName(className));
}
