import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';
import { criticalNotation } from '@/components/clean-sheet/SpellRollRow';
import { SPELLCASTING_CLASSES, getCanonicalSpellcastingClass } from '@/data/spellDatabase';
import { buildCharacterSpellCastUpdate, getCharacterCastOptions, getCharacterSpellPools } from '@/data/characterSpellCastingActions';
import { spellRequiresConcentration } from '@/data/spellConcentrationRules';
import { spellRoll } from '@/data/spellRollRules';
import { castOptionAt, castableSpells, magicLevels, ordinal, spellsAtLevel } from './magicModel';

const signed = (value) => (Number(value) >= 0 ? `+${Number(value)}` : `${Number(value)}`);
const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);
const HEX = '50,0 100,25 100,75 50,100 0,75 0,25';

/** The class a spell is cast with, and its attack bonus, save DC and modifier. */
function casterFor(character, spell, proficiencyBonus) {
  const className = getCanonicalSpellcastingClass(spell.sourceClass || spell.source_class || character.character_class || character.class_name || '');
  const info = SPELLCASTING_CLASSES[className];
  const mod = info ? abilityMod(character[info.ability]) : 0;
  return { attackBonus: proficiencyBonus + mod, saveDc: 8 + proficiencyBonus + mod, mod };
}

/**
 * The hexagon sheet's Magic view: a wheel of spell levels (cantrips, then
 * each slot level, with dots for slots left), and under it a boxed list of
 * the spells castable at the level at the top. Each row shows the spell's
 * attack bonus or save DC and its damage or healing, rolls through the
 * sheet's 3D tray, and has a hexagon that casts it (spending a slot).
 * Tapping a spell's name opens its details.
 */
export default function HexMagicView({ character, proficiencyBonus = 2, onRollAttack, onRollDice, onSave, onManage }) {
  const spells = useMemo(() => castableSpells(character), [character]);
  const pools = useMemo(() => getCharacterSpellPools(character), [character]);
  const levels = useMemo(() => magicLevels(spells, pools), [spells, pools]);
  const [levelId, setLevelId] = useState(null);
  const [openSpell, setOpenSpell] = useState(null);
  const [crit, setCrit] = useState(null);
  const [casting, setCasting] = useState(null);

  const current = levels.find((entry) => entry.id === levelId) || levels.find((entry) => entry.level > 0) || levels[0];
  const listed = current ? spellsAtLevel(spells, current.level) : [];

  if (!levels.length) {
    return (
      <section className="hex-magic hex-magic--empty" aria-label="Magic" data-testid="hex-magic">
        <p>No spells or spell slots yet.</p>
        {onManage && <button type="button" className="hex-sheet__text-button" onClick={onManage} data-testid="hex-magic-manage"><span className="hex-glass" aria-hidden="true" />Manage spells</button>}
      </section>
    );
  }

  const cast = async (spell) => {
    const { options } = getCharacterCastOptions(character, spell);
    const option = castOptionAt(options, current.level);
    if (!option) {
      toast.error(`No ${ordinal(current.level)}-level slot left for ${spell.name}`);
      return;
    }
    const result = buildCharacterSpellCastUpdate(character, spell, { explicitOption: option });
    if (!result.ok) {
      toast.error(result.reason || `Could not cast ${spell.name}`);
      return;
    }
    const updates = { ...result.updates };
    if (spellRequiresConcentration(spell)) {
      updates.concentrating_on = spell.name;
      updates.concentration = spell.name;
    }
    if (!Object.keys(updates).length) {
      toast.success(`${spell.name} cast`);
      return;
    }
    setCasting(spell.name);
    const ok = await onSave?.(updates, { error: 'Could not spend the spell slot' });
    setCasting(null);
    if (ok === false) return;
    toast.success(`${spell.name} cast`, {
      description: option.source === 'cantrip' ? 'Cantrips do not use slots.' : `Used a ${ordinal(option.level)}-level ${option.source === 'pact' ? 'Pact Magic ' : ''}slot.`,
    });
  };

  return (
    <section className="hex-magic" aria-label="Magic" data-testid="hex-magic">
      <GuildChoiceWheel
        label="Spell level"
        caption="SPELLS"
        options={levels.map((entry) => ({ id: entry.id, label: entry.label, short: entry.short, pips: entry.pips }))}
        value={current.id}
        onChange={(id) => { setLevelId(id); setOpenSpell(null); }}
        centreText={current.level === 0 ? 'Cantrips' : ordinal(current.level)}
        centreNote={current.pips ? `${current.pips.left} of ${current.pips.total} slots` : 'At will'}
      />

      <div className="hex-magic__list" data-testid="hex-magic-list">
        {listed.length === 0 && (
          <p className="hex-magic__empty">No {current.level === 0 ? 'cantrips' : `${ordinal(current.level)}-level spells`} ready. Prepare or learn one under Manage spells.</p>
        )}
        {listed.map((spell) => {
          const caster = casterFor(character, spell, proficiencyBonus);
          const roll = spellRoll(spell, { characterLevel: Number(character.level) || 1, castingMod: caster.mod, slotLevel: current.level });
          const isOpen = openSpell === spell.name;
          const critical = crit === spell.name && roll?.kind === 'attack';
          const damage = roll?.notation ? (critical ? criticalNotation(roll.notation) : roll.notation) : null;
          const noSlot = current.level > 0 && !castOptionAt(getCharacterCastOptions(character, spell).options, current.level);
          return (
            <article key={spell.name} className={`hex-spell${isOpen ? ' is-open' : ''}`} data-testid={`hex-spell-${spell.name}`}>
              <div className="hex-spell__row">
                {current.level > 0 ? (
                  <button
                    type="button"
                    className="hex-spell__cast"
                    onClick={() => cast(spell)}
                    disabled={noSlot || casting === spell.name}
                    aria-label={`Cast ${spell.name}, using a ${ordinal(current.level)}-level slot`}
                    title={noSlot ? 'No slot left' : 'Cast: uses a slot'}
                  >
                    <svg viewBox="0 0 100 100" aria-hidden="true">
                      <polygon points={HEX} />
                      <text x="50" y="52" textAnchor="middle" dominantBaseline="central">{current.level}</text>
                    </svg>
                  </button>
                ) : (
                  <span className="hex-spell__cast hex-spell__cast--free" aria-hidden="true" title="Cantrips use no slot">
                    <svg viewBox="0 0 100 100">
                      <polygon points={HEX} />
                      <text x="50" y="52" textAnchor="middle" dominantBaseline="central">∞</text>
                    </svg>
                  </span>
                )}
                <button type="button" className="hex-spell__name" onClick={() => setOpenSpell(isOpen ? null : spell.name)} aria-expanded={isOpen}>
                  <strong>{spell.name}</strong>
                  <small>{[spell.school, roll?.type, roll?.label].filter(Boolean).join(' · ') || (spell.level === 0 ? 'Cantrip' : `${ordinal(spell.level)} level`)}</small>
                </button>
                <div className="hex-spell__rolls">
                  {roll?.kind === 'attack' && (
                    <button
                      type="button"
                      onClick={() => setCrit(Number(onRollAttack?.(`${spell.name} attack`, caster.attackBonus)?.d20) === 20 ? spell.name : null)}
                      aria-label={`Spell attack for ${spell.name}, ${signed(caster.attackBonus)}`}
                    >
                      Hit {signed(caster.attackBonus)}
                    </button>
                  )}
                  {roll?.save && <span className="hex-spell__dc" title={`${roll.save} saving throw`}>DC {caster.saveDc} {roll.save}</span>}
                  {damage && (
                    <button
                      type="button"
                      onClick={() => {
                        onRollDice?.({ label: `${critical ? 'Critical ' : ''}${spell.name}${roll.kind === 'heal' ? ' healing' : ''}`, notation: damage, kind: roll.kind });
                        setCrit(null);
                      }}
                      aria-label={`${roll.kind === 'heal' ? 'Heal' : 'Damage'} for ${spell.name}: ${damage}`}
                    >
                      {roll.kind === 'heal' ? '♥ ' : ''}{damage}{critical ? ' ×2' : ''}
                    </button>
                  )}
                  {roll?.fixed && <span className="hex-spell__dc">{roll.fixed}</span>}
                </div>
              </div>
              {isOpen && (
                <div className="hex-spell__details">
                  {spell.description ? <p>{spell.description}</p> : <p>No description saved for this spell.</p>}
                  {roll?.alt && (
                    <button type="button" onClick={() => onRollDice?.({ label: `${spell.name} (${roll.alt.label})`, notation: roll.alt.notation, kind: roll.kind })}>
                      {roll.alt.notation} {roll.alt.label}
                    </button>
                  )}
                  {roll?.burst && (
                    <button type="button" onClick={() => onRollDice?.({ label: `${spell.name} burst`, notation: roll.burst.notation, kind: 'save' })}>
                      Burst {roll.burst.notation} · DC {caster.saveDc} {roll.burst.save}
                    </button>
                  )}
                  {roll?.kind === 'rider' && <p className="hex-spell__hint">Add this to a weapon hit.</p>}
                  {spellRequiresConcentration(spell) && <p className="hex-spell__hint">Concentration: casting it marks you as concentrating.</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {onManage && (
        <button type="button" className="hex-sheet__text-button hex-magic__manage" onClick={onManage} data-testid="hex-magic-manage">
          <span className="hex-glass" aria-hidden="true" />
          Manage spells and slots
        </button>
      )}
    </section>
  );
}
