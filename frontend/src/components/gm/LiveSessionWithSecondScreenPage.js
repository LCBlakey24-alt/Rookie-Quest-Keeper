import React, { useEffect, useRef, useState } from 'react';
import { Monitor, X } from 'lucide-react';
import LiveSessionGridPage from '@/components/gm/LiveSessionGridPage';
import LiveSecondScreenDock from '@/components/gm/LiveSecondScreenDock';
import { useParams } from 'react-router-dom';

export default function LiveSessionWithSecondScreenPage() {
  const { campaignId } = useParams();
  const [displayOpen, setDisplayOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!displayOpen) return undefined;
    closeRef.current?.focus();
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setDisplayOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [displayOpen]);

  useEffect(() => { setDisplayOpen(false); }, [campaignId]);

  const closeDisplay = () => {
    setDisplayOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="live-session-with-second-screen">
      <LiveSessionGridPage />
      <button
        type="button"
        ref={triggerRef}
        className="live-display-drawer-trigger"
        onClick={() => setDisplayOpen(open => !open)}
        aria-expanded={displayOpen}
        aria-controls="live-second-screen-panel"
      >
        <Monitor size={18} aria-hidden="true" />
        {displayOpen ? 'Hide display' : 'Display controls'}
      </button>
      {displayOpen && (
        <button
          type="button"
          className="live-display-drawer-backdrop"
          aria-label="Close display controls"
          onClick={closeDisplay}
          tabIndex={-1}
        />
      )}
      <aside
        id="live-second-screen-panel"
        className={`live-second-screen-fixed${displayOpen ? ' is-open' : ''}`}
        aria-label="Live display controls"
      >
        <div className="live-display-drawer-header">
          <strong>Player display</strong>
          <button
            type="button"
            ref={closeRef}
            className="live-display-drawer-close"
            onClick={closeDisplay}
            aria-label="Close display controls"
          >
            <X size={17} aria-hidden="true" /> Close
          </button>
        </div>
        <LiveSecondScreenDock campaignId={campaignId} />
      </aside>
      <style>{dockCss}</style>
    </div>
  );
}

const dockCss = `
  .live-session-with-second-screen > main {
    padding-right: 350px !important;
  }
  .live-second-screen-fixed {
    position: fixed;
    top: 88px;
    right: 8px;
    bottom: 10px;
    width: 334px;
    z-index: 55;
    overflow: hidden;
  }
  .live-second-screen-fixed [data-testid="live-second-screen-dock"] {
    width: auto !important;
    height: 100% !important;
    max-height: 100% !important;
    position: static !important;
    top: auto !important;
  }
  .live-display-drawer-trigger,
  .live-display-drawer-header,
  .live-display-drawer-backdrop {
    display: none;
  }
  @media (max-width: 1180px) {
    .live-session-with-second-screen > main {
      padding-right: clamp(8px, 1.1vw, 12px) !important;
    }
    .live-display-drawer-trigger {
      position: fixed;
      right: 16px;
      bottom: calc(78px + env(safe-area-inset-bottom, 0px));
      z-index: 58;
      display: inline-flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 16px;
      color: var(--rq-guild-copy, #F8F0E5);
      background: var(--rq-guild-wine, #7E2D2D);
      border: 1px solid var(--rq-guild-wine, #7E2D2D);
      border-radius: 7px;
      font-weight: 800;
      cursor: pointer;
    }
    .live-display-drawer-trigger:focus-visible,
    .live-display-drawer-close:focus-visible {
      outline: 3px solid var(--rq-info, #6E91B4);
      outline-offset: 3px;
    }
    .live-display-drawer-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      border: 0;
      background: rgba(7, 19, 31, 0.60);
      z-index: 58;
    }
    .live-second-screen-fixed {
      display: none;
      position: fixed;
      top: max(8px, env(safe-area-inset-top, 0px));
      bottom: max(8px, env(safe-area-inset-bottom, 0px));
      right: 8px;
      width: min(380px, calc(100vw - 16px));
      padding: 8px;
      background: var(--rq-bg-panel, #1E2936);
      border: 1px solid var(--rq-line-strong, rgba(201,169,107,0.30));
      border-radius: 7px;
      z-index: 59;
      overflow: auto;
      box-shadow: 0 12px 48px rgba(0,0,0,0.35);
    }
    .live-second-screen-fixed.is-open { display: flex; flex-direction: column; }
    .live-display-drawer-header {
      display: flex;
      flex: 0 0 auto;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      padding: 4px 4px 10px;
      color: var(--rq-text-primary, #EADFC8);
    }
    .live-display-drawer-close {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      background: var(--rq-card, #263748);
      color: var(--rq-text-primary, #EADFC8);
      border: 1px solid var(--rq-line, rgba(137,157,176,0.14));
      cursor: pointer;
    }
    .live-second-screen-fixed [data-testid="live-second-screen-dock"] {
      flex: 1 1 auto;
      min-height: 0;
      max-height: none !important;
      height: auto !important;
    }
  }
`;
