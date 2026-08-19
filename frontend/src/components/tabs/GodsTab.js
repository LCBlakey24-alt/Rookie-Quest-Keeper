import React from 'react';
import GMFactionsWorkspace from '@/components/gm/GMFactionsWorkspace';

// Compatibility shim: this route historically tracked only gods, then grew to
// cover factions and other powers. The GM view now uses the compact generic
// workspace while keeping the existing API/data model intact.
export default function GodsTab({ campaignId }) {
  return <GMFactionsWorkspace campaignId={campaignId} />;
}
