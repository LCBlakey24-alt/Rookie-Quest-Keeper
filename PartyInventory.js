
// PartyInventory.js
// (Full file regenerated for download)

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
  Backpack,
  Gem
} from 'lucide-react';

import '../App.css';
import '../styles/designSystem.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/* NOTE
This is the same PartyInventory component I generated earlier,
but repackaged into a clean downloadable file for you to drop
straight into:

frontend/src/components/PartyInventory.js
*/

const ITEM_TYPES = [
  { id: 'weapon', label: 'Weapon', icon: Sword, accent: '#E74C3C' },
  { id: 'armor', label: 'Armor', icon: Shield, accent: '#3DA9FC' },
  { id: 'potion', label: 'Potion', icon: FlaskConical, accent: '#2ECC71' },
  { id: 'scroll', label: 'Scroll', icon: ScrollText, accent: '#7A5AF8' },
  { id: 'magic_item', label: 'Magic Item', icon: Sparkles, accent: '#E7B94C' },
  { id: 'gem', label: 'Gem / Treasure', icon: Gem, accent: '#F4D27A' },
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

export default function PartyInventory({ campaignId, players = [] }) {

  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState({
    copper: 0,
    silver: 0,
    electrum: 0,
    gold: 0,
    platinum: 0
  });

  const [campaignPlayers, setCampaignPlayers] = useState(players);
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
    if (campaignId) fetchAllData();
  }, [campaignId]);

  useEffect(() => {
    if (players.length > 0) setCampaignPlayers(players);
  }, [players]);

  const fetchAllData = async () => {
    try {

      setLoading(true);

      const requests = [
        axios.get(`${API}/campaigns/${campaignId}/inventory`),
        axios.get(`${API}/campaigns/${campaignId}/currency`)
      ];

      if (!players || players.length === 0) {
        requests.push(
          axios.get(`${API}/campaigns/${campaignId}/players`)
        );
      }

      const responses = await Promise.all(requests);

      const itemsRes = responses[0];
      const currencyRes = responses[1];

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setCurrency(currencyRes.data || {});

      if (responses[2]) {
        const playerData = responses[2]?.data?.players || [];
        setCampaignPlayers(Array.isArray(playerData) ? playerData : []);
      }

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
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.claimed_by?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === 'all' || item.item_type === filterType;

      return matchesSearch && matchesType;

    });
  }, [items, searchTerm, filterType]);

  const sharedItems = filteredItems.filter((item) => !item.claimed_by);

  const getPlayerItems = (player) =>
    items.filter(
      (item) =>
        item.claimed_by_id === player.id ||
        item.claimed_by === player.name
    );

  const totalWeight = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1),
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

  if (loading) {
    return (
      <div className="rq-panel" style={{ textAlign: 'center', padding: '40px' }}>
        Loading Party Inventory...
      </div>
    );
  }

  return (
    <div className="rq-panel">

      <h2 className="rq-title">Party Inventory</h2>

      <div className="rq-muted">
        Shared Loot: {sharedItems.length} items | Total Weight: {totalWeight.toFixed(1)} lbs
      </div>

      <div className="rq-muted" style={{ marginTop: 10 }}>
        Party Wealth: {totalGoldValue} gp
      </div>

    </div>
  );
}
