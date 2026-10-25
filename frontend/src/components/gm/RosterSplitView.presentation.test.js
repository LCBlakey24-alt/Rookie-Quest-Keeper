import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'RosterSplitView.css'), 'utf8');
const component = fs.readFileSync(path.join(__dirname, 'RosterSplitView.js'), 'utf8');

describe('Guild Command reference roster presentation', () => {
  test('selected NPC or beast uses wax-seal red, not a gold filled card', () => {
    expect(css).toContain('background-color: #263F59 !important;');
    expect(css).toContain('background-image: linear-gradient(to right, #7E2D2D, #7E2D2D)');
    expect(css).toContain('background-size: 0% 100% !important;');
    expect(css).toContain('background-size: 100% 100% !important;');
    expect(css).toContain('border-left-color: #7E2D2D !important;');
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
  });
});
