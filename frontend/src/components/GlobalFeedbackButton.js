import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import '@/styles/globalFeedbackPlayer.css';

const rq = {
  panel: '#071522',
  input: '#081B2A',
  border: 'rgba(255,45,170,0.18)',
  borderDefault: 'rgba(255,45,170,0.18)',
  accent: '#FF2DAA',
  accentHover: '#FF2DAA',
  accentSoft: 'rgba(124,203,255,0.10)',
  text: '#FFFFFF',
  textSecondary: '#FFFFFF',
  muted: '#FFFFFF',
};

const hiddenPaths = ['/', '/auth', '/login', '/reset-password'];
const shellExactPaths = new Set(['/home', '/characters', '/player', '/campaigns', '/admin', '/account', '/homebrew', '/uploads']);

function launcherManagedByAppShell(pathname = '') {
  if (shellExactPaths.has(pathname)) return true;
  if (/^\/campaign\/[^/]+$/.test(pathname)) return true;
  if (pathname === '/characters/new' || pathname === '/characters/import') return true;
  if (/^\/characters\/[^/]+\/edit$/.test(pathname)) return true;
  return false;
}

export default function GlobalFeedbackButton({ isAuthenticated, hideLauncher = false }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const shouldShow = useMemo(() => {
    if (!isAuthenticated) return false;
    if (hiddenPaths.includes(location.pathname)) return false;
    return true;
  }, [isAuthenticated, location.pathname]);

  const launcherHidden = hideLauncher || launcherManagedByAppShell(location.pathname);

  useEffect(() => {
    const openFeedback = () => setOpen(true);
    window.addEventListener('rook-feedback-open', openFeedback);
    return () => window.removeEventListener('rook-feedback-open', openFeedback);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      {!launcherHidden && (
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
      )}
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
          <textarea data-testid="global-feedback-message-input" value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} style={{ ...fieldStyle, minHeight: 112, resize: 'vertical' }} placeholder="Describe what happened, what you expected, or what would make this better..." maxLength={2000} />
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
  gap: '7px',
  minHeight: '40px',
  padding: '0 11px',
  background: '#102B40',
  color: rq.text,
  border: `1px solid ${rq.accent}`,
  borderRadius: 5,
  boxShadow: 'none',
  fontWeight: 850,
  cursor: 'pointer',
};
const modalBackdropStyle = { position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 };
const modalStyle = { width: 'min(600px, 100%)', maxHeight: '92dvh', overflowY: 'auto', background: rq.panel, border: `1px solid ${rq.borderDefault}`, borderRadius: 7, padding: 14, boxShadow: 'none' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 7 };
const eyebrowStyle = { color: rq.text, fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 3px' };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, margin: '0 0 5px', lineHeight: 1.08, fontFamily: 'inherit' };
const subtitleStyle = { color: rq.textSecondary, fontSize: 12, lineHeight: 1.4, margin: 0 };
const closeButtonStyle = { width: 36, height: 36, display: 'grid', placeItems: 'center', background: '#102B40', border: `1px solid ${rq.borderDefault}`, color: '#7CCBFF', borderRadius: 5, padding: 0, cursor: 'pointer' };
const pagePathStyle = { color: rq.text, fontSize: 11, padding: '7px 8px', background: '#102B40', border: `1px solid ${rq.borderDefault}`, borderRadius: 5, margin: '10px 0' };
const feedbackGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 10 };
const fieldLabelStyle = { display: 'flex', flexDirection: 'column', gap: 4, color: rq.text, fontSize: 11, fontWeight: 850, marginTop: 8 };
const fieldStyle = { width: '100%', boxSizing: 'border-box', minHeight: 40, background: rq.input, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: 5, padding: '8px 9px', outline: 'none', boxShadow: 'none', font: 'inherit' };
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 7, flexWrap: 'wrap', marginTop: 12 };
