import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, Trash2, Edit3, Save, X, FileText, BookOpen, 
  Scroll, Calendar, User, ChevronDown, ChevronUp, Loader
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function PlayerNotesTab({ campaigns = [] }) {
  const [sessionRecaps, setSessionRecaps] = useState([]);
  const [playerNotes, setPlayerNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', campaign_id: '' });
  const [saving, setSaving] = useState(false);
  const [expandedRecaps, setExpandedRecaps] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recapsRes, notesRes] = await Promise.all([
        axios.get(`${API}/player/session-recaps`),
        axios.get(`${API}/player/notes`)
      ]);
      setSessionRecaps(recapsRes.data);
      setPlayerNotes(notesRes.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteForm.content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        await axios.put(`${API}/player/notes/${editingNote.id}`, {
          title: noteForm.title,
          content: noteForm.content
        });
        toast.success('Note updated!');
      } else {
        await axios.post(`${API}/player/notes`, {
          title: noteForm.title,
          content: noteForm.content,
          campaign_id: noteForm.campaign_id || null
        });
        toast.success('Note created!');
      }
      setShowNoteDialog(false);
      setEditingNote(null);
      setNoteForm({ title: '', content: '', campaign_id: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title || '',
      content: note.content,
      campaign_id: note.campaign_id || ''
    });
    setShowNoteDialog(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await axios.delete(`${API}/player/notes/${noteId}`);
      toast.success('Note deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const toggleRecapExpanded = (recapId) => {
    setExpandedRecaps(prev => ({
      ...prev,
      [recapId]: !prev[recapId]
    }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '400px' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Session Recaps Section */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontFamily: 'Cityworm, sans-serif',
            fontWeight: '700',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Scroll size={24} style={{ color: '#EAB308' }} />
            Session Recaps
            <span style={{ 
              fontSize: '14px', 
              color: '#9CA3AF',
              fontWeight: '500'
            }}>
              ({sessionRecaps.length})
            </span>
          </h2>
        </div>

        {sessionRecaps.length === 0 ? (
          <Card style={{
            background: '#111827',
            border: '2px dashed #1F2937',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <Scroll size={48} style={{ color: '#374151', marginBottom: '16px' }} />
            <h3 style={{ 
              color: '#9CA3AF', 
              fontSize: '18px', 
              marginBottom: '8px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '600'
            }}>
              No Session Recaps Yet
            </h3>
            <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
              When your Game Master generates a session recap, it will automatically appear here.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sessionRecaps.map(recap => (
              <Card
                key={recap.id}
                data-testid={`session-recap-${recap.id}`}
                style={{
                  background: '#111827',
                  border: '1px solid #1F2937',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                {/* Golden top border for recaps */}
                <div style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, #EAB308, #CA8A04)'
                }} />
                
                <CardContent style={{ padding: '20px' }}>
                  {/* Header */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleRecapExpanded(recap.id)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          borderRadius: '20px',
                          fontSize: '12px',
                          color: '#EAB308',
                          fontWeight: '600'
                        }}>
                          <BookOpen size={14} />
                          {recap.campaign_name || 'Campaign'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#6B7280', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} />
                          {formatDate(recap.session_date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} />
                          From: {recap.created_by}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="btn-icon"
                      style={{ padding: '8px' }}
                    >
                      {expandedRecaps[recap.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </Button>
                  </div>
                  
                  {/* Content */}
                  {expandedRecaps[recap.id] && (
                    <div style={{
                      marginTop: '16px',
                      padding: '20px',
                      background: 'rgba(234, 179, 8, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(234, 179, 8, 0.2)'
                    }}>
                      <div style={{
                        color: '#E5E7EB',
                        fontSize: '15px',
                        lineHeight: '1.8',
                        whiteSpace: 'pre-wrap',
                        fontStyle: 'italic'
                      }}>
                        {recap.content}
                      </div>
                    </div>
                  )}
                  
                  {/* Preview when collapsed */}
                  {!expandedRecaps[recap.id] && (
                    <p style={{
                      marginTop: '12px',
                      color: '#9CA3AF',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {recap.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Player Notes Section */}
      <section>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontFamily: 'Cityworm, sans-serif',
            fontWeight: '700',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FileText size={24} style={{ color: '#22D3EE' }} />
            My Notes
            <span style={{ 
              fontSize: '14px', 
              color: '#9CA3AF',
              fontWeight: '500'
            }}>
              ({playerNotes.length})
            </span>
          </h2>
          <Button
            onClick={() => {
              setEditingNote(null);
              setNoteForm({ title: '', content: '', campaign_id: '' });
              setShowNoteDialog(true);
            }}
            data-testid="add-player-note-btn"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #22D3EE 0%, #10B981 100%)',
              border: 'none',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'Cityworm, sans-serif',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            Add Note
          </Button>
        </div>

        {playerNotes.length === 0 ? (
          <Card style={{
            background: '#111827',
            border: '2px dashed #1F2937',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <FileText size={48} style={{ color: '#374151', marginBottom: '16px' }} />
            <h3 style={{ 
              color: '#9CA3AF', 
              fontSize: '18px', 
              marginBottom: '8px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '600'
            }}>
              No Personal Notes Yet
            </h3>
            <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto 20px' }}>
              Create your own notes to track character ideas, session thoughts, or anything else!
            </p>
            <Button
              onClick={() => {
                setEditingNote(null);
                setNoteForm({ title: '', content: '', campaign_id: '' });
                setShowNoteDialog(true);
              }}
              className="btn-primary"
            >
              <Plus size={18} style={{ marginRight: '8px' }} />
              Create First Note
            </Button>
          </Card>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {playerNotes.map(note => (
              <Card
                key={note.id}
                data-testid={`player-note-${note.id}`}
                style={{
                  background: '#111827',
                  border: '1px solid #1F2937',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}
              >
                {/* Cyan top border for player notes */}
                <div style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, #22D3EE, #10B981)'
                }} />
                
                <CardContent style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontFamily: 'Cityworm, sans-serif',
                        fontWeight: '700',
                        color: '#ffffff',
                        marginBottom: '6px'
                      }}>
                        {note.title || 'Untitled Note'}
                      </h3>
                      {note.campaign_name && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          background: 'rgba(124, 58, 237, 0.2)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#C4B5FD'
                        }}>
                          <BookOpen size={10} />
                          {note.campaign_name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        onClick={() => handleEditNote(note)}
                        className="btn-icon"
                        style={{ padding: '6px' }}
                        data-testid={`edit-note-${note.id}`}
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteNote(note.id)}
                        className="btn-icon"
                        style={{ padding: '6px', color: '#EF4444' }}
                        data-testid={`delete-note-${note.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  <p style={{
                    color: '#9CA3AF',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {note.content}
                  </p>
                  
                  <p style={{
                    marginTop: '12px',
                    fontSize: '11px',
                    color: '#6B7280'
                  }}>
                    Updated {formatDate(note.updated_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="modal" style={{ maxWidth: '600px' }}>
          <DialogHeader>
            <DialogTitle style={{
              fontSize: '24px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '700',
              color: '#ffffff'
            }}>
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </DialogTitle>
            <DialogDescription style={{ color: '#9CA3AF', marginTop: '8px' }}>
              {editingNote 
                ? 'Make changes to your note below.'
                : 'Write down your thoughts, character ideas, or session notes.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSaveNote} style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#22D3EE',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Title (optional)
              </label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
                className="input"
                data-testid="note-title-input"
              />
            </div>

            {!editingNote && campaigns.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#22D3EE',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Link to Campaign (optional)
                </label>
                <select
                  value={noteForm.campaign_id}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, campaign_id: e.target.value }))}
                  className="input"
                  style={{ width: '100%', padding: '10px 12px' }}
                  data-testid="note-campaign-select"
                >
                  <option value="">No campaign</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#22D3EE',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Content
              </label>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your note here..."
                className="input"
                style={{ 
                  minHeight: '200px', 
                  resize: 'vertical',
                  lineHeight: '1.6'
                }}
                data-testid="note-content-input"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                type="button"
                onClick={() => {
                  setShowNoteDialog(false);
                  setEditingNote(null);
                  setNoteForm({ title: '', content: '', campaign_id: '' });
                }}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !noteForm.content.trim()}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                data-testid="save-note-btn"
              >
                {saving ? (
                  <>
                    <Loader size={18} className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {editingNote ? 'Update Note' : 'Save Note'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlayerNotesTab;
