import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BATTLE_MAP_SIZES, DEFAULT_FEET_PER_SQUARE } from '@/data/battleGrid';
import { TERRAIN_TYPES } from './MapCanvas';
import './NewBattleMapDialog.css';

/** Grounds a battle can start on; any terrain can still be painted after. */
export const STARTING_GROUNDS = ['stone', 'grass', 'wood', 'dirt', 'cobblestone', 'sand', 'snow'];

/**
 * Step one of a battle map: a name, a size in squares and the ground it
 * starts on. The builder opens with that blank map ready to paint.
 */
export default function NewBattleMapDialog({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [sizeId, setSizeId] = useState('small');
  const [ground, setGround] = useState('stone');
  const size = BATTLE_MAP_SIZES.find((option) => option.id === sizeId) || BATTLE_MAP_SIZES[0];

  const create = (event) => {
    event.preventDefault();
    onCreate?.({ name: name.trim() || 'Untitled battle map', width: size.cols, height: size.rows, ground });
  };

  return (
    <div className="rq-new-map__backdrop">
      <form className="rq-new-map" role="dialog" aria-modal="true" aria-labelledby="rq-new-map-title" onSubmit={create} data-testid="new-battle-map-dialog">
        <header className="rq-new-map__head">
          <h2 id="rq-new-map-title">New battle map</h2>
          <button type="button" className="rq-new-map__close" aria-label="Close" onClick={onCancel}><X size={18} /></button>
        </header>

        <label className="rq-new-map__label" htmlFor="rq-new-map-name">Name</label>
        <input id="rq-new-map-name" className="rq-new-map__input" value={name} onChange={(event) => setName(event.target.value)} placeholder="The Grey Lantern, ground floor" />

        <fieldset className="rq-new-map__group">
          <legend>Size</legend>
          <div className="rq-new-map__options">
            {BATTLE_MAP_SIZES.map((option) => (
              <label key={option.id} className={`rq-new-map__option${sizeId === option.id ? ' is-selected' : ''}`}>
                <input type="radio" name="rq-new-map-size" value={option.id} checked={sizeId === option.id} onChange={() => setSizeId(option.id)} data-testid={`battle-size-${option.id}`} />
                <strong>{option.name}</strong>
                <span>{option.cols} × {option.rows} squares · {option.cols * DEFAULT_FEET_PER_SQUARE} × {option.rows * DEFAULT_FEET_PER_SQUARE} ft</span>
                <small>{option.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rq-new-map__group">
          <legend>Starting ground</legend>
          <div className="rq-new-map__grounds">
            {STARTING_GROUNDS.map((id) => (
              <label key={id} className={`rq-new-map__ground${ground === id ? ' is-selected' : ''}`}>
                <input type="radio" name="rq-new-map-ground" value={id} checked={ground === id} onChange={() => setGround(id)} />
                <span className="rq-new-map__swatch" style={{ background: TERRAIN_TYPES[id]?.color }} aria-hidden="true" />
                {TERRAIN_TYPES[id]?.name || id}
              </label>
            ))}
          </div>
        </fieldset>

        <footer className="rq-new-map__foot">
          <button type="button" className="campaign-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="campaign-button campaign-button-primary" data-testid="new-battle-map-create">Start drawing</button>
        </footer>
      </form>
    </div>
  );
}
