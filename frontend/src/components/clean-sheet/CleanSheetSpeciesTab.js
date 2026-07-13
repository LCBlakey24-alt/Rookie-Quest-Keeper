import React, { useMemo } from 'react';
import { AlertTriangle, Footprints, Languages, UsersRound } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { toArray } from './cleanSheetUtils';

function normaliseTrait(trait) {
  if (!trait) return { name: 'Unknown trait', description: '' };
  if (typeof trait === 'string') return { name: trait.split(' (')[0], description: trait };
  return {
    name: trait.name || trait.title || trait.label || 'Trait',
    description: trait.description || trait.desc || trait.summary || trait.text || '',
    source: trait.source || trait.type || '',
  };
}

function TraitCard({ trait, fallbackSource }) {
  const item = normaliseTrait(trait);
  return (
    <article className="clean-sheet-feature-card">
      <div className="clean-sheet-feature-topline">
        <span>{item.source || fallbackSource}</span>
      </div>
      <strong>{item.name}</strong>
      {item.description && <p>{item.description}</p>}
    </article>
  );
}

function ChipList({ title, values, emptyText }) {
  return (
    <section className="clean-sheet-panel">
      <h2>{title}</h2>
      {values.length ? (
        <div className="clean-sheet-chip-list">
          {values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
        </div>
      ) : (
        <p className="clean-sheet-muted">{emptyText}</p>
      )}
    </section>
  );
}

export default function CleanSheetSpeciesTab({ character, rulesEdition }) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const label = rulesEdition === '2024' ? 'Species' : 'Race';
  const speciesName = character?.race || character?.species || snapshot.race?.name || 'Not set';
  const subrace = character?.subrace || character?.subspecies || '';
  const traits = toArray(character?.racial_traits || character?.species_traits || character?.traits);
  const languages = toArray(character?.languages);
  const speed = snapshot.race?.speed || character?.speed || 30;
  const senses = toArray(character?.senses || character?.special_senses);
  const warnings = [
    !traits.length ? `${label} traits are missing or not saved yet.` : null,
    !languages.length ? 'Languages are missing or still need choosing.' : null,
  ].filter(Boolean);

  return (
    <div className="clean-sheet-grid clean-sheet-species-tab">
      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>{label}</h2>
            <p>{rulesEdition} rules • {subrace ? `${speciesName} (${subrace})` : speciesName}</p>
          </div>
          <UsersRound size={20} />
        </div>
        <div className="clean-sheet-readiness-grid">
          <div><span>{label}</span><strong>{speciesName}</strong><em>{subrace || 'No sub option recorded'}</em></div>
          <div><span>Speed</span><strong>{speed}ft</strong><em>Check armour and conditions if this changes.</em></div>
          <div><span>Traits</span><strong>{traits.length}</strong><em>{traits.length ? 'Saved traits found.' : 'Needs review.'}</em></div>
          <div><span>Languages</span><strong>{languages.length}</strong><em>{languages.length ? languages.join(', ') : 'Needs choosing.'}</em></div>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-attention-section">
          <h2>{label} Needs Attention</h2>
          {warnings.map(warning => (
            <div key={warning} className="clean-sheet-snapshot-warning clean-sheet-detail-warning">
              <AlertTriangle size={15} />
              <span>{warning}</span>
            </div>
          ))}
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>{label} Traits</h2>
            <p>Features coming from the character's {label.toLowerCase()} choice.</p>
          </div>
          <Footprints size={18} />
        </div>
        {traits.length ? (
          <div className="clean-sheet-feature-grid">
            {traits.map((trait, index) => <TraitCard key={`${normaliseTrait(trait).name}-${index}`} trait={trait} fallbackSource={label} />)}
          </div>
        ) : (
          <p className="clean-sheet-muted">No {label.toLowerCase()} traits found yet.</p>
        )}
      </section>

      <ChipList title="Languages" values={languages} emptyText="No languages found yet." />
      <ChipList title="Senses" values={senses} emptyText="No special senses found yet." />

      <section className="clean-sheet-panel">
        <h2><Languages size={16} /> Rules wording</h2>
        <p className="clean-sheet-muted">
          {rulesEdition === '2024'
            ? 'Using 2024 wording: this page uses Species rather than Race.'
            : 'Using 2014 wording: this page uses Race. If this character switches to 2024 rules, the label changes to Species.'}
        </p>
      </section>
    </div>
  );
}
