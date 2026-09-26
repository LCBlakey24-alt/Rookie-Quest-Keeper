import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Keeper professional visual contract', () => {
  test('final theme owns the shared brand palette and readable text hierarchy', () => {
    const css = read('threeModeMinimalist.css');

    expect(css).toContain('--rq-primary: #C9A96B');
    expect(css).toContain('--rq-secondary: #6E91B4');
    expect(css).toContain('--rq-text-primary: #EADFC8');
    expect(css).toContain('--rq-text-secondary: rgba(234, 223, 200, 0.78)');
    expect(css).toContain('--rq-text-muted: rgba(234, 223, 200, 0.60)');
    expect(css).not.toMatch(/#FF2DAA|rgba\(255\s*,\s*45\s*,\s*170/i);
  });

  test('landing and full creator follow the same palette instead of inventing route themes', () => {
    const landing = read('keeperProductSite.css');
    const creator = read('../components/FullCharacterCreatorV2.css');

    expect(landing).toContain('--landing-red: #C9A96B');
    expect(landing).toContain('--landing-secondary: #6E91B4');
    expect(landing).toContain('--landing-text: #EADFC8');
    expect(creator).toContain('--rqk-creator-accent: var(--rq-primary, #C9A96B)');
    expect(creator).toContain('--rqk-creator-blue: var(--rq-secondary, #6E91B4)');
  });

  test('legacy landing authority cannot restore the retired neon palette', () => {
    const landingFinal = read('landingFinal.css');

    expect(landingFinal).not.toContain('RQK 1.0 flat landing authority');
    expect(landingFinal).not.toMatch(/#FF2DAA|rgba\(255\s*,\s*45\s*,\s*170/i);
  });

  test('signed-in shell and loading states use Guild Ledger instead of retired neon authority', () => {
    const shell = read('appShellExperiencePolish.css');
    const loading = read('brandedLoading.css');

    expect(shell).toContain('Guild Ledger app shell authority');
    expect(shell).toContain('#C9A96B');
    expect(shell).toContain('#EADFC8');
    expect(loading).toContain('Guild Ledger loading authority');
    expect(loading).toContain('#0B1B2B');
    expect(loading).toContain('#C9A96B');
    expect(shell).not.toMatch(/#FF2DAA|rgba\(255\s*,\s*45\s*,\s*170/i);
    expect(loading).not.toMatch(/#FF2DAA|rgba\(255\s*,\s*45\s*,\s*170/i);
  });

  test('auth uses the approved Guild Ledger identity and Keeper mark', () => {
    const authCss = read('../components/AuthPage.css');
    const authPolish = read('authExperiencePolish.css');
    const authComponent = read('../components/AuthPage.js');
    const auth = authCss + '\n' + authPolish;

    expect(authComponent).toContain('BrandMiniLogo');
    expect(authComponent).toContain('Campaign ledger');
    expect(authCss).toContain('Rookie Quest Keeper Guild Ledger auth page');
    expect(auth).toContain('#0B1B2B');
    expect(auth).toContain('#C9A96B');
    expect(auth).toContain('#EADFC8');
    expect(auth).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(auth).not.toMatch(/rgba\(235\s*,\s*63\s*,\s*233|rgba\(255\s*,\s*79\s*,\s*129|rgba\(255\s*,\s*149\s*,\s*66/i);
  });

  test('responsive lanes stay aligned to the device-layout contract', () => {
    const layout = read('../layouts/deviceLayout.js');
    const css = read('threeModeMinimalist.css');

    expect(layout).toContain('MOBILE_MAX_WIDTH = 719');
    expect(layout).toContain('TABLET_MAX_WIDTH = 1180');
    expect(css).toContain("[data-rq-device='mobile']");
    expect(css).toContain("[data-rq-device='tablet']");
    expect(css).toContain("[data-rq-device='desktop']");
  });

  test('status colours remain semantic', () => {
    const css = read('threeModeMinimalist.css');
    expect(css).toContain('--rq-success: #5FA67A');
    expect(css).toContain('--rq-warning: #D39A43');
    expect(css).toContain('--rq-danger: #B94A4F');
    expect(css).toContain('--rq-info: #6E91B4');
  });
});
