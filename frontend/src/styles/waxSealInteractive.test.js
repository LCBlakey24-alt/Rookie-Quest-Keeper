import fs from 'fs';
import path from 'path';

const read = rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('web controls: blue -> wax seal, antique gold only for text', () => {
  test('final stylesheet loads after the Guild Ledger theme', () => {
    const entry = read('../index.js');
    expect(entry).toContain('waxSealInteractive.css');
    expect(entry.indexOf('waxSealInteractive.css')).toBeGreaterThan(entry.indexOf('guildLedgerFinish.css'));
  });

  test('unselected controls are blue and selection stays wax red', () => {
    const css = read('./waxSealInteractive.css');
    expect(css).toContain('--rq-control-blue: #263F59');
    expect(css).toContain('--rq-control-wax: #7E2D2D');
    expect(css).toContain('background: var(--rq-control-blue) !important;');
    expect(css).toContain('border-color: var(--rq-control-wax) !important;');
    expect(css).toContain("is(.active, .is-active, [aria-current='page'], [aria-selected='true'], [aria-pressed='true'])::before");
    expect(css).toContain('transform: scaleX(1)');
    expect(css).not.toMatch(/background:\s*#[cC]9[aA]9[6][bB]/);
  });

  test('desktop hover sweeps from left to right rather than instantly replacing blue', () => {
    const css = read('./waxSealInteractive.css');
    const oldHover = read('./guildLedgerFinish.css');
    expect(css).toContain('transform-origin: left center;');
    expect(css).toContain('transform: scaleX(0)');
    expect(css).toContain('--rq-control-sweep-duration: 340ms');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain(':hover::before');
    expect(oldHover).not.toContain('background: var(--rq-guild-wine-hover) !important');
  });

  test('press and keyboard focus reveal red while reduced motion skips animation', () => {
    const css = read('./waxSealInteractive.css');
    expect(css).toContain('.rq-fill-clicked');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 3px solid var(--rq-info, #6E91B4)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none !important;');
  });

  test('landing primary button and selected preview are not gold', () => {
    const css = read('./keeperProductSite.css');
    expect(css).toContain('background: var(--rq-control-blue, #263F59) !important;');
    expect(css).toContain('background: var(--rq-control-wax, #7E2D2D);');
    expect(css).not.toContain('background: var(--landing-gold);');
    expect(css).not.toContain('background: var(--landing-gold) !important;');
  });
});
