import {
  isPlayerVisibleCombatToken,
  getCombatTokenMapPosition,
  clampMapPercent,
} from './playerDisplayCombatTokens';

describe('safe combat tokens for the player display', () => {
  test.each([
    { hidden: true }, { hidden: 'true' }, { is_hidden: true }, { gm_only: true },
    { secret: true }, { visible: false }, { is_visible: false },
    { player_visible: false }, { show_to_players: false },
    { visibility: 'hidden' }, { visibility: 'secret' }, { visibility: 'gm-only' },
    { visibility: 'private' },
  ])('never publishes an explicitly private token: %p', flag => {
    expect(isPlayerVisibleCombatToken({ id: 'unseen', ...flag })).toBe(false);
  });

  test('does not treat missing visibility flags as private', () => {
    expect(isPlayerVisibleCombatToken({ name: 'Revealed Goblin' })).toBe(true);
    expect(isPlayerVisibleCombatToken({ visible: true, hidden: false })).toBe(true);
  });

  test('retains valid zero and map-edge coordinates', () => {
    expect(getCombatTokenMapPosition({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(getCombatTokenMapPosition({ position: { x: 100, y: 0 } })).toEqual({ x: 100, y: 0 });
    expect(getCombatTokenMapPosition({ token_x: '0', token_y: '100' })).toEqual({ x: 0, y: 100 });
    expect(clampMapPercent(0)).toBe(0);
    expect(clampMapPercent(100)).toBe(100);
  });

  test('distinguishes an unpositioned creature from a token at 0,0', () => {
    expect(getCombatTokenMapPosition({})).toBeNull();
    expect(getCombatTokenMapPosition({ x: '', y: undefined })).toBeNull();
    expect(getCombatTokenMapPosition({ x: 'wrong', y: Infinity })).toBeNull();
    expect(getCombatTokenMapPosition({ x: 0 })).toEqual({ x: 0, y: 50 });
    expect(clampMapPercent(null)).toBe(50);
    expect(clampMapPercent(-3)).toBe(0);
    expect(clampMapPercent(999)).toBe(100);
  });
});
