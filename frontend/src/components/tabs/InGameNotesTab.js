import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, Sparkles, CheckCircle, AlertCircle, Loader, FileText, Copy, Download } from 'lucide-react';
import SmartNoteParser from '@/components/SmartNoteParser';
import apiClient from '@/lib/apiClient';

const rq = {
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
  success: 'var(--rq-success, #2E8B57)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

function InGameNotesTab({ campaignId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [processingNote, setProcessingNote] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [syncingNote, setSyncingNote] = useState(null);
  
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const [sessionRecap, setSessionRecap] = useState('');
  const [showRecapDialog, setShowRecapDialog] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [campaignId]);

  const fetchNotes = async () => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/ingame-notes`);
      setNotes(response.data);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const syncNoteIntoCampaignState = async (noteId, showEmptyToast = true) => {
    setSyncingNote(noteId);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/ingame-notes/${noteId}/sync`);
      const applied = response.data?.applied_updates || [];
      if (applied.length > 0) {
        toast.success(`${applied.length} campaign update${applied.length === 1 ? '' : 's'} applied`, {
          description: applied.slice(0, 2).map(update => update.summary || update).filter(Boolean).join(' '),
        });
      } else if (showEmptyToast) {
        toast.info('Note saved', { description: 'No clear player, NPC, or location changes were detected automatically.' });
      }
      fetchNotes();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to sync note into campaign state');
    } finally {
      setSyncingNote(null);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content: newNote });
      toast.success('Note added!');
      setNewNote('');
      setShowDialog(false);
      await syncNoteIntoCampaignState(response.data.id, false);
      fetchNotes();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to add note');
    }
  };

  const handleProcessWithRook = async (noteId) => {
    setProcessingNote(noteId);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/ingame-notes/${noteId}/process-ai`);
      setAiSuggestions(response.data.suggestions);
      setShowSuggestionsDialog(true);
      toast.success('Rook processing complete!');
      fetchNotes();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Rook processing failed');
    } finally {
      setProcessingNote(null);
    }
  };

  const handleApplySuggestion = async (type, data) => {
    try {
      if (type === 'new_npc') {
        await apiClient.post(`/campaigns/${campaignId}/npcs`, {
          name: data.name,
          description: data.description,
          notes: data.notes || '',
          hp: 10,
          ac: 10
        });
        toast.success(`Added NPC: ${data.name}`);
      } else if (type === 'new_location') {
        await apiClient.post(`/campaigns/${campaignId}/locations`, {
          name: data.name,
          location_type: data.type || '',
          description: data.description,
          notes: data.notes || ''
        });
        toast.success(`Added Location: ${data.name}`);
      } else if (type === 'new_god') {
        await apiClient.post(`/campaigns/${campaignId}/gods`, {
          name: data.name,
          domain: data.domain || '',
          description: data.description
        });
        toast.success(`Added God: ${data.name}`);
      }
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to apply suggestion');
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/ingame-notes/${noteId}`);
      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to delete note');
    }
  };

  const generateSessionRecap = async () => {
    if (notes.length === 0) {
      toast.error('No notes to summarize');
      return;
    }
    
    setGeneratingRecap(true);
    
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/session-recaps`);
      setSessionRecap(res.data.recap);
      setShowRecapDialog(true);
      toast.success(`Rook drafted a recap and synced it to ${res.data.players_synced} players!`);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Rook recap unavailable', { description: error?.formattedDetail || error.response?.data?.detail || 'Please try again later.' });
      } else {
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to generate recap');
      }
    } finally {
      setGeneratingRecap(false);
    }
  };

  const copyRecapToClipboard = () => {
    navigator.clipboard.writeText(sessionRecap);
    toast.success('Copied to clipboard!');
  };

  const downloadRecap = () => {
    const blob = new Blob([sessionRecap], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-recap-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: rq.text, marginBottom: '8px' }}>In-Game Notes</h2>
          <p style={{ fontSize: '14px', color: rq.textSecondary }}>Take session notes and ask Rook to organise them into campaign updates.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button 
            onClick={generateSessionRecap} 
            disabled={generatingRecap || notes.length === 0}
            className="btn-outline"
            style={{ display: 'flex', gap: '8px', borderColor: rq.accent, color: rq.accentHover, borderRadius: rq.radiusSm }}
          >
            {generatingRecap ? <Loader size={16} className="animate-spin" /> : <FileText size={16} />}
            Ask Rook for Recap
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-ingame-note-btn" className="btn-primary" style={{ display: 'flex', gap: '8px', borderRadius: rq.radiusSm }}>
                <Plus size={18} />
                Add Session Note
              </Button>
            </DialogTrigger>
            <DialogContent className="modal" style={{ maxWidth: '700px', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius }}>
              <DialogHeader>
                <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: rq.text }}>
                  Add Session Note
                </DialogTitle>
                <DialogDescription style={{ color: rq.muted, marginTop: '8px' }}>
                  Write down what happened in your session. Rook can help organise it into NPCs, locations, and other campaign notes.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddNote} style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <textarea
                    data-testid="ingame-note-content-input"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="textarea"
                    style={{ minHeight: '300px', fontSize: '14px', lineHeight: '1.6', borderRadius: rq.radiusSm }}
                    placeholder="Session notes...&#10;&#10;Example:&#10;- The party met a mysterious merchant in the tavern&#10;- They learned about ancient ruins nearby&#10;- A forgotten shrine was mentioned&#10;- The party agreed to investigate tomorrow"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button type="button" className="btn-secondary" onClick={() => { setShowDialog(false); setNewNote(''); }}>
                    Cancel
                  </Button>
                  <Button data-testid="ingame-note-submit-btn" type="submit" className="btn-primary">
                    Add Note
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {notes.length === 0 ? (
        <>
          <SmartNoteParser 
            campaignId={campaignId} 
            noteText={newNote}
            onUpdateApplied={() => fetchNotes()}
          />
          <Card style={{ padding: '40px', textAlign: 'center', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius }}>
            <p style={{ color: rq.textSecondary }}>No session notes yet. Start taking notes during your game!</p>
          </Card>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 400px)', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notes.map(note => {
              const syncSummaries = getSyncSummaries(note);
              return (
              <Card key={note.id} data-testid={`ingame-note-card-${note.id}`} style={{ background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius }}>
                <CardContent style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', color: rq.muted, marginBottom: '8px' }}>
                        {new Date(note.session_date || note.created_at).toLocaleDateString()} {new Date(note.session_date || note.created_at).toLocaleTimeString()}
                      </p>
                      {note.ai_processed && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(46,139,87,0.12)', borderRadius: rq.radiusSm, border: '1px solid rgba(46,139,87,0.35)', marginRight: '8px' }}>
                          <CheckCircle size={14} style={{ color: rq.success }} />
                          <span style={{ fontSize: '12px', color: rq.success, fontWeight: 800 }}>Rook Processed</span>
                        </div>
                      )}
                      {note.world_synced && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: rq.accentSoft, borderRadius: rq.radiusSm, border: `1px solid ${rq.border}`, marginTop: '6px' }}>
                          <CheckCircle size={14} style={{ color: rq.accentHover }} />
                          <span style={{ fontSize: '12px', color: rq.accentHover, fontWeight: 800 }}>Tabs synced</span>
                        </div>
                      )}
                      {syncSummaries.length > 0 && (
                        <ul style={{ margin: '8px 0 0 18px', padding: 0, color: rq.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
                          {syncSummaries.slice(0, 3).map((summary, index) => <li key={`${note.id}-sync-${index}`}>{summary}</li>)}
                          {syncSummaries.length > 3 && <li>+{syncSummaries.length - 3} more synced update{syncSummaries.length - 3 === 1 ? '' : 's'}</li>}
                        </ul>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        data-testid={`sync-note-btn-${note.id}`}
                        onClick={() => syncNoteIntoCampaignState(note.id)}
                        disabled={syncingNote === note.id}
                        className="btn-outline"
                        style={{ display: 'flex', gap: '8px', fontSize: '12px', padding: '6px 12px' }}
                      >
                        {syncingNote === note.id ? <Loader size={14} className="loading-spinner" /> : <CheckCircle size={14} />}
                        Sync Tabs
                      </Button>
                      {!note.ai_processed && (
                        <Button
                          data-testid={`process-note-btn-${note.id}`}
                          onClick={() => handleProcessWithRook(note.id)}
                          disabled={processingNote === note.id}
                          className="btn-primary"
                          style={{ display: 'flex', gap: '8px', fontSize: '12px', padding: '6px 12px' }}
                        >
                          {processingNote === note.id ? (
                            <>
                              <Loader size={14} className="loading-spinner" />
                              Rook is processing...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Ask Rook
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        data-testid={`delete-ingame-note-btn-${note.id}`}
                        onClick={() => handleDelete(note.id)}
                        className="btn-danger"
                        style={{ padding: '6px 12px' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div style={{ 
                    color: rq.text,
                    fontSize: '14px',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                    background: rq.input,
                    padding: '16px',
                    borderRadius: rq.radiusSm,
                    border: `1px solid ${rq.borderDefault}`
                  }}>
                    {note.content}
                  </div>
                </CardContent>
              </Card>
            );})}
          </div>
          
          <div style={{ position: 'sticky', top: '100px' }}>
            <SmartNoteParser 
              campaignId={campaignId} 
              noteText={newNote}
              onUpdateApplied={() => fetchNotes()}
            />
          </div>
        </div>
      )}

      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="modal" style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius }}>
          <DialogHeader>
            <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: rq.text, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={28} />
              Rook Suggestions
            </DialogTitle>
            <DialogDescription style={{ color: rq.muted, marginTop: '8px' }}>
              Review and apply suggested text additions to your campaign.
            </DialogDescription>
          </DialogHeader>
          {aiSuggestions && (
            <div style={{ marginTop: '20px' }}>
              {aiSuggestions.new_npcs && aiSuggestions.new_npcs.length > 0 && (
                <SuggestionGroup title="New NPCs">
                  {aiSuggestions.new_npcs.map((npc, idx) => (
                    <SuggestionCard key={idx} title={npc.name} description={npc.description} notes={npc.notes}>
                      <Button onClick={() => handleApplySuggestion('new_npc', npc)} className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        Add to NPCs
                      </Button>
                    </SuggestionCard>
                  ))}
                </SuggestionGroup>
              )}

              {aiSuggestions.new_locations && aiSuggestions.new_locations.length > 0 && (
                <SuggestionGroup title="New Locations">
                  {aiSuggestions.new_locations.map((location, idx) => (
                    <SuggestionCard key={idx} title={`${location.name}${location.type ? ` (${location.type})` : ''}`} description={location.description} notes={location.notes}>
                      <Button onClick={() => handleApplySuggestion('new_location', location)} className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        Add to Locations
                      </Button>
                    </SuggestionCard>
                  ))}
                </SuggestionGroup>
              )}

              {aiSuggestions.new_gods && aiSuggestions.new_gods.length > 0 && (
                <SuggestionGroup title="New Gods">
                  {aiSuggestions.new_gods.map((god, idx) => (
                    <SuggestionCard key={idx} title={`${god.name}${god.domain ? ` - ${god.domain}` : ''}`} description={god.description}>
                      <Button onClick={() => handleApplySuggestion('new_god', god)} className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        Add to Gods
                      </Button>
                    </SuggestionCard>
                  ))}
                </SuggestionGroup>
              )}

              {((aiSuggestions.npc_updates && aiSuggestions.npc_updates.length > 0) ||
                (aiSuggestions.location_updates && aiSuggestions.location_updates.length > 0)) && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '12px', color: rq.accentHover, fontWeight: 900 }}>
                    <AlertCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
                    Suggested Updates (Manual Review Needed)
                  </h3>
                  <Card style={{ padding: '16px', background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm }}>
                    <p style={{ color: rq.text, fontSize: '14px', lineHeight: '1.6' }}>
                      Rook detected updates to existing records. Please review and manually update:
                    </p>
                    {aiSuggestions.npc_updates?.map((update, idx) => (
                      <div key={idx} style={{ marginTop: '12px', padding: '12px', background: rq.accentSoft, borderRadius: rq.radiusSm }}>
                        <p style={{ color: rq.text, fontSize: '14px', fontWeight: 800 }}>NPC: {update.name}</p>
                        <p style={{ color: rq.textSecondary, fontSize: '13px', marginTop: '4px' }}>{update.additional_notes}</p>
                      </div>
                    ))}
                    {aiSuggestions.location_updates?.map((update, idx) => (
                      <div key={idx} style={{ marginTop: '12px', padding: '12px', background: rq.accentSoft, borderRadius: rq.radiusSm }}>
                        <p style={{ color: rq.text, fontSize: '14px', fontWeight: 800 }}>Location: {update.name}</p>
                        <p style={{ color: rq.textSecondary, fontSize: '13px', marginTop: '4px' }}>{update.additional_notes}</p>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {(!aiSuggestions.new_npcs || aiSuggestions.new_npcs.length === 0) &&
               (!aiSuggestions.new_locations || aiSuggestions.new_locations.length === 0) &&
               (!aiSuggestions.new_gods || aiSuggestions.new_gods.length === 0) &&
               (!aiSuggestions.npc_updates || aiSuggestions.npc_updates.length === 0) &&
               (!aiSuggestions.location_updates || aiSuggestions.location_updates.length === 0) && (
                <Card style={{ padding: '32px', textAlign: 'center', background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm }}>
                  <p style={{ color: rq.muted }}>No new entities detected in this note.</p>
                </Card>
              )}

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${rq.borderDefault}` }}>
                <Button onClick={() => setShowSuggestionsDialog(false)} className="btn-secondary" style={{ width: '100%' }}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRecapDialog} onOpenChange={setShowRecapDialog}>
        <DialogContent className="modal" style={{ maxWidth: '700px', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius }}>
          <DialogHeader>
            <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: rq.text, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={24} style={{ color: rq.accent }} />
              Session Recap
            </DialogTitle>
            <DialogDescription style={{ color: rq.muted, marginTop: '8px' }}>
              A text summary of your session, ready to share with your players.
            </DialogDescription>
          </DialogHeader>
          
          <div style={{ marginTop: '20px', background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ color: rq.text, fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
              {sessionRecap}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <Button onClick={copyRecapToClipboard} className="btn-outline" style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <Copy size={16} /> Copy to Clipboard
            </Button>
            <Button onClick={downloadRecap} className="btn-outline" style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <Download size={16} /> Download
            </Button>
            <Button onClick={() => setShowRecapDialog(false)} className="btn-primary" style={{ flex: 1 }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getSyncSummaries(note) {
  const summary = note?.world_sync_summary;
  if (!summary) return [];
  if (Array.isArray(summary)) return summary.map(item => typeof item === 'string' ? item : item?.summary).filter(Boolean);
  if (typeof summary === 'string') return [summary];
  if (typeof summary === 'object') return Object.values(summary).flat().map(item => typeof item === 'string' ? item : item?.summary).filter(Boolean);
  return [];
}

function SuggestionGroup({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '12px', color: rq.accentHover, fontWeight: 900 }}>{title}</h3>
      {children}
    </div>
  );
}

function SuggestionCard({ title, description, notes, children }) {
  return (
    <Card style={{ marginBottom: '12px', padding: '16px', background: rq.input, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm }}>
      <h4 style={{ color: rq.text, fontSize: '16px', marginBottom: '8px', fontWeight: 900 }}>{title}</h4>
      <p style={{ color: rq.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{description}</p>
      {notes && <p style={{ color: rq.muted, fontSize: '12px', fontStyle: 'italic', marginBottom: '12px' }}>{notes}</p>}
      {children}
    </Card>
  );
}

export default InGameNotesTab;
