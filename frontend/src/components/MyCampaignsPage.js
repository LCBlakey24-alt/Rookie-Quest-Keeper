import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Plus, RefreshCw, Trash2 } from 'lucide-react';
import CreateCampaignDialog from '@/components/dashboard/home/CreateCampaignDialog';
import {
  buildCampaignFeel,
  buildWorldSettingNotes,
  campaignTypes,
  initialCampaignForm,
  rulesSystemOptions,
} from '@/components/dashboard/home/unifiedDashboardUtils';
import apiClient from '@/lib/apiClient';
import '@/styles/libraryPages.css';
import '@/styles/campaignSetupModal.css';
import './MyCampaignsPage.css';

function recordId(record) {
  return record?.id || record?._id || record?.campaign_id || record?.campaignId || '';
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

function campaignMeta(campaign) {
  const linkedCount = campaign?.linked_character_count ?? campaign?.player_count ?? campaign?.players?.length ?? 0;
  const system = campaign?.system || rulesSystemOptions[campaign?.rules_edition] || 'Campaign';
  return `${system} • ${linkedCount} character${linkedCount === 1 ? '' : 's'}`;
}

function campaignTypeLabel(campaign) {
  return campaignTypes[campaign?.campaign_type] || campaignTypes[campaign?.world_genre] || 'Campaign';
}

function campaignDescription(campaign) {
  return campaign?.description || campaign?.world_name || campaign?.world_setting_notes || 'Campaign workspace ready for prep.';
}

function formatDate(value) {
  if (!value) return 'Not updated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export default function MyCampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )), [campaigns]);

  const loadCampaigns = async ({ notifyFailure = true } = {}) => {
    try {
      const response = await apiClient.get('/campaigns');
      const records = Array.isArray(response.data) ? response.data : response.data?.campaigns || [];
      setCampaigns(records.filter((item) => item && typeof item === 'object'));
      return { ok: true };
    } catch (error) {
      if (notifyFailure) {
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load campaigns');
      }
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const result = await loadCampaigns();
      if (result.ok) toast.success('Campaigns refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const updateCampaignForm = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  };

  const closeCreateCampaign = () => {
    if (!creatingCampaign) setShowCreateCampaign(false);
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    const campaignName = campaignForm.name.trim();

    if (!campaignName) {
      toast.error('Campaign name is required');
      return;
    }

    const campaignFeel = buildCampaignFeel(campaignForm);
    const setupForm = { ...campaignForm, campaign_feel: campaignFeel };
    const startingLevel = clampNumber(campaignForm.starting_level, 1, 1, 20);
    const partySize = clampNumber(campaignForm.party_size, 4, 1, 12);

    try {
      setCreatingCampaign(true);
      const response = await apiClient.post('/campaigns', {
        name: campaignName,
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        rules_edition: campaignForm.rules_edition,
        system: campaignForm.rules_edition === '2024' ? 'D&D 5e 2024 Compatible' : 'D&D 5e 2014 Compatible',
        campaign_type: campaignForm.campaign_type,
        world_genre: campaignForm.campaign_type,
        world_setting: 'custom',
        world_setting_notes: buildWorldSettingNotes(setupForm),
        tone_preset: campaignForm.tone_preset,
        tone_sliders: campaignForm.tone_sliders,
        campaign_feel: campaignFeel,
        starting_level: startingLevel,
        party_size: partySize,
        visibility: campaignForm.visibility,
        join_mode: campaignForm.join_mode,
        allow_exploding_dice: false,
        allow_epic_levels: false,
        max_character_level: 20,
        available_classes: [],
      });

      const campaignId = response.data?.id || response.data?._id || response.data?.campaign_id || response.data?.campaignId;
      toast.success('Campaign created');
      setCampaignForm(initialCampaignForm);
      setShowCreateCampaign(false);
      await loadCampaigns();
      if (campaignId) navigate(`/campaign/${campaignId}#tab-campaign-rules`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const deleteCampaign = async (campaign) => {
    const id = recordId(campaign);
    const name = campaignTitle(campaign);
    if (!id) return;

    const confirmed = window.confirm(`Delete campaign "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await apiClient.delete(`/campaigns/${id}`);
      toast.success('Campaign deleted');
      await loadCampaigns();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to delete campaign');
    } finally {
      setDeletingId('');
    }
  };

  if (loading) {
    return (
      <main className="library-page library-page-loading">
        <section className="loading-screen library-page-branded-loading" role="status" aria-live="polite" aria-busy="true">
          <div className="loading-card">
            <div className="loading-spinner" aria-hidden="true" />
            <h1 className="loading-title">Opening campaigns…</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="library-page campaigns-library-page campaigns-library-page--simple">
      <section className="library-page-hero campaigns-library-hero">
        <div>
          <p className="library-page-eyebrow">Campaigns</p>
          <h1>My Campaigns</h1>
          <p>{sortedCampaigns.length} saved campaign{sortedCampaigns.length === 1 ? '' : 's'}</p>
        </div>

        <div className="campaigns-library-actions" aria-label="Campaign actions">
          <button type="button" onClick={() => setShowCreateCampaign(true)} className="library-page-button library-page-button-primary">
            <Plus size={16} />
            Create
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="library-page-button-secondary library-page-loading-button"
            aria-busy={refreshing ? 'true' : 'false'}
          >
            <RefreshCw size={16} className={refreshing ? 'library-page-spin-icon' : undefined} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      {sortedCampaigns.length === 0 ? (
        <section className="library-page-empty campaign-library-empty">
          <h2>No campaigns yet</h2>
          <p>Create your first campaign to start building the world.</p>
          <div className="library-page-actions">
            <button type="button" onClick={() => setShowCreateCampaign(true)} className="library-page-button library-page-button-primary">Create Campaign</button>
          </div>
        </section>
      ) : (
        <section className="library-page-grid campaigns-card-grid" aria-label="Saved campaigns">
          {sortedCampaigns.map((campaign, index) => {
            const id = recordId(campaign);
            const deleting = deletingId === id;

            return (
              <article key={id || `campaign-${index}`} className="library-page-card campaign-library-card campaign-library-card--simple">
                <div className="campaign-card-main">
                  <div className="campaign-card-title-row">
                    <h2>{campaignTitle(campaign)}</h2>
                    <span className="campaign-card-type">{campaignTypeLabel(campaign)}</span>
                  </div>
                  <p className="campaign-card-primary-line">{campaignMeta(campaign)}</p>
                  <p className="campaign-card-description">{campaignDescription(campaign)}</p>
                  <p className="campaign-card-meta-line">Updated {formatDate(campaign?.updated_at || campaign?.created_at)}</p>
                </div>

                <div className="campaign-card-actions campaign-card-actions--simple">
                  <button type="button" onClick={() => id && navigate(`/campaign/${id}`)} disabled={!id} className="campaign-card-open">
                    Open Campaign <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCampaign(campaign)}
                    disabled={!id || deleting}
                    className="library-page-danger-button library-page-loading-button campaign-card-delete"
                    aria-label={`Delete ${campaignTitle(campaign)}`}
                    aria-busy={deleting ? 'true' : 'false'}
                    title="Delete campaign"
                  >
                    {deleting ? <RefreshCw size={15} className="library-page-spin-icon" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showCreateCampaign && (
        <CreateCampaignDialog
          form={campaignForm}
          creating={creatingCampaign}
          onChange={updateCampaignForm}
          onSubmit={handleCreateCampaign}
          onClose={closeCreateCampaign}
        />
      )}
    </main>
  );
}
