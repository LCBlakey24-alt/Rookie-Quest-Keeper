import { getPaladinBuilderReadiness } from './paladinBuilderReadiness';

describe('paladin builder readiness', () => {
  test('requires fighting style and subclass at appropriate levels', () => {
    expect(getPaladinBuilderReadiness({ level: 1 }).ready).toBe(true);
    expect(getPaladinBuilderReadiness({ level: 2 }).ready).toBe(false);
    expect(getPaladinBuilderReadiness({ level: 2, fightingStyle: 'Defense' }).ready).toBe(true);
    expect(getPaladinBuilderReadiness({ level: 3, fightingStyle: 'Defense' }).ready).toBe(false);
    expect(getPaladinBuilderReadiness({ level: 3, fightingStyle: 'Defense', subclass: 'Oath of Devotion' }).ready).toBe(true);
  });
});
