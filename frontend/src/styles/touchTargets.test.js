/**
 * Touch targets on phones.
 *
 * docs/DESIGN_SYSTEM.md asks for ~46px targets on phones and 44px on tablets.
 * The landing navigation sat at 38px inside the narrow-screen block of
 * public/rq-polish.css — below the floor on exactly the screens where it
 * matters most, and easy to miss because that file is linked straight from
 * index.html rather than imported into the build.
 */
import fs from 'fs';
import path from 'path';

const POLISH = fs.readFileSync(
  path.join(__dirname, '..', '..', 'public', 'rq-polish.css'),
  'utf8',
);

const FLOOR = 44;

// A rule looks interactive if its selector names a control.
const INTERACTIVE = /(button|\bcta\b|signin|sign-in|\blink\b|\btab\b)/i;

function rulesWithMinHeight(css) {
  const found = [];
  const pattern = /([^{}]+)\{([^}]*)\}/g;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    const body = match[2];
    const height = body.match(/min-height:\s*(\d+)px/);
    if (height) found.push({ selector, px: Number(height[1]) });
  }
  return found;
}

describe('phone touch targets clear the floor', () => {
  const rules = rulesWithMinHeight(POLISH);

  test('the stylesheet actually declares some min-heights', () => {
    // Guards against the parser silently matching nothing and the suite
    // passing for the wrong reason.
    expect(rules.length).toBeGreaterThan(3);
  });

  test('no interactive control is shorter than the floor', () => {
    const tooSmall = rules
      .filter((rule) => INTERACTIVE.test(rule.selector))
      .filter((rule) => rule.px < FLOOR)
      .map((rule) => `${rule.selector} -> ${rule.px}px`);

    expect(tooSmall).toEqual([]);
  });

  test('the landing navigation specifically is 44px', () => {
    const nav = rules.filter((rule) => /landing-nav-actions|rq-brand-nav/.test(rule.selector));
    expect(nav.length).toBeGreaterThan(0);
    nav.forEach((rule) => expect(rule.px).toBeGreaterThanOrEqual(FLOOR));
  });

  test('a non-interactive label may stay compact', () => {
    // The proof strip is a label, not a target, so it is deliberately exempt
    // and this test documents that rather than leaving it looking like a miss.
    const strip = rules.find((rule) => /landing-proof-strip/.test(rule.selector));
    expect(strip).toBeDefined();
    expect(INTERACTIVE.test(strip.selector)).toBe(false);
  });
});
