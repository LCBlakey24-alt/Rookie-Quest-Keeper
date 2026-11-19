import { BAND_HEIGHTS, bandGlow, createTowerLife, newlyExited } from './towerLife';

describe('the dice tower light bands', () => {
  test('glow brightest as a die passes and stay dark with no dice near', () => {
    expect(bandGlow(9, [9])).toBeCloseTo(1, 5);
    expect(bandGlow(9, [10])).toBeLessThan(bandGlow(9, [9.3]));
    expect(bandGlow(9, [2])).toBeLessThan(0.001);
    expect(bandGlow(9, [])).toBe(0);
    expect(bandGlow(9, [9, 9, 9])).toBe(1);
  });

  test('run down the tower from top to bottom', () => {
    expect([...BAND_HEIGHTS].sort((a, b) => b - a)).toEqual(BAND_HEIGHTS);
  });
});

describe('dice leaving the tower', () => {
  test('are noticed once, as they cross the mouth', () => {
    expect(newlyExited([true, true], [true, false])).toEqual([false, true]);
    expect(newlyExited([true, false], [true, false])).toEqual([false, false]);
    expect(newlyExited([], [false])).toEqual([false]);
  });
});

describe('createTowerLife', () => {
  test('updates through a whole drop without errors and frees what it made', () => {
    const life = createTowerLife({ accent: '#ff1976' }, () => 0.5);
    life.update(1 / 60, { dropping: false, dice: [] });
    life.update(1 / 60, { dropping: true, dice: [{ position: [0, 12, -5], inTube: true }] });
    life.update(1 / 60, { dropping: true, dice: [{ position: [0, 1, -3], inTube: false }] });
    for (let i = 0; i < 90; i += 1) life.update(1 / 60, { dropping: true, dice: [{ position: [0, 0.5, 0], inTube: false }] });
    expect(life.group.children.length).toBeGreaterThan(5);
    expect(() => life.dispose()).not.toThrow();
  });
});
