import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Search, Wand2 } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import {
  SPELLCASTING_CLASSES,
  getMaxSpellLevel,
  getMulticlassSpellSlots,
  getSpellsForClass,
} from '@/data/spellDatabase';
import {
  buildPactMagicResource,
  getCastOptionsForSpell,
  getNormalSpellPool,
  getPactMagicPool,
  spendCastOption,
} from '@/data/spellcastingPools';
import './CleanSheetSpellsMobileOverrides.css';

const ABILITY_LABELS = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const formatBonus = (value) => Number(value) >= 0 ? `+${Number(value)}` : `${Number(value)}`;
const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const hasItems = (value = {}) => Object.keys(value || {}).length > 0;

function normaliseSpell(spell, fallbackLevel = null) {
  if (!spell) return { name: 'Unknown Spell', level: fallbackLevel, school: '', description: '' };
  if (typeof spell === 'string') return { name: spell, level: fallbackLevel, school: '', description: '' };
  return {
    ...spell,
    name: spell.name || spell.spell_name || spell.title || 'Unknown Spell',
    level: spell.level ?? spell.spell_level ?? fallbackLevel,
    school: spell.school || spell.type || '',
    description: spell.description || spell.desc || spell.summary || '',
  };
}

function uniqueSpells(spells = [], fallbackLevel = null) {
  const seen = new Set();
  return toArray(spells)
    .map((spell) => normaliseSpell(spell, fallbackLevel))
    .filter((spell) => {
      const key = normalizeName(spell.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getClassLevels(character = {}) {
  const fromMap = character?.multiclass_levels || character?.class_levels || {};
  const entries = Object.entries(fromMap).filter(([, level]) => Number(level) > 0);
  if (entries.length) {
    return Object.fromEntries(entries.map(([cls, level]) => [cls, Number(level) || 0]));
  }

  const fromArray = (character?.classes || [])
    .map((cls) => [
      cls?.name || cls?.class_name || cls?.character_class,
      Number(cls?.level) || 0,
    ])
    .filter(([cls, level]) => cls && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);

  return character?.character_class
    ? { [character.character_class]: Number(character?.level || 1) || 1 }
    : {};
}

function canonicalSpellClass(className = '') {
  return Object.keys(SPELLCASTING_CLASSES).find(
    (cls) => normalizeName(cls) === normalizeName(className),
  ) || className;
}

function subclassFor(character = {}, className = '') {
  const canonical = canonicalSpellClass(className);
  const matching = (character?.classes || []).find((cls) => (
    normalizeName(cls?.name || cls?.class_name || cls?.character_class) === normalizeName(canonical)
  ));
  if (matching?.subclass) return matching.subclass;

  const primary = canonicalSpellClass(character?.character_class || character?.class_name || '');
  return normalizeName(primary) === normalizeName(canonical) ? character?.subclass || '' : '';
}

function classHasSpellcasting(character = {}, className = '') {
  const canonical = canonicalSpellClass(className);
  const info = SPELLCASTING_CLASSES[canonical];
  if (!info) return false;
  const classLevels = getClassLevels(character);
  const level = Number(
    classLevels[className]
    ?? classLevels[canonical]
    ?? Object.entries(classLevels).find(([name]) => normalizeName(name) === normalizeName(canonical))?.[1]
    ?? 0,
  );
  if (level <= 0) return false;
  if (info.halfCaster && level < 2) return false;
  if (info.subclassOnly) {
    return level >= 3 && normalizeName(subclassFor(character, canonical)) === normalizeName(info.subclassOnly);
  }
  return true;
}

function spellLevelLabel(level) {
  if (Number(level) === 0) return 'Cantrip';
  if (!level && level !== 0) return 'Spell';
  return `Level ${level}`;
}

function groupByLevel(spells = []) {
  return spells.reduce((groups, spell) => {
    const key = String(Number(spell.level || 0));
    return { ...groups, [key]: [...(groups[key] || []), spell] };
  }, {});
}

function flattenClassSpellGroups(className, groups = {}, maxSpellLevel = 0) {
  const results = [];
  (groups.cantrips || []).forEach((spell) => {
    results.push({ ...normaliseSpell(spell, 0), level: 0, sourceClass: className });
  });

  for (let level = 1; level <= Math.min(9, Number(maxSpellLevel || 0)); level += 1) {
    (groups[level] || []).forEach((spell) => {
      results.push({ ...normaliseSpell(spell, level), level, sourceClass: className });
    });
  }
  return results;
}

function savedSpellNameSet(...groups) {
  return new Set(groups.flat().map((spell) => normalizeName(spell.name)).filter(Boolean));
}

function withoutSpell(spells = [], spellName = '') {
  const key = normalizeName(spellName);
  return toArray(spells).filter((spell) => normalizeName(normaliseSpell(spell).name) !== key);
}

function SpellSlots({ slots = {}, remaining = {}, onChangeSlots }) {
  const [savingLevel, setSavingLevel] = useState('');
  const keys = Array.from(new Set([...Object.keys(slots || {}), ...Object.keys(remaining || {})]))
    .filter((key) => Number(key) > 0)
    .sort((a, b) => Number(a) - Number(b));

  const updateLevel = async (level, delta) => {
    if (!onChangeSlots || savingLevel) return;
    const total = Number(slots[level] ?? 0);
    const current = Number(remaining[level] ?? total);
    const next = Math.max(0, Math.min(total, current + delta));
    if (next === current) return;
    setSavingLevel(level);
    try {
      const ok = await onChangeSlots({ ...(remaining || {}), [level]: next });
      if (ok !== false) {
        toast.success(delta < 0 ? `Level ${level} slot spent` : `Level ${level} slot restored`);
      }
    } finally {
      setSavingLevel('');
    }
  };

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
      <div className="clean-sheet-spell-section-heading">
        <h2>Spell Slots</h2>
        <span>{keys.length ? 'Normal spellcasting pool' : 'No ordinary slot pool'}</span>
      </div>
      {keys.length > 0 ? (
        <div className="clean-sheet-slot-grid">
          {keys.map((level) => {
            const total = Number(slots[level] ?? 0);
            const left = Number(remaining[level] ?? total);
            return (
              <div key={level} className="clean-sheet-slot-card">
                <span>Level {level}</span>
                <strong>{left}/{total}</strong>
                <div className="clean-sheet-slot-pips" aria-label={`Level ${level} slots`}>
                  {Array.from({ length: total }).map((_, index) => (
                    <i key={index} className={index < left ? 'filled' : ''} />
                  ))}
                </div>
                <div className="clean-sheet-slot-actions">
                  <button
                    type="button"
                    onClick={() => updateLevel(level, -1)}
                    disabled={savingLevel === level || left <= 0}
                  >
                    Spend
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLevel(level, 1)}
                    disabled={savingLevel === level || left >= total}
                  >
                    Restore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="clean-sheet-muted">
          This character has no ordinary spell slots. Pact Magic, if present, is tracked separately below.
        </p>
      )}
    </section>
  );
}

function PactMagicPool({ pool, onChange }) {
  const [saving, setSaving] = useState(false);
  if (!pool?.available) return null;

  const update = async (delta) => {
    if (saving || !onChange) return;
    const next = Math.max(0, Math.min(pool.total, pool.current + delta));
    if (next === pool.current) return;
    setSaving(true);
    try {
      const ok = await onChange(next);
      if (ok !== false) toast.success(delta < 0 ? 'Pact Magic slot spent' : 'Pact Magic slot restored');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
      <div className="clean-sheet-spell-section-heading">
        <h2>Pact Magic</h2>
        <span>Short-rest pool</span>
      </div>
      <div className="clean-sheet-pact-card">
        <div>
          <span>Available</span>
          <strong>{pool.current}/{pool.total}</strong>
        </div>
        <div>
          <span>Slot Level</span>
          <strong>{pool.level}</strong>
        </div>
        <div className="clean-sheet-slot-actions">
          <button type="button" onClick={() => update(-1)} disabled={saving || pool.current <= 0}>Spend</button>
          <button type="button" onClick={() => update(1)} disabled={saving || pool.current >= pool.total}>Restore</button>
        </div>
        <p>Pact Magic stays separate from ordinary multiclass spell slots and refreshes on a Short Rest.</p>
      </div>
    </section>
  );
}

function SpellCard({
  spell,
  prepared,
  cantrip,
  castable,
  canPrepare,
  canUnprepare,
  castOptions = [],
  castBlockedText,
  onCast,
  onConcentrate,
  onPrepare,
  onUnprepare,
}) {
  const [expanded, setExpanded] = useState(false);
  const [choosingSlot, setChoosingSlot] = useState(false);
  const hasDescription = Boolean(spell.description);
  const concentrationLikely = /concentration/i.test(spell.description || '');
  const levelled = Number(spell.level || 0) > 0;
  const hasAvailableSlot = !levelled || castOptions.length > 0;
  const canPressCast = castable && hasAvailableSlot;

  const handleCastClick = () => {
    if (!levelled) {
      onCast(spell, { source: 'cantrip', level: 0, label: 'Cantrip' });
      return;
    }
    if (castOptions.length === 1) {
      onCast(spell, castOptions[0]);
      return;
    }
    setChoosingSlot((prev) => !prev);
  };

  const castWith = (option) => {
    setChoosingSlot(false);
    onCast(spell, option);
  };

  return (
    <article className={`clean-sheet-spell-card ${prepared ? 'prepared' : ''} ${cantrip ? 'cantrip' : ''}`}>
      <div className="clean-sheet-spell-card-top">
        <span className="clean-sheet-spell-level">{spellLevelLabel(spell.level)}</span>
        {prepared && <span className="clean-sheet-spell-state">Prepared</span>}
        {!castable && !cantrip && <span className="clean-sheet-spell-state">Not prepared</span>}
      </div>
      <strong>{spell.name}</strong>
      {spell.school && <em>{spell.school}</em>}
      {hasDescription && (
        <p>
          {expanded
            ? spell.description
            : `${spell.description.slice(0, 130)}${spell.description.length > 130 ? '…' : ''}`}
        </p>
      )}
      {!castable && castBlockedText && <p className="clean-sheet-muted">{castBlockedText}</p>}
      {castable && levelled && !hasAvailableSlot && (
        <p className="clean-sheet-muted">No valid ordinary or Pact Magic slots are available for this spell.</p>
      )}
      <div className="clean-sheet-spell-actions">
        <button type="button" onClick={handleCastClick} disabled={!canPressCast}>
          {cantrip ? 'Use Cantrip' : castOptions.length > 1 && choosingSlot ? 'Choose Pool' : 'Cast'}
        </button>
        {canPrepare && <button type="button" onClick={() => onPrepare(spell)}>Prepare</button>}
        {canUnprepare && <button type="button" onClick={() => onUnprepare(spell)}>Unprepare</button>}
        {concentrationLikely && castable && (
          <button type="button" onClick={() => onConcentrate(spell)}>Concentrate</button>
        )}
        {hasDescription && (
          <button type="button" onClick={() => setExpanded((prev) => !prev)}>{expanded ? 'Less' : 'More'}</button>
        )}
      </div>
      {choosingSlot && castable && levelled && (
        <div className="clean-sheet-spell-actions" aria-label={`Choose slot pool for ${spell.name}`}>
          {castOptions.map((option) => (
            <button
              key={`${spell.name}-${option.source}-${option.level}`}
              type="button"
              onClick={() => castWith(option)}
            >
              {option.label} ({option.remaining}/{option.total})
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function SpellLibraryCard({ spell, saved, onAdd }) {
  return (
    <article className={`clean-sheet-spell-library-card ${saved ? 'is-saved' : ''}`}>
      <div className="clean-sheet-spell-library-meta">
        <span className="clean-sheet-spell-level">{spellLevelLabel(spell.level)}</span>
        <span className="clean-sheet-spell-library-class">{spell.sourceClass}</span>
        {saved && <span className="clean-sheet-spell-state">Saved</span>}
      </div>
      <strong>{spell.name}</strong>
      {spell.school && <em>{spell.school}</em>}
      {spell.description && <p>{spell.description}</p>}
      <div className="clean-sheet-spell-library-actions">
        <button type="button" onClick={() => onAdd(spell)} disabled={saved}>
          {saved ? 'Added' : Number(spell.level || 0) === 0 ? 'Add Cantrip' : 'Add Spell'}
        </button>
      </div>
    </article>
  );
}

function SpellLibrary({ spells, savedNames, onAdd }) {
  const grouped = groupByLevel(spells);
  const levels = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-library-board">
      <div className="clean-sheet-spell-section-heading">
        <h2>Class Spell Library</h2>
        <span>{spells.length} available</span>
      </div>
      {spells.length ? levels.map((level) => (
        <div key={`library-${level}`} className="clean-sheet-spell-level-group">
          <h3>{spellLevelLabel(level)}</h3>
          <div className="clean-sheet-spell-library-grid">
            {grouped[level].map((spell) => (
              <SpellLibraryCard
                key={`${spell.sourceClass}-${spell.level}-${spell.name}`}
                spell={spell}
                saved={savedNames.has(normalizeName(spell.name))}
                onAdd={onAdd}
              />
            ))}
          </div>
        </div>
      )) : <p className="clean-sheet-muted">No class spells match this search yet.</p>}
    </section>
  );
}

function SpellGroup({
  title,
  spells,
  preparedNames,
  emptyText,
  groupMode,
  getCastOptions,
  onCast,
  onConcentrate,
  onPrepare,
  onUnprepare,
}) {
  const grouped = groupByLevel(spells);
  const levels = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  const getCardRules = (spell) => {
    const cantrip = Number(spell.level || 0) === 0;
    const prepared = preparedNames.has(normalizeName(spell.name));
    const spellbookOnly = groupMode === 'spellbook' && !prepared;
    const castable = cantrip || groupMode === 'known' || groupMode === 'prepared' || !spellbookOnly;
    return {
      cantrip,
      prepared,
      castable,
      canPrepare: spellbookOnly,
      canUnprepare: groupMode === 'prepared' && !cantrip,
      castBlockedText: spellbookOnly ? 'This spell is in your spellbook, but it must be prepared before you can cast it.' : '',
      castOptions: getCastOptions ? getCastOptions(spell) : [],
    };
  };

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
      <div className="clean-sheet-spell-section-heading">
        <h2>{title}</h2>
        <span>{spells.length} spell{spells.length === 1 ? '' : 's'}</span>
      </div>
      {spells.length ? levels.map((level) => (
        <div key={`${title}-${level}`} className="clean-sheet-spell-level-group">
          <h3>{spellLevelLabel(level)}</h3>
          <div className="clean-sheet-spell-grid">
            {grouped[level].map((spell) => {
              const rules = getCardRules(spell);
              return (
                <SpellCard
                  key={`${title}-${spell.name}`}
                  spell={spell}
                  cantrip={rules.cantrip}
                  prepared={rules.prepared}
                  castable={rules.castable}
                  canPrepare={rules.canPrepare}
                  canUnprepare={rules.canUnprepare}
                  castOptions={rules.castOptions}
                  castBlockedText={rules.castBlockedText}
                  onCast={onCast}
                  onConcentrate={onConcentrate}
                  onPrepare={onPrepare}
                  onUnprepare={onUnprepare}
                />
              );
            })}
          </div>
        </div>
      )) : <p className="clean-sheet-muted">{emptyText}</p>}
    </section>
  );
}

export default function CleanSpellsTab({ character, onCharacterUpdate }) {
  const [spellSearch, setSpellSearch] = useState('');
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const classLevels = useMemo(() => {
    const snapshotLevels = snapshot.identity?.classLevels || {};
    return hasItems(snapshotLevels) ? snapshotLevels : getClassLevels(character);
  }, [character, snapshot.identity?.classLevels]);
  const slotMath = useMemo(
    () => snapshot.spellcasting?.multiclass || getMulticlassSpellSlots(classLevels, character),
    [classLevels, character, snapshot.spellcasting?.multiclass],
  );
  const normalPool = useMemo(() => getNormalSpellPool(character, slotMath), [character, slotMath]);
  const pactPool = useMemo(() => getPactMagicPool(character, slotMath), [character, slotMath]);

  const proficiencyBonus = snapshot.proficiencyBonus
    || Number(character?.proficiency_bonus)
    || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);

  const spellcastingRows = useMemo(() => Object.entries(classLevels)
    .map(([className, level]) => {
      const canonical = canonicalSpellClass(className);
      const info = SPELLCASTING_CLASSES[canonical];
      if (!info || !classHasSpellcasting(character, className)) return null;
      const modifier = abilityMod(character?.[info.ability]);
      return {
        className: canonical,
        level,
        ability: info.ability,
        abilityLabel: ABILITY_LABELS[info.ability] || info.ability,
        saveDc: 8 + proficiencyBonus + modifier,
        attackBonus: proficiencyBonus + modifier,
        castingType: info.pactMagic ? 'Pact Magic' : info.type === 'prepared' ? 'Prepared' : 'Known',
      };
    })
    .filter(Boolean), [character, classLevels, proficiencyBonus]);

  const primaryCaster = spellcastingRows[0];
  const effectiveSlots = normalPool.totals;
  const effectiveRemaining = normalPool.remaining;
  const hasPactMagic = pactPool.available;
  const spellWarnings = useMemo(() => {
    const warnings = [...(snapshot.warnings || [])];
    if (spellcastingRows.length && !hasItems(effectiveSlots) && !hasPactMagic) {
      warnings.push('Spellcaster has no derived or saved spell-slot data.');
    }
    if (normalPool.legacyPactExcluded) {
      warnings.push('Legacy Warlock slots were separated into the Pact Magic pool so they no longer collide with ordinary slots.');
    }
    if (spellcastingRows.length
      && !character?.cantrips_known?.length
      && !character?.cantrips?.length
      && !character?.spells_known?.length
      && !character?.known_spells?.length
      && !character?.spellbook?.length
      && !character?.spells_prepared?.length
      && !character?.prepared_spells?.length) {
      warnings.push('Caster has spellcasting math but no saved spell list yet.');
    }
    return warnings;
  }, [snapshot.warnings, spellcastingRows.length, effectiveSlots, hasPactMagic, normalPool.legacyPactExcluded, character]);

  const primaryClass = canonicalSpellClass(character?.character_class || character?.class_name || '');
  const isWizard = primaryClass === 'Wizard';
  const isPreparedCaster = primaryCaster?.castingType === 'Prepared' || isWizard;

  const cantrips = uniqueSpells(character?.cantrips_known || character?.cantrips, 0);
  const known = uniqueSpells(
    isWizard
      ? character?.spellbook
      : character?.spells_known || character?.known_spells || character?.spellbook,
    null,
  );
  const prepared = uniqueSpells(character?.spells_prepared || character?.prepared_spells, null);
  const preparedNames = new Set(prepared.map((spell) => normalizeName(spell.name)));
  const savedNames = savedSpellNameSet(cantrips, known, prepared);
  const knownWithoutPrepared = known.filter((spell) => !preparedNames.has(normalizeName(spell.name)));
  const secondaryLeveled = isPreparedCaster ? knownWithoutPrepared : known;
  const secondaryTitle = isWizard ? 'Spellbook' : 'Known Spells';
  const secondaryEmpty = isWizard ? 'No spellbook entries found.' : 'No known spells found.';
  const secondaryMode = isPreparedCaster ? 'spellbook' : 'known';
  const lowerSearch = spellSearch.trim().toLowerCase();
  const filterSpells = (spells) => !lowerSearch
    ? spells
    : spells.filter((spell) => `${spell.name} ${spell.school} ${spell.description} ${spell.sourceClass || ''}`
      .toLowerCase()
      .includes(lowerSearch));

  const availableClassSpells = useMemo(() => {
    const seen = new Set();
    return Object.entries(classLevels)
      .flatMap(([className, level]) => {
        const canonical = canonicalSpellClass(className);
        if (!classHasSpellcasting(character, canonical)) return [];
        const maxSpellLevel = getMaxSpellLevel(canonical, Number(level) || 0);
        return flattenClassSpellGroups(canonical, getSpellsForClass(canonical), maxSpellLevel);
      })
      .filter((spell) => {
        const key = `${normalizeName(spell.name)}-${spell.level}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || a.name.localeCompare(b.name));
  }, [character, classLevels]);

  const castOptionsForSpell = (spell) => getCastOptionsForSpell({
    spell,
    normalSlots: effectiveSlots,
    normalRemaining: effectiveRemaining,
    pactPool,
  });

  const handleSlotChange = async (nextRemaining) => {
    if (!onCharacterUpdate) return false;
    const normalisedRemaining = Object.fromEntries(
      Object.entries(nextRemaining || {}).map(([level, count]) => [String(level), Math.max(0, Number(count) || 0)]),
    );
    return onCharacterUpdate(
      { spell_slots_remaining: normalisedRemaining },
      { error: 'Could not update spell slots' },
    );
  };

  const handlePactChange = async (nextCurrent) => {
    if (!onCharacterUpdate || !pactPool.available) return false;
    const resources = buildPactMagicResource(character?.resources || {}, pactPool, nextCurrent);
    const updates = { resources };
    if (normalPool.legacyPactExcluded) {
      updates.spell_slots_remaining = { [String(pactPool.level)]: nextCurrent };
    }
    return onCharacterUpdate(updates, { error: 'Could not update Pact Magic' });
  };

  const addSpellFromLibrary = async (spell) => {
    if (!onCharacterUpdate) return false;
    const normalised = normaliseSpell(spell, spell.level);
    const level = Number(normalised.level || 0);
    let field = 'spells_known';
    let existing = known;

    if (level === 0) {
      field = 'cantrips_known';
      existing = cantrips;
    } else if (isWizard) {
      field = 'spellbook';
      existing = known;
    } else if (isPreparedCaster) {
      field = 'spells_prepared';
      existing = prepared;
    }

    if (existing.some((entry) => normalizeName(entry.name) === normalizeName(normalised.name))) {
      toast.info(`${normalised.name} is already on this sheet.`);
      return false;
    }

    const ok = await onCharacterUpdate(
      { [field]: [...existing, normalised] },
      { error: `Could not add ${normalised.name}` },
    );
    if (ok !== false) toast.success(`${normalised.name} added`);
    return ok;
  };

  const prepareSpell = async (spell) => {
    if (!onCharacterUpdate) return false;
    const normalised = normaliseSpell(spell, spell.level);
    if (Number(normalised.level || 0) <= 0) return false;
    if (preparedNames.has(normalizeName(normalised.name))) {
      toast.info(`${normalised.name} is already prepared.`);
      return false;
    }

    const ok = await onCharacterUpdate(
      { spells_prepared: [...prepared, normalised] },
      { error: `Could not prepare ${normalised.name}` },
    );
    if (ok !== false) toast.success(`${normalised.name} prepared`);
    return ok;
  };

  const unprepareSpell = async (spell) => {
    if (!onCharacterUpdate) return false;
    const normalised = normaliseSpell(spell, spell.level);
    const nextPrepared = withoutSpell(prepared, normalised.name);
    if (nextPrepared.length === prepared.length) return false;

    const ok = await onCharacterUpdate(
      { spells_prepared: nextPrepared },
      { error: `Could not unprepare ${normalised.name}` },
    );
    if (ok !== false) toast.success(`${normalised.name} unprepared`);
    return ok;
  };

  const castSpell = async (spell, option) => {
    const level = Number(spell.level || 0);
    if (level <= 0 || option?.source === 'cantrip') {
      toast.success(`${spell.name} used`, { description: 'Cantrips do not spend spell slots.' });
      return;
    }

    const availableOptions = castOptionsForSpell(spell);
    const chosen = availableOptions.find((candidate) => (
      candidate.source === option?.source && Number(candidate.level) === Number(option?.level)
    ));
    if (!chosen) {
      toast.error('That spell-slot option is no longer available.');
      return;
    }

    const spent = spendCastOption({
      option: chosen,
      normalRemaining: effectiveRemaining,
      pactPool,
    });

    let ok = false;
    if (chosen.source === 'pact') {
      ok = await handlePactChange(spent.pactRemaining);
    } else {
      ok = await handleSlotChange(spent.normalRemaining);
    }

    if (ok !== false) {
      toast.success(`${spell.name} cast`, {
        description: chosen.source === 'pact'
          ? `Spent one Pact Magic level ${chosen.level} slot.`
          : `Spent a level ${chosen.level} spell slot.`,
      });
    }
  };

  const concentrateOn = async (spell) => {
    if (!onCharacterUpdate) return;
    const ok = await onCharacterUpdate(
      { concentrating_on: spell.name, concentration: spell.name },
      { error: 'Could not set concentration' },
    );
    if (ok !== false) toast.success(`Concentrating on ${spell.name}`);
  };

  const slotSourceLabel = [
    normalPool.source === 'saved' ? 'Saved slots' : normalPool.source === 'derived' ? 'Derived slots' : '',
    hasPactMagic ? 'Pact Magic' : '',
  ].filter(Boolean).join(' + ') || 'None';

  return (
    <div className="clean-sheet-grid clean-sheet-spells-tab">
      <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-summary-board">
        <div className="clean-sheet-spellcasting-heading">
          <div>
            <h2>Spellcasting</h2>
            <p>
              Cast prepared or known spells, choose the exact slot pool, manage spellbook preparation, and add spells from your class list.
            </p>
          </div>
          <span>{spellcastingRows.length ? 'Caster' : 'No caster data'}</span>
        </div>
        <div className="clean-sheet-spell-summary">
          <div>
            <span>Ability</span>
            <strong>
              {character?.spellcasting_ability
                ? ABILITY_LABELS[character.spellcasting_ability] || character.spellcasting_ability
                : primaryCaster?.abilityLabel || '—'}
            </strong>
          </div>
          <div><span>Save DC</span><strong>{character?.spell_save_dc || primaryCaster?.saveDc || '—'}</strong></div>
          <div>
            <span>Attack</span>
            <strong>
              {character?.spell_attack_bonus !== undefined
                ? formatBonus(character.spell_attack_bonus)
                : primaryCaster ? formatBonus(primaryCaster.attackBonus) : '—'}
            </strong>
          </div>
          <div>
            <span>{isWizard ? 'Book/Prepared' : 'Known/Prepared'}</span>
            <strong>{known.length}/{prepared.length}</strong>
          </div>
        </div>
        <label className="clean-sheet-spell-search">
          <Search size={16} />
          <input
            value={spellSearch}
            onChange={(event) => setSpellSearch(event.target.value)}
            placeholder="Search spells or class library…"
          />
        </label>
      </section>

      <SpellLibrary
        spells={filterSpells(availableClassSpells)}
        savedNames={savedNames}
        onAdd={addSpellFromLibrary}
      />

      <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-snapshot-board">
        <div className="clean-sheet-spell-section-heading">
          <h2>Spell Readiness</h2>
          <span>{snapshot.identity.edition} rules</span>
        </div>
        <div className="clean-sheet-spell-summary clean-sheet-spell-readiness-grid">
          <div><span>Primary</span><strong>{snapshot.spellcasting?.primary || primaryClass || '—'}</strong></div>
          <div><span>Caster Blocks</span><strong>{snapshot.spellcasting?.blocks?.length || spellcastingRows.length}</strong></div>
          <div><span>Slot Source</span><strong>{slotSourceLabel}</strong></div>
          <div><span>Pact Magic</span><strong>{hasPactMagic ? `L${pactPool.level} • ${pactPool.current}/${pactPool.total}` : '—'}</strong></div>
        </div>
        {!!spellWarnings.length && (
          <div className="clean-sheet-spell-warning">
            <AlertTriangle size={15} />
            <span>{spellWarnings[0]}</span>
          </div>
        )}
      </section>

      {spellcastingRows.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
          <div className="clean-sheet-spell-section-heading">
            <h2>Caster Details</h2>
            <span>{Object.keys(classLevels).length > 1 ? 'Multiclass' : 'Single class'}</span>
          </div>
          <div className="clean-sheet-caster-grid">
            {spellcastingRows.map((row) => (
              <article key={row.className} className="clean-sheet-caster-card">
                <div className="clean-sheet-caster-card-title">
                  <strong>{row.className}</strong>
                  <span>Level {row.level}</span>
                </div>
                <div className="clean-sheet-caster-stats">
                  <div><span>Ability</span><strong>{row.abilityLabel}</strong></div>
                  <div><span>Save DC</span><strong>{row.saveDc}</strong></div>
                  <div><span>Attack</span><strong>{formatBonus(row.attackBonus)}</strong></div>
                  <div><span>Style</span><strong>{row.castingType}</strong></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <SpellSlots
        slots={effectiveSlots}
        remaining={effectiveRemaining}
        onChangeSlots={handleSlotChange}
      />

      <PactMagicPool pool={pactPool} onChange={handlePactChange} />

      <SpellGroup
        title="Cantrips"
        spells={filterSpells(cantrips)}
        preparedNames={preparedNames}
        groupMode="known"
        getCastOptions={castOptionsForSpell}
        emptyText="No cantrips found on this character. Add one from the class spell library above."
        onCast={castSpell}
        onConcentrate={concentrateOn}
        onPrepare={prepareSpell}
        onUnprepare={unprepareSpell}
      />
      {isPreparedCaster && (
        <SpellGroup
          title="Prepared Spells"
          spells={filterSpells(prepared)}
          preparedNames={preparedNames}
          groupMode="prepared"
          getCastOptions={castOptionsForSpell}
          emptyText="No prepared spells found. Prepare one from your spellbook or add one from the class spell library above."
          onCast={castSpell}
          onConcentrate={concentrateOn}
          onPrepare={prepareSpell}
          onUnprepare={unprepareSpell}
        />
      )}
      <SpellGroup
        title={secondaryTitle}
        spells={filterSpells(secondaryLeveled)}
        preparedNames={preparedNames}
        groupMode={secondaryMode}
        getCastOptions={castOptionsForSpell}
        emptyText={`${secondaryEmpty} Add one from the class spell library above.`}
        onCast={castSpell}
        onConcentrate={concentrateOn}
        onPrepare={prepareSpell}
        onUnprepare={unprepareSpell}
      />

      {!cantrips.length && !known.length && !prepared.length && (
        <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-empty">
          <Wand2 size={22} />
          <h2>No spells saved yet</h2>
          <p>Use the class spell library above to add cantrips and levelled spells to this sheet.</p>
        </section>
      )}
    </div>
  );
}
