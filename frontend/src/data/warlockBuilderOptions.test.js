import {
  getWarlockBuilderOptions,
  getWarlockInvocationOptions,
  validateWarlockBuilderSelections,
} from './warlockBuilderOptions';

describe('Warlock builder options', () => {
  test('2014 keeps a separate Pact Boon at level 3', () => {
    expect(getWarlockBuilderOptions({ level: 2, edition: '2014' }).pactBoonRequired).toBe(false);
    const levelThree = getWarlockBuilderOptions({ level: 3, edition: '2014' });
    expect(levelThree.pactBoonRequired).toBe(true);
    expect(levelThree.pactBoonOptions.map((option) => option.name)).toEqual(expect.arrayContaining([
      'Pact of the Blade',
      'Pact of the Chain',
      'Pact of the Tome',
    ]));
  });

  test('2024 uses pact choices as level-one Eldritch Invocations instead of a separate Pact Boon', () => {
    const options = getWarlockBuilderOptions({ level: 1, edition: '2024' });
    expect(options.pactBoonRequired).toBe(false);
    expect(options.pactBoonOptions).toEqual([]);
    expect(options.invocationCount).toBe(1);
    expect(options.eligibleInvocationOptions).toEqual(expect.arrayContaining([
      'Armor of Shadows',
      'Eldritch Mind',
      'Pact of the Blade',
      'Pact of the Chain',
      'Pact of the Tome',
    ]));
    expect(options.eligibleInvocationOptions).not.toContain('Agonizing Blast');
    expect(options.eligibleInvocationOptions).not.toContain('Thirsting Blade');
  });

  test('2024 invocation options unlock with their Warlock-level prerequisites', () => {
    expect(getWarlockInvocationOptions(2, '2024')).toEqual(expect.arrayContaining([
      'Agonizing Blast',
      'Devil’s Sight',
      'Fiendish Vigor',
      'Lessons of the First Ones',
    ]));
    expect(getWarlockInvocationOptions(2, '2024')).not.toContain('Thirsting Blade');
    expect(getWarlockInvocationOptions(5, '2024')).toEqual(expect.arrayContaining([
      'Thirsting Blade',
      'Eldritch Smite',
      'Investment of the Chain Master',
    ]));
    expect(getWarlockInvocationOptions(7, '2024')).toContain('Whispers of the Grave');
    expect(getWarlockInvocationOptions(9, '2024')).toContain('Visions of Distant Realms');
    expect(getWarlockInvocationOptions(15, '2024')).toContain('Witch Sight');
  });

  test('2024 builder catches invocation-level and invocation-chain prerequisites', () => {
    const tooEarly = validateWarlockBuilderSelections({
      level: 1,
      edition: '2024',
      invocations: ['Agonizing Blast'],
    });
    expect(tooEarly.errors).toContain('Agonizing Blast is not available to this Warlock at level 1.');

    const missingPact = validateWarlockBuilderSelections({
      level: 5,
      edition: '2024',
      invocations: ['Thirsting Blade', 'Armor of Shadows', 'Eldritch Mind', 'Devil’s Sight', 'Fiendish Vigor'],
    });
    expect(missingPact.errors).toContain('Thirsting Blade requires Pact of the Blade.');
  });

  test('2024 validation ignores stale separate Pact Boon data', () => {
    const result = validateWarlockBuilderSelections({
      level: 1,
      edition: '2024',
      pactBoon: 'Pact of the Talisman',
      invocations: ['Pact of the Tome'],
    });
    expect(result.errors).not.toContain('Choose a valid Pact Boon.');
    expect(result.selections.pactBoon).toBeNull();
  });
});
