import React, { useState } from 'react';
import { parseDiceNotation, rollDiceNotation } from '@/data/diceRoller';

// A GM-only combat reference. Rolls stay local; a card never silently edits campaign or combat state.
const abilities = [
  ['STR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
  ['INT', 'intelligence'], ['WIS', 'wisdom'], ['CHA', 'charisma'],
];
const frame = { background: 'var(--rq-bg-panel, #1E2936)', border: '1px solid var(--rq-line, rgba(137,157,176,.25))', padding: 10, color: 'var(--rq-text-primary, #EADFC8)', display: 'grid', gap: 9 };
const label = { display: 'block', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--rq-text-secondary, #C9C4B7)' };
const box = { display: 'grid', justifyItems: 'center', alignContent: 'center', minWidth: 0, gap: 3, padding: 7, background: 'var(--rq-bg-main, #0B1B2B)', border: '1px solid var(--rq-line, rgba(137,157,176,.25))' };
const rollButton = { minHeight: 34, padding: '5px 10px', border: '1px solid var(--rq-line, rgba(201,169,107,.5))', background: 'var(--rq-bg-elevated, #263748)', color: 'var(--rq-text-primary, #EADFC8)', fontSize: 12, fontWeight: 800, cursor: 'pointer' };
const entry = { border: '1px solid var(--rq-line, rgba(137,157,176,.25))', background: 'var(--rq-bg-main, #0B1B2B)', padding: 8, minWidth: 0 };

function readable(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
function confirmedPositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? String(value) : '—';
}

export function npcModifier(score) {
  if (score === '' || score === null || score === undefined) return null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? Math.floor((parsed - 10) / 2) : null;
}

function AbilityBox({ title, score }) {
  const modifier = npcModifier(score);
  return <div style={box}><span style={label}>{title}</span><strong style={{ fontSize: 17 }}>{readable(score)}</strong><span style={{ fontSize: 12 }}>{modifier === null ? '—' : modifier >= 0 ? `+${modifier}` : modifier}</span></div>;
}

// A save DC is not an attack roll, and descriptive actions have no guessed dice.
export function actionAttackNotation(action = {}) {
  const bonus = String(action.bonus ?? '').trim();
  return /^[+-]\d{1,2}$/.test(bonus) ? `1d20${bonus}` : null;
}

export function actionDamageNotation(action = {}) {
  const damage = String(action.damage ?? '').trim();
  // Alternate and conditional damage needs a GM decision before rolling.
  if (!damage || /\b(or|instead|if|half)\b/i.test(damage)) return null;
  const groups = damage.match(/\d{0,3}d\d{1,3}(?:\s*[+-]\s*\d{1,4})?/gi) || [];
  if (groups.length === 0) return null;
  const notation = groups.map(group => group.replace(/\s+/g, '')).join('+');
  return parseDiceNotation(notation).valid ? notation : null;
}

function ActionList({ title, items, onRoll, combatReady }) {
  if (!items.length) return null;
  return <section style={{ display: 'grid', gap: 5 }}>
    <h4 style={{ ...label, margin: 0 }}>{title}</h4>
    <div style={{ display: 'grid', gap: 5, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
      {items.map((item, index) => (
        <article key={item.id || `${item.name || 'action'}-${index}`} style={entry}>
          <strong style={{ fontSize: 13 }}>{item.name || 'Action'}</strong>
          {(item.bonus || item.damage) && <div style={{ fontSize: 12, marginTop: 4 }}>{item.bonus && <b>Hit {item.bonus}</b>}{item.bonus && item.damage ? ' · ' : ''}{item.damage && <b>{item.damage}</b>}</div>}
          {(item.description || item.notes) && <p style={{ fontSize: 12, lineHeight: 1.35, margin: '4px 0 0' }}>{item.description || item.notes}</p>}
          {combatReady && (actionAttackNotation(item) || actionDamageNotation(item)) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
              {actionAttackNotation(item) && <button type="button" onClick={() => onRoll(`${item.name || 'Action'} attack`, actionAttackNotation(item))} style={rollButton} aria-label={`Roll ${item.name || 'Action'} to hit`}>Roll to hit</button>}
              {actionDamageNotation(item) && <button type="button" onClick={() => onRoll(`${item.name || 'Action'} damage`, actionDamageNotation(item))} style={rollButton} aria-label={`Roll ${item.name || 'Action'} damage`}>Roll damage</button>}
            </div>
          )}
        </article>
      ))}
    </div>
  </section>;
}

export default function NpcCompactStatBlock({ npc = {} }) {
  const [lastRoll, setLastRoll] = useState('');
  const rollAction = (name, notation) => {
    const result = rollDiceNotation(notation);
    if (!result.valid) {
      setLastRoll(`${name}: ${result.error}`);
      return;
    }
    const dice = result.rolls.map(roll => roll.result).join(', ');
    const bonus = result.modifier ? ` ${result.modifier > 0 ? '+' : '-'} ${Math.abs(result.modifier)}` : '';
    const critical = result.isCrit ? ' (natural 20)' : result.isFumble ? ' (natural 1)' : '';
    setLastRoll(`${name}: ${notation} [${dice}]${bonus} = ${result.total}${critical}`);
  };
  const unverified = npc.combat_ready === false;
  const stats = unverified ? {} : (npc.stats || {});
  const attacks = Array.isArray(npc.attacks) ? npc.attacks : [];
  const actions = Array.isArray(npc.actions) ? npc.actions : [];
  const specialAbilities = Array.isArray(npc.special_abilities) ? npc.special_abilities : (Array.isArray(npc.abilities) ? npc.abilities : []);
  const legendaryActions = Array.isArray(npc.legendary_actions) ? npc.legendary_actions : [];
  const reactions = Array.isArray(npc.reactions) ? npc.reactions : [];
  const bonusActions = Array.isArray(npc.bonus_actions) ? npc.bonus_actions : [];
  const spells = npc.spells;
  const combatActionsPresent = attacks.length || actions.length || bonusActions.length || reactions.length || specialAbilities.length || legendaryActions.length;
  const lore = [npc.description, npc.personality, npc.backstory, npc.notes].filter(Boolean);
  const portrait = npc.image_url || npc.portrait_url || '';

  return (
    <section data-testid="npc-combat-stat-block" style={frame} aria-label={`${npc.name || 'NPC'} combat reference`}>
      <div style={{ display: 'flex', gap: 10, minWidth: 0, alignItems: 'center' }}>
        {portrait && <img src={portrait} alt={npc.name || 'NPC portrait'} style={{ width: 54, height: 54, objectFit: 'cover', border: '1px solid var(--rq-line)' }} />}
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 17 }}>{npc.name || 'NPC'}</strong>
          <p style={{ margin: '2px 0 0', fontSize: 12, opacity: .8 }}>{[npc.role || npc.class_name, npc.race, npc.size && npc.type ? `${npc.size} ${npc.type}` : '', npc.cr != null ? `CR ${npc.cr}` : '', Number(npc.level) > 0 ? `Level ${npc.level}` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {unverified && <p role="note" style={{ margin: 0, color: 'var(--rq-warning, #D39A43)', fontSize: 12 }}>Combat stats not yet verified — keep this NPC out of encounters until equipped with a confirmed stat block.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        <div style={box}><span style={label}>HP</span><strong style={{ fontSize: 20 }}>{unverified ? '—' : confirmedPositive(npc.hp)}{!unverified && Number(npc.max_hp) > 0 && npc.max_hp !== npc.hp ? `/${npc.max_hp}` : ''}</strong></div>
        <div style={box}><span style={label}>AC</span><strong style={{ fontSize: 20 }}>{unverified ? '—' : confirmedPositive(npc.ac)}</strong></div>
        <div style={box}><span style={label}>Speed</span><strong style={{ fontSize: 15, textAlign: 'center' }}>{readable(npc.speed)}</strong></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4 }}>
        {abilities.map(([title, field]) => <AbilityBox key={field} title={title} score={unverified ? null : (stats[field] ?? npc[field])} />)}
      </div>
      <ActionList title="Attacks & actions" items={attacks.length ? attacks : actions} onRoll={rollAction} combatReady={!unverified} />
      {attacks.length > 0 && actions.length > 0 && <ActionList title="Other actions" items={actions} onRoll={rollAction} combatReady={!unverified} />}
      <ActionList title="Bonus actions" items={bonusActions} onRoll={rollAction} combatReady={!unverified} />
      <ActionList title="Reactions" items={reactions} onRoll={rollAction} combatReady={!unverified} />
      <ActionList title="Special abilities" items={specialAbilities} onRoll={rollAction} combatReady={!unverified} />
      <ActionList title="Legendary actions" items={legendaryActions} onRoll={rollAction} combatReady={!unverified} />
      {lastRoll && <output role="status" aria-live="polite" style={{ ...entry, fontSize: 12 }} data-testid="stat-block-roll-result">{lastRoll}</output>}
      {spells && <section style={entry}><strong style={{ fontSize: 13 }}>Spells</strong>
        <p style={{ fontSize: 12, margin: '4px 0' }}>DC {readable(spells.spell_save_dc)} · Attack {readable(spells.spell_attack_bonus)}</p>
        {!!spells.cantrips?.length && <p style={{ fontSize: 12, margin: '3px 0' }}><b>Cantrips:</b> {spells.cantrips.join(', ')}</p>}
        {!!spells.known_spells?.length && <p style={{ fontSize: 12, margin: '3px 0' }}><b>Known:</b> {spells.known_spells.join(', ')}</p>}
      </section>}
      {!combatActionsPresent && !spells &&
        <p style={{ fontSize: 12, opacity: .8, margin: 0 }}>No combat actions recorded yet. Add verified abilities rather than guessing.</p>}
      {!!lore.length && <details><summary style={{ ...label, cursor: 'pointer', minHeight: 30, display: 'flex', alignItems: 'center' }}>GM notes & story details</summary><div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lore.map((text, index) => <p key={index}>{text}</p>)}</div></details>}
    </section>
  );
}
