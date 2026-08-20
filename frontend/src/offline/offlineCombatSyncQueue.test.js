import { combatStateSnapshot, combatStatesMatch } from './offlineCombatSyncQueue';

describe('offline combat state snapshots', () => {
  test('normalises combatant and API field aliases to the same state', () => {
    const combatant = {
      hp: 18,
      tempHp: 4,
      conditions: ['prone', 'poisoned'],
      deathSaves: { successes: 1, failures: 2 },
      concentrating_on: 'Bless',
    };
    const apiCharacter = {
      current_hit_points: 18,
      temporary_hit_points: 4,
      conditions: ['poisoned', 'prone'],
      death_saves_successes: 1,
      death_saves_failures: 2,
      concentration: 'Bless',
    };

    expect(combatStatesMatch(combatant, apiCharacter)).toBe(true);
  });

  test('deduplicates and sorts conditions before conflict comparison', () => {
    expect(combatStateSnapshot({ conditions: ['stunned', 'prone', 'stunned'] }).conditions)
      .toEqual(['prone', 'stunned']);
  });

  test('clamps invalid negative hp and death save values', () => {
    expect(combatStateSnapshot({
      hp: -9,
      tempHp: -2,
      deathSaves: { successes: 99, failures: -4 },
    })).toMatchObject({
      current_hit_points: 0,
      temporary_hit_points: 0,
      death_saves_successes: 3,
      death_saves_failures: 0,
    });
  });

  test.each([
    ['hp', { hp: 20 }, { hp: 19 }],
    ['temporary hp', { hp: 20, tempHp: 5 }, { hp: 20, tempHp: 4 }],
    ['conditions', { conditions: ['prone'] }, { conditions: ['poisoned'] }],
    ['death saves', { deathSaves: { successes: 1, failures: 0 } }, { deathSaves: { successes: 0, failures: 0 } }],
    ['concentration', { concentrating_on: 'Bless' }, { concentrating_on: 'Hex' }],
  ])('detects a real %s conflict', (_label, left, right) => {
    expect(combatStatesMatch(left, right)).toBe(false);
  });
});
