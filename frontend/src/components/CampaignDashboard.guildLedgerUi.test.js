import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'CampaignDashboard.css'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, 'CampaignDashboard.js'), 'utf8');

describe('Guild Ledger campaign workspace UI', () => {
  test('retains campaign-scoped navigation and live-play access', () => {
    expect(source).toContain('CampaignMobileNavigator');
    expect(source).toContain('campaign-dashboard-title-copy');
    expect(source).toContain('campaign-dashboard-panel');
    expect(source).toContain('aria-label="Open Live Play"');
  });

  test('gives desktop GM tools room and mobile tools usable touch targets', () => {
    expect(css).toContain('--rqk-workspace-content: 1480px');
    expect(css).toContain('.campaign-home-simple {\n  width: 100% !important;');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('min-height: 44px !important');
    expect(css).toContain('env(safe-area-inset-bottom, 0px)');
  });

  test('uses dark text on antique-gold actions and visible keyboard focus', () => {
    expect(css).toContain('background: #c9a96b !important');
    expect(css).toContain('color: #07131f !important');
    expect(css).toContain('outline: 3px solid #d9bc82 !important');
  });

  test('respects reduced-motion preferences', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none !important');
    expect(css).toContain('transform: none !important');
  });
});
