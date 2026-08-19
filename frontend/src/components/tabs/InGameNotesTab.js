import React from 'react';
import GMNotesWorkspace from '@/components/gm/GMNotesWorkspace';

// Compatibility shim for older GM imports. The previous notes screen mixed
// note-taking, automatic world mutation, AI parsing and recap generation in one
// page. GM notes now use the confirmation-first Rookie workflow instead.
export default function InGameNotesTab({ campaignId }) {
  return <GMNotesWorkspace campaignId={campaignId} />;
}
