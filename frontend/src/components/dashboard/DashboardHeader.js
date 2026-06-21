import React from 'react';
import { LogOut, RefreshCw, Settings, Shield } from 'lucide-react';

import { theme } from './dashboardConfig';
import { HeaderButton } from './DashboardActionCards';
import {
  eyebrowStyle,
  headerActionsStyle,
  headerStyle,
  subtitleStyle,
  titleStyle,
} from './dashboardStyles';

export default function DashboardHeader({ username, isAdmin, refreshing, onRefresh, onNavigate, onLogout }) {
  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', flex: '0 0 auto', background: 'var(--rq-bg-panel-alt, #2E1D13)', border: '1px solid var(--rq-accent-border, rgba(192, 138, 61, 0.34))', boxShadow: '0 10px 26px rgba(0,0,0,0.28)' }}>
          <img src="/images/logo-mini.png" alt="Rookie Quest Keeper" style={{ width: 40, height: 40, objectFit: 'contain', display: 'block' }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Rookie Quest Keeper</p>
          <h1 style={titleStyle}>Command Dashboard</h1>
          <p style={subtitleStyle}>Welcome back, <strong style={{ color: theme.text }}>{username}</strong>. Choose where you want to work.</p>
        </div>
      </div>
      <div style={headerActionsStyle}>
        {isAdmin && <HeaderButton icon={Shield} label="Admin" onClick={() => onNavigate('/admin')} />}
        <HeaderButton icon={RefreshCw} label={refreshing ? 'Refreshing...' : 'Refresh'} onClick={onRefresh} disabled={refreshing} />
        <HeaderButton icon={Settings} label="Account" onClick={() => onNavigate('/account')} />
        <HeaderButton icon={LogOut} label="Logout" onClick={onLogout} />
      </div>
    </header>
  );
}
