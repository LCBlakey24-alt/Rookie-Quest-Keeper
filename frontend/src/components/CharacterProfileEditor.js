import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Heart, LockKeyhole, Shield, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import {
  buildCharacterProfileDraft,
  buildCharacterProfilePatch,
  protectedStateSummary,
} from '@/data/characterProfileEdit';
import './FullCharacterCreatorV2.css';
import './FullCharacterCreatorFlow.css';

const emptyDraft = buildCharacterProfileDraft({});

function Field({ label, children }) {
  return <label><span>{label}</span>{children}</label>;
}

function ReadOnlyItem({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

export default function CharacterProfileEditor() {
  const navigate = useNavigate();
  const { characterId } = useParams();
  const [character, setCharacter] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCharacter() {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/characters/${characterId}`);
        if (cancelled) return;
        setCharacter(data);
        setDraft(buildCharacterProfileDraft(data));
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Could not load character for editing');
        navigate('/characters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (characterId) loadCharacter();
    return () => { cancelled = true; };
  }, [characterId, navigate]);

  const protectedState = useMemo(() => protectedStateSummary(character || {}), [character]);
  const raceLabel = String(character?.rules_edition || character?.edition || character?.ruleset_id || '').includes('2024') ? 'Species' : 'Race';
  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  async function saveProfile() {
    const patch = buildCharacterProfilePatch(draft);
    if (!patch.name) {
      toast.error('Give your character a name before saving.');
      return;
    }

    try {
      setSaving(true);
      const { data } = await apiClient.patch(`/characters/${characterId}`, patch);
      setCharacter(data || { ...character, ...patch });
      toast.success('Character profile updated');
      navigate(`/characters/${characterId}`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save character profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="full-creator-page"><div className="full-creator-loading">Loading character editor…</div></main>;
  }

  if (!character) return null;

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button type="button" onClick={() => navigate(`/characters/${characterId}`)}><ArrowLeft size={17} /> Character Sheet</button>
        <div>
          <p>Existing character editor</p>
          <h1>Edit {character.name || 'Character'}</h1>
          <span>Update profile and story details without resetting anything earned or spent in play.</span>
        </div>
        <button type="button" onClick={() => navigate('/characters')}>Characters</button>
      </header>

      <section className="full-creator-progress-card" aria-label="Protected character progression">
        <div className="full-creator-progress-heading">
          <span>Progression protected</span>
          <strong>Level {protectedState.level}</strong>
        </div>
        <p>Class levels, HP, Hit Dice, spell slots, class resources, conditions, inventory, equipped items, currency, and level-up choices are deliberately locked here. Use the live sheet and Level Up flow for those systems.</p>
      </section>

      <section className="full-creator-workspace">
        <section className="full-creator-layout">
          <article className="full-creator-panel">
            <div className="full-creator-section-title">
              <UserRound size={21} />
              <div>
                <h2>Profile</h2>
                <p>These are descriptive details that are safe to change on an existing adventurer.</p>
              </div>
            </div>

            <div className="full-creator-form-grid">
              <Field label="Character name"><input value={draft.name} onChange={(event) => update('name', event.target.value)} autoFocus /></Field>
              <Field label="Alignment"><input value={draft.alignment} onChange={(event) => update('alignment', event.target.value)} placeholder="Neutral Good, Chaotic Neutral…" /></Field>
              <Field label="Portrait URL"><input value={draft.portraitUrl} onChange={(event) => update('portraitUrl', event.target.value)} placeholder="https://…" /></Field>
            </div>

            <div className="full-creator-auto-box">
              <strong><LockKeyhole size={15} /> Rules identity is read-only here</strong>
              <span>{protectedState.classSummary} • {raceLabel}: {character.race || character.species || 'Not set'}{character.subrace ? ` (${character.subrace})` : ''} • Background: {character.background || 'Not set'} • {character.rules_edition || character.edition || '2014'} rules</span>
            </div>

            <div className="full-creator-section-title">
              <Heart size={21} />
              <div>
                <h2>Personality</h2>
                <p>Keep the roleplay side of the sheet easy to update as the character changes.</p>
              </div>
            </div>

            <div className="full-creator-form-grid">
              <Field label="Personality trait"><textarea value={draft.personalityTrait} onChange={(event) => update('personalityTrait', event.target.value)} /></Field>
              <Field label="Ideal"><textarea value={draft.ideal} onChange={(event) => update('ideal', event.target.value)} /></Field>
              <Field label="Bond"><textarea value={draft.bond} onChange={(event) => update('bond', event.target.value)} /></Field>
              <Field label="Flaw"><textarea value={draft.flaw} onChange={(event) => update('flaw', event.target.value)} /></Field>
            </div>

            <div className="full-creator-section-title">
              <Shield size={21} />
              <div>
                <h2>Story & appearance</h2>
                <p>These fields can grow with the campaign without touching combat state.</p>
              </div>
            </div>

            <div className="full-creator-form-grid">
              <Field label="Appearance"><textarea value={draft.appearance} onChange={(event) => update('appearance', event.target.value)} placeholder="Clothing, scars, build, notable features…" /></Field>
              <Field label="Backstory"><textarea value={draft.backstory} onChange={(event) => update('backstory', event.target.value)} placeholder="Character history…" /></Field>
              <Field label="Notes"><textarea value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Private character notes…" /></Field>
            </div>
          </article>

          <aside className="full-creator-preview">
            <p>Protected sheet snapshot</p>
            <h2>{draft.name || character.name || 'Unnamed Character'}</h2>
            <span>{protectedState.classSummary}</span>
            <div className="full-creator-mini-grid">
              <strong>{protectedState.currentHp}/{protectedState.maxHp || '—'}</strong><span>HP</span>
              <strong>{protectedState.armorClass}</strong><span>AC</span>
              <strong>{protectedState.level}</strong><span>Level</span>
            </div>
            <div className="full-creator-review-grid">
              <ReadOnlyItem label="Inventory" value={`${protectedState.inventoryCount} item${protectedState.inventoryCount === 1 ? '' : 's'}`} />
              <ReadOnlyItem label="Resources" value={protectedState.resourceCount} />
              <ReadOnlyItem label="Spell slot levels" value={protectedState.spellSlotLevels} />
              <ReadOnlyItem label={raceLabel} value={character.race || character.species || 'Not set'} />
            </div>
            <small>Saving this page does not refill HP, rests, spell slots, Pact Magic, Hit Dice, or class resources.</small>
          </aside>
        </section>
      </section>

      <footer className="full-creator-footer">
        <button type="button" onClick={() => navigate(`/characters/${characterId}`)} disabled={saving}><ArrowLeft size={16} /> Cancel</button>
        <button type="button" onClick={saveProfile} disabled={saving}><Check size={16} /> {saving ? 'Saving…' : 'Save Profile'}</button>
      </footer>
    </main>
  );
}
