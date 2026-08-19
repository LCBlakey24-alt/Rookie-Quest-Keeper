import React from 'react';
import QuestManagerV3 from './QuestManagerV3';
import LiveQuestRunnerV2 from './LiveQuestRunnerV2';
import TiaKartaJordanQuestImportV2 from './TiaKartaJordanQuestImportV2';
import TiaKartaBalderinCoreImport from './TiaKartaBalderinCoreImport';

// Compatibility shim: older dashboard/live-play code still imports StoryArcTracker.
// Prep gets the full linked-content workspace. Live Play gets a deliberately
// smaller quest runner that only exposes table-speed actions.
export default function StoryArcTracker(props) {
  if (!props.onOpenTab) return <LiveQuestRunnerV2 campaignId={props.campaignId} />;
  return (
    <>
      <details style={packStyle}>
        <summary style={summaryStyle}>Tia-Karta quick loaders</summary>
        <div style={packBodyStyle}>
          <TiaKartaBalderinCoreImport campaignId={props.campaignId} onImported={() => window.location.reload()} />
          <TiaKartaJordanQuestImportV2 campaignId={props.campaignId} onImported={() => window.location.reload()} />
        </div>
      </details>
      <QuestManagerV3 {...props} />
    </>
  );
}

const packStyle = {
  marginBottom: 8,
  background: '#2f2f2f',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#fff',
};

const summaryStyle = {
  minHeight: 40,
  padding: '0 10px',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 11,
  fontWeight: 900,
};

const packBodyStyle = {
  padding: 8,
  borderTop: '1px solid rgba(255,255,255,0.16)',
};
