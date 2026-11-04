import fs from 'fs';
import path from 'path';

// Comments are stripped before asserting: an earlier guard of this kind in
// this repo passed on its own explanatory text rather than on the rules.
const CSS = fs.readFileSync(path.join(__dirname, 'appShellFocusRail.css'), 'utf8');
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the compact rail', () => {
  test('narrows the shell on a working surface', () => {
    expect(RULES).toMatch(/grid-template-columns:\s*76px minmax\(0, 1fr\)\s*!important/);
  });

  test('only applies when the shell is marked as a detail route', () => {
    // Every rule is scoped, so a list page is untouched.
    RULES.split('}')
      .map((block) => block.split('{')[0].trim())
      .filter((selector) => selector.startsWith('#root'))
      .forEach((selector) => {
        expect(selector).toContain("data-rq-focus='detail'");
      });
  });

  test('hides the words but not the destinations', () => {
    expect(RULES).toMatch(/rqk-app-rail-link span[\s\S]*?display:\s*none/);
    expect(RULES).not.toMatch(/\.rqk-app-rail\s*\{[^}]*display:\s*none/);
  });

  test('keeps every control above the touch floor', () => {
    // Narrowing the rail must not shrink the targets with it.
    const match = RULES.match(/\.rqk-app-rail-link\s*\{[^}]*min-height:\s*(\d+)px/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeGreaterThanOrEqual(44);
  });

  test('leaves the phone layout alone', () => {
    expect(RULES).toMatch(/@media \(max-width: 719px\)/);
  });

  test('respects reduced motion', () => {
    expect(RULES).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*transition/);
  });

  test('is loaded after the sheets it has to override', () => {
    const entry = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    expect(entry).toContain('appShellFocusRail.css');
    expect(entry.indexOf('appShellFocusRail.css')).toBeGreaterThan(entry.indexOf('appShellExperiencePolish.css'));
  });
});
