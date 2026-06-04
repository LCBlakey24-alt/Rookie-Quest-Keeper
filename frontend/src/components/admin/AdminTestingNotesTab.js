import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bug, ClipboardList, RefreshCw, Save, Trash2 } from 'lucide-react';
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
const priorities = ['low', 'normal', 'high', 'urgent'];

export default function AdminTestingNotesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [form, setForm] = useState({ title: '', area: 'testing', priority: 'high', message: '' });

  const testingItems = useMemo(() => items.filter(item => (
    item.category === 'testing' ||
    item.area === 'testing' ||
    item.area === 'mobile-testing' ||
    String(item.title || '').toLowerCase().includes('[test]')
  )), [items]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/feedback', { params: { status_filter: 'all' } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load testing notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createIssue = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and notes are required');
      return;
    }
    try {
      const res = await apiClient.post('/feedback', {
        category: 'testing',
        area: form.area || 'testing',
        title: form.title.trim(),
        message: form.message.trim(),
        page_path: window.location.pathname,
        priority: form.priority || 'high',
      });
      setItems(prev => [res.data, ...prev]);
      setForm({ title: '', area: 'testing', priority: 'high', message: '' });
      toast.success('Testing issue logged');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create testing note');
    }
  };

  const updateLocal = (id, patch) => setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));

  const saveItem = async (item) => {
    try {
      setSavingId(item.id);
      const res = await apiClient.put(`/admin/feedback/${item.id}`, {
        status: item.status,
        priority: item.priority,
        admin_notes: item.admin_notes || '',
      });
      updateLocal(item.id, res.data);
      toast.success('Testing note saved');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save testing note');
    } finally {
      setSavingId('');
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this testing note?')) return;
    try {
      await apiClient.delete(`/admin/feedback/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Testing note deleted');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete testing note');
    }
  };

  return (
    <div style={wrapStyle} data-testid="admin-testing-notes-tab">
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}><ClipboardList size={20} /> Testing Notes</h2>
          <p style={subtitleStyle}>Log issues found while testing Punch, mobile sheets, campaign prep, and live combat.</p>
        </div>
        <button type="button" onClick={load} style={buttonStyle}><RefreshCw size={14} /> Refresh</button>
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

      {loading ? <div style={emptyStyle}>Loading testing notes...</div> : testingItems.length === 0 ? <div style={emptyStyle}>No testing notes yet. Log the first Punch test issue above.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {testingItems.map(item => (
            <article key={item.id} style={itemStyle}>
              <div style={itemTopStyle}>
                <div>
                  <div style={badgeRowStyle}><Badge label={item.status || 'new'} /><Badge label={item.priority || 'normal'} /><Badge label={item.area || 'testing'} /></div>
                  <h3 style={itemTitleStyle}>{item.title}</h3>
                  <p style={metaStyle}>From {item.username || 'Unknown'} {item.created_at ? `• ${new Date(item.created_at).toLocaleString()}` : ''}</p>
                </div>
                <button type="button" onClick={() => deleteItem(item.id)} style={dangerButtonStyle}><Trash2 size={14} /></button>
              </div>
              <p style={messageStyle}>{item.message}</p>
              <div style={gridStyle}>
                <label style={labelStyle}>Status
                  <select value={item.status || 'new'} onChange={e => updateLocal(item.id, { status: e.target.value })} style={inputStyle}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select>
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
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ label }) { return <span style={badgeStyle}>{label}</span>; }

const wrapStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 'clamp(14px, 3vw, 24px)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 13, margin: '6px 0 0' };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '9px 12px', borderRadius: rq.radiusSm, fontWeight: 900, cursor: 'pointer' };
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
