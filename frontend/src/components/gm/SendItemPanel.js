import React, { useState } from 'react';
import { Gift, Sparkles, Send, Shield } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];
const ITEM_TYPES = ['Weapon', 'Armor', 'Wondrous', 'Potion', 'Ring', 'Rod', 'Staff', 'Wand', 'Scroll'];

const RARITY_COLORS = {
  Common: '#9CA3AF', Uncommon: '#10B981', Rare: '#3B82F6',
  'Very Rare': '#8B5CF6', Legendary: '#F59E0B', Artifact: '#EF4444',
};

export default function SendItemPanel({ theme, partyCharacters = [] }) {
  const [selectedChar, setSelectedChar] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('Wondrous');
  const [itemRarity, setItemRarity] = useState('Common');
  const [itemDesc, setItemDesc] = useState('');
  const [requiresAttunement, setRequiresAttunement] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selectedChar || !itemName.trim()) {
      toast.error('Select a character and enter item name');
      return;
    }
    setSending(true);
    try {
      const res = await axios.post(`${API}/characters/${selectedChar}/send-item`, {
        name: itemName.trim(),
        type: itemType.toLowerCase(),
        rarity: itemRarity.toLowerCase(),
        description: itemDesc,
        requires_attunement: requiresAttunement,
      });
      toast.success(res.data.message || 'Item sent!');
      setItemName('');
      setItemDesc('');
      setRequiresAttunement(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send item');
    }
    setSending(false);
  };

  const inputStyle = {
    background: theme.bg.card || 'rgba(255,255,255,0.05)',
    border: `1px solid ${theme.border}`,
    borderRadius: '6px', color: theme.text.primary,
    padding: '8px 10px', fontSize: '13px', outline: 'none', width: '100%',
    fontFamily: 'inherit',
  };

  return (
    <div data-testid="send-item-panel" style={{
      background: theme.bg.card || 'rgba(255,255,255,0.03)',
      border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: theme.accent?.gm || theme.accent?.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Gift size={16} /> Send Item to Player
      </h4>

      {/* Character Select */}
      <div>
        <label style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>RECIPIENT</label>
        <select data-testid="item-recipient" value={selectedChar} onChange={e => setSelectedChar(e.target.value)} style={inputStyle}>
          <option value="">Select a character...</option>
          {partyCharacters.map(c => (
            <option key={c.id} value={c.id}>{c.name} (Lvl {c.level} {c.character_class})</option>
          ))}
        </select>
      </div>

      {/* Item Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>ITEM NAME</label>
          <input data-testid="item-name-input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Flame Tongue" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>TYPE</label>
          <select data-testid="item-type-select" value={itemType} onChange={e => setItemType(e.target.value)} style={inputStyle}>
            {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>RARITY</label>
          <select data-testid="item-rarity-select" value={itemRarity} onChange={e => setItemRarity(e.target.value)} style={inputStyle}>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: theme.text.secondary, cursor: 'pointer', paddingBottom: '8px' }}>
          <input data-testid="attunement-checkbox" type="checkbox" checked={requiresAttunement} onChange={e => setRequiresAttunement(e.target.checked)} style={{ width: '14px', height: '14px' }} />
          Requires Attunement
        </label>
      </div>

      <div>
        <label style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>DESCRIPTION</label>
        <textarea data-testid="item-desc-input" value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="A magical longsword wreathed in flame..."
          rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Rarity Preview */}
      {itemName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}` }}>
          <Sparkles size={14} color={RARITY_COLORS[itemRarity]} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary }}>{itemName}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${RARITY_COLORS[itemRarity]}20`, color: RARITY_COLORS[itemRarity] }}>
            {itemRarity}
          </span>
          {requiresAttunement && (
            <span style={{ fontSize: '10px', color: theme.text.muted, fontStyle: 'italic' }}>
              <Shield size={10} style={{ display: 'inline', marginRight: '2px' }} />attunement
            </span>
          )}
        </div>
      )}

      <button data-testid="send-item-btn" onClick={handleSend} disabled={sending || !selectedChar || !itemName.trim()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
          cursor: sending ? 'wait' : 'pointer',
          background: theme.gradient || 'linear-gradient(135deg, #8A2BE2, #F59E0B)',
          color: '#fff', border: 'none', opacity: (sending || !selectedChar || !itemName.trim()) ? 0.5 : 1,
        }}>
        <Send size={14} /> {sending ? 'Sending...' : 'Send Item'}
      </button>
    </div>
  );
}
