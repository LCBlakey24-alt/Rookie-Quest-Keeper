import React, { useState, useMemo } from 'react';
import { Search, Sword, Shield, Potion, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { WEAPONS, ARMOR, ALL_WEAPONS } from '@/data/equipmentDatabase';
import { POTIONS, MAGIC_ITEMS } from '@/data/itemsDatabase';
import { SPELLS_BY_LEVEL } from '@/data/spellDatabase';
import { CONDITIONS, CONDITION_EFFECTS } from '@/data/conditionEffects';
import DiceRollButton from '@/components/DiceRollButton';

const theme = {
  bg: { primary: '#0A1628', surface: '#0F2440', elevated: '#14304F' },
  accent: { primary: '#D4A017', secondary: '#F5C542' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(212, 160, 23, 0.35)'
};

export default function UnifiedReferenceCenter({ onRollDamage, isCompact = false }) {
  const [activeTab, setActiveTab] = useState('weapons');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // Flatten all equipment for search
  const allEquipment = useMemo(() => {
    const weapons = ALL_WEAPONS.map(w => ({ ...w, type: 'weapon' }));
    const armor = [
      ...ARMOR.light,
      ...ARMOR.medium,
      ...(ARMOR.heavy || []),
      ...(ARMOR.shields || [])
    ].map(a => ({ ...a, type: 'armor' }));
    const potions = (POTIONS || []).map(p => ({ ...p, type: 'potion' }));
    const items = (MAGIC_ITEMS || []).map(i => ({ ...i, type: 'item' }));
    
    return { weapons, armor, potions, items };
  }, []);

  // Filter based on search + tab
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const tabData = allEquipment[activeTab === 'weapons' ? 'weapons' : activeTab === 'armor' ? 'armor' : activeTab === 'potions' ? 'potions' : 'items'];
    
    if (!tabData) return [];
    return tabData.filter(item => 
      item.name?.toLowerCase().includes(query) ||
      item.damageType?.toLowerCase().includes(query) ||
      item.rarity?.toLowerCase().includes(query)
    );
  }, [activeTab, searchQuery, allEquipment]);

  // Render equipment item with dice roller
  const EquipmentItem = ({ item }) => {
    const isExpanded = expandedItems[`${item.type}-${item.id}`];
    const toggleExpanded = () => {
      setExpandedItems(prev => ({
        ...prev,
        [`${item.type}-${item.id}`]: !prev[`${item.type}-${item.id}`]
      }));
    };

    return (
      <div
        style={{
          padding: '12px',
          marginBottom: '8px',
          background: theme.bg.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px',
          cursor: 'pointer'
        }}
        onClick={toggleExpanded}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: theme.text.primary,
              marginBottom: '4px'
            }}>
              {item.name}
            </div>
            {!isCompact && (
              <div style={{ 
                fontSize: '12px', 
                color: theme.text.secondary,
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                {item.damage && <span>DMG: {item.damage}</span>}
                {item.damageType && <span>{item.damageType}</span>}
                {item.ac && <span>AC: {item.ac}</span>}
                {item.cost && <span>{item.cost}</span>}
                {item.rarity && <span>{item.rarity}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {item.damage && (
              <DiceRollButton
                diceFormula={item.damage}
                label="Roll"
                onRoll={onRollDamage}
                size="sm"
              />
            )}
            <div style={{ color: theme.text.muted, fontSize: '16px' }}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.border}` }}>
            {item.properties && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Properties
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {item.properties.map(prop => (
                    <span key={prop} style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: theme.bg.elevated,
                      borderRadius: '4px',
                      color: theme.accent.primary
                    }}>
                      {prop}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.description && (
              <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: '1.5' }}>
                {item.description}
              </div>
            )}
            {item.versatileDamage && (
              <div style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '8px' }}>
                <strong>Two-handed:</strong> {item.versatileDamage}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render conditions tab
  const ConditionsTab = () => (
    <div>
      {Object.entries(CONDITIONS).map(([key, condition]) => (
        <div key={key} style={{
          padding: '12px',
          marginBottom: '8px',
          background: theme.bg.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: theme.accent.primary,
            marginBottom: '6px'
          }}>
            {condition}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: theme.text.secondary,
            lineHeight: '1.5'
          }}>
            {CONDITION_EFFECTS[key]?.description || 'No description'}
          </div>
        </div>
      ))}
    </div>
  );

  // Main tabs
  const tabs = [
    { id: 'weapons', label: 'Weapons', icon: Sword },
    { id: 'armor', label: 'Armor', icon: Shield },
    { id: 'potions', label: 'Potions', icon: Potion },
    { id: 'items', label: 'Items', icon: Sparkles },
    { id: 'conditions', label: 'Conditions', icon: AlertCircle }
  ];

  return (
    <div style={{
      padding: '16px',
      background: theme.bg.primary,
      borderRadius: '8px',
      maxHeight: isCompact ? '600px' : '100%',
      overflowY: 'auto'
    }}>
      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          background: theme.bg.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px'
        }}>
          <Search size={16} color={theme.text.muted} style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: theme.text.primary,
              fontSize: '14px',
              outline: 'none',
              '::placeholder': { color: theme.text.muted }
            }}
          />
        </div>
      </div>

      {/* Tab Buttons */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: isActive ? theme.accent.primary : theme.bg.surface,
                border: `1px solid ${isActive ? theme.accent.primary : theme.border}`,
                color: isActive ? theme.bg.primary : theme.text.primary,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {activeTab === 'conditions' ? (
        <ConditionsTab />
      ) : (
        <div>
          {filteredData.length > 0 ? (
            filteredData.map((item, idx) => (
              <EquipmentItem key={`${item.type}-${item.id || idx}`} item={item} />
            ))
          ) : (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: theme.text.muted
            }}>
              No {activeTab} found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
