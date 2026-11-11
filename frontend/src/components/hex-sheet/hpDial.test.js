import { DEGREES_PER_HP, angleStep, deltaForRotation, hpAdjustment, pointerAngle, rotationForDelta,
  coastStep,
  flickVelocity,
  settledRotation,
  FLICK_MAX_SPEED,
} from './hpDial';

const hero = { max_hit_points: 35, current_hit_points: 30, temporary_hit_points: 5 };

describe('turning', () => {
  test('clockwise on screen is a positive angle change', () => {
    // From the top (12 o'clock) to the right (3 o'clock) is a clockwise quarter turn.
    const top = pointerAngle(100, 0, 100, 100);
    const right = pointerAngle(200, 100, 100, 100);
    expect(angleStep(top, right)).toBeCloseTo(90);
    expect(angleStep(right, top)).toBeCloseTo(-90);
  });

  test('crossing the seam is a small step, not a whole revolution', () => {
    expect(angleStep(170, -170)).toBeCloseTo(20);
    expect(angleStep(-170, 170)).toBeCloseTo(-20);
  });

  test('sensitivity is 36 degrees per hit point: ten per full turn', () => {
    expect(DEGREES_PER_HP).toBe(36);
    expect(deltaForRotation(360)).toBe(10);
    expect(deltaForRotation(-360)).toBe(-10);
  });

  test('partial steps count toward zero in both directions', () => {
    expect(deltaForRotation(35)).toBe(0);
    expect(deltaForRotation(36)).toBe(1);
    expect(deltaForRotation(71)).toBe(1);
    expect(deltaForRotation(-35)).toBe(0);
    expect(deltaForRotation(-37)).toBe(-1);
  });

  test('long turns keep counting past one revolution', () => {
    expect(deltaForRotation(720 + 36 * 3)).toBe(23);
    expect(rotationForDelta(-7)).toBe(-252);
  });

  test('sensitivity can be tuned', () => {
    expect(deltaForRotation(36, 12)).toBe(3);
  });
});

describe('what a confirmed change does, by the classic sheet rules', () => {
  test('damage comes off temporary HP first', () => {
    const change = hpAdjustment(hero, 'hp', -8);
    expect(change.updates).toEqual({ current_hit_points: 27, temporary_hit_points: 0, temp_hp: 0 });
    expect(change.damage).toBe(8);
  });

  test('hit points never fall below zero', () => {
    expect(hpAdjustment(hero, 'hp', -100).result).toMatchObject({ currentHp: 0, tempHp: 0 });
  });

  test('healing stops at maximum hit points and never touches temporary HP', () => {
    const change = hpAdjustment(hero, 'hp', 20);
    expect(change.updates).toEqual({ current_hit_points: 35 });
    expect(change.result.tempHp).toBe(5);
  });

  test('healing at full health changes nothing', () => {
    expect(hpAdjustment({ ...hero, current_hit_points: 35 }, 'hp', 3)).toBeNull();
  });

  test('healing a dying character clears their death saves', () => {
    const dying = { ...hero, current_hit_points: 0, death_saves_successes: 1, death_saves_failures: 2 };
    expect(hpAdjustment(dying, 'hp', 4).updates).toEqual({ current_hit_points: 4, death_saves_successes: 0, death_saves_failures: 0 });
  });

  test('temporary HP is its own pool and never goes negative', () => {
    expect(hpAdjustment(hero, 'temp', 3).updates).toEqual({ temporary_hit_points: 8, temp_hp: 8 });
    expect(hpAdjustment(hero, 'temp', -9).updates).toEqual({ temporary_hit_points: 0, temp_hp: 0 });
    expect(hpAdjustment(hero, 'temp', -9).result.currentHp).toBe(30);
  });

  test('no change means nothing to save', () => {
    expect(hpAdjustment(hero, 'hp', 0)).toBeNull();
    expect(hpAdjustment({ ...hero, temporary_hit_points: 0 }, 'temp', -2)).toBeNull();
  });
});

describe('flicking', () => {
  const samples = (degPerMs, count = 6, every = 16) => Array.from({ length: count }, (_, i) => ({ t: i * every, total: i * every * degPerMs }));

  test('a fast swipe released while moving coasts at its speed', () => {
    expect(flickVelocity(samples(0.8), 80 + 5)).toBeCloseTo(0.8);
    expect(flickVelocity(samples(-0.8), 80 + 5)).toBeCloseTo(-0.8);
  });

  test('a finger that stopped before lifting, or moved slowly, does not coast', () => {
    expect(flickVelocity(samples(0.8), 80 + 200)).toBe(0);
    expect(flickVelocity(samples(0.1), 85)).toBe(0);
    expect(flickVelocity([], 0)).toBe(0);
  });

  test('a very fast flick is capped', () => {
    expect(flickVelocity(samples(9), 85)).toBe(FLICK_MAX_SPEED);
  });

  test('coasting slows down and lands on a whole hit point', () => {
    const step = coastStep(1, 16);
    expect(step.distance).toBe(16);
    expect(step.velocity).toBeLessThan(1);
    expect(settledRotation(100)).toBe(72);
    expect(settledRotation(-100)).toBe(-72);
  });
});
