import React from 'react';

function normaliseSpell(spell) {
  if (!spell) return { name: 'Unknown Spell', level: null, school: '' };
  if (typeof spell === 'string') return { name: spell, level: null, school: '' };
  return {
    name: spell.name || spell.spell_name || spell.title || 'Unknown Spell',
    level: spell.level ?? spell.spell_level ?? null,
    school: spell.school || spell.type || '',
    prepared: spell.prepared,
    description: spell.description || spell.desc || ''
  };
}

function spellLevelLabel(level) {
  if (level === 0 || level === '0') return 'Cantrip';
  if (!level && level !== 0) return 'Spell';
  return `Level ${level}`;
}

function SpellCard({ spell, tag }) {
  const normalised = normaliseSpell(spell);
  return (
    <div className="clean-sheet-spell-card">
      <span className="clean-sheet-spell-level">{tag || spellLevelLabel(normalised.level)}</span>
      <strong>{normalised.name}</strong>
      {normalised.school && <em>{normalised.school}</em>}
      {normalised.description && <p>{normalised.description}</p>}
    </div>
  );
}

function SpellList({ title, spells, emptyText, tag }) {
  return (
    <section className="clean-sheet-panel">
      <h2>{title}</h2>
      {spells.length > 0 ? (
        <div className="clean-sheet-spell-grid">
          {spells.map((spell, index) => <SpellCard key={`${normaliseSpell(spell).name}-${index}`} spell={spell} tag={tag} />)}
        </div>
      ) : (
        <p className="clean-sheet-muted">{emptyText}</p>
      )}
    </section>
  );
}

function SpellSlots({ slots = {}, remaining = {} }) {
  const keys = Array.from(new Set([...Object.keys(slots || {}), ...Object.keys(remaining || {})]))
    .filter(key => Number(key) > 0)
    .sort((a, b) => Number(a) - Number(b));

  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>Spell Slots</h2>
      {keys.length > 0 ? (
        <div className="clean-sheet-slot-grid">
          {keys.map(level => {
            const total = Number(slots[level] ?? 0);
            const left = Number(remaining[level] ?? total);
            return (
              <div key={level} className="clean-sheet-slot-card">
                <span>Level {level}</span>
                <strong>{left}/{total}</strong>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="clean-sheet-muted">No spell slot data found.</p>
      )}
    </section>
  );
}

export default function CleanSpellsTab({ character }) {
  const cantrips = character?.cantrips_known || [];
  const known = character?.spells_known || [];
  const prepared = character?.spells_prepared || [];
  const slots = character?.spell_slots || {};
  const remaining = character?.spell_slots_remaining || {};
  const spellAbility = character?.spellcasting_ability || '';
  const spellDc = character?.spell_save_dc || '';
  const spellAttack = character?.spell_attack_bonus || '';

  return (
    <div className="clean-sheet-grid">
      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Spellcasting</h2>
        <div className="clean-sheet-spell-summary">
          <div><span>Ability</span><strong>{spellAbility || '—'}</strong></div>
          <div><span>Save DC</span><strong>{spellDc || '—'}</strong></div>
          <div><span>Attack</span><strong>{spellAttack ? `+${spellAttack}` : '—'}</strong></div>
        </div>
      </section>

      <SpellSlots slots={slots} remaining={remaining} />
      <SpellList title="Cantrips" spells={cantrips} emptyText="No cantrips found." tag="Cantrip" />
      <SpellList title="Known Spells" spells={known} emptyText="No known spells found." />
      <SpellList title="Prepared Spells" spells={prepared} emptyText="No prepared spells found." />
    </div>
  );
}
