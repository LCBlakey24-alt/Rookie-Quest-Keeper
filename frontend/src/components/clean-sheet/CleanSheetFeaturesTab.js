import React, { useMemo, useState } from 'react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { featureTypeLabel, fmt } from './cleanSheetUtils';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const firstArray = (...values) => values.find(value => toArray(value).length) || [];
const oneOrArray = (value) => value ? (Array.isArray(value) ? value : [value]) : [];
const titleFromKey = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
const normaliseResourceKey = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const singularResourceKey = (value = '') => normaliseResourceKey(value).replace(/s\b/g, '');

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

function trackedResourceCards(character = {}) {
  const resourceMap = character.resources || {};
  if (!resourceMap || typeof resourceMap !== 'object' || Array.isArray(resourceMap)) return [];

  return Object.entries(resourceMap).flatMap(([key, value]) => {
    const raw = value && typeof value === 'object' ? value : { current: value, remaining: value, max: value };
    const max = Number(raw.max ?? raw.maximum ?? raw.total ?? raw.uses ?? raw.value ?? 0);
    if (!max) return [];
    return [{
      key,
      label: raw.label || raw.name || titleFromKey(key),
      className: raw.className || raw.class_name || raw.source || (raw.homebrew ? 'Homebrew' : 'Class'),
      current: Number(raw.current ?? raw.remaining ?? max),
      max,
      restore: raw.restore || raw.recovery || raw.refresh || 'long-rest',
      fieldKey: key,
      raw,
      resourceMap,
    }];
  });
}

function savedResourceCards(character = {}) {
  const cards = [...trackedResourceCards(character)];
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
      raw: superiority,
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

export function formatActionCost(value) {
  if (value in [null, undefined, '', false]) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(formatActionCost).filter(Boolean).join(' • ');
  if (typeof value === 'object') {
    const resourceName = value.resource || value.resource_name || value.resourceName || value.resource_key || value.resourceKey || value.key || value.name || value.label;
    const amount = Number(value.amount ?? value.cost ?? value.value ?? value.uses ?? 0);
    if (resourceName && amount) return `${amount} ${resourceName}`;
    if (resourceName) return String(resourceName);
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue not in [null, undefined, '', false]);
    if (entries.length === 1) {
      const [[key, entryValue]] = entries;
      return Number(entryValue) > 0 ? `${entryValue} ${titleFromKey(key)}` : `${titleFromKey(key)}: ${formatActionCost(entryValue)}`;
    }
    return entries.map(([key, entryValue]) => `${titleFromKey(key)}: ${formatActionCost(entryValue)}`).filter(Boolean).join(' • ');
  }
  return '';
}

function sheetActionCards(character = {}) {
  return toArray(character.homebrew_actions || character.sheet_actions || character.custom_actions).map((action, index) => {
    const rawCost = action.cost || action.resource_cost || action.uses || '';
    return {
      key: action.id || action.key || `${action.name || action.title || 'action'}-${index}`,
      name: action.name || action.title || `Homebrew Action ${index + 1}`,
      type: action.action_type || action.type || action.timing || 'Action',
      cost: formatActionCost(rawCost),
      resourceCost: action.resource_cost || action.resourceCost || action.cost_resource || action.costResource || action.cost || '',
      resourceName: action.resource || action.resource_name || action.resourceName || action.resource_key || action.resourceKey || '',
      source: action.source || 'Homebrew',
      description: action.description || action.rules_text || action.text || '',
      raw: action,
    };
  });
}

function passiveEffectCards(character = {}) {
  return toArray(character.passive_effects || character.passiveEffects || character.custom_effects).map((effect, index) => ({
    key: effect.id || effect.key || `${effect.name || effect.title || 'effect'}-${index}`,
    name: effect.name || effect.title || `Passive Effect ${index + 1}`,
    source: effect.source || 'Homebrew',
    description: effect.description || effect.rules_text || effect.text || '',
    modifier: effect.modifier || effect.bonus || effect.value || '',
  }));
}

function resourceAliases(resource = {}) {
  return [
    resource.key,
    resource.fieldKey,
    resource.label,
    resource.name,
    resource.raw?.key,
    resource.raw?.label,
    resource.raw?.name,
  ].filter(Boolean).flatMap(value => [normaliseResourceKey(value), singularResourceKey(value)]).filter(Boolean);
}

function parseResourceCost(action = {}) {
  const raw = action.resourceCost || action.resource_cost || action.cost || action.raw?.resource_cost || action.raw?.cost;
  const fallbackName = action.resourceName || action.raw?.resource || action.raw?.resource_name || action.raw?.resourceKey || action.raw?.resource_key;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const explicitName = raw.resource || raw.resource_name || raw.resourceName || raw.resource_key || raw.resourceKey || raw.key || raw.name || raw.label || fallbackName;
    const amount = Number(raw.amount ?? raw.cost ?? raw.value ?? raw.uses ?? 1) || 1;
    if (explicitName) return { amount, resourceName: explicitName };
    const [name, value] = Object.entries(raw).find(([, entryValue]) => Number(entryValue) > 0) || [];
    if (name) return { amount: Number(value) || 1, resourceName: name };
  }

  if (Number(raw) > 0) return { amount: Number(raw), resourceName: fallbackName };

  const text = [raw, fallbackName, action.description].filter(Boolean).join(' ');
  const match = String(text || '').match(/(?:cost|spend|use|consume)?\s*(\d+)\s+([a-z][a-z0-9 '\-_]+?)(?:[,.]|$)/i);
  if (match) return { amount: Number(match[1]) || 1, resourceName: match[2].trim() };

  return fallbackName ? { amount: 1, resourceName: fallbackName } : null;
}

export function resolveActionResourceCost(action = {}, resources = []) {
  const parsed = parseResourceCost(action);
  if (!parsed) return null;
  const requested = normaliseResourceKey(parsed.resourceName);
  const requestedSingular = singularResourceKey(parsed.resourceName);
  const actionText = normaliseResourceKey([action.name, action.cost, action.description].filter(Boolean).join(' '));
  const actionTextSingular = singularResourceKey(actionText);

  const resource = toArray(resources).find(candidate => {
    const aliases = resourceAliases(candidate);
    if (requested && aliases.includes(requested)) return true;
    if (requestedSingular && aliases.includes(requestedSingular)) return true;
    return aliases.some(alias => alias && (actionText.includes(alias) || actionTextSingular.includes(alias)));
  });

  if (!resource) return null;
  return {
    resource,
    amount: Math.max(1, Number(parsed.amount || 1)),
  };
}

function buildResourcePatch(resource, nextValue) {
  if (resource.field) return { [resource.field]: nextValue };
  if (resource.nestedField) return { [resource.nestedField]: { ...(resource.raw || {}), remaining: nextValue } };
  if (resource.fieldKey) {
    return {
      resources: {
        ...(resource.resourceMap || {}),
        [resource.fieldKey]: {
          ...(resource.raw || {}),
          current: nextValue,
          remaining: nextValue,
          max: Number(resource.max || 0),
        },
      },
    };
  }
  return null;
}

function canPatchResource(resource = {}) {
  return Boolean(resource.field || resource.nestedField || resource.fieldKey);
}

function ResourceCard({ resource, onChange }) {
  const [saving, setSaving] = useState(false);
  const current = Math.max(0, Math.min(Number(resource.max || 0), Number(resource.current || 0)));
  const max = Number(resource.max || 0);
  const canPatch = Boolean(onChange && canPatchResource(resource));

  const update = async (delta) => {
    if (!canPatch || saving) return;
    const nextValue = Math.max(0, Math.min(max, current + delta));
    if (nextValue === current) return;
    const patch = buildResourcePatch(resource, nextValue);
    if (!patch) return;
    setSaving(true);
    await onChange(patch, { error: `Could not update ${resource.label}` });
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

function HomebrewActionCard({ action, resources, onChange }) {
  const [saving, setSaving] = useState(false);
  const spend = resolveActionResourceCost(action, resources);
  const resource = spend?.resource;
  const current = resource ? Math.max(0, Number(resource.current || 0)) : 0;
  const max = resource ? Number(resource.max || 0) : 0;
  const canUse = Boolean(onChange && resource && canPatchResource(resource) && current >= spend.amount && !saving);

  const useAction = async () => {
    if (!canUse) return;
    const nextValue = Math.max(0, Math.min(max, current - spend.amount));
    const patch = buildResourcePatch(resource, nextValue);
    if (!patch) return;
    setSaving(true);
    await onChange(patch, { error: `Could not spend ${resource.label || 'resource'}` });
    setSaving(false);
  };

  return (
    <div>
      <span>{action.type}</span>
      <strong>{action.name}</strong>
      {action.cost && <em>{action.cost}</em>}
      {action.source && <em>{action.source}</em>}
      {spend && (
        <em>{resource.label}: {current}/{max} • costs {spend.amount}</em>
      )}
      {action.description && <p>{action.description}</p>}
      {spend && canPatchResource(resource) && (
        <div className="clean-sheet-slot-actions">
          <button type="button" disabled={!canUse} onClick={useAction}>
            Use {spend.amount > 1 ? `(-${spend.amount})` : '(-1)'}
          </button>
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
    const merged = [...savedResourceCards(character), ...(snapshot.resources || [])];
    const seen = new Set();
    return merged.filter((resource) => {
      const key = `${resource.key || resource.label}-${resource.className || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [snapshot.resources, character]);
  const classChoices = useMemo(() => selectedClassChoiceGroups(character), [character]);
  const homebrewActions = useMemo(() => sheetActionCards(character), [character]);
  const passiveEffects = useMemo(() => passiveEffectCards(character), [character]);
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

      {!!homebrewActions.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="homebrew-action-summary">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Homebrew Actions</h2>
              <p>Actions added by uploaded classes, subclasses, feats, spells, or custom rules.</p>
            </div>
            <span>{homebrewActions.length}</span>
          </div>
          <div className="clean-sheet-readiness-grid">
            {homebrewActions.map(action => (
              <HomebrewActionCard
                key={action.key}
                action={action}
                resources={resources}
                onChange={onCharacterUpdate}
              />
            ))}
          </div>
        </section>
      )}

      {!!passiveEffects.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="homebrew-passive-summary">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Homebrew Passive Effects</h2>
              <p>Always-on bonuses and notes collected from saved homebrew content.</p>
            </div>
            <span>{passiveEffects.length}</span>
          </div>
          <div className="clean-sheet-readiness-grid">
            {passiveEffects.map(effect => (
              <div key={effect.key}>
                <span>{effect.source}</span>
                <strong>{effect.name}</strong>
                {effect.modifier && <em>{effect.modifier}</em>}
                {effect.description && <p>{effect.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

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
