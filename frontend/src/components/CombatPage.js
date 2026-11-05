import React from 'react';
import CombatPageTable from './CombatPageTable';

// The mounted /combat/:campaignId route has ONE authoritative end handler:
// CombatPageTable handles online persistence and the atomic offline queue for
// linked character state, loot operations and display cleanup. The former
// document capture handler here intercepted offline clicks before that code
// could run and incorrectly discarded loot/baseline protections.
export default function CombatPage() {
  return <CombatPageTable />;
}
