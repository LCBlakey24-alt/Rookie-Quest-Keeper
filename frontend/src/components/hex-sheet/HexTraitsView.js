import React, { useMemo, useState } from 'react';

import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';
import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { mergeFeatures } from '@/components/clean-sheet/CleanSheetFeaturesTab';
import { traitSections } from './traitsModel';

const EMPTY = {
  class: 'No class features saved yet.',
  race: 'No traits saved yet.',
  feats: 'No feats yet. Feats you take when levelling up appear here.',
  background: 'No background saved yet.',
};

/**
 * Traits & Feats on the hexagon sheet: turn the wheel to Class, Race (or
 * Species), Feats or Background, and the traits from it are listed below:
 * a few key facts, then each trait by name. Tap a trait to read it.
 * "All details" opens the full class page (resources, homebrew, checks).
 */
export default function HexTraitsView({ character, classFeatureSummary = [], rulesEdition = '2014', onMore, moreOpen = false }) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const classFeatures = useMemo(() => mergeFeatures(snapshot.features, classFeatureSummary), [snapshot.features, classFeatureSummary]);
  const sections = useMemo(
    () => traitSections(character, { classFeatures, snapshotRace: snapshot.race || {}, rulesEdition }),
    [character, classFeatures, snapshot.race, rulesEdition],
  );
  const [sectionId, setSectionId] = useState('class');
  const [open, setOpen] = useState(null);
  const current = sections.find((section) => section.id === sectionId) || sections[0];

  return (
    <section className="hex-traits" aria-label="Traits and feats" data-testid="hex-traits">
      <GuildChoiceWheel
        label="Traits"
        caption="TRAITS"
        options={sections.map((section) => ({ id: section.id, label: section.label }))}
        value={current.id}
        onChange={(id) => { setSectionId(id); setOpen(null); }}
        centreNote={`${current.items.length} ${current.items.length === 1 ? 'trait' : 'traits'}`}
      />
      <div className="hex-traits__list" data-testid="hex-traits-list">
        {current.facts.length > 0 && (
          <dl className="hex-traits__facts" data-testid="hex-traits-facts">
            {current.facts.map((fact) => (
              <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
            ))}
          </dl>
        )}
        {current.items.length ? current.items.map((item, index) => {
          const key = `${current.id}-${item.name}-${index}`;
          const isOpen = open === key;
          return (
            <article key={key} className={`hex-trait${isOpen ? ' is-open' : ''}`} data-testid={`hex-trait-${item.name}`}>
              <button type="button" className="hex-trait__name" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen} disabled={!item.description}>
                <strong>{item.name}</strong>
                {item.tag && <small>{item.tag}</small>}
              </button>
              {isOpen && item.description && <p>{item.description}</p>}
            </article>
          );
        }) : <p className="hex-traits__empty">{EMPTY[current.id]}</p>}
        {onMore && (
          <button type="button" className="hex-sheet__text-button hex-traits__more" onClick={onMore} aria-expanded={moreOpen} data-testid="hex-traits-more">
            <span className="hex-glass" aria-hidden="true" />
            {moreOpen ? 'Hide all details' : 'All details: resources, homebrew and checks'}
          </button>
        )}
      </div>
    </section>
  );
}
