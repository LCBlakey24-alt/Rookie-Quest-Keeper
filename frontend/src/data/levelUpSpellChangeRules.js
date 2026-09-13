import { getSpellSelectionMode, normaliseSpellEdition } from './spellPreparationRules';

const normaliseName = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function getLevelUpPreparedReplacementRule({ className = '', edition = '2014', preflight = null } = {}) {
  const rulesEdition = normaliseSpellEdition(edition);
  const remote = preflight?.progression_reference?.prepared_spell_change;
  if (remote && typeof remote === 'object') {
    const max = remote.max_replacements === null || remote.max_replacements === undefined
      ? 0
      : Math.max(0, Number(remote.max_replacements) || 0);
    return {
      cadence: remote.cadence || 'legacy',
      maxReplacements: max,
      allowed: remote.cadence === 'level-up' && max > 0,
    };
  }

  const canonical = String(className || '').trim();
  const allowed = rulesEdition === '2024' && ['Bard', 'Sorcerer', 'Warlock'].includes(canonical);
  return {
    cadence: allowed ? 'level-up' : rulesEdition === '2024' ? 'long-rest' : 'legacy',
    maxReplacements: allowed ? 1 : 0,
    allowed,
  };
}

export function preparedSpellsForClass(character = {}, className = '') {
  const prepared = toArray(character.spells_prepared || character.prepared_spells);
  const key = normaliseName(className);
  return prepared.filter((spell) => {
    const source = spell?.sourceClass || spell?.source_class || spell?.className || spell?.class_name;
    return !source || normaliseName(source) === key;
  });
}

export function legacyPreparedFallback(character = {}, className = '') {
  const edition = normaliseSpellEdition(character.rules_edition || character.edition || character.ruleset_id || '2014');
  if (edition !== '2024') return { spells: [], migrated: false };
  if (getSpellSelectionMode({ className, edition }) !== 'prepared') return { spells: [], migrated: false };
  const prepared = preparedSpellsForClass(character, className);
  if (prepared.length) return { spells: prepared, migrated: false };

  const key = normaliseName(className);
  const legacy = toArray(character.spells_known || character.known_spells).filter((spell) => {
    const source = spell?.sourceClass || spell?.source_class || spell?.className || spell?.class_name;
    return !source || normaliseName(source) === key;
  });
  return { spells: legacy, migrated: legacy.length > 0 };
}

export function buildLevelUpSpellChanges({
  className = '',
  additions = [],
  replacementFrom = '',
  replacementTo = null,
} = {}) {
  const sourceClass = String(className || '').trim();
  const result = toArray(additions).map((spell) => ({
    ...spell,
    sourceClass: spell?.sourceClass || spell?.source_class || sourceClass || undefined,
  }));

  if (replacementFrom && replacementTo) {
    result.push({
      ...replacementTo,
      sourceClass: replacementTo?.sourceClass || replacementTo?.source_class || sourceClass || undefined,
      replaces: replacementFrom,
    });
  }

  return result;
}

export function spellNameSet(spells = []) {
  return new Set(toArray(spells).map((spell) => normaliseName(spell?.name || spell)).filter(Boolean));
}
