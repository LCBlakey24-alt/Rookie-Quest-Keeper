import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'RosterSplitView.css'), 'utf8');
const component = fs.readFileSync(path.join(__dirname, 'RosterSplitView.js'), 'utf8');

describe('Guild Command reference roster presentation', () => {
  test('selected NPC or beast uses a citrus underline, not a gold or red filled card', () => {
    expect(css).toContain('background-color: #263F59 !important;');
    expect(css).toContain('background-image: var(--rq-citrus-gradient, linear-gradient(90deg, #F2C94C, #EF6343, #CE393A))');
    expect(css).toContain('background-size: 0% 3px !important;');
    expect(css).toContain('background-size: 100% 3px !important;');
    expect(css).toContain('border-bottom-color: #CE393A !important;');
    expect(css).toContain('scrollbar-color: #61758A #142638;');
    expect(component).toContain("aria-current={chosen ? 'true' : undefined}");
  });

  test('names and subtitles can take their natural height instead of clipping', () => {
    expect(css).toContain('height: auto !important;');
    expect(css).toContain('max-height: none !important;');
    expect(css).toContain('min-height: 72px !important;');
    expect(css).toContain('white-space: normal !important;');
    expect(css).toContain('overflow-wrap: anywhere !important;');
    expect(css).toContain('line-height: 1.35 !important;');
  });

  test('keyboard focus stays visible and reduced-motion users get instant selection', () => {
    expect(css).toContain('outline: 3px solid #6E91B4 !important;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none !important;');
    expect(component).toContain('onKeyDown={event => navigateList(event, index)}');
    expect(component).toContain('ref={listRef}');
    expect(component).toContain('list.scrollTop +=');
    expect(component).toContain('list.scrollLeft +=');
  });
});
