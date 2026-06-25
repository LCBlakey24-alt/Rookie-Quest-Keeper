import React, { useMemo } from 'react';
import { AlertTriangle, ArrowUpCircle, BookOpen, CheckCircle2, ChevronRight, ClipboardList, Sparkles, Zap } from 'lucide-react';

import { getLevelUpProgressionPreview, getPlayerSheetProgression } from '@/data/playerProgressionView2014';
import './CleanSheetProgressionStrip.css';

function formatResourceValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object' && 'slots' in value && 'level' in value) {
    const slotLabel = value.slots === 1 ? 'slot' : 'slots';
    return `${value.slots} ${slotLabel} @ Lv ${value.level}`;
  }
  return String(value);
}

function formatSlots(slots = {}) {
  const entries = Object.entries(slots || {});
  if (!entries.length) return 'No class slots now';
  return entries.map(([level, count]) => `Lv ${level}: ${count}`).join(' / ');
}

function flattenProgressionChoices(levelProgression = {}) {
  return Object.entries(levelProgression || {})
    .flatMap(([level, entry]) => {
      const choices = Array.isArray(entry?.choices) ? entry.choices : [];
      return choices.map(choice => ({ ...choice, level: Number(level) || choice.level || 1 }));
    })
    .sort((a, b) => Number(a.level || 0) - Number(b.level || 0));
}

export default function CleanSheetProgressionStrip({ character, onLevelUp }) {
  const className = character?.character_class || character?.className || character?.class;
  const level = Number(character?.level || 1);
  const sheetProgression = useMemo(() => getPlayerSheetProgression(className, level), [className, level]);
  const levelUpPreview = useMemo(() => getLevelUpProgressionPreview(className, level), [className, level]);
  const buildChoices = useMemo(() => flattenProgressionChoices(character?.level_progression), [character?.level_progression]);

  if (!sheetProgression) return null;

  const currentResources = sheetProgression.currentResources.filter(resource => resource.value !== null && resource.value !== undefined);
  const recentFeatures = sheetProgression.currentFeatures.slice(-4).reverse();
  const reviewChoices = buildChoices.filter(choice => choice.status !== 'done');
  const decidedChoices = buildChoices.filter(choice => choice.status === 'done');
  const visibleBuildChoices = buildChoices.slice(-3).reverse();
  const guidedChecks = [
    levelUpPreview?.willChooseSubclass ? 'subclass choice' : null,
    levelUpPreview?.willChooseAsi ? 'ASI / feat' : null,
    levelUpPreview?.spellReplacementOption ? 'spell review' : null,
    levelUpPreview?.spellSlotChanges?.length ? 'slot changes' : null,
    levelUpPreview?.resourceChanges?.length ? 'resource changes' : null,
    reviewChoices.length ? 'saved build reviews' : null,
  ].filter(Boolean);

  return (
    <section className="clean-sheet-progression-strip" aria-label="Current class tools">
      <div className="clean-sheet-progression-icon" aria-hidden="true">
        <Sparkles size={20} />
      </div>

      <div className="clean-sheet-progression-main">
        <div className="clean-sheet-progression-heading">
          <span>Usable now</span>
          <strong>{sheetProgression.className} level {sheetProgression.level}</strong>
        </div>

        <div className="clean-sheet-progression-pills">
          <span><Zap size={14} /> {currentResources.length ? currentResources.map(resource => `${resource.label}: ${formatResourceValue(resource.value)}`).join(' / ') : 'No tracked class resource'}</span>
          <span><BookOpen size={14} /> {formatSlots(sheetProgression.currentSpellSlots)}</span>
          {buildChoices.length > 0 && (
            <span className={reviewChoices.length ? 'needs-review' : 'is-decided'}>
              {reviewChoices.length ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              Build choices: {decidedChoices.length} decided / {reviewChoices.length} review
            </span>
          )}
        </div>

        {recentFeatures.length > 0 && (
          <div className="clean-sheet-progression-features" aria-label="Recent usable class features">
            {recentFeatures.map(feature => (
              <span key={`${feature.level}-${feature.name}`}>Lv {feature.level}: {feature.name}</span>
            ))}
          </div>
        )}

        {visibleBuildChoices.length > 0 && (
          <div className="clean-sheet-progression-build-notes" aria-label="Saved build choices">
            {visibleBuildChoices.map(choice => (
              <span key={choice.id || `${choice.level}-${choice.title}`} className={choice.status === 'done' ? 'is-decided' : 'needs-review'}>
                <ClipboardList size={13} />
                Lv {choice.level}: {choice.title}{choice.selection ? ` — ${choice.selection}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="clean-sheet-progression-levelup" onClick={onLevelUp}>
        <ArrowUpCircle size={17} />
        <span>{guidedChecks.length ? `Level-up has ${guidedChecks.length} guided checks` : 'Level up'}</span>
        <ChevronRight size={15} />
      </button>
    </section>
  );
}
