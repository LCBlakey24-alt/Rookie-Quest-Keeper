import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Command, Search, X } from 'lucide-react';
import { findCampaignTools } from './campaignToolSearch';
import './CampaignToolFinder.css';

/**
 * One campaign-scoped doorway to every GM workspace.
 * This never loads or modifies campaign records and reuses the existing tabs.
 */
export default function CampaignToolFinder({ campaignName, activeTab, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const matches = useMemo(() => findCampaignTools(query), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    triggerRef.current?.focus();
  }, []);

  const select = tab => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    onSelect(tab.id);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    const onShortcut = event => {
      if (event.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) close();
        else setOpen(true);
        return;
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const trapFocus = event => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll('input:not([disabled]), button:not([disabled])')];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', trapFocus);
    return () => window.removeEventListener('keydown', trapFocus);
  }, [open]);

  const onSearchKey = event => {
    if (!matches.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(previous => (previous + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(previous => (previous - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(matches[activeIndex] || matches[0]);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="campaign-button rqk-tool-finder-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Find a campaign tool"
        title="Find a GM tool (Ctrl+K)"
        data-testid="campaign-tool-finder-trigger"
      >
        <Search size={17} aria-hidden="true" />
        <span>Find a tool</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>

      {open && createPortal(
        <div className="rqk-tool-finder-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) close();
        }}>
          <section
            ref={dialogRef}
            className="rqk-tool-finder-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rqk-tool-finder-heading"
            aria-describedby="rqk-tool-finder-description"
            data-testid="campaign-tool-finder-dialog"
          >
            <header className="rqk-tool-finder-header">
              <div className="rqk-tool-finder-intro">
                <span className="rqk-tool-finder-eyebrow"><Command size={14} aria-hidden="true" /> GM QUICK ACCESS</span>
                <h2 id="rqk-tool-finder-heading">Find a workspace</h2>
                <p id="rqk-tool-finder-description">{campaignName || 'This campaign'} · Search tools, NPC relationships, calendar and more</p>
              </div>
              <button type="button" className="rqk-tool-finder-close" onClick={close} aria-label="Close tool finder"><X size={20}/></button>
            </header>

            <label className="rqk-tool-finder-search">
              <Search size={19} aria-hidden="true"/>
              <span className="sr-only">Search campaign tools</span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={onSearchKey}
                placeholder="NPCs, calendar, combat, maps, relationships…"
                aria-label="Search campaign tools"
                autoComplete="off"
              />
            </label>

            <div className="rqk-tool-finder-section-title">
              <span>{query.trim() ? 'Matching workspaces' : 'Frequently used'}</span>
              <span>{matches.length} {matches.length === 1 ? 'tool' : 'tools'}</span>
            </div>
            <div className="rqk-tool-finder-results">
              {matches.length ? matches.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    className={`rqk-tool-finder-result${index === activeIndex ? ' is-highlighted' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(tab)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    data-testid={`finder-tool-${tab.id}`}
                  >
                    <span className="rqk-tool-finder-result-icon"><Icon size={19} aria-hidden="true"/></span>
                    <span className="rqk-tool-finder-result-copy">
                      <strong>{tab.label}</strong>
                      <small>{tab.groupLabel}{activeTab === tab.id ? ' · Currently open' : ''}</small>
                    </span>
                    <ArrowRight size={16} aria-hidden="true"/>
                  </button>
                );
              }) : <p className="rqk-tool-finder-empty">No matching tool. Try “NPC”, “calendar”, “combat” or “maps”.</p>}
            </div>
            <footer className="rqk-tool-finder-footer">
              <span><kbd>↑</kbd> <kbd>↓</kbd> Choose</span>
              <span><kbd>Enter</kbd> Open</span>
              <span><kbd>Esc</kbd> Close</span>
            </footer>
          </section>
        </div>
      , document.body)}
    </>
  );
}
