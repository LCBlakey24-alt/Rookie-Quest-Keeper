import React from 'react';
import { Dices, Moon, Shield, User, Zap } from 'lucide-react';

import HealthArcWidget from './HealthArcWidget';
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
  onShortRest,
  onRollInitiative,
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
            <button className="rq-hp-action-button rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>HP -</button>
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
      <StatCard icon={Shield} label="AC" value={ac} />
      <StatCard icon={Zap} label="Initiative" value={fmt(dexMod)} onClick={onRollInitiative} />
      <StatCard icon={Dices} label="Proficiency" value={fmt(proficiencyBonus)} />
      <StatCard icon={User} label="Speed" value={`${speed}ft`} />
    </section>
  );
}
