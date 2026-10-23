import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'CampaignDashboard.css'), 'utf8');
const jsx = fs.readFileSync(path.join(__dirname, 'CampaignDashboard.js'), 'utf8');

describe('GM campaign workspace accessibility and responsive polish', () => {
  test('gold active controls use dark ink rather than low contrast white', () => {
    expect(css).toMatch(/\.campaign-dashboard-tab\.is-active\s*\{\s*color:\s*#07131f !important/);
    expect(css).toContain('.campaign-button-primary,');
  });

  test('navigation and quick actions expose visible keyboard focus', () => {
    expect(css).toContain('):focus-visible {');
    expect(css).toContain('outline: 3px solid #e8c988 !important');
  });

  test('mobile retains join code and live play rather than hiding core actions', () => {
    expect(jsx).toContain("onClick={copyInviteCode}");
    expect(jsx).toContain("onClick={handleOpenGMScreen}");
    expect(css).not.toContain('display: none !important;\n  }\n  #root .campaign-dashboard-simple .campaign-dashboard-title-copy > span');
  });

  test('workspace respects widescreen limits and reduced motion', () => {
    expect(css).toContain('max-width: 1600px !important');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('scroll-snap-type: none !important');
  });
});
