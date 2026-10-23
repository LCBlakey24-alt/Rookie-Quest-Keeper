import fs from 'fs';
import path from 'path';

const read = relative => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

describe('Guild Ledger visual finishing pass', () => {
  test('loads after the old broad visual overrides', () => {
    const entry = read('../index.js');
    expect(entry.indexOf('threeModeMinimalist.css')).toBeGreaterThan(-1);
    expect(entry.indexOf('guildLedgerFinish.css')).toBeGreaterThan(entry.indexOf('threeModeMinimalist.css'));
  });

  test('uses the design-board brass, ink-navy and oxblood seal palette', () => {
    const css = read('./guildLedgerFinish.css');
    const fonts = read('../index.css');
    expect(css).toContain('--rq-guild-wine: #7E2D2D');
    expect(css).toContain('--rq-guild-heading: #D9BC82');
    expect(css).toContain('--rq-guild-copy: #F1EEE7');
    expect(css).toContain('linear-gradient(115deg, #35212A');
    expect(fonts).toContain("--rq-font-display: 'Fraunces'");
    expect(css).not.toMatch(/#ff2daa|#7357ff|#d84df1|#ff9542/i);
  });

  test('removes decorative logo and card borders but keeps keyboard focus rings', () => {
    const css = read('./guildLedgerFinish.css');
    expect(css).toContain("img[src^='/brand/']");
    expect(css).toContain('.rqk-app-rail-brand-mark');
    expect(css).toContain('.rqk-npc-card');
    expect(css).toContain('.campaign-home-focus-card');
    expect(css).toContain('border: 0 !important');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 2px solid var(--rq-info, #6E91B4)');
  });

  test('does not animate on devices requesting reduced motion', () => {
    const css = read('./guildLedgerFinish.css');
    const splash = read('../components/RouteLoadingScreen.css');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(splash).toContain('@media (prefers-reduced-motion: reduce)');
    expect(splash).toContain('.rqk-route-logo');
    expect(splash).toContain('animation: none !important');
    expect(splash).toContain('background: radial-gradient');
    expect(splash).not.toContain('#FF2DAA');
  });

  test('a stalled loading route still offers a real recovery control', () => {
    const route = read('../components/RouteLoadingScreen.js');
    expect(route).toContain('window.setTimeout');
    expect(route).toContain('window.location.reload()');
    expect(route).toContain('Your saved campaigns have not been reset');
  });
});
