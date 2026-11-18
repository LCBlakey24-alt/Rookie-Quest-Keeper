import React, { useState } from 'react';
import { Building, Globe, Map as MapIcon, X } from 'lucide-react';
import './NewBattleMapDialog.css';

export const SETTLEMENT_KINDS = [
  { id: 'city', name: 'City', hint: 'Walls, districts, a market and many streets' },
  { id: 'town', name: 'Town', hint: 'A main street, a square and a few landmarks' },
  { id: 'village', name: 'Village', hint: 'A handful of homes, an inn and a well' },
];

/**
 * The first question when making a map: what kind of map is it?
 * World and settlement maps are uploaded for now; battle maps are drawn.
 */
export default function CreateMapChooser({ onCancel, onChoose }) {
  const [step, setStep] = useState('type');

  return (
    <div className="rq-new-map__backdrop">
      <section className="rq-new-map" role="dialog" aria-modal="true" aria-labelledby="rq-create-map-title" data-testid="create-map-chooser">
        <header className="rq-new-map__head">
          <h2 id="rq-create-map-title">{step === 'type' ? 'What kind of map?' : 'What kind of settlement?'}</h2>
          <button type="button" className="rq-new-map__close" aria-label="Close" onClick={onCancel}><X size={18} /></button>
        </header>

        {step === 'type' ? (
          <div className="rq-new-map__options" role="list">
            <button type="button" role="listitem" className="rq-new-map__option rq-new-map__choice" onClick={() => onChoose?.({ type: 'world' })} data-testid="create-map-world">
              <Globe size={22} aria-hidden="true" />
              <strong>World map</strong>
              <small>Continents, kingdoms and the roads between them. Upload your world map; drawing tools are coming.</small>
            </button>
            <button type="button" role="listitem" className="rq-new-map__option rq-new-map__choice" onClick={() => setStep('settlement')} data-testid="create-map-settlement">
              <Building size={22} aria-hidden="true" />
              <strong>City, town or village</strong>
              <small>Streets and places to visit. Upload a settlement map; drawing tools are coming.</small>
            </button>
            <button type="button" role="listitem" className="rq-new-map__option rq-new-map__choice" onClick={() => onChoose?.({ type: 'battle' })} data-testid="create-map-battle">
              <MapIcon size={22} aria-hidden="true" />
              <strong>Battle map</strong>
              <small>A small battle area on a square grid. Draw it here and use it in encounters.</small>
            </button>
          </div>
        ) : (
          <>
            <div className="rq-new-map__options" role="list">
              {SETTLEMENT_KINDS.map((kind) => (
                <button key={kind.id} type="button" role="listitem" className="rq-new-map__option rq-new-map__choice" onClick={() => onChoose?.({ type: 'settlement', kind: kind.id })} data-testid={`create-map-${kind.id}`}>
                  <strong>{kind.name}</strong>
                  <small>{kind.hint}</small>
                </button>
              ))}
            </div>
            <footer className="rq-new-map__foot">
              <button type="button" className="campaign-button" onClick={() => setStep('type')}>Back</button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
