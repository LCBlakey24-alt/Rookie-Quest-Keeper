import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Plus, Trash2, Send, BookOpen, Mail, MailOpen, Users, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── GM View ──────────────────────────────────────────────────────────────────

function GMHandoutsTab({ campaignId }) {
  const [handouts, setHandouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    apiClient.get(`/campaigns/${campaignId}/handouts`)
      .then(r => setHandouts(r.data || []))
      .catch(() => toast.error('Could not load handouts'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const create = async () => {
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    try {
      const r = await apiClient.post(`/campaigns/${campaignId}/handouts`, draft);
      setHandouts(prev => [r.data, ...prev]);
      setDraft({ title: '', content: '' });
      setShowCreate(false);
      toast.success('Handout created');
    } catch { toast.error('Could not create handout'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this handout?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/handouts/${id}`);
      setHandouts(prev => prev.filter(h => h.id !== id));
      toast.success('Handout deleted');
    } catch { toast.error('Could not delete handout'); }
  };

  const shareAll = async (handout) => {
    setSharing(handout.id);
    try {
      await apiClient.post(`/campaigns/${campaignId}/handouts/${handout.id}/share`, { recipients: [] });
      setHandouts(prev => prev.map(h => h.id === handout.id ? { ...h, shared_with: ['everyone'] } : h));
      toast.success(`"${handout.title}" shared with all players`);
    } catch { toast.error('Could not share handout'); }
    finally { setSharing(null); }
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
          <h4 style={{ color: '#4a7dff', fontSize: 13, marginBottom: 10 }}>New Handout</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" className="input-glow" style={{ fontSize: 13 }} />
            <textarea
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="Handout content (clue, note, letter, map description…)"
              rows={4}
              style={{ width: '100%', background: 'rgba(10,10,40,0.8)', border: '1px solid #1e40af', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 12, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
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
                {h.shared_with?.length > 0 && (
                  <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: 4, padding: '1px 6px', color: '#22c55e' }}>
                    Shared
                  </span>
                )}
              </div>
              {h.content && <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{h.content.slice(0, 200)}{h.content.length > 200 ? '…' : ''}</p>}
            </div>
            <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
              <button
                onClick={() => shareAll(h)}
                disabled={sharing === h.id}
                title="Share with all players"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: 4, color: '#22c55e', cursor: 'pointer', padding: '4px 8px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}
              >
                <Send size={11} /> {sharing === h.id ? '…' : 'Share'}
              </button>
              <button onClick={() => remove(h.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Player View ───────────────────────────────────────────────────────────────

function PlayerHandoutsPanel() {
  const [handouts, setHandouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    apiClient.get('/player/handouts')
      .then(r => setHandouts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (handout) => {
    if (handout.read) return;
    try {
      await apiClient.patch(`/player/handouts/${handout.handout_id}/read`);
      setHandouts(prev => prev.map(h => h.handout_id === handout.handout_id ? { ...h, read: true } : h));
    } catch {}
  };

  const unreadCount = handouts.filter(h => !h.read).length;

  if (loading) return null;
  if (handouts.length === 0) return (
    <div style={{ padding: 16, color: '#64748b', textAlign: 'center', fontSize: 12 }}>
      <Mail size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.4 }} />
      No handouts yet
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      <h4 style={{ fontSize: 14, color: '#fff', margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Mail size={15} style={{ color: '#4a7dff' }} /> Handouts
        {unreadCount > 0 && (
          <span style={{ background: '#C1121F', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unreadCount} new</span>
        )}
      </h4>
      {handouts.map(h => (
        <div
          key={h.id}
          onClick={() => { setExpanded(expanded === h.id ? null : h.id); markRead(h); }}
          className="card-glow"
          style={{ padding: '8px 12px', cursor: 'pointer', borderColor: !h.read ? '#4a7dff' : '#1e293b', background: !h.read ? 'rgba(74,125,255,0.06)' : 'rgba(10,10,40,0.6)' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {h.read ? <MailOpen size={13} style={{ color: '#64748b', flexShrink: 0 }} /> : <Mail size={13} style={{ color: '#4a7dff', flexShrink: 0 }} />}
            <span style={{ fontSize: 12, fontWeight: h.read ? 400 : 600, color: h.read ? '#94a3b8' : '#fff', flex: 1 }}>{h.title}</span>
          </div>
          {expanded === h.id && h.content && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1', whiteSpace: 'pre-wrap', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, lineHeight: 1.6 }}>
              {h.content}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export { GMHandoutsTab, PlayerHandoutsPanel };
export default GMHandoutsTab;
