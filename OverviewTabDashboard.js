import React from 'react';
import DesktopSidebar from './DesktopSidebar';

const OverviewTabDashboard = ({ character, theme, isMobile = false }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* On mobile, we show the full stats block here since there is no sidebar */}
      {isMobile && (
        <div style={{ background: theme.bg.panel, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '4px' }}>
          <DesktopSidebar character={character} theme={theme} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
        {/* Quick Summary Card */}
        <div style={{ background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ color: theme.accent, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px' }}>Character Summary</h4>
          <p style={{ color: theme.text.primary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            {character.backstory || "No character summary provided. Use the Story tab to add details about your background and appearance."}
          </p>
        </div>

        {/* Equipment Summary Card */}
        <div style={{ background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ color: theme.accent, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px' }}>Equipped Items</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['Longsword', 'Shield', 'Chain Mail'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.accent }}></div>
                <span style={{ fontSize: '14px', color: theme.text.primary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Character Notes / Features Summary */}
      <div style={{ background: theme.bg.panel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ color: theme.accent, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px' }}>Active Features</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {['Second Wind', 'Action Surge', 'Combat Superiority'].map(feat => (
            <div key={feat} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>{feat}</div>
              <div style={{ fontSize: '11px', color: theme.text.muted }}>Available until rest</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewTabDashboard;