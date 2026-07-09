import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';

export const defaultLayoutSettings = {
  mode: 'balanced',
  density: 'comfortable',
  desktop: { container_max_width: 1440, card_scale: 'normal', columns: 3, show_sidebar: true },
  tablet: { container_max_width: 1024, card_scale: 'normal', columns: 2, show_sidebar: false },
  mobile: { container_max_width: 720, card_scale: 'compact', columns: 1, show_sidebar: false },
  modules: {
    dashboard_hero: true,
    quick_actions: true,
    site_updates: true,
    feedback_prompt: true,
    reviews: true,
    admin_notice: true,
  },
};

function normaliseLayoutSettings(value = {}) {
  return {
    ...defaultLayoutSettings,
    ...value,
    desktop: { ...defaultLayoutSettings.desktop, ...(value.desktop || {}) },
    tablet: { ...defaultLayoutSettings.tablet, ...(value.tablet || {}) },
    mobile: { ...defaultLayoutSettings.mobile, ...(value.mobile || {}) },
    modules: { ...defaultLayoutSettings.modules, ...(value.modules || {}) },
  };
}

function getDevice(width) {
  if (width <= 760) return 'mobile';
  if (width <= 1180) return 'tablet';
  return 'desktop';
}

function getWindowWidth() {
  if (typeof window === 'undefined') return 1440;
  return window.innerWidth || 1440;
}

export default function useLayoutSettings() {
  const [settings, setSettings] = useState(defaultLayoutSettings);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState(getDevice(getWindowWidth()));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.get('/layout-settings');
        if (!cancelled) setSettings(normaliseLayoutSettings(res.data));
      } catch {
        if (!cancelled) setSettings(defaultLayoutSettings);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => setDevice(getDevice(getWindowWidth()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const deviceSettings = settings[device] || defaultLayoutSettings[device];

  const layoutStyle = useMemo(() => ({
    '--dashboard-admin-max-width': `${deviceSettings.container_max_width || defaultLayoutSettings[device].container_max_width}px`,
    '--dashboard-admin-columns': String(deviceSettings.columns || defaultLayoutSettings[device].columns),
    '--dashboard-admin-gap': settings.density === 'spacious' ? '14px' : settings.density === 'compact' ? '7px' : '10px',
    '--dashboard-admin-card-min-height': deviceSettings.card_scale === 'large' ? '132px' : deviceSettings.card_scale === 'compact' ? '84px' : '108px',
  }), [device, deviceSettings.card_scale, deviceSettings.columns, deviceSettings.container_max_width, settings.density]);

  const layoutClassName = [
    `dashboard-layout-${settings.mode || 'balanced'}`,
    `dashboard-density-${settings.density || 'comfortable'}`,
    `dashboard-device-${device}`,
    `dashboard-card-scale-${deviceSettings.card_scale || 'normal'}`,
    deviceSettings.show_sidebar ? 'dashboard-layout-sidebar-on' : 'dashboard-layout-sidebar-off',
  ].join(' ');

  return {
    settings,
    loading,
    device,
    deviceSettings,
    modules: settings.modules || defaultLayoutSettings.modules,
    layoutStyle,
    layoutClassName,
  };
}
