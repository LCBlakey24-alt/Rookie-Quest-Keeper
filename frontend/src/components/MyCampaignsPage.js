import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import CreateCampaignDialog from '@/components/dashboard/home/CreateCampaignDialog';
import {
  buildWorldSettingNotes,
  initialCampaignForm,
} from '@/components/dashboard/home/unifiedDashboardUtils';
import apiClient from '@/lib/apiClient';
import '@/styles/libraryPages.css';

function recordId(record) {
  return record?.id || record?._id || record?.campaign_id || record?.campaignId || '';
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

function campaignMeta(campaign) {
  const playerCount = campaign?.player_count || campaign?.players?.length || 0;
  const system = campaign?.system || campaign?.rules_edition || 'Fantasy';
  return `${playerCount} player${playerCount === 1 ? '' : 's'} · ${system}`;
}

export default function MyCampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )), [campaigns]);

  const loadCampaigns = async () => {
    try {
      const response = await apiClient.get('/campaigns');
      const records = Array.isArray(response.data) ? response.data : response.data?.campaigns || [];
      setCampaigns(records.filter((item) => item && typeof item === 'object'));
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load campaigns');
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
      await loadCampaigns();
      toast.success('Campaigns refreshed');
    } finally {
      setRefreshing(false);
    }
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
      await loadCampaigns();
      if (campaignId) navigate(`/campaign/${campaignId}`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  if (loading) {
    return (
      <main className="library-page library-page-loading">
        <section className="loading-screen" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <p className="loading-title">Opening My Campaigns...</p>
          <p className="loading-tip">Loading the campaigns you have made or run.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="library-page">
      <section className="library-page-hero">
        <div>
          <p className="library-page-eyebrow">My Campaigns</p>
          <h1>Your running campaigns.</h1>
          <p>Campaign spaces you have created or currently run as a GM.</p>
        </div>
        <button type="button" onClick={() => setShowCreateCampaign(true)}>
          <Plus size={16} />
          Create Campaign
        </button>
      </section>

      <section className="library-page-toolbar" aria-label="Campaign library tools">
        <p className="library-page-count">
          {sortedCampaigns.length} campaign{sortedCampaigns.length === 1 ? '' : 's'} saved
        </p>
        <button type="button" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {sortedCampaigns.length === 0 ? (
        <section className="library-page-empty">
          <h2>No campaigns yet</h2>
          <p>Create a campaign here to start preparing sessions, players, notes, and handouts.</p>
          <div className="library-page-actions">
            <button type="button" onClick={() => setShowCreateCampaign(true)}>Create Campaign</button>
          </div>
        </section>
      ) : (
        <section className="library-page-grid" aria-label="Saved campaigns">
          {sortedCampaigns.map((campaign, index) => {
            const id = recordId(campaign);

            return (
              <article key={id || `campaign-${index}`} className="library-page-card">
                <div>
                  <p className="library-page-card-meta">Campaign</p>
                  <h2>{campaignTitle(campaign)}</h2>
                  <p>{campaignMeta(campaign)}</p>
                </div>
                <div className="library-page-actions">
                  <button type="button" onClick={() => id && navigate(`/campaign/${id}`)} disabled={!id}>
                    Open Campaign <ChevronRight size={16} />
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
          onToggleSessionZero={toggleSessionZero}
          onSubmit={handleCreateCampaign}
          onClose={closeCreateCampaign}
        />
      )}
    </main>
  );
}
