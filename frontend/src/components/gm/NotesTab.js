import React, { useState } from 'react';
import { Check, FileText, Send, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

export default function NotesTab({ theme = {}, campaignId, quickNote, setQuickNote, sessionNotes = [], setSessionNotes }) {
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [applyingId, setApplyingId] = useState('');

  const accent = theme?.accent?.gm || theme?.accent?.primary || '#d00000';
  const border = theme?.border || 'rgba(255,255,255,0.16)';
  const textPrimary = theme?.text?.primary || '#ffffff';
  const textSecondary = theme?.text?.secondary || 'rgba(255,255,255,0.74)';
  const textMuted = theme?.text?.muted || 'rgba(255,255,255,0.58)';
  const cardBg = theme?.bg?.card || '#3a3a3a';
  const panelBg = theme?.bg?.panel || '#2f2f2f';
  const inputBg = theme?.bg?.primary || '#242424';

  const checkSuggestions = async (content) => {
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/live-state/suggestions`, { content });
      setSuggestions(Array.isArray(response.data?.suggestions) ? response.data.suggestions : []);
    } catch {
      setSuggestions([]);
    }
  };

  const saveNote = async () => {
    const content = quickNote.trim();
    if (!content || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content });
      const note = { ...response.data, content };
      setSessionNotes?.(prev => [note, ...(Array.isArray(prev) ? prev : [])]);
      setQuickNote('');
      await checkSuggestions(content);
      toast.success('Note saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  const syncNoteToPlayers = async (note) => {
    if (!note?.content) return;
    try {
      await apiClient.post(`/campaigns/${campaignId}/sync-note`, {
        note_content: note.content,
        note_type: 'gm_note',
        title: 'Campaign Update',
        create_timeline_event: true,
      });
      toast.success('Note shared with campaign players');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not share note');
    }
  };

  const applySuggestion = async (suggestion) => {
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
      toast.success(suggestion.type === 'companion_add' ? `${suggestion.npc_name} marked as travelling with the party` : `${suggestion.npc_name} removed from travelling party`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not apply Rookie suggestion');
    } finally {
      setApplyingId('');
    }
  };

  const ignoreSuggestion = (suggestionId) => setSuggestions(prev => prev.filter(item => item.id !== suggestionId));

  return (
    <div data-testid="live-notes-panel" style={{ display: 'grid', gap: 9, color: textPrimary }}>
      <header style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `5px solid ${accent}`, padding: 11 }}>
        <p style={{ margin: 0, color: textMuted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Play</p>
        <h2 style={{ margin: '3px 0 0', color: textPrimary, fontSize: 21, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 7 }}><FileText size={20} /> Notes</h2>
      </header>

      <section style={{ background: panelBg, border: `1px solid ${border}`, padding: 10 }}>
        <textarea
          data-testid="live-quick-note"
          value={quickNote}
          onChange={event => setQuickNote(event.target.value)}
          onKeyDown={event => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              saveNote();
            }
          }}
          placeholder="What just changed? NPC choices, clues, rulings, loot…"
          style={{ minHeight: 100, width: '100%', boxSizing: 'border-box', background: inputBg, border: `1px solid ${border}`, color: textPrimary, padding: 10, resize: 'vertical', fontSize: 13 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" onClick={saveNote} disabled={saving || !quickNote.trim()} style={{ minHeight: 34, border: 0, background: accent, color: '#fff', padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer' }}>
            <Send size={14} /> {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </section>

      {suggestions.length > 0 && (
        <section data-testid="rookie-live-suggestions" style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: textMuted, fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rookie noticed</div>
          {suggestions.map(suggestion => (
            <article key={suggestion.id} style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `5px solid ${accent}`, padding: 9, display: 'grid', gap: 6 }}>
              <strong style={{ fontSize: 13, color: textPrimary }}>{suggestion.title}</strong>
              {(suggestion.affected_quest_titles?.length > 0 || suggestion.affected_encounter_ids?.length > 0) && (
                <span style={{ color: textMuted, fontSize: 10 }}>
                  This may affect {suggestion.affected_quest_titles?.length || 0} open quest{suggestion.affected_quest_titles?.length === 1 ? '' : 's'} and {suggestion.affected_encounter_ids?.length || 0} linked encounter{suggestion.affected_encounter_ids?.length === 1 ? '' : 's'}.
                </span>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" disabled={applyingId === suggestion.id} onClick={() => applySuggestion(suggestion)} style={{ minHeight: 30, border: 0, background: accent, color: '#fff', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 900 }}><Check size={13} /> Apply</button>
                <button type="button" onClick={() => ignoreSuggestion(suggestion.id)} style={{ minHeight: 30, border: `1px solid ${border}`, background: inputBg, color: textSecondary, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 900 }}><X size={13} /> Ignore</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section style={{ background: panelBg, border: `1px solid ${border}`, padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}>
          <strong style={{ fontSize: 12, color: textPrimary }}>Recent Notes</strong>
          <span style={{ fontSize: 10, color: textMuted }}>{sessionNotes.length}</span>
        </div>
        <div style={{ display: 'grid', gap: 5, maxHeight: 360, overflowY: 'auto' }}>
          {sessionNotes.length === 0 && <div style={{ padding: 14, color: textMuted, textAlign: 'center', fontSize: 11, background: inputBg }}>No notes yet.</div>}
          {sessionNotes.map(note => (
            <article key={note.id} style={{ background: inputBg, border: `1px solid ${border}`, padding: 8 }}>
              <div style={{ color: textMuted, fontSize: 9, marginBottom: 4 }}>{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</div>
              <div style={{ color: textPrimary, fontSize: 12, lineHeight: 1.4 }}>{note.content}</div>
              <button type="button" onClick={() => syncNoteToPlayers(note)} style={{ marginTop: 6, minHeight: 27, border: `1px solid ${border}`, background: cardBg, color: textSecondary, padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 850 }}><Users size={12} /> Share with Players</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
