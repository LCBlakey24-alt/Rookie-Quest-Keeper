import React from 'react';

import NumberWheelPicker from '@/components/common/NumberWheelPicker';
import HealthArcWidget from './HealthArcWidget';

export default function CleanSheetVitals({
  currentHp,
  maxHp,
  hpAmount,
  tempHp,
  tempHpAmount,
  savingHp,
  savingTempHp,
  hitDice,
  hitDiceRemaining,
  hitDiceTotal,
  onHpAmountChange,
  onTempHpAmountChange,
  onDamage,
  onHeal,
  onRemoveTempHp,
  onAddTempHp,
  onSpendHitDie,
}) {
  const hasHitDice = hitDice !== undefined || hitDiceRemaining !== undefined || hitDiceTotal !== undefined || Boolean(onSpendHitDie);
  const hitDieMatch = String(hitDice || '').match(/(\d+)d(\d+)/i);
  const parsedTotal = hitDieMatch ? Number(hitDieMatch[1]) || undefined : undefined;
  const parsedSides = hitDieMatch ? Number(hitDieMatch[2]) || undefined : undefined;
  const totalDice = hitDiceTotal ?? parsedTotal;
  const hitDiceDisplay = hitDiceRemaining !== undefined && totalDice !== undefined
    ? `${hitDiceRemaining} / ${totalDice}`
    : hitDiceRemaining !== undefined
      ? hitDiceRemaining
      : '—';
  const hitDieLabel = parsedSides ? `d${parsedSides}` : '';
  const hpWheelMax = Math.max(20, Number(maxHp || 0) + Number(tempHp || 0) + 20, 999);
  const tempHpWheelMax = Math.max(20, Number(tempHp || 0) + 20, 999);

  return (
    <section className="clean-sheet-vitals clean-sheet-vitals--arc">
      <div className="clean-sheet-hp-card clean-sheet-hp-card--arc">
        <HealthArcWidget currentHp={currentHp} maxHp={maxHp} tempHp={tempHp} />

        <div className={`rq-hp-action-grid ${hasHitDice ? '' : 'rq-hp-action-grid--two'}`} aria-label="Health actions">
          <div className="rq-hp-action-panel rq-hp-action-panel--health">
            <span className="rq-hp-action-panel__title">HP</span>
            <button className="rq-hp-action-button rq-hp-action-button--plus" onClick={onHeal} disabled={savingHp}>Heal</button>
            <NumberWheelPicker
              value={hpAmount || 1}
              min={1}
              max={hpWheelMax}
              compact
              label="Amount"
              disabled={savingHp}
              onChange={(nextValue) => onHpAmountChange(String(nextValue))}
            />
            <button className="rq-hp-action-button rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>Damage</button>
          </div>

          <div className="rq-hp-action-panel rq-hp-action-panel--temp">
            <span className="rq-hp-action-panel__title">Temp HP</span>
            <button className="rq-hp-action-button rq-hp-action-button--temp-plus" onClick={onAddTempHp} disabled={savingTempHp}>Add</button>
            <NumberWheelPicker
              value={tempHpAmount || 1}
              min={1}
              max={tempHpWheelMax}
              compact
              label="Amount"
              disabled={savingTempHp}
              onChange={(nextValue) => onTempHpAmountChange(String(nextValue))}
            />
            <button className="rq-hp-action-button rq-hp-action-button--temp-minus" onClick={onRemoveTempHp} disabled={savingTempHp || tempHp <= 0}>Remove</button>
          </div>

          {hasHitDice && (
            <div className="rq-hp-action-panel rq-hp-action-panel--dice">
              <span className="rq-hp-action-panel__title">Hit Dice</span>
              <button className="rq-hp-action-button rq-hp-action-button--dice" onClick={onSpendHitDie} disabled={!onSpendHitDie || !hitDiceRemaining}>Use Die</button>
              <strong className="rq-hp-hitdice-count">
                {hitDiceDisplay}
                {hitDieLabel && <em>{hitDieLabel}</em>}
              </strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
