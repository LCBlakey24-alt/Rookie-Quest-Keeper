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
  none: 'No map prepared: fight on plain stone.',
};
// The battleground art is textured; its controls follow the app's flat
// Neon Coast surfaces, fine borders and restrained inward glow.
const choiceStyle = selected => ({
  border: '1px solid rgba(201,210,230,.32)',
  boxShadow: selected ? 'var(--guild-control-glow-hot, inset 0 0 9px rgba(255,176,102,.23))'
    : 'var(--guild-control-glow, inset 0 0 7px rgba(79,179,255,.13))',
  background: 'var(--guild-bg, #0A2342)',
  color: 'var(--guild-text, #FFFFFF)',
  cursor: 'pointer',
});
const tileButton = selected => ({
  ...choiceStyle(selected),
  display: 'grid', gap: 6, padding: 7, minWidth: 0, textAlign: 'left', borderRadius: 6,
});
const previewStyle = texture => ({
  minHeight: 68, borderRadius: 4, border: '1px solid rgba(201,210,230,.25)',
  ...texture,
});
const modeStyle = selected => ({
  ...choiceStyle(selected),
  fontSize: 13, padding: '10px 12px', minHeight: 44, borderRadius: 6,
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
    || selectedMap?.background_image || selectedMap?.image_url || selectedMap?.image_data || '';
  return (
    <section aria-label="Encounter battlefield" data-testid="battlefield-picker"
      style={{ display: 'grid', gap: 11, color: 'var(--guild-text, #FFFFFF)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 7 }}
        role="group" aria-label="Battlefield source">
        {[
          ['saved','Saved battle map'],
          ['generic','Generic textured floor'],
          ['none','Plain stone floor'],
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
              style={{ width: '100%', minHeight: 44, padding: 10, fontSize: 16, background: 'var(--guild-bg, #0A2342)', color: 'var(--guild-text, #FFFFFF)', border: '1px solid rgba(201,210,230,.32)', borderRadius: 6 }}>
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
          data-testid="battlefield-texture-preview" data-rq-texture="" />
      )}
      {selectedMode === 'generic' && (
        <div role="group" aria-label="Generic terrain textures"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax('+(compact?'98':'116')+'px,1fr))', gap: 8 }}>
          {GENERIC_COMBAT_TERRAINS.map(item => (
            <button key={item.id} type="button" style={tileButton(item.id === terrain)}
              onClick={() => onTerrainChange?.(item.id)} aria-pressed={item.id === terrain}
              aria-label={item.label} data-testid={'terrain-choice-'+item.id}>
              <span aria-hidden="true" data-rq-texture="" style={previewStyle({ ...genericCombatBackdropStyle(item.id), backgroundSize: '20px 20px, 20px 20px, 80px 80px' })} />
              <strong style={{ fontSize: 11 }}>{item.label}</strong>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
