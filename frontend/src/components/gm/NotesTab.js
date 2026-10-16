import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Edit3, FileText, Search, Send, Swords, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { persistLivePlayHandoff } from '@/lib/livePlayHandoffs';

export default function NotesTab({ theme = {}, campaignId, quickNote, setQuickNote, sessionNotes = [], setSessionNotes }) {
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [applyingId, setApplyingId] = useState('');
  const [category, setCategory] = useState('Session');
  const [search, setSearch] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`gm.pinnedSessionNotes.${campaignId}`) || '[]'); }
    catch { return []; }
  });
  const noteCategories = ['Session', 'NPC', 'Quest', 'Combat', 'Loot', 'Ruling', 'Secret'];
  const draftKey = `gm.liveNoteDraft.${campaignId}`;
  const filteredNotes = (Array.isArray(sessionNotes) ? sessionNotes : [])
    .filter(note => (!search.trim() || String(note.content || '').toLowerCase().includes(search.trim().toLowerCase())
      || String(note.category || '').toLowerCase().includes(search.trim().toLowerCase()))
      && (!onlyPinned || pinnedIds.includes(String(note.id))))
    .sort((a, b) => Number(pinnedIds.includes(String(b.id))) - Number(pinnedIds.includes(String(a.id))));

  const accent = theme?.accent?.gm || theme?.accent?.primary || '#d00000';
  const border = theme?.border || 'rgba(255,255,255,0.16)';
  const textPrimary = theme?.text?.primary || '#ffffff';
  const textSecondary = theme?.text?.secondary || 'rgba(255,255,255,0.74)';
  const textMuted = theme?.text?.muted || 'rgba(255,255,255,0.58)';
  const cardBg = theme?.bg?.card || '#3a3a3a';
  const panelBg = theme?.bg?.panel || '#2f2f2f';
  const inputBg = theme?.bg?.primary || '#242424';

  useEffect(() => {
    try {
      const key = `gm.liveNotePrefill.${campaignId}`;
      const prefill = localStorage.getItem(key) || '';
      if (prefill && setQuickNote) {
        setQuickNote(prev => String(prev || '').trim() ? `${prev}\n${prefill}` : prefill);
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }, [campaignId, setQuickNote]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setQuickNote?.(prev => String(prev || '').trim() ? prev : saved);
    } catch { /* Draft recovery is best-effort. */ }
  }, [draftKey, setQuickNote]);

  useEffect(() => {
    try {
      if (quickNote) localStorage.setItem(draftKey, quickNote.slice(0, 50000));
      else localStorage.removeItem(draftKey);
    } catch { /* Saving the draft is optional; explicit notes still work. */ }
  }, [draftKey, quickNote]);

  useEffect(() => {
    try { localStorage.setItem(`gm.pinnedSessionNotes.${campaignId}`, JSON.stringify(pinnedIds)); }
    catch { /* The note remains available even if this preference is lost. */ }
  }, [campaignId, pinnedIds]);

  const togglePinned = noteId => setPinnedIds(prev => {
    const id = String(noteId);
    return prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id];
  });

  const updateNote = async () => {
    if (!editingId || !editedContent.trim()) return;
    setSaving(true);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/ingame-notes/${editingId}`, { content: editedContent.trim() });
      setSessionNotes?.(prev => prev.map(note => String(note.id) === String(editingId) ? { ...note, ...response.data, content: editedContent.trim() } : note));
      setEditingId('');
      toast.success('Note updated');
    } catch (error) { toast.error(error?.response?.data?.detail || 'Could not update note'); }
    finally { setSaving(false); }
  };

  const removeNote = async note => {
    if (!window.confirm('Delete this saved GM note?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/ingame-notes/${note.id}`);
      setSessionNotes?.(prev => prev.filter(entry => String(entry.id) !== String(note.id)));
      setPinnedIds(prev => prev.filter(id => id !== String(note.id)));
      toast.success('Note deleted');
    } catch (error) { toast.error(error?.response?.data?.detail || 'Could not delete note'); }
  };

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
      const response = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content, category, is_private: true });
      const note = { ...response.data, content, category, is_private: true };
      setSessionNotes?.(prev => [note, ...(Array.isArray(prev) ? prev : [])]);
      setQuickNote('');
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      await checkSuggestions(content);
      toast.success('Note saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  const syncNoteToPlayers = async (note) => {
    if (!note?.content || window.rookieDesktop?.offline) return;
    if (!window.confirm('Share this note with your players? GM secrets must stay private.')) return;
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

  const openSuggestedEncounter = (suggestion) => {
    const encounterId = suggestion?.suggested_encounter_id;
    if (!encounterId) return false;
    if (!persistLivePlayHandoff(localStorage, `gm.questEncounter.${campaignId}`, encounterId)) {
      toast.error('Could not prepare the linked encounter');
      return false;
    }
    if (typeof document === 'undefined') return false;
    const combatButton = document.querySelector('[data-testid="live-tool-combat"]');
    if (!combatButton?.click) {
      toast.error('Encounter Review is unavailable right now');
      return false;
    }
    combatButton.click();
    return true;
  };

  const applySuggestion = async (suggestion, reviewEncounter = false) => {
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

      if (reviewEncounter && suggestion.suggested_encounter_id) {
        const opened = openSuggestedEncounter(suggestion);
        if (opened) {
          toast.success(`${suggestion.npc_name} added to travelling party`, { description: `Reviewing ${suggestion.suggested_encounter_name || 'the next linked encounter'}.` });
        } else {
          toast.warning(`${suggestion.npc_name} was added to the travelling party`, { description: 'The encounter handoff could not be opened, so no encounter selection was assumed.' });
        }
      } else {
        toast.success(suggestion.type === 'companion_add' ? `${suggestion.npc_name} marked as travelling with the party` : `${suggestion.npc_name} removed from travelling party`);
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not apply Rookie suggestion');
    } finally {
      setApplyingId('');
    }
  };

  const ignoreSuggestion = (suggestionId) => setSuggestions(prev => prev.filter(item => item.id !== suggestionId));

  const noteActionStyle = { minHeight: 30, border: `1px solid ${border}`, background: cardBg, color: textSecondary, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 800 };

  return (
    <div data-testid="live-notes-panel" style={{ display: 'grid', gap: 9, color: textPrimary }}>
      <header style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `5px solid ${accent}`, padding: 11 }}>
        <p style={{ margin: 0, color: textMuted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Play</p>
        <h2 style={{ margin: '3px 0 0', color: textPrimary, fontSize: 21, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 7 }}><FileText size={20} /> Session Ledger</h2>
        <p style={{ color: textSecondary, fontSize: 12, margin: '6px 0 0' }}>Fast GM notes, searchable history and recoverable drafts. Nothing is sent to the player display unless you explicitly share it online.</p>
      </header>

      <section style={{ background: panelBg, border: `1px solid ${border}`, padding: 10 }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 9 }}><strong style={{ fontSize: 12 }}>Capture a moment</strong><label style={{ fontSize: 12, color: textSecondary }}>Category <select aria-label="Note category" value={category} onChange={event => setCategory(event.target.value)} style={{ marginLeft: 5, minHeight: 32, background: inputBg, color: textPrimary, border: `1px solid ${border}`, padding: '0 8px' }}>{noteCategories.map(name => <option key={name}>{name}</option>)}</select></label></div>
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
          style={{ minHeight: 160, width: '100%', boxSizing: 'border-box', background: inputBg, border: `1px solid ${border}`, color: textPrimary, padding: 12, resize: 'vertical', fontSize: 14, lineHeight: 1.55 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <small style={{ color: textMuted }}>Draft kept on this laptop · Ctrl/⌘ + Enter saves</small>
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
              {suggestion.type === 'companion_add' && suggestion.suggested_encounter_name && (
                <span style={{ color: textSecondary, fontSize: 11 }}>
                  Next linked encounter: <strong style={{ color: textPrimary }}>{suggestion.suggested_encounter_name}</strong>
                </span>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggestion.type === 'companion_add' && suggestion.suggested_encounter_id && (
                  <button type="button" disabled={applyingId === suggestion.id} onClick={() => applySuggestion(suggestion, true)} style={{ minHeight: 30, border: 0, background: accent, color: '#fff', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 900 }}><Swords size={13} /> Apply & Review Encounter</button>
                )}
                <button type="button" disabled={applyingId === suggestion.id} onClick={() => applySuggestion(suggestion)} style={{ minHeight: 30, border: `1px solid ${border}`, background: inputBg, color: textPrimary, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 900 }}><Check size={13} /> Apply</button>
                <button type="button" onClick={() => ignoreSuggestion(suggestion.id)} style={{ minHeight: 30, border: `1px solid ${border}`, background: inputBg, color: textSecondary, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 900 }}><X size={13} /> Ignore</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section style={{ background: panelBg, border: `1px solid ${border}`, padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}>
          <strong style={{ fontSize: 13, color: textPrimary }}>Your campaign notes</strong>
          <span style={{ fontSize: 11, color: textMuted }}>{filteredNotes.length} shown / {sessionNotes.length} saved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}><label style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 6, padding: '0 9px', border: `1px solid ${border}`, background: inputBg }}><Search size={15} /><input aria-label="Search saved notes" placeholder="Search your notes…" value={search} onChange={event => setSearch(event.target.value)} style={{ flex: 1, minWidth: 100, border: 0, background: 'transparent', color: textPrimary, minHeight: 36, outline: 0 }} /></label><label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 12 }}><input type="checkbox" checked={onlyPinned} onChange={event => setOnlyPinned(event.target.checked)} /> Pinned only</label></div>
        <div style={{ display: 'grid', gap: 7, maxHeight: 'min(62vh, 600px)', overflowY: 'auto' }}>
          {filteredNotes.length === 0 && <div style={{ padding: 14, color: textMuted, textAlign: 'center', fontSize: 12, background: inputBg }}>{sessionNotes.length ? 'No matching notes.' : 'No saved notes yet. Start with the quick capture box above.'}</div>}
          {filteredNotes.map(note => (
            <article key={note.id} style={{ background: inputBg, border: `1px solid ${border}`, padding: 8 }}>
              <div style={{ color: textMuted, fontSize: 10, marginBottom: 7, display: 'flex', justifyContent: 'space-between' }}><span>{note.created_at ? new Date(note.created_at).toLocaleString() : 'Saved note'} · {note.category || 'Session'}</span>{pinnedIds.includes(String(note.id)) && <span>★ Pinned</span>}</div>
              {String(editingId) === String(note.id) ? <textarea aria-label="Edit saved note" value={editedContent} onChange={event => setEditedContent(event.target.value)} style={{ width: '100%', minHeight: 110, boxSizing: 'border-box', background: cardBg, color: textPrimary, border: `1px solid ${border}`, padding: 9 }} /> : <div style={{ color: textPrimary, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{note.content}</div>}
              <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" aria-label={`Pin ${note.id}`} onClick={() => togglePinned(note.id)} style={{ ...noteActionStyle, color: pinnedIds.includes(String(note.id)) ? '#c9a96b' : textSecondary }}><Bookmark size={13} /> {pinnedIds.includes(String(note.id)) ? 'Unpin' : 'Pin'}</button>
                {String(editingId) === String(note.id) ? <><button type="button" onClick={updateNote} disabled={saving || !editedContent.trim()} style={noteActionStyle}><Check size={13} /> Save edit</button><button type="button" onClick={() => setEditingId('')} style={noteActionStyle}><X size={13} /> Cancel</button></> : <button type="button" onClick={() => { setEditingId(String(note.id)); setEditedContent(String(note.content || '')); }} style={noteActionStyle}><Edit3 size={13} /> Edit</button>}
                <button type="button" onClick={() => removeNote(note)} style={noteActionStyle}><Trash2 size={13} /> Delete</button>
                {!window.rookieDesktop?.offline && <button type="button" onClick={() => syncNoteToPlayers(note)} style={noteActionStyle}><Users size={12} /> Share with Players</button>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
