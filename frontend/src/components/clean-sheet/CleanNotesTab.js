import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

function FieldBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="clean-sheet-note-field">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function normaliseEntry(entry) {
  if (!entry) return { name: 'Unknown', description: '' };
  if (typeof entry === 'string') return { name: entry, description: '' };
  return {
    name: entry.name || entry.title || entry.label || 'Unknown',
    description: entry.description || entry.desc || entry.summary || entry.text || '',
    source: entry.source || entry.type || (entry.level ? `Level ${entry.level}` : ''),
  };
}

function flattenProgressionChoices(levelProgression = {}) {
  return Object.entries(levelProgression || {})
    .flatMap(([level, entry]) => {
      const choices = Array.isArray(entry?.choices) ? entry.choices : [];
      return choices.map(choice => ({ ...choice, level: Number(level) || choice.level || 1 }));
    })
    .sort((a, b) => Number(a.level || 0) - Number(b.level || 0));
}

function FeatureCard({ entry, fallbackSource }) {
  const [expanded, setExpanded] = useState(false);
  const item = normaliseEntry(entry);
  const hasDescription = Boolean(item.description);
  const source = item.source || fallbackSource;

  return (
    <button
      type="button"
      className={`clean-sheet-feature-card ${expanded ? 'expanded' : ''}`}
      onClick={() => hasDescription && setExpanded(prev => !prev)}
    >
      <div className="clean-sheet-feature-topline">
        {source && <span>{source}</span>}
        {hasDescription && <em>{expanded ? 'Collapse' : 'Expand'}</em>}
      </div>
      <strong>{item.name}</strong>
      {hasDescription && (
        <p>{expanded ? item.description : `${item.description.slice(0, 150)}${item.description.length > 150 ? '…' : ''}`}</p>
      )}
    </button>
  );
}

function FeatureSection({ title, entries, emptyText, fallbackSource }) {
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>{title}</h2>
      {entries.length > 0 ? (
        <div className="clean-sheet-feature-grid">
          {entries.map((entry, index) => (
            <FeatureCard key={`${normaliseEntry(entry).name}-${index}`} entry={entry} fallbackSource={fallbackSource} />
          ))}
        </div>
      ) : (
        <p className="clean-sheet-muted">{emptyText}</p>
      )}
    </section>
  );
}

function ChipList({ title, values, emptyText }) {
  return (
    <section className="clean-sheet-panel">
      <h2>{title}</h2>
      {values.length > 0 ? (
        <div className="clean-sheet-chip-list">
          {values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
        </div>
      ) : (
        <p className="clean-sheet-muted">{emptyText}</p>
      )}
    </section>
  );
}

function BuildReviewSection({ choices }) {
  if (!choices.length) return null;
  const reviewCount = choices.filter(choice => choice.status !== 'done').length;
  const decidedCount = choices.length - reviewCount;

  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>Build Review</h2>
      <p className="clean-sheet-muted">
        Choices saved during character creation or starting-level catch-up. Use these to finish anything that was left for full edit or level-up review.
      </p>
      <div className="clean-sheet-chip-list">
        <span>{decidedCount} decided</span>
        <span>{reviewCount} needs review</span>
      </div>
      <div className="clean-sheet-feature-grid">
        {choices.map(choice => (
          <article key={choice.id || `${choice.level}-${choice.title}`} className="clean-sheet-feature-card">
            <div className="clean-sheet-feature-topline">
              <span>Level {choice.level}</span>
              <em>{choice.status === 'done' ? 'Decided' : choice.required ? 'Needs review' : 'Optional'}</em>
            </div>
            <strong>{choice.title || choice.type}</strong>
            {choice.selection && <p>{choice.selection}</p>}
            {choice.note && <p>{choice.note}</p>}
            {choice.rook_prompt && <p>Rook: {choice.rook_prompt}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

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

  const hasPersonality = Boolean(
    character?.personality_trait || character?.personality_traits ||
    character?.ideal || character?.ideals ||
    character?.bond || character?.bonds ||
    character?.flaw || character?.flaws
  );

  const racialTraits = useMemo(() => character?.racial_traits || character?.traits || [], [character]);
  const classFeatures = useMemo(() => character?.class_features || character?.features || [], [character]);
  const feats = useMemo(() => character?.feats || [], [character]);
  const languages = useMemo(() => character?.languages || [], [character]);
  const tools = useMemo(() => character?.tool_proficiencies || [], [character]);
  const weapons = useMemo(() => character?.weapon_proficiencies || [], [character]);
  const armour = useMemo(() => character?.armor_proficiencies || character?.armour_proficiencies || [], [character]);
  const buildReviewChoices = useMemo(() => flattenProgressionChoices(character?.level_progression), [character?.level_progression]);

  return (
    <div className="clean-sheet-grid">
      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Character Notes</h2>
        <textarea
          className="clean-sheet-notes-textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Write character notes here..."
        />
        <div className="clean-sheet-notes-actions">
          <button type="button" onClick={saveNotes} disabled={saving}>
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </section>

      <BuildReviewSection choices={buildReviewChoices} />

      <section className="clean-sheet-panel">
        <h2>Personality</h2>
        <FieldBlock label="Trait" value={character?.personality_trait || character?.personality_traits} />
        <FieldBlock label="Ideal" value={character?.ideal || character?.ideals} />
        <FieldBlock label="Bond" value={character?.bond || character?.bonds} />
        <FieldBlock label="Flaw" value={character?.flaw || character?.flaws} />
        {!hasPersonality && <p className="clean-sheet-muted">No personality details found yet.</p>}
      </section>

      <section className="clean-sheet-panel">
        <h2>Backstory</h2>
        {character?.backstory ? (
          <p className="clean-sheet-backstory-text">{character.backstory}</p>
        ) : (
          <p className="clean-sheet-muted">No backstory found yet.</p>
        )}
      </section>

      <FeatureSection title="Racial Traits" entries={racialTraits} fallbackSource={character?.race || 'Trait'} emptyText="No racial traits found yet." />
      <FeatureSection title="Class Features" entries={classFeatures} fallbackSource={character?.character_class || 'Class'} emptyText="No class features found yet." />
      <FeatureSection title="Feats" entries={feats} fallbackSource="Feat" emptyText="No feats found yet." />

      <ChipList title="Languages" values={languages} emptyText="No languages found yet." />
      <ChipList title="Tool Proficiencies" values={tools} emptyText="No tool proficiencies found yet." />
      <ChipList title="Weapon Proficiencies" values={weapons} emptyText="No weapon proficiencies found yet." />
      <ChipList title="Armour Proficiencies" values={armour} emptyText="No armour proficiencies found yet." />
    </div>
  );
}
