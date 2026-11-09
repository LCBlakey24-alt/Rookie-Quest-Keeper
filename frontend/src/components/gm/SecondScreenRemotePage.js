import React from 'react';
import { useParams } from 'react-router-dom';
import LiveSecondScreenDock from '@/components/gm/LiveSecondScreenDock';

/** A generic, campaign-owned second-screen remote for every GM account. */
export default function SecondScreenRemotePage() {
  const { campaignId } = useParams();
  return (
    <main style={pageStyle} data-testid="second-screen-remote-page">
      <LiveSecondScreenDock campaignId={campaignId} />
    </main>
  );
}

const pageStyle = {
  minHeight: '100dvh',
  background: 'var(--rq-bg, #242424)',
  color: 'var(--rq-text, #ffffff)',
  padding: 'clamp(10px, 2vw, 22px)',
  display: 'grid',
  alignContent: 'start',
  gap: 12,
  fontFamily: 'var(--rq-body-font, Manrope, Inter, system-ui, sans-serif)',
};
