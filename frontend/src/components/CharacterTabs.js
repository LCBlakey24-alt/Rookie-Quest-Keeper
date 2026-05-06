import React from 'react';

export default function CharacterTabs({ visibleTabs, activeTab, setActiveTab, theme }) {
  return (
    <div className="character-sheet-tabs" style={{
      display: 'flex',
      gap: '8px',
      flexShrink: 0,
      flexWrap: 'wrap',
      padding: '6px',
      background: theme.bg.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 0,
      position: 'relative',
      zIndex: 4
    }}>
      {visibleTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`character-tab-${tab.id}`} className={`tab-glow press-scale ${isActive ? 'tab-active' : ''}`} style={{
            flex: '1 1 auto',
            minWidth: '100px',
            minHeight: '44px',
            padding: '8px 10px',
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
          }}>
            <Icon size={17} strokeWidth={2.4} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
