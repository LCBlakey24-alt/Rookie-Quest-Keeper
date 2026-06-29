import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Gem, Package, Plus, Save, ScrollText, Shield, Sparkles, Sword, Trash2, UserPlus, X } from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = { bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)' };

const ITEM_CATEGORIES = [
  { id: 'weapon', label: 'Weapons', icon: Sword },
  { id: 'armor', label: 'Armour', icon: Shield },
  { id: 'potion', label: 'Potions', icon: Sparkles },
  { id: 'scroll', label: 'Scrolls', icon: ScrollText },
  { id: 'gem', label: 'Gems & Valuables', icon: Gem },
  { id: 'magic_item', label: 'Magic Items', icon: Sparkles },
  { id: 'misc', label: 'Miscellaneous', icon: Package },
];

const EMPTY_ITEM = { name: '', item_type: 'misc', quantity: 1, value: '', description: '', is_magical: false, attunement_required: false, damage_dice: '', damage_type: '', attack_bonus: 0, ac_bonus: 0, equip_slot: '', notes: '' };
const COINS = [
  { key: 'platinum', label: 'PP', value: 10 },
  { key: 'gold', label: 'GP', value: 1 },
  { key: 'electrum', label: 'EP', value: 0.5 },
  { key: 'silver', label: 'SP', value: 0.1 },
  { key: 'copper', label: 'CP', value: 0.01 },
];

function normaliseItems(data) { return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []; }
function normaliseCurrency(data) { return { platinum: Number(data?.platinum) || 0, gold: Number(data?.gold) || 0, electrum: Number(data?.electrum) || 0, silver: Number(data?.silver) || 0, copper: Number(data?.copper) || 0 }; }
function parseValue(value) { return Number.parseFloat(String(value || '').replace(/[^0-9.-]/g, '')) || 0; }
function coinValue(currency) { return COINS.reduce((sum, coin) => sum + ((Number(currency[coin.key]) || 0) * coin.value), 0); }
function targetValue(target) { return `${target.target_type || 'character'}:${target.target_id || target.id}`; }
function grantStateFor(grantOptions, itemId) { return grantOptions[itemId] || { target_value: '', auto_attune: false, auto_equip: false }; }
function splitTargetValue(value = '') { const [target_type = '', target_id = ''] = String(value).split(':'); return { target_type, target_id }; }
function targetLabel(target) {
  const type = target.target_type === 'npc' ? 'NPC' : 'Player';
  const classText = target.character_class || target.class_name || target.role || '';
  const levelText = target.level ? ` ${target.level}` : '';
  return `${type}: ${target.name || target.label || 'Target'}${classText ? ` · ${classText}${levelText}` : ''}`;
}
function itemCanEquip(item) { return ['weapon', 'armor', 'magic_item'].includes(item.item_type || item.type) || Boolean(item.equip_slot || item.damage_dice || Number(item.attack_bonus) || Number(item.ac_bonus)); }
function grantDescription(response) {
  const bits = [];
  if (response.data?.target_type === 'npc') bits.push('NPC combat profile updated');
  if (response.data?.auto_attuned) bits.push('already attuned');
  if (response.data?.auto_equipped) bits.push('equipped/ready');
  const changes = response.data?.npc_stat_changes;
  if (changes?.ac_bonus_applied) bits.push(`AC +${changes.ac_bonus_applied}`);
  if (changes?.attack_added) bits.push('attack added');
  return bits.length ? bits.join(' · ') : 'Item added to the target.';
}
function itemPayload(item) {
  return {
    name: String(item.name || '').trim(), item_type: item.item_type || 'misc', quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1), value: String(item.value || ''), description: item.description || '', is_magical: Boolean(item.is_magical), attunement_required: Boolean(item.attunement_required), damage_dice: item.damage_dice || '', damage_type: item.damage_type || '', attack_bonus: Number(item.attack_bonus) || 0, ac_bonus: Number(item.ac_bonus) || 0, equip_slot: item.equip_slot || '', notes: item.notes || '',
  };
}

export default function PartyInventoryTab({ campaignId }) {
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState(normaliseCurrency({}));
  const [grantTargets, setGrantTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [grantOptions, setGrantOptions] = useState({});

  useEffect(() => { loadInventory(); }, [campaignId]);

  const loadInventory = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [itemsRes, currencyRes, targetsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/inventory`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/currency`).catch(() => ({ data: {} })),
        apiClient.get(`/campaigns/${campaignId}/inventory/grant-targets`).catch(() => ({ data: [] })),
      ]);
      setItems(normaliseItems(itemsRes.data));
      setCurrency(normaliseCurrency(currencyRes.data));
      setGrantTargets(Array.isArray(targetsRes.data) ? targetsRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load party inventory');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = useMemo(() => Math.round((coinValue(currency) + items.reduce((sum, item) => sum + (parseValue(item.value) * (Number(item.quantity) || 1)), 0)) * 100) / 100, [items, currency]);
  const groupedItems = useMemo(() => ITEM_CATEGORIES.map(category => ({ ...category, items: items.filter(item => (item.item_type || 'misc') === category.id) })).filter(group => group.items.length), [items]);
  const claimedItems = items.filter(item => item.claimed_by || item.claimed_by_id);
  const unclaimedItems = items.filter(item => !item.claimed_by && !item.claimed_by_id);

  const updateCurrency = async (patch) => {
    const next = normaliseCurrency({ ...currency, ...patch });
    setCurrency(next);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/currency`, next);
      setCurrency(normaliseCurrency(response.data));
      toast.success('Party funds updated');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update party funds');
    }
  };

  const adjustCurrency = (key, amount) => updateCurrency({ [key]: Math.max(0, (Number(currency[key]) || 0) + amount) });
  const patchGrantOption = (itemId, patch) => setGrantOptions(prev => ({ ...prev, [itemId]: { ...grantStateFor(prev, itemId), ...patch } }));

  const addItem = async () => {
    const payload = itemPayload(newItem);
    if (!payload.name) return toast.error('Enter an item name');
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/inventory`, payload);
      setItems(prev => [response.data, ...prev]);
      setNewItem(EMPTY_ITEM);
      setShowAddItem(false);
      toast.success(`${payload.name} added to party loot`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add item');
    } finally { setSaving(false); }
  };

  const updateItem = async () => {
    if (!editItem?.id) return;
    const payload = itemPayload(editItem);
    if (!payload.name) return toast.error('Item name is required');
    setSaving(true);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/inventory/${editItem.id}`, payload);
      setItems(prev => prev.map(item => item.id === editItem.id ? response.data : item));
      setEditingId(null); setEditItem(null);
      toast.success('Item updated');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update item');
    } finally { setSaving(false); }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Remove ${item.name} from party inventory?`)) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/inventory/${item.id}`);
      setItems(prev => prev.filter(existing => existing.id !== item.id));
      toast.success('Item removed');
    } catch (error) { toast.error(error?.response?.data?.detail || 'Could not remove item'); }
  };

  const grantItem = async (item) => {
    const option = grantStateFor(grantOptions, item.id);
    const target = splitTargetValue(option.target_value);
    if (!target.target_type || !target.target_id) return toast.error('Choose who receives the item first');
    const selected = grantTargets.find(entry => targetValue(entry) === option.target_value);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/inventory/${item.id}/grant`, {
        target_type: target.target_type,
        target_id: target.target_id,
        character_id: target.target_type === 'character' ? target.target_id : undefined,
        npc_id: target.target_type === 'npc' ? target.target_id : undefined,
        auto_attune: Boolean(option.auto_attune),
        auto_equip: Boolean(option.auto_equip),
      });
      setItems(prev => prev.filter(existing => existing.id !== item.id));
      setGrantOptions(prev => ({ ...prev, [item.id]: { target_value: '', auto_attune: false, auto_equip: false } }));
      toast.success(`${item.name} granted to ${selected?.name || selected?.label || 'target'}`, { description: grantDescription(response) });
    } catch (error) { toast.error(error?.response?.data?.detail || 'Could not grant item'); }
  };

  if (loading) return <div style={loadingStyle}>Loading party inventory…</div>;

  return (
    <section style={shellStyle} data-testid="party-inventory-tab">
      <header style={heroStyle}>
        <div><p style={eyebrowStyle}>Inventory & Rewards</p><h2 style={titleStyle}>Party Loot</h2><p style={subtitleStyle}>Track shared treasure, build reward piles, and grant items directly into player sheets or NPC combat profiles.</p></div>
        <div style={heroStatsStyle}><Stat label="Unclaimed Items" value={unclaimedItems.length} /><Stat label="Granted / Claimed" value={claimedItems.length} /><Stat label="Approx Value" value={`${totalValue} gp`} /></div>
      </header>

      <section style={currencyStyle}><div style={panelHeaderStyle}><h3 style={panelTitleStyle}><Coins size={18} /> Party Funds</h3><span style={mutedTextStyle}>Coins are stored separately from loot items.</span></div><div style={coinGridStyle}>{COINS.map(coin => <CoinBox key={coin.key} coin={coin} value={currency[coin.key] || 0} onAdjust={adjustCurrency} onSet={(value) => updateCurrency({ [coin.key]: value })} />)}</div></section>
      <section style={actionRowStyle}><Button onClick={() => setShowAddItem(prev => !prev)} style={primaryButtonStyle}><Plus size={16} /> {showAddItem ? 'Hide Add Item' : 'Add Item'}</Button><Button onClick={loadInventory} style={secondaryButtonStyle}>Refresh Inventory</Button></section>

      {showAddItem && <section style={panelStyle} data-testid="add-party-item-panel"><h3 style={panelTitleStyle}><Package size={18} /> Add party item</h3><ItemForm item={newItem} onChange={setNewItem} /><div style={formActionsStyle}><Button onClick={() => { setShowAddItem(false); setNewItem(EMPTY_ITEM); }} style={secondaryButtonStyle}><X size={15} /> Cancel</Button><Button onClick={addItem} disabled={saving} style={primaryButtonStyle}><Save size={15} /> {saving ? 'Saving…' : 'Save Item'}</Button></div></section>}

      {items.length === 0 ? <section style={emptyStyle}><Package size={44} /><h3>No party loot yet</h3><p>Add treasure, quest rewards, scrolls, potions, magic items, or enemy gear. Then grant them to a player or equip an NPC for combat.</p></section> : <section style={itemGroupsStyle}>{groupedItems.map(group => <ItemGroup key={group.id} group={group} editingId={editingId} editItem={editItem} setEditingId={setEditingId} setEditItem={setEditItem} onUpdate={updateItem} onDelete={deleteItem} grantTargets={grantTargets} grantOptions={grantOptions} onGrantOptionChange={patchGrantOption} onGrant={grantItem} saving={saving} />)}</section>}
    </section>
  );
}

function CoinBox({ coin, value, onAdjust, onSet }) { const [draft, setDraft] = useState(String(value || 0)); useEffect(() => { setDraft(String(value || 0)); }, [value]); return <article style={coinBoxStyle}><span>{coin.label}</span><strong>{value}</strong><div style={miniButtonRowStyle}><button type="button" onClick={() => onAdjust(coin.key, -10)} style={miniButtonStyle}>-10</button><button type="button" onClick={() => onAdjust(coin.key, -1)} style={miniButtonStyle}>-1</button><button type="button" onClick={() => onAdjust(coin.key, 1)} style={miniButtonStyle}>+1</button><button type="button" onClick={() => onAdjust(coin.key, 10)} style={miniButtonStyle}>+10</button></div><div style={setCurrencyStyle}><input value={draft} onChange={event => setDraft(event.target.value)} type="number" min="0" style={smallInputStyle} /><button type="button" onClick={() => onSet(Math.max(0, Number.parseInt(draft, 10) || 0))} style={miniPrimaryStyle}>Set</button></div></article>; }
function ItemGroup({ group, editingId, editItem, setEditingId, setEditItem, onUpdate, onDelete, grantTargets, grantOptions, onGrantOptionChange, onGrant, saving }) { const Icon = group.icon; return <section style={panelStyle}><h3 style={panelTitleStyle}><Icon size={18} /> {group.label} ({group.items.length})</h3><div style={itemListStyle}>{group.items.map(item => editingId === item.id ? <EditingItem key={item.id} item={editItem} onChange={setEditItem} onUpdate={onUpdate} onCancel={() => { setEditingId(null); setEditItem(null); }} saving={saving} /> : <InventoryItemCard key={item.id} item={item} onEdit={() => { setEditingId(item.id); setEditItem({ ...item }); }} onDelete={() => onDelete(item)} grantTargets={grantTargets} grantOption={grantStateFor(grantOptions, item.id)} onGrantOptionChange={(patch) => onGrantOptionChange(item.id, patch)} onGrant={() => onGrant(item)} />)}</div></section>; }
function EditingItem({ item, onChange, onUpdate, onCancel, saving }) { return <article style={editCardStyle}><ItemForm item={item} onChange={onChange} compact /><div style={formActionsStyle}><Button onClick={onCancel} style={secondaryButtonStyle}><X size={15} /> Cancel</Button><Button onClick={onUpdate} disabled={saving} style={primaryButtonStyle}><Save size={15} /> Save</Button></div></article>; }
function InventoryItemCard({ item, onEdit, onDelete, grantTargets, grantOption, onGrantOptionChange, onGrant }) {
  const requiresAttunement = Boolean(item.attunement_required || item.requires_attunement);
  const canEquip = itemCanEquip(item);
  const selectedTarget = grantTargets.find(target => targetValue(target) === grantOption.target_value);
  const selectedIsNpc = selectedTarget?.target_type === 'npc';
  return <article style={itemCardStyle(item.is_magical)}><div style={{ minWidth: 0 }}><div style={itemTitleRowStyle}><strong>{item.name}</strong>{item.is_magical && <span style={tagStyle}>Magical</span>}{requiresAttunement && <span style={tagStyle}>Requires Attunement</span>}{Number(item.quantity) > 1 && <span style={tagStyle}>x{item.quantity}</span>}</div>{item.description && <p style={itemDescStyle}>{item.description}</p>}<div style={itemMetaStyle}>{item.value && <span>{item.value}</span>}{item.damage_dice && <span>{item.damage_dice} {item.damage_type}</span>}{Number(item.attack_bonus) !== 0 && <span>Attack +{item.attack_bonus}</span>}{Number(item.ac_bonus) !== 0 && <span>AC +{item.ac_bonus}</span>}{item.equip_slot && <span>{item.equip_slot}</span>}</div>{item.notes && <p style={itemNotesStyle}>{item.notes}</p>}</div><div style={itemActionsStyle}><div style={grantBoxStyle}><span style={grantTitleStyle}>Reward handoff</span><select value={grantOption.target_value || ''} onChange={event => onGrantOptionChange({ target_value: event.target.value })} style={selectStyle}><option value="">Who receives this?</option>{grantTargets.map(target => <option key={targetValue(target)} value={targetValue(target)}>{targetLabel(target)}</option>)}</select>{requiresAttunement && <label style={grantCheckStyle}><input type="checkbox" checked={Boolean(grantOption.auto_attune)} onChange={event => onGrantOptionChange({ auto_attune: event.target.checked })} /> Auto-attune on grant</label>}{canEquip && <label style={grantCheckStyle}><input type="checkbox" checked={Boolean(grantOption.auto_equip)} onChange={event => onGrantOptionChange({ auto_equip: event.target.checked })} /> {selectedIsNpc ? 'Equip and update NPC combat stats' : 'Grant as equipped/ready'}</label>}<button type="button" onClick={onGrant} disabled={!grantOption.target_value} style={grantButtonStyle}><UserPlus size={14} /> Grant {selectedIsNpc ? 'to NPC' : 'to Sheet'}</button></div><div style={buttonRowStyle}><button type="button" onClick={onEdit} style={smallButtonStyle}>Edit</button><button type="button" onClick={onDelete} style={dangerButtonStyle}><Trash2 size={14} /> Remove</button></div></div></article>;
}
function ItemForm({ item, onChange, compact = false }) { const set = (patch) => onChange({ ...item, ...patch }); return <div style={compact ? compactFormGridStyle : formGridStyle}><Field label="Name"><Input value={item.name || ''} onChange={event => set({ name: event.target.value })} placeholder="+1 Longsword" style={inputStyle} /></Field><Field label="Type"><select value={item.item_type || 'misc'} onChange={event => set({ item_type: event.target.value })} style={selectStyle}>{ITEM_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></Field><Field label="Qty"><Input type="number" min="1" value={item.quantity || 1} onChange={event => set({ quantity: event.target.value })} style={inputStyle} /></Field><Field label="Value"><Input value={item.value || ''} onChange={event => set({ value: event.target.value })} placeholder="50 gp" style={inputStyle} /></Field><Field label="Description"><Input value={item.description || ''} onChange={event => set({ description: event.target.value })} placeholder="Item effect or description" style={inputStyle} /></Field><Field label="Damage"><Input value={item.damage_dice || ''} onChange={event => set({ damage_dice: event.target.value })} placeholder="1d8+2" style={inputStyle} /></Field><Field label="Damage type"><Input value={item.damage_type || ''} onChange={event => set({ damage_type: event.target.value })} placeholder="slashing" style={inputStyle} /></Field><Field label="Equip slot"><Input value={item.equip_slot || ''} onChange={event => set({ equip_slot: event.target.value })} placeholder="mainHand, armor..." style={inputStyle} /></Field><Field label="Attack +"><Input type="number" value={item.attack_bonus || 0} onChange={event => set({ attack_bonus: event.target.value })} style={inputStyle} /></Field><Field label="AC +"><Input type="number" value={item.ac_bonus || 0} onChange={event => set({ ac_bonus: event.target.value })} style={inputStyle} /></Field><label style={checkStyle}><input type="checkbox" checked={Boolean(item.is_magical)} onChange={event => set({ is_magical: event.target.checked })} /> Magical</label><label style={checkStyle}><input type="checkbox" checked={Boolean(item.attunement_required)} onChange={event => set({ attunement_required: event.target.checked })} /> Requires attunement</label><Field label="GM notes"><Input value={item.notes || ''} onChange={event => set({ notes: event.target.value })} placeholder="Hidden or table notes" style={inputStyle} /></Field></div>; }
function Field({ label, children }) { return <label style={fieldStyle}><span>{label}</span>{children}</label>; }
function Stat({ label, value }) { return <article style={statStyle}><strong>{value}</strong><span>{label}</span></article>; }

const shellStyle = { display: 'grid', gap: 14, color: rq.text, fontFamily: fontStack };
const loadingStyle = { padding: 24, background: rq.panel, border: `1px solid ${rq.line}`, color: rq.soft };
const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start', background: rq.card, border: `1px solid ${rq.line}`, padding: 16 };
const eyebrowStyle = { margin: '0 0 5px', color: rq.red, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.11em' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 0.95 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, lineHeight: 1.45, maxWidth: 760 };
const heroStatsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(100px, 1fr))', gap: 8, minWidth: 'min(100%, 420px)' };
const statStyle = { background: rq.bg, border: `1px solid ${rq.line}`, padding: 10, display: 'grid', gap: 3, textAlign: 'center' };
const currencyStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 14 };
const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 };
const panelTitleStyle = { margin: 0, color: rq.text, fontSize: 16, fontWeight: 950, display: 'flex', gap: 8, alignItems: 'center' };
const mutedTextStyle = { color: rq.muted, fontSize: 12 };
const coinGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 };
const coinBoxStyle = { display: 'grid', gap: 8, background: rq.card, border: `1px solid ${rq.line}`, padding: 10, textAlign: 'center' };
const miniButtonRowStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 };
const miniButtonStyle = { minHeight: 26, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, fontWeight: 900, cursor: 'pointer' };
const miniPrimaryStyle = { minHeight: 28, background: rq.red, border: 0, color: rq.text, fontWeight: 950, cursor: 'pointer' };
const setCurrencyStyle = { display: 'grid', gridTemplateColumns: '1fr 48px', gap: 4 };
const smallInputStyle = { minHeight: 28, width: '100%', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px' };
const actionRowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const primaryButtonStyle = { minHeight: 38, border: 0, borderRadius: 0, background: rq.red, color: rq.text, fontWeight: 950, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 38, border: 0, borderRadius: 0, background: rq.card, color: rq.text, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: fontStack };
const panelStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 14 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 };
const compactFormGridStyle = { ...formGridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' };
const fieldStyle = { display: 'grid', gap: 5, color: rq.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle = { minHeight: 34, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, borderRadius: 0 };
const selectStyle = { minHeight: 34, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 8px', borderRadius: 0 };
const checkStyle = { display: 'flex', alignItems: 'center', gap: 7, color: rq.soft, fontWeight: 850, fontSize: 13, minHeight: 34 };
const formActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, flexWrap: 'wrap' };
const emptyStyle = { display: 'grid', placeItems: 'center', textAlign: 'center', gap: 8, background: rq.card, border: `1px dashed ${rq.line}`, padding: 36, color: rq.soft };
const itemGroupsStyle = { display: 'grid', gap: 12 };
const itemListStyle = { display: 'grid', gap: 8, marginTop: 12 };
const itemCardStyle = (magical) => ({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.62fr)', gap: 12, background: rq.bg, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${magical ? rq.red : rq.line}`, padding: 12 });
const editCardStyle = { background: rq.bg, border: `1px solid ${rq.line}`, padding: 12 };
const itemTitleRowStyle = { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', color: rq.text };
const tagStyle = { background: 'rgba(208,0,0,0.18)', color: rq.text, border: `1px solid ${rq.line}`, padding: '2px 6px', fontSize: 10, fontWeight: 900 };
const itemDescStyle = { margin: '7px 0 0', color: rq.soft, lineHeight: 1.4, fontSize: 13 };
const itemMetaStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', color: rq.muted, fontSize: 12, marginTop: 8 };
const itemNotesStyle = { margin: '8px 0 0', color: rq.muted, fontSize: 12, fontStyle: 'italic' };
const itemActionsStyle = { display: 'grid', gap: 8, alignContent: 'center' };
const grantBoxStyle = { display: 'grid', gap: 7, background: rq.card, border: `1px solid ${rq.line}`, padding: 9 };
const grantTitleStyle = { color: rq.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.09em' };
const grantCheckStyle = { display: 'flex', alignItems: 'center', gap: 7, color: rq.soft, fontSize: 12, fontWeight: 850 };
const grantButtonStyle = { minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: rq.red, border: 0, color: rq.text, fontWeight: 950, padding: '0 9px', cursor: 'pointer' };
const buttonRowStyle = { display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' };
const smallButtonStyle = { minHeight: 32, background: rq.card, color: rq.text, border: `1px solid ${rq.line}`, padding: '0 9px', cursor: 'pointer', fontWeight: 900 };
const dangerButtonStyle = { ...smallButtonStyle, color: rq.text, display: 'inline-flex', alignItems: 'center', gap: 5 };
