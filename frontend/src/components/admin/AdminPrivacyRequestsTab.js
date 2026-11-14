import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import './AdminPrivacyRequestsTab.css';

const choices = ['received', 'in_review', 'needs_information', 'responded', 'closed'];
const labels = {
  received: 'Received', in_review: 'In review',
  needs_information: 'Need information', responded: 'Responded', closed: 'Closed',
};

export default function AdminPrivacyRequestsTab() {
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    setPending(true);
    setLoadError('');
    try {
      const response = await apiClient.get('/admin/privacy/requests');
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setItems([]);
      setLoadError(err?.response?.data?.detail || 'Unable to read the protected privacy request queue.');
    } finally {
      setPending(false);
    }
  };
  useEffect(() => { load(); }, []);

  const count = useMemo(
    () => items.filter(item => !['responded', 'closed'].includes(item.status)).length,
    [items],
  );

  const change = (id, patch) => setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));

  const save = async (item) => {
    setSavingId(item.id);
    try {
      const response = await apiClient.patch(`/admin/privacy/requests/${encodeURIComponent(item.id)}`, {
        status: item.status,
        admin_notes: item.admin_notes || '',
        public_note: item.public_note || '',
      });
      change(item.id, response.data);
      toast.success('Request status saved.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not update this request.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <section className="rqk-admin-rights" aria-label="Privacy request administration" data-testid="admin-privacy-requests-tab">
      <div className="rqk-admin-rights__heading">
        <div>
          <h2><ShieldCheck size={20} aria-hidden="true" /> Private data-rights queue</h2>
          <p>{count} request(s) awaiting a response or further handling. This queue records requests; it does not verify identity, send emails, export personal data or execute deletions automatically.</p>
        </div>
        <button type="button" onClick={load} disabled={pending}>
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </div>
      {pending ? <p role="status">Loading protected requests…</p> : loadError ? (
        <p role="alert">{loadError}</p>
      ) : items.length === 0 ? (
        <p>No privacy requests have been received yet.</p>
      ) : (
        <div className="rqk-admin-rights__list">
          {items.map(item => (
            <article key={item.id} className="rqk-admin-rights__item">
              <div className="rqk-admin-rights__item-heading">
                <strong>{item.request_type} — {item.username}</strong>
                <small>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</small>
              </div>
              {item.details ? <p>{item.details}</p> : <p>No additional details supplied.</p>}
              <div className="rqk-admin-rights__fields">
                <label>
                  Status
                  <select
                    value={item.status || 'received'}
                    onChange={event => change(item.id, { status: event.target.value })}
                    disabled={savingId === item.id}
                  >
                    {choices.map(value => <option key={value} value={value}>{labels[value]}</option>)}
                  </select>
                </label>
                <label>
                  Internal operator notes (never shown to the requester)
                  <textarea
                    value={item.admin_notes || ''}
                    maxLength={1200}
                    rows={2}
                    onChange={event => change(item.id, { admin_notes: event.target.value })}
                    disabled={savingId === item.id}
                    placeholder="Record next steps and verification requirements. Do not paste ID documents or raw user data."
                  />
                </label>
                <label>
                  Message visible to this requester
                  <textarea
                    value={item.public_note || ''}
                    maxLength={500}
                    rows={2}
                    onChange={event => change(item.id, { public_note: event.target.value })}
                    disabled={savingId === item.id}
                    placeholder="A status update only; use a verified channel for sensitive information."
                  />
                </label>
              </div>
              <button type="button" onClick={() => save(item)} disabled={savingId === item.id}>
                <ClipboardCheck size={15} aria-hidden="true" />
                {savingId === item.id ? 'Saving…' : 'Save review status'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
