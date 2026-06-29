import React from 'react';
import './CleanSheetTabs.minimal.css';
import './CleanSheetTabsRail.css';

export default function CleanSheetTabs({ tabs, activeTab, onSelectTab }) {
  return (
    <nav className="clean-sheet-tabs" aria-label="Character sheet sections">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab)}
            className={selected ? 'active' : ''}
            aria-label={tab.label}
            title={tab.label}
            type="button"
          >
            <Icon size={17} /> <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
