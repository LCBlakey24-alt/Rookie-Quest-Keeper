// Keeps clean-sheet dice roll results visible for the intended full duration.
// CleanCharacterSheet currently unmounts the original roll burst quickly, so this
// mirrors it into a lightweight overlay that lasts 6 seconds total.

const ACTIVE_CLASS = 'clean-sheet-roll-burst-persisted';
const SOURCE_CLASS = 'clean-sheet-roll-burst';
const DISPLAY_MS = 6000;

function cloneRollBurst(source) {
  if (!source || source.dataset.persistedClone === 'true') return;

  const existing = document.querySelector(`.${ACTIVE_CLASS}`);
  if (existing) existing.remove();

  const clone = source.cloneNode(true);
  clone.dataset.persistedClone = 'true';
  clone.classList.add(ACTIVE_CLASS);
  clone.setAttribute('aria-live', 'polite');
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);

  window.setTimeout(() => {
    clone.classList.add('clean-sheet-roll-burst-fadeout');
  }, Math.max(0, DISPLAY_MS - 350));

  window.setTimeout(() => {
    clone.remove();
  }, DISPLAY_MS);
}

export function installRollBurstPersistence() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__rookRollBurstPersistenceInstalled) return;
  window.__rookRollBurstPersistenceInstalled = true;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.classList?.contains(SOURCE_CLASS) && !node.classList.contains(ACTIVE_CLASS)) {
          cloneRollBurst(node);
        }
        const nested = node.querySelector?.(`.${SOURCE_CLASS}:not(.${ACTIVE_CLASS})`);
        if (nested) cloneRollBurst(nested);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
