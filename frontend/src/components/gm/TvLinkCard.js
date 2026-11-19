import React, { useEffect, useState } from 'react';
import { Copy, RefreshCw, Tv, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import './TvLinkCard.css';

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Put the player display on any TV or computer, with no sign-in there:
 * open <site>/tv and type the code, or open the link. Reset the code to
 * cut off any screen still using the old one.
 */
export default function TvLinkCard({ campaignId }) {
  const [code, setCode] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.resolve()
      .then(() => apiClient.get(`/campaigns/${campaignId}/tv-link`))
      .then((response) => { if (!cancelled) setCode(response?.data?.code || null); })
      .catch(() => { if (!cancelled) setCode(null); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const link = code ? `${origin()}/tv/${code}` : '';
  const tableLink = code ? `${link}?target=virtual-table` : '';

  const makeCode = async (confirmFirst) => {
    if (confirmFirst && !window.confirm('Make a new TV code? Any screen using the old code will go blank.')) return;
    setBusy(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/tv-link`);
      setCode(response.data?.code || null);
      toast.success(confirmFirst ? 'New TV code made' : 'TV link ready');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not make a TV code');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!window.confirm('Turn off the TV link? Any screen using it will go blank.')) return;
    setBusy(true);
    try {
      await apiClient.delete(`/campaigns/${campaignId}/tv-link`);
      setCode(null);
      toast.success('TV link turned off');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not turn off the TV link');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url = link, label = 'TV link') => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`${label} copied`);
    } catch {
      toast.info(url);
    }
  };

  return (
    <section className="rq-tv-link" aria-labelledby="rq-tv-link-title" data-testid="tv-link-card">
      <div className="rq-tv-link__text">
        <h3 id="rq-tv-link-title"><Tv size={16} aria-hidden="true" /> TV link</h3>
        {code ? (
          <p>On the computer plugged into the TV, open <strong>{origin()}/tv</strong> and enter the code, or open a copied link. No sign-in needed; it only shows the player display. Pick the standing TV or flat table layout there.</p>
        ) : (
          <p>Show the player display on a smart TV or someone else&apos;s computer without signing in there.</p>
        )}
      </div>
      {!loaded ? null : code ? (
        <div className="rq-tv-link__code-row">
          <strong className="rq-tv-link__code" aria-label={`TV code ${code.split('').join(' ')}`} data-testid="tv-link-code">{code}</strong>
          <button type="button" onClick={() => copy(link, 'Standing TV link')}><Copy size={14} aria-hidden="true" /> Standing TV link</button>
          <button type="button" onClick={() => copy(tableLink, 'Table link')}><Copy size={14} aria-hidden="true" /> Table link</button>
          <button type="button" onClick={() => makeCode(true)} disabled={busy}><RefreshCw size={14} aria-hidden="true" /> New code</button>
          <button type="button" onClick={turnOff} disabled={busy}><X size={14} aria-hidden="true" /> Turn off</button>
        </div>
      ) : (
        <button type="button" className="rq-tv-link__make" onClick={() => makeCode(false)} disabled={busy} data-testid="tv-link-make">
          <Tv size={14} aria-hidden="true" /> Make TV link
        </button>
      )}
    </section>
  );
}
