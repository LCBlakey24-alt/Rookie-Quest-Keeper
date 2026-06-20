import React from 'react';
import { Home } from 'lucide-react';

import { theme } from './dashboardConfig';
import { noticeStyle } from './dashboardStyles';

export default function DashboardNotice() {
  return (
    <section style={noticeStyle}>
      <Home size={17} color={theme.accentHover} />
      <div>
        <strong style={{ color: theme.text }}>Cleaner flow:</strong>{' '}
        <span style={{ color: theme.textSecondary }}>
          Use this page as the launcher. Player work lives in Player Dashboard, GM prep lives inside each campaign, and live sessions launch from Campaign Prep.
        </span>
      </div>
    </section>
  );
}
