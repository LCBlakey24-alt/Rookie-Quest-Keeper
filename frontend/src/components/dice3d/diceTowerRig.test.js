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

describe('the spiral, funnel and peg shapes', () => {
  const { FUNNEL, HELIX, PEG_RADIUS, PEG_ROWS, TOWER_MID_Z, towerRigFor, towerShapeOf, isTowerRig } = jest.requireActual('./diceTowerRig');
  const BIGGEST_BALL = 0.9 * 1.06 * 0.82 * 2; // a d4's ball inside the tube
  const innerFront = TOWER.front - TOWER.wall;

  test('name a rig the scene understands, and round-trip', () => {
    ['classic', 'spiral', 'funnel', 'pegs'].forEach((shape) => {
      expect(isTowerRig(towerRigFor(shape))).toBe(true);
      expect(towerShapeOf(towerRigFor(shape))).toBe(shape);
    });
    expect(towerRigFor('classic')).toBe('tower');
    expect(isTowerRig('tray')).toBe(false);
    expect(towerShapeOf('tower:nonsense')).toBe('classic');
  });

  test('stay inside the tube, clear of the glass', () => {
    expect(TOWER_MID_Z + HELIX.outer).toBeLessThanOrEqual(innerFront + 1e-9);
    expect(TOWER_MID_Z + FUNNEL.rim).toBeLessThanOrEqual(innerFront + 1e-9);
    expect(TOWER_MID_Z - HELIX.outer).toBeGreaterThanOrEqual(TOWER.back - 1e-9);
  });

  test('leave room for the biggest die: helix width, funnel hole and peg gaps', () => {
    expect(HELIX.outer - HELIX.inner).toBeGreaterThan(BIGGEST_BALL);
    expect(FUNNEL.hole * 2).toBeGreaterThan(BIGGEST_BALL);
    const barToGlass = innerFront - TOWER_MID_Z - PEG_RADIUS;
    const barToBack = TOWER_MID_Z - TOWER.back - PEG_RADIUS;
    expect(Math.min(barToGlass, barToBack)).toBeGreaterThan(BIGGEST_BALL);
    expect(PEG_ROWS.length).toBeGreaterThan(2);
  });

  test('every shape adds its own colliders above the shared base', () => {
    expect(towerBoxes('spiral').some((box) => box.part === 'helix')).toBe(true);
    expect(towerBoxes('funnel').some((box) => box.part === 'funnel')).toBe(true);
    expect(towerBoxes('pegs').some((box) => box.part === 'deflector')).toBe(true);
    ['spiral', 'funnel', 'pegs'].forEach((shape) => {
      expect(towerBoxes(shape).map((box) => box.part)).toEqual(expect.arrayContaining(['front', 'side', 'back', 'ramp', 'tray-back']));
    });
  });

  test.each([
    ['spiral', [20]], ['spiral', [4]], ['spiral', [20, 20]],
    ['funnel', [20]], ['funnel', [4]], ['funnel', [6, 6, 6]],
    ['pegs', [20]], ['pegs', [4]], ['pegs', [6, 6, 6]],
  ])('%s: %p finds a throw that lands every die in the tray', (shape, sides) => {
    const plan = planThrow(sides.map((s) => spec(s)), 4242, towerRigFor(shape));
    expect(plan).not.toBeNull();
    expect(plan.positions.every(inTray)).toBe(true);
  });
});
