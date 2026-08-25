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
    expect(css).toContain('var(--rq-primary, #d11f2a)');
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
  });

  test('does not wrap the active workspace in another decorative panel', () => {
    const css = read('../components/CampaignDashboard.css');
    const panelRule = css.match(/#root \.campaign-dashboard-panel \{([\s\S]*?)\n\}/)?.[1] || '';

    expect(panelRule).toContain('background: transparent');
    expect(panelRule).toContain('border: 0');
    expect(panelRule).toContain('box-shadow: none');
  });
});
