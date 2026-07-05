import { getClassSpellAccess } from './rules/spells/spellRegistry';

const arr = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);

export function getCreatorPreparedSpellTarget(className, scores = {}, level = 1) {
  if (className === 'Wizard') return Math.max(1, mod(scores.intelligence) + Number(level || 1));
  if (className === 'Cleric' || className === 'Druid') return Math.max(1, mod(scores.wisdom) + Number(level || 1));
  if (className === 'Paladin') return Math.max(1, mod(scores.charisma) + Math.floor(Number(level || 1) / 2));
  return 0;
}

export function isCreatorPreparedCaster(className) {
  return ['Wizard', 'Cleric', 'Druid', 'Paladin'].includes(className);
}

export function getCreatorSpellListLabel(className) {
  if (className === 'Wizard') return 'Spellbook';
  if (isCreatorPreparedCaster(className)) return 'Learned';
  return 'Known';
}

export function spellMatchesDropdownSearch(spell = {}, search = '') {
  const needle = String(search || '').trim().toLowerCase();
  if (!needle) return true;
  if (needle.includes('damage') && spell.damage) return true;
  if ((needle.includes('heal') || needle.includes('healing')) && spell.healing) return true;
  return [spell.name, spell.school, spell.description, spell.damage, spell.healing, spell.damageType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function getCreatorAvailableSpellPools(className, search = '', ruleset = '2014') {
  const spellLists = getClassSpellAccess(className, { ruleset }) || {};
  const cantrips = arr(spellLists.cantrips).filter((spell) => spellMatchesDropdownSearch(spell, search));
  const levelOneSpells = arr(spellLists[1]).filter((spell) => spellMatchesDropdownSearch(spell, search));

  return {
    cantrips,
    levelOneSpells,
  };
}

export function findSpellByName(spells = [], name = '') {
  const target = normalize(name);
  return arr(spells).find((spell) => normalize(spell.name || spell) === target) || null;
}

export function addUniqueSpellName(names = [], name = '', limit = Infinity) {
  if (!name) return arr(names);
  const current = arr(names);
  if (current.some((entry) => normalize(entry) === normalize(name))) return current;
  if (current.length >= limit) return current;
  return [...current, name];
}

export function removeSpellName(names = [], name = '') {
  return arr(names).filter((entry) => normalize(entry) !== normalize(name));
}

export function togglePreparedSpellName({ learned = [], prepared = [], name = '', limit = Infinity }) {
  const learnedNames = arr(learned);
  const currentPrepared = arr(prepared);
  if (!learnedNames.some((entry) => normalize(entry) === normalize(name))) return currentPrepared;
  if (currentPrepared.some((entry) => normalize(entry) === normalize(name))) return removeSpellName(currentPrepared, name);
  if (currentPrepared.length >= limit) return currentPrepared;
  return [...currentPrepared, name];
}

export function prunePreparedToLearned(learned = [], prepared = []) {
  const learnedSet = new Set(arr(learned).map(normalize));
  return arr(prepared).filter((name) => learnedSet.has(normalize(name)));
}

export function toCreatorSpellEntry(spell, fallbackLevel = 1) {
  if (!spell) return null;
  if (typeof spell === 'string') return { name: spell, level: fallbackLevel, school: '', description: '' };
  return {
    ...spell,
    name: spell.name || spell.spell_name || 'Unknown Spell',
    level: Number(spell.level ?? spell.spell_level ?? fallbackLevel),
    school: spell.school || '',
    description: spell.description || '',
  };
}

export function buildCreatorSpellPayload({
  className,
  cantripNames = [],
  learnedSpellNames = [],
  preparedSpellNames = [],
  cantripPool = [],
  spellPool = [],
}) {
  const cantrips = arr(cantripNames)
    .map((name) => toCreatorSpellEntry(findSpellByName(cantripPool, name) || name, 0))
    .filter(Boolean);
  const learned = arr(learnedSpellNames)
    .map((name) => toCreatorSpellEntry(findSpellByName(spellPool, name) || name, 1))
    .filter(Boolean);
  const prepared = prunePreparedToLearned(learnedSpellNames, preparedSpellNames)
    .map((name) => toCreatorSpellEntry(findSpellByName(spellPool, name) || name, 1))
    .filter(Boolean);

  if (className === 'Wizard') {
    return {
      cantrips_known: cantrips,
      spellbook: learned,
      spells_prepared: prepared,
    };
  }

  if (isCreatorPreparedCaster(className)) {
    return {
      cantrips_known: cantrips,
      spells_known: learned,
      spells_prepared: prepared,
    };
  }

  return {
    cantrips_known: cantrips,
    spells_known: learned,
  };
}
