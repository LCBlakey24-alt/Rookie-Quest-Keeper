import React, { useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import MapGridOverlay from './MapGridOverlay';
import './CityMapView.css';

/**
 * A saved town or city map opened from its world map pin: the map image,
 * its grid and its places, with a way back out to the world.
 */
export default function CityMapView({ map, worldName, onBack, onEditPin }) {
  const [aspect, setAspect] = useState(0);
  const image = map?.image_url || map?.image_data || '';
  return (
    <section className="rq-city-view" aria-label={`${map?.name || 'Town'} map`} data-testid="city-map-view">
      <header className="rq-city-view__head">
        <button type="button" className="rq-city-view__button" onClick={onBack} data-testid="city-map-back">
          <ArrowLeft size={16} aria-hidden="true" /> Back to {worldName || 'world map'}
        </button>
        <h3>{map?.name}</h3>
        {onEditPin && <button type="button" className="rq-city-view__button" onClick={onEditPin}>Edit world pin</button>}
      </header>
      <div className="rq-city-view__stage">
        {image ? (
          <div className="rq-city-view__map">
            <img src={image} alt={map.name} onLoad={(event) => setAspect(event.currentTarget.naturalWidth ? event.currentTarget.naturalHeight / event.currentTarget.naturalWidth : 0)} />
            <MapGridOverlay grid={map.grid} aspect={aspect} />
            {(map.pins || []).map((pin) => (
              <span key={pin.id} className="rq-city-view__pin" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} title={pin.description || pin.name}>
                <MapPin size={14} aria-hidden="true" /> {pin.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="rq-city-view__empty">This map has no image yet. Add one in Town &amp; City Maps.</p>
        )}
      </div>
    </section>
  );
}
