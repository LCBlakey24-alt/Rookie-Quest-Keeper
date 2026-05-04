import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Heart, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const theme = {
  bg: '#0A1628',
  panel: '#0F2440',
  panelAlt: '#14304F',
  border: 'rgba(212, 160, 23, 0.35)',
  gold: '#D4A017',
  goldBright: '#F5C542',
  text: '#F8FAFC',
  muted: '#94A3B8',
  soft: '#64748B',
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
          axios.get(`${API}/campaigns/${campaignId}`),
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
    return () => { alive = false; };
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

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={{ ...panelStyle, textAlign: 'center', color: theme.muted }}>Loading...</div>
      </main>
    );
  }

  return (
    <main data-testid="mobile-player-campaign-view" style={pageStyle}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          onClick={() => navigate('/home')}
          style={iconButtonStyle}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: theme.gold, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
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
                <ChevronRight size={18} color={theme.gold} />
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

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}><BookOpen size={15} /> Campaign</h2>
        <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6 }}>
          {campaign?.description || campaign?.setting || campaign?.world_setting_notes || 'No campaign summary yet.'}
        </div>
      </section>
    </main>
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
  borderRadius: 8,
  padding: 12,
};

const sectionTitleStyle = {
  margin: '0 0 10px',
  color: theme.gold,
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
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  background: theme.panel,
  color: theme.gold,
};

const rowButtonStyle = {
  width: '100%',
  border: `1px solid ${theme.border}`,
  background: theme.panelAlt,
  color: theme.text,
  borderRadius: 8,
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
  borderRadius: 8,
  padding: '9px 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};
