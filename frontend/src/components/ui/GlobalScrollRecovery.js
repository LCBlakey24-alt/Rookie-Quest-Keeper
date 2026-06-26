import { useEffect } from 'react';

const SCROLLABLE_SELECTOR = [
  '[data-scroll-area]',
  '[role="dialog"]',
  '.sidebar',
  '.rq-scroll-x',
  'main',
  'section',
  'article',
  'div',
].join(',');

const FORM_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

function isScrollable(element) {
  if (!element || element === document.body || element === document.documentElement) return false;
  const style = window.getComputedStyle(element);
  const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY || style.overflow);
  return canScrollY && element.scrollHeight > element.clientHeight + 1;
}

function canScrollInDirection(element, deltaY) {
  if (!isScrollable(element)) return false;
  if (deltaY > 0) return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  if (deltaY < 0) return element.scrollTop > 1;
  return false;
}

function getScrollableTarget(startElement, deltaY) {
  let element = startElement instanceof Element ? startElement : null;

  while (element && element !== document.body && element !== document.documentElement) {
    if (element.matches(SCROLLABLE_SELECTOR) && canScrollInDirection(element, deltaY)) return element;
    element = element.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

function normaliseWheelDelta(event) {
  if (event.deltaMode === 1) return event.deltaY * 18;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

export default function GlobalScrollRecovery() {
  useEffect(() => {
    const handleWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      if (target instanceof Element && target.closest(FORM_SELECTOR)) {
        const formTarget = getScrollableTarget(target, event.deltaY);
        if (formTarget !== document.scrollingElement && formTarget !== document.documentElement) return;
      }

      const deltaY = normaliseWheelDelta(event);
      if (!deltaY) return;

      const scrollTarget = getScrollableTarget(target, deltaY);
      if (!scrollTarget) return;

      const before = scrollTarget.scrollTop;
      scrollTarget.scrollTop += deltaY;
      const after = scrollTarget.scrollTop;

      if (after !== before) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => document.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  return null;
}
