import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import {
  PINNED_TOOLS,
  RESUME_COMBAT_ACTION,
  categoryForTool,
  filterCategories,
  liveToolLabel,
} from './liveToolRegistry';
import './LiveToolRail.css';

/**
 * The one navigation for Live Play.
 *
 * It replaces a horizontal strip of six tools plus a "More" page that held
 * the rest, and it exposes the seven tools that the render switch supported
 * but nothing pointed at.
 *
 * Same markup at every size. Desktop shows labels, tablet collapses to icons
 * that still carry their accessible names, and phone puts the whole thing in
 * a drawer. The structure does not change with the viewport, so the active
 * tool, the group headings and the keyboard order are the same everywhere.
 */
export default function LiveToolRail({
  activeTool,
  onSelect,
  expanded = [],
  onToggleCategory,
  filter = '',
  onFilterChange,
  canResumeCombat = false,
  onResumeCombat,
  variant = 'desktop',
  onRequestClose,
  labelledById,
}) {
  const categories = useMemo(() => filterCategories(filter), [filter]);
  const activeCategoryId = categoryForTool(activeTool)?.id || '';
  const containerRef = useRef(null);
  const isDrawer = variant === 'phone';

  // A drawer takes the keyboard with it, and gives it back on the way out.
  useEffect(() => {
    if (!isDrawer) return undefined;
    const previouslyFocused = document.activeElement;
    const first = containerRef.current?.querySelector('button, [href], input');
    first?.focus();

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onRequestClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(containerRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled])',
      ) || [])].filter(node => node.offsetParent !== null);
      if (focusable.length === 0) return;
      const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isDrawer, onRequestClose]);

  const choose = toolId => {
    onSelect?.(toolId);
    // A drawer that stays open after a choice hides the thing just chosen.
    if (isDrawer) onRequestClose?.();
  };

  return (
    <nav
      ref={containerRef}
      className={`rqk-tool-rail rqk-tool-rail--${variant}`}
      data-testid="live-tool-rail"
      aria-label="Live Play tools"
      aria-labelledby={labelledById}
    >
      {isDrawer && (
        <div className="rqk-tool-rail__drawer-head">
          <span>
            <strong>Live Play tools</strong>
            <small data-testid="live-tool-rail-current">{liveToolLabel(activeTool)}</small>
          </span>
          <button
            type="button"
            onClick={onRequestClose}
            className="rqk-tool-rail__close"
            data-testid="live-tool-rail-close"
            aria-label="Close tools menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="rqk-tool-rail__pinned" role="group" aria-label="Quick access">
        {canResumeCombat && (
          <button
            type="button"
            onClick={() => { onResumeCombat?.(); if (isDrawer) onRequestClose?.(); }}
            className="rqk-tool-rail__item rqk-tool-rail__item--resume"
            data-testid="live-tool-resume-combat"
          >
            <RESUME_COMBAT_ACTION.icon size={17} aria-hidden="true" />
            <span>{RESUME_COMBAT_ACTION.label}</span>
          </button>
        )}
        {PINNED_TOOLS.map(tool => {
          const Icon = tool.icon;
          const selected = tool.id === activeTool;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => choose(tool.id)}
              className={`rqk-tool-rail__item${selected ? ' is-active' : ''}`}
              data-testid={`live-tool-${tool.id}`}
              aria-current={selected ? 'page' : undefined}
              title={tool.label}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rqk-tool-rail__filter">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={filter}
          onChange={event => onFilterChange?.(event.target.value)}
          placeholder="Find a tool"
          aria-label="Find a tool"
          data-testid="live-tool-filter"
        />
      </div>

      <div className="rqk-tool-rail__groups">
        {categories.map(category => {
          // A filter result is open regardless, and so is the group holding
          // the tool on screen -- a collapsed group must never hide it.
          const open = Boolean(filter)
            || expanded.includes(category.id)
            || category.id === activeCategoryId;
          const CategoryIcon = category.icon;
          const panelId = `rqk-tool-group-${category.id}`;
          return (
            <section key={category.id} className="rqk-tool-rail__group">
              <h3 className="rqk-tool-rail__group-heading">
                <button
                  type="button"
                  onClick={() => onToggleCategory?.(category.id)}
                  className="rqk-tool-rail__group-button"
                  data-testid={`live-category-${category.id}`}
                  aria-expanded={open}
                  aria-controls={panelId}
                >
                  <CategoryIcon size={16} aria-hidden="true" />
                  <span>{category.label}</span>
                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className={open ? 'rqk-tool-rail__chevron is-open' : 'rqk-tool-rail__chevron'}
                  />
                </button>
              </h3>
              <div id={panelId} className="rqk-tool-rail__group-items" hidden={!open}>
                {category.tools.map(tool => {
                  const Icon = tool.icon;
                  const selected = tool.id === activeTool;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => choose(tool.id)}
                      className={`rqk-tool-rail__item rqk-tool-rail__item--nested${selected ? ' is-active' : ''}`}
                      data-testid={`live-tool-${tool.id}`}
                      aria-current={selected ? 'page' : undefined}
                      title={tool.label}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {categories.length === 0 && (
          <p className="rqk-tool-rail__empty" role="status">No tool matches that.</p>
        )}
      </div>
    </nav>
  );
}

/** The control that opens the drawer on a phone. */
export function LiveToolMenuButton({ onOpen, activeTool }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rqk-tool-rail__menu-button"
      data-testid="live-tool-menu"
      aria-haspopup="dialog"
    >
      <Menu size={18} aria-hidden="true" />
      <span>Tools</span>
      <strong>{liveToolLabel(activeTool)}</strong>
    </button>
  );
}
