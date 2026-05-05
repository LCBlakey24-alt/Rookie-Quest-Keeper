import React, { useState, useMemo } from 'react';
import { Search, Sword, Shield, FlaskConical, Sparkles, AlertCircle, ChevronDown, ChevronUp, Dices, BookOpen } from 'lucide-react';
import { ARMOR, ALL_WEAPONS } from '@/data/equipmentDatabase';
import { POTION_ITEMS, MAGIC_ITEMS } from '@/data/itemsDatabase';
import { CONDITION_EFFECTS } from '@/data/conditionEffects';
import { SPELL_DATABASE } from '@/data/spellDatabase';

const theme = {
  bg: { primary: '#0A1628', surface: '#0F2440', elevated: '#14304F' },
  accent: { primary: '#D4A017', secondary: '#F5C542' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(212, 160, 23, 0.35)'
};

const searchableText = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(' ');
  return String(value);
};

const getRollNotation = (item) => {
  const source = searchableText(item.damage || item.healing || item.versatileDamage);
  const match = source.match(/\d+d\d+(?:\s*[+-]\s*\d+)?/i);
  return match ? match[0].replace(/\s+/g, '') : null;
};

export default function UnifiedReferenceCenter({ onRollDamage, isCompact = false }) {
  const [activeTab, setActiveTab] = useState('weapons');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // Flatten reference data so GM and live play use one source of truth.
  const allEquipment = useMemo(() => {
    const weapons = ALL_WEAPONS.map(w => ({ ...w, type: 'weapon' }));
    const armor = [
      ...ARMOR.light,
      ...ARMOR.medium,
      ...(ARMOR.heavy || []),
      ...(ARMOR.shields || [])
    ].map(a => ({ ...a, type: 'armor' }));
    const potions = (POTION_ITEMS || []).map(p => ({ ...p, type: 'potion' }));
    const items = (MAGIC_ITEMS || [])
      .filter(i => i.type !== 'Potion')
      .map(i => ({ ...i, type: 'item' }));
    const spells = Object.entries(SPELL_DATABASE || {}).flatMap(([level, list]) => (
      (list || []).map(spell => ({
        ...spell,
        type: 'spell',
        level: level === 'cantrips' ? 0 : Number(level)
      }))
    ));
    
    return { weapons, armor, potions, items, spells };
  }, []);

  // Filter based on search + tab
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const tabData = allEquipment[activeTab] || [];
    
    if (!query) return tabData;
    return tabData.filter(item => {
      const haystack = [
        item.name,
        item.damage,
        item.healing,
        item.damageType,
        item.rarity,
        item.school,
        item.description,
        item.cost,
        item.ac,
        searchableText(item.classes),
        searchableText(item.properties)
      ].map(searchableText).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTab, searchQuery, allEquipment]);

  // Render equipment item with dice roller
  const EquipmentItem = ({ item, itemKey }) => {
    const rollNotation = getRollNotation(item);
    const classList = Array.isArray(item.classes) ? item.classes.join(', ') : item.classes;
    const isExpanded = expandedItems[itemKey];
    const toggleExpanded = () => {
      setExpandedItems(prev => ({
        ...prev,
        [itemKey]: !prev[itemKey]
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
                {item.healing && <span>HEAL: {item.healing}</span>}
                {item.damageType && <span>{item.damageType}</span>}
                {item.school && <span>{item.school}</span>}
                {item.level !== undefined && <span>{item.level === 0 ? 'Cantrip' : `Level ${item.level}`}</span>}
                {item.ac && <span>AC: {item.ac}</span>}
                {item.cost && <span>{item.cost}</span>}
                {item.rarity && <span>{item.rarity}</span>}
                {classList && <span>{classList}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {rollNotation && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRollDamage?.(rollNotation, item.name);
                }}
                title={`Roll ${rollNotation}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: `1px solid ${theme.accent.primary}`,
                  background: 'rgba(212, 160, 23, 0.14)',
                  color: theme.accent.secondary,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Dices size={13} />
                {rollNotation}
              </button>
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
            {classList && (
              <div style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '8px' }}>
                <strong>Classes:</strong> {classList}
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
      {Object.entries(CONDITION_EFFECTS).map(([key, condition]) => (
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
            {condition.label}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: theme.text.secondary,
            lineHeight: '1.5'
          }}>
            {condition.notes || 'No description'}
          </div>
        </div>
      ))}
    </div>
  );

  // Main tabs
  const tabs = [
    { id: 'weapons', label: 'Weapons', icon: Sword },
    { id: 'armor', label: 'Armor', icon: Shield },
    { id: 'potions', label: 'Potions', icon: FlaskConical },
    { id: 'items', label: 'Items', icon: Sparkles },
    { id: 'spells', label: 'Spells', icon: BookOpen },
    { id: 'conditions', label: 'Conditions', icon: AlertCircle }
  ];

  return (
    <div style={{
      padding: '16px',
      background: `linear-gradient(180deg, ${theme.bg.primary} 0%, ${theme.bg.surface} 100%)`,
      border: `1px solid ${theme.border}`,
      borderRadius: '8px',
      maxHeight: isCompact ? '340px' : '100%',
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
              <EquipmentItem
                key={`${item.type}-${item.id || item.name || idx}`}
                itemKey={`${item.type}-${item.id || item.name || idx}`}
                item={item}
              />
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
