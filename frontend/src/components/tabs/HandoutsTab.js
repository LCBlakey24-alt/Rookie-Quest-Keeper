import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Plus, Trash2, Send, BookOpen, Mail, MailOpen, Users, Image as ImageIcon, Edit3, Bookmark, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RookFormFillPanel from '@/components/RookFormFillPanel';

// ── GM View ──────────────────────────────────────────────────────────────────

function GMHandoutsTab({ campaignId }) {
  const [handouts, setHandouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyHandoutDraft());
  const [sharing, setSharing] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyHandoutDraft());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get(`/campaigns/${campaignId}/handouts`),
      apiClient.get(`/campaigns/${campaignId}/handout-recipients`).catch(() => ({ data: { recipients: [] } })),
    ])
      .then(([handoutsRes, recipientsRes]) => {
        setHandouts(handoutsRes.data || []);
        setRecipients(recipientsRes.data?.recipients || []);
      })
      .catch(() => toast.error('Could not load handouts'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const create = async () => {
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    try {
      const r = await apiClient.post(`/campaigns/${campaignId}/handouts`, draft);
      setHandouts(prev => [r.data, ...prev]);
      setDraft(emptyHandoutDraft());
      setShowCreate(false);
      toast.success('Handout created');
    } catch { toast.error('Could not create handout'); }
  };

  const startEditing = (handout) => {
    setEditingId(handout.id);
    setEditDraft({
      title: handout.title || '',
      content: handout.content || '',
      category: handout.category || 'clue',
      image_url: handout.image_url || '',
      attachment_url: handout.attachment_url || handout.image_url || '',
      attachment_type: handout.attachment_type || (handout.image_url ? 'image/upload' : ''),
      attachment_name: handout.attachment_name || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(emptyHandoutDraft());
  };

  const saveEdit = async (handout) => {
    if (!editDraft.title.trim()) { toast.error('Title is required'); return; }
    try {
      const r = await apiClient.put(`/campaigns/${campaignId}/handouts/${handout.id}`, editDraft);
      setHandouts(prev => prev.map(h => h.id === handout.id ? { ...h, ...r.data } : h));
      cancelEditing();
      toast.success('Handout updated. Shared copies will show as unread again.');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update handout');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this handout?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/handouts/${id}`);
      setHandouts(prev => prev.filter(h => h.id !== id));
      toast.success('Handout deleted');
    } catch { toast.error('Could not delete handout'); }
  };

  const shareHandout = async (handout, recipientList = []) => {
    setSharing(handout.id);
    try {
      await apiClient.post(`/campaigns/${campaignId}/handouts/${handout.id}/share`, { recipients: recipientList });
      setHandouts(prev => prev.map(h => h.id === handout.id ? { ...h, shared_with: recipientList.length ? Array.from(new Set([...(h.shared_with || []), ...recipientList])) : ['everyone'] } : h));
      toast.success(recipientList.length ? `"${handout.title}" shared with ${recipientList.length} player(s)` : `"${handout.title}" shared with all players`);
    } catch (error) { toast.error(error?.response?.data?.detail || 'Could not share handout'); }
    finally { setSharing(null); }
  };

  const toggleRecipient = (handoutId, username) => {
    setSelectedRecipients(prev => {
      const current = new Set(prev[handoutId] || []);
      if (current.has(username)) current.delete(username);
      else current.add(username);
      return { ...prev, [handoutId]: Array.from(current) };
    });
  };

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading handouts…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16, color: '#fff', margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <BookOpen size={18} style={{ color: '#4a7dff' }} /> Handouts
        </h3>
        <Button onClick={() => setShowCreate(v => !v)} className="btn-primary" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', gap: 6 }}>
          <Plus size={14} /> New Handout
        </Button>
      </div>

      {showCreate && (
        <div className="glow-panel" style={{ padding: 14, borderColor: '#4a7dff' }}>
          <h4 style={{ color: '#4a7dff', fontSize: 13, marginBottom: 10 }}>New GM Handout</h4>
          <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }}>Create clues, item cards, equipment finds, letters, notes, maps, and visual reveals for players. Files are upload-only and can be PNG/JPG, PDF, or MP3/audio.</p>
          <RookFormFillPanel
            title="Ask Rook for a handout draft"
            helperText="Describe the clue, letter, rumor, or recap you need, then import the title/content into this handout."
            section="gm_handout"
            campaignId={campaignId}
            fields={[
              { name: 'title', label: 'Title', type: 'text' },
              { name: 'category', label: 'Handout Type', type: 'select', choices: ['clue', 'item', 'equipment', 'note', 'letter', 'map', 'lore'] },
              { name: 'content', label: 'Handout Content', type: 'textarea' },
            ]}
            currentValues={draft}
            onApply={(patch) => setDraft(prev => ({ ...prev, ...patch }))}
            placeholder="Example: Write a torn letter from the missing scout warning the party about the ruined watchtower..."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min(220px, 100%), 1fr) minmax(min(180px, 100%), 240px)', gap: 8 }}>
              <Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" className="input-glow" style={{ fontSize: 13 }} />
              <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={{ background: 'rgba(10,10,40,0.8)', border: '1px solid #1e40af', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 12 }}>
                <option value="clue">Clue</option>
                <option value="item">Item</option>
                <option value="equipment">Equipment</option>
                <option value="note">Note</option>
                <option value="letter">Letter</option>
                <option value="map">Map / Location</option>
                <option value="lore">Lore</option>
              </select>
            </div>
            <textarea
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="Handout content (clue, note, letter, map description…)"
              rows={4}
              style={{ width: '100%', background: 'rgba(10,10,40,0.8)', border: '1px solid #1e40af', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 12, resize: 'vertical' }}
            />
            <HandoutAttachmentPanel
              title="Attach handout file"
              helperText="Upload a PNG/JPG clue, PDF, map sheet, item card, or MP3/audio note. AI image generation is not available."
              value={draft}
              onChange={setDraft}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={create} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Save</Button>
              <Button onClick={() => setShowCreate(false)} className="btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {handouts.length === 0 && !showCreate && (
        <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
          <BookOpen size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 13 }}>No handouts yet. Create one to share clues, notes, or letters with your players.</p>
        </div>
      )}

      {handouts.map(h => (
        <div key={h.id} className="card-glow" style={{ padding: '10px 14px', borderColor: h.shared_with?.length ? '#22c55e' : '#1e40af' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', gap: 6, alignItems: 'center' }}>
                {h.title}
                <span style={{ fontSize: 10, background: 'rgba(74,125,255,0.12)', border: '1px solid rgba(74,125,255,0.35)', borderRadius: 999, padding: '1px 7px', color: '#bfdbfe', textTransform: 'capitalize' }}>{h.category || 'clue'}</span>
                {getAttachmentUrl(h) && <span title="Attachment included" style={{ display: 'inline-flex', alignItems: 'center', color: '#93c5fd' }}><ImageIcon size={12} /></span>}
                {h.shared_with?.length > 0 && (
                  <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: 4, padding: '1px 6px', color: '#22c55e' }}>
                    Shared
                  </span>
                )}
                {h.allow_player_sharing === false && (
                  <span style={{ fontSize: 10, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.32)', borderRadius: 999, padding: '1px 7px', color: '#cbd5e1' }}>
                    Re-share locked
                  </span>
                )}
              </div>
              {getAttachmentUrl(h) && <AttachmentPreview handout={h} compact />}
              {h.content && <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{h.content.slice(0, 200)}{h.content.length > 200 ? '…' : ''}</p>}
              {h.delivery_count > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#cbd5e1', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 999, padding: '2px 7px', background: 'rgba(34,197,94,0.08)' }}>
                    Read {h.read_count || 0}/{h.delivery_count}
                  </span>
                  {h.unread_count > 0 && <span style={{ fontSize: 10, color: '#fbbf24' }}>{h.unread_count} unread</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
              <button onClick={() => startEditing(h)} title="Edit handout" style={{ background: 'rgba(74,125,255,0.12)', border: '1px solid #4a7dff', borderRadius: 4, color: '#bfdbfe', cursor: 'pointer', padding: '4px 8px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}><Edit3 size={11} /> Edit</button>
              <button
                onClick={() => shareHandout(h, [])}
                disabled={sharing === h.id}
                title="Share with all players"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: 4, color: '#22c55e', cursor: 'pointer', padding: '4px 8px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}
              >
                <Send size={11} /> {sharing === h.id ? '…' : 'Share all'}
              </button>
              <button onClick={() => remove(h.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
            </div>
          </div>
          {editingId === h.id && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(74,125,255,0.35)', borderRadius: 8, background: 'rgba(15,23,42,0.65)' }}>
              <h4 style={{ color: '#bfdbfe', fontSize: 12, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Edit Handout</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min(220px, 100%), 1fr) minmax(min(180px, 100%), 240px)', gap: 8 }}>
                  <Input value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" className="input-glow" style={{ fontSize: 13 }} />
                  <select value={editDraft.category} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))} style={{ background: 'rgba(10,10,40,0.8)', border: '1px solid #1e40af', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 12 }}>
                    <option value="clue">Clue</option>
                    <option value="item">Item</option>
                    <option value="equipment">Equipment</option>
                    <option value="note">Note</option>
                    <option value="letter">Letter</option>
                    <option value="map">Map / Location</option>
                    <option value="lore">Lore</option>
                  </select>
                </div>
                <textarea
                  value={editDraft.content}
                  onChange={e => setEditDraft(d => ({ ...d, content: e.target.value }))}
                  placeholder="Handout content"
                  rows={4}
                  style={{ width: '100%', background: 'rgba(10,10,40,0.8)', border: '1px solid #1e40af', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 12, resize: 'vertical' }}
                />
                <HandoutAttachmentPanel
                  title="Update handout file"
                  helperText="Replace, keep, or clear the uploaded PNG/JPG, PDF, or audio note. Shared player copies update after saving."
                  value={editDraft}
                  onChange={setEditDraft}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button onClick={() => saveEdit(h)} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Save changes</Button>
                  <Button onClick={cancelEditing} className="btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
          {h.delivery_status?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {h.delivery_status.map(status => (
                <span key={status.username} title={status.read ? `Read ${status.read_at || ''}` : `Sent ${status.sent_at || ''}`} style={{ fontSize: 10, color: status.read ? '#bbf7d0' : '#cbd5e1', border: `1px solid ${status.read ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.25)'}`, borderRadius: 999, padding: '2px 7px', background: status.read ? 'rgba(34,197,94,0.08)' : 'rgba(148,163,184,0.07)' }}>
                  {status.username}: {status.read ? 'read' : 'unread'}
                </span>
              ))}
            </div>
          )}
          {recipients.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><Users size={12} /> Share with selected players</span>
                <button
                  type="button"
                  onClick={() => shareHandout(h, selectedRecipients[h.id] || [])}
                  disabled={sharing === h.id || !(selectedRecipients[h.id] || []).length}
                  style={{ background: 'rgba(74,125,255,0.12)', border: '1px solid #4a7dff', borderRadius: 4, color: '#bfdbfe', cursor: (selectedRecipients[h.id] || []).length ? 'pointer' : 'not-allowed', padding: '3px 8px', fontSize: 11 }}
                >
                  Share selected
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recipients.map(recipient => (
                  <label key={recipient.username} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#cbd5e1', fontSize: 11, border: '1px solid rgba(74,125,255,0.25)', borderRadius: 999, padding: '3px 8px', background: 'rgba(74,125,255,0.06)' }}>
                    <input
                      type="checkbox"
                      checked={(selectedRecipients[h.id] || []).includes(recipient.username)}
                      onChange={() => toggleRecipient(h.id, recipient.username)}
                    />
                    {recipient.character_name || recipient.display_name || recipient.username}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Player View ───────────────────────────────────────────────────────────────

function PlayerHandoutsPanel({ onSummaryChange } = {}) {
  const [handouts, setHandouts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [shareOptions, setShareOptions] = useState({});
  const [selectedShares, setSelectedShares] = useState({});
  const [sharingHandout, setSharingHandout] = useState(null);

  useEffect(() => {
    apiClient.get('/player/handouts')
      .then(r => setHandouts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    if (!onSummaryChange) return;
    onSummaryChange({
      total: handouts.length,
      unread: handouts.filter(handout => !handout.read).length,
      saved: handouts.filter(handout => handout.saved).length,
    });
  }, [handouts, onSummaryChange]);

  const markRead = async (handout) => {
    if (handout.read) return;
    try {
      await apiClient.patch(`/player/handouts/${handout.handout_id}/read`);
      setHandouts(prev => prev.map(h => h.handout_id === handout.handout_id ? { ...h, read: true } : h));
    } catch {}
  };

  const loadShareOptions = async (handout) => {
    if (shareOptions[handout.handout_id]) return;
    try {
      const response = await apiClient.get(`/player/handouts/${handout.handout_id}/share-options`);
      setShareOptions(prev => ({ ...prev, [handout.handout_id]: response.data?.recipients || [] }));
    } catch {}
  };

  const toggleSaved = async (handout, event) => {
    event.stopPropagation();
    const nextSaved = !handout.saved;
    try {
      await apiClient.patch(`/player/handouts/${handout.handout_id}/saved`, { saved: nextSaved });
      setHandouts(prev => prev.map(h => h.handout_id === handout.handout_id ? { ...h, saved: nextSaved } : h));
      toast.success(nextSaved ? 'Saved to your clue log' : 'Removed from saved clues');
    } catch {
      toast.error('Could not update saved handout');
    }
  };

  const toggleShareRecipient = (handoutId, username) => {
    setSelectedShares(prev => {
      const current = new Set(prev[handoutId] || []);
      if (current.has(username)) current.delete(username);
      else current.add(username);
      return { ...prev, [handoutId]: Array.from(current) };
    });
  };

  const shareWithPlayers = async (handout, event) => {
    event.stopPropagation();
    const recipients = selectedShares[handout.handout_id] || [];
    if (!recipients.length) {
      toast.info('Choose at least one player first');
      return;
    }
    setSharingHandout(handout.handout_id);
    try {
      await apiClient.post(`/player/handouts/${handout.handout_id}/share`, { recipients });
      setHandouts(prev => prev.map(h => h.handout_id === handout.handout_id ? { ...h, shared_with: Array.from(new Set([...(h.shared_with || []), ...recipients])) } : h));
      setSelectedShares(prev => ({ ...prev, [handout.handout_id]: [] }));
      toast.success(`Shared with ${recipients.length} player(s)`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not share handout');
    } finally {
      setSharingHandout(null);
    }
  };

  const handleExpand = (handout) => {
    const next = expanded === handout.id ? null : handout.id;
    setExpanded(next);
    markRead(handout);
    if (next) loadShareOptions(handout);
  };

  const unreadCount = handouts.filter(h => !h.read).length;
  const savedCount = handouts.filter(h => h.saved).length;

  if (loading) return null;
  if (handouts.length === 0) return (
    <div style={{ padding: 16, color: '#64748b', textAlign: 'center', fontSize: 12 }}>
      <Mail size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.4 }} />
      No handouts yet
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      {unreadCount > 0 && (
        <div className="rook-share-alert" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 10, background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(74,125,255,0.12))', color: '#f5f3ff' }}>
          <span style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(168,85,247,0.28)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>R</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900 }}>Rook found something new for you</div>
            <div style={{ fontSize: 11, color: '#ddd6fe' }}>A GM or player shared {unreadCount} handout{unreadCount === 1 ? '' : 's'}. Open one below to reveal it.</div>
          </div>
        </div>
      )}
      <h4 style={{ fontSize: 14, color: '#fff', margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Mail size={15} style={{ color: '#4a7dff' }} /> Handouts
        {unreadCount > 0 && (
          <span style={{ background: '#C1121F', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unreadCount} new</span>
        )}
        {savedCount > 0 && (
          <span style={{ background: 'rgba(74,125,255,0.16)', color: '#bfdbfe', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{savedCount} saved</span>
        )}
      </h4>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '2px 0 4px' }}>
        <Filter size={12} style={{ color: '#93c5fd' }} />
        {filterOptions.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => setActiveFilter(option.id)}
            style={{
              background: activeFilter === option.id ? 'rgba(168,85,247,0.24)' : 'rgba(15,23,42,0.72)',
              border: `1px solid ${activeFilter === option.id ? '#a855f7' : 'rgba(74,125,255,0.22)'}`,
              borderRadius: 999,
              color: activeFilter === option.id ? '#f5f3ff' : '#cbd5e1',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 800,
              padding: '4px 8px',
              textTransform: 'capitalize',
            }}
          >
            {option.label} {option.count > 0 ? `(${option.count})` : ''}
          </button>
        ))}
      </div>
      {visibleHandouts.length === 0 && (
        <div style={{ padding: 14, color: '#94a3b8', border: '1px dashed rgba(148,163,184,0.25)', borderRadius: 8, textAlign: 'center', fontSize: 12 }}>
          No handouts match this filter.
        </div>
      )}
      {visibleHandouts.map(h => (
        <div
          key={h.id}
          onClick={() => handleExpand(h)}
          className="card-glow"
          style={{ padding: '8px 12px', cursor: 'pointer', borderColor: !h.read ? '#4a7dff' : '#1e293b', background: !h.read ? 'rgba(74,125,255,0.06)' : 'rgba(10,10,40,0.6)' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {h.read ? <MailOpen size={13} style={{ color: '#64748b', flexShrink: 0 }} /> : <Mail size={13} style={{ color: '#4a7dff', flexShrink: 0 }} />}
            <span style={{ fontSize: 12, fontWeight: h.read ? 400 : 600, color: h.read ? '#94a3b8' : '#fff', flex: 1 }}>{h.title}</span>
            {h.category && <span style={{ fontSize: 9, color: '#bfdbfe', border: '1px solid rgba(74,125,255,0.25)', borderRadius: 999, padding: '1px 6px', textTransform: 'capitalize' }}>{h.category}</span>}
            {getAttachmentUrl(h) && <ImageIcon size={12} style={{ color: '#93c5fd', flexShrink: 0 }} />}
            {h.saved && <Bookmark size={12} style={{ color: '#fbbf24', fill: '#fbbf24', flexShrink: 0 }} />}
            {h.shared_by && <span style={{ fontSize: 9, color: '#bbf7d0' }}>from {h.shared_by}</span>}
          </div>
          {expanded === h.id && (h.content || getAttachmentUrl(h)) && (
            <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8 }}>
              {getAttachmentUrl(h) && <AttachmentPreview handout={h} />}
              {h.content && (
                <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {h.content}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }} onClick={(event) => event.stopPropagation()}>
                <button type="button" onClick={(event) => toggleSaved(h, event)} style={{ background: h.saved ? 'rgba(251,191,36,0.18)' : 'rgba(74,125,255,0.12)', border: `1px solid ${h.saved ? '#fbbf24' : '#4a7dff'}`, borderRadius: 4, color: h.saved ? '#fde68a' : '#bfdbfe', cursor: 'pointer', padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Bookmark size={12} /> {h.saved ? 'Saved' : 'Save clue'}
                </button>
                {(shareOptions[h.handout_id] || []).length > 0 && (
                  <button type="button" onClick={(event) => shareWithPlayers(h, event)} disabled={sharingHandout === h.handout_id || !(selectedShares[h.handout_id] || []).length} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', borderRadius: 4, color: '#bbf7d0', cursor: (selectedShares[h.handout_id] || []).length ? 'pointer' : 'not-allowed', padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Share2 size={12} /> {sharingHandout === h.handout_id ? 'Sharing…' : 'Share selected'}
                  </button>
                )}
              </div>
              {(shareOptions[h.handout_id] || []).length > 0 && (
                <div onClick={(event) => event.stopPropagation()} style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(shareOptions[h.handout_id] || []).map(recipient => (
                    <label key={recipient.username} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#cbd5e1', fontSize: 11, border: '1px solid rgba(74,125,255,0.25)', borderRadius: 999, padding: '3px 8px', background: 'rgba(74,125,255,0.06)' }}>
                      <input
                        type="checkbox"
                        checked={(selectedShares[h.handout_id] || []).includes(recipient.username)}
                        onChange={() => toggleShareRecipient(h.handout_id, recipient.username)}
                      />
                      {recipient.character_name || recipient.display_name || recipient.username}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


function emptyHandoutDraft() {
  return { title: '', content: '', category: 'clue', image_url: '', attachment_url: '', attachment_type: '', attachment_name: '' };
}

function getAttachmentUrl(handout) {
  return handout?.attachment_url || handout?.image_url || '';
}

function getAttachmentType(handout) {
  return handout?.attachment_type || (handout?.image_url ? 'image/upload' : '');
}

function HandoutAttachmentPanel({ title, helperText, value, onChange }) {
  const inputId = React.useId?.() || `handout-file-${Math.random().toString(36).slice(2)}`;
  const attachmentUrl = getAttachmentUrl(value);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('audio/');
    if (!allowed) { toast.error('Upload an image, PDF, or audio file'); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('File must be under 12MB'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(prev => ({
      ...prev,
      attachment_url: reader.result,
      attachment_type: file.type,
      attachment_name: file.name,
      image_url: file.type.startsWith('image/') ? reader.result : '',
    }));
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const clear = () => onChange(prev => ({ ...prev, attachment_url: '', attachment_type: '', attachment_name: '', image_url: '' }));

  return (
    <section style={{ background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(74,125,255,0.32)', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h4 style={{ margin: 0, color: '#fff', fontSize: 12, fontWeight: 900 }}>{title}</h4>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 11, lineHeight: 1.45 }}>{helperText}</p>
        </div>
        <label htmlFor={inputId} style={{ color: '#bfdbfe', border: '1px solid rgba(74,125,255,0.5)', borderRadius: 6, padding: '7px 10px', fontSize: 11, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>Upload file</label>
        <input id={inputId} type="file" accept="image/*,application/pdf,audio/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {attachmentUrl ? (
        <div>
          <AttachmentPreview handout={value} />
          <button type="button" onClick={clear} style={{ marginTop: 8, background: 'transparent', border: '1px solid rgba(239,68,68,0.55)', color: '#fecaca', borderRadius: 6, padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}>Clear attachment</button>
        </div>
      ) : (
        <div style={{ color: '#94a3b8', border: '1px dashed rgba(148,163,184,0.35)', borderRadius: 6, padding: 10, fontSize: 11 }}>No file attached yet</div>
      )}
    </section>
  );
}

function AttachmentPreview({ handout, compact = false }) {
  const url = getAttachmentUrl(handout);
  const type = getAttachmentType(handout);
  const name = handout?.attachment_name || 'Handout attachment';
  if (!url) return null;

  if (type.startsWith('audio/')) {
    return <audio controls src={url} style={{ width: '100%', marginTop: compact ? 8 : 0 }} />;
  }

  if (type === 'application/pdf') {
    return (
      <div style={{ marginTop: compact ? 8 : 0, border: '1px solid rgba(74,125,255,0.25)', borderRadius: 6, padding: 10, background: '#020617' }}>
        <strong style={{ display: 'block', color: '#bfdbfe', fontSize: 12 }}>{name}</strong>
        <a href={url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', fontSize: 12 }}>Open PDF</a>
      </div>
    );
  }

  return <img src={url} alt={name} style={compact ? { width: 96, height: 64, objectFit: 'cover', border: '1px solid rgba(74,125,255,0.35)', borderRadius: 6, marginTop: 8, display: 'block' } : { width: '100%', maxHeight: 320, objectFit: 'contain', border: '1px solid rgba(74,125,255,0.25)', borderRadius: 6, background: '#020617', marginBottom: handout?.content ? 8 : 0 }} />;
}

export { GMHandoutsTab, PlayerHandoutsPanel };
export default GMHandoutsTab;
