import { useState, useMemo } from 'react';
import { CLASS_RESOURCES, getResourceMax, getRestoreType, FEATURE_COSTS, FEATURE_TYPE_CONFIG } from '../data/classResources';
import { CLASS_FEATURES } from '../data/classFeatures';
import { ALL_WEAPONS, ARMOR } from '../data/equipmentDatabase';
import { getCharacterSpellcastingInfo, getSpellSlotsForCaster } from '../data/spellDatabase';
import { getConditionRollEffect, getConditionIndicator, CONDITION_EFFECTS } from '../data/conditionEffects';
import { getClassAccent } from '../lib/theme';

// 5e SRD conditions
const CONDITIONS = [
  { key: 'blinded', label: 'Blinded', desc: 'Auto-fail sight checks, attacks have disadvantage, attacks against have advantage' },
  { key: 'charmed', label: 'Charmed', desc: "Can't attack charmer, charmer has advantage on social checks" },
  { key: 'deafened', label: 'Deafened', desc: 'Auto-fail hearing checks' },
  { key: 'frightened', label: 'Frightened', desc: "Disadvantage on checks/attacks while source in sight, can't willingly move closer" },
  { key: 'grappled', label: 'Grappled', desc: 'Speed 0, ends if grappler incapacitated or you are moved away' },
  { key: 'incapacitated', label: 'Incapacitated', desc: "Can't take actions or reactions" },
  { key: 'invisible', label: 'Invisible', desc: 'Heavily obscured, advantage on attacks, attacks against have disadvantage' },
  { key: 'paralyzed', label: 'Paralyzed', desc: 'Incapacitated, auto-fail STR/DEX saves, attacks have advantage, melee crits' },
  { key: 'petrified', label: 'Petrified', desc: 'Turned to stone, weight x10, immune to poison/disease' },
  { key: 'poisoned', label: 'Poisoned', desc: 'Disadvantage on attacks and ability checks' },
  { key: 'prone', label: 'Prone', desc: 'Disadvantage on attacks, melee attacks have advantage, ranged have disadvantage' },
  { key: 'restrained', label: 'Restrained', desc: 'Speed 0, disadvantage on attacks/DEX saves, attacks against have advantage' },
  { key: 'stunned', label: 'Stunned', desc: 'Incapacitated, auto-fail STR/DEX saves, attacks have advantage' },
  { key: 'unconscious', label: 'Unconscious', desc: 'Drop what held, prone, incapacitated, auto-fail STR/DEX, advantage to hit, melee crits' },
  { key: 'exhaustion', label: 'Exhaustion', desc: 'Cumulative penalty levels (1-6)' },
  { key: 'concentrating', label: 'Concentrating', desc: 'Maintaining a spell. CON save on damage (DC = max of 10 or half damage)' },
];

export default function CharacterCombatTab({
  character, onUpdateCharacter, onUpdateResources, onRest, isGMMode, rollDice
}) {
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [restLoading, setRestLoading] = useState(false);
  const [showConditions, setShowConditions] = useState(true);
  const [activeConditions, setActiveConditions] = useState(character?.conditions || []);
  const [concentratingOn, setConcentratingOn] = useState(character?.concentrating_on || '');
  const [inspiration, setInspiration] = useState(character?.inspiration || false);
  const [hpInput, setHpInput] = useState('');
  const [rollMode, setRollMode] = useState('normal');
  const [deathSkullAnim, setDeathSkullAnim] = useState(null);
  const [exhaustionLevel, setExhaustionLevel] = useState(character?.exhaustion_level || 0);
  const [concSpell, setConcSpell] = useState(character?.concentrating_on || '');
  const [showConcPrompt, setShowConcPrompt] = useState(false);
  const [concDC, setConcDC] = useState(10);

  const charClass = character?.character_class || '';
  const level = character?.level || 1;
  const profBonus = character?.proficiency_bonus || (2 + Math.floor((level - 1) / 4));
  const currentHp = character?.current_hit_points ?? character?.hp ?? 0;
  const maxHp = character?.max_hit_points ?? character?.max_hp ?? 1;
  const tempHp = Math.max(0, Number(character?.temporary_hit_points ?? character?.temp_hp ?? 0) || 0);

  const getMod = (score) => Math.floor(((score || 10) - 10) / 2);
  const strMod = getMod(character?.strength);
  const dexMod = getMod(character?.dexterity);
  const conMod = getMod(character?.constitution);
  const wisMod = getMod(character?.wisdom);
  const chaMod = getMod(character?.charisma);

  const HIT_DICE = { Barbarian:12, Fighter:10, Paladin:10, Ranger:10, Bard:8, Cleric:8, Druid:8, Monk:8, Rogue:8, Warlock:8, Sorcerer:6, Wizard:6 };
  const hitDieSize = HIT_DICE[charClass] || 8;
  const hitDiceRemaining = character?.hit_dice_remaining ?? level;

  // ─── Resources ────────────────────────────────────────────────
  const classResources = CLASS_RESOURCES[charClass] || [];
  const currentResources = character?.resources || {};

  function getResCurrent(res) {
    const max = getResourceMax(res, level, {
      strength: character?.strength, dexterity: character?.dexterity,
      constitution: character?.constitution, wisdom: character?.wisdom,
      charisma: character?.charisma, intelligence: character?.intelligence
    });
    if (res.minLevel && level < res.minLevel) return { current: 0, max: 0 };
    const current = currentResources[res.key] !== undefined ? currentResources[res.key] : max;
    return { current: Math.min(current, max), max };
  }

  function spendResource(resKey, amount = 1) {
    const cost = Number(amount) || 0;
    if (cost <= 0) return true;
    const res = classResources.find(r => r.key === resKey);
    const { current } = res
      ? getResCurrent(res)
      : { current: Number(currentResources[resKey] || 0) };
    if (current < cost) return false;

    const updated = { ...currentResources };
    updated[resKey] = Math.max(0, current - cost);
    onUpdateResources?.(updated);
    return true;
  }
  function restoreResource(resKey, amount = 1) {
    const res = classResources.find(r => r.key === resKey);
    if (!res) return;
    const max = getResourceMax(res, level, {
      strength: character?.strength, dexterity: character?.dexterity,
      constitution: character?.constitution, wisdom: character?.wisdom,
      charisma: character?.charisma, intelligence: character?.intelligence
    });
    const updated = { ...currentResources };
    updated[resKey] = Math.min(max, (updated[resKey] ?? max) + amount);
    onUpdateResources?.(updated);
  }

  // ─── Spell Slots ──────────────────────────────────────────────
  const spellcasting = getCharacterSpellcastingInfo(character);
  const classInfo = spellcasting?.classInfo || null;
  const spellcastingLevel = spellcasting?.level || 0;
  const spellSlots = useMemo(() => {
    return getSpellSlotsForCaster(classInfo, spellcastingLevel);
  }, [classInfo, spellcastingLevel]);

  const [usedSlots, setUsedSlots] = useState(() => {
    const remaining = character?.spell_slots_remaining || {};
    const used = {};
    Object.entries(spellSlots || {}).forEach(([lvl, count]) => {
      const remain = Number(remaining[lvl] ?? count);
      used[lvl] = Math.max(0, Number(count) - remain);
    });
    return used;
  });

  function toggleSlot(slotLevel, index) {
    setUsedSlots(prev => {
      const key = classInfo?.pactMagic ? 'pact' : String(slotLevel);
      const used = prev[key] || 0;
      const isUsed = used > index;
      const newVal = isUsed ? used - 1 : used + 1;
      const updated = { ...prev, [key]: newVal };
      const remaining = {};
      Object.entries(spellSlots || {}).forEach(([lvl, count]) => {
        const usedCount = updated[lvl] || 0;
        remaining[lvl] = Math.max(0, Number(count) - usedCount);
      });
      onUpdateCharacter?.({ spell_slots_remaining: remaining });
      return updated;
    });
  }

  // ─── Weapon Attacks ───────────────────────────────────────────
  const equipped = character?.equipped || {};

  function getWeaponAttacks() {
    const attacks = [];
    for (const slot of ['mainHand', 'offHand']) {
      const item = equipped[slot];
      if (!item) continue;
      const wpn = ALL_WEAPONS.find(w => w.name.toLowerCase() === (item.name || '').toLowerCase() || w.id === (item.id || '').toLowerCase());
      if (wpn) {
        const isRanged = wpn.category?.includes('ranged');
        const isFinesse = wpn.properties?.includes('finesse');
        const aMod = isRanged ? dexMod : (isFinesse ? Math.max(strMod, dexMod) : strMod);
        attacks.push({
          name: wpn.name, slot, toHit: `${aMod + profBonus >= 0 ? '+' : ''}${aMod + profBonus}`,
          damage: `${wpn.damage}${aMod >= 0 ? '+' : ''}${aMod}`, damageType: wpn.damageType,
          properties: wpn.properties || [], range: wpn.range,
          versatileDamage: wpn.versatileDamage ? `${wpn.versatileDamage}${aMod >= 0 ? '+' : ''}${aMod}` : null,
        });
      } else if (item.name) {
        attacks.push({ name: item.name, slot, toHit: `+${strMod + profBonus}`, damage: item.damage || '1d4', damageType: item.damageType || '—', properties: [] });
      }
    }
    // Monk unarmed gets martial arts die
    const monkDie = charClass === 'Monk' ? (level >= 17 ? '1d10' : level >= 11 ? '1d8' : level >= 5 ? '1d6' : '1d4') : null;
    attacks.push({
      name: 'Unarmed Strike', slot: 'unarmed',
      toHit: `+${strMod + profBonus}`,
      damage: monkDie ? `${monkDie}${dexMod >= 0 ? '+' : ''}${dexMod}` : `1${strMod >= 0 ? '+' : ''}${strMod}`,
      damageType: 'bludgeoning', properties: [], isUnarmed: true,
    });
    return attacks;
  }

  // ─── Features ─────────────────────────────────────────────────
  const classData = CLASS_FEATURES[charClass.toLowerCase()];
  const edition = character?.rules_edition || character?.edition || '2014';
  const editionFeatures = edition === '2024' && classData?.features_2024 ? classData.features_2024 : (classData?.features || []);
  // Also include subclass features if character has a subclass
  const subclassKey = character?.subclass;
  const subclassFeatures = subclassKey && classData?.subclasses?.[subclassKey]
    ? classData.subclasses[subclassKey].features.filter(f => f.level <= level)
    : [];
  const features = [...editionFeatures.filter(f => f.level <= level && !f.isChoice), ...subclassFeatures];

  function useFeature(feature) {
    const costInfo = FEATURE_COSTS[feature.name];
    if (!costInfo || !costInfo.resource) return;
    const res = classResources.find(r => r.key === costInfo.resource);
    if (!res) return;
    const { current } = getResCurrent(res);
    if (costInfo.cost === 'variable' || costInfo.cost === 'spell_slot') return;
    const cost = Number(costInfo.cost) || 0;
    if (cost <= 0 || current < cost) return;
    spendResource(costInfo.resource, costInfo.cost);
  }
  function canUseFeature(feature) {
    const costInfo = FEATURE_COSTS[feature.name];
    if (!costInfo || !costInfo.resource) return true;
    if (costInfo.cost === 'variable' || costInfo.cost === 'spell_slot') return true;
    const cost = Number(costInfo.cost) || 0;
    if (cost <= 0) return true;
    const res = classResources.find(r => r.key === costInfo.resource);
    if (!res) return true;
    return getResCurrent(res).current >= cost;
  }

  // ─── AC Calculation ───────────────────────────────────────────
  function computeAC() {
    const armor = equipped.armor;
    const shield = equipped.shield;
    let ac = 10 + dexMod;
    const lc = charClass.toLowerCase();
    if (lc === 'barbarian' && !armor) ac = 10 + dexMod + conMod;
    if (lc === 'monk' && !armor) ac = 10 + dexMod + wisMod;
    if (armor) {
      const allArmor = [...(ARMOR.light || []), ...(ARMOR.medium || []), ...(ARMOR.heavy || [])];
      const ad = allArmor.find(a => a.name.toLowerCase() === (armor.name || '').toLowerCase());
      if (ad) {
        ac = ad.category === 'heavy' ? ad.ac : (ad.maxDexBonus != null ? ad.ac + Math.min(dexMod, ad.maxDexBonus) : ad.ac + dexMod);
      } else {
        const m = (armor.name || '').match(/AC\s*(\d+)/i);
        if (m) ac = parseInt(m[1]);
      }
    }
    if (shield) ac += 2;
    return ac;
  }

  // ─── Death Saves ──────────────────────────────────────────────
  const [deathSuccesses, setDeathSuccesses] = useState(character?.death_saves_successes || 0);
  const [deathFailures, setDeathFailures] = useState(character?.death_saves_failures || 0);
  const isDown = currentHp <= 0;

  function toggleDeathSave(type, index) {
    if (type === 'success') {
      const newVal = deathSuccesses > index ? index : index + 1;
      setDeathSuccesses(newVal);
      onUpdateCharacter?.({ death_saves_successes: newVal });
    } else {
      const newVal = deathFailures > index ? index : index + 1;
      setDeathFailures(newVal);
      onUpdateCharacter?.({ death_saves_failures: newVal });
    }
  }

  // ─── Condition toggling ───────────────────────────────────────
  function toggleCondition(key) {
    setActiveConditions(prev => {
      const next = prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key];
      // Defer side effects to avoid setState-during-render warning
      setTimeout(() => {
        onUpdateCharacter?.({ conditions: next });
        if (key === 'concentrating' && !next.includes(key)) setConcentratingOn('');
      }, 0);
      return next;
    });
  }

  // ─── Rest handlers ────────────────────────────────────────────
  async function handleRest(type) {
    setRestLoading(true);
    try {
      if (type === 'long') {
        setUsedSlots({});
        setDeathSuccesses(0);
        setDeathFailures(0);
        setActiveConditions(prev => prev.filter(c => c === 'exhaustion'));
      }
      if (type === 'short' && classInfo?.pactMagic) setUsedSlots({});
      await onRest?.(type);
    } finally { setRestLoading(false); }
  }

  const weaponAttacks = getWeaponAttacks();
  const ac = computeAC();
  const accent = isGMMode ? '#B8941F' : '#D4AF37';
  const rulesEdition = character?.rules_edition || '2014';

  // Attack roll handler - applies condition effects automatically
  const handleAttackRoll = (atk, type) => {
    if (!rollDice) return;
    const condEffect = getConditionRollEffect(activeConditions, 'attack', rollMode, exhaustionLevel);
    if (type === 'hit') {
      const mod = parseInt(atk.toHit) || 0;
      rollDice('1d20', mod, `${atk.name} (Attack)`, condEffect.mode);
    } else {
      const dmgMatch = atk.damage.match(/^(\d+d\d+)([+-]\d+)?$/i);
      if (dmgMatch) {
        rollDice(dmgMatch[1], parseInt(dmgMatch[2] || 0), `${atk.name} (${atk.damageType})`, 'normal');
      }
    }
  };

  // HP management - triggers concentration save on damage
  const handleHpChange = (delta) => {
    let newHp = currentHp;
    let newTempHp = tempHp;

    if (delta < 0) {
      const damage = Math.abs(delta);
      const absorbed = Math.min(newTempHp, damage);
      newTempHp -= absorbed;
      newHp = Math.max(0, currentHp - (damage - absorbed));
    } else {
      newHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    }

    onUpdateCharacter?.({ current_hit_points: newHp, temporary_hit_points: newTempHp });
    // Trigger concentration save if taking damage while concentrating
    if (delta < 0 && concSpell) {
      const dmg = Math.abs(delta);
      const dc = Math.max(10, Math.floor(dmg / 2));
      setConcDC(dc);
      setShowConcPrompt(true);
    }
  };
  const handleHpInput = (type) => {
    const val = parseInt(hpInput) || 0;
    if (val <= 0) return;
    handleHpChange(type === 'heal' ? val : -val);
    setHpInput('');
  };
  const handleTempHp = (delta) => {
    const newTemp = Math.max(0, tempHp + delta);
    onUpdateCharacter?.({ temporary_hit_points: newTemp });
  };
  // Exhaustion management
  const handleExhaustion = (newLevel) => {
    const clamped = Math.max(0, Math.min(6, newLevel));
    setExhaustionLevel(clamped);
    onUpdateCharacter?.({ exhaustion_level: clamped });
  };

  return (
    <div data-testid="combat-tab" className="character-combat-tab" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        .character-combat-tab {
          line-height: 1.35;
        }

        .character-combat-tab button,
        .character-combat-tab input {
          letter-spacing: 0 !important;
        }

        @media (max-width: 720px) {
          .character-combat-tab {
            gap: 8px !important;
            font-size: 12px !important;
          }

          .character-combat-tab [data-testid="hp-tracker"] {
            padding: 9px !important;
          }

          .character-combat-tab [data-testid^="resource-"] {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 6px !important;
          }

          .character-combat-tab [data-testid^="feature-"] > div:first-child {
            padding: 7px 8px !important;
          }
        }
      `}</style>

      {/* ── Quick Stats + Inspiration ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatPill label="AC" value={ac} color={accent} />
        <StatPill label="Prof" value={`+${profBonus}`} color="#F59E0B" />
        <button data-testid="roll-initiative" onClick={() => rollDice?.('1d20', dexMod, 'Initiative', rollMode)} style={{ background: 'none', border: 'none', padding: 0, cursor: rollDice ? 'pointer' : 'default' }}>
          <StatPill label="Init" value={`${dexMod >= 0 ? '+' : ''}${dexMod}`} color="#8B5CF6" />
        </button>
        <StatPill label="Speed" value={character?.speed || 30} color="#6B7280" />
        {rulesEdition === '2024' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.15)', color: '#EC4899', fontWeight: 700 }}>2024</span>}
        {rulesEdition === '2014' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(107,114,128,0.15)', color: '#9CA3AF', fontWeight: 700 }}>2014</span>}
        {/* Inspiration */}
        <button
          data-testid="inspiration-toggle"
          onClick={() => { setInspiration(!inspiration); onUpdateCharacter?.({ inspiration: !inspiration }); }}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: inspiration ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${inspiration ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`,
            color: inspiration ? '#F59E0B' : '#6B7280', cursor: 'pointer', transition: 'all 0.15s',
          }}
          title="Inspiration: advantage on one roll"
        >
          {inspiration ? '★' : '☆'} Insp
        </button>
      </div>

      {/* ── HP Controls ── */}
      <div data-testid="hp-tracker" style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 800, letterSpacing: 1 }}>HP ADJUST</span>
          {tempHp > 0 && (
            <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 800 }}>TEMP +{tempHp}</span>
          )}
        </div>
        {/* Damage/Heal Row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button data-testid="hp-damage-btn" onClick={() => handleHpInput('damage')} disabled={!hpInput} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: hpInput ? 'pointer' : 'not-allowed',
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444',
            opacity: hpInput ? 1 : 0.4, transition: 'all 0.15s',
          }}>DMG</button>
          <input
            data-testid="hp-input"
            type="number" min="0" value={hpInput} onChange={e => setHpInput(e.target.value)}
            placeholder="Amount"
            onKeyDown={e => { if (e.key === 'Enter') handleHpInput(e.shiftKey ? 'heal' : 'damage'); }}
            style={{
              flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '6px 10px', color: '#E5E7EB', fontSize: 13, textAlign: 'center', outline: 'none',
            }}
          />
          <button data-testid="hp-heal-btn" onClick={() => handleHpInput('heal')} disabled={!hpInput} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: hpInput ? 'pointer' : 'not-allowed',
            background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#22C55E',
            opacity: hpInput ? 1 : 0.4, transition: 'all 0.15s',
          }}>HEAL</button>
        </div>
        {/* Temp HP */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px', background: 'rgba(59,130,246,0.06)', borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 600 }}>TEMP HP</span>
          <button onClick={() => handleTempHp(-1)} style={{ padding: '1px 6px', background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>-</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: tempHp > 0 ? '#3B82F6' : '#6B7280', minWidth: 20, textAlign: 'center' }}>{tempHp}</span>
          <button onClick={() => handleTempHp(1)} style={{ padding: '1px 6px', background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+</button>
        </div>
      </div>

      {/* ── Concentration Tracker ── */}
      <div data-testid="concentration-tracker" style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8,
        background: concSpell ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${concSpell ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: concSpell ? '#3B82F6' : '#6B7280', letterSpacing: 1 }}>CONC</span>
        <input
          data-testid="conc-spell-input"
          type="text" value={concSpell}
          onChange={e => { setConcSpell(e.target.value); onUpdateCharacter?.({ concentrating_on: e.target.value }); }}
          placeholder="Spell name..."
          style={{
            flex: 1, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 4,
            padding: '3px 6px', color: '#93C5FD', fontSize: 11, outline: 'none',
          }}
        />
        {concSpell && (
          <button data-testid="drop-concentration" onClick={() => { setConcSpell(''); onUpdateCharacter?.({ concentrating_on: '' }); }} style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444', cursor: 'pointer',
          }}>DROP</button>
        )}
      </div>
      {/* Concentration Save Prompt */}
      {showConcPrompt && concSpell && (
        <div data-testid="conc-save-prompt" style={{
          padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.4)', display: 'flex', flexDirection: 'column', gap: 4,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>CONCENTRATION CHECK — DC {concDC}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button data-testid="conc-save-roll" onClick={() => {
              rollDice?.('1d20', conMod + (character?.saving_throw_proficiencies?.includes('constitution') ? profBonus : 0), `Concentration (DC ${concDC})`, 'normal');
              setShowConcPrompt(false);
            }} style={{
              flex: 1, padding: '5px', borderRadius: 5, fontSize: 11, fontWeight: 700,
              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
              color: '#3B82F6', cursor: 'pointer',
            }}>Roll CON Save</button>
            <button onClick={() => { setConcSpell(''); onUpdateCharacter?.({ concentrating_on: '' }); setShowConcPrompt(false); }} style={{
              padding: '5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700,
              background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#EF4444', cursor: 'pointer',
            }}>Lose Conc.</button>
            <button onClick={() => setShowConcPrompt(false)} style={{
              padding: '5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700,
              background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)',
              color: '#22C55E', cursor: 'pointer',
            }}>Maintained</button>
          </div>
        </div>
      )}

      {/* ── Exhaustion Tracker ── */}
      <div data-testid="exhaustion-tracker" style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8,
        background: exhaustionLevel > 0 ? 'rgba(146,64,14,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${exhaustionLevel > 0 ? 'rgba(146,64,14,0.3)' : 'rgba(255,255,255,0.05)'}`,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: exhaustionLevel > 0 ? '#D97706' : '#6B7280', letterSpacing: 1 }}>EXHAUST</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1,2,3,4,5,6].map(lvl => (
            <button key={lvl} data-testid={`exhaust-${lvl}`}
              onClick={() => handleExhaustion(exhaustionLevel === lvl ? lvl - 1 : lvl)}
              title={[
                '', '1: Disadvantage on checks', '2: Speed halved', '3: Disadvantage on attacks & saves',
                '4: HP max halved', '5: Speed 0', '6: DEATH'
              ][lvl]}
              style={{
                width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: lvl <= exhaustionLevel
                  ? lvl >= 5 ? '#991B1B' : lvl >= 3 ? '#D97706' : '#92400E'
                  : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${lvl <= exhaustionLevel ? (lvl >= 5 ? '#EF4444' : '#D97706') : 'rgba(255,255,255,0.1)'}`,
                color: lvl <= exhaustionLevel ? '#fff' : '#6B7280',
                transition: 'all 0.15s',
              }}
            >{lvl}</button>
          ))}
        </div>
        {exhaustionLevel > 0 && (
          <span style={{ fontSize: 9, color: '#D97706', flex: 1, textAlign: 'right' }}>
            {[
              '', 'Disadv. checks', 'Speed halved', 'Disadv. attacks/saves',
              'HP max halved', 'Speed 0', 'DEATH'
            ][exhaustionLevel]}
          </span>
        )}
      </div>

      {/* ── Roll Mode Toggle (Advantage / Normal / Disadvantage) ── */}
      <div data-testid="roll-mode-toggle" style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {[
          { key: 'disadvantage', label: 'Disadv', color: '#EF4444' },
          { key: 'normal', label: 'Normal', color: '#9CA3AF' },
          { key: 'advantage', label: 'Adv', color: '#22C55E' },
        ].map(m => (
          <button key={m.key} data-testid={`roll-mode-${m.key}`}
            onClick={() => setRollMode(m.key)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: rollMode === m.key ? `${m.color}20` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${rollMode === m.key ? `${m.color}60` : 'rgba(255,255,255,0.06)'}`,
              color: rollMode === m.key ? m.color : '#6B7280', transition: 'all 0.15s',
            }}
          >{m.label}</button>
        ))}
      </div>

      {/* ── Death Saves (only when HP ≤ 0) ── */}
      {isDown && (
        <div data-testid="death-saves" style={{
          padding: '14px', borderRadius: 10, position: 'relative', overflow: 'hidden',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          {/* Red skull animation overlay */}
          {deathSkullAnim && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5, pointerEvents: 'none',
              animation: 'deathSkullFade 1.2s ease-out forwards',
            }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 20px #EF4444) drop-shadow(0 0 40px #991B1B)' }}>
                <path d="M12 2C7.5 2 4 5.5 4 9.5c0 2.5 1.2 4.7 3 6.1V18c0 .6.4 1 1 1h1v2c0 .6.4 1 1 1h.5c.3 0 .5-.2.5-.5v-2.5h2v2.5c0 .3.2.5.5.5h.5c.6 0 1-.4 1-1v-2h1c.6 0 1-.4 1-1v-2.4c1.8-1.4 3-3.6 3-6.1C20 5.5 16.5 2 12 2z" fill="#EF4444" opacity="0.9"/>
                <circle cx="9" cy="9.5" r="2" fill="#0a0a0a"/>
                <circle cx="15" cy="9.5" r="2" fill="#0a0a0a"/>
                <path d="M9.5 14.5l1-1 1 1 1-1 1 1" stroke="#0a0a0a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', position: 'relative', zIndex: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', letterSpacing: 1 }}>DEATH SAVES</span>
            {/* Roll Death Save button */}
            {rollDice && (
              <button data-testid="roll-death-save"
                onClick={() => {
                  const result = Math.floor(Math.random() * 20) + 1;
                  const isSuccess = result >= 10;
                  if (result === 20) {
                    // Nat 20: regain 1 HP
                    onUpdateCharacter?.({ current_hit_points: 1, death_saves_successes: 0, death_saves_failures: 0 });
                    setDeathSuccesses(0); setDeathFailures(0);
                    rollDice('1d20', 0, 'Death Save (NAT 20!)', 'normal');
                  } else if (result === 1) {
                    // Nat 1: 2 failures
                    const newFail = Math.min(3, deathFailures + 2);
                    setDeathFailures(newFail);
                    onUpdateCharacter?.({ death_saves_failures: newFail });
                    setDeathSkullAnim(Date.now());
                    setTimeout(() => setDeathSkullAnim(null), 1200);
                    rollDice('1d20', 0, 'Death Save (NAT 1!)', 'normal');
                  } else if (isSuccess) {
                    const newSucc = Math.min(3, deathSuccesses + 1);
                    setDeathSuccesses(newSucc);
                    onUpdateCharacter?.({ death_saves_successes: newSucc });
                    rollDice('1d20', 0, 'Death Save (Pass)', 'normal');
                  } else {
                    const newFail = Math.min(3, deathFailures + 1);
                    setDeathFailures(newFail);
                    onUpdateCharacter?.({ death_saves_failures: newFail });
                    setDeathSkullAnim(Date.now());
                    setTimeout(() => setDeathSkullAnim(null), 1200);
                    rollDice('1d20', 0, 'Death Save (Fail)', 'normal');
                  }
                }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
                  color: '#EF4444', cursor: 'pointer',
                }}
              >Roll Save</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginTop: 8, position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>Pass</span>
              {[0,1,2].map(i => (
                <button key={i} onClick={() => toggleDeathSave('success', i)} style={{
                  width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                  border: `2px solid #22C55E`, background: i < deathSuccesses ? '#22C55E' : 'transparent',
                  transition: 'all 0.2s', transform: i < deathSuccesses ? 'scale(1.1)' : 'scale(1)',
                }} />
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>Fail</span>
              {[0,1,2].map(i => (
                <button key={i} onClick={() => toggleDeathSave('failure', i)} data-testid={`death-fail-${i}`} style={{
                  width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                  border: `2px solid #EF4444`, background: i < deathFailures ? '#EF4444' : 'transparent',
                  transition: 'all 0.2s', transform: i < deathFailures ? 'scale(1.1)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>
          {deathFailures >= 3 && <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: 800, color: '#EF4444', letterSpacing: 2, textTransform: 'uppercase', animation: 'pulse 1s ease-in-out infinite' }}>CHARACTER DEAD</div>}
          {deathSuccesses >= 3 && <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: 800, color: '#22C55E', letterSpacing: 2, textTransform: 'uppercase' }}>STABILIZED</div>}
          <style>{`
            @keyframes deathSkullFade {
              0% { opacity: 0; transform: scale(0.3); }
              20% { opacity: 1; transform: scale(1.2); }
              40% { transform: scale(0.95); }
              60% { opacity: 0.9; transform: scale(1.05); }
              100% { opacity: 0; transform: scale(1.5); }
            }
            @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
          `}</style>
        </div>
      )}

      {/* ── Active Conditions ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button onClick={() => setShowConditions(!showConditions)} style={{
            fontSize: 10, fontWeight: 700, color: '#9CA3AF', cursor: 'pointer',
            background: 'none', border: 'none', letterSpacing: 1, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Conditions {activeConditions.length > 0 && <span style={{ color: '#EF4444' }}>({activeConditions.length})</span>}
            <span style={{ fontSize: 8, transform: showConditions ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
          </button>
          {/* Active condition pills */}
          {activeConditions.map(key => {
            const cond = CONDITIONS.find(c => c.key === key);
            return (
              <span key={key} onClick={() => toggleCondition(key)} style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                background: key === 'concentrating' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.15)',
                color: key === 'concentrating' ? '#3B82F6' : '#EF4444', fontWeight: 600,
              }} title={cond?.desc}>
                {cond?.label || key} ×
              </span>
            );
          })}
        </div>
        {showConditions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
            {CONDITIONS.map(c => {
              const isActive = activeConditions.includes(c.key);
              const effectData = CONDITION_EFFECTS[c.key];
              const effectCount = effectData ? Object.keys(effectData.effects).length : 0;
              return (
                <button key={c.key}
                  data-testid={`condition-toggle-${c.key}`}
                  onClick={() => toggleCondition(c.key)} title={`${c.desc}${effectData?.notes ? '\n\nEffect: ' + effectData.notes : ''}`} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  background: isActive ? (c.key === 'concentrating' ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.2)') : 'rgba(255,255,255,0.04)',
                  color: isActive ? (c.key === 'concentrating' ? '#3B82F6' : '#EF4444') : '#9CA3AF',
                  border: `1px solid ${isActive ? (c.key === 'concentrating' ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.06)'}`,
                  fontWeight: isActive ? 600 : 400,
                  position: 'relative',
                }}>
                  {c.label}
                  {effectCount > 0 && !isActive && <span style={{ fontSize: 8, color: '#F59E0B', marginLeft: 2 }}>*</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Active Condition Effects Summary */}
        {activeConditions.length > 0 && (() => {
          const attackEffect = getConditionRollEffect(activeConditions, 'attack', 'normal', exhaustionLevel);
          const checkEffect = getConditionRollEffect(activeConditions, 'ability_check', 'normal', exhaustionLevel);
          const strSave = getConditionRollEffect(activeConditions, 'str_save', 'normal', exhaustionLevel);
          const dexSave = getConditionRollEffect(activeConditions, 'dex_save', 'normal', exhaustionLevel);
          const effects = [];
          if (attackEffect.mode !== 'normal') effects.push({ label: 'Attacks', ...attackEffect });
          if (attackEffect.autoFail) effects.push({ label: 'Attacks', mode: 'auto_fail', reason: attackEffect.reason });
          if (checkEffect.mode !== 'normal') effects.push({ label: 'Ability Checks', ...checkEffect });
          if (strSave.autoFail) effects.push({ label: 'STR Saves', mode: 'auto_fail', reason: strSave.reason });
          if (dexSave.autoFail) effects.push({ label: 'DEX Saves', mode: 'auto_fail', reason: dexSave.reason });
          if (strSave.mode !== 'normal' && !strSave.autoFail) effects.push({ label: 'STR Saves', ...strSave });
          if (dexSave.mode !== 'normal' && !dexSave.autoFail) effects.push({ label: 'DEX Saves', ...dexSave });
          if (effects.length === 0) return null;
          return (
            <div data-testid="condition-effects-summary" style={{
              padding: '8px 10px', borderRadius: 6, marginBottom: 8,
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', letterSpacing: 1 }}>EFFECTS:</span>
              {effects.map((e, i) => (
                <span key={i} title={e.reason} style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                  background: e.mode === 'auto_fail' ? 'rgba(239,68,68,0.2)' : e.mode === 'disadvantage' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  color: e.mode === 'auto_fail' ? '#EF4444' : e.mode === 'disadvantage' ? '#EF4444' : '#22C55E',
                }}>
                  {e.label}: {e.mode === 'auto_fail' ? 'AUTO-FAIL' : e.mode === 'advantage' ? 'ADV' : 'DISADV'}
                </span>
              ))}
            </div>
          );
        })()}
        {/* Concentration spell name */}
        {activeConditions.includes('concentrating') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '4px 8px', background: 'rgba(59,130,246,0.08)', borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>Concentrating on:</span>
            <input
              value={concentratingOn}
              onChange={(e) => { setConcentratingOn(e.target.value); onUpdateCharacter?.({ concentrating_on: e.target.value }); }}
              placeholder="Spell name..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#E5E7EB', fontSize: 12, outline: 'none' }}
            />
            <span style={{ fontSize: 10, color: '#6B7280' }}>CON save on damage</span>
          </div>
        )}
      </div>

      {/* ── Weapon Attacks ── */}
      <Section title="Attacks" accent={accent}>
        {(() => {
          const attackEffect = getConditionRollEffect(activeConditions, 'attack', rollMode, exhaustionLevel);
          const attackIndicator = attackEffect.mode !== 'normal' ? { mode: attackEffect.mode, reason: attackEffect.reason } : null;
          return (
            <>
              {attackIndicator && (
                <div style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4, marginBottom: 6, textAlign: 'center',
                  fontWeight: 600, 
                  background: attackIndicator.mode === 'advantage' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: attackIndicator.mode === 'advantage' ? '#22C55E' : '#EF4444',
                  border: `1px solid ${attackIndicator.mode === 'advantage' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {attackIndicator.mode === 'advantage' ? '▲ ADVANTAGE' : '▼ DISADVANTAGE'} on attacks
                  {attackIndicator.reason && <span style={{ opacity: 0.7, marginLeft: 4 }}>({attackIndicator.reason})</span>}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Hint when nothing equipped — only Unarmed shows */}
          {weaponAttacks.length === 1 && weaponAttacks[0].isUnarmed && (
            <div data-testid="no-weapons-hint" style={{
              fontSize: 11, padding: '8px 10px', borderRadius: 6, marginBottom: 4,
              background: 'rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.25)',
              color: '#D4A017', fontWeight: 600, textAlign: 'center',
            }}>
              No weapons equipped — open the Inventory tab and tap "Equip" on a weapon to add it here.
            </div>
          )}
          {weaponAttacks.map((atk, i) => (
            <div key={i} data-testid={`attack-${atk.slot}`} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8,
              background: atk.isUnarmed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)', opacity: atk.isUnarmed ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#E5E7EB' }}>{atk.name}</span>
              <button
                data-testid={`attack-hit-${atk.slot}`}
                onClick={() => handleAttackRoll(atk, 'hit')}
                title="Roll to hit"
                style={{
                  padding: '3px 8px', borderRadius: 5, fontSize: 12, fontWeight: 700,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444', cursor: rollDice ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >{atk.toHit}</button>
              <button
                data-testid={`attack-dmg-${atk.slot}`}
                onClick={() => handleAttackRoll(atk, 'damage')}
                title="Roll damage"
                style={{
                  padding: '3px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  color: '#F59E0B', cursor: rollDice ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >{atk.damage} {atk.damageType}</button>
              {atk.range && <span style={{ fontSize: 10, color: '#6B7280' }}>{atk.range}</span>}
              {atk.versatileDamage && (
                <button
                  onClick={() => {
                    if (!rollDice) return;
                    const vMatch = atk.versatileDamage.match(/^(\d+d\d+)([+-]\d+)?$/i);
                    if (vMatch) rollDice(vMatch[1], parseInt(vMatch[2] || 0), `${atk.name} 2H (${atk.damageType})`, 'normal');
                  }}
                  title="Roll versatile (two-handed) damage"
                  style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                    color: '#A855F7', cursor: rollDice ? 'pointer' : 'default',
                  }}
                >2H: {atk.versatileDamage}</button>
              )}
            </div>
          ))}
        </div>
            </>
          );
        })()}
      </Section>

      {/* ── Hit Dice + Class Resources ── */}
      <Section title="Resources" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Hit Dice */}
          <ResourceRow
            name={`Hit Dice (d${hitDieSize})`}
            current={hitDiceRemaining} max={level}
            accent={accent} restLabel="short"
            onSpend={() => onUpdateCharacter?.({ hit_dice_remaining: Math.max(0, hitDiceRemaining - 1) })}
            onRestore={() => onUpdateCharacter?.({ hit_dice_remaining: Math.min(level, hitDiceRemaining + 1) })}
          />
          {/* Class Resources */}
          {classResources.map(res => {
            const { current, max } = getResCurrent(res);
            if (max === 0) return null;
            return (
              <ResourceRow key={res.key} name={res.name} current={current} max={max}
                accent={accent} restLabel={getRestoreType(res, level)}
                onSpend={() => spendResource(res.key)} onRestore={() => restoreResource(res.key)}
                testId={`resource-${res.key}`}
              />
            );
          })}
        </div>
      </Section>

      {/* ── Spell Slots (for casters) ── */}
      {classInfo && Object.keys(spellSlots).length > 0 && (() => { const classAccent = getClassAccent(character); return (
        <Section title={classInfo.pactMagic ? 'Pact Magic' : 'Spell Slots'} accent="#D4A017">
          {classInfo.pactMagic ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 50 }}>Lvl {spellSlots.level}</span>
              {Array.from({ length: spellSlots.slots }).map((_, i) => {
                const isUsed = (usedSlots['pact'] || 0) > i;
                return (
                  <button key={i} onClick={() => toggleSlot('pact', i)}
                    data-testid={`combat-pact-slot-${i}`}
                    style={{
                      width: 18, height: 18, transform: 'rotate(45deg)',
                      cursor: 'pointer', padding: 0,
                      border: `2px solid ${isUsed ? 'rgba(212,160,23,0.3)' : '#D4A017'}`,
                      background: isUsed ? 'transparent' : classAccent.icon,
                      transition: 'all 0.12s ease',
                    }}
                    title={isUsed ? 'Click to recover' : 'Click to use'} />
                );
              })}
              <span style={{ fontSize: 10, color: '#D4A017', fontWeight: 700, marginLeft: 4, padding: '1px 6px', borderRadius: 3, background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)' }}>SHORT REST</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(spellSlots).map(([lvl, count]) => (
                <div key={lvl} style={{ padding: '6px 10px', background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 8, minWidth: 64, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#D4A017', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>LVL {lvl}</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '4px 0' }}>
                    {Array.from({ length: count }).map((_, i) => {
                      const isUsed = (usedSlots[lvl] || 0) > i;
                      return (
                        <button key={i} onClick={() => toggleSlot(lvl, i)}
                          data-testid={`combat-slot-${lvl}-${i}`}
                          style={{
                            width: 14, height: 14, transform: 'rotate(45deg)',
                            cursor: 'pointer', padding: 0,
                            border: `1.5px solid ${isUsed ? 'rgba(212,160,23,0.3)' : '#D4A017'}`,
                            background: isUsed ? 'transparent' : classAccent.icon,
                            transition: 'all 0.12s ease',
                          }}
                          title={isUsed ? 'Recover slot' : 'Use slot'} />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4, fontWeight: 600 }}>{count - (usedSlots[lvl] || 0)}/{count}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      ); })()}

      {/* ── Features & Abilities ── */}
      <Section title="Features & Abilities" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {features.map((feat, i) => {
            const typeConfig = FEATURE_TYPE_CONFIG[feat.type] || FEATURE_TYPE_CONFIG.passive;
            const costInfo = FEATURE_COSTS[feat.name];
            const numericCost = Number(costInfo?.cost) || 0;
            const hasCostBadge = costInfo?.resource && (
              costInfo.cost === 'variable' || costInfo.cost === 'spell_slot' || numericCost > 0
            );
            const hasSpendButton = costInfo?.resource &&
              costInfo.cost !== 'variable' &&
              costInfo.cost !== 'spell_slot' &&
              numericCost > 0;
            const canUse = canUseFeature(feat);
            const resource = costInfo?.resource
              ? classResources.find(r => r.key === costInfo.resource)
              : null;
            const resourceState = resource ? getResCurrent(resource) : null;
            const unavailableReason = resourceState && numericCost > 0 && resourceState.current < numericCost
              ? `Needs ${numericCost} ${resource.name}`
              : '';
            const isExpanded = expandedFeature === i;
            return (
              <div key={i} data-testid={`feature-${feat.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <div onClick={() => setExpandedFeature(isExpanded ? null : i)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 5,
                  background: isExpanded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', opacity: canUse ? 1 : 0.4, borderLeft: `3px solid ${typeConfig.color}`, transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: typeConfig.bg, color: typeConfig.color, minWidth: 20, textAlign: 'center' }}>{typeConfig.short}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#E5E7EB', flex: 1 }}>{feat.name}</span>
                  {hasCostBadge && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: canUse ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: canUse ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>
                      {costInfo.cost === 'variable' ? 'var' : costInfo.cost === 'spell_slot' ? 'slot' : costInfo.cost}
                    </span>
                  )}
                  {hasSpendButton && (
                    <button
                      onClick={(e) => { e.stopPropagation(); useFeature(feat); }}
                      disabled={!canUse}
                      title={unavailableReason || `Spend ${numericCost} ${resource?.name || 'resource'}`}
                      style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 3, background: canUse ? accent : 'rgba(107,114,128,0.2)',
                      color: canUse ? '#fff' : '#6B7280', border: 'none', cursor: canUse ? 'pointer' : 'not-allowed', fontWeight: 600,
                    }}>Use</button>
                  )}
                  <span style={{ fontSize: 8, color: '#6B7280', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
                </div>
                {isExpanded && (
                  <div style={{ padding: '6px 8px 6px 32px', fontSize: 11, color: '#9CA3AF', lineHeight: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {feat.description}
                    {unavailableReason && <span style={{ display: 'block', marginTop: 4, fontSize: 10, color: '#EF4444', fontWeight: 700 }}>{unavailableReason}</span>}
                    {feat.level > 1 && <span style={{ display: 'block', marginTop: 3, fontSize: 10, color: '#6B7280' }}>Unlocked at level {feat.level}</span>}
                  </div>
                )}
              </div>
            );
          })}
          {features.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#6B7280', textAlign: 'center' }}>No class features data for {charClass}</div>}
        </div>
      </Section>

      {/* ── Rest Buttons ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button data-testid="short-rest-btn" onClick={() => handleRest('short')} disabled={restLoading} style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          color: '#22C55E', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          Short Rest
          <span style={{ display: 'block', fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>Hit dice + short-rest resources</span>
        </button>
        <button data-testid="long-rest-btn" onClick={() => handleRest('long')} disabled={restLoading} style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
          color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          Long Rest
          <span style={{ display: 'block', fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>Full HP, slots, all resources</span>
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, background: `${color}10`, border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5, paddingLeft: 2 }}>{title}</div>
      {children}
    </div>
  );
}

function ResourceRow({ name, current, max, accent, restLabel, onSpend, onRestore, testId }) {
  if (max === 0) return null;
  return (
    <div data-testid={testId} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#D1D5DB', minWidth: 110 }}>{name}</span>
      <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {max <= 20 ? (
          Array.from({ length: max }).map((_, i) => (
            <button key={i} onClick={() => i < current ? onSpend() : onRestore()} style={{
              width: 18, height: 18, borderRadius: '50%', border: `2px solid ${accent}`,
              background: i < current ? accent : 'transparent', cursor: 'pointer',
              opacity: i < current ? 1 : 0.3, transition: 'all 0.15s',
            }} title={i < current ? 'Spend' : 'Restore'} />
          ))
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => { for (let i = 0; i < 5; i++) onSpend(); }} style={numBtnStyle}>-5</button>
            <button onClick={onSpend} style={numBtnStyle}>-1</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: accent, minWidth: 44, textAlign: 'center' }}>{current}/{max}</span>
            <button onClick={onRestore} style={numBtnStyle}>+1</button>
            <button onClick={() => { for (let i = 0; i < 5; i++) onRestore(); }} style={numBtnStyle}>+5</button>
          </div>
        )}
      </div>
      <span style={{
        fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 600, textTransform: 'uppercase',
        background: restLabel === 'short' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
        color: restLabel === 'short' ? '#22C55E' : '#3B82F6',
      }}>{restLabel}</span>
    </div>
  );
}

const numBtnStyle = {
  width: 26, height: 22, borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)', color: '#D1D5DB', fontSize: 11, fontWeight: 600, cursor: 'pointer',
};
