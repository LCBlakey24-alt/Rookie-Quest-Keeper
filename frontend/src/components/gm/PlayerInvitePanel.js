import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import CampaignJoinCodeCard from '@/components/gm/CampaignJoinCodeCard';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  bg: 'var(--rq-bg-main, #242424)', panel: 'var(--rq-bg-panel, #2f2f2f)', card: 'var(--rq-bg-panel-alt, #3a3a3a)',
  line: 'var(--rq-border-default, rgba(255,255,255,0.16))', accent: 'var(--rq-accent-primary, #d00000)',
  text: 'var(--rq-text-primary, #ffffff)', soft: 'var(--rq-text-secondary, rgba(255,255,255,0.74))', muted: 'var(--rq-text-muted, rgba(255,255,255,0.62))',
};

const failureLabel = labels => {
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export default function PlayerInvitePanel({ campaignId, players: suppliedPlayers = null }) {
  const [invite, setInvite] = useState(null);
  const [players, setPlayers] = useState(Array.isArray(suppliedPlayers) ? suppliedPlayers : []);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [loadWarning, setLoadWarning] = useState('');

  useEffect(() => { if (Array.isArray(suppliedPlayers)) setPlayers(suppliedPlayers); }, [suppliedPlayers]);

  const loadPanel = useCallback(async ({ silent = false } = {}) => {
    if (!campaignId) return { ok: false, failures: ['campaign'] };
    setLoading(true);
    try {
      const [inviteResult, playersResult, membersResult] = await Promise.allSettled([
        apiClient.get(`/campaign-invites/${campaignId}`),
        Array.isArray(suppliedPlayers) ? Promise.resolve({ data: suppliedPlayers }) : apiClient.get(`/campaigns/${campaignId}/live-party`),
        apiClient.get(`/campaign-invites/${campaignId}/members`),
      ]);

      const failures = [];
      if (inviteResult.status === 'fulfilled') {
        setInvite(inviteResult.value?.data || null);
      } else {
        failures.push('join code');
      }

      if (playersResult.status === 'fulfilled') {
        setPlayers(Array.isArray(playersResult.value?.data) ? playersResult.value.data : []);
      } else {
        failures.push('party roster');
      }

      if (membersResult.status === 'fulfilled') {
        setMembers(Array.isArray(membersResult.value?.data) ? membersResult.value.data : []);
      } else {
        failures.push('linked players');
      }

      const warning = failures.length
        ? `Could not refresh ${failureLabel(failures)}. Showing the last known data for anything that failed.`
        : '';
      setLoadWarning(warning);

      if (!silent) {
        if (failures.length) toast.warning('Player details only partly refreshed', { description: warning });
        else toast.success('Player details refreshed');
      }
      return { ok: failures.length === 0, failures };
    } catch (error) {
      const message = error?.formattedDetail || error?.response?.data?.detail || 'Could not refresh player details';
      setLoadWarning(message);
      if (!silent) toast.error(message);
      return { ok: false, failures: ['player details'] };
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
      const refreshResult = await loadPanel({ silent: true });
      if (!refreshResult?.ok) {
        toast.warning('New join code saved, but some player details did not refresh', {
          description: 'The new code is preserved. Use Refresh again when the connection is stable.',
        });
      }
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

      {loadWarning && (
        <div data-testid="player-invite-load-warning" style={warningStyle} role="status">
          <AlertTriangle size={13} /> <span>{loadWarning}</span>
        </div>
      )}

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
const warningStyle = { display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.45)', color: theme.soft, fontSize: 10, lineHeight: 1.4 };
