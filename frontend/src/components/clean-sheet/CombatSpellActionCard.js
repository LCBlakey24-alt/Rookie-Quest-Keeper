import React, { useMemo, useState } from 'react';

import { getCharacterCastOptions } from '@/data/characterSpellCastingActions';

function spellLevelLabel(level) {
  if (Number(level) === 0) return 'Cantrip';
  if (!level && level !== 0) return 'Spell';
  return `Level ${level}`;
}

function descriptionFor(spell = {}, optionCount = 0) {
  const source = spell.source || 'Spell';
  const timing = spell.castingTime ? ` • ${spell.castingTime}` : '';
  const text = spell.description
    ? ` — ${spell.description.slice(0, 120)}${spell.description.length > 120 ? '…' : ''}`
    : '';
  const choice = optionCount > 1 ? ` • ${optionCount} slot pools available` : '';
  return `${source}${timing}${choice}${text}`;
}

export default function CombatSpellActionCard({ character, spell, typeLabel, onCast }) {
  const [choosing, setChoosing] = useState(false);
  const castState = useMemo(() => getCharacterCastOptions(character, spell), [character, spell]);
  const level = Number(spell?.level || 0);
  const cantrip = level <= 0;
  const options = castState.options || [];
  const blocked = !cantrip && options.length === 0;

  const handleMainClick = () => {
    if (blocked) return;
    if (cantrip) {
      onCast(spell, { source: 'cantrip', level: 0 });
      return;
    }
    if (options.length === 1) {
      onCast(spell, options[0]);
      return;
    }
    setChoosing((value) => !value);
  };

  const castWith = (option) => {
    setChoosing(false);
    onCast(spell, option);
  };

  return (
    <div className={`clean-sheet-action-card-shell ${choosing ? 'active' : ''}`}>
      <button type="button" className="clean-sheet-action-card" onClick={handleMainClick} disabled={blocked}>
        <span className="clean-sheet-action-type">{spellLevelLabel(spell.level)}</span>
        <strong>{spell.name}</strong>
        <span>{blocked ? `${descriptionFor(spell)} • no valid spell slots available` : descriptionFor(spell, options.length)}</span>
      </button>
      {choosing && options.length > 1 && (
        <div className="clean-sheet-pending-damage" aria-label={`Choose spell slot pool for ${spell.name}`}>
          <span>Choose which pool to spend.</span>
          {options.map((option) => (
            <button
              key={`${typeLabel}-${spell.name}-${option.source}-${option.level}`}
              type="button"
              onClick={() => castWith(option)}
            >
              {option.label} ({option.remaining}/{option.total})
            </button>
          ))}
          <button type="button" onClick={() => setChoosing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
