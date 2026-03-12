import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, Plus, Calendar, ChevronDown, ChevronRight, Edit, Trash2,
  Save, X, Search, Clock, User, Swords, Star, MapPin
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Player Theme - Blue
const theme = {
  primary: '#06B6D4',
  hover: '#0891B2',
  subtle: 'rgba(59, 130, 246, 0.15)',
  bg: '#0B0F19',
  card: '#111827',
  panel: '#111827',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(212, 175, 55, 0.15)'
};

const ENTRY_TYPES = [
  { id: 'session', label: 'Session Summary', icon: Calendar, color: '#06B6D4' },
  { id: 'combat', label: 'Combat', icon: Swords, color: '#D97706' },
  { id: 'npc', label: 'NPC Met', icon: User, color: '#22C55E' },
  { id: 'location', label: 'Location', icon: MapPin, color: '#F59E0B' },
  { id: 'loot', label: 'Loot/Item', icon: Star, color: '#A855F7' },
  { id: 'note', label: 'Note', icon: BookOpen, color: '#6B7280' }
];

function SessionJournal({ characterId, campaignId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState({});
  
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    type: 'session',
    session_number: '',
    tags: []
  });

  useEffect(() => {
    fetchEntries();
  }, [characterId, campaignId]);

  const fetchEntries = async () => {
    try {
      const params = characterId ? { character_id: characterId } : { campaign_id: campaignId };
      const response = await axios.get(`${API}/player/journal`, { params });
      setEntries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch journal entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntry.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const entryData = {
        ...newEntry,
        character_id: characterId,
        campaign_id: campaignId,
        session_number: newEntry.session_number ? parseInt(newEntry.session_number) : null
      };
      
      const response = await axios.post(`${API}/player/journal`, entryData);
      setEntries([response.data, ...entries]);
      setNewEntry({ title: '', content: '', type: 'session', session_number: '', tags: [] });
      setShowNewEntry(false);
      toast.success('Entry added!');
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  const handleUpdateEntry = async (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    try {
      await axios.put(`${API}/player/journal/${id}`, entry);
      setEditingId(null);
      toast.success('Entry updated!');
    } catch (error) {
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;
    
    try {
      await axios.delete(`${API}/player/journal/${id}`);
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Entry deleted');
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const toggleExpanded = (id) => {
    setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          entry.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entry.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading journal...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ 
            color: theme.text, 
            fontSize: '24px', 
            fontWeight: '400',
            fontFamily: "Inter, sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <BookOpen size={28} color={theme.primary} />
            Session Journal
          </h2>
          <p style={{ color: theme.textSecondary, fontSize: '14px', marginTop: '4px' }}>
            Track your adventures, NPCs, and memorable moments
          </p>
        </div>
        
        <Button
          onClick={() => setShowNewEntry(true)}
          data-testid="new-journal-entry-btn"
          style={{
            padding: '12px 20px',
            background: theme.primary,
            border: 'none',
            color: theme.text,
            fontWeight: '400',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} />
          New Entry
        </Button>
      </div>

      {/* Search & Filter */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: '1',
          minWidth: '200px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: theme.card,
          border: `1px solid ${theme.border}`
        }}>
          <Search size={18} color={theme.muted} />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="journal-search"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: theme.text,
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          data-testid="journal-filter"
          style={{
            padding: '10px 16px',
            background: theme.card,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontSize: '14px'
          }}
        >
          <option value="all">All Types</option>
          {ENTRY_TYPES.map(type => (
            <option key={type.id} value={type.id}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* New Entry Form */}
      {showNewEntry && (
        <Card style={{ background: theme.panel, border: `2px solid ${theme.primary}` }}>
          <CardHeader>
            <CardTitle style={{ color: theme.primary }}>New Journal Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {ENTRY_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewEntry({ ...newEntry, type: type.id })}
                    style={{
                      padding: '8px 16px',
                      background: newEntry.type === type.id ? type.color : theme.card,
                      border: `1px solid ${type.color}`,
                      color: theme.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <type.icon size={14} />
                    {type.label}
                  </button>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <Input
                  placeholder="Entry title..."
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  data-testid="journal-title-input"
                  style={{ flex: 1 }}
                />
                <Input
                  type="number"
                  placeholder="Session #"
                  value={newEntry.session_number}
                  onChange={(e) => setNewEntry({ ...newEntry, session_number: e.target.value })}
                  style={{ width: '100px' }}
                />
              </div>
              
              <textarea
                placeholder="Write your entry... What happened? Who did you meet? What did you learn?"
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                data-testid="journal-content-input"
                style={{
                  minHeight: '150px',
                  padding: '12px',
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => setShowNewEntry(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.textSecondary
                  }}
                >
                  <X size={16} /> Cancel
                </Button>
                <Button
                  onClick={handleCreateEntry}
                  data-testid="save-journal-entry-btn"
                  style={{
                    padding: '10px 20px',
                    background: theme.primary,
                    border: 'none',
                    color: theme.text
                  }}
                >
                  <Save size={16} /> Save Entry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredEntries.length === 0 ? (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: theme.card,
            border: `1px dashed ${theme.border}`
          }}>
            <BookOpen size={48} color={theme.muted} style={{ marginBottom: '16px' }} />
            <h3 style={{ color: theme.text, marginBottom: '8px' }}>No Journal Entries Yet</h3>
            <p style={{ color: theme.muted, fontSize: '14px' }}>
              Start documenting your adventures! Click "New Entry" to begin.
            </p>
          </div>
        ) : (
          filteredEntries.map(entry => {
            const typeConfig = ENTRY_TYPES.find(t => t.id === entry.type) || ENTRY_TYPES[5];
            const TypeIcon = typeConfig.icon;
            const isExpanded = expandedEntries[entry.id];
            const isEditing = editingId === entry.id;
            
            return (
              <Card 
                key={entry.id} 
                data-testid={`journal-entry-${entry.id}`}
                style={{ 
                  background: theme.card, 
                  border: `1px solid ${theme.border}`,
                  transition: 'border-color 0.2s'
                }}
              >
                <div
                  onClick={() => !isEditing && toggleExpanded(entry.id)}
                  style={{
                    padding: '16px',
                    cursor: isEditing ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  {/* Type Icon */}
                  <div style={{
                    padding: '10px',
                    background: `${typeConfig.color}20`,
                    borderRadius: '8px'
                  }}>
                    <TypeIcon size={20} color={typeConfig.color} />
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '4px'
                    }}>
                      {isExpanded ? <ChevronDown size={16} color={theme.muted} /> : <ChevronRight size={16} color={theme.muted} />}
                      <h4 style={{ 
                        color: theme.text, 
                        fontWeight: '400',
                        fontSize: '16px',
                        margin: 0
                      }}>
                        {entry.title}
                      </h4>
                      {entry.session_number && (
                        <span style={{
                          padding: '2px 8px',
                          background: theme.subtle,
                          color: theme.primary,
                          fontSize: '12px',
                          fontWeight: '400'
                        }}>
                          Session {entry.session_number}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      color: theme.muted,
                      fontSize: '12px'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {formatDate(entry.created_at)}
                      </span>
                      <span style={{ 
                        padding: '2px 6px',
                        background: `${typeConfig.color}20`,
                        color: typeConfig.color,
                        fontSize: '11px'
                      }}>
                        {typeConfig.label}
                      </span>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{ marginTop: '16px' }}>
                        {isEditing ? (
                          <textarea
                            value={entry.content}
                            onChange={(e) => {
                              setEntries(entries.map(ent => 
                                ent.id === entry.id ? { ...ent, content: e.target.value } : ent
                              ));
                            }}
                            style={{
                              width: '100%',
                              minHeight: '120px',
                              padding: '12px',
                              background: theme.panel,
                              border: `1px solid ${theme.primary}`,
                              color: theme.text,
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                          />
                        ) : (
                          <p style={{ 
                            color: theme.textSecondary, 
                            fontSize: '14px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {entry.content || 'No content'}
                          </p>
                        )}
                        
                        {/* Actions */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          marginTop: '12px',
                          justifyContent: 'flex-end'
                        }}>
                          {isEditing ? (
                            <>
                              <Button
                                onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                style={{
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: `1px solid ${theme.border}`,
                                  color: theme.muted,
                                  fontSize: '13px'
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleUpdateEntry(entry.id); }}
                                style={{
                                  padding: '6px 12px',
                                  background: theme.primary,
                                  border: 'none',
                                  color: theme.text,
                                  fontSize: '13px'
                                }}
                              >
                                <Save size={14} /> Save
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={(e) => { e.stopPropagation(); setEditingId(entry.id); }}
                                style={{
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: `1px solid ${theme.border}`,
                                  color: theme.textSecondary,
                                  fontSize: '13px'
                                }}
                              >
                                <Edit size={14} /> Edit
                              </Button>
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }}
                                style={{
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: `1px solid #D97706`,
                                  color: '#D97706',
                                  fontSize: '13px'
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SessionJournal;
