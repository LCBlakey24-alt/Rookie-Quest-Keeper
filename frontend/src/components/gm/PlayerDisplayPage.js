import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Monitor, Table2, Users } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { loadDisplayState, subscribeDisplayState, subscribeRemoteDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const theme = {
  bg: 'var(--rq-bg-deep, #080808)',
  panel: 'var(--rq-surface, #242424)',
  card: 'var(--rq-card, #3a3a3a)',
  red: 'var(--rq-primary, #d00000)',
  text: 'var(--rq-text, #ffffff)',
  soft: 'var(--rq-muted, rgba(255,255,255,0.76))',
  muted: 'var(--rq-faint, rgba(255,255,255,0.52))',
  line: 'var(--rq-line, rgba(255,255,255,0.16))',
};

function normaliseTarget(target) {
  return target === 'virtual-table' ? 'virtual-table' : 'standing-tv';
}

function displayTargetFor(state, urlTarget) {
  return normaliseTarget(state?.payload?.display_target || urlTarget);
}

function isTable(target) {
  return target === 'virtual-table';
}

export default function PlayerDisplayPage() {
  const { campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const urlTarget = normaliseTarget(searchParams.get('target'));
  const [state, setState] = useState(() => loadDisplayState(campaignId));

  useEffect(() => {
    setState(loadDisplayState(campaignId));
    const unsubscribeLocal = subscribeDisplayState(campaignId, setState);
    const unsubscribeRemote = subscribeRemoteDisplayState(campaignId, setState);
    return () => {
      unsubscribeLocal();
      unsubscribeRemote();
    };
  }, [campaignId]);

  const updatedLabel = useMemo(() => {
    if (!state?.updated_at) return '';
    try { return new Date(state.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }, [state]);

  const target = displayTargetFor(state, urlTarget);
  const goFullscreen = async () => { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch {} };

  return (
    <main style={pageStyle(target)} data-testid="player-display-page" data-display-target={target}>
      <button type="button" onClick={goFullscreen} style={fullscreenButtonStyle}><Maximize2 size={16} /> Fullscreen</button>
      <DisplayContent state={state} target={target} />
      <footer style={footerStyle(target)}>
        <span>{isTable(target) ? <Table2 size={13} /> : <Monitor size={13} />} Rookie Quest Keeper · {isTable(target) ? 'Virtual Table Display' : 'Standing TV Display'}</span>
        <span>{updatedLabel ? `Updated ${updatedLabel}` : 'Waiting for GM sync'}</span>
      </footer>
    </main>
  );
}

function DisplayContent({ state, target }) {
  const mode = state?.mode || 'blank';
  const payload = state?.payload || {};
  if (mode === 'title') return <TitleDisplay payload={payload} target={target} />;
  if (mode === 'image') return <ImageDisplay payload={payload} target={target} />;
  if (mode === 'npc-grid') return <NPCGridDisplay payload={payload} target={target} />;
  if (mode === 'combat') return <CombatDisplay payload={payload} target={target} />;
  if (mode === 'end-session-stats') return <EndSessionStatsDisplay payload={payload} target={target} />;
  return <BlankDisplay payload={payload} target={target} />;
}

function BlankDisplay({ payload, target }) {
  return <section style={blankStyle(target)}><Monitor size={isTable(target) ? 36 : 54} /><h1 style={blankTitleStyle(target)}>{payload?.title || 'Waiting for the GM'}</h1><p style={blankTextStyle(target)}>{payload?.subtitle || 'Open the GM remote and send a scene, map, handout, NPC grid, or combat view.'}</p></section>;
}

function TitleDisplay({ payload, target }) {
  return <section style={titleDisplayStyle(target)}><p style={eyebrowStyle(target)}>{payload.eyebrow || 'Scene'}</p><h1 style={sceneTitleStyle(target)}>{payload.title || 'Untitled Scene'}</h1>{payload.subtitle && <p style={sceneSubtitleStyle(target)}>{payload.subtitle}</p>}</section>;
}

function ImageDisplay({ payload, target }) {
  return <section style={imageShellStyle(target)}>{payload.title && <h1 style={imageTitleStyle(target)}>{payload.title}</h1>}{payload.image_url ? <img src={payload.image_url} alt={payload.title || 'Player display image'} style={mainImageStyle(target)} /> : <div style={missingImageStyle}>No image selected</div>}{payload.caption && <p style={captionStyle(target)}>{payload.caption}</p>}</section>;
}

function NPCGridDisplay({ payload, target }) {
  const npcs = Array.isArray(payload.npcs) ? payload.npcs : [];
  return <section style={npcShellStyle(target)}><div style={displayHeaderStyle(target)}><Users size={isTable(target) ? 18 : 24} /><div><p style={eyebrowStyle(target)}>{payload.eyebrow || 'People in the scene'}</p><h1 style={displayTitleStyle(target)}>{payload.title || 'Who you can see'}</h1></div></div><div style={npcGridStyle(target)}>{npcs.map(npc => <NPCCard key={npc.id || npc.name} npc={npc} target={target} />)}{npcs.length === 0 && <p style={blankTextStyle(target)}>No NPCs selected.</p>}</div></section>;
}

function NPCCard({ npc, target }) {
  return <article style={npcCardStyle(target)}>{npc.image_url ? <img src={npc.image_url} alt={npc.name} style={npcImageStyle(target)} /> : <div style={npcInitialStyle(target)}>{String(npc.name || '?').slice(0, 1).toUpperCase()}</div>}<div style={npcInfoStyle(target)}><h2 style={npcNameStyle(target)}>{npc.name || 'Unknown Figure'}</h2>{npc.subtitle && <p style={npcSubStyle(target)}>{npc.subtitle}</p>}</div></article>;
}

function CombatDisplay({ payload, target }) {
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
  const positionedTokens = tokens.filter(token => Number(token.x) || Number(token.y));
  const unpositionedTokens = tokens.filter(token => !Number(token.x) && !Number(token.y));
  if (isTable(target)) {
    return <section style={tableCombatShellStyle}><div style={tableMapStyle}>{payload.map_url ? <img src={payload.map_url} alt={payload.title || 'Battle map'} style={combatMapImageStyle(target)} /> : <div style={missingImageStyle}>Battle map waiting</div>}<div style={tokenOverlayStyle}>{positionedTokens.map(token => <MapToken key={token.id || token.name} token={token} target={target} />)}</div>{unpositionedTokens.length > 0 && <div style={tableTokenShelfStyle}>{unpositionedTokens.map(token => <VisibleCreatureCard key={token.id || token.name} token={token} compact target={target} />)}</div>}<div style={tableMapLabelStyle}><strong>{payload.title || 'Combat'}</strong>{payload.caption && <span>{payload.caption}</span>}</div></div></section>;
  }
  return <section style={combatShellStyle}><div style={combatMapStyle}>{payload.map_url ? <img src={payload.map_url} alt={payload.title || 'Battle map'} style={combatMapImageStyle(target)} /> : <div style={missingImageStyle}>Battle map waiting</div>}<div style={tokenOverlayStyle}>{positionedTokens.map(token => <MapToken key={token.id || token.name} token={token} target={target} />)}</div>{unpositionedTokens.length > 0 && <div style={combatTokenShelfStyle}>{unpositionedTokens.map(token => <VisibleCreatureCard key={token.id || token.name} token={token} compact target={target} />)}</div>}</div><aside style={combatSideStyle}><p style={eyebrowStyle(target)}>Encounter</p><h1 style={combatTitleStyle}>{payload.title || 'Combat'}</h1>{payload.caption && <p style={combatCaptionStyle}>{payload.caption}</p>}<p style={combatHelpStyle}>Visible creatures only. HP, AC, notes, hidden enemies, and private GM details are not shown here.</p><div style={tokenListStyle}>{tokens.map(token => <VisibleCreatureCard key={token.id || token.name} token={token} target={target} />)}{tokens.length === 0 && <p style={blankTextStyle(target)}>No visible tokens sent yet.</p>}</div></aside></section>;
}

function EndSessionStatsDisplay({ payload, target }) {
  const session = payload.session || {};
  const allTime = payload.allTime || {};
  const awards = Array.isArray(session.awards) ? session.awards : [];
  const actors = Array.isArray(session.actors) ? session.actors.slice(0, isTable(target) ? 4 : 6) : [];
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
    const timer = window.setInterval(() => setPageIndex(prev => (prev + 1) % pages.length), isTable(target) ? 6500 : 5200);
    return () => window.clearInterval(timer);
  }, [payload.generated_at, target, pages.length]);

  const page = pages[pageIndex];
  return <section style={statsShowStyle(target)}><div key={`${payload.generated_at}-${page.id}-${pageIndex}-${target}`} style={statsSlideStyle(target)}><p style={eyebrowStyle(target)}>{page.eyebrow}</p>{renderStatsPage(page, session, allTime, target)}<div style={progressDotsStyle}>{pages.map((item, index) => <span key={item.id} style={progressDotStyle(index === pageIndex)} />)}</div></div></section>;
}

function renderStatsPage(page, session, allTime, target) {
  if (page.id === 'awards') return <><h1 style={statsTitleStyle(target)}>{page.title}</h1><div style={awardGridStyle(target)}>{page.awards.length ? page.awards.slice(0, isTable(target) ? 3 : 4).map(award => <AwardCard key={`${award.title}-${award.name}`} award={award} />) : <p style={statsSubtitleStyle(target)}>No awards yet. The dice were suspiciously quiet.</p>}</div></>;
  if (page.id === 'board') return <><h1 style={statsTitleStyle(target)}>{page.title}</h1><div style={actorListStyle}>{page.actors.length ? page.actors.map(actor => <ActorRow key={actor.name} actor={actor} />) : <p style={statsSubtitleStyle(target)}>No player rolls captured this session.</p>}</div></>;
  if (page.id === 'alltime') return <><h1 style={megaNumberStyle(target)}>{page.title}</h1><p style={statsSubtitleStyle(target)}>{page.subtitle}</p><div style={miniStatGridStyle(target)}><StatNumber label="Player Rolls Tonight" value={session.playerRolls ?? session.totalRolls ?? 0} /><StatNumber label="All-Time Dice" value={allTime.totalDice || 0} /><StatNumber label="GM/Table Rolls Hidden" value={session.gmRolls || 0} /></div></>;
  return <><h1 style={page.id === 'intro' ? statsTitleStyle(target) : megaNumberStyle(target)}>{page.title}</h1><p style={statsSubtitleStyle(target)}>{page.subtitle}</p>{page.id === 'intro' && <div style={miniStatGridStyle(target)}><StatNumber label="Player Rolls" value={session.playerRolls ?? session.totalRolls ?? 0} hot /><StatNumber label="Dice Rolled" value={session.totalDice || 0} /><StatNumber label="Awards" value={session.awards?.length || 0} /></div>}</>;
}

function StatNumber({ label, value, hot = false }) { return <article style={statNumberStyle(hot)}><strong>{value}</strong><span>{label}</span></article>; }
function AwardCard({ award }) { return <article style={awardCardStyle}><strong>{award.title}</strong><span>{award.name}</span><em>{award.value}</em></article>; }
function ActorRow({ actor }) { return <div style={actorRowStyle}><strong>{actor.name}</strong><span>{actor.rolls} rolls · {actor.nat20s} Nat 20s · {actor.nat1s} Nat 1s</span></div>; }
function MapToken({ token, target }) { const left = Math.max(2, Math.min(94, Number(token.x) || 50)); const top = Math.max(2, Math.min(90, Number(token.y) || 50)); return <div style={{ ...mapTokenStyle(target), left: `${left}%`, top: `${top}%` }}>{token.image_url ? <img src={token.image_url} alt={token.name} style={tokenImageStyle} /> : <span>{String(token.name || '?').slice(0, 1).toUpperCase()}</span>}</div>; }
function VisibleCreatureCard({ token, compact = false, target }) { return <article style={compact ? tokenShelfCardStyle(target) : visibleCreatureCardStyle}>{token.image_url ? <img src={token.image_url} alt={token.name} style={creatureImageStyle(compact, target)} /> : <div style={creatureInitialStyle(compact, target)}>{String(token.name || '?').slice(0, 1).toUpperCase()}</div>}<div style={{ minWidth: 0 }}><strong>{token.name || 'Visible Enemy'}</strong>{!compact && <span>Visible to players</span>}</div></article>; }

const pageStyle = (target) => ({ minHeight: '100dvh', background: theme.bg, color: theme.text, fontFamily: fontStack, display: 'grid', gridTemplateRows: '1fr auto', position: 'relative', overflow: 'hidden' });
const fullscreenButtonStyle = { position: 'fixed', top: 12, right: 12, zIndex: 20, minHeight: 36, border: 0, background: 'rgba(58,58,58,0.72)', color: theme.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 900, fontFamily: fontStack, cursor: 'pointer' };
const footerStyle = (target) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: isTable(target) ? '5px 9px' : '8px 12px', color: theme.muted, fontSize: isTable(target) ? 10 : 11, borderTop: `1px solid ${theme.line}`, background: '#050505' });
const blankStyle = (target) => ({ display: 'grid', placeItems: 'center', alignContent: 'center', gap: isTable(target) ? 7 : 12, textAlign: 'center', padding: isTable(target) ? 18 : 32, minHeight: 0 });
const blankTitleStyle = (target) => ({ margin: 0, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(28px, 5vw, 64px)' : 'clamp(42px, 8vw, 96px)', letterSpacing: '0.03em', color: theme.text, fontWeight: 900 });
const blankTextStyle = (target) => ({ margin: 0, color: theme.soft, fontSize: isTable(target) ? 'clamp(13px, 1.4vw, 18px)' : 'clamp(16px, 2vw, 24px)', lineHeight: 1.35 });
const titleDisplayStyle = (target) => ({ display: 'grid', placeItems: 'center', alignContent: 'center', gap: isTable(target) ? 9 : 16, textAlign: 'center', padding: isTable(target) ? '3vw' : '7vw' });
const eyebrowStyle = (target) => ({ margin: 0, color: theme.red, fontSize: isTable(target) ? 'clamp(10px, 1vw, 14px)' : 'clamp(12px, 1.4vw, 17px)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.16em' });
const sceneTitleStyle = (target) => ({ margin: 0, fontFamily: titleFont, color: theme.text, fontSize: isTable(target) ? 'clamp(34px, 6vw, 86px)' : 'clamp(56px, 9vw, 130px)', lineHeight: 0.95, letterSpacing: '0.03em' });
const sceneSubtitleStyle = (target) => ({ margin: 0, color: theme.soft, fontSize: isTable(target) ? 'clamp(15px, 1.8vw, 24px)' : 'clamp(20px, 2.5vw, 36px)', maxWidth: 1100, lineHeight: 1.35 });
const imageShellStyle = (target) => ({ display: 'grid', gridTemplateRows: isTable(target) ? 'minmax(0, 1fr) auto' : 'auto minmax(0, 1fr) auto', gap: isTable(target) ? 6 : 12, minHeight: 0, padding: isTable(target) ? 6 : 18 });
const imageTitleStyle = (target) => ({ margin: 0, color: theme.text, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(20px, 2.6vw, 42px)' : 'clamp(30px, 4vw, 64px)', textAlign: 'center', display: isTable(target) ? 'none' : 'block' });
const mainImageStyle = (target) => ({ width: '100%', height: '100%', objectFit: isTable(target) ? 'contain' : 'contain', minHeight: 0, background: '#000' });
const missingImageStyle = { display: 'grid', placeItems: 'center', minHeight: 280, background: theme.panel, border: `1px dashed ${theme.line}`, color: theme.muted, fontSize: 22 };
const captionStyle = (target) => ({ margin: 0, color: theme.soft, fontSize: isTable(target) ? 'clamp(12px, 1.2vw, 16px)' : 'clamp(15px, 1.8vw, 22px)', textAlign: 'center', lineHeight: 1.35 });
const npcShellStyle = (target) => ({ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: isTable(target) ? 9 : 18, minHeight: 0, padding: isTable(target) ? 'clamp(8px, 1.4vw, 18px)' : 'clamp(18px, 3vw, 36px)' });
const displayHeaderStyle = (target) => ({ display: 'flex', gap: 12, alignItems: 'center', justifyContent: isTable(target) ? 'flex-start' : 'center', textAlign: 'left' });
const displayTitleStyle = (target) => ({ margin: 0, color: theme.text, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(24px, 3.6vw, 52px)' : 'clamp(34px, 5vw, 72px)' });
const npcGridStyle = (target) => ({ display: 'grid', gridTemplateColumns: isTable(target) ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isTable(target) ? 9 : 18, alignContent: 'center', minHeight: 0, overflow: 'hidden' });
const npcCardStyle = (target) => ({ background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `${isTable(target) ? 5 : 8}px solid ${theme.red}`, minHeight: isTable(target) ? 150 : 260, display: 'grid', gridTemplateRows: isTable(target) ? 'minmax(90px, 1fr) auto' : 'minmax(160px, 1fr) auto', overflow: 'hidden' });
const npcImageStyle = (target) => ({ width: '100%', height: '100%', objectFit: 'cover', minHeight: isTable(target) ? 95 : 180, background: '#000' });
const npcInitialStyle = (target) => ({ display: 'grid', placeItems: 'center', background: theme.panel, color: theme.text, fontFamily: titleFont, fontSize: isTable(target) ? 48 : 92, minHeight: isTable(target) ? 95 : 180 });
const npcInfoStyle = (target) => ({ padding: isTable(target) ? 8 : 14, display: 'grid', gap: 3 });
const npcNameStyle = (target) => ({ margin: 0, color: theme.text, fontSize: isTable(target) ? 15 : 24 });
const npcSubStyle = (target) => ({ margin: 0, color: theme.soft, fontSize: isTable(target) ? 11 : 15 });
const combatShellStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 390px)', gap: 0, minHeight: 0, height: '100%' };
const combatMapStyle = { minHeight: 0, background: '#000', display: 'grid', placeItems: 'center', borderRight: `1px solid ${theme.line}`, position: 'relative', overflow: 'hidden' };
const tableCombatShellStyle = { minHeight: 0, height: '100%', background: '#000', padding: 0, overflow: 'hidden' };
const tableMapStyle = { width: '100%', height: '100%', minHeight: 0, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', background: '#000' };
const combatMapImageStyle = () => ({ width: '100%', height: '100%', objectFit: 'contain' });
const tokenOverlayStyle = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const mapTokenStyle = (target) => ({ position: 'absolute', transform: 'translate(-50%, -50%)', width: isTable(target) ? 46 : 58, height: isTable(target) ? 46 : 58, border: `${isTable(target) ? 3 : 4}px solid ${theme.red}`, background: theme.card, color: theme.text, display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: isTable(target) ? 18 : 24 });
const tokenImageStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const combatTokenShelfStyle = { position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: 10, background: 'rgba(0,0,0,0.68)', border: `1px solid ${theme.line}` };
const tableTokenShelfStyle = { position: 'absolute', left: 8, right: 8, bottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: 7, background: 'rgba(0,0,0,0.58)', border: `1px solid ${theme.line}` };
const tableMapLabelStyle = { position: 'absolute', top: 8, left: 8, display: 'grid', gap: 2, maxWidth: 'min(520px, 70%)', background: 'rgba(0,0,0,0.62)', borderLeft: `5px solid ${theme.red}`, padding: '7px 10px', color: theme.text, fontSize: 13 };
const combatSideStyle = { background: theme.panel, padding: 18, display: 'grid', alignContent: 'start', gap: 12, overflow: 'hidden' };
const combatTitleStyle = { margin: 0, color: theme.text, fontFamily: titleFont, fontSize: 'clamp(32px, 4vw, 58px)', lineHeight: 0.95 };
const combatCaptionStyle = { margin: 0, color: theme.soft, fontSize: 15, lineHeight: 1.35 };
const combatHelpStyle = { margin: 0, color: theme.soft, lineHeight: 1.45, fontSize: 13 };
const tokenListStyle = { display: 'grid', gap: 8, marginTop: 8, overflowY: 'auto', maxHeight: '54vh' };
const visibleCreatureCardStyle = { display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 10, alignItems: 'center', padding: '9px 10px', background: theme.card, borderLeft: `6px solid ${theme.red}`, color: theme.text, fontWeight: 900 };
const tokenShelfCardStyle = (target) => ({ display: 'grid', gridTemplateColumns: `${isTable(target) ? 28 : 34}px minmax(0, 1fr)`, gap: 7, alignItems: 'center', padding: isTable(target) ? '5px 7px' : '6px 8px', background: theme.card, borderLeft: `5px solid ${theme.red}`, color: theme.text, fontWeight: 900, maxWidth: isTable(target) ? 160 : 210, fontSize: isTable(target) ? 11 : 13 });
const creatureImageStyle = (compact, target) => ({ width: compact ? (isTable(target) ? 28 : 34) : 48, height: compact ? (isTable(target) ? 28 : 34) : 48, objectFit: 'cover', background: '#000' });
const creatureInitialStyle = (compact, target) => ({ width: compact ? (isTable(target) ? 28 : 34) : 48, height: compact ? (isTable(target) ? 28 : 34) : 48, display: 'grid', placeItems: 'center', background: theme.panel, color: theme.text, fontWeight: 950, fontSize: compact ? 15 : 22 });
const statsShowStyle = (target) => ({ display: 'grid', placeItems: 'center', minHeight: 0, padding: isTable(target) ? 'clamp(12px, 2.5vw, 36px)' : 'clamp(24px, 5vw, 70px)', textAlign: 'center', overflow: 'hidden' });
const statsSlideStyle = (target) => ({ width: 'min(1220px, 100%)', display: 'grid', gap: isTable(target) ? 12 : 24, alignContent: 'center', animation: 'rqkStatsReveal 900ms ease both' });
const statsTitleStyle = (target) => ({ margin: 0, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(36px, 6vw, 84px)' : 'clamp(58px, 9vw, 132px)', color: theme.text, lineHeight: 0.9 });
const megaNumberStyle = (target) => ({ margin: 0, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(78px, 15vw, 210px)' : 'clamp(120px, 22vw, 330px)', color: theme.text, lineHeight: 0.82 });
const statsSubtitleStyle = (target) => ({ margin: 0, color: theme.soft, fontSize: isTable(target) ? 'clamp(15px, 2vw, 28px)' : 'clamp(22px, 3vw, 42px)', lineHeight: 1.2 });
const miniStatGridStyle = (target) => ({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isTable(target) ? 8 : 12, marginTop: 8 });
const statNumberStyle = (hot) => ({ minHeight: 130, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 6, background: hot ? theme.red : theme.card, border: `1px solid ${theme.line}`, color: theme.text, textAlign: 'center', fontSize: 14, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' });
const awardGridStyle = (target) => ({ display: 'grid', gridTemplateColumns: isTable(target) ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))', gap: isTable(target) ? 9 : 14 });
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
