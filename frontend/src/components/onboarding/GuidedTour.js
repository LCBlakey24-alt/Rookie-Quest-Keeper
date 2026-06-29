import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.76)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
};

function storageKey(tourId) {
  return `rqk.tutorial.complete.${tourId}`;
}

function isComplete(tourId) {
  try { return localStorage.getItem(storageKey(tourId)) === 'true'; } catch { return false; }
}

function markComplete(tourId) {
  try { localStorage.setItem(storageKey(tourId), 'true'); } catch { /* ignore */ }
}

function findTarget(selector) {
  if (!selector || typeof document === 'undefined') return null;
  try { return document.querySelector(selector); } catch { return null; }
}

function rectForElement(target) {
  if (!target || typeof window === 'undefined') return null;
  const raw = target.getBoundingClientRect();
  if (!raw.width || !raw.height) return null;
  const padding = 8;
  const left = Math.max(8, raw.left - padding);
  const top = Math.max(8, raw.top - padding);
  const right = Math.min(window.innerWidth - 8, raw.right + padding);
  const bottom = Math.min(window.innerHeight - 8, raw.bottom + padding);
  if (right <= left || bottom <= top) return null;
  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
    raw,
  };
}

function getCardPosition(rect, placement = 'auto') {
  const width = Math.min(420, window.innerWidth - 28);
  const margin = 14;
  if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width };

  const enoughBelow = rect.top + rect.height + margin + 220 < window.innerHeight;
  const enoughAbove = rect.top - margin - 220 > 0;
  const finalPlacement = placement === 'auto' ? (enoughBelow ? 'bottom' : enoughAbove ? 'top' : 'center') : placement;
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(14, Math.min(window.innerWidth - width - 14, left));

  if (finalPlacement === 'top') return { left, top: Math.max(14, rect.top - 236), width };
  if (finalPlacement === 'bottom') return { left, top: Math.min(window.innerHeight - 236, rect.top + rect.height + margin), width };
  if (finalPlacement === 'left') return { left: Math.max(14, rect.left - width - margin), top: Math.max(14, Math.min(window.innerHeight - 236, rect.top)), width };
  if (finalPlacement === 'right') return { left: Math.min(window.innerWidth - width - 14, rect.left + rect.width + margin), top: Math.max(14, Math.min(window.innerHeight - 236, rect.top)), width };
  return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width };
}

function FocusMask({ rect, onClose }) {
  if (!rect) return <div style={fullScrimStyle} onClick={onClose} />;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panels = [
    { top: 0, left: 0, width: viewportWidth, height: rect.top },
    { top: rect.top + rect.height, left: 0, width: viewportWidth, height: Math.max(0, viewportHeight - rect.top - rect.height) },
    { top: rect.top, left: 0, width: rect.left, height: rect.height },
    { top: rect.top, left: rect.left + rect.width, width: Math.max(0, viewportWidth - rect.left - rect.width), height: rect.height },
  ];
  return <>{panels.map((panel, index) => <div key={index} style={{ ...maskPanelStyle, ...panel }} onClick={onClose} />)}</>;
}

export default function GuidedTour({ tourId, steps = [], autoStart = true, buttonLabel = 'Tutorial', buttonStyle = null }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const targetRef = useRef(null);
  const validSteps = useMemo(() => steps.filter(step => step?.title || step?.body), [steps]);
  const current = validSteps[index] || null;

  useEffect(() => {
    if (!autoStart || !tourId || validSteps.length === 0) return;
    if (!isComplete(tourId)) {
      const timer = window.setTimeout(() => { setIndex(0); setOpen(true); }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [autoStart, tourId, validSteps.length]);

  useEffect(() => {
    if (!open) return undefined;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !current) return undefined;
    const target = findTarget(current.target);
    targetRef.current = target;
    target?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });

    const update = () => setRect(rectForElement(targetRef.current));
    const timer = window.setTimeout(update, 260);
    update();
    window.addEventListener('resize', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      targetRef.current = null;
    };
  }, [open, current]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!tourId || validSteps.length === 0) return null;

  const start = () => { setIndex(0); setOpen(true); };
  const close = (complete = false) => {
    if (complete) markComplete(tourId);
    setOpen(false);
  };
  const next = () => {
    if (index >= validSteps.length - 1) close(true);
    else setIndex(prev => prev + 1);
  };
  const back = () => setIndex(prev => Math.max(0, prev - 1));
  const cardPosition = getCardPosition(rect, current?.placement);

  return (
    <>
      <button type="button" onClick={start} style={buttonStyle || replayButtonStyle} data-testid="tutorial-replay-button"><HelpCircle size={15} /> {buttonLabel}</button>
      {open && current && (
        <div style={overlayStyle} role="presentation">
          <FocusMask rect={rect} onClose={() => close(false)} />
          {rect && <div style={{ ...highlightStyle, top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
          <section style={{ ...cardStyle, ...cardPosition }} role="dialog" aria-modal="true" aria-label="Page tutorial">
            <button type="button" onClick={() => close(false)} style={closeButtonStyle} aria-label="Close tutorial"><X size={18} /></button>
            <p style={eyebrowStyle}>Step {index + 1} of {validSteps.length}</p>
            <h2 style={titleStyle}>{current.title}</h2>
            <p style={bodyStyle}>{current.body}</p>
            {current.tip && <p style={tipStyle}>{current.tip}</p>}
            <div style={dotsStyle}>{validSteps.map((_, dotIndex) => <span key={dotIndex} style={dotStyle(dotIndex === index)} />)}</div>
            <footer style={actionsStyle}>
              <button type="button" onClick={() => close(true)} style={ghostButtonStyle}>Skip tour</button>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={back} disabled={index === 0} style={secondaryButtonStyle}>Back</button>
              <button type="button" onClick={next} style={primaryButtonStyle}>{index >= validSteps.length - 1 ? 'Done' : 'Next'}</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

const replayButtonStyle = { minHeight: 36, border: 0, background: rq.card, color: rq.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'auto', fontFamily: fontStack };
const fullScrimStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1 };
const maskPanelStyle = { position: 'fixed', background: 'rgba(0,0,0,0.78)', zIndex: 1, pointerEvents: 'auto' };
const highlightStyle = { position: 'fixed', border: `3px solid ${rq.red}`, outline: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 0 32px rgba(208,0,0,0.42)', pointerEvents: 'none', transition: 'all 180ms ease', background: 'transparent', zIndex: 2 };
const cardStyle = { position: 'fixed', background: rq.panel, color: rq.text, border: `1px solid ${rq.line}`, borderLeft: `7px solid ${rq.red}`, padding: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.55)', transition: 'top 180ms ease, left 180ms ease', maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', zIndex: 3 };
const closeButtonStyle = { position: 'absolute', top: 8, right: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', background: rq.card, color: rq.text, border: 0, cursor: 'pointer' };
const eyebrowStyle = { margin: '0 0 6px', color: rq.red, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.12em' };
const titleStyle = { margin: '0 34px 8px 0', color: rq.text, fontFamily: titleFont, fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 0.95 };
const bodyStyle = { margin: 0, color: rq.soft, lineHeight: 1.5, fontSize: 14 };
const tipStyle = { margin: '10px 0 0', color: rq.text, background: rq.bg, borderLeft: `5px solid ${rq.red}`, padding: '8px 10px', lineHeight: 1.45, fontSize: 13, fontWeight: 850 };
const dotsStyle = { display: 'flex', gap: 6, marginTop: 14 };
const dotStyle = (active) => ({ width: active ? 28 : 9, height: 9, background: active ? rq.red : rq.card, border: `1px solid ${rq.line}`, transition: 'all 180ms ease' });
const actionsStyle = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 38, border: 0, background: rq.red, color: rq.text, padding: '0 12px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 38, border: 0, background: rq.card, color: rq.text, padding: '0 12px', fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const ghostButtonStyle = { minHeight: 38, border: 0, background: 'transparent', color: rq.muted, padding: '0 8px', fontWeight: 850, cursor: 'pointer', fontFamily: fontStack };
