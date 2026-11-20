import { applyDamage, concentrationSaveDc, damageOutcomeMessage, damageUpdatesForCharacter } from './damageTransitions';

describe('taking damage', () => {
  test('temporary hit points soak damage first, and a concentration save is still due', () => {
    const result = applyDamage({ currentHp: 10, tempHp: 5, maxHp: 20, amount: 4, concentrating: true });
    expect(result).toMatchObject({ currentHp: 10, tempHp: 1, tempAbsorbed: 4, concentrationCheckDc: 10 });
  });

  test('concentration DC is 10 or half the damage', () => {
    expect(concentrationSaveDc(7)).toBe(10);
    expect(concentrationSaveDc(30)).toBe(15);
  });

  test('dropping to 0 ends concentration, asks for no save, and starts death saves afresh', () => {
    const result = applyDamage({ currentHp: 5, maxHp: 20, amount: 8, concentrating: true, successes: 1, failures: 1 });
    expect(result).toMatchObject({ currentHp: 0, droppedToZero: true, endsConcentration: true, concentrationCheckDc: null, successes: 0, failures: 0, instantDeath: false });
  });

  test('damage left over that reaches the hit point maximum is instant death', () => {
    // 5 HP, max 20: 25 damage leaves 20 over.
    expect(applyDamage({ currentHp: 5, maxHp: 20, amount: 25 })).toMatchObject({ instantDeath: true, failures: 3 });
    expect(applyDamage({ currentHp: 5, maxHp: 20, amount: 24 })).toMatchObject({ instantDeath: false, failures: 0 });
  });

  test('damage at 0 HP is a failed death save (review finding 12, reproduction A)', () => {
    expect(applyDamage({ currentHp: 0, maxHp: 20, amount: 5 })).toMatchObject({ currentHp: 0, failures: 1, failuresAdded: 1 });
  });

  test('a critical hit at 0 HP is two failed saves, capped at three', () => {
    expect(applyDamage({ currentHp: 0, maxHp: 20, amount: 5, critical: true })).toMatchObject({ failures: 2, failuresAdded: 2 });
    expect(applyDamage({ currentHp: 0, maxHp: 20, amount: 5, critical: true, failures: 2 })).toMatchObject({ failures: 3, failuresAdded: 1 });
  });

  test('a stable creature hit at 0 HP is no longer stable', () => {
    expect(applyDamage({ currentHp: 0, maxHp: 20, amount: 2, successes: 3 })).toMatchObject({ successes: 0, failures: 1 });
  });

  test('a dying creature keeps its successes when hit', () => {
    expect(applyDamage({ currentHp: 0, maxHp: 20, amount: 2, successes: 2 })).toMatchObject({ successes: 2, failures: 1 });
  });

  test('damage at 0 HP that reaches the maximum kills outright', () => {
    expect(applyDamage({ currentHp: 0, maxHp: 20, amount: 20 })).toMatchObject({ instantDeath: true, failures: 3 });
  });

  test('temporary hit points at 0 HP soak the hit, so no save is failed', () => {
    expect(applyDamage({ currentHp: 0, tempHp: 5, maxHp: 20, amount: 3 })).toMatchObject({ tempHp: 2, failures: 0, failuresAdded: 0 });
  });
});

describe('saving the result', () => {
  test('dropping to zero saves concentration as ended (reproduction B)', () => {
    const character = { concentrating_on: 'Bless', death_saves_successes: 0, death_saves_failures: 0 };
    const updates = damageUpdatesForCharacter(character, applyDamage({ currentHp: 5, maxHp: 20, amount: 5, concentrating: true }));
    expect(updates).toEqual({ current_hit_points: 0, temporary_hit_points: 0, temp_hp: 0, concentrating_on: null, concentration: null });
  });

  test('only changed death saves are written', () => {
    const character = { death_saves_successes: 1, death_saves_failures: 0 };
    const updates = damageUpdatesForCharacter(character, applyDamage({ currentHp: 0, maxHp: 20, amount: 3, successes: 1 }));
    expect(updates).toEqual({ current_hit_points: 0, temporary_hit_points: 0, temp_hp: 0, death_saves_failures: 1 });
  });

  test('says what happened in plain words', () => {
    expect(damageOutcomeMessage('Mira', applyDamage({ currentHp: 0, maxHp: 20, amount: 3, critical: true }))).toMatch(/two failed death saves/);
    expect(damageOutcomeMessage('Mira', applyDamage({ currentHp: 3, maxHp: 20, amount: 40 }))).toMatch(/instant death/);
    expect(damageOutcomeMessage('Mira', applyDamage({ currentHp: 9, maxHp: 20, amount: 3 }))).toBeNull();
  });
});
