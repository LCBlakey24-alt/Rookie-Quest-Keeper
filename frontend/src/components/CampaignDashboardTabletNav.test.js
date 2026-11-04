import fs from 'fs';
import path from 'path';

// Comments are stripped before asserting: a guard of this kind in this
// repo once passed on its own explanatory text rather than on the rules.
const CSS = fs.readFileSync(path.join(__dirname, 'CampaignDashboard.css'), 'utf8');
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** The block that governs the band between a phone and a desktop. */
function tabletBand() {
  const start = RULES.indexOf('@media (min-width: 761px) and (max-width: 1180px)');
  if (start === -1) return '';
  // Walk the braces so the whole at-rule is captured, not a prefix of it.
  let depth = 0;
  for (let i = RULES.indexOf('{', start); i < RULES.length; i += 1) {
    if (RULES[i] === '{') depth += 1;
    if (RULES[i] === '}') {
      depth -= 1;
      if (depth === 0) return RULES.slice(start, i + 1);
    }
  }
  return '';
}

describe('campaign navigation between a phone and a desktop', () => {
  test('the band exists at all', () => {
    // Phones swap the strips for a selector at <=760px and desktops get the
    // Guild Command sidebar at >=1181px. Without this, the width in between
    // keeps scrolling strips.
    expect(tabletBand()).not.toBe('');
  });

  test('the tool rows wrap rather than scroll', () => {
    const band = tabletBand();
    expect(band).toMatch(/flex-wrap:\s*wrap/);
    expect(band).toMatch(/overflow-x:\s*visible/);
  });

  test('it covers both the group row and the tab row', () => {
    const band = tabletBand();
    expect(band).toContain('campaign-dashboard-group-row');
    expect(band).toContain('campaign-dashboard-tab-row');
  });

  test('it reaches 1180px, where the desktop sidebar takes over', () => {
    // The desktop rules start at 1181px, so stopping at 1179 would leave a
    // one-pixel width with neither treatment.
    expect(RULES).toContain('@media (min-width: 761px) and (max-width: 1180px)');
  });

  test('it does not touch phones or desktops', () => {
    const band = tabletBand();
    expect(band).not.toMatch(/max-width:\s*760px/);
    expect(band).not.toMatch(/min-width:\s*1181px/);
  });

  test('the strips still scroll outside that band', () => {
    // The base rule is unchanged; this only overrides it where there is
    // room to wrap.
    expect(RULES).toMatch(/campaign-dashboard-tab-row[\s\S]{0,200}overflow-x:\s*auto/);
  });
});
