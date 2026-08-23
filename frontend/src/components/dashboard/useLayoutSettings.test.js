import {
  defaultSectionOrder,
  normaliseSectionOrder,
  normaliseSectionOrderByDevice,
} from './useLayoutSettings';

describe('Home layout settings', () => {
  test('does not include the retired status bar', () => {
    expect(defaultSectionOrder).not.toContain('status_bar');
  });

  test('drops retired status-bar entries from saved layouts', () => {
    const order = normaliseSectionOrder(['status_bar', 'dashboard_hero', 'quick_actions']);

    expect(order).not.toContain('status_bar');
    expect(order[0]).toBe('dashboard_hero');
  });

  test('normalises each device lane against the same current sections', () => {
    const byDevice = normaliseSectionOrderByDevice({
      desktop: ['dashboard_hero', 'status_bar', 'quick_actions'],
      tablet: ['status_bar', 'live_workspace'],
      mobile: ['quick_actions', 'status_bar'],
    });

    expect(byDevice.desktop).not.toContain('status_bar');
    expect(byDevice.tablet).not.toContain('status_bar');
    expect(byDevice.mobile).not.toContain('status_bar');
  });
});
