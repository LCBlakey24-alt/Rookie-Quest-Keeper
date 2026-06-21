import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dices, Heart, Minus, Plus, RotateCcw, Shield, User, Zap } from 'lucide-react';
import { ABILITIES, STANDARD_ARRAY, POINT_BUY_TOTAL, calculatePointBuyCost } from '../../lib/characterRules';

const theme = {
  bg: { primary: '#0B0B0C', surface: '#141414', elevated: '#1F1F23' },
  red: '#EF4444',
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(255,255,255,0.12)',
  redBorder: 'rgba(239,68,68,0.36)'
};

const formatAbility = (ability) => ability.slice(0, 3).toUpperCase();
const formatModifier = (value) => (value >= 0 ? `+${value}` : `${value}`);

const makePool = (values, prefix) => values.map((value, index) => ({ id: `${prefix}-${Date.now()}-${index}`, value }));

function StepHeader() {
  return (
    <div className="ability-step-header">
      <div><Dices size={22} color={theme.red} /><strong>Set Ability Scores</strong></div>
      <p>Choose a method, then assign your scores. Standard Array and Rolled Scores support tap-to-assign.</p>
    </div>
  );
}

function PreviewStat({ icon: Icon, label, value }) {
  return (
    <div className="ability-preview-stat">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function AbilitiesStepTap({ method, setMethod, stats, setStats, asiBonus, classData, raceData }) {
  const [pool, setPool] = useState([]);
  const [assigned, setAssigned] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [rollingFaces, setRollingFaces] = useState([]);

  const assignedIds = useMemo(() => new Set(Object.values(assigned).filter(Boolean)), [assigned]);
  const poolItems = pool.filter(item => !assignedIds.has(item.id));

  useEffect(() => {
    if (method !== 'standard' && method !== 'roll') return;
    const next = {};
    ABILITIES.forEach(ability => {
      const found = pool.find(item => item.id === assigned[ability]);
      next[ability] = found ? found.value : null;
    });
    setStats(prev => {
      const same = ABILITIES.every(ability => prev[ability] === next[ability]);
      return same ? prev : { ...prev, ...next };
    });
  }, [assigned, pool, method, setStats]);

  const initStandard = () => {
    setPool(makePool(STANDARD_ARRAY, 'standard'));
    setAssigned({});
    setSelectedId(null);
    setStats(ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: null }), {}));
  };

  const rollScores = (scores) => {
    const values = scores || Array.from({ length: 6 }, () => {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
      return rolls[0] + rolls[1] + rolls[2];
    });
    setPool(makePool(values, 'roll'));
    setAssigned({});
    setSelectedId(null);
    setStats(ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: null }), {}));
  };

  const runRollAnimation = async () => {
    if (rolling) return;
    setRolling(true);
    setPool([]);
    setAssigned({});
    setSelectedId(null);
    setStats(ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: null }), {}));

    const scores = Array.from({ length: 6 }, () => {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
      return rolls[0] + rolls[1] + rolls[2];
    }).sort((a, b) => a - b);

    const faces = Array.from({ length: scores.length }, () => null);
    setRollingFaces(faces);

    for (let i = 0; i < scores.length; i += 1) {
      for (let value = 1; value <= scores[i]; value += 1) {
        faces[i] = value;
        setRollingFaces([...faces]);
        await new Promise(resolve => setTimeout(resolve, value === scores[i] ? 80 : 28));
      }
    }

    rollScores(scores);
    setRolling(false);
  };

  const handleMethod = (nextMethod) => {
    setMethod(nextMethod);
    setSelectedId(null);
    if (nextMethod === 'point') {
      setPool([]);
      setAssigned({});
      setStats(ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: 8 }), {}));
    } else if (nextMethod === 'custom') {
      setPool([]);
      setAssigned({});
      setStats(ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: 10 }), {}));
    } else if (nextMethod === 'standard') {
      initStandard();
    } else if (nextMethod === 'roll') {
      runRollAnimation();
    }
  };

  const assignSelectedTo = (ability) => {
    if (!selectedId) return;
    setAssigned(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key] === selectedId) next[key] = null;
      });
      next[ability] = selectedId;
      return next;
    });
    setSelectedId(null);
  };

  const pickAssigned = (ability) => {
    const id = assigned[ability];
    if (!id) {
      assignSelectedTo(ability);
      return;
    }
    setAssigned(prev => ({ ...prev, [ability]: null }));
    setSelectedId(id);
  };

  const resetAssignments = () => {
    setAssigned({});
    setSelectedId(null);
    setStats(ABILITIES.reduce((acc, ability) => ({ ...acc, [ability]: null }), {}));
  };

  const pointBuySpent = useMemo(() => ABILITIES.reduce((sum, ability) => sum + calculatePointBuyCost(stats[ability]), 0), [stats]);
  const pointBuyRemaining = POINT_BUY_TOTAL - pointBuySpent;

  const changePointBuy = (ability, delta) => {
    const current = Number(stats[ability]);
    const next = current + delta;
    if (next < 8 || next > 15) return;
    if (delta > 0) {
      const cost = calculatePointBuyCost(next) - calculatePointBuyCost(current);
      if (pointBuyRemaining - cost < 0) {
        toast.info('Not enough points for that increase.');
        return;
      }
    }
    setStats(prev => ({ ...prev, [ability]: next }));
  };

  const changeCustom = (ability, value) => {
    const next = Math.max(1, Math.min(20, Number(value) || 1));
    setStats(prev => ({ ...prev, [ability]: next }));
  };

  const finalStats = useMemo(() => {
    const out = {};
    ABILITIES.forEach(ability => {
      const base = stats[ability];
      out[ability] = base !== null && base !== '' && base !== undefined ? Number(base) + (asiBonus?.[ability] || 0) : null;
    });
    return out;
  }, [stats, asiBonus]);

  const allAssigned = ABILITIES.every(ability => stats[ability] !== null && stats[ability] !== '' && stats[ability] !== undefined);
  const conMod = finalStats.constitution != null ? Math.floor((finalStats.constitution - 10) / 2) : 0;
  const dexMod = finalStats.dexterity != null ? Math.floor((finalStats.dexterity - 10) / 2) : 0;
  const derivedHp = Math.max(1, (classData?.hitDie || 8) + conMod);
  const derivedAc = 10 + dexMod;

  return (
    <div className="ability-step-tap">
      <StepHeader />

      <div className="ability-method-grid">
        {[
          ['standard', 'Standard Array', '15, 14, 13, 12, 10, 8'],
          ['point', 'Point Buy', `${POINT_BUY_TOTAL} points to spend`],
          ['roll', 'Roll 4d6', 'Drop lowest, randomized'],
          ['custom', 'Custom Manual', 'Enter your own scores'],
        ].map(([key, label, desc]) => (
          <button key={key} type="button" className={method === key ? 'active' : ''} onClick={() => handleMethod(key)}>
            <strong>{label}</strong><span>{desc}</span>
          </button>
        ))}
      </div>

      {method === 'point' && <div className="ability-budget">Points: {pointBuySpent} / {POINT_BUY_TOTAL} · {pointBuyRemaining} remaining</div>}
      {method === 'custom' && <div className="ability-budget">Manual entry accepts scores from 1 to 20.</div>}

      {(method === 'standard' || method === 'roll') && (
        <>
          <div className="ability-pool-header">
            <span>{rolling ? 'Rolling scores...' : selectedId ? 'Tap an ability to assign selected score' : 'Tap a score, then tap an ability'}</span>
            <button type="button" onClick={method === 'roll' ? runRollAnimation : resetAssignments} disabled={rolling}><RotateCcw size={14} /> {method === 'roll' ? (rolling ? 'Rolling…' : 'Reroll') : 'Reset'}</button>
          </div>

          {method === 'roll' && rolling && (
            <div className="ability-roll-animation" data-testid="ability-roll-animation">
              {rollingFaces.map((face, index) => (
                <span key={index} className={face == null ? '' : 'active'}>{face ?? '·'}</span>
              ))}
            </div>
          )}
          <div className="ability-score-pool">
            {poolItems.map(item => (
              <button key={item.id} type="button" className={selectedId === item.id ? 'selected' : ''} onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}>
                {item.value}
              </button>
            ))}
            {poolItems.length === 0 && <p>All scores assigned. Tap an assigned score to move it.</p>}
          </div>
        </>
      )}

      <div className="ability-score-grid">
        {ABILITIES.map(ability => {
          const base = stats[ability];
          const bonus = asiBonus?.[ability] || 0;
          const finalValue = finalStats[ability];
          const modifier = finalValue != null ? Math.floor((finalValue - 10) / 2) : null;
          const assignedItem = pool.find(item => item.id === assigned[ability]);
          const isPrimary = classData?.primaryAbility === ability;

          return (
            <div key={ability} className={`ability-score-card ${isPrimary ? 'primary' : ''}`}>
              <span>{formatAbility(ability)} {isPrimary ? '★' : ''}</span>

              {method === 'point' && (
                <div className="ability-stepper">
                  <button type="button" onClick={() => changePointBuy(ability, -1)} disabled={Number(base) <= 8}><Minus size={16} /></button>
                  <strong>{base}</strong>
                  <button type="button" onClick={() => changePointBuy(ability, 1)} disabled={Number(base) >= 15}><Plus size={16} /></button>
                </div>
              )}

              {method === 'custom' && (
                <input type="number" min="1" max="20" value={base ?? ''} onChange={(e) => changeCustom(ability, e.target.value)} />
              )}

              {(method === 'standard' || method === 'roll') && (
                <button type="button" className={`ability-assignment ${assignedItem ? 'filled' : ''}`} onClick={() => pickAssigned(ability)}>
                  {assignedItem ? assignedItem.value : selectedId ? 'Assign' : 'Tap score'}
                </button>
              )}

              {bonus !== 0 && finalValue != null && <em>+{bonus} = {finalValue}</em>}
              {modifier != null && <strong className="ability-modifier">{formatModifier(modifier)}</strong>}
            </div>
          );
        })}
      </div>

      {classData && (
        <div className="ability-preview">
          <span>Level 1 Combat Preview {!allAssigned ? '· complete scores to finalize' : ''}</span>
          <div>
            <PreviewStat icon={Heart} label="HP" value={allAssigned ? derivedHp : '—'} />
            <PreviewStat icon={Shield} label="AC" value={allAssigned ? derivedAc : '—'} />
            <PreviewStat icon={Zap} label="Init" value={allAssigned ? formatModifier(dexMod) : '—'} />
            <PreviewStat icon={User} label="Speed" value={`${raceData?.speed || 30}ft`} />
          </div>
        </div>
      )}
    </div>
  );
}
