import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useDashboardData from '@/components/dashboard/useDashboardData';
import apiClient from '@/lib/apiClient';
import '@/styles/unifiedDashboardBoard.css';
import UnifiedDashboardHeader from '@/components/dashboard/home/UnifiedDashboardHeader';
import UnifiedDashboardStatusBar from '@/components/dashboard/home/UnifiedDashboardStatusBar';
import DashboardContinuePanel from '@/components/dashboard/home/DashboardContinuePanel';
import DashboardSummaryPanel from '@/components/dashboard/home/DashboardSummaryPanel';
import DashboardListRow from '@/components/dashboard/home/DashboardListRow';
import CreateCampaignDialog from '@/components/dashboard/home/CreateCampaignDialog';
import ConfirmDeleteDialog from '@/components/dashboard/home/ConfirmDeleteDialog';
import JoinCodeDialog from '@/components/dashboard/home/JoinCodeDialog';
import {
  buildWorldSettingNotes,
  campaignMeta,
  campaignTitle,
  characterMeta,
  characterTitle,
  initialCampaignForm,
  recordId,
  safeArray,
  statusMessage,
} from '@/components/dashboard/home/unifiedDashboardUtils';

export default function UnifiedDashboard({ username = 'Adventurer', onLogout }) {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

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

    if (id) {
      navigate(`/campaign/${id}`);
      return;
    }

    toast.error('Campaign could not be opened because it is missing an ID. Refresh and try again.');
  };

  const openCharacter = (character) => {
    const id = recordId(character);
    if (id) navigate(`/characters/${id}`);
  };

  const openCreateCampaign = () => setShowCreateCampaign(true);

  const closeCreateCampaign = () => {
    if (!creatingCampaign) setShowCreateCampaign(false);
  };

  const updateCampaignForm = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSessionZero = (id) => {
    setCampaignForm((prev) => {
      const current = Array.isArray(prev.session_zero) ? prev.session_zero : [];
      return {
        ...prev,
        session_zero: current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      };
    });
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    const campaignName = campaignForm.name.trim();

    if (!campaignName) {
      toast.error('Campaign name is required');
      return;
    }

    try {
      setCreatingCampaign(true);
      const response = await apiClient.post('/campaigns', {
        name: campaignName,
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        rules_edition: campaignForm.rules_edition,
        system: campaignForm.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        world_genre: 'fantasy',
        world_setting: campaignForm.world_setting,
        world_setting_notes: buildWorldSettingNotes(campaignForm),
        allow_exploding_dice: false,
        allow_epic_levels: false,
        max_character_level: 20,
        available_classes: [],
      });

      const campaignId = response.data?.id || response.data?._id || response.data?.campaign_id || response.data?.campaignId;
      toast.success('Campaign created');
      setCampaignForm(initialCampaignForm);
      setShowCreateCampaign(false);
      await loadDashboard();
      if (campaignId) navigate(`/campaign/${campaignId}`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const requestDeleteCharacter = (character) => {
    const id = recordId(character);
    if (!id) return;

    setPendingDelete({
      type: 'character',
      id,
      name: characterTitle(character),
      endpoint: `/characters/${id}`,
    });
  };

  const requestDeleteCampaign = (campaign) => {
    const id = recordId(campaign);
    if (!id) return;

    setPendingDelete({
      type: 'campaign',
      id,
      name: campaignTitle(campaign),
      endpoint: `/campaigns/${id}`,
    });
  };

  const requestJoinCode = async (campaign) => {
    const id = recordId(campaign);
    if (!id) return;

    try {
      setInviteLoading(true);
      const response = await apiClient.get(`/campaign-invites/${id}`);
      setPendingInvite({
        ...response.data,
        campaign_name: response.data?.campaign_name || campaignTitle(campaign),
      });
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to get join code');
    } finally {
      setInviteLoading(false);
    }
  };

  const rotateJoinCode = async () => {
    if (!pendingInvite?.campaign_id) return;

    try {
      setInviteLoading(true);
      const response = await apiClient.post(`/campaign-invites/${pendingInvite.campaign_id}`);
      setPendingInvite(response.data);
      toast.success('New join code generated');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to rotate join code');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyJoinCode = async () => {
    const code = pendingInvite?.join_code;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      toast.success('Join code copied');
    } catch {
      toast.info(`Join code: ${code}`);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      setDeleting(true);
      await apiClient.delete(pendingDelete.endpoint);
      toast.success(`${pendingDelete.type === 'campaign' ? 'Campaign' : 'Character'} deleted`);
      setPendingDelete(null);
      await loadDashboard();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Failed to delete ${pendingDelete.type}`);
    } finally {
      setDeleting(false);
    }
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
          title={primaryCharacter ? characterTitle(primaryCharacter) : 'Create your first character'}
          text={primaryCharacter
            ? characterMeta(primaryCharacter)
            : 'Create a character with Full Creator, start quick with Basic Creator, or ask Rook to match you with a hero.'}
          action={primaryCharacter ? 'Open Sheet' : 'Create Character'}
          onClick={() => primaryCharacter ? openCharacter(primaryCharacter) : navigate('/characters/new')}
        />

        <DashboardContinuePanel
          label="GM workspace"
          title={primaryCampaign ? campaignTitle(primaryCampaign) : 'Create your first campaign'}
          text={primaryCampaign
            ? campaignMeta(primaryCampaign)
            : 'Start a campaign space for prep, players, homebrew, notes, and sessions.'}
          action={primaryCampaign ? 'Open Campaign' : 'Create Campaign'}
          onClick={() => primaryCampaign ? openCampaign(primaryCampaign) : openCreateCampaign()}
        />
      </section>

      <section className="dashboard-two-column">
        <DashboardSummaryPanel
          title="Recent Characters"
          emptyText="No characters yet. Use My Characters on the left rail to start building one."
          actionLabel="My Characters"
          onAction={() => navigate('/characters')}
        >
          {latestCharacters.map((character, index) => (
            <DashboardListRow
              key={recordId(character) || `character-${index}`}
              title={characterTitle(character)}
              meta={characterMeta(character)}
              onOpen={() => openCharacter(character)}
              onDelete={() => requestDeleteCharacter(character)}
              deleteLabel="Delete character"
            />
          ))}
        </DashboardSummaryPanel>

        <DashboardSummaryPanel
          title="Recent Campaigns"
          emptyText="No campaigns yet. Use My Campaigns on the left rail to view campaigns once created."
          actionLabel="My Campaigns"
          onAction={() => navigate('/campaigns')}
        >
          {latestCampaigns.map((campaign, index) => (
            <DashboardListRow
              key={recordId(campaign) || `campaign-${index}`}
              title={campaignTitle(campaign)}
              meta={campaignMeta(campaign)}
              onOpen={() => openCampaign(campaign)}
              onSecondary={() => requestJoinCode(campaign)}
              secondaryLabel={inviteLoading ? 'Loading...' : 'Code'}
              onDelete={() => requestDeleteCampaign(campaign)}
              deleteLabel="Delete campaign"
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

      {showCreateCampaign && (
        <CreateCampaignDialog
          form={campaignForm}
          creating={creatingCampaign}
          onChange={updateCampaignForm}
          onToggleSessionZero={toggleSessionZero}
          onSubmit={handleCreateCampaign}
          onClose={closeCreateCampaign}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          pendingDelete={pendingDelete}
          deleting={deleting}
          onCancel={() => !deleting && setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {pendingInvite && (
        <JoinCodeDialog
          invite={pendingInvite}
          loading={inviteLoading}
          onClose={() => !inviteLoading && setPendingInvite(null)}
          onCopy={copyJoinCode}
          onRotate={rotateJoinCode}
        />
      )}
    </main>
  );
}
