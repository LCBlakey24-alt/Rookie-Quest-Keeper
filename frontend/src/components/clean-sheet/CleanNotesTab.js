import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

export default function CleanNotesTab({ character, onCharacterUpdate }) {
  const [notes, setNotes] = useState(character?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(character?.notes || '');
  }, [character?.id, character?.notes]);

  const saveNotes = async () => {
    if (!character?.id || saving) return;
    setSaving(true);
    try {
      await apiClient.patch(`/characters/${character.id}`, { notes });
      onCharacterUpdate?.({ notes });
      toast.success('Notes saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="clean-sheet-grid clean-sheet-notes-tab">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Notes</h2>
            <p>Use this during play for session notes, clues, NPC names, loot reminders, and anything the player wants to jot down.</p>
          </div>
          <span>{notes.trim().length} chars</span>
        </div>
        <textarea
          className="clean-sheet-notes-textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Write live character notes here..."
        />
        <div className="clean-sheet-notes-actions">
          <button type="button" onClick={saveNotes} disabled={saving}>
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </section>
    </div>
  );
}
