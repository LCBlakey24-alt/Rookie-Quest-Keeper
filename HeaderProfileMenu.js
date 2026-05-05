import React, { useState } from 'react';
import { User, Settings, ShieldAlert, LogOut, ChevronDown, CloudUpload } from 'lucide-react';

/**
 * Consolidates Admin, Settings, and Profile actions to declutter the main header.
 */
const HeaderProfileMenu = ({ user, theme, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`,
          padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: '#fff'
        }}
      >
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1628', fontWeight: 'bold', fontSize: '12px' }}>
          {user.username?.[0].toUpperCase()}
        </div>
        <span style={{ fontSize: '13px', fontWeight: '600' }}>{user.username}</span>
        <ChevronDown size={14} opacity={0.5} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: '220px',
          background: theme.bg.panel, border: `1px solid ${theme.border}`,
          borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '12px', borderBottom: `1px solid ${theme.border}`, fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase' }}>
            Account Settings
          </div>
          {[
            { icon: User, label: 'My Profile' },
            { icon: Settings, label: 'Site Settings' },
            { icon: CloudUpload, label: 'Import JSON' },
          ].map((item) => (
            <button key={item.label} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.target.style.background = 'none'}>
              <item.icon size={16} color={theme.accent} />
              <span style={{ fontSize: '13px' }}>{item.label}</span>
            </button>
          ))}
          
          {isAdmin && (
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(212,160,23,0.1)', border: 'none', color: theme.accent, cursor: 'pointer' }}>
              <ShieldAlert size={16} />
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>ADMIN DASHBOARD</span>
            </button>
          )}

          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderTop: `1px solid ${theme.border}` }}>
            <LogOut size={16} />
            <span style={{ fontSize: '13px' }}>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HeaderProfileMenu;