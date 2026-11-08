import React from 'react';
import {
  GENERIC_COMBAT_TERRAINS,
  genericCombatBackdropStyle,
  normaliseCombatTerrain,
} from '@/data/genericCombatTerrain';

export function battlefieldModeFor(scenario) {
  if (['saved', 'generic', 'none'].includes(scenario?.battlefield_mode)) return scenario.battlefield_mode;
  return scenario?.map_id || scenario?.mapId || scenario?.map_url ? 'saved' : 'none';
}

const info = {
  saved: 'Use an existing campaign map or an uploaded image.',
  generic: 'Use a ready-to-play textured floor, no map upload required.',
  none: 'Use textured stone if no specific battlefield is prepared.',
};
const tileButton = selected => ({
  display: 'grid', gap: 6, padding: 7, minWidth: 0, textAlign: 'left',
  border: selected ? '2px solid #ef8534' : '1px solid rgba(160,180,197,.32)',
  borderRadius: 8, color: 'var(--rq-text-primary, #f0eadc)',
  background: 'var(--rq-card, #10273b)', cursor: 'pointer',
});
const previewStyle = texture => ({
  minHeight: 68, borderRadius: 4, border: '1px solid rgba(255,255,255,.16)',
  ...texture,
});
const modeStyle = selected => ({
  cursor: 'pointer', fontSize: 13, padding: '10px 12px',
  border: selected ? '2px solid #eb7c3b' : '1px solid rgba(160,180,197,.32)',
  background: selected ? 'rgba(231,109,42,.13)' : 'var(--rq-card, #10273b)',
  color: 'var(--rq-text-primary, #f0eadc)', borderRadius: 6,
});

/**
 * Accessible, shared encounter-builder and Live-Review battlefield picker.
 * Presentation only: callers own persistence and must decide whether they
 * are editing a saved encounter or an uncommitted live review.
 */
export default function BattlefieldPicker({
  mode = 'none',
  terrainType = 'stone',
  mapId = '',
  maps = [],
  onModeChange,
  onTerrainChange,
  onMapIdChange,
  compact = false,
}) {
  const selectedMode = ['saved', 'generic', 'none'].includes(mode) ? mode : 'none';
  const terrain = normaliseCombatTerrain(terrainType);
  const selectedMap = maps.find(item => String(item.id) === String(mapId)) || null;
  const image = selectedMap?.map_url || selectedMap?.background_url
    || selectedMap?.background_image || selectedMap?.image_url || '';
  return (
    <section aria-label="Encounter battlefield" data-testid="battlefield-picker"
      style={{ display: 'grid', gap: 11, color: 'var(--rq-text-primary, #f0eadc)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 7 }}
        role="group" aria-label="Battlefield source">
        {[
          ['saved','Saved battle map'],
          ['generic','Generic textured floor'],
          ['none','No selection'],
        ].map(([value,label]) => (
          <button key={value} type="button" onClick={() => onModeChange?.(value)}
            aria-pressed={selectedMode===value} style={modeStyle(selectedMode===value)}>
            {label}
          </button>
        ))}
      </div>
      <span style={{ opacity: .8, fontSize: 12 }}>{info[selectedMode]}</span>
      {selectedMode === 'saved' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>
            Campaign battle map
            <select aria-label="Saved battlefield map" value={mapId} onChange={event => onMapIdChange?.(event.target.value)}
              style={{ width: '100%', padding: 10, background: '#122b42', color: '#f0eadc', border: '1px solid #6f8395', borderRadius: 6 }}>
              <option value="">Use an uploaded map below, or choose a map</option>
              {maps.map(item => <option key={item.id} value={String(item.id)}>{item.name || 'Untitled map'}</option>)}
              {mapId && !selectedMap && <option value={mapId}>Previously linked map ({mapId})</option>}
            </select>
          </label>
          {selectedMap && (
            <div aria-label="Saved battlefield preview" style={{ ...previewStyle({}), minHeight: compact ? 90 : 132, overflow: 'hidden', display: 'grid', placeItems: 'center', background: '#343a44' }}>
              {image
                ? <img src={image} alt={selectedMap.name || 'Saved map preview'} style={{ maxWidth: '100%', maxHeight: 210, objectFit: 'contain' }} />
                : <span style={{ padding: 12, textAlign: 'center' }}>Map selected: {selectedMap.name || 'Untitled map'}</span>}
            </div>
          )}
        </div>
      )}
      {selectedMode !== 'saved' && (
        <div style={previewStyle({ ...genericCombatBackdropStyle(selectedMode==='none'?'stone':terrain), backgroundSize: '24px 24px, 24px 24px, 96px 96px' })}
          aria-label={'Battlefield preview: '+(selectedMode==='none'?'stone':terrain)}
          data-testid="battlefield-texture-preview" />
      )}
      {selectedMode === 'generic' && (
        <div role="group" aria-label="Generic terrain textures"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax('+(compact?'98':'116')+'px,1fr))', gap: 8 }}>
          {GENERIC_COMBAT_TERRAINS.map(item => (
            <button key={item.id} type="button" style={tileButton(item.id === terrain)}
              onClick={() => onTerrainChange?.(item.id)} aria-pressed={item.id === terrain}
              aria-label={item.label} data-testid={'terrain-choice-'+item.id}>
              <span aria-hidden="true" style={previewStyle({ ...genericCombatBackdropStyle(item.id), backgroundSize: '20px 20px, 20px 20px, 80px 80px' })} />
              <strong style={{ fontSize: 11 }}>{item.label}</strong>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
