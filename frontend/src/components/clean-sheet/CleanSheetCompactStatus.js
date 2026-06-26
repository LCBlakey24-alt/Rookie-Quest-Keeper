import React from 'react';
import { HeartPulse, Shield, Zap } from 'lucide-react';

export default function CleanSheetCompactStatus({
  currentHp,
  maxHp,
  tempHp,
  hpAmount,
  ac,
  speed,
  savingHp,
  onHpAmountChange,
  onDamage,
  onHeal,
}) {
  return (
    <section className="clean-sheet-compact-status" aria-label="Character quick status">
      <div className="clean-sheet-compact-stat clean-sheet-compact-stat--hp">
        <span><HeartPulse size={15} /> HP</span>
        <strong>{currentHp}/{maxHp}</strong>
        {tempHp > 0 && <em>+{tempHp} temp</em>}
      </div>

      <div className="clean-sheet-compact-stat">
        <span><Shield size={15} /> AC</span>
        <strong>{ac}</strong>
      </div>

      <div className="clean-sheet-compact-stat">
        <span><Zap size={15} /> Speed</span>
        <strong>{speed}ft</strong>
      </div>

      <div className="clean-sheet-compact-hp-actions">
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={hpAmount || 1}
          aria-label="HP amount"
          onChange={(event) => onHpAmountChange(event.target.value)}
        />
        <button type="button" className="rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>Damage</button>
        <button type="button" className="rq-hp-action-button--plus" onClick={onHeal} disabled={savingHp}>Heal</button>
      </div>
    </section>
  );
}
