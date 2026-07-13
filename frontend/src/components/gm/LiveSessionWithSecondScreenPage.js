import React from 'react';
import LiveSessionGridPage from '@/components/gm/LiveSessionGridPage';
import LiveSecondScreenDock from '@/components/gm/LiveSecondScreenDock';
import { useParams } from 'react-router-dom';

export default function LiveSessionWithSecondScreenPage() {
  const { campaignId } = useParams();

  return (
    <div className="live-session-with-second-screen">
      <LiveSessionGridPage />
      <div className="live-second-screen-fixed">
        <LiveSecondScreenDock campaignId={campaignId} />
      </div>
      <style>{dockCss}</style>
    </div>
  );
}

const dockCss = `
  .live-session-with-second-screen > main {
    padding-right: 350px !important;
  }
  .live-second-screen-fixed {
    position: fixed;
    top: 88px;
    right: 8px;
    bottom: 10px;
    width: 334px;
    z-index: 55;
    overflow: hidden;
  }
  .live-second-screen-fixed [data-testid="live-second-screen-dock"] {
    width: auto !important;
    height: 100% !important;
    max-height: 100% !important;
    position: static !important;
    top: auto !important;
  }
  @media (max-width: 1180px) {
    .live-session-with-second-screen > main {
      padding-right: clamp(8px, 1.1vw, 12px) !important;
    }
    .live-second-screen-fixed {
      position: static;
      width: auto;
      padding: 8px;
      background: #242424;
    }
    .live-second-screen-fixed [data-testid="live-second-screen-dock"] {
      max-height: none !important;
      height: auto !important;
    }
  }
`;
