import React, { useMemo, useState } from 'react';
import { Copy, Eye, Monitor, Projector, Send, Sparkles, Table2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';
import tiaKartaSecondScreenPresets from '@/data/tiaKartaSecondScreenPresets';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  bg: 'var(--rq-bg, #242424)',
  panel: 'var(--rq-surface, #2f2f2f)',
  card: 'var(--rq-card, #3a3a3a)',
  line: 'var(--rq-line, rgba(255,255,255,0.16))',
  red: 'var(--rq-primary, #d00000)',
  text: 'var(--rq-text, #ffffff)',
  soft: 'var(--rq-muted, rgba(255,255,255,0.74))',
  muted: 'var(--rq-faint, rgba(255,255,255,0.52))',
};

const TARGETS = [
  { id: 'standing-tv', label: 'TV / Projector', icon: Projector },
  { id: 'virtual-table', label: 'Table Screen', icon: Table2 },
];

function normaliseTarget(target) {
  return target === 'virtual-table' ? 'virtual-table' : 'standing-tv';
}

function targetStorageKey(campaignId) {
  return `rqk.playerDisplay.target.${campaignId}`;
}

function loadTarget(campaignId) {
  try { return normaliseTarget(localStorage.getItem(targetStorageKey(campaignId))); } catch { return 'standing-tv'; }
}

export default function TiaKartaSecondScreenQuickRemote({ campaignId }) {
  const [target, setTarget] = useState(() => loadTarget(campaignId));
  const [expanded, setExpanded] = useState(false);
  const [nextIndex, setNextIndex] = useState(1);
  const [sendingId, setSendingId] = useState('');

  const safeTarget = normaliseTarget(target);
  const targetLabel = TARGETS.find(item => item.id === safeTarget)?.label || 'TV / Projector';
  const displayUrl = `/player-display/${campaignId}?target=${encodeURIComponent(safeTarget)}`;
  const nextPreset = useMemo(() => tiaKartaSecondScreenPresets[nextIndex] || tiaKartaSecondScreenPresets[0], [nextIndex]);

  const rememberTarget = (targetId) => {
    const nextTarget = normaliseTarget(targetId);
    setTarget(nextTarget);
    try { localStorage.setItem(targetStorageKey(campaignId), nextTarget); } catch { /* ignore */ }
    return nextTarget;
  };

  const publish = async (preset, targetId = safeTarget) => {
    if (!preset) return;
    const displayTarget = rememberTarget(targetId);
    const state = createDisplayState('title', {
      display_target: displayTarget,
      eyebrow: preset.eyebrow,
      title: preset.title,
      subtitle: preset.subtitle,
    });

    try {
      setSendingId(preset.id);
      await publishCampaignDisplayState(campaignId, state);
      toast.success('Sent to second screen', { description: preset.title });
    } catch {
      toast.info('Sent locally. Remote display will catch up when sync reconnects.');
    } finally {
      setSendingId('');
    }
  };

  const sendBlank = async () => {
    const displayTarget = rememberTarget(safeTarget);
    try {
      setSendingId('blank');
      await publishCampaignDisplayState(campaignId, createDisplayState('blank', {
        display_target: displayTarget,
        title: 'Waiting for the GM',
        subtitle: 'The next Tia-Karta reveal will appear here.',
      }));
      toast.success('Second screen cleared');
    } finally {
      setSendingId('');
    }
  };

  const openDisplay = async (targetId = safeTarget) => {
    const displayTarget = rememberTarget(targetId);
    await publishCampaignDisplayState(campaignId, createDisplayState('blank', {
      display_target: displayTarget,
      title: displayTarget === 'virtual-table' ? 'Table Screen Ready' : 'TV Display Ready',
      subtitle: 'Leave this page open. Reveals update live from the GM remote.',
    }));
    const url = `${window.location.origin}/player-display/${campaignId}?target=${encodeURIComponent(displayTarget)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) toast.error('Pop-up blocked. Copy the display link and open it manually.');
  };

  const copyDisplayLink = async () => {
    const url = `${window.location.origin}${displayUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Second screen link copied');
    } catch {
      toast.info(url);
    }
  };

  const sendNext = async () => {
    await publish(nextPreset);
    setNextIndex(prev => (prev + 1) % tiaKartaSecondScreenPresets.length);
  };

  return (
    <section style={shellStyle} data-testid="tia-karta-second-screen-quick-remote">
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}><Sparkles size={13} /> Tia-Karta second screen</p>
          <h2 style={titleStyle}>Friday Reveal Remote</h2>
          <p style={subtitleStyle}>Open the player display once, then send reveals live. The display listens through WebSocket sync with a one-second fallback, so no manual refresh should be needed.</p>
        </div>
        <div style={actionsStyle}>
          <button type="button" onClick={() => openDisplay('standing-tv')} style={primaryButtonStyle}><Projector size={14} /> Open TV</button>
          <button type="button" onClick={() => openDisplay('virtual-table')} style={secondaryButtonStyle}><Table2 size={14} /> Open Table</button>
          <button type="button" onClick={copyDisplayLink} style={secondaryButtonStyle}><Copy size={14} /> Copy Link</button>
          <button type="button" onClick={() => setExpanded(prev => !prev)} style={secondaryButtonStyle}><Eye size={14} /> {expanded ? 'Hide' : 'Show'} Presets</button>
        </div>
      </header>

      <div style={statusStyle}>
        <span><Monitor size={13} /> Target: <strong>{targetLabel}</strong></span>
        <span>Next reveal: <strong>{nextPreset?.title || 'Ready'}</strong></span>
      </div>

      <div style={quickRowStyle}>
        {TARGETS.map(item => {
          const Icon = item.icon;
          const active = safeTarget === item.id;
          return <button key={item.id} type="button" onClick={() => rememberTarget(item.id)} style={targetButtonStyle(active)}><Icon size={14} /> {item.label}</button>;
        })}
        <button type="button" onClick={() => publish(tiaKartaSecondScreenPresets[0])} style={secondaryButtonStyle} disabled={sendingId === 'test-screen'}><Send size={14} /> Test Screen</button>
        <button type="button" onClick={sendNext} style={primaryButtonStyle} disabled={Boolean(sendingId)}><Send size={14} /> Send Next Reveal</button>
        <button type="button" onClick={sendBlank} style={secondaryButtonStyle} disabled={sendingId === 'blank'}><X size={14} /> Clear</button>
      </div>

      {expanded && (
        <div style={presetGridStyle}>
          {tiaKartaSecondScreenPresets.map((preset, index) => (
            <article key={preset.id} style={presetCardStyle}>
              <div>
                <span style={categoryStyle}>{index + 1}. {preset.category}</span>
                <strong style={presetTitleStyle}>{preset.title}</strong>
              </div>
              <p style={presetTextStyle}>{preset.subtitle}</p>
              <button type="button" onClick={() => publish(preset)} disabled={sendingId === preset.id} style={primaryButtonStyle}><Send size={14} /> {sendingId === preset.id ? 'Sending…' : 'Send'}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 8, background: theme.panel, border: `1px solid ${theme.line}`, borderLeft: `6px solid ${theme.red}`, padding: 10, color: theme.text, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' };
const eyebrowStyle = { margin: '0 0 3px', color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 };
const titleStyle = { margin: 0, color: theme.text, fontSize: 17, fontWeight: 950 };
const subtitleStyle = { margin: '3px 0 0', color: theme.soft, fontSize: 12, lineHeight: 1.35, maxWidth: 880 };
const actionsStyle = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, flexWrap: 'wrap' };
const statusStyle = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', color: theme.soft, fontSize: 12, background: theme.bg, border: `1px solid ${theme.line}`, padding: '7px 8px' };
const quickRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: theme.card, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const targetButtonStyle = (active) => ({ minHeight: 34, border: `1px solid ${active ? theme.red : theme.line}`, background: active ? theme.red : theme.card, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack });
const presetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 8, borderTop: `1px solid ${theme.line}`, paddingTop: 8 };
const presetCardStyle = { display: 'grid', gap: 8, alignContent: 'space-between', background: theme.card, border: `1px solid ${theme.line}`, padding: 10, minHeight: 165 };
const categoryStyle = { display: 'block', color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 };
const presetTitleStyle = { display: 'block', color: theme.text, fontSize: 14, fontWeight: 950, lineHeight: 1.2 };
const presetTextStyle = { margin: 0, color: theme.soft, fontSize: 12, lineHeight: 1.35, whiteSpace: 'pre-line' };
