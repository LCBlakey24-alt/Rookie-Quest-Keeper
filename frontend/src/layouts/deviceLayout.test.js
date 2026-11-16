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

  test('keeps an actual touch phone in the mobile lane when rotated to landscape', () => {
    expect(resolveDeviceLayout(844, { height: 390, coarsePointer: true })).toBe(DEVICE_LAYOUTS.MOBILE);
    expect(resolveDeviceLayout(932, { height: 430, coarsePointer: true })).toBe(DEVICE_LAYOUTS.MOBILE);
  });

  test('preserves tablet and desktop layouts at equivalent widths without phone conditions', () => {
    expect(resolveDeviceLayout(844, { height: 390, coarsePointer: false })).toBe(DEVICE_LAYOUTS.TABLET);
    expect(resolveDeviceLayout(844, { height: 768, coarsePointer: true })).toBe(DEVICE_LAYOUTS.TABLET);
    expect(resolveDeviceLayout(1024, { height: 768, coarsePointer: true })).toBe(DEVICE_LAYOUTS.TABLET);
    expect(resolveDeviceLayout(1440, { height: 900, coarsePointer: false })).toBe(DEVICE_LAYOUTS.DESKTOP);
  });

  test('falls back to desktop for non-numeric widths', () => {
    expect(resolveDeviceLayout(undefined)).toBe(DEVICE_LAYOUTS.DESKTOP);
    expect(resolveDeviceLayout('not-a-width')).toBe(DEVICE_LAYOUTS.DESKTOP);
  });
});
