import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
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

  const createCampaignFromHome = () => {
    navigate('/home');
    toast.info('Use Create Campaign on the Home Dashboard for now.');
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
        <button type="button" onClick={createCampaignFromHome}>
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
          <p>Create a campaign from the Home Dashboard to start preparing sessions, players, notes, and handouts.</p>
          <div className="library-page-actions">
            <button type="button" onClick={createCampaignFromHome}>Create Campaign</button>
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
    </main>
  );
}
