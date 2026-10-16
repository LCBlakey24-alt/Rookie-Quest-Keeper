import React from 'react';

// A GM-only, read-only stat block. The expanded lore stays below the table tools.
const abilities = [
  ['STR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
  ['INT', 'intelligence'], ['WIS', 'wisdom'], ['CHA', 'charisma'],
];
const frame = { background: 'var(--rq-bg-panel, #1E2936)', border: '1px solid var(--rq-line, rgba(137,157,176,.25))', padding: 10, color: 'var(--rq-text-primary, #EADFC8)', display: 'grid', gap: 9 };
const label = { display: 'block', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--rq-text-secondary, #C9C4B7)' };
const box = { display: 'grid', justifyItems: 'center', alignContent: 'center', minWidth: 0, gap: 3, padding: 7, background: 'var(--rq-bg-main, #0B1B2B)', border: '1px solid var(--rq-line, rgba(137,157,176,.25))' };
const entry = { border: '1px solid var(--rq-line, rgba(137,157,176,.25))', background: 'var(--rq-bg-main, #0B1B2B)', padding: 8, minWidth: 0 };

function readable(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function npcModifier(score) {
  const parsed = Number(score);
  return Number.isFinite(parsed) ? Math.floor((parsed - 10) / 2) : null;
}

function AbilityBox({ title, score }) {
  const modifier = npcModifier(score);
  return <div style={box}><span style={label}>{title}</span><strong style={{ fontSize: 17 }}>{readable(score)}</strong><span style={{ fontSize: 12 }}>{modifier === null ? '—' : modifier >= 0 ? `+${modifier}` : modifier}</span></div>;
}

function ActionList({ title, items }) {
  if (!items.length) return null;
  return <section style={{ display: 'grid', gap: 5 }}>
    <h4 style={{ ...label, margin: 0 }}>{title}</h4>
    <div style={{ display: 'grid', gap: 5, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
      {items.map((item, index) => (
        <article key={item.id || `${item.name || 'action'}-${index}`} style={entry}>
          <strong style={{ fontSize: 13 }}>{item.name || 'Action'}</strong>
          {(item.bonus || item.damage) && <div style={{ fontSize: 12, marginTop: 4 }}>{item.bonus && <b>Hit {item.bonus}</b>}{item.bonus && item.damage ? ' · ' : ''}{item.damage && <b>{item.damage}</b>}</div>}
          {(item.description || item.notes) && <p style={{ fontSize: 12, lineHeight: 1.35, margin: '4px 0 0' }}>{item.description || item.notes}</p>}
        </article>
      ))}
    </div>
  </section>;
}

export default function NpcCompactStatBlock({ npc = {} }) {
  const stats = npc.stats || {};
  const attacks = Array.isArray(npc.attacks) ? npc.attacks : [];
  const actions = Array.isArray(npc.actions) ? npc.actions : [];
  const specialAbilities = Array.isArray(npc.abilities) ? npc.abilities : [];
  const reactions = Array.isArray(npc.reactions) ? npc.reactions : [];
  const bonusActions = Array.isArray(npc.bonus_actions) ? npc.bonus_actions : [];
  const spells = npc.spells;
  const lore = [npc.description, npc.personality, npc.backstory, npc.notes].filter(Boolean);
  const portrait = npc.image_url || npc.portrait_url || '';

  return (
    <section data-testid="npc-combat-stat-block" style={frame} aria-label={`${npc.name || 'NPC'} combat reference`}>
      <div style={{ display: 'flex', gap: 10, minWidth: 0, alignItems: 'center' }}>
        {portrait && <img src={portrait} alt={npc.name || 'NPC portrait'} style={{ width: 54, height: 54, objectFit: 'cover', border: '1px solid var(--rq-line)' }} />}
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 17 }}>{npc.name || 'NPC'}</strong>
          <p style={{ margin: '2px 0 0', fontSize: 12, opacity: .8 }}>{[npc.role || npc.class_name, npc.race, npc.level ? `Level ${npc.level}` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        <div style={box}><span style={label}>HP</span><strong style={{ fontSize: 20 }}>{readable(npc.hp)}{npc.max_hp && npc.max_hp !== npc.hp ? `/${npc.max_hp}` : ''}</strong></div>
        <div style={box}><span style={label}>AC</span><strong style={{ fontSize: 20 }}>{readable(npc.ac)}</strong></div>
        <div style={box}><span style={label}>Speed</span><strong style={{ fontSize: 15, textAlign: 'center' }}>{readable(npc.speed)}</strong></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4 }}>
        {abilities.map(([title, field]) => <AbilityBox key={field} title={title} score={stats[field] ?? npc[field]} />)}
      </div>
      <ActionList title="Attacks" items={attacks.length ? attacks : actions} />
      <ActionList title="Bonus actions" items={bonusActions} />
      <ActionList title="Reactions" items={reactions} />
      <ActionList title="Special abilities" items={specialAbilities} />
      {spells && <section style={entry}><strong style={{ fontSize: 13 }}>Spells</strong>
        <p style={{ fontSize: 12, margin: '4px 0' }}>DC {readable(spells.spell_save_dc)} · Attack {readable(spells.spell_attack_bonus)}</p>
        {!!spells.cantrips?.length && <p style={{ fontSize: 12, margin: '3px 0' }}><b>Cantrips:</b> {spells.cantrips.join(', ')}</p>}
        {!!spells.known_spells?.length && <p style={{ fontSize: 12, margin: '3px 0' }}><b>Known:</b> {spells.known_spells.join(', ')}</p>}
      </section>}
      {!attacks.length && !actions.length && !bonusActions.length && !reactions.length && !specialAbilities.length && !spells &&
        <p style={{ fontSize: 12, opacity: .8, margin: 0 }}>No combat actions recorded yet. Add verified abilities rather than guessing.</p>}
      {!!lore.length && <details><summary style={{ ...label, cursor: 'pointer', minHeight: 30, display: 'flex', alignItems: 'center' }}>GM notes & story details</summary><div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lore.map((text, index) => <p key={index}>{text}</p>)}</div></details>}
    </section>
  );
}
