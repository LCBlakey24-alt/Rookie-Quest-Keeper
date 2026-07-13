import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, LayoutDashboard, Monitor, RefreshCw, RotateCcw, Save, Smartphone, Tablet, ToggleLeft, ToggleRight } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const defaultSectionOrder = ['dashboard_hero', 'status_bar', 'quick_actions', 'live_workspace', 'site_updates', 'reviews', 'admin_notice'];
const defaultSectionOrderByDevice = { desktop: defaultSectionOrder, tablet: defaultSectionOrder, mobile: defaultSectionOrder };
const defaultSectionVisibility = Object.fromEntries(defaultSectionOrder.map(sectionId => [sectionId, true]));
const defaultSectionVisibilityByDevice = { desktop: defaultSectionVisibility, tablet: defaultSectionVisibility, mobile: defaultSectionVisibility };
const defaultSectionDisplay = Object.fromEntries(defaultSectionOrder.map(sectionId => [sectionId, 'standard']));
const defaultSectionDisplayByDevice = { desktop: defaultSectionDisplay, tablet: defaultSectionDisplay, mobile: defaultSectionDisplay };
const sectionDisplayOptions = ['standard', 'compact', 'featured'];
const sectionDisplayLabels = { standard: 'Standard', compact: 'Compact', featured: 'Featured' };

const defaultSettings = {
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
  notes: '',
};

const devices = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, min: 960, max: 1920, maxColumns: 5 },
  { id: 'tablet', label: 'Tablet', icon: Tablet, min: 720, max: 1280, maxColumns: 4 },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, min: 320, max: 760, maxColumns: 2 },
];

const moduleLabels = {
  dashboard_hero: 'Dashboard hero',
  quick_actions: 'Quick actions',
  site_updates: 'Site updates',
  feedback_prompt: 'Feedback prompt',
  reviews: 'Reviews',
  admin_notice: 'Admin notices',
};

const sectionLabels = {
  dashboard_hero: 'Dashboard hero',
  status_bar: 'Status bar',
  quick_actions: 'Quick actions',
  live_workspace: 'Recent activity + readiness',
  site_updates: 'Site updates',
  reviews: 'Information cards',
  admin_notice: 'System status',
};

export default function AdminLayoutStudioTab() {
  const [settings, setSettings] = useState(defaultSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Layout audit should not block saving. */ }
  };

  const load = async ({ background = false } = {}) => {
    try {
      if (background) setRefreshing(true);
      else setLoading(true);
      const res = await apiClient.get('/admin/layout-settings');
      const nextSettings = normaliseSettings(res.data);
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load layout settings');
      setSettings(defaultSettings);
      setLastSavedSettings(defaultSettings);
    } finally {
      setLoading(false);
      if (background) setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patchRoot = (patch) => setSettings(prev => normaliseSettings({ ...prev, ...patch }));
  const patchDevice = (device, patch) => setSettings(prev => normaliseSettings({ ...prev, [device]: { ...prev[device], ...patch } }));
  const toggleModule = (key) => setSettings(prev => normaliseSettings({ ...prev, modules: { ...prev.modules, [key]: !prev.modules[key] } }));

  const patchDeviceOrder = (device, order) => setSettings(prev => normaliseSettings({
    ...prev,
    section_order_by_device: {
      ...prev.section_order_by_device,
      [device]: normaliseSectionOrder(order),
    },
  }));

  const patchDeviceVisibility = (device, visibility) => setSettings(prev => normaliseSettings({
    ...prev,
    section_visibility_by_device: {
      ...prev.section_visibility_by_device,
      [device]: normaliseSectionVisibility(visibility),
    },
  }));

  const patchDeviceDisplay = (device, display) => setSettings(prev => normaliseSettings({
    ...prev,
    section_display_by_device: {
      ...prev.section_display_by_device,
      [device]: normaliseSectionDisplay(display),
    },
  }));

  const moveSection = (sectionId, direction) => {
    setSettings(prev => {
      const ordersByDevice = normaliseSectionOrderByDevice(prev.section_order_by_device, prev.section_order);
      const order = ordersByDevice[previewDevice];
      const currentIndex = order.indexOf(sectionId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return prev;
      const next = [...order];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return normaliseSettings({ ...prev, section_order_by_device: { ...ordersByDevice, [previewDevice]: next } });
    });
  };

  const toggleDeviceSectionVisibility = (sectionId) => {
    setSettings(prev => {
      const visibilityByDevice = normaliseSectionVisibilityByDevice(prev.section_visibility_by_device);
      const currentVisibility = visibilityByDevice[previewDevice];
      return normaliseSettings({
        ...prev,
        section_visibility_by_device: {
          ...visibilityByDevice,
          [previewDevice]: { ...currentVisibility, [sectionId]: currentVisibility[sectionId] === false },
        },
      });
    });
  };

  const updateDeviceSectionDisplay = (sectionId, display) => {
    setSettings(prev => {
      const displayByDevice = normaliseSectionDisplayByDevice(prev.section_display_by_device);
      return normaliseSettings({
        ...prev,
        section_display_by_device: {
          ...displayByDevice,
          [previewDevice]: { ...displayByDevice[previewDevice], [sectionId]: display },
        },
      });
    });
  };

  const resetDeviceOrder = () => patchDeviceOrder(previewDevice, defaultSectionOrder);
  const showAllDeviceSections = () => patchDeviceVisibility(previewDevice, defaultSectionVisibility);
  const standardiseDeviceSections = () => patchDeviceDisplay(previewDevice, defaultSectionDisplay);
  const copyDesktopOrder = () => setSettings(prev => {
    const ordersByDevice = normaliseSectionOrderByDevice(prev.section_order_by_device, prev.section_order);
    const visibilityByDevice = normaliseSectionVisibilityByDevice(prev.section_visibility_by_device);
    const displayByDevice = normaliseSectionDisplayByDevice(prev.section_display_by_device);
    return normaliseSettings({
      ...prev,
      section_order_by_device: { ...ordersByDevice, [previewDevice]: ordersByDevice.desktop },
      section_visibility_by_device: { ...visibilityByDevice, [previewDevice]: visibilityByDevice.desktop },
      section_display_by_device: { ...displayByDevice, [previewDevice]: displayByDevice.desktop },
    });
  });

  const hasUnsavedChanges = useMemo(() => settingsSignature(settings) !== settingsSignature(lastSavedSettings), [settings, lastSavedSettings]);
  const disabled = saving || refreshing;

  const save = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put('/admin/layout-settings', settings);
      const savedSettings = normaliseSettings(res.data?.settings || settings);
      setSettings(savedSettings);
      setLastSavedSettings(savedSettings);
      const ordersByDevice = normaliseSectionOrderByDevice(savedSettings.section_order_by_device, savedSettings.section_order);
      const visibilityByDevice = normaliseSectionVisibilityByDevice(savedSettings.section_visibility_by_device);
      const displayByDevice = normaliseSectionDisplayByDevice(savedSettings.section_display_by_device);
      const hiddenSections = ordersByDevice[previewDevice].filter(sectionId => visibilityByDevice[previewDevice][sectionId] === false);
      const styledSections = ordersByDevice[previewDevice].filter(sectionId => displayByDevice[previewDevice][sectionId] !== 'standard');
      await logAudit({
        action: 'Layout settings changed',
        area: 'layout_studio',
        target_id: 'global',
        target_label: 'Global layout settings',
        detail: `Mode: ${savedSettings.mode} • Density: ${savedSettings.density} • Desktop ${savedSettings.desktop.columns} cols • Tablet ${savedSettings.tablet.columns} cols • Mobile ${savedSettings.mobile.columns} cols • ${previewDevice} order: ${ordersByDevice[previewDevice].map(section => sectionLabels[section] || section).join(' > ')} • Hidden: ${hiddenSections.length ? hiddenSections.map(section => sectionLabels[section] || section).join(', ') : 'none'} • Display: ${styledSections.length ? styledSections.map(section => `${sectionLabels[section] || section} ${sectionDisplayLabels[displayByDevice[previewDevice][section]]}`).join(', ') : 'standard'}`,
      });
      toast.success('Layout settings saved');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save layout settings');
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = () => {
    if (!window.confirm('Reset the draft layout controls to defaults? This will not save until you press Save.')) return;
    setSettings(defaultSettings);
  };

  const ordersByDevice = useMemo(() => normaliseSectionOrderByDevice(settings.section_order_by_device, settings.section_order), [settings.section_order, settings.section_order_by_device]);
  const visibilityByDevice = useMemo(() => normaliseSectionVisibilityByDevice(settings.section_visibility_by_device), [settings.section_visibility_by_device]);
  const displayByDevice = useMemo(() => normaliseSectionDisplayByDevice(settings.section_display_by_device), [settings.section_display_by_device]);
  const activeSectionOrder = ordersByDevice[previewDevice];
  const activeSectionVisibility = visibilityByDevice[previewDevice];
  const activeSectionDisplay = displayByDevice[previewDevice];
  const enabledModules = useMemo(() => activeSectionOrder.filter(key => isSectionVisible(key, settings.modules, activeSectionVisibility)), [activeSectionOrder, activeSectionVisibility, settings.modules]);
  const preview = settings[previewDevice] || defaultSettings[previewDevice];
  const previewDeviceLabel = devices.find(device => device.id === previewDevice)?.label || 'Desktop';

  return (
    <div style={wrapStyle} data-testid="admin-layout-studio-tab" aria-busy={(saving || refreshing) ? 'true' : 'false'}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><LayoutDashboard size={20} /> Layout Studio</h2>
          <p style={subtitleStyle}>The foundation for editing how Rookie Quest Keeper looks across desktop, tablet, and mobile from Admin.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => load({ background: true })} disabled={disabled} aria-busy={refreshing ? 'true' : 'false'} style={busyButtonStyle(refreshing)}><RefreshCw size={14} style={refreshing ? layoutSpinStyle : undefined} /> {refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" onClick={resetDraft} disabled={disabled} style={busyButtonStyle(false)}><RotateCcw size={14} /> Reset draft</button>
          <button type="button" onClick={save} disabled={disabled} aria-busy={saving ? 'true' : 'false'} style={busySaveButtonStyle(saving)}>{saving ? <RefreshCw size={14} style={layoutSpinStyle} /> : <Save size={14} />} {saving ? 'Saving layout…' : hasUnsavedChanges ? 'Save changes' : 'Save layout'}</button>
        </div>
      </div>

      {hasUnsavedChanges && !loading ? (
        <section style={unsavedStyle} aria-live="polite">
          <strong>Unsaved layout draft</strong>
          <span>Changes are only a preview until you save. Current preview: {previewDeviceLabel} • {enabledModules.length} visible section{enabledModules.length === 1 ? '' : 's'}.</span>
        </section>
      ) : null}

      {loading ? <AdminLayoutLoading /> : (
        <>
          <section style={controlGridStyle}>
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>Global behaviour</h3>
              <div style={fieldGridStyle}>
                <label style={labelStyle}>Layout mode
                  <select value={settings.mode} disabled={disabled} onChange={e => patchRoot({ mode: e.target.value })} style={inputStyle}>
                    <option value="compact">Compact</option>
                    <option value="balanced">Balanced</option>
                    <option value="showcase">Showcase</option>
                  </select>
                </label>
                <label style={labelStyle}>Content density
                  <select value={settings.density} disabled={disabled} onChange={e => patchRoot({ density: e.target.value })} style={inputStyle}>
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </label>
              </div>
              <label style={labelStyle}>Owner notes
                <textarea value={settings.notes || ''} disabled={disabled} onChange={e => patchRoot({ notes: e.target.value })} placeholder="What should this layout eventually control? Which pages should consume it next?" style={textareaStyle} />
              </label>
            </div>

            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>Global module switches</h3>
              <p style={subtitleStyle}>These are master switches. Device visibility below can hide sections per device, but it cannot override a global off switch.</p>
              <div style={moduleGridStyle}>
                {Object.entries(moduleLabels).map(([key, label]) => (
                  <button key={key} type="button" disabled={disabled} onClick={() => toggleModule(key)} style={{ ...moduleToggleStyle, borderColor: settings.modules?.[key] ? rq.accent : rq.borderDefault, background: settings.modules?.[key] ? rq.accentSoft : rq.input, opacity: disabled ? 0.72 : 1 }}>
                    {settings.modules?.[key] ? <ToggleRight size={18} color={rq.accentHover} /> : <ToggleLeft size={18} color={rq.muted} />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={previewHeaderStyle}>
              <div>
                <h3 style={panelTitleStyle}><GripVertical size={16} /> {previewDeviceLabel} section design</h3>
                <p style={subtitleStyle}>Move, hide, or resize dashboard sections for this device only. Display controls let a section become compact, standard, or featured.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {devices.map(device => <button key={device.id} type="button" disabled={disabled} onClick={() => setPreviewDevice(device.id)} style={{ ...smallButtonStyle, borderColor: previewDevice === device.id ? rq.accent : rq.borderDefault, color: previewDevice === device.id ? rq.accentHover : rq.textSecondary, opacity: disabled ? 0.72 : 1 }}>{device.label}</button>)}
                <button type="button" disabled={disabled} onClick={copyDesktopOrder} style={{ ...smallButtonStyle, opacity: disabled ? 0.72 : 1 }}><Copy size={13} /> Copy desktop</button>
                <button type="button" disabled={disabled} onClick={showAllDeviceSections} style={{ ...smallButtonStyle, opacity: disabled ? 0.72 : 1 }}><Eye size={13} /> Show all</button>
                <button type="button" disabled={disabled} onClick={standardiseDeviceSections} style={{ ...smallButtonStyle, opacity: disabled ? 0.72 : 1 }}><RotateCcw size={13} /> Standard size</button>
                <button type="button" disabled={disabled} onClick={resetDeviceOrder} style={{ ...smallButtonStyle, opacity: disabled ? 0.72 : 1 }}><RotateCcw size={13} /> Reset order</button>
              </div>
            </div>
            <div style={orderListStyle}>
              {activeSectionOrder.map((sectionId, index) => {
                const globallyEnabled = isSectionEnabled(sectionId, settings.modules);
                const deviceVisible = activeSectionVisibility[sectionId] !== false;
                const effectivelyVisible = globallyEnabled && deviceVisible;
                return (
                  <div key={sectionId} style={{ ...orderRowStyle, opacity: effectivelyVisible ? 1 : 0.68 }}>
                    <span style={orderIndexStyle}>{index + 1}</span>
                    <GripVertical size={15} color={rq.muted} />
                    <span style={{ flex: 1, minWidth: 0, color: rq.textSecondary, fontWeight: 900 }}>{sectionLabels[sectionId] || sectionId}</span>
                    <select
                      value={activeSectionDisplay[sectionId] || 'standard'}
                      disabled={disabled || !globallyEnabled}
                      onChange={e => updateDeviceSectionDisplay(sectionId, e.target.value)}
                      style={{ ...displaySelectStyle, opacity: effectivelyVisible ? 1 : 0.75 }}
                      aria-label={`${sectionLabels[sectionId] || sectionId} display mode`}
                    >
                      {sectionDisplayOptions.map(option => <option key={option} value={option}>{sectionDisplayLabels[option]}</option>)}
                    </select>
                    <button type="button" onClick={() => toggleDeviceSectionVisibility(sectionId)} disabled={disabled || !globallyEnabled} style={{ ...visibilityButtonStyle, borderColor: effectivelyVisible ? rq.accent : rq.borderDefault, color: effectivelyVisible ? rq.accentHover : rq.muted }}>
                      {deviceVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                      {globallyEnabled ? (deviceVisible ? 'Visible' : 'Hidden') : 'Global off'}
                    </button>
                    <button type="button" onClick={() => moveSection(sectionId, -1)} disabled={disabled || index === 0} style={miniButtonStyle}><ArrowUp size={13} /></button>
                    <button type="button" onClick={() => moveSection(sectionId, 1)} disabled={disabled || index === activeSectionOrder.length - 1} style={miniButtonStyle}><ArrowDown size={13} /></button>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={deviceGridStyle}>
            {devices.map(device => {
              const Icon = device.icon;
              const value = settings[device.id] || defaultSettings[device.id];
              return (
                <article key={device.id} style={{ ...panelStyle, borderColor: previewDevice === device.id ? rq.accent : rq.borderDefault }}>
                  <h3 style={panelTitleStyle}><Icon size={16} /> {device.label}</h3>
                  <div style={fieldGridStyle}>
                    <label style={labelStyle}>Max width
                      <input type="number" min={device.min} max={device.max} value={value.container_max_width} disabled={disabled} onChange={e => patchDevice(device.id, { container_max_width: Number(e.target.value) })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>Columns
                      <input type="number" min={1} max={device.maxColumns} value={value.columns} disabled={disabled} onChange={e => patchDevice(device.id, { columns: Number(e.target.value) })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>Card scale
                      <select value={value.card_scale} disabled={disabled} onChange={e => patchDevice(device.id, { card_scale: e.target.value })} style={inputStyle}>
                        <option value="compact">Compact</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                      </select>
                    </label>
                    <button type="button" disabled={disabled} onClick={() => patchDevice(device.id, { show_sidebar: !value.show_sidebar })} style={{ ...moduleToggleStyle, alignSelf: 'end', borderColor: value.show_sidebar ? rq.accent : rq.borderDefault, background: value.show_sidebar ? rq.accentSoft : rq.input, opacity: disabled ? 0.72 : 1 }}>
                      {value.show_sidebar ? <ToggleRight size={18} color={rq.accentHover} /> : <ToggleLeft size={18} color={rq.muted} />}
                      <span>Sidebar {value.show_sidebar ? 'on' : 'off'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <section style={previewWrapStyle}>
            <div style={previewHeaderStyle}>
              <div>
                <h3 style={panelTitleStyle}><Eye size={16} /> {previewDeviceLabel} preview blueprint</h3>
                <p style={subtitleStyle}>The preview uses this device's order, visibility, display strength, max width, columns, card scale, sidebar setting, and global module switches.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {devices.map(device => <button key={device.id} type="button" disabled={disabled} onClick={() => setPreviewDevice(device.id)} style={{ ...smallButtonStyle, borderColor: previewDevice === device.id ? rq.accent : rq.borderDefault, color: previewDevice === device.id ? rq.accentHover : rq.textSecondary, opacity: disabled ? 0.72 : 1 }}>{device.label}</button>)}
              </div>
            </div>
            <div style={blueprintStyle}>
              <div style={{ ...mockFrameStyle, maxWidth: Math.min(preview.container_max_width, 920) }}>
                <div style={mockTopbarStyle}>Mode: {settings.mode} • Density: {settings.density} • {previewDevice}</div>
                <div style={{ display: 'grid', gridTemplateColumns: preview.show_sidebar ? '140px 1fr' : '1fr', gap: 10 }}>
                  {preview.show_sidebar ? <div style={mockSidebarStyle}>Sidebar / filters</div> : null}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Number(preview.columns) || 1)}, minmax(0, 1fr))`, gap: settings.density === 'spacious' ? 14 : settings.density === 'compact' ? 6 : 10 }}>
                    {enabledModules.length === 0 ? <div style={mockCardStyle}>No sections visible for this device</div> : enabledModules.map(key => {
                      const display = activeSectionDisplay[key] || 'standard';
                      const displayMinHeight = display === 'featured' ? 132 : display === 'compact' ? 54 : preview.card_scale === 'large' ? 112 : preview.card_scale === 'compact' ? 64 : 86;
                      return <div key={key} style={{ ...mockCardStyle, minHeight: displayMinHeight, borderColor: display === 'featured' ? rq.accent : rq.borderDefault }}>{sectionLabels[key] || moduleLabels[key] || key}<br /><small style={{ color: rq.muted }}>{sectionDisplayLabels[display]}</small></div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      <style>{layoutStudioCss}</style>
    </div>
  );
}

function AdminLayoutLoading() {
  return (
    <div style={loadingStyle} role="status" aria-live="polite" aria-busy="true">
      <span style={loadingSpinnerStyle} aria-hidden="true" />
      <strong>Loading layout studio…</strong>
      <span style={loadingTextStyle}>Checking desktop, tablet, mobile, module visibility, and section order controls.</span>
    </div>
  );
}

function normaliseSectionOrder(order) {
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

function normaliseSectionOrderByDevice(value = {}, fallbackOrder = defaultSectionOrder) {
  const source = value || {};
  const fallback = normaliseSectionOrder(fallbackOrder);
  return {
    desktop: normaliseSectionOrder(source.desktop || fallback),
    tablet: normaliseSectionOrder(source.tablet || fallback),
    mobile: normaliseSectionOrder(source.mobile || fallback),
  };
}

function normaliseSectionVisibility(value = {}) {
  const source = value || {};
  return Object.fromEntries(defaultSectionOrder.map(sectionId => [sectionId, source[sectionId] !== false]));
}

function normaliseSectionVisibilityByDevice(value = {}) {
  const source = value || {};
  return {
    desktop: normaliseSectionVisibility(source.desktop),
    tablet: normaliseSectionVisibility(source.tablet),
    mobile: normaliseSectionVisibility(source.mobile),
  };
}

function normaliseSectionDisplay(value = {}) {
  const source = value || {};
  return Object.fromEntries(defaultSectionOrder.map(sectionId => {
    const display = source[sectionId];
    return [sectionId, sectionDisplayOptions.includes(display) ? display : 'standard'];
  }));
}

function normaliseSectionDisplayByDevice(value = {}) {
  const source = value || {};
  return {
    desktop: normaliseSectionDisplay(source.desktop),
    tablet: normaliseSectionDisplay(source.tablet),
    mobile: normaliseSectionDisplay(source.mobile),
  };
}

function isSectionEnabled(sectionId, modules = {}) {
  if (sectionId === 'status_bar' || sectionId === 'live_workspace') return true;
  return modules?.[sectionId] !== false;
}

function isSectionVisible(sectionId, modules = {}, visibility = {}) {
  return isSectionEnabled(sectionId, modules) && visibility?.[sectionId] !== false;
}

function normaliseSettings(value = {}) {
  const sectionOrder = normaliseSectionOrder(value.section_order);
  return {
    ...defaultSettings,
    ...value,
    desktop: { ...defaultSettings.desktop, ...(value.desktop || {}) },
    tablet: { ...defaultSettings.tablet, ...(value.tablet || {}) },
    mobile: { ...defaultSettings.mobile, ...(value.mobile || {}) },
    modules: { ...defaultSettings.modules, ...(value.modules || {}) },
    section_order: sectionOrder,
    section_order_by_device: normaliseSectionOrderByDevice(value.section_order_by_device, sectionOrder),
    section_visibility_by_device: normaliseSectionVisibilityByDevice(value.section_visibility_by_device),
    section_display_by_device: normaliseSectionDisplayByDevice(value.section_display_by_device),
  };
}

function settingsSignature(value) {
  return JSON.stringify(normaliseSettings(value));
}

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 'clamp(14px, 3vw, 24px)', display: 'grid', gap: 16 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const saveButtonStyle = { ...buttonStyle, background: rq.accent, color: '#FFFFFF', border: 'none' };
const controlGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 12 };
const deviceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 12 };
const panelStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 16, minWidth: 0 };
const panelTitleStyle = { color: rq.text, fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' };
const fieldGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 };
const labelStyle = { color: rq.muted, fontSize: 12, fontWeight: 900, display: 'flex', flexDirection: 'column', gap: 6 };
const inputStyle = { width: '100%', background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px', outline: 'none' };
const textareaStyle = { minHeight: 98, background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, resize: 'vertical', outline: 'none' };
const moduleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 };
const moduleToggleStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, color: rq.textSecondary, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px', fontWeight: 900, cursor: 'pointer', textAlign: 'left' };
const orderListStyle = { display: 'grid', gap: 8, marginTop: 12 };
const orderRowStyle = { display: 'flex', alignItems: 'center', gap: 8, background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '8px 10px', flexWrap: 'wrap' };
const orderIndexStyle = { width: 24, height: 24, display: 'grid', placeItems: 'center', background: rq.accentSoft, color: rq.text, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, fontSize: 11, fontWeight: 900 };
const miniButtonStyle = { width: 30, height: 30, display: 'inline-grid', placeItems: 'center', background: rq.input, border: `1px solid ${rq.borderDefault}`, color: rq.textSecondary, borderRadius: rq.radiusSm, cursor: 'pointer' };
const visibilityButtonStyle = { minHeight: 30, display: 'inline-flex', alignItems: 'center', gap: 6, background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '0 8px', fontSize: 11, fontWeight: 900, cursor: 'pointer' };
const displaySelectStyle = { minHeight: 30, background: rq.input, color: rq.textSecondary, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '0 8px', fontSize: 11, fontWeight: 900, cursor: 'pointer' };
const previewWrapStyle = { background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 16 };
const previewHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 };
const smallButtonStyle = { background: rq.panel, border: `1px solid ${rq.borderDefault}`, color: rq.textSecondary, borderRadius: rq.radiusSm, padding: '8px 10px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const blueprintStyle = { overflowX: 'auto', padding: 8, background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const mockFrameStyle = { minWidth: 280, margin: '0 auto', display: 'grid', gap: 10, transition: 'max-width 160ms ease' };
const mockTopbarStyle = { color: rq.text, background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 10, fontSize: 12, fontWeight: 900 };
const mockSidebarStyle = { color: rq.muted, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, fontSize: 12 };
const mockCardStyle = { color: rq.textSecondary, background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: 4 };
const unsavedStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, borderRadius: rq.radiusSm, padding: '10px 12px', fontSize: 12 };
const loadingStyle = { minHeight: 184, display: 'grid', placeItems: 'center', gap: 10, textAlign: 'center', color: rq.text, padding: 28, background: 'linear-gradient(145deg, rgba(33, 21, 14, 0.92), rgba(58, 38, 25, 0.84))', border: `1px solid ${rq.border}`, borderLeft: `5px solid ${rq.accent}`, borderRadius: rq.radius, boxShadow: '0 16px 44px rgba(0,0,0,0.22)' };
const loadingSpinnerStyle = { width: 42, height: 42, borderRadius: '50%', backgroundImage: 'conic-gradient(from 0deg, var(--rq-primary-hover, #e0b15c), rgba(192, 138, 61, 0.18), rgba(255, 248, 239, 0.2), var(--rq-primary-hover, #e0b15c))', WebkitMask: 'radial-gradient(circle, transparent 42%, #000 44%)', mask: 'radial-gradient(circle, transparent 42%, #000 44%)', animation: 'rqAdminLayoutSpin 0.9s linear infinite' };
const loadingTextStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 430 };
const layoutSpinStyle = { animation: 'rqAdminLayoutSpin 0.9s linear infinite' };
const layoutStudioCss = `
  @keyframes rqAdminLayoutSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="admin-layout-studio-tab"] svg,
    [data-testid="admin-layout-studio-tab"] span[aria-hidden="true"] { animation: none !important; }
  }
`;

function busyButtonStyle(isBusy) {
  return { ...buttonStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

function busySaveButtonStyle(isBusy) {
  return { ...saveButtonStyle, opacity: isBusy ? 0.82 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}
