import { playerToCombatant } from './LiveEncounterLauncher';

describe('LiveEncounterLauncher player combat handoff', () => {
  test('preserves temp HP, death saves and concentration', () => {
    const combatant = playerToCombatant({
      id: 'char-1',
      character_id: 'char-1',
      name: 'Hero',
      hp: 17,
      max_hp: 40,
      temporary_hit_points: 6,
      ac: 16,
      initiativeMod: 2,
      conditions: ['poisoned'],
      death_saves_successes: 1,
      death_saves_failures: 2,
      concentrating_on: 'Bless',
      rqk_pending_combat_sync: true,
      source: 'character',
    });

    expect(combatant.hp).toBe(17);
    expect(combatant.maxHp).toBe(40);
    expect(combatant.tempHp).toBe(6);
    expect(combatant.conditions).toEqual(['poisoned']);
    expect(combatant.deathSaves).toEqual({ successes: 1, failures: 2 });
    expect(combatant.concentrating_on).toBe('Bless');
    expect(combatant.rqk_pending_combat_sync).toBe(true);
  });
});
