import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function readIfExists(relativePath) {
  const filePath = path.join(__dirname, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

describe('library presentation ownership', () => {
  test('shared library styles delegate mobile geometry to the mobile lane', () => {
    const shared = read('libraryPages.css');
    const mobile = read('../layouts/mobile/libraryPages.css');
    const mixedMobile = readIfExists('mobileAppBoxGrid.css');

    expect(shared).toContain("@import '../layouts/mobile/libraryPages.css';");
    expect(shared).not.toMatch(/@media\s*\(max-width:\s*760px\)/i);
    expect(mobile).toContain("[data-rq-device='mobile']");
    expect(mixedMobile).not.toMatch(/\.library-page/);
  });

  test('character library no longer uses the retired sunset palette', () => {
    const shared = read('../components/MyCharactersPage.css');
    const mobile = read('../layouts/mobile/charactersLibrary.css');

    expect(shared).not.toMatch(/rq-sunset-gradient/i);
    expect(shared).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(shared).toContain('var(--rq-card, #14283e)');
    expect(mobile).toContain("[data-rq-device='mobile']");
  });
});

describe('library refresh truthfulness', () => {
  test.each([
    ['../components/MyCampaignsPage.js', 'Campaigns refreshed'],
    ['../components/MyCharactersPage.js', 'Characters refreshed'],
  ])('%s only announces refresh success after a successful load result', (relativePath, successMessage) => {
    const source = read(relativePath);

    expect(source).toContain('return { ok: true };');
    expect(source).toContain('return { ok: false, error };');
    expect(source).toContain(`if (result.ok) toast.success('${successMessage}')`);
  });

  test('campaign library does not import Home dashboard presentation CSS', () => {
    const source = read('../components/MyCampaignsPage.js');

    expect(source).not.toMatch(/unifiedDashboardBoard\.css/);
    expect(source).not.toMatch(/unifiedDashboardPolish\.css/);
  });
});
