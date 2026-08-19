import React, { useCallback, useEffect, useState } from 'react';
import { Check, FileText, RefreshCw, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#fff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

export default function GMNotesWorkspace({ campaignId }) {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState('');

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/ingame-notes`);
      setNotes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load notes');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const checkSuggestions = async content => {
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/live-state/suggestions`, { content });
      setSuggestions(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
    } catch {
      setSuggestions([]);
    }
  };

  const saveNote = async () => {
    const content = draft.trim();
    if (!content || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content });
      setNotes(prev => [{ ...response.data, content }, ...prev]);
      setDraft('');
      await checkSuggestions(content);
      toast.success('Note saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  const applySuggestion = async suggestion => {
    if (!suggestion?.npc_id) return;
    setApplyingId(suggestion.id);
    try {
      const stateRes = await apiClient.get(`/campaigns/${campaignId}/live-state`);
      const current = Array.isArray(stateRes.data?.companion_npc_ids) ? stateRes.data.companion_npc_ids : [];
      const next = suggestion.type === 'companion_add'
        ? [...new Set([...current, suggestion.npc_id])]
        : current.filter(id => id !== suggestion.npc_id);
      await apiClient.put(`/campaigns/${campaignId}/live-state`, { companion_npc_ids: next });
      setSuggestions(prev => prev.filter(item => item.id !== suggestion.id));
      toast.success(suggestion.type === 'companion_add'
        ? `${suggestion.npc_name} marked as travelling with the party`
        : `${suggestion.npc_name} removed from travelling party`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not apply Rookie suggestion');
    } finally {
      setApplyingId('');
    }
  };

  const removeNote = async noteId => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/ingame-notes/${noteId}`);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete note');
    }
  };

  return (
    <section data-testid="gm-notes-workspace" style={shellStyle}>
      <div style={composerStyle}>
        <textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              saveNote();
            }
          }}
          placeholder="What happened? Decisions, clues, NPC changes, rulings, loose ideas…"
          style={textareaStyle}
        />
        <div style={composerFooterStyle}>
          <span style={hintStyle}>Ctrl/Cmd + Enter to save</span>
          <button type="button" onClick={saveNote} disabled={saving || !draft.trim()} style={primaryButtonStyle}><Send size={14} /> {saving ? 'Saving…' : 'Save Note'}</button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <section style={suggestionListStyle}>
          <strong style={sectionLabelStyle}>Rookie noticed</strong>
          {suggestions.map(suggestion => (
            <article key={suggestion.id} style={suggestionStyle}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong style={suggestionTitleStyle}>{suggestion.title}</strong>
                {(suggestion.affected_quest_titles?.length > 0 || suggestion.affected_encounter_ids?.length > 0) && (
                  <small style={suggestionMetaStyle}>
                    {suggestion.affected_quest_titles?.length || 0} open quest{suggestion.affected_quest_titles?.length === 1 ? '' : 's'} · {suggestion.affected_encounter_ids?.length || 0} linked encounter{suggestion.affected_encounter_ids?.length === 1 ? '' : 's'}
                  </small>
                )}
              </span>
              <button type="button" disabled={applyingId === suggestion.id} onClick={() => applySuggestion(suggestion)} style={applyButtonStyle}><Check size={13} /> Apply</button>
              <button type="button" onClick={() => setSuggestions(prev => prev.filter(item => item.id !== suggestion.id))} style={iconButtonStyle} title="Ignore"><X size={13} /></button>
            </article>
          ))}
        </section>
      )}

      <div style={listHeaderStyle}>
        <span style={listTitleStyle}><FileText size={14} /> Notes <small>{notes.length}</small></span>
        <button type="button" onClick={load} disabled={loading} style={smallButtonStyle}><RefreshCw size={13} /> Refresh</button>
      </div>

      {loading ? (
        <div style={emptyStyle}>Loading notes…</div>
      ) : notes.length === 0 ? (
        <div style={emptyStyle}>No notes yet.</div>
      ) : (
        <div style={notesStyle}>
          {notes.map(note => (
            <article key={note.id} style={noteStyle}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <small style={dateStyle}>{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</small>
                <p style={noteTextStyle}>{note.content}</p>
              </span>
              <button type="button" onClick={() => removeNote(note.id)} style={deleteButtonStyle} title="Delete note"><Trash2 size={13} /></button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, color: rq.text, fontFamily: fontStack };
const composerStyle = { background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}`, padding: 8 };
const textareaStyle = { width: '100%', minHeight: 120, boxSizing: 'border-box', resize: 'vertical', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: 9, fontFamily: fontStack, fontSize: 12, lineHeight: 1.45, outline: 0 };
const composerFooterStyle = { marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const hintStyle = { color: rq.muted, fontSize: 9 };
const primaryButtonStyle = { minHeight: 34, border: 0, background: rq.red, color: '#fff', padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 950, cursor: 'pointer' };
const suggestionListStyle = { display: 'grid', gap: 5 };
const sectionLabelStyle = { color: rq.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em' };
const suggestionStyle = { display: 'flex', alignItems: 'center', gap: 6, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}`, padding: 7 };
const suggestionTitleStyle = { display: 'block', fontSize: 11 };
const suggestionMetaStyle = { display: 'block', color: rq.muted, marginTop: 2, fontSize: 9 };
const applyButtonStyle = { minHeight: 30, border: 0, background: rq.red, color: '#fff', padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10, fontWeight: 900 };
const iconButtonStyle = { width: 30, height: 30, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const listHeaderStyle = { minHeight: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: rq.panel, border: `1px solid ${rq.line}`, padding: '0 8px' };
const listTitleStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 950 };
const smallButtonStyle = { minHeight: 28, border: `1px solid ${rq.line}`, background: rq.card, color: rq.soft, padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 9, fontWeight: 850 };
const notesStyle = { display: 'grid', gap: 4 };
const noteStyle = { display: 'flex', alignItems: 'flex-start', gap: 7, background: rq.card, border: `1px solid ${rq.line}`, padding: 8 };
const dateStyle = { display: 'block', color: rq.muted, fontSize: 8, marginBottom: 3 };
const noteTextStyle = { margin: 0, color: rq.soft, fontSize: 11, lineHeight: 1.4, whiteSpace: 'pre-wrap' };
const deleteButtonStyle = { width: 29, height: 29, flex: '0 0 29px', border: `1px solid ${rq.line}`, background: rq.bg, color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const emptyStyle = { minHeight: 80, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, fontSize: 10 };
