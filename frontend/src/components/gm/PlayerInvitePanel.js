import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  primary: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.62)',
};

export default function PlayerInvitePanel({ campaignId, players = [] }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadInvite() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/campaign-invites/${campaignId}`);
        if (!cancelled) setInvite(response.data);
      } catch {
        if (!cancelled) setInvite(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (campaignId) loadInvite();
    return () => { cancelled = true; };
  }, [campaignId]);

  const code = invite?.join_code || invite?.code || '';
  const playerSummary = useMemo(() => {
    const count = players.length;
    const levels = players.map(player => Number(player.level || 1)).filter(Boolean);
    const avgLevel = levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length) : 0;
    return { count, avgLevel };
  }, [players]);

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
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not rotate join code');
    } finally {
      setRotating(false);
    }
  };

  return (
    <section style={panelStyle} data-testid="player-invite-panel">
      <div style={iconTileStyle}><UserPlus size={24} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={eyebrowStyle}>Players & Invites</p>
        <h3 style={titleStyle}>Bring players into this campaign</h3>
        <p style={subtitleStyle}>Share the join code with players. Once they join with a character, they appear in the roster and can receive lore, secrets, handouts, and campaign updates.</p>

        <div style={statsStyle}>
          <MiniStat icon={Users} label="Roster" value={`${playerSummary.count} player${playerSummary.count === 1 ? '' : 's'}`} />
          <MiniStat icon={ShieldCheck} label="Average level" value={playerSummary.avgLevel ? `Lv ${playerSummary.avgLevel}` : 'Not set'} />
        </div>
      </div>

      <aside style={codeBoxStyle}>
        <span style={codeLabelStyle}>Campaign join code</span>
        <strong style={codeStyle}>{loading ? 'Loading…' : code || 'Unavailable'}</strong>
        <div style={buttonRowStyle}>
          <button type="button" onClick={copyCode} disabled={!code || loading} style={primaryButtonStyle}>
            {copying ? <Check size={14} /> : <Copy size={14} />} Copy
          </button>
          <button type="button" onClick={rotateCode} disabled={rotating || loading} style={secondaryButtonStyle}>
            <RefreshCw size={14} /> {rotating ? 'Rotating…' : 'Rotate'}
          </button>
        </div>
        <p style={codeHelpStyle}>Players use this from their dashboard with Join Campaign.</p>
      </aside>
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

const panelStyle = { display: 'flex', alignItems: 'stretch', gap: 14, flexWrap: 'wrap', padding: 16, background: theme.card, border: `1px solid ${theme.line}`, fontFamily: fontStack, color: theme.text, marginBottom: 16 };
const iconTileStyle = { width: 48, height: 48, display: 'grid', placeItems: 'center', background: theme.bg, color: theme.text, borderLeft: `6px solid ${theme.primary}`, flex: '0 0 auto' };
const eyebrowStyle = { margin: '0 0 5px', color: theme.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: theme.text, fontSize: 24, fontWeight: 950, letterSpacing: '-0.02em' };
const subtitleStyle = { margin: '7px 0 0', color: theme.soft, lineHeight: 1.45, fontSize: 13, maxWidth: 760 };
const statsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 };
const miniStatStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, background: theme.panel, color: theme.soft, border: `1px solid ${theme.line}`, padding: '7px 9px', fontSize: 12 };
const codeBoxStyle = { minWidth: 230, flex: '0 1 280px', background: theme.bg, border: `1px solid ${theme.lineStrong}`, padding: 12, display: 'grid', gap: 8, alignSelf: 'stretch' };
const codeLabelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const codeStyle = { color: theme.text, fontSize: 30, fontWeight: 950, letterSpacing: '0.14em' };
const buttonRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 34, border: 0, borderRadius: 0, background: theme.primary, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, borderRadius: 0, background: theme.panel, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const codeHelpStyle = { margin: 0, color: theme.muted, fontSize: 11, lineHeight: 1.35 };
