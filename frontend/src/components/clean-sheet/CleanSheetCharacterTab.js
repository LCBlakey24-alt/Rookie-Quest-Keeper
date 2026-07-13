import React, { useMemo } from 'react';
import { AlertTriangle, BadgeInfo, Eye, Gauge, Heart, Shield, UserCircle } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { fmt } from './cleanSheetUtils';

function display(value, fallback = 'Not set') {
  return value === undefined || value === null || value === '' ? fallback : value;
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  const normalised = String(value).trim().toLowerCase();
  return Boolean(normalised) && !['none', 'not set', 'not set yet', 'subclass', 'unknown', '—', '-'].includes(normalised);
}

function FieldBlock({ label, value, emptyText = 'Not set yet' }) {
  return (
    <div className="clean-sheet-note-field">
      <span>{label}</span>
      <p>{value || emptyText}</p>
    </div>
  );
}

function DetailWarning({ children }) {
  return (
    <div className="clean-sheet-snapshot-warning clean-sheet-detail-warning">
      <AlertTriangle size={15} />
      <span>{children}</span>
    </div>
  );
}

export default function CleanSheetCharacterTab({ character, ac, speed, proficiencyBonus }) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const warnings = snapshot.warnings || [];
  const identity = snapshot.identity || {};
  const hasPersonality = Boolean(
    character?.personality_trait || character?.personality_traits ||
    character?.ideal || character?.ideals ||
    character?.bond || character?.bonds ||
    character?.flaw || character?.flaws
  );
  const detailWarnings = [
    !hasPersonality ? 'Personality details are empty. Add a trait, ideal, bond, or flaw when ready.' : null,
    !character?.backstory ? 'Backstory is empty. This can be filled in later from the editor.' : null,
    !character?.appearance && !character?.portrait_url ? 'Appearance or portrait is not set yet.' : null,
  ].filter(Boolean);
  const raceLabel = String(identity.edition || character?.edition || character?.ruleset_id || '').includes('2024') ? 'Species' : 'Race';
  const detailCards = [
    ['Name', display(character?.name, 'Unnamed')],
    ['Class', display(identity.primaryClass || character?.character_class, 'Class')],
    hasValue(character?.subclass) ? ['Subclass', display(character.subclass)] : null,
    ['Level', display(identity.level || character?.level || 1)],
    [raceLabel, display(snapshot.race?.name || character?.race || character?.species)],
    ['Background', display(character?.background)],
    ['Alignment', display(character?.alignment)],
    ['Ruleset', display(character?.ruleset_id || character?.rules_edition || character?.edition)],
  ].filter(Boolean);

  return (
    <div className="clean-sheet-grid clean-sheet-character-tab">
      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-character-identity-section">
        <div className="clean-sheet-section-heading-row">
          <h2>Character Details</h2>
          <span>{identity.edition || '2014'} rules</span>
        </div>

        <div className="clean-sheet-skills-summary clean-sheet-character-summary-grid">
          {detailCards.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
      </section>

      {detailWarnings.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-attention-section">
          <h2>Character Details Need Attention</h2>
          {detailWarnings.map(warning => <DetailWarning key={warning}>{warning}</DetailWarning>)}
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
        <div className="clean-sheet-section-heading-row">
          <h2>Personality</h2>
          <Heart size={17} />
        </div>
        <div className="clean-sheet-character-detail-grid">
          <FieldBlock label="Trait" value={character?.personality_trait || character?.personality_traits} />
          <FieldBlock label="Ideal" value={character?.ideal || character?.ideals} />
          <FieldBlock label="Bond" value={character?.bond || character?.bonds} />
          <FieldBlock label="Flaw" value={character?.flaw || character?.flaws} />
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
        <div className="clean-sheet-section-heading-row">
          <h2>Appearance</h2>
          <Eye size={17} />
        </div>
        {character?.portrait_url && <img className="clean-sheet-character-portrait" src={character.portrait_url} alt={`${character?.name || 'Character'} portrait`} />}
        <p className="clean-sheet-backstory-text">{character?.appearance || 'No appearance details found yet.'}</p>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
        <h2>Backstory</h2>
        <p className="clean-sheet-backstory-text">{character?.backstory || 'No backstory found yet.'}</p>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
        <h2>Sheet Snapshot</h2>
        <div className="clean-sheet-core-stat-grid">
          <div className="clean-sheet-core-stat-card"><Shield size={15} /><span>AC</span><strong>{display(ac ?? character?.armor_class ?? 10)}</strong></div>
          <div className="clean-sheet-core-stat-card"><Gauge size={15} /><span>Speed</span><strong>{display(snapshot.race?.speed || speed || character?.speed || 30)}ft</strong></div>
          <div className="clean-sheet-core-stat-card"><BadgeInfo size={15} /><span>Prof</span><strong>{fmt(snapshot.proficiencyBonus || proficiencyBonus || 2)}</strong></div>
          <div className="clean-sheet-core-stat-card"><UserCircle size={15} /><span>Warnings</span><strong>{warnings.length + detailWarnings.length}</strong></div>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
          <h2>Readiness Warnings</h2>
          {warnings.slice(0, 3).map(warning => (
            <DetailWarning key={warning}>{warning}</DetailWarning>
          ))}
        </section>
      )}
    </div>
  );
}
