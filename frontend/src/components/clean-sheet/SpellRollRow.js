import React, { createContext, useContext, useState } from 'react';

import { rollDiceNotation } from '@/data/diceRoller';
import { spellRoll } from '@/data/spellRollRules';
import './SpellRollRow.css';

/**
 * What a sheet hands the spell list so spells can be rolled:
 *   characterLevel                 for cantrip scaling
 *   casterFor(spell)               { attackBonus, saveDc, mod } for the class it is cast with
 *   maxSlotLevel                   the highest slot the character has (for upcasting)
 *   onRollAttack(label, bonus)     rolls a d20 + bonus; returns the result ({ d20 })
 *   onRollDice({ label, notation, kind })  rolls dice through the sheet's tray
 * Without onRollDice, spell cards show no roll buttons (nothing changes).
 */
export const SpellRollContext = createContext(null);

const ABILITY_NAMES = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
const signed = (value) => (Number(value) >= 0 ? `+${Number(value)}` : `${Number(value)}`);

/**
 * Roll a spell's dice and shape the result the way the sheets' dice trays
 * take it (each die keeps its own size, so 2d8+4d6 shows both kinds).
 * Returns null if the notation cannot be rolled.
 */
export function spellDiceEntry({ label, notation, kind }) {
  const result = rollDiceNotation(notation);
  if (!result.valid || !result.rolls.length) return null;
  return {
    id: `${Date.now()}-spell`,
    label,
    rolls: result.rolls,
    sides: result.rolls[0].sides,
    modifier: result.modifier,
    total: result.total,
    mode: kind === 'heal' ? 'healing' : 'damage',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Double every die in a notation for a critical hit: 2d6+3 -> 4d6+3. */
export function criticalNotation(notation = '') {
  return String(notation).replace(/(\d+)d(\d+)/g, (_, count, sides) => `${Number(count) * 2}d${sides}`);
}

/**
 * The roll buttons under one spell: its attack or save, its damage or
 * healing, and a slot choice for levelled spells that grow when upcast.
 */
export default function SpellRollRow({ spell }) {
  const context = useContext(SpellRollContext);
  const baseLevel = Number(spell?.level || 0);
  const [slotLevel, setSlotLevel] = useState(baseLevel);
  const [critical, setCritical] = useState(false);
  if (!context?.onRollDice) return null;

  const caster = context.casterFor?.(spell) || {};
  const roll = spellRoll(spell, { characterLevel: context.characterLevel, castingMod: caster.mod, slotLevel });
  if (!roll) return null;

  const name = spell.name;
  const slotChoices = baseLevel > 0
    ? Array.from({ length: Math.max(0, (Number(context.maxSlotLevel) || baseLevel) - baseLevel) + 1 }, (_, index) => baseLevel + index)
    : [];
  const grows = slotChoices.length > 1;
  const rollDice = (notation, label, kind) => {
    context.onRollDice({ label, notation, kind });
  };

  const attack = () => {
    const result = context.onRollAttack?.(`${name} attack`, caster.attackBonus || 0);
    setCritical(Number(result?.d20) === 20);
  };

  const damageLabel = roll.kind === 'heal' ? 'Heal' : roll.kind === 'rider' ? 'Extra damage' : 'Damage';
  const perHit = roll.count > 1 && !spell.name.match(/magic missile/i) ? ` per ${/ray/i.test(roll.label || '') ? 'ray' : 'beam'}` : '';
  const damageNotation = critical && roll.kind === 'attack' ? criticalNotation(roll.notation) : roll.notation;

  return (
    <div className="clean-sheet-spell-rolls" data-testid={`spell-rolls-${name}`}>
      {roll.kind === 'attack' && (
        <button type="button" onClick={attack} aria-label={`Roll a spell attack for ${name}, ${signed(caster.attackBonus || 0)}`}>
          Attack {signed(caster.attackBonus || 0)}
        </button>
      )}
      {roll.save && (
        <span className="clean-sheet-spell-roll-note" title={`${ABILITY_NAMES[roll.save] || roll.save} saving throw`}>
          DC {caster.saveDc ?? '—'} {roll.save}
        </span>
      )}
      {roll.fixed ? (
        <span className="clean-sheet-spell-roll-note">{roll.fixed} {roll.type}</span>
      ) : (
        <button
          type="button"
          onClick={() => {
            rollDice(damageNotation, `${critical && roll.kind === 'attack' ? 'Critical ' : ''}${name}${roll.kind === 'heal' ? ' healing' : ''}`, roll.kind);
            setCritical(false);
          }}
          aria-label={`${damageLabel} for ${name}: ${damageNotation}${roll.type ? ` ${roll.type}` : ''}${perHit}`}
        >
          {damageLabel} {damageNotation}{perHit}{critical && roll.kind === 'attack' ? ' (crit)' : ''}
        </button>
      )}
      {roll.alt && (
        <button type="button" onClick={() => rollDice(roll.alt.notation, `${name} (${roll.alt.label})`, roll.kind)}>
          {roll.alt.notation} {roll.alt.label}
        </button>
      )}
      {roll.burst && (
        <button type="button" onClick={() => rollDice(roll.burst.notation, `${name} burst`, 'save')}>
          Burst {roll.burst.notation} ({roll.burst.save})
        </button>
      )}
      {grows && (
        <label className="clean-sheet-spell-roll-slot">
          <span>Slot</span>
          <select value={slotLevel} onChange={(event) => setSlotLevel(Number(event.target.value))} aria-label={`Slot level for ${name}`}>
            {slotChoices.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
      )}
      {(roll.type || roll.label) && (
        <span className="clean-sheet-spell-roll-note clean-sheet-muted">{[roll.label, roll.type].filter(Boolean).join(' · ')}</span>
      )}
    </div>
  );
}
