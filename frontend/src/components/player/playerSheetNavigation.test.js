import {
  playerSheetReturnFromLocation,
  playerSheetReturnState,
  safePlayerSheetReturnTo,
} from './playerSheetNavigation';

describe('player sheet return navigation', () => {
  test('allows only known internal player and mobile destinations', () => {
    expect(safePlayerSheetReturnTo('/player')).toBe('/player');
    expect(safePlayerSheetReturnTo('/player/campaign/campaign-a')).toBe('/player/campaign/campaign-a');
    expect(safePlayerSheetReturnTo('/mobile')).toBe('/mobile');
    expect(safePlayerSheetReturnTo('/mobile/campaign-a')).toBe('/mobile/campaign-a');
  });

  test('rejects external, protocol-relative, generic app and malformed destinations', () => {
    expect(safePlayerSheetReturnTo('https://example.com')).toBe('');
    expect(safePlayerSheetReturnTo('//example.com/player')).toBe('');
    expect(safePlayerSheetReturnTo('/home')).toBe('');
    expect(safePlayerSheetReturnTo('/player/campaign/')).toBe('');
    expect(safePlayerSheetReturnTo(null)).toBe('');
  });

  test('builds and reads router state only for safe destinations', () => {
    expect(playerSheetReturnState('/player/campaign/c1')).toEqual({ playerReturnTo: '/player/campaign/c1' });
    expect(playerSheetReturnState('https://example.com')).toBeUndefined();
    expect(playerSheetReturnFromLocation({ state: { playerReturnTo: '/player' } })).toBe('/player');
    expect(playerSheetReturnFromLocation({ state: { playerReturnTo: '/admin' } })).toBe('');
  });
});
