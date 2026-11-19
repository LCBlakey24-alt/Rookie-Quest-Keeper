import React, { useMemo, useState } from 'react';
import { Dices, Minus, Plus, Shield, Sparkles, Sword, Trash2, AlertTriangle } from 'lucide-react';
import {
  ABILITIES, ARMOUR_TYPES, CONDITIONS, DAMAGE_TYPES, DIE_SIZES, ITEM_KINDS, RARITIES, WEAPON_PROPERTIES,
  itemDraftWarnings, normaliseItemDraft, toSheetItem,
} from '@/data/homebrewItemModel';
import { DEFAULT_SAMPLE, previewItemOnSheet } from '@/data/homebrewItemPreview';
import { rollDiceNotation } from '@/data/diceRoller';
import './HomebrewItemBuilder.css';

const cap = text => String(text || '').replace(/\b\w/g, c => c.toUpperCase());

function Segmented({ label, value, options, onChange, name }) {
  return (
    <fieldset className="hb-item__seg">
      <legend>{label}</legend>
      <div role="group" aria-label={label}>
        {options.map(option => (
          <button key={option.id} type="button" aria-pressed={value === option.id}
            className={`rqk-selectable-control${value === option.id ? ' is-on' : ''}`} onClick={() => onChange(option.id)}
            data-testid={`${name}-${option.id}`}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ChipPicker({ label, help, options, value = [], onChange, testid }) {
  const toggle = id => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  return (
    <fieldset className="hb-item__chips" data-testid={testid}>
      <legend>{label}{help && <small>{help}</small>}</legend>
      <div>
        {options.map(option => {
          const id = option.id || option;
          const on = value.includes(id);
          return (
            <button key={id} type="button" aria-pressed={on} className={`rqk-selectable-control${on ? ' is-on' : ''}`}
              onClick={() => toggle(id)}>{on && <span aria-hidden="true">✓ </span>}{option.label || cap(id)}</button>
          );
        })}
      </div>
      {/* What each chosen option does: tooltips do not work on touch screens. */}
      {options.some(option => option.help && value.includes(option.id)) && (
        <ul className="hb-item__chip-help">
          {options.filter(option => option.help && value.includes(option.id)).map(option => <li key={option.id}><strong>{option.label}:</strong> {option.help}</li>)}
        </ul>
      )}
    </fieldset>
  );
}

function Toggle({ label, on, onChange, testid }) {
  return (
    <button type="button" className={`hb-item__toggle rqk-selectable-control${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange(!on)} data-testid={testid}>
      <span aria-hidden="true">{on ? '✓' : ''}</span>{label}
    </button>
  );
}

function Num({ label, value, onChange, min, max, testid, suffix, placeholder }) {
  return (
    <label className="hb-item__field">
      <span>{label}</span>
      <span className="hb-item__num">
        <input type="number" inputMode="numeric" value={value} min={min} max={max} placeholder={placeholder}
          onChange={event => onChange(event.target.value)} data-testid={testid} />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  );
}

function Stepper({ label, value, onChange, min = -5, max = 5, testid }) {
  const n = Number(value) || 0;
  return (
    <div className="hb-item__field">
      <span>{label}</span>
      <div className="hb-item__stepper">
        <button type="button" aria-label={`Lower ${label}`} onClick={() => onChange(Math.max(min, n - 1))}><Minus size={16} /></button>
        <output data-testid={testid}>{n >= 0 ? `+${n}` : n}</output>
        <button type="button" aria-label={`Raise ${label}`} onClick={() => onChange(Math.min(max, n + 1))}><Plus size={16} /></button>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange, testid }) {
  return (
    <label className="hb-item__field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} data-testid={testid}>
        {options.map(option => <option key={option.id ?? option} value={option.id ?? option}>{option.label ?? cap(option)}</option>)}
      </select>
    </label>
  );
}

/** The roll panel: actually rolls, so a player can feel the item. */
function useRolls() {
  const [last, setLast] = useState(null);
  const roll = (label, parts) => {
    const results = parts.filter(part => part.notation).map(part => ({ ...part, result: rollDiceNotation(part.notation) }));
    const total = results.reduce((sum, part) => sum + (Number(part.result.total) || 0), 0);
    setLast({ label, total, results, at: Date.now() });
  };
  return [last, roll];
}

function SheetPreview({ item, sample, onSample }) {
  const preview = useMemo(() => previewItemOnSheet(item, sample), [item, sample]);
  const [last, roll] = useRolls();
  const { attack } = preview;
  const extras = attack?.extraDamage || [];
  return (
    <aside className="hb-item__preview" aria-label="How it looks on your character sheet" data-testid="hb-item-preview">
      <p className="hb-item__eyebrow">On your character sheet</p>
      <div className="hb-item__card">
        <header>
          <strong>{item.name}</strong>
          <span>{cap(item.rarity === 'mundane' ? '' : item.rarity)} {item.type}{item.requires_attunement ? ' · attunement' : ''}</span>
        </header>

        {attack && (
          <div className="hb-item__attack" data-testid="hb-item-attack">
            <div className="hb-item__attack-row">
              <span>To hit</span>
              <strong data-testid="hb-item-tohit">{attack.toHitText}</strong>
              <button type="button" onClick={() => roll(`${item.name}: to hit`, [{ notation: attack.toHitNotation, type: '' }])} data-testid="hb-item-roll-hit"><Dices size={15} /> Roll</button>
            </div>
            <div className="hb-item__attack-row">
              <span>Damage</span>
              <strong data-testid="hb-item-damage">{attack.damageNotation} {attack.damageType}{extras.map(row => ` + ${row.dice} ${row.type}`).join('')}</strong>
              <button type="button" onClick={() => roll(`${item.name}: damage`, [{ notation: attack.damageNotation, type: attack.damageType }, ...extras.map(row => ({ notation: row.dice, type: row.type }))])} data-testid="hb-item-roll-damage"><Dices size={15} /> Roll</button>
            </div>
            {attack.versatileNotation && (
              <div className="hb-item__attack-row">
                <span>Two hands</span>
                <strong>{attack.versatileNotation} {attack.damageType}</strong>
                <button type="button" onClick={() => roll(`${item.name}: two-handed damage`, [{ notation: attack.versatileNotation, type: attack.damageType }, ...extras.map(row => ({ notation: row.dice, type: row.type }))])}><Dices size={15} /> Roll</button>
              </div>
            )}
            <p className="hb-item__muted">{attack.details}</p>
          </div>
        )}

        {preview.armourClass !== null && (
          <div className="hb-item__ac" data-testid="hb-item-ac">
            <Shield size={18} aria-hidden="true" />
            <span>Armour Class</span>
            <strong>{preview.armourClass}</strong>
            <em>without it: {preview.unarmouredAc}</em>
          </div>
        )}

        {preview.effects.length > 0 && (
          <ul className="hb-item__effects" data-testid="hb-item-effects">
            {preview.effects.map(line => <li key={line}>{line}</li>)}
          </ul>
        )}

        {!attack && preview.armourClass === null && preview.effects.length === 0 && (
          <p className="hb-item__muted">Add damage, AC, resistances or bonuses and they appear here exactly as on the sheet.</p>
        )}

        {last && (
          <div className="hb-item__roll" role="status" aria-live="polite" data-testid="hb-item-roll-result">
            <span>{last.label}</span>
            <strong>{last.total}</strong>
            <small>{last.results.map(part => `${part.notation} → ${(part.result.rolls || []).map(r => r.result).join(' + ') || '—'}${part.result.modifier ? ` ${part.result.modifier > 0 ? '+' : ''}${part.result.modifier}` : ''}${part.type ? ` ${part.type}` : ''}`).join(' · ')}</small>
          </div>
        )}
      </div>

      <details className="hb-item__sample">
        <summary>Try it with your own scores</summary>
        <div>
          <Num label="Strength" value={sample.strength} onChange={v => onSample({ ...sample, strength: v })} min={1} max={30} />
          <Num label="Dexterity" value={sample.dexterity} onChange={v => onSample({ ...sample, dexterity: v })} min={1} max={30} />
          <Num label="Proficiency" value={sample.proficiencyBonus} onChange={v => onSample({ ...sample, proficiencyBonus: v })} min={2} max={6} suffix="+" />
        </div>
      </details>
    </aside>
  );
}

export default function HomebrewItemBuilder({ draft: rawDraft, onChange }) {
  const draft = normaliseItemDraft(rawDraft);
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const item = useMemo(() => toSheetItem(draft), [draft]);
  const warnings = itemDraftWarnings(draft);
  const set = patch => onChange({ ...draft, ...patch });
  const setIn = (key, patch) => onChange({ ...draft, [key]: { ...draft[key], ...patch } });
  const w = draft.weapon;
  const props = w.properties || [];
  const warn = field => warnings.filter(entry => entry.field === field).map(entry => <p key={entry.text} className="hb-item__warn"><AlertTriangle size={14} /> {entry.text}</p>);

  return (
    <div className="hb-item-wrap"><div className="hb-item" data-testid="hb-item-builder">
      <div className="hb-item__form">
        <fieldset className="hb-item__kinds">
          <legend>What are you making?</legend>
          <div role="group" aria-label="Item kind">
            {ITEM_KINDS.map(kind => (
              <button key={kind.id} type="button" aria-pressed={draft.kind === kind.id}
                className={`rqk-selectable-control${draft.kind === kind.id ? ' is-on' : ''}`} onClick={() => set({ kind: kind.id })} data-testid={`hb-item-kind-${kind.id}`}>
                <span className="hb-item__kind-text"><strong>{kind.label}</strong><small>{kind.help}</small></span>
              </button>
            ))}
          </div>
        </fieldset>

        <section className="hb-item__group">
          <h3>Basics</h3>
          <label className="hb-item__field hb-item__field--wide">
            <span>Name</span>
            <input value={draft.name} onChange={event => set({ name: event.target.value })} placeholder={draft.kind === 'weapon' ? 'Emberbrand Longsword' : 'Cloak of the Tidewalker'} data-testid="hb-item-name" />
          </label>
          {warn('name')}
          <div className="hb-item__row">
            <Select label="Rarity" value={draft.rarity} options={RARITIES} onChange={v => set({ rarity: v })} testid="hb-item-rarity" />
            <Num label="Weight" value={draft.weight} onChange={v => set({ weight: v })} min={0} suffix="lb" />
            <label className="hb-item__field"><span>Cost</span><input value={draft.cost} onChange={event => set({ cost: event.target.value })} placeholder="50 gp" /></label>
          </div>
          <Toggle label="Needs attunement" on={Boolean(draft.requires_attunement)} onChange={v => set({ requires_attunement: v })} testid="hb-item-attune" />
          {draft.requires_attunement && <label className="hb-item__field hb-item__field--wide"><span>Only for (optional)</span><input value={draft.attunement_requirement} onChange={event => set({ attunement_requirement: event.target.value })} placeholder="by a cleric or paladin" /></label>}
        </section>

        {draft.kind === 'weapon' && (
          <section className="hb-item__group" data-testid="hb-item-weapon">
            <h3><Sword size={16} /> Attack</h3>
            <div className="hb-item__row">
              <Segmented label="Type" name="hb-item-cat" value={w.category} onChange={v => setIn('weapon', { category: v })} options={[{ id: 'simple', label: 'Simple' }, { id: 'martial', label: 'Martial' }]} />
              <Segmented label="Used" name="hb-item-reach" value={w.reach} onChange={v => setIn('weapon', { reach: v })} options={[{ id: 'melee', label: 'Melee' }, { id: 'ranged', label: 'Ranged' }]} />
            </div>
            <div className="hb-item__dice">
              <Num label="Dice" value={w.dice_count} onChange={v => setIn('weapon', { dice_count: v })} min={1} max={20} testid="hb-item-dice-count" />
              <span className="hb-item__d" aria-hidden="true">d</span>
              <Select label="Die" value={String(w.dice_sides)} options={DIE_SIZES.map(n => ({ id: String(n), label: `d${n}` }))} onChange={v => setIn('weapon', { dice_sides: Number(v) })} testid="hb-item-dice-sides" />
              <Select label="Damage type" value={w.damage_type} options={DAMAGE_TYPES} onChange={v => setIn('weapon', { damage_type: v })} testid="hb-item-damage-type" />
            </div>
            <Stepper label="Magic bonus" value={w.magic_bonus} onChange={v => setIn('weapon', { magic_bonus: v })} min={0} max={5} testid="hb-item-magic" />
            {warn('magic_bonus')}
            <ChipPicker label="Properties" help="Tap to add" options={WEAPON_PROPERTIES} value={props} onChange={v => setIn('weapon', { properties: v })} testid="hb-item-properties" />
            {warn('properties')}
            {props.includes('versatile') && (
              <Select label="Two-handed die" value={String(w.versatile_sides)} options={DIE_SIZES.map(n => ({ id: String(n), label: `d${n}` }))} onChange={v => setIn('weapon', { versatile_sides: Number(v) })} />
            )}
            {(w.reach === 'ranged' || props.includes('thrown')) && (
              <div className="hb-item__row">
                <Num label="Normal range" value={w.range_normal} onChange={v => setIn('weapon', { range_normal: v })} min={5} suffix="ft." testid="hb-item-range" />
                <Num label="Long range" value={w.range_long} onChange={v => setIn('weapon', { range_long: v })} min={5} suffix="ft." />
              </div>
            )}
            {warn('range')}
            <div className="hb-item__extras">
              <span className="hb-item__label">Extra damage <small>e.g. +1d6 fire on every hit</small></span>
              {(w.extra_damage || []).map((row, index) => (
                <div className="hb-item__extra" key={index}>
                  <input aria-label="Extra damage dice" value={row.dice} placeholder="1d6" onChange={event => setIn('weapon', { extra_damage: w.extra_damage.map((r, i) => (i === index ? { ...r, dice: event.target.value } : r)) })} data-testid={`hb-item-extra-dice-${index}`} />
                  <select aria-label="Extra damage type" value={row.type} onChange={event => setIn('weapon', { extra_damage: w.extra_damage.map((r, i) => (i === index ? { ...r, type: event.target.value } : r)) })}>
                    {DAMAGE_TYPES.map(type => <option key={type} value={type}>{cap(type)}</option>)}
                  </select>
                  <button type="button" aria-label="Remove extra damage" onClick={() => setIn('weapon', { extra_damage: w.extra_damage.filter((_, i) => i !== index) })}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="hb-item__add" onClick={() => setIn('weapon', { extra_damage: [...(w.extra_damage || []), { dice: '1d6', type: 'fire' }] })} data-testid="hb-item-add-extra"><Plus size={15} /> Add extra damage</button>
            </div>
          </section>
        )}

        {draft.kind === 'armour' && (
          <section className="hb-item__group" data-testid="hb-item-armour">
            <h3><Shield size={16} /> Armour</h3>
            <Segmented label="Weight class" name="hb-item-armour" value={draft.armour.armour_type}
              onChange={v => setIn('armour', { armour_type: v, base_ac: ARMOUR_TYPES.find(a => a.id === v)?.baseAc ?? draft.armour.base_ac })}
              options={ARMOUR_TYPES} />
            <p className="hb-item__muted">{ARMOUR_TYPES.find(a => a.id === draft.armour.armour_type)?.help}</p>
            <div className="hb-item__row">
              <Num label="Base AC" value={draft.armour.base_ac} onChange={v => setIn('armour', { base_ac: v })} min={10} max={25} testid="hb-item-base-ac" />
              <Stepper label="Magic bonus" value={draft.armour.magic_bonus} onChange={v => setIn('armour', { magic_bonus: v })} min={0} max={5} />
              <Num label="Strength needed" value={draft.armour.strength_requirement} onChange={v => setIn('armour', { strength_requirement: v })} min={0} max={20} />
            </div>
            <Toggle label="Noisy: disadvantage on Stealth" on={Boolean(draft.armour.stealth_disadvantage)} onChange={v => setIn('armour', { stealth_disadvantage: v })} />
          </section>
        )}

        {draft.kind === 'shield' && (
          <section className="hb-item__group">
            <h3><Shield size={16} /> Shield</h3>
            <div className="hb-item__row">
              <Num label="AC bonus" value={draft.shield.ac_bonus} onChange={v => setIn('shield', { ac_bonus: v })} min={0} max={10} suffix="+" />
              <Stepper label="Magic bonus" value={draft.shield.magic_bonus} onChange={v => setIn('shield', { magic_bonus: v })} min={0} max={5} />
            </div>
          </section>
        )}

        <section className="hb-item__group">
          <h3><Sparkles size={16} /> Bonuses &amp; defences <small>optional</small></h3>
          <div className="hb-item__row">
            {['wearable', 'gear', 'consumable'].includes(draft.kind) && (
              <Stepper label="AC bonus" value={draft.bonuses.ac} onChange={v => setIn('bonuses', { ac: v })} min={0} max={5} testid="hb-item-ac-bonus" />
            )}
            <Stepper label="All saving throws" value={draft.bonuses.saves} onChange={v => setIn('bonuses', { saves: v })} min={0} max={5} />
          </div>
          <div className="hb-item__abilities" role="group" aria-label="Ability score bonuses">
            {ABILITIES.map(ability => (
              <Num key={ability.id} label={ability.label} value={draft.bonuses.abilities[ability.id] ?? ''} min={-5} max={10} placeholder="+0"
                onChange={v => setIn('bonuses', { abilities: { ...draft.bonuses.abilities, [ability.id]: v } })} />
            ))}
          </div>
          <ChipPicker label="Resistant to" help="Takes half damage" options={DAMAGE_TYPES} value={draft.defences.resistances} onChange={v => setIn('defences', { resistances: v })} testid="hb-item-resist" />
          <ChipPicker label="Immune to" help="Takes no damage" options={DAMAGE_TYPES} value={draft.defences.immunities} onChange={v => setIn('defences', { immunities: v })} testid="hb-item-immune" />
          {warn('defences')}
          <ChipPicker label="Vulnerable to" help="Takes double damage" options={DAMAGE_TYPES} value={draft.defences.vulnerabilities} onChange={v => setIn('defences', { vulnerabilities: v })} />
          <ChipPicker label="Can't be" help="Condition immunities" options={CONDITIONS} value={draft.defences.condition_immunities} onChange={v => setIn('defences', { condition_immunities: v })} />
          <div className="hb-item__row">
            <Num label="Charges" value={draft.charges.max} onChange={v => setIn('charges', { max: v })} min={0} max={50} />
            {Number(draft.charges.max) > 0 && <label className="hb-item__field"><span>Regains</span><input value={draft.charges.recharge} onChange={event => setIn('charges', { recharge: event.target.value })} placeholder="1d3 at dawn" /></label>}
          </div>
        </section>

        <section className="hb-item__group">
          <h3>Description</h3>
          <textarea value={draft.description} onChange={event => set({ description: event.target.value })} rows={4}
            placeholder="What it looks like, and any special power in plain words." aria-label="Description" data-testid="hb-item-description" />
        </section>
      </div>

      <SheetPreview item={item} sample={sample} onSample={setSample} />
    </div></div>
  );
}
