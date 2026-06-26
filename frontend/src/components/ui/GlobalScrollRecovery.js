import { useEffect } from 'react';

function wheelDelta(event) {
  if (event.deltaMode === 1) return event.deltaY * 18;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function maxPageScroll() {
  const doc = document.documentElement;
  const body = document.body;
  return Math.max(
    doc?.scrollHeight || 0,
    body?.scrollHeight || 0,
    doc?.offsetHeight || 0,
    body?.offsetHeight || 0
  ) - window.innerHeight;
}

function pageCanScroll(deltaY) {
  const maxScroll = maxPageScroll();
  if (maxScroll <= 0) return false;
  if (deltaY > 0) return window.scrollY < maxScroll - 1;
  if (deltaY < 0) return window.scrollY > 1;
  return false;
}

export default function GlobalScrollRecovery() {
  useEffect(() => {
    const onWheel = (event) => {
      if (event.ctrlKey || event.metaKey) return;
      const deltaY = wheelDelta(event);
      if (!deltaY || !pageCanScroll(deltaY)) return;
      window.scrollBy(0, deltaY);
      event.preventDefault();
    };

    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });

    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('wheel', onWheel, { capture: true });
    };
  }, []);

  return null;
}
