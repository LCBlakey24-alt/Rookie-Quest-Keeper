import { encounterStorageKey, loadEncounterPresets, normaliseEncounter, normaliseTokenPositions, saveEncounterPresets, snapTokenPoint } from './vttEncounterPresets';

test('snap aligns a token to 5ft square centre for rectangular artwork', () => {
  expect(snapTokenPoint(10, 17, 20, 1920, 1080, true)).toEqual({ x: 12.5, y: (Math.round(17*11/100-.5)+.5)*100/11 });
  expect(snapTokenPoint(10, 17, 20, 1920, 1080, false)).toEqual({ x: 10, y: 17 });
});

test('encounter positions reject non-finite and out-of-map coordinates', () => {
  expect(normaliseTokenPositions({ good: { x: 12.5, y: 32 }, bad: { x: -1, y: 5 }, wrong: { x: 'NaN', y: 10 } })).toEqual({ good: { x: 12.5, y: 32 } });
});

test('scenes are private per campaign and include map, tokens, fog and ruler', () => {
  const data = new Map();
  const store = { getItem: k=>data.get(k), setItem: (k,v)=>data.set(k,v) };
  const scene = normaliseEncounter({ id:'scene-1', name:'Crypt', mapUrl:'rqk-attachment://private/map.jpg', visibleIds:['vampire'], tokenPositions:{ vampire:{x:75,y:75} }, fog:{enabled:true,reveals:[]}, tactical:{grid:true,columns:24}, snap:true });
  saveEncounterPresets('party-a',[scene],store);
  expect(loadEncounterPresets('party-a',store)[0]).toMatchObject({ name:'Crypt', tokenPositions:{ vampire:{x:75,y:75} }, fog:{enabled:true}, snap:true });
  expect(loadEncounterPresets('party-b',store)).toHaveLength(0);
  expect(encounterStorageKey('party-a')).not.toEqual(encounterStorageKey('party-b'));
});
