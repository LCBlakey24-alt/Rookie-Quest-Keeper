import React, { useMemo } from 'react';

import {
  levelUpHpMath,
  progressionHistoryEntries,
  resourceChangeText,
  spellSlotChangeText,
} from './cleanSheetProgressionHistory';
import './CleanSheetProgressionHistory.css';

const spellName = (spell) => typeof spell === 'string' ? spell : spell?.name || spell?.title || '';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function choiceSummary(entry) {
  const items = [];
  if (entry.subclass) items.push(`Subclass: ${entry.subclass}`);
  if (entry.feat) items.push(`Feat: ${entry.feat}`);

  const asi = Object.values(entry.asiChoices || {}).filter(Boolean);
  if (asi.length) items.push(`ASI: ${asi.map(value => String(value).slice(0, 3).toUpperCase()).join(' + ')}`);

  const spells = entry.newSpells.map(spellName).filter(Boolean);
  if (spells.length) items.push(`Spells: ${spells.join(', ')}`);

  const cantrips = entry.newCantrips.map(spellName).filter(Boolean);
  if (cantrips.length) items.push(`Cantrips: ${cantrips.join(', ')}`);
  return items;
}

export default function CleanSheetProgressionHistory({ character }) {
  const entries = useMemo(() => progressionHistoryEntries(character), [character]);
  if (!entries.length) return null;

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-progression-history" data-testid="level-up-history">
      <div className="clean-sheet-section-heading-row">
        <div>
          <h2>Level History</h2>
          <p>Receipts for how this character changed at each recorded level-up.</p>
        </div>
        <span>{entries.length} recorded</span>
      </div>

      <div className="clean-sheet-progression-history-list">
        {entries.map((entry, index) => {
          const slotChanges = spellSlotChangeText(entry.spellSlots.before, entry.spellSlots.after);
          const resources = entry.resourceChanges.map(resourceChangeText);
          const choices = choiceSummary(entry);
          const hpRange = entry.hp.maxBefore !== null && entry.hp.maxAfter !== null
            ? `${entry.hp.maxBefore} → ${entry.hp.maxAfter} max HP`
            : entry.hp.gained
              ? `+${entry.hp.gained} HP`
              : 'HP change unavailable';

          return (
            <details key={`${entry.level}-${entry.className}-${index}`} className="clean-sheet-progression-entry" open={index === 0}>
              <summary>
                <span>
                  <strong>Level {entry.level}</strong>
                  <em>{entry.className}{entry.classLevel ? ` ${entry.classLevel}` : ''}</em>
                </span>
                <span>
                  <strong>{hpRange}</strong>
                  {formatDate(entry.appliedAt) && <em>{formatDate(entry.appliedAt)}</em>}
                </span>
              </summary>

              <div className="clean-sheet-progression-receipt-grid">
                <div>
                  <span>Hit points</span>
                  <strong>{levelUpHpMath(entry)}</strong>
                  {entry.hp.minimumOneApplied && <em>Minimum +1 HP rule applied.</em>}
                </div>

                {entry.proficiency.before !== null && entry.proficiency.after !== null && (
                  <div>
                    <span>Proficiency</span>
                    <strong>+{entry.proficiency.before} → +{entry.proficiency.after}</strong>
                  </div>
                )}

                {slotChanges && (
                  <div>
                    <span>Spell slots</span>
                    <strong>{slotChanges}</strong>
                  </div>
                )}

                {resources.map((text) => (
                  <div key={text}>
                    <span>Resource</span>
                    <strong>{text}</strong>
                  </div>
                ))}

                {choices.map((text) => (
                  <div key={text}>
                    <span>Choice</span>
                    <strong>{text}</strong>
                  </div>
                ))}

                {!slotChanges && !resources.length && !choices.length && entry.hp.maxBefore === null && (
                  <div>
                    <span>Older record</span>
                    <strong>This level was saved before full Keeper receipts were added.</strong>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
