import React from 'react';
import { toast } from 'sonner';
import { AlertTriangle, LogOut } from 'lucide-react';

/**
 * ImpersonationBanner
 *
 * Renders a fixed top banner when an admin is impersonating another user.
 * Reads the stashed admin token from sessionStorage; clicking "Stop" restores it
 * and reloads the app back to /admin.
 */
export default function ImpersonationBanner() {
  const stashedToken = typeof window !== 'undefined'
    ? sessionStorage.getItem('rq_admin_token_stash')
    : null;
  const stashedUsername = typeof window !== 'undefined'
    ? sessionStorage.getItem('rq_admin_username_stash')
    : null;
  const current = typeof window !== 'undefined'
    ? localStorage.getItem('dm_username')
    : null;

  if (!stashedToken) return null;

  const restore = () => {
    try {
      localStorage.setItem('dm_token', stashedToken);
      if (stashedUsername) localStorage.setItem('dm_username', stashedUsername);
      sessionStorage.removeItem('rq_admin_token_stash');
      sessionStorage.removeItem('rq_admin_username_stash');
      toast.success('Admin session restored');
      window.location.assign('/admin');
    } catch {
      toast.error('Failed to restore admin session');
    }
  };

  return (
    <div
      data-testid="impersonation-banner"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: 'linear-gradient(90deg, rgba(212,160,23,0.25), rgba(212,160,23,0.15))',
        borderBottom: '2px solid #D4A017',
        color: '#F8FAFC',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
        backdropFilter: 'blur(6px)'
      }}>
      <AlertTriangle size={16} color="#D4A017" />
      <span>
        IMPERSONATING <span style={{ color: '#D4A017' }}>{current || 'user'}</span>
        {stashedUsername && <> (as <span style={{ color: '#D4A017' }}>{stashedUsername}</span>)</>}
      </span>
      <button
        type="button"
        onClick={restore}
        data-testid="stop-impersonating-btn"
        style={{
          marginLeft: 8,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#D4A017', color: '#0A1628', border: 'none',
          padding: '6px 12px', borderRadius: 6,
          fontWeight: 800, fontSize: 12, letterSpacing: 0.5,
          cursor: 'pointer'
        }}>
        <LogOut size={12} /> Stop impersonating
      </button>
    </div>
  );
}
