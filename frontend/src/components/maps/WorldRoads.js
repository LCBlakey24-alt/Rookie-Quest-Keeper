import React from 'react';

/** Road styles the GM can pick; any other saved terrain_type draws as a road. */
export const ROAD_TYPES = [
  { id: 'road', label: 'Road', colour: 'var(--rq-map-road, #f4d58d)', dash: '' },
  { id: 'trail', label: 'Trail', colour: 'var(--rq-map-trail, #e8c9a0)', dash: '9 6' },
  { id: 'river', label: 'River route', colour: 'var(--rq-map-river, #7cc4ff)', dash: '' },
  { id: 'sea', label: 'Sea route', colour: 'var(--rq-map-sea, #9fd8ff)', dash: '2 7' },
];

export const roadType = (id) => ROAD_TYPES.find((type) => type.id === id) || ROAD_TYPES[0];

const UNIT_SHORT = { miles: 'mi', km: 'km', leagues: 'lg' };

/** "48 mi", or "" when no distance was entered. */
export function roadDistanceLabel(path) {
  const value = Number(path?.distance_value);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${UNIT_SHORT[path.distance_unit] || path.distance_unit || 'mi'}`;
}

/**
 * Days of travel for a road, from the map's own travel speeds (miles per
 * day) and the road's terrain modifier. Only for distances in miles, since
 * the speeds are miles per day. Returns [{ label, days }] or [].
 */
export function travelEstimates(path, travelSpeeds) {
  const distance = Number(path?.distance_value);
  if (!Number.isFinite(distance) || distance <= 0 || (path.distance_unit || 'miles') !== 'miles') return [];
  const modifier = Number(path.terrain_modifier) > 0 ? Number(path.terrain_modifier) : 1;
  const speeds = travelSpeeds || {};
  // Boats on water routes; feet and horses on land.
  const byWater = ['river', 'sea'].includes(path.terrain_type);
  const modes = byWater ? [['By ship', speeds.ship]] : [['On foot', speeds.walking], ['Horseback', speeds.horseback]];
  return modes
    .filter(([, speed]) => Number(speed) > 0)
    .map(([label, speed]) => ({ label, days: Math.round(((distance * modifier) / Number(speed)) * 10) / 10 }));
}

/** Roads that join two pins still on the map, with their end points. */
export function drawableRoads(paths, pins) {
  const byId = new Map((pins || []).map((pin) => [pin.id, pin]));
  return (paths || [])
    .map((path) => ({ path, from: byId.get(path.from_pin_id), to: byId.get(path.to_pin_id) }))
    .filter((road) => road.from && road.to);
}

/**
 * Roads between world map pins: lines under the pins, plus a small button
 * at each road's middle (its distance) that opens the road to edit.
 */
export default function WorldRoads({ paths, pins, onSelect, highlightPinId }) {
  const roads = drawableRoads(paths, pins);
  if (!roads.length) return null;
  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-testid="world-roads"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
      >
        {roads.map(({ path, from, to }) => {
          const type = roadType(path.terrain_type);
          const linked = highlightPinId && (from.id === highlightPinId || to.id === highlightPinId);
          return (
            <g key={path.id}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ stroke: 'var(--rq-map-road-casing, #120a1f)' }} strokeWidth={linked ? 7 : 6} strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.65" />
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ stroke: type.colour }} strokeWidth={linked ? 4 : 3} strokeLinecap="round" vectorEffect="non-scaling-stroke"
                strokeDasharray={type.dash || undefined} />
            </g>
          );
        })}
      </svg>
      {onSelect && roads.map(({ path, from, to }) => {
        const label = roadDistanceLabel(path) || roadType(path.terrain_type).label;
        return (
          <button
            key={`label-${path.id}`}
            type="button"
            onClick={(event) => { event.stopPropagation(); onSelect(path); }}
            aria-label={`Road from ${from.name} to ${to.name}${roadDistanceLabel(path) ? `, ${roadDistanceLabel(path)}` : ''}. Edit road`}
            data-testid={`world-road-${path.id}`}
            style={{
              position: 'absolute', left: `${(from.x + to.x) / 2}%`, top: `${(from.y + to.y) / 2}%`, transform: 'translate(-50%, -50%)',
              zIndex: 2, minHeight: 44, minWidth: 44, padding: 0, border: 0, background: 'transparent', cursor: 'pointer',
              display: 'inline-grid', placeItems: 'center',
            }}
          >
            {/* The pill stays small on the map; the button around it is a full 44px target. */}
            <span style={{
              padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', background: 'var(--guild-bg, #0a0612)',
              color: 'var(--guild-text, #fff)', fontSize: 11, fontWeight: 800, border: `1px solid ${roadType(path.terrain_type).colour}`,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </>
  );
}
