import { containedImageBounds } from './playerDisplayGeometry';

describe('portrait and landscape VTT map token placement', () => {
  test('letterboxes a 16:9 map at the centre of an upright 1080 x 1920 TV', () => {
    expect(containedImageBounds(1080, 1920, 1920, 1080)).toEqual({
      left: 0, top: 656.25, width: 1080, height: 607.5,
    });
  });

  test('letterboxes a portrait image in a 1920 x 1080 display without stretching', () => {
    expect(containedImageBounds(1920, 1080, 1080, 1920)).toEqual({
      left: 656.25, top: 0, width: 607.5, height: 1080,
    });
  });

  test('fits common landscape TVs and an upright 4K screen without overflow', () => {
    for (const [w, h, iw, ih] of [
      [1920, 1080, 1920, 1080],
      [1280, 720, 2048, 1024],
      [2160, 3840, 2048, 1024],
      [720, 1280, 1024, 2048],
    ]) {
      const bounds = containedImageBounds(w, h, iw, ih);
      expect(bounds).not.toBeNull();
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.left + bounds.width).toBeLessThanOrEqual(w + 1e-5);
      expect(bounds.top + bounds.height).toBeLessThanOrEqual(h + 1e-5);
      expect(bounds.width / bounds.height).toBeCloseTo(iw / ih, 7);
    }
  });

  test('does not show mispositioned tokens while the image has not loaded', () => {
    expect(containedImageBounds(1080, 1920, 0, 0)).toBeNull();
    expect(containedImageBounds(0, 0, 1920, 1080)).toBeNull();
    expect(containedImageBounds(NaN, 1080, 1920, 1080)).toBeNull();
  });
});
