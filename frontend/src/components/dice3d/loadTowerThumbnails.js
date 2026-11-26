/**
 * Loads the tower pictures for the Settings picker without pulling three.js
 * into the main bundle. The pictures are drawn once per visit and reused;
 * any failure (no WebGL, a failed chunk) resolves to no pictures, and the
 * picker keeps its colour swatches.
 */
let cache = null;

export function loadTowerThumbnails(skinIds = []) {
  if (cache) return cache;
  cache = new Promise((resolve) => {
    const draw = () => import('./towerThumbnails')
      .then((module) => resolve(module.captureTowerThumbnails(skinIds)))
      .catch(() => { cache = null; resolve({}); });
    // Let the picker paint first: building six towers is a few frames of work.
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(draw, { timeout: 1200 });
    } else {
      setTimeout(draw, 60);
    }
  });
  return cache;
}

/** Test helper: forget the drawn pictures. */
export function resetTowerThumbnails() {
  cache = null;
}
