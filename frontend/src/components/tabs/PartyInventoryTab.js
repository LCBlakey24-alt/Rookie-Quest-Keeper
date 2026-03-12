import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Package, Plus, Trash2, Edit, Save, X, Gem, Sword, ScrollText, Sparkles } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const ITEM_CATEGORIES = [
  { id: 'weapon', label: 'Weapons', icon: Sword, color: '#ef4444' },
  { id: 'armor', label: 'Armor', icon: Package, color: '#4a7dff' },
  { id: 'potion', label: 'Potions', icon: Sparkles, color: '#22c55e' },
  { id: 'scroll', label: 'Scrolls', icon: ScrollText, color: '#a855f7' },
  { id: 'gem', label: 'Gems & Valuables', icon: Gem, color: '#eab308' },
  { id: 'misc', label: 'Miscellaneous', icon: Package, color: '#64748b' },
];

function PartyInventoryTab({ campaignId }) {
  const [inventory, setInventory] = useState({
    gold: 0,
    silver: 0,
    copper: 0,
    platinum: 0,
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'misc', quantity: 1, value: '', description: '', magical: false });
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [currencyEdit, setCurrencyEdit] = useState({ type: '', amount: '' });

  useEffect(() => {
    fetchInventory();
  }, [campaignId]);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/inventory`);
      setInventory(response.data || { gold: 0, silver: 0, copper: 0, platinum: 0, items: [] });
    } catch (error) {
      // Initialize empty inventory if not found
      setInventory({ gold: 0, silver: 0, copper: 0, platinum: 0, items: [] });
    } finally {
      setLoading(false);
    }
  };

  const saveInventory = async (newInventory) => {
    try {
      await axios.put(`${API}/campaigns/${campaignId}/inventory`, newInventory);
      setInventory(newInventory);
    } catch (error) {
      toast.error('Failed to save inventory');
    }
  };

  const updateCurrency = (type, change) => {
    const newInventory = {
      ...inventory,
      [type]: Math.max(0, (inventory[type] || 0) + change)
    };
    saveInventory(newInventory);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${change > 0 ? 'added' : 'removed'}`);
  };

  const setCurrency = () => {
    if (!currencyEdit.type || currencyEdit.amount === '') return;
    const newInventory = {
      ...inventory,
      [currencyEdit.type]: Math.max(0, parseInt(currencyEdit.amount) || 0)
    };
    saveInventory(newInventory);
    setCurrencyEdit({ type: '', amount: '' });
    toast.success('Currency updated');
  };

  const addItem = () => {
    if (!newItem.name.trim()) {
      toast.error('Enter item name');
      return;
    }

    const item = {
      id: `item-${Date.now()}`,
      ...newItem,
      quantity: parseInt(newItem.quantity) || 1,
      value: newItem.value || null,
      addedAt: new Date().toISOString()
    };

    const newInventory = {
      ...inventory,
      items: [...inventory.items, item]
    };
    saveInventory(newInventory);
    setNewItem({ name: '', category: 'misc', quantity: 1, value: '', description: '', magical: false });
    setShowAddItem(false);
    toast.success(`Added ${item.name}`);
  };

  const removeItem = (itemId) => {
    const newInventory = {
      ...inventory,
      items: inventory.items.filter(i => i.id !== itemId)
    };
    saveInventory(newInventory);
    toast.success('Item removed');
  };

  const updateItem = () => {
    if (!editItem || !editItem.name.trim()) return;
    
    const newInventory = {
      ...inventory,
      items: inventory.items.map(i => i.id === editingId ? { ...editItem, quantity: parseInt(editItem.quantity) || 1 } : i)
    };
    saveInventory(newInventory);
    setEditingId(null);
    setEditItem(null);
    toast.success('Item updated');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditItem({ ...item });
  };

  const getTotalValue = () => {
    const itemValue = inventory.items.reduce((sum, item) => {
      const val = parseFloat(item.value) || 0;
      return sum + (val * (item.quantity || 1));
    }, 0);
    const coinValue = 
      (inventory.platinum || 0) * 10 +
      (inventory.gold || 0) +
      (inventory.silver || 0) * 0.1 +
      (inventory.copper || 0) * 0.01;
    return Math.round((itemValue + coinValue) * 100) / 100;
  };

  if (loading) return <div className="loading-spinner"></div>;

  const groupedItems = ITEM_CATEGORIES.map(cat => ({
    ...cat,
    items: inventory.items.filter(item => item.category === cat.id)
  })).filter(cat => cat.items.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', color: '#ffffff', fontFamily: 'Cityworm, sans-serif', fontWeight: '800' }}>
            Party Inventory
          </h2>
          <p style={{ fontSize: '14px', color: '#67e8f9', marginTop: '4px' }}>
            Total Value: ~{getTotalValue()} gp
          </p>
        </div>
        <Button onClick={() => setShowAddItem(!showAddItem)} className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
          <Plus size={18} />
          Add Item
        </Button>
      </div>

      {/* Currency Section */}
      <div className="glow-panel" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Coins size={22} style={{ color: '#eab308' }} />
          Party Funds
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {[
            { type: 'platinum', label: 'PP', color: '#e5e4e2' },
            { type: 'gold', label: 'GP', color: '#ffd700' },
            { type: 'silver', label: 'SP', color: '#c0c0c0' },
            { type: 'copper', label: 'CP', color: '#cd7f32' }
          ].map(coin => (
            <div key={coin.type} style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: coin.color, marginBottom: '8px', fontWeight: '600' }}>{coin.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', fontFamily: 'Montserrat', marginBottom: '10px' }}>
                {inventory[coin.type] || 0}
              </div>
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                <button onClick={() => updateCurrency(coin.type, -10)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>-10</button>
                <button onClick={() => updateCurrency(coin.type, -1)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>-1</button>
                <button onClick={() => updateCurrency(coin.type, 1)} style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: '6px', color: '#22c55e', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>+1</button>
                <button onClick={() => updateCurrency(coin.type, 10)} style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: '6px', color: '#22c55e', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>+10</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={currencyEdit.type}
            onChange={(e) => setCurrencyEdit({ ...currencyEdit, type: e.target.value })}
            className="input-glow"
            style={{ flex: 1 }}
          >
            <option value="">Set currency...</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="copper">Copper</option>
          </select>
          <Input
            type="number"
            value={currencyEdit.amount}
            onChange={(e) => setCurrencyEdit({ ...currencyEdit, amount: e.target.value })}
            placeholder="Amount"
            className="input-glow"
            style={{ width: '100px' }}
          />
          <Button onClick={setCurrency} className="btn-primary" disabled={!currencyEdit.type}>Set</Button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddItem && (
        <div className="glow-panel" style={{ marginBottom: '24px', borderColor: '#22c55e' }}>
          <h3 style={{ fontSize: '16px', color: '#22c55e', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '16px' }}>Add New Item</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#67e8f9', fontWeight: '600' }}>Item Name *</label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g., +1 Longsword"
                className="input-glow"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#67e8f9', fontWeight: '600' }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="input-glow"
              >
                {ITEM_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#67e8f9', fontWeight: '600' }}>Quantity</label>
              <Input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                min="1"
                className="input-glow"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#67e8f9', fontWeight: '600' }}>Value (gp)</label>
              <Input
                type="number"
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                placeholder="Optional"
                className="input-glow"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#67e8f9', fontWeight: '600' }}>Description</label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Item description or effects"
                className="input-glow"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#a855f7', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={newItem.magical}
                  onChange={(e) => setNewItem({ ...newItem, magical: e.target.checked })}
                  style={{ accentColor: '#a855f7' }}
                />
                <Sparkles size={16} />
                Magical
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowAddItem(false)} className="btn-outline">Cancel</Button>
            <Button onClick={addItem} className="btn-primary">Add Item</Button>
          </div>
        </div>
      )}

      {/* Items by Category */}
      {groupedItems.length === 0 ? (
        <div className="glow-panel" style={{ padding: '50px', textAlign: 'center' }}>
          <Package size={48} style={{ color: '#1e40af', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', color: '#ffffff', marginBottom: '8px', fontFamily: 'Montserrat', fontWeight: '700' }}>No Items</h3>
          <p style={{ color: '#94a3b8' }}>Add items to track your party's loot</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedItems.map(category => (
            <div key={category.id} className="glow-panel">
              <h3 style={{ fontSize: '16px', color: category.color, fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <category.icon size={18} />
                {category.label} ({category.items.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {category.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(10, 10, 40, 0.6)',
                      border: `2px solid ${item.magical ? '#a855f7' : '#1e40af'}`,
                      borderRadius: '10px',
                      padding: '12px',
                      boxShadow: item.magical ? '0 0 15px rgba(168, 85, 247, 0.2)' : 'none'
                    }}
                  >
                    {editingId === item.id ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                        <Input
                          value={editItem.name}
                          onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                          className="input-glow"
                          style={{ fontSize: '13px' }}
                        />
                        <Input
                          type="number"
                          value={editItem.quantity}
                          onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
                          className="input-glow"
                          style={{ fontSize: '13px' }}
                        />
                        <Input
                          type="number"
                          value={editItem.value || ''}
                          onChange={(e) => setEditItem({ ...editItem, value: e.target.value })}
                          placeholder="gp"
                          className="input-glow"
                          style={{ fontSize: '13px' }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button onClick={updateItem} className="btn-icon" style={{ padding: '6px', color: '#22c55e' }}><Save size={14} /></Button>
                          <Button onClick={() => { setEditingId(null); setEditItem(null); }} className="btn-icon" style={{ padding: '6px' }}><X size={14} /></Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px' }}>{item.name}</span>
                            {item.magical && <Sparkles size={14} style={{ color: '#a855f7' }} />}
                            {item.quantity > 1 && (
                              <span style={{ background: 'rgba(74, 125, 255, 0.3)', color: '#4a7dff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                          {item.description && <p style={{ fontSize: '12px', color: '#94a3b8' }}>{item.description}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.value && (
                            <span style={{ color: '#eab308', fontWeight: '600', fontSize: '13px' }}>
                              {item.value} gp
                            </span>
                          )}
                          <Button onClick={() => startEdit(item)} className="btn-icon" style={{ padding: '6px' }}><Edit size={14} /></Button>
                          <Button onClick={() => removeItem(item.id)} className="btn-icon" style={{ padding: '6px', color: '#ef4444' }}><Trash2 size={14} /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PartyInventoryTab;
