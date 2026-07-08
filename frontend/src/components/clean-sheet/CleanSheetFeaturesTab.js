import React, { useMemo, useState } from 'react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { featureTypeLabel, fmt } from './cleanSheetUtils';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const firstArray = (...values) => values.find(value => toArray(value).length) || [];
const oneOrArray = (value) => value ? (Array.isArray(value) ? value : [value]) : [];

function mergeFeatures(snapshotFeatures = [], legacyFeatures = []) {
  const seen = new Set();
  return [...snapshotFeatures, ...legacyFeatures]
    .filter(feature => feature?.name && !feature.isChoice)
    .filter(feature => {
      const key = `${String(feature.name).toLowerCase()}-${feature.level || ''}-${feature.source || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
}

function groupFeatures(features = []) {
  const groups = {
    Action: [],
    'Bonus action': [],
    Reaction: [],
    Passive: [],
  };

  features.forEach(feature => {
    const label = featureTypeLabel(feature.type);
    if (label === 'Action' || label === 'Special' || label === 'Attack modifier') groups.Action.push(feature);
    else if (label === 'Bonus action') groups['Bonus action'].push(feature);
    else if (label === 'Reaction') groups.Reaction.push(feature);
    else groups.Passive.push(feature);
  });

  return groups;
}

function selectedClassChoiceGroups(character = {}) {
  return [
    ['Fighting Style', firstArray(character.fighting_styles, oneOrArray(character.fighting_style))],
    ['Expertise', firstArray(character.expertise_choices, character.expertise)],
    ['Metamagic', firstArray(character.metamagic_options, character.metamagic)],
    ['Maneuvers', firstArray(character.combat_maneuvers, character.maneuvers)],
    ['Pact Boon', firstArray(oneOrArray(character.pact_boon), oneOrArray(character.pactBoon))],
    ['Eldritch Invocations', firstArray(character.eldritch_invocations, character.invocations)],
  ].filter(([, items]) => toArray(items).length);
}

function savedResourceCards(character = {}) {
  const cards = [];
  const sorceryMax = Number(character.sorcery_points || 0);
  if (sorceryMax > 0) {
    cards.push({
      key: 'sorcery_points',
      label: 'Sorcery Points',
      className: 'Sorcerer',
      current: Number(character.sorcery_points_remaining ?? sorceryMax),
      max: sorceryMax,
      restore: 'long-rest',
      field: 'sorcery_points_remaining',
    });
  }

  const superiority = character.superiority_dice || {};
  const superiorityMax = Number(superiority.total || 0);
  if (superiorityMax > 0) {
    cards.push({
      key: 'superiority_dice',
      label: `Superiority Dice ${superiority.die || ''}`.trim(),
      className: 'Battle Master',
      current: Number(superiority.remaining ?? superiorityMax),
      max: superiorityMax,
      restore: 'short-rest',
      nestedField: 'superiority_dice',
      nestedCurrentKey: 'remaining',
    });
  }

  toArray(character.homebrew_resources).forEach((resource, index) => {
    const max = Number(resource.max || resource.maximum || resource.total || resource.uses || 0);
    if (!max) return;
    cards.push({
      key: resource.key || resource.name || `homebrew-resource-${index}`,
      label: resource.label || resource.name || `Homebrew Resource ${index + 1}`,
      className: resource.className || resource.source || 'Homebrew',
      current: Number(resource.current ?? resource.remaining ?? max),
      max,
      restore: resource.restore || resource.recovery || 'long-rest',
    });
  });

  return cards;
}

function ResourceCard({ resource, onChange }) {
  const [saving, setSaving] = useState(false);
  const current = Math.max(0, Math.min(Number(resource.max || 0), Number(resource.current || 0)));
  const max = Number(resource.max || 0);
  const canPatch = Boolean(onChange && (resource.field || resource.nestedField));

  const update = async (delta) => {
    if (!canPatch || saving) return;
    const nextValue = Math.max(0, Math.min(max, current + delta));
    if (nextValue === current) return;
    setSaving(true);
    if (resource.field) {
      await onChange({ [resource.field]: nextValue }, { error: `Could not update ${resource.label}` });
    } else if (resource.nestedField) {
      await onChange({ [resource.nestedField]: { ...(resource.raw || {}), remaining: nextValue } }, { error: `Could not update ${resource.label}` });
    }
    setSaving(false);
  };

  return (
    <div>
      <span>{resource.className || 'Class'}</span>
      <strong>{resource.label}</strong>
      <em>{current}/{max} • restores on {String(resource.restore || 'long-rest').replace('-', ' ')}</em>
      {canPatch && (
        <div className="clean-sheet-slot-actions">
          <button type="button" disabled={saving || current <= 0} onClick={() => update(-1)}>Spend</button>
          <button type="button" disabled={saving || current >= max} onClick={() => update(1)}>Restore</button>
        </div>
      )}
    </div>
  );
}

export default function CleanSheetFeaturesTab({
  ac,
  actionEconomyGroups,
  character,
  classFeatureSummary,
  exhaustionLevel,
  proficiencyBonus,
  proficiencySummary,
  rulesEdition,
  speed,
  onOpenInventory,
  onCharacterUpdate,
}) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const canonicalFeatures = useMemo(
    () => mergeFeatures(snapshot.features, classFeatureSummary),
    [snapshot.features, classFeatureSummary],
  );
  const featureGroups = useMemo(
    () => groupFeatures(canonicalFeatures.length ? canonicalFeatures : Object.values(actionEconomyGroups || {}).flat()),
    [canonicalFeatures, actionEconomyGroups],
  );
  const resources = useMemo(() => {
    const merged = [...(snapshot.resources || []), ...savedResourceCards(character)];
    const seen = new Set();
    return merged.filter((resource) => {
      const key = `${resource.key || resource.label}-${resource.className || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [snapshot.resources, character]);
  const classChoices = useMemo(() => selectedClassChoiceGroups(character), [character]);
  const warnings = snapshot.warnings || [];

  return (
    <div className="clean-sheet-grid clean-sheet-features-tab clean-sheet-class-tab">
      <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-feature-action-economy">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Class</h2>
            <p>{rulesEdition} rules • {snapshot.identity.primaryClass || character.character_class || 'Class'} level {snapshot.identity.level || character.level || 1}</p>
          </div>
          <span>{canonicalFeatures.length} feature{canonicalFeatures.length === 1 ? '' : 's'}</span>
        </div>
        <div className="clean-sheet-feature-lanes">
          {Object.entries(featureGroups).map(([label, features]) => (
            <div key={label} className="clean-sheet-feature-lane">
              <h3>{label}</h3>
              {features.length ? features.map((feature) => (
                <article key={`${label}-${feature.name}-${feature.level || 'sheet'}-${feature.source || 'feature'}`} className="clean-sheet-feature-card">
                  <div>
                    <strong>{feature.name}</strong>
                    {feature.level && <span>Level {feature.level}</span>}
                  </div>
                  {feature.uses && <em>{feature.uses}</em>}
                  {feature.source && <em>{feature.source}</em>}
                  {feature.description && <p>{feature.description}</p>}
                </article>
              )) : (
                <p className="clean-sheet-feature-empty">No {label.toLowerCase()} class features found yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {!!classChoices.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-specific-choice-summary">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Selected Class Choices</h2>
              <p>Choices made during creation or starting-level setup.</p>
            </div>
            <span>{classChoices.length} group{classChoices.length === 1 ? '' : 's'}</span>
          </div>
          <div className="clean-sheet-proficiency-lists">
            {classChoices.map(([label, items]) => (
              <div key={label}>
                <h3>{label}</h3>
                <p>{toArray(items).join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!resources.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-resource-summary">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Class Resources</h2>
              <p>Class abilities with uses, recovery rules, and rest tracking.</p>
            </div>
            <span>{resources.length} resource{resources.length === 1 ? '' : 's'}</span>
          </div>
          <div className="clean-sheet-readiness-grid">
            {resources.map(resource => (
              <ResourceCard
                key={`${resource.className || 'class'}-${resource.key || resource.label}`}
                resource={resource}
                onChange={onCharacterUpdate}
              />
            ))}
          </div>
        </section>
      )}

      {!!warnings.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="character-progression-warnings">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Class Warnings</h2>
              <p>These are not blockers, but they flag class data that should be checked.</p>
            </div>
            <span>{warnings.length}</span>
          </div>
          <div className="clean-sheet-proficiency-lists">
            {warnings.map((warning, index) => (
              <div key={`${warning}-${index}`}>
                <h3>Check</h3>
                <p>{warning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide" data-testid="proficiency-equipment-summary">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Class Readiness</h2>
            <p>Quick checks for armour, weapons, tools, languages, AC, speed, and proficiency.</p>
          </div>
          <button type="button" onClick={onOpenInventory}>Open inventory</button>
        </div>
        <div className="clean-sheet-readiness-grid">
          <div><span>Armour Class</span><strong>{ac}</strong><em>Derived from equipment and stats.</em></div>
          <div><span>Speed</span><strong>{speed}ft</strong><em>Check class, race/species, armour, and conditions.</em></div>
          <div><span>Exhaustion</span><strong>{exhaustionLevel}</strong><em>{exhaustionLevel ? 'Apply condition penalties at the table.' : 'No exhaustion marked.'}</em></div>
          <div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong><em>Total character level based.</em></div>
        </div>
        <div className="clean-sheet-proficiency-lists">
          {proficiencySummary.map(([label, items]) => (
            <div key={label}>
              <h3>{label}</h3>
              <p>{items.length ? items.slice(0, 10).join(', ') : 'None recorded yet'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
