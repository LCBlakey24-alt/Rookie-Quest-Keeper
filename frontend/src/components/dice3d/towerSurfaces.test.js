import { BoxGeometry, CylinderGeometry } from 'three';

import { SURFACE_KINDS, SURFACE_TILE, createSurfaceLibrary, surfaceRandom, tileBoxUVs, tileRoundUVs } from './towerSurfaces';
import { TOWER_SKIN_CATALOG } from './towerSkinCatalog';
import { buildTower } from './towerSkins';

describe('tower surfaces', () => {
  let quiet;
  beforeEach(() => { quiet = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => quiet.mockRestore());

  test('every design names surfaces that exist', () => {
    TOWER_SKIN_CATALOG.forEach((skin) => {
      ['panel', 'plank', 'roof'].forEach((part) => {
        expect(SURFACE_KINDS).toContain(skin.surface[part]);
        expect(skin[part].color).toMatch(/^#[0-9a-f]{6}$/i);
      });
      expect(skin.outline).toBeGreaterThanOrEqual(0);
    });
  });

  test('only the neon design keeps a lit outline', () => {
    const lit = TOWER_SKIN_CATALOG.filter((skin) => skin.outline > 0).map((skin) => skin.id);
    expect(lit).toEqual(['midnight-spire']);
  });

  test('the same request returns the same material, so a tower shares a handful', () => {
    const library = createSurfaceLibrary();
    const oak = library.material('wood', '#8a5a30');
    expect(library.material('wood', '#8a5a30')).toBe(oak);
    expect(library.material('wood', '#4a2d18')).not.toBe(oak);
    expect(library.material('stone', '#8a5a30')).not.toBe(oak);
    expect(() => library.dispose()).not.toThrow();
  });

  test('without a canvas a surface falls back to its plain colour', () => {
    const library = createSurfaceLibrary();
    const iron = library.material('iron', '#5b5b66');
    expect(iron.map).toBeNull();
    expect(iron.color.getHexString()).toBe('5b5b66');
    expect(iron.metalness).toBeGreaterThan(0.5);
    library.dispose();
  });

  test('the painter random source repeats for a seed and stays in range', () => {
    const a = surfaceRandom(7);
    const b = surfaceRandom(7);
    for (let i = 0; i < 50; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('a long wall tiles its surface instead of stretching it', () => {
    const geometry = tileBoxUVs(new BoxGeometry(4, 12, 0.3), 4, 12, 0.3);
    const uv = geometry.attributes.uv;
    let maxV = 0;
    // The +z face (the wall's broad side) is the fifth group of four corners.
    for (let i = 16; i < 20; i += 1) maxV = Math.max(maxV, uv.getY(i));
    expect(maxV).toBeCloseTo(12 / SURFACE_TILE, 5);
    const round = tileRoundUVs(new CylinderGeometry(1, 1, 8, 8), 8, 8);
    expect(Math.max(...Array.from(round.attributes.uv.array))).toBeCloseTo(2, 5);
  });

  test('every design builds with its columns and trim, and frees what it made', () => {
    TOWER_SKIN_CATALOG.forEach((skin) => {
      const tower = buildTower(skin.id);
      expect(tower.group.children.length).toBeGreaterThan(40);
      expect(() => tower.dispose()).not.toThrow();
    });
  });
});
