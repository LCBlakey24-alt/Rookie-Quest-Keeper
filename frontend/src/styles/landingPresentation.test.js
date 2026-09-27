import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Guild Ledger public landing presentation', () => {
  test('uses the approved Guild Ledger palette without retired neon or decorative gradients', () => {
    const product = read('./keeperProductSite.css');
    const trust = read('./landingProductionTrust.css');
    const css = `${product}\n${trust}`;

    expect(product).toContain('--landing-bg: #0B1B2B');
    expect(product).toContain('--landing-surface: #1E2936');
    expect(product).toContain('--landing-card: #263748');
    expect(product).toContain('--landing-red: #C9A96B');
    expect(product).toContain('--landing-secondary: #6E91B4');
    expect(product).toContain('--landing-text: #EADFC8');
    expect(css).not.toMatch(/#ff2daa|#ff4f81|#d84df1|#7357ff|#ff9542/i);
    expect(css).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
  });

  test('the hero carries the approved campaign-ledger language and preview structure', () => {
    const page = read('../components/LandingPage.js');

    expect(page).toContain('Plan, organise, track, play');
    expect(page).toContain('Guild Ledger · A refined campaign companion');
    expect(page).toContain('Your campaign. Kept together.');
    expect(page).toContain('The Ashen Crown');
    expect(page).toContain('landing-preview-meta');
  });

  test('keeps keyboard focus and reduced-motion rules explicit', () => {
    const product = read('./keeperProductSite.css');

    expect(product).toContain('outline: 3px solid var(--landing-secondary)');
    expect(product).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
