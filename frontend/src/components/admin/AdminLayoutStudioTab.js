import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Eye, GripVertical, LayoutDashboard, Monitor, RefreshCw, RotateCcw, Save, Smartphone, Tablet, ToggleLeft, ToggleRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Layout audit should not block saving. */ }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/layout-settings');
      setSettings(normaliseSettings(res.data));
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load layout settings');
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patchRoot = (patch) => setSettings(prev => normaliseSettings({ ...prev, ...patch }));
  const patchDevice = (device, patch) => setSettings(prev => normaliseSettings({ ...prev, [device]: { ...prev[device], ...patch } }));
  const toggleModule = (key) => setSettings(prev => normaliseSettings({ ...prev, modules: { ...prev.modules, [key]: !prev.modules[key] } }));

  const moveSection = (sectionId, direction) => {
    setSettings(prev => {
      const order = normaliseSectionOrder(prev.section_order);
      const currentIndex = order.indexOf(sectionId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return prev;
      const next = [...order];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return normaliseSettings({ ...prev, section_order: next });
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put('/admin/layout-settings', settings);
      setSettings(normaliseSettings(res.data?.settings || settings));
      await logAudit({
        action: 'Layout settings changed',
        area: 'layout_studio',
        target_id: 'global',
        target_label: 'Global layout settings',
        detail: `Mode: ${settings.mode} • Density: ${settings.density} • Desktop ${settings.desktop.columns} cols • Tablet ${settings.tablet.columns} cols • Mobile ${settings.mobile.columns} cols • Order: ${normaliseSectionOrder(settings.section_order).map(section => sectionLabels[section] || section).join(' > ')}`,
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

  const activeSectionOrder = useMemo(() => normaliseSectionOrder(settings.section_order), [settings.section_order]);
  const enabledModules = useMemo(() => activeSectionOrder.filter(key => isSectionEnabled(key, settings.modules)), [activeSectionOrder, settings.modules]);
  const preview = settings[previewDevice] || defaultSettings[previewDevice];

  return (
    <div style={wrapStyle} data-testid="admin-layout-studio-tab">
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><LayoutDashboard size={20} /> Layout Studio</h2>
          <p style={subtitleStyle}>The foundation for editing how Rookie Quest Keeper looks across desktop, tablet, and mobile from Admin.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={load} style={buttonStyle}><RefreshCw size={14} /> Refresh</button>
          <button type="button" onClick={resetDraft} style={buttonStyle}><RotateCcw size={14} /> Reset draft</button>
          <button type="button" onClick={save} disabled={saving} style={saveButtonStyle}><Save size={14} /> {saving ? 'Saving...' : 'Save layout'}</button>
        </div>
      </div>

      {loading ? <div style={emptyStyle}>Loading layout controls...</div> : (
        <>
          <section style={controlGridStyle}>
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>Global behaviour</h3>
              <div style={fieldGridStyle}>
                <label style={labelStyle}>Layout mode
                  <select value={settings.mode} onChange={e => patchRoot({ mode: e.target.value })} style={inputStyle}>
                    <option value="compact">Compact</option>
                    <option value="balanced">Balanced</option>
                    <option value="showcase">Showcase</option>
                  </select>
                </label>
                <label style={labelStyle}>Content density
                  <select value={settings.density} onChange={e => patchRoot({ density: e.target.value })} style={inputStyle}>
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </label>
              </div>
              <label style={labelStyle}>Owner notes
                <textarea value={settings.notes || ''} onChange={e => patchRoot({ notes: e.target.value })} placeholder="What should this layout eventually control? Which pages should consume it next?" style={textareaStyle} />
              </label>
            </div>

            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>Visible modules</h3>
              <div style={moduleGridStyle}>
                {Object.entries(moduleLabels).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleModule(key)} style={{ ...moduleToggleStyle, borderColor: settings.modules?.[key] ? rq.accent : rq.borderDefault, background: settings.modules?.[key] ? rq.accentSoft : rq.input }}>
                    {settings.modules?.[key] ? <ToggleRight size={18} color={rq.accentHover} /> : <ToggleLeft size={18} color={rq.muted} />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={panelTitleStyle}><GripVertical size={16} /> Dashboard section order</h3>
            <p style={subtitleStyle}>Move dashboard sections up or down. This is the safe stepping stone before true drag-and-drop editing.</p>
            <div style={orderListStyle}>
              {activeSectionOrder.map((sectionId, index) => (
                <div key={sectionId} style={orderRowStyle}>
                  <span style={orderIndexStyle}>{index + 1}</span>
                  <GripVertical size={15} color={rq.muted} />
                  <span style={{ flex: 1, minWidth: 0, color: rq.textSecondary, fontWeight: 900 }}>{sectionLabels[sectionId] || sectionId}</span>
                  <span style={{ color: isSectionEnabled(sectionId, settings.modules) ? rq.accentHover : rq.muted, fontSize: 11, fontWeight: 900 }}>{isSectionEnabled(sectionId, settings.modules) ? 'Visible' : 'Hidden'}</span>
                  <button type="button" onClick={() => moveSection(sectionId, -1)} disabled={index === 0} style={miniButtonStyle}><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => moveSection(sectionId, 1)} disabled={index === activeSectionOrder.length - 1} style={miniButtonStyle}><ArrowDown size={13} /></button>
                </div>
              ))}
            </div>
          </section>

          <section style={deviceGridStyle}>
            {devices.map(device => {
              const Icon = device.icon;
              const value = settings[device.id] || defaultSettings[device.id];
              return (
                <article key={device.id} style={panelStyle}>
                  <h3 style={panelTitleStyle}><Icon size={16} /> {device.label}</h3>
                  <div style={fieldGridStyle}>
                    <label style={labelStyle}>Max width
                      <input type="number" min={device.min} max={device.max} value={value.container_max_width} onChange={e => patchDevice(device.id, { container_max_width: Number(e.target.value) })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>Columns
                      <input type="number" min={1} max={device.maxColumns} value={value.columns} onChange={e => patchDevice(device.id, { columns: Number(e.target.value) })} style={inputStyle} />
                    </label>
                    <label style={labelStyle}>Card scale
                      <select value={value.card_scale} onChange={e => patchDevice(device.id, { card_scale: e.target.value })} style={inputStyle}>
                        <option value="compact">Compact</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => patchDevice(device.id, { show_sidebar: !value.show_sidebar })} style={{ ...moduleToggleStyle, alignSelf: 'end', borderColor: value.show_sidebar ? rq.accent : rq.borderDefault, background: value.show_sidebar ? rq.accentSoft : rq.input }}>
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
                <h3 style={panelTitleStyle}><Eye size={16} /> Preview blueprint</h3>
                <p style={subtitleStyle}>This is not full drag-and-drop yet. It shows the settings we can now store and apply page-by-page.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {devices.map(device => <button key={device.id} type="button" onClick={() => setPreviewDevice(device.id)} style={{ ...smallButtonStyle, borderColor: previewDevice === device.id ? rq.accent : rq.borderDefault, color: previewDevice === device.id ? rq.accentHover : rq.textSecondary }}>{device.label}</button>)}
              </div>
            </div>
            <div style={blueprintStyle}>
              <div style={{ ...mockFrameStyle, maxWidth: Math.min(preview.container_max_width, 920) }}>
                <div style={mockTopbarStyle}>Mode: {settings.mode} • Density: {settings.density} • {previewDevice}</div>
                <div style={{ display: 'grid', gridTemplateColumns: preview.show_sidebar ? '140px 1fr' : '1fr', gap: 10 }}>
                  {preview.show_sidebar ? <div style={mockSidebarStyle}>Sidebar / filters</div> : null}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Number(preview.columns) || 1)}, minmax(0, 1fr))`, gap: settings.density === 'spacious' ? 14 : settings.density === 'compact' ? 6 : 10 }}>
                    {enabledModules.length === 0 ? <div style={mockCardStyle}>No modules enabled</div> : enabledModules.map(key => <div key={key} style={{ ...mockCardStyle, minHeight: preview.card_scale === 'large' ? 112 : preview.card_scale === 'compact' ? 64 : 86 }}>{sectionLabels[key] || moduleLabels[key] || key}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
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

function isSectionEnabled(sectionId, modules = {}) {
  if (sectionId === 'status_bar' || sectionId === 'live_workspace') return true;
  return modules?.[sectionId] !== false;
}

function normaliseSettings(value = {}) {
  return {
    ...defaultSettings,
    ...value,
    desktop: { ...defaultSettings.desktop, ...(value.desktop || {}) },
    tablet: { ...defaultSettings.tablet, ...(value.tablet || {}) },
    mobile: { ...defaultSettings.mobile, ...(value.mobile || {}) },
    modules: { ...defaultSettings.modules, ...(value.modules || {}) },
    section_order: normaliseSectionOrder(value.section_order),
  };
}

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 'clamp(14px, 3vw, 24px)', display: 'grid', gap: 16 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const saveButtonStyle = { ...buttonStyle, background: rq.accent, color: '#FFFFFF', border: 'none' };
const emptyStyle = { color: rq.muted, textAlign: 'center', padding: 36, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm };
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
const orderRowStyle = { display: 'flex', alignItems: 'center', gap: 8, background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '8px 10px' };
const orderIndexStyle = { width: 24, height: 24, display: 'grid', placeItems: 'center', background: rq.accentSoft, color: rq.text, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, fontSize: 11, fontWeight: 900 };
const miniButtonStyle = { width: 30, height: 30, display: 'inline-grid', placeItems: 'center', background: rq.input, border: `1px solid ${rq.borderDefault}`, color: rq.textSecondary, borderRadius: rq.radiusSm, cursor: 'pointer' };
const previewWrapStyle = { background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 16 };
const previewHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 };
const smallButtonStyle = { background: rq.panel, border: `1px solid ${rq.borderDefault}`, color: rq.textSecondary, borderRadius: rq.radiusSm, padding: '8px 10px', fontWeight: 900, cursor: 'pointer' };
const blueprintStyle = { overflowX: 'auto', padding: 8, background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const mockFrameStyle = { minWidth: 280, margin: '0 auto', display: 'grid', gap: 10, transition: 'max-width 160ms ease' };
const mockTopbarStyle = { color: rq.text, background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 10, fontSize: 12, fontWeight: 900 };
const mockSidebarStyle = { color: rq.muted, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, fontSize: 12 };
const mockCardStyle = { color: rq.textSecondary, background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
