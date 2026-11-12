import { DEFAULT_DYE_ID, DICE_DYES, contrastRatio, getDye } from './diceDyes';

// WCAG AA for large text. A die's numerals are read at a glance from across
// a table, which is the whole point of them.
const MINIMUM_CONTRAST = 4.5;

describe('every dye keeps its numbers readable', () => {
  test.each(DICE_DYES)('$name', (dye) => {
    ['ink', 'crit', 'fumble'].forEach((role) => {
      const ratio = contrastRatio(dye[role], dye.body);
      expect(ratio).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
    });
  });

  test('contrastRatio matches the WCAG reference points', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Order must not matter.
    expect(contrastRatio('#0a2342', '#F2A93B')).toBeCloseTo(contrastRatio('#F2A93B', '#0a2342'), 5);
  });
});

describe('the dye set', () => {
  test('offers a choice without repeating a colour', () => {
    expect(DICE_DYES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(DICE_DYES.map((dye) => dye.id)).size).toBe(DICE_DYES.length);
    expect(new Set(DICE_DYES.map((dye) => dye.body.toLowerCase())).size).toBe(DICE_DYES.length);
  });

  test('every dye is fully specified', () => {
    DICE_DYES.forEach((dye) => {
      ['id', 'name', 'body', 'ink', 'edge', 'crit', 'fumble'].forEach((field) => {
        expect(dye[field]).toBeTruthy();
      });
      ['body', 'ink', 'edge', 'crit', 'fumble'].forEach((field) => {
        expect(dye[field]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  test('defaults to the Neon Coast die: readable numerals, and a glow that stands out from the navy tray', () => {
    const fallback = getDye(DEFAULT_DYE_ID);
    expect(fallback.id).toBe('glow');
    expect(contrastRatio(fallback.ink, fallback.body)).toBeGreaterThanOrEqual(7);
    // The body alone would sit close to the navy tray; the glow is what
    // separates it, so it must contrast with the tray on its own.
    expect(contrastRatio(fallback.glow, '#0a2342')).toBeGreaterThanOrEqual(4.5);
    // The Neon Coast colours, pink -> violet -> blue.
    expect(fallback.glowStops).toEqual(['#FF3D8B', '#B04DFF', '#4FB3FF']);
  });

  test('only dyes that declare a glow get one', () => {
    DICE_DYES.filter((dye) => dye.glow).forEach((dye) => expect(dye.glow).toMatch(/^#[0-9A-Fa-f]{6}$/));
    expect(getDye('amber').glow).toBeUndefined();
  });

  test('falls back rather than returning nothing for an unknown dye', () => {
    expect(getDye('not-a-dye').id).toBe(DEFAULT_DYE_ID);
    expect(getDye(undefined).id).toBe(DEFAULT_DYE_ID);
    expect(getDye('').id).toBe(DEFAULT_DYE_ID);
  });
});
