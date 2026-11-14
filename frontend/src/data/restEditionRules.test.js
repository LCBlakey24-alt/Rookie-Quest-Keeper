import { rollHitDie } from '../components/clean-sheet/cleanSheetUtils';
import { canStartRest, getCharacterEdition, restBlockReason } from './characterRestRules';

describe('edition-aware rest eligibility', () => {
  test('2014 characters preserve legacy rest behaviour at zero HP', () => {
    const character = { rules_edition: '2014', current_hit_points: 0, max_hit_points: 20 };
    expect(getCharacterEdition(character)).toBe('2014');
    expect(canStartRest(character)).toBe(true);
  });

  test('2024 characters need at least one HP to start a rest', () => {
    expect(canStartRest({ rules_edition: '2024', current_hit_points: 0, max_hit_points: 20 })).toBe(false);
    expect(canStartRest({ ruleset_id: 'dnd5e_2024', current_hit_points: 1, max_hit_points: 20 })).toBe(true);
  });

  test('legacy 2024 saves without a current HP field fall back to saved max HP', () => {
    expect(canStartRest({ rules_edition: '2024', max_hit_points: 20 })).toBe(true);
  });
});

describe('edition-aware Hit Die healing minimums', () => {
  afterEach(() => jest.restoreAllMocks());

  test('2014 Hit Die healing can resolve to zero after a negative Constitution modifier', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // rolls 1
    expect(rollHitDie(8, -3, { minimum: 0 })).toEqual({ die: 1, total: 0 });
  });

  test('2024 Hit Point Die healing never resolves below one', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // rolls 1
    expect(rollHitDie(8, -3, { minimum: 1 })).toEqual({ die: 1, total: 1 });
  });
});

describe('rest eligibility by state and kind (review finding 5)', () => {
  const hero = (edition, hp, extra = {}) => ({ rules_edition: edition, max_hit_points: 30, current_hit_points: hp, ...extra });
  test.each(['2014', '2024'])('%s: conscious can take both; dead can take neither', (edition) => {
    expect(canStartRest(hero(edition, 12), 'short')).toBe(true);
    expect(canStartRest(hero(edition, 12), 'long')).toBe(true);
    expect(restBlockReason(hero(edition, 0, { death_saves_failures: 3 }), 'short')).toMatch(/dead/);
    expect(restBlockReason(hero(edition, 0, { death_saves_failures: 3 }), 'long')).toMatch(/dead/);
  });
  test('2014 at 0 HP (unconscious or stable): a Short Rest yes, a Long Rest gives no benefits', () => {
    for (const state of [{ death_saves_failures: 1 }, { death_saves_successes: 3 }]) {
      expect(canStartRest(hero('2014', 0, state), 'short')).toBe(true);
      expect(restBlockReason(hero('2014', 0, state), 'long')).toMatch(/at least 1 HP at the start of a Long Rest/);
    }
  });
  test('2024 at 0 HP: neither', () => {
    expect(canStartRest(hero('2024', 0, { death_saves_successes: 3 }), 'short')).toBe(false);
    expect(canStartRest(hero('2024', 0, { death_saves_successes: 3 }), 'long')).toBe(false);
  });
});
