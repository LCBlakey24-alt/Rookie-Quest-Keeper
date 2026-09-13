import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Loader,
  Plus,
  RefreshCw,
  Save,
  Scroll,
  Trash2,
  User,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './PlayerNotesTab.css';

function PlayerNotesTab({ campaigns = [], campaignId = '' }) {
  const requestRef = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [sessionRecaps, setSessionRecaps] = useState([]);
  const [playerNotes, setPlayerNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', campaign_id: campaignId });
  const [saving, setSaving] = useState(false);
  const [expandedRecaps, setExpandedRecaps] = useState({});

  const fetchData = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    const results = await Promise.allSettled([
      apiClient.get('/player/session-recaps'),
      apiClient.get('/player/notes'),
    ]);
    if (request !== requestRef.current) return;

    const failures = [];
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value.data)) {
        failures.push(index === 0 ? 'session recaps' : 'notes');
        return;
      }
      const rows = result.value.data.filter(row => row && (!campaignId || row.campaign_id === campaignId));
      (index === 0 ? setSessionRecaps : setPlayerNotes)(rows);
    });

    setLoadError(failures.length ? `Could not refresh ${failures.join(' and ')}. Previously loaded entries remain visible.` : '');
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchData();
    return () => { requestRef.current += 1; };
  }, [fetchData]);

  const handleSaveNote = async (event) => {
    event.preventDefault();
    if (!noteForm.content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        await apiClient.put(`/player/notes/${editingNote.id}`, {
          title: noteForm.title,
          content: noteForm.content,
        });
        toast.success('Note updated!');
      } else {
        await apiClient.post('/player/notes', {
          title: noteForm.title,
          content: noteForm.content,
          campaign_id: noteForm.campaign_id || null,
        });
        toast.success('Note created!');
      }
      setShowNoteDialog(false);
      setEditingNote(null);
      setNoteForm({ title: '', content: '', campaign_id: campaignId });
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({ title: note.title || '', content: note.content, campaign_id: note.campaign_id || '' });
    setShowNoteDialog(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await apiClient.delete(`/player/notes/${noteId}`);
      toast.success('Note deleted');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete note');
    }
  };

  const toggleRecapExpanded = (recapId) => {
    setExpandedRecaps(previous => ({ ...previous, [recapId]: !previous[recapId] }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const resetNoteForm = () => {
    setEditingNote(null);
    setNoteForm({ title: '', content: '', campaign_id: campaignId });
  };

  const openNewNote = () => {
    resetNoteForm();
    setShowNoteDialog(true);
  };

  if (loading && !sessionRecaps.length && !playerNotes.length) {
    return (
      <div className="loading-screen" style={{ minHeight: '320px' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="player-notes-tab">
      {loadError && <div role="status" className="player-notes-error">{loadError}</div>}

      <div className="player-notes-toolbar">
        <Button className="player-notes-button" onClick={fetchData} disabled={loading} aria-label="Refresh notes">
          <RefreshCw size={15} />
          Refresh notes
        </Button>
      </div>

      <section className="player-notes-section">
        <SectionTitle icon={Scroll} title="Session Recaps" count={sessionRecaps.length} />

        {sessionRecaps.length === 0 ? (
          <EmptyCard
            icon={Scroll}
            title={loadError.includes('session recaps') ? 'Session recaps could not be confirmed' : 'No Session Recaps Yet'}
            text="Recaps shared by your Game Master appear here."
          />
        ) : (
          <div className="player-notes-list">
            {sessionRecaps.map(recap => {
              const expanded = Boolean(expandedRecaps[recap.id]);
              return (
                <Card key={recap.id} data-testid={`session-recap-${recap.id}`} className="player-notes-card">
                  <CardContent className="player-notes-card-content">
                    <div className="player-notes-recap-head">
                      <div className="player-notes-recap-copy">
                        <span className="player-notes-badge">
                          <BookOpen size={13} />
                          {recap.campaign_name || 'Campaign'}
                        </span>
                        <div className="player-notes-meta">
                          <span><Calendar size={13} />{formatDate(recap.session_date)}</span>
                          <span><User size={13} />From: {recap.created_by}</span>
                        </div>
                      </div>
                      <Button
                        className="player-notes-icon-button"
                        aria-label={expanded ? 'Collapse recap' : 'Expand recap'}
                        aria-expanded={expanded}
                        onClick={() => toggleRecapExpanded(recap.id)}
                      >
                        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                      </Button>
                    </div>

                    {expanded ? (
                      <div className="player-notes-recap-expanded">
                        <p className="player-notes-recap-text">{recap.content}</p>
                      </div>
                    ) : (
                      <p className="player-notes-preview">{recap.content}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="player-notes-section">
        <div className="player-notes-section-header">
          <SectionTitle icon={FileText} title="My Notes" count={playerNotes.length} />
          <Button onClick={openNewNote} data-testid="add-player-note-btn" className="player-notes-button player-notes-button--primary">
            <Plus size={16} />
            Add Note
          </Button>
        </div>

        {playerNotes.length === 0 ? (
          <EmptyCard
            icon={FileText}
            title={loadError.includes('notes') ? 'Notes could not be confirmed' : 'No Personal Notes Yet'}
            text="Create your own notes to track character ideas, session thoughts, or anything else."
          >
            <Button onClick={openNewNote} className="player-notes-button player-notes-button--primary">
              <Plus size={16} />
              Create First Note
            </Button>
          </EmptyCard>
        ) : (
          <div className="player-notes-grid">
            {playerNotes.map(note => (
              <Card key={note.id} data-testid={`player-note-${note.id}`} className="player-notes-card">
                <CardContent className="player-notes-card-content">
                  <div className="player-notes-note-head">
                    <div className="player-notes-note-copy">
                      <h3 className="player-notes-note-title">{note.title || 'Untitled Note'}</h3>
                      {note.campaign_name && (
                        <span className="player-notes-badge">
                          <BookOpen size={11} />
                          {note.campaign_name}
                        </span>
                      )}
                    </div>
                    <div className="player-notes-note-actions">
                      <Button
                        onClick={() => handleEditNote(note)}
                        className="player-notes-icon-button"
                        data-testid={`edit-note-${note.id}`}
                        aria-label={`Edit ${note.title || 'note'}`}
                      >
                        <Edit3 size={15} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteNote(note.id)}
                        className="player-notes-icon-button"
                        data-testid={`delete-note-${note.id}`}
                        aria-label={`Delete ${note.title || 'note'}`}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>

                  <p className="player-notes-preview">{note.content}</p>
                  <p className="player-notes-updated">Updated {formatDate(note.updated_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="player-notes-dialog">
          <DialogHeader>
            <DialogTitle className="player-notes-dialog-title">{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Make changes to your note below.' : 'Write down your thoughts, character ideas, or session notes.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNote} className="player-notes-form">
            <div className="player-notes-field">
              <label htmlFor="player-note-title">Title (optional)</label>
              <Input
                id="player-note-title"
                value={noteForm.title}
                onChange={(event) => setNoteForm(previous => ({ ...previous, title: event.target.value }))}
                placeholder="Note title..."
                data-testid="note-title-input"
              />
            </div>

            {!editingNote && !campaignId && campaigns.length > 0 && (
              <div className="player-notes-field">
                <label htmlFor="player-note-campaign">Link to Campaign (optional)</label>
                <select
                  id="player-note-campaign"
                  value={noteForm.campaign_id}
                  onChange={(event) => setNoteForm(previous => ({ ...previous, campaign_id: event.target.value }))}
                  data-testid="note-campaign-select"
                >
                  <option value="">No campaign</option>
                  {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                </select>
              </div>
            )}

            <div className="player-notes-field">
              <label htmlFor="player-note-content">Content</label>
              <textarea
                id="player-note-content"
                value={noteForm.content}
                onChange={(event) => setNoteForm(previous => ({ ...previous, content: event.target.value }))}
                placeholder="Write your note here..."
                data-testid="note-content-input"
                required
              />
            </div>

            <div className="player-notes-dialog-actions">
              <Button
                type="button"
                onClick={() => { setShowNoteDialog(false); resetNoteForm(); }}
                className="player-notes-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !noteForm.content.trim()}
                className="player-notes-button player-notes-button--primary"
                data-testid="save-note-btn"
              >
                {saving ? <><Loader size={16} className="spin" />Saving...</> : <><Save size={16} />{editingNote ? 'Update Note' : 'Save Note'}</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }) {
  return (
    <h2 className="player-notes-section-title">
      <Icon size={18} />
      {title}
      <span className="player-notes-count">{count}</span>
    </h2>
  );
}

function EmptyCard({ icon: Icon, title, text, children }) {
  return (
    <Card className="player-notes-empty">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </Card>
  );
}

export default PlayerNotesTab;
