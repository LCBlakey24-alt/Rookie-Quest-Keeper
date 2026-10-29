import fs from 'fs';
import path from 'path';

const read = rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Guild Command citrus site-wide design contract', () => {
  test('final stylesheet replaces wax fill and wallpaper and loads after Guild Command', () => {
    const entry = read('../index.js');
    expect(entry).toContain('guildCommand.css');
    expect(entry).toContain('citrusCommand.css');
    expect(entry.indexOf('citrusCommand.css')).toBeGreaterThan(entry.indexOf('guildCommand.css'));
    expect(entry).not.toContain('import "@/styles/waxSealInteractive.css"');
    expect(entry).not.toContain('guildBlueTexture.css');
  });

  test('flat navy backgrounds without noisy wallpaper', () => {
    const css = read('./citrusCommand.css');
    expect(css).toContain('--rq-citrus-navy: #0B1B2B;');
    expect(css).toContain('--rq-citrus-panel: #142638;');
    expect(css).toContain('background-image: none !important;');
    expect(css).toContain('.rqk-player-display__frame');
    expect(css).toContain('.keeper-product-site');
    expect(css).toContain('.rqk-auth-page');
    expect(css).toContain('.character-page-v2');
    expect(css).not.toMatch(/guild-craft-paper|url\(/);
  });

  test('gradient is yellow to citrus orange to blood orange, never a full card fill', () => {
    const css = read('./citrusCommand.css');
    expect(css).toContain('--rq-citrus-yellow: #F2C94C;');
    expect(css).toContain('--rq-citrus-orange: #D85C2E;');
    expect(css).toContain('--rq-citrus-blood: #A63A24;');
    expect(css).toContain('--rq-citrus-gradient: linear-gradient(90deg,');
    // The colour transition now lives in the centre, with deliberate solid
    // colour holds at both ends instead of a full-width rainbow blend.
    expect(css).toContain('var(--rq-citrus-yellow) 0%,');
    expect(css).toContain('var(--rq-citrus-yellow) 28%,');
    expect(css).toContain('var(--rq-citrus-orange) 50%,');
    expect(css).toContain('var(--rq-citrus-blood) 72%,');
    expect(css).toContain('var(--rq-citrus-blood) 100%);');
    expect(css).toContain('background: var(--rq-citrus-control) !important;');
    expect(css).toContain('background-size: 0% 3px !important;');
    expect(css).toContain('background-size: 100% 3px !important;');
    expect(css).toContain('background-position: left bottom !important;');
    expect(css).not.toContain('background-size: 100% 100%');
  });

  test('navigation selected, hover, touch and keyboard states retain accessibility', () => {
    const css = read('./citrusCommand.css');
    expect(css).toContain("[aria-selected='true']");
    expect(css).toContain("[aria-current='page']");
    expect(css).toContain('.rq-fill-clicked');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 3px solid #6E91B4 !important;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('#root .landing-page-final.keeper-product-site button.landing-button,');
    expect(css).toContain('transition: none !important;');
  });

  test('danger, healing, disabled, busy and map/stat surfaces are not replaced', () => {
    const css = read('./citrusCommand.css');
    expect(css).toContain(":not([data-variant='destructive'])");
    expect(css).toContain(".rq-hp-action-button--plus");
    expect(css).toContain(".rq-hp-action-button--minus");
    expect(css).toContain("[aria-busy='true']");
    expect(css).toContain("[aria-disabled='true']");
    expect(css).toContain('maps, stat blocks, artwork');
  });

  test('section and sidebar accents remain thin gradient lines', () => {
    const css = read('./citrusCommand.css');
    expect(css).toContain('.campaign-dashboard-header');
    expect(css).toContain('.campaign-home-section-heading');
    expect(css).toContain('.rqk-live-grid__header');
    expect(css).toContain('.rqk-player-display__status');
    expect(css).toContain('background-size: 100% 2px !important;');
  });
});
