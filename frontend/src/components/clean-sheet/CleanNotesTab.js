import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const AUTOSAVE_DELAY_MS = 1200;
const DRAFT_PREFIX = 'rqk.character-notes-draft:';

function draftKey(characterId) {
  return `${DRAFT_PREFIX}${characterId}`;
}

export function readCharacterNotesDraft(characterId) {
  if (!characterId) return null;
  try {
    return localStorage.getItem(draftKey(characterId));
  } catch {
    return null;
  }
}

export function writeCharacterNotesDraft(characterId, notes) {
  if (!characterId) return false;
  try {
    localStorage.setItem(draftKey(characterId), String(notes ?? ''));
    return true;
  } catch {
    return false;
  }
}

export function clearCharacterNotesDraft(characterId) {
  if (!characterId) return;
  try {
    localStorage.removeItem(draftKey(characterId));
  } catch {
    // Storage can be blocked; the in-memory draft still remains until this tab unmounts.
  }
}

export default function CleanNotesTab({ character, onCharacterUpdate }) {
  const characterId = character?.id || '';
  const serverNotes = String(character?.notes || '');
  const initialDraft = readCharacterNotesDraft(characterId);
  const [notes, setNotes] = useState(initialDraft !== null ? initialDraft : serverNotes);
  const [savedNotes, setSavedNotes] = useState(serverNotes);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const nextServerNotes = String(character?.notes || '');
    const draft = readCharacterNotesDraft(characterId);
    setSavedNotes(nextServerNotes);
    setNotes(draft !== null ? draft : nextServerNotes);
    setSaveError('');
  }, [characterId]);

  const dirty = notes !== savedNotes;

  const saveNotes = useCallback(async ({ manual = false } = {}) => {
    const valueToSave = notesRef.current;
    if (!characterId || saving || valueToSave === savedNotes) return true;

    setSaving(true);
    setSaveError('');
    try {
      await apiClient.patch(`/characters/${characterId}`, { notes: valueToSave });
      setSavedNotes(valueToSave);
      onCharacterUpdate?.({ notes: valueToSave });
      if (notesRef.current === valueToSave) clearCharacterNotesDraft(characterId);
      else writeCharacterNotesDraft(characterId, notesRef.current);
      if (manual) toast.success('Notes saved');
      return true;
    } catch (error) {
      const message = error?.response?.data?.detail || 'Could not save notes';
      setSaveError(message);
      if (manual) toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [characterId, onCharacterUpdate, savedNotes, saving]);

  useEffect(() => {
    if (!dirty || saving || saveError || !characterId) return undefined;
    const timer = window.setTimeout(() => {
      saveNotes();
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [characterId, dirty, notes, saveError, saveNotes, saving]);

  const handleNotesChange = (event) => {
    const nextNotes = event.target.value;
    notesRef.current = nextNotes;
    setNotes(nextNotes);
    setSaveError('');
    if (nextNotes === savedNotes) clearCharacterNotesDraft(characterId);
    else writeCharacterNotesDraft(characterId, nextNotes);
  };

  const saveStatus = saving
    ? 'Saving…'
    : saveError
      ? 'Save failed — your draft is still here. Retry Save.'
      : dirty
        ? 'Unsaved changes · autosaving shortly…'
        : 'Saved';

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
          onChange={handleNotesChange}
          onBlur={() => { if (dirty && !saving) saveNotes(); }}
          placeholder="Write live character notes here..."
          aria-describedby="character-notes-save-status"
        />
        <div className="clean-sheet-notes-actions">
          <span id="character-notes-save-status" data-testid="character-notes-save-status" role="status">
            {saveStatus}
          </span>
          <button type="button" onClick={() => saveNotes({ manual: true })} disabled={saving || !dirty}>
            {saving ? 'Saving...' : saveError ? 'Retry Save' : dirty ? 'Save Now' : 'Saved'}
          </button>
        </div>
      </section>
    </div>
  );
}
