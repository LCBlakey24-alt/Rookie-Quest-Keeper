import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, Search, Coins, ChevronDown, ChevronRight, User,
  Sparkles, Shield, Swords, Wand2, Heart, Gem
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Player Theme - Blue (Tron Legacy)
const theme = {
  primary: '#06B6D4',
  cyan: '#06B6D4',
  hover: '#0891B2',
  subtle: 'rgba(59, 130, 246, 0.15)',
  glow: '0 0 20px rgba(6, 182, 212, 0.3)',
  bg: '#0B0F19',
  card: '#111827',
  panel: '#111827',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(212, 175, 55, 0.15)',
  success: '#22C55E',
  warning: '#F59E0B',
  gold: '#EAB308'
};

const ITEM_TYPES = {
  weapon: { icon: Swords, color: '#D97706' },
  armor: { icon: Shield, color: '#06B6D4' },
  potion: { icon: Heart, color: '#EC4899' },
  scroll: { icon: Wand2, color: '#8B5CF6' },
  wondrous: { icon: Sparkles, color: '#F59E0B' },
  treasure: { icon: Gem, color: '#EAB308' },
  misc: { icon: Package, color: '#6B7280' },
};

function PlayerPartyLoot({ campaignId, characterId, characterName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (campaignId) {
      fetchItems();
    }
  }, [campaignId]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/party-inventory`);
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Failed to load party inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimItem = async (item) => {
    if (!characterId) {
      toast.error('Select a character to claim items');
      return;
    }

    setClaiming(item.id);
    try {
      await axios.post(`${API}/campaigns/${campaignId}/party-inventory/${item.id}/claim`, {
        character_id: characterId,
        character_name: characterName
      });
      
      toast.success(`${characterName} claimed ${item.name}!`);
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to claim item');
    } finally {
      setClaiming(null);
    }
  };

  // Group items by type
  const groupedItems = items.reduce((acc, item) => {
    const type = item.type || 'misc';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  // Filter items
  const filteredGroups = Object.entries(groupedItems).reduce((acc, [type, typeItems]) => {
    const filtered = typeItems.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) acc[type] = filtered;
    return acc;
  }, {});

  const totalValue = items.reduce((sum, item) => {
    const match = item.value?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading party loot...
      </div>
    );
  }

  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: theme.subtle,
            border: `1px solid ${theme.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Package size={20} color={theme.primary} />
          </div>
          <div>
            <h3 style={{ color: theme.primary, fontSize: '16px', fontWeight: '400', margin: 0 }}>
              PARTY LOOT
            </h3>
            <p style={{ color: theme.muted, fontSize: '12px', margin: 0 }}>
              Shared treasure from your adventures
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={16} color={theme.gold} />
            <span style={{ color: theme.gold, fontWeight: '400' }}>{totalValue} gp value</span>
          </div>
          <span style={{ color: theme.muted, fontSize: '13px' }}>
            {items.length} items
          </span>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <Search size={16} style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: theme.muted 
        }} />
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            paddingLeft: '40px',
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            color: theme.text
          }}
        />
      </div>

      {/* Character info */}
      {characterId && (
        <div style={{
          padding: '10px 14px',
          background: theme.subtle,
          border: `1px solid ${theme.primary}40`,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <User size={14} color={theme.primary} />
          <span style={{ color: theme.textSecondary, fontSize: '13px' }}>
            Claiming as: <strong style={{ color: theme.text }}>{characterName}</strong>
          </span>
        </div>
      )}

      {/* Items by Category */}
      {Object.keys(filteredGroups).length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: theme.muted
        }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ margin: 0 }}>
            {items.length === 0 ? 'No items in party loot yet' : 'No items match your search'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(filteredGroups).map(([type, typeItems]) => {
            const typeInfo = ITEM_TYPES[type] || ITEM_TYPES.misc;
            const Icon = typeInfo.icon;
            const isExpanded = expandedCategory === type || expandedCategory === null;

            return (
              <div key={type} style={{
                background: theme.bg,
                border: `1px solid ${theme.border}`
              }}>
                {/* Category Header */}
                <div
                  onClick={() => setExpandedCategory(expandedCategory === type ? null : type)}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} color={typeInfo.color} />
                    <span style={{ 
                      color: theme.text, 
                      fontWeight: '400',
                      textTransform: 'capitalize'
                    }}>
                      {type}s
                    </span>
                    <span style={{
                      background: typeInfo.color,
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px'
                    }}>
                      {typeItems.length}
                    </span>
                  </div>
                  {isExpanded ? 
                    <ChevronDown size={16} color={theme.muted} /> : 
                    <ChevronRight size={16} color={theme.muted} />
                  }
                </div>

                {/* Items */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${theme.border}` }}>
                    {typeItems.map(item => (
                      <div key={item.id} style={{
                        padding: '12px 14px',
                        borderBottom: `1px solid ${theme.border}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: theme.text, fontWeight: '500' }}>
                              {item.name}
                            </span>
                            {item.quantity > 1 && (
                              <span style={{ color: theme.muted, fontSize: '12px' }}>
                                x{item.quantity}
                              </span>
                            )}
                            {item.rarity && item.rarity !== 'common' && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: item.rarity === 'rare' ? '#06B6D4' :
                                           item.rarity === 'very_rare' ? '#8B5CF6' :
                                           item.rarity === 'legendary' ? '#F59E0B' :
                                           item.rarity === 'uncommon' ? '#22C55E' : theme.muted,
                                color: '#fff',
                                textTransform: 'uppercase'
                              }}>
                                {item.rarity.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p style={{ color: theme.muted, fontSize: '12px', margin: 0 }}>
                              {item.description.slice(0, 100)}
                              {item.description.length > 100 ? '...' : ''}
                            </p>
                          )}
                          {item.value && (
                            <span style={{ color: theme.gold, fontSize: '11px' }}>
                              Value: {item.value}
                            </span>
                          )}
                        </div>

                        {/* Claim button */}
                        {characterId && !item.claimed_by && (
                          <Button
                            onClick={() => handleClaimItem(item)}
                            disabled={claiming === item.id}
                            style={{
                              background: theme.success,
                              border: 'none',
                              color: '#fff',
                              padding: '6px 12px',
                              fontSize: '12px'
                            }}
                          >
                            {claiming === item.id ? '...' : 'Claim'}
                          </Button>
                        )}

                        {item.claimed_by && (
                          <span style={{ 
                            color: theme.muted, 
                            fontSize: '11px',
                            padding: '6px 12px'
                          }}>
                            Claimed by {item.claimed_by}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlayerPartyLoot;
