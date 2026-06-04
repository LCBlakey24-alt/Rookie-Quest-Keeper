import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Clock, Edit, MapPin, Plus, Save, Search, Sparkles, Star, Swords, Tag, Trash2, User, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const theme = {
  primary: '#EF4444',
  hover: '#F87171',
  subtle: 'rgba(239, 68, 68, 0.14)',
  bg: '#1F1F23',
  card: '#27272B',
  panel: '#1F1F23',
  text: '#FFFFFF',
  textSecondary: '#D1D5DB',
  muted: '#9CA3AF',
  border: 'rgba(239, 68, 68, 0.28)',
};

const ENTRY_TYPES = [
  { id: 'session', label: 'Session Summary', icon: Calendar, color: '#EF4444' },
  { id: 'combat', label: 'Combat', icon: Swords, color: '#D97706' },
  { id: 'npc', label: 'NPC Met', icon: User, color: '#22C55E' },
  { id: 'location', label: 'Location', icon: MapPin, color: '#F59E0B' },
  { id: 'loot', label: 'Loot/Item', icon: Star, color: '#A855F7' },
  { id: 'note', label: 'Note', icon: BookOpen, color: '#6B7280' },
];

const TAG_PATTERNS = {
  combat: [/fight|fought|battle|attacked|killed|slain|defeated|ambush|initiative|damage|critical hit|hit points/i],
  loot: [/found|looted|treasure|gold|reward|potion|scroll|magic item|enchanted|discovered|chest/i],
  quest: [/quest|mission|task|objective|hired|asked us|promised|reward for|seek out|fetch|deliver/i],
  travel: [/traveled|journey|rode|sailed|walked|arrived|departed|camp|rest|road|path|bridge/i],
  social: [/talked|spoke|persuaded|intimidated|deceived|negotiated|bargained|charmed|befriended/i],
  danger: [/trap|poison|curse|disease|undead|demon|dragon|ambush|betrayed|warned/i],
  magic: [/spell|magic|ritual|arcane|divine|enchant|summon|portal|ward|rune/i],
  death: [/died|death|unconscious|down|killed|fallen|resurrection|revive/i],
  mystery: [/mysterious|clue|investigate|hidden|secret|riddle|puzzle|cryptic|ancient/i],
};

const TAG_COLORS = {
  combat: '#EF4444', loot: '#A855F7', quest: '#3B82F6', travel: '#22C55E',
  social: '#EC4899', danger: '#F59E0B', magic: '#6366F1', death: '#6B7280', mystery: '#8B5CF6',
};

const emptyEntry = { title: '', content: '', type: 'session', session_number: '', tags: [] };

function autoDetectTags(content, title) {
  const text = `${title || ''} ${content || ''}`.toLowerCase();
  return Object.entries(TAG_PATTERNS).filter(([, patterns]) => patterns.some(pattern => pattern.test(text))).map(([tag]) => tag);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SessionJournal({ characterId, campaignId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState({});
  const [newEntry, setNewEntry] = useState(emptyEntry);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = characterId ? { character_id: characterId } : { campaign_id: campaignId };
      const response = await apiClient.get('/player/journal', { params });
      setEntries(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load journal entries');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [characterId, campaignId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const updateNewEntry = (field, value) => {
    setNewEntry(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'content' || field === 'title') {
        const detected = autoDetectTags(updated.content, updated.title);
        const manualTags = (prev.tags || []).filter(tag => !Object.keys(TAG_PATTERNS).includes(tag));
        updated.tags = [...new Set([...detected, ...manualTags])];
      }
      return updated;
    });
  };

  const handleCreateEntry = async () => {
    if (!newEntry.title.trim()) return toast.error('Please enter a title');
    try {
      const payload = {
        ...newEntry,
        character_id: characterId,
        campaign_id: campaignId,
        session_number: newEntry.session_number ? parseInt(newEntry.session_number, 10) : null,
      };
      const response = await apiClient.post('/player/journal', payload);
      setEntries(prev => [response.data, ...prev]);
      setNewEntry(emptyEntry);
      setShowNewEntry(false);
      toast.success('Entry added');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to add entry');
    }
  };

  const handleUpdateEntry = async (id) => {
    const entry = entries.find(item => item.id === id);
    if (!entry) return;
    try {
      await apiClient.put(`/player/journal/${id}`, entry);
      setEditingId(null);
      toast.success('Entry updated');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to update entry');
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;
    try {
      await apiClient.delete(`/player/journal/${id}`);
      setEntries(prev => prev.filter(item => item.id !== id));
      toast.success('Entry deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete entry');
    }
  };

  const toggleExpanded = (id) => setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  const updateLocalEntry = (id, patch) => setEntries(prev => prev.map(entry => entry.id === id ? { ...entry, ...patch } : entry));

  const allTags = useMemo(() => {
    const tagSet = new Set();
    entries.forEach(entry => (entry.tags || []).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => entries.filter(entry => {
    const text = `${entry.title || ''} ${entry.content || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesTag = filterTag === 'all' || (entry.tags || []).includes(filterTag);
    return matchesSearch && matchesType && matchesTag;
  }), [entries, searchTerm, filterType, filterTag]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: theme.muted }}>Loading journal...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} data-testid="session-journal">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ color: theme.text, fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}><BookOpen size={26} color={theme.primary} /> Session Journal</h2>
          <p style={{ color: theme.textSecondary, fontSize: 14, margin: '4px 0 0' }}>Track adventures, NPCs, loot and memorable moments.</p>
        </div>
        <button onClick={() => setShowNewEntry(true)} data-testid="new-journal-entry-btn" style={primaryButton}><Plus size={17} /> New Entry</button>
      </header>

      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={searchBox}><Search size={17} color={theme.muted} /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} data-testid="journal-search" placeholder="Search entries..." style={inputBare} /></div>
        <select value={filterType} onChange={event => setFilterType(event.target.value)} data-testid="journal-filter" style={selectStyle}><option value="all">All Types</option>{ENTRY_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select>
      </section>

      {allTags.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><TagChip active={filterTag === 'all'} label="All Tags" onClick={() => setFilterTag('all')} />{allTags.map(tag => <TagChip key={tag} active={filterTag === tag} label={tag} color={TAG_COLORS[tag]} onClick={() => setFilterTag(filterTag === tag ? 'all' : tag)} />)}</div>}

      {showNewEntry && <section style={panelStyle}>
        <h3 style={panelTitle}>New Journal Entry</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>{ENTRY_TYPES.map(type => <button key={type.id} onClick={() => setNewEntry(prev => ({ ...prev, type: type.id }))} style={typeButton(newEntry.type === type.id, type.color)}><type.icon size={14} /> {type.label}</button>)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 10, marginBottom: 10 }}><input data-testid="journal-title-input" value={newEntry.title} onChange={event => updateNewEntry('title', event.target.value)} placeholder="Entry title..." style={fieldStyle} /><input type="number" value={newEntry.session_number} onChange={event => setNewEntry(prev => ({ ...prev, session_number: event.target.value }))} placeholder="Session #" style={fieldStyle} /></div>
        <textarea data-testid="journal-content-input" value={newEntry.content} onChange={event => updateNewEntry('content', event.target.value)} placeholder="Write your entry..." style={textareaStyle} />
        {newEntry.tags.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}><Sparkles size={14} color={theme.primary} />{newEntry.tags.map(tag => <span key={tag} style={tagStyle(TAG_COLORS[tag])}>{tag}</span>)}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}><button onClick={() => setShowNewEntry(false)} style={secondaryButton}><X size={15} /> Cancel</button><button onClick={handleCreateEntry} data-testid="save-journal-entry-btn" style={primaryButton}><Save size={15} /> Save Entry</button></div>
      </section>}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredEntries.length === 0 ? <div style={emptyStyle}><BookOpen size={42} color={theme.muted} /><h3>No Journal Entries Yet</h3><p>Start documenting the adventure with New Entry.</p></div> : filteredEntries.map(entry => <JournalEntry key={entry.id} entry={entry} expanded={!!expandedEntries[entry.id]} editing={editingId === entry.id} onToggle={() => toggleExpanded(entry.id)} onEdit={() => setEditingId(entry.id)} onCancel={() => setEditingId(null)} onSave={() => handleUpdateEntry(entry.id)} onDelete={() => handleDeleteEntry(entry.id)} onChange={patch => updateLocalEntry(entry.id, patch)} />)}
      </section>
    </div>
  );
}

function TagChip({ label, color = theme.primary, active, onClick }) {
  return <button onClick={onClick} style={{ padding: '5px 10px', borderRadius: 12, fontSize: 11, background: active ? color : `${color}20`, border: `1px solid ${color}`, color: active ? '#FFFFFF' : color, cursor: 'pointer', fontWeight: 800 }}><Tag size={10} style={{ marginRight: 4 }} />{label}</button>;
}

function JournalEntry({ entry, expanded, editing, onToggle, onEdit, onCancel, onSave, onDelete, onChange }) {
  const typeConfig = ENTRY_TYPES.find(type => type.id === entry.type) || ENTRY_TYPES[5];
  const TypeIcon = typeConfig.icon;
  return <article data-testid={`journal-entry-${entry.id}`} style={entryStyle}>
    <div onClick={() => !editing && onToggle()} style={{ padding: 14, cursor: editing ? 'default' : 'pointer', display: 'flex', gap: 12 }}>
      <div style={{ padding: 10, background: `${typeConfig.color}22`, height: 42 }}><TypeIcon size={20} color={typeConfig.color} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{expanded ? <ChevronDown size={16} color={theme.muted} /> : <ChevronRight size={16} color={theme.muted} />}<h4 style={{ color: theme.text, margin: 0, fontSize: 16 }}>{entry.title}</h4>{entry.session_number && <span style={smallBadge}>Session {entry.session_number}</span>}</div>
        <div style={{ display: 'flex', gap: 10, color: theme.muted, fontSize: 12, marginTop: 5 }}><span><Clock size={12} /> {formatDate(entry.created_at)}</span><span style={{ color: typeConfig.color }}>{typeConfig.label}</span></div>
        {(entry.tags || []).length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>{entry.tags.map(tag => <span key={tag} style={tagStyle(TAG_COLORS[tag])}>{tag}</span>)}</div>}
        {expanded && <div style={{ marginTop: 12 }}>{editing ? <textarea value={entry.content || ''} onChange={event => onChange({ content: event.target.value })} style={textareaStyle} /> : <p style={{ color: theme.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.content || 'No content'}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{editing ? <><button onClick={event => { event.stopPropagation(); onCancel(); }} style={secondaryButton}>Cancel</button><button onClick={event => { event.stopPropagation(); onSave(); }} style={primaryButton}><Save size={14} /> Save</button></> : <><button onClick={event => { event.stopPropagation(); onEdit(); }} style={secondaryButton}><Edit size={14} /> Edit</button><button onClick={event => { event.stopPropagation(); onDelete(); }} style={dangerButton}><Trash2 size={14} /> Delete</button></>}</div></div>}
      </div>
    </div>
  </article>;
}

const panelStyle = { background: theme.panel, border: `1px solid ${theme.border}`, padding: 16 };
const panelTitle = { color: theme.primary, margin: '0 0 12px', fontSize: 18 };
const searchBox = { flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: theme.card, border: `1px solid ${theme.border}` };
const inputBare = { flex: 1, background: 'none', border: 'none', color: theme.text, outline: 'none' };
const selectStyle = { background: theme.card, border: `1px solid ${theme.border}`, color: theme.text, padding: '10px 12px' };
const fieldStyle = { background: theme.card, border: `1px solid ${theme.border}`, color: theme.text, padding: 10, outline: 'none' };
const textareaStyle = { width: '100%', minHeight: 130, background: theme.card, border: `1px solid ${theme.border}`, color: theme.text, padding: 10, resize: 'vertical', outline: 'none' };
const primaryButton = { display: 'inline-flex', alignItems: 'center', gap: 7, background: theme.primary, border: 'none', color: '#FFFFFF', padding: '10px 13px', cursor: 'pointer', fontWeight: 900 };
const secondaryButton = { display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary, padding: '9px 12px', cursor: 'pointer' };
const dangerButton = { display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px solid #D97706', color: '#D97706', padding: '9px 12px', cursor: 'pointer' };
const emptyStyle = { padding: 40, textAlign: 'center', background: theme.card, border: `1px dashed ${theme.border}`, color: theme.muted };
const entryStyle = { background: theme.card, border: `1px solid ${theme.border}` };
const smallBadge = { padding: '2px 8px', background: theme.subtle, color: theme.primary, fontSize: 12 };
const tagStyle = color => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: `${color || theme.primary}20`, border: `1px solid ${color || theme.primary}`, color: color || theme.primary });
const typeButton = (active, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', background: active ? color : theme.card, border: `1px solid ${color}`, color: '#FFFFFF', cursor: 'pointer' });

export default SessionJournal;
