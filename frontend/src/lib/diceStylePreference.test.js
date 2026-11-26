import { DEFAULT_DICE_STYLE, loadDiceStyle, loadTowerSkinId, saveDiceStyle, saveTowerSkinId, subscribeDiceStyle } from './diceStylePreference';
import { DEFAULT_TOWER_SKIN_ID } from '@/components/dice3d/towerSkinCatalog';

beforeEach(() => window.localStorage.clear());

test('defaults to the 3D tray and the first tower design', () => {
  expect(loadDiceStyle()).toBe(DEFAULT_DICE_STYLE);
  expect(DEFAULT_DICE_STYLE).toBe('tray');
  expect(loadTowerSkinId()).toBe(DEFAULT_TOWER_SKIN_ID);
});

test('saves and loads a choice', () => {
  saveDiceStyle('tower');
  saveTowerSkinId('ember-forge');
  expect(loadDiceStyle()).toBe('tower');
  expect(loadTowerSkinId()).toBe('ember-forge');
});

test('ignores unknown or hand-edited values', () => {
  window.localStorage.setItem('rq-dice-style', 'rainbow');
  window.localStorage.setItem('rq-dice-tower-skin', 'nope');
  expect(loadDiceStyle()).toBe(DEFAULT_DICE_STYLE);
  expect(loadTowerSkinId()).toBe(DEFAULT_TOWER_SKIN_ID);
  expect(saveDiceStyle('rainbow')).toBe(DEFAULT_DICE_STYLE);
});

test('tells subscribers when the choice changes', () => {
  const seen = [];
  const stop = subscribeDiceStyle((next) => seen.push(next));
  saveDiceStyle('tower');
  stop();
  saveDiceStyle('tray');
  expect(seen).toEqual([{ style: 'tower', towerSkin: DEFAULT_TOWER_SKIN_ID, towerCamera: 'showcase' }]);
});

test('an old "basic" choice falls back to the 3D tray', () => {
  window.localStorage.setItem('rq-dice-style', 'basic');
  expect(loadDiceStyle()).toBe('tray');
});
