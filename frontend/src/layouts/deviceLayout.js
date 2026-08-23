import { useEffect, useState } from 'react';

export const DEVICE_LAYOUTS = Object.freeze({
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
});

export const MOBILE_MAX_WIDTH = 719;
export const TABLET_MAX_WIDTH = 1180;

export function resolveDeviceLayout(width) {
  const numericWidth = Number(width);
  if (!Number.isFinite(numericWidth)) return DEVICE_LAYOUTS.DESKTOP;
  if (numericWidth <= MOBILE_MAX_WIDTH) return DEVICE_LAYOUTS.MOBILE;
  if (numericWidth <= TABLET_MAX_WIDTH) return DEVICE_LAYOUTS.TABLET;
  return DEVICE_LAYOUTS.DESKTOP;
}

function currentWindowWidth() {
  if (typeof window === 'undefined') return TABLET_MAX_WIDTH + 1;
  return window.innerWidth;
}

export function useDeviceLayout() {
  const [layout, setLayout] = useState(() => resolveDeviceLayout(currentWindowWidth()));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => {
      setLayout((current) => {
        const next = resolveDeviceLayout(window.innerWidth);
        return current === next ? current : next;
      });
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return layout;
}
