import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';

export const defaultSectionOrder = ['dashboard_hero', 'status_bar', 'quick_actions', 'live_workspace', 'site_updates', 'reviews', 'admin_notice'];

export const defaultSectionOrderByDevice = {
  desktop: defaultSectionOrder,
  tablet: defaultSectionOrder,
  mobile: defaultSectionOrder,
};

export const defaultSectionVisibility = Object.fromEntries(defaultSectionOrder.map(sectionId => [sectionId, true]));

export const defaultSectionVisibilityByDevice = {
  desktop: defaultSectionVisibility,
  tablet: defaultSectionVisibility,
  mobile: defaultSectionVisibility,
};

export const defaultSectionDisplay = Object.fromEntries(defaultSectionOrder.map(sectionId => [sectionId, 'standard']));

export const defaultSectionDisplayByDevice = {
  desktop: defaultSectionDisplay,
  tablet: defaultSectionDisplay,
  mobile: defaultSectionDisplay,
};

const allowedSectionDisplays = ['standard', 'compact', 'featured'];

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
  section_order: defaultSectionOrder,
  section_order_by_device: defaultSectionOrderByDevice,
  section_visibility_by_device: defaultSectionVisibilityByDevice,
  section_display_by_device: defaultSectionDisplayByDevice,
};

export function normaliseSectionOrder(order) {
  const safe = [];
  if (Array.isArray(order)) {
    order.forEach(sectionId => {
      if (defaultSectionOrder.includes(sectionId) && !safe.includes(sectionId)) safe.push(sectionId);
    });
  }
  defaultSectionOrder.forEach(sectionId => {
    if (!safe.includes(sectionId)) safe.push(sectionId);
  });
  return safe;
}

export function normaliseSectionOrderByDevice(value = {}, fallbackOrder = defaultSectionOrder) {
  const source = value || {};
  const fallback = normaliseSectionOrder(fallbackOrder);
  return {
    desktop: normaliseSectionOrder(source.desktop || fallback),
    tablet: normaliseSectionOrder(source.tablet || fallback),
    mobile: normaliseSectionOrder(source.mobile || fallback),
  };
}

export function normaliseSectionVisibility(value = {}) {
  const source = value || {};
  return Object.fromEntries(defaultSectionOrder.map(sectionId => [sectionId, source[sectionId] !== false]));
}

export function normaliseSectionVisibilityByDevice(value = {}) {
  const source = value || {};
  return {
    desktop: normaliseSectionVisibility(source.desktop),
    tablet: normaliseSectionVisibility(source.tablet),
    mobile: normaliseSectionVisibility(source.mobile),
  };
}

export function normaliseSectionDisplay(value = {}) {
  const source = value || {};
  return Object.fromEntries(defaultSectionOrder.map(sectionId => {
    const display = source[sectionId];
    return [sectionId, allowedSectionDisplays.includes(display) ? display : 'standard'];
  }));
}

export function normaliseSectionDisplayByDevice(value = {}) {
  const source = value || {};
  return {
    desktop: normaliseSectionDisplay(source.desktop),
    tablet: normaliseSectionDisplay(source.tablet),
    mobile: normaliseSectionDisplay(source.mobile),
  };
}

function normaliseLayoutSettings(value = {}) {
  const sectionOrder = normaliseSectionOrder(value.section_order);
  return {
    ...defaultLayoutSettings,
    ...value,
    desktop: { ...defaultLayoutSettings.desktop, ...(value.desktop || {}) },
    tablet: { ...defaultLayoutSettings.tablet, ...(value.tablet || {}) },
    mobile: { ...defaultLayoutSettings.mobile, ...(value.mobile || {}) },
    modules: { ...defaultLayoutSettings.modules, ...(value.modules || {}) },
    section_order: sectionOrder,
    section_order_by_device: normaliseSectionOrderByDevice(value.section_order_by_device, sectionOrder),
    section_visibility_by_device: normaliseSectionVisibilityByDevice(value.section_visibility_by_device),
    section_display_by_device: normaliseSectionDisplayByDevice(value.section_display_by_device),
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

  const sectionOrderByDevice = normaliseSectionOrderByDevice(settings.section_order_by_device, settings.section_order);
  const sectionVisibilityByDevice = normaliseSectionVisibilityByDevice(settings.section_visibility_by_device);
  const sectionDisplayByDevice = normaliseSectionDisplayByDevice(settings.section_display_by_device);

  return {
    settings,
    loading,
    device,
    deviceSettings,
    modules: settings.modules || defaultLayoutSettings.modules,
    sectionOrder: sectionOrderByDevice[device] || normaliseSectionOrder(settings.section_order),
    sectionOrderByDevice,
    sectionVisibility: sectionVisibilityByDevice[device] || defaultSectionVisibility,
    sectionVisibilityByDevice,
    sectionDisplay: sectionDisplayByDevice[device] || defaultSectionDisplay,
    sectionDisplayByDevice,
    layoutStyle,
    layoutClassName,
  };
}
