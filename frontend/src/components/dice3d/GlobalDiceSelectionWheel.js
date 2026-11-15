import React, { useRef } from 'react';
import DiceTypePreview3D from './DiceTypePreview3D';

const DIE_SIDES = [20, 100, 4, 6, 8, 10, 12];
const ROLL_MODES = [
  { id: 'normal', short: 'N', label: 'Normal' },
  { id: 'advantage', short: 'ADV', label: 'Advantage' },
  { id: 'disadvantage', short: 'DIS', label: 'Disadvantage' },
];

function wrapIndex(value) {
  return (value + DIE_SIDES.length) % DIE_SIDES.length;
}

export default function GlobalDiceSelectionWheel({
  selectedSides,
  onSidesChange,
  rollMode,
  onRollModeChange,
  onRoll,
  dyeId,
}) {
  const selectedIndex = Math.max(0, DIE_SIDES.indexOf(selectedSides));
  const pointerStartRef = useRef(null);
  const step = (direction) => onSidesChange(DIE_SIDES[wrapIndex(selectedIndex + direction)]);

  const handleWheel = (event) => {
    if (Math.abs(event.deltaY) < 4 && Math.abs(event.deltaX) < 4) return;
    event.preventDefault();
    step((event.deltaY || event.deltaX) > 0 ? 1 : -1);
  };

  const handlePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const primaryDistance = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(primaryDistance) >= 24) step(primaryDistance < 0 ? 1 : -1);
  };

  const rotation = selectedIndex * -(360 / DIE_SIDES.length);

  return (
    <div className="rq-global-dice-wheel" aria-label="Choose a die and roll mode">
      <div className="rq-global-dice-wheel__pointer" aria-hidden="true" />
      <div
        className="rq-global-dice-wheel__gesture"
        data-testid="global-dice-wheel"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStartRef.current = null; }}
      >
        <div className="rq-global-dice-wheel__ring" style={{ '--wheel-rotation': `${rotation}deg` }} aria-hidden="true" />
        <div className="rq-global-dice-wheel__options" style={{ '--wheel-rotation': `${rotation}deg` }}>
          {DIE_SIDES.map((sides, index) => (
            <button
              key={sides}
              type="button"
              className="rq-global-dice-wheel__die"
              style={{ '--die-angle': `${index * (360 / DIE_SIDES.length)}deg` }}
              aria-pressed={selectedSides === sides}
              aria-label={`Select d${sides}`}
              data-testid={`select-d${sides}-btn`}
              onClick={() => onSidesChange(sides)}
            >
              <span>d{sides}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rq-global-dice-wheel__centre">
        <div className="rq-global-dice-wheel__modes" aria-label="Roll mode">
          {ROLL_MODES.map((mode) => {
            const disabled = selectedSides !== 20 && mode.id !== 'normal';
            return (
              <button
                key={mode.id}
                type="button"
                data-testid={`roll-${mode.id}-btn`}
                aria-label={disabled ? `${mode.label} is only available for a d20` : mode.label}
                aria-pressed={rollMode === mode.id}
                disabled={disabled}
                onClick={() => onRollModeChange(mode.id)}
              >
                {mode.short}
              </button>
            );
          })}
        </div>
        <DiceTypePreview3D sides={selectedSides} dyeId={dyeId} />
        <button
          type="button"
          className="rq-global-dice-wheel__roll"
          data-testid={`roll-d${selectedSides}-btn`}
          aria-label={`Roll d${selectedSides}${rollMode === 'normal' ? '' : ` with ${rollMode}`}`}
          onClick={onRoll}
        >
          <small>{rollMode === 'normal' ? 'ROLL' : rollMode.toUpperCase()}</small>
          <strong>d{selectedSides}</strong>
        </button>
      </div>

      <div className="rq-global-dice-wheel__stepper" aria-label="Turn dice wheel">
        <button type="button" aria-label="Previous die" onClick={() => step(-1)}>‹</button>
        <span>Swipe or scroll to turn</span>
        <button type="button" aria-label="Next die" onClick={() => step(1)}>›</button>
      </div>
    </div>
  );
}

export { DIE_SIDES };
