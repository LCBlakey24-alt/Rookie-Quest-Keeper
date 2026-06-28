import React, { useState } from 'react';
import { Gem, Backpack } from 'lucide-react';
import ItemCreatorTab from './ItemCreatorTab';
import PartyInventoryTab from './PartyInventoryTab';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.58)',
  primary: '#d00000',
  border: 'rgba(255,255,255,0.16)'
};

function InventoryConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('party-loot');

  const subTabs = [
    { id: 'party-loot', label: 'Party Loot', icon: Backpack, description: 'Grant rewards to sheets' },
    { id: 'items', label: 'Item Creator', icon: Gem, description: 'Create custom items' }
  ];

  return (
    <div data-testid="inventory-consolidated-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.text }}>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: `1px solid ${theme.border}`, background: theme.panel, flexWrap: 'wrap' }}>
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              data-testid={`inventory-subtab-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: isActive ? theme.primary : theme.card,
                border: `1px solid ${isActive ? theme.primary : theme.border}`,
                color: theme.text,
                cursor: 'pointer',
                borderRadius: 0,
                fontWeight: 900,
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              <small style={{ opacity: 0.75, fontWeight: 800 }}>{tab.description}</small>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {activeSubTab === 'party-loot' && <PartyInventoryTab campaignId={campaignId} />}
        {activeSubTab === 'items' && <ItemCreatorTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

export default InventoryConsolidatedTab;
