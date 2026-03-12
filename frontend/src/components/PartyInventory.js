import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Coins,
  Sparkles,
  Sword,
  Shield,
  FlaskConical,
  ScrollText,
  Search,
  Users,
  GripVertical,
  ArrowRight,
  X,
  Backpack
} from 'lucide-react';
import '../App.css';
import '../styles/designSystem.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapon', icon: Sword, accent: '#E74C3C' },
  { id: 'armor', label: 'Armor', icon: Shield, accent: '#3DA9FC' },
  { id: 'potion', label: 'Potion', icon: FlaskConical, accent: '#2ECC71' },
  { id: 'scroll', label: 'Scroll', icon: ScrollText, accent: '#7A5AF8' },
  { id: 'magic_item', label: 'Magic Item', icon: Sparkles, accent: '#E7B94C' },
  { id: 'misc', label: 'Misc', icon: Package, accent: '#AAB2C8' }
];

const EMPTY_ITEM = {
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
};

function PartyInventory({ campaignId, players = [] }) {
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState({
    copper: 0,
    silver: 0,
    electrum: 0,
    gold: 0,
    platinum: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftItem, setDraftItem] = useState(EMPTY_ITEM);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverPlayer, setDragOverPlayer] = useState(null);

  useEffect(() => {
    if (campaignId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, currencyRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/inventory`),
        axios.get(`${API}/campaigns/${campaignId}/currency`)
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setCurrency(currencyRes.data || {});
    } catch (error) {
      toast.error('Failed to load party inventory');
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeInfo = (type) =>
    ITEM_TYPES.find((t) => t.id === type) || ITEM_TYPES[ITEM_TYPES.length - 1];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || item.item_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, filterType]);

  const partyItems = filteredItems.filter((item) => !item.attuned_to);
  const getPlayerItems = (playerName) =>
    items.filter((item) => item.attuned_to === playerName);

  const totalWeight = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1),
      0
    );
  }, [items]);

  const totalGoldValue = useMemo(() => {
    const gold = Number(currency.gold || 0);
    const platinum = Number(currency.platinum || 0) * 10;
    const electrum = Number(currency.electrum || 0) * 0.5;
    const silver = Number(currency.silver || 0) * 0.1;
    const copper = Number(currency.copper || 0) * 0.01;
    return (gold + platinum + electrum + silver + copper).toFixed(2);
  }, [currency]);

  const resetNewItem = () => setNewItem(EMPTY_ITEM);

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error('Enter an item name');
      return;
    }

    try {
      const res = await axios.post(`${API}/campaigns/${campaignId}/inventory`, {
        ...newItem,
        quantity: Number(newItem.quantity) || 1,
        weight: Number(newItem.weight) || 0
      });
      setItems((prev) => [res.data, ...prev]);
      resetNewItem();
      setShowAddForm(false);
      toast.success('Item added');
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setDraftItem({
      name: item.name || '',
      quantity: Number(item.quantity) || 1,
      item_type: item.item_type || 'misc',
      description: item.description || '',
      value: item.value || '',
      weight: Number(item.weight) || 0,
      is_magical: !!item.is_magical,
      attunement_required: !!item.attunement_required,
      attuned_to: item.attuned_to || '',
      notes: item.notes || ''
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setDraftItem(EMPTY_ITEM);
  };

  const handleUpdateItem = async (itemId) => {
    try {
      const res = await axios.put(`${API}/campaigns/${campaignId}/inventory/${itemId}`, {
        ...draftItem,
        quantity: Number(draftItem.quantity) || 1,
        weight: Number(draftItem.weight) || 0
      });

      setItems((prev) => prev.map((i) => (i.id === itemId ? res.data : i)));
      cancelEditing();
      toast.success('Item updated');
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;

    try {
      await axios.delete(`${API}/campaigns/${campaignId}/inventory/${itemId}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleCurrencyChange = async (type, value) => {
    const nextValue = Math.max(0, parseInt(value, 10) || 0);
    const nextCurrency = { ...currency, [type]: nextValue };
    setCurrency(nextCurrency);

    try {
      await axios.put(`${API}/campaigns/${campaignId}/currency`, { [type]: nextValue });
    } catch (error) {
      toast.error('Failed to update currency');
    }
  };

  const adjustCurrency = async (type, amount) => {
    const nextValue = Math.max(0, (currency[type] || 0) + amount);
    handleCurrencyChange(type, nextValue);
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverPlayer(null);
  };

  const handleDragOver = (e, playerId) => {
    e.preventDefault();
    setDragOverPlayer(playerId);
  };

  const handleDrop = async (e, player) => {
    e.preventDefault();
    setDragOverPlayer(null);
    if (!draggedItem) return;

    try {
      const res = await axios.put(`${API}/campaigns/${campaignId}/inventory/${draggedItem.id}`, {
        attuned_to: player.name
      });
      setItems((prev) => prev.map((i) => (i.id === draggedItem.id ? res.data : i)));
      toast.success(`${draggedItem.name} assigned to ${player.name}`);
    } catch (error) {
      toast.error('Failed to assign item');
    } finally {
      setDraggedItem(null);
    }
  };

  const handleUnassignItem = async (itemId) => {
    try {
      const res = await axios.put(`${API}/campaigns/${campaignId}/inventory/${itemId}`, {
        attuned_to: ''
      });
      setItems((prev) => prev.map((i) => (i.id === itemId ? res.data : i)));
      toast.success('Item returned to party inventory');
    } catch (error) {
      toast.error('Failed to unassign item');
    }
  };

  const panelStyle = {
    background: 'var(--rq-bg-panel)',
    border: '1px solid rgba(231,185,76,0.16)',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.22)'
  };

  const cardStyle = {
    background: 'var(--rq-bg-panel-soft)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '14px'
  };

  const smallButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'var(--rq-bg-panel-soft)',
    color: 'var(--rq-text-main)',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  if (loading) {
    return (
      <div className="rq-panel" style={{ textAlign: 'center', padding: '32px' }}>
        <div className="rq-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
          Loading Party Inventory
        </div>
        <div className="rq-muted">Gathering loot, carried gear, and treasury.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={panelStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h2 className="rq-title" style={{ margin: 0, fontSize: '28px' }}>
              Party Inventory
            </h2>
            <p className="rq-muted" style={{ marginTop: '8px', marginBottom: 0 }}>
              Manage shared loot, assign items to players, and keep the party treasury organized.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button className="rq-button-primary" onClick={() => setShowAddForm((prev) => !prev)}>
              <Plus size={14} style={{ marginRight: '6px' }} />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
            flexWrap: 'wrap'
          }}
        >
          <Coins size={18} style={{ color: 'var(--rq-gold)' }} />
          <h3 className="rq-title" style={{ margin: 0, fontSize: '20px' }}>
            Party Treasury
          </h3>
          <span className="rq-muted">Approx. total value: {totalGoldValue} gp</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '12px'
          }}
        >
          {[
            { key: 'platinum', label: 'PP', accent: '#E6E8F0' },
            { key: 'gold', label: 'GP', accent: '#E7B94C' },
            { key: 'electrum', label: 'EP', accent: '#AAB2C8' },
            { key: 'silver', label: 'SP', accent: '#D8DEE9' },
            { key: 'copper', label: 'CP', accent: '#F97316' }
          ].map((coin) => (
            <div key={coin.key} style={cardStyle}>
              <div className="rq-muted" style={{ marginBottom: '10px' }}>
                {coin.label}
              </div>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}
              >
                <button
                  onClick={() => adjustCurrency(coin.key, -1)}
                  style={{ ...smallButtonStyle, color: '#E74C3C' }}
                >
                  −
                </button>

                <input
                  type="number"
                  value={currency[coin.key] || 0}
                  onChange={(e) => handleCurrencyChange(coin.key, e.target.value)}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.18)',
                    border: `1px solid ${coin.accent}33`,
                    color: coin.accent,
                    borderRadius: '8px',
                    padding: '8px',
                    fontWeight: 700
                  }}
                />

                <button
                  onClick={() => adjustCurrency(coin.key, 1)}
                  style={{ ...smallButtonStyle, color: '#2ECC71' }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: players.length > 0 ? '1.4fr 0.9fr' : '1fr',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={panelStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <div>
                <h3 className="rq-title" style={{ margin: 0, fontSize: '22px' }}>
                  Shared Loot
                </h3>
                <p className="rq-muted" style={{ marginTop: '6px', marginBottom: 0 }}>
                  {partyItems.length} unassigned items • {totalWeight.toFixed(1)} lbs total carried
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--rq-text-muted)'
                    }}
                  />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    style={{ paddingLeft: '34px', background: 'var(--rq-bg-panel-soft)' }}
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    minWidth: '140px',
                    background: 'var(--rq-bg-panel-soft)',
                    color: 'var(--rq-text-main)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px'
                  }}
                >
                  <option value="all">All Types</option>
                  {ITEM_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {players.length > 0 && (
              <div
                style={{
                  marginBottom: '16px',
                  border: '1px dashed rgba(231,185,76,0.35)',
                  background: 'rgba(122,90,248,0.08)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--rq-text-main)',
                  fontSize: '13px'
                }}
              >
                <GripVertical size={14} style={{ color: 'var(--rq-gold)' }} />
                Drag shared items onto a player card to assign them.
                <ArrowRight size={14} style={{ color: 'var(--rq-gold)' }} />
              </div>
            )}

            {showAddForm && (
              <div style={{ ...cardStyle, marginBottom: '16px', border: '1px solid rgba(231,185,76,0.22)' }}>
                <h4 className="rq-title" style={{ marginTop: 0, fontSize: '18px' }}>
                  Add New Item
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div className="rq-muted" style={{ marginBottom: '6px' }}>
                      Item Name
                    </div>
                    <Input
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Longsword, healing potion, rope..."
                    />
                  </div>

                  <div>
                    <div className="rq-muted" style={{ marginBottom: '6px' }}>
                      Type
                    </div>
                    <select
                      value={newItem.item_type}
                      onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--rq-bg-panel)',
                        color: 'var(--rq-text-main)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '10px 12px'
                      }}
                    >
                      {ITEM_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="rq-muted" style={{ marginBottom: '6px' }}>
                      Quantity
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </div>

                  <div>
                    <div className="rq-muted" style={{ marginBottom: '6px' }}>
                      Value
                    </div>
                    <Input
                      value={newItem.value}
                      onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                      placeholder="50 gp"
                    />
                  </div>

                  <div>
                    <div className="rq-muted" style={{ marginBottom: '6px' }}>
                      Weight
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newItem.weight}
                      onChange={(e) =>
                        setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div className="rq-muted" style={{ marginBottom: '6px' }}>
                    Description
                  </div>
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Brief item description"
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '18px',
                    flexWrap: 'wrap',
                    marginTop: '14px',
                    marginBottom: '14px'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newItem.is_magical}
                      onChange={(e) => setNewItem({ ...newItem, is_magical: e.target.checked })}
                    />
                    <span className="rq-muted">Magical Item</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newItem.attunement_required}
                      onChange={(e) =>
                        setNewItem({ ...newItem, attunement_required: e.target.checked })
                      }
                    />
                    <span className="rq-muted">Requires Attunement</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Button className="rq-button-primary" onClick={handleAddItem}>
                    <Plus size={14} style={{ marginRight: '6px' }} />
                    Add Item
                  </Button>
                  <Button
                    className="rq-button-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      resetNewItem();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {partyItems.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '28px' }}>
                <Backpack size={34} style={{ color: 'var(--rq-gold)', margin: '0 auto 12px' }} />
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>
                  {items.length === 0 ? 'No Party Loot Yet' : 'All Loot Assigned'}
                </h4>
                <div className="rq-muted">
                  {items.length === 0
                    ? 'Add recovered gear, treasure, and supplies to begin tracking inventory.'
                    : 'Every current item has been assigned to a player.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {partyItems.map((item) => {
                  const typeInfo = getItemTypeInfo(item.item_type);
                  const TypeIcon = typeInfo.icon;
                  const isEditing = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      style={{
                        ...cardStyle,
                        border: item.is_magical
                          ? '1px solid rgba(231,185,76,0.34)'
                          : `1px solid ${typeInfo.accent}33`,
                        cursor: isEditing ? 'default' : players.length > 0 ? 'grab' : 'default'
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: '12px'
                            }}
                          >
                            <Input
                              value={draftItem.name}
                              onChange={(e) => setDraftItem({ ...draftItem, name: e.target.value })}
                              placeholder="Item name"
                            />
                            <select
                              value={draftItem.item_type}
                              onChange={(e) => setDraftItem({ ...draftItem, item_type: e.target.value })}
                              style={{
                                width: '100%',
                                background: 'var(--rq-bg-panel)',
                                color: 'var(--rq-text-main)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                padding: '10px 12px'
                              }}
                            >
                              {ITEM_TYPES.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="number"
                              min="1"
                              value={draftItem.quantity}
                              onChange={(e) =>
                                setDraftItem({
                                  ...draftItem,
                                  quantity: parseInt(e.target.value, 10) || 1
                                })
                              }
                              placeholder="Quantity"
                            />
                            <Input
                              value={draftItem.value}
                              onChange={(e) => setDraftItem({ ...draftItem, value: e.target.value })}
                              placeholder="Value"
                            />
                          </div>

                          <Input
                            value={draftItem.description}
                            onChange={(e) =>
                              setDraftItem({ ...draftItem, description: e.target.value })
                            }
                            placeholder="Description"
                          />

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <Button
                              className="rq-button-primary"
                              onClick={() => handleUpdateItem(item.id)}
                            >
                              Save Changes
                            </Button>
                            <Button className="rq-button-secondary" onClick={cancelEditing}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '16px',
                            alignItems: 'start',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '240px' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: `${typeInfo.accent}22`,
                                border: `1px solid ${typeInfo.accent}55`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <TypeIcon size={18} style={{ color: typeInfo.accent }} />
                            </div>

                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <strong>{item.name}</strong>
                                {item.is_magical && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 8px',
                                      borderRadius: '999px',
                                      background: 'rgba(231,185,76,0.12)',
                                      color: 'var(--rq-gold-soft)',
                                      fontSize: '11px'
                                    }}
                                  >
                                    <Sparkles size={10} />
                                    Magical
                                  </span>
                                )}
                              </div>

                              <div className="rq-muted" style={{ marginTop: '6px' }}>
                                {typeInfo.label} • Qty {item.quantity || 1}
                                {item.value ? ` • ${item.value}` : ''}
                                {item.weight ? ` • ${item.weight} lb` : ''}
                              </div>

                              {item.description && (
                                <div className="rq-muted" style={{ marginTop: '8px' }}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => startEditing(item)} style={smallButtonStyle}>
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              style={{ ...smallButtonStyle, color: '#E74C3C' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {players.length > 0 && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={panelStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px'
                }}
              >
                <Users size={18} style={{ color: 'var(--rq-gold)' }} />
                <h3 className="rq-title" style={{ margin: 0, fontSize: '22px' }}>
                  Player Assignments
                </h3>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {players.map((player) => {
                  const playerItems = getPlayerItems(player.name);
                  const isDropTarget = dragOverPlayer === player.id;

                  return (
                    <div
                      key={player.id}
                      onDragOver={(e) => handleDragOver(e, player.id)}
                      onDragLeave={() => setDragOverPlayer(null)}
                      onDrop={(e) => handleDrop(e, player)}
                      style={{
                        ...cardStyle,
                        border: isDropTarget
                          ? '1px solid rgba(46,204,113,0.55)'
                          : '1px solid rgba(255,255,255,0.06)',
                        background: isDropTarget
                          ? 'rgba(46,204,113,0.08)'
                          : 'var(--rq-bg-panel-soft)',
                        transform: isDropTarget ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: playerItems.length > 0 ? '10px' : 0
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background:
                                'linear-gradient(135deg, var(--rq-purple), var(--rq-orange))',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700
                            }}
                          >
                            {player.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>

                          <div>
                            <div style={{ fontWeight: 700 }}>{player.name}</div>
                            <div className="rq-muted" style={{ marginTop: '4px' }}>
                              {player.class || 'Adventurer'} {player.level ? `• Lv. ${player.level}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="rq-muted">{playerItems.length} items</div>
                      </div>

                      {playerItems.length > 0 ? (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {playerItems.map((item) => {
                            const typeInfo = getItemTypeInfo(item.item_type);
                            const TypeIcon = typeInfo.icon;

                            return (
                              <div
                                key={item.id}
                                style={{
                                  background: 'rgba(0,0,0,0.16)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  borderRadius: '10px',
                                  padding: '10px 12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  alignItems: 'center'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <TypeIcon size={14} style={{ color: typeInfo.accent }} />
                                  <div>
                                    <div style={{ fontSize: '13px' }}>{item.name}</div>
                                    <div className="rq-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                                      {typeInfo.label}
                                      {item.quantity ? ` • Qty ${item.quantity}` : ''}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleUnassignItem(item.id)}
                                  title="Return to party inventory"
                                  style={{ ...smallButtonStyle, padding: '6px 8px' }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rq-muted" style={{ fontSize: '13px' }}>
                          {draggedItem ? 'Drop item here to assign it.' : 'No assigned items yet.'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartyInventory;
