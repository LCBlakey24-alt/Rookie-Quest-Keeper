import fs from 'fs';
import path from 'path';

// Guards the mobile geometry that was squeezed by an obsolete 58px left rail.
// A real Chromium viewport test is also required before merging.
const CSS = fs.readFileSync(path.join(__dirname, 'characterSheetColumnAlignmentFix.css'), 'utf8');
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const phone = RULES.split('@media (max-width: 759px)')[1]?.split('@media (max-width: 390px)')[0] || '';
const narrowPhone = RULES.split('@media (max-width: 390px)')[1] || '';

describe('player character sheet phone gutters', () => {
  test('does not reserve a fake left navigation rail', () => {
    expect(RULES).not.toContain('--rq-sheet-mobile-left-rail');
    expect(phone).not.toMatch(/padding-left:\s*calc\(/);
    expect(phone).toMatch(/padding-left:\s*max\(var\(--rq-sheet-mobile-edge-gap\),\s*env\(safe-area-inset-left,\s*0px\)\)/);
    expect(phone).toMatch(/padding-right:\s*max\(var\(--rq-sheet-mobile-edge-gap\),\s*env\(safe-area-inset-right,\s*0px\)\)/);
  });

  test('keeps narrow phones symmetrical instead of reserving 68px on the left', () => {
    expect(narrowPhone).not.toMatch(/padding-left:\s*68px/);
    expect(narrowPhone).toMatch(/padding-left:\s*max\(8px,\s*env\(safe-area-inset-left,\s*0px\)\)/);
    expect(narrowPhone).toMatch(/padding-right:\s*max\(8px,\s*env\(safe-area-inset-right,\s*0px\)\)/);
  });
});
