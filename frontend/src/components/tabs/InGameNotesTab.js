import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, Sparkles, CheckCircle, AlertCircle, Loader, FileText, Copy, Download } from 'lucide-react';
import SmartNoteParser from '@/components/SmartNoteParser';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function InGameNotesTab({ campaignId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [processingNote, setProcessingNote] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  
  // Session Recap state
  const [generatingRecap, setGeneratingRecap] = useState(false);
  const [sessionRecap, setSessionRecap] = useState('');
  const [showRecapDialog, setShowRecapDialog] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [campaignId]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/ingame-notes`);
      setNotes(response.data);
    } catch (error) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    try {
      await axios.post(`${API}/campaigns/${campaignId}/ingame-notes`, { content: newNote });
      toast.success('Note added!');
      setNewNote('');
      setShowDialog(false);
      fetchNotes();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleProcessWithAI = async (noteId) => {
    setProcessingNote(noteId);
    try {
      const response = await axios.post(`${API}/campaigns/${campaignId}/ingame-notes/${noteId}/process-ai`);
      setAiSuggestions(response.data.suggestions);
      setShowSuggestionsDialog(true);
      toast.success('AI processing complete!');
      fetchNotes();
    } catch (error) {
      toast.error('AI processing failed');
    } finally {
      setProcessingNote(null);
    }
  };

  const handleApplySuggestion = async (type, data) => {
    try {
      if (type === 'new_npc') {
        await axios.post(`${API}/campaigns/${campaignId}/npcs`, {
          name: data.name,
          description: data.description,
          notes: data.notes || '',
          hp: 10,
          ac: 10
        });
        toast.success(`Added NPC: ${data.name}`);
      } else if (type === 'new_location') {
        await axios.post(`${API}/campaigns/${campaignId}/locations`, {
          name: data.name,
          location_type: data.type || '',
          description: data.description,
          notes: data.notes || ''
        });
        toast.success(`Added Location: ${data.name}`);
      } else if (type === 'new_god') {
        await axios.post(`${API}/campaigns/${campaignId}/gods`, {
          name: data.name,
          domain: data.domain || '',
          description: data.description
        });
        toast.success(`Added God: ${data.name}`);
      }
    } catch (error) {
      toast.error('Failed to apply suggestion');
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/ingame-notes/${noteId}`);
      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  // Generate Session Recap
  const generateSessionRecap = async () => {
    if (notes.length === 0) {
      toast.error('No notes to summarize');
      return;
    }
    
    setGeneratingRecap(true);
    
    try {
      // Call the new backend endpoint that generates and syncs to players
      const res = await axios.post(`${API}/campaigns/${campaignId}/session-recaps`);
      setSessionRecap(res.data.recap);
      setShowRecapDialog(true);
      toast.success(`Recap generated and synced to ${res.data.players_synced} players!`);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('AI limit reached', { description: 'Upgrade to Adventurer for unlimited AI generations.' });
      } else {
        toast.error('Failed to generate recap');
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
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff', marginBottom: '8px' }}>In-Game Notes</h2>
          <p style={{ fontSize: '14px', color: '#bae6fd' }}>Take notes during your session and let AI organize them automatically</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            onClick={generateSessionRecap} 
            disabled={generatingRecap || notes.length === 0}
            className="btn-outline"
            style={{ display: 'flex', gap: '8px', borderColor: '#eab308', color: '#eab308' }}
          >
            {generatingRecap ? <Loader size={16} className="animate-spin" /> : <FileText size={16} />}
            Generate Recap
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-ingame-note-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                <Plus size={18} />
                Add Session Note
              </Button>
            </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '700px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Add Session Note
              </DialogTitle>
              <DialogDescription style={{ color: '#bae6fd', marginTop: '8px' }}>
                Write down what happened in your session. AI will help organize it into NPCs, locations, and more.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddNote} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '24px' }}>
                <textarea
                  data-testid="ingame-note-content-input"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="textarea"
                  style={{ minHeight: '300px', fontSize: '14px', lineHeight: '1.6' }}
                  placeholder="Session notes...&#10;&#10;Example:&#10;- The party met a mysterious merchant named Garrick in the tavern&#10;- They learned about the ancient ruins of Thornhold&#10;- Garrick mentioned the goddess Selune might have blessed the ruins&#10;- The party agreed to investigate tomorrow"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
          <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#bae6fd' }}>No session notes yet. Start taking notes during your game!</p>
          </Card>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
          {/* Notes List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notes.map(note => (
            <Card key={note.id} data-testid={`ingame-note-card-${note.id}`} className="card">
              <CardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: '#bae6fd', marginBottom: '8px' }}>
                      {new Date(note.session_date || note.created_at).toLocaleDateString()} {new Date(note.session_date || note.created_at).toLocaleTimeString()}
                    </p>
                    {note.ai_processed && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                        <CheckCircle size={14} style={{ color: '#22c55e' }} />
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>AI Processed</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!note.ai_processed && (
                      <Button
                        data-testid={`process-note-btn-${note.id}`}
                        onClick={() => handleProcessWithAI(note.id)}
                        disabled={processingNote === note.id}
                        className="btn-primary"
                        style={{ display: 'flex', gap: '8px', fontSize: '12px', padding: '6px 12px' }}
                      >
                        {processingNote === note.id ? (
                          <>
                            <Loader size={14} className="loading-spinner" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Process with AI
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
                  color: '#ffffff',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  background: 'rgba(10, 22, 40, 0.4)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #1e3a5f'
                }}>
                  {note.content}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
          
          {/* Smart Note Parser Sidebar */}
          <div style={{ position: 'sticky', top: '100px' }}>
            <SmartNoteParser 
              campaignId={campaignId} 
              noteText={newNote}
              onUpdateApplied={() => fetchNotes()}
            />
          </div>
        </div>
      )}

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="modal" style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
          <DialogHeader>
            <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={28} />
              AI Suggestions
            </DialogTitle>
            <DialogDescription style={{ color: '#bae6fd', marginTop: '8px' }}>
              Review and apply suggested additions to your campaign
            </DialogDescription>
          </DialogHeader>
          {aiSuggestions && (
            <div style={{ marginTop: '20px' }}>
              {/* New NPCs */}
              {aiSuggestions.new_npcs && aiSuggestions.new_npcs.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 className="gold-text" style={{ fontSize: '18px', marginBottom: '12px' }}>New NPCs</h3>
                  {aiSuggestions.new_npcs.map((npc, idx) => (
                    <Card key={idx} className="parchment-dark" style={{ marginBottom: '12px', padding: '16px' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '8px' }}>{npc.name}</h4>
                      <p style={{ color: '#ffffff', fontSize: '14px', marginBottom: '12px' }}>{npc.description}</p>
                      {npc.notes && <p style={{ color: '#bae6fd', fontSize: '12px', fontStyle: 'italic', marginBottom: '12px' }}>{npc.notes}</p>}
                      <Button
                        onClick={() => handleApplySuggestion('new_npc', npc)}
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Add to NPCs
                      </Button>
                    </Card>
                  ))}
                </div>
              )}

              {/* New Locations */}
              {aiSuggestions.new_locations && aiSuggestions.new_locations.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 className="gold-text" style={{ fontSize: '18px', marginBottom: '12px' }}>New Locations</h3>
                  {aiSuggestions.new_locations.map((location, idx) => (
                    <Card key={idx} className="parchment-dark" style={{ marginBottom: '12px', padding: '16px' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '8px' }}>
                        {location.name} {location.type && `(${location.type})`}
                      </h4>
                      <p style={{ color: '#ffffff', fontSize: '14px', marginBottom: '12px' }}>{location.description}</p>
                      {location.notes && <p style={{ color: '#bae6fd', fontSize: '12px', fontStyle: 'italic', marginBottom: '12px' }}>{location.notes}</p>}
                      <Button
                        onClick={() => handleApplySuggestion('new_location', location)}
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Add to Locations
                      </Button>
                    </Card>
                  ))}
                </div>
              )}

              {/* New Gods */}
              {aiSuggestions.new_gods && aiSuggestions.new_gods.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 className="gold-text" style={{ fontSize: '18px', marginBottom: '12px' }}>New Gods</h3>
                  {aiSuggestions.new_gods.map((god, idx) => (
                    <Card key={idx} className="parchment-dark" style={{ marginBottom: '12px', padding: '16px' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '8px' }}>
                        {god.name} {god.domain && `- ${god.domain}`}
                      </h4>
                      <p style={{ color: '#ffffff', fontSize: '14px', marginBottom: '12px' }}>{god.description}</p>
                      <Button
                        onClick={() => handleApplySuggestion('new_god', god)}
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Add to Gods
                      </Button>
                    </Card>
                  ))}
                </div>
              )}

              {/* Updates to Existing Entities */}
              {((aiSuggestions.npc_updates && aiSuggestions.npc_updates.length > 0) ||
                (aiSuggestions.location_updates && aiSuggestions.location_updates.length > 0)) && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 className="gold-text" style={{ fontSize: '18px', marginBottom: '12px' }}>
                    <AlertCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
                    Suggested Updates (Manual Review Needed)
                  </h3>
                  <Card className="parchment-dark" style={{ padding: '16px' }}>
                    <p style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }}>
                      AI detected updates to existing entities. Please review and manually update:
                    </p>
                    {aiSuggestions.npc_updates?.map((update, idx) => (
                      <div key={idx} style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 31, 143, 0.1)', borderRadius: '6px' }}>
                        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>NPC: {update.name}</p>
                        <p style={{ color: '#ffffff', fontSize: '13px', marginTop: '4px' }}>{update.additional_notes}</p>
                      </div>
                    ))}
                    {aiSuggestions.location_updates?.map((update, idx) => (
                      <div key={idx} style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 31, 143, 0.1)', borderRadius: '6px' }}>
                        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>Location: {update.name}</p>
                        <p style={{ color: '#ffffff', fontSize: '13px', marginTop: '4px' }}>{update.additional_notes}</p>
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
                <Card className="parchment-dark" style={{ padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: '#bae6fd' }}>No new entities detected in this note.</p>
                </Card>
              )}

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1e3a5f' }}>
                <Button
                  onClick={() => setShowSuggestionsDialog(false)}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Recap Dialog */}
      <Dialog open={showRecapDialog} onOpenChange={setShowRecapDialog}>
        <DialogContent className="modal" style={{ maxWidth: '700px' }}>
          <DialogHeader>
            <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={24} style={{ color: '#eab308' }} />
              Session Recap
            </DialogTitle>
            <DialogDescription style={{ color: '#bae6fd', marginTop: '8px' }}>
              A narrative summary of your session, ready to share with your players
            </DialogDescription>
          </DialogHeader>
          
          <div style={{ marginTop: '20px', background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #eab308', borderRadius: '12px', padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ color: '#ffffff', fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
              {sessionRecap}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
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

export default InGameNotesTab;
