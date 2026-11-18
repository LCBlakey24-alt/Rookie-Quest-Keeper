import { BAFFLES, TOWER, TOWER_MAX_DICE, bafflePlank, inTray, rampPlank, towerBoxes } from './diceTowerRig';
import { planThrow, simulateThrow, specForDie, longestReplayMs } from './diceTrayScene';
import { TOWER_SKIN_CATALOG } from './towerSkinCatalog';

const DIE_WIDTH = 1.8; // a die is about 1.8 across (radius 0.9)
const spec = (sides, result = 1) => specForDie({ sides, result });

describe('tower geometry', () => {
  test('every baffle leaves more than a die of room to the opposite wall', () => {
    BAFFLES.forEach((baffle) => {
      const plank = bafflePlank(baffle);
      const run = Math.cos(baffle.tilt) * plank.length;
      expect(TOWER.depth - run).toBeGreaterThan(DIE_WIDTH);
    });
  });

  test('the lower baffle clears the ramp by more than a die', () => {
    const lower = BAFFLES[BAFFLES.length - 1];
    const tipY = lower.y - Math.sin(lower.tilt) * TOWER.depth * lower.reach;
    const ramp = rampPlank();
    expect(tipY - ramp.centre[1]).toBeGreaterThan(DIE_WIDTH);
  });

  test('the mouth and the tube are wider than a die', () => {
    expect(TOWER.mouth).toBeGreaterThan(DIE_WIDTH);
    expect(TOWER.width).toBeGreaterThan(DIE_WIDTH * 2);
  });

  test('the collider list has the tube, two baffles, a ramp and the tray back', () => {
    const parts = towerBoxes().map((box) => box.part);
    expect(parts.filter((part) => part === 'baffle')).toHaveLength(BAFFLES.length);
    expect(parts).toEqual(expect.arrayContaining(['front', 'side', 'back', 'ramp', 'tray-back']));
  });

  test('a die is in the tray only once it is out of the tube', () => {
    expect(inTray([0, 0])).toBe(true);
    expect(inTray([0, TOWER.front - 1])).toBe(false);
  });
});

describe('tower throws', () => {
  test('are deterministic for a seed', () => {
    const specs = [spec(20, 11), spec(6, 3)];
    expect(simulateThrow(specs, 777, 'tower')).toEqual(simulateThrow(specs, 777, 'tower'));
  });

  test.each([
    ['d20', [20]],
    ['d4', [4]],
    ['advantage', [20, 20]],
    ['d100', [10, 10]],
    ['3d6', [6, 6, 6]],
  ])('%s finds a throw that lands every die in the tray', (name, sides) => {
    const plan = planThrow(sides.map((s) => spec(s)), 4242, 'tower');
    expect(plan).not.toBeNull();
    expect(plan.positions.every(inTray)).toBe(true);
  });

  test('the tower is given longer to finish than the tray', () => {
    expect(longestReplayMs('tower')).toBeGreaterThan(longestReplayMs('tray'));
    expect(longestReplayMs('tower')).toBeLessThanOrEqual(20000);
  });

  test('is built for pools up to eight dice', () => {
    expect(TOWER_MAX_DICE).toBe(8);
  });
});

describe('tower designs', () => {
  test('have unique ids, names and colours', () => {
    const ids = TOWER_SKIN_CATALOG.map((skin) => skin.id);
    expect(new Set(ids).size).toBe(ids.length);
    TOWER_SKIN_CATALOG.forEach((skin) => {
      expect(skin.name).toBeTruthy();
      expect(skin.edge).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
