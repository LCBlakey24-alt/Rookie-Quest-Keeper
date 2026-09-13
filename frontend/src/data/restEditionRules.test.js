import { rollHitDie } from '../components/clean-sheet/cleanSheetUtils';
import { canStartRest, getCharacterEdition } from './characterRestRules';

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
