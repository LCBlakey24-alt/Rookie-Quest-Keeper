import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, ChevronRight, FileText, Link2, Mail, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import CreateCampaignDialog from '@/components/dashboard/home/CreateCampaignDialog';
import {
  buildCampaignFeel,
  buildWorldSettingNotes,
  campaignTypes,
  initialCampaignForm,
  rulesSystemOptions,
} from '@/components/dashboard/home/unifiedDashboardUtils';
import apiClient from '@/lib/apiClient';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import { readActiveCharacterId } from '@/components/dashboard/player/playerActiveCharacterStorage';
import { importDesktopCampaignPack } from '@/preview/desktopCampaignPack';
import { isOfflineDesktop } from '@/preview/previewMode';
import '@/styles/libraryPages.css';
import '@/styles/campaignSetupModal.css';
import './MyCampaignsPage.css';

const PlayerNotesTab = lazy(() => import('@/components/tabs/PlayerNotesTab'));
const PlayerHandoutsPanel = lazy(() => import('@/components/tabs/HandoutsTab').then((mod) => ({ default: mod.PlayerHandoutsPanel })));

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

async function fetchCampaignLibrary() {
  try {
    return await apiClient.get('/library/campaigns');
  } catch (error) {
    const status = error?.response?.status;
    if (status !== 404 && status !== 405) throw error;
    return apiClient.get('/campaigns');
  }
}

export default function MyCampaignsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [importingPack, setImportingPack] = useState(false);
  const [joinedCampaigns, setJoinedCampaigns] = useState([]);
  const [joinCharacters, setJoinCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(readActiveCharacterId);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCharactersLoaded, setJoinCharactersLoaded] = useState(false);
  const desktopOffline = isOfflineDesktop();
  const activeTool = ['notes', 'received'].includes(searchParams.get('view')) ? searchParams.get('view') : '';
  const selectedCharacter = joinCharacters.find((character) => recordId(character) === selectedCharacterId) || joinCharacters[0] || null;

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowCreateCampaign(true);
  }, [searchParams]);


  const playerOnlyCampaigns = useMemo(() => joinedCampaigns.filter((joined) =>
    !campaigns.some((owned) => recordId(owned) === recordId(joined))
  ), [joinedCampaigns, campaigns]);

  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )), [campaigns]);

  const loadCampaigns = async ({ notifyFailure = true } = {}) => {
    try {
      const response = await fetchCampaignLibrary();
      const records = Array.isArray(response.data) ? response.data : response.data?.campaigns || [];
      setCampaigns(records.filter((item) => item && typeof item === 'object'));
      setLoadError('');
      return { ok: true };
    } catch (error) {
      const detail = error?.formattedDetail || error?.response?.data?.detail || 'Failed to load campaigns';
      setLoadError(detail);
      if (notifyFailure) toast.error(detail);
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Preserve all player tools inside Campaigns rather than a second player hub.
  const loadPlayerCampaignTools = async () => {
    if (desktopOffline) return;
    const [charactersResult, joinedResult] = await Promise.allSettled([
      apiClient.get('/library/characters'),
      apiClient.get('/campaign-invites/joined/list'),
    ]);
    if (charactersResult.status === 'fulfilled') {
      const data = charactersResult.value.data;
      const characters = Array.isArray(data) ? data : (data?.characters || []);
      setJoinCharacters(characters);
      setSelectedCharacterId((previous) => characters.some((character) => recordId(character) === previous) ? previous : recordId(characters[0]));
      setJoinCharactersLoaded(true);
    }
    if (joinedResult.status === 'fulfilled') {
      const data = joinedResult.value.data;
      setJoinedCampaigns(Array.isArray(data) ? data : (data?.campaigns || []));
    }
  };

  useEffect(() => { loadPlayerCampaignTools(); }, [desktopOffline]);

  useEffect(() => {
    if (!desktopOffline && joinCharactersLoaded && searchParams.get('join') === '1') {
      if (joinCharacters.length > 0) setJoinOpen(true);
      else toast.info('Create a character before joining a campaign');
      const next = new URLSearchParams(searchParams);
      next.delete('join');
      setSearchParams(next, { replace: true });
    }
  }, [desktopOffline, joinCharactersLoaded, joinCharacters.length, searchParams, setSearchParams]);

  const openJoinCampaign = () => {
    if (!joinCharacters.length) {
      toast.info('Create a character before joining a campaign');
      navigate('/characters/new');
      return;
    }
    setJoinOpen(true);
  };

  const showCampaignTool = (name) => {
    const next = new URLSearchParams(searchParams);
    if (activeTool === name) next.delete('view');
    else next.set('view', name);
    setSearchParams(next, { replace: true });
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const [result] = await Promise.all([loadCampaigns(), loadPlayerCampaignTools()]);
      if (result.ok) toast.success('Campaigns refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const updateCampaignForm = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  };

  const closeCreateCampaign = () => {
    if (creatingCampaign) return;
    setShowCreateCampaign(false);
    if (searchParams.get('create') === '1') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('create');
      setSearchParams(nextParams, { replace: true });
    }
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

  const importCampaignPack = async () => {
    if (!desktopOffline || importingPack) return;
    try {
      setImportingPack(true);
      const result = await importDesktopCampaignPack();
      if (result.canceled) return;
      const action = result.pack_type === 'campaign-update' ? 'updated' : 'imported';
      toast.success(`${result.pack_name} ${action}: ${result.campaign_count} campaign(s), ${result.character_count} character(s), ${result.attachment_count} attachment(s)`);
      window.location.reload();
    } catch (error) {
      toast.error(error?.message || 'Could not import campaign pack');
    } finally {
      setImportingPack(false);
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
          {!desktopOffline && (
            <button type="button" className="library-page-button-secondary" onClick={openJoinCampaign}>
              <Link2 size={16} /> Join by Code
            </button>
          )}
          {desktopOffline && (
            <button
              type="button"
              onClick={importCampaignPack}
              disabled={importingPack}
              className="library-page-button-secondary library-page-loading-button"
              aria-busy={importingPack ? 'true' : 'false'}
            >
              <Upload size={16} />
              {importingPack ? 'Applying…' : 'Import / Apply Update'}
            </button>
          )}
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

      {!desktopOffline && (
        <section className="campaign-player-tools" aria-label="Campaign notes and handouts">
          {joinCharacters.length > 1 && (
            <label className="campaign-join-as">Join campaigns as
              <select aria-label="Character for joining campaigns" value={selectedCharacterId} onChange={(event) => setSelectedCharacterId(event.target.value)}>
                {joinCharacters.map((character) => <option key={recordId(character)} value={recordId(character)}>{character.name || 'Adventurer'}</option>)}
              </select>
            </label>
          )}
          <div className="campaign-player-tools-actions">
            <button type="button" aria-expanded={activeTool === 'notes'}
              className={activeTool === 'notes' ? 'library-page-button-secondary is-active' : 'library-page-button-secondary'}
              onClick={() => showCampaignTool('notes')}>
              <FileText size={17} aria-hidden="true" /> My Notes
            </button>
            <button type="button" aria-expanded={activeTool === 'received'}
              className={activeTool === 'received' ? 'library-page-button-secondary is-active' : 'library-page-button-secondary'}
              onClick={() => showCampaignTool('received')}>
              <Mail size={17} aria-hidden="true" /> Received Handouts
            </button>
          </div>
          {activeTool && (
            <div className="campaign-player-tools-panel" aria-label={activeTool === 'notes' ? 'My Notes' : 'Received Handouts'}>
              <Suspense fallback={<p role="status">Loading {activeTool === 'notes' ? 'notes' : 'handouts'}…</p>}>
                {activeTool === 'notes' ? <PlayerNotesTab campaigns={[...campaigns, ...joinedCampaigns]} /> : <PlayerHandoutsPanel />}
              </Suspense>
            </div>
          )}
        </section>
      )}

      {loadError && sortedCampaigns.length > 0 && (
        <section className="library-page-stale-warning" role="alert" aria-live="polite">
          <div>
            <strong>Showing your last loaded campaigns</strong>
            <p>Keeper couldn’t refresh this list. Your saved campaigns are still shown below.</p>
          </div>
          <button type="button" onClick={refresh} disabled={refreshing} className="library-page-button-secondary library-page-loading-button" aria-busy={refreshing ? 'true' : 'false'}>
            <RefreshCw size={16} className={refreshing ? 'library-page-spin-icon' : undefined} />
            {refreshing ? 'Trying again…' : 'Try again'}
          </button>
        </section>
      )}

      {loadError && sortedCampaigns.length === 0 ? (
        <section className="library-page-empty" role="alert" aria-live="polite">
          <h2>Couldn’t load campaigns</h2>
          <p>{loadError}</p>
          <div className="library-page-actions">
            <button type="button" onClick={refresh} disabled={refreshing} className="library-page-button library-page-button-primary library-page-loading-button">
              <RefreshCw size={16} className={refreshing ? 'library-page-spin-icon' : undefined} />
              {refreshing ? 'Trying again…' : 'Try again'}
            </button>
          </div>
        </section>
      ) : sortedCampaigns.length === 0 ? (
        <section className="library-page-empty campaign-library-empty">
          <h2>No campaigns yet</h2>
          <p>{desktopOffline ? 'Create a campaign, import a campaign pack, or apply a small campaign update from your laptop.' : 'You have no campaigns of your own yet. Create one or join your GM’s campaign using a code.'}</p>
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

      {!desktopOffline && playerOnlyCampaigns.length > 0 && (
        <section className="campaigns-joined-section" aria-labelledby="campaigns-joined-title">
          <h2 id="campaigns-joined-title"><BookOpen size={20} aria-hidden="true" /> Joined as a Player</h2>
          <div className="library-page-grid campaigns-card-grid">
            {playerOnlyCampaigns.map((campaign) => {
              const id = recordId(campaign);
              if (!id) return null;
              return (
                <article className="library-page-card campaign-library-card campaign-library-card--simple" key={id}>
                  <div className="campaign-card-main">
                    <h3>{campaignTitle(campaign)}</h3>
                    <p className="campaign-card-description">{campaignDescription(campaign)}</p>
                  </div>
                  <button type="button" className="campaign-card-open" onClick={() => navigate(`/player/campaign/${id}`)}>
                    Open Player Campaign <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {!desktopOffline && (
        <JoinCampaignModal
          characterId={recordId(selectedCharacter)} characterName={selectedCharacter?.name || 'Selected character'}
          open={joinOpen} onOpenChange={setJoinOpen}
          onSuccess={() => { loadCampaigns(); loadPlayerCampaignTools(); }}
        />
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
