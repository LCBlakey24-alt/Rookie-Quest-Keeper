import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, Eye, FileText, Image as ImageIcon, Mail, Plus, Search, Send, Trash2, Upload, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', good: '#1f9d66',
  text: '#fff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const CATEGORIES = ['lore', 'secret', 'clue', 'letter', 'map', 'item', 'recap', 'other'];
const EMPTY = { title: '', content: '', category: 'lore', attachment_url: '', attachment_type: '', attachment_name: '', image_url: '', allow_player_sharing: true };

const nice = value => String(value || 'Other').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
const attachmentUrl = item => item?.attachment_url || item?.image_url || '';
const attachmentType = item => item?.attachment_type || (item?.image_url ? 'image/upload' : '');

export default function GMHandoutsWorkspace({ campaignId }) {
  const [items, setItems] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState('');
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [selectedRecipients, setSelectedRecipients] = useState({});
  const [saving, setSaving] = useState(false);
  const [sharingId, setSharingId] = useState('');

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [itemRes, recipientRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/handouts`),
        apiClient.get(`/campaigns/${campaignId}/handout-recipients`).catch(() => ({ data: { recipients: [] } })),
      ]);
      setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
      setRecipients(Array.isArray(recipientRes.data?.recipients) ? recipientRes.data.recipients : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load handouts');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      const category = item.category || 'other';
      if (filter !== 'all' && category !== filter) return false;
      return !q || [item.title, item.content, category, item.attachment_name].some(value => String(value || '').toLowerCase().includes(q));
    });
  }, [items, search, filter]);

  const openCreate = () => { setEditor({ id: null }); setDraft(EMPTY); };
  const openEdit = item => {
    setEditor(item);
    setDraft({
      title: item.title || '', content: item.content || '', category: item.category || 'lore',
      attachment_url: item.attachment_url || item.image_url || '', attachment_type: item.attachment_type || (item.image_url ? 'image/upload' : ''),
      attachment_name: item.attachment_name || '', image_url: item.image_url || '', allow_player_sharing: item.allow_player_sharing !== false,
    });
  };
  const closeEditor = () => { setEditor(null); setDraft(EMPTY); };

  const save = async () => {
    if (!draft.title.trim() || saving) return;
    setSaving(true);
    try {
      if (editor?.id) {
        const response = await apiClient.put(`/campaigns/${campaignId}/handouts/${editor.id}`, draft);
        setItems(prev => prev.map(item => item.id === editor.id ? { ...item, ...response.data } : item));
        toast.success('Handout updated');
      } else {
        const response = await apiClient.post(`/campaigns/${campaignId}/handouts`, draft);
        setItems(prev => [response.data, ...prev]);
        toast.success('Handout created');
      }
      closeEditor();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save handout');
    } finally {
      setSaving(false);
    }
  };

  const remove = async item => {
    if (!window.confirm(`Delete ${item.title}?`)) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/handouts/${item.id}`);
      setItems(prev => prev.filter(entry => entry.id !== item.id));
      toast.success('Handout deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete handout');
    }
  };

  const reveal = async (item, selectedOnly = false) => {
    const selected = selectedRecipients[item.id] || [];
    if (selectedOnly && !selected.length) return;
    setSharingId(item.id);
    try {
      await apiClient.post(`/campaigns/${campaignId}/handouts/${item.id}/share`, { recipients: selectedOnly ? selected : [] });
      const revealedTo = selectedOnly ? selected : recipients.map(recipient => recipient.username);
      setItems(prev => prev.map(entry => entry.id === item.id ? {
        ...entry,
        shared_with: Array.from(new Set([...(entry.shared_with || []), ...revealedTo])),
        delivery_count: Math.max(Number(entry.delivery_count || 0), revealedTo.length),
      } : entry));
      toast.success(selectedOnly ? `Revealed to ${selected.length} player(s)` : 'Revealed to all players');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not reveal handout');
    } finally {
      setSharingId('');
    }
  };

  const toggleRecipient = (itemId, username) => {
    setSelectedRecipients(prev => {
      const set = new Set(prev[itemId] || []);
      if (set.has(username)) set.delete(username); else set.add(username);
      return { ...prev, [itemId]: [...set] };
    });
  };

  const handleFile = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('audio/');
    if (!allowed) { toast.error('Use an image, PDF, or audio file'); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('File must be under 12MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setDraft(prev => ({
      ...prev, attachment_url: reader.result, attachment_type: file.type, attachment_name: file.name,
      image_url: file.type.startsWith('image/') ? reader.result : '',
    }));
    reader.readAsDataURL(file);
  };

  return (
    <section data-testid="gm-handouts-tab" style={shellStyle}>
      <div style={toolbarStyle}>
        <label style={searchStyle}><Search size={14} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search handouts…" style={searchInputStyle} /></label>
        <select value={filter} onChange={event => setFilter(event.target.value)} style={selectStyle}>
          <option value="all">All</option>{CATEGORIES.map(category => <option key={category} value={category}>{nice(category)}</option>)}
        </select>
        <button type="button" onClick={openCreate} style={primaryButtonStyle}><Plus size={14} /> New</button>
      </div>

      {editor && (
        <section style={editorStyle}>
          <header style={editorHeaderStyle}><strong>{editor.id ? 'Edit Handout' : 'New Handout'}</strong><button type="button" onClick={closeEditor} style={iconButtonStyle}><X size={14} /></button></header>
          <div style={formGridStyle}>
            <label style={fieldStyle}><span>Title</span><input value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Title" style={inputStyle} /></label>
            <label style={fieldStyle}><span>Category</span><select value={draft.category} onChange={event => setDraft(prev => ({ ...prev, category: event.target.value }))} style={inputStyle}>{CATEGORIES.map(category => <option key={category} value={category}>{nice(category)}</option>)}</select></label>
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}><span>Content</span><textarea value={draft.content} onChange={event => setDraft(prev => ({ ...prev, content: event.target.value }))} placeholder="What will the players receive?" style={areaStyle} /></label>
          </div>
          <div style={attachmentRowStyle}>
            <label style={uploadButtonStyle}><Upload size={13} /> {draft.attachment_name || 'Attach image / PDF / audio'}<input type="file" accept="image/*,application/pdf,audio/*" onChange={handleFile} style={{ display: 'none' }} /></label>
            {draft.attachment_url && <button type="button" onClick={() => setDraft(prev => ({ ...prev, attachment_url: '', attachment_type: '', attachment_name: '', image_url: '' }))} style={smallButtonStyle}><X size={12} /> Clear file</button>}
            <label style={shareToggleStyle}><input type="checkbox" checked={draft.allow_player_sharing !== false} onChange={event => setDraft(prev => ({ ...prev, allow_player_sharing: event.target.checked }))} /> Players may re-share</label>
          </div>
          <div style={editorActionsStyle}><button type="button" onClick={closeEditor} style={secondaryButtonStyle}>Cancel</button><button type="button" onClick={save} disabled={saving || !draft.title.trim()} style={primaryButtonStyle}>{saving ? 'Saving…' : 'Save'}</button></div>
        </section>
      )}

      {loading ? <div style={emptyStyle}>Loading handouts…</div> : visible.length === 0 ? <div style={emptyStyle}>{items.length ? 'No matching handouts.' : 'No handouts yet.'}</div> : (
        <div style={listStyle}>
          {visible.map(item => {
            const open = expandedId === item.id;
            const known = item.delivery_status?.map(status => status.username) || item.shared_with || [];
            const selected = selectedRecipients[item.id] || [];
            return (
              <article key={item.id} style={cardStyle}>
                <button type="button" onClick={() => setExpandedId(open ? '' : item.id)} style={cardToggleStyle}>
                  <span style={categoryStyle}>{nice(item.category || 'other')}</span>
                  <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <strong style={titleStyle}>{item.title}</strong>
                    <small style={metaStyle}>{known.length ? `Known by ${known.length}` : 'Not revealed'}{item.unread_count ? ` · ${item.unread_count} unread` : ''}</small>
                  </span>
                  {attachmentUrl(item) && <AttachmentIcon item={item} />}
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {open && (
                  <div style={detailsStyle}>
                    {item.content && <p style={contentStyle}>{item.content}</p>}
                    <AttachmentPreview item={item} />
                    <div style={actionRowStyle}>
                      <button type="button" onClick={() => openEdit(item)} style={smallButtonStyle}><Edit3 size={12} /> Edit</button>
                      <button type="button" disabled={sharingId === item.id || !recipients.length} onClick={() => reveal(item, false)} style={revealButtonStyle}><Send size={12} /> Reveal all</button>
                      <button type="button" onClick={() => remove(item)} style={deleteButtonStyle}><Trash2 size={12} /> Delete</button>
                    </div>

                    {recipients.length > 0 && (
                      <section style={recipientSectionStyle}>
                        <div style={recipientHeaderStyle}><strong><Eye size={13} /> Reveal to selected</strong><button type="button" disabled={!selected.length || sharingId === item.id} onClick={() => reveal(item, true)} style={primaryMiniStyle}>Reveal ({selected.length})</button></div>
                        <div style={recipientGridStyle}>
                          {recipients.map(recipient => {
                            const username = recipient.username;
                            const already = known.includes(username);
                            return <label key={username} style={recipientChipStyle(already, selected.includes(username))}><input type="checkbox" checked={selected.includes(username)} onChange={() => toggleRecipient(item.id, username)} /><span>{recipient.character_name || recipient.display_name || username}</span>{already && <small>knows</small>}</label>;
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AttachmentIcon({ item }) {
  const type = attachmentType(item);
  if (type.startsWith('audio/')) return <Volume2 size={14} />;
  if (type === 'application/pdf') return <FileText size={14} />;
  return <ImageIcon size={14} />;
}
function AttachmentPreview({ item }) {
  const url = attachmentUrl(item); if (!url) return null;
  const type = attachmentType(item); const name = item.attachment_name || 'Attachment';
  if (type.startsWith('audio/')) return <audio controls src={url} style={{ width: '100%' }} />;
  if (type === 'application/pdf') return <a href={url} target="_blank" rel="noreferrer" style={fileLinkStyle}><FileText size={14} /> Open {name}</a>;
  return <img src={url} alt={name} style={imageStyle} />;
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, color: rq.text, fontFamily: fontStack };
const toolbarStyle = { display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) minmax(110px,180px) auto', gap: 5 };
const searchStyle = { minHeight: 38, display: 'flex', alignItems: 'center', gap: 6, background: rq.panel, border: `1px solid ${rq.line}`, padding: '0 8px', color: rq.muted, minWidth: 0 };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 36, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 11 };
const selectStyle = { minHeight: 38, background: rq.panel, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px' };
const primaryButtonStyle = { minHeight: 38, border: 0, background: rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontWeight: 950, whiteSpace: 'nowrap' };
const secondaryButtonStyle = { minHeight: 36, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, padding: '0 9px', cursor: 'pointer', fontWeight: 850 };
const editorStyle = { display: 'grid', gap: 7, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}`, padding: 8 };
const editorHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(130px,.5fr)', gap: 6 };
const fieldStyle = { display: 'grid', gap: 3, color: rq.muted, fontSize: 9, fontWeight: 900, textTransform: 'uppercase' };
const inputStyle = { minHeight: 36, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 11 };
const areaStyle = { minHeight: 110, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: 8, resize: 'vertical', lineHeight: 1.4, fontSize: 11 };
const attachmentRowStyle = { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' };
const uploadButtonStyle = { minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, padding: '0 8px', cursor: 'pointer', fontSize: 10, fontWeight: 850 };
const shareToggleStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, color: rq.muted, fontSize: 10 };
const editorActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 5 };
const iconButtonStyle = { width: 30, height: 30, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const listStyle = { display: 'grid', gap: 4 };
const cardStyle = { background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}` };
const cardToggleStyle = { width: '100%', minHeight: 50, border: 0, background: 'transparent', color: rq.text, padding: 7, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' };
const categoryStyle = { minWidth: 52, padding: '3px 5px', background: rq.bg, color: rq.muted, fontSize: 8, fontWeight: 950, textTransform: 'uppercase', textAlign: 'center' };
const titleStyle = { display: 'block', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const metaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 1 };
const detailsStyle = { display: 'grid', gap: 7, padding: '0 8px 8px', borderTop: `1px solid ${rq.line}` };
const contentStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 11, lineHeight: 1.45, whiteSpace: 'pre-wrap' };
const actionRowStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const smallButtonStyle = { minHeight: 31, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 9, fontWeight: 850 };
const revealButtonStyle = { ...smallButtonStyle, background: rq.good, color: '#fff', border: 0 };
const deleteButtonStyle = { ...smallButtonStyle, color: '#ff8b8b' };
const recipientSectionStyle = { display: 'grid', gap: 5, background: rq.panel, border: `1px solid ${rq.line}`, padding: 6 };
const recipientHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: 10 };
const primaryMiniStyle = { minHeight: 28, border: 0, background: rq.red, color: '#fff', padding: '0 7px', fontSize: 9, fontWeight: 900, cursor: 'pointer' };
const recipientGridStyle = { display: 'flex', gap: 4, flexWrap: 'wrap' };
const recipientChipStyle = (known, selected) => ({ minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 4, background: known ? 'rgba(31,157,102,0.16)' : selected ? 'rgba(208,0,0,0.16)' : rq.bg, border: `1px solid ${known ? 'rgba(31,157,102,.45)' : selected ? 'rgba(208,0,0,.45)' : rq.line}`, color: rq.soft, padding: '0 6px', fontSize: 9, cursor: 'pointer' });
const fileLinkStyle = { minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 5, color: rq.text, background: rq.bg, border: `1px solid ${rq.line}`, padding: '0 8px', fontSize: 10, textDecoration: 'none' };
const imageStyle = { width: '100%', maxHeight: 260, objectFit: 'contain', background: rq.bg, border: `1px solid ${rq.line}` };
const emptyStyle = { minHeight: 100, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, fontSize: 10 };
