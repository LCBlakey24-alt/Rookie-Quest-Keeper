import { drawableRoads, roadDistanceLabel, travelEstimates } from './WorldRoads';

test('labels distances and skips blanks', () => {
  expect(roadDistanceLabel({ distance_value: 48, distance_unit: 'miles' })).toBe('48 mi');
  expect(roadDistanceLabel({ distance_value: 12.25, distance_unit: 'km' })).toBe('12.3 km');
  expect(roadDistanceLabel({ distance_value: 0 })).toBe('');
});

test('travel time uses the map speeds and the road modifier, miles only', () => {
  expect(travelEstimates({ distance_value: 48, distance_unit: 'miles' }, { walking: 24, horseback: 48 }))
    .toEqual([{ label: 'On foot', days: 2 }, { label: 'Horseback', days: 1 }]);
  expect(travelEstimates({ distance_value: 48, distance_unit: 'miles', terrain_modifier: 1.5 }, { walking: 24 }))
    .toEqual([{ label: 'On foot', days: 3 }]);
  expect(travelEstimates({ distance_value: 48, distance_unit: 'km' }, { walking: 24 })).toEqual([]);
  expect(travelEstimates({ distance_value: 144, distance_unit: 'miles', terrain_type: 'sea' }, { walking: 24, ship: 72 }))
    .toEqual([{ label: 'By ship', days: 2 }]);
});

test('only draws roads whose pins both still exist', () => {
  const pins = [{ id: 'a', x: 1, y: 1 }, { id: 'b', x: 2, y: 2 }];
  const roads = drawableRoads([{ id: 'r1', from_pin_id: 'a', to_pin_id: 'b' }, { id: 'r2', from_pin_id: 'a', to_pin_id: 'gone' }], pins);
  expect(roads.map((road) => road.path.id)).toEqual(['r1']);
});
