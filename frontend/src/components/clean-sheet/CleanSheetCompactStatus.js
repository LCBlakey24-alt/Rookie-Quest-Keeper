import React from 'react';
import { HeartPulse } from 'lucide-react';

const HP_AMOUNT_OPTIONS = Array.from({ length: 99 }, (_, index) => index + 1);

export default function CleanSheetCompactStatus({
  currentHp,
  maxHp,
  tempHp,
  hpAmount,
  savingHp,
  onHpAmountChange,
  onDamage,
  onHeal,
}) {
  return (
    <section className="clean-sheet-compact-status clean-sheet-compact-status--hp-only" aria-label="Character hit points">
      <div className="clean-sheet-compact-stat clean-sheet-compact-stat--hp">
        <span><HeartPulse size={15} /> HP</span>
        <strong>{currentHp}/{maxHp}</strong>
        {tempHp > 0 && <em>+{tempHp} temp</em>}
      </div>

      <div className="clean-sheet-compact-hp-actions">
        <label className="clean-sheet-hp-wheel">
          <span>Amount</span>
          <select
            value={Math.max(1, Number(hpAmount) || 1)}
            aria-label="HP amount"
            onChange={(event) => onHpAmountChange(Number(event.target.value))}
          >
            {HP_AMOUNT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button type="button" className="rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>Damage</button>
        <button type="button" className="rq-hp-action-button--plus" onClick={onHeal} disabled={savingHp}>Heal</button>
      </div>
    </section>
  );
}
