import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SPELLCASTING_CLASSES, getMulticlassSpellSlots } from '@/data/spellDatabase';


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
const formatBonus = (value) => (Number(value) >= 0 ? `+${Number(value)}` : `${Number(value)}`);

function getClassLevels(character = {}) {
  const fromMap = character?.multiclass_levels || character?.class_levels || {};
  const entries = Object.entries(fromMap).filter(([, level]) => Number(level) > 0);
  if (entries.length) return Object.fromEntries(entries.map(([cls, level]) => [cls, Number(level) || 0]));

  const fromArray = (character?.classes || [])
    .map(cls => [cls?.name || cls?.class_name || cls?.character_class, Number(cls?.level) || 0])
    .filter(([cls, level]) => cls && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);

  return character?.character_class ? { [character.character_class]: Number(character?.level || 1) || 1 } : {};
}

function canonicalSpellClass(className = '') {
  return Object.keys(SPELLCASTING_CLASSES).find(cls => normalizeName(cls) === normalizeName(className)) || className;
}

function classHasSpellcasting(character = {}, className = '') {
  const canonical = canonicalSpellClass(className);
  const info = SPELLCASTING_CLASSES[canonical];
  if (!info) return false;
  const classLevels = getClassLevels(character);
  const level = Number(classLevels[className] ?? classLevels[canonical] ?? 0);
  if (level <= 0) return false;
  if (info.halfCaster && level < 2) return false;
  if (info.subclassOnly) {
    const subclass = character?.subclass || (character?.classes || []).find(cls => normalizeName(cls?.name || cls?.class_name || cls?.character_class) === normalizeName(canonical))?.subclass || '';
    return level >= 3 && normalizeName(subclass) === normalizeName(info.subclassOnly);
  }
  return true;
}

function normaliseSpell(spell) {
  if (!spell) return { name: 'Unknown Spell', level: null, school: '' };
  if (typeof spell === 'string') return { name: spell, level: null, school: '' };
  return {
    name: spell.name || spell.spell_name || spell.title || 'Unknown Spell',
    level: spell.level ?? spell.spell_level ?? null,
    school: spell.school || spell.type || '',
    prepared: spell.prepared,
    description: spell.description || spell.desc || spell.summary || ''
  };
}



function classifySpellRole(spell) {
  const text = `${spell.name || ''} ${spell.description || ''}`.toLowerCase();
  if (/heal|cure|restoration|shield|ward|protection|resist/.test(text)) return 'defense';
  if (/bolt|blast|fire|lightning|thunder|ray|smite|damage/.test(text)) return 'offense';
  return 'utility';
}

function getRookSuggestedLoadouts(spells = [], preparedCount = 0) {
  const normalized = spells.map(normaliseSpell);
  const nonCantrips = normalized.filter(s => Number(s.level || 0) > 0);
  const target = Math.max(1, preparedCount || Math.min(6, nonCantrips.length));
  const byRole = {
    offense: nonCantrips.filter(s => classifySpellRole(s) === 'offense'),
    defense: nonCantrips.filter(s => classifySpellRole(s) === 'defense'),
    utility: nonCantrips.filter(s => classifySpellRole(s) === 'utility'),
  };

  const balanced = [];
  const queues = [byRole.offense, byRole.defense, byRole.utility];
  let idx = 0;
  while (balanced.length < target && queues.some(q => q.length)) {
    const q = queues[idx % queues.length];
    if (q.length) balanced.push(q.shift());
    idx += 1;
  }

  const glassCannon = [...(byRole.offense || []), ...(byRole.utility || []), ...(byRole.defense || [])].slice(0, target);
  const survivor = [...(byRole.defense || []), ...(byRole.utility || []), ...(byRole.offense || [])].slice(0, target);

  return [
    { id: 'rook-balanced', label: 'Rook Balanced', spells: balanced },
    { id: 'rook-glass', label: 'Rook Blaster', spells: glassCannon },
    { id: 'rook-survivor', label: 'Rook Survivor', spells: survivor },
  ].filter(pack => pack.spells.length > 0);
}

function spellLevelLabel(level) {
  if (level === 0 || level === '0') return 'Cantrip';
  if (!level && level !== 0) return 'Spell';
  return `Level ${level}`;
}

function SpellCard({ spell, tag }) {
  const [expanded, setExpanded] = useState(false);
  const normalised = normaliseSpell(spell);
  const hasDescription = Boolean(normalised.description);

  return (
    <button type="button" className={`clean-sheet-spell-card ${expanded ? 'expanded' : ''}`} onClick={() => hasDescription && setExpanded(prev => !prev)}>
      <span className="clean-sheet-spell-level">{tag || spellLevelLabel(normalised.level)}</span>
      <strong>{normalised.name}</strong>
      {normalised.school && <em>{normalised.school}</em>}
      {hasDescription && (
        <p>{expanded ? normalised.description : `${normalised.description.slice(0, 120)}${normalised.description.length > 120 ? '…' : ''}`}</p>
      )}
      {hasDescription && <small>{expanded ? 'Tap to collapse' : 'Tap to expand'}</small>}
    </button>
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

function SpellSlots({ slots = {}, remaining = {}, onChangeSlots }) {
  const [savingLevel, setSavingLevel] = useState('');
  const keys = Array.from(new Set([...Object.keys(slots || {}), ...Object.keys(remaining || {})]))
    .filter(key => Number(key) > 0)
    .sort((a, b) => Number(a) - Number(b));

  const updateLevel = async (level, delta) => {
    if (!onChangeSlots || savingLevel) return;
    const total = Number(slots[level] ?? 0);
    const current = Number(remaining[level] ?? total);
    const next = Math.max(0, Math.min(total, current + delta));
    if (next === current) return;
    setSavingLevel(level);
    const ok = await onChangeSlots({ ...(remaining || {}), [level]: next });
    if (ok !== false) {
      toast.success(delta < 0 ? `Level ${level} slot spent` : `Level ${level} slot restored`);
    }
    setSavingLevel('');
  };

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
                <div className="clean-sheet-slot-pips" aria-label={`Level ${level} slots`}>
                  {Array.from({ length: total }).map((_, index) => (
                    <i key={index} className={index < left ? 'filled' : ''} />
                  ))}
                </div>
                <div className="clean-sheet-slot-actions">
                  <button type="button" onClick={() => updateLevel(level, -1)} disabled={savingLevel === level || left <= 0}>Spend</button>
                  <button type="button" onClick={() => updateLevel(level, 1)} disabled={savingLevel === level || left >= total}>Restore</button>
                </div>
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


function SpellcastingMathPanel({ character, classLevels, spellcastingRows, slotMath }) {
  const pact = slotMath?.pactMagic;
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <div className="clean-sheet-spellcasting-heading">
        <div>
          <h2>Spellcasting Math</h2>
          <p>Shows the class, spellcasting ability, save DC, spell attack, preparation style, and multiclass slot math used by this sheet.</p>
        </div>
        <span>{Object.keys(classLevels).length > 1 ? 'Multiclass' : 'Single class'}</span>
      </div>

      {spellcastingRows.length > 0 ? (
        <div className="clean-sheet-caster-grid">
          {spellcastingRows.map((row) => (
            <article key={row.className} className="clean-sheet-caster-card">
              <div className="clean-sheet-caster-card-title">
                <strong>{row.className}</strong>
                <span>Level {row.level}</span>
              </div>
              <div className="clean-sheet-caster-stats">
                <div><span>Ability</span><strong>{row.abilityLabel}</strong><em>{formatBonus(row.modifier)}</em></div>
                <div><span>Save DC</span><strong>{row.saveDc}</strong><em>8 + prof + mod</em></div>
                <div><span>Attack</span><strong>{formatBonus(row.attackBonus)}</strong><em>prof + mod</em></div>
                <div><span>Prep/Known</span><strong>{row.prepLabel}</strong><em>{row.castingType}</em></div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="clean-sheet-muted">This character does not currently have a spellcasting class, subclass, or recorded spellcasting data.</p>
      )}

      <div className="clean-sheet-slot-math-grid">
        <div><span>Combined caster level</span><strong>{slotMath?.multiclassLevel || 0}</strong><em>Used for shared non-warlock spell slots.</em></div>
        <div><span>Capped slot level</span><strong>{slotMath?.cappedMulticlassLevel || 0}</strong><em>Epic characters keep slots capped at table level 20.</em></div>
        <div><span>Pact magic</span><strong>{pact ? `${pact.slots}×L${pact.level}` : 'None'}</strong><em>Warlock slots stay separate.</em></div>
      </div>
    </section>
  );
}

function PactMagicSlots({ pactMagic }) {
  if (!pactMagic) return null;
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>Pact Magic</h2>
      <div className="clean-sheet-pact-card">
        <div><span>Slots</span><strong>{pactMagic.slots}</strong></div>
        <div><span>Slot level</span><strong>{pactMagic.level}</strong></div>
        <p>Track these separately from normal spell slots. They usually refresh on a short rest.</p>
      </div>
    </section>
  );
}

export default function CleanSpellsTab({ character, onCharacterUpdate }) {
  const cantrips = character?.cantrips_known || [];
  const known = character?.spells_known || [];
  const prepared = character?.spells_prepared || [];
  const slots = character?.spell_slots || {};
  const remaining = character?.spell_slots_remaining || {};
  const spellAbility = character?.spellcasting_ability || '';
  const spellDc = character?.spell_save_dc || '';
  const spellAttack = character?.spell_attack_bonus || '';
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
  const classLevels = useMemo(() => getClassLevels(character), [character]);
  const slotMath = useMemo(() => getMulticlassSpellSlots(classLevels, character), [classLevels, character]);
  const effectiveSlots = Object.keys(slots || {}).length ? slots : (slotMath?.slots || {});
  const effectiveRemaining = Object.keys(remaining || {}).length ? remaining : effectiveSlots;
  const spellcastingRows = useMemo(() => Object.entries(classLevels)
    .map(([className, level]) => {
      const canonical = canonicalSpellClass(className);
      const info = SPELLCASTING_CLASSES[canonical];
      if (!info || !classHasSpellcasting(character, className)) return null;
      const ability = info.ability;
      const modifier = abilityMod(character?.[ability]);
      const saveDc = 8 + proficiencyBonus + modifier;
      const attackBonus = proficiencyBonus + modifier;
      const preparedLimit = info.type === 'prepared' ? Math.max(1, level + modifier) : null;
      return {
        className: canonical,
        level,
        ability,
        abilityLabel: ABILITY_LABELS[ability] || ability,
        modifier,
        saveDc,
        attackBonus,
        castingType: info.pactMagic ? 'Pact magic' : info.type === 'prepared' ? 'Prepared caster' : 'Known caster',
        prepLabel: preparedLimit ? `${prepared.length}/${preparedLimit}` : `${known.length} known`,
      };
    })
    .filter(Boolean), [character, classLevels, known.length, prepared.length, proficiencyBonus]);
  const primaryCaster = spellcastingRows[0];
  const displayedSpellAbility = spellAbility || primaryCaster?.abilityLabel || '';
  const displayedSpellDc = spellDc || primaryCaster?.saveDc || '';
  const displayedSpellAttack = spellAttack || (primaryCaster ? primaryCaster.attackBonus : '');
  const [loadoutName, setLoadoutName] = useState('');

  const sortedKnown = useMemo(() => [...known].sort((a, b) => Number(normaliseSpell(a).level || 0) - Number(normaliseSpell(b).level || 0)), [known]);
  const sortedPrepared = useMemo(() => [...prepared].sort((a, b) => Number(normaliseSpell(a).level || 0) - Number(normaliseSpell(b).level || 0)), [prepared]);

  const loadoutStorageKey = `rq.spell_loadouts.${character?.id || character?._id || 'unknown'}`;
  const savedLoadouts = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(loadoutStorageKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [loadoutStorageKey, sortedPrepared.length]);

  const rookSuggestions = useMemo(() => {
    const source = sortedKnown.length > 0 ? sortedKnown : sortedPrepared;
    return getRookSuggestedLoadouts(source, sortedPrepared.length);
  }, [sortedKnown, sortedPrepared]);

  const applyPreparedSet = async (spells) => {
    if (!onCharacterUpdate) return false;
    const ok = await onCharacterUpdate({ spells_prepared: spells.map(normaliseSpell) }, { error: 'Could not apply spell loadout' });
    if (ok !== false) toast.success('Prepared spells updated');
    return ok;
  };




  const exportLoadouts = () => {
    try {
      const blob = new Blob([JSON.stringify({ character_id: character?.id, loadouts: savedLoadouts }, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spell-loadouts-${character?.id || 'character'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Spell setups exported');
    } catch {
      toast.error('Failed to export spell setups');
    }
  };

  const importLoadouts = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : (Array.isArray(data.loadouts) ? data.loadouts : []);
      if (!incoming.length) {
        toast.error('No spell setups found in file');
        return;
      }
      const normalized = incoming
        .filter(l => l && typeof l.name === 'string' && Array.isArray(l.spells))
        .map(l => ({ name: l.name.trim().slice(0, 40), spells: l.spells.map(normaliseSpell) }))
        .filter(l => l.name && l.spells.length);
      if (!normalized.length) {
        toast.error('No valid spell setups found');
        return;
      }
      const merged = [...savedLoadouts];
      normalized.forEach((l) => {
        const idx = merged.findIndex(x => x.name.toLowerCase() === l.name.toLowerCase());
        if (idx >= 0) merged[idx] = l;
        else merged.push(l);
      });
      localStorage.setItem(loadoutStorageKey, JSON.stringify(merged.slice(-20)));
      toast.success(`Imported ${normalized.length} spell setups`);
    } catch {
      toast.error('Failed to import spell setups');
    }
  };

  const deleteLoadout = (name) => {
    try {
      const next = savedLoadouts.filter(l => l.name !== name);
      localStorage.setItem(loadoutStorageKey, JSON.stringify(next));
      toast.success('Spell setup deleted');
    } catch {
      toast.error('Failed to delete setup');
    }
  };



  const applyLoadoutAfterLongRest = async (loadout) => {
    if (!onCharacterUpdate) return false;
    const fullSlots = Object.fromEntries(
      Object.keys(slots || {}).map((k) => [k, Number(slots[k] || 0)])
    );
    const ok = await onCharacterUpdate(
      {
        spells_prepared: (loadout?.spells || []).map(normaliseSpell),
        spell_slots_remaining: fullSlots,
      },
      { error: 'Could not apply long-rest spell setup' }
    );
    if (ok !== false) toast.success(`Applied ${loadout?.name || 'setup'} and restored slots`);
    return ok;
  };

  const saveCurrentLoadout = () => {
    const name = loadoutName.trim();
    if (!name) { toast.error('Name your spell setup first'); return; }
    try {
      const next = [
        ...savedLoadouts.filter(l => l.name.toLowerCase() !== name.toLowerCase()),
        { name, spells: sortedPrepared.map(normaliseSpell) }
      ].slice(-12);
      localStorage.setItem(loadoutStorageKey, JSON.stringify(next));
      toast.success('Spell setup saved');
      setLoadoutName('');
    } catch {
      toast.error('Failed to save setup');
    }
  };


  const handleSlotChange = async (nextRemaining) => {
    if (!onCharacterUpdate) return false;
    return onCharacterUpdate({ spell_slots_remaining: nextRemaining }, { error: 'Could not update spell slots' });
  };

  return (
    <div className="clean-sheet-grid">
      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Spellcasting</h2>
        <div className="clean-sheet-spell-summary">
          <div><span>Ability</span><strong>{displayedSpellAbility || '—'}</strong></div>
          <div><span>Save DC</span><strong>{displayedSpellDc || '—'}</strong></div>
          <div><span>Attack</span><strong>{displayedSpellAttack !== '' ? formatBonus(displayedSpellAttack) : '—'}</strong></div>
          <div><span>Prepared</span><strong>{prepared.length}</strong></div>
        </div>
      </section>

      <SpellcastingMathPanel character={character} classLevels={classLevels} spellcastingRows={spellcastingRows} slotMath={slotMath} />

      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Rook Spell Setups</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <input
            value={loadoutName}
            onChange={(e) => setLoadoutName(e.target.value)}
            placeholder="Save current prepared spells as..."
            style={{ flex: '1 1 220px', padding: '8px 10px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
          />
          <button type="button" onClick={saveCurrentLoadout}>Save Setup</button>
          <button type="button" onClick={exportLoadouts}>Export Setups</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            Import Setups
            <input type="file" accept="application/json" onChange={importLoadouts} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {rookSuggestions.map(sg => (
            <button key={sg.id} type="button" onClick={() => applyPreparedSet(sg.spells)}>
              Apply {sg.label}
            </button>
          ))}
        </div>
        {savedLoadouts.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {savedLoadouts.map((l, idx) => (
              <div key={`${l.name}-${idx}`} style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" onClick={() => applyPreparedSet(l.spells)}>
                  Load {l.name} ({l.spells?.length || 0})
                </button>
                <button type="button" onClick={() => applyLoadoutAfterLongRest(l)} title="Apply setup and restore spell slots">
                  Rest+Load
                </button>
                <button type="button" onClick={() => deleteLoadout(l.name)} title="Delete setup">
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : <p className="clean-sheet-muted">No saved spell setups yet.</p>}
      </section>

      <SpellSlots slots={effectiveSlots} remaining={effectiveRemaining} onChangeSlots={handleSlotChange} />
      <PactMagicSlots pactMagic={slotMath?.pactMagic} />
      <SpellList title="Cantrips" spells={cantrips} emptyText="No cantrips found." tag="Cantrip" />
      <SpellList title="Known Spells" spells={sortedKnown} emptyText="No known spells found." />
      <SpellList title="Prepared Spells" spells={sortedPrepared} emptyText="No prepared spells found." />
    </div>
  );
}
