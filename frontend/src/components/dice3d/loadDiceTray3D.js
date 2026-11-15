let trayModulePromise = null;

/**
 * Load the physical dice renderer once for every roll surface.
 *
 * Keeping the promise here means opening the global roller can warm the
 * chunk before a die is chosen, while character and GM rolls still share
 * the same failure and retry behaviour.
 */
export function loadDiceTray3D() {
  if (!trayModulePromise) {
    trayModulePromise = import('@/components/DiceTray3DOverlay')
      .then((module) => module.default)
      .catch((error) => {
        // A transient chunk/network failure should not permanently disable
        // physical dice for the rest of the signed-in session.
        trayModulePromise = null;
        throw error;
      });
  }
  return trayModulePromise;
}

export function preloadDiceTray3D() {
  return loadDiceTray3D().catch(() => null);
}
