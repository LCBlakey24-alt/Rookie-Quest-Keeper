import {
  addUniqueSpellName,
  buildCreatorSpellPayload,
  getCreatorAvailableSpellPools,
  getCreatorPreparedSpellTarget,
  getCreatorSpellListLabel,
  isCreatorPreparedCaster,
  prunePreparedToLearned,
  removeSpellName,
  spellMatchesDropdownSearch,
  togglePreparedSpellName,
} from './creatorSpellSelectionFlow';

const spellPool = [
  { name: 'Magic Missile', level: 1, school: 'Evocation', description: 'Auto-hit force darts', damage: '3d4+3' },
  { name: 'Shield', level: 1, school: 'Abjuration', description: 'Reaction +5 AC' },
  { name: 'Cure Wounds', level: 1, school: 'Evocation', description: 'Touch healing', healing: '1d8+mod' },
];

const cantripPool = [
  { name: 'Fire Bolt', level: 0, school: 'Evocation', description: 'Ranged spell attack', damage: '1d10' },
  { name: 'Mage Hand', level: 0, school: 'Conjuration', description: 'Spectral hand' },
];

describe('creator spell selection flow', () => {
  test('identifies prepared casters and labels their learned list', () => {
    expect(isCreatorPreparedCaster('Wizard')).toBe(true);
    expect(isCreatorPreparedCaster('Cleric')).toBe(true);
    expect(isCreatorPreparedCaster('Warlock')).toBe(false);
    expect(getCreatorSpellListLabel('Wizard')).toBe('Spellbook');
    expect(getCreatorSpellListLabel('Cleric')).toBe('Learned');
    expect(getCreatorSpellListLabel('Warlock')).toBe('Known');
  });

  test('calculates prepared spell targets from casting ability and level', () => {
    expect(getCreatorPreparedSpellTarget('Wizard', { intelligence: 16 }, 1)).toBe(4);
    expect(getCreatorPreparedSpellTarget('Cleric', { wisdom: 16 }, 1)).toBe(4);
    expect(getCreatorPreparedSpellTarget('Druid', { wisdom: 14 }, 1)).toBe(3);
    expect(getCreatorPreparedSpellTarget('Warlock', { charisma: 16 }, 1)).toBe(0);
  });

  test('search matches dropdown spells by name, school, description, damage and healing', () => {
    expect(spellMatchesDropdownSearch(spellPool[0], 'magic')).toBe(true);
    expect(spellMatchesDropdownSearch(spellPool[1], 'abjuration')).toBe(true);
    expect(spellMatchesDropdownSearch(spellPool[2], 'healing')).toBe(true);
    expect(spellMatchesDropdownSearch(spellPool[0], 'damage')).toBe(true);
    expect(spellMatchesDropdownSearch(spellPool[0], '3d4')).toBe(true);
    expect(spellMatchesDropdownSearch(spellPool[0], 'nature')).toBe(false);
  });

  test('uses available class spell pools for dropdowns', () => {
    const wizardPools = getCreatorAvailableSpellPools('Wizard', 'shield');

    expect(wizardPools.cantrips).toEqual([]);
    expect(wizardPools.levelOneSpells.some((spell) => spell.name === 'Shield')).toBe(true);
  });

  test('adds and removes learned spell names within limits', () => {
    expect(addUniqueSpellName([], 'Magic Missile', 1)).toEqual(['Magic Missile']);
    expect(addUniqueSpellName(['Magic Missile'], 'Magic Missile', 2)).toEqual(['Magic Missile']);
    expect(addUniqueSpellName(['Magic Missile'], 'Shield', 1)).toEqual(['Magic Missile']);
    expect(removeSpellName(['Magic Missile', 'Shield'], 'shield')).toEqual(['Magic Missile']);
  });

  test('only prepares spells from the learned list and respects limits', () => {
    const learned = ['Magic Missile', 'Shield'];

    expect(togglePreparedSpellName({ learned, prepared: [], name: 'Shield', limit: 1 })).toEqual(['Shield']);
    expect(togglePreparedSpellName({ learned, prepared: ['Shield'], name: 'Shield', limit: 1 })).toEqual([]);
    expect(togglePreparedSpellName({ learned, prepared: ['Shield'], name: 'Magic Missile', limit: 1 })).toEqual(['Shield']);
    expect(togglePreparedSpellName({ learned, prepared: [], name: 'Cure Wounds', limit: 2 })).toEqual([]);
    expect(prunePreparedToLearned(['Shield'], ['Shield', 'Magic Missile'])).toEqual(['Shield']);
  });

  test('builds wizard payload with spellbook and prepared spells separated', () => {
    const payload = buildCreatorSpellPayload({
      className: 'Wizard',
      cantripNames: ['Fire Bolt'],
      learnedSpellNames: ['Magic Missile', 'Shield'],
      preparedSpellNames: ['Shield'],
      cantripPool,
      spellPool,
    });

    expect(payload.cantrips_known).toHaveLength(1);
    expect(payload.spellbook.map((spell) => spell.name)).toEqual(['Magic Missile', 'Shield']);
    expect(payload.spells_prepared.map((spell) => spell.name)).toEqual(['Shield']);
    expect(payload.spells_known).toBeUndefined();
  });

  test('builds prepared caster payload with learned and prepared spells separated', () => {
    const payload = buildCreatorSpellPayload({
      className: 'Cleric',
      cantripNames: [],
      learnedSpellNames: ['Cure Wounds', 'Shield'],
      preparedSpellNames: ['Cure Wounds'],
      spellPool,
    });

    expect(payload.spells_known.map((spell) => spell.name)).toEqual(['Cure Wounds', 'Shield']);
    expect(payload.spells_prepared.map((spell) => spell.name)).toEqual(['Cure Wounds']);
  });

  test('builds known caster payload without prepared spells', () => {
    const payload = buildCreatorSpellPayload({
      className: 'Warlock',
      cantripNames: ['Mage Hand'],
      learnedSpellNames: ['Magic Missile'],
      preparedSpellNames: ['Magic Missile'],
      cantripPool,
      spellPool,
    });

    expect(payload.spells_known.map((spell) => spell.name)).toEqual(['Magic Missile']);
    expect(payload.spells_prepared).toBeUndefined();
  });
});
