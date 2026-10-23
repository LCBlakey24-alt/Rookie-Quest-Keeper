import React, { useEffect, useRef, useState } from 'react';
import { Monitor, X } from 'lucide-react';
import LiveSessionGridPage from '@/components/gm/LiveSessionGridPage';
import LiveSecondScreenDock from '@/components/gm/LiveSecondScreenDock';
import { useParams } from 'react-router-dom';
import './LiveSessionWithSecondScreenPage.css';

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
    </div>
  );
}

