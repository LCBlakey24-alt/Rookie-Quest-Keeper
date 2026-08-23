import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Uploads presentation ownership', () => {
  test('Uploads uses the navy palette without retired sunset styling', () => {
    const css = read('uploadsDashboardExperience.css');

    expect(css).not.toMatch(/rq-sunset-gradient|rq-sunset-cream/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).toContain('var(--rq-bg, #0a1728)');
    expect(css).toContain('var(--rq-primary, #d00000)');
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
  ])('%s no longer contains Uploads route selectors', (relativePath) => {
    expect(read(relativePath)).not.toMatch(/\.uploads-dashboard/);
  });
});
