import { createPortal } from 'react-dom';
import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { BATTLE_MAP_SIZES, DEFAULT_FEET_PER_SQUARE } from '@/data/battleGrid';
import MapGridOverlay from '@/components/maps/MapGridOverlay';
import MapGridControls from '@/components/maps/MapGridControls';
import { battleCrop, cropBattleImage, normaliseGrid, sizeForCellsAcross } from '@/components/maps/mapGrid';
import { TERRAIN_TYPES } from './MapCanvas';
import { terrainSwatch } from './terrainTextures';
import './NewBattleMapDialog.css';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Grounds a battle can start on; any terrain can still be painted after. */
export const STARTING_GROUNDS = ['stone', 'grass', 'wood', 'dirt', 'cobblestone', 'sand', 'snow'];

/**
 * Step one of a battle map. Either draw it (a size in squares and the
 * ground it starts on), or upload artwork and line a square grid up with
 * the squares printed on it. Uploaded art is cropped to whole squares, so
 * tokens snap to the artwork's own squares everywhere the map is used.
 */
export default function NewBattleMapDialog({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('draw');
  const [sizeId, setSizeId] = useState('small');
  const [ground, setGround] = useState('stone');
  const [artwork, setArtwork] = useState(null); // { url, image, width, height, fileName }
  const [grid, setGrid] = useState(() => normaliseGrid({ type: 'square', size: sizeForCellsAcross('square', 20), opacity: 0.8 }));
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const size = BATTLE_MAP_SIZES.find((option) => option.id === sizeId) || BATTLE_MAP_SIZES[0];
  const crop = artwork ? battleCrop(artwork.width, artwork.height, grid) : null;

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) { setError('Choose an image file (PNG, JPG or WebP).'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError('That image is over 15 MB. Try a smaller copy.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => setArtwork({ url: reader.result, image, width: image.naturalWidth, height: image.naturalHeight, fileName: file.name });
      image.onerror = () => setError('That image could not be opened.');
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const create = (event) => {
    event.preventDefault();
    const mapName = name.trim() || 'Untitled battle map';
    if (source === 'draw') {
      onCreate?.({ name: mapName, width: size.cols, height: size.rows, ground });
      return;
    }
    const result = artwork ? cropBattleImage(artwork.image, grid) : null;
    if (!result) { setError('Upload a map and line up its squares first.'); return; }
    onCreate?.({ name: mapName, width: result.cols, height: result.rows, ground: 'empty', background_image: result.dataUrl });
  };

  // Rendered on <body> so it sits above the campaign header, not under it.
  return createPortal(
    <div className="rq-new-map__backdrop">
      <form className={`rq-new-map${source === 'upload' && artwork ? ' rq-new-map--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="rq-new-map-title" onSubmit={create} data-testid="new-battle-map-dialog">
        <header className="rq-new-map__head">
          <h2 id="rq-new-map-title">New battle map</h2>
          <button type="button" className="rq-new-map__close" aria-label="Close" onClick={onCancel}><X size={18} /></button>
        </header>

        <label className="rq-new-map__label" htmlFor="rq-new-map-name">Name</label>
        <input id="rq-new-map-name" className="rq-new-map__input" value={name} onChange={(event) => setName(event.target.value)} placeholder="The Grey Lantern, ground floor" />

        <fieldset className="rq-new-map__group">
          <legend>Start from</legend>
          <div className="rq-new-map__options rq-new-map__options--two">
            {[['draw', 'Draw it here', 'Paint terrain, walls and doors on a blank grid.'], ['upload', 'Upload artwork', 'Use a battle map image and line up its squares.']].map(([id, label, hint]) => (
              <label key={id} className={`rq-new-map__option${source === id ? ' is-selected' : ''}`}>
                <input type="radio" name="rq-new-map-source" value={id} checked={source === id} onChange={() => setSource(id)} data-testid={`battle-source-${id}`} />
                <strong>{label}</strong>
                <small>{hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        {source === 'upload' ? (
          <div className="rq-new-map__group" data-testid="battle-upload">
            <input ref={fileRef} type="file" accept="image/*" onChange={chooseFile} hidden data-testid="battle-upload-input" />
            <button type="button" className="campaign-button" onClick={() => fileRef.current?.click()}>
              <Upload size={16} aria-hidden="true" /> {artwork ? 'Choose a different image' : 'Choose battle map image'}
            </button>
            {error && <p className="rq-new-map__error" role="alert">{error}</p>}
            {artwork && (
              <>
                <p className="rq-new-map__hint">Count the squares across your map, then nudge until the lines sit on its squares. Part squares at the edges are trimmed.</p>
                <MapGridControls grid={grid} onChange={setGrid} types={['square']} />
                <div className="rq-new-map__artwork">
                  <img src={artwork.url} alt={`Uploaded battle map ${artwork.fileName}`} />
                  <MapGridOverlay grid={grid} aspect={artwork.height / artwork.width} />
                </div>
                {crop && (
                  <p className="rq-new-map__fit" data-testid="battle-upload-fit">
                    {crop.cols} × {crop.rows} squares · {crop.cols * DEFAULT_FEET_PER_SQUARE} × {crop.rows * DEFAULT_FEET_PER_SQUARE} ft
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
        <>
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
                <span className="rq-new-map__swatch" style={{ background: terrainSwatch(id, TERRAIN_TYPES[id]?.color) }} aria-hidden="true" />
                {TERRAIN_TYPES[id]?.name || id}
              </label>
            ))}
          </div>
        </fieldset>
        </>
        )}

        <footer className="rq-new-map__foot">
          <button type="button" className="campaign-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="campaign-button campaign-button-primary" data-testid="new-battle-map-create" disabled={source === 'upload' && !crop}>{source === 'upload' ? 'Use this map' : 'Start drawing'}</button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
