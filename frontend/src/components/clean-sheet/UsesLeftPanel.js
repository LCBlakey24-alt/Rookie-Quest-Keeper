import React from 'react';
import { Minus, Plus } from 'lucide-react';

import './UsesLeftPanel.css';

const ordinal = (n) => {
  const value = Number(n) || 0;
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${({ 1: 'st', 2: 'nd', 3: 'rd' })[value % 10] || 'th'}`;
};

/**
 * What a character has left to spend this rest: class resources (Ki, Rage,
 * Bardic Inspiration, ...) and spell slots, each with − to spend one and +
 * to give one back. The + is how a use tapped by accident is put back after
 * its Undo message has gone.
 *
 * @param {{ key: string, label: string, current: number, max: number }[]} resources
 * @param {{ source: 'spell'|'pact', level: number, left: number, total: number }[]} slots
 * @param {(resource, delta: number) => void} onResource
 * @param {(slot, delta: number) => void} onSlot
 */
export default function UsesLeftPanel({ resources = [], slots = [], onResource, onSlot, disabled = false }) {
  const rows = [
    ...resources.filter((resource) => Number(resource.max) > 0).map((resource) => ({
      id: `resource-${resource.key}`,
      name: resource.label,
      left: Number(resource.current) || 0,
      total: Number(resource.max) || 0,
      change: (delta) => onResource?.(resource, delta),
    })),
    ...slots.map((slot) => ({
      id: `slot-${slot.source}-${slot.level}`,
      name: slot.source === 'pact' ? `Pact slots (${ordinal(slot.level)})` : `${ordinal(slot.level)}-level slots`,
      left: slot.left,
      total: slot.total,
      change: (delta) => onSlot?.(slot, delta),
    })),
  ];
  if (!rows.length) return null;

  return (
    <section className="rq-uses-left" aria-label="Uses left" data-testid="uses-left">
      <h3>Uses left</h3>
      <ul>
        {rows.map((row) => (
          <li key={row.id} data-testid={`uses-left-${row.id}`}>
            <span className="rq-uses-left__name">{row.name}</span>
            <span className="rq-uses-left__pips" aria-hidden="true">
              {Array.from({ length: Math.min(row.total, 12) }, (_, index) => (
                <i key={index} className={index < row.left ? 'is-left' : ''} />
              ))}
            </span>
            <output className="rq-uses-left__count" aria-label={`${row.name}: ${row.left} of ${row.total} left`}>{row.left}/{row.total}</output>
            <button type="button" onClick={() => row.change(-1)} disabled={disabled || row.left <= 0} aria-label={`Spend one: ${row.name}`} data-testid={`uses-left-spend-${row.id}`}>
              <Minus size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => row.change(1)} disabled={disabled || row.left >= row.total} aria-label={`Give one back: ${row.name}`} data-testid={`uses-left-restore-${row.id}`}>
              <Plus size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
