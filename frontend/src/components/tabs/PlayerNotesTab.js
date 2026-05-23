import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Plus, Trash2, Edit3, Save, FileText, BookOpen,
  Scroll, Calendar, User, ChevronDown, ChevronUp, Loader
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: 'var(--rq-bg-main, #1A1A1A)',
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

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
        apiClient.get('/player/session-recaps'),
        apiClient.get('/player/notes')
      ]);
      setSessionRecaps(recapsRes.data);
      setPlayerNotes(notesRes.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load notes');
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
        await apiClient.put(`/player/notes/${editingNote.id}`, {
          title: noteForm.title,
          content: noteForm.content
        });
        toast.success('Note updated!');
      } else {
        await apiClient.post('/player/notes', {
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
    setExpandedRecaps(prev => ({ ...prev, [recapId]: !prev[recapId] }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const resetNoteForm = () => {
    setEditingNote(null);
    setNoteForm({ title: '', content: '', campaign_id: '' });
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
      <section style={{ marginBottom: '48px' }}>
        <SectionTitle icon={Scroll} title="Session Recaps" count={sessionRecaps.length} />

        {sessionRecaps.length === 0 ? (
          <EmptyCard icon={Scroll} title="No Session Recaps Yet" text="When your Game Master drafts a session recap, it will automatically appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sessionRecaps.map(recap => (
              <Card key={recap.id} data-testid={`session-recap-${recap.id}`} style={cardStyle}>
                <div style={topBarStyle} />
                <CardContent style={{ padding: '20px' }}>
                  <div style={clickHeaderStyle} onClick={() => toggleRecapExpanded(recap.id)}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={campaignBadgeStyle}>
                          <BookOpen size={14} />
                          {recap.campaign_name || 'Campaign'}
                        </span>
                      </div>
                      <div style={metaRowStyle}>
                        <span style={metaItemStyle}><Calendar size={14} />{formatDate(recap.session_date)}</span>
                        <span style={metaItemStyle}><User size={14} />From: {recap.created_by}</span>
                      </div>
                    </div>
                    <Button className="btn-icon" style={{ padding: '8px' }}>
                      {expandedRecaps[recap.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </Button>
                  </div>

                  {expandedRecaps[recap.id] ? (
                    <div style={expandedContentStyle}>
                      <div style={recapTextStyle}>{recap.content}</div>
                    </div>
                  ) : (
                    <p style={previewTextStyle}>{recap.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div style={sectionHeaderStyle}>
          <SectionTitle icon={FileText} title="My Notes" count={playerNotes.length} compact />
          <Button onClick={() => { resetNoteForm(); setShowNoteDialog(true); }} data-testid="add-player-note-btn" style={addButtonStyle}>
            <Plus size={18} />
            Add Note
          </Button>
        </div>

        {playerNotes.length === 0 ? (
          <EmptyCard icon={FileText} title="No Personal Notes Yet" text="Create your own notes to track character ideas, session thoughts, or anything else!">
            <Button onClick={() => { resetNoteForm(); setShowNoteDialog(true); }} className="btn-primary">
              <Plus size={18} style={{ marginRight: '8px' }} />
              Create First Note
            </Button>
          </EmptyCard>
        ) : (
          <div style={notesGridStyle}>
            {playerNotes.map(note => (
              <Card key={note.id} data-testid={`player-note-${note.id}`} style={cardStyle}>
                <div style={topBarStyle} />
                <CardContent style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={noteTitleStyle}>{note.title || 'Untitled Note'}</h3>
                      {note.campaign_name && <span style={campaignBadgeStyle}><BookOpen size={10} />{note.campaign_name}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button onClick={() => handleEditNote(note)} className="btn-icon" style={{ padding: '6px' }} data-testid={`edit-note-${note.id}`}>
                        <Edit3 size={16} />
                      </Button>
                      <Button onClick={() => handleDeleteNote(note.id)} className="btn-icon" style={{ padding: '6px', color: rq.accent }} data-testid={`delete-note-${note.id}`}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <p style={notePreviewStyle}>{note.content}</p>
                  <p style={updatedStyle}>Updated {formatDate(note.updated_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="modal" style={{ maxWidth: '600px', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius }}>
          <DialogHeader>
            <DialogTitle style={dialogTitleStyle}>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            <DialogDescription style={{ color: rq.muted, marginTop: '8px' }}>
              {editingNote ? 'Make changes to your note below.' : 'Write down your thoughts, character ideas, or session notes.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNote} style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <FormLabel text="Title (optional)" />
              <Input value={noteForm.title} onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Note title..." className="input" data-testid="note-title-input" />
            </div>

            {!editingNote && campaigns.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <FormLabel text="Link to Campaign (optional)" />
                <select value={noteForm.campaign_id} onChange={(e) => setNoteForm(prev => ({ ...prev, campaign_id: e.target.value }))} className="input" style={selectStyle} data-testid="note-campaign-select">
                  <option value="">No campaign</option>
                  {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <FormLabel text="Content" />
              <textarea value={noteForm.content} onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))} placeholder="Write your note here..." className="input" style={textareaStyle} data-testid="note-content-input" required />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button type="button" onClick={() => { setShowNoteDialog(false); resetNoteForm(); }} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !noteForm.content.trim()} className="btn-primary" style={saveButtonStyle} data-testid="save-note-btn">
                {saving ? <><Loader size={18} className="spin" />Saving...</> : <><Save size={18} />{editingNote ? 'Update Note' : 'Save Note'}</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count, compact = false }) {
  return (
    <h2 style={{ ...titleStyle, marginBottom: compact ? 0 : '20px' }}>
      <Icon size={24} style={{ color: rq.accent }} />
      {title}
      <span style={countStyle}>({count})</span>
    </h2>
  );
}

function EmptyCard({ icon: Icon, title, text, children }) {
  return (
    <Card style={emptyCardStyle}>
      <Icon size={48} style={{ color: rq.muted, opacity: 0.4, marginBottom: '16px' }} />
      <h3 style={emptyTitleStyle}>{title}</h3>
      <p style={emptyTextStyle}>{text}</p>
      {children}
    </Card>
  );
}

function FormLabel({ text }) {
  return <label style={formLabelStyle}>{text}</label>;
}

const titleStyle = { fontSize: '22px', fontFamily: "'Cinzel', serif", fontWeight: 900, color: rq.text, display: 'flex', alignItems: 'center', gap: '12px' };
const countStyle = { fontSize: '14px', color: rq.muted, fontWeight: 700 };
const cardStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, overflow: 'hidden' };
const topBarStyle = { height: '4px', background: rq.accent };
const clickHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: 12 };
const campaignBadgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, fontSize: '12px', color: rq.textSecondary, fontWeight: 800 };
const metaRowStyle = { display: 'flex', alignItems: 'center', gap: '16px', color: rq.muted, fontSize: '13px', flexWrap: 'wrap' };
const metaItemStyle = { display: 'flex', alignItems: 'center', gap: '6px' };
const expandedContentStyle = { marginTop: '16px', padding: '20px', background: rq.input, borderRadius: rq.radiusSm, border: `1px solid ${rq.borderDefault}` };
const recapTextStyle = { color: rq.textSecondary, fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap' };
const previewTextStyle = { marginTop: '12px', color: rq.muted, fontSize: '14px', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: 16, flexWrap: 'wrap' };
const addButtonStyle = { padding: '10px 20px', background: rq.accent, border: `1px solid ${rq.accent}`, borderRadius: rq.radiusSm, display: 'flex', alignItems: 'center', gap: '8px', color: rq.text, fontWeight: 900, fontSize: '14px', cursor: 'pointer' };
const emptyCardStyle = { background: rq.panel, border: `2px dashed ${rq.borderDefault}`, borderRadius: rq.radius, padding: '40px', textAlign: 'center' };
const emptyTitleStyle = { color: rq.textSecondary, fontSize: '18px', marginBottom: '8px', fontFamily: "'Cinzel', serif", fontWeight: 900 };
const emptyTextStyle = { color: rq.muted, maxWidth: '400px', margin: '0 auto 20px' };
const notesGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' };
const noteTitleStyle = { fontSize: '16px', fontFamily: "'Cinzel', serif", fontWeight: 900, color: rq.text, marginBottom: '6px' };
const notePreviewStyle = { color: rq.muted, fontSize: '14px', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', whiteSpace: 'pre-wrap' };
const updatedStyle = { marginTop: '12px', fontSize: '11px', color: rq.muted };
const dialogTitleStyle = { fontSize: '24px', fontFamily: "'Cinzel', serif", fontWeight: 900, color: rq.text };
const formLabelStyle = { display: 'block', marginBottom: '8px', color: rq.accentHover, fontSize: '14px', fontWeight: 900 };
const selectStyle = { width: '100%', padding: '10px 12px', borderRadius: rq.radiusSm };
const textareaStyle = { minHeight: '200px', resize: 'vertical', lineHeight: '1.6', borderRadius: rq.radiusSm };
const saveButtonStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };

export default PlayerNotesTab;
