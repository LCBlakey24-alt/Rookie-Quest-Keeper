import React from 'react';
import CombatPageTable from './CombatPageTable';

/**
 * The /combat/:campaignId route.
 *
 * This used to add a document-level capture listener that matched
 * [title="End combat"], swallowed the click and ran its own offline
 * ending. Two things were wrong with that.
 *
 * It keyed a data-safety path on a presentation attribute. That title was
 * also the only accessible name on an icon-only button, so the obvious
 * accessibility fix -- giving the button an aria-label and dropping the
 * title -- would have silently disconnected offline protection, with no
 * test and no error to show for it. The loot guard had the same problem
 * through the .combat-loot-save class.
 *
 * And it was a second, weaker implementation of something CombatPageTable
 * already does. endCombat() checks navigator.onLine and calls
 * endCombatOffline(), which refuses to end a fight whose pre-combat
 * baseline is missing -- a guard the listener did not have -- queues loot
 * with operation ids rather than merely warning that loot is unsaved, keeps
 * the fight open if queueing fails, clears the checkpoint, publishes the
 * blank display state and navigates back to wherever the GM came from.
 * Because the listener ran in the capture phase and stopped propagation,
 * none of that ever executed while offline.
 *
 * The one thing the listener did that the component does not is write
 * gm.pendingCombatDisplayClear.<campaignId>. Nothing anywhere reads it.
 */
export default function CombatPage() {
  return <CombatPageTable />;
}
