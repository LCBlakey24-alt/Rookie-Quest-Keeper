import React, { useState } from 'react';
import { parseDiceNotation, rollDiceNotation } from '@/data/diceRoller';
import './NpcCompactStatBlock.css';

// One visual stat block for campaign NPCs, official SRD beasts and homebrew.
// All values are read from the record: missing campaign canon stays missing.
const ABILITIES = [
  ['STR', 'strength'], ['DEX', 'dexterity'], ['CON', 'constitution'],
  ['INT', 'intelligence'], ['WIS', 'wisdom'], ['CHA', 'charisma'],
];

function readable(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function labelForKey(key) {
  return String(key).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function describe(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(describe).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    if (value.name) return [value.name, value.bonus ?? value.value].filter(item => item !== undefined && item !== '').join(' ');
    return Object.entries(value)
      .filter(([, entry]) => entry !== null && entry !== undefined && entry !== '')
      .map(([key, entry]) => labelForKey(key) + ' ' + describe(entry)).join(', ');
  }
  return String(value);
}

export function npcModifier(score) {
  if (score === '' || score === null || score === undefined) return null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? Math.floor((parsed - 10) / 2) : null;
}

export function npcIdentityLine(npc = {}) {
  return npc.type ? [npc.size, npc.type, npc.subtype ? '(' + npc.subtype + ')' : '', npc.alignment].filter(Boolean).join(' ') :
    [npc.role || npc.occupation || npc.class_name, npc.race, Number(npc.level) > 0 ? 'Level ' + npc.level : ''].filter(Boolean).join(' · ');
}

function signed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return readable(value);
  return numeric >= 0 ? '+' + numeric : String(numeric);
}

function confirmedNumber(value, allowZero = false) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isFinite(num) && (allowZero ? num >= 0 : num > 0) ? String(num) : '—';
}

function AbilityBox({ title, score }) {
  const modifier = npcModifier(score);
  return (
    <div className="rqk-stat-block__ability">
      <span className="rqk-stat-block__ability-label">{title}</span>
      <strong className="rqk-stat-block__ability-score">{readable(score)}</strong>
      <span className="rqk-stat-block__ability-mod">{modifier === null ? '—' : signed(modifier)}</span>
    </div>
  );
}

// A saving-throw DC is not an attack bonus. Don't invent dice for narrative actions.
export function actionAttackNotation(action = {}) {
  const bonus = String(action.bonus ?? '').trim();
  return /^[+-]\d{1,2}$/.test(bonus) ? '1d20' + bonus : null;
}

export function actionDamageNotation(action = {}) {
  const damage = String(action.damage ?? '').trim();
  // Alternative, conditional or reduced damage requires a GM decision first.
  if (!damage || /\b(or|instead|if|half)\b/i.test(damage)) return null;
  const groups = damage.match(/\d{0,3}d\d{1,3}(?:\s*[+-]\s*\d{1,4})?/gi) || [];
  if (!groups.length) return null;
  const notation = groups.map(group => group.replace(/\s+/g, '')).join('+');
  return parseDiceNotation(notation).valid ? notation : null;
}

function MetaRow({ title, value }) {
  const text = describe(value);
  if (!text || text === 'None') return null;
  return <div className="rqk-stat-block__meta-row"><strong>{title}:</strong><span>{text}</span></div>;
}

function ActionList({ title, items, onRoll, combatReady }) {
  if (!items.length) return null;
  return (
    <section className="rqk-stat-block__section" aria-label={title}>
      <h3 className="rqk-stat-block__section-title">{title}</h3>
      {items.map((original, index) => {
        const item = typeof original === 'string' ? { name: original } : (original || {});
        const name = item.name || 'Action';
        const attack = combatReady ? actionAttackNotation(item) : null;
        const damage = combatReady ? actionDamageNotation(item) : null;
        return (
          <article className="rqk-stat-block__action" key={item.id || name + '-' + index}>
            <strong className="rqk-stat-block__action-heading">{name}</strong>
            {(item.bonus || item.damage) && (
              <div className="rqk-stat-block__action-stats">
                {item.bonus && <span>{/^DC\b/i.test(String(item.bonus)) ? '' : 'Hit '}{item.bonus}</span>}
                {item.damage && <span>{item.damage}</span>}
              </div>
            )}
            {(item.description || item.notes) && (
              <p className="rqk-stat-block__action-notes">{item.description || item.notes}</p>
            )}
            {(attack || damage) && (
              <div className="rqk-stat-block__roll-actions">
                {attack && <button type="button" className="rqk-stat-block__roll-button" aria-label={'Roll ' + name + ' to hit'} onClick={() => onRoll(name + ' attack', attack)}>Roll to hit</button>}
                {damage && <button type="button" className="rqk-stat-block__roll-button" aria-label={'Roll ' + name + ' damage'} onClick={() => onRoll(name + ' damage', damage)}>Roll damage</button>}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default function NpcCompactStatBlock({ npc = {}, library = false }) {
  const [lastRoll, setLastRoll] = useState('');
  const unverified = npc.combat_ready === false;
  const estimatedLegacy = npc.source === 'legacy-reference';
  const stats = unverified ? {} : (npc.stats || npc.ability_scores || {});
  const attacks = Array.isArray(npc.attacks) ? npc.attacks : [];
  const actions = Array.isArray(npc.actions) ? npc.actions : [];
  const specialAbilities = Array.isArray(npc.special_abilities)
    ? npc.special_abilities
    : (Array.isArray(npc.abilities) ? npc.abilities : []);
  const bonusActions = Array.isArray(npc.bonus_actions) ? npc.bonus_actions : [];
  const reactions = Array.isArray(npc.reactions) ? npc.reactions : [];
  const legendaryActions = Array.isArray(npc.legendary_actions) ? npc.legendary_actions : [];
  const allActions = attacks.length || actions.length || specialAbilities.length ||
    bonusActions.length || reactions.length || legendaryActions.length;
  const spells = npc.spells && typeof npc.spells === 'object' && !Array.isArray(npc.spells) ? npc.spells : null;
  const lore = [
    ['Description', library ? null : npc.description],
    ['Appearance', npc.appearance],
    ['Personality', npc.personality],
    ['Backstory', npc.backstory],
    ['GM notes', npc.notes],
  ].filter(([, value]) => value != null && String(value).trim());
  const portrait = npc.image_url || npc.portrait_url || '';
  const hp = unverified ? '—' : confirmedNumber(npc.hp ?? npc.hit_points ?? npc.current_hp, true);
  const hpMax = unverified ? '—' : confirmedNumber(npc.max_hp ?? npc.maxHp ?? npc.max_hit_points);
  const hpDisplay = hp !== '—' && hpMax !== '—' && hp !== hpMax ? hp + '/' + hpMax : hp;
  const kind = npcIdentityLine(npc);
  const source = npc.source === 'srd-5.1' || npc.source === 'srd' ? 'SRD 5.1' : npc.type ? 'Bestiary' : 'Campaign NPC';
  const rollAction = (name, notation) => {
    const result = rollDiceNotation(notation);
    if (!result.valid) {
      setLastRoll(name + ': ' + result.error);
      return;
    }
    const dice = result.rolls.map(roll => roll.result).join(', ');
    const bonus = result.modifier ? ' ' + (result.modifier > 0 ? '+' : '-') + ' ' + Math.abs(result.modifier) : '';
    const critical = result.isCrit ? ' (natural 20)' : result.isFumble ? ' (natural 1)' : '';
    setLastRoll(name + ': ' + notation + ' [' + dice + ']' + bonus + ' = ' + result.total + critical);
  };
  const canRoll = !unverified && !estimatedLegacy;
  const hasVitals = !unverified && [npc.ac ?? npc.armor_class, npc.hp ?? npc.hit_points ?? npc.current_hp, npc.speed]
    .some(value => value !== null && value !== undefined && value !== '');
  const hasScores = !unverified && ABILITIES.some(([, field]) =>
    (stats[field] ?? npc[field]) !== null && (stats[field] ?? npc[field]) !== undefined && (stats[field] ?? npc[field]) !== '');
  const missingCombat = unverified || (!hasVitals && !hasScores && !allActions && !spells);

  return (
    <section className={'rqk-stat-block' + (library ? ' rqk-stat-block--library' : '')} data-testid="npc-combat-stat-block" aria-label={(npc.name || 'NPC') + ' combat reference'}>
      {!library && <header className="rqk-stat-block__header">
        {portrait && <img className="rqk-stat-block__portrait" src={portrait} alt={npc.name || 'NPC portrait'} />}
        <div className="rqk-stat-block__identity">
          <p className="rqk-stat-block__eyebrow">{source} · Stat block</p>
          <h2 className="rqk-stat-block__name">{npc.name || 'NPC'}</h2>
          {kind && <p className="rqk-stat-block__subtitle">{kind}</p>}
          {npc.cr != null && npc.cr !== '' && (
            <span className="rqk-stat-block__cr">CR {npc.cr}{npc.xp != null ? ' · ' + npc.xp + ' XP' : ''}</span>
          )}
        </div>
      </header>}

      {library && npc.cr != null && npc.cr !== '' && <span className="rqk-stat-block__cr">CR {npc.cr}{npc.xp != null ? ' · ' + npc.xp + ' XP' : ''}</span>}

      {library && npc.description && <p className="rqk-stat-block__profile">{String(npc.description)}</p>}
      {library && missingCombat && <p className="rqk-stat-block__empty" role="note">Combat statistics not confirmed. This is a story reference; no combat numbers have been invented.</p>}

      {!library && unverified && <p className="rqk-stat-block__warning" role="note">Combat stats not yet verified — keep this NPC out of encounters until equipped with a confirmed stat block.</p>}
      {estimatedLegacy && <p className="rqk-stat-block__warning" role="note">Legacy reference: some statistics and attacks may be estimates. Dice buttons are disabled until verified.</p>}

      {(!library || hasVitals) && <div className="rqk-stat-block__vitals" aria-label="Defence and movement">
        <div className="rqk-stat-block__vital"><span className="rqk-stat-block__vital-label" title="Armour Class">AC</span><strong className="rqk-stat-block__vital-value">{unverified ? '—' : confirmedNumber(npc.ac ?? npc.armor_class)}</strong></div>
        <div className="rqk-stat-block__vital"><span className="rqk-stat-block__vital-label" title="Hit Points">HP</span><strong className="rqk-stat-block__vital-value">{hpDisplay}</strong></div>
        <div className="rqk-stat-block__vital"><span className="rqk-stat-block__vital-label">Speed</span><strong className="rqk-stat-block__vital-value rqk-stat-block__vital-value--speed">{readable(npc.speed)}</strong></div>
      </div>}

      {(!library || hasScores) && <div className="rqk-stat-block__abilities" aria-label="Ability scores">
        {ABILITIES.map(([title, field]) => <AbilityBox key={field} title={title} score={unverified ? null : (stats[field] ?? npc[field])} />)}
      </div>}

      <div className="rqk-stat-block__metadata" aria-label="Other statistics">
        <MetaRow title="Proficiency Bonus" value={npc.proficiency_bonus != null ? signed(npc.proficiency_bonus) : null} />
        <MetaRow title="Saving Throws" value={npc.saving_throws || npc.saves} />
        <MetaRow title="Skills" value={npc.skills} />
        <MetaRow title="Damage Vulnerabilities" value={npc.damage_vulnerabilities || npc.vulnerabilities} />
        <MetaRow title="Damage Resistances" value={npc.damage_resistances || npc.resistances} />
        <MetaRow title="Damage Immunities" value={npc.damage_immunities || npc.immunities} />
        <MetaRow title="Condition Immunities" value={npc.condition_immunities} />
        <MetaRow title="Senses" value={npc.senses} />
        <MetaRow title="Languages" value={npc.languages} />
      </div>

      <ActionList title="Traits" items={specialAbilities} onRoll={rollAction} combatReady={canRoll} />
      {!specialAbilities.length && npc.abilities && !Array.isArray(npc.abilities) && npc.abilities !== 'None' && (
        <section className="rqk-stat-block__section" aria-label="Traits">
          <h3 className="rqk-stat-block__section-title">Traits</h3>
          <p className="rqk-stat-block__action-notes">{String(npc.abilities)}</p>
        </section>
      )}
      <ActionList title="Actions" items={attacks.length ? attacks : actions} onRoll={rollAction} combatReady={canRoll} />
      {attacks.length > 0 && actions.length > 0 && <ActionList title="Other actions" items={actions} onRoll={rollAction} combatReady={canRoll} />}
      <ActionList title="Bonus Actions" items={bonusActions} onRoll={rollAction} combatReady={canRoll} />
      <ActionList title="Reactions" items={reactions} onRoll={rollAction} combatReady={canRoll} />
      <ActionList title="Legendary Actions" items={legendaryActions} onRoll={rollAction} combatReady={canRoll} />
      {spells && (
        <section className="rqk-stat-block__section" aria-label="Spells">
          <h3 className="rqk-stat-block__section-title">Spells</h3>
          <div className="rqk-stat-block__metadata">
            <MetaRow title="Spell Save DC" value={spells.spell_save_dc} />
            <MetaRow title="Spell Attack" value={spells.spell_attack_bonus != null ? signed(spells.spell_attack_bonus) : null} />
            <MetaRow title="Cantrips" value={spells.cantrips} />
            <MetaRow title="Known Spells" value={spells.known_spells} />
            <MetaRow title="Spell Slots" value={spells.slot_count != null ? String(spells.slot_count) + (spells.slot_level != null ? ' at level ' + spells.slot_level : '') : null} />
          </div>
        </section>
      )}
      {!allActions && !spells && (!library || !missingCombat) && <p className="rqk-stat-block__empty">No combat actions recorded yet. Add verified abilities rather than guessing.</p>}
      {lastRoll && <output role="status" aria-live="polite" className="rqk-stat-block__roll-result" data-testid="stat-block-roll-result">{lastRoll}</output>}
      {lore.length > 0 && (
        <details className="rqk-stat-block__notes">
          <summary>GM notes & story details</summary>
          {lore.map(([title, value]) => (
            <div key={title}><h3 className="rqk-stat-block__note-label">{title}</h3><p className="rqk-stat-block__note-text">{String(value)}</p></div>
          ))}
        </details>
      )}
    </section>
  );
}
