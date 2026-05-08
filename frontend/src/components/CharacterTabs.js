import React from 'react';

export default function CharacterTabs({ visibleTabs, activeTab, setActiveTab, theme }) {
  return (
    <div
      className="character-sheet-tabs"
      style={{
        display: 'flex',
        gap: '8px',
        flexShrink: 0,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '6px',
        background: theme.bg.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 0,
        position: 'relative',
        zIndex: 4,
        maxWidth: '100%',
        scrollbarWidth: 'thin'
      }}
    >
      {visibleTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`character-tab-${tab.id}`}
            aria-label={tab.label}
            title={tab.label}
            className={`tab-glow press-scale character-sheet-tab-button ${isActive ? 'tab-active' : ''}`}
            style={{
              flex: '0 0 auto',
              minWidth: '58px',
              minHeight: '48px',
              padding: '8px 12px',
              background: isActive ? theme.bg.surface : 'transparent',
              color: isActive ? theme.text.primary : theme.text.muted,
              border: isActive ? `2px solid ${theme.accent.primary}` : `1px solid ${theme.border}`,
              borderRadius: 0,
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon size={18} strokeWidth={2.4} />
            <span className="character-sheet-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
