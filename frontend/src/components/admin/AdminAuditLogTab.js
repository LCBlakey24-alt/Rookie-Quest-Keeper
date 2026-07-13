import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Filter, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const areas = ['all', 'testing_notes', 'feedback', 'site_updates', 'reviews', 'site_control', 'admin'];

export default function AdminAuditLogTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/audit-log', { params: { limit: 150, area } });
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [area]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(entry => [
      entry.action,
      entry.area,
      entry.target_label,
      entry.target_id,
      entry.detail,
      entry.admin_username,
    ].some(value => String(value || '').toLowerCase().includes(q)));
  }, [entries, query]);

  const counts = useMemo(() => ({
    showing: filtered.length,
    total: entries.length,
    testing: entries.filter(entry => entry.area === 'testing_notes').length,
    feedback: entries.filter(entry => entry.area === 'feedback').length,
    updates: entries.filter(entry => entry.area === 'site_updates').length,
  }), [entries, filtered]);

  return (
    <div data-testid="admin-audit-log-tab" style={wrapStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><ShieldCheck size={20} /> Admin Audit Log</h2>
          <p style={subtitleStyle}>A running receipt book for important admin actions. Future you deserves fewer “what did I press?” moments.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} style={busyButtonStyle(loading)} aria-busy={loading ? 'true' : 'false'}><RefreshCw size={14} style={loading ? auditSpinStyle : undefined} /> {loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <div style={metricsStyle}>
        <Metric label="Showing" value={counts.showing} />
        <Metric label="Loaded" value={counts.total} />
        <Metric label="Testing" value={counts.testing} />
        <Metric label="Feedback" value={counts.feedback} />
        <Metric label="Updates" value={counts.updates} />
      </div>

      <div style={toolbarStyle}>
        <div style={searchWrapStyle}>
          <Search size={14} style={searchIconStyle} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search action, target, detail, admin..." style={inputStyle} />
        </div>
        <div style={filterWrapStyle}>
          <Filter size={14} color={rq.muted} />
          <select value={area} onChange={e => setArea(e.target.value)} style={selectStyle}>
            {areas.map(option => <option key={option} value={option}>{option === 'all' ? 'All areas' : option.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <AdminAuditLoading />
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>No audit entries found yet.</div>
      ) : (
        <div style={listStyle}>
          {filtered.map(entry => (
            <article key={entry.id} style={entryStyle}>
              <div style={entryIconStyle}><Activity size={15} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={entryTopStyle}>
                  <strong style={entryActionStyle}>{entry.action}</strong>
                  <span style={dateStyle}>{formatDate(entry.created_at)}</span>
                </div>
                <div style={badgeRowStyle}>
                  <Badge>{entry.area || 'admin'}</Badge>
                  {entry.admin_username && <Badge>{entry.admin_username}</Badge>}
                  {entry.target_label && <Badge>{entry.target_label}</Badge>}
                </div>
                {entry.detail && <p style={detailStyle}>{entry.detail}</p>}
                {entry.target_id && <p style={idStyle}>Target: {entry.target_id}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
      <style>{auditLogCss}</style>
    </div>
  );
}

function AdminAuditLoading() {
  return (
    <div style={auditLoadingStyle} role="status" aria-live="polite" aria-busy="true">
      <span style={auditLoadingSpinnerStyle} aria-hidden="true" />
      <strong>Loading admin audit log…</strong>
      <span style={auditLoadingTextStyle}>Checking recent feedback moves, testing notes, site updates, reviews, and owner actions.</span>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={metricStyle}><div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div><div style={{ fontSize: 11, color: rq.muted, textTransform: 'uppercase' }}>{label}</div></div>;
}

function Badge({ children }) {
  return <span style={badgeStyle}>{children}</span>;
}

function formatDate(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 'clamp(14px, 3vw, 24px)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 13, margin: '6px 0 0' };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const metricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 16 };
const metricStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, color: rq.text, textAlign: 'center', padding: 12, borderRadius: rq.radiusSm };
const toolbarStyle = { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 };
const searchWrapStyle = { position: 'relative', flex: '1 1 260px' };
const searchIconStyle = { position: 'absolute', left: 12, top: 12, color: rq.muted };
const inputStyle = { width: '100%', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px 10px 34px', outline: 'none' };
const filterWrapStyle = { display: 'flex', alignItems: 'center', gap: 8 };
const selectStyle = { width: '100%', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '9px 10px', outline: 'none', textTransform: 'capitalize' };
const emptyStyle = { color: rq.muted, textAlign: 'center', padding: 36, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const entryStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 14 };
const entryIconStyle = { color: rq.accent, background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 8, flex: '0 0 auto' };
const entryTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 };
const entryActionStyle = { color: rq.text, fontSize: 14 };
const dateStyle = { color: rq.muted, fontSize: 11 };
const badgeRowStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const badgeStyle = { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '2px 7px', background: rq.panel, color: rq.textSecondary };
const detailStyle = { color: rq.textSecondary, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '10px 0 0' };
const idStyle = { color: rq.muted, fontSize: 11, margin: '8px 0 0', wordBreak: 'break-all' };
const auditSpinStyle = { animation: 'rqAdminAuditSpin 0.9s linear infinite' };
const auditLoadingStyle = { minHeight: 184, display: 'grid', placeItems: 'center', gap: 10, textAlign: 'center', color: rq.text, padding: 28, background: 'linear-gradient(145deg, rgba(33, 21, 14, 0.92), rgba(58, 38, 25, 0.84))', border: `1px solid ${rq.border}`, borderLeft: `5px solid ${rq.accent}`, borderRadius: rq.radius, boxShadow: '0 16px 44px rgba(0,0,0,0.22)' };
const auditLoadingSpinnerStyle = { width: 42, height: 42, borderRadius: '50%', backgroundImage: 'conic-gradient(from 0deg, var(--rq-primary-hover, #e0b15c), rgba(192, 138, 61, 0.18), rgba(255, 248, 239, 0.2), var(--rq-primary-hover, #e0b15c))', WebkitMask: 'radial-gradient(circle, transparent 42%, #000 44%)', mask: 'radial-gradient(circle, transparent 42%, #000 44%)', animation: 'rqAdminAuditSpin 0.9s linear infinite' };
const auditLoadingTextStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 420 };
const auditLogCss = `
  @keyframes rqAdminAuditSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="admin-audit-log-tab"] svg,
    [data-testid="admin-audit-log-tab"] span[aria-hidden="true"] { animation: none !important; }
  }
`;

function busyButtonStyle(isBusy) {
  return { ...buttonStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}
