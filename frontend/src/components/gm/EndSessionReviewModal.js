import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, publishDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = { bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)' };

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function buildRecapNote(summary) {
  const session = summary?.session || {};
  const awards = Array.isArray(session.awards) ? session.awards : [];
  const actors = Array.isArray(session.actors) ? session.actors : [];
  const awardLines = awards.length ? awards.map(award => `- ${award.title}: ${award.name} (${award.value})`).join('\n') : '- No awards generated.';
  const actorLines = actors.length ? actors.slice(0, 8).map(actor => `- ${actor.name}: ${actor.rolls} rolls, ${actor.nat20s} Nat 20s, ${actor.nat1s} Nat 1s`).join('\n') : '- No player rolls captured.';
  return [
    'End Session Roll Recap',
    '',
    `Player rolls: ${number(session.playerRolls ?? session.totalRolls)}`,
    `GM/table rolls hidden from player focus: ${number(session.gmRolls)}`,
    `Dice rolled: ${number(session.totalDice)}`,
    `Nat 20s: ${number(session.nat20s)}`,
    `Nat 1s: ${number(session.nat1s)}`,
    '',
    'Awards:',
    awardLines,
    '',
    'Player Roll Board:',
    actorLines,
  ].join('\n');
}

export default function EndSessionReviewModal({ campaignId, campaignName = 'Campaign', onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAllTime, setShowAllTime] = useState(true);
  const [saveRecapNote, setSaveRecapNote] = useState(true);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/roll-events/summary`);
      setSummary(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not preview session stats');
      setSummary({ campaignName, session: { playerRolls: 0, gmRolls: 0, totalRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, actors: [], awards: [] }, allTime: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPreview(); }, [campaignId]);

  const session = summary?.session || {};
  const awards = Array.isArray(session.awards) ? session.awards : [];
  const actors = Array.isArray(session.actors) ? session.actors : [];
  const topActor = actors[0];
  const playerRollCount = number(session.playerRolls ?? session.totalRolls);
  const gmRollCount = number(session.gmRolls);

  const displaySummary = useMemo(() => {
    if (!summary) return null;
    return showAllTime ? summary : { ...summary, allTime: { totalRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, actors: [] } };
  }, [summary, showAllTime]);

  const sendEndSessionShow = async () => {
    setSending(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/roll-events/end-session`);
      const finalSummary = showAllTime ? response.data : { ...response.data, allTime: { totalRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, actors: [] } };
      publishDisplayState(campaignId, createDisplayState('end-session-stats', finalSummary));
      if (saveRecapNote) {
        await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content: buildRecapNote(response.data) }).catch(() => null);
      }
      const rolls = response.data?.session?.playerRolls ?? response.data?.session?.totalRolls ?? 0;
      if (rolls > 0) toast.success('End session show sent to player display', { description: 'Player roll stats were archived for the next session.' });
      else toast.info('End session show sent', { description: 'No player rolls were captured, so the show will be pretty quiet.' });
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not end session');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle} role="presentation">
      <section style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="end-session-title">
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>GM Review</p>
            <h2 id="end-session-title" style={titleStyle}>End Session Control</h2>
            <p style={subtitleStyle}>Check the player stats before the animated recap goes to the extended display.</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} style={closeButtonStyle} aria-label="Close end session review"><X size={20} /></button>
        </header>

        {loading ? (
          <div style={loadingStyle}>Loading session stats…</div>
        ) : (
          <>
            <section style={metricGridStyle}>
              <Metric label="Player Rolls" value={playerRollCount} hot />
              <Metric label="Nat 20s" value={number(session.nat20s)} />
              <Metric label="Nat 1s" value={number(session.nat1s)} />
              <Metric label="Dice Rolled" value={number(session.totalDice)} />
              <Metric label="GM/Table Rolls" value={gmRollCount} muted />
              <Metric label="Top Roller" value={topActor?.name || 'None'} text />
            </section>

            {playerRollCount === 0 && (
              <section style={warningStyle}>
                No player rolls have been captured yet. The show can still play, but it will mostly say the dice were quiet. Players can use virtual sheet rolls or the optional physical roll logger.
              </section>
            )}

            <section style={splitStyle}>
              <div style={panelStyle}>
                <h3 style={sectionTitleStyle}>Awards preview</h3>
                {awards.length ? awards.slice(0, 4).map(award => <PreviewRow key={`${award.title}-${award.name}`} title={award.title} text={`${award.name} · ${award.value}`} />) : <p style={mutedStyle}>No awards yet.</p>}
              </div>
              <div style={panelStyle}>
                <h3 style={sectionTitleStyle}>Player board preview</h3>
                {actors.length ? actors.slice(0, 5).map(actor => <PreviewRow key={actor.name} title={actor.name} text={`${actor.rolls} rolls · ${actor.nat20s} Nat 20s · ${actor.nat1s} Nat 1s`} />) : <p style={mutedStyle}>No player rolls captured.</p>}
              </div>
            </section>

            <section style={optionsStyle}>
              <label style={checkRowStyle}><input type="checkbox" checked={showAllTime} onChange={event => setShowAllTime(event.target.checked)} /> Show all-time campaign stats in the presentation</label>
              <label style={checkRowStyle}><input type="checkbox" checked={saveRecapNote} onChange={event => setSaveRecapNote(event.target.checked)} /> Save a roll recap note to Session Notes</label>
              <p style={mutedStyle}>GM/table rolls are kept separate and are not the focus of the player show.</p>
            </section>
          </>
        )}

        <footer style={actionsStyle}>
          <button type="button" onClick={loadPreview} disabled={loading || sending} style={secondaryButtonStyle}><RefreshCw size={15} /> Refresh Preview</button>
          <button type="button" onClick={onClose} disabled={sending} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" onClick={sendEndSessionShow} disabled={loading || sending || !displaySummary} style={primaryButtonStyle}><Monitor size={15} /> {sending ? 'Sending…' : 'Send End Session Show'}</button>
        </footer>
      </section>
    </div>
  );
}

function Metric({ label, value, hot = false, muted = false, text = false }) {
  return <article style={metricStyle(hot, muted)}><strong style={{ fontSize: text ? 22 : 34 }}>{value}</strong><span>{label}</span></article>;
}

function PreviewRow({ title, text }) {
  return <div style={previewRowStyle}><strong>{title}</strong><span>{text}</span></div>;
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.78)', display: 'grid', placeItems: 'center', padding: 16 };
const modalStyle = { width: 'min(980px, 100%)', maxHeight: '92dvh', overflowY: 'auto', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.text, padding: 18, fontFamily: fontStack, boxShadow: 'none' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderBottom: `1px solid ${rq.line}`, paddingBottom: 14, marginBottom: 14 };
const eyebrowStyle = { margin: '0 0 4px', color: rq.red, fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 62px)', lineHeight: 0.95 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, lineHeight: 1.45 };
const closeButtonStyle = { width: 40, height: 40, display: 'grid', placeItems: 'center', background: rq.card, color: rq.text, border: 0, cursor: 'pointer' };
const loadingStyle = { minHeight: 180, display: 'grid', placeItems: 'center', color: rq.soft, background: rq.bg, border: `1px dashed ${rq.line}` };
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 };
const metricStyle = (hot, muted) => ({ minHeight: 92, display: 'grid', alignContent: 'center', gap: 5, padding: 12, background: hot ? rq.red : muted ? rq.bg : rq.card, border: `1px solid ${rq.line}`, color: rq.text, textAlign: 'center' });
const warningStyle = { background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.red}`, padding: 12, color: rq.soft, marginTop: 12, lineHeight: 1.45 };
const splitStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 };
const panelStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 12 };
const sectionTitleStyle = { margin: '0 0 10px', color: rq.text, fontSize: 16, fontWeight: 950 };
const previewRowStyle = { display: 'grid', gap: 3, background: rq.bg, borderLeft: `5px solid ${rq.red}`, padding: 9, marginTop: 7 };
const optionsStyle = { display: 'grid', gap: 8, background: rq.bg, border: `1px solid ${rq.line}`, padding: 12, marginTop: 12 };
const checkRowStyle = { display: 'flex', alignItems: 'center', gap: 9, color: rq.soft, fontWeight: 850 };
const mutedStyle = { margin: 0, color: rq.muted, lineHeight: 1.45 };
const actionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${rq.line}`, paddingTop: 14, marginTop: 14 };
const primaryButtonStyle = { minHeight: 40, border: 0, background: rq.red, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 40, border: 0, background: rq.card, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
