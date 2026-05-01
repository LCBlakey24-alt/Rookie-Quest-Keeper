import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dices, Minus, Plus, RotateCcw, X, Heart, Shield, Zap, User } from "lucide-react";
import {
  ABILITIES,
  STANDARD_ARRAY,
  POINT_BUY_TOTAL,
  calculatePointBuyCost
} from "../../lib/characterRules";

const theme = {
  bg: { primary: '#0A1628', surface: '#0F2440', elevated: '#14304F' },
  gold: '#D4A017',
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(212, 160, 23, 0.35)',
  borderActive: '#D4A017'
};

const formatAbility = (a) => a.slice(0, 3).toUpperCase();
const formatModifier = (m) => (m >= 0 ? `+${m}` : `${m}`);

const StepHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <Icon size={22} color={theme.gold} />
      <div style={{ fontSize: 22, fontWeight: 800, color: theme.text.primary, letterSpacing: '0.5px' }}>{title}</div>
    </div>
    <div style={{ fontSize: 13, color: theme.text.secondary }}>{subtitle}</div>
  </div>
);

const PreviewStat = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, background: 'rgba(212,160,23,0.06)', border: `1px solid ${theme.border}` }}>
    <Icon size={16} color={theme.gold} />
    <div>
      <div style={{ fontSize: 10, color: theme.text.muted, letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text.primary }}>{value}</div>
    </div>
  </div>
);

const abilityCardStyle = {
  padding: '12px',
  borderRadius: '12px',
  background: 'rgba(15, 36, 64, 0.6)',
  border: `1px solid ${theme.border}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minHeight: 150
};

/**
 * AbilitiesStep
 *
 * Fully interactive ability-score allocation:
 *  - Point Buy: compact [-] value [+] steppers (single step per click, RAW 8-15)
 *  - Standard Array: 6 values in a POOL; drag/drop onto slots; swap between slots; unassign back to pool
 *  - Roll 4d6: cinematic sequential roll (each die animates individually), then same drag/drop assignment
 *
 * Parent keeps owning `stats`; this component just mutates it.
 * For standard/roll methods, unassigned slots hold `null` (so canAdvance blocks Next).
 */
export default function AbilitiesStep({
  method,
  setMethod,
  stats,
  setStats,
  asiBonus,
  classData,
  raceData
}) {
  // --- Internal state for pool + assignment ---
  // dice: array of { id, value } representing the 6 source numbers
  // assignedIds: { ability: id|null } — which die is currently in which slot
  const [dice, setDice] = useState([]);
  const [assignedIds, setAssignedIds] = useState({});
  const [rolling, setRolling] = useState(false);
  const [diceFaces, setDiceFaces] = useState([null, null, null, null, null, null]);
  const [dragPayload, setDragPayload] = useState(null); // { kind: 'pool'|'slot', id }
  const didInitRef = useRef(false);

  // Re-hydrate on mount if we already have stats from a loaded draft / edit-mode
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if ((method === 'standard' || method === 'roll') && ABILITIES.every(a => stats[a] != null && stats[a] !== '')) {
      const source = method === 'standard'
        ? STANDARD_ARRAY
        : ABILITIES.map(a => Number(stats[a]));
      const d = source.map((v, i) => ({ id: `init-${i}`, value: v }));
      setDice(d);
      // Greedy match each ability's current value to an unused die
      const assigned = {};
      const remaining = [...d];
      ABILITIES.forEach(a => {
        const idx = remaining.findIndex(item => item.value === Number(stats[a]));
        if (idx !== -1) {
          assigned[a] = remaining[idx].id;
          remaining.splice(idx, 1);
        } else {
          assigned[a] = null;
        }
      });
      setAssignedIds(assigned);
    }
  }, []); // intentional one-shot init

  // Sync stats from assignedIds when in standard/roll method
  useEffect(() => {
    if (method !== 'standard' && method !== 'roll') return;
    const next = {};
    ABILITIES.forEach(a => {
      const id = assignedIds[a];
      const die = id ? dice.find(d => d.id === id) : null;
      next[a] = die ? die.value : null;
    });
    setStats(prev => {
      // avoid unnecessary updates
      const same = ABILITIES.every(a => prev[a] === next[a]);
      return same ? prev : { ...prev, ...next };
    });
  }, [assignedIds, dice, method, setStats]);

  const pointBuySpent = useMemo(
    () => ABILITIES.reduce((sum, a) => sum + calculatePointBuyCost(stats[a]), 0),
    [stats]
  );
  const pointBuyRemaining = POINT_BUY_TOTAL - pointBuySpent;

  const poolItems = useMemo(() => {
    const assigned = new Set(Object.values(assignedIds).filter(Boolean));
    return dice.filter(d => !assigned.has(d.id));
  }, [dice, assignedIds]);

  // --- Method switch ---
  const initStandard = () => {
    const d = STANDARD_ARRAY.map((v, i) => ({ id: `s-${i}-${Date.now()}`, value: v }));
    setDice(d);
    setAssignedIds({});
  };

  const runRollAnimation = async () => {
    setRolling(true);
    // Pre-compute final rolls
    const finalRolls = [];
    for (let i = 0; i < 6; i++) {
      const d4 = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      d4.sort((x, y) => y - x);
      finalRolls.push(d4[0] + d4[1] + d4[2]);
    }
    const intermediate = [null, null, null, null, null, null];
    setDiceFaces([...intermediate]);
    // Each die rolls sequentially
    for (let i = 0; i < 6; i++) {
      for (let tick = 0; tick < 5; tick++) {
        intermediate[i] = Math.floor(Math.random() * 14) + 3; // 3-16
        setDiceFaces([...intermediate]);
        await new Promise(r => setTimeout(r, 40));
      }
      intermediate[i] = finalRolls[i];
      setDiceFaces([...intermediate]);
      await new Promise(r => setTimeout(r, 80));
    }
    const d = finalRolls.map((v, i) => ({ id: `r-${Date.now()}-${i}`, value: v }));
    setDice(d);
    setAssignedIds({});
    setRolling(false);
  };

  const handleMethod = (nextMethod) => {
    setMethod(nextMethod);
    if (nextMethod === 'point') {
      setDice([]);
      setAssignedIds({});
      setDiceFaces([null, null, null, null, null, null]);
      setStats(ABILITIES.reduce((acc, a) => ({ ...acc, [a]: 8 }), {}));
    } else if (nextMethod === 'standard') {
      setStats(ABILITIES.reduce((acc, a) => ({ ...acc, [a]: null }), {}));
      initStandard();
    } else if (nextMethod === 'roll') {
      setStats(ABILITIES.reduce((acc, a) => ({ ...acc, [a]: null }), {}));
      setDice([]);
      setAssignedIds({});
      runRollAnimation();
    } else if (nextMethod === 'custom') {
      // Manual entry — start at 10s and let the user freely set 1-20 per slot
      setDice([]);
      setAssignedIds({});
      setDiceFaces([null, null, null, null, null, null]);
      setStats(ABILITIES.reduce((acc, a) => ({ ...acc, [a]: 10 }), {}));
    }
  };

  const resetAssignments = () => {
    setAssignedIds({});
    setStats(ABILITIES.reduce((acc, a) => ({ ...acc, [a]: null }), {}));
  };

  // --- Point buy steppers ---
  const decPointBuy = (a) => {
    const current = Number(stats[a]);
    if (current <= 8) return;
    setStats(prev => ({ ...prev, [a]: current - 1 }));
  };
  const incPointBuy = (a) => {
    const current = Number(stats[a]);
    if (current >= 15) return;
    const delta = calculatePointBuyCost(current + 1) - calculatePointBuyCost(current);
    if (pointBuyRemaining - delta < 0) {
      toast.info('Not enough points for that increase.');
      return;
    }
    setStats(prev => ({ ...prev, [a]: current + 1 }));
  };

  // --- Drag & Drop handlers ---
  const onPoolDragStart = (id) => (e) => {
    setDragPayload({ kind: 'pool', id });
    try { e.dataTransfer.setData('text/plain', `pool:${id}`); } catch { /* noop */ }
    e.dataTransfer.effectAllowed = 'move';
  };
  const onSlotDragStart = (ability) => (e) => {
    setDragPayload({ kind: 'slot', ability });
    try { e.dataTransfer.setData('text/plain', `slot:${ability}`); } catch { /* noop */ }
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const dropOnSlot = (targetAbility) => (e) => {
    e.preventDefault();
    if (!dragPayload) return;
    if (dragPayload.kind === 'pool') {
      setAssignedIds(prev => ({ ...prev, [targetAbility]: dragPayload.id }));
    } else if (dragPayload.kind === 'slot') {
      const fromAbility = dragPayload.ability;
      if (fromAbility === targetAbility) { setDragPayload(null); return; }
      setAssignedIds(prev => {
        const next = { ...prev };
        const tmp = next[targetAbility] || null;
        next[targetAbility] = next[fromAbility] || null;
        next[fromAbility] = tmp;
        return next;
      });
    }
    setDragPayload(null);
  };

  const dropOnPool = (e) => {
    e.preventDefault();
    if (!dragPayload || dragPayload.kind !== 'slot') { setDragPayload(null); return; }
    const fromAbility = dragPayload.ability;
    setAssignedIds(prev => ({ ...prev, [fromAbility]: null }));
    setDragPayload(null);
  };

  const unassign = (ability) => {
    setAssignedIds(prev => ({ ...prev, [ability]: null }));
  };

  // --- Derived preview ---
  const finalStats = useMemo(() => {
    const out = {};
    ABILITIES.forEach(a => {
      const base = stats[a];
      out[a] = base != null && base !== '' ? Number(base) + (asiBonus?.[a] || 0) : null;
    });
    return out;
  }, [stats, asiBonus]);

  const allAssigned = ABILITIES.every(a => stats[a] != null && stats[a] !== '');
  const conMod = finalStats.constitution != null ? Math.floor((finalStats.constitution - 10) / 2) : 0;
  const dexMod = finalStats.dexterity != null ? Math.floor((finalStats.dexterity - 10) / 2) : 0;
  const hitDie = classData?.hitDie || 8;
  const derivedHp = Math.max(1, hitDie + conMod);
  const derivedAc = 10 + dexMod;

  return (
    <div>
      <StepHeader icon={Dices} title="Set Ability Scores" subtitle="Pick a method and assign your scores" />

      {/* Method selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'standard', label: 'Standard Array', desc: '15, 14, 13, 12, 10, 8' },
          { key: 'point', label: 'Point Buy', desc: `${POINT_BUY_TOTAL} points to spend` },
          { key: 'roll', label: 'Roll 4d6', desc: 'Drop lowest, randomized' },
          { key: 'custom', label: 'Custom (Manual)', desc: 'For physical dice — 1 to 20, any combo' }
        ].map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => handleMethod(m.key)}
            data-testid={`method-${m.key}`}
            style={{
              flex: 1, minWidth: 160, padding: '10px 12px',
              background: method === m.key ? 'rgba(212,160,23,0.2)' : 'rgba(212, 160, 23, 0.06)',
              border: method === m.key ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`,
              borderRadius: 10, color: theme.text.primary, cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.2s'
            }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Point Buy budget pill */}
      {method === 'point' && (
        <div
          data-testid="point-buy-remaining"
          style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: pointBuyRemaining === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: pointBuyRemaining === 0 ? '#10B981' : '#F59E0B', fontWeight: 700, fontSize: 14,
            border: `1px solid ${pointBuyRemaining === 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
          }}>
          Points: {pointBuySpent} / {POINT_BUY_TOTAL} · {pointBuyRemaining} remaining
        </div>
      )}

      {/* Custom mode info pill */}
      {method === 'custom' && (
        <div
          data-testid="custom-mode-info"
          style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(212, 160, 23, 0.10)',
            color: theme.gold, fontWeight: 700, fontSize: 13,
            border: `1px solid ${theme.border}`
          }}>
          Manual entry — for players who rolled physical dice. Each ability accepts 1-20.
        </div>
      )}

      {/* Roll controls */}
      {method === 'roll' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={runRollAnimation}
            disabled={rolling}
            data-testid="roll-dice-btn"
            style={{
              padding: '10px 16px',
              background: rolling ? 'rgba(212,160,23,0.1)' : 'rgba(212,160,23,0.2)',
              border: `1px solid ${theme.gold}`, borderRadius: 10,
              color: theme.gold, cursor: rolling ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}>
            <Dices size={16} className={rolling ? 'rq-spin' : ''} />
            {rolling ? 'Rolling…' : 'Roll Dice'}
          </button>
          {dice.length > 0 && !rolling && (
            <button
              type="button"
              onClick={resetAssignments}
              data-testid="roll-reset-btn"
              style={{
                padding: '8px 12px', background: 'transparent',
                border: `1px solid ${theme.border}`, borderRadius: 8,
                color: theme.text.secondary, cursor: 'pointer',
                fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
              <RotateCcw size={13} /> Clear assignments
            </button>
          )}
        </div>
      )}

      {/* Roll animation area */}
      {method === 'roll' && rolling && (
        <div
          data-testid="roll-animation"
          style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
            padding: 16, borderRadius: 12,
            background: 'rgba(10, 22, 40, 0.6)',
            border: `2px solid ${theme.gold}`
          }}>
          {diceFaces.map((face, i) => (
            <div key={i} style={{
              width: 56, height: 56, borderRadius: 10,
              background: face != null && i < diceFaces.filter(f => f != null).length - 1
                ? 'rgba(212,160,23,0.25)' : 'rgba(212,160,23,0.1)',
              border: `2px solid ${theme.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: theme.text.primary,
              transition: 'all 0.08s ease'
            }}>
              {face != null ? face : '·'}
            </div>
          ))}
        </div>
      )}

      {/* Pool area for standard/roll */}
      {(method === 'standard' || method === 'roll') && dice.length > 0 && !rolling && (
        <div
          data-testid="score-pool"
          onDragOver={onDragOver}
          onDrop={dropOnPool}
          style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
            minHeight: 72, marginBottom: 16,
            padding: 14, borderRadius: 12,
            background: 'rgba(15, 36, 64, 0.4)',
            border: `2px dashed ${theme.border}`
          }}>
          <div style={{
            fontSize: 10, letterSpacing: 1, fontWeight: 700, color: theme.text.muted,
            textTransform: 'uppercase', marginRight: 4
          }}>
            Pool
          </div>
          {poolItems.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>
              All scores assigned. Drop a slot back here to unassign.
            </div>
          ) : (
            poolItems.map(d => (
              <div
                key={d.id}
                draggable
                onDragStart={onPoolDragStart(d.id)}
                data-testid={`pool-chip-${d.value}`}
                style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: 'rgba(212,160,23,0.15)',
                  border: `2px solid ${theme.gold}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: theme.text.primary,
                  cursor: 'grab', userSelect: 'none',
                  opacity: dragPayload?.kind === 'pool' && dragPayload.id === d.id ? 0.4 : 1
                }}>
                {d.value}
              </div>
            ))
          )}
        </div>
      )}

      {/* Ability slots grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {ABILITIES.map(ability => {
          const base = stats[ability];
          const bonus = (asiBonus?.[ability] || 0);
          const hasValue = base != null && base !== '';
          const finalVal = hasValue ? Number(base) + bonus : null;
          const mod = finalVal != null ? Math.floor((finalVal - 10) / 2) : null;
          const isPrimary = classData?.primaryAbility === ability;

          return (
            <div
              key={ability}
              onDragOver={method !== 'point' ? onDragOver : undefined}
              onDrop={method !== 'point' ? dropOnSlot(ability) : undefined}
              data-testid={`ability-slot-${ability}`}
              style={{
                ...abilityCardStyle,
                border: isPrimary ? `2px solid ${theme.gold}` : `1px solid ${theme.border}`,
                boxShadow: isPrimary ? '0 0 0 2px rgba(212, 160, 23, 0.15)' : 'none'
              }}>
              <div style={{
                fontSize: 11, color: isPrimary ? theme.gold : theme.text.muted,
                letterSpacing: 1, fontWeight: 700
              }}>
                {formatAbility(ability)} {isPrimary && '★'}
              </div>

              {/* Point Buy: steppers */}
              {method === 'point' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => decPointBuy(ability)}
                    disabled={Number(base) <= 8}
                    data-testid={`stat-dec-${ability}`}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: Number(base) <= 8 ? 'rgba(100,116,139,0.1)' : 'rgba(212,160,23,0.15)',
                      border: `1px solid ${Number(base) <= 8 ? 'rgba(100,116,139,0.3)' : theme.gold}`,
                      color: Number(base) <= 8 ? theme.text.muted : theme.gold,
                      cursor: Number(base) <= 8 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800
                    }}>
                    <Minus size={16} />
                  </button>
                  <div
                    data-testid={`ability-${ability}`}
                    style={{
                      minWidth: 40, textAlign: 'center',
                      fontSize: 24, fontWeight: 800, color: theme.text.primary
                    }}>
                    {base}
                  </div>
                  <button
                    type="button"
                    onClick={() => incPointBuy(ability)}
                    disabled={
                      Number(base) >= 15 ||
                      (pointBuyRemaining -
                        (calculatePointBuyCost(Number(base) + 1) - calculatePointBuyCost(Number(base)))
                      ) < 0
                    }
                    data-testid={`stat-inc-${ability}`}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(212,160,23,0.15)',
                      border: `1px solid ${theme.gold}`,
                      color: theme.gold,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800
                    }}>
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Custom mode: free 1-20 input + steppers */}
              {method === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(base) || 1;
                      if (cur > 1) setStats(prev => ({ ...prev, [ability]: cur - 1 }));
                    }}
                    disabled={Number(base) <= 1}
                    data-testid={`stat-dec-${ability}`}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: Number(base) <= 1 ? 'rgba(100,116,139,0.1)' : 'rgba(212,160,23,0.15)',
                      border: `1px solid ${Number(base) <= 1 ? 'rgba(100,116,139,0.3)' : theme.gold}`,
                      color: Number(base) <= 1 ? theme.text.muted : theme.gold,
                      cursor: Number(base) <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800
                    }}>
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={base ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setStats(prev => ({ ...prev, [ability]: '' }));
                        return;
                      }
                      const n = Math.max(1, Math.min(20, parseInt(raw, 10) || 1));
                      setStats(prev => ({ ...prev, [ability]: n }));
                    }}
                    data-testid={`ability-${ability}`}
                    style={{
                      width: 56, padding: '6px 4px',
                      background: 'rgba(15, 36, 64, 0.8)', border: `1px solid ${theme.border}`,
                      borderRadius: 8, color: theme.text.primary,
                      fontSize: 22, fontWeight: 800, textAlign: 'center', outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(base) || 0;
                      if (cur < 20) setStats(prev => ({ ...prev, [ability]: cur + 1 }));
                    }}
                    disabled={Number(base) >= 20}
                    data-testid={`stat-inc-${ability}`}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: Number(base) >= 20 ? 'rgba(100,116,139,0.1)' : 'rgba(212,160,23,0.15)',
                      border: `1px solid ${Number(base) >= 20 ? 'rgba(100,116,139,0.3)' : theme.gold}`,
                      color: Number(base) >= 20 ? theme.text.muted : theme.gold,
                      cursor: Number(base) >= 20 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800
                    }}>
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Standard/Roll: dice chip slot */}
              {(method === 'standard' || method === 'roll') && (
                hasValue ? (
                  <div
                    draggable
                    onDragStart={onSlotDragStart(ability)}
                    data-testid={`slot-chip-${ability}`}
                    style={{
                      position: 'relative',
                      width: 56, height: 56, borderRadius: 10,
                      background: 'rgba(212,160,23,0.22)',
                      border: `2px solid ${theme.gold}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 800, color: theme.text.primary,
                      cursor: 'grab', userSelect: 'none',
                      opacity: dragPayload?.kind === 'slot' && dragPayload.ability === ability ? 0.4 : 1
                    }}>
                    {base}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); unassign(ability); }}
                      data-testid={`slot-clear-${ability}`}
                      aria-label={`Clear ${ability}`}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 20, height: 20, borderRadius: '50%',
                        background: theme.bg.primary,
                        border: `1px solid ${theme.border}`,
                        color: theme.text.secondary, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0
                      }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    data-testid={`slot-empty-${ability}`}
                    style={{
                      width: 56, height: 56, borderRadius: 10,
                      background: 'rgba(15, 36, 64, 0.6)',
                      border: `2px dashed ${theme.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: theme.text.muted, textAlign: 'center', padding: 4
                    }}>
                    Drop
                  </div>
                )
              )}

              {/* ASI bonus + modifier */}
              {hasValue && bonus !== 0 && (
                <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                  +{bonus} = {finalVal}
                </div>
              )}
              {hasValue && (
                <div style={{ fontSize: 15, fontWeight: 800, color: mod >= 0 ? theme.gold : '#EF4444' }}>
                  {formatModifier(mod)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live combat preview */}
      {classData && (
        <div style={{
          marginTop: 20, padding: 14, borderRadius: 12,
          background: 'rgba(15, 36, 64, 0.5)', border: `1px solid ${theme.border}`
        }}>
          <div style={{
            fontSize: 12, color: theme.text.muted, marginBottom: 10,
            letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700
          }}>
            Level 1 Combat Preview {!allAssigned && <span style={{ color: '#F59E0B', textTransform: 'none' }}>· complete assignments to finalize</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <PreviewStat icon={Heart} label="HP" value={allAssigned ? derivedHp : '—'} />
            <PreviewStat icon={Shield} label="AC" value={allAssigned ? derivedAc : '—'} />
            <PreviewStat icon={Zap} label="Init" value={allAssigned ? formatModifier(dexMod) : '—'} />
            <PreviewStat icon={User} label="Speed" value={`${raceData?.speed || 30}ft`} />
          </div>
        </div>
      )}

      {/* Spin keyframes */}
      <style>{`
        @keyframes rqSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rq-spin { animation: rqSpin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
