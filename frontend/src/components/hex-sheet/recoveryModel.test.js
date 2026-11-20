import { deathSavePipUpdates, deathSaveResultStyle, deathSaveUpdates, hitDieBlocker, hitDieUpdates, recoveryState } from './recoveryModel';

const fighter = { level: 5, hit_dice: '5d10', hit_dice_remaining: 3, constitution: 14, max_hit_points: 44, current_hit_points: 20 };

describe('recoveryState', () => {
  test('reads hit dice, HP and death saves', () => {
    expect(recoveryState(fighter)).toMatchObject({
      currentHp: 20, maxHp: 44, hitDieSides: 10, hitDiceTotal: 5, hitDiceRemaining: 3, conMod: 2, showDeathSaves: false,
    });
  });

  test('shows death saves at 0 HP or while any are marked', () => {
    expect(recoveryState({ ...fighter, current_hit_points: 0 }).showDeathSaves).toBe(true);
    expect(recoveryState({ ...fighter, death_saves_failures: 1 }).showDeathSaves).toBe(true);
  });
});

describe('Hit Dice', () => {
  test('heal the roll plus CON, capped at max HP, and spend one die', () => {
    expect(hitDieUpdates(recoveryState(fighter), 7)).toEqual({ healed: 9, total: 9, updates: { current_hit_points: 29, hit_dice_remaining: 2, hit_dice_remaining_by_die: { 10: 2 } } });
    expect(hitDieUpdates(recoveryState({ ...fighter, current_hit_points: 40 }), 10).updates.current_hit_points).toBe(44);
  });

  test('2024 rules recover at least 1 and need 1 HP first', () => {
    const weak = { ...fighter, constitution: 6, rules_edition: '2024' };
    expect(hitDieUpdates(recoveryState(weak), 1).healed).toBe(1);
    expect(hitDieBlocker(recoveryState({ ...weak, current_hit_points: 0 }))).toMatch(/at least 1 HP/);
  });

  test('cannot be spent with none left or at full HP', () => {
    expect(hitDieBlocker(recoveryState({ ...fighter, hit_dice_remaining: 0 }))).toMatch(/No Hit Dice/);
    expect(hitDieBlocker(recoveryState({ ...fighter, current_hit_points: 44 }))).toMatch(/full HP/);
    expect(hitDieBlocker(recoveryState(fighter))).toBeNull();
  });
});

describe('death saves', () => {
  const dying = recoveryState({ ...fighter, current_hit_points: 0, death_saves_successes: 1, death_saves_failures: 1 });

  test('a natural 20 regains 1 HP and clears the saves', () => {
    expect(deathSaveUpdates(dying, 20).updates).toEqual({ current_hit_points: 1, death_saves_successes: 0, death_saves_failures: 0 });
  });

  test('a natural 1 marks two failures; 10+ a success; under 10 a failure', () => {
    expect(deathSaveUpdates(dying, 1)).toMatchObject({ updates: { death_saves_failures: 3 }, message: expect.stringMatching(/died/) });
    expect(deathSaveUpdates(dying, 10).updates).toEqual({ death_saves_successes: 2 });
    expect(deathSaveUpdates(dying, 9).updates).toEqual({ death_saves_failures: 2 });
  });

  test('a third success is stable', () => {
    expect(deathSaveUpdates({ ...dying, successes: 2 }, 15).message).toMatch(/stable/);
  });

  test('tapping a pip sets the count, tapping the last marked pip clears it', () => {
    expect(deathSavePipUpdates(dying, 'success', 3)).toEqual({ death_saves_successes: 3 });
    expect(deathSavePipUpdates(dying, 'failure', 1)).toEqual({ death_saves_failures: 0 });
  });
});

describe('death saves in the dice tray and after healing', () => {
  test('a pass is green and a fail is red, whatever the natural roll', () => {
    expect(deathSaveResultStyle(10)).toEqual({ tone: 'success', caption: 'Pass' });
    expect(deathSaveResultStyle(20).tone).toBe('success');
    expect(deathSaveResultStyle(9)).toEqual({ tone: 'failure', caption: 'Fail' });
    expect(deathSaveResultStyle(1).tone).toBe('failure');
  });

  test('a Hit Die that brings the character above 0 HP clears the death saves', () => {
    const dying = recoveryState({ ...fighter, current_hit_points: 0, death_saves_successes: 2, death_saves_failures: 1 });
    expect(hitDieUpdates(dying, 6).updates).toMatchObject({ death_saves_successes: 0, death_saves_failures: 0 });
    expect(hitDieUpdates(recoveryState(fighter), 6).updates).not.toHaveProperty('death_saves_successes');
  });
});


describe('multiclass Hit Dice (review finding 10)', () => {
  const fighterWizard = { class_levels: { Fighter: 1, Wizard: 1 }, hit_dice: '1d10 + 1d6', hit_dice_remaining: 2, constitution: 10, max_hit_points: 20, current_hit_points: 5 };

  test('shows each die size as its own pool, not "2 of 1 left"', () => {
    const state = recoveryState(fighterWizard);
    expect(state.pools).toEqual([{ sides: 10, total: 1, remaining: 1 }, { sides: 6, total: 1, remaining: 1 }]);
    expect(state.hitDiceTotal).toBe(2);
  });

  test('spending the d10 leaves only the d6', () => {
    const spent = hitDieUpdates(recoveryState(fighterWizard), 4, 10);
    expect(spent.updates).toMatchObject({ hit_dice_remaining: 1, hit_dice_remaining_by_die: { 10: 0, 6: 1 } });
    const after = recoveryState({ ...fighterWizard, ...spent.updates });
    expect(after.pools.find((pool) => pool.sides === 10).remaining).toBe(0);
    expect(after.hitDieSides).toBe(6);
  });
});
