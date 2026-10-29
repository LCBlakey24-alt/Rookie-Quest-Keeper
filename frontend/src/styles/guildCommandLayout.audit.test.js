import fs from 'fs';
import path from 'path';

const read = relative => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

describe('Guild Command UI audit: desktop sidebar and input states', () => {
  const layout = read('./guildCommand.css');
  const citrus = read('./citrusCommand.css');
  const olderNav = read('../components/CampaignDashboard.css');

  test('desktop rail explicitly overrides the legacy important horizontal tab strip', () => {
    expect(olderNav).toContain('display: grid !important;');
    expect(olderNav).toContain('overflow-x: auto !important;');
    expect(olderNav).toContain('white-space: nowrap !important;');

    expect(layout).toContain('@media (min-width: 1181px)');
    expect(layout).toContain('campaign-dashboard-nav.guild-command-sidebar');
    expect(layout).toContain('display: flex !important;');
    expect(layout).toContain('flex-direction: column !important;');
    expect(layout).toContain('overflow-x: visible !important;');
    expect(layout).toContain('scroll-snap-type: none !important;');
    expect(layout).toContain('white-space: normal !important;');
    expect(layout).toContain('min-width: 0 !important;');
  });

  test('desktop sticky nav remains below header and fits available viewport height', () => {
    expect(olderNav).toContain('position: sticky !important;');
    expect(olderNav).toContain('z-index: 35 !important;');
    expect(layout).toContain('top: 124px !important;');
    expect(layout).toContain('max-height: calc(100dvh - 136px) !important;');
    expect(layout).toContain('overflow-y: auto !important;');
  });

  test('mobile and tablet retain the original compact navigation', () => {
    const desktop = layout.slice(layout.indexOf('@media (min-width: 1181px)'));
    expect(desktop).toContain('campaign-dashboard-group-row');
    expect(layout).toContain('@media (max-width: 1180px)');
    expect(layout).toContain('.guild-command-frame { display: block; min-width: 0; }');
    expect(olderNav).toContain('.rqk-campaign-mobile-navigator');
  });

  test('pressed and keyboard-focused controls are descendants of their app shells', () => {
    expect(citrus).not.toMatch(/\.App\):is\(\.campaign-dashboard-tab/);
    expect(citrus).toContain('.App) :is(.campaign-dashboard-tab');
    expect(citrus).toContain('.rq-fill-clicked');
    expect(citrus).toContain('):focus-visible:not(:disabled):not([aria-disabled=\'true\'])');
    expect(citrus).toContain('background-size: 100% 3px !important;');
    expect(citrus).toContain('outline: 3px solid #6E91B4 !important;');
  });
});
