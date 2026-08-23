import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Account Settings presentation ownership', () => {
  test('Account Settings uses a route-owned navy presentation', () => {
    const css = read('accountSettings.css');
    const route = read('../routes/AccountSettingsRoute.js');
    const app = read('../App.js');

    expect(css).not.toMatch(/rq-sunset-gradient|rq-sunset-cream/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).toContain('var(--rq-bg, #0a1728)');
    expect(css).toContain('var(--rq-primary, #d00000)');
    expect(route).toContain("@/styles/accountSettings.css");
    expect(app).toContain("import('@/routes/AccountSettingsRoute')");
  });

  test.each([
    ['../layouts/tablet/account.css', 'tablet'],
    ['../layouts/mobile/account.css', 'mobile'],
  ])('%s is scoped to the %s device lane', (relativePath, device) => {
    expect(read(relativePath)).toContain(`[data-rq-device='${device}']`);
  });

  test('the global presentation stack no longer imports the deleted utility override', () => {
    expect(read('featurePresentationStack.css')).not.toMatch(/utilityPagesFinalFixes\.css/);
  });
});
