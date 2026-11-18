import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus } from 'lucide-react';
import { GRID_LIMITS, GRID_TYPES, cellsAcross, normaliseGrid, sizeForCellsAcross } from './mapGrid';
import './MapGridControls.css';

const round = (value, places = 2) => Math.round(value * 10 ** places) / 10 ** places;
const wrap = (value) => ((value % 100) + 100) % 100;

/**
 * Lay a grid over an uploaded map and line it up: pick squares or hexes, set
 * how many cells fit across, then nudge size and position until the lines sit
 * on the artwork's own grid. Changes show live; `onSave` stores them.
 */
export default function MapGridControls({ grid, onChange, onSave, onCancel, saving = false }) {
  const settings = normaliseGrid(grid);
  const set = (patch) => onChange?.(normaliseGrid({ ...settings, ...patch }));
  const active = settings.type !== 'none';
  const nudgeSize = (delta) => set({ size: round(settings.size + delta, 3) });
  // A small shift is 2% of one cell; offsets wrap, since a full cell looks the same.
  const shift = (axis, delta) => set({ [axis]: round(wrap(settings[axis] + delta), 2) });

  return (
    <section className="rq-grid-controls" aria-label="Map grid" data-testid="map-grid-controls">
      <div className="rq-grid-controls__types" role="radiogroup" aria-label="Grid type">
        {GRID_TYPES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={settings.type === option.id}
            className="rq-grid-controls__type"
            onClick={() => set({ type: option.id })}
            data-testid={`map-grid-type-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="rq-grid-controls__rows">
          <div className="rq-grid-controls__row">
            <label htmlFor="rq-grid-across">Cells across</label>
            <input
              id="rq-grid-across"
              type="number"
              min="2"
              max="200"
              value={cellsAcross(settings)}
              onChange={(event) => set({ size: sizeForCellsAcross(settings.type, event.target.value) })}
              data-testid="map-grid-across"
            />
            <span className="rq-grid-controls__hint">Count the squares or hexes on your map.</span>
          </div>

          <div className="rq-grid-controls__row">
            <label htmlFor="rq-grid-size">Cell size</label>
            <button type="button" className="rq-grid-controls__icon" aria-label="Smaller cells" onClick={() => nudgeSize(-0.05)}><Minus size={16} /></button>
            <input
              id="rq-grid-size"
              type="range"
              min={GRID_LIMITS.minSize}
              max={25}
              step="0.01"
              value={Math.min(25, settings.size)}
              onChange={(event) => set({ size: Number(event.target.value) })}
              data-testid="map-grid-size"
            />
            <button type="button" className="rq-grid-controls__icon" aria-label="Bigger cells" onClick={() => nudgeSize(0.05)}><Plus size={16} /></button>
          </div>

          <div className="rq-grid-controls__row">
            <span className="rq-grid-controls__label">Line up</span>
            <div className="rq-grid-controls__pad" role="group" aria-label="Move the grid">
              <button type="button" className="rq-grid-controls__icon" aria-label="Move grid left" onClick={() => shift('offset_x', -2)}><ArrowLeft size={16} /></button>
              <button type="button" className="rq-grid-controls__icon" aria-label="Move grid up" onClick={() => shift('offset_y', -2)}><ArrowUp size={16} /></button>
              <button type="button" className="rq-grid-controls__icon" aria-label="Move grid down" onClick={() => shift('offset_y', 2)}><ArrowDown size={16} /></button>
              <button type="button" className="rq-grid-controls__icon" aria-label="Move grid right" onClick={() => shift('offset_x', 2)}><ArrowRight size={16} /></button>
            </div>
          </div>

          <div className="rq-grid-controls__row">
            <span className="rq-grid-controls__label">Fine shift</span>
            <label className="rq-grid-controls__slider">
              <span>Across</span>
              <input type="range" min="0" max="100" step="0.5" value={settings.offset_x} onChange={(event) => set({ offset_x: Number(event.target.value) })} data-testid="map-grid-offset-x" />
            </label>
            <label className="rq-grid-controls__slider">
              <span>Down</span>
              <input type="range" min="0" max="100" step="0.5" value={settings.offset_y} onChange={(event) => set({ offset_y: Number(event.target.value) })} data-testid="map-grid-offset-y" />
            </label>
          </div>

          <div className="rq-grid-controls__row">
            <span className="rq-grid-controls__label">Lines</span>
            <div className="rq-grid-controls__types" role="radiogroup" aria-label="Line colour">
              <button type="button" role="radio" aria-checked={settings.colour === 'light'} className="rq-grid-controls__type" onClick={() => set({ colour: 'light' })}>Light</button>
              <button type="button" role="radio" aria-checked={settings.colour === 'dark'} className="rq-grid-controls__type" onClick={() => set({ colour: 'dark' })}>Dark</button>
            </div>
            <label className="rq-grid-controls__slider">
              <span>Strength</span>
              <input type="range" min="0.05" max="1" step="0.05" value={settings.opacity} onChange={(event) => set({ opacity: Number(event.target.value) })} data-testid="map-grid-opacity" />
            </label>
          </div>
        </div>
      )}

      <footer className="rq-grid-controls__actions">
        {onCancel && <button type="button" className="rq-grid-controls__button" onClick={onCancel}>Cancel</button>}
        <button type="button" className="rq-grid-controls__button rq-grid-controls__button--primary" onClick={() => onSave?.(settings)} disabled={saving} data-testid="map-grid-save">
          {saving ? 'Saving…' : 'Save grid'}
        </button>
      </footer>
    </section>
  );
}
