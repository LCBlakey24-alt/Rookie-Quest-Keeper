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

  test('contains horizontal movement inside the step rail instead of the page', () => {
    expect(css).toContain(".full-creator-workspace .full-creator-steps");
    expect(css).toContain('overflow-x: auto !important');
    expect(css).toContain('grid-template-columns: 1fr !important');
    expect(css).toContain('width: 100%');
  });

  test('keeps step state labels readable and primary touch targets at least 44px', () => {
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("min-height: 58px !important");
    expect(css).toContain(".full-creator-step-state");
    expect(css).toContain("font-size: .66rem !important");
    expect(css).not.toMatch(/255\s*,\s*45\s*,\s*170|#FF2DAA/i);
  });

  test('keeps the first mobile screen compact and navigation anchored', () => {
    expect(css).toContain('.full-creator-progress-card > p');
    expect(css).toContain('display: none');
    expect(css).toContain('bottom: calc(72px + env(safe-area-inset-bottom, 0px))');
  });
});
