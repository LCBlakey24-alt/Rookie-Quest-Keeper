import {
  CANTRIPS_KNOWN,
  SPELLS_KNOWN,
  getSpellsForClass,
} from './spellDatabase';

const CREATOR_CASTER_CLASSES = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'];

const DEFAULT_SCORES = {
  intelligence: 16,
  wisdom: 16,
  charisma: 16,
};

const normalize = (value = '') => String(value).toLowerCase();
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const arr = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export function getCreatorSpellRequirements(className, scores = DEFAULT_SCORES) {
  if (!CREATOR_CASTER_CLASSES.includes(className)) return { cantrips: 0, spells: 0, type: 'none' };
  if (className === 'Wizard') return { cantrips: 3, spells: 6, type: 'spellbook' };
  if (className === 'Cleric') return { cantrips: 3, spells: Math.max(1, mod(scores.wisdom) + 1), type: 'prepared' };
  if (className === 'Druid') return { cantrips: 2, spells: Math.max(1, mod(scores.wisdom) + 1), type: 'prepared' };
  return {
    cantrips: CANTRIPS_KNOWN[className]?.[1] || 0,
    spells: SPELLS_KNOWN[className]?.[1] || 0,
    type: 'known',
  };
}

export function spellMatchesCreatorSearch(spell = {}, search = '') {
  const needle = normalize(search).trim();
  if (!needle) return true;
  return `${spell.name || ''} ${spell.school || ''} ${spell.description || ''} ${spell.damage || ''} ${spell.healing || ''}`
    .toLowerCase()
    .includes(needle);
}

export function getCreatorSpellPools(className, search = '') {
  const spellLists = getSpellsForClass(className) || {};
  const cantrips = arr(spellLists.cantrips).filter((spell) => spellMatchesCreatorSearch(spell, search));
  const levelOneSpells = arr(spellLists[1]).filter((spell) => spellMatchesCreatorSearch(spell, search));

  return {
    className,
    cantrips,
    levelOneSpells,
    total: cantrips.length + levelOneSpells.length,
  };
}

export function auditCreatorSpellSelection(classes = CREATOR_CASTER_CLASSES) {
  return classes.map((className) => {
    const requirements = getCreatorSpellRequirements(className);
    const pools = getCreatorSpellPools(className);
    const healingSearch = getCreatorSpellPools(className, 'healing');
    const damageSearch = getCreatorSpellPools(className, 'damage');
    const problems = [];

    if (requirements.cantrips > 0 && pools.cantrips.length === 0) {
      problems.push(`${className}: creator asks for cantrips but no cantrips are available.`);
    }

    if (requirements.spells > 0 && pools.levelOneSpells.length === 0) {
      problems.push(`${className}: creator asks for level 1 spells but no level 1 spells are available.`);
    }

    if (requirements.type === 'none') {
      problems.push(`${className}: creator did not identify this as a spellcasting class.`);
    }

    if (className === 'Cleric' && healingSearch.total === 0) {
      problems.push('Cleric: search cannot find healing spells.');
    }

    if (['Wizard', 'Sorcerer', 'Warlock'].includes(className) && damageSearch.total === 0) {
      problems.push(`${className}: search cannot find damage spells.`);
    }

    return {
      className,
      requirements,
      pools,
      problems,
    };
  });
}

export function buildCreatorSpellSelectionReport(results = auditCreatorSpellSelection()) {
  const failures = results.filter((result) => result.problems.length > 0);
  return {
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures,
    text: [
      `Creator spell picker checked ${results.length} caster class${results.length === 1 ? '' : 'es'}.`,
      failures.length ? `${failures.length} class${failures.length === 1 ? '' : 'es'} need attention.` : 'No creator spell picker problems found.',
      ...failures.flatMap((failure) => [
        `\n${failure.className}`,
        ...failure.problems.map((problem) => `- ${problem}`),
      ]),
    ].join('\n'),
  };
}

export { CREATOR_CASTER_CLASSES };
