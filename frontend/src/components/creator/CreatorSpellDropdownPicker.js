import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Search, Wand2 } from 'lucide-react';

import {
  addUniqueSpellName,
  findSpellByName,
  getCreatorAvailableSpellPools,
  getCreatorPreparedSpellTarget,
  getCreatorSpellListLabel,
  isCreatorPreparedCaster,
  prunePreparedToLearned,
  removeSpellName,
  togglePreparedSpellName,
} from '@/data/creatorSpellSelectionFlow';
import './CreatorSpellDropdownPicker.css';

function SpellDetail({ spell, actionLabel, onAction, disabled }) {
  if (!spell) {
    return (
      <div className="creator-spell-detail is-empty">
        <BookOpen size={18} />
        <strong>Pick a spell to see details</strong>
        <span>Choose a spell from the dropdown. Details appear here before you learn or prepare it.</span>
      </div>
    );
  }

  return (
    <div className="creator-spell-detail">
      <div>
        <span>{spell.level === 0 ? 'Cantrip' : `Level ${spell.level || 1}`}</span>
        <strong>{spell.name}</strong>
        <em>{spell.school || 'Spell'}</em>
      </div>
      {spell.description && <p>{spell.description}</p>}
      {(spell.damage || spell.healing || spell.damageType) && (
        <small>
          {[spell.damage ? `Damage ${spell.damage}` : '', spell.healing ? `Healing ${spell.healing}` : '', spell.damageType || ''].filter(Boolean).join(' • ')}
        </small>
      )}
      {onAction && (
        <button type="button" onClick={onAction} disabled={disabled}>{actionLabel}</button>
      )}
    </div>
  );
}

function SelectedSpellList({ title, empty, names, spellPool, onRemove, renderExtra }) {
  return (
    <section className="creator-selected-spell-list">
      <h4>{title}</h4>
      {names.length ? (
        <div>
          {names.map((name) => {
            const spell = findSpellByName(spellPool, name) || { name };
            return (
              <article key={name}>
                <div>
                  <strong>{spell.name}</strong>
                  <span>{spell.school || 'Spell'}</span>
                </div>
                {renderExtra?.(name, spell)}
                <button type="button" onClick={() => onRemove(name)}>Remove</button>
              </article>
            );
          })}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

export default function CreatorSpellDropdownPicker({
  characterClass,
  scores = {},
  level = 1,
  cantripLimit = 0,
  spellLimit = 0,
  selectedCantrips = [],
  learnedSpells = [],
  preparedSpells = [],
  onChange,
}) {
  const [search, setSearch] = useState('');
  const [selectedCantripName, setSelectedCantripName] = useState('');
  const [selectedSpellName, setSelectedSpellName] = useState('');
  const preparedCaster = isCreatorPreparedCaster(characterClass);
  const preparedLimit = preparedCaster ? getCreatorPreparedSpellTarget(characterClass, scores, level) : 0;
  const listLabel = getCreatorSpellListLabel(characterClass);
  const pools = useMemo(() => getCreatorAvailableSpellPools(characterClass, search), [characterClass, search]);
  const cantripDetail = findSpellByName(pools.cantrips, selectedCantripName);
  const spellDetail = findSpellByName(pools.levelOneSpells, selectedSpellName);
  const cleanPrepared = prunePreparedToLearned(learnedSpells, preparedSpells);

  const emit = (patch) => onChange?.({
    cantrips: selectedCantrips,
    spells: learnedSpells,
    preparedSpells: cleanPrepared,
    ...patch,
  });

  const learnCantrip = () => {
    if (!selectedCantripName) return;
    emit({ cantrips: addUniqueSpellName(selectedCantrips, selectedCantripName, cantripLimit) });
  };

  const learnSpell = () => {
    if (!selectedSpellName) return;
    emit({ spells: addUniqueSpellName(learnedSpells, selectedSpellName, spellLimit) });
  };

  const removeLearnedSpell = (name) => {
    const nextLearned = removeSpellName(learnedSpells, name);
    emit({ spells: nextLearned, preparedSpells: prunePreparedToLearned(nextLearned, cleanPrepared) });
  };

  const togglePrepared = (name) => {
    emit({ preparedSpells: togglePreparedSpellName({ learned: learnedSpells, prepared: cleanPrepared, name, limit: preparedLimit }) });
  };

  return (
    <div className="creator-spell-dropdown-picker">
      <header>
        <div>
          <p>Spell picker</p>
          <h3><Wand2 size={18} /> {characterClass} spells</h3>
          <span>Pick from the class dropdown, view details, learn spells, then prepare from your learned list if your class prepares spells.</span>
        </div>
      </header>

      <label className="creator-spell-dropdown-search">
        <Search size={15} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, school, damage, healing or description…" />
      </label>

      <section className="creator-spell-dropdown-grid">
        {cantripLimit > 0 && (
          <div className="creator-spell-dropdown-box">
            <h4>Cantrips {selectedCantrips.length}/{cantripLimit}</h4>
            <select value={selectedCantripName} onChange={(event) => setSelectedCantripName(event.target.value)}>
              <option value="">Choose a cantrip…</option>
              {pools.cantrips.map((spell) => <option key={spell.name} value={spell.name}>{spell.name} — {spell.school || 'Spell'}</option>)}
            </select>
            <SpellDetail
              spell={cantripDetail}
              actionLabel={selectedCantrips.includes(selectedCantripName) ? 'Already learned' : 'Learn Cantrip'}
              onAction={learnCantrip}
              disabled={!selectedCantripName || selectedCantrips.includes(selectedCantripName) || selectedCantrips.length >= cantripLimit}
            />
          </div>
        )}

        {spellLimit > 0 && (
          <div className="creator-spell-dropdown-box">
            <h4>{listLabel} Spells {learnedSpells.length}/{spellLimit}</h4>
            <select value={selectedSpellName} onChange={(event) => setSelectedSpellName(event.target.value)}>
              <option value="">Choose a level 1 spell…</option>
              {pools.levelOneSpells.map((spell) => <option key={spell.name} value={spell.name}>{spell.name} — {spell.school || 'Spell'}</option>)}
            </select>
            <SpellDetail
              spell={spellDetail}
              actionLabel={learnedSpells.includes(selectedSpellName) ? 'Already learned' : `Add to ${listLabel}`}
              onAction={learnSpell}
              disabled={!selectedSpellName || learnedSpells.includes(selectedSpellName) || learnedSpells.length >= spellLimit}
            />
          </div>
        )}
      </section>

      <section className="creator-spell-selected-grid">
        <SelectedSpellList
          title={`Selected Cantrips ${selectedCantrips.length}/${cantripLimit}`}
          empty="No cantrips selected yet."
          names={selectedCantrips}
          spellPool={pools.cantrips}
          onRemove={(name) => emit({ cantrips: removeSpellName(selectedCantrips, name) })}
        />
        <SelectedSpellList
          title={`${listLabel} ${learnedSpells.length}/${spellLimit}`}
          empty={`No ${listLabel.toLowerCase()} spells selected yet.`}
          names={learnedSpells}
          spellPool={pools.levelOneSpells}
          onRemove={removeLearnedSpell}
          renderExtra={preparedCaster ? (name) => (
            <button type="button" className={cleanPrepared.includes(name) ? 'is-prepared' : ''} onClick={() => togglePrepared(name)}>
              {cleanPrepared.includes(name) ? <><Check size={13} /> Prepared</> : 'Prepare'}
            </button>
          ) : null}
        />
      </section>

      {preparedCaster && (
        <section className="creator-spell-prepare-summary">
          <strong>Prepared {cleanPrepared.length}/{preparedLimit}</strong>
          <span>Prepared spells must come from the {listLabel.toLowerCase()} list above.</span>
        </section>
      )}
    </div>
  );
}
