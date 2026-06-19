import React from 'react';

export default function CleanSheetTabs({ tabs, activeTab, onSelectTab }) {
  return (
    <nav className="clean-sheet-tabs" aria-label="Character sheet sections">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => onSelectTab(tab.id)} className={selected ? 'active' : ''}>
            <Icon size={17} /> <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
