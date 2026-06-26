import { useEffect } from 'react';

const ACTION_SELECTOR = [
  'button',
  'a.button',
  'a.btn',
  '[role="button"]',
  '[role="tab"]',
  '.landing-button',
  '.dashboard-button',
  '.action-button',
  '.clean-sheet-tabs button',
  '.mobile-dashboard-tabs button',
  '.dashboard-tabs button',
  '.rq-side-tab',
  '.clean-sheet-back',
  '.clean-sheet-edit',
  '.clean-sheet-level',
].join(',');

const IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[disabled]',
  '[aria-disabled="true"]',
  '[data-no-fill-animation="true"]',
].join(',');

const CLICK_FILL_CLASS = 'rq-fill-clicked';
const CLICK_FILL_MS = 420;

export default function GlobalActionFillEffects() {
  useEffect(() => {
    const timers = new WeakMap();

    const triggerFill = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const action = target.closest(ACTION_SELECTOR);
      if (!action || action.matches(IGNORE_SELECTOR)) return;

      action.classList.add(CLICK_FILL_CLASS);
      const existingTimer = timers.get(action);
      if (existingTimer) window.clearTimeout(existingTimer);

      const timer = window.setTimeout(() => {
        action.classList.remove(CLICK_FILL_CLASS);
        timers.delete(action);
      }, CLICK_FILL_MS);

      timers.set(action, timer);
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      triggerFill(event);
    };

    document.addEventListener('pointerdown', triggerFill, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', triggerFill);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
