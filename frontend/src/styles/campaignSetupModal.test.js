import fs from 'fs';
import path from 'path';

function readCss(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('campaign setup presentation', () => {
  test('does not reintroduce the retired sunset palette', () => {
    const css = readCss('campaignSetupModal.css');

    expect(css).not.toMatch(/rq-sunset-gradient/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).toContain('var(--rq-primary, #d00000)');
    expect(css).toContain('var(--rq-surface, #102238)');
  });

  test.each([
    ['../layouts/desktop/campaignSetupModal.css', 'desktop'],
    ['../layouts/tablet/campaignSetupModal.css', 'tablet'],
    ['../layouts/mobile/campaignSetupModal.css', 'mobile'],
  ])('%s is scoped to its device lane', (relativePath, device) => {
    const css = readCss(relativePath);
    expect(css).toContain(`[data-rq-device='${device}']`);
  });
});
