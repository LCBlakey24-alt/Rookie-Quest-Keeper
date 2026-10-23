import fs from 'fs';
import path from 'path';

const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

describe('Player display — responsive, player-safe presentation', () => {
  test('keeps a single bounded viewport frame, not another page scrollbar', () => {
    const source = read('./PlayerDisplayPage.js');
    const css = read('./PlayerDisplayPage.css');

    expect(source).toContain('data-testid="player-display-page"');
    expect(source).toContain('data-display-target={target}');
    expect(source).toContain('height: \'100dvh\'');
    expect(source).toContain('gridTemplateRows: \'minmax(0, 1fr) auto\'');
    expect(source).toContain('className="rqk-player-display__stage"');
    expect(css).toContain('.rqk-player-display__stage {');
    expect(css).toContain('overflow: hidden');
  });

  test('fits NPC and combat panels on short 720p or 768p standing-TV windows', () => {
    const source = read('./PlayerDisplayPage.js');
    const css = read('./PlayerDisplayPage.css');
    expect(source).toContain('className="rqk-player-display__npc-grid"');
    expect(source).toContain('className="rqk-player-display__combat"');
    expect(source).toContain('className="rqk-player-display__party"');
    expect(css).toContain('@media (min-width: 800px) and (max-height: 800px)');
    expect(css).toContain('@media (min-width: 800px) and (max-height: 620px)');
    expect(css).toContain('.rqk-player-display__npc-heading h1');
    expect(css).toContain('grid-template-columns: minmax(175px, 245px) minmax(0,1fr)');
    expect(css).toContain('.rqk-player-display__footer { display: none !important; }');
  });

  test('uses the Guild Ledger presentation palette without exposing GM-only data', () => {
    const css = read('./PlayerDisplayPage.css');
    const source = read('./PlayerDisplayPage.js');
    expect(css).toContain('--rqk-tv-navy: #0b1b2b');
    expect(css).toContain('--rqk-tv-gold: #c9a96b');
    expect(css).toContain('--rqk-tv-cream: #eadfc8');
    expect(source).toContain('<PlayerBanner banner={payload.banner} target={target} />');
    expect(source).toContain('showPartySidebar && <PartySidebar');
  });

  test('fullscreen can be entered and exited with the same button or F shortcut', () => {
    const source = read('./PlayerDisplayPage.js');
    expect(source).toContain('document.exitFullscreen()');
    expect(source).toContain('document.documentElement.requestFullscreen()');
    expect(source).toContain('document.addEventListener(\'fullscreenchange\'');
    expect(source).toContain("!event.ctrlKey && !event.altKey && !event.metaKey");
    expect(source).toContain("aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}");
  });
});
