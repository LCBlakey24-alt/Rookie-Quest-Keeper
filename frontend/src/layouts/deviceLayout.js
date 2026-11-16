import { useEffect, useState } from 'react';

export const DEVICE_LAYOUTS = Object.freeze({
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
});

export const MOBILE_MAX_WIDTH = 719;
export const TABLET_MAX_WIDTH = 1180;

// A phone rotated sideways can be 800–950 CSS pixels wide. Its short screen
// and coarse pointer still need the compact phone controls, including the dock.
export const LANDSCAPE_PHONE_MAX_WIDTH = 960;
export const LANDSCAPE_PHONE_MAX_HEIGHT = 520;

export function resolveDeviceLayout(width, { height, coarsePointer = false } = {}) {
  const numericWidth = Number(width);
  if (!Number.isFinite(numericWidth)) return DEVICE_LAYOUTS.DESKTOP;
  if (numericWidth <= MOBILE_MAX_WIDTH) return DEVICE_LAYOUTS.MOBILE;

  const numericHeight = Number(height);
  const compactLandscapePhone = coarsePointer
    && Number.isFinite(numericHeight)
    && numericHeight > 0
    && numericWidth > numericHeight
    && numericWidth <= LANDSCAPE_PHONE_MAX_WIDTH
    && numericHeight <= LANDSCAPE_PHONE_MAX_HEIGHT;
  if (compactLandscapePhone) return DEVICE_LAYOUTS.MOBILE;

  if (numericWidth <= TABLET_MAX_WIDTH) return DEVICE_LAYOUTS.TABLET;
  return DEVICE_LAYOUTS.DESKTOP;
}

function currentDeviceLayout() {
  if (typeof window === 'undefined') return DEVICE_LAYOUTS.DESKTOP;
  return resolveDeviceLayout(window.innerWidth, {
    height: window.innerHeight,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  });
}

export function useDeviceLayout() {
  const [layout, setLayout] = useState(currentDeviceLayout);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => {
      setLayout((current) => {
        const next = currentDeviceLayout();
        return current === next ? current : next;
      });
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return layout;
}
