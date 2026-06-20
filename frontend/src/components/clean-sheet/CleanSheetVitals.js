import React from 'react';
import { Dices, Heart, Shield, User, Zap } from 'lucide-react';

import { fmt } from './cleanSheetUtils';
import { StatCard } from './CleanSheetCommon';

export default function CleanSheetVitals({
  currentHp,
  maxHp,
  hpPercent,
  hpAmount,
  tempHp,
  tempHpAmount,
  ac,
  dexMod,
  proficiencyBonus,
  speed,
  savingHp,
  savingTempHp,
  onHpAmountChange,
  onTempHpAmountChange,
  onDamage,
  onHeal,
  onRemoveTempHp,
  onAddTempHp,
  onRollInitiative,
}) {
  return (
    <section className="clean-sheet-vitals">
      <div className="clean-sheet-hp-card">
        <div className="clean-sheet-hp-top">
          <span><Heart size={18} /> HP</span>
          <strong>{currentHp}/{maxHp}</strong>
        </div>
        <div className="clean-sheet-hp-bar"><div style={{ width: `${hpPercent}%` }} /></div>
        <div className="clean-sheet-hp-bulk-row">
          <input
            type="number"
            min="1"
            max="999"
            value={hpAmount}
            onChange={(event) => onHpAmountChange(event.target.value)}
            aria-label="HP amount"
          />
          <button onClick={onDamage} disabled={savingHp}>Damage</button>
          <button onClick={onHeal} disabled={savingHp}>Heal</button>
        </div>
        <div className="clean-sheet-temp-hp-row clean-sheet-temp-hp-bulk-row">
          <span>Temp HP</span>
          <strong>{tempHp}</strong>
          <input
            type="number"
            min="1"
            max="999"
            value={tempHpAmount}
            onChange={(event) => onTempHpAmountChange(event.target.value)}
            aria-label="Temporary HP amount"
          />
          <button onClick={onRemoveTempHp} disabled={savingTempHp || tempHp <= 0}>Remove</button>
          <button onClick={onAddTempHp} disabled={savingTempHp}>Add</button>
        </div>
      </div>
      <StatCard icon={Shield} label="AC" value={ac} />
      <StatCard icon={Zap} label="Initiative" value={fmt(dexMod)} onClick={onRollInitiative} />
      <StatCard icon={Dices} label="Proficiency" value={fmt(proficiencyBonus)} />
      <StatCard icon={User} label="Speed" value={`${speed}ft`} />
    </section>
  );
}
