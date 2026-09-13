import {
  applyStartingLevelChoicesToPayload,
  getSpellChoicePlan,
} from './startingLevelChoiceEngine';

const basePayload = (overrides = {}) => ({
  name: 'Spell Test Hero',
  character_class: 'Bard',
  level: 1,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 16,
  feats: [],
  ...overrides,
});

function names(options = [], count = 1) {
  return options.slice(0, count).map((spell) => spell.name);
}

describe('starting-level edition spell preparation integration', () => {
  test.each([
    ['Bard', 5, 9],
    ['Cleric', 5, 9],
    ['Druid', 2, 5],
    ['Paladin', 5, 6],
    ['Ranger', 2, 3],
    ['Sorcerer', 2, 4],
    ['Warlock', 2, 3],
  ])('2024 %s uses prepared spells rather than legacy known spells', (className, level, preparedTarget) => {
    const plan = getSpellChoicePlan({
      className,
      level,
      edition: '2024',
      abilities: { charisma: 18, wisdom: 18 },
    });

    expect(plan.spellSelectionMode).toBe('prepared');
    expect(plan.knownTarget).toBe(0);
    expect(plan.preparedTarget).toBe(preparedTarget);
    expect(plan.hasKnownSpellPicker).toBe(false);
    expect(plan.hasPreparedSpellPicker).toBe(true);
  });

  test('2024 Ranger can choose level-one prepared spells', () => {
    const plan = getSpellChoicePlan({
      className: 'Ranger',
      level: 1,
      edition: '2024',
      abilities: { wisdom: 16 },
    });

    expect(plan.maxSpellLevel).toBe(1);
    expect(plan.preparedTarget).toBe(2);
    expect(plan.spellOptions.length).toBeGreaterThan(0);
  });

  test('2014 Bard remains a known-spell caster', () => {
    const plan = getSpellChoicePlan({ className: 'Bard', level: 5, edition: '2014', abilities: { charisma: 18 } });

    expect(plan.spellSelectionMode).toBe('known');
    expect(plan.knownTarget).toBe(8);
    expect(plan.preparedTarget).toBe(0);
    expect(plan.hasKnownSpellPicker).toBe(true);
  });

  test('Wizard creation separates spellbook choices from prepared choices', () => {
    const plan = getSpellChoicePlan({
      className: 'Wizard',
      level: 1,
      edition: '2024',
      abilities: { intelligence: 18 },
    });

    expect(plan.spellSelectionMode).toBe('spellbook');
    expect(plan.spellbookTarget).toBe(6);
    expect(plan.preparedTarget).toBe(4);
    expect(plan.knownTarget).toBe(0);
    expect(plan.hasSpellbookPicker).toBe(true);
    expect(plan.spellOptions.length).toBeGreaterThanOrEqual(6);

    const spellbook = names(plan.spellOptions, 6);
    const prepared = spellbook.slice(0, 4);
    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({ character_class: 'Wizard', intelligence: 18, charisma: 10 }),
      {},
      [],
      {
        spellPlan: plan,
        spells: { spells: spellbook, prepared },
        warlockPlan: null,
        warlock: {},
      },
    );

    expect(enhanced.spellbook.map((spell) => spell.name)).toEqual(spellbook);
    expect(enhanced.spells_prepared.map((spell) => spell.name)).toEqual(prepared);
    expect(enhanced.spells_known).toBeUndefined();
    expect(enhanced.known_spells).toBeUndefined();
  });

  test('Wizard prepared list cannot persist a spell outside the chosen spellbook', () => {
    const plan = getSpellChoicePlan({ className: 'Wizard', level: 1, edition: '2014', abilities: { intelligence: 16 } });
    const spellbook = names(plan.spellOptions, 6);
    const outside = plan.spellOptions.find((spell) => !spellbook.includes(spell.name));
    expect(outside).toBeTruthy();

    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({ character_class: 'Wizard', intelligence: 16, charisma: 10 }),
      {},
      [],
      {
        spellPlan: plan,
        spells: { spells: spellbook, prepared: [spellbook[0], outside.name] },
        warlockPlan: null,
        warlock: {},
      },
    );

    expect(enhanced.spells_prepared.map((spell) => spell.name)).toEqual([spellbook[0]]);
  });

  test('2024 Bard prepared choices save to prepared state without a known-spell mirror', () => {
    const plan = getSpellChoicePlan({ className: 'Bard', level: 1, edition: '2024', abilities: { charisma: 16 } });
    const prepared = names(plan.spellOptions, Math.min(plan.preparedTarget, plan.spellOptions.length));
    expect(prepared.length).toBeGreaterThan(0);

    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({ character_class: 'Bard', level: 1 }),
      {},
      [],
      {
        spellPlan: plan,
        spells: { prepared },
        warlockPlan: null,
        warlock: {},
      },
    );

    expect(enhanced.spells_prepared.map((spell) => spell.name)).toEqual(prepared);
    expect(enhanced.spells_known).toBeUndefined();
  });
});
