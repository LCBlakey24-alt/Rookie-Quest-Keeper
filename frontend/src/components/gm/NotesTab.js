import React from 'react';
import { FileText, Send, Users, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import RookFormFillPanel from '@/components/RookFormFillPanel';

export default function NotesTab({ theme, campaignId, quickNote, setQuickNote, processingNote, handleSubmitNote, sessionNotes, setSessionNotes }) {
  const syncNote = async () => {
    if (!quickNote.trim()) return;
    try {
      await apiClient.post(`/campaigns/${campaignId}/sync-note`, {
        note_content: quickNote,
        note_type: 'gm_note',
        title: 'Session Update',
        create_timeline_event: true
      });
      toast.success('Note synced to all players!');
      setQuickNote('');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to sync note');
    }
  };

  const accent = theme?.accent?.gm || theme?.accent?.primary || 'var(--rq-accent-primary, #C1121F)';
  const border = theme?.border || 'var(--rq-accent-border, rgba(193,18,31,0.35))';
  const textPrimary = theme?.text?.primary || 'var(--rq-text-primary, #FFFFFF)';
  const textSecondary = theme?.text?.secondary || 'var(--rq-text-secondary, #D6D6D6)';
  const textMuted = theme?.text?.muted || 'var(--rq-text-muted, #A0A0A0)';
  const cardBg = theme?.bg?.card || 'var(--rq-bg-panel, #242424)';

  return (
    <div>
      <h2 style={{ fontSize: '22px', color: textPrimary, fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileText size={24} style={{ color: accent }} /> Session Notes
      </h2>

      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', color: accent, fontWeight: 800, marginBottom: '12px' }}>Quick Note</h3>
          <RookFormFillPanel
            title="Ask Rook to draft a note"
            helperText="Describe the moment, clue, NPC reveal, or recap you need. Import the result straight into the note box."
            section="GM quick session note"
            campaignId={campaignId}
            fields={[{ name: 'quick_note', label: 'Quick note', field_type: 'textarea' }]}
            currentValues={{ quick_note: quickNote }}
            onApply={(patch) => { if (patch.quick_note !== undefined) setQuickNote(String(patch.quick_note)); }}
            placeholder="Example: Draft a short recap that the party found a coded map in the smugglers' warehouse."
          />
          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            style={{ minHeight: '150px', marginBottom: '12px', fontSize: '15px', width: '100%', background: 'var(--rq-bg-input, #1F1F1F)', border: `1px solid ${border}`, borderRadius: 'var(--rq-radius-sm, 4px)', padding: '14px', color: textPrimary, resize: 'vertical' }}
            placeholder="Write a quick note about the session... people met, events, plot points, etc."
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              onClick={handleSubmitNote}
              disabled={processingNote || !quickNote.trim()}
              className="press-scale"
              style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center', background: 'var(--rq-accent-primary, #C1121F)', color: textPrimary, border: '1px solid var(--rq-accent-primary, #C1121F)', borderRadius: 'var(--rq-radius-sm, 4px)', padding: '14px', fontSize: '15px', fontWeight: 800 }}
            >
              {processingNote ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Save Note
            </Button>
            <Button
              onClick={syncNote}
              disabled={!quickNote.trim()}
              className="press-scale tab-glow"
              style={{ display: 'flex', gap: '8px', justifyContent: 'center', background: 'var(--rq-accent-soft, rgba(193,18,31,0.12))', color: 'var(--rq-accent-hover, #D62839)', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))', borderRadius: 'var(--rq-radius-sm, 4px)', padding: '14px', fontSize: '14px', whiteSpace: 'nowrap', fontWeight: 800 }}
            >
              <Users size={16} /> Sync to Players
            </Button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', color: accent, fontWeight: 800, marginBottom: '12px' }}>Recent Notes ({sessionNotes.length})</h3>
          <div className="scroll-smooth" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionNotes.length === 0 ? (
              <div className="card-hover" style={{ background: cardBg, border: `2px dashed ${border}`, padding: '30px', textAlign: 'center', borderRadius: 'var(--rq-radius-sm, 4px)' }}>
                <FileText size={32} style={{ color: textMuted, margin: '0 auto 12px' }} />
                <p style={{ color: textSecondary, fontSize: '13px' }}>No notes yet</p>
              </div>
            ) : (
              sessionNotes.map(note => (
                <div key={note.id} className="card-hover" style={{ background: cardBg, border: `1px solid ${border}`, padding: '12px', borderRadius: 'var(--rq-radius-sm, 4px)' }}>
                  <div style={{ fontSize: '10px', color: textMuted, marginBottom: '6px' }}>
                    {new Date(note.created_at).toLocaleString()}
                  </div>
                  <div style={{ color: textPrimary, fontSize: '13px', lineHeight: '1.5' }}>{note.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
