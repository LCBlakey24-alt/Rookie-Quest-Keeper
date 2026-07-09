import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Megaphone, RefreshCw, Save, ShieldAlert, ToggleLeft } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const defaultSettings = {
  announcement_enabled: false,
  announcement_text: '',
  maintenance_mode: false,
  signup_enabled: true,
  rook_text_enabled: true,
  feedback_enabled: true,
  reviews_enabled: true,
  uploads_enabled: true,
  campaign_creation_enabled: true,
  character_creation_enabled: true,
  beta_tools_enabled: true,
};

const controls = [
  ['signup_enabled', 'New signups', 'Allow new users to create accounts.'],
  ['rook_text_enabled', 'Rook text helper', 'Keep the helper text visible across the app.'],
  ['feedback_enabled', 'Feedback submissions', 'Let users send feedback from the app.'],
  ['reviews_enabled', 'Reviews', 'Allow review capture and public review controls.'],
  ['uploads_enabled', 'Uploads', 'Allow campaign and account file uploads.'],
  ['campaign_creation_enabled', 'Campaign creation', 'Allow users to create new campaigns.'],
  ['character_creation_enabled', 'Character creation', 'Allow users to build new characters.'],
  ['beta_tools_enabled', 'Beta tools', 'Show beta and playtest tools where connected.'],
];

const auditLabels = {
  announcement_enabled: 'Announcement banner',
  announcement_text: 'Announcement text',
  maintenance_mode: 'Maintenance mode',
  signup_enabled: 'New signups',
  rook_text_enabled: 'Rook text helper',
  feedback_enabled: 'Feedback submissions',
  reviews_enabled: 'Reviews',
  uploads_enabled: 'Uploads',
  campaign_creation_enabled: 'Campaign creation',
  character_creation_enabled: 'Character creation',
  beta_tools_enabled: 'Beta tools',
};

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  card: 'var(--rq-bg-panel-alt, #1F1F1F)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  inverse: 'var(--rq-text-inverse, #120912)',
  warning: '#F59E0B',
  radius: 'var(--rq-radius-md, 10px)',
  radiusSm: 'var(--rq-radius-sm, 8px)',
};

export default function AdminSiteControlTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(defaultSettings);
  const [overview, setOverview] = useState({
    users_count: 0,
    campaigns_count: 0,
    characters_count: 0,
    reviews_count: 0,
    approved_reviews_count: 0,
    feedback_count: 0,
    new_feedback_count: 0,
  });

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Audit logging should never block site control saves. */ }
  };

  const load = async ({ background = false } = {}) => {
    try {
      if (background) setRefreshing(true);
      else setLoading(true);
      const [settingsRes, overviewRes] = await Promise.all([
        apiClient.get('/admin/site-settings'),
        apiClient.get('/admin/overview'),
      ]);
      const nextSettings = { ...defaultSettings, ...(settingsRes.data || {}) };
      setSettings(nextSettings);
      setLastSavedSettings(nextSettings);
      setOverview(prev => ({ ...prev, ...(overviewRes.data || {}) }));
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load site controls');
    } finally {
      setLoading(false);
      if (background) setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const changes = useMemo(() => describeChanges(lastSavedSettings, settings), [lastSavedSettings, settings]);
  const hasChanges = changes.length > 0;
  const controlsDisabled = saving || refreshing;

  const save = async () => {
    try {
      setSaving(true);
      await apiClient.put('/admin/site-settings', settings);
      if (changes.length > 0) {
        await logAudit({
          action: 'Site settings changed',
          area: 'site_control',
          target_id: 'global',
          target_label: 'Site Control',
          detail: changes.join('\n'),
        });
      }
      toast.success(changes.length > 0 ? 'Site settings updated' : 'Site settings saved');
      await load({ background: true });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = useMemo(() => controls.filter(([key]) => settings[key] !== false).length, [settings]);

  if (loading) return <AdminSiteControlLoading />;

  return (
    <div style={wrapStyle} data-testid="admin-site-control-tab" aria-busy={(saving || refreshing) ? 'true' : 'false'}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Owner controls</p>
          <h2 style={titleStyle}><ShieldAlert size={22} /> Site Control</h2>
          <p style={subtitleStyle}>Control announcements, maintenance mode, beta switches, and the public-facing behaviour of Rookie Quest Keeper.</p>
        </div>
        <div style={headerActionsStyle}>
          <button type="button" onClick={() => load({ background: true })} disabled={refreshing || saving} aria-busy={refreshing ? 'true' : 'false'} style={busySecondaryButtonStyle(refreshing)}><RefreshCw size={15} style={refreshing ? siteControlSpinStyle : undefined} /> {refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" onClick={save} disabled={saving || refreshing} aria-busy={saving ? 'true' : 'false'} style={busySaveButtonStyle(saving)}>{saving ? <RefreshCw size={15} style={siteControlSpinStyle} /> : <Save size={15} />} {saving ? 'Saving settings…' : hasChanges ? `Save ${changes.length} change${changes.length === 1 ? '' : 's'}` : 'Save settings'}</button>
        </div>
      </header>

      {hasChanges ? (
        <section style={changesStyle} aria-live="polite">
          <strong>Unsaved changes</strong>
          <span>{changes.slice(0, 2).join(' • ')}{changes.length > 2 ? ` • +${changes.length - 2} more` : ''}</span>
        </section>
      ) : null}

      <section style={metricGridStyle} aria-label="Site overview">
        <Metric label="Users" value={overview.users_count || 0} />
        <Metric label="Campaigns" value={overview.campaigns_count || 0} />
        <Metric label="Characters" value={overview.characters_count || 0} />
        <Metric label="Reviews" value={overview.reviews_count || 0} />
        <Metric label="Feedback" value={overview.feedback_count || 0} />
        <Metric label="New Feedback" value={overview.new_feedback_count || 0} tone={(overview.new_feedback_count || 0) > 0 ? 'hot' : 'normal'} />
      </section>

      <section style={statusStripStyle}>
        <StatusTile icon={Activity} label="Site mode" value={settings.maintenance_mode ? 'Maintenance' : 'Open'} tone={settings.maintenance_mode ? 'warning' : 'normal'} />
        <StatusTile icon={Megaphone} label="Announcement" value={settings.announcement_enabled ? 'Visible' : 'Hidden'} tone={settings.announcement_enabled ? 'hot' : 'normal'} />
        <StatusTile icon={ToggleLeft} label="Feature switches" value={`${enabledCount}/${controls.length} on`} />
      </section>

      <Section title="Announcement" icon={Megaphone}>
        <ControlRow
          label="Enable announcement banner"
          description="Shows a short banner message to users. Keep it practical: outages, new beta tools, or important testing notes."
          checked={!!settings.announcement_enabled}
          disabled={controlsDisabled}
          onChange={value => setField('announcement_enabled', value)}
        />
        <textarea
          value={settings.announcement_text || ''}
          onChange={e => setField('announcement_text', e.target.value)}
          disabled={controlsDisabled}
          maxLength={240}
          placeholder="Announcement text (max 240 characters)"
          style={textareaStyle}
        />
        <p style={helperStyle}>{(settings.announcement_text || '').length}/240 characters</p>
        {settings.announcement_enabled && settings.announcement_text ? (
          <div style={bannerPreview}>{settings.announcement_text}</div>
        ) : null}
      </Section>

      <Section title="Maintenance" icon={ShieldAlert}>
        <ControlRow
          label="Maintenance mode"
          description="Blocks non-admin users while you patch or test the site. Leave off unless something is genuinely broken."
          checked={!!settings.maintenance_mode}
          disabled={controlsDisabled}
          onChange={value => setField('maintenance_mode', value)}
        />
        {settings.maintenance_mode ? <p style={warningStyle}>Maintenance mode is on. Non-admin users are blocked from the app.</p> : null}
      </Section>

      <Section title="Feature switches" icon={ToggleLeft}>
        <p style={subtitleStyle}>Feedback and reviews are already enforced. The other switches are stored and ready to wire into their matching features as those screens mature.</p>
        <div style={controlGridStyle}>
          {controls.map(([key, label, description]) => (
            <ControlRow key={key} label={label} description={description} checked={settings[key] !== false} disabled={controlsDisabled} onChange={value => setField(key, value)} compact />
          ))}
        </div>
      </Section>
      <style>{siteControlCss}</style>
    </div>
  );
}

function AdminSiteControlLoading() {
  return (
    <div style={loadingStyle} role="status" aria-live="polite" aria-busy="true">
      <span style={loadingSpinnerStyle} aria-hidden="true" />
      <strong>Loading site controls…</strong>
      <span style={loadingTextStyle}>Checking announcements, maintenance mode, feature switches, and live site totals.</span>
    </div>
  );
}

function describeChanges(before, after) {
  return Object.keys(auditLabels).reduce((changes, key) => {
    const oldValue = before?.[key];
    const newValue = after?.[key];
    if (String(oldValue ?? '') === String(newValue ?? '')) return changes;
    const label = auditLabels[key] || key;
    if (typeof newValue === 'boolean' || typeof oldValue === 'boolean') {
      changes.push(`${label}: ${oldValue ? 'on' : 'off'} → ${newValue ? 'on' : 'off'}`);
    } else {
      const oldText = String(oldValue || '').slice(0, 80) || 'empty';
      const newText = String(newValue || '').slice(0, 80) || 'empty';
      changes.push(`${label}: "${oldText}" → "${newText}"`);
    }
    return changes;
  }, []);
}

function Section({ title, icon: Icon, children }) {
  return <section style={sectionStyle}><h3 style={sectionTitleStyle}><Icon size={17} />{title}</h3>{children}</section>;
}

function ControlRow({ label, description, checked, onChange, compact = false, disabled = false }) {
  return (
    <label style={{ ...controlRowStyle, minHeight: compact ? 92 : 78, opacity: disabled ? 0.72 : 1 }}>
      <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
        <span style={{ color: rq.text, fontWeight: 900 }}>{label}</span>
        <span style={{ color: rq.muted, fontSize: 12, lineHeight: 1.45 }}>{description}</span>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} style={checkboxStyle} />
    </label>
  );
}

function Metric({ label, value, tone = 'normal' }) {
  return <div style={{ ...metricStyle, borderColor: tone === 'hot' ? rq.accent : rq.borderDefault, background: tone === 'hot' ? rq.accentSoft : rq.card }}><div style={{ fontSize: 24, fontWeight: 900 }}>{value}</div><div style={{ fontSize: 11, color: rq.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 900 }}>{label}</div></div>;
}

function StatusTile({ icon: Icon, label, value, tone = 'normal' }) {
  return (
    <div style={{ ...statusTileStyle, borderColor: tone === 'warning' ? rq.warning : tone === 'hot' ? rq.accent : rq.borderDefault }}>
      <Icon size={17} color={tone === 'warning' ? rq.warning : rq.accent} />
      <span style={{ color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 900 }}>{label}</span>
      <strong style={{ color: rq.text, fontSize: 15 }}>{value}</strong>
    </div>
  );
}

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, padding: 'clamp(14px, 3.5vw, 24px)', borderRadius: rq.radius, display: 'grid', gap: 16 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' };
const headerActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const eyebrowStyle = { color: rq.accentHover, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' };
const titleStyle = { color: rq.text, margin: 0, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 950, display: 'flex', alignItems: 'center', gap: 10 };
const subtitleStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' };
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))', gap: 8 };
const metricStyle = { border: `1px solid ${rq.borderDefault}`, padding: 12, textAlign: 'center', color: rq.text, borderRadius: rq.radiusSm, minWidth: 0 };
const statusStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 8 };
const statusTileStyle = { display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: '4px 9px', background: rq.card, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 12 };
const sectionStyle = { background: rq.card, border: `1px solid ${rq.border}`, padding: 'clamp(12px, 3vw, 16px)', borderRadius: rq.radiusSm, display: 'grid', gap: 12 };
const sectionTitleStyle = { color: rq.accentHover, margin: 0, fontSize: 16, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8 };
const controlGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 8 };
const controlRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: rq.panel, border: `1px solid ${rq.borderDefault}`, padding: 12, borderRadius: rq.radiusSm };
const checkboxStyle = { width: 22, height: 22, accentColor: rq.accent, flex: '0 0 auto' };
const textareaStyle = { width: '100%', minHeight: 96, background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, padding: 12, borderRadius: rq.radiusSm, resize: 'vertical', outline: 'none' };
const helperStyle = { color: rq.muted, fontSize: 11, textAlign: 'right', margin: '-6px 0 0' };
const bannerPreview = { background: rq.accent, color: '#FFFFFF', padding: 10, textAlign: 'center', fontWeight: 900, borderRadius: rq.radiusSm };
const warningStyle = { color: rq.warning, fontWeight: 900, margin: 0, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: 10, borderRadius: rq.radiusSm };
const saveButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: rq.accent, color: rq.inverse, border: 'none', fontWeight: 950, borderRadius: rq.radiusSm, cursor: 'pointer' };
const secondaryButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: rq.card, color: rq.text, border: `1px solid ${rq.borderDefault}`, fontWeight: 900, borderRadius: rq.radiusSm, cursor: 'pointer' };
const changesStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '10px 12px', borderRadius: rq.radiusSm, fontSize: 12 };
const loadingStyle = { minHeight: 184, display: 'grid', placeItems: 'center', gap: 10, textAlign: 'center', color: rq.text, padding: 28, background: 'linear-gradient(145deg, rgba(33, 21, 14, 0.92), rgba(58, 38, 25, 0.84))', border: `1px solid ${rq.border}`, borderLeft: `5px solid ${rq.accent}`, borderRadius: rq.radius, boxShadow: '0 16px 44px rgba(0,0,0,0.22)' };
const loadingSpinnerStyle = { width: 42, height: 42, borderRadius: '50%', backgroundImage: 'conic-gradient(from 0deg, var(--rq-primary-hover, #e0b15c), rgba(192, 138, 61, 0.18), rgba(255, 248, 239, 0.2), var(--rq-primary-hover, #e0b15c))', WebkitMask: 'radial-gradient(circle, transparent 42%, #000 44%)', mask: 'radial-gradient(circle, transparent 42%, #000 44%)', animation: 'rqAdminSiteControlSpin 0.9s linear infinite' };
const loadingTextStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 430 };
const siteControlSpinStyle = { animation: 'rqAdminSiteControlSpin 0.9s linear infinite' };
const siteControlCss = `
  @keyframes rqAdminSiteControlSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="admin-site-control-tab"] svg,
    [data-testid="admin-site-control-tab"] span[aria-hidden="true"] { animation: none !important; }
  }
`;

function busySaveButtonStyle(isBusy) {
  return { ...saveButtonStyle, opacity: isBusy ? 0.82 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

function busySecondaryButtonStyle(isBusy) {
  return { ...secondaryButtonStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}
