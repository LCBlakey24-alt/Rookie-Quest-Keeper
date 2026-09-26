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
    expect(creator).toContain('--rqk-creator-pink: var(--rq-primary, #C9A96B)');
    expect(creator).toContain('--rqk-creator-blue: var(--rq-secondary, #6E91B4)');
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
