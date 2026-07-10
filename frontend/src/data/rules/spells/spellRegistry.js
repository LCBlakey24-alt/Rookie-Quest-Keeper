import { SPELL_DATABASE, getCanonicalSpellcastingClass, getSpellsForClass } from '../../spellDatabase';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
export const canonicalSpellId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const withMetadata = (spell = {}, level = 0) => ({
  ...spell,
  id: spell.id || canonicalSpellId(spell.name),
  level,
  rulesets: spell.rulesets || ['2014', '2024'],
  source: spell.source || 'SRD',
});

export function buildSpellRegistry(database = SPELL_DATABASE) {
  const entries = [];
  toArray(database.cantrips).forEach(spell => entries.push(withMetadata(spell, 0)));

  Object.entries(database).forEach(([level, spells]) => {
    if (level === 'cantrips') return;
    const numericLevel = Number(level);
    if (!Number.isInteger(numericLevel)) return;
    toArray(spells).forEach(spell => entries.push(withMetadata(spell, numericLevel)));
  });

  return Object.fromEntries(entries.map(spell => [spell.id, spell]));
}

export const SPELL_REGISTRY = buildSpellRegistry();

export function getSpellById(spellId = '') {
  return SPELL_REGISTRY[canonicalSpellId(spellId)] || null;
}

export function getClassSpellAccess(className, { ruleset = '2014', spellLevel = null } = {}) {
  const canonicalClass = getCanonicalSpellcastingClass(className);
  const spellLists = getSpellsForClass(canonicalClass, spellLevel) || {};
  const normalizedRuleset = String(ruleset || '').includes('2024') ? '2024' : '2014';

  return Object.fromEntries(Object.entries(spellLists).map(([level, spells]) => [
    level,
    toArray(spells)
      .map(spell => SPELL_REGISTRY[canonicalSpellId(spell.name)] || withMetadata(spell, level === 'cantrips' ? 0 : Number(level)))
      .filter(spell => toArray(spell.rulesets).includes(normalizedRuleset)),
  ]));
}
