import { useState } from 'react';
import { CLASS_RESOURCES, getResourceMax, getRestoreType, FEATURE_COSTS, FEATURE_TYPE_CONFIG } from '../data/classResources';
import { CLASS_FEATURES } from '../data/classFeatures';
import { ALL_WEAPONS, ARMOR, ALL_ARMOR } from '../data/equipmentDatabase';

/**
 * Compact, resource-aware combat dashboard.
 * Shows weapon attacks, class resources, and features with usage tracking.
 */
export default function CharacterCombatTab({
  character,
  onUpdateCharacter,
  onUpdateResources,
  onRest,
  isGMMode
}) {
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [restLoading, setRestLoading] = useState(false);

  const charClass = character?.character_class || '';
  const level = character?.level || 1;
  const profBonus = character?.proficiency_bonus || (2 + Math.floor((level - 1) / 4));

  // Ability modifiers
  const getMod = (score) => Math.floor(((score || 10) - 10) / 2);
  const strMod = getMod(character?.strength);
  const dexMod = getMod(character?.dexterity);
  const conMod = getMod(character?.constitution);
  const wisMod = getMod(character?.wisdom);
  const chaMod = getMod(character?.charisma);
  const intMod = getMod(character?.intelligence);

  const abilityMods = {
    strength: strMod, dexterity: dexMod, constitution: conMod,
    wisdom: wisMod, charisma: chaMod, intelligence: intMod
  };

  // ─── Resources ────────────────────────────────────────────────
  const classResources = CLASS_RESOURCES[charClass] || [];
  const currentResources = character?.resources || {};

  function getResourceCurrent(res) {
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
    const updated = { ...currentResources };
    updated[resKey] = Math.max(0, (updated[resKey] ?? 999) - amount);
    onUpdateResources?.(updated);
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

  // ─── Weapon Attacks ───────────────────────────────────────────
  const equipped = character?.equipped || {};
  const equipment = character?.equipment || [];

  function getWeaponAttacks() {
    const attacks = [];
    const slots = ['mainHand', 'offHand'];

    for (const slot of slots) {
      const equippedItem = equipped[slot];
      if (!equippedItem) continue;

      // Find weapon data from equipment database
      const weaponData = ALL_WEAPONS.find(w =>
        w.name.toLowerCase() === (equippedItem.name || '').toLowerCase() ||
        w.id === (equippedItem.id || '').toLowerCase()
      );

      if (weaponData) {
        const isFinesse = weaponData.properties?.includes('finesse');
        const isRanged = weaponData.category?.includes('ranged');
        const abilityMod = isRanged ? dexMod : (isFinesse ? Math.max(strMod, dexMod) : strMod);
        const toHit = abilityMod + profBonus;
        const damage = weaponData.damage;
        const damageBonus = abilityMod;

        attacks.push({
          name: weaponData.name,
          slot,
          toHit: toHit >= 0 ? `+${toHit}` : `${toHit}`,
          damage: `${damage}${damageBonus >= 0 ? '+' : ''}${damageBonus}`,
          damageType: weaponData.damageType,
          properties: weaponData.properties || [],
          range: weaponData.range,
          versatileDamage: weaponData.versatileDamage
            ? `${weaponData.versatileDamage}${damageBonus >= 0 ? '+' : ''}${damageBonus}`
            : null,
        });
      } else if (equippedItem.name) {
        // Custom / unrecognized weapon — show basic info
        attacks.push({
          name: equippedItem.name,
          slot,
          toHit: `+${strMod + profBonus}`,
          damage: equippedItem.damage || '1d4',
          damageType: equippedItem.damageType || '—',
          properties: [],
        });
      }
    }

    // Always add Unarmed Strike
    attacks.push({
      name: 'Unarmed Strike',
      slot: 'unarmed',
      toHit: `+${strMod + profBonus}`,
      damage: `1${strMod >= 0 ? '+' : ''}${strMod}`,
      damageType: 'bludgeoning',
      properties: [],
      isUnarmed: true,
    });

    return attacks;
  }

  // ─── Features ─────────────────────────────────────────────────
  const classData = CLASS_FEATURES[charClass.toLowerCase()];
  const features = (classData?.features || []).filter(f => f.level <= level);

  function useFeature(feature) {
    const costInfo = FEATURE_COSTS[feature.name];
    if (!costInfo || !costInfo.resource) return;

    const resKey = costInfo.resource;
    const res = classResources.find(r => r.key === resKey);
    if (!res) return;

    const { current } = getResourceCurrent(res);
    if (costInfo.cost === 'variable' || costInfo.cost === 'spell_slot') return; // can't auto-deduct
    if (current <= 0) return; // out of uses

    spendResource(resKey, costInfo.cost);
  }

  function canUseFeature(feature) {
    const costInfo = FEATURE_COSTS[feature.name];
    if (!costInfo || !costInfo.resource) return true; // no cost = always available
    if (costInfo.cost === 'variable' || costInfo.cost === 'spell_slot') return true;

    const res = classResources.find(r => r.key === costInfo.resource);
    if (!res) return true;

    const { current } = getResourceCurrent(res);
    return current > 0;
  }

  // ─── Rest handlers ────────────────────────────────────────────
  async function handleRest(type) {
    setRestLoading(true);
    try {
      await onRest?.(type);
    } finally {
      setRestLoading(false);
    }
  }

  // ─── AC Calculation ───────────────────────────────────────────
  function computeAC() {
    const armor = equipped.armor;
    const shield = equipped.shield;
    let ac = 10 + dexMod; // default unarmored

    // Check class-based unarmored defense
    const lowerClass = charClass.toLowerCase();
    if (lowerClass === 'barbarian' && !armor) {
      ac = 10 + dexMod + conMod;
    } else if (lowerClass === 'monk' && !armor) {
      ac = 10 + dexMod + wisMod;
    }

    if (armor) {
      // Try to find in equipment DB
      const allArmor = [...(ARMOR.light || []), ...(ARMOR.medium || []), ...(ARMOR.heavy || [])];
      const armorData = allArmor.find(a =>
        a.name.toLowerCase() === (armor.name || '').toLowerCase() ||
        a.id === (armor.id || '').toLowerCase()
      );
      if (armorData) {
        if (armorData.category === 'heavy') {
          ac = armorData.ac; // no DEX bonus
        } else if (armorData.maxDexBonus !== null && armorData.maxDexBonus !== undefined) {
          ac = armorData.ac + Math.min(dexMod, armorData.maxDexBonus);
        } else {
          ac = armorData.ac + dexMod;
        }
      } else {
        // Parse AC from name (e.g., "Chain Mail (AC 16)")
        const acMatch = (armor.name || '').match(/AC\s*(\d+)/i);
        if (acMatch) ac = parseInt(acMatch[1]);
      }
    }

    if (shield) ac += 2;

    return ac;
  }

  const weaponAttacks = getWeaponAttacks();
  const ac = computeAC();

  // Theme colors
  const accent = isGMMode ? '#8A2BE2' : '#4DD0E1';
  const accentDim = isGMMode ? 'rgba(138,43,226,0.15)' : 'rgba(77,208,225,0.15)';

  return (
    <div data-testid="combat-tab" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Quick Stats Bar ── */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <StatPill label="AC" value={ac} color={accent} />
        <StatPill label="HP" value={`${character?.current_hit_points ?? 0}/${character?.max_hit_points ?? 0}`} color="#22C55E" />
        <StatPill label="Prof" value={`+${profBonus}`} color="#F59E0B" />
        <StatPill label="Init" value={`${dexMod >= 0 ? '+' : ''}${dexMod}`} color="#8B5CF6" />
        <StatPill label="Speed" value={character?.speed || 30} color="#6B7280" />
      </div>

      {/* ── Weapon Attacks ── */}
      <Section title="Attacks" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {weaponAttacks.map((atk, i) => (
            <div key={i} data-testid={`attack-${atk.slot}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: atk.isUnarmed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: atk.isUnarmed ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: '#E5E7EB' }}>
                {atk.name}
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: 'rgba(239,68,68,0.15)', color: '#EF4444'
              }}>
                {atk.toHit}
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: 'rgba(245,158,11,0.15)', color: '#F59E0B'
              }}>
                {atk.damage} {atk.damageType}
              </span>
              {atk.range && (
                <span style={{ fontSize: 11, color: '#6B7280' }}>{atk.range}</span>
              )}
              {atk.versatileDamage && (
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  (2H: {atk.versatileDamage})
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Class Resources ── */}
      {classResources.length > 0 && (
        <Section title="Resources" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {classResources.map(res => {
              const { current, max } = getResourceCurrent(res);
              if (max === 0) return null;
              const restType = getRestoreType(res, level);
              return (
                <div key={res.key} data-testid={`resource-${res.key}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#D1D5DB', minWidth: 120 }}>
                    {res.name}
                  </span>
                  <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                    {max <= 20 ? (
                      // Dot tracker for small pools
                      Array.from({ length: max }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (i < current) spendResource(res.key, 1);
                            else restoreResource(res.key, 1);
                          }}
                          style={{
                            width: 20, height: 20, borderRadius: '50%',
                            border: `2px solid ${accent}`,
                            background: i < current ? accent : 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s',
                            opacity: i < current ? 1 : 0.3,
                          }}
                          title={i < current ? 'Click to spend' : 'Click to restore'}
                        />
                      ))
                    ) : (
                      // Numeric display for large pools (Lay on Hands, etc.)
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => spendResource(res.key, 5)} style={numBtnStyle}>-5</button>
                        <button onClick={() => spendResource(res.key, 1)} style={numBtnStyle}>-1</button>
                        <span style={{
                          fontSize: 16, fontWeight: 700, color: accent,
                          minWidth: 50, textAlign: 'center'
                        }}>
                          {current}/{max}
                        </span>
                        <button onClick={() => restoreResource(res.key, 1)} style={numBtnStyle}>+1</button>
                        <button onClick={() => restoreResource(res.key, 5)} style={numBtnStyle}>+5</button>
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: restType === 'short' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                    color: restType === 'short' ? '#22C55E' : '#3B82F6',
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {restType}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Features & Abilities ── */}
      <Section title="Features & Abilities" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {features.map((feat, i) => {
            const typeConfig = FEATURE_TYPE_CONFIG[feat.type] || FEATURE_TYPE_CONFIG.passive;
            const costInfo = FEATURE_COSTS[feat.name];
            const canUse = canUseFeature(feat);
            const isExpanded = expandedFeature === i;

            return (
              <div key={i} data-testid={`feature-${feat.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <div
                  onClick={() => setExpandedFeature(isExpanded ? null : i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 6,
                    background: isExpanded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    opacity: canUse ? 1 : 0.4,
                    transition: 'all 0.15s',
                    borderLeft: `3px solid ${typeConfig.color}`,
                  }}
                >
                  {/* Type badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px',
                    borderRadius: 3, background: typeConfig.bg, color: typeConfig.color,
                    minWidth: 24, textAlign: 'center',
                  }}>
                    {typeConfig.short}
                  </span>

                  {/* Feature name */}
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: '#E5E7EB', flex: 1,
                  }}>
                    {feat.name}
                  </span>

                  {/* Cost badge */}
                  {costInfo && costInfo.resource && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 3,
                      background: canUse ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: canUse ? '#F59E0B' : '#EF4444',
                      fontWeight: 600,
                    }}>
                      {costInfo.cost === 'variable' ? 'var' : costInfo.cost === 'spell_slot' ? 'slot' : costInfo.cost}
                    </span>
                  )}

                  {/* Use button */}
                  {costInfo && costInfo.resource && costInfo.cost !== 'variable' && costInfo.cost !== 'spell_slot' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        useFeature(feat);
                      }}
                      disabled={!canUse}
                      style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                        background: canUse ? accent : 'rgba(107,114,128,0.2)',
                        color: canUse ? '#fff' : '#6B7280',
                        border: 'none', cursor: canUse ? 'pointer' : 'not-allowed',
                        fontWeight: 600,
                      }}
                    >
                      Use
                    </button>
                  )}

                  {/* Expand chevron */}
                  <span style={{ fontSize: 10, color: '#6B7280', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </div>

                {/* Expanded description */}
                {isExpanded && (
                  <div style={{
                    padding: '8px 10px 8px 36px', fontSize: 12, color: '#9CA3AF',
                    lineHeight: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    {feat.description}
                    {feat.level > 1 && (
                      <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#6B7280' }}>
                        Unlocked at level {feat.level}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {features.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
              No class features data available for {charClass}
            </div>
          )}
        </div>
      </Section>

      {/* ── Rest Buttons ── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          data-testid="short-rest-btn"
          onClick={() => handleRest('short')}
          disabled={restLoading}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#22C55E', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Short Rest
          <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
            Spend hit dice, restore short-rest resources
          </span>
        </button>
        <button
          data-testid="long-rest-btn"
          onClick={() => handleRest('long')}
          disabled={restLoading}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            color: '#3B82F6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Long Rest
          <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
            Full HP, half hit dice, all resources
          </span>
        </button>
      </div>
    </div>
  );
}


// ─── Sub-components ─────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 6,
      background: `${color}10`, border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: accent,
        textTransform: 'uppercase', letterSpacing: 1.5,
        marginBottom: 6, paddingLeft: 2,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const numBtnStyle = {
  width: 28, height: 24, borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#D1D5DB', fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
};
