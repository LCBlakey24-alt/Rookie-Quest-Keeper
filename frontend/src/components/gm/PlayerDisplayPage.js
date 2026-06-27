import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Monitor, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { loadDisplayState, subscribeDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "New Rocker", Georgia, serif)';

const theme = {
  bg: '#080808',
  panel: '#242424',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.76)',
  muted: 'rgba(255,255,255,0.52)',
  line: 'rgba(255,255,255,0.16)',
};

export default function PlayerDisplayPage() {
  const { campaignId } = useParams();
  const [state, setState] = useState(() => loadDisplayState(campaignId));

  useEffect(() => {
    setState(loadDisplayState(campaignId));
    return subscribeDisplayState(campaignId, setState);
  }, [campaignId]);

  const updatedLabel = useMemo(() => {
    if (!state?.updated_at) return '';
    try { return new Date(state.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }, [state]);

  const goFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {}
  };

  return (
    <main style={pageStyle} data-testid="player-display-page">
      <button type="button" onClick={goFullscreen} style={fullscreenButtonStyle}><Maximize2 size={16} /> Fullscreen</button>
      <DisplayContent state={state} />
      <footer style={footerStyle}>
        <span>Rookie Quest Keeper · Player Display</span>
        {updatedLabel && <span>Updated {updatedLabel}</span>}
      </footer>
    </main>
  );
}

function DisplayContent({ state }) {
  const mode = state?.mode || 'blank';
  const payload = state?.payload || {};

  if (mode === 'title') return <TitleDisplay payload={payload} />;
  if (mode === 'image') return <ImageDisplay payload={payload} />;
  if (mode === 'npc-grid') return <NPCGridDisplay payload={payload} />;
  if (mode === 'combat') return <CombatDisplay payload={payload} />;
  return <BlankDisplay payload={payload} />;
}

function BlankDisplay({ payload }) {
  return (
    <section style={blankStyle}>
      <Monitor size={54} />
      <h1 style={blankTitleStyle}>{payload?.title || 'Waiting for the GM'}</h1>
      <p style={blankTextStyle}>{payload?.subtitle || 'The next reveal will appear here.'}</p>
    </section>
  );
}

function TitleDisplay({ payload }) {
  return (
    <section style={titleDisplayStyle}>
      <p style={eyebrowStyle}>{payload.eyebrow || 'Scene'}</p>
      <h1 style={sceneTitleStyle}>{payload.title || 'Untitled Scene'}</h1>
      {payload.subtitle && <p style={sceneSubtitleStyle}>{payload.subtitle}</p>}
    </section>
  );
}

function ImageDisplay({ payload }) {
  return (
    <section style={imageShellStyle}>
      {payload.title && <h1 style={imageTitleStyle}>{payload.title}</h1>}
      {payload.image_url ? (
        <img src={payload.image_url} alt={payload.title || 'Player display image'} style={mainImageStyle} />
      ) : (
        <div style={missingImageStyle}>No image selected</div>
      )}
      {payload.caption && <p style={captionStyle}>{payload.caption}</p>}
    </section>
  );
}

function NPCGridDisplay({ payload }) {
  const npcs = Array.isArray(payload.npcs) ? payload.npcs : [];
  return (
    <section style={npcShellStyle}>
      <div style={displayHeaderStyle}>
        <Users size={24} />
        <div>
          <p style={eyebrowStyle}>{payload.eyebrow || 'People in the scene'}</p>
          <h1 style={displayTitleStyle}>{payload.title || 'Who you can see'}</h1>
        </div>
      </div>
      <div style={npcGridStyle}>
        {npcs.map(npc => <NPCCard key={npc.id || npc.name} npc={npc} />)}
        {npcs.length === 0 && <p style={blankTextStyle}>No NPCs selected.</p>}
      </div>
    </section>
  );
}

function NPCCard({ npc }) {
  return (
    <article style={npcCardStyle}>
      {npc.image_url ? <img src={npc.image_url} alt={npc.name} style={npcImageStyle} /> : <div style={npcInitialStyle}>{String(npc.name || '?').slice(0, 1).toUpperCase()}</div>}
      <div style={npcInfoStyle}>
        <h2>{npc.name || 'Unknown Figure'}</h2>
        {npc.subtitle && <p>{npc.subtitle}</p>}
      </div>
    </article>
  );
}

function CombatDisplay({ payload }) {
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
  return (
    <section style={combatShellStyle}>
      <div style={combatMapStyle}>
        {payload.map_url ? <img src={payload.map_url} alt={payload.title || 'Battle map'} style={combatMapImageStyle} /> : <div style={missingImageStyle}>Battle map waiting</div>}
      </div>
      <aside style={combatSideStyle}>
        <p style={eyebrowStyle}>Encounter</p>
        <h1 style={combatTitleStyle}>{payload.title || 'Combat'}</h1>
        <p style={combatHelpStyle}>Players can see visible creatures only. HP, AC, notes, and hidden enemies stay on the GM side.</p>
        <div style={tokenListStyle}>
          {tokens.map(token => <div key={token.id || token.name} style={tokenRowStyle}><span style={tokenDotStyle} />{token.name}</div>)}
          {tokens.length === 0 && <p style={blankTextStyle}>No visible tokens sent yet.</p>}
        </div>
      </aside>
    </section>
  );
}

const pageStyle = { minHeight: '100dvh', background: theme.bg, color: theme.text, fontFamily: fontStack, display: 'grid', gridTemplateRows: '1fr auto', position: 'relative', overflow: 'hidden' };
const fullscreenButtonStyle = { position: 'fixed', top: 12, right: 12, zIndex: 20, minHeight: 36, border: 0, background: 'rgba(58,58,58,0.72)', color: theme.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 900, fontFamily: fontStack, cursor: 'pointer' };
const footerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 12px', color: theme.muted, fontSize: 11, borderTop: `1px solid ${theme.line}`, background: '#050505' };
const blankStyle = { display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12, textAlign: 'center', padding: 32, minHeight: 0 };
const blankTitleStyle = { margin: 0, fontFamily: titleFont, fontSize: 'clamp(42px, 8vw, 96px)', letterSpacing: '0.03em', color: theme.text, fontWeight: 900 };
const blankTextStyle = { margin: 0, color: theme.soft, fontSize: 'clamp(16px, 2vw, 24px)', lineHeight: 1.45 };
const titleDisplayStyle = { display: 'grid', placeItems: 'center', alignContent: 'center', gap: 16, textAlign: 'center', padding: '7vw' };
const eyebrowStyle = { margin: 0, color: theme.red, fontSize: 'clamp(12px, 1.4vw, 17px)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.16em' };
const sceneTitleStyle = { margin: 0, fontFamily: titleFont, color: theme.text, fontSize: 'clamp(56px, 9vw, 130px)', lineHeight: 0.95, letterSpacing: '0.03em' };
const sceneSubtitleStyle = { margin: 0, color: theme.soft, fontSize: 'clamp(20px, 2.5vw, 36px)', maxWidth: 1100, lineHeight: 1.35 };
const imageShellStyle = { display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', gap: 12, minHeight: 0, padding: 18 };
const imageTitleStyle = { margin: 0, color: theme.text, fontFamily: titleFont, fontSize: 'clamp(30px, 4vw, 64px)', textAlign: 'center' };
const mainImageStyle = { width: '100%', height: '100%', objectFit: 'contain', minHeight: 0, background: '#000' };
const missingImageStyle = { display: 'grid', placeItems: 'center', minHeight: 280, background: theme.panel, border: `1px dashed ${theme.line}`, color: theme.muted, fontSize: 22 };
const captionStyle = { margin: 0, color: theme.soft, fontSize: 'clamp(15px, 1.8vw, 22px)', textAlign: 'center', lineHeight: 1.35 };
const npcShellStyle = { display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 18, minHeight: 0, padding: 'clamp(18px, 3vw, 36px)' };
const displayHeaderStyle = { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', textAlign: 'left' };
const displayTitleStyle = { margin: 0, color: theme.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 72px)' };
const npcGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, alignContent: 'center', minHeight: 0, overflow: 'hidden' };
const npcCardStyle = { background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `8px solid ${theme.red}`, minHeight: 260, display: 'grid', gridTemplateRows: 'minmax(160px, 1fr) auto', overflow: 'hidden' };
const npcImageStyle = { width: '100%', height: '100%', objectFit: 'cover', minHeight: 180, background: '#000' };
const npcInitialStyle = { display: 'grid', placeItems: 'center', background: theme.panel, color: theme.text, fontFamily: titleFont, fontSize: 92, minHeight: 180 };
const npcInfoStyle = { padding: 14, display: 'grid', gap: 4 };
const combatShellStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 360px)', gap: 0, minHeight: 0, height: '100%' };
const combatMapStyle = { minHeight: 0, background: '#000', display: 'grid', placeItems: 'center', borderRight: `1px solid ${theme.line}` };
const combatMapImageStyle = { width: '100%', height: '100%', objectFit: 'contain' };
const combatSideStyle = { background: theme.panel, padding: 18, display: 'grid', alignContent: 'start', gap: 12 };
const combatTitleStyle = { margin: 0, color: theme.text, fontFamily: titleFont, fontSize: 'clamp(32px, 4vw, 58px)' };
const combatHelpStyle = { margin: 0, color: theme.soft, lineHeight: 1.45, fontSize: 14 };
const tokenListStyle = { display: 'grid', gap: 8, marginTop: 8 };
const tokenRowStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: theme.card, color: theme.text, fontWeight: 900 };
const tokenDotStyle = { width: 12, height: 12, background: theme.red, flex: '0 0 auto' };
