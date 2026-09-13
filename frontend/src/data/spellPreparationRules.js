import { SPELLS_KNOWN } from './spellDatabase';

const FULL_PREPARED_2024 = {
  1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22,
};

const SORCERER_PREPARED_2024 = {
  1: 2, 2: 4, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22,
};

const WARLOCK_PREPARED_2024 = {
  1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
  11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15,
};

const WIZARD_PREPARED_2024 = {
  1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15,
  11: 16, 12: 16, 13: 17, 14: 18, 15: 19, 16: 21, 17: 22, 18: 23, 19: 24, 20: 25,
};

const HALF_PREPARED_2024 = {
  1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 6, 7: 7, 8: 7, 9: 9, 10: 9,
  11: 10, 12: 10, 13: 11, 14: 11, 15: 12, 16: 12, 17: 14, 18: 14, 19: 15, 20: 15,
};

export const PREPARED_SPELLS_2024 = {
  Bard: FULL_PREPARED_2024,
  Cleric: FULL_PREPARED_2024,
  Druid: FULL_PREPARED_2024,
  Paladin: HALF_PREPARED_2024,
  Ranger: HALF_PREPARED_2024,
  Sorcerer: SORCERER_PREPARED_2024,
  Warlock: WARLOCK_PREPARED_2024,
  Wizard: WIZARD_PREPARED_2024,
};

const normaliseName = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function normaliseSpellEdition(value = '2014') {
  return String(value || '').includes('2024') ? '2024' : '2014';
}

export function canonicalCasterClass(className = '') {
  const known = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];
  return known.find((name) => normaliseName(name) === normaliseName(className)) || String(className || '').trim();
}

export function progressionTableValue(table = {}, level = 1) {
  const numericLevel = Math.max(0, Number(level) || 0);
  return Object.entries(table || {})
    .map(([entryLevel, count]) => [Number(entryLevel), Number(count)])
    .filter(([entryLevel]) => entryLevel <= numericLevel)
    .sort((left, right) => right[0] - left[0])?.[0]?.[1] || 0;
}

export function getSpellSelectionMode({ className = '', edition = '2014' } = {}) {
  const canonical = canonicalCasterClass(className);
  const rules = normaliseSpellEdition(edition);
  if (canonical === 'Wizard') return 'spellbook';
  if (rules === '2024' && PREPARED_SPELLS_2024[canonical]) return 'prepared';
  if (['Cleric', 'Druid', 'Paladin'].includes(canonical)) return 'prepared';
  if (['Bard', 'Ranger', 'Sorcerer', 'Warlock'].includes(canonical)) return 'known';
  return 'none';
}

export function getPreparedSpellCapacity({ className = '', level = 1, edition = '2014', abilityScore = 10 } = {}) {
  const canonical = canonicalCasterClass(className);
  const rules = normaliseSpellEdition(edition);
  const numericLevel = Math.max(0, Number(level) || 0);
  if (numericLevel <= 0) return 0;

  if (rules === '2024') {
    return progressionTableValue(PREPARED_SPELLS_2024[canonical] || {}, numericLevel);
  }

  const modifier = Math.floor(((Number(abilityScore) || 10) - 10) / 2);
  if (['Cleric', 'Druid', 'Wizard'].includes(canonical)) {
    return Math.max(1, numericLevel + modifier);
  }
  if (canonical === 'Paladin') {
    if (numericLevel < 2) return 0;
    return Math.max(1, Math.floor(numericLevel / 2) + modifier);
  }
  return 0;
}

export function getPreparedSpellCapacityGain({ className = '', before = 0, after = before + 1, edition = '2014', abilityScore = 10 } = {}) {
  const previous = getPreparedSpellCapacity({ className, level: before, edition, abilityScore });
  const next = getPreparedSpellCapacity({ className, level: after, edition, abilityScore });
  return Math.max(0, next - previous);
}

export function getKnownSpellTarget({ className = '', level = 1, edition = '2014' } = {}) {
  const canonical = canonicalCasterClass(className);
  if (normaliseSpellEdition(edition) === '2024') return 0;
  return progressionTableValue(SPELLS_KNOWN[canonical] || {}, level);
}

export function getWizardSpellbookTarget(level = 1) {
  const numericLevel = Math.max(0, Number(level) || 0);
  if (numericLevel <= 0) return 0;
  return 6 + Math.max(0, numericLevel - 1) * 2;
}

export function getPreparedSpellChangeRule({ className = '', edition = '2014' } = {}) {
  const canonical = canonicalCasterClass(className);
  if (normaliseSpellEdition(edition) !== '2024' || !PREPARED_SPELLS_2024[canonical]) {
    return { cadence: 'legacy', maxReplacements: null };
  }
  if (['Bard', 'Sorcerer', 'Warlock'].includes(canonical)) {
    return { cadence: 'level-up', maxReplacements: 1 };
  }
  if (['Paladin', 'Ranger'].includes(canonical)) {
    return { cadence: 'long-rest', maxReplacements: 1 };
  }
  return { cadence: 'long-rest', maxReplacements: null };
}
