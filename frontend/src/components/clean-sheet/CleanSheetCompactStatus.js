import React from 'react';
import { HeartPulse } from 'lucide-react';
import './CleanSheetMobileTidyFixes.css';

const HP_AMOUNT_OPTIONS = Array.from({ length: 99 }, (_, index) => index + 1);

export default function CleanSheetCompactStatus({
  currentHp,
  maxHp,
  tempHp,
  hpAmount,
  tempHpAmount,
  savingHp,
  savingTempHp,
  onHpAmountChange,
  onTempHpAmountChange,
  onDamage,
  onHeal,
  onTempHpAdd,
  onTempHpRemove,
}) {
  const amount = Math.max(1, Number(hpAmount) || 1);
  const tempAmount = Math.max(1, Number(tempHpAmount || hpAmount) || 1);

  return (
    <section className="clean-sheet-compact-status clean-sheet-compact-status--hp-only" aria-label="Character hit points">
      <div className="clean-sheet-compact-stat clean-sheet-compact-stat--hp">
        <span><HeartPulse size={15} /> HP</span>
        <strong>{currentHp}/{maxHp}</strong>
        <em>Temp {Math.max(0, Number(tempHp) || 0)}</em>
      </div>

      <div className="clean-sheet-compact-hp-actions">
        <select
          className="clean-sheet-hp-amount-select"
          value={amount}
          aria-label="HP amount"
          title="HP amount"
          onChange={(event) => {
            const nextAmount = Number(event.target.value);
            onHpAmountChange(nextAmount);
            if (onTempHpAmountChange) onTempHpAmountChange(nextAmount);
          }}
        >
          {HP_AMOUNT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <button type="button" className="rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>Damage</button>
        <button type="button" className="rq-hp-action-button--plus" onClick={onHeal} disabled={savingHp}>Heal</button>
        <button type="button" className="rq-temp-hp-action-button--minus" onClick={onTempHpRemove} disabled={savingTempHp || tempAmount <= 0}>Temp -</button>
        <button type="button" className="rq-temp-hp-action-button--plus" onClick={onTempHpAdd} disabled={savingTempHp}>Temp +</button>
      </div>
    </section>
  );
}
