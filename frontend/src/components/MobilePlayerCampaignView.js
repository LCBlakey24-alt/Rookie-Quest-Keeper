import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, CloudRain, Heart, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const theme = {
  bg: '#1F1F23',
  panel: 'rgba(39,39,43,0.92)',
  panelAlt: 'rgba(50,50,53,0.94)',
  border: 'rgba(239,68,68,0.42)',
  red: '#EF4444',
  redBright: '#F87171',
  text: '#FFFFFF',
  muted: '#D1D5DB',
  soft: '#9CA3AF',
};

export default function MobilePlayerCampaignView() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [campaignRes, playersRes, charactersRes] = await Promise.all([
          axios.get(`${API}/player/campaign/${campaignId}`).catch(() => axios.get(`${API}/campaigns/${campaignId}`).catch(() => ({ data: null }))),
          axios.get(`${API}/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
          axios.get(`${API}/characters`).catch(() => ({ data: [] })),
        ]);

        if (!alive) return;
        setCampaign(campaignRes.data);
        setPlayers(playersRes.data || []);
        setCharacters(charactersRes.data || []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [campaignId]);

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
    return characters.filter(character =>
      character.campaign_id === campaignId ||
      character.campaignId === campaignId ||
      linkedCharacterIds.has(character.id)
    );
  }, [campaignId, characters, linkedCharacterIds]);

  const roster = players.length > 0 ? players : myCampaignCharacters;
  const environment = campaign?.campaign_environment || {};
  const pageBackgroundStyle = environment.background_image
    ? {
        ...pageStyle,
        backgroundImage: `linear-gradient(rgba(31,31,35,0.78), rgba(31,31,35,0.92)), url(${environment.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : pageStyle;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={{ ...panelStyle, textAlign: 'center', color: theme.muted }}>Loading...</div>
      </main>
    );
  }

  return (
    <main data-testid="mobile-player-campaign-view" style={pageBackgroundStyle}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          onClick={() => navigate('/home')}
          style={iconButtonStyle}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: theme.red, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
            Player View
          </div>
          <h1 style={{ margin: 0, color: theme.text, fontSize: 20, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign?.name || 'Campaign'}
          </h1>
        </div>
      </header>

      {myCampaignCharacters.length > 0 && (
        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}><Shield size={15} /> My Characters</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myCampaignCharacters.map(character => (
              <button
                key={character.id}
                data-testid={`mobile-character-${character.id}`}
                onClick={() => navigate(`/characters/${character.id}`)}
                style={rowButtonStyle}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: theme.text, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {character.name}
                  </span>
                  <span style={{ display: 'block', color: theme.muted, fontSize: 11, marginTop: 2 }}>
                    Lv {character.level || 1} {character.character_class || 'Adventurer'}
                  </span>
                </span>
                <ChevronRight size={18} color={theme.red} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}><Users size={15} /> Party</h2>
        {roster.length === 0 ? (
          <div style={{ color: theme.soft, fontSize: 13 }}>No party members linked yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roster.slice(0, 12).map((member, index) => {
              const name = member.character_name || member.name || member.character?.name || `Player ${index + 1}`;
              const cls = member.character_class || member.class || member.character?.character_class || '';
              const hp = member.current_hit_points ?? member.hp ?? member.character?.current_hit_points;
              const maxHp = member.max_hit_points ?? member.max_hp ?? member.character?.max_hit_points;

              return (
                <div key={member.id || member.character_id || name} style={rosterRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: theme.text, fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {cls && <div style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>{cls}</div>}
                  </div>
                  {hp != null && maxHp != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22C55E', fontSize: 11, fontWeight: 800 }}>
                      <Heart size={12} /> {hp}/{maxHp}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(environment.weather || environment.lighting || environment.mood || environment.location || environment.notes) && (
        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}><CloudRain size={15} /> Environment</h2>
          <div style={environmentGridStyle}>
            <InfoPill label="Weather" value={formatEnvironmentValue(environment.weather)} />
            <InfoPill label="Light" value={formatEnvironmentValue(environment.lighting)} />
            <InfoPill label="Mood" value={formatEnvironmentValue(environment.mood)} />
            <InfoPill label="Location" value={environment.location || 'Unspecified'} />
          </div>
          {environment.notes && (
            <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.55, marginTop: 10 }}>
              {environment.notes}
            </div>
          )}
        </section>
      )}

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}><BookOpen size={15} /> Campaign</h2>
        <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6 }}>
          {campaign?.description || campaign?.setting || campaign?.world_setting_notes || 'No campaign summary yet.'}
        </div>
      </section>
    </main>
  );
}

function formatEnvironmentValue(value) {
  if (!value) return 'Unspecified';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function InfoPill({ label, value }) {
  return (
    <div style={infoPillStyle}>
      <div style={{ color: theme.red, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ color: theme.text, fontSize: 12 }}>{value}</div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: theme.bg,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const panelStyle = {
  background: theme.panel,
  border: `1px solid ${theme.border}`,
  borderRadius: 0,
  padding: 12,
};

const sectionTitleStyle = {
  margin: '0 0 10px',
  color: theme.red,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const iconButtonStyle = {
  minWidth: 40,
  height: 40,
  padding: 0,
  borderRadius: 0,
  border: `1px solid ${theme.border}`,
  background: theme.panel,
  color: theme.red,
};

const rowButtonStyle = {
  width: '100%',
  border: `1px solid ${theme.border}`,
  background: theme.panelAlt,
  color: theme.text,
  borderRadius: 0,
  padding: '10px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  textAlign: 'left',
  cursor: 'pointer',
};

const rosterRowStyle = {
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 0,
  padding: '9px 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const environmentGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const infoPillStyle = {
  border: `1px solid ${theme.border}`,
  background: 'rgba(31,31,35,0.72)',
  borderRadius: 0,
  padding: '8px 9px',
};
