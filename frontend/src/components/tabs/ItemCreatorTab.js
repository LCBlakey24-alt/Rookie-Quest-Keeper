import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, Plus, Trash2, Edit2, Save, X, Sparkles, Loader,
  Sword, Shield, FlaskConical, ScrollText, Gem, Wand2, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapon', icon: Sword, color: '#ef4444' },
  { id: 'armor', label: 'Armor', icon: Shield, color: '#4a7dff' },
  { id: 'potion', label: 'Potion', icon: FlaskConical, color: '#22c55e' },
  { id: 'scroll', label: 'Scroll', icon: ScrollText, color: '#a855f7' },
  { id: 'wondrous', label: 'Wondrous Item', icon: Wand2, color: '#eab308' },
  { id: 'ring', label: 'Ring', icon: Gem, color: '#67e8f9' },
  { id: 'misc', label: 'Misc', icon: Package, color: '#94a3b8' },
];

const RARITIES = [
  { id: 'common', label: 'Common', color: '#94a3b8' },
  { id: 'uncommon', label: 'Uncommon', color: '#22c55e' },
  { id: 'rare', label: 'Rare', color: '#4a7dff' },
  { id: 'very_rare', label: 'Very Rare', color: '#a855f7' },
  { id: 'legendary', label: 'Legendary', color: '#f97316' },
  { id: 'artifact', label: 'Artifact', color: '#ef4444' },
];

function ItemCreatorTab({ campaignId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [newItem, setNewItem] = useState({
    name: '',
    item_type: 'weapon',
    rarity: 'common',
    description: '',
    properties: '',
    attunement: false,
    value: '',
    weight: 0
  });

  useEffect(() => {
    fetchItems();
  }, [campaignId]);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/campaigns/${campaignId}/custom-items`);
      setItems(res.data);
    } catch (error) {
      // If endpoint doesn't exist yet, start with empty
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.name.trim()) {
      toast.error('Enter item name');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        const res = await axios.put(`${API}/campaigns/${campaignId}/custom-items/${editingItem.id}`, newItem);
        setItems(items.map(i => i.id === editingItem.id ? res.data : i));
        toast.success('Item updated!');
      } else {
        const res = await axios.post(`${API}/campaigns/${campaignId}/custom-items`, newItem);
        setItems([res.data, ...items]);
        toast.success('Item created!');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/custom-items/${itemId}`);
      setItems(items.filter(i => i.id !== itemId));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      item_type: item.item_type,
      rarity: item.rarity,
      description: item.description || '',
      properties: item.properties || '',
      attunement: item.attunement || false,
      value: item.value || '',
      weight: item.weight || 0
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setNewItem({
      name: '', item_type: 'weapon', rarity: 'common',
      description: '', properties: '', attunement: false, value: '', weight: 0
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const generateItemWithAI = async () => {
    setGenerating(true);
    const prompt = `Generate a unique fantasy ${newItem.rarity} ${ITEM_TYPES.find(t => t.id === newItem.item_type)?.label || 'item'} for a tabletop RPG campaign.

Respond with JSON only:
{
  "name": "Creative item name",
  "description": "2-3 sentences describing the item's appearance and history",
  "properties": "Mechanical properties and effects (e.g., +1 to attack, grants advantage on saves, etc.)",
  "value": "Estimated gold value (e.g., 500 gp)",
  "attunement": true or false
}`;

    try {
      const res = await axios.post(`${API}/ai/generate`, { prompt, generation_type: 'item' });
      const jsonMatch = res.data.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const generated = JSON.parse(jsonMatch[0]);
        setNewItem(prev => ({
          ...prev,
          name: generated.name || prev.name,
          description: generated.description || '',
          properties: generated.properties || '',
          value: generated.value || '',
          attunement: generated.attunement || false
        }));
        toast.success('Item generated!');
      }
    } catch (error) {
      toast.error('Failed to generate item');
    } finally {
      setGenerating(false);
    }
  };

  const addToInventory = async (item) => {
    try {
      await axios.post(`${API}/campaigns/${campaignId}/inventory`, {
        name: item.name,
        quantity: 1,
        item_type: item.item_type,
        description: item.description,
        value: item.value,
        weight: item.weight,
        is_magical: item.rarity !== 'common',
        attunement_required: item.attunement,
        notes: item.properties
      });
      toast.success(`${item.name} added to party inventory!`);
    } catch (error) {
      toast.error('Failed to add to inventory');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeInfo = (type) => ITEM_TYPES.find(t => t.id === type) || ITEM_TYPES[6];
  const getRarityInfo = (rarity) => RARITIES.find(r => r.id === rarity) || RARITIES[0];

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wand2 size={28} style={{ color: '#eab308' }} />
          <div>
            <h2 style={{ fontSize: '22px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800' }}>Item Creator</h2>
            <p style={{ fontSize: '13px', color: '#67e8f9' }}>Create custom magic items and equipment</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
          <Plus size={18} /> Create Item
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="glow-panel" style={{ marginBottom: '24px', borderColor: '#eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', color: '#eab308', fontWeight: '700' }}>
              {editingItem ? 'Edit Item' : 'Create New Item'}
            </h3>
            <button onClick={resetForm} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Item Name *</label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="input-glow" placeholder="Flametongue Sword" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Type</label>
              <select value={newItem.item_type} onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })} className="input-glow" style={{ width: '100%', padding: '10px' }}>
                {ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Rarity</label>
              <select value={newItem.rarity} onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value })} className="input-glow" style={{ width: '100%', padding: '10px' }}>
                {RARITIES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Value</label>
              <Input value={newItem.value} onChange={(e) => setNewItem({ ...newItem, value: e.target.value })} className="input-glow" placeholder="500 gp" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Weight (lbs)</label>
              <Input type="number" value={newItem.weight} onChange={(e) => setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })} className="input-glow" step="0.1" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={newItem.attunement} onChange={(e) => setNewItem({ ...newItem, attunement: e.target.checked })} style={{ accentColor: '#a855f7', width: '18px', height: '18px' }} />
                Requires Attunement
              </label>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Description</label>
            <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="textarea-glow" style={{ minHeight: '80px' }} placeholder="Describe the item's appearance, history, and lore..." />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#67e8f9', marginBottom: '4px', fontWeight: '600' }}>Properties & Effects</label>
            <textarea value={newItem.properties} onChange={(e) => setNewItem({ ...newItem, properties: e.target.value })} className="textarea-glow" style={{ minHeight: '80px' }} placeholder="Mechanical effects: +1 to attack and damage rolls, deals an extra 2d6 fire damage on hit..." />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <Button onClick={handleSaveItem} disabled={saving} className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {editingItem ? 'Update Item' : 'Save Item'}
            </Button>
            <Button onClick={generateItemWithAI} disabled={generating} className="btn-outline" style={{ display: 'flex', gap: '8px', borderColor: '#eab308', color: '#eab308' }}>
              {generating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generate with AI
            </Button>
            <Button onClick={resetForm} className="btn-outline">Cancel</Button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search items..." className="input-glow" style={{ paddingLeft: '40px' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterType('all')} style={{ padding: '8px 14px', borderRadius: '8px', border: `2px solid ${filterType === 'all' ? '#22c55e' : '#1e40af'}`, background: filterType === 'all' ? 'rgba(34, 197, 94, 0.2)' : 'transparent', color: filterType === 'all' ? '#22c55e' : '#94a3b8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>All</button>
          {ITEM_TYPES.map(type => (
            <button key={type.id} onClick={() => setFilterType(type.id)} style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${filterType === type.id ? type.color : '#1e40af'}`, background: filterType === type.id ? `${type.color}30` : 'transparent', color: filterType === type.id ? type.color : '#94a3b8', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <type.icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="glow-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Wand2 size={48} style={{ color: '#1e40af', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '8px' }}>
            {items.length === 0 ? 'No Custom Items' : 'No Items Found'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            {items.length === 0 ? 'Create your first custom item to get started' : 'Try a different search or filter'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredItems.map(item => {
            const typeInfo = getTypeInfo(item.item_type);
            const rarityInfo = getRarityInfo(item.rarity);
            const TypeIcon = typeInfo.icon;
            
            return (
              <div key={item.id} className="card-glow" style={{ padding: '16px', borderColor: rarityInfo.color }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${typeInfo.color}30`, border: `2px solid ${typeInfo.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TypeIcon size={22} style={{ color: typeInfo.color }} />
                    </div>
                    <div>
                      <h4 style={{ color: '#ffffff', fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{item.name}</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${rarityInfo.color}30`, color: rarityInfo.color, fontWeight: '600' }}>
                          {rarityInfo.label}
                        </span>
                        <span style={{ fontSize: '10px', color: '#67e8f9' }}>{typeInfo.label}</span>
                        {item.attunement && <span style={{ fontSize: '10px', color: '#a855f7' }}>Attunement</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleEditItem(item)} style={{ background: 'transparent', border: 'none', color: '#4a7dff', cursor: 'pointer', padding: '4px' }}><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                  </div>
                </div>

                {item.description && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', lineHeight: '1.5' }}>{item.description}</p>
                )}

                {item.properties && (
                  <div style={{ background: 'rgba(10, 10, 40, 0.5)', border: '1px solid #1e40af', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#67e8f9', lineHeight: '1.5' }}>{item.properties}</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    {item.value && <span style={{ color: '#eab308' }}>{item.value}</span>}
                    {item.weight > 0 && <span style={{ color: '#64748b' }}>{item.weight} lbs</span>}
                  </div>
                  <Button onClick={() => addToInventory(item)} className="btn-outline" style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', gap: '4px' }}>
                    <Plus size={12} /> Add to Inventory
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ItemCreatorTab;
