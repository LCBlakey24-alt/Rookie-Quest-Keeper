import React from 'react';
import { NPC_STAT_NAMES } from './npcEditorDraft';
import './NpcFullStatEditor.css';

const statLabels = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

const listSections = [
  ['saving_throws', 'Saving throws'],
  ['skills', 'Skills'],
  ['damage_resistances', 'Damage resistances'],
  ['damage_immunities', 'Damage immunities'],
  ['condition_immunities', 'Condition immunities'],
];

const actionSections = [
  ['attacks', 'Attacks', 'notes'],
  ['actions', 'Other actions', 'description'],
  ['bonus_actions', 'Bonus actions', 'description'],
  ['reactions', 'Reactions', 'description'],
  ['legendary_actions', 'Legendary actions', 'description'],
  ['special_abilities', 'Special traits', 'description'],
  ['abilities', 'Legacy abilities', 'description'],
];

function TextField({ label, value, onChange, type = 'text', multiline = false, placeholder = '' }) {
  return (
    <label className="rqk-npc-editor__field">
      <span>{label}</span>
      {multiline
        ? <textarea value={value ?? ''} placeholder={placeholder} onChange={event => onChange(event.target.value)} rows={3} />
        : <input type={type} value={value ?? ''} placeholder={placeholder} onChange={event => onChange(event.target.value)} />}
    </label>
  );
}

function ActionEditor({ field, title, descriptionKey, entries, onChange }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const changeEntry = (index, key, value) => onChange(field, safeEntries.map((item, itemIndex) => (
    itemIndex === index ? { ...(typeof item === 'object' ? item : { name: String(item || '') }), [key]: value } : item
  )));
  return (
    <details className="rqk-npc-editor__action-group">
      <summary>{title} <span>{safeEntries.length}</span></summary>
      <div className="rqk-npc-editor__action-list">
        {safeEntries.length === 0 && <p className="rqk-npc-editor__hint">None recorded. Add one only if you have its actual details.</p>}
        {safeEntries.map((raw, index) => {
          const item = typeof raw === 'object' && raw ? raw : { name: String(raw || '') };
          const detailsField = item.description != null && item.description !== '' ? 'description' : descriptionKey;
          return (
            <div className="rqk-npc-editor__action-entry" key={index}>
              <div className="rqk-npc-editor__action-entry-top">
                <strong>{item.name || `${title.slice(0, -1) || 'Action'} ${index + 1}`}</strong>
                <button type="button" onClick={() => onChange(field, safeEntries.filter((_, current) => current !== index))} aria-label={`Remove ${item.name || title + ' ' + (index + 1)}`}>Remove</button>
              </div>
              <TextField label="Name" value={item.name} onChange={value => changeEntry(index, 'name', value)} />
              <div className="rqk-npc-editor__two">
                <TextField label="To hit / saving throw" value={item.bonus} onChange={value => changeEntry(index, 'bonus', value)} placeholder="+7 or DC 15 DEX" />
                <TextField label="Damage / effect" value={item.damage} onChange={value => changeEntry(index, 'damage', value)} placeholder="2d6+4 slashing" />
              </div>
              <TextField multiline label="How it works" value={item[detailsField] ?? item.notes} onChange={value => changeEntry(index, detailsField, value)} placeholder="Range, conditions, duration, uses..." />
              <div className="rqk-npc-editor__two">
                <TextField label="Recharge (optional)" value={item.recharge} onChange={value => changeEntry(index, 'recharge', value)} placeholder="5-6" />
                <TextField label="Uses (optional)" value={item.uses} onChange={value => changeEntry(index, 'uses', value)} placeholder="3 / long rest" />
              </div>
            </div>
          );
        })}
        <button type="button" className="rqk-npc-editor__add" onClick={() => onChange(field, [...safeEntries, { name: '', bonus: '', damage: '', [descriptionKey]: '' }])}>
          + Add {title.toLowerCase().replace(/s$/, '')}
        </button>
      </div>
    </details>
  );
}

/** Complete GM-only editor; no generated or guessed statistics. */
export default function NpcFullStatEditor({ draft, onChange, editing = false }) {
  const stats = draft.stats || {};
  const set = (key, value) => onChange(key, value);
  return (
    <details className="rqk-npc-editor" defaultOpen={editing} data-testid="npc-full-stat-editor">
      <summary>Full stat block, actions & lore <span>Advanced details</span></summary>
      <div className="rqk-npc-editor__body">
        <p className="rqk-npc-editor__hint">
          Everything here is saved to this campaign's NPC. Leave unknown values blank rather than inventing statistics.
        </p>
        <div className="rqk-npc-editor__two">
          <TextField label="Role / title" value={draft.role} onChange={value => set('role', value)} />
          <TextField label="Race / species" value={draft.race} onChange={value => set('race', value)} />
          <TextField label="Armour worn / natural armour" value={draft.armor} onChange={value => set('armor', value)} placeholder="Chain mail and shield" />
          <TextField label="Challenge rating (if known)" value={draft.cr} onChange={value => set('cr', value)} placeholder="Not established" />
          <TextField label="Size" value={draft.size} onChange={value => set('size', value)} placeholder="Medium" />
          <TextField label="Speed" value={draft.speed} onChange={value => set('speed', value)} placeholder="30 ft." />
          <TextField label="Maximum HP" type="number" value={draft.max_hp} onChange={value => set('max_hp', value)} />
          <TextField label="Proficiency bonus" type="number" value={draft.proficiency_bonus} onChange={value => set('proficiency_bonus', value)} />
        </div>
        <label className="rqk-npc-editor__checkbox">
          <input type="checkbox" checked={draft.combat_ready !== false} onChange={event => set('combat_ready', event.target.checked)} />
          Combat statistics verified — enable built-in dice rolls
        </label>
        <div className="rqk-npc-editor__ability-heading">Ability scores</div>
        <div className="rqk-npc-editor__ability-grid">
          {NPC_STAT_NAMES.map(stat => (
            <label className="rqk-npc-editor__stat" key={stat}>
              <span>{statLabels[stat]}</span>
              <input type="number" min="0" max="99" value={stats[stat] ?? ''} placeholder="—"
                onChange={event => set('stats', { ...stats, [stat]: event.target.value })}
                aria-label={stat + ' score'} />
            </label>
          ))}
        </div>
        <p className="rqk-npc-editor__hint">Blank scores mean the source has not established them. Complete all six before saving an ability-score set.</p>
        <div className="rqk-npc-editor__two">
          {listSections.map(([key, label]) => (
            <TextField key={key} label={label + ' (one per line)'} multiline
              value={(draft[key] || []).join('\n')}
              onChange={value => set(key, value.split('\n'))}
              placeholder={key === 'skills' ? 'Perception +7\nStealth +4' : ''} />
          ))}
          <TextField label="Senses" value={typeof draft.senses === 'string' ? draft.senses : Array.isArray(draft.senses) ? draft.senses.join(', ') : ''} onChange={value => set('senses', value)} />
          <TextField label="Languages" value={typeof draft.languages === 'string' ? draft.languages : Array.isArray(draft.languages) ? draft.languages.join(', ') : ''} onChange={value => set('languages', value)} />
        </div>
        <div className="rqk-npc-editor__ability-heading">Combat actions & abilities</div>
        {actionSections.map(([field, title, descriptionKey]) => (
          <ActionEditor key={field} field={field} title={title} descriptionKey={descriptionKey} entries={draft[field]} onChange={onChange} />
        ))}
        <div className="rqk-npc-editor__ability-heading">Character story & continuity</div>
        <TextField label="Backstory" multiline value={draft.backstory} onChange={value => set('backstory', value)} />
        <TextField label="Appearance" multiline value={draft.appearance} onChange={value => set('appearance', value)} />
        <TextField label="Personality" multiline value={draft.personality} onChange={value => set('personality', value)} />
        <div className="rqk-npc-editor__two">
          <TextField label="Canon status" value={draft.canon_status} onChange={value => set('canon_status', value)} placeholder="Canon / Draft" />
          <TextField label="Mechanics status" value={draft.mechanics_status} onChange={value => set('mechanics_status', value)} placeholder="Verified / DM draft" />
        </div>
        <TextField label="Stat block source" value={draft.statblock_source} onChange={value => set('statblock_source', value)} placeholder="Which notes this came from" />
        <TextField label="Private GM stat block notes" multiline value={draft.statblock_notes} onChange={value => set('statblock_notes', value)} />
      </div>
    </details>
  );
}
