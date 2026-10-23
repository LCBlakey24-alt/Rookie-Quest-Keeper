// The display's own URL chooses its physical layout, while the broadcast
// chooses what scene/content appears. A TV and a tabletop can follow the same
// campaign without a GM broadcast changing their aspect/arrangement.
export function getPlayerDisplayTarget(urlTarget, broadcastTarget) {
  if (urlTarget === 'standing-tv' || urlTarget === 'virtual-table') return urlTarget;
  return broadcastTarget === 'virtual-table' ? 'virtual-table' : 'standing-tv';
}
