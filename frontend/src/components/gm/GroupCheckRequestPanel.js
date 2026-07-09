import React, { useMemo, useState } from 'react';
import { CheckCircle2, Dice6, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.55)',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.26)',
};

const QUICK_CHECKS = [
  { id: 'persuasion', label: 'Persuasion', ability: 'Charisma' },
  { id: 'perception', label: 'Perception', ability: 'Wisdom' },
  { id: 'investigation', label: 'Investigation', ability: 'Intelligence' },
  { id: 'stealth', label: 'Stealth', ability: 'Dexterity' },
  { id: 'athletics', label: 'Athletics', ability: 'Strength' },
  { id: 'acrobatics', label: 'Acrobatics', ability: 'Dexterity' },
  { id: 'insight', label: 'Insight', ability: 'Wisdom' },
  { id: 'deception', label: 'Deception', ability: 'Charisma' },
  { id: 'intimidation', label: 'Intimidation', ability: 'Charisma' },
  { id: 'survival', label: 'Survival', ability: 'Wisdom' },
  { id: 'arcana', label: 'Arcana', ability: 'Intelligence' },
  { id: 'medicine', label: 'Medicine', ability: 'Wisdom' },
];

function playerId(player = {}, index = 0) {
  return String(player.id || player.character_id || player.player_id || player.user_id || player.name || `player-${index}`);
}

function playerName(player = {}) {
  return player.name || player.character_name || player.display_name || player.player_name || 'Unnamed Hero';
}

function normalisePlayer(player = {}, index = 0) {
  return {
    id: playerId(player, index),
    name: playerName(player),
    playerName: player.playerName || player.player_name || player.owner_name || '',
    className: player.className || player.class_name || player.character_class || player.class || '',
    imageUrl: player.imageUrl || player.image_url || player.avatar_url || player.portrait_url || player.character_image || '',
    status: 'pending',
  };
}

function makeRequestId() {
  return `group-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function GroupCheckRequestPanel({ campaignId, players = [] }) {
  const party = useMemo(() => players.map(normalisePlayer).filter(player => player.name), [players]);
  const [selectedCheckId, setSelectedCheckId] = useState('persuasion');
  const [dc, setDc] = useState('15');
  const [targetMode, setTargetMode] = useState('all');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);

  const selectedCheck = QUICK_CHECKS.find(check => check.id === selectedCheckId) || QUICK_CHECKS[0];
  const selectedParty = targetMode === 'all' ? party : party.filter(player => selectedPlayerIds.includes(player.id));
  const selectedCount = selectedParty.length;

  const togglePlayer = (id) => {
    setSelectedPlayerIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const sendGroupCheck = () => {
    if (!campaignId) return;
    if (!selectedCount) {
      toast.error('No players selected', { description: 'Choose all players or select at least one hero for the check.' });
      return;
    }

    const safeDc = Number(dc);
    const requestId = makeRequestId();
    const payload = {
      id: requestId,
      group_check_id: requestId,
      eyebrow: 'Group Check Requested',
      title: `${selectedCheck.label} Check`,
      subtitle: `GM requests ${selectedCount === party.length ? 'the party' : `${selectedCount} player${selectedCount === 1 ? '' : 's'}`} to roll ${selectedCheck.label}.`,
      check_name: selectedCheck.label,
      ability: selectedCheck.ability,
      notation: '1d20',
      dc: Number.isFinite(safeDc) && safeDc > 0 ? safeDc : null,
      status: 'collecting',
      requested_at: new Date().toISOString(),
      party: selectedParty.map(player => ({ ...player, status: 'pending' })),
      results: [],
      display_target: 'standing-tv',
    };

    publishCampaignDisplayState(campaignId, createDisplayState('group-check', payload));
    toast.success(`${selectedCheck.label} check requested`, {
      description: `${selectedCount} player${selectedCount === 1 ? '' : 's'} queued on the extended display${payload.dc ? ` · DC ${payload.dc}` : ''}.`,
    });
  };

  return (
    <section style={shellStyle} data-testid="group-check-request-panel">
      <div style={headerStyle}>
        <div style={titleBlockStyle}>
          <span style={iconStyle}><Dice6 size={17} /></span>
          <div>
            <p style={eyebrowStyle}>Group checks</p>
            <h2 style={titleStyle}>Request a party roll</h2>
            <p style={subtitleStyle}>Send a Persuasion, Stealth, Perception, or custom table check to the extended screen so everyone knows what to roll.</p>
          </div>
        </div>
        <button type="button" onClick={sendGroupCheck} style={primaryButtonStyle} data-testid="send-group-check-request">
          <Send size={15} /> Request Roll
        </button>
      </div>

      <div style={bodyStyle}>
        <div style={checkGridStyle}>
          {QUICK_CHECKS.map(check => (
            <button key={check.id} type="button" onClick={() => setSelectedCheckId(check.id)} style={checkButtonStyle(check.id === selectedCheckId)}>
              <strong>{check.label}</strong>
              <span>{check.ability}</span>
            </button>
          ))}
        </div>

        <div style={controlRowStyle}>
          <label style={fieldStyle}>
            <span>Difficulty DC</span>
            <input value={dc} onChange={(event) => setDc(event.target.value)} inputMode="numeric" placeholder="Optional" style={inputStyle} data-testid="group-check-dc-input" />
          </label>
          <label style={fieldStyle}>
            <span>Targets</span>
            <select value={targetMode} onChange={(event) => setTargetMode(event.target.value)} style={inputStyle} data-testid="group-check-target-mode">
              <option value="all">All linked players</option>
              <option value="selected">Selected players only</option>
            </select>
          </label>
          <div style={summaryStyle}>
            <Users size={15} />
            <strong>{selectedCount}</strong>
            <span>queued</span>
          </div>
        </div>

        {targetMode === 'selected' && (
          <div style={playerGridStyle} data-testid="group-check-player-selector">
            {party.map(player => (
              <button key={player.id} type="button" onClick={() => togglePlayer(player.id)} style={playerPillStyle(selectedPlayerIds.includes(player.id))}>
                {selectedPlayerIds.includes(player.id) && <CheckCircle2 size={13} />}
                <span>{player.name}</span>
              </button>
            ))}
            {party.length === 0 && <p style={mutedStyle}>No linked campaign players found yet.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

const shellStyle = { background: 'linear-gradient(135deg, rgba(208,0,0,0.18), rgba(36,36,36,0.96))', border: `1px solid ${theme.lineStrong}`, borderLeft: `7px solid ${theme.red}`, color: theme.text, padding: 10, display: 'grid', gap: 10, fontFamily: fontStack, boxShadow: '0 18px 54px rgba(0,0,0,0.22)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' };
const titleBlockStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 };
const iconStyle = { width: 36, height: 36, display: 'grid', placeItems: 'center', background: theme.red, color: theme.text, boxShadow: '0 0 28px rgba(208,0,0,0.24)' };
const eyebrowStyle = { margin: 0, color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '1px 0 3px', color: theme.text, fontSize: 18, fontWeight: 950, lineHeight: 1.08 };
const subtitleStyle = { margin: 0, color: theme.soft, fontSize: 12, lineHeight: 1.35, maxWidth: 780 };
const bodyStyle = { display: 'grid', gap: 9 };
const checkGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 7 };
const checkButtonStyle = (active) => ({ minHeight: 46, display: 'grid', gap: 2, textAlign: 'left', border: `1px solid ${active ? theme.red : theme.line}`, background: active ? theme.red : theme.card, color: theme.text, padding: '7px 9px', cursor: 'pointer', fontFamily: fontStack, boxShadow: active ? '0 14px 34px rgba(208,0,0,0.22)' : 'none' });
const controlRowStyle = { display: 'grid', gridTemplateColumns: '120px minmax(180px, 1fr) auto', gap: 7, alignItems: 'end' };
const fieldStyle = { display: 'grid', gap: 4, color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 36, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: '0 8px', outline: 'none', fontFamily: fontStack };
const primaryButtonStyle = { minHeight: 36, border: 0, background: theme.red, color: theme.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const summaryStyle = { minHeight: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.text, fontSize: 12, fontWeight: 950, textTransform: 'uppercase' };
const playerGridStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 116, overflowY: 'auto', padding: 8, background: 'rgba(0,0,0,0.18)', border: `1px solid ${theme.line}` };
const playerPillStyle = (active) => ({ minHeight: 30, display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${active ? theme.red : theme.line}`, background: active ? theme.red : theme.bg, color: theme.text, padding: '0 9px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack });
const mutedStyle = { margin: 0, color: theme.muted, fontSize: 12 };

if (typeof document !== 'undefined' && !document.getElementById('rqk-group-check-request-css')) {
  const style = document.createElement('style');
  style.id = 'rqk-group-check-request-css';
  style.textContent = `
    [data-testid="group-check-request-panel"] button { transition: transform 160ms ease, filter 160ms ease, border-color 160ms ease; }
    [data-testid="group-check-request-panel"] button:hover { transform: translateY(-1px); filter: brightness(1.08); }
    [data-testid="group-check-request-panel"] button span { color: rgba(255,255,255,0.72); font-size: 11px; }
    @media (max-width: 720px) { [data-testid="group-check-request-panel"] div[style*="grid-template-columns: 120px"] { grid-template-columns: 1fr !important; } }
  `;
  document.head.appendChild(style);
}
