import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { BookOpen, Zap, Shield, Search, ChevronDown, ChevronUp, Star, Plus, X } from 'lucide-react';
import {
  PACT_MAGIC_SLOTS,
  getCharacterSpellcastingInfo,
  getMaxSpellLevel,
  getMulticlassSpellSlots,
  getSpellSlotsForCaster
} from '../data/spellDatabase';
import { API_BASE } from '../lib/api';
import { getClassAccent } from '../lib/theme';

const CANTRIP_DAMAGE = {
  'Fire Bolt': '1d10', 'Eldritch Blast': '1d10', 'Sacred Flame': '1d8',
  'Toll the Dead': '1d8', 'Chill Touch': '1d8', 'Ray of Frost': '1d8',
  'Shocking Grasp': '1d8', 'Acid Splash': '1d6', 'Poison Spray': '1d12',
  'Vicious Mockery': '1d4', 'Produce Flame': '1d8', 'Thorn Whip': '1d6',
  'Word of Radiance': '1d6', 'Frostbite': '1d6',
};

const theme = {
  panel: 'rgba(15, 10, 30, 0.85)',
  border: 'rgba(212, 160, 23, 0.3)',
  accent: { primary: '#4DD0E1', secondary: '#EC4899', highlight: '#F59E0B' },
  text: { primary: '#ffffff', secondary: '#cbd5e1', muted: '#64748b' },
};

const SCHOOL_COLORS = {
  Abjuration: '#3B82F6', Conjuration: '#F59E0B', Divination: '#8B5CF6',
  Enchantment: '#EC4899', Evocation: '#EF4444', Illusion: '#6366F1',
  Necromancy: '#6B7280', Transmutation: '#22C55E',
};

// Upcast damage scaling for common spells
const UPCAST_SCALING = {
  'Burning Hands': { base: '3d6', perLevel: '1d6', type: 'fire' },
  'Chromatic Orb': { base: '3d8', perLevel: '1d8', type: 'varies' },
  'Cure Wounds': { base: '1d8', perLevel: '1d8', type: 'healing' },
  'Guiding Bolt': { base: '4d6', perLevel: '1d6', type: 'radiant' },
  'Healing Word': { base: '1d4', perLevel: '1d4', type: 'healing' },
  'Inflict Wounds': { base: '3d10', perLevel: '1d10', type: 'necrotic' },
  'Ice Knife': { base: '1d10', perLevel: '0', type: 'piercing' },
  'Magic Missile': { base: '3x(1d4+1)', perLevel: '+1 dart', type: 'force' },
  'Thunderwave': { base: '2d8', perLevel: '1d8', type: 'thunder' },
  'Shield of Faith': { base: '+2 AC', perLevel: '0', type: 'buff' },
  'Spiritual Weapon': { base: '1d8', perLevel: '1d8/2lvl', type: 'force' },
  'Scorching Ray': { base: '3x2d6', perLevel: '+1 ray', type: 'fire' },
  'Fireball': { base: '8d6', perLevel: '1d6', type: 'fire' },
  'Lightning Bolt': { base: '8d6', perLevel: '1d6', type: 'lightning' },
};

export default function CharacterSpellbook({
  character, usedSlots, setUsedSlots, rollDice, onUpdateCharacter, onRest
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSpell, setExpandedSpell] = useState(null);
  const [castingSpell, setCastingSpell] = useState(null);
  const [collapsedLevels, setCollapsedLevels] = useState({});
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [learnLevel, setLearnLevel] = useState(0); // 0 = cantrip, 1+ = spell level
  const [learnSearch, setLearnSearch] = useState('');
  const [srdSpells, setSrdSpells] = useState([]);
  const [srdLoading, setSrdLoading] = useState(false);

  const spellcasting = getCharacterSpellcastingInfo(character);
  const spellcastingClass = spellcasting?.className || character?.character_class;
  const classInfo = spellcasting?.classInfo;
  const classAccent = getClassAccent(character);
  if (!classInfo) {
    return (
      <div style={{ color: theme.text.muted, textAlign: 'center', padding: '40px' }}>
        {character?.character_class} is not a spellcasting class
      </div>
    );
  }

  const level = spellcasting?.level || character?.level || 1;
  const characterLevel = character?.level || level;
  const abilities = {
    strength: character?.strength || 10, dexterity: character?.dexterity || 10,
    constitution: character?.constitution || 10, intelligence: character?.intelligence || 10,
    wisdom: character?.wisdom || 10, charisma: character?.charisma || 10,
  };
  const getMod = (score) => Math.floor((score - 10) / 2);
  const profBonus = Math.ceil(characterLevel / 4) + 1;
  const spellAbilityMod = getMod(abilities[classInfo.ability] || 10);
  const spellDC = 8 + profBonus + spellAbilityMod;
  const spellAttackBonus = profBonus + spellAbilityMod;

  // Spell slots — multiclass-aware
  // If character has multiclass_levels (or class_levels) with 2+ entries, compute via the SRD multiclass table.
  // Otherwise fall back to the single-class slot logic.
  const classLevels = character?.multiclass_levels || character?.class_levels;
  const isMulticlass = classLevels && Object.keys(classLevels).length > 1;
  const multiclassData = useMemo(() =>
    isMulticlass ? getMulticlassSpellSlots(classLevels, character) : null,
    [isMulticlass, classLevels, character]
  );

  let slots;
  if (isMulticlass && classInfo.pactMagic) {
    // Pact magic always uses Warlock level only (separate from multiclass slot pool)
    slots = multiclassData?.pactMagic || PACT_MAGIC_SLOTS[level];
  } else if (isMulticlass) {
    // Show the combined multiclass full/half-caster slot table
    slots = multiclassData?.slots || {};
  } else {
    slots = getSpellSlotsForCaster(classInfo, level);
  }

  const maxSpellLevel = getMaxSpellLevel(spellcastingClass, level);

  // Prepared spell limit for prepared casters
  const maxPrepared = classInfo.type === 'prepared'
    ? Math.max(1, spellAbilityMod + level) : Infinity;

  // All spells: combine known + prepared
  const allSpells = useMemo(() => {
    const spells = character?.spells_known || character?.spells_prepared || character?.spells || [];
    return spells.map(s => typeof s === 'string' ? { name: s } : s);
  }, [character]);

  const cantrips = useMemo(() => {
    const c = character?.cantrips_known || [];
    return c.map(s => typeof s === 'string' ? { name: s } : s);
  }, [character]);

  // Prepared state (for prepared casters)
  const [preparedSpells, setPreparedSpells] = useState(() => {
    return new Set((character?.prepared_spell_names || allSpells.map(s => s.name)));
  });

  const preparedCount = preparedSpells.size;

  // Group spells by level
  const spellsByLevel = useMemo(() => {
    const groups = {};
    allSpells.forEach(spell => {
      const lvl = spell.level || 1;
      if (!groups[lvl]) groups[lvl] = [];
      groups[lvl].push(spell);
    });
    return groups;
  }, [allSpells]);

  // Filter
  const matchesSearch = (spell) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (spell.name || '').toLowerCase().includes(term) ||
      (spell.school || '').toLowerCase().includes(term);
  };

  const toggleLevel = (lvl) => {
    setCollapsedLevels(prev => ({ ...prev, [lvl]: !prev[lvl] }));
  };

  const togglePrepared = (spellName) => {
    setPreparedSpells(prev => {
      const next = new Set(prev);
      if (next.has(spellName)) {
        next.delete(spellName);
      } else if (next.size < maxPrepared) {
        next.add(spellName);
      }
      return next;
    });
  };

  // Cast spell: use a slot and optionally roll damage
  const castSpell = (spell, atLevel) => {
    const slotKey = classInfo.pactMagic ? 'pact' : String(atLevel);
    const maxSlots = classInfo.pactMagic ? slots.slots : (slots[atLevel] || 0);
    const used = usedSlots[slotKey] || 0;

    if (used >= maxSlots) {
      return; // No slots available
    }

    // Use the slot
    setUsedSlots(prev => ({ ...prev, [slotKey]: (prev[slotKey] || 0) + 1 }));

    // Roll damage if applicable
    const scaling = UPCAST_SCALING[spell.name];
    if (scaling && scaling.base !== '0' && !scaling.base.includes('AC') && rollDice) {
      const baseDice = spell.damage || scaling.base;
      const upcastLevels = atLevel - (spell.level || 1);
      if (upcastLevels > 0 && scaling.perLevel && scaling.perLevel !== '0') {
        const match = scaling.perLevel.match(/(\d+)d(\d+)/);
        if (match) {
          const extraDice = parseInt(match[1]) * upcastLevels;
          rollDice(`${baseDice}+${extraDice}d${match[2]}`, 0, `${spell.name} (Lvl ${atLevel})`);
        } else {
          rollDice(baseDice, 0, `${spell.name} (Lvl ${atLevel})`);
        }
      } else {
        rollDice(baseDice, 0, spell.name);
      }
    }

    setCastingSpell(null);
  };

  // Get available cast levels for a spell
  const getAvailableCastLevels = (spell) => {
    const baseLevel = spell.level || 1;
    const levels = [];
    if (classInfo.pactMagic) {
      if ((usedSlots.pact || 0) < (slots.slots || 0)) {
        levels.push(slots.level);
      }
    } else {
      for (let i = baseLevel; i <= maxSpellLevel; i++) {
        const available = (slots[i] || 0) - (usedSlots[i] || 0);
        if (available > 0) levels.push(i);
      }
    }
    return levels;
  };

  const cardStyle = {
    background: 'rgba(15, 10, 30, 0.5)',
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: 12,
  };

  // ============ LEARN/PREPARE SPELL ============
  // Fetch SRD spells when modal opens or class/level changes
  useEffect(() => {
    if (!showLearnModal) return;
    setSrdLoading(true);
    axios.get(`${API_BASE}/srd/spells`, {
      params: { class_name: spellcastingClass, level: learnLevel }
    })
      .then(res => setSrdSpells(res.data?.spells || []))
      .catch(() => toast.error('Failed to load SRD spells'))
      .finally(() => setSrdLoading(false));
  }, [showLearnModal, learnLevel, spellcastingClass]);

  // Existing names already in spellbook (deduped)
  const knownNames = useMemo(() => {
    const set = new Set();
    (character?.cantrips_known || []).forEach(s => set.add(typeof s === 'string' ? s : s.name));
    (character?.spells_known || []).forEach(s => set.add(typeof s === 'string' ? s : s.name));
    (character?.spells_prepared || []).forEach(s => set.add(typeof s === 'string' ? s : s.name));
    return set;
  }, [character]);

  const learnSpell = async (spell) => {
    if (!onUpdateCharacter) {
      toast.error('Cannot save spell — character not editable');
      return;
    }
    const isCantrip = spell.level === 0;
    const targetField = isCantrip
      ? 'cantrips_known'
      : (classInfo.type === 'prepared' ? 'spells_prepared' : 'spells_known');
    const existing = (character?.[targetField] || []).map(s => typeof s === 'string' ? { name: s } : s);
    if (existing.some(s => s.name === spell.name)) {
      toast.info(`${spell.name} is already in your ${isCantrip ? 'cantrips' : 'spellbook'}`);
      return;
    }
    const updated = [...existing, {
      name: spell.name,
      level: spell.level,
      school: spell.school,
      casting_time: spell.casting_time,
      range: spell.range,
      concentration: spell.concentration,
      ritual: spell.ritual,
      description: spell.description
    }];
    try {
      await onUpdateCharacter({ [targetField]: updated });
      toast.success(`Learned ${spell.name}`);
    } catch (e) {
      toast.error('Failed to learn spell');
    }
  };

  const forgetSpell = async (spellName, isCantrip) => {
    if (!onUpdateCharacter) return;
    const targetField = isCantrip
      ? 'cantrips_known'
      : (classInfo.type === 'prepared' ? 'spells_prepared' : 'spells_known');
    const existing = (character?.[targetField] || []).map(s => typeof s === 'string' ? { name: s } : s);
    const updated = existing.filter(s => s.name !== spellName);
    try {
      await onUpdateCharacter({ [targetField]: updated });
      toast.success(`Forgot ${spellName}`);
    } catch {
      toast.error('Failed to forget spell');
    }
  };

  return (
    <div data-testid="spellbook" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row with Learn Spell button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text.primary, fontFamily: "'Cinzel', serif" }}>
          {spellcastingClass} Spellbook
        </span>
        <button
          data-testid="learn-spell-btn"
          onClick={() => { setShowLearnModal(true); setLearnLevel(0); setLearnSearch(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 6,
            background: 'rgba(212, 160, 23, 0.12)', border: '1px solid rgba(212, 160, 23, 0.4)',
            color: '#D4A017', cursor: 'pointer', fontSize: 11, fontWeight: 700
          }}
        >
          <Plus size={12} /> LEARN SPELL
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: theme.text.muted, fontWeight: 600 }}>SPELL DC</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: theme.accent.primary }}>{spellDC}</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', cursor: 'pointer' }}
          onClick={() => rollDice?.('1d20', spellAttackBonus, 'Spell Attack')}>
          <div style={{ fontSize: 10, color: theme.text.muted, fontWeight: 600 }}>SPELL ATK</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: theme.accent.secondary }}>+{spellAttackBonus}</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: theme.text.muted, fontWeight: 600 }}>ABILITY</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: theme.accent.highlight }}>
            {classInfo.ability.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Spell Slots */}
      {Object.keys(slots).length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase' }}>
              {classInfo.pactMagic ? 'Pact Magic' : 'Spell Slots'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                data-testid="short-rest-spellbook-btn"
                title="Short Rest — restores Pact Magic (Warlock) slots only"
                onClick={() => {
                  if (onRest) {
                    onRest('short');
                  } else {
                    // Fallback: clear pact key locally
                    setUsedSlots(prev => ({ ...prev, pact: 0 }));
                  }
                }}
                style={{
                  background: 'rgba(212, 160, 23, 0.10)',
                  border: '1px solid rgba(212, 160, 23, 0.35)',
                  borderRadius: 4, padding: '3px 8px', fontSize: 9,
                  color: '#D4A017', cursor: 'pointer', fontWeight: 700, letterSpacing: 0.5,
                }}
              >
                SHORT REST
              </button>
              <button
                data-testid="long-rest-spellbook-btn"
                title="Long Rest — restores all spell slots, reduces exhaustion by 1"
                onClick={() => {
                  if (onRest) {
                    onRest('long');
                  } else {
                    // Fallback: clear all slots locally + decrement exhaustion via update
                    setUsedSlots({});
                    if (onUpdateCharacter && (character?.exhaustion_level || 0) > 0) {
                      onUpdateCharacter({ exhaustion_level: Math.max(0, (character.exhaustion_level || 0) - 1) });
                    }
                  }
                }}
                style={{
                  background: '#D4A017',
                  border: '1px solid #D4A017',
                  borderRadius: 4, padding: '3px 8px', fontSize: 9,
                  color: '#0A1628', cursor: 'pointer', fontWeight: 800, letterSpacing: 0.5,
                }}
              >
                LONG REST
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {classInfo.pactMagic ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {Array.from({ length: slots.slots }).map((_, i) => {
                  const isUsed = (usedSlots.pact || 0) > i;
                  return (
                    <button key={i}
                      data-testid={`pact-slot-${i}`}
                      title={isUsed ? 'Spent — click to restore' : 'Available — click to spend'}
                      onClick={() => setUsedSlots(prev => ({
                        ...prev, pact: isUsed ? (prev.pact || 0) - 1 : (prev.pact || 0) + 1
                      }))}
                      style={{
                        // Gem (rotated square) — flat fill, gold border, no gradient
                        width: 24, height: 24,
                        transform: 'rotate(45deg)',
                        background: isUsed ? 'transparent' : classAccent.icon,
                        border: `2px solid ${isUsed ? 'rgba(212,160,23,0.3)' : '#D4A017'}`,
                        cursor: 'pointer', padding: 0,
                        transition: 'all 0.12s ease',
                      }} />
                  );
                })}
                <span style={{ fontSize: 11, color: theme.text.muted, marginLeft: 6 }}>Lvl {slots.level}</span>
              </div>
            ) : (
              Object.entries(slots).map(([lvl, count]) => {
                const used = usedSlots[lvl] || 0;
                return (
                  <div key={lvl} style={{
                    padding: 8, background: 'rgba(212,160,23,0.06)',
                    border: '1px solid rgba(212,160,23,0.2)',
                    borderRadius: 8, minWidth: 64,
                  }}>
                    <div style={{ fontSize: 9, color: '#D4A017', textAlign: 'center', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>LVL {lvl}</div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
                      {Array.from({ length: count }).map((_, i) => (
                        <button key={i}
                          data-testid={`slot-${lvl}-${i}`}
                          title={used > i ? 'Spent — click to restore' : 'Available — click to spend'}
                          onClick={() => setUsedSlots(prev => ({
                            ...prev, [lvl]: used > i ? used - 1 : used + 1
                          }))}
                          style={{
                            // Diamond gem shape via rotated square
                            width: 14, height: 14,
                            transform: 'rotate(45deg)',
                            background: used > i ? 'transparent' : classAccent.icon,
                            border: `1.5px solid ${used > i ? 'rgba(212,160,23,0.3)' : '#D4A017'}`,
                            cursor: 'pointer', padding: 0,
                            transition: 'all 0.12s ease',
                          }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: theme.text.muted, textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
                      {count - used}/{count}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Prepared count for prepared casters */}
      {classInfo.type === 'prepared' && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>
            Prepared: {preparedCount}/{maxPrepared}
          </span>
          <span style={{ fontSize: 10, color: theme.text.muted }}>
            Toggle spells to prepare/unprepare
          </span>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text.muted }} />
        <input
          data-testid="spell-search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search spells..."
          style={{
            width: '100%', padding: '8px 12px 8px 32px',
            background: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.border}`,
            borderRadius: 8, color: theme.text.primary, fontSize: 12, outline: 'none',
          }}
        />
      </div>

      {/* Cantrips */}
      {cantrips.length > 0 && (
        <div>
          <div
            onClick={() => toggleLevel(0)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent.primary, textTransform: 'uppercase' }}>
              Cantrips ({cantrips.filter(matchesSearch).length})
            </span>
            {collapsedLevels[0] ? <ChevronDown size={14} color={theme.text.muted} /> : <ChevronUp size={14} color={theme.text.muted} />}
          </div>
          {!collapsedLevels[0] && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {cantrips.filter(matchesSearch).map((cantrip, i) => {
                const name = cantrip.name || cantrip;
                const dice = cantrip.damage || CANTRIP_DAMAGE[name] || '1d8';
                return (
                  <button key={i} onClick={() => rollDice?.(dice, 0, `${name}`)}
                    data-testid={`cantrip-${name.replace(/\s/g, '-').toLowerCase()}`}
                    style={{
                      padding: '6px 12px', borderRadius: 14,
                      background: 'rgba(77,208,225,0.15)', border: `1px solid ${theme.accent.primary}`,
                      fontSize: 12, color: theme.accent.primary, cursor: 'pointer',
                      fontWeight: 500, transition: 'all 0.15s',
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spells by Level */}
      {Object.entries(spellsByLevel).sort(([a], [b]) => a - b).map(([lvl, spells]) => {
        const filteredSpells = spells.filter(matchesSearch);
        if (filteredSpells.length === 0) return null;
        const slotAvailable = classInfo.pactMagic
          ? (usedSlots.pact || 0) < (slots.slots || 0)
          : ((slots[lvl] || 0) - (usedSlots[lvl] || 0)) > 0;

        return (
          <div key={lvl}>
            <div
              onClick={() => toggleLevel(lvl)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent.secondary, textTransform: 'uppercase' }}>
                  Level {lvl}
                </span>
                <span style={{ fontSize: 10, color: theme.text.muted }}>({filteredSpells.length} spells)</span>
                {!slotAvailable && (
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>
                    No Slots
                  </span>
                )}
              </div>
              {collapsedLevels[lvl] ? <ChevronDown size={14} color={theme.text.muted} /> : <ChevronUp size={14} color={theme.text.muted} />}
            </div>

            {!collapsedLevels[lvl] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                {filteredSpells.map((spell, i) => {
                  const name = spell.name || '';
                  const isPrepared = preparedSpells.has(name);
                  const isExpanded = expandedSpell === `${lvl}-${i}`;
                  const isCasting = castingSpell === `${lvl}-${i}`;
                  const scaling = UPCAST_SCALING[name];
                  const school = spell.school || '';
                  const availableLevels = getAvailableCastLevels(spell);
                  const dimmed = classInfo.type === 'prepared' && !isPrepared;

                  return (
                    <div key={i} data-testid={`spell-${name.replace(/\s/g, '-').toLowerCase()}`}
                      style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: dimmed ? 'rgba(0,0,0,0.1)' : 'rgba(15,10,30,0.5)',
                        border: `1px solid ${dimmed ? '#1f2937' : theme.border}`,
                        opacity: dimmed ? 0.5 : 1, transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}
                          onClick={() => setExpandedSpell(isExpanded ? null : `${lvl}-${i}`)}>
                          {/* Prepared toggle */}
                          {classInfo.type === 'prepared' && (
                            <button onClick={(e) => { e.stopPropagation(); togglePrepared(name); }}
                              data-testid={`prepare-${name.replace(/\s/g, '-').toLowerCase()}`}
                              style={{
                                width: 18, height: 18, borderRadius: 4, cursor: 'pointer',
                                background: isPrepared ? 'rgba(59,130,246,0.3)' : 'transparent',
                                border: `2px solid ${isPrepared ? '#3B82F6' : '#4B5563'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, color: '#3B82F6',
                              }}>
                              {isPrepared && '✓'}
                            </button>
                          )}
                          <span style={{ color: theme.text.primary, fontSize: 13, fontWeight: 500 }}>{name}</span>
                          {school && (
                            <span style={{
                              fontSize: 9, padding: '1px 6px', borderRadius: 4,
                              background: `${SCHOOL_COLORS[school] || '#6B7280'}20`,
                              color: SCHOOL_COLORS[school] || '#6B7280',
                            }}>
                              {school}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {spell.damage && (
                            <span style={{ fontSize: 10, color: theme.accent.secondary, padding: '2px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.15)' }}>
                              {spell.damage}
                            </span>
                          )}
                          {/* Cast button */}
                          {availableLevels.length > 0 && (!dimmed || classInfo.type !== 'prepared') && (
                            <button
                              data-testid={`cast-${name.replace(/\s/g, '-').toLowerCase()}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (availableLevels.length === 1 && !scaling) {
                                  castSpell(spell, availableLevels[0]);
                                } else {
                                  setCastingSpell(isCasting ? null : `${lvl}-${i}`);
                                }
                              }}
                              style={{
                                padding: '3px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                                background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)',
                                color: theme.accent.secondary, fontWeight: 600,
                              }}
                            >
                              <Zap size={10} style={{ display: 'inline', marginRight: 2 }} /> Cast
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Upcast level selector */}
                      {isCasting && (
                        <div style={{
                          marginTop: 6, padding: 8, background: 'rgba(236,72,153,0.06)',
                          borderRadius: 6, border: '1px solid rgba(236,72,153,0.15)',
                        }}>
                          <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 4 }}>Cast at level:</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {availableLevels.map(castLvl => {
                              const upcastExtra = scaling && castLvl > (spell.level || 1) ? ` (+${castLvl - (spell.level || 1)} lvl)` : '';
                              return (
                                <button key={castLvl} onClick={() => castSpell(spell, castLvl)}
                                  data-testid={`cast-at-${castLvl}`}
                                  style={{
                                    padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                                    background: castLvl === (spell.level || 1) ? 'rgba(236,72,153,0.2)' : 'rgba(245,158,11,0.15)',
                                    border: `1px solid ${castLvl === (spell.level || 1) ? 'rgba(236,72,153,0.4)' : 'rgba(245,158,11,0.3)'}`,
                                    color: castLvl === (spell.level || 1) ? theme.accent.secondary : theme.accent.highlight,
                                    fontWeight: 600,
                                  }}
                                >
                                  Lvl {castLvl}{upcastExtra}
                                </button>
                              );
                            })}
                          </div>
                          {scaling && (
                            <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 4 }}>
                              Base: {scaling.base} ({scaling.type}) | Per level: {scaling.perLevel}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{ marginTop: 6, fontSize: 11, color: theme.text.secondary }}>
                          {spell.description && <p style={{ marginBottom: 4 }}>{spell.description}</p>}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: theme.text.muted, fontSize: 10 }}>
                            {spell.casting_time && <span>Casting: {spell.casting_time}</span>}
                            {spell.range && <span>Range: {spell.range}</span>}
                            {spell.duration && <span>Duration: {spell.duration}</span>}
                            {spell.concentration && <span style={{ color: '#F59E0B' }}>Concentration</span>}
                            {spell.ritual && <span style={{ color: '#22C55E' }}>Ritual</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {allSpells.length === 0 && cantrips.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: theme.text.muted }}>
          <BookOpen size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
          <p>No spells {classInfo.type === 'prepared' ? 'prepared' : 'known'} yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Click LEARN SPELL above to add spells from the SRD list.</p>
        </div>
      )}

      {/* Learn Spell Modal */}
      {showLearnModal && (
        <div data-testid="learn-spell-modal" style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#0F0A1E', border: '1px solid rgba(212, 160, 23, 0.4)',
            borderRadius: 12, padding: 20,
            width: 'min(800px, 100%)', maxHeight: '85vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#D4A017', fontFamily: "'Cinzel', serif", fontSize: 18 }}>
                Learn a {spellcastingClass} Spell
              </h3>
              <button data-testid="learn-modal-close" onClick={() => setShowLearnModal(false)} style={{
                background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer'
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Level filter */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, maxSpellLevel + 1).map(lvl => (
                <button
                  key={lvl}
                  data-testid={`learn-level-${lvl}`}
                  onClick={() => setLearnLevel(lvl)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: learnLevel === lvl ? 'rgba(212, 160, 23, 0.25)' : 'rgba(15, 10, 30, 0.5)',
                    border: `1px solid ${learnLevel === lvl ? '#D4A017' : theme.border}`,
                    color: learnLevel === lvl ? '#D4A017' : theme.text.primary, cursor: 'pointer'
                  }}>
                  {lvl === 0 ? 'Cantrips' : `Lvl ${lvl}`}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              data-testid="learn-search"
              value={learnSearch}
              onChange={e => setLearnSearch(e.target.value)}
              placeholder="Search spells..."
              style={{
                width: '100%', padding: '8px 12px', marginBottom: 10,
                background: 'rgba(15, 10, 30, 0.6)', border: `1px solid ${theme.border}`,
                borderRadius: 8, color: theme.text.primary, fontSize: 13, outline: 'none'
              }}
            />

            {/* Spell list */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {srdLoading && <div style={{ color: theme.text.muted, padding: 16, textAlign: 'center' }}>Loading…</div>}
              {!srdLoading && srdSpells.length === 0 && (
                <div style={{ color: theme.text.muted, padding: 16, textAlign: 'center', fontSize: 12 }}>
                  No spells available at this level for {spellcastingClass}.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {srdSpells
                  .filter(s => !learnSearch || s.name.toLowerCase().includes(learnSearch.toLowerCase()))
                  .map(spell => {
                    const known = knownNames.has(spell.name);
                    return (
                      <div key={spell.name} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px', borderRadius: 8,
                        background: known ? 'rgba(16, 185, 129, 0.06)' : 'rgba(15, 10, 30, 0.5)',
                        border: `1px solid ${known ? 'rgba(16, 185, 129, 0.25)' : theme.border}`
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary, fontFamily: "'Cinzel', serif" }}>
                            {known && '✓ '}{spell.name} <span style={{ fontSize: 10, color: theme.text.muted, fontWeight: 400 }}>· {spell.school}</span>
                          </div>
                          <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 2 }}>
                            {spell.casting_time} · {spell.range} · {spell.duration}
                            {spell.concentration && ' · Concentration'}
                            {spell.ritual && ' · Ritual'}
                          </div>
                        </div>
                        <button
                          data-testid={`learn-add-${spell.name.toLowerCase().replace(/\s/g, '-')}`}
                          disabled={known}
                          onClick={() => learnSpell(spell)}
                          style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: known ? 'rgba(255,255,255,0.05)' : '#D4A017',
                            border: `1px solid ${known ? 'rgba(255,255,255,0.1)' : '#D4A017'}`,
                            color: known ? theme.text.muted : '#0A1628',
                            cursor: known ? 'not-allowed' : 'pointer',
                            opacity: known ? 0.5 : 1
                          }}>
                          {known ? 'KNOWN' : 'LEARN'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
