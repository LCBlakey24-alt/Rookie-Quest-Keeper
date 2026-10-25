import React, { useEffect, useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './RosterSplitView.css';

/**
 * Shared table-side reference browser. Keep only one expensive stat block
 * mounted, even when a campaign has many NPCs or hundreds of beasts.
 * The parent owns selection so campaign changes and filters remain explicit.
 */
export default function RosterSplitView({
  items = [],
  selectedId = '',
  onSelect,
  getId = item => item.id,
  getName = item => item.name || 'Unnamed entry',
  getSubtitle = item => item.role || item.occupation || item.type || 'Reference',
  getBadge,
  renderDetail,
  title = 'Reference library',
  emptyMessage = 'No matching entries.',
  testId = 'roster-split-view',
}) {
  const buttonRefs = useRef([]);
  const listRef = useRef(null);
  const detailId = useId();
  const active = items.find(item => String(getId(item)) === String(selectedId)) || items[0] || null;
  const activeId = active ? String(getId(active)) : '';
  const activeIndex = active ? items.findIndex(item => String(getId(item)) === activeId) : -1;

  // Next/Previous and search changes should reveal the selected row without
  // scrolling the surrounding campaign page or stealing keyboard focus.
  useEffect(() => {
    const list = listRef.current;
    const item = buttonRefs.current[activeIndex];
    if (!list || !item) return;
    const bounds = list.getBoundingClientRect();
    const row = item.getBoundingClientRect();
    const padding = 8;
    if (row.top < bounds.top + padding) {
      list.scrollTop += row.top - bounds.top - padding;
    } else if (row.bottom > bounds.bottom - padding) {
      list.scrollTop += row.bottom - bounds.bottom + padding;
    }
    if (row.left < bounds.left + padding) {
      list.scrollLeft += row.left - bounds.left - padding;
    } else if (row.right > bounds.right - padding) {
      list.scrollLeft += row.right - bounds.right + padding;
    }
  }, [activeId, activeIndex, items.length]);

  // Keep navigation in the filtered campaign roster; never jump to an
  // NPC/beast outside the current visible list or fetch from another party.
  const navigateRelative = step => {
    const next = activeIndex + step;
    if (next < 0 || next >= items.length) return;
    onSelect(String(getId(items[next])));
  };

  const navigateList = (event, index) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const last = items.length - 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : event.key === 'ArrowDown' ? Math.min(last, index + 1) : Math.max(0, index - 1);
    const item = items[next];
    if (!item) return;
    onSelect(String(getId(item)));
    buttonRefs.current[next]?.focus();
  };

  return (
    <div className="rqk-reference-browser-host">
    <div className="rqk-reference-browser" data-testid={testId}>
      <aside className="rqk-reference-browser__sidebar" aria-label={title}>
        <div className="rqk-reference-browser__sidebar-heading">
          <strong>{title}</strong>
          <span>{items.length} shown</span>
        </div>
        {items.length ? (
          <div className="rqk-reference-browser__list" ref={listRef} role="group" aria-label={'Choose ' + title.toLowerCase()}>
            {items.map((item, index) => {
              const id = String(getId(item));
              const chosen = id === activeId;
              return (
                <button
                  type="button"
                  className={'rqk-reference-browser__item' + (chosen ? ' is-selected' : '')}
                  key={id}
                  ref={node => { buttonRefs.current[index] = node; }}
                  onClick={() => onSelect(id)}
                  onKeyDown={event => navigateList(event, index)}
                  aria-current={chosen ? 'true' : undefined}
                  aria-controls={detailId}
                  data-testid={'roster-select-' + id}
                >
                  <span className="rqk-reference-browser__item-name">{getName(item)}</span>
                  <span className="rqk-reference-browser__item-subtitle">{getSubtitle(item)}</span>
                  {getBadge && <span className="rqk-reference-browser__item-badge">{getBadge(item)}</span>}
                </button>
              );
            })}
          </div>
        ) : <p className="rqk-reference-browser__empty">{emptyMessage}</p>}
      </aside>
      <section className="rqk-reference-browser__detail" id={detailId}
        aria-label={active ? getName(active) + ' full details' : 'Reference details'}
        data-testid="roster-selected-detail">
        {active ? (
          <>
            <div className="rqk-reference-browser__detail-toolbar" aria-label={title + ' quick navigation'}>
              <div className="rqk-reference-browser__position">
                <span aria-live="polite">Reference {activeIndex + 1} of {items.length}</span>
                <strong title={getName(active)}>{getName(active)}</strong>
              </div>
              <div className="rqk-reference-browser__paging">
                <button type="button" onClick={() => navigateRelative(-1)}
                  disabled={activeIndex <= 0}
                  aria-label={'Previous ' + title}>
                  <ChevronLeft size={19} aria-hidden="true" />
                  <span>Previous</span>
                </button>
                <button type="button" onClick={() => navigateRelative(1)}
                  disabled={activeIndex >= items.length - 1}
                  aria-label={'Next ' + title}>
                  <span>Next</span>
                  <ChevronRight size={19} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div key={activeId} className="rqk-reference-browser__detail-content">
              {renderDetail(active)}
            </div>
          </>
        ) : <div className="rqk-reference-browser__detail-placeholder">{emptyMessage}</div>}
      </section>
    </div>
    </div>
  );
}
