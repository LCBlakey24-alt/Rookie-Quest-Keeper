import fs from 'fs';
import path from 'path';
import { allTabs, tabGroups } from './gm/dashboard/campaignDashboardTabs';

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

describe('Guild Command: selected campaign workspace design', () => {
  const source = read('CampaignDashboard.js');
  const css = read('GuildCommandWorkspace.css');

  test('renders the full campaign tool taxonomy in a dedicated desktop rail', () => {
    expect(source).toContain('campaign-guild-command-layout');
    expect(source).toContain('campaign-guild-command-side-nav');
    expect(source).toContain('tabGroups.map(group =>');
    expect(source).toContain('group.tabs.map(tab =>');
    expect(source).toContain('aria-current={selected ? \'page\' : undefined}');
    expect(source).toContain('onClick={() => handleTabClick(tab.id)}');
    expect(allTabs.length).toBeGreaterThanOrEqual(15);
    expect(tabGroups.map(group => group.id)).toEqual(['campaign','world','prep','more']);
  });

  test('large screens use a full navigation rail while tablet and mobile retain compact controls', () => {
    expect(css).toContain('@media (min-width: 1181px)');
    expect(css).toContain('grid-template-columns: clamp(195px, 18vw, 228px)');
    expect(css).toContain('.campaign-dashboard-group-row');
    expect(css).toContain('.campaign-dashboard-tab-row');
    expect(css).toContain('.rqk-campaign-mobile-navigator');
    expect(css).toContain('display: none !important');
    expect(css).toContain('@media (min-width: 761px) and (max-width: 1180px)');
    expect(css).toContain('@media (max-width: 760px)');
    expect(source).toContain('CampaignMobileNavigator');
    const shell = read('app/AppShell.js');
    expect(shell).toContain("data-rq-workspace={location.pathname.startsWith('/campaign/') ? 'campaign' : 'general'}");
    expect(css).toContain("grid-template-columns: 68px minmax(0,1fr)");
    expect(css).toContain(".rqk-app-rail-brand-copy");
  });

  test('overview is honest, data-backed, campaign-scoped and action-oriented', () => {
    expect(source).toContain('Your adventure at a glance');
    expect(source).toContain('data.quests.length');
    expect(source).toContain('data.npcs.length');
    expect(source).toContain('data.locations.length');
    expect(source).toContain('data.notes.length');
    expect(source).toContain("unavailableSections.includes(item.key) ? '—'");
    expect(source).toContain('onClick={onOpenLivePlay}');
    expect(source).toContain('onClick={() => onOpenTab(\'story-arcs\')}');
    expect(source).toContain('campaign-home-note-preview');
    expect(source).toContain('CampaignJoinCodeCard');
    expect(source).toContain('campaign-home-session-rail');
  });

  test('selection is wax-red, focus blue and antique gold appears on typography only', () => {
    expect(source).toContain('campaign-guild-command-side-link rqk-selectable-control');
    expect(css).toContain('border-color: #7E2D2D');
    expect(css).toContain('outline: 3px solid #6E91B4');
    expect(css).toContain('color: #C9A96B');
    expect(css).not.toMatch(/(?:background|border(?:-color)?)\s*:\s*(?:#C9A96B|#D9BC82)/i);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
