import { centreRadiusFor, planThrow, simulateThrow, specForDie, throwAttemptsFor } from './diceTrayScene';
import { seedFromKey, settledFaceIndex } from './diceFaceReading';

const spec = (sides, result, dropped = false) => specForDie({ sides, result, dropped });

describe('specForDie', () => {
  test('describes a die the tray can show', () => {
    const d20 = spec(20, 17);
    expect(d20.sides).toBe(20);
    expect(d20.result).toBe(17);
    expect(d20.normals).toHaveLength(20);
    expect(d20.readFace).toBe('up');
  });

  test('declines a die with no solid, so the caller can fall back', () => {
    expect(spec(7, 3)).toBeNull();
  });

  test('declines a result the die cannot physically show', () => {
    // A corrupt or homebrew payload claiming a 21 on a d20 must not be
    // quietly rounded onto some other face.
    expect(spec(20, 21)).toBeNull();
    expect(spec(6, 0)).toBeNull();
  });

  test('carries the dropped flag through for advantage and keep/drop', () => {
    expect(spec(20, 4, true).dropped).toBe(true);
  });
});

describe('the throw is deterministic', () => {
  test('the same dice and seed always settle the same way', () => {
    const specs = [spec(20, 11), spec(6, 3)];
    const first = simulateThrow(specs, 12345);
    const second = simulateThrow(specs, 12345);

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(first.faces).toHaveLength(2);
    expect(first.positions).toHaveLength(2);
  });

  test('a different seed throws differently', () => {
    // Otherwise every roll would be the same animation.
    const specs = [spec(20, 11)];
    const outcomes = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => simulateThrow(specs, n * 7919));
    expect(new Set(outcomes.filter(Boolean).map((o) => String(o.faces))).size).toBeGreaterThan(1);
  });

  test('the replay reproduces the rehearsal exactly', () => {
    // This is what lets the numbers be assigned before the viewer sees the
    // throw. If a replay could diverge, a die would land showing the wrong
    // number.
    const specs = [spec(20, 14), spec(8, 5), spec(12, 9)];
    const plan = planThrow(specs, seedFromKey('replay-check'));

    expect(plan).not.toBeNull();
    expect(simulateThrow(specs, plan.seed).faces).toEqual(plan.settled);
  });
});

describe('the engine decides the number, the physics only decides the look', () => {
  const CASES = [
    [20, 1], [20, 20], [20, 13],
    [12, 7], [10, 10], [8, 2], [6, 6], [6, 1], [4, 3], [100, 70],
  ];

  test.each(CASES)('a d%s asked for %s lands showing it', (sides, result) => {
    const specs = [spec(sides, result)];
    const plan = planThrow(specs, seedFromKey(`d${sides}-${result}`));

    expect(plan).not.toBeNull();
    expect(plan.layouts[0][plan.settled[0]]).toBe(result);
  });

  test('every face still carries a different number', () => {
    // The result is placed by relabelling, so the obvious way to get this
    // wrong is to leave two faces showing the same value -- which would be
    // visible to any player who picked the die up.
    [4, 6, 8, 10, 12, 20, 100].forEach((sides) => {
      const die = spec(sides, sides === 100 ? 40 : 2);
      const plan = planThrow([die], seedFromKey(`unique-${sides}`));

      expect(plan).not.toBeNull();
      expect([...plan.layouts[0]].sort((a, b) => a - b)).toEqual([...die.values].sort((a, b) => a - b));
    });
  });

  test('a handful of dice each land on their own result', () => {
    const specs = [spec(6, 1), spec(6, 6), spec(20, 20), spec(20, 1)];
    const plan = planThrow(specs, seedFromKey('mixed-pool'));

    expect(plan).not.toBeNull();
    specs.forEach((die, index) => {
      expect(plan.layouts[index][plan.settled[index]]).toBe(die.result);
    });
  });

  test('the settled face really is the one pointing upwards', () => {
    // planThrow is trusted elsewhere in this file; here the face it chose is
    // checked directly against the physics, independently of the planner.
    const die = spec(20, 9);
    const plan = planThrow([die], seedFromKey('independent'));
    const settled = simulateThrow([die], plan.seed).faces;

    expect(settled[0]).toBe(plan.settled[0]);
    expect(plan.layouts[0][settled[0]]).toBe(9);
  });

  test('a d4 is read from the face it rests on', () => {
    const die = spec(4, 2);
    const plan = planThrow([die], seedFromKey('d4-read'));

    expect(plan).not.toBeNull();
    expect(plan.layouts[0][plan.settled[0]]).toBe(2);
  });
});

describe('the dice finish where they can be read', () => {
  test.each([
    ['a single d20', [[20, 13]]],
    ['an advantage pair', [[20, 18], [20, 5]]],
    ['a pool of four', [[6, 1], [6, 4], [6, 6], [6, 2]]],
  ])('%s lands near the middle of the tray', (name, dice) => {
    // The throw is genuine physics, so this is not enforced by nudging a
    // die afterwards: seeds are tried until one lands centrally, the same
    // way a throw that leaves a die cocked is rejected.
    const specs = dice.map(([sides, result]) => spec(sides, result));

    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      const plan = planThrow(specs, seedFromKey(`${name}-${key}`));
      expect(plan).not.toBeNull();

      const { positions } = simulateThrow(specs, plan.seed);
      const limit = centreRadiusFor(specs.length);
      positions.forEach(([x, z]) => {
        expect(Math.hypot(x, z)).toBeLessThanOrEqual(limit);
      });
    }
  });

  test('gives a bigger pool more room, because dice cannot share a point', () => {
    // Measured over twelve throws each: a lone d20 settles a median 0.92
    // from centre, four dice 2.97, eight 3.55. A fixed tight radius made
    // every attempt fail for a pool and fall back uncentred anyway.
    expect(centreRadiusFor(1)).toBeLessThan(centreRadiusFor(2));
    expect(centreRadiusFor(2)).toBeLessThan(centreRadiusFor(4));
    expect(centreRadiusFor(4)).toBeLessThan(centreRadiusFor(8));
  });

  test('spends fewer attempts on pools, which cost more to simulate', () => {
    // Eight dice took 1.1s of blank panel when every attempt was spent.
    expect(throwAttemptsFor(8)).toBeLessThan(throwAttemptsFor(1));
    expect(throwAttemptsFor(8)).toBeGreaterThanOrEqual(3);
  });

  test('keeps a readable throw even if none lands centrally', () => {
    // The centring is a preference, not a promise: a throw where no die is
    // cocked is kept in reserve, so an awkward pool still gets real dice
    // rather than dropping to the flat card.
    const specs = [6, 6, 6, 6, 6, 6, 20, 20].map((sides, index) => spec(sides, (index % 6) + 1));
    const plan = planThrow(specs, seedFromKey('crowded-tray'));

    expect(plan).not.toBeNull();
    specs.forEach((die, index) => {
      expect(plan.layouts[index][plan.settled[index]]).toBe(die.result);
    });
  });
});

describe('rotation helper', () => {
  test('picks the face whose normal points most steeply up', () => {
    const normals = [[0, 1, 0], [0, -1, 0], [1, 0, 0]];
    expect(settledFaceIndex(normals, { x: 0, y: 0, z: 0, w: 1 }, 'up')).toBe(0);
    expect(settledFaceIndex(normals, { x: 0, y: 0, z: 0, w: 1 }, 'down')).toBe(1);
  });
});
