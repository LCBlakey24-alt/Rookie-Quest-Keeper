import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import './PrivacyRightsPanel.css';

const rights = [
  ['access', 'Access my information'],
  ['correction', 'Correct inaccurate information'],
  ['deletion', 'Request deletion'],
  ['portability', 'Receive a portable copy'],
  ['restriction', 'Restrict use of my information'],
  ['objection', 'Object to a particular use'],
  ['other', 'Another privacy question'],
];
const statusLabels = {
  received: 'Received',
  in_review: 'Under review',
  needs_information: 'More information needed',
  responded: 'Response recorded',
  closed: 'Closed',
};

export default function PrivacyRightsPanel({ username }) {
  const [kind, setKind] = useState('access');
  const [details, setDetails] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/privacy/requests');
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setItems([]);
      setError(err?.response?.data?.detail || 'Could not load your private requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [username]);

  const send = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await apiClient.post('/privacy/requests', {
        request_type: kind,
        details: details.trim(),
      });
      // Acknowledgement only; no request is processed or erased at submission.
      if (response?.data?.request?.status !== 'received') {
        throw new Error('Could not confirm your privacy request was recorded.');
      }
      setItems(prev => [response.data.request, ...prev]);
      setDetails('');
      toast.success('Your privacy request was received for review.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rqk-rights-panel" aria-label="Privacy rights requests" data-testid="privacy-rights-panel">
      <div className="rqk-rights-panel__heading">
        <div>
          <h2><ClipboardList size={20} aria-hidden="true" /> Privacy rights requests</h2>
          <p>Ask for access, correction, deletion or other privacy action. Requests are reviewed individually; submitting one does not automatically change or delete your account.</p>
        </div>
        <button type="button" onClick={fetchRequests} disabled={loading} className="rqk-rights-panel__secondary">
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>
      <form onSubmit={send} className="rqk-rights-panel__form">
        <label htmlFor="rqk-right-kind">What would you like us to review?</label>
        <select id="rqk-right-kind" value={kind} onChange={event => setKind(event.target.value)} disabled={submitting}>
          {rights.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <label htmlFor="rqk-right-details">Further details (optional)</label>
        <textarea
          id="rqk-right-details"
          rows={3}
          maxLength={1000}
          value={details}
          onChange={event => setDetails(event.target.value)}
          placeholder="Briefly describe what you need. Do not include passwords, identification documents or private details about other people."
          disabled={submitting}
        />
        <p className="rqk-rights-panel__hint">This feature records requests for review. We may need to verify your identity or contact you separately before disclosing or changing information. You can also contact the service operator through other available channels.</p>
        <button type="submit" disabled={submitting} className="rqk-rights-panel__primary" data-testid="privacy-rights-submit">
          <Send size={15} aria-hidden="true" />
          {submitting ? 'Sending request…' : 'Submit privacy request'}
        </button>
      </form>
      <div className="rqk-rights-panel__history">
        <h3>Your requests</h3>
        {loading ? <p role="status">Loading your request history…</p> : error ? (
          <p role="alert">{error}</p>
        ) : items.length === 0 ? (
          <p>No privacy requests have been submitted from this account.</p>
        ) : (
          <div className="rqk-rights-panel__history-list">
            {items.map(item => (
              <article key={item.id} className="rqk-rights-panel__request">
                <div className="rqk-rights-panel__request-header">
                  <strong>{rights.find(([value]) => value === item.request_type)?.[1] || 'Privacy request'}</strong>
                  <span>{statusLabels[item.status] || 'Received'}</span>
                </div>
                <small>Submitted {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'recently'}</small>
                {item.details ? <p>{item.details}</p> : null}
                {item.public_note ? <p className="rqk-rights-panel__reply">Operator update: {item.public_note}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
