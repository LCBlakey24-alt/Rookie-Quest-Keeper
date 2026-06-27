import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Monitor, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { loadDisplayState, subscribeDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const theme = { bg: '#080808', panel: '#242424', card: '#3a3a3a', red: '#d00000', text: '#ffffff', soft: 'rgba(255,255,255,0.76)', muted: 'rgba(255,255,255,0.52)', line: 'rgba(255,255,255,0.16)' };

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

  const goFullscreen = async () => { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch {} };

  return <main style={pageStyle} data-testid="player-display-page"><button type="button" onClick={goFullscreen} style={fullscreenButtonStyle}><Maximize2 size={16} /> Fullscreen</button><DisplayContent state={state} /><footer style={footerStyle}><span>Rookie Quest Keeper · Player Display</span>{updatedLabel && <span>Updated {updatedLabel}</span>}</footer></main>;
}

function DisplayContent({ state }) {
  const mode = state?.mode || 'blank';
  const payload = state?.payload || {};
  if (mode === 'title') return <TitleDisplay payload={payload} />;
  if (mode === 'image') return <ImageDisplay payload={payload} />;
  if (mode === 'npc-grid') return <NPCGridDisplay payload={payload} />;
  if (mode === 'combat') return <CombatDisplay payload={payload} />;
  if (mode === 'end-session-stats') return <EndSessionStatsDisplay payload={payload} />;
  return <BlankDisplay payload={payload} />;
}

function BlankDisplay({ payload }) { return <section style={blankStyle}><Monitor size={54} /><h1 style={blankTitleStyle}>{payload?.title || 'Waiting for the GM'}</h1><p style={blankTextStyle}>{payload?.subtitle || 'The next reveal will appear here.'}</p></section>; }
function TitleDisplay({ payload }) { return <section style={titleDisplayStyle}><p style={eyebrowStyle}>{payload.eyebrow || 'Scene'}</p><h1 style={sceneTitleStyle}>{payload.title || 'Untitled Scene'}</h1>{payload.subtitle && <p style={sceneSubtitleStyle}>{payload.subtitle}</p>}</section>; }
function ImageDisplay({ payload }) { return <section style={imageShellStyle}>{payload.title && <h1 style={imageTitleStyle}>{payload.title}</h1>}{payload.image_url ? <img src={payload.image_url} alt={payload.title || 'Player display image'} style={mainImageStyle} /> : <div style={missingImageStyle}>No image selected</div>}{payload.caption && <p style={captionStyle}>{payload.caption}</p>}</section>; }

function NPCGridDisplay({ payload }) {
  const npcs = Array.isArray(payload.npcs) ? payload.npcs : [];
  return <section style={npcShellStyle}><div style={displayHeaderStyle}><Users size={24} /><div><p style={eyebrowStyle}>{payload.eyebrow || 'People in the scene'}</p><h1 style={displayTitleStyle}>{payload.title || 'Who you can see'}</h1></div></div><div style={npcGridStyle}>{npcs.map(npc => <NPCCard key={npc.id || npc.name} npc={npc} />)}{npcs.length === 0 && <p style={blankTextStyle}>No NPCs selected.</p>}</div></section>;
}
function NPCCard({ npc }) { return <article style={npcCardStyle}>{npc.image_url ? <img src={npc.image_url} alt={npc.name} style={npcImageStyle} /> : <div style={npcInitialStyle}>{String(npc.name || '?').slice(0, 1).toUpperCase()}</div>}<div style={npcInfoStyle}><h2 style={npcNameStyle}>{npc.name || 'Unknown Figure'}</h2>{npc.subtitle && <p style={npcSubStyle}>{npc.subtitle}</p>}</div></article>; }

function CombatDisplay({ payload }) {
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
  const positionedTokens = tokens.filter(token => Number(token.x) || Number(token.y));
  const unpositionedTokens = tokens.filter(token => !Number(token.x) && !Number(token.y));
  return <section style={combatShellStyle}><div style={combatMapStyle}>{payload.map_url ? <img src={payload.map_url} alt={payload.title || 'Battle map'} style={combatMapImageStyle} /> : <div style={missingImageStyle}>Battle map waiting</div>}<div style={tokenOverlayStyle}>{positionedTokens.map(token => <MapToken key={token.id || token.name} token={token} />)}</div>{unpositionedTokens.length > 0 && <div style={combatTokenShelfStyle}>{unpositionedTokens.map(token => <VisibleCreatureCard key={token.id || token.name} token={token} compact />)}</div>}</div><aside style={combatSideStyle}><p style={eyebrowStyle}>Encounter</p><h1 style={combatTitleStyle}>{payload.title || 'Combat'}</h1>{payload.caption && <p style={combatCaptionStyle}>{payload.caption}</p>}<p style={combatHelpStyle}>Visible creatures only. HP, AC, notes, hidden enemies, and private GM details are not shown here.</p><div style={tokenListStyle}>{tokens.map(token => <VisibleCreatureCard key={token.id || token.name} token={token} />)}{tokens.length === 0 && <p style={blankTextStyle}>No visible tokens sent yet.</p>}</div></aside></section>;
}

function EndSessionStatsDisplay({ payload }) {
  const session = payload.session || {};
  const allTime = payload.allTime || {};
  const awards = Array.isArray(session.awards) ? session.awards : [];
  const actors = Array.isArray(session.actors) ? session.actors.slice(0, 6) : [];
  const pages = [
    { id: 'intro', eyebrow: 'End of Session', title: payload.campaignName || 'Session Recap', subtitle: 'Player dice recap incoming...' },
    { id: 'crit', eyebrow: 'Critical Glory', title: `${session.nat20s || 0}`, subtitle: `Nat 20${session.nat20s === 1 ? '' : 's'} from player rolls tonight` },
    { id: 'fumble', eyebrow: 'Dice Betrayal', title: `${session.nat1s || 0}`, subtitle: `Nat 1${session.nat1s === 1 ? '' : 's'} from player rolls tonight` },
    { id: 'awards', eyebrow: 'Table Awards', title: 'Tonight\'s Titles', awards },
    { id: 'board', eyebrow: 'Roller Board', title: 'Player Roll Leaders', actors },
    { id: 'alltime', eyebrow: 'Campaign Totals', title: `${allTime.totalRolls || 0}`, subtitle: `${allTime.nat20s || 0} all-time Nat 20s · ${allTime.nat1s || 0} all-time Nat 1s` },
  ];
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    const timer = window.setInterval(() => setPageIndex(prev => (prev + 1) % pages.length), 5200);
    return () => window.clearInterval(timer);
  }, [payload.generated_at]);

  const page = pages[pageIndex];
  return <section style={statsShowStyle}><div key={`${payload.generated_at}-${page.id}-${pageIndex}`} style={statsSlideStyle}><p style={eyebrowStyle}>{page.eyebrow}</p>{renderStatsPage(page, session, allTime)}<div style={progressDotsStyle}>{pages.map((item, index) => <span key={item.id} style={progressDotStyle(index === pageIndex)} />)}</div></div></section>;
}

function renderStatsPage(page, session, allTime) {
  if (page.id === 'awards') return <><h1 style={statsTitleStyle}>{page.title}</h1><div style={awardGridStyle}>{page.awards.length ? page.awards.slice(0, 4).map(award => <AwardCard key={`${award.title}-${award.name}`} award={award} />) : <p style={statsSubtitleStyle}>No awards yet. The dice were suspiciously quiet.</p>}</div></>;
  if (page.id === 'board') return <><h1 style={statsTitleStyle}>{page.title}</h1><div style={actorListStyle}>{page.actors.length ? page.actors.map(actor => <ActorRow key={actor.name} actor={actor} />) : <p style={statsSubtitleStyle}>No player rolls captured this session.</p>}</div></>;
  if (page.id === 'alltime') return <><h1 style={megaNumberStyle}>{page.title}</h1><p style={statsSubtitleStyle}>{page.subtitle}</p><div style={miniStatGridStyle}><StatNumber label="Player Rolls Tonight" value={session.playerRolls ?? session.totalRolls ?? 0} /><StatNumber label="All-Time Dice" value={allTime.totalDice || 0} /><StatNumber label="GM/Table Rolls Hidden" value={session.gmRolls || 0} /></div></>;
  return <><h1 style={page.id === 'intro' ? statsTitleStyle : megaNumberStyle}>{page.title}</h1><p style={statsSubtitleStyle}>{page.subtitle}</p>{page.id === 'intro' && <div style={miniStatGridStyle}><StatNumber label="Player Rolls" value={session.playerRolls ?? session.totalRolls ?? 0} hot /><StatNumber label="Dice Rolled" value={session.totalDice || 0} /><StatNumber label="Awards" value={session.awards?.length || 0} /></div>}</>;
}

function StatNumber({ label, value, hot = false }) { return <article style={statNumberStyle(hot)}><strong>{value}</strong><span>{label}</span></article>; }
function AwardCard({ award }) { return <article style={awardCardStyle}><strong>{award.title}</strong><span>{award.name}</span><em>{award.value}</em></article>; }
function ActorRow({ actor }) { return <div style={actorRowStyle}><strong>{actor.name}</strong><span>{actor.rolls} rolls · {actor.nat20s} Nat 20s · {actor.nat1s} Nat 1s</span></div>; }

function MapToken({ token }) { const left = Math.max(2, Math.min(94, Number(token.x) || 50)); const top = Math.max(2, Math.min(90, Number(token.y) || 50)); return <div style={{ ...mapTokenStyle, left: `${left}%`, top: `${top}%` }}>{token.image_url ? <img src={token.image_url} alt={token.name} style={tokenImageStyle} /> : <span>{String(token.name || '?').slice(0, 1).toUpperCase()}</span>}</div>; }
function VisibleCreatureCard({ token, compact = false }) { return <article style={compact ? tokenShelfCardStyle : visibleCreatureCardStyle}>{token.image_url ? <img src={token.image_url} alt={token.name} style={creatureImageStyle(compact)} /> : <div style={creatureInitialStyle(compact)}>{String(token.name || '?').slice(0, 1).toUpperCase()}</div>}<div style={{ minWidth: 0 }}><strong>{token.name || 'Visible Enemy'}</strong>{!compact && <span>Visible to players</span>}</div></article>; }

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
const npcNameStyle = { margin: 0, color: theme.text, fontSize: 24 };
const npcSubStyle = { margin: 0, color: theme.soft };
const combatShellStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 390px)', gap: 0, minHeight: 0, height: '100%' };
const combatMapStyle = { minHeight: 0, background: '#000', display: 'grid', placeItems: 'center', borderRight: `1px solid ${theme.line}`, position: 'relative', overflow: 'hidden' };
const combatMapImageStyle = { width: '100%', height: '100%', objectFit: 'contain' };
const tokenOverlayStyle = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const mapTokenStyle = { position: 'absolute', transform: 'translate(-50%, -50%)', width: 58, height: 58, border: `4px solid ${theme.red}`, background: theme.card, color: theme.text, display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: 24 };
const tokenImageStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const combatTokenShelfStyle = { position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: 10, background: 'rgba(0,0,0,0.68)', border: `1px solid ${theme.line}` };
const combatSideStyle = { background: theme.panel, padding: 18, display: 'grid', alignContent: 'start', gap: 12, overflow: 'hidden' };
const combatTitleStyle = { margin: 0, color: theme.text, fontFamily: titleFont, fontSize: 'clamp(32px, 4vw, 58px)', lineHeight: 0.95 };
const combatCaptionStyle = { margin: 0, color: theme.soft, fontSize: 15, lineHeight: 1.35 };
const combatHelpStyle = { margin: 0, color: theme.soft, lineHeight: 1.45, fontSize: 13 };
const tokenListStyle = { display: 'grid', gap: 8, marginTop: 8, overflowY: 'auto', maxHeight: '54vh' };
const visibleCreatureCardStyle = { display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 10, alignItems: 'center', padding: '9px 10px', background: theme.card, borderLeft: `6px solid ${theme.red}`, color: theme.text, fontWeight: 900 };
const tokenShelfCardStyle = { display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 7, alignItems: 'center', padding: '6px 8px', background: theme.card, borderLeft: `5px solid ${theme.red}`, color: theme.text, fontWeight: 900, maxWidth: 210 };
const creatureImageStyle = (compact) => ({ width: compact ? 34 : 48, height: compact ? 34 : 48, objectFit: 'cover', background: '#000' });
const creatureInitialStyle = (compact) => ({ width: compact ? 34 : 48, height: compact ? 34 : 48, display: 'grid', placeItems: 'center', background: theme.panel, color: theme.text, fontWeight: 950, fontSize: compact ? 15 : 22 });
const statsShowStyle = { display: 'grid', placeItems: 'center', minHeight: 0, padding: 'clamp(24px, 5vw, 70px)', textAlign: 'center', overflow: 'hidden' };
const statsSlideStyle = { width: 'min(1220px, 100%)', display: 'grid', gap: 24, alignContent: 'center', animation: 'rqkStatsReveal 900ms ease both' };
const statsTitleStyle = { margin: 0, fontFamily: titleFont, fontSize: 'clamp(58px, 9vw, 132px)', color: theme.text, lineHeight: 0.9 };
const megaNumberStyle = { margin: 0, fontFamily: titleFont, fontSize: 'clamp(120px, 22vw, 330px)', color: theme.text, lineHeight: 0.82, textShadow: `0 0 50px ${theme.red}66` };
const statsSubtitleStyle = { margin: 0, color: theme.soft, fontSize: 'clamp(22px, 3vw, 42px)', lineHeight: 1.2 };
const miniStatGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 8 };
const statNumberStyle = (hot) => ({ minHeight: 130, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 6, background: hot ? theme.red : theme.card, border: `1px solid ${theme.line}`, color: theme.text, textAlign: 'center', fontSize: 14, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' });
const awardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 };
const awardCardStyle = { display: 'grid', gap: 6, background: theme.card, padding: 20, border: `1px solid ${theme.line}`, borderLeft: `8px solid ${theme.red}`, textAlign: 'left', fontSize: 'clamp(18px, 2vw, 28px)' };
const actorListStyle = { display: 'grid', gap: 10, width: 'min(820px, 100%)', justifySelf: 'center' };
const actorRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 18, alignItems: 'center', background: theme.card, padding: '16px 20px', borderLeft: `8px solid ${theme.red}`, textAlign: 'left', fontSize: 'clamp(17px, 2vw, 26px)' };
const progressDotsStyle = { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 };
const progressDotStyle = (active) => ({ width: active ? 32 : 10, height: 10, background: active ? theme.red : theme.card, border: `1px solid ${theme.line}`, transition: 'all 300ms ease' });

if (typeof document !== 'undefined' && !document.getElementById('rqk-stats-reveal-css')) {
  const style = document.createElement('style');
  style.id = 'rqk-stats-reveal-css';
  style.textContent = '@keyframes rqkStatsReveal { from { opacity: 0; transform: translateY(24px) scale(0.98); filter: blur(5px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } } @media (max-width: 900px) { [data-testid="player-display-page"] section { max-width: 100%; } }';
  document.head.appendChild(style);
}
