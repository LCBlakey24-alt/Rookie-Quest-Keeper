import fs from 'fs';
import path from 'path';

// Comments are stripped before asserting: an earlier version of this guard
// passed/failed on its own explanatory text rather than on the stylesheet.
const CSS = fs.readFileSync(path.join(__dirname, 'FloatingDiceRoller.css'), 'utf8');
const DECLARATIONS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

const FLAT_SURFACE = '#0A2342';

// The stacked surfaces and antique-gold accents this panel used before the
// flat pass. Any of them reappearing is the box-in-a-different-blue look the
// approved direction removed.
const RETIRED = {
  '#071522': 'the old panel blue',
  '#0C2234': 'the old toggle blue',
  '#112A40': 'the old card blue',
  '#071A29': 'the old input blue',
  '#17364F': 'the old hover blue',
  '#79BCE8': 'the washed-out blue',
  '#f2892f': 'the antique-gold accent',
  '#f2892f': 'the retired brand gold',
  '#7E2D2D': 'the retired wax red',
};

describe('the floating dice roller sits on the flat surface', () => {
  test.each(Object.entries(RETIRED))('%s (%s) is gone', (hex) => {
    expect(DECLARATIONS.toUpperCase()).not.toContain(hex.toUpperCase());
  });

  test('every surface token is the single page ink', () => {
    ['--dice-bg', '--dice-panel', '--dice-card', '--dice-input'].forEach((token) => {
      const match = DECLARATIONS.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
      expect(match).not.toBeNull();
      expect(match[1].trim().toUpperCase()).toBe(FLAT_SURFACE);
    });
  });

  test('emphasis is carried by the citrus rule, not by a coloured fill', () => {
    expect(DECLARATIONS).toContain('--dice-rule');
    // The rule is painted as a background layer, so it must stay a thin band
    // rather than filling a control.
    expect(DECLARATIONS).toMatch(/background-size:\s*100%\s*[23]px/);
  });

  test('the accent reuses the shared ledger rule rather than a second ramp', () => {
    expect(DECLARATIONS).toMatch(/--dice-rule:\s*var\(--rq-ledger-rule/);
    expect(DECLARATIONS).not.toMatch(/linear-gradient/i);
  });

  test('the support blue is the approved value, not the faded one', () => {
    expect(DECLARATIONS).toMatch(/--dice-blue:\s*#3C92E0/i);
  });

  test('the misleading pink token name is gone', () => {
    expect(DECLARATIONS).not.toContain('--dice-pink');
  });
});
