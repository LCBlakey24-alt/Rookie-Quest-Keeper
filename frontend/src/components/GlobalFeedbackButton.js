import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const hiddenPaths = ['/', '/auth', '/login', '/reset-password'];

export default function GlobalFeedbackButton({ isAuthenticated }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const shouldShow = useMemo(() => {
    if (!isAuthenticated) return false;
    if (hiddenPaths.includes(location.pathname)) return false;
    return true;
  }, [isAuthenticated, location.pathname]);

  if (!shouldShow) return null;

  return (
    <>
      <button
        type="button"
        data-testid="global-feedback-btn"
        onClick={() => setOpen(true)}
        style={floatingButtonStyle}
        aria-label="Send site feedback"
      >
        <MessageSquare size={17} />
        <span style={{ display: 'inline-block' }}>Feedback</span>
      </button>
      {open && <FeedbackModal pagePath={location.pathname} onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ pagePath, onClose }) {
  const [form, setForm] = useState({
    category: 'improvement',
    area: inferArea(pagePath),
    priority: 'normal',
    title: '',
    message: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || form.title.trim().length < 3) {
      toast.error('Please add a short title');
      return;
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      toast.error('Please describe the issue or improvement in a bit more detail');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/feedback', {
        ...form,
        page_path: pagePath,
      });
      toast.success('Feedback sent to admin');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modalBackdropStyle} role="presentation">
      <form onSubmit={submit} style={modalStyle} data-testid="global-feedback-modal">
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Site Feedback</p>
            <h2 style={titleStyle}>Tell us what needs work</h2>
            <p style={subtitleStyle}>This goes into the admin feedback list with the page you were on.</p>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Close feedback form">
            <X size={18} />
          </button>
        </div>

        <div style={pagePathStyle}>Page: {pagePath}</div>

        <div style={feedbackGridStyle}>
          <label style={fieldLabelStyle}>Type
            <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={fieldStyle}>
              <option value="improvement">Improvement</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature request</option>
              <option value="confusing">Confusing area</option>
              <option value="design">Design/UI</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>Priority
            <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))} style={fieldStyle}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>

        <label style={fieldLabelStyle}>Area
          <input value={form.area} onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))} style={fieldStyle} placeholder="e.g. character sheet, campaign view, notes" />
        </label>
        <label style={fieldLabelStyle}>Title
          <input data-testid="global-feedback-title-input" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} style={fieldStyle} placeholder="Short summary" maxLength={120} />
        </label>
        <label style={fieldLabelStyle}>What happened or what should improve?
          <textarea data-testid="global-feedback-message-input" value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} style={{ ...fieldStyle, minHeight: 130, resize: 'vertical' }} placeholder="Describe what happened, what you expected, or what would make this better..." maxLength={2000} />
        </label>

        <div style={modalActionsStyle}>
          <Button type="button" onClick={onClose} className="btn-outline">Cancel</Button>
          <Button data-testid="global-submit-feedback-btn" type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Sending...' : 'Send Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function inferArea(pathname) {
  if (pathname.startsWith('/characters')) return 'character sheet';
  if (pathname.startsWith('/campaign')) return 'campaign tools';
  if (pathname.startsWith('/gm-screen')) return 'gm screen';
  if (pathname.startsWith('/player')) return 'player dashboard';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/homebrew')) return 'homebrew workshop';
  if (pathname.startsWith('/home')) return 'dashboard';
  return 'general';
}

const floatingButtonStyle = {
  position: 'fixed',
  right: '18px',
  bottom: '18px',
  zIndex: 1450,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  minHeight: '42px',
  padding: '0 14px',
  background: rq.accent,
  color: '#FFFFFF',
  border: `1px solid ${rq.accentHover}`,
  borderRadius: rq.radiusSm,
  boxShadow: '0 12px 30px rgba(0,0,0,0.38)',
  fontWeight: 900,
  cursor: 'pointer',
};
const modalBackdropStyle = { position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modalStyle = { width: 'min(620px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8 };
const eyebrowStyle = { color: rq.accentHover, fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' };
const titleStyle = { color: rq.text, fontSize: 22, fontWeight: 900, margin: '0 0 6px' };
const subtitleStyle = { color: rq.textSecondary, fontSize: 13, lineHeight: 1.5, margin: 0 };
const closeButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, borderRadius: rq.radiusSm, padding: 8, cursor: 'pointer' };
const pagePathStyle = { color: rq.muted, fontSize: 12, padding: '8px 10px', background: rq.input, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, margin: '12px 0' };
const feedbackGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 };
const fieldLabelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: rq.muted, fontSize: 12, fontWeight: 900, marginTop: 12 };
const fieldStyle = { width: '100%', background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: rq.radiusSm, padding: '10px 12px', outline: 'none' };
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 18 };
