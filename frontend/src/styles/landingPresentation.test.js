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

    expect(product).toContain('--landing-bg: var(--rq-bg-main, #0B1B2B)');
    expect(product).toContain('--landing-surface: var(--rq-bg-panel, #1E2936)');
    expect(product).toContain('--landing-card: var(--rq-card, #263748)');
    expect(product).toContain('--landing-gold: var(--rq-primary, #C9A96B)');
    expect(product).toContain('--landing-blue: var(--rq-secondary, #6E91B4)');
    expect(product).toContain('--landing-text: #EADFC8');
    expect(css).not.toMatch(/#ff2daa|#ff4f81|#d84df1|#7357ff|#ff9542/i);
    expect(css).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
  });

  test('implements the approved public-site reference structure', () => {
    const page = read('../components/LandingPage.js');

    expect(page).toContain('Your campaign.');
    expect(page).toContain('Kept together.');
    expect(page).toContain('Everything you need to run and play.');
    expect(page).toContain('Keep your story close.');
    expect(page).toContain('Plan deeper.');
    expect(page).toContain('From idea to adventure.');
    expect(page).toContain('Got questions?');
    expect(page).toContain('landing-product-stage');
    expect(page).toContain('landing-character-folio');
    expect(page).toContain('landing-ledger-stack');
  });

  test('keeps the mockup implementation responsive and accessible', () => {
    const product = read('./keeperProductSite.css');
    const page = read('../components/LandingPage.js');

    expect(product).toContain('@media (max-width: 760px)');
    expect(product).toContain('@media (max-width: 460px)');
    expect(product).toContain('outline: 3px solid var(--landing-blue)');
    expect(product).toContain('@media (prefers-reduced-motion: reduce)');
    expect(page).toContain('className="landing-skip-link"');
    expect(page).toContain('aria-hidden="true"');
  });

  test('mobile reference pass keeps the landing compact and editorial', () => {
    const product = read('./keeperProductSite.css');
    const page = read('../components/LandingPage.js');

    expect(product).toContain("--landing-display: Georgia, 'Times New Roman', serif");
    expect(product).toContain("#root .keeper-product-site .landing-nav-actions .landing-button-ghost");
    expect(product).toContain("#root .keeper-product-site .landing-app-preview__rail");
    expect(product).toContain("display: none !important");
    expect(product).toContain("grid-template-areas:");
    expect(page).not.toContain('landing-final-logo-wrap');
  });

  test('mobile finish pass prevents legacy button and display-font leakage', () => {
    const product = read('./keeperProductSite.css');

    expect(product).toContain('#root .keeper-product-site .landing-faq-item summary');
    expect(product).toContain('font-family: var(--landing-display) !important');
    expect(product).toContain('#root .keeper-product-site .landing-feature-card-grid button');
    expect(product).toContain('background: transparent !important');
    expect(product).toContain('#root .keeper-product-site .landing-footer-actions button');
    expect(product).toContain('width: auto !important');
    expect(product).toContain('#root .keeper-product-site .landing-character-folio strong');
    expect(product).toContain('-webkit-text-fill-color: #203040 !important');
  });
});
