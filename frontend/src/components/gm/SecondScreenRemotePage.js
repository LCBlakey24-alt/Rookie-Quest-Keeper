import React from 'react';
import { useParams } from 'react-router-dom';
import usePrivateCampaignPackAccess from '@/hooks/usePrivateCampaignPackAccess';

const TiaKartaSecondScreenQuickRemote = React.lazy(() => import('@/components/gm/TiaKartaSecondScreenQuickRemote'));

export default function SecondScreenRemotePage() {
  const { campaignId } = useParams();
  const canUsePersonalCampaignPacks = usePrivateCampaignPackAccess(campaignId);
  return (
    <main style={pageStyle} data-testid="second-screen-remote-page">
      {canUsePersonalCampaignPacks ? (
        <React.Suspense fallback={<p role="status">Opening campaign remote…</p>}>
          <TiaKartaSecondScreenQuickRemote campaignId={campaignId} />
        </React.Suspense>
      ) : (
        <section data-testid="private-remote-restricted">
          <h1>Personal campaign remote</h1>
          <p>This private campaign tool is not available for your account. Open Live Play to use the general player display controls.</p>
        </section>
      )}
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
