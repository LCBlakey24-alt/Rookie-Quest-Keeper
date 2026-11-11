
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Megaphone, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';

// The existing public endpoint returns published, non-archived updates only.
// A separate service alert can be marked via the existing Admin "label" field
// (Urgent / Service Alert / Maintenance), or the future is_urgent field.
export function isUrgentKeeperUpdate(item) {
  return item?.is_urgent === true || /^(urgent|service alert|maintenance|critical notice)$/i.test(String(item?.label || '').trim());
}

export function useKeeperUpdates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/site-updates', { params: { limit: 12 } });
      if (!Array.isArray(response.data)) throw new Error('Unexpected site updates response');
      setItems(response.data.filter((item) => item && typeof item === 'object'));
      setError('');
    } catch {
      setError('Keeper announcements are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, error, refresh };
}

export function UrgentKeeperNotices({ items }) {
  const urgent = items.filter(isUrgentKeeperUpdate);
  if (!urgent.length) return null;
  return (
    <section className="rqk-home-alerts" aria-label="Important service notices">
      {urgent.map((item, i) => (
        <article className="rqk-home-alert" key={item.id || i} role="status">
          <AlertTriangle size={22} aria-hidden="true" />
          <div>
            <strong>{item.title || 'Important service notice'}</strong>
            <p>{item.text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function KeeperAnnouncementCarousel({ items, loading, error, onRefresh }) {
  const slides = items.filter((item) => !isUrgentKeeperUpdate(item));
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef(null);
  const safeIndex = slides.length ? Math.min(index, slides.length - 1) : 0;
  const active = slides[safeIndex];
  const goTo = (next) => {
    if (!slides.length) return;
    setIndex((next + slides.length) % slides.length);
    setExpanded(false);
  };
  const finishSwipe = (event) => {
    if (touchStart.current === null) return;
    const delta = event.changedTouches[0]?.clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta || 0) > 48) goTo(safeIndex + (delta < 0 ? 1 : -1));
  };

  return (
    <section className="rqk-home-news" aria-labelledby="rqk-home-news-heading">
      <header className="rqk-home-section-heading">
        <h2 id="rqk-home-news-heading"><Megaphone size={19} aria-hidden="true" /> Announcements</h2>
        <button type="button" className="rqk-home-refresh" onClick={onRefresh} disabled={loading} aria-label="Refresh announcements">
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </header>
      {error && <p className="rqk-home-status" role="status">{error}</p>}
      {loading && !slides.length && <div className="rqk-home-empty" role="status">Loading announcements…</div>}
      {!loading && !slides.length && !error && <div className="rqk-home-empty">No announcements yet. Published Keeper news will appear here.</div>}
      {active && (
        <>
          <div
            className="rqk-home-announcement"
            tabIndex={0}
            role="region"
            aria-label="Announcement carousel. Use left and right arrow keys to browse."
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') { event.preventDefault(); goTo(safeIndex + 1); }
              if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(safeIndex - 1); }
            }}
            onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={finishSwipe}
            onTouchCancel={() => { touchStart.current = null; }}
          >
            <div className="rqk-home-announcement-top">
              <span>{active.label || 'Keeper news'}{active.is_pinned ? ' · Pinned' : ''}</span>
              <span className="rqk-home-announcement-count">{safeIndex + 1} / {slides.length}</span>
            </div>
            <h3>{active.title}</h3>
            <p className={expanded ? 'is-expanded' : ''}>{active.text}</p>
            <button type="button" className="rqk-home-readmore" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
              {expanded ? 'Show less' : 'Read full announcement'} <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          {slides.length > 1 && (
            <div className="rqk-home-carousel-controls">
              <div className="rqk-home-carousel-arrows">
                <button type="button" onClick={() => goTo(safeIndex - 1)} aria-label="Previous announcement"><ChevronLeft size={17} /> Previous</button>
                <button type="button" onClick={() => goTo(safeIndex + 1)} aria-label="Next announcement">Next <ChevronRight size={17} /></button>
              </div>
              <div className="rqk-home-carousel-dots" aria-label="Choose announcement">
                {slides.map((item, i) => (
                  <button key={item.id || i} type="button" className={safeIndex === i ? 'is-active' : ''}
                    aria-label={`Show announcement ${i + 1}`} aria-current={safeIndex === i ? 'true' : undefined}
                    onClick={() => goTo(i)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function LatestKeeperUpdates({ items, loading, error }) {
  // Don't duplicate urgent alerts in the regular chronological feed.
  const recent = items.filter((item) => !isUrgentKeeperUpdate(item) && !item.is_pinned).slice(0, 3);
  return (
    <section className="rqk-home-feed-panel" aria-labelledby="rqk-home-updates-heading">
      <h2 id="rqk-home-updates-heading">Latest Keeper updates</h2>
      <div className="rqk-home-feed-box">
        {recent.map((item, i) => (
          <article className="rqk-home-update-row" key={item.id || i}>
            <span>{item.label || 'Update'}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
        {!recent.length && <p className="rqk-home-feed-empty">{loading ? 'Loading updates…' : error ? 'Updates are temporarily unavailable.' : 'No recent platform updates yet.'}</p>}
      </div>
    </section>
  );
}
