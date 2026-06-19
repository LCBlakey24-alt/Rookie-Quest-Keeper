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
        <img src="/images/logo-mini.png" alt="ROOK" style={{ width: 42, height: 42, objectFit: 'contain', flex: '0 0 auto' }} />
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
