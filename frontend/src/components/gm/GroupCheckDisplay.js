import React, { useMemo } from 'react';
import { CheckCircle2, Dice6, Sparkles, Timer, Users } from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';

const theme = {
  panel: 'var(--rq-surface, #242424)',
  card: 'var(--rq-card, #3a3a3a)',
  red: 'var(--rq-primary, #d00000)',
  text: 'var(--rq-text, #ffffff)',
  soft: 'var(--rq-muted, rgba(255,255,255,0.76))',
  muted: 'var(--rq-faint, rgba(255,255,255,0.52))',
  line: 'var(--rq-line, rgba(255,255,255,0.16))',
  lineStrong: 'var(--rq-line-strong, rgba(255,255,255,0.28))',
};

function isTable(target) {
  return target === 'virtual-table';
}

function cleanKey(value) {
  return String(value || '').trim().toLowerCase();
}

function playerId(player = {}, index = 0) {
  return String(player.id || player.character_id || player.player_id || player.user_id || player.name || `player-${index}`);
}

function playerName(player = {}) {
  return player.name || player.character_name || player.display_name || player.playerName || player.player_name || 'Hero';
}

function identityKeys(value = {}, index = 0) {
  return [
    value.id,
    value.character_id,
    value.characterId,
    value.player_id,
    value.playerId,
    value.user_id,
    value.userId,
    value.name,
    value.character_name,
    value.characterName,
    value.display_name,
    value.displayName,
    value.playerName,
    value.player_name,
    value.actor,
    value.actor_name,
    index !== null ? `index-${index}` : '',
  ].map(cleanKey).filter(Boolean);
}

function indexResults(results = []) {
  const resultMap = new Map();
  results.forEach((result, index) => {
    identityKeys(result, index).forEach(key => resultMap.set(key, result));
  });
  return resultMap;
}

function naturalD20(result = {}) {
  const d20 = (result.visibleRolls || result.rolls || []).find(roll => Number(roll.sides) === 20 && !roll.dropped);
  return d20?.result || result.natural || result.natural_roll || null;
}

function latestResultTime(result = {}) {
  const raw = result.created_at || result.updated_at || result.rolled_at || result.timestamp;
  if (!raw) return '';
  try { return new Date(raw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function mergeResults(party = [], results = [], dc = null) {
  const resultMap = indexResults(results);
  return party.map((player, index) => {
    const result = identityKeys(player, index).map(key => resultMap.get(key)).find(Boolean);
    const total = Number(result?.total ?? result?.roll_total ?? result?.value);
    const hasResult = Number.isFinite(total);
    return {
      id: playerId(player, index),
      name: playerName(player),
      className: player.className || player.class_name || player.character_class || player.class || '',
      imageUrl: player.imageUrl || player.image_url || player.avatar_url || player.portrait_url || player.character_image || '',
      total: hasResult ? total : null,
      natural: result ? naturalD20(result) : null,
      rolledAt: result ? latestResultTime(result) : '',
      status: hasResult ? (dc && total >= dc ? 'success' : dc ? 'failed' : 'rolled') : 'pending',
      result,
    };
  });
}

export default function GroupCheckDisplay({ payload = {}, target = 'standing-tv', fallbackParty = [] }) {
  const party = Array.isArray(payload.party) && payload.party.length ? payload.party : fallbackParty;
  const results = Array.isArray(payload.results) ? payload.results : [];
  const dc = Number(payload.dc);
  const hasDc = Number.isFinite(dc) && dc > 0;
  const rows = useMemo(() => mergeResults(party, results, hasDc ? dc : null), [party, results, dc, hasDc]);
  const completed = rows.filter(row => row.status !== 'pending').length;
  const allDone = rows.length > 0 && completed === rows.length;
  const best = rows.filter(row => row.total !== null).sort((a, b) => Number(b.total) - Number(a.total))[0];

  return (
    <section style={shellStyle(target)} data-testid="group-check-display">
      <div style={heroStyle(target)}>
        <p style={eyebrowStyle(target)}>{payload.eyebrow || 'Group Check Requested'}</p>
        <h1 style={titleStyle(target)}>{payload.title || `${payload.check_name || 'Skill'} Check`}</h1>
        <p style={subtitleStyle(target)}>{payload.subtitle || `The GM has requested a ${payload.check_name || 'group'} check.`}</p>
        <div style={metaRowStyle(target)}>
          <span><Dice6 size={isTable(target) ? 13 : 16} /> {payload.notation || '1d20'}</span>
          <span><Sparkles size={isTable(target) ? 13 : 16} /> {payload.ability || 'Ability Check'}</span>
          {hasDc && <span><CheckCircle2 size={isTable(target) ? 13 : 16} /> DC {dc}</span>}
          <span><Users size={isTable(target) ? 13 : 16} /> {completed}/{rows.length || 0} rolled</span>
        </div>
      </div>

      <div style={boardStyle(target, rows.length)} data-testid="group-check-result-board">
        {rows.map(row => <GroupCheckCard key={row.id} row={row} target={target} hasDc={hasDc} dc={dc} />)}
        {rows.length === 0 && <div style={emptyStyle(target)}>Waiting for linked players.</div>}
      </div>

      <aside style={statusBarStyle(target, allDone)}>
        <span><Timer size={isTable(target) ? 13 : 16} /> {allDone ? 'All rolls collected' : 'Waiting for rolls'}</span>
        {best ? <strong>Top roll: {best.name} · {best.total}</strong> : <strong>Players roll from their own dice tray</strong>}
      </aside>
    </section>
  );
}

function GroupCheckCard({ row, target, hasDc, dc }) {
  const pending = row.status === 'pending';
  const success = row.status === 'success';
  return (
    <article style={cardStyle(target, row.status)} data-testid="group-check-player-card">
      <div style={portraitStyle(target, row.status)}>
        {row.imageUrl ? <img src={row.imageUrl} alt={row.name} style={portraitImageStyle} /> : <span>{String(row.name || '?').slice(0, 1).toUpperCase()}</span>}
      </div>
      <div style={cardInfoStyle(target)}>
        <strong>{row.name}</strong>
        <span>{row.className || 'Adventurer'}</span>
      </div>
      <div style={rollTotalStyle(target, row.status)}>
        {pending ? '—' : row.total}
      </div>
      <div style={cardFooterStyle(target, row.status)}>
        {pending ? 'Waiting' : hasDc ? success ? `Success vs DC ${dc}` : `Failed vs DC ${dc}` : 'Rolled'}
        {row.natural && <em>Nat {row.natural}</em>}
        {row.rolledAt && <em>{row.rolledAt}</em>}
      </div>
    </article>
  );
}

const shellStyle = (target) => ({ minHeight: 0, height: '100%', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', gap: isTable(target) ? 8 : 14, padding: isTable(target) ? 10 : 'clamp(18px, 3vw, 40px)', animation: 'rqkGroupCheckReveal 700ms ease both', overflow: 'hidden', fontFamily: fontStack });
const heroStyle = (target) => ({ display: 'grid', justifyItems: 'center', gap: isTable(target) ? 5 : 10, textAlign: 'center', padding: isTable(target) ? '8px 10px' : '14px 18px', background: 'rgba(0,0,0,0.42)', border: `1px solid ${theme.line}`, borderTop: `${isTable(target) ? 5 : 8}px solid ${theme.red}`, boxShadow: '0 26px 100px rgba(0,0,0,0.42)' });
const eyebrowStyle = (target) => ({ margin: 0, color: theme.red, fontSize: isTable(target) ? 10 : 13, fontWeight: 950, letterSpacing: '0.16em', textTransform: 'uppercase' });
const titleStyle = (target) => ({ margin: 0, color: theme.text, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(30px, 5vw, 70px)' : 'clamp(54px, 8vw, 124px)', lineHeight: 0.9, letterSpacing: '0.03em' });
const subtitleStyle = (target) => ({ margin: 0, color: theme.soft, fontSize: isTable(target) ? 'clamp(12px, 1.6vw, 18px)' : 'clamp(17px, 2vw, 28px)', lineHeight: 1.25, maxWidth: 1100 });
const metaRowStyle = (target) => ({ display: 'flex', gap: isTable(target) ? 5 : 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: isTable(target) ? 2 : 6, color: theme.text, fontSize: isTable(target) ? 10 : 13, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' });
const boardStyle = (target, count) => ({ minHeight: 0, display: 'grid', gridTemplateColumns: isTable(target) ? 'repeat(auto-fit, minmax(128px, 1fr))' : count <= 4 ? `repeat(${Math.max(1, count)}, minmax(0, 1fr))` : 'repeat(auto-fit, minmax(210px, 1fr))', gap: isTable(target) ? 8 : 14, alignContent: 'center', overflow: 'hidden' });
const cardStyle = (target, status) => ({ minHeight: isTable(target) ? 150 : 248, display: 'grid', gridTemplateRows: `${isTable(target) ? 46 : 76}px auto minmax(42px, 1fr) auto`, justifyItems: 'center', gap: isTable(target) ? 5 : 9, padding: isTable(target) ? 8 : 14, background: status === 'pending' ? 'rgba(58,58,58,0.82)' : status === 'success' ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(208,0,0,0.36))' : 'linear-gradient(135deg, rgba(12,0,0,0.74), rgba(58,58,58,0.9))', border: `1px solid ${status === 'pending' ? theme.line : theme.lineStrong}`, borderTop: `${isTable(target) ? 4 : 7}px solid ${status === 'pending' ? theme.lineStrong : theme.red}`, boxShadow: status === 'pending' ? '0 16px 42px rgba(0,0,0,0.24)' : '0 22px 72px rgba(208,0,0,0.22)', textAlign: 'center', overflow: 'hidden' });
const portraitStyle = (target, status) => ({ width: isTable(target) ? 46 : 76, height: isTable(target) ? 46 : 76, display: 'grid', placeItems: 'center', overflow: 'hidden', background: status === 'pending' ? theme.panel : theme.red, color: theme.text, border: `1px solid ${theme.lineStrong}`, fontFamily: titleFont, fontSize: isTable(target) ? 23 : 42, boxShadow: status === 'pending' ? 'none' : '0 0 34px rgba(208,0,0,0.34)' });
const portraitImageStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const cardInfoStyle = (target) => ({ minWidth: 0, display: 'grid', gap: 2, color: theme.text, fontSize: isTable(target) ? 12 : 18, fontWeight: 950 });
const rollTotalStyle = (target, status) => ({ display: 'grid', placeItems: 'center', color: status === 'pending' ? theme.muted : theme.text, fontFamily: titleFont, fontSize: isTable(target) ? 'clamp(34px, 6vw, 68px)' : 'clamp(58px, 8vw, 132px)', lineHeight: 0.9, textShadow: status === 'pending' ? 'none' : '0 0 28px rgba(208,0,0,0.38)' });
const cardFooterStyle = (target, status) => ({ minHeight: isTable(target) ? 24 : 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', color: theme.text, background: status === 'pending' ? 'rgba(0,0,0,0.34)' : theme.red, border: `1px solid ${theme.line}`, padding: isTable(target) ? '3px 6px' : '5px 9px', fontSize: isTable(target) ? 9 : 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' });
const statusBarStyle = (target, done) => ({ minHeight: isTable(target) ? 34 : 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: isTable(target) ? '6px 8px' : '9px 12px', background: done ? 'rgba(208,0,0,0.72)' : 'rgba(0,0,0,0.58)', border: `1px solid ${done ? theme.red : theme.line}`, color: theme.text, fontSize: isTable(target) ? 10 : 13, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' });
const emptyStyle = (target) => ({ color: theme.soft, fontSize: isTable(target) ? 16 : 24, textAlign: 'center', padding: 24, border: `1px dashed ${theme.line}`, background: 'rgba(0,0,0,0.32)' });

if (typeof document !== 'undefined' && !document.getElementById('rqk-group-check-display-css')) {
  const style = document.createElement('style');
  style.id = 'rqk-group-check-display-css';
  style.textContent = `
    @keyframes rqkGroupCheckReveal { from { opacity: 0; transform: translateY(18px) scale(0.985); filter: blur(6px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    [data-testid="group-check-display"] [data-testid="group-check-player-card"] { animation: rqkGroupCheckReveal 620ms ease both; }
    [data-testid="group-check-display"] [data-testid="group-check-player-card"]:nth-child(2) { animation-delay: 60ms; }
    [data-testid="group-check-display"] [data-testid="group-check-player-card"]:nth-child(3) { animation-delay: 120ms; }
    [data-testid="group-check-display"] [data-testid="group-check-player-card"]:nth-child(4) { animation-delay: 180ms; }
    [data-testid="group-check-display"] [data-testid="group-check-player-card"]:nth-child(5) { animation-delay: 240ms; }
    @media (max-width: 820px) { [data-testid="group-check-display"] [data-testid="group-check-result-board"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
  `;
  document.head.appendChild(style);
}
