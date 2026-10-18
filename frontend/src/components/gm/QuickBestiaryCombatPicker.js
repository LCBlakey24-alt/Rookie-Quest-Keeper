import React, { useMemo, useState } from 'react';
import { Plus, Search, Skull } from 'lucide-react';
import { MONSTER_DATABASE } from '@/data/monsterDatabase';

function toCombatant(monster) {
  // The bundled bestiary supplies known HP and AC. Do not fabricate an
  // attack block, spells or other statistics that aren't in that entry.
  const stamp = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const hp = Math.max(1, Number(monster.hp) || 1);
  return {
    id: `bestiary-${stamp}`,
    name: monster.name,
    type: 'enemy',
    hp,
    maxHp: hp,
    ac: Math.max(1, Number(monster.ac) || 10),
    initiativeMod: Number(monster.initiativeMod) || 0,
    cr: monster.cr,
    creature_type: monster.type,
    description: String(monster.abilities || monster.description || ''),
    // Keep verified, published actions and scores on the encounter copy.
    // Legacy entries with no recorded attacks must not gain invented ones.
    stats: monster.stats ? { ...monster.stats } : undefined,
    actions: Array.isArray(monster.actions) ? monster.actions.map(action => ({ ...action })) : [],
    special_abilities: Array.isArray(monster.special_abilities) ? monster.special_abilities.map(ability => ({ ...ability })) : [],
    reactions: Array.isArray(monster.reactions) ? monster.reactions.map(action => ({ ...action })) : [],
    bonus_actions: Array.isArray(monster.bonus_actions) ? monster.bonus_actions.map(action => ({ ...action })) : [],
    saving_throws: Array.isArray(monster.saving_throws) ? [...monster.saving_throws] : [],
    skills: Array.isArray(monster.skills) ? [...monster.skills] : [],
    speed: monster.speed,
    source: 'Built-in Bestiary',
    conditions: [],
  };
}

export default function QuickBestiaryCombatPicker({ onAdd }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (text.length < 2) return [];
    return MONSTER_DATABASE.filter(monster =>
      String(monster.name).toLowerCase().includes(text) ||
      String(monster.type || '').toLowerCase().includes(text)
    ).slice(0, 12);
  }, [query]);

  return (
    <section data-testid="quick-bestiary-combat-picker" style={panelStyle}>
      <label style={labelStyle} htmlFor="rqk-bestiary-combat-search"><Skull size={15} /> Quick-add from Bestiary</label>
      <div style={searchStyle}>
        <Search size={14} aria-hidden="true" />
        <input id="rqk-bestiary-combat-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search goblin, wolf, beast…" style={inputStyle} />
      </div>
      {query.trim().length > 0 && query.trim().length < 2 && <p style={hintStyle}>Type at least two letters to search.</p>}
      {results.length > 0 && <div style={resultsStyle}>
        {results.map(monster => <div key={monster.name} style={resultStyle}>
          <span style={nameStyle}><strong>{monster.name}</strong><small>{monster.type || 'Creature'} · CR {monster.cr} · HP {monster.hp} · AC {monster.ac}</small></span>
          <button type="button" aria-label={`Add ${monster.name} to combat`} onClick={() => onAdd(toCombatant(monster))} style={buttonStyle}><Plus size={14} /> Add</button>
        </div>)}
      </div>}
      {query.trim().length >= 2 && results.length === 0 && <p style={hintStyle}>No matching creatures in the built-in Bestiary.</p>}
      <p style={hintStyle}>Adds one creature at a time to the GM tracker. Creature HP and AC remain private.</p>
    </section>
  );
}

const panelStyle = { display: 'grid', gap: 8, padding: 10, background: 'var(--rq-bg-panel, #1E2936)', border: '1px solid var(--rq-line, rgba(137,157,176,0.14))', color: 'var(--rq-text-primary, #EADFC8)' };
const labelStyle = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 850 };
const searchStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '0 9px', background: 'var(--rq-bg-input, #101F2D)', border: '1px solid var(--rq-line-strong, rgba(201,169,107,0.3))' };
const inputStyle = { width: '100%', minWidth: 0, minHeight: 38, background: 'transparent', color: 'inherit', border: 'none', outline: 'none' };
const resultsStyle = { display: 'grid', maxHeight: 220, overflowY: 'auto', gap: 4 };
const resultStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 6, background: 'var(--rq-card, #263748)' };
const nameStyle = { minWidth: 0, display: 'grid', gap: 2, fontSize: 12 };
const buttonStyle = { flexShrink: 0, minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--rq-primary, #C9A96B)', border: 0, color: '#07131F', cursor: 'pointer', padding: '0 11px', fontWeight: 900 };
const hintStyle = { fontSize: 11, color: 'var(--rq-text-secondary, #D0C5B2)', margin: 0 };
