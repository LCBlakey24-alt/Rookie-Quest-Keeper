import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import CampaignJoinCodeCard from '@/components/gm/CampaignJoinCodeCard';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  bg: 'var(--rq-bg-main, #242424)', panel: 'var(--rq-bg-panel, #2f2f2f)', card: 'var(--rq-bg-panel-alt, #3a3a3a)',
  line: 'var(--rq-border-default, rgba(255,255,255,0.16))', accent: 'var(--rq-accent-primary, #d00000)',
  text: 'var(--rq-text-primary, #ffffff)', soft: 'var(--rq-text-secondary, rgba(255,255,255,0.74))', muted: 'var(--rq-text-muted, rgba(255,255,255,0.62))',
};

export default function PlayerInvitePanel({ campaignId, players: suppliedPlayers = null }) {
  const [invite, setInvite] = useState(null);
  const [players, setPlayers] = useState(Array.isArray(suppliedPlayers) ? suppliedPlayers : []);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => { if (Array.isArray(suppliedPlayers)) setPlayers(suppliedPlayers); }, [suppliedPlayers]);

  const loadPanel = useCallback(async ({ silent = false } = {}) => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const [inviteRes, playersRes, membersRes] = await Promise.all([
        apiClient.get(`/campaign-invites/${campaignId}`).catch(() => ({ data: null })),
        Array.isArray(suppliedPlayers) ? Promise.resolve({ data: suppliedPlayers }) : apiClient.get(`/campaigns/${campaignId}/live-party`).catch(() => ({ data: [] })),
        apiClient.get(`/campaign-invites/${campaignId}/members`).catch(() => ({ data: [] })),
      ]);
      setInvite(inviteRes.data);
      setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      if (!silent) toast.success('Player details refreshed');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not refresh player details');
    } finally {
      setLoading(false);
    }
  }, [campaignId, suppliedPlayers]);

  useEffect(() => { if (campaignId) loadPanel({ silent: true }); }, [campaignId, loadPanel]);

  const code = invite?.join_code || invite?.code || '';
  const panelBusy = loading || rotating || copying;
  const playerSummary = useMemo(() => {
    const liveMembers = members.filter(member => String(member.status || 'active').toLowerCase() !== 'removed');
    return {
      rosterCount: players.length,
      linkedCount: liveMembers.filter(member => member.character_id).length,
      pendingCount: liveMembers.filter(member => String(member.status || '').toLowerCase() === 'pending').length,
    };
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
    if (!campaignId || !window.confirm('Create a new join code? The old code will stop working.')) return;
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
      <div style={topRowStyle}>
        <strong style={labelStyle}><UserPlus size={15} /> Players & Invites</strong>
        <div style={summaryStyle}>
          <MiniStat icon={Users} value={loading ? '…' : playerSummary.rosterCount} label="Party" />
          <MiniStat icon={ShieldCheck} value={loading ? '…' : playerSummary.linkedCount} label="Linked" />
          {playerSummary.pendingCount > 0 && <MiniStat icon={UserPlus} value={playerSummary.pendingCount} label="Pending" accent />}
        </div>
        <button type="button" onClick={() => loadPanel()} disabled={loading || rotating} style={refreshButtonStyle}><RefreshCw size={13} /> Refresh</button>
      </div>

      <CampaignJoinCodeCard
        compact
        code={code}
        loading={loading}
        rotating={rotating}
        copying={copying}
        uses={invite?.uses}
        createdAt={invite?.created_at}
        description="Share this code with players to link their characters."
        onCopy={copyCode}
        onRotate={rotateCode}
      />
    </section>
  );
}

function MiniStat({ icon: Icon, value, label, accent = false }) {
  return <span style={{ ...miniStatStyle, borderColor: accent ? theme.accent : theme.line }}><Icon size={12} /><strong>{value}</strong><small>{label}</small></span>;
}

const panelStyle = { display: 'grid', gap: 7, padding: 8, background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `4px solid ${theme.accent}`, fontFamily: fontStack, color: theme.text, marginBottom: 8 };
const topRowStyle = { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' };
const labelStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 };
const summaryStyle = { display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 'auto' };
const miniStatStyle = { minHeight: 28, display: 'inline-flex', alignItems: 'center', gap: 4, background: theme.panel, color: theme.soft, border: `1px solid ${theme.line}`, padding: '0 6px', fontSize: 10 };
const refreshButtonStyle = { minHeight: 30, display: 'inline-flex', alignItems: 'center', gap: 5, background: theme.panel, color: theme.soft, border: `1px solid ${theme.line}`, padding: '0 7px', fontSize: 10, fontWeight: 850, cursor: 'pointer' };
