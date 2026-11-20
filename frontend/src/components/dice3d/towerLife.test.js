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

describe('peg flashes and the crit celebration', () => {
  const { touchesBar, CELEBRATION } = jest.requireActual('./towerLife');

  test('a die touching a bar is noticed; one clear of it is not', () => {
    const bar = { centre: [0, 8, -5.65], radius: 0.15, length: 4.2, axis: 'x' };
    expect(touchesBar([1, 8.9, -5.65], bar)).toBe(true);
    expect(touchesBar([1, 10.5, -5.65], bar)).toBe(false);
  });

  test('celebrates a natural 20 or 1, stays busy while it plays, then rests', () => {
    expect(Object.keys(CELEBRATION)).toEqual(['crit', 'fumble']);
    const life = createTowerLife({ accent: '#ff1976', shape: 'pegs' }, () => 0.5);
    life.update(1 / 60, { dropping: false, dice: [] });
    for (let i = 0; i < 60; i += 1) life.update(1 / 60, { dropping: true, dice: [] });
    expect(life.busy()).toBe(false);
    life.celebrate('crit');
    expect(life.busy()).toBe(true);
    for (let i = 0; i < 200; i += 1) life.update(1 / 60, { dropping: true, dice: [] });
    expect(life.busy()).toBe(false);
    life.celebrate('nonsense');
    expect(life.busy()).toBe(false);
    life.dispose();
  });

  test('the peg drop gets a glow sleeve on every bar', () => {
    const plain = createTowerLife({ accent: '#ff1976', shape: 'classic' }, () => 0.5);
    const pegs = createTowerLife({ accent: '#ff1976', shape: 'pegs' }, () => 0.5);
    expect(pegs.group.children.length).toBeGreaterThan(plain.group.children.length);
    plain.dispose(); pegs.dispose();
  });
});
