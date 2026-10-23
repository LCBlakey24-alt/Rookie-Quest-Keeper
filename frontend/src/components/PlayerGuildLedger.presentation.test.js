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
  expect(css).toContain('outline: 2px solid var(--rq-guild-heading');
  expect(css).toContain('prefers-reduced-motion: reduce');
  expect(css).toContain('.character-page-v2 .clean-sheet-quick-stat span');
  expect(css).toContain('.character-page-v2 .clean-sheet-combat-hp-title span');
  expect(css).toContain('.character-page-v2 .clean-sheet-tabs button span');
  expect(css).toContain('font-size: max(11px, .72rem) !important');
  expect(auth).toContain('charactersLoaded');
  expect(auth).toContain('campaignsLoaded');
  expect(player).toContain('onClick={refresh} disabled={loading}');
});
