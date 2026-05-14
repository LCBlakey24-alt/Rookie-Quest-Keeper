import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, LogIn, Users as UsersIcon, Search } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { AUTH_USERNAME_KEY, getAuthToken, setAuthToken } from '@/lib/auth';

const theme = {
  gold: '#D4A017',
  bg: { surface: '#0F2440', elevated: '#14304F', primary: '#0A1628' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(212, 160, 23, 0.35)'
};

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  background: 'rgba(212,160,23,0.15)',
  border: `1px solid ${theme.gold}`,
  color: theme.gold,
  padding: '8px 14px', borderRadius: 8,
  fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
  cursor: 'pointer'
};

const btnSubtle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent',
  border: `1px solid ${theme.border}`,
  color: theme.text.secondary,
  padding: '6px 10px', borderRadius: 6,
  fontSize: 11, fontWeight: 600, cursor: 'pointer'
};

/**
 * AdminUsersTab — user list + CSV exports + impersonation.
 * Impersonation stashes the admin's current token in sessionStorage so the
 * admin can restore their session later via the top-banner "Stop impersonating" button.
 */
export default function AdminUsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/admin/users');
        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const downloadCsv = async (kind) => {
    try {
      const res = await apiClient.get(`/admin/export/${kind}.csv`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rook-${kind}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${kind} CSV`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to export ${kind}`);
    }
  };

  const impersonate = async (targetUsername) => {
    if (!window.confirm(`Impersonate ${targetUsername}? Your current session will be stashed and restorable via the top banner.`)) return;
    try {
      const res = await apiClient.post(
        `/admin/users/${encodeURIComponent(targetUsername)}/impersonate`,
        {}
      );
      const { token, username } = res.data || {};
      if (!token) throw new Error('No token returned');
      // Stash admin's own creds for restoration
      const adminToken = getAuthToken();
      const adminUsername = localStorage.getItem(AUTH_USERNAME_KEY);
      sessionStorage.setItem('rq_admin_token_stash', adminToken || '');
      sessionStorage.setItem('rq_admin_username_stash', adminUsername || '');
      setAuthToken(token);
      localStorage.setItem(AUTH_USERNAME_KEY, username);
      toast.success(`Now viewing as ${username}`);
      // Reload to home — full app re-renders with the new token
      window.location.assign('/home');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Impersonation failed');
    }
  };

  const filtered = users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (u.username || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q);
  });

  return (
    <div data-testid="admin-users-tab" style={{
      background: theme.bg.elevated,
      border: `1px solid ${theme.border}`,
      padding: 24
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: theme.gold, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <UsersIcon size={20} /> USERS
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => downloadCsv('users')} data-testid="export-users-csv-btn" style={btnPrimary}>
            <Download size={14} /> EXPORT USERS CSV
          </button>
          <button type="button" onClick={() => downloadCsv('campaigns')} data-testid="export-campaigns-csv-btn" style={btnPrimary}>
            <Download size={14} /> EXPORT CAMPAIGNS CSV
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color={theme.text.muted} style={{ position: 'absolute', top: 12, left: 12 }} />
        <input
          data-testid="admin-user-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username or email..."
          style={{
            width: '100%', padding: '10px 14px 10px 34px',
            background: theme.bg.primary, color: theme.text.primary,
            border: `1px solid ${theme.border}`, borderRadius: 8,
            fontSize: 13, outline: 'none'
          }}
        />
      </div>

      {loading ? (
        <div style={{ color: theme.text.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>Loading users...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: theme.text.muted, textAlign: 'left', letterSpacing: 1, fontWeight: 700 }}>
                <th style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border}` }}>USERNAME</th>
                <th style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border}` }}>EMAIL</th>
                <th style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border}`, width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="3" style={{ color: theme.text.muted, padding: 20, textAlign: 'center' }}>No users match</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.username} data-testid={`user-row-${u.username}`} style={{ color: theme.text.primary, borderBottom: `1px solid rgba(212,160,23,0.08)` }}>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{u.username}</td>
                    <td style={{ padding: '10px', color: theme.text.secondary }}>{u.email || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => impersonate(u.username)}
                        data-testid={`impersonate-${u.username}`}
                        style={btnSubtle}>
                        <LogIn size={12} /> Impersonate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
