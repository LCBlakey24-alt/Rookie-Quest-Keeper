import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { ABILITIES, fmt, mod } from './cleanSheetUtils';
import { gatherEquippedWeapons, getItemName, getItemQuantity } from './cleanCombatTabUtils';
import { getSheetResourceCards, isSpellPoolResource } from './cleanSheetResourceUtils';
import CleanSheetResourceRail from './CleanSheetResourceRail';

const FULL_ABILITY_NAMES = {
  strength: 'Strength', dexterity: 'Dexterity', constitution: 'Constitution',
  intelligence: 'Intelligence', wisdom: 'Wisdom', charisma: 'Charisma',
};

function itemPreview(character) {
  const combined = [
    ...(Array.isArray(character?.inventory) ? character.inventory : []),
    ...(Array.isArray(character?.equipment) ? character.equipment : []),
  ];
  const seen = new Set();
  return combined.filter(item => {
    const name = String(getItemName(item) || '').trim();
    if (!name) return false;
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

export default function CompactCommandOverview({
  character,
  proficiencyBonus,
  onRoll,
  onCharacterUpdate,
  onOpenTab,
}) {
  const strength = mod(character?.strength);
  const dexterity = mod(character?.dexterity);
  const attacks = useMemo(
    () => gatherEquippedWeapons(character, strength, dexterity, Math.max(strength, dexterity), proficiencyBonus).slice(0, 2),
    [character, strength, dexterity, proficiencyBonus],
  );
  const items = useMemo(() => itemPreview(character), [character]);
  const snapshot = useMemo(() => deriveCharacterSnapshot(character || {}), [character]);
  const resources = useMemo(
    () => getSheetResourceCards(character || {}, snapshot.resources || [])
      .filter(resource => !isSpellPoolResource(resource)),
    [character, snapshot.resources],
  );

  return (
    <div className="rqk-compact-command" data-testid="mobile-compact-command">
      <section className="rqk-cc-panel" aria-labelledby="rqk-cc-abilities-title">
        <div className="rqk-cc-heading">
          <h2 id="rqk-cc-abilities-title" className="rqk-cc-title"><span>Abilities</span></h2>
          <span>Tap a modifier to roll</span>
        </div>
        <div className="rqk-cc-ability-grid">
          {ABILITIES.map(([key, label]) => {
            const score = Number(character?.[key] ?? 10);
            const modifier = mod(score);
            return (
              <button
                key={key}
                type="button"
                className="rqk-cc-ability"
                onClick={() => onRoll(`${FULL_ABILITY_NAMES[key]} Check`, modifier)}
                aria-label={`Roll ${FULL_ABILITY_NAMES[key]} check, ${fmt(modifier)} modifier`}
              >
                <span>{label}</span>
                <strong>{fmt(modifier)}</strong>
                <small>Score {score}</small>
              </button>
            );
          })}
        </div>
        <button type="button" className="rqk-cc-section-link" onClick={() => onOpenTab('full-stats')}>
          Full stats, skills and saves <ChevronRight size={17} aria-hidden="true" />
        </button>
      </section>

      <section className="rqk-cc-panel" aria-labelledby="rqk-cc-attacks-title">
        <div className="rqk-cc-heading">
          <h2 id="rqk-cc-attacks-title" className="rqk-cc-title"><span>Attacks</span></h2>
          <button type="button" onClick={() => onOpenTab('combat')}>All actions <ChevronRight size={15} aria-hidden="true" /></button>
        </div>
        {attacks.length ? (
          <div className="rqk-cc-list">
            {attacks.map(attack => (
              <button key={attack.id} type="button" className="rqk-cc-list-action" onClick={() => onOpenTab('combat')}>
                <span><strong>{attack.title}</strong><small>{attack.details || 'Equipped weapon'}</small></span>
                <span className="rqk-cc-attack-meta">{fmt(attack.attackMod)} to hit <small>{attack.damageText} damage</small></span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <p className="rqk-cc-empty">No equipped weapons yet. Open Actions for attacks and other combat options.</p>
        )}
      </section>

      <section className="rqk-cc-panel rqk-cc-resource-panel" aria-labelledby="rqk-cc-resources-title">
        <div className="rqk-cc-heading"><h2 id="rqk-cc-resources-title" className="rqk-cc-title"><span>Resources</span></h2></div>
        {resources.length ? (
          <CleanSheetResourceRail character={character} onCharacterUpdate={onCharacterUpdate} />
        ) : (
          <p className="rqk-cc-empty">No limited-use resources are currently tracked on this character.</p>
        )}
      </section>

      <section className="rqk-cc-panel" aria-labelledby="rqk-cc-inventory-title">
        <div className="rqk-cc-heading">
          <h2 id="rqk-cc-inventory-title" className="rqk-cc-title"><span>Inventory</span></h2>
          <button type="button" onClick={() => onOpenTab('inventory')}>Open bag <ChevronRight size={15} aria-hidden="true" /></button>
        </div>
        {items.length ? (
          <div className="rqk-cc-list">
            {items.map((item, index) => {
              const name = getItemName(item);
              const quantity = getItemQuantity(item);
              return (
                <button
                  key={`${name}-${index}`}
                  type="button"
                  className="rqk-cc-list-action"
                  onClick={() => onOpenTab('inventory')}
                >
                  <strong>{name}</strong>
                  {quantity != null && <span className="rqk-cc-item-quantity">× {quantity}</span>}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rqk-cc-empty">No items saved yet. Open Inventory to add equipment.</p>
        )}
      </section>
    </div>
  );
}
