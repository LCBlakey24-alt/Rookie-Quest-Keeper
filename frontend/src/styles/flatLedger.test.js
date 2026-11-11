/**
 * Flat Ledger: one background colour for the whole app.
 *
 * Surfaces used to stack — page #0a2342, panel #1E2936, card #263748,
 * control #263F59, rail #07131F, input #101F2D — so every box sat at a
 * different lightness. They are now all the page ink, and structure comes
 * from rules instead: a citrus rule under a selected control, a line for a
 * field.
 *
 * The risk in flattening is that things stop being distinguishable, so these
 * tests pin the replacements, not just the removals.
 */
import fs from 'fs';
import path from 'path';

const STYLES = __dirname;
const read = (f) => fs.readFileSync(path.join(STYLES, f), 'utf8');
const CSS = read('flatLedger.css');
// Assertions below are about declarations, not prose. The explanatory
// comments in the stylesheet quote patterns like the one this file checks is
// absent, so comments are stripped before matching.
const DECLARATIONS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const DESIGN = read('designSystem.css');

const INK = '#0A2342';

describe('there is only one surface colour', () => {
  test.each([
    ['--rq-bg-main'], ['--rq-bg-page'], ['--rq-bg-rail'], ['--rq-bg-panel'],
    ['--rq-bg-panel-alt'], ['--rq-bg-elevated'], ['--rq-bg-input'],
    ['--rq-card'], ['--rq-card-hover'], ['--rq-control-blue'],
  ])('%s is the page ink', (token) => {
    const match = DESIGN.match(new RegExp(`${token}:\\s*([^;]+);`));
    expect(match).not.toBeNull();
    expect(match[1].trim().toUpperCase()).toBe(INK);
  });

  test('none of the retired stacked surfaces survive anywhere in the styles', () => {
    const retired = ['1E2936', '263748', '334155', '263F59', '101F2D', '07131F', '142638'];
    const offenders = [];
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (!/\.(css|js)$/.test(entry.name) || entry.name.includes('.test.')) return;
      const body = fs.readFileSync(full, 'utf8');
      retired.forEach((hex) => {
        if (new RegExp(hex, 'i').test(body)) offenders.push(`${path.relative(STYLES, full)}: ${hex}`);
      });
    });
    walk(path.join(STYLES, '..'));
    expect(offenders).toEqual([]);
  });
});

describe('selection survives the flattening', () => {
  test('a selected control is marked by the citrus rule', () => {
    expect(CSS).toContain("[aria-selected='true']");
    expect(CSS).toContain("[aria-current='page']");
    expect(CSS).toContain('--rq-ledger-rule');
    expect(CSS).toMatch(/background-size:\s*100% 2px !important/);
  });

  test('the selected control has no coloured body of its own', () => {
    const block = CSS.slice(CSS.indexOf("#root [aria-selected='true'],"), CSS.indexOf('/* The selected-state language'));
    expect(block).toContain('background-color: transparent !important');
  });
});

describe('the retired wax red is gone', () => {
  test('both wax tokens resolve to transparent', () => {
    expect(CSS).toMatch(/--rq-control-wax:\s*transparent/);
    expect(CSS).toMatch(/--rq-guild-wine:\s*transparent/);
  });

  test('it is neutralised at the token, not by blanking every ::before', () => {
    // The same overlay mechanism draws the app rail's active marker, so a
    // blanket `::before { background: none }` would have destroyed it.
    expect(DECLARATIONS).not.toMatch(/::before\s*\{[^}]*background:\s*none/);
  });
});

describe('fields stay findable once the well is gone', () => {
  test('a field is a line, not a box', () => {
    expect(CSS).toMatch(/border-bottom:\s*1px solid var\(--rq-ledger-hair\)/);
    expect(CSS).toMatch(/border-radius:\s*0 !important/);
  });

  test('checkboxes, radios and ranges keep their native rendering', () => {
    expect(CSS).toContain(":not([type='checkbox'])");
    expect(CSS).toContain(":not([type='radio'])");
    expect(CSS).toContain(":not([type='range'])");
  });

  test('focus replaces the line with the citrus rule rather than only a ring', () => {
    const focusBlock = CSS.slice(CSS.indexOf('textarea:focus'));
    expect(focusBlock).toContain('--rq-ledger-rule');
  });
});

describe('flattening does not cost keyboard users', () => {
  test('the focus ring is kept and uses the support blue', () => {
    expect(CSS).toContain('focus-visible');
    expect(CSS).toMatch(/outline:\s*3px solid var\(--rq-secondary, #3C92E0\) !important/);
  });

  test('reduced motion still gets the rule, just not the sweep', () => {
    const reduced = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('transition: none !important');
    expect(reduced).not.toContain('background-image: none');
  });
});
