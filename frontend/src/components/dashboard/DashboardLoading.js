import React from 'react';

import { theme } from './dashboardConfig';
import { loadingPanelStyle, pageStyle } from './dashboardStyles';

export default function DashboardLoading({ slowLoad }) {
  return (
    <main style={{ ...pageStyle, display: 'grid', placeItems: 'center' }}>
      <section style={loadingPanelStyle}>
        <img src="/images/logo-mini.png" alt="ROOK loading" style={{ width: 58, height: 58, objectFit: 'contain' }} />
        <div className="loading-spinner" />
        <h1 style={{ color: theme.text, margin: '8px 0 4px', fontSize: 22 }}>Loading your command dashboard…</h1>
        <p style={{ color: theme.textSecondary, margin: 0, lineHeight: 1.5 }}>
          {slowLoad
            ? 'This is taking longer than expected. The app will stop waiting if the server does not respond, then you can retry from here.'
            : 'Checking your characters, campaigns, and account settings.'}
        </p>
      </section>
    </main>
  );
}
