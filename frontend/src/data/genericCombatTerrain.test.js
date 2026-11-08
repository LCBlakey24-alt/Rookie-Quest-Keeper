import {
  createGenericCombatMap,
  genericCombatBackdropStyle,
  GENERIC_COMBAT_TERRAINS,
  normaliseCombatTerrain,
} from './genericCombatTerrain';

describe('generic battlefield fallback', () => {
  test('offers the seven agreed terrain types and defaults unknown inputs to stone', () => {
    expect(GENERIC_COMBAT_TERRAINS.map(item => item.id)).toEqual([
      'stone', 'cobblestone', 'grass', 'dirt', 'sand', 'wood', 'water',
    ]);
    expect(normaliseCombatTerrain(' GRASS ')).toBe('grass');
    expect(normaliseCombatTerrain('url(javascript:alert(1))')).toBe('stone');
    expect(normaliseCombatTerrain(null)).toBe('stone');
  });

  test('produces separate 30 by 20 canvases for every generic map type', () => {
    GENERIC_COMBAT_TERRAINS.forEach(({ id }) => {
      const map = createGenericCombatMap(id);
      expect(map.generated).toBe(true);
      expect(map.width).toBe(30);
      expect(map.height).toBe(20);
      expect(map.terrain).toHaveLength(20);
      expect(map.terrain[0]).toHaveLength(30);
      expect(map.terrain[0][0]).toBe(id);
      expect(map.terrain[19][29]).toBe(id);
      expect(map.tokens).toEqual([]);
      map.terrain[0][0] = 'water';
      expect(map.terrain[1][0]).toBe(id);
    });
  });

  test('uses only built-in texture values in the player display', () => {
    const grass = genericCombatBackdropStyle('grass');
    expect(grass.backgroundColor).toBe('#426848');
    expect(grass.backgroundImage).toContain('linear-gradient');
    expect(genericCombatBackdropStyle('unknown').backgroundColor)
      .toBe(genericCombatBackdropStyle('stone').backgroundColor);
  });
});
