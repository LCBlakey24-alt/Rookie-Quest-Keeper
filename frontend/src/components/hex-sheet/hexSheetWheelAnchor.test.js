import fs from 'fs';
import path from 'path';

const CSS = fs.readFileSync(path.join(__dirname, 'hexSheet.css'), 'utf8');
const DECLARATIONS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

describe('mobile character wheel placement contract', () => {
  test('the navigation trail owns a fixed 44px layer above the wheel', () => {
    expect(DECLARATIONS).toMatch(/\.hex-sheet__trail\s*\{[^}]*position:\s*relative[^}]*z-index:\s*5[^}]*min-height:\s*44px[^}]*flex:\s*0\s+0\s+44px/s);
    expect(DECLARATIONS).toMatch(/\.hex-sheet__back\s*\{[^}]*position:\s*relative[^}]*z-index:\s*1[^}]*min-height:\s*44px/s);
  });

  test('the wheel anchor cannot shrink when controls or lists are added below it', () => {
    expect(DECLARATIONS).toMatch(/\.hex-sheet__wheel-anchor\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*place-items:\s*start\s+center/s);
    expect(DECLARATIONS).toMatch(/@media\s*\(max-width:\s*719px\)[\s\S]*?\.hex-sheet__wheel-area\s*\{\s*justify-content:\s*flex-start;/s);
  });

  test('breadcrumbs stay on one stable-height line on phones', () => {
    expect(DECLARATIONS).toMatch(/@media\s*\(max-width:\s*719px\)[\s\S]*?\.hex-sheet__crumbs\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/s);
  });
});
