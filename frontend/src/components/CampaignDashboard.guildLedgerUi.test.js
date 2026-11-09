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
    expect(css).toContain('background: var(--rqk-campaign-brass) !important');
    expect(css).toContain('background: var(--rqk-campaign-wax) !important');
    expect(css).toContain('color: #0b1b2b !important');
    expect(css).toContain('outline: 3px solid #d9bc82 !important');
  });

  test('respects reduced-motion preferences', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none !important');
    expect(css).toContain('transform: none !important');
  });
});

describe('GM accordion keeps child tools under their parent', () => {
  const sidebarCss = fs.readFileSync(path.join(__dirname, '../styles/guildCommand.css'), 'utf8');

  test('renders campaign categories and inline accessible subpages', () => {
    expect(source).toContain('data-testid="gm-workspace-accordion"');
    expect(source).toContain("data-testid={'gm-accordion-group-' + group.id}");
    expect(source).toContain("data-testid={'gm-accordion-tab-' + tab.id}");
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain('hidden={!expanded}');
  });

  test('desktop hides the obsolete detached child-tab row', () => {
    expect(sidebarCss).toContain('@media (min-width: 1181px)');
    expect(sidebarCss).toContain('.guild-command-sidebar .campaign-dashboard-tab-row');
    expect(sidebarCss).toContain('.gm-workspace-accordion__items[hidden]');
    expect(sidebarCss).toContain('display: none !important');
  });
});
