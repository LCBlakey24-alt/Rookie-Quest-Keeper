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

  test('is held to desktop, where the pages behind it expect the room', () => {
    // The Guild Command sidebar the campaign page relies on is defined
    // inside @media (min-width: 1181px), and the device attribute calls
    // 720-1180px a tablet. Narrowing the rail below that boundary pairs a
    // compact rail with a navigation that has not switched to its sidebar
    // form. Tablet already has its own 76px touch rail, so there was never
    // anything for these rules to do there.
    const widthRule = RULES.match(/grid-template-columns:\s*76px[^}]*/);
    expect(widthRule).not.toBeNull();

    RULES.split('}')
      .map((block) => block.split('{')[0].trim())
      .filter((selector) => selector.startsWith('#root'))
      .forEach((selector) => {
        expect(selector).toContain("data-rq-device='desktop'");
      });
  });

  test('closes the channel the character sheet reserves for the old rail', () => {
    // CleanSheetTabsRail.css pads .character-page-v2 236px from the left to
    // clear the labelled rail. With a 76px rail that is a 236px empty
    // channel: measured, the sheet started at 312px instead of 94px.
    expect(RULES).toMatch(/\.character-page-v2\s*\{[^}]*padding-left:\s*18px/);
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

  test('leaves phones and tablets alone', () => {
    // Was 719px, when these rules also claimed tablet. The boundary is now
    // 1180px, matching the width at which the pages behind the rail switch
    // to a layout that expects the extra room.
    expect(RULES).toMatch(/@media \(max-width: 1180px\)/);
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
