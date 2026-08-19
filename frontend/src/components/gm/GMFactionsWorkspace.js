import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Search, Shield, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#fff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const EMPTY = { name: '', domain: '', description: '', symbol: '', alignment: '', notes: '' };
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

export default function GMFactionsWorkspace({ campaignId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/gods`);
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load factions and powers');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (!q) return sorted;
    return sorted.filter(item => [item.name, item.domain, item.alignment, item.symbol, item.description, item.notes]
      .some(value => String(value || '').toLowerCase().includes(q)));
  }, [items, search]);

  const openCreate = () => { setEditing({ id: null }); setDraft(EMPTY); };
  const openEdit = item => {
    setEditing(item);
    setDraft({
      name: item.name || '', domain: item.domain || '', description: item.description || '',
      symbol: item.symbol || '', alignment: item.alignment || '', notes: item.notes || '',
    });
  };
  const closeEditor = () => { setEditing(null); setDraft(EMPTY); };

  const save = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    const payload = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, String(value || '').trim()]));
    try {
      if (editing?.id) {
        const response = await apiClient.put(`/campaigns/${campaignId}/gods/${editing.id}`, payload);
        setItems(prev => prev.map(item => item.id === editing.id ? { ...item, ...response.data } : item));
        toast.success('Entry updated');
      } else {
        const response = await apiClient.post(`/campaigns/${campaignId}/gods`, payload);
        setItems(prev => [response.data, ...prev]);
        toast.success('Entry added');
      }
      closeEditor();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save entry');
    } finally {
      setSaving(false);
    }
  };

  const remove = async item => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/gods/${item.id}`);
      setItems(prev => prev.filter(entry => entry.id !== item.id));
      toast.success('Entry deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete entry');
    }
  };

  return (
    <section data-testid="gm-factions-workspace" style={shellStyle}>
      <div style={toolbarStyle}>
        <label style={searchStyle}><Search size={14} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search powers, factions, gods, guilds…" style={searchInputStyle} /></label>
        <button data-testid="add-god-btn" type="button" onClick={openCreate} style={primaryButtonStyle}><Plus size={14} /> Add</button>
      </div>

      {editing && (
        <section style={editorStyle}>
          <div style={editorHeaderStyle}><strong>{editing.id ? 'Edit Entry' : 'New Entry'}</strong><button type="button" onClick={closeEditor} style={iconButtonStyle}><X size={14} /></button></div>
          <div style={formGridStyle}>
            <Field label="Name" testId="god-name-input" value={draft.name} onChange={value => setDraft(prev => ({ ...prev, name: value }))} placeholder="Name" />
            <Field label="Influence / Domain" testId="god-domain-input" value={draft.domain} onChange={value => setDraft(prev => ({ ...prev, domain: value }))} placeholder="Trade, storms, secrets, city politics…" />
            <Field label="Symbol / Emblem" testId="god-symbol-input" value={draft.symbol} onChange={value => setDraft(prev => ({ ...prev, symbol: value }))} placeholder="Crown, sigil, mask…" />
            <Field label="Stance / Alignment" testId="god-alignment-input" value={draft.alignment} onChange={value => setDraft(prev => ({ ...prev, alignment: value }))} placeholder="Friendly, hostile, neutral…" />
            <Area label="Description" testId="god-description-input" value={draft.description} onChange={value => setDraft(prev => ({ ...prev, description: value }))} placeholder="What is it?" />
            <Area label="GM Notes" testId="god-notes-input" value={draft.notes} onChange={value => setDraft(prev => ({ ...prev, notes: value }))} placeholder="Secrets, members, plans, hooks…" />
          </div>
          <div style={editorActionsStyle}><button type="button" onClick={closeEditor} style={secondaryButtonStyle}>Cancel</button><button type="button" onClick={save} disabled={saving || !draft.name.trim()} style={primaryButtonStyle}>{saving ? 'Saving…' : 'Save'}</button></div>
        </section>
      )}

      {loading ? (
        <div style={emptyStyle}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={emptyStyle}>{items.length ? 'No matching entries.' : 'No factions or powers yet.'}</div>
      ) : (
        <div style={gridStyle}>
          {filtered.map(item => (
            <article key={item.id} data-testid={`god-card-${item.id}`} style={cardStyle}>
              <header style={cardHeaderStyle}>
                <span style={shieldStyle}><Shield size={16} /></span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={cardTitleStyle}>{item.name}</strong>
                  {(item.domain || item.alignment) && <small style={cardMetaStyle}>{[item.domain, item.alignment].filter(Boolean).join(' · ')}</small>}
                </span>
                <button data-testid={`edit-god-btn-${item.id}`} type="button" onClick={() => openEdit(item)} style={iconButtonStyle}><Edit3 size={13} /></button>
                <button data-testid={`delete-god-btn-${item.id}`} type="button" onClick={() => remove(item)} style={deleteButtonStyle}><Trash2 size={13} /></button>
              </header>
              {item.description && <p style={descriptionStyle}>{item.description}</p>}
              {(item.symbol || item.notes) && (
                <details style={detailsStyle}>
                  <summary style={summaryStyle}>Details</summary>
                  <div style={detailsBodyStyle}>
                    {item.symbol && <span><strong>Symbol:</strong> {item.symbol}</span>}
                    {item.notes && <span><strong>GM:</strong> {item.notes}</span>}
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, testId, value, onChange, placeholder }) {
  return <label style={fieldStyle}><span>{label}</span><input data-testid={testId} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} /></label>;
}
function Area({ label, testId, value, onChange, placeholder }) {
  return <label style={fieldStyle}><span>{label}</span><textarea data-testid={testId} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={areaStyle} /></label>;
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, color: rq.text, fontFamily: fontStack };
const toolbarStyle = { display: 'flex', gap: 6, alignItems: 'center' };
const searchStyle = { minHeight: 38, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, background: rq.panel, border: `1px solid ${rq.line}`, padding: '0 8px', color: rq.muted };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 36, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 11 };
const primaryButtonStyle = { minHeight: 38, border: 0, background: rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontWeight: 950, whiteSpace: 'nowrap' };
const secondaryButtonStyle = { minHeight: 36, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, padding: '0 9px', cursor: 'pointer', fontWeight: 850 };
const editorStyle = { display: 'grid', gap: 7, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}`, padding: 8 };
const editorHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 6 };
const fieldStyle = { display: 'grid', gap: 3, color: rq.muted, fontSize: 9, fontWeight: 900, textTransform: 'uppercase' };
const inputStyle = { minHeight: 36, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 11 };
const areaStyle = { minHeight: 86, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: 7, resize: 'vertical', fontSize: 11, lineHeight: 1.4 };
const editorActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 5 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 6 };
const cardStyle = { background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}`, minWidth: 0 };
const cardHeaderStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: 7, minWidth: 0 };
const shieldStyle = { width: 28, height: 28, display: 'grid', placeItems: 'center', background: rq.bg, flex: '0 0 28px' };
const cardTitleStyle = { display: 'block', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const cardMetaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const iconButtonStyle = { width: 30, height: 30, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 30px' };
const deleteButtonStyle = { ...iconButtonStyle, color: '#ff8b8b' };
const descriptionStyle = { margin: 0, padding: '0 8px 8px', color: rq.soft, fontSize: 10, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
const detailsStyle = { borderTop: `1px solid ${rq.line}` };
const summaryStyle = { minHeight: 32, padding: '0 8px', display: 'flex', alignItems: 'center', color: rq.muted, cursor: 'pointer', fontSize: 9, fontWeight: 850 };
const detailsBodyStyle = { display: 'grid', gap: 4, padding: '0 8px 8px', color: rq.soft, fontSize: 10, lineHeight: 1.35 };
const emptyStyle = { minHeight: 100, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, fontSize: 10 };
