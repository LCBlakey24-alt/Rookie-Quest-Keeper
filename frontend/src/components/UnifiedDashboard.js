import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDashboardData from '@/components/dashboard/useDashboardData';
import apiClient from '@/lib/apiClient';
import '@/styles/unifiedDashboardBoard.css';
import '@/styles/unifiedDashboardPolish.css';
import UnifiedDashboardHeader from '@/components/dashboard/home/UnifiedDashboardHeader';
import UnifiedDashboardStatusBar from '@/components/dashboard/home/UnifiedDashboardStatusBar';
import DashboardContinuePanel from '@/components/dashboard/home/DashboardContinuePanel';
import DashboardSummaryPanel from '@/components/dashboard/home/DashboardSummaryPanel';
import DashboardListRow from '@/components/dashboard/home/DashboardListRow';
import {
  campaignMeta,
  campaignTitle,
  characterMeta,
  characterTitle,
  recordId,
  safeArray,
  statusMessage,
} from '@/components/dashboard/home/unifiedDashboardUtils';

export default function UnifiedDashboard({ username = 'Adventurer', onLogout }) {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');

  const {
    characters,
    campaigns,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    recentCharacters,
    recentCampaigns,
    loadDashboard,
  } = useDashboardData();

  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const latestCharacters = safeArray(recentCharacters).slice(0, 4);
  const latestCampaigns = safeArray(recentCampaigns).slice(0, 4);
  const primaryCharacter = latestCharacters[0];
  const primaryCampaign = latestCampaigns[0];

  const checkBackend = async () => {
    setBackendStatus('Checking');
    const startedAt = Date.now();

    try {
      await apiClient.get('/health', { timeout: 8000 });
      setBackendStatus(Date.now() - startedAt > 3000 ? 'Slow' : 'Ready');
    } catch {
      setBackendStatus('Offline');
    } finally {
      setBackendCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const refreshEverything = async () => {
    await Promise.allSettled([loadDashboard(), checkBackend()]);
  };

  const openCampaign = (campaign) => {
    const id = recordId(campaign);
    if (id) navigate(`/campaign/${id}`);
  };

  const openCharacter = (character) => {
    const id = recordId(character);
    if (id) navigate(`/characters/${id}`);
  };

  if (loading) {
    return (
      <main className="unified-dashboard-page">
        <section className="loading-screen dashboard-loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <p className="loading-title">Opening dashboard...</p>
          <p className="loading-tip">
            {slowLoad
              ? 'The backend may be waking up. This should only take a moment.'
              : 'Loading your table workspace.'}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="unified-dashboard-page">
      <UnifiedDashboardHeader
        username={username}
        refreshing={refreshing}
        onRefresh={refreshEverything}
        onLogout={onLogout}
      />

      <UnifiedDashboardStatusBar
        characterCount={safeCharacters.length}
        campaignCount={safeCampaigns.length}
        isAdmin={isAdmin}
        backendStatus={backendStatus}
      />

      <section className="unified-dashboard-continue-grid" aria-label="Continue where you left off">
        <DashboardContinuePanel
          label="Continue playing"
          title={primaryCharacter ? characterTitle(primaryCharacter) : 'No character selected yet'}
          text={primaryCharacter
            ? characterMeta(primaryCharacter)
            : 'Use My Characters on the left rail to create and manage your characters.'}
          action={primaryCharacter ? 'Open Sheet' : 'My Characters'}
          onClick={() => primaryCharacter ? openCharacter(primaryCharacter) : navigate('/characters')}
        />

        <DashboardContinuePanel
          label="GM workspace"
          title={primaryCampaign ? campaignTitle(primaryCampaign) : 'No campaign selected yet'}
          text={primaryCampaign
            ? campaignMeta(primaryCampaign)
            : 'Use My Campaigns on the left rail to create and manage your campaigns.'}
          action={primaryCampaign ? 'Open Campaign' : 'My Campaigns'}
          onClick={() => primaryCampaign ? openCampaign(primaryCampaign) : navigate('/campaigns')}
        />
      </section>

      <section className="dashboard-two-column">
        <DashboardSummaryPanel
          title="Recent Characters"
          emptyText="No characters yet. Open My Characters from the left rail to start building one."
          actionLabel="View My Characters"
          onAction={() => navigate('/characters')}
        >
          {latestCharacters.map((character, index) => (
            <DashboardListRow
              key={recordId(character) || `character-${index}`}
              title={characterTitle(character)}
              meta={characterMeta(character)}
              onOpen={() => openCharacter(character)}
            />
          ))}
        </DashboardSummaryPanel>

        <DashboardSummaryPanel
          title="Recent Campaigns"
          emptyText="No campaigns yet. Open My Campaigns from the left rail to create one."
          actionLabel="View My Campaigns"
          onAction={() => navigate('/campaigns')}
        >
          {latestCampaigns.map((campaign, index) => (
            <DashboardListRow
              key={recordId(campaign) || `campaign-${index}`}
              title={campaignTitle(campaign)}
              meta={campaignMeta(campaign)}
              onOpen={() => openCampaign(campaign)}
            />
          ))}
        </DashboardSummaryPanel>
      </section>

      <section className="unified-dashboard-board dashboard-system-panel">
        <div>
          <p className="dashboard-eyebrow">System status</p>
          <p className="dashboard-muted">{statusMessage(backendStatus, backendCheckedAt)}</p>
        </div>
        <button type="button" onClick={checkBackend} className="dashboard-link-button">
          <span>Check backend</span>
        </button>
      </section>
    </main>
  );
}
