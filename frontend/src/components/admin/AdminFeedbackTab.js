import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Filter, Megaphone, MessageSquare, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
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
  warning: 'var(--rq-warning, #C99700)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const boardColumns = [
  { id: 'new', label: 'New', hint: 'Freshly submitted and untouched.' },
  { id: 'reviewing', label: 'Reviewing', hint: 'Needs checking or reproducing.' },
  { id: 'planned', label: 'Planned', hint: 'Worth building or already queued.' },
  { id: 'in_progress', label: 'In Progress', hint: 'Being worked on now.' },
  { id: 'done', label: 'Done', hint: 'Fixed, added, or answered.' },
  { id: 'dismissed', label: 'Dismissed', hint: 'Duplicate, not planned, or not needed.' },
];

const statuses = ['all', ...boardColumns.map(column => column.id)];
const priorities = ['low', 'normal', 'high', 'urgent'];

function isTestingNote(item) {
  const title = String(item?.title || '').toLowerCase();
  return item?.category === 'testing' || ['testing', 'mobile-testing'].includes(item?.area) || title.includes('[test]');
}

export default function AdminFeedbackTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Audit logging should never block feedback triage. */ }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/feedback', {
        params: { status_filter: statusFilter === 'all' ? 'all' : statusFilter, kind: 'feedback' },
      });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const feedbackItems = useMemo(() => items.filter(item => !isTestingNote(item)), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const normalisedItems = feedbackItems.map(item => ({ ...item, status: item.status || 'new', priority: item.priority || 'normal' }));
    if (!q) return normalisedItems;
    return normalisedItems.filter(item => [
      item.title,
      item.message,
      item.username,
      item.area,
      item.category,
      item.page_path,
      item.admin_notes,
      item.status,
      item.priority,
    ].some(value => String(value || '').toLowerCase().includes(q)));
  }, [feedbackItems, query]);

  const visibleColumns = useMemo(() => (
    statusFilter === 'all'
      ? boardColumns
      : boardColumns.filter(column => column.id === statusFilter)
  ), [statusFilter]);

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(boardColumns.map(column => [column.id, []]));
    filtered.forEach(item => {
      const status = boardColumns.some(column => column.id === item.status) ? item.status : 'new';
      groups[status].push(item);
    });
    return groups;
  }, [filtered]);

  const counts = useMemo(() => ({
    total: feedbackItems.length,
    showing: filtered.length,
    new: feedbackItems.filter(item => (item.status || 'new') === 'new').length,
    planned: feedbackItems.filter(item => item.status === 'planned').length,
    active: feedbackItems.filter(item => ['reviewing', 'planned', 'in_progress'].includes(item.status)).length,
    done: feedbackItems.filter(item => item.status === 'done').length,
  }), [feedbackItems, filtered]);

  const updateLocal = (id, patch) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const saveItem = async (item, successMessage = 'Feedback updated') => {
    try {
      setSavingId(item.id);
      const res = await apiClient.put(`/admin/feedback/${item.id}`, {
        status: item.status || 'new',
        priority: item.priority || 'normal',
        admin_notes: item.admin_notes || '',
      });
      updateLocal(item.id, res.data);
      await logAudit({
        action: successMessage.startsWith('Moved to') ? 'Feedback status changed' : 'Feedback updated',
        area: 'feedback',
        target_id: item.id,
        target_label: item.title || 'Feedback item',
        detail: `Status: ${item.status || 'new'} • Priority: ${item.priority || 'normal'}`,
      });
      toast.success(successMessage);
      return res.data;
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update feedback');
      return null;
    } finally {
      setSavingId('');
    }
  };

  const quickStatus = async (item, status) => {
    await saveItem({ ...item, status }, `Moved to ${labelForStatus(status)}`);
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this feedback item?')) return;
    const target = items.find(item => item.id === id);
    try {
      await apiClient.delete(`/admin/feedback/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
      await logAudit({
        action: 'Feedback deleted',
        area: 'feedback',
        target_id: id,
        target_label: target?.title || 'Feedback item',
        detail: target?.message ? target.message.slice(0, 300) : '',
      });
      toast.success('Feedback deleted');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete feedback');
    }
  };

  const createSiteUpdateDraft = async (item) => {
    const sourceText = (item.admin_notes || item.message || '').trim();
    if (!sourceText) {
      toast.error('Add admin notes or feedback text first');
      return;
    }

    try {
      setSavingId(`site-update-${item.id}`);
      const updateText = sourceText.length > 1170 ? `${sourceText.slice(0, 1167)}...` : sourceText;
      await apiClient.post('/admin/site-updates', {
        label: 'Feedback',
        title: item.title || 'Feedback update',
        text: updateText,
        is_published: false,
        is_pinned: false,
      });

      const nextStatus = ['new', 'reviewing'].includes(item.status || 'new') ? 'planned' : item.status || 'planned';
      const currentNotes = item.admin_notes || '';
      const noteLine = 'Draft site update created from this feedback.';
      const adminNotes = currentNotes.includes(noteLine)
        ? currentNotes
        : `${currentNotes}${currentNotes ? '\n\n' : ''}${noteLine}`;

      const res = await apiClient.put(`/admin/feedback/${item.id}`, {
        status: nextStatus,
        priority: item.priority || 'normal',
        admin_notes: adminNotes,
      });
      updateLocal(item.id, res.data);
      await logAudit({
        action: 'Draft site update created from feedback',
        area: 'feedback',
        target_id: item.id,
        target_label: item.title || 'Feedback item',
        detail: `Created draft Site Update and moved feedback to ${labelForStatus(nextStatus)}.`,
      });
      toast.success('Draft site update created');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create site update draft');
    } finally {
      setSavingId('');
    }
  };

  const exportCsv = async () => {
    try {
      const res = await apiClient.get('/admin/export/feedback.csv', { params: { kind: 'feedback' }, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rook-feedback.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      await logAudit({ action: 'Feedback CSV exported', area: 'feedback', target_id: '', target_label: 'Feedback export', detail: 'Downloaded user feedback CSV only' });
      toast.success('Feedback CSV downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to export feedback');
    }
  };

  return (
    <div data-testid="admin-feedback-tab" style={wrapStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><MessageSquare size={20} /> Feedback Task Board</h2>
          <p style={subtitleStyle}>Triage user suggestions, bugs, confusing areas, and turn useful feedback into public dashboard updates. Testing notes live in their own tab.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={load} disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.72 : 1, cursor: loading ? 'progress' : 'pointer' }} aria-busy={loading ? 'true' : 'false'}><RefreshCw size={14} style={loading ? feedbackSpinStyle : undefined} /> {loading ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" onClick={exportCsv} style={buttonStyle}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div style={metricsStyle}>
        <Metric label="Showing" value={counts.showing} />
        <Metric label="New" value={counts.new} />
        <Metric label="Active" value={counts.active} />
        <Metric label="Planned" value={counts.planned} />
        <Metric label="Done" value={counts.done} />
      </div>

      <div style={toolbarStyle}>
        <div style={searchWrapStyle}>
          <Search size={14} style={searchIconStyle} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search feedback, user, area, page, notes..." style={inputStyle} />
        </div>
        <div style={filterWrapStyle}>
          <Filter size={14} color={rq.muted} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            {statuses.map(status => <option key={status} value={status}>{status === 'all' ? 'All columns' : labelForStatus(status)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <AdminFeedbackLoading />
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>No user feedback found. Testing notes are kept under the Testing tab.</div>
      ) : (
        <div style={boardStyle}>
          {visibleColumns.map(column => (
            <section key={column.id} style={columnStyle} aria-label={`${column.label} feedback`}>
              <div style={columnHeaderStyle}>
                <div>
                  <h3 style={columnTitleStyle}>{column.label}</h3>
                  <p style={columnHintStyle}>{column.hint}</p>
                </div>
                <span style={columnCountStyle}>{grouped[column.id]?.length || 0}</span>
              </div>

              <div style={columnCardsStyle}>
                {(grouped[column.id] || []).length === 0 ? (
                  <div style={emptyColumnStyle}>Nothing here.</div>
                ) : grouped[column.id].map(item => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    savingId={savingId}
                    onPatch={updateLocal}
                    onSave={saveItem}
                    onMove={quickStatus}
                    onDelete={deleteItem}
                    onCreateSiteUpdate={createSiteUpdateDraft}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <style>{feedbackLoadingCss}</style>
    </div>
  );
}

function FeedbackCard({ item, savingId, onPatch, onSave, onMove, onDelete, onCreateSiteUpdate }) {
  const status = item.status || 'new';
  const priority = item.priority || 'normal';
  const nextStatuses = boardColumns.filter(column => column.id !== status);
  const creatingDraft = savingId === `site-update-${item.id}`;
  const savingFeedback = savingId === item.id;

  return (
    <article style={itemStyle} aria-busy={(creatingDraft || savingFeedback) ? 'true' : 'false'}>
      <div style={itemTopStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={badgeRowStyle}>
            <Badge label={priority} tone="priority" />
            <Badge label={item.area || 'general'} />
            <span style={dateStyle}>{formatDate(item.created_at)}</span>
          </div>
          <h4 style={itemTitleStyle}>{item.title}</h4>
          <p style={metaStyle}>From {item.username || 'Unknown'} {item.page_path ? `• ${item.page_path}` : ''}</p>
        </div>
        <button type="button" onClick={() => onDelete(item.id)} style={dangerButtonStyle} title="Delete feedback"><Trash2 size={14} /></button>
      </div>

      <p style={messageStyle}>{item.message}</p>

      <div style={quickMoveStyle}>
        {nextStatuses.slice(0, 5).map(column => (
          <button key={column.id} type="button" onClick={() => onMove(item, column.id)} style={miniButtonStyle}>
            {column.label}
          </button>
        ))}
      </div>

      <div style={editGridStyle}>
        <label style={labelStyle}>Status
          <select value={status} onChange={e => onPatch(item.id, { status: e.target.value })} style={selectStyle}>
            {boardColumns.map(column => <option key={column.id} value={column.id}>{column.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Priority
          <select value={priority} onChange={e => onPatch(item.id, { priority: e.target.value })} style={selectStyle}>
            {priorities.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
      </div>

      <label style={labelStyle}>Admin notes / fix plan
        <textarea value={item.admin_notes || ''} onChange={e => onPatch(item.id, { admin_notes: e.target.value })} placeholder="Add your thoughts, fix plan, or wording for a future site update..." style={textareaStyle} />
      </label>

      <div style={cardActionsStyle}>
        <button type="button" disabled={creatingDraft} onClick={() => onCreateSiteUpdate(item)} style={{ ...secondaryButtonStyle, cursor: creatingDraft ? 'progress' : 'pointer', opacity: creatingDraft ? 0.72 : 1 }}>
          {creatingDraft ? <RefreshCw size={14} style={feedbackSpinStyle} /> : <Megaphone size={14} />} {creatingDraft ? 'Creating update…' : 'Create Site Update'}
        </button>
        <button type="button" disabled={savingFeedback} onClick={() => onSave(item)} style={{ ...saveButtonStyle, cursor: savingFeedback ? 'progress' : 'pointer', opacity: savingFeedback ? 0.82 : 1 }}>
          {savingFeedback ? <RefreshCw size={14} style={feedbackSpinStyle} /> : <Save size={14} />} {savingFeedback ? 'Saving feedback…' : 'Save'}
        </button>
      </div>
    </article>
  );
}

function AdminFeedbackLoading() {
  return (
    <div style={feedbackLoadingStyle} role="status" aria-live="polite" aria-busy="true">
      <span style={feedbackLoadingSpinnerStyle} aria-hidden="true" />
      <strong>Loading feedback board…</strong>
      <span style={feedbackLoadingTextStyle}>Checking new submissions, planned work, dismissed items, and done tasks.</span>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={metricStyle}><div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div><div style={{ fontSize: 11, color: rq.muted, textTransform: 'uppercase' }}>{label}</div></div>;
}

function Badge({ label, tone }) {
  const isPriority = tone === 'priority';
  const priorityColor = label === 'urgent' ? rq.accentHover : label === 'high' ? rq.warning : rq.textSecondary;
  return <span style={{ ...badgeStyle, color: isPriority ? priorityColor : rq.textSecondary, borderColor: isPriority ? priorityColor : rq.borderDefault }}>{label}</span>;
}

function labelForStatus(value) {
  return boardColumns.find(column => column.id === value)?.label || value;
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
const selectStyle = { width: '100%', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '9px 10px', outline: 'none' };
const emptyStyle = { color: rq.muted, textAlign: 'center', padding: 36, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const boardStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))', gap: 12, alignItems: 'start' };
const columnStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 12, minWidth: 0 };
const columnHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 10 };
const columnTitleStyle = { color: rq.text, fontSize: 15, fontWeight: 900, margin: 0 };
const columnHintStyle = { color: rq.muted, fontSize: 11, lineHeight: 1.4, margin: '4px 0 0' };
const columnCountStyle = { color: rq.text, background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: 999, minWidth: 30, textAlign: 'center', padding: '4px 8px', fontSize: 12, fontWeight: 900 };
const columnCardsStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const emptyColumnStyle = { color: rq.muted, textAlign: 'center', padding: 18, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm, fontSize: 12 };
const itemStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 14 };
const itemTopStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' };
const badgeRowStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 };
const badgeStyle = { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '2px 7px', background: rq.input };
const dateStyle = { color: rq.muted, fontSize: 11 };
const itemTitleStyle = { color: rq.text, fontSize: 15, fontWeight: 900, margin: '0 0 4px' };
const metaStyle = { color: rq.muted, fontSize: 12, margin: 0 };
const dangerButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.accentHover, padding: 8, borderRadius: rq.radiusSm, cursor: 'pointer' };
const messageStyle = { color: rq.textSecondary, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: '12px 0' };
const quickMoveStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 };
const miniButtonStyle = { background: rq.input, border: `1px solid ${rq.borderDefault}`, color: rq.textSecondary, padding: '6px 8px', borderRadius: rq.radiusSm, fontSize: 11, fontWeight: 900, cursor: 'pointer' };
const editGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 };
const labelStyle = { color: rq.muted, fontSize: 12, fontWeight: 900, display: 'flex', flexDirection: 'column', gap: 6 };
const textareaStyle = { minHeight: 82, background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, resize: 'vertical', outline: 'none' };
const cardActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 12 };
const saveButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accent, color: '#fff', border: 'none', padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const secondaryButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, color: rq.text, border: `1px solid ${rq.border}`, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const feedbackSpinStyle = { animation: 'rqAdminFeedbackSpin 0.9s linear infinite' };
const feedbackLoadingStyle = { minHeight: 184, display: 'grid', placeItems: 'center', gap: 10, textAlign: 'center', color: rq.text, padding: 28, background: 'linear-gradient(145deg, rgba(33, 21, 14, 0.92), rgba(58, 38, 25, 0.84))', border: `1px solid ${rq.border}`, borderLeft: `5px solid ${rq.accent}`, borderRadius: rq.radius, boxShadow: '0 16px 44px rgba(0,0,0,0.22)' };
const feedbackLoadingSpinnerStyle = { width: 42, height: 42, borderRadius: '50%', backgroundImage: 'conic-gradient(from 0deg, var(--rq-primary-hover, #e0b15c), rgba(192, 138, 61, 0.18), rgba(255, 248, 239, 0.2), var(--rq-primary-hover, #e0b15c))', WebkitMask: 'radial-gradient(circle, transparent 42%, #000 44%)', mask: 'radial-gradient(circle, transparent 42%, #000 44%)', animation: 'rqAdminFeedbackSpin 0.9s linear infinite' };
const feedbackLoadingTextStyle = { color: rq.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 420 };
const feedbackLoadingCss = `
  @keyframes rqAdminFeedbackSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="admin-feedback-tab"] svg,
    [data-testid="admin-feedback-tab"] span[aria-hidden="true"] { animation: none !important; }
  }
`;
