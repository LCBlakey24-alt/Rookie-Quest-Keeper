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

function isCampaignGroupButton(element) {
  return element instanceof HTMLElement
    && element.matches('button[data-testid^="group-"]')
    && element.closest('.sidebar');
}

function setGroupChildrenVisible(groupWrapper, visible) {
  if (!groupWrapper) return;
  const buttons = Array.from(groupWrapper.querySelectorAll(':scope > button'));
  buttons.forEach((button, index) => {
    if (index === 0) return;
    button.style.display = visible ? 'flex' : 'none';
  });
}

function setGroupArrow(groupButton, expanded) {
  if (!groupButton) return;
  groupButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const icon = groupButton.querySelector('svg');
  if (icon) {
    icon.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
    icon.style.transition = 'transform 120ms ease';
  }
}

function toggleCampaignGroup(groupButton) {
  const groupWrapper = groupButton?.parentElement;
  if (!groupWrapper) return;
  const nextExpanded = groupWrapper.dataset.rqExpanded !== 'true';
  groupWrapper.dataset.rqExpanded = nextExpanded ? 'true' : 'false';
  setGroupChildrenVisible(groupWrapper, nextExpanded);
  setGroupArrow(groupButton, nextExpanded);
}

function campaignIdFromPath() {
  const match = window.location.pathname.match(/\/campaign\/([^/]+)/) || window.location.pathname.match(/\/gm-screen\/([^/]+)/);
  return match?.[1] || '';
}

function isLivePlayButton(button) {
  if (!(button instanceof HTMLElement)) return false;
  const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return button.dataset.testid === 'open-dm-screen-btn'
    || text === 'live play mode'
    || text === 'open live play mode'
    || text.includes('live play mode');
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

    const onCampaignGroupClick = (event) => {
      const groupButton = event.target instanceof Element
        ? event.target.closest('button[data-testid^="group-"]')
        : null;

      if (!isCampaignGroupButton(groupButton)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      toggleCampaignGroup(groupButton);
    };

    const onLivePlayClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!isLivePlayButton(button)) return;
      const campaignId = campaignIdFromPath();
      if (!campaignId) return;
      const livePath = `/gm-screen/${campaignId}`;
      if (window.location.pathname === livePath) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      window.location.assign(livePath);
    };

    const initialiseCampaignGroups = () => {
      document.querySelectorAll('.sidebar button[data-testid^="group-"]').forEach((groupButton) => {
        const groupWrapper = groupButton.parentElement;
        if (!groupWrapper || groupWrapper.dataset.rqExpanded) return;
        groupWrapper.dataset.rqExpanded = 'true';
        groupButton.setAttribute('aria-expanded', 'true');
      });
    };

    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('click', onLivePlayClick, { capture: true });
    document.addEventListener('click', onCampaignGroupClick, { capture: true });
    const groupObserver = new MutationObserver(initialiseCampaignGroups);
    groupObserver.observe(document.body, { childList: true, subtree: true });
    initialiseCampaignGroups();

    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('click', onLivePlayClick, { capture: true });
      document.removeEventListener('click', onCampaignGroupClick, { capture: true });
      groupObserver.disconnect();
    };
  }, []);

  return null;
}
