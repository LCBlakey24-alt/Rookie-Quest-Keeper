import React from 'react';
import QuestManagerV3 from './QuestManagerV3';
import LiveQuestRunnerV2 from './LiveQuestRunnerV2';
import TiaKartaJordanQuestImport from './TiaKartaJordanQuestImport';

// Compatibility shim: older dashboard/live-play code still imports StoryArcTracker.
// Prep gets the full linked-content workspace. Live Play gets a deliberately
// smaller quest runner that only exposes table-speed actions.
export default function StoryArcTracker(props) {
  if (!props.onOpenTab) return <LiveQuestRunnerV2 campaignId={props.campaignId} />;
  return (
    <>
      <TiaKartaJordanQuestImport campaignId={props.campaignId} onImported={() => window.location.reload()} />
      <QuestManagerV3 {...props} />
    </>
  );
}
