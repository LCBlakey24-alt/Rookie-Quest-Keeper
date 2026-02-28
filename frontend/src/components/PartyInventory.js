import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, Plus, Trash2, Edit2, Save, X, Coins, Sparkles, 
  Sword, Shield, FlaskConical, ScrollText, Gem, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapon', icon: Sword, color: '#ef4444' },
  { id: 'armor', label: 'Armor', icon: Shield, color: '#4a7dff' },
  { id: 'potion', label: 'Potion', icon: FlaskConical, color: '#22c55e' },
  { id: 'scroll', label: 'Scroll', icon: ScrollText, color: '#a855f7' },
  { id: 'magic_item', label: 'Magic Item', icon: Sparkles, color: '#eab308' },
  { id: 'misc', label: 'Misc', icon: Package, color: '#64748b' },
];

function PartyInventory({ campaignId }) {
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState({ copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
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
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [itemsRes, currencyRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/inventory`),
        axios.get(`${API}/campaigns/${campaignId}/currency`)
      ]);
      setItems(itemsRes.data);
      setCurrency(currencyRes.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error('Enter an item name');
      return;
    }
    try {
      const res = await axios.post(`${API}/campaigns/${campaignId}/inventory`, newItem);
      setItems([res.data, ...items]);
      setNewItem({
        name: '', quantity: 1, item_type: 'misc', description: '',
        value: '', weight: 0, is_magical: false, attunement_required: false,
        attuned_to: '', notes: ''
      });
      setShowAddForm(false);
      toast.success('Item added!');
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const res = await axios.put(`${API}/campaigns/${campaignId}/inventory/${itemId}`, updates);
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
      await axios.delete(`${API}/campaigns/${campaignId}/inventory/${itemId}`);
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
      await axios.put(`${API}/campaigns/${campaignId}/currency`, { [type]: newCurrency[type] });
    } catch (error) {
      toast.error('Failed to update currency');
    }
  };

  const adjustCurrency = async (type, amount) => {
    const newValue = Math.max(0, (currency[type] || 0) + amount);
    handleCurrencyChange(type, newValue);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  const getItemTypeInfo = (type) => ITEM_TYPES.find(t => t.id === type) || ITEM_TYPES[5];

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0);

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      {/* Currency Section */}
      <div className="glow-panel" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coins size={20} style={{ color: '#eab308' }} /> Party Treasury
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { key: 'platinum', label: 'PP', color: '#e5e7eb' },
            { key: 'gold', label: 'GP', color: '#eab308' },
            { key: 'electrum', label: 'EP', color: '#94a3b8' },
            { key: 'silver', label: 'SP', color: '#cbd5e1' },
            { key: 'copper', label: 'CP', color: '#f97316' }
          ].map(coin => (
            <div key={coin.key} style={{ background: 'rgba(10, 10, 40, 0.5)', border: '2px solid #1e40af', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: coin.color, fontWeight: '700', marginBottom: '6px' }}>{coin.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <button
                  onClick={() => adjustCurrency(coin.key, -1)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', width: '22px', height: '22px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
                >-</button>
                <input
                  type="number"
                  value={currency[coin.key] || 0}
                  onChange={(e) => handleCurrencyChange(coin.key, e.target.value)}
                  style={{ width: '60px', textAlign: 'center', background: 'rgba(10, 10, 40, 0.6)', border: '1px solid #1e40af', borderRadius: '6px', color: '#fff', padding: '4px', fontSize: '14px', fontWeight: '700' }}
                />
                <button
                  onClick={() => adjustCurrency(coin.key, 1)}
                  style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: '4px', color: '#22c55e', width: '22px', height: '22px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
                >+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={22} style={{ color: '#22c55e' }} /> Party Inventory
          </h3>
          <p style={{ fontSize: '12px', color: '#67e8f9', marginTop: '4px' }}>
            {items.length} items • {totalWeight.toFixed(1)} lbs total
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary" style={{ display: 'flex', gap: '6px' }}>
          <Plus size={16} /> Add Item
        </Button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="input-glow"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `2px solid ${filterType === 'all' ? '#22c55e' : '#1e40af'}`,
              background: filterType === 'all' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.5)',
              color: filterType === 'all' ? '#22c55e' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >All</button>
          {ITEM_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `2px solid ${filterType === type.id ? type.color : '#1e40af'}`,
                background: filterType === type.id ? `${type.color}30` : 'rgba(10, 10, 40, 0.5)',
                color: filterType === type.id ? type.color : '#94a3b8',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <type.icon size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="glow-panel" style={{ marginBottom: '20px', borderColor: '#22c55e' }}>
          <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Add New Item</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px' }}>Name *</label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="input-glow" placeholder="Item name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px' }}>Type</label>
              <select
                value={newItem.item_type}
                onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                className="input-glow"
                style={{ width: '100%', padding: '8px' }}
              >
                {ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px' }}>Quantity</label>
              <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })} className="input-glow" min="1" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px' }}>Value</label>
              <Input value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: e.target.value })} className="input-glow" placeholder="e.g., 50 gp" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px' }}>Weight (lbs)</label>
              <Input type="number" value={newItem.weight} onChange={(e) => setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })} className="input-glow" step="0.1" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={newItem.is_magical} onChange={(e) => setNewItem({ ...newItem, is_magical: e.target.checked })} style={{ accentColor: '#eab308' }} />
                Magical
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={newItem.attunement_required} onChange={(e) => setNewItem({ ...newItem, attunement_required: e.target.checked })} style={{ accentColor: '#a855f7' }} />
                Attunement
              </label>
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px' }}>Description</label>
            <textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="textarea-glow"
              style={{ minHeight: '60px' }}
              placeholder="Item description..."
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Button onClick={handleAddItem} className="btn-primary" style={{ display: 'flex', gap: '6px' }}>
              <Plus size={14} /> Add Item
            </Button>
            <Button onClick={() => setShowAddForm(false)} className="btn-outline">Cancel</Button>
          </div>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="glow-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Package size={48} style={{ color: '#1e40af', margin: '0 auto 16px' }} />
          <h4 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '8px', fontFamily: 'Montserrat', fontWeight: '700' }}>
            {items.length === 0 ? 'Inventory Empty' : 'No Items Found'}
          </h4>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            {items.length === 0 ? 'Add items your party collects during adventures' : 'Try a different search or filter'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filteredItems.map(item => {
            const typeInfo = getItemTypeInfo(item.item_type);
            const TypeIcon = typeInfo.icon;
            const isEditing = editingItem?.id === item.id;

            return (
              <div
                key={item.id}
                className="card-glow"
                style={{
                  padding: '14px',
                  borderColor: item.is_magical ? '#eab308' : typeInfo.color,
                  background: item.is_magical ? 'rgba(234, 179, 8, 0.05)' : 'rgba(10, 10, 60, 0.7)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: `${typeInfo.color}30`,
                      border: `2px solid ${typeInfo.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <TypeIcon size={18} style={{ color: typeInfo.color }} />
                    </div>
                    <div>
                      {isEditing ? (
                        <Input
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="input-glow"
                          style={{ fontSize: '14px', padding: '4px 8px' }}
                        />
                      ) : (
                        <h5 style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item.name}
                          {item.is_magical && <Sparkles size={12} style={{ color: '#eab308' }} />}
                        </h5>
                      )}
                      <div style={{ fontSize: '11px', color: '#67e8f9' }}>
                        {typeInfo.label}
                        {item.attunement_required && <span style={{ color: '#a855f7' }}> • Attunement</span>}
                        {item.attuned_to && <span style={{ color: '#22c55e' }}> ({item.attuned_to})</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => handleUpdateItem(item.id, editingItem)} style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', padding: '4px' }}><Save size={14} /></button>
                        <button onClick={() => setEditingItem(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingItem({ ...item })} style={{ background: 'transparent', border: 'none', color: '#4a7dff', cursor: 'pointer', padding: '4px' }}><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', lineHeight: '1.4' }}>
                    {item.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Qty:</span>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editingItem.quantity}
                        onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                        className="input-glow"
                        style={{ width: '50px', padding: '2px 6px', fontSize: '12px', textAlign: 'center' }}
                        min="1"
                      />
                    ) : (
                      <span style={{ color: '#fff', fontWeight: '700', fontSize: '13px' }}>{item.quantity}</span>
                    )}
                  </div>
                  {item.value && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Coins size={12} style={{ color: '#eab308' }} />
                      <span style={{ color: '#eab308', fontSize: '12px', fontWeight: '600' }}>{item.value}</span>
                    </div>
                  )}
                  {item.weight > 0 && (
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{item.weight} lbs</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PartyInventory;
