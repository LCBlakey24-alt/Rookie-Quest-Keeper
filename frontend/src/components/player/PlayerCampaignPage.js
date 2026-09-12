import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Mail, Clock, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchPlayerCampaignSections } from './playerCampaignData';
import { fetchPlayerHandoutSummary } from '@/components/dashboard/player/playerDashboardData';
import '@/styles/playerCampaign.css';
import '@/styles/playerCampaignCharacterStatus.css';
import '@/styles/playerCampaignTabBadge.css';

const PlayerNotesTab = lazy(() => import('@/components/tabs/PlayerNotesTab'));
const PlayerHandoutsPanel = lazy(() => import('@/components/tabs/HandoutsTab').then(module => ({ default: module.PlayerHandoutsPanel })));
const SessionTimeline = lazy(() => import('@/components/SessionTimeline'));
const CombatInitiativeSubmitter = lazy(() => import('./CombatInitiativeSubmitter'));
const PlayerGroupCheckPrompt = lazy(() => import('./PlayerGroupCheckPrompt'));

const tabs = [
  { id: 'campaign', label: 'Campaign', icon: BookOpen },
  { id: 'notes', label: 'My notes', icon: FileText },
  { id: 'handouts', label: 'Handouts', icon: Mail },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

function characterHp(character) {
  const current = character.current_hit_points ?? character.current_hp ?? character.stats?.current_hp;
  const maximum = character.max_hit_points ?? character.max_hp ?? character.stats?.max_hp;
  return `${current ?? '—'} / ${maximum ?? '—'}`;
}

function characterAc(character) {
  return character.armor_class ?? character.ac ?? character.stats?.armor_class ?? character.stats?.ac ?? '—';
}

export default function PlayerCampaignPage() {
  const { campaignId } = useParams();
  return <PlayerCampaignWorkspace key={campaignId} campaignId={campaignId} />;
}

export function PlayerCampaignWorkspace({ campaignId }) {
  const navigate = useNavigate();
  const requestRef = useRef(0);
  const [data, setData] = useState({ campaign: null, party: null, characters: null });
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [failures, setFailures] = useState([]);
  const [handoutSummary, setHandoutSummary] = useState({ total: 0, unread: 0, saved: 0 });

  const refreshHandoutSummary = useCallback(async () => {
    try {
      const summary = await fetchPlayerHandoutSummary(apiClient, campaignId);
      setHandoutSummary(summary);
    } catch {
      // Handout counts are secondary; the full Handouts tab still has its own error state.
    }
  }, [campaignId]);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    try {
      const [result] = await Promise.all([
        fetchPlayerCampaignSections(apiClient, campaignId),
        refreshHandoutSummary(),
      ]);
      if (request !== requestRef.current) return;
      setData(previous => ({
        campaign: result.campaign ?? previous.campaign,
        party: result.party ?? previous.party,
        characters: result.characters ?? previous.characters,
      }));
      setFailures(result.failures);
    } catch {
      if (request === requestRef.current) setFailures(['campaign details', 'party', 'characters']);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [campaignId, refreshHandoutSummary]);

  useEffect(() => {
    refresh();
    return () => { requestRef.current += 1; };
  }, [refresh]);

  const leaveCampaign = async () => {
    const campaignName = data.campaign?.name || 'this campaign';
    if (!window.confirm(`Leave ${campaignName}? Your character will be unlinked, but the GM's campaign data will not be deleted.`)) return;
    setLeaving(true);
    try {
      await apiClient.delete(`/campaign-invites/${campaignId}/membership`);
      toast.success(`Left ${campaignName}`, { description: 'You can join again later with a GM join code.' });
      navigate('/player', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not leave the campaign');
    } finally {
      setLeaving(false);
    }
  };

  const { campaign, party, characters } = data;
  const environment = campaign?.environment || {};
  const campaignTabs = tabs.map(tab => tab.id === 'handouts' && handoutSummary.unread > 0
    ? { ...tab, badge: handoutSummary.unread }
    : tab);

  return (
    <main className="player-campaign-page">
      <header className="player-campaign-header">
        <div>
          <Link to="/player" className="player-campaign-back"><ArrowLeft size={16} /> Player home</Link>
          <h1>{campaign?.name || 'Your campaign'}</h1>
          {campaign?.system && <p>{campaign.system}{campaign.rules_edition ? ` · ${campaign.rules_edition}` : ''}</p>}
        </div>
        <div className="player-campaign-header-actions">
          <Button onClick={refresh} disabled={loading || leaving}><RefreshCw size={16} /> {loading ? 'Loading…' : 'Refresh'}</Button>
          <Button className="player-campaign-leave" onClick={leaveCampaign} disabled={leaving || loading}><LogOut size={16} /> {leaving ? 'Leaving…' : 'Leave campaign'}</Button>
        </div>
      </header>
      {failures.length > 0 && <div role="status" className="player-campaign-warning">
        Could not refresh {failures.join(', ')}. Previously loaded information remains visible. Try Refresh to check again.
      </div>}
      {characters?.length > 0 && (
        <Suspense fallback={null}>
          <PlayerGroupCheckPrompt campaignId={campaignId} characters={characters} />
        </Suspense>
      )}
      <Tabs defaultValue="campaign">
        <TabsList className="player-campaign-tabs" aria-label="Campaign sections">
          {campaignTabs.map(({ id, label, badge, icon: Icon }) => <TabsTrigger key={id} value={id}>
            <Icon size={16} />
            <span>{label}</span>
            {badge > 0 && <span className="player-campaign-tab-badge" aria-label={`${badge} unread`}>{badge > 99 ? '99+' : badge}</span>}
          </TabsTrigger>)}
        </TabsList>
        <TabsContent value="campaign">
          <div className="player-campaign-grid">
            <div className="player-campaign-column">
              <section className="player-campaign-card">
                <h2>Your characters</h2>
                {characters === null ? <p>{loading ? 'Loading characters…' : 'Your characters could not be loaded.'}</p>
                  : characters.length === 0 ? <p>No character is linked to this campaign. <Link to="/player">Choose a character and join with your GM’s code.</Link></p>
                    : <ul className="player-campaign-list">{characters.map(character => <li key={character.id}>
                      <div className="player-campaign-character-copy">
                        <h3>{character.name || character.character_name || 'Character'}</h3>
                        <div className="player-campaign-character-status">
                          <span>Lv {character.level || 1} {character.character_class || character.class_name || 'Adventurer'}</span>
                          <span>HP {characterHp(character)}</span>
                          <span>AC {characterAc(character)}</span>
                        </div>
                      </div>
                      <Link className="player-campaign-action" aria-label={`Open ${character.name || character.character_name || 'character'} sheet`} to={`/characters/${character.id}`}>Open Sheet</Link>
                    </li>)}</ul>}
              </section>
              <section className="player-campaign-card">
                <h2>Your party</h2>
                {party === null ? <p>{loading ? 'Loading party…' : 'The party list is currently unavailable.'}</p>
                  : party.length === 0 ? <p>No party members have been linked yet.</p>
                    : <ul className="player-campaign-list">{party.map((member, index) => <li key={member.id || index}>
                      <div><h3>{member.name || member.character_name || 'Party member'}</h3>
                        <p>Level {member.level || 1} {member.character_class || member.class_name || ''}</p></div>
                    </li>)}</ul>}
              </section>
              {characters?.length > 0 && <Suspense fallback={<p>Loading initiative…</p>}>
                <CombatInitiativeSubmitter campaignId={campaignId} />
              </Suspense>}
            </div>
            <section className="player-campaign-card">
              <h2>At the table</h2>
              {environment.background_image && <img className="player-campaign-image" src={environment.background_image} alt="Campaign setting" />}
              {campaign?.world_name && <h3>{campaign.world_name}</h3>}
              <p className="player-campaign-description">{campaign?.description || (loading ? 'Loading campaign details…' : 'Your GM’s shared campaign details will appear here.')}</p>
              <dl className="player-campaign-environment">{['weather', 'time_of_day', 'season', 'terrain', 'temperature'].filter(key => environment[key]).map(key => (
                <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{environment[key]}</dd></div>
              ))}</dl>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="notes"><Suspense fallback={<p>Loading notes…</p>}><PlayerNotesTab campaignId={campaignId} /></Suspense></TabsContent>
        <TabsContent value="handouts"><Suspense fallback={<p>Loading handouts…</p>}><PlayerHandoutsPanel campaignId={campaignId} onSummaryChange={setHandoutSummary} /></Suspense></TabsContent>
        <TabsContent value="timeline"><Suspense fallback={<p>Loading timeline…</p>}><SessionTimeline campaignId={campaignId} readOnly /></Suspense></TabsContent>
      </Tabs>
    </main>
  );
}
