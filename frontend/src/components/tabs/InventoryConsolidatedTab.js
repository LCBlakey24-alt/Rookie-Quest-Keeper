import React, { useState } from 'react';
import { Backpack, Gem } from 'lucide-react';
import ItemCreatorTab from './ItemCreatorTab';
import PartyInventoryTab from './PartyInventoryTab';

const theme = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', text: '#ffffff',
  primary: '#d00000', border: 'rgba(255,255,255,0.16)'
};

function InventoryConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('party-loot');
  const subTabs = [
    { id: 'party-loot', label: 'Party Loot', icon: Backpack },
    { id: 'items', label: 'Item Creator', icon: Gem },
  ];

  return (
    <div data-testid="inventory-consolidated-tab" style={shellStyle}>
      <nav style={tabsStyle} aria-label="Loot and item tools">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveSubTab(tab.id)} data-testid={`inventory-subtab-${tab.id}`} style={tabStyle(active)}>
              <Icon size={16} /> <strong>{tab.label}</strong>
            </button>
          );
        })}
      </nav>
      <div style={contentStyle}>
        {activeSubTab === 'party-loot' && <PartyInventoryTab campaignId={campaignId} />}
        {activeSubTab === 'items' && <ItemCreatorTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

const shellStyle = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, background: theme.bg, color: theme.text };
const tabsStyle = { display: 'flex', gap: 1, overflowX: 'auto', background: theme.border, border: `1px solid ${theme.border}` };
const tabStyle = active => ({ minWidth: 120, minHeight: 44, border: 0, background: active ? theme.primary : theme.card, color: theme.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' });
const contentStyle = { flex: 1, overflow: 'auto', minWidth: 0 };

export default InventoryConsolidatedTab;
