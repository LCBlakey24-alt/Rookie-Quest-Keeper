import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BookOpen, ChevronRight, CloudRain, Heart, Link2, Plus, RefreshCw, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CombatInitiativeSubmitter from '@/components/player/CombatInitiativeSubmitter';
import {
  describeMobilePlayerFailures,
  fetchMobileCampaignSections,
  fetchMobileDashboardSections,
} from '@/components/mobilePlayerCampaignData';

const theme = {
  bg: '#0a1728',
  panel: '#102238',
  panelAlt: '#14283e',
  border: 'rgba(181,203,226,0.16)',
  red: '#d00000',
  redBright: '#ef2b2b',
  text: '#f7f9fc',
  muted: 'rgba(229,237,247,0.74)',
  soft: 'rgba(202,216,233,0.58)',
};

function mergeCampaigns(...groups) {
  const map = new Map();
  groups.flat().forEach(campaign => {
    if (campaign?.id) map.set(campaign.id, campaign);
  });
  return Array.from(map.values());
}

export default function MobilePlayerCampaignView() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [players, setPlayers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFullParty, setShowFullParty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [characterQuery, setCharacterQuery] = useState('');
  const [partyQuery, setPartyQuery] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const activeScopeRef = useRef('');
  const charactersRef = useRef(null);
  const partyRef = useRef(null);
  const environmentRef = useRef(null);
  const campaignRef = useRef(null);

  const isDashboardMode = !campaignId;
  const scopeKey = isDashboardMode ? 'dashboard' : `campaign:${campaignId}`;

  const applyLoadStatus = useCallback((result, notifyFailure) => {
    if (result.ok) {
      setLoadWarning('');
      return;
    }
    const description = describeMobilePlayerFailures(result.failures);
    setLoadWarning(description);
    if (notifyFailure) {
      toast.warning('Some mobile player data could not be refreshed', { description });
    }
  }, []);

  const loadDashboardData = useCallback(async ({ notifyFailure = true } = {}) => {
    const requestedScope = 'dashboard';
    const result = await fetchMobileDashboardSections(apiClient);
    if (activeScopeRef.current !== requestedScope) return { ...result, stale: true };

    if (result.characters !== null) setCharacters(result.characters);
    if (result.campaigns !== null) setCampaigns(result.campaigns);
    applyLoadStatus(result, notifyFailure);
    return result;
  }, [applyLoadStatus]);

  const loadCampaignData = useCallback(async ({ notifyFailure = true } = {}) => {
    const requestedScope = `campaign:${campaignId}`;
    const result = await fetchMobileCampaignSections(apiClient, campaignId);
    if (activeScopeRef.current !== requestedScope) return { ...result, stale: true };

    if (result.campaign !== null) setCampaign(result.campaign);
    if (result.players !== null) setPlayers(result.players);
    if (result.characters !== null) setCharacters(result.characters);
    applyLoadStatus(result, notifyFailure);
    return result;
  }, [applyLoadStatus, campaignId]);

  const loadData = useCallback((options = {}) => {
    if (isDashboardMode) return loadDashboardData(options);
    return loadCampaignData(options);
  }, [isDashboardMode, loadCampaignData, loadDashboardData]);

  useEffect(() => {
    let alive = true;
    activeScopeRef.current = scopeKey;
    setLoading(true);
    setRefreshing(false);
    setLoadWarning('');
    setShowFullParty(false);
    setCharacterQuery('');
    setPartyQuery('');

    if (isDashboardMode) {
      setCampaign(null);
      setPlayers([]);
    } else {
      // A different campaign must never inherit another campaign's visible state.
      setCampaign(null);
      setCampaigns([]);
      setPlayers([]);
      setCharacters([]);
    }

    async function initialLoad() {
      try {
        await loadData({ notifyFailure: true });
      } finally {
        if (alive && activeScopeRef.current === scopeKey) setLoading(false);
      }
    }

    initialLoad();
    const interval = window.setInterval(() => {
      loadData({ notifyFailure: false });
    }, 30000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [isDashboardMode, loadData, scopeKey]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const result = await loadData({ notifyFailure: true });
      if (result?.ok && !result?.stale) {
        toast.success(isDashboardMode ? 'Mobile dashboard refreshed' : 'Campaign data refreshed');
      }
    } finally {
      if (activeScopeRef.current === scopeKey) setRefreshing(false);
    }
  };

  const linkedCampaigns = useMemo(() => {
    const fromCharacters = characters
      .filter(character => character.campaign_id || character.campaignId)
      .map(character => ({
        id: character.campaign_id || character.campaignId,
        name: character.campaign_name || 'Linked Campaign',
        description: character.campaign_description || '',
        from_character: character.name,
      }));
    return mergeCampaigns(campaigns, fromCharacters);
  }, [campaigns, characters]);

  const linkedCharacterIds = useMemo(() => new Set(
    players
      .flatMap(player => [
        player.character_id,
        player.characterId,
        player.player_character_id,
        player.character?.id,
        player.id,
      ])
      .filter(Boolean)
  ), [players]);

  const myCampaignCharacters = useMemo(() => {
    const scoped = isDashboardMode ? characters : characters.filter(character =>
      character.campaign_id === campaignId ||
      character.campaignId === campaignId ||
      linkedCharacterIds.has(character.id)
    );
    if (!characterQuery.trim()) return scoped;
    const q = characterQuery.trim().toLowerCase();
    return scoped.filter(character =>
      String(character.name || '').toLowerCase().includes(q) ||
      String(character.character_class || '').toLowerCase().includes(q)
    );
  }, [campaignId, characters, linkedCharacterIds, characterQuery, isDashboardMode]);

  const roster = players.length > 0 ? players : myCampaignCharacters;
  const filteredRoster = useMemo(() => {
    if (!partyQuery.trim()) return roster;
    const q = partyQuery.trim().toLowerCase();
    return roster.filter((member) => {
      const name = member.character_name || member.name || member.character?.name || '';
      const cls = member.character_class || member.class || member.character?.character_class || '';
      return String(name).toLowerCase().includes(q) || String(cls).toLowerCase().includes(q);
    });
  }, [partyQuery, roster]);
  const visibleRoster = showFullParty ? filteredRoster : filteredRoster.slice(0, 12);
  const environment = campaign?.campaign_environment || {};
  const pageBackgroundStyle = environment.background_image
    ? {
        ...pageStyle,
        backgroundImage: `linear-gradient(rgba(10,23,40,0.86), rgba(10,23,40,0.96)), url(${environment.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : pageStyle;

  if (loading) {
    return <MobileLoadingState title={isDashboardMode ? 'Loading mobile dashboard…' : 'Opening player campaign…'} />;
  }

  if (isDashboardMode) {
    return (
      <main data-testid="mobile-player-dashboard" style={pageStyle}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button onClick={() => navigate('/home')} style={iconButtonStyle} aria-label="Back to dashboard">
            <ArrowLeft size={18} />
          </Button>
          <div style={{ minWidth: 0 }}>
            <div style={eyebrowStyle}>Mobile Dashboard</div>
            <h1 style={mobileTitleStyle}>Characters & Campaigns</h1>
            <p style={mobileSubtitleStyle}>Same data as desktop, formatted for your phone.</p>
          </div>
          <Button onClick={refresh} disabled={refreshing} style={{ ...iconButtonStyle, marginLeft: 'auto' }} aria-label="Refresh mobile dashboard">
            <RefreshCw size={16} style={{ opacity: refreshing ? 0.6 : 1 }} />
          </Button>
        </header>

        {loadWarning && <MobileLoadWarning text={loadWarning} />}

        <section style={mobileSummaryGridStyle}>
          <SummaryTile icon={Shield} label="Characters" value={characters.length} />
          <SummaryTile icon={BookOpen} label="Campaigns" value={linkedCampaigns.length} />
          <SummaryTile icon={Users} label="Linked" value={characters.filter(character => character.campaign_id || character.campaignId).length} />
        </section>

        <section style={panelStyle}>
          <div style={mobileActionGridStyle}>
            <Button onClick={() => navigate('/characters/new')} style={redActionStyle}><Plus size={15} /> New Character</Button>
            <Button onClick={() => navigate('/player')} style={rowButtonStyle}><Link2 size={15} /> Join / Player Tools</Button>
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}><Shield size={15} /> My Characters</h2>
          {characters.length === 0 ? (
            <EmptyBox title="No characters found" text="No characters are currently saved to this account." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {characters.map(character => (
                <button key={character.id} data-testid={`mobile-dashboard-character-${character.id}`} onClick={() => navigate(`/characters/${character.id}`)} style={rowButtonStyle}>
                  <span style={{ minWidth: 0 }}>
                    <span style={rowTitleStyle}>{character.name || 'Unnamed Character'}</span>
                    <span style={rowMetaStyle}>Lv {character.level || 1} {character.character_class || 'Adventurer'}</span>
                  </span>
                  <ChevronRight size={18} color={theme.red} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}><BookOpen size={15} /> Campaigns</h2>
          {linkedCampaigns.length === 0 ? (
            <EmptyBox title="No campaigns found" text="Owned, joined, and character-linked campaigns will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {linkedCampaigns.map(campaignItem => (
                <button key={campaignItem.id} data-testid={`mobile-dashboard-campaign-${campaignItem.id}`} onClick={() => navigate(`/mobile/${campaignItem.id}`)} style={rowButtonStyle}>
                  <span style={{ minWidth: 0 }}>
                    <span style={rowTitleStyle}>{campaignItem.name || 'Unnamed Campaign'}</span>
                    <span style={rowMetaStyle}>{campaignItem.from_character ? `Linked through ${campaignItem.from_character}` : campaignItem.system || 'Campaign'}</span>
                  </span>
                  <ChevronRight size={18} color={theme.red} />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main data-testid="mobile-player-campaign-view" style={pageBackgroundStyle}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button onClick={() => navigate('/mobile')} style={iconButtonStyle} aria-label="Back to mobile dashboard">
          <ArrowLeft size={18} />
        </Button>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>Player View</div>
          <h1 style={mobileTitleStyle}>{campaign?.name || 'Campaign'}</h1>
        </div>
        <Button onClick={refresh} disabled={refreshing} style={{ ...iconButtonStyle, marginLeft: 'auto' }} aria-label="Refresh campaign data">
          <RefreshCw size={16} style={{ opacity: refreshing ? 0.6 : 1 }} />
        </Button>
      </header>

      {loadWarning && <MobileLoadWarning text={loadWarning} />}

      <section style={{ ...panelStyle, padding: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          <NavPill label="Characters" onClick={() => charactersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          <NavPill label="Party" onClick={() => partyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          <NavPill label="Environment" onClick={() => environmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          <NavPill label="Campaign" onClick={() => campaignRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
        </div>
      </section>

      <CombatInitiativeSubmitter campaignId={campaignId} />

      {myCampaignCharacters.length > 0 && (
        <section ref={charactersRef} style={panelStyle}>
          <h2 style={sectionTitleStyle}><Shield size={15} /> My Characters</h2>
          <input value={characterQuery} onChange={(e) => setCharacterQuery(e.target.value)} placeholder="Search characters" style={mobileSearchInputStyle} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myCampaignCharacters.map(character => (
              <button key={character.id} data-testid={`mobile-character-${character.id}`} onClick={() => navigate(`/characters/${character.id}`)} style={rowButtonStyle}>
                <span style={{ minWidth: 0 }}>
                  <span style={rowTitleStyle}>{character.name}</span>
                  <span style={rowMetaStyle}>Lv {character.level || 1} {character.character_class || 'Adventurer'}</span>
                </span>
                <ChevronRight size={18} color={theme.red} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section ref={partyRef} style={panelStyle}>
        <h2 style={sectionTitleStyle}><Users size={15} /> Party</h2>
        <input value={partyQuery} onChange={(e) => setPartyQuery(e.target.value)} placeholder="Search party" style={mobileSearchInputStyle} />
        {filteredRoster.length === 0 ? (
          <div style={{ color: theme.soft, fontSize: 13 }}>No party members linked yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleRoster.map((member, index) => {
              const name = member.character_name || member.name || member.character?.name || `Player ${index + 1}`;
              const cls = member.character_class || member.class || member.character?.character_class || '';
              const hp = member.current_hit_points ?? member.hp ?? member.character?.current_hit_points;
              const maxHp = member.max_hit_points ?? member.max_hp ?? member.character?.max_hit_points;

              return (
                <div key={member.id || member.character_id || name} style={rosterRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={rowTitleStyle}>{name}</div>
                    {cls && <div style={rowMetaStyle}>{cls}</div>}
                  </div>
                  {hp != null && maxHp != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22C55E', fontSize: 11, fontWeight: 800 }}>
                      <Heart size={12} /> {hp}/{maxHp}
                    </span>
                  )}
                </div>
              );
            })}
            {filteredRoster.length > 12 && (
              <button type="button" onClick={() => setShowFullParty(v => !v)} style={{ ...rowButtonStyle, padding: '8px 10px', justifyContent: 'center', fontSize: 12 }}>
                {showFullParty ? 'Show fewer' : `Show all (${filteredRoster.length})`}
              </button>
            )}
          </div>
        )}
      </section>

      {(environment.weather || environment.lighting || environment.mood || environment.location || environment.notes) && (
        <section ref={environmentRef} style={panelStyle}>
          <h2 style={sectionTitleStyle}><CloudRain size={15} /> Environment</h2>
          <div style={environmentGridStyle}>
            <InfoPill label="Weather" value={formatEnvironmentValue(environment.weather)} />
            <InfoPill label="Light" value={formatEnvironmentValue(environment.lighting)} />
            <InfoPill label="Mood" value={formatEnvironmentValue(environment.mood)} />
            <InfoPill label="Location" value={environment.location || 'Unspecified'} />
          </div>
          {environment.notes && <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.55, marginTop: 10 }}>{environment.notes}</div>}
        </section>
      )}

      <section ref={campaignRef} style={panelStyle}>
        <h2 style={sectionTitleStyle}><BookOpen size={15} /> Campaign</h2>
        <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6 }}>
          {campaign?.description || campaign?.setting || campaign?.world_setting_notes || 'No campaign summary yet.'}
        </div>
      </section>
    </main>
  );
}

function MobileLoadWarning({ text }) {
  return (
    <aside data-testid="mobile-player-load-warning" role="status" style={mobileWarningStyle}>
      <AlertTriangle size={17} aria-hidden="true" style={{ flex: '0 0 auto' }} />
      <div>
        <strong style={{ display: 'block', color: theme.text, fontSize: 12 }}>Some data is temporarily unavailable.</strong>
        <span style={{ display: 'block', color: theme.muted, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{text}</span>
      </div>
    </aside>
  );
}

function MobileLoadingState({ title }) {
  return (
    <main data-testid="mobile-player-loading" style={pageStyle}>
      <section role="status" aria-live="polite" aria-busy="true" style={mobileLoadingCardStyle}>
        <span style={mobileLoadingMarkStyle}>RQK</span>
        <span style={mobileLoadingSpinnerStyle} aria-hidden="true" />
        <h1 style={mobileLoadingTitleStyle}>{title}</h1>
        <p style={mobileLoadingTextStyle}>Gathering your characters, campaigns, party notes, and mobile table tools.</p>
      </section>
      <style>{mobileLoadingCss}</style>
    </main>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div style={summaryTileStyle}>
      <Icon size={16} color={theme.red} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyBox({ title, text }) {
  return (
    <div style={emptyBoxStyle}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function NavPill({ label, onClick }) {
  return <button type="button" onClick={onClick} style={{ border: `1px solid ${theme.border}`, background: theme.panelAlt, color: theme.muted, padding: '8px 6px', fontSize: 11 }}>{label}</button>;
}

function formatEnvironmentValue(value) {
  if (!value) return 'Unspecified';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function InfoPill({ label, value }) {
  return (
    <div style={infoPillStyle}>
      <div style={{ color: theme.redBright, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ color: theme.text, fontSize: 12 }}>{value}</div>
    </div>
  );
}

const pageStyle = { minHeight: '100dvh', background: theme.bg, padding: 12, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 12 };
const panelStyle = { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 0, padding: 12 };
const eyebrowStyle = { fontSize: 11, color: theme.redBright, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' };
const mobileTitleStyle = { margin: 0, color: theme.text, fontSize: 20, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const mobileSubtitleStyle = { margin: '3px 0 0', color: theme.muted, fontSize: 12, lineHeight: 1.35 };
const sectionTitleStyle = { margin: '0 0 10px', color: theme.redBright, fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 };
const iconButtonStyle = { minWidth: 40, height: 40, padding: 0, borderRadius: 0, border: `1px solid ${theme.border}`, background: theme.panel, color: theme.redBright };
const rowButtonStyle = { width: '100%', border: `1px solid ${theme.border}`, background: theme.panelAlt, color: theme.text, borderRadius: 0, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', cursor: 'pointer', gap: 10 };
const redActionStyle = { ...rowButtonStyle, justifyContent: 'center', background: theme.red, border: 0, fontWeight: 900 };
const rowTitleStyle = { display: 'block', color: theme.text, fontSize: 14, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rowMetaStyle = { display: 'block', color: theme.muted, fontSize: 11, marginTop: 2 };
const rosterRowStyle = { border: `1px solid ${theme.border}`, background: theme.panelAlt, borderRadius: 0, padding: '9px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 };
const environmentGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 };
const infoPillStyle = { border: `1px solid ${theme.border}`, background: theme.panelAlt, borderRadius: 0, padding: '8px 9px' };
const mobileSearchInputStyle = { width: '100%', height: 36, border: `1px solid ${theme.border}`, background: '#06101c', color: theme.text, padding: '0 10px', marginBottom: 10, outline: 'none' };
const mobileSummaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 };
const summaryTileStyle = { background: theme.panel, border: `1px solid ${theme.border}`, padding: 10, display: 'grid', gap: 4, alignContent: 'start', minHeight: 78 };
const mobileActionGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 };
const emptyBoxStyle = { border: `1px dashed ${theme.border}`, background: theme.panelAlt, padding: 12, color: theme.muted, display: 'grid', gap: 5, fontSize: 12, lineHeight: 1.4 };
const mobileWarningStyle = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 11px', border: '1px solid rgba(245,158,11,0.44)', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.08)', color: '#f59e0b' };
const mobileLoadingCardStyle = {
  width: 'min(560px, calc(100vw - 32px))',
  minHeight: 254,
  margin: 'auto',
  padding: '26px 22px',
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'center',
  gap: 12,
  textAlign: 'center',
  border: `1px solid ${theme.border}`,
  borderLeft: `5px solid ${theme.red}`,
  borderRadius: 0,
  background: theme.panel,
  boxShadow: 'none',
};
const mobileLoadingMarkStyle = { minHeight: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', border: `1px solid ${theme.border}`, borderRadius: 999, color: theme.redBright, fontSize: 11, fontWeight: 950, letterSpacing: '0.16em' };
const mobileLoadingSpinnerStyle = { width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(181,203,226,0.18)', borderTopColor: theme.redBright, animation: 'rqMobileLoadingSpin 0.86s linear infinite' };
const mobileLoadingTitleStyle = { margin: 0, color: theme.text, fontFamily: 'var(--rq-title-font, Cinzel, Georgia, serif)', fontSize: 'clamp(1.45rem, 6vw, 2.05rem)', lineHeight: 1.08, letterSpacing: '0.03em' };
const mobileLoadingTextStyle = { margin: 0, color: theme.muted, fontSize: 13, lineHeight: 1.5, maxWidth: 380 };
const mobileLoadingCss = `
  @keyframes rqMobileLoadingSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="mobile-player-loading"] span[aria-hidden="true"] { animation: none !important; }
  }
`;
