import React, { useState, useEffect } from 'react';
import { Search, Download, UserCheck, UserX } from 'lucide-react';

const AdminUsersTab = ({ theme, user: currentUser }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dummy fetch for users - replace with actual API call
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // In a real app, this would be an authenticated API call
        const response = await new Promise(resolve => setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'user1', username: 'lcblakey24', email: 'lcblakey24@example.com', tier: 'pro', subscription_status: 'active', lifetime_access: false, ai_calls_this_month: 150, created_at: '2023-01-15' },
              { id: 'user2', username: 'player_one', email: 'player1@example.com', tier: 'free', subscription_status: 'none', lifetime_access: false, ai_calls_this_month: 2, created_at: '2023-02-20' },
              { id: 'user3', username: 'gm_master', email: 'gmmaster@example.com', tier: 'pro', subscription_status: 'active', lifetime_access: true, ai_calls_this_month: 200, created_at: '2022-11-01' },
              { id: 'user4', username: 'test_user', email: 'test@example.com', tier: 'free', subscription_status: 'none', lifetime_access: false, ai_calls_this_month: 0, created_at: '2024-03-10' },
            ])
          });
        }, 500));

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImpersonate = (username) => {
    // In a real application, this would involve:
    // 1. Making an API call to /api/admin/users/{username}/impersonate to get a new JWT for the target user.
    // 2. Stashing the current admin JWT in sessionStorage (e.g., 'rq_admin_token_stash').
    // 3. Replacing the current JWT with the new impersonated JWT.
    // 4. Redirecting to the home page or character list.
    console.log(`Impersonating user: ${username}`);
    alert(`Simulating impersonation of ${username}. In a real app, your token would change and you'd be redirected.`);
  };

  const handleExportCSV = (type) => {
    // In a real application, this would trigger a backend endpoint
    // like /api/admin/export/users.csv or /api/admin/export/campaigns.csv
    console.log(`Exporting ${type} CSV`);
    alert(`Simulating export of ${type} CSV.`);
  };

  return (
    <div style={{ background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ color: theme.accent, fontSize: '16px', marginBottom: '16px' }}>User Management</h3>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Search size={16} color={theme.text.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="admin-user-search"
            style={{
              width: '100%', padding: '8px 12px 8px 40px', borderRadius: '6px',
              border: `1px solid ${theme.border}`, background: theme.bg.main,
              color: theme.text.primary, fontSize: '13px'
            }}
          />
        </div>
        <button onClick={() => handleExportCSV('users')} data-testid="export-users-csv-btn" style={{ ...buttonStyle(theme), display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Download size={14} /> Users CSV
        </button>
        <button onClick={() => handleExportCSV('campaigns')} data-testid="export-campaigns-csv-btn" style={{ ...buttonStyle(theme), display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Download size={14} /> Campaigns CSV
        </button>
      </div>

      {loading && <p style={{ color: theme.text.muted }}>Loading users...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: theme.bg.main, position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {['Username', 'Email', 'Tier', 'Status', 'AI Calls', 'Actions'].map(header => (
                  <th key={header} style={{ padding: '10px', textAlign: 'left', fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.username}`} style={{ borderBottom: `1px solid ${theme.border}44` }}>
                  <td style={{ padding: '10px', fontSize: '13px', color: theme.text.primary }}>{user.username}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: theme.text.primary }}>{user.email}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: theme.text.primary }}>{user.tier}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: theme.text.primary }}>{user.subscription_status}</td>
                  <td style={{ padding: '10px', fontSize: '13px', color: theme.text.primary }}>{user.ai_calls_this_month}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>
                    <button onClick={() => handleImpersonate(user.username)} data-testid={`impersonate-${user.username}`} style={{ ...buttonStyle(theme), background: theme.accent, color: '#0A1628', padding: '4px 8px', fontSize: '11px' }}>
                      <UserCheck size={12} /> Impersonate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const buttonStyle = (theme) => ({
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${theme.border}`,
  color: theme.text.primary,
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    background: 'rgba(255,255,255,0.1)',
  }
});

export default AdminUsersTab;