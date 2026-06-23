import React from 'react';
import { Moon } from 'lucide-react';

import HealthArcWidget from './HealthArcWidget';

export default function CleanSheetVitals({
  currentHp,
  maxHp,
  hpAmount,
  tempHp,
  tempHpAmount,
  savingHp,
  savingTempHp,
  hitDiceRemaining,
  hitDiceTotal,
  onHpAmountChange,
  onTempHpAmountChange,
  onDamage,
  onHeal,
  onRemoveTempHp,
  onAddTempHp,
  onSpendHitDie,
  onShortRest,
}) {
  const hitDiceDisplay = hitDiceRemaining !== undefined && hitDiceTotal !== undefined
    ? `${hitDiceRemaining} / ${hitDiceTotal}`
    : hitDiceRemaining !== undefined
      ? hitDiceRemaining
      : '—';

  return (
    <section className="clean-sheet-vitals clean-sheet-vitals--arc">
      <div className="clean-sheet-hp-card clean-sheet-hp-card--arc">
        <HealthArcWidget currentHp={currentHp} maxHp={maxHp} tempHp={tempHp} />

        <div className="rq-hp-action-grid" aria-label="Health actions">
          <div className="rq-hp-action-panel rq-hp-action-panel--health">
            <span className="rq-hp-action-panel__title">Heal / HP</span>
            <button className="rq-hp-action-button rq-hp-action-button--plus" onClick={onHeal} disabled={savingHp}>Heal</button>
            <input
              type="number"
              min="1"
              max="999"
              value={hpAmount}
              onChange={(event) => onHpAmountChange(event.target.value)}
              aria-label="HP amount"
            />
            <button className="rq-hp-action-button rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>Damage</button>
          </div>

          <div className="rq-hp-action-panel rq-hp-action-panel--temp">
            <span className="rq-hp-action-panel__title">Temp HP</span>
            <button className="rq-hp-action-button rq-hp-action-button--temp-plus" onClick={onAddTempHp} disabled={savingTempHp}>Temp +</button>
            <input
              type="number"
              min="1"
              max="999"
              value={tempHpAmount}
              onChange={(event) => onTempHpAmountChange(event.target.value)}
              aria-label="Temporary HP amount"
            />
            <button className="rq-hp-action-button rq-hp-action-button--temp-minus" onClick={onRemoveTempHp} disabled={savingTempHp || tempHp <= 0}>Temp -</button>
          </div>

          <div className="rq-hp-action-panel rq-hp-action-panel--dice">
            <span className="rq-hp-action-panel__title">Hit Dice</span>
            <button className="rq-hp-action-button rq-hp-action-button--dice" onClick={onSpendHitDie} disabled={!onSpendHitDie || !hitDiceRemaining}>Use Die</button>
            <strong className="rq-hp-hitdice-count">{hitDiceDisplay}</strong>
            <button className="rq-hp-action-button rq-hp-action-button--rest" onClick={onShortRest} disabled={!onShortRest}><Moon size={15} /> Short Rest</button>
          </div>
        </div>
      </div>
    </section>
  );
}
