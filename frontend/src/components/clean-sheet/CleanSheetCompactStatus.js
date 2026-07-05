import React from 'react';
import { Footprints, HeartPulse, Shield, Swords } from 'lucide-react';
import { fmt } from './cleanSheetUtils';
import './CleanSheetMobileTidyFixes.css';
import './CleanSheetActionsMobileOverrides.css';
import './CleanSheetFinalHammer.css';

const HP_AMOUNT_OPTIONS = Array.from({ length: 99 }, (_, index) => index + 1);

export default function CleanSheetCompactStatus({
  currentHp,
  maxHp,
  tempHp,
  hpAmount,
  tempHpAmount,
  savingHp,
  savingTempHp,
  ac,
  speed,
  initiative,
  onHpAmountChange,
  onTempHpAmountChange,
  onDamage,
  onHeal,
  onTempHpAdd,
  onTempHpRemove,
  onRollInitiative,
}) {
  const amount = Math.max(1, Number(hpAmount) || 1);
  const tempAmount = Math.max(1, Number(tempHpAmount || hpAmount) || 1);
  const currentTempHp = Math.max(0, Number(tempHp) || 0);

  return (
    <section className="clean-sheet-compact-status clean-sheet-compact-status--battle-bar" aria-label="Character combat snapshot">
      <div className="clean-sheet-compact-stat clean-sheet-compact-stat--hp">
        <span><HeartPulse size={15} /> HP</span>
        <strong>{currentHp}/{maxHp}</strong>
        <em>Temp {currentTempHp}</em>
      </div>

      <div className="clean-sheet-quick-stat-strip" aria-label="Always visible combat stats">
        <div className="clean-sheet-quick-stat">
          <Shield size={14} />
          <span>AC</span>
          <strong>{ac ?? '—'}</strong>
        </div>
        <div className="clean-sheet-quick-stat">
          <Footprints size={14} />
          <span>Speed</span>
          <strong>{speed ? `${speed}ft` : '—'}</strong>
        </div>
        <button type="button" className="clean-sheet-quick-stat clean-sheet-quick-stat--rollable" onClick={onRollInitiative}>
          <Swords size={14} />
          <span>Init</span>
          <strong>{initiative !== undefined ? fmt(initiative) : '—'}</strong>
        </button>
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
        <button type="button" className="rq-temp-hp-action-button--minus" onClick={onTempHpRemove} disabled={savingTempHp || currentTempHp <= 0 || tempAmount <= 0}>Temp -</button>
        <button type="button" className="rq-temp-hp-action-button--plus" onClick={onTempHpAdd} disabled={savingTempHp}>Temp +</button>
      </div>
    </section>
  );
}
