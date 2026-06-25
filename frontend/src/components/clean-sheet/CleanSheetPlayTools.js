import React from 'react';
import { Activity, Coffee, History, Moon, RotateCcw, Skull, Sparkles, Star } from 'lucide-react';

import { COMMON_CONDITIONS, fmt, parseHitDie } from './cleanSheetUtils';
import { DeathSaveTrack } from './CleanSheetCommon';

export default function CleanSheetPlayTools({
  activeConditions,
  concentratingName,
  concentrationInput,
  currentHp,
  deathSaveFailures,
  deathSaveSuccesses,
  exhaustionLevel,
  hitDice,
  hitDiceRemaining,
  maxHp,
  passiveScores,
  rollBonus,
  rollHistory,
  rollMode,
  savingQuickState,
  showConditionPicker,
  showConcentrationInput,
  showDeathSaves,
  showRollHistory,
  onEndConcentration,
  onLongRest,
  onRollBonusChange,
  onRollDeathSave,
  onRollHistoryToggle,
  onRollModeChange,
  onSaveConcentration,
  onSetConcentrationInput,
  onShortRest,
  onShowConditionPickerChange,
  onShowConcentrationInputChange,
  onSpendHitDie,
  onToggleCondition,
  onToggleDeathSave,
  onToggleInspiration,
  onResetDeathSaves,
  hasInspiration,
}) {
  const hitDieInfo = parseHitDie(hitDice);
  const hitDiceTotal = hitDieInfo.total;
  const hitDieLabel = `d${hitDieInfo.sides}`;
  const safeHitDiceRemaining = Math.max(0, Number(hitDiceRemaining) || 0);
  const canSpendHitDie = safeHitDiceRemaining > 0 && currentHp < maxHp;

  const saveConcentration = () => {
    const spellName = concentrationInput.trim();
    if (!spellName) return;
    onSaveConcentration(spellName);
  };

  return (
    <>
      <section className="clean-sheet-turn-strip" data-testid="player-turn-strip">
        <div><span>Roll mode</span><strong>{rollMode === 'normal' ? 'Normal' : rollMode === 'advantage' ? 'Advantage' : 'Disadvantage'}</strong></div>
        <div><span>Passive Perception</span><strong>{passiveScores.find(([label]) => label === 'Perception')?.[1] ?? 10}</strong></div>
        <div><span>Conditions</span><strong>{activeConditions.length ? activeConditions.length : 'None'}</strong></div>
        <div><span>Hit Dice</span><strong>{safeHitDiceRemaining}/{hitDiceTotal} {hitDieLabel}</strong></div>
        <div><span>Concentration</span><strong>{concentratingName || 'None'}</strong></div>
      </section>

      <section className="clean-sheet-mobile-tools" data-testid="mobile-play-essentials">
        <div className="clean-sheet-status-row clean-sheet-status-row--single">
          <button type="button" className={`clean-sheet-inspiration ${hasInspiration ? 'active' : ''}`} onClick={onToggleInspiration} disabled={savingQuickState} data-testid="inspiration-toggle">
            <Star size={17} /> {hasInspiration ? 'Inspired' : 'Inspiration'}
          </button>
        </div>

        <div className="clean-sheet-recovery-panel" data-testid="rest-recovery-panel">
          <div className="clean-sheet-recovery-header">
            <span><Activity size={16} /> Recovery</span>
            <strong>{safeHitDiceRemaining} / {hitDiceTotal} <em>{hitDieLabel}</em></strong>
          </div>
          <div className="clean-sheet-recovery-actions">
            <button type="button" onClick={onSpendHitDie} disabled={savingQuickState || !canSpendHitDie} data-testid="spend-hit-die-btn">
              <Activity size={16} /> Use Hit Die
            </button>
            <button type="button" onClick={onShortRest} disabled={savingQuickState} data-testid="short-rest-btn">
              <Coffee size={17} /> Short Rest
            </button>
            <button type="button" onClick={onLongRest} disabled={savingQuickState} data-testid="long-rest-btn">
              <Moon size={17} /> Long Rest
            </button>
          </div>
          <p className="clean-sheet-recovery-help">
            Short rest keeps HP as-is unless you spend Hit Dice. Long rest restores HP, clears temp HP, and recovers rest resources.
          </p>
        </div>

        <div className="clean-sheet-roll-controls" data-testid="roll-controls">
          <div className="clean-sheet-roll-mode-group" aria-label="Roll mode">
            {['normal', 'advantage', 'disadvantage'].map(mode => (
              <button key={mode} type="button" className={rollMode === mode ? 'active' : ''} onClick={() => onRollModeChange(mode)}>
                {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Adv' : 'Dis'}
              </button>
            ))}
          </div>
          <label>
            <span>Bonus</span>
            <input type="number" value={rollBonus} onChange={(event) => onRollBonusChange(event.target.value)} aria-label="Custom roll bonus" />
          </label>
        </div>

        <div className="clean-sheet-passives" data-testid="passive-scores-strip">
          {passiveScores.map(([label, value]) => (
            <div key={label}><span>Passive {label}</span><strong>{value}</strong></div>
          ))}
        </div>

        <div className="clean-sheet-hitdice-row" data-testid="concentration-row" style={{ borderColor: concentratingName ? '#a855f7' : undefined }}>
          <span><Sparkles size={15} style={{ color: '#a855f7' }} /> Concentration</span>
          {concentratingName ? (
            <>
              <strong style={{ color: '#a855f7', flex: 1 }}>{concentratingName}</strong>
              <button
                type="button"
                onClick={onEndConcentration}
                disabled={savingQuickState}
                title="End concentration"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '2px 8px', fontSize: '11px' }}
              >
                End
              </button>
            </>
          ) : (
            <>
              <strong style={{ color: '#64748b', flex: 1 }}>None</strong>
              <button
                type="button"
                onClick={() => onShowConcentrationInputChange(prev => !prev)}
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid #a855f7', borderRadius: '4px', color: '#a855f7', cursor: 'pointer', padding: '2px 8px', fontSize: '11px' }}
              >
                Set
              </button>
            </>
          )}
          {showConcentrationInput && !concentratingName && (
            <div style={{ width: '100%', display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input
                type="text"
                placeholder="Spell name…"
                value={concentrationInput}
                onChange={event => onSetConcentrationInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && concentrationInput.trim()) saveConcentration();
                }}
                className="clean-sheet-input"
                style={{ flex: 1, padding: '4px 8px', fontSize: '12px', background: 'rgba(10,10,40,0.8)', border: '1px solid #a855f7', borderRadius: '4px', color: '#fff' }}
              />
              <button
                type="button"
                disabled={!concentrationInput.trim() || savingQuickState}
                onClick={saveConcentration}
                style={{ background: 'rgba(168,85,247,0.3)', border: '1px solid #a855f7', borderRadius: '4px', color: '#a855f7', cursor: 'pointer', padding: '4px 10px', fontSize: '11px' }}
              >
                Save
              </button>
            </div>
          )}
        </div>

        <div className="clean-sheet-condition-panel" data-testid="conditions-strip">
          <button type="button" onClick={() => onShowConditionPickerChange(prev => !prev)} className="clean-sheet-condition-toggle">
            Conditions {activeConditions.length > 0 ? `(${activeConditions.length})` : ''}
          </button>
          {exhaustionLevel > 0 && <span className="clean-sheet-condition-chip danger">Exhaustion {exhaustionLevel}</span>}
          {activeConditions.length === 0 && exhaustionLevel === 0 ? (
            <span className="clean-sheet-no-conditions">No active conditions</span>
          ) : (
            activeConditions.map(condition => <span key={condition} className="clean-sheet-condition-chip">{condition}</span>)
          )}
          {showConditionPicker && (
            <div className="clean-sheet-condition-picker">
              {COMMON_CONDITIONS.map(condition => (
                <button
                  key={condition}
                  type="button"
                  className={activeConditions.includes(condition) ? 'active' : ''}
                  onClick={() => onToggleCondition(condition)}
                  disabled={savingQuickState}
                >
                  {condition}
                </button>
              ))}
            </div>
          )}
        </div>

        {showDeathSaves && (
          <div className="clean-sheet-death-saves" data-testid="death-saves-panel">
            <div className="clean-sheet-death-title"><Skull size={17} /> Death Saves</div>
            <DeathSaveTrack label="Successes" type="success" count={deathSaveSuccesses} onToggle={onToggleDeathSave} />
            <DeathSaveTrack label="Failures" type="failure" count={deathSaveFailures} onToggle={onToggleDeathSave} />
            <div className="clean-sheet-death-actions">
              <button type="button" onClick={onRollDeathSave}>Roll Death Save</button>
              <button type="button" onClick={onResetDeathSaves}><RotateCcw size={15} /> Reset</button>
            </div>
          </div>
        )}

        <div className="clean-sheet-roll-history-panel" data-testid="roll-history-panel">
          <button type="button" onClick={() => onRollHistoryToggle(prev => !prev)} className="clean-sheet-roll-history-toggle">
            <History size={16} /> Last Rolls {rollHistory.length > 0 ? `(${rollHistory.length})` : ''}
          </button>
          {showRollHistory && (
            <div className="clean-sheet-roll-history-list">
              {rollHistory.length === 0 ? (
                <p>No rolls yet.</p>
              ) : (
                rollHistory.map(entry => (
                  <div key={entry.id}>
                    <span>{entry.label}</span>
                    <strong>{entry.total}</strong>
                    <em>{entry.time} • {entry.mode === 'hit-die' ? `die ${entry.d20}` : `d20 ${entry.d20}`} {fmt(entry.modifier)}{entry.mode && entry.mode !== 'normal' && entry.mode !== 'hit-die' ? ` • ${entry.mode}` : ''}</em>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
