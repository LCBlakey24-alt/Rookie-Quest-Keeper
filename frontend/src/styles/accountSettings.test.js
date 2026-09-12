import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Account Settings presentation ownership', () => {
  test('Account Settings uses the flat RQK 1.0 presentation and reserves red for danger', () => {
    const css = read('accountSettings.css');
    const route = read('../routes/AccountSettingsRoute.js');
    const app = read('../App.js');

    expect(css).not.toMatch(/rq-sunset-gradient|rq-sunset-cream|linear-gradient|radial-gradient|conic-gradient/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).toContain('#071522');
    expect(css).toContain('#0C2234');
    expect(css).toContain('#102B40');
    expect(css).toContain('#7CCBFF');
    expect(css).toContain('#FF2DAA');
    expect(css).toContain('Destructive account actions keep semantic danger colouring');
    expect(css).not.toMatch(/account-settings-primary[\s\S]{0,220}#d00000/i);
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
