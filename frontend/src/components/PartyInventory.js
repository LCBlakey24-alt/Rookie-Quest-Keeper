import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, Plus, Trash2, Edit2, Save, X, Coins, Sparkles,
  Sword, Shield, FlaskConical, ScrollText, Gem, Search, Users, GripVertical, ArrowRight,
  Dice5, Split, Wand2, Gift
} from 'lucide-react';
import ImageUploadPanel from '@/components/ImageUploadPanel';
import RookFormFillPanel from '@/components/RookFormFillPanel';


const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapon', icon: Sword, color: '#ef4444' },
  { id: 'armor', label: 'Armor', icon: Shield, color: '#38BDF8' },
  { id: 'potion', label: 'Potion', icon: FlaskConical, color: '#7C3AED' },
  { id: 'scroll', label: 'Scroll', icon: ScrollText, color: '#A855F7' },
  { id: 'magic_item', label: 'Magic Item', icon: Sparkles, color: '#14B8A6' },
  { id: 'gem', label: 'Gem/Art', icon: Gem, color: '#22c55e' },
  { id: 'misc', label: 'Misc', icon: Package, color: '#64748b' },
];

// SRD Treasure Tables
const TREASURE_TABLES = {
  individual: {
    '0-4': { cp: [5, 6, 30], sp: [4, 6, 0], gp: [0, 0, 10] },
    '5-10': { cp: [4, 6, 100], sp: [6, 6, 20], gp: [2, 6, 10] },
    '11-16': { sp: [4, 6, 100], gp: [1, 6, 100], pp: [0, 0, 0] },
    '17+': { gp: [12, 6, 100], pp: [2, 6, 100] },
  },
  hoard_items: {
    '0-4': [
      { name: 'Potion of Healing', type: 'potion', rarity: 'Common', value: '50 gp' },
      { name: 'Spell Scroll (1st level)', type: 'scroll', rarity: 'Common', value: '25 gp' },
      { name: 'Bag of Holding', type: 'magic_item', rarity: 'Uncommon', value: '500 gp' },
    ],
    '5-10': [
      { name: 'Potion of Greater Healing', type: 'potion', rarity: 'Uncommon', value: '150 gp' },
      { name: '+1 Weapon', type: 'weapon', rarity: 'Uncommon', value: '500 gp', is_magical: true },
      { name: '+1 Shield', type: 'armor', rarity: 'Uncommon', value: '500 gp', is_magical: true },
      { name: 'Cloak of Protection', type: 'magic_item', rarity: 'Uncommon', value: '500 gp', is_magical: true, attunement_required: true },
      { name: 'Spell Scroll (3rd level)', type: 'scroll', rarity: 'Uncommon', value: '200 gp' },
    ],
    '11-16': [
      { name: 'Potion of Superior Healing', type: 'potion', rarity: 'Rare', value: '500 gp' },
      { name: '+2 Weapon', type: 'weapon', rarity: 'Rare', value: '4000 gp', is_magical: true },
      { name: 'Ring of Protection', type: 'magic_item', rarity: 'Rare', value: '3500 gp', is_magical: true, attunement_required: true },
      { name: 'Staff of the Woodlands', type: 'weapon', rarity: 'Rare', value: '8000 gp', is_magical: true, attunement_required: true },
    ],
    '17+': [
      { name: 'Potion of Supreme Healing', type: 'potion', rarity: 'Very Rare', value: '2500 gp' },
      { name: '+3 Weapon', type: 'weapon', rarity: 'Very Rare', value: '25000 gp', is_magical: true },
      { name: 'Robe of the Archmagi', type: 'magic_item', rarity: 'Legendary', value: '50000 gp', is_magical: true, attunement_required: true },
    ],
  },
  gems: {
    '0-4': [
      { name: 'Azurite', value: 10 }, { name: 'Blue Quartz', value: 10 },
      { name: 'Tiger Eye', value: 10 }, { name: 'Turquoise', value: 10 },
    ],
    '5-10': [
      { name: 'Bloodstone', value: 50 }, { name: 'Jasper', value: 50 },
      { name: 'Moonstone', value: 50 }, { name: 'Onyx', value: 50 },
      { name: 'Zircon', value: 50 }, { name: 'Star Rose Quartz', value: 50 },
    ],
    '11-16': [
      { name: 'Alexandrite', value: 500 }, { name: 'Aquamarine', value: 500 },
      { name: 'Black Pearl', value: 500 }, { name: 'Topaz', value: 500 },
    ],
    '17+': [
      { name: 'Black Opal', value: 1000 }, { name: 'Blue Sapphire', value: 1000 },
      { name: 'Emerald', value: 1000 }, { name: 'Ruby', value: 5000 },
      { name: 'Diamond', value: 5000 },
    ],
  },
};

// Roll dice (NdS format)
function rollDice(n, s) {
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.floor(Math.random() * s) + 1;
  return total;
}

// Generate treasure based on tier
function generateTreasure(tier, isHoard) {
  const loot = { gold: 0, items: [], gems: [] };
  const table = TREASURE_TABLES.individual[tier];
  
  if (table) {
    if (table.cp) loot.gold += Math.round(rollDice(table.cp[0], table.cp[1]) * table.cp[2] / 100);
    if (table.sp) loot.gold += Math.round(rollDice(table.sp[0], table.sp[1]) * table.sp[2] / 10);
    if (table.gp) loot.gold += rollDice(table.gp[0] || 1, table.gp[1] || 1) * (table.gp[2] || 1);
    if (table.pp) loot.gold += rollDice(table.pp[0], table.pp[1]) * (table.pp[2] || 1) * 10;
  }
  
  if (isHoard) {
    loot.gold *= 3;
    // Add gems
    const gemTable = TREASURE_TABLES.gems[tier] || [];
    const gemCount = rollDice(1, 4);
    for (let i = 0; i < gemCount; i++) {
      const gem = gemTable[Math.floor(Math.random() * gemTable.length)];
      if (gem) loot.gems.push({ ...gem });
    }
    // Chance for magic items
    const itemTable = TREASURE_TABLES.hoard_items[tier] || [];
    if (Math.random() < 0.4 && itemTable.length > 0) {
      loot.items.push({ ...itemTable[Math.floor(Math.random() * itemTable.length)] });
    }
  }
  
  return loot;
}

function PartyInventory({ campaignId, players = [] }) {
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState({ copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverPlayer, setDragOverPlayer] = useState(null);
  const [showPlayerPanel, setShowPlayerPanel] = useState(true);
  const [showTreasureGen, setShowTreasureGen] = useState(false);
  const [treasureTier, setTreasureTier] = useState('0-4');
  const [isHoard, setIsHoard] = useState(false);
  const [generatedLoot, setGeneratedLoot] = useState(null);
  const [campaignCharacters, setCampaignCharacters] = useState([]);
  const [grantingItemId, setGrantingItemId] = useState(null);
  const [grantTargetId, setGrantTargetId] = useState('');
  
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    item_type: 'misc',
    description: '',
    value: '',
    weight: 0,
    is_magical: false,
    attunement_required: false,
    attuned_to: '',
    notes: '',
    image_url: ''
  });

  useEffect(() => {
    fetchData();
    fetchCampaignCharacters();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [itemsRes, currencyRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/inventory`),
        apiClient.get(`/campaigns/${campaignId}/currency`)
      ]);
      setItems(itemsRes.data);
      setCurrency(currencyRes.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignCharacters = async () => {
    try {
      const res = await apiClient.get(`/campaigns/${campaignId}/players`);
      setCampaignCharacters(res.data?.players || []);
    } catch {
      // Not GM — grant UI simply won't appear
    }
  };

  const handleGrantItem = async (item) => {
    if (!grantTargetId) { toast.error('Select a character first'); return; }
    try {
      await apiClient.post(`/campaigns/${campaignId}/inventory/${item.id}/grant`, {
        character_id: grantTargetId,
      });
      const target = campaignCharacters.find(c => c.id === grantTargetId);
      toast.success(`${item.name} sent to ${target?.name || 'character'}'s inventory`);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setGrantingItemId(null);
      setGrantTargetId('');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not grant item');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error('Enter an item name');
      return;
    }
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/inventory`, newItem);
      setItems([res.data, ...items]);
      setNewItem({
        name: '', quantity: 1, item_type: 'misc', description: '',
        value: '', weight: 0, is_magical: false, attunement_required: false,
        attuned_to: '', notes: '', image_url: ''
      });
      setShowAddForm(false);
      toast.success('Item added!');
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const res = await apiClient.put(`/campaigns/${campaignId}/inventory/${itemId}`, updates);
      setItems(items.map(i => i.id === itemId ? res.data : i));
      setEditingItem(null);
      toast.success('Item updated!');
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/inventory/${itemId}`);
      setItems(items.filter(i => i.id !== itemId));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleCurrencyChange = async (type, value) => {
    const newCurrency = { ...currency, [type]: Math.max(0, parseInt(value) || 0) };
    setCurrency(newCurrency);
    try {
      await apiClient.put(`/campaigns/${campaignId}/currency`, { [type]: newCurrency[type] });
    } catch (error) {
      toast.error('Failed to update currency');
    }
  };

  const adjustCurrency = async (type, amount) => {
    const newValue = Math.max(0, (currency[type] || 0) + amount);
    handleCurrencyChange(type, newValue);
  };

  // Generate and add loot
  const handleGenerateTreasure = () => {
    const loot = generateTreasure(treasureTier, isHoard);
    setGeneratedLoot(loot);
  };

  const addGeneratedLoot = async () => {
    if (!generatedLoot) return;
    try {
      // Add gold
      if (generatedLoot.gold > 0) {
        await adjustCurrency('gold', generatedLoot.gold);
      }
      // Add gems
      for (const gem of generatedLoot.gems) {
        const res = await apiClient.post(`/campaigns/${campaignId}/inventory`, {
          name: gem.name, quantity: 1, item_type: 'gem', value: `${gem.value} gp`,
          description: `A ${gem.name} worth ${gem.value} gp`, weight: 0,
        });
        setItems(prev => [res.data, ...prev]);
      }
      // Add items
      for (const item of generatedLoot.items) {
        const res = await apiClient.post(`/campaigns/${campaignId}/inventory`, {
          name: item.name, quantity: 1, item_type: item.type, value: item.value,
          description: `${item.rarity} ${item.type}`, is_magical: item.is_magical || false,
          attunement_required: item.attunement_required || false, weight: 0,
        });
        setItems(prev => [res.data, ...prev]);
      }
      toast.success(`Added ${generatedLoot.gold} GP, ${generatedLoot.gems.length} gems, ${generatedLoot.items.length} items`);
      setGeneratedLoot(null);
      setShowTreasureGen(false);
    } catch (error) {
      toast.error('Failed to add loot');
    }
  };

  // Auto-split gold among players
  const splitGold = async () => {
    if (players.length === 0) { toast.error('No players to split with'); return; }
    const goldPerPlayer = Math.floor(currency.gold / players.length);
    const remainder = currency.gold % players.length;
    if (goldPerPlayer === 0) { toast.error('Not enough gold to split'); return; }
    try {
      for (const player of players) {
        if (player.character_id) {
          await apiClient.patch(`/characters/${player.character_id}`, {
            gold: (player.gold || 0) + goldPerPlayer
          });
        }
      }
      await handleCurrencyChange('gold', remainder);
      toast.success(`Split ${currency.gold - remainder} GP (${goldPerPlayer} each) among ${players.length} players. ${remainder} GP remaining.`);
    } catch (error) {
      toast.error('Failed to split gold');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // Add dragging class for visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverPlayer(null);
  };

  const handleDragOver = (e, playerId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPlayer(playerId);
  };

  const handleDragLeave = () => {
    setDragOverPlayer(null);
  };

  const handleDrop = async (e, player) => {
    e.preventDefault();
    setDragOverPlayer(null);
    
    if (!draggedItem) return;
    
    // Assign item to player
    try {
      const res = await apiClient.put(`/campaigns/${campaignId}/inventory/${draggedItem.id}`, {
        attuned_to: player.name
      });
      setItems(items.map(i => i.id === draggedItem.id ? res.data : i));
      toast.success(`${draggedItem.name} assigned to ${player.name}!`);
    } catch (error) {
      toast.error('Failed to assign item');
    }
    
    setDraggedItem(null);
  };

  const handleUnassignItem = async (itemId) => {
    try {
      const res = await apiClient.put(`/campaigns/${campaignId}/inventory/${itemId}`, {
        attuned_to: ''
      });
      setItems(items.map(i => i.id === itemId ? res.data : i));
      toast.success('Item returned to party inventory');
    } catch (error) {
      toast.error('Failed to unassign item');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  // Separate items by assignment
  const partyItems = filteredItems.filter(item => !item.attuned_to);
  const getPlayerItems = (playerName) => items.filter(item => item.attuned_to === playerName);

  const getItemTypeInfo = (type) => ITEM_TYPES.find(t => t.id === type) || ITEM_TYPES[5];

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0);

  if (loading) return <div className="loading-spinner" />;

  return (
    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      {/* Currency Section */}
      <div className="glow-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '400', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coins size={18} style={{ color: '#A78BFA' }} /> Party Treasury
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {[
            { key: 'platinum', label: 'PP', color: '#e5e7eb' },
            { key: 'gold', label: 'GP', color: '#A78BFA' },
            { key: 'electrum', label: 'EP', color: '#94a3b8' },
            { key: 'silver', label: 'SP', color: '#cbd5e1' },
            { key: 'copper', label: 'CP', color: '#f97316' }
          ].map(coin => (
            <div key={coin.key} style={{ background: 'rgba(31, 31, 35, 0.86)', border: '2px solid rgba(124,58,237,0.28)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: coin.color, fontWeight: '400', marginBottom: '4px' }}>{coin.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                <button onClick={() => adjustCurrency(coin.key, -1)} style={{ background: 'rgba(124, 58, 237, 0.2)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '400' }}>-</button>
                <input type="number" value={currency[coin.key] || 0} onChange={(e) => handleCurrencyChange(coin.key, e.target.value)} style={{ width: '50px', textAlign: 'center', background: 'rgba(10, 10, 40, 0.6)', border: '1px solid rgba(124,58,237,0.28)', borderRadius: '4px', color: '#fff', padding: '2px', fontSize: '12px', fontWeight: '400' }} />
                <button onClick={() => adjustCurrency(coin.key, 1)} style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #7C3AED', borderRadius: '4px', color: '#7C3AED', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '400' }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <Button
            onClick={splitGold}
            data-testid="split-gold-btn"
            className="btn-outline"
            style={{ flex: 1, display: 'flex', gap: '6px', fontSize: '11px', padding: '6px 10px' }}
          >
            <Split size={14} /> Split Gold ({players.length} players)
          </Button>
          <Button
            onClick={() => setShowTreasureGen(!showTreasureGen)}
            data-testid="treasure-gen-btn"
            className={showTreasureGen ? 'btn-primary' : 'btn-outline'}
            style={{ flex: 1, display: 'flex', gap: '6px', fontSize: '11px', padding: '6px 10px' }}
          >
            <Dice5 size={14} /> Generate Treasure
          </Button>
        </div>

        {/* Treasure Generator Panel */}
        {showTreasureGen && (
          <div style={{
            marginTop: '12px', padding: '14px',
            background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 600 }}>CR TIER</label>
                <select
                  value={treasureTier}
                  onChange={(e) => setTreasureTier(e.target.value)}
                  data-testid="treasure-tier-select"
                  className="input-glow"
                  style={{ padding: '6px 10px', fontSize: '12px', marginLeft: '6px' }}
                >
                  <option value="0-4">CR 0-4</option>
                  <option value="5-10">CR 5-10</option>
                  <option value="11-16">CR 11-16</option>
                  <option value="17+">CR 17+</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#fff' }}>
                <input type="checkbox" checked={isHoard} onChange={(e) => setIsHoard(e.target.checked)} />
                <Wand2 size={14} color="#7C3AED" /> Treasure Hoard
              </label>
              <Button
                onClick={handleGenerateTreasure}
                data-testid="roll-treasure-btn"
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', gap: '4px' }}
              >
                <Dice5 size={14} /> Roll!
              </Button>
            </div>

            {generatedLoot && (
              <div style={{
                padding: '12px', background: 'rgba(10,10,40,0.6)',
                border: '1px solid #7C3AED', borderRadius: '8px',
              }}>
                <div style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 700, marginBottom: '8px' }}>
                  Generated Loot ({isHoard ? 'Hoard' : 'Individual'})
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#A78BFA' }}>{generatedLoot.gold} GP</span>
                  {generatedLoot.gems.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#22c55e' }}>
                      <Gem size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {generatedLoot.gems.length} gem{generatedLoot.gems.length > 1 ? 's' : ''}:
                      {generatedLoot.gems.map(g => ` ${g.name} (${g.value}gp)`).join(',')}
                    </span>
                  )}
                  {generatedLoot.items.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#A855F7' }}>
                      <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {generatedLoot.items.map(i => i.name).join(', ')}
                    </span>
                  )}
                </div>
                <Button
                  onClick={addGeneratedLoot}
                  data-testid="add-generated-loot-btn"
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                >
                  Add to Party Loot
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: players.length > 0 ? '1fr 280px' : '1fr', gap: '16px' }}>
        {/* Left Column - Party Inventory */}
        <div>
          {/* Inventory Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: '#7C3AED' }} /> Party Loot
              </h3>
              <p style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '2px' }}>
                {partyItems.length} unassigned • {totalWeight.toFixed(1)} lbs total
              </p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary" style={{ display: 'flex', gap: '6px', padding: '8px 12px', fontSize: '12px' }}>
              <Plus size={14} /> Add Item
            </Button>
          </div>

          {/* Drag hint */}
          {players.length > 0 && (
            <div style={{ background: 'rgba(124, 58, 237, 0.10)', border: '1px dashed #7C3AED', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GripVertical size={14} style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: '11px', color: '#D1D5DB' }}>Drag items to players on the right to assign them</span>
              <ArrowRight size={14} style={{ color: '#7C3AED' }} />
            </div>
          )}

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="input-glow" style={{ paddingLeft: '32px', fontSize: '12px', height: '32px' }} />
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => setFilterType('all')} style={{ padding: '6px 10px', borderRadius: '6px', border: `2px solid ${filterType === 'all' ? '#7C3AED' : 'rgba(124,58,237,0.28)'}`, background: filterType === 'all' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(31, 31, 35, 0.86)', color: filterType === 'all' ? '#7C3AED' : '#94a3b8', fontSize: '11px', fontWeight: '400', cursor: 'pointer' }}>All</button>
              {ITEM_TYPES.map(type => (
                <button key={type.id} onClick={() => setFilterType(type.id)} style={{ padding: '6px 8px', borderRadius: '6px', border: `2px solid ${filterType === type.id ? type.color : 'rgba(124,58,237,0.28)'}`, background: filterType === type.id ? `${type.color}30` : 'rgba(31, 31, 35, 0.86)', color: filterType === type.id ? type.color : '#94a3b8', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <type.icon size={12} />
                </button>
              ))}
            </div>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div className="glow-panel" style={{ marginBottom: '12px', borderColor: '#7C3AED', padding: '12px' }}>
              <h4 style={{ color: '#7C3AED', fontSize: '13px', fontWeight: '400', marginBottom: '12px' }}>Add New Item</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#D1D5DB', marginBottom: '2px' }}>Name *</label>
                  <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="input-glow" placeholder="Item name" style={{ fontSize: '12px', height: '32px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#D1D5DB', marginBottom: '2px' }}>Type</label>
                  <select value={newItem.item_type} onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })} className="input-glow" style={{ width: '100%', padding: '6px', fontSize: '12px', height: '32px' }}>
                    {ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#D1D5DB', marginBottom: '2px' }}>Qty</label>
                  <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })} className="input-glow" min="1" style={{ fontSize: '12px', height: '32px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#D1D5DB', marginBottom: '2px' }}>Value</label>
                  <Input value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: e.target.value })} className="input-glow" placeholder="50 gp" style={{ fontSize: '12px', height: '32px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newItem.is_magical} onChange={(e) => setNewItem({ ...newItem, is_magical: e.target.checked })} style={{ accentColor: '#A78BFA' }} />
                    Magic
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newItem.attunement_required} onChange={(e) => setNewItem({ ...newItem, attunement_required: e.target.checked })} style={{ accentColor: '#A78BFA' }} />
                    Attunement
                  </label>
                </div>
              </div>
              <RookFormFillPanel
                title="Ask Rook to fill this item"
                helperText="Describe the loot, clue, reward, or shop item. Import Rook's suggestions into the item boxes instead of copying one big text block."
                section="GM party inventory item"
                campaignId={campaignId}
                fields={[
                  { name: 'name', label: 'Item name', field_type: 'text' },
                  { name: 'item_type', label: 'Item type', field_type: 'select', choices: ITEM_TYPES.map(type => type.id) },
                  { name: 'value', label: 'Value', field_type: 'text' },
                  { name: 'description', label: 'Description', field_type: 'textarea' },
                  { name: 'notes', label: 'GM notes', field_type: 'textarea' },
                  { name: 'is_magical', label: 'Magical?', field_type: 'boolean' },
                  { name: 'attunement_required', label: 'Requires attunement?', field_type: 'boolean' },
                ]}
                currentValues={newItem}
                onApply={(patch) => setNewItem(prev => ({ ...prev, ...patch }))}
                placeholder="Example: Create a low-level magic dagger from a thieves guild cache, useful but not overpowered."
              />
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#D1D5DB', marginBottom: '2px' }}>Description</label>
                  <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="input-glow" placeholder="What does this item do or look like?" style={{ width: '100%', minHeight: '62px', fontSize: '12px', padding: '8px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#D1D5DB', marginBottom: '2px' }}>GM Notes</label>
                  <textarea value={newItem.notes} onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} className="input-glow" placeholder="Secret properties, origin, or who wants it back..." style={{ width: '100%', minHeight: '52px', fontSize: '12px', padding: '8px', resize: 'vertical' }} />
                </div>
                <ImageUploadPanel
                  title="Item image upload"
                  subtitle="Upload your own item artwork. AI image generation is not available."
                  selectedImage={newItem.image_url}
                  onSelectImage={(src) => setNewItem(prev => ({ ...prev, image_url: src }))}
                  onClearImage={() => setNewItem(prev => ({ ...prev, image_url: '' }))}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <Button onClick={handleAddItem} className="btn-primary" style={{ display: 'flex', gap: '4px', fontSize: '12px', padding: '6px 12px' }}>
                  <Plus size={12} /> Add
                </Button>
                <Button onClick={() => setShowAddForm(false)} className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Items List */}
          {partyItems.length === 0 ? (
            <div className="glow-panel" style={{ padding: '30px', textAlign: 'center' }}>
              <Package size={36} style={{ color: 'rgba(124,58,237,0.28)', margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '14px', color: '#ffffff', marginBottom: '6px', fontFamily: 'Montserrat', fontWeight: '400' }}>
                {items.length === 0 ? 'Inventory Empty' : 'All Items Assigned'}
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                {items.length === 0 ? 'Add loot from your adventures' : 'Drag items back to unassign'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {partyItems.map(item => {
                const typeInfo = getItemTypeInfo(item.item_type);
                const TypeIcon = typeInfo.icon;
                const isEditing = editingItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    className="card-glow"
                    style={{
                      padding: '10px 12px',
                      borderColor: item.is_magical ? '#A78BFA' : typeInfo.color,
                      background: item.is_magical ? 'rgba(234, 179, 8, 0.05)' : 'rgba(10, 10, 60, 0.7)',
                      cursor: isEditing ? 'default' : 'grab',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <GripVertical size={14} style={{ color: '#7C3AED', cursor: 'grab' }} />
                        <div style={{ width: '32px', height: '32px', borderRadius: 0, background: `${typeInfo.color}30`, border: `2px solid ${typeInfo.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <TypeIcon size={16} style={{ color: typeInfo.color }} />
                          )}
                        </div>
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: '400', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {item.name}
                            {item.is_magical && <Sparkles size={10} style={{ color: '#A78BFA' }} />}
                          </div>
                          <div style={{ fontSize: '10px', color: '#D1D5DB' }}>
                            {typeInfo.label} • Qty: {item.quantity}
                            {item.value && <span style={{ color: '#A78BFA' }}> • {item.value}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {campaignCharacters.length > 0 && (
                          <button
                            onClick={() => { setGrantingItemId(grantingItemId === item.id ? null : item.id); setGrantTargetId(''); }}
                            title="Give to character"
                            style={{ background: grantingItemId === item.id ? 'rgba(34,197,94,0.2)' : 'transparent', border: grantingItemId === item.id ? '1px solid #22c55e' : 'none', borderRadius: '4px', color: '#22c55e', cursor: 'pointer', padding: '4px' }}
                          >
                            <Gift size={12} />
                          </button>
                        )}
                        <button onClick={() => setEditingItem(item)} style={{ background: 'transparent', border: 'none', color: '#7C3AED', cursor: 'pointer', padding: '4px' }}><Edit2 size={12} /></button>
                        <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={12} /></button>
                      </div>
                    </div>

                    {grantingItemId === item.id && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '6px', padding: '8px 10px' }}>
                        <Gift size={13} style={{ color: '#22c55e' }} />
                        <select
                          value={grantTargetId}
                          onChange={e => setGrantTargetId(e.target.value)}
                          className="input-glow"
                          style={{ flex: 1, minWidth: '120px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
                        >
                          <option value="">Pick a character…</option>
                          {campaignCharacters.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.character_class || 'Unknown'} Lv {c.level || '?'})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleGrantItem(item)}
                          disabled={!grantTargetId}
                          style={{ background: grantTargetId ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)', border: `1px solid ${grantTargetId ? '#22c55e' : '#475569'}`, borderRadius: '4px', color: grantTargetId ? '#22c55e' : '#64748b', cursor: grantTargetId ? 'pointer' : 'default', padding: '4px 10px', fontSize: '11px', fontWeight: '400' }}
                        >
                          Send
                        </button>
                        <button
                          onClick={() => { setGrantingItemId(null); setGrantTargetId(''); }}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column - Players Drop Zones */}
        {players.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '14px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Users size={16} style={{ color: '#7C3AED' }} /> Assign to Player
            </h4>
            
            {players.map(player => {
              const playerItems = getPlayerItems(player.name);
              const isDropTarget = dragOverPlayer === player.id;
              
              return (
                <div
                  key={player.id}
                  onDragOver={(e) => handleDragOver(e, player.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, player)}
                  style={{
                    background: isDropTarget ? 'rgba(34, 197, 94, 0.15)' : 'rgba(10, 10, 40, 0.6)',
                    border: `2px ${isDropTarget ? 'solid' : 'dashed'} ${isDropTarget ? '#7C3AED' : 'rgba(124,58,237,0.28)'}`,
                    borderRadius: '10px',
                    padding: '10px',
                    transition: 'all 0.2s',
                    transform: isDropTarget ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isDropTarget ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: playerItems.length > 0 ? '8px' : '0' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '400', color: '#fff', fontSize: '13px' }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: '400', fontSize: '13px' }}>{player.name}</div>
                      <div style={{ fontSize: '10px', color: '#D1D5DB' }}>{player.class || 'Adventurer'} {player.level ? `Lv.${player.level}` : ''}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b' }}>
                      {playerItems.length} items
                    </div>
                  </div>
                  
                  {/* Player's assigned items */}
                  {playerItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(124,58,237,0.28)', paddingTop: '8px' }}>
                      {playerItems.map(item => {
                        const typeInfo = getItemTypeInfo(item.item_type);
                        const TypeIcon = typeInfo.icon;
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(31, 31, 35, 0.86)', borderRadius: '6px', padding: '6px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} style={{ width: 18, height: 18, objectFit: 'cover', border: `1px solid ${typeInfo.color}` }} />
                              ) : (
                                <TypeIcon size={12} style={{ color: typeInfo.color }} />
                              )}
                              <span style={{ fontSize: '11px', color: '#fff' }}>{item.name}</span>
                              {item.is_magical && <Sparkles size={8} style={{ color: '#A78BFA' }} />}
                            </div>
                            <button
                              onClick={() => handleUnassignItem(item.id)}
                              title="Return to party loot"
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', fontSize: '10px' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Drop hint when dragging */}
                  {draggedItem && !isDropTarget && playerItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '8px', color: '#64748b', fontSize: '10px', fontStyle: 'italic' }}>
                      Drop item here
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PartyInventory;
