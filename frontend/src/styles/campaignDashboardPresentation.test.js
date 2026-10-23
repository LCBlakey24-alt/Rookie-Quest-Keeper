import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Campaign Dashboard presentation ownership', () => {
  test('uses one route stylesheet instead of a nested sidebar and inline mobile CSS', () => {
    const source = read('../components/CampaignDashboard.js');

    expect(source).toContain("import './CampaignDashboard.css';");
    expect(source).not.toContain('gm-sidebar');
    expect(source).not.toContain('mobileMenuOpen');
    expect(source).not.toContain('mobileCss');
    expect(source).not.toMatch(/style=\{/);
  });

  test('keeps one two-row campaign navigation system', () => {
    const source = read('../components/CampaignDashboard.js');

    expect(source).toContain('campaign-dashboard-group-row');
    expect(source).toContain('campaign-dashboard-tab-row');
    expect(source).toContain('tabGroups.map');
    expect(source).toContain('activeGroup?.tabs.map');
  });

  test('owns explicit mobile tablet and desktop geometry in the navy route stylesheet', () => {
    const css = read('../components/CampaignDashboard.css');

    expect(css).toContain("[data-rq-device='mobile']");
    expect(css).toContain("[data-rq-device='tablet']");
    expect(css).toContain("[data-rq-device='desktop']");
    expect(css).toContain('var(--rq-bg-deep, #06111f)');
    expect(css).toContain('var(--rq-primary, #C9A96B)');
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).not.toMatch(/#FF2DAA|rgba\(255,45,170|#7CCBFF/i);
    expect(css).toContain('Guild Ledger campaign workspace');
    expect(css).toContain('--rqk-campaign-brass: #c9a96b;');
    expect(css).toContain('.campaign-home-overview');
  });

  test('home overview uses data-backed counts and reports partial loading failures', () => {
    const source = read('../components/CampaignDashboard.js');
    expect(source).toContain('className="campaign-home-overview"');
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('unavailableSections.includes(item.key)');
    expect(source).toContain('Some campaign records could not be loaded');
    expect(source).not.toContain("accent: { primary: '#FF2DAA'");
  });

  test('does not wrap the active workspace in another decorative panel', () => {
    const css = read('../components/CampaignDashboard.css');
    const panelRule = css.match(/#root \.campaign-dashboard-panel \{([\s\S]*?)\n\}/)?.[1] || '';

    expect(panelRule).toContain('background: transparent');
    expect(panelRule).toContain('border: 0');
    expect(panelRule).toContain('box-shadow: none');
  });
});


describe('GM Home table-ready session UX', () => {
  test('puts table tools before overview cards without duplicating prep shortcuts', () => {
    const source = read('../components/CampaignDashboard.js');
    const toolsStart = source.indexOf('className="campaign-home-session-rail"');
    const overviewStart = source.indexOf('className="campaign-home-overview"');
    expect(toolsStart).toBeGreaterThan(0);
    expect(overviewStart).toBeGreaterThan(toolsStart);
    expect(source).toContain('aria-label="Quick tools for a live session"');
    for (const tab of ['npcs', 'combat', 'chronicle', 'ingame-notes', 'maps']) {
      expect(source).toContain(`{ id: '${tab}', label:`);
    }
  });

  test('allows swipe within session actions without overflowing the phone page', () => {
    const css = read('../components/CampaignDashboard.css');
    expect(css).toContain('.campaign-home-session-rail__actions');
    expect(css).toContain('overflow-x: auto !important');
    expect(css).toContain('overscroll-behavior-x: contain !important');
    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('grid-auto-columns: minmax(116px, 41%)');
  });

  test('GM home next-event card uses the recurrence-aware calendar summary', () => {
    const source = read('../components/CampaignDashboard.js');
    expect(source).toContain('nextCampaignEvent(data.events, data.calendar)');
    expect(source).toContain('eventCountdownLabel(nextEvent.daysUntil)');
    expect(source).not.toContain('function daysUntilEvent(');
  });
});
