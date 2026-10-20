'use strict';

// Allow popups only for the dedicated player-safe display route.
// Full URL parsing prevents prefix tricks such as rqk://desktop.evil/...,
// encoded path traversal and embedded credentials.
function isSafePlayerDisplayUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'rqk:' || url.host !== 'desktop') return false;
    if (url.username || url.password || url.hash) return false;
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 3 || segments[0] !== 'campaign' || segments[2] !== 'player-display') {
      // Live Play's second-screen dock uses the shorter equivalent route.
      if (!(segments.length === 2 && segments[0] === 'player-display')) return false;
    }
    const campaignId = segments[segments.length === 3 ? 1 : 1];
    if (!campaignId || campaignId === '.' || campaignId === '..' || /[%\\/]/.test(campaignId)) return false;
    if ([...url.searchParams.keys()].some(key => key !== 'target')) return false;
    return true;
  } catch {
    return false;
  }
}

function playerDisplayBounds(displays, primaryId) {
  const display = displays.find(item => item.id !== primaryId);
  const area = display?.workArea || display?.bounds;
  if (!area || !['x','y','width','height'].every(key => Number.isFinite(area[key]))
      || area.width <= 0 || area.height <= 0) return null;
  return { x:area.x, y:area.y, width:area.width, height:area.height,
    minWidth:Math.min(800,area.width), minHeight:Math.min(480,area.height) };
}

module.exports = { isSafePlayerDisplayUrl, playerDisplayBounds };
