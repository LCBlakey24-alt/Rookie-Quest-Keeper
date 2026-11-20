import { TEXTURED_TERRAIN, terrainTile, terrainPattern, terrainSwatch } from './terrainTextures';
import { TERRAIN_TYPES } from './MapCanvas';

describe('terrain textures', () => {
  beforeEach(() => {
    // jsdom has no 2D canvas; stand in for that, as in older browsers.
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => jest.restoreAllMocks());

  it('has a painted texture for every terrain except empty', () => {
    const painted = Object.keys(TERRAIN_TYPES).filter((type) => type !== 'empty');
    expect(TEXTURED_TERRAIN.sort()).toEqual(painted.sort());
  });

  it('returns no tile for empty ground or without a canvas', () => {
    expect(terrainTile('empty')).toBeNull();
    expect(terrainTile('grass', () => null)).toBeNull();
  });

  it('falls back to the flat colour where canvas is unavailable', () => {
    const ctx = { createPattern: jest.fn(() => null) };
    expect(terrainPattern(ctx, 'grass', 40)).toBeNull();
    expect(terrainSwatch('stone', '#4a4a5a')).toBe('#4a4a5a');
  });
});
