import { getContainedMapRect } from './containedMapGeometry';

describe('contained battle map token positioning', () => {
  test('centres a landscape map vertically in a tall table stage', () => {
    expect(getContainedMapRect(600, 800, 1600, 900)).toEqual({
      left: 0, top: 231.25, width: 600, height: 337.5,
    });
  });

  test('centres a portrait map horizontally on a widescreen TV', () => {
    expect(getContainedMapRect(1280, 720, 800, 1200)).toEqual({
      left: 400, top: 0, width: 480, height: 720,
    });
  });

  test('fills the screen when the map and display aspect ratios match', () => {
    expect(getContainedMapRect(1280, 720, 1920, 1080)).toEqual({
      left: 0, top: 0, width: 1280, height: 720,
    });
  });

  test('does not create invalid overlays while an image is loading', () => {
    expect(getContainedMapRect(1280, 720, 0, 0)).toBeNull();
    expect(getContainedMapRect(0, 720, 1920, 1080)).toBeNull();
    expect(getContainedMapRect(Infinity, 720, 1920, 1080)).toBeNull();
  });
});
