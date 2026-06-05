import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Tag, Calendar, Clock, Sparkles, 
  ChevronDown, ChevronRight, Plus, Trash2, Edit2, Save, X,
  MessageSquare, Bookmark, Star, Filter
} from 'lucide-react';
import apiClient from '@/lib/apiClient';


// Tag colors for categorization
const TAG_COLORS = {
  combat: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  npc: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  lore: { bg: 'rgba(212, 160, 23, 0.2)', color: '#D4A017', border: 'rgba(212, 160, 23, 0.3)' },
  location: { bg: 'rgba(212, 160, 23, 0.2)', color: '#4DD0E1', border: 'rgba(212, 160, 23, 0.3)' },
  quest: { bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  player: { bg: 'rgba(236, 72, 153, 0.2)', color: '#4DD0E1', border: 'rgba(236, 72, 153, 0.3)' },
  important: { bg: 'rgba(255, 0, 0, 0.2)', color: '#ff0000', border: 'rgba(255, 0, 0, 0.3)' },
  custom: { bg: 'rgba(100, 100, 100, 0.2)', color: '#888888', border: 'rgba(100, 100, 100, 0.3)' }
};

export default function SmartSessionLog({ theme, campaignId, onGenerateRecap }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', tags: [], isImportant: false });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);

  // Load sessions and notes from backend/localStorage
  useEffect(() => {
    loadSessionData();
  }, [campaignId]);

  const loadSessionData = () => {
    // Load from localStorage for now
    const savedSessions = localStorage.getItem(`smart-sessions-${campaignId}`);
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed.sessions || []);
      setNotes(parsed.notes || []);
      if (parsed.sessions?.length > 0) {
        setCurrentSession(parsed.sessions[0].id);
        setExpandedSessions({ [parsed.sessions[0].id]: true });
      }
    } else {
      // Create initial session
      const initialSession = {
        id: `session-${Date.now()}`,
        number: 1,
        date: new Date().toISOString().split('T')[0],
        title: 'Session 1',
        recap: ''
      };
      setSessions([initialSession]);
      setCurrentSession(initialSession.id);
      setExpandedSessions({ [initialSession.id]: true });
    }
  };

  const saveSessionData = (newSessions, newNotes) => {
    localStorage.setItem(`smart-sessions-${campaignId}`, JSON.stringify({
      sessions: newSessions,
      notes: newNotes
    }));
  };

  const createNewSession = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      number: sessions.length + 1,
      date: new Date().toISOString().split('T')[0],
      title: `Session ${sessions.length + 1}`,
      recap: ''
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSession(newSession.id);
    setExpandedSessions({ ...expandedSessions, [newSession.id]: true });
    saveSessionData(updated, notes);
  };

  const addNote = () => {
    if (!newNote.content.trim() || !currentSession) return;
    
    const note = {
      id: `note-${Date.now()}`,
      sessionId: currentSession,
      content: newNote.content,
      tags: newNote.tags,
      isImportant: newNote.isImportant,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };
    
    const updated = [note, ...notes];
    setNotes(updated);
    setNewNote({ content: '', tags: [], isImportant: false });
    setIsAddingNote(false);
    saveSessionData(sessions, updated);
  };

  const deleteNote = (noteId) => {
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    saveSessionData(sessions, updated);
  };

  const toggleTag = (tag) => {
    if (newNote.tags.includes(tag)) {
      setNewNote({ ...newNote, tags: newNote.tags.filter(t => t !== tag) });
    } else {
      setNewNote({ ...newNote, tags: [...newNote.tags, tag] });
    }
  };

  const toggleFilterTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const generateRecap = async (sessionId) => {
    setIsGeneratingRecap(true);
    const sessionNotes = notes.filter(n => n.sessionId === sessionId);
    
    try {
      // Call AI to generate recap (you'd implement this endpoint)
      const response = await apiClient.post(`/campaigns/${campaignId}/generate-recap`, {
        notes: sessionNotes.map(n => n.content).join('\n\n')
      });
      
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? { ...s, recap: response.data.recap } : s
      );
      setSessions(updatedSessions);
      saveSessionData(updatedSessions, notes);
    } catch (error) {
      console.error('Failed to generate recap:', error);
      // Fallback: create simple summary
      const summary = sessionNotes.slice(0, 5).map(n => `• ${n.content.substring(0, 100)}`).join('\n');
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? { ...s, recap: summary || 'No notes to summarize.' } : s
      );
      setSessions(updatedSessions);
      saveSessionData(updatedSessions, notes);
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => note.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  // Group notes by session
  const notesBySession = {};
  filteredNotes.forEach(note => {
    if (!notesBySession[note.sessionId]) {
      notesBySession[note.sessionId] = [];
    }
    notesBySession[note.sessionId].push(note);
  });

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px', height: 'calc(100vh - 140px)' }}>
      {/* Left: Session List */}
      <div style={{
        width: '280px',
        flexShrink: 0,
        background: theme.bg.card,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", color: theme.text.primary, margin: 0 }}>
            Sessions
          </h3>
          <button
            onClick={createNewSession}
            style={{
              padding: '6px 12px',
              background: theme.gradient,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={14} /> New
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSession(session.id);
                setExpandedSessions({ ...expandedSessions, [session.id]: !expandedSessions[session.id] });
              }}
              style={{
                padding: '12px',
                background: currentSession === session.id ? theme.accent.subtle : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '4px',
                border: currentSession === session.id ? `1px solid ${theme.accent.primary}` : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: theme.text.primary, fontSize: '14px' }}>
                  {session.title}
                </span>
                <span style={{ fontSize: '11px', color: theme.text.muted }}>
                  {notesBySession[session.id]?.length || 0}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '4px' }}>
                {session.date}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Notes Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search and Filter Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px',
          background: theme.bg.card,
          borderRadius: '12px',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.text.muted }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: theme.bg.elevated,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                color: theme.text.primary,
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(TAG_COLORS).filter(t => t !== 'custom').map(tag => (
              <button
                key={tag}
                onClick={() => toggleFilterTag(tag)}
                style={{
                  padding: '6px 12px',
                  background: selectedTags.includes(tag) ? TAG_COLORS[tag].bg : theme.bg.elevated,
                  border: `1px solid ${selectedTags.includes(tag) ? TAG_COLORS[tag].border : theme.border}`,
                  borderRadius: '20px',
                  color: selectedTags.includes(tag) ? TAG_COLORS[tag].color : theme.text.muted,
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Add Note Section */}
        {isAddingNote ? (
          <div style={{
            padding: '16px',
            background: theme.bg.card,
            borderRadius: '12px',
            border: `1px solid ${theme.accent.primary}`
          }}>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="What happened? Player actions, NPC dialogue, combat outcomes, lore reveals..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                background: theme.bg.elevated,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                color: theme.text.primary,
                fontSize: '14px',
                resize: 'none',
                height: '100px',
                fontFamily: "'Manrope', sans-serif"
              }}
            />
            
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.keys(TAG_COLORS).filter(t => t !== 'custom').map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '4px 10px',
                    background: newNote.tags.includes(tag) ? TAG_COLORS[tag].bg : theme.bg.elevated,
                    border: `1px solid ${newNote.tags.includes(tag) ? TAG_COLORS[tag].border : theme.border}`,
                    borderRadius: '4px',
                    color: newNote.tags.includes(tag) ? TAG_COLORS[tag].color : theme.text.muted,
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}
                >
                  <Tag size={10} style={{ marginRight: '4px' }} />{tag}
                </button>
              ))}
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setNewNote({ ...newNote, isImportant: !newNote.isImportant })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: newNote.isImportant ? 'rgba(245, 158, 11, 0.2)' : theme.bg.elevated,
                  border: `1px solid ${newNote.isImportant ? 'rgba(245, 158, 11, 0.3)' : theme.border}`,
                  borderRadius: '6px',
                  color: newNote.isImportant ? '#F59E0B' : theme.text.muted,
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                <Star size={14} fill={newNote.isImportant ? '#F59E0B' : 'none'} /> Important
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsAddingNote(false)}
                  style={{
                    padding: '8px 16px',
                    background: theme.bg.elevated,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    color: theme.text.secondary,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={addNote}
                  disabled={!newNote.content.trim()}
                  style={{
                    padding: '8px 16px',
                    background: theme.gradient,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    opacity: newNote.content.trim() ? 1 : 0.5
                  }}
                >
                  <Save size={14} style={{ marginRight: '6px' }} /> Save Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingNote(true)}
            style={{
              padding: '16px',
              background: theme.bg.card,
              border: `2px dashed ${theme.border}`,
              borderRadius: '12px',
              color: theme.text.muted,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} /> Add Session Note
          </button>
        )}

        {/* Notes List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sessions.map(session => {
            const sessionNotes = notesBySession[session.id] || [];
            if (sessionNotes.length === 0 && session.id !== currentSession) return null;
            
            return (
              <div key={session.id} style={{ marginBottom: '20px' }}>
                {/* Session Header */}
                <div 
                  onClick={() => setExpandedSessions({ ...expandedSessions, [session.id]: !expandedSessions[session.id] })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: theme.bg.card,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  {expandedSessions[session.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span style={{ fontWeight: '600', color: theme.text.primary }}>{session.title}</span>
                  <span style={{ fontSize: '12px', color: theme.text.muted }}>({sessionNotes.length} notes)</span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateRecap(session.id);
                    }}
                    disabled={isGeneratingRecap}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 10px',
                      background: theme.accent.subtle,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      color: theme.accent.primary,
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={12} /> {isGeneratingRecap ? 'Generating...' : 'Auto-Recap'}
                  </button>
                </div>
                
                {/* Session Recap */}
                {session.recap && expandedSessions[session.id] && (
                  <div style={{
                    padding: '12px 16px',
                    background: theme.accent.subtle,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: `3px solid ${theme.accent.primary}`
                  }}>
                    <div style={{ fontSize: '11px', color: theme.accent.primary, fontWeight: '600', marginBottom: '6px' }}>
                      SESSION RECAP
                    </div>
                    <p style={{ color: theme.text.secondary, fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {session.recap}
                    </p>
                  </div>
                )}
                
                {/* Notes */}
                {expandedSessions[session.id] && sessionNotes.map(note => (
                  <div
                    key={note.id}
                    style={{
                      padding: '12px 16px',
                      background: note.isImportant ? 'rgba(245, 158, 11, 0.1)' : theme.bg.elevated,
                      borderRadius: '8px',
                      marginBottom: '6px',
                      borderLeft: note.isImportant ? '3px solid #F59E0B' : `3px solid ${theme.border}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ color: theme.text.primary, fontSize: '14px', margin: 0, flex: 1 }}>
                        {note.content}
                      </p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: theme.text.muted,
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {note.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: '2px 8px',
                              background: TAG_COLORS[tag]?.bg || TAG_COLORS.custom.bg,
                              color: TAG_COLORS[tag]?.color || TAG_COLORS.custom.color,
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '500',
                              textTransform: 'capitalize'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '8px' }}>
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
