import fs from 'fs';
import path from 'path';

const read = rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Guild Command user-supplied blue paper wallpaper', () => {
  test('wallpaper styles load after Guild Command and interaction colours', () => {
    const entry = read('../index.js');
    expect(entry.indexOf('guildBlueTexture.css')).toBeGreaterThan(entry.indexOf('guildCommand.css'));
    expect(entry.indexOf('guildBlueTexture.css')).toBeGreaterThan(entry.indexOf('waxSealInteractive.css'));
  });

  test('one self-hosted optimised WebP is used across the site (no external asset calls)', () => {
    const css = read('./guildBlueTexture.css');
    const fullPath = path.resolve(__dirname, '../assets/guild-craft-paper.webp');
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(fs.statSync(fullPath).size).toBeLessThan(600000);
    expect(css).toContain("url('../assets/guild-craft-paper.webp')");
    expect(css).not.toMatch(/url\(['"]?https?:\/\//i);
    expect(css).not.toContain('/brand/guild-blue-bookcloth.svg');
    expect(css).toContain('--rq-guild-paper-width: min(100%, 1440px);');
    expect(css).toContain('background-size: 100% 100%, var(--rq-guild-paper-width) auto !important;');
    expect(css).toContain('background-repeat: no-repeat, repeat !important;');
    expect(css).not.toContain('background-size: cover');
  });

  test('landing, login, loading, character, combat, GM and remote presentation have wallpaper', () => {
    const css = read('./guildBlueTexture.css');
    for (const selector of [
      '.rqk-app-shell',
      '.keeper-product-site',
      '.rqk-auth-page',
      '.loading-screen',
      '.clean-sheet-page',
      '.combat-table-page',
      '.rqk-live-session-screen',
      '[data-testid="second-screen-remote-page"]',
      '.rqk-player-display__frame',
    ]) {
      expect(css).toContain(selector);
    }
    const live = read('../components/gm/LiveSessionGridPage.js');
    expect(live).toContain('className="rqk-live-session-screen"');
  });

  test('paper is substantially darker and stays zoomed out on mobile and extended TV', () => {
    const css = read('./guildBlueTexture.css');
    const overlay = 'linear-gradient(rgba(3, 11, 21, .72), rgba(3, 11, 21, .80))';
    expect(css.split(overlay).length - 1).toBe(2);
    expect(css).toContain('html body #root .rqk-player-display .rqk-player-display__frame {');
    expect(css).toContain('background-size: 100% 100%, var(--rq-guild-paper-width) auto !important;');
    expect(css).not.toMatch(/background-size:\s*cover/i);
  });

  test('keeps opaque reading cards and combat maps clean, and offers solid high contrast', () => {
    const css = read('./guildBlueTexture.css');
    expect(css).toContain('.rqk-app-shell .rqk-app-workspace');
    expect(css).toContain('background: transparent !important;');
    expect(css).toContain('.rqk-stat-block,');
    expect(css).toContain('.rqk-reference-browser__detail,');
    expect(css).toContain('.rqk-player-display__combat-map,');
    expect(css).toContain('@media (prefers-contrast: more)');
    expect(css).toContain('background-image: none !important;');
  });
});
