import React, { useState } from 'react';
import AdminUsersTab from './AdminUsersTab'; // Assuming this new component will be created

const AdminPage = ({ theme, user }) => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'settings'

  // Dummy data for stat boxes - these would typically come from an API
  const stats = [
    { label: 'Total Users', value: '1,234', key: 'users' },
    { label: 'Active Campaigns', value: '56', key: 'campaigns' },
    { label: 'AI Calls This Month', value: '7,890', key: 'ai_calls' },
    { label: 'Revenue (MRR)', value: '$1,234', key: 'revenue' },
  ];

  return (
    <div style={{ background: theme.bg.main, color: theme.text.primary, minHeight: '100vh', padding: '24px' }}>
      <h2 style={{ color: theme.accent, marginBottom: '24px' }}>Admin Dashboard</h2>

      {/* Tab Navigation - Addressing red highlight inconsistency */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, marginBottom: '24px' }}>
        {['Dashboard', 'Users', 'Settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.toLowerCase() ? `3px solid ${theme.accent}` : '3px solid transparent', // Gold active state
              color: activeTab === tab.toLowerCase() ? theme.text.primary : theme.text.muted,
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Stat Boxes - Addressing vivid color borders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {stats.map(stat => (
              <div key={stat.key} data-testid={`admin-stat-${stat.key}`} style={{
                background: theme.bg.panel,
                border: `1px solid ${theme.border}`, // Unified border color
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontSize: '12px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '8px' }}>{stat.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.accent }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* System Health / AI Usage - Placeholder */}
          <div style={{ background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: theme.accent, fontSize: '16px', marginBottom: '16px' }}>System Health & AI Usage</h3>
            <p style={{ color: theme.text.primary }}>Detailed graphs and metrics for AI calls, error rates, and server load would go here.</p>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <AdminUsersTab theme={theme} user={user} />
      )}

      {activeTab === 'settings' && (
        <div style={{ background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: theme.accent, fontSize: '16px', marginBottom: '16px' }}>Admin Settings</h3>
          <p style={{ color: theme.text.primary }}>Feature flag toggles and other global settings.</p>
        </div>
      )}
    </div>
  );
};

export default AdminPage;