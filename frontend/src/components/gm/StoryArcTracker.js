import React from 'react';
import QuestManagerV2 from './QuestManagerV2';
import TiaKartaJordanQuestImport from './TiaKartaJordanQuestImport';

// Compatibility shim: older dashboard/live-play code still imports StoryArcTracker.
// Persistent quests now fill that role. The Baldering starter import only appears
// in campaign prep (where onOpenTab is supplied), never in the lean Live Play view.
export default function StoryArcTracker(props) {
  return (
    <>
      {props.onOpenTab && <TiaKartaJordanQuestImport campaignId={props.campaignId} onImported={() => window.location.reload()} />}
      <QuestManagerV2 {...props} />
    </>
  );
}
