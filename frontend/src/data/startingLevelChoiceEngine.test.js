import {
  applyStartingLevelChoicesToPayload,
  buildStartingLevelChoicePlan,
  getSpellChoicePlan,
  normaliseSpellSelection,
  normaliseWarlockSelection,
  pruneStartingLevelDetailSelections,
} from './startingLevelChoiceEngine';

const basePayload = (overrides = {}) => ({
  name: 'Choice Test Hero',
  character_class: 'Fighter',
  level: 1,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  feats: [],
  ...overrides,
});

describe('starting level choice engine', () => {
  test('creates prepared spell plans from level and spellcasting ability', () => {
    const plan = getSpellChoicePlan({ className: 'Cleric', level: 5, abilities: { wisdom: 16 } });

    expect(plan.spellcastingType).toBe('prepared');
    expect(plan.spellcastingAbility).toBe('wisdom');
    expect(plan.preparedTarget).toBe(8);
    expect(plan.hasPreparedSpellPicker).toBe(true);
    expect(plan.spellOptions.length).toBeGreaterThan(0);
    expect(plan.maxSpellLevel).toBeGreaterThanOrEqual(3);
  });

  test('creates prepared spell plans from nested imported ability score shapes', () => {
    expect(getSpellChoicePlan({
      className: 'Cleric',
      level: 5,
      abilities: { abilities: { wisdom: { score: 18, source: 'import' } } },
    }).preparedTarget).toBe(9);

    expect(getSpellChoicePlan({
      className: 'Druid',
      level: 4,
      abilities: { scores: { wisdom: { score: 14 } } },
    }).preparedTarget).toBe(6);
  });

  test('creates known spell and Warlock choice plans for higher-level Warlocks', () => {
    const plan = buildStartingLevelChoicePlan({ className: 'Warlock', startingLevel: 5, edition: '2014', abilities: { charisma: 16 } });

    expect(plan.spellPlan.hasKnownSpellPicker).toBe(true);
    expect(plan.spellPlan.knownTarget).toBeGreaterThan(0);
    expect(plan.warlockPlan.pactBoonRequired).toBe(true);
    expect(plan.warlockPlan.invocationCount).toBeGreaterThanOrEqual(3);
    expect(plan.hasChoices).toBe(true);
  });

  test('normalises spell and Warlock selections to their allowed limits', () => {
    const spellPlan = { cantripTarget: 1, knownTarget: 2, preparedTarget: 1 };
    const warlockPlan = { invocationCount: 2 };

    expect(normaliseSpellSelection({
      cantrips: ['A', 'B'],
      spells: ['C', 'D', 'E'],
      prepared: ['F', 'G'],
    }, spellPlan)).toMatchObject({
      cantrips: ['A'],
      spells: ['C', 'D'],
      prepared: ['F'],
    });

    expect(normaliseWarlockSelection({
      pactBoon: 'Pact of the Tome',
      invocations: ['Agonizing Blast', 'Devil’s Sight', 'Mask of Many Faces'],
    }, warlockPlan)).toEqual({
      pactBoon: 'Pact of the Tome',
      invocations: ['Agonizing Blast', 'Devil’s Sight'],
    });
  });

  test('prunes spell and Warlock detail selections when plan limits change', () => {
    const pruned = pruneStartingLevelDetailSelections({
      spells: {
        cantrips: ['Fire Bolt', 'Mage Hand'],
        spells: ['Hex', 'Armor of Agathys', 'Invisibility'],
        prepared: ['Shield', 'Magic Missile'],
        arcanum: { 6: 'Eyebite', 7: 'Forcecage' },
      },
      warlock: {
        pactBoon: 'Pact of the Tome',
        invocations: ['Agonizing Blast', 'Devil’s Sight', 'Mask of Many Faces'],
      },
      classSpecific: { metamagic: ['Quickened Spell'] },
    }, {
      spellPlan: {
        cantripTarget: 1,
        knownTarget: 2,
        preparedTarget: 1,
        arcanumLevels: [6],
      },
      warlockPlan: {
        pactBoonRequired: false,
        invocationCount: 1,
      },
    });

    expect(pruned.spells.cantrips).toEqual(['Fire Bolt']);
    expect(pruned.spells.spells).toEqual(['Hex', 'Armor of Agathys']);
    expect(pruned.spells.prepared).toEqual(['Shield']);
    expect(pruned.spells.arcanum).toEqual({ 6: 'Eyebite' });
    expect(pruned.warlock.pactBoon).toBe('');
    expect(pruned.warlock.invocations).toEqual(['Agonizing Blast']);
    expect(pruned.classSpecific).toEqual({ metamagic: ['Quickened Spell'] });
  });

  test('applies ASI choices, feats, prepared spells, Pact Boon, and invocations to payload', () => {
    const clericPlan = getSpellChoicePlan({ className: 'Cleric', level: 3, abilities: { wisdom: 16 } });
    const preparedSpell = clericPlan.spellOptions[0];
    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({ character_class: 'Cleric', wisdom: 16 }),
      {
        'asi-4': { mode: 'asi', abilityOne: 'wisdom', abilityTwo: 'constitution' },
        'asi-8': { mode: 'feat', featName: 'Test Feat' },
      },
      [{ name: 'Test Feat', description: 'A test feat.', source: 'test' }],
      {
        spellPlan: clericPlan,
        spells: { prepared: [preparedSpell.name] },
        warlockPlan: { pactBoonRequired: true, invocationCount: 2 },
        warlock: { pactBoon: 'Pact of the Tome', invocations: ['Agonizing Blast', 'Devil’s Sight'] },
      },
    );

    expect(enhanced.wisdom).toBe(17);
    expect(enhanced.constitution).toBe(11);
    expect(enhanced.feats.map((feat) => feat.name)).toContain('Test Feat');
    expect(enhanced.prepared_spells.map((spell) => spell.name)).toEqual([preparedSpell.name]);
    expect(enhanced.spells_prepared.map((spell) => spell.name)).toEqual([preparedSpell.name]);
    expect(enhanced.pact_boon).toBe('Pact of the Tome');
    expect(enhanced.eldritch_invocations).toEqual(['Agonizing Blast', 'Devil’s Sight']);
  });

  test('applies ASI choices to nested imported ability score shapes', () => {
    const enhanced = applyStartingLevelChoicesToPayload(
      {
        name: 'Nested Hero',
        character_class: 'Rogue',
        level: 4,
        abilityScores: { dexterity: 15, constitution: 12 },
        abilities: { dexterity: { score: 15, label: 'DEX' }, constitution: { score: 12, label: 'CON' } },
        feats: [],
      },
      { 'asi-4': { mode: 'asi', abilityOne: 'dexterity', abilityTwo: 'constitution' } },
      [],
      { spellPlan: {}, spells: {}, warlockPlan: null, warlock: {} },
    );

    expect(enhanced.abilityScores.dexterity).toBe(16);
    expect(enhanced.abilityScores.constitution).toBe(13);
    expect(enhanced.abilities.dexterity).toEqual({ score: 16, label: 'DEX' });
    expect(enhanced.abilities.constitution).toEqual({ score: 13, label: 'CON' });
    expect(enhanced.dexterity).toBeUndefined();
  });

  test('keeps top-level and nested ability scores in sync when both are present', () => {
    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({
        dexterity: 15,
        abilityScores: { dexterity: 15 },
        scores: { dexterity: { score: 15, source: 'import' } },
      }),
      { 'asi-4': { mode: 'asi', abilityOne: 'dexterity', abilityTwo: 'dexterity' } },
      [],
      { spellPlan: {}, spells: {}, warlockPlan: null, warlock: {} },
    );

    expect(enhanced.dexterity).toBe(17);
    expect(enhanced.abilityScores.dexterity).toBe(17);
    expect(enhanced.scores.dexterity).toEqual({ score: 17, source: 'import' });
  });

  test('does not save invalid stale Pact Boon or Mystic Arcanum choices', () => {
    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({
        character_class: 'Warlock',
        charisma: 16,
        pact_boon: 'Pact of the Blade',
        pactBoon: 'Pact of the Blade',
        mystic_arcanum: [{ name: 'Eyebite', level: 6 }],
      }),
      {},
      [],
      {
        spellPlan: { cantripTarget: 0, knownTarget: 0, preparedTarget: 0, arcanumLevels: [] },
        spells: { arcanum: { 6: 'Eyebite' } },
        warlockPlan: { pactBoonRequired: false, invocationCount: 1 },
        warlock: { pactBoon: 'Pact of the Tome', invocations: ['Agonizing Blast', 'Devil’s Sight'] },
      },
    );

    expect(enhanced.pact_boon).toBeUndefined();
    expect(enhanced.pactBoon).toBeUndefined();
    expect(enhanced.mystic_arcanum).toBeUndefined();
    expect(enhanced.eldritch_invocations).toEqual(['Agonizing Blast']);
  });

  test('clears stale saved spell fields when a build no longer supports them', () => {
    const enhanced = applyStartingLevelChoicesToPayload(
      basePayload({
        character_class: 'Fighter',
        cantrips_known: [{ name: 'Fire Bolt', level: 0 }],
        cantrips: [{ name: 'Fire Bolt', level: 0 }],
        spells_known: [{ name: 'Hex', level: 1 }],
        known_spells: [{ name: 'Hex', level: 1 }],
        prepared_spells: [{ name: 'Shield', level: 1 }],
        spells_prepared: [{ name: 'Shield', level: 1 }],
        preparedSpells: [{ name: 'Shield', level: 1 }],
      }),
      {},
      [],
      {
        spellPlan: { cantripTarget: 0, knownTarget: 0, preparedTarget: 0, arcanumLevels: [] },
        spells: {},
        warlockPlan: null,
        warlock: {},
      },
    );

    expect(enhanced.cantrips_known).toBeUndefined();
    expect(enhanced.cantrips).toBeUndefined();
    expect(enhanced.spells_known).toBeUndefined();
    expect(enhanced.known_spells).toBeUndefined();
    expect(enhanced.prepared_spells).toBeUndefined();
    expect(enhanced.spells_prepared).toBeUndefined();
    expect(enhanced.preparedSpells).toBeUndefined();
  });
});
