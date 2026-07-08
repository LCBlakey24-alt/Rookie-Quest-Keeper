import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bug, ClipboardList, Download, Filter, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
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

const statuses = ['new', 'reviewing', 'planned', 'done', 'dismissed'];
const statusFilters = ['all', ...statuses];
const priorities = ['low', 'normal', 'high', 'urgent'];

export default function AdminTestingNotesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ title: '', area: 'testing', priority: 'high', message: '' });

  const logAudit = async (entry) => {
    try { await apiClient.post('/admin/audit-log', entry); } catch { /* Audit logging should never block testing notes. */ }
  };

  const testingItems = useMemo(() => items.filter(item => (
    item.category === 'testing' ||
    item.area === 'testing' ||
    item.area === 'mobile-testing' ||
    String(item.title || '').toLowerCase().includes('[test]')
  )), [items]);

  const filteredTestingItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const normalisedItems = testingItems.map(item => ({ ...item, status: item.status || 'new', priority: item.priority || 'normal' }));
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
  }, [testingItems, query]);

  const counts = useMemo(() => ({
    total: testingItems.length,
    showing: filteredTestingItems.length,
    new: testingItems.filter(item => (item.status || 'new') === 'new').length,
    active: testingItems.filter(item => ['reviewing', 'planned'].includes(item.status)).length,
    done: testingItems.filter(item => item.status === 'done').length,
  }), [testingItems, filteredTestingItems]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/feedback', { params: { status_filter: statusFilter, kind: 'testing' } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load testing notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const createIssue = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and notes are required');
      return;
    }
    try {
      const payload = {
        category: 'testing',
        area: form.area || 'testing',
        title: form.title.trim(),
        message: form.message.trim(),
        page_path: window.location.pathname,
        priority: form.priority || 'high',
      };
      const res = await apiClient.post('/feedback', payload);
      setItems(prev => [res.data, ...prev]);
      await logAudit({
        action: 'Testing note created',
        area: 'testing_notes',
        target_id: res.data?.id || '',
        target_label: payload.title,
        detail: `${payload.area} • ${payload.priority}`,
      });
      setForm({ title: '', area: 'testing', priority: 'high', message: '' });
      toast.success('Testing issue logged');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create testing note');
    }
  };

  const updateLocal = (id, patch) => setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));

  const saveItem = async (item, successMessage = 'Testing note saved') => {
    try {
      setSavingId(item.id);
      const res = await apiClient.put(`/admin/feedback/${item.id}`, {
        status: item.status,
        priority: item.priority,
        admin_notes: item.admin_notes || '',
      });
      updateLocal(item.id, res.data);
      await logAudit({
        action: successMessage.startsWith('Moved to') ? 'Testing note status changed' : 'Testing note updated',
        area: 'testing_notes',
        target_id: item.id,
        target_label: item.title || 'Testing note',
        detail: `Status: ${item.status || 'new'} • Priority: ${item.priority || 'normal'}`,
      });
      toast.success(successMessage);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save testing note');
    } finally {
      setSavingId('');
    }
  };

  const quickStatus = async (item, status) => {
    await saveItem({ ...item, status }, `Moved to ${labelForStatus(status)}`);
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this testing note?')) return;
    const target = items.find(item => item.id === id);
    try {
      await apiClient.delete(`/admin/feedback/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
      await logAudit({
        action: 'Testing note deleted',
        area: 'testing_notes',
        target_id: id,
        target_label: target?.title || 'Testing note',
        detail: target?.message ? target.message.slice(0, 300) : '',
      });
      toast.success('Testing note deleted');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete testing note');
    }
  };

  const exportCsv = async () => {
    try {
      const res = await apiClient.get('/admin/export/feedback.csv', { params: { kind: 'testing' }, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rook-testing-notes.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      await logAudit({
        action: 'Testing notes CSV exported',
        area: 'testing_notes',
        target_id: '',
        target_label: 'Testing notes export',
        detail: 'Downloaded rook-testing-notes.csv',
      });
      toast.success('Testing notes CSV downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to export testing notes');
    }
  };

  return (
    <div style={wrapStyle} data-testid="admin-testing-notes-tab">
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><ClipboardList size={20} /> Testing Notes</h2>
          <p style={subtitleStyle}>Log issues found while testing Punch, mobile sheets, campaign prep, and live combat.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={load} style={buttonStyle}><RefreshCw size={14} /> Refresh</button>
          <button type="button" onClick={exportCsv} style={buttonStyle}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div style={metricsStyle}>
        <Metric label="Showing" value={counts.showing} />
        <Metric label="Total" value={counts.total} />
        <Metric label="New" value={counts.new} />
        <Metric label="Active" value={counts.active} />
        <Metric label="Done" value={counts.done} />
      </div>

      <div style={toolbarStyle}>
        <div style={searchWrapStyle}>
          <Search size={14} style={searchIconStyle} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search testing notes, area, status, notes..." style={searchInputStyle} />
        </div>
        <div style={filterWrapStyle}>
          <Filter size={14} color={rq.muted} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            {statusFilters.map(status => <option key={status} value={status}>{status === 'all' ? 'All statuses' : labelForStatus(status)}</option>)}
          </select>
        </div>
      </div>

      <form onSubmit={createIssue} style={formStyle}>
        <h3 style={formTitleStyle}><Bug size={16} /> Log a test issue</h3>
        <div style={gridStyle}>
          <label style={labelStyle}>Title
            <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Punch condition toggle did not save" style={inputStyle} />
          </label>
          <label style={labelStyle}>Area
            <select value={form.area} onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))} style={inputStyle}>
              <option value="testing">General testing</option>
              <option value="character-builder">Character builder</option>
              <option value="mobile-sheet">Mobile player sheet</option>
              <option value="campaign-prep">Campaign prep</option>
              <option value="quick-combat">Quick combat</option>
              <option value="live-play">Live play mode</option>
            </select>
          </label>
          <label style={labelStyle}>Priority
            <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))} style={inputStyle}>
              {priorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
        </div>
        <label style={labelStyle}>Notes
          <textarea value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} placeholder="What happened, what should have happened, and how to reproduce it..." style={textareaStyle} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={saveButtonStyle}><Save size={14} /> Save Testing Note</button>
        </div>
      </form>

      {loading ? <div style={emptyStyle}>Loading testing notes...</div> : filteredTestingItems.length === 0 ? <div style={emptyStyle}>No testing notes found for this filter. Log a new test issue above.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredTestingItems.map(item => {
            const status = item.status || 'new';
            const nextStatuses = statuses.filter(option => option !== status);
            return (
              <article key={item.id} style={itemStyle}>
                <div style={itemTopStyle}>
                  <div>
                    <div style={badgeRowStyle}><Badge label={labelForStatus(status)} /><Badge label={item.priority || 'normal'} /><Badge label={item.area || 'testing'} /></div>
                    <h3 style={itemTitleStyle}>{item.title}</h3>
                    <p style={metaStyle}>From {item.username || 'Unknown'} {item.created_at ? `• ${new Date(item.created_at).toLocaleString()}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => deleteItem(item.id)} style={dangerButtonStyle}><Trash2 size={14} /></button>
                </div>
                <p style={messageStyle}>{item.message}</p>
                <div style={quickMoveStyle}>
                  {nextStatuses.slice(0, 5).map(option => (
                    <button key={option} type="button" onClick={() => quickStatus(item, option)} style={miniButtonStyle} disabled={savingId === item.id}>
                      {labelForStatus(option)}
                    </button>
                  ))}
                </div>
                <div style={gridStyle}>
                  <label style={labelStyle}>Status
                    <select value={status} onChange={e => updateLocal(item.id, { status: e.target.value })} style={inputStyle}>{statuses.map(option => <option key={option} value={option}>{labelForStatus(option)}</option>)}</select>
                  </label>
                  <label style={labelStyle}>Priority
                    <select value={item.priority || 'normal'} onChange={e => updateLocal(item.id, { priority: e.target.value })} style={inputStyle}>{priorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select>
                  </label>
                </div>
                <label style={labelStyle}>Fix notes / plan
                  <textarea value={item.admin_notes || ''} onChange={e => updateLocal(item.id, { admin_notes: e.target.value })} style={textareaStyle} placeholder="Write fix plan or notes for the next build pass..." />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" disabled={savingId === item.id} onClick={() => saveItem(item)} style={saveButtonStyle}><Save size={14} /> {savingId === item.id ? 'Saving...' : 'Save'}</button></div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={metricStyle}><div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div><div style={{ fontSize: 11, color: rq.muted, textTransform: 'uppercase' }}>{label}</div></div>;
}

function Badge({ label }) { return <span style={badgeStyle}>{label}</span>; }

function labelForStatus(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
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
const searchInputStyle = { width: '100%', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px 10px 34px', outline: 'none' };
const filterWrapStyle = { display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 220px' };
const formStyle = { background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 16, marginBottom: 18 };
const formTitleStyle = { color: rq.accentHover, fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 };
const labelStyle = { color: rq.muted, fontSize: 12, fontWeight: 900, display: 'flex', flexDirection: 'column', gap: 6 };
const inputStyle = { width: '100%', background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px', outline: 'none' };
const textareaStyle = { minHeight: 86, background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: 10, resize: 'vertical', outline: 'none' };
const saveButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accent, color: '#FFFFFF', border: 'none', padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
const emptyStyle = { color: rq.muted, textAlign: 'center', padding: 36, background: rq.input, border: `1px dashed ${rq.borderDefault}`, borderRadius: rq.radiusSm };
const itemStyle = { background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: 16 };
const itemTopStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' };
const badgeRowStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 };
const badgeStyle = { color: rq.textSecondary, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '2px 7px', background: rq.panel };
const itemTitleStyle = { color: rq.text, fontSize: 16, fontWeight: 900, margin: '0 0 4px' };
const metaStyle = { color: rq.muted, fontSize: 12, margin: 0 };
const dangerButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.accentHover, padding: 8, borderRadius: rq.radiusSm, cursor: 'pointer' };
const messageStyle = { color: rq.textSecondary, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '14px 0' };
const quickMoveStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 };
const miniButtonStyle = { background: rq.panel, border: `1px solid ${rq.borderDefault}`, color: rq.textSecondary, padding: '6px 8px', borderRadius: rq.radiusSm, fontSize: 11, fontWeight: 900, cursor: 'pointer' };
