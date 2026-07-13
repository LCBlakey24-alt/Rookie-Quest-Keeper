import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Eye, EyeOff, Megaphone, Pencil, RefreshCw, RotateCcw, Save, Star, Trash2, X } from 'lucide-react';
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
  success: 'var(--rq-success, #2E8B57)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const emptyForm = {
  id: '',
  label: 'Update',
  title: '',
  text: '',
  is_published: true,
  is_pinned: false,
  is_archived: false,
};

export default function AdminSiteUpdatesTab() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busyAction, setBusyAction] = useState('');

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Audit logging should never block the editor. */ }
  };

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/site-updates', { params: { include_archived: showArchived } });
      setUpdates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load site updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUpdates(); }, [showArchived]);

  const counts = useMemo(() => ({
    total: updates.length,
    live: updates.filter(update => !update.is_archived).length,
    published: updates.filter(update => update.is_published && !update.is_archived).length,
    drafts: updates.filter(update => !update.is_published && !update.is_archived).length,
    pinned: updates.filter(update => update.is_pinned && !update.is_archived).length,
    archived: updates.filter(update => update.is_archived).length,
  }), [updates]);

  const updateForm = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const resetForm = () => setForm(emptyForm);

  const editUpdate = (update) => {
    setForm({
      id: update.id || '',
      label: update.label || 'Update',
      title: update.title || '',
      text: update.text || '',
      is_published: Boolean(update.is_published),
      is_pinned: Boolean(update.is_pinned),
      is_archived: Boolean(update.is_archived),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveUpdate = async (event) => {
    event.preventDefault();
    const payload = {
      label: form.label.trim() || 'Update',
      title: form.title.trim(),
      text: form.text.trim(),
      is_published: Boolean(form.is_published) && !form.is_archived,
      is_pinned: Boolean(form.is_pinned) && !form.is_archived,
      is_archived: Boolean(form.is_archived),
    };

    if (!payload.title || !payload.text) {
      toast.error('Add a title and update text first');
      return;
    }

    try {
      setSaving(true);
      const res = form.id
        ? await apiClient.put(`/admin/site-updates/${form.id}`, payload)
        : await apiClient.post('/admin/site-updates', payload);

      setUpdates(prev => {
        const next = prev.filter(update => update.id !== res.data.id);
        return [res.data, ...next].sort(sortUpdates);
      });
      await logAudit({
        action: form.id ? 'Site update edited' : 'Site update created',
        area: 'site_updates',
        target_id: res.data.id || form.id,
        target_label: res.data.title || payload.title,
        detail: statusSummary(payload),
      });
      toast.success(form.id ? 'Site update saved' : 'Site update created');
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save site update');
    } finally {
      setSaving(false);
    }
  };

  const quickPatch = async (update, patch) => {
    const actionKey = actionKeyFor(update.id, patch);
    try {
      setBusyAction(actionKey);
      const payload = {
        label: update.label || 'Update',
        title: update.title || '',
        text: update.text || '',
        is_published: Boolean(update.is_published),
        is_pinned: Boolean(update.is_pinned),
        is_archived: Boolean(update.is_archived),
        ...patch,
      };
      if (payload.is_archived) {
        payload.is_published = false;
        payload.is_pinned = false;
      }
      const res = await apiClient.put(`/admin/site-updates/${update.id}`, payload);
      setUpdates(prev => {
        const next = prev.map(item => item.id === update.id ? res.data : item);
        return showArchived ? next.sort(sortUpdates) : next.filter(item => !item.is_archived).sort(sortUpdates);
      });
      const action = patch.is_archived !== undefined
        ? (patch.is_archived ? 'Site update archived' : 'Site update restored')
        : patch.is_published !== undefined
          ? (patch.is_published ? 'Site update published' : 'Site update moved to draft')
          : patch.is_pinned !== undefined
            ? (patch.is_pinned ? 'Site update pinned' : 'Site update unpinned')
            : 'Site update changed';
      await logAudit({
        action,
        area: 'site_updates',
        target_id: update.id,
        target_label: update.title || payload.title,
        detail: statusSummary(payload),
      });
      toast.success(action);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update site update');
    } finally {
      setBusyAction('');
    }
  };

  const deleteUpdate = async (update) => {
    if (!window.confirm(`Permanently delete "${update.title}"? This cannot be undone.`)) return;
    try {
      setBusyAction(`delete-${update.id}`);
      await apiClient.delete(`/admin/site-updates/${update.id}`);
      setUpdates(prev => prev.filter(item => item.id !== update.id));
      await logAudit({
        action: 'Site update deleted',
        area: 'site_updates',
        target_id: update.id,
        target_label: update.title || 'Site update',
        detail: update.text ? update.text.slice(0, 300) : '',
      });
      toast.success('Site update deleted');
      if (form.id === update.id) resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete site update');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div data-testid="admin-site-updates-tab" style={wrapStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><Megaphone size={20} /> Site Updates Manager</h2>
          <p style={subtitleStyle}>Write updates here and publish them straight onto the main dashboard. Archive old updates instead of deleting unless you are sure.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowArchived(prev => !prev)} style={buttonStyle}>
            {showArchived ? <EyeOff size={14} /> : <Archive size={14} />}
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          <button type="button" onClick={loadUpdates} disabled={loading} style={busyButtonStyle(loading)} aria-busy={loading ? 'true' : 'false'}><RefreshCw size={14} style={loading ? siteSpinStyle : undefined} /> {loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      <div style={metricsStyle}>
        <Metric label="Visible" value={counts.live} />
        <Metric label="Published" value={counts.published} />
        <Metric label="Drafts" value={counts.drafts} />
        <Metric label="Pinned" value={counts.pinned} />
        <Metric label="Archived" value={counts.archived} />
      </div>

      <form onSubmit={saveUpdate} style={editorStyle} aria-busy={saving ? 'true' : 'false'}>
        <div style={editorHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>{form.id ? 'Editing update' : 'New dashboard update'}</p>
            <h3 style={editorTitleStyle}>{form.id ? form.title || 'Untitled update' : 'Create a site update'}</h3>
          </div>
          {form.id && (
            <button type="button" onClick={resetForm} disabled={saving} style={ghostButtonStyle}><X size={14} /> New update</button>
          )}
        </div>

        <div style={fieldGridStyle}>
          <label style={labelStyle}>Tag / label
            <input value={form.label} onChange={e => updateForm({ label: e.target.value })} maxLength={60} placeholder="Creator, Mobile, Rules..." style={inputStyle} />
          </label>
          <label style={labelStyle}>Title
            <input value={form.title} onChange={e => updateForm({ title: e.target.value })} maxLength={140} placeholder="What changed?" style={inputStyle} />
          </label>
        </div>

        <label style={labelStyle}>Update text
          <textarea value={form.text} onChange={e => updateForm({ text: e.target.value })} maxLength={1200} placeholder="Write the short dashboard update users should see..." style={textareaStyle} />
        </label>

        <div style={toggleRowStyle}>
          <Toggle checked={form.is_published && !form.is_archived} disabled={form.is_archived || saving} onChange={() => updateForm({ is_published: !form.is_published })} icon={form.is_published ? Eye : EyeOff} label={form.is_archived ? 'Archived updates cannot publish' : form.is_published ? 'Published on dashboard' : 'Draft only'} />
          <Toggle checked={form.is_pinned && !form.is_archived} disabled={form.is_archived || saving} onChange={() => updateForm({ is_pinned: !form.is_pinned })} icon={Star} label={form.is_archived ? 'Archived updates cannot pin' : form.is_pinned ? 'Pinned to top' : 'Not pinned'} />
          <Toggle checked={form.is_archived} disabled={saving} onChange={() => updateForm({ is_archived: !form.is_archived, is_published: false, is_pinned: false })} icon={Archive} label={form.is_archived ? 'Archived' : 'Not archived'} />
        </div>

        <div style={actionsStyle}>
          <button type="submit" disabled={saving} style={busySaveStyle(saving)}>{saving ? <RefreshCw size={14} style={siteSpinStyle} /> : <Save size={14} />} {saving ? 'Saving update…' : form.id ? 'Save Update' : 'Publish / Save Update'}</button>
        </div>
      </form>

      <section style={listStyle} aria-label="Saved site updates">
        {loading ? (
          <AdminSiteUpdatesLoading />
        ) : updates.length === 0 ? (
          <div style={emptyStyle}>{showArchived ? 'No updates found.' : 'No visible updates yet. Create the first one above.'}</div>
        ) : updates.map(update => {
          const publishing = busyAction === actionKeyFor(update.id, { is_published: !update.is_published });
          const pinning = busyAction === actionKeyFor(update.id, { is_pinned: !update.is_pinned });
          const archiving = busyAction === actionKeyFor(update.id, { is_archived: !update.is_archived });
          const deleting = busyAction === `delete-${update.id}`;
          const anyBusy = publishing || pinning || archiving || deleting;

          return (
            <article key={update.id} style={{ ...cardStyle, opacity: update.is_archived ? 0.72 : 1 }} aria-busy={anyBusy ? 'true' : 'false'}>
              <div style={cardTopStyle}>
                <div style={{ minWidth: 0 }}>
                  <div style={badgeRowStyle}>
                    <Badge>{update.label || 'Update'}</Badge>
                    <Badge tone={update.is_archived ? 'archive' : update.is_published ? 'live' : 'draft'}>{update.is_archived ? 'Archived' : update.is_published ? 'Published' : 'Draft'}</Badge>
                    {update.is_pinned && !update.is_archived && <Badge tone="pinned">Pinned</Badge>}
                    <span style={dateStyle}>{formatDate(update.published_at || update.updated_at || update.created_at)}</span>
                  </div>
                  <h3 style={cardTitleStyle}>{update.title}</h3>
                </div>
                <button type="button" onClick={() => editUpdate(update)} disabled={anyBusy} style={iconButtonStyle} title="Edit update"><Pencil size={14} /></button>
              </div>

              <p style={messageStyle}>{update.text}</p>

              <div style={cardActionsStyle}>
                {!update.is_archived && (
                  <>
                    <button type="button" onClick={() => quickPatch(update, { is_published: !update.is_published })} disabled={anyBusy} style={busySmallStyle(publishing)}>
                      {publishing ? <RefreshCw size={13} style={siteSpinStyle} /> : update.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                      {publishing ? 'Updating…' : update.is_published ? 'Make draft' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => quickPatch(update, { is_pinned: !update.is_pinned })} disabled={anyBusy} style={busySmallStyle(pinning)}>
                      {pinning ? <RefreshCw size={13} style={siteSpinStyle} /> : <Star size={13} />}
                      {pinning ? 'Updating…' : update.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => quickPatch(update, { is_archived: !update.is_archived })} disabled={anyBusy} style={busySmallStyle(archiving)}>
                  {archiving ? <RefreshCw size={13} style={siteSpinStyle} /> : update.is_archived ? <RotateCcw size={13} /> : <Archive size={13} />}
                  {archiving ? 'Updating…' : update.is_archived ? 'Restore' : 'Archive'}
                </button>
                {update.is_archived && (
                  <button type="button" onClick={() => deleteUpdate(update)} disabled={anyBusy} style={busyDangerStyle(deleting)}>
                    {deleting ? <RefreshCw size={13} style={siteSpinStyle} /> : <Trash2 size={13} />} {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
      <style>{siteUpdatesCss}</style>
    </div>
  );
}

function actionKeyFor(id, patch) {
  if (patch.is_archived !== undefined) return `archive-${id}`;
  if (patch.is_published !== undefined) return `publish-${id}`;
  if (patch.is_pinned !== undefined) return `pin-${id}`;
  return `update-${id}`;
}

function sortUpdates(a, b) {
  if (Boolean(a.is_archived) !== Boolean(b.is_archived)) return a.is_archived ? 1 : -1;
  if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
  return String(b.updated_at || b.published_at || '').localeCompare(String(a.updated_at || a.published_at || ''));
}

function statusSummary(update) {
  if (update.is_archived) return 'Archived';
  return `${update.is_published ? 'Published' : 'Draft'} • ${update.is_pinned ? 'Pinned' : 'Not pinned'}`;
}

function AdminSiteUpdatesLoading() {
  return (
    <div style={siteLoadingStyle} role="status" aria-live="polite" aria-busy="true">
      <span style={siteLoadingSpinnerStyle} aria-hidden="true" />
      <strong>Loading dashboard updates…</strong>
      <span style={siteLoadingTextStyle}>Checking published notices, pinned updates, drafts, and archived posts.</span>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={metricStyle}><div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div><div style={{ fontSize: 11, color: rq.muted, textTransform: 'uppercase' }}>{label}</div></div>;
}

function Toggle({ checked, onChange, icon: Icon, label, disabled = false }) {
  return (
    <button type="button" disabled={disabled} onClick={onChange} style={{ ...toggleStyle, borderColor: checked ? rq.accent : rq.borderDefault, color: disabled ? rq.muted : checked ? rq.text : rq.muted, background: checked ? rq.accentSoft : rq.input, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <Icon size={15} /> {label}
    </button>
  );
}

function Badge({ children, tone }) {
  const color = tone === 'live' ? rq.success : tone === 'draft' ? rq.muted : tone === 'pinned' ? rq.accentHover : tone === 'archive' ? rq.muted : rq.textSecondary;
  return <span style={{ ...badgeStyle, color, borderColor: tone === 'pinned' ? rq.accent : rq.borderDefault }}>{children}</span>;
}

function formatDate(value) {
  if (!value) return 'No date yet';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 'clamp(14px, 3vw, 24px)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 13, margin: '6px 0 0' };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const metricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 16 };
const metricStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, color: rq.text, textAlign: 'center', padding: 12, borderRadius: rq.radiusSm };
const editorStyle = { background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 'clamp(14px, 3vw, 18px)', marginBottom: 16 };
const editorHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 };
const eyebrowStyle = { color: rq.accentHover, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 4px' };
const editorTitleStyle = { color: rq.text, fontSize: 18, fontWeight: 900, margin: 0 };
const fieldGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 };
const labelStyle = { color: rq.muted, fontSize: 12, fontWeight: 900, display: 'flex', flexDirection: 'column', gap: 6 };
const inputStyle = { width: '100%', background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px', outline: 'none' };
const textareaStyle = { minHeight: 112, background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, resize: 'vertical', outline: 'none' };
const toggleRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 };
const toggleStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '9px 11px', fontWeight: 900 };
const actionsStyle = { display: 'flex', justifyContent: 'flex-end', marginTop: 14 };
const saveButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accent, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const ghostButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: `1px solid ${rq.borderDefault}`, color: rq.muted, padding: '8px 10px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 12 };
const emptyStyle = { color: rq.muted, textAlign: 'center', padding: 36, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const cardStyle = { background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 16 };
const cardTopStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' };
const badgeRowStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 };
const badgeStyle = { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '2px 7px', background: rq.panel };
const dateStyle = { color: rq.muted, fontSize: 11 };
const cardTitleStyle = { color: rq.text, fontSize: 16, fontWeight: 900, margin: 0 };
const iconButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.accentHover, padding: 8, borderRadius: rq.radiusSm, cursor: 'pointer' };
const messageStyle = { color: rq.textSecondary, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '14px 0' };
const cardActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' };
const smallButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: rq.panel, border: `1px solid ${rq.borderDefault}`, color: rq.text, padding: '8px 10px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const dangerButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.accentHover, padding: '8px 10px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const siteSpinStyle = { animation: 'rqAdminSiteSpin 0.9s linear infinite' };
const siteLoadingStyle = { minHeight: 184, display: 'grid', placeItems: 'center', gap: 10, textAlign: 'center', color: rq.text, padding: 28, background: 'linear-gradient(145deg, rgba(33, 21, 14, 0.92), rgba(58, 38, 25, 0.84))', border: `1px solid ${rq.border}`, borderLeft: `5px solid ${rq.accent}`, borderRadius: rq.radius, boxShadow: '0 16px 44px rgba(0,0,0,0.22)' };
const siteLoadingSpinnerStyle = { width: 42, height: 42, borderRadius: '50%', backgroundImage: 'conic-gradient(from 0deg, var(--rq-primary-hover, #e0b15c), rgba(192, 138, 61, 0.18), rgba(255, 248, 239, 0.2), var(--rq-primary-hover, #e0b15c))', WebkitMask: 'radial-gradient(circle, transparent 42%, #000 44%)', mask: 'radial-gradient(circle, transparent 42%, #000 44%)', animation: 'rqAdminSiteSpin 0.9s linear infinite' };
const siteLoadingTextStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 420 };
const siteUpdatesCss = `
  @keyframes rqAdminSiteSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="admin-site-updates-tab"] svg,
    [data-testid="admin-site-updates-tab"] span[aria-hidden="true"] { animation: none !important; }
  }
`;

function busyButtonStyle(isBusy) {
  return { ...buttonStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

function busySaveStyle(isBusy) {
  return { ...saveButtonStyle, opacity: isBusy ? 0.82 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

function busySmallStyle(isBusy) {
  return { ...smallButtonStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

function busyDangerStyle(isBusy) {
  return { ...dangerButtonStyle, opacity: isBusy ? 0.72 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}
