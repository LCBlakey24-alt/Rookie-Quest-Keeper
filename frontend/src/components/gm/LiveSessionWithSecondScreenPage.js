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
  const panelRef = useRef(null);

  useEffect(() => {
    if (!displayOpen) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDisplayOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
        ref={panelRef}
        id="live-second-screen-panel"
        className={`live-second-screen-fixed${displayOpen ? ' is-open' : ''}`}
        role={displayOpen ? 'dialog' : undefined}
        aria-modal={displayOpen ? 'true' : undefined}
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

