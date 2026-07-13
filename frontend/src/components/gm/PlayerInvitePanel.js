import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import CampaignJoinCodeCard from '@/components/gm/CampaignJoinCodeCard';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: 'var(--rq-bg-main, #242424)',
  panel: 'var(--rq-bg-panel, #2f2f2f)',
  card: 'var(--rq-bg-panel-alt, #3a3a3a)',
  line: 'var(--rq-border-default, rgba(255,255,255,0.16))',
  accent: 'var(--rq-accent-primary, #d00000)',
  accentSoft: 'var(--rq-accent-soft, rgba(208,0,0,0.18))',
  text: 'var(--rq-text-primary, #ffffff)',
  soft: 'var(--rq-text-secondary, rgba(255,255,255,0.74))',
  muted: 'var(--rq-text-muted, rgba(255,255,255,0.62))',
};

export default function PlayerInvitePanel({ campaignId, players: suppliedPlayers = null }) {
  const [invite, setInvite] = useState(null);
  const [players, setPlayers] = useState(Array.isArray(suppliedPlayers) ? suppliedPlayers : []);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (Array.isArray(suppliedPlayers)) setPlayers(suppliedPlayers);
  }, [suppliedPlayers]);

  const loadPanel = useCallback(async ({ silent = false } = {}) => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const [inviteRes, playersRes, membersRes] = await Promise.all([
        apiClient.get(`/campaign-invites/${campaignId}`).catch(() => ({ data: null })),
        Array.isArray(suppliedPlayers)
          ? Promise.resolve({ data: suppliedPlayers })
          : apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
        apiClient.get(`/campaign-invites/${campaignId}/members`).catch(() => ({ data: [] })),
      ]);
      setInvite(inviteRes.data);
      setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      if (!silent) toast.success('Player invite details refreshed');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not refresh player invite details');
    } finally {
      setLoading(false);
    }
  }, [campaignId, suppliedPlayers]);

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      try {
        setLoading(true);
        const [inviteRes, playersRes, membersRes] = await Promise.all([
          apiClient.get(`/campaign-invites/${campaignId}`).catch(() => ({ data: null })),
          Array.isArray(suppliedPlayers)
            ? Promise.resolve({ data: suppliedPlayers })
            : apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
          apiClient.get(`/campaign-invites/${campaignId}/members`).catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setInvite(inviteRes.data);
          setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
          setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (campaignId) initialLoad();
    return () => { cancelled = true; };
  }, [campaignId, suppliedPlayers]);

  const code = invite?.join_code || invite?.code || '';
  const joinModeLabel = invite?.join_mode === 'auto_accept' ? 'Auto-accept' : 'GM approval';
  const panelBusy = loading || rotating || copying;
  const playerSummary = useMemo(() => {
    const rosterCount = players.length;
    const liveMembers = members.filter(member => String(member.status || 'active').toLowerCase() !== 'removed');
    const linkedCount = liveMembers.filter(member => member.character_id).length;
    const pendingCount = liveMembers.filter(member => String(member.status || '').toLowerCase() === 'pending').length;
    return { rosterCount, linkedCount, pendingCount };
  }, [players, members]);

  const copyCode = async () => {
    if (!code) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Join code copied');
    } catch {
      toast.info(`Join code: ${code}`);
    } finally {
      setTimeout(() => setCopying(false), 900);
    }
  };

  const rotateCode = async () => {
    if (!campaignId) return;
    if (!window.confirm('Create a new join code? The old code will stop working.')) return;
    setRotating(true);
    try {
      const response = await apiClient.post(`/campaign-invites/${campaignId}`);
      setInvite(response.data);
      toast.success('Join code rotated');
      await loadPanel({ silent: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not rotate join code');
    } finally {
      setRotating(false);
    }
  };

  return (
    <section style={panelStyle} data-testid="player-invite-panel" aria-busy={panelBusy ? 'true' : 'false'}>
      <div style={iconTileStyle}><UserPlus size={24} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={headerRowStyle}>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Players & Invites</p>
            <h3 style={titleStyle}>Bring players into this campaign</h3>
          </div>
          <button type="button" onClick={() => loadPanel()} disabled={loading || rotating} aria-busy={loading ? 'true' : 'false'} style={refreshButtonStyle(loading)}>
            <RefreshCw size={14} style={loading ? spinStyle : undefined} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <p style={subtitleStyle}>{loading ? 'Checking join code, roster, linked characters, and pending approvals…' : `Share the join code with players. Each user links one character. The current join mode is ${joinModeLabel}.`}</p>

        <div style={statsStyle}>
          <MiniStat icon={Users} label="Roster" value={loading ? 'Loading…' : `${playerSummary.rosterCount} GM player${playerSummary.rosterCount === 1 ? '' : 's'}`} />
          <MiniStat icon={ShieldCheck} label="Linked" value={loading ? 'Loading…' : `${playerSummary.linkedCount} character${playerSummary.linkedCount === 1 ? '' : 's'}`} />
          <MiniStat icon={UserPlus} label="Pending" value={loading ? 'Loading…' : `${playerSummary.pendingCount} approval${playerSummary.pendingCount === 1 ? '' : 's'}`} />
        </div>
      </div>

      <CampaignJoinCodeCard
        compact
        code={code}
        loading={loading}
        rotating={rotating}
        copying={copying}
        uses={invite?.uses}
        createdAt={invite?.created_at}
        description={`Players use this code with Join Campaign. Mode: ${joinModeLabel}. Rotating the code stops the old one from working.`}
        onCopy={copyCode}
        onRotate={rotateCode}
      />
      <style>{panelCss}</style>
    </section>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div style={miniStatStyle}>
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const panelStyle = { display: 'flex', alignItems: 'stretch', gap: 14, flexWrap: 'wrap', padding: 16, background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `5px solid ${theme.accent}`, fontFamily: fontStack, color: theme.text, marginBottom: 16 };
const iconTileStyle = { width: 48, height: 48, display: 'grid', placeItems: 'center', background: theme.bg, color: theme.text, borderLeft: `6px solid ${theme.accent}`, flex: '0 0 auto' };
const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 5px', color: theme.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: theme.text, fontSize: 24, fontWeight: 950, letterSpacing: '-0.02em' };
const subtitleStyle = { margin: '7px 0 0', color: theme.soft, lineHeight: 1.45, fontSize: 13, maxWidth: 760 };
const statsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 };
const miniStatStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, background: theme.panel, color: theme.soft, border: `1px solid ${theme.line}`, padding: '7px 9px', fontSize: 12 };
const spinStyle = { animation: 'rqPlayerInviteSpin 0.9s linear infinite' };
const panelCss = `
  @keyframes rqPlayerInviteSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    [data-testid="player-invite-panel"] svg { animation: none !important; }
  }
`;

function refreshButtonStyle(isBusy) {
  return {
    minHeight: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    background: theme.accentSoft,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 950,
    cursor: isBusy ? 'progress' : 'pointer',
    opacity: isBusy ? 0.76 : 1,
  };
}
