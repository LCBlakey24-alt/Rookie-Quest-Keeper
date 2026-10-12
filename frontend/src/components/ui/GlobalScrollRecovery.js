import { useEffect } from 'react';

// Leave wheel and trackpad scrolling to the browser. A global capture listener
// prevented native scrolling within NPC/bestiary details, lists and dialogs.

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

    document.addEventListener('click', onLivePlayClick, { capture: true });
    document.addEventListener('click', onCampaignGroupClick, { capture: true });
    const groupObserver = new MutationObserver(initialiseCampaignGroups);
    groupObserver.observe(document.body, { childList: true, subtree: true });
    initialiseCampaignGroups();

    return () => {
      document.removeEventListener('click', onLivePlayClick, { capture: true });
      document.removeEventListener('click', onCampaignGroupClick, { capture: true });
      groupObserver.disconnect();
    };
  }, []);

  return null;
}
