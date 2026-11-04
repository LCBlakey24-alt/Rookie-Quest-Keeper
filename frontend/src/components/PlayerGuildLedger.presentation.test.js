import fs from 'fs';
import path from 'path';

test('Guild Ledger player pages preserve readable phone actions and scrolling campaign tabs', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../styles/guildLedgerFinish.css'), 'utf8');
  const auth = fs.readFileSync(path.resolve(__dirname, './PlayerDashboard.js'), 'utf8');
  const player = fs.readFileSync(path.resolve(__dirname, './player/PlayerCampaignPage.js'), 'utf8');

  expect(css).toContain('#root .rqk-app-shell .player-dashboard-page');
  expect(css).toContain('#root .rqk-app-shell .player-campaign-page');
  expect(css).toContain('.player-dashboard-unavailable');
  expect(css).toContain('.player-dashboard-tab-list');
  expect(css).toContain('.player-campaign-tabs');
  expect(css).toContain('overflow-x: auto !important');
  expect(css).toContain('font-size: 12px !important');
  expect(css).toContain('.player-campaign-action::after');
  expect(css).toContain('outline: 2px solid var(--rq-info');
  expect(css).toContain('prefers-reduced-motion: reduce');
  expect(css).toContain('.character-page-v2 .clean-sheet-quick-stat span');
  expect(css).toContain('.character-page-v2 .clean-sheet-combat-hp-title span');
  expect(css).toContain('.character-page-v2 .clean-sheet-tabs button span');
  expect(css).toContain('font-size: max(11px, .72rem) !important');
  expect(auth).toContain('charactersLoaded');
  expect(auth).toContain('campaignsLoaded');
  expect(player).toContain('onClick={refresh} disabled={loading}');
});

test('player alerts and unread badges respect semantic status and neutral borders', () => {
  const dashboard = fs.readFileSync(path.resolve(__dirname, './PlayerDashboard.js'), 'utf8');
  const dashboardTabs = fs.readFileSync(path.resolve(__dirname, './dashboard/player/PlayerDashboardTabs.css'), 'utf8');
  const campaignBadge = fs.readFileSync(path.resolve(__dirname, '../styles/playerCampaignTabBadge.css'), 'utf8');
  const dashboardBoard = fs.readFileSync(path.resolve(__dirname, '../styles/playerDashboardBoard.css'), 'utf8');

  expect(dashboard).toContain('--rq-warning');
  expect(dashboard).toContain('--rq-info');
  expect(dashboard).toContain('--rq-bg-panel');
  expect(dashboardTabs).toContain('--rq-text-primary');
  expect(campaignBadge).toContain('--rq-text-primary');
  expect(dashboardBoard).toContain('--rq-control-blue');
  expect(dashboard).not.toMatch(/#FF2DAA|#7CCBFF|#0C2234/i);
  expect(dashboardTabs).not.toMatch(/#FF2DAA/i);
  expect(campaignBadge).not.toMatch(/#D6A84F/i);
});


test('mobile More menu uses neutral blue controls and the citrus active underline', () => {
  const mobileMore = fs.readFileSync(path.resolve(__dirname, '../styles/homeHubMobileNavPolish.css'), 'utf8');
  expect(mobileMore).toContain('--rq-citrus-control');
  expect(mobileMore).toContain('--rq-citrus-gradient');
  expect(mobileMore).toContain('background-size: 100% 3px');
  expect(mobileMore).toContain(':focus-visible');
  expect(mobileMore).not.toMatch(/#D6A84F|#FF2DAA|214,168,79/i);
});
