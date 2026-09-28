import React, { useMemo, useState } from 'react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import {
  buildResourcePatch,
  canPatchResource,
  getSheetResourceCards,
  isSpellPoolResource,
  resourceRecoveryLabel,
} from './cleanSheetResourceUtils';

function ResourceDots({ current, max }) {
  const safeMax = Math.max(0, Math.min(20, Number(max) || 0));
  const safeCurrent = Math.max(0, Math.min(safeMax, Number(current) || 0));
  if (!safeMax) return null;

  return (
    <div className="clean-sheet-resource-dots" aria-hidden="true">
      {Array.from({ length: safeMax }).map((_, index) => (
        <i key={index} className={index < safeCurrent ? 'filled' : ''} />
      ))}
    </div>
  );
}

function ResourceRailCard({ resource, onCharacterUpdate }) {
  const [saving, setSaving] = useState(false);
  const max = Math.max(0, Number(resource.max || 0));
  const current = Math.max(0, Math.min(max, Number(resource.current ?? max) || 0));
  const canPatch = Boolean(onCharacterUpdate && canPatchResource(resource));

  const update = async (delta) => {
    if (!canPatch || saving) return;
    const next = Math.max(0, Math.min(max, current + delta));
    if (next === current) return;
    const patch = buildResourcePatch(resource, next);
    if (!patch) return;

    setSaving(true);
    try {
      await onCharacterUpdate(patch, { error: `Could not update ${resource.label}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="clean-sheet-resource-rail-card" data-resource-key={resource.key || resource.fieldKey || ''}>
      <div className="clean-sheet-resource-rail-copy">
        <span>{resource.className || 'Resource'} • {resourceRecoveryLabel(resource)}</span>
        <strong>{resource.label}</strong>
      </div>

      <div className="clean-sheet-resource-rail-value" aria-label={`${resource.label}: ${current} of ${max} remaining`}>
        <strong>{current}</strong>
        <span>/ {max}</span>
      </div>

      <ResourceDots current={current} max={max} />

      {canPatch && (
        <div className="clean-sheet-resource-rail-actions">
          <button
            type="button"
            onClick={() => update(-1)}
            disabled={saving || current <= 0}
            aria-label={`Spend one ${resource.label}`}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => update(1)}
            disabled={saving || current >= max}
            aria-label={`Restore one ${resource.label}`}
          >
            +
          </button>
        </div>
      )}
    </article>
  );
}

export default function CleanSheetResourceRail({ character, onCharacterUpdate }) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character || {}), [character]);
  const resources = useMemo(
    () => getSheetResourceCards(character || {}, snapshot.resources || [])
      .filter(resource => !isSpellPoolResource(resource)),
    [character, snapshot.resources],
  );

  if (!resources.length) return null;

  return (
    <section className="clean-sheet-resource-rail" data-testid="player-resource-rail" aria-label="Limited-use resources">
      <div className="clean-sheet-resource-rail-heading">
        <div>
          <span>Ready at the table</span>
          <strong>Resources</strong>
        </div>
        <small>Spend here • rests restore automatically</small>
      </div>
      <div className="clean-sheet-resource-rail-scroll">
        {resources.map(resource => (
          <ResourceRailCard
            key={resource.key || resource.fieldKey || resource.label}
            resource={resource}
            onCharacterUpdate={onCharacterUpdate}
          />
        ))}
      </div>
    </section>
  );
}
