import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';

/* This uses the same published site updates already managed by Admin.
   Private drafts and archived updates are filtered by the backend. */
export default function SiteUpdatesPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/site-updates', { params: { limit: 6 } });
      if (!Array.isArray(response.data)) throw new Error('Invalid updates response');
      setItems(response.data);
      setError('');
    } catch {
      setError('Latest announcements are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <section className="dashboard-simple-section" aria-labelledby="dashboard-news-title">
      <div className="dashboard-simple-heading">
        <h2 id="dashboard-news-title">News &amp; Updates</h2>
        <button type="button" onClick={refresh} disabled={loading}
          aria-label="Refresh news and updates" className="unified-dashboard-button">
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </div>
      {error && <p role="status">{error}</p>}
      {loading && items.length === 0 && <p role="status">Loading announcements…</p>}
      {!loading && items.length === 0 && !error && (
        <div className="dashboard-empty-compact"><p>No announcements yet. Keeper news and site updates will appear here.</p></div>
      )}
      <div className="dashboard-news-list">
        {items.map((item) => (
          <article key={item.id} className="dashboard-news-card">
            <div className="dashboard-news-label">{item.label || 'Update'}{item.is_pinned ? ' · Pinned' : ''}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
