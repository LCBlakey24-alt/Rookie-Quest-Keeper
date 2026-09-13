import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'characterCreator.css'), 'utf8');

describe('mobile character creator presentation', () => {
  test('keeps the horizontal step rail readable and snappable', () => {
    expect(css).toContain('scroll-snap-type: x mandatory');
    expect(css).toContain('scroll-snap-align: center');
    expect(css).toContain("display: inline !important");
  });

  test('turns normal choice groups into touch-sized cards', () => {
    expect(css).toContain('.full-creator-choice-block > div:not(:has(.full-creator-spell-chip))');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(132px, 1fr))');
  });

  test('keeps the first mobile screen compact and navigation anchored', () => {
    expect(css).toContain('.full-creator-progress-card > p');
    expect(css).toContain('display: none');
    expect(css).toContain('bottom: calc(72px + env(safe-area-inset-bottom, 0px))');
  });
});
