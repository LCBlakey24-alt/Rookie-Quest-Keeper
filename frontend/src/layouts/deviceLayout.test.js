import {
  DEVICE_LAYOUTS,
  MOBILE_MAX_WIDTH,
  TABLET_MAX_WIDTH,
  resolveDeviceLayout,
} from './deviceLayout';

describe('resolveDeviceLayout', () => {
  test('uses mobile through the mobile boundary', () => {
    expect(resolveDeviceLayout(0)).toBe(DEVICE_LAYOUTS.MOBILE);
    expect(resolveDeviceLayout(MOBILE_MAX_WIDTH)).toBe(DEVICE_LAYOUTS.MOBILE);
  });

  test('uses tablet between mobile and desktop', () => {
    expect(resolveDeviceLayout(MOBILE_MAX_WIDTH + 1)).toBe(DEVICE_LAYOUTS.TABLET);
    expect(resolveDeviceLayout(TABLET_MAX_WIDTH)).toBe(DEVICE_LAYOUTS.TABLET);
  });

  test('uses desktop above the tablet boundary', () => {
    expect(resolveDeviceLayout(TABLET_MAX_WIDTH + 1)).toBe(DEVICE_LAYOUTS.DESKTOP);
    expect(resolveDeviceLayout(1920)).toBe(DEVICE_LAYOUTS.DESKTOP);
  });

  test('falls back to desktop for non-numeric widths', () => {
    expect(resolveDeviceLayout(undefined)).toBe(DEVICE_LAYOUTS.DESKTOP);
    expect(resolveDeviceLayout('not-a-width')).toBe(DEVICE_LAYOUTS.DESKTOP);
  });
});
