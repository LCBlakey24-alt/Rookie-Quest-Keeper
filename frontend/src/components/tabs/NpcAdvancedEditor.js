import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './NpcAdvancedEditor.css';

const ABILITY_NAMES = [
  ['strength', 'STR'], ['dexterity', 'DEX'], ['constitution', 'CON'],
  ['intelligence', 'INT'], ['wisdom', 'WIS'], ['charisma', 'CHA'],
];
const ACTION_GROUPS = [
  ['attacks', 'Attacks (attack roll and damage)'],
  ['actions', 'Other actions'],
  ['bonus_actions', 'Bonus actions'],
  ['reactions', 'Reactions'],
  ['legendary_actions', 'Legendary actions'],
  ['special_abilities', 'Traits and special abilities'],
];
const list = value => Array.isArray(value) ? value : [];
const display = value => value == null ? '' : String(value);
const hasValue = value => value !== null && value !== undefined && value !== '';

function TextField({ label, name, value, onChange, multiline = false, hint = '' }) {
  return <label className="rqk-npc-edit-field">
    <span>{label}</span>
    {multiline
      ? <textarea rows={3} value={display(value)} onChange={event => onChange(name, event.target.value)} />
      : <input type="text" value={display(value)} onChange={event => onChange(name, event.target.value)} />}
    {hint && <small>{hint}</small>}
  </label>;
}

function NumberField({ label, value, onChange, min = 0, max = 1000 }) {
  return <label className="rqk-npc-edit-field">
    <span>{label}</span>
    <input type="number" min={min} max={max}
      value={hasValue(value) ? value : ''}
      placeholder="Not recorded"
      onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))} />
  </label>;
}

function LinesField({ label, items, onChange }) {
  const [text, setText] = useState(list(items).join('\n'));
  return <label className="rqk-npc-edit-field">
    <span>{label}</span>
    <textarea rows={3} value={text}
      placeholder="One item per line"
      onChange={event => setText(event.target.value)}
      onBlur={() => {
        const next = text.split('\n').map(item => item.trim()).filter(Boolean);
        if (JSON.stringify(next) !== JSON.stringify(list(items))) onChange(next);
      }} />
  </label>;
}

function ActionsField({ category, title, items, onChange }) {
  const records = list(items);
  const update = (index, field, input) => {
    onChange(records.map((entry, i) => i === index ? { ...entry, [field]: input } : entry));
  };
  const without = index => onChange(records.filter((entry, i) => index !== i));
  const add = () => onChange([...records, { name: '', description: '' }]);

  return <fieldset className="rqk-npc-edit-action-list" data-testid={'npc-edit-' + category}>
    <legend>{title} <span>({records.length})</span></legend>
    {records.map((entry, index) => <div className="rqk-npc-edit-action-row" key={index}>
      <label className="rqk-npc-edit-field">
        <span>Name</span>
        <input aria-label={title + ' name ' + (index + 1)} value={display(entry.name)}
          onChange={event => update(index, 'name', event.target.value)} />
      </label>
      {category !== 'abilities' && <div className="rqk-npc-edit-action-numbers">
        <label className="rqk-npc-edit-field">
          <span>Hit / save</span>
          <input aria-label={title + ' hit ' + (index + 1)} value={display(entry.bonus)}
            placeholder="+5 or DC 14" onChange={event => update(index, 'bonus', event.target.value)} />
        </label>
        <label className="rqk-npc-edit-field">
          <span>Damage / healing</span>
          <input aria-label={title + ' damage ' + (index + 1)} value={display(entry.damage)}
            placeholder="2d6+3 slashing" onChange={event => update(index, 'damage', event.target.value)} />
        </label>
      </div>}
      <label className="rqk-npc-edit-field">
        <span>Description / effects</span>
        <textarea rows={2} aria-label={title + ' description ' + (index + 1)}
          value={display(category === 'attacks' ? (entry.notes ?? entry.description) : (entry.description ?? entry.notes))}
          onChange={event => update(index, category === 'attacks' ? 'notes' : 'description', event.target.value)} />
      </label>
      <button type="button" className="rqk-npc-edit-remove" onClick={() => without(index)}
        aria-label={'Remove ' + (entry.name || title + ' ' + (index + 1))}><Trash2 size={14} /> Remove</button>
    </div>)}
    <button type="button" className="rqk-npc-edit-add" onClick={add}>
      <Plus size={16} /> Add {title.toLowerCase().replace(/ \(.+\)$/, '').replace(/s$/, '')}
    </button>
  </fieldset>;
}

/**
 * Edits source-confirmed GM data. Existing actions are always shallow-copied
 * when changed so unknown mechanics fields (uses, recharge, reach, etc.) survive.
 * Only changed fields are sent to the backend by NPCsTab.
 */
export default function NpcAdvancedEditor({ value = {}, onChange }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const updateScore = (key, next) => {
    // Do not replace a sourced score with an invalid null or an invented 10.
    // Unverified scores can simply remain unfilled.
    if (next === null) return;
    onChange({ ...value, stats: { ...(value.stats || {}), [key]: next } });
  };
  const spellData = value.spells || {};
  const updateSpell = (key, next) => {
    if (next === null && (key === 'spell_save_dc' || key === 'spell_attack_bonus')) return;
    update('spells', { ...spellData, [key]: next });
  };

  return <details className="rqk-npc-advanced-editor" data-testid="npc-advanced-editor">
    <summary>Full stat block, abilities & backstory <span>Optional detailed editing</span></summary>
    <div className="rqk-npc-advanced-editor__body">
      <p className="rqk-npc-advanced-editor__hint">
        Keep unknown details blank rather than inventing them. Changes to these fields
        save to this campaign's NPC only; existing stat blocks remain intact unless edited.
      </p>

      <h3>Identity and background</h3>
      <div className="rqk-npc-edit-grid">
        {[
          ['role', 'Occupation / role'], ['race', 'Species'], ['class_name', 'Class'],
          ['size', 'Size'], ['alignment', 'Alignment'],
          ['canon_status', 'Canon status'], ['mechanics_status', 'Stat verification status'],
        ].map(([name, label]) =>
          <TextField key={name} name={name} label={label} value={value[name]} onChange={update} />)}
      </div>
      {[
        ['appearance', 'Appearance'], ['personality', 'Personality'],
        ['backstory', 'Backstory and established lore'], ['statblock_notes', 'Combat / GM ruling notes'],
        ['statblock_source', 'Source / provenance'],
      ].map(([name, label]) =>
        <TextField key={name} name={name} label={label} value={value[name]} onChange={update} multiline />)}

      <h3>Defence and movement</h3>
      <div className="rqk-npc-edit-grid">
        <TextField name="cr" label="Challenge rating (leave blank if unconfirmed)" value={value.cr} onChange={update} />
        <TextField name="armor" label="Armour worn / AC explanation" value={value.armor} onChange={update} />
        <TextField name="speed" label="Speed" value={value.speed} onChange={update} />
        <NumberField label="Maximum HP" value={value.max_hp} onChange={next => update('max_hp', next)} />
        <NumberField label="Proficiency bonus" value={value.proficiency_bonus} onChange={next => update('proficiency_bonus', next)} min={0} max={20} />
      </div>
      <label className="rqk-npc-edit-checkbox">
        <input type="checkbox" checked={value.combat_ready !== false} onChange={event => update('combat_ready', event.target.checked)} />
        GM has verified this NPC's combat stats (enables dice rolls)
      </label>

      <h3>Six ability scores</h3>
      <div className="rqk-npc-edit-abilities">
        {ABILITY_NAMES.map(([key, label]) =>
          <NumberField key={key} label={label} value={value.stats?.[key]}
            onChange={next => updateScore(key, next)} min={0} max={30} />)}
      </div>
      <p className="rqk-npc-advanced-editor__hint">For a new NPC, enter all six scores before saving ability edits. Unfilled scores otherwise use the standard value of 10.</p>

      <h3>Proficiencies and resistances</h3>
      <div className="rqk-npc-edit-grid">
        {[
          ['saving_throws', 'Saving throws'], ['skills', 'Skills'],
          ['damage_resistances', 'Damage resistances'], ['damage_immunities', 'Damage immunities'],
          ['condition_immunities', 'Condition immunities'],
        ].map(([name, label]) => <LinesField key={name + ':' + (value.id || 'new')}
          label={label} items={value[name]} onChange={items => update(name, items)} />)}
        <TextField name="senses" label="Senses" value={value.senses} onChange={update} />
        <TextField name="languages" label="Languages" value={value.languages} onChange={update} />
      </div>

      <h3>Combat and action economy</h3>
      <p className="rqk-npc-advanced-editor__hint">Separate actions, bonus actions, reactions and traits. Recharge and other existing metadata are retained when editing.</p>
      {ACTION_GROUPS.map(([name, label]) =>
        <ActionsField key={name} category={name} title={label} items={value[name]}
          onChange={records => update(name, records)} />)}

      <h3>Spellcasting</h3>
      <div className="rqk-npc-edit-grid">
        <TextField name="casting_ability" label="Spellcasting ability" value={spellData.casting_ability}
          onChange={(_, next) => updateSpell('casting_ability', next)} />
        <NumberField label="Spell save DC" value={spellData.spell_save_dc}
          onChange={next => updateSpell('spell_save_dc', next)} min={0} max={40} />
        <NumberField label="Spell attack bonus" value={spellData.spell_attack_bonus}
          onChange={next => updateSpell('spell_attack_bonus', next)} min={-20} max={40} />
        <LinesField label="Cantrips" items={spellData.cantrips}
          onChange={items => updateSpell('cantrips', items)} />
        <LinesField label="Known spells" items={spellData.known_spells}
          onChange={items => updateSpell('known_spells', items)} />
      </div>
    </div>
  </details>;
}
