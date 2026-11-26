import React, { useEffect, useRef, useState } from 'react';
import { Activity, X } from 'lucide-react';

import { SHEET_CONDITIONS, conditionLabel, conditionsSummary, normaliseConditions, toggleCondition } from './conditionsModel';

/**
 * The sheet's Conditions button and the panel it opens.
 *
 * The button sits in the sheet's trail row and names what the character is
 * suffering from, so it is seen at a glance during play. The panel lists
 * every condition with a one-line reminder; tapping one adds or removes it
 * and saves straight away. It records conditions only: it does not change a
 * roll on its own, and nothing is added unless the player taps it.
 */
export default function HexConditions({ conditions, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const current = normaliseConditions(conditions);
  const active = new Set(current);
  // A GM's own condition (not in the standard list) still shows, so it can be removed.
  const extras = current.filter((id) => !SHEET_CONDITIONS.some((condition) => condition.id === id));

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = (id) => {
    const next = toggleCondition(current, id);
    const added = next.length > current.length;
    onChange?.(next, `${conditionLabel(id)} ${added ? 'added' : 'removed'}`);
  };

  return (
    <>
      <button
        type="button"
        className={`hex-sheet__conditions-button${current.length ? ' is-active' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={current.length ? `Conditions: ${current.map(conditionLabel).join(', ')}. Change conditions.` : 'Conditions: none. Add a condition.'}
        data-testid="hex-conditions-button"
      >
        <span className="hex-glass" aria-hidden="true" />
        <Activity size={15} aria-hidden="true" />
        <span>{conditionsSummary(current)}</span>
      </button>

      {open && (
        <div className="hex-sheet__overlay hex-conditions" role="dialog" aria-modal="true" aria-label="Conditions" onClick={() => setOpen(false)} data-testid="hex-conditions-panel">
          {/* Clicks inside the panel must not close it. */}
          <div className="hex-conditions__panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>Conditions</h2>
              <button type="button" ref={closeRef} className="hex-conditions__close" onClick={() => setOpen(false)} aria-label="Close conditions"><X size={18} aria-hidden="true" /></button>
            </header>
            <p className="hex-conditions__hint">Tap a condition to add or remove it. Your GM decides when one applies.</p>
            <ul>
              {[...SHEET_CONDITIONS, ...extras.map((id) => ({ id, label: conditionLabel(id), note: 'Added by your GM.' }))].map((condition) => (
                <li key={condition.id}>
                  <button
                    type="button"
                    className={active.has(condition.id) ? 'is-on' : ''}
                    aria-pressed={active.has(condition.id)}
                    onClick={() => toggle(condition.id)}
                    disabled={disabled}
                    data-testid={`hex-condition-${condition.id}`}
                  >
                    <strong>{condition.label}</strong>
                    <span>{condition.note}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
