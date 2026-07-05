import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Footprints, HeartPulse, Moon, Shield, Sparkles, Swords, Sun } from 'lucide-react';

import apiClient from '@/lib/apiClient';
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
  savingQuickState,
  hasInspiration,
  inspirationLabel = 'Inspiration',
  ac,
  speed,
  initiative,
  onHpAmountChange,
  onTempHpAmountChange,
  onDamage,
  onHeal,
  onTempHpAdd,
  onTempHpRemove,
  onToggleInspiration,
  onShortRest,
  onLongRest,
  onRollInitiative,
}) {
  const { characterId } = useParams();
  const amount = Math.max(1, Number(hpAmount) || 1);
  const tempAmount = Math.max(1, Number(tempHpAmount || hpAmount) || 1);
  const currentTempHp = Math.max(0, Number(tempHp) || 0);
  const safeMaxHp = Math.max(1, Number(maxHp) || 1);
  const safeCurrentHp = Math.max(0, Math.min(safeMaxHp, Number(currentHp) || 0));
  const hpPercent = Math.max(0, Math.min(100, Math.round((safeCurrentHp / safeMaxHp) * 100)));
  const hpState = hpPercent <= 25 ? 'critical' : hpPercent <= 50 ? 'hurt' : 'healthy';
  const [localInspiration, setLocalInspiration] = useState(Boolean(hasInspiration));
  const [savingLocalAction, setSavingLocalAction] = useState(false);
  const inspirationActive = hasInspiration === undefined ? localInspiration : Boolean(hasInspiration);
  const actionsDisabled = Boolean(savingQuickState || savingLocalAction);

  useEffect(() => {
    if (hasInspiration !== undefined) {
      setLocalInspiration(Boolean(hasInspiration));
    }
  }, [hasInspiration]);

  useEffect(() => {
    if (hasInspiration !== undefined || !characterId) return undefined;
    let cancelled = false;
    apiClient.get(`/characters/${characterId}`).then((response) => {
      const nextCharacter = response.data?.character || response.data;
      if (!cancelled) setLocalInspiration(Boolean(nextCharacter?.inspiration || nextCharacter?.has_inspiration));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [characterId, hasInspiration]);

  const handleToggleInspiration = async () => {
    if (onToggleInspiration) {
      onToggleInspiration();
      return;
    }
    if (!characterId || savingLocalAction) return;
    const nextValue = !inspirationActive;
    setSavingLocalAction(true);
    setLocalInspiration(nextValue);
    try {
      await apiClient.patch(`/characters/${characterId}`, { inspiration: nextValue, has_inspiration: nextValue });
      toast.success(nextValue ? `${inspirationLabel} gained` : `${inspirationLabel} removed`);
    } catch (error) {
      setLocalInspiration(!nextValue);
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not update ${inspirationLabel.toLowerCase()}`);
    } finally {
      setSavingLocalAction(false);
    }
  };

  const handleRest = async (restType) => {
    const restLabel = restType === 'long' ? 'Long Rest' : 'Short Rest';
    const confirmMessage = restType === 'long'
      ? 'Take a Long Rest? This may restore HP, reset temporary HP, restore spell slots/resources, reset death saves, and recover hit dice where the sheet supports it.'
      : 'Take a Short Rest? This may restore short-rest resources and allow hit dice recovery where the sheet supports it.';
    const externalHandler = restType === 'long' ? onLongRest : onShortRest;

    if (!window.confirm(confirmMessage)) return;
    if (externalHandler) {
      externalHandler();
      return;
    }
    if (!characterId || savingLocalAction) return;

    setSavingLocalAction(true);
    try {
      const endpoint = restType === 'long' ? 'long-rest' : 'short-rest';
      await apiClient.post(`/characters/${characterId}/${endpoint}`);
      toast.success(`${restLabel} completed`);
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Could not apply ${restLabel.toLowerCase()}`);
    } finally {
      setSavingLocalAction(false);
    }
  };

  return (
    <section className={`clean-sheet-compact-status clean-sheet-compact-status--battle-bar hp-state-${hpState}`} aria-label="Character combat snapshot">
      <div className="clean-sheet-combat-dashboard-topline">
        <div className="clean-sheet-combat-hp-title">
          <HeartPulse size={15} />
          <span>HP</span>
          <strong>{safeCurrentHp}/{safeMaxHp}</strong>
        </div>
        <div className="clean-sheet-combat-top-actions">
          <span className="clean-sheet-combat-temp-pill">Temp {currentTempHp}</span>
          <button
            type="button"
            className={`clean-sheet-inspiration-toggle ${inspirationActive ? 'is-active' : ''}`}
            aria-pressed={Boolean(inspirationActive)}
            aria-label={inspirationActive ? `Spend ${inspirationLabel}` : `Gain ${inspirationLabel}`}
            title={inspirationLabel}
            onClick={handleToggleInspiration}
            disabled={actionsDisabled}
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>

      <div className="clean-sheet-hp-progress" role="meter" aria-label="Hit points remaining" aria-valuemin={0} aria-valuemax={safeMaxHp} aria-valuenow={safeCurrentHp}>
        <span style={{ width: `${hpPercent}%` }} />
      </div>

      <div className="clean-sheet-compact-hp-actions clean-sheet-combat-dashboard-hp-controls">
        <button type="button" className="rq-hp-action-button--minus" onClick={onDamage} disabled={savingHp}>- HP</button>
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
        <button type="button" className="rq-hp-action-button--plus" onClick={onHeal} disabled={savingHp}>+ HP</button>
        <button type="button" className="rq-temp-hp-action-button--minus" onClick={onTempHpRemove} disabled={savingTempHp || currentTempHp <= 0 || tempAmount <= 0}>Temp -</button>
        <button type="button" className="rq-temp-hp-action-button--plus" onClick={onTempHpAdd} disabled={savingTempHp}>Temp +</button>
      </div>

      <div className="clean-sheet-quick-stat-strip" aria-label="Always visible combat stats">
        <div className="clean-sheet-quick-stat">
          <Shield size={14} />
          <span>AC</span>
          <strong>{ac ?? '—'}</strong>
        </div>
        <button type="button" className="clean-sheet-quick-stat clean-sheet-quick-stat--rollable" onClick={onRollInitiative}>
          <Swords size={14} />
          <span>Initiative</span>
          <strong>{initiative !== undefined ? fmt(initiative) : '—'}</strong>
        </button>
        <div className="clean-sheet-quick-stat">
          <Footprints size={14} />
          <span>Speed</span>
          <strong>{speed ? `${speed}ft` : '—'}</strong>
        </div>
      </div>

      <div className="clean-sheet-rest-actions" aria-label="Rest actions">
        <button type="button" onClick={() => handleRest('short')} disabled={actionsDisabled}>
          <Moon size={15} /> Short Rest
        </button>
        <button type="button" onClick={() => handleRest('long')} disabled={actionsDisabled}>
          <Sun size={15} /> Long Rest
        </button>
      </div>
    </section>
  );
}
