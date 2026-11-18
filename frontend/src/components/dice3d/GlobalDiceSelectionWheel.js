import React, { useMemo } from 'react';
import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';

const DIE_SIDES = [20, 100, 4, 6, 8, 10, 12];
const ROLL_MODES = [
  { id: 'normal', short: 'Neutral', label: 'Neutral' },
  { id: 'advantage', short: 'Advantage', label: 'Advantage' },
  { id: 'disadvantage', short: 'Disadvantage', label: 'Disadvantage' },
];

/**
 * The second Home-style wheel. Outer ring = die type; independent inner
 * three-sector ring = normal/advantage/disadvantage. The centre rolls.
 * Both rings remain in one hexagon, not separate modals or box panels.
 */
export default function GlobalDiceSelectionWheel({
  selectedSides, onSidesChange, rollMode, onRollModeChange, onRoll, dyeId,
}) {
  const options = useMemo(() => DIE_SIDES.map(sides => ({
    id: String(sides),
    label: `d${sides}`,
    short: `D${sides}`,
    testId: `select-d${sides}-btn`,
  })), []);
  const modes = useMemo(() => ROLL_MODES.map(mode => ({
    ...mode,
    disabled: selectedSides !== 20 && mode.id !== 'normal',
    testId: `roll-${mode.id}-btn`,
  })), [selectedSides]);
  const step = direction => {
    const index = Math.max(0, DIE_SIDES.indexOf(selectedSides));
    onSidesChange(DIE_SIDES[(index + direction + DIE_SIDES.length) % DIE_SIDES.length]);
  };

  return (
    <div className="rq-global-dice-wheel rq-global-dice-wheel--nested" data-testid="global-dice-wheel" aria-label="Choose a die and roll mode">
      <GuildChoiceWheel
        options={options}
        value={String(selectedSides)}
        onChange={id => onSidesChange(Number(id))}
        onConfirm={onRoll}
        label="Dice type"
        innerOptions={modes}
        innerValue={rollMode}
        onInnerChange={onRollModeChange}
        centreText="ROLL"
        confirmLabel=""
        confirmAria={`Roll d${selectedSides}${rollMode === 'normal' ? '' : ` with ${rollMode}`}`}
        confirmTestId={`roll-d${selectedSides}-btn`}
        maxFlickVelocity={0.22}
      />
      <div className="rq-global-dice-wheel__access" aria-label="Dice wheel alternatives">
        <button type="button" aria-label="Previous die" onClick={() => step(-1)}>‹</button>
        <span aria-live="polite">d{selectedSides} · {(ROLL_MODES.find(mode => mode.id === rollMode) || ROLL_MODES[0]).label.toLowerCase()}</span>
        <button type="button" aria-label="Next die" onClick={() => step(1)}>›</button>
      </div>
      <span className="rq-global-dice-wheel__dye" aria-hidden="true">Material: {dyeId}</span>
    </div>
  );
}

export { DIE_SIDES };
