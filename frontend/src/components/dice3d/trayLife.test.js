import { RING_PULSE_SECONDS, RING_REST_OPACITY, RING_REST_OPACITY_OUTCOME, createTrayLife, ringColourFor, ringPulse } from './trayLife';

describe('the landing ring', () => {
  test('pulses out from under the die and settles as a faint ring', () => {
    const start = ringPulse(0);
    const end = ringPulse(RING_PULSE_SECONDS);
    expect(start.opacity).toBe(1);
    expect(start.scale).toBeLessThan(end.scale);
    expect(end.scale).toBeCloseTo(1, 5);
    expect(end.opacity).toBeCloseTo(RING_REST_OPACITY, 5);
    // It holds there afterwards rather than fading away or growing on.
    expect(ringPulse(10)).toEqual(end);
    // A natural 20 or 1 rests brighter than an ordinary die.
    expect(ringPulse(10, RING_REST_OPACITY_OUTCOME).opacity).toBeGreaterThan(end.opacity);
  });

  test("takes the dice's glow, gold for a natural 20 and red for a natural 1", () => {
    const palette = { glow: '#C99BFF', crit: '#FFD27A', fumble: '#FF9B7A' };
    expect(ringColourFor(undefined, palette)).toBe('#C99BFF');
    expect(ringColourFor('crit', palette)).toBe('#FFD27A');
    expect(ringColourFor('fumble', palette)).toBe('#FF9B7A');
    expect(ringColourFor(undefined, {})).toBeTruthy();
  });
});

describe('createTrayLife', () => {
  test('draws a ring per die, sparks for a natural 20, and comes to rest', () => {
    const life = createTrayLife({ glow: '#FF5C93', crit: '#FFD27A' }, () => 0.5);
    expect(life.busy()).toBe(false);
    life.reveal([
      { position: [0, 0.8, 0], radius: 1, tone: 'crit' },
      { position: [2, 0.6, 1], radius: 0.8 },
    ]);
    // The sparks' points object plus one ring per die.
    expect(life.group.children).toHaveLength(3);
    expect(life.busy()).toBe(true);
    for (let i = 0; i < 240; i += 1) life.update(1 / 60);
    expect(life.busy()).toBe(false);
    // The rings stay under the dice once the pulse is over.
    expect(life.group.children).toHaveLength(3);
  });

  test('a new throw clears the last one, and dispose frees everything', () => {
    const life = createTrayLife({}, () => 0.5);
    life.reveal([{ position: [0, 1, 0], tone: 'fumble' }, { position: [1, 1, 0] }]);
    life.reveal([{ position: [0, 1, 0] }]);
    expect(life.group.children).toHaveLength(2);
    life.clear();
    expect(life.group.children).toHaveLength(1);
    expect(life.busy()).toBe(false);
    expect(() => life.dispose()).not.toThrow();
  });
});
