import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function readIfExists(relativePath) {
  const filePath = path.join(__dirname, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

describe('Homebrew presentation ownership', () => {
  test('Homebrew uses a route-owned navy presentation', () => {
    const css = read('homebrewWorkshop.css');
    const route = read('../routes/HomebrewWorkshopRoute.js');
    const app = read('../App.js');

    expect(css).not.toMatch(/rq-sunset-gradient|rq-sunset-cream/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).toContain('var(--rq-bg, #0a1728)');
    expect(css).toContain('var(--rq-primary, #d00000)');
    expect(route).toContain("@/styles/homebrewWorkshop.css");
    expect(app).toContain("import('@/routes/HomebrewWorkshopRoute')");
  });

  test.each([
    ['../layouts/tablet/homebrew.css', 'tablet'],
    ['../layouts/mobile/homebrew.css', 'mobile'],
  ])('%s is scoped to the %s device lane', (relativePath, device) => {
    expect(read(relativePath)).toContain(`[data-rq-device='${device}']`);
  });

  test.each([
    ['mobileAppBoxGrid.css'],
    ['homeHubFinalPolish.css'],
    ['utilityPagesFinalFixes.css'],
  ])('%s no longer owns Homebrew selectors', (relativePath) => {
    expect(readIfExists(relativePath)).not.toMatch(/homebrew-workshop/i);
  });

  test('the deleted mixed utility layer is no longer globally imported', () => {
    const stack = read('featurePresentationStack.css');
    expect(stack).not.toMatch(/appUtilityPagesPolish\.css/);
  });
});
