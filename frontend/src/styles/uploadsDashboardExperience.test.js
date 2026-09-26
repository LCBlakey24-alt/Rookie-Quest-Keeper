import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function readIfPresent(relativePath) {
  const absolutePath = path.join(__dirname, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

describe('Uploads presentation ownership', () => {
  test('Uploads uses the professional Keeper player palette', () => {
    const css = read('uploadsDashboardExperience.css');

    expect(css).not.toMatch(/rq-sunset-gradient|rq-sunset-cream|linear-gradient|radial-gradient|conic-gradient/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542|#d00000/i);
    expect(css).toContain('#071522');
    expect(css).toContain('#0C2234');
    expect(css).toContain('#112A40');
    expect(css).toContain('#79BCE8');
    expect(css).toContain('#D6A84F');
    expect(css).toContain('#F7F1E7');
  });

  test.each([
    ['../layouts/tablet/uploads.css', 'tablet'],
    ['../layouts/mobile/uploads.css', 'mobile'],
  ])('%s is scoped to the %s device lane', (relativePath, device) => {
    const css = read(relativePath);
    expect(css).toContain(`[data-rq-device='${device}']`);
  });

  test.each([
    ['appUtilityPagesPolish.css'],
    ['mobileAppBoxGrid.css'],
    ['utilityPagesFinalFixes.css'],
  ])('%s is absent or no longer contains Uploads route selectors', (relativePath) => {
    expect(readIfPresent(relativePath)).not.toMatch(/\.uploads-dashboard/);
  });
});
