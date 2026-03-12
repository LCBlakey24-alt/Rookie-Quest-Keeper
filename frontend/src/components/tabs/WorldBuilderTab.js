import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Edit, Trash2, MapPin, Loader, Store, ChevronDown, ChevronRight, 
  Building, Beer, Church, Hammer, Home, BookOpen, Globe, Map, Castle, 
  Trees, Mountain, Waves, Wand2, Check, X
} from 'lucide-react';
import QuickTips, { TIPS } from '@/components/QuickTips';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Hierarchy: Continent -> Country/Region -> Settlement -> Place of Interest
const CONTINENT_TYPES = [
  { id: 'continent', label: 'Continent', icon: Globe },
  { id: 'island', label: 'Island/Archipelago', icon: Waves },
  { id: 'plane', label: 'Plane of Existence', icon: Mountain }
];

const REGION_TYPES = [
  { id: 'kingdom', label: 'Kingdom', icon: Castle },
  { id: 'empire', label: 'Empire', icon: Castle },
  { id: 'republic', label: 'Republic', icon: Building },
  { id: 'territory', label: 'Territory', icon: Map },
  { id: 'wilderness', label: 'Wilderness', icon: Trees }
];

const SETTLEMENT_TYPES = [
  { id: 'capital', label: 'Capital City', icon: Castle },
  { id: 'city', label: 'City', icon: Building },
  { id: 'town', label: 'Town', icon: Home },
  { id: 'village', label: 'Village', icon: Home },
  { id: 'outpost', label: 'Outpost/Fort', icon: Castle },
  { id: 'ruins', label: 'Ruins', icon: Mountain },
  { id: 'landmark', label: 'Landmark', icon: MapPin }
];

const PLACE_TYPES = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'tavern', label: 'Tavern/Inn', icon: Beer },
  { id: 'temple', label: 'Temple', icon: Church },
  { id: 'blacksmith', label: 'Blacksmith', icon: Hammer },
  { id: 'guild', label: 'Guild Hall', icon: Building },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'residence', label: 'Residence', icon: Home },
  { id: 'dungeon', label: 'Dungeon', icon: Mountain },
  { id: 'other', label: 'Other', icon: MapPin }
];

function WorldBuilderTab({ campaignId }) {
  const [worldData, setWorldData] = useState({ continents: [] });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState('continent'); // continent, region, settlement, place
  const [parentId, setParentId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    notes: ''
  });

  // AI Generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    fetchWorldData();
  }, [campaignId]);

  const fetchWorldData = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/world`);
      setWorldData(response.data || { continents: [] });
    } catch (error) {
      // If no world data yet, start fresh
      setWorldData({ continents: [] });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateDialog = (type, parentId = null) => {
    setDialogType(type);
    setParentId(parentId);
    setEditingItem(null);
    setFormData({ name: '', type: '', description: '', notes: '' });
    setShowDialog(true);
  };

  const openEditDialog = (type, item, parentId = null) => {
    setDialogType(type);
    setParentId(parentId);
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      type: item.type || item.settlement_type || item.place_type || '',
      description: item.description || '',
      notes: item.notes || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const payload = { ...formData };
      
      if (editingItem) {
        await axios.put(`${API}/campaigns/${campaignId}/world/${dialogType}/${editingItem.id}`, {
          ...payload,
          parent_id: parentId
        });
        toast.success(`${dialogType} updated!`);
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/world/${dialogType}`, {
          ...payload,
          parent_id: parentId
        });
        toast.success(`${dialogType} created!`);
      }
      
      setShowDialog(false);
      fetchWorldData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}? This will also delete all nested items.`)) return;
    
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/world/${type}/${id}`);
      toast.success(`${type} deleted`);
      fetchWorldData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to generate');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await axios.post(`${API}/rook/generate`, {
        prompt: aiPrompt,
        entity_type: `world_${dialogType}`,
        campaign_id: campaignId,
        parent_id: parentId
      });

      if (response.data.success) {
        toast.success(`✨ ${response.data.entity_name} has been created!`);
        setLastGenerated(response.data);
        setAiPrompt('');
        setShowDialog(false);
        fetchWorldData();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'The ROOK failed';
      toast.error(errorMsg);
    } finally {
      setAiGenerating(false);
    }
  };

  const getTypeOptions = () => {
    switch (dialogType) {
      case 'continent': return CONTINENT_TYPES;
      case 'region': return REGION_TYPES;
      case 'settlement': return SETTLEMENT_TYPES;
      case 'place': return PLACE_TYPES;
      default: return [];
    }
  };

  const getTypeLabel = () => {
    switch (dialogType) {
      case 'continent': return 'Continent/Landmass';
      case 'region': return 'Country/Region';
      case 'settlement': return 'City/Town/Village';
      case 'place': return 'Place of Interest';
      default: return 'Location';
    }
  };

  const renderPlace = (place, settlementId) => {
    const PlaceIcon = PLACE_TYPES.find(t => t.id === place.place_type)?.icon || MapPin;
    const isNew = lastGenerated?.entity_id === place.id;
    
    return (
      <div 
        key={place.id}
        style={{
          marginLeft: '48px',
          padding: '12px 16px',
          background: isNew ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.2)',
          borderLeft: `3px solid ${isNew ? '#22c55e' : '#6366f1'}`,
          borderRadius: '0 8px 8px 0',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: isNew ? 'glow 2s ease-in-out' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PlaceIcon size={16} color="#6366f1" />
          <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{place.name}</span>
          {isNew && (
            <span style={{ 
              background: '#22c55e', 
              color: '#000', 
              padding: '2px 8px', 
              borderRadius: '10px', 
              fontSize: '10px',
              fontWeight: '700'
            }}>
              NEW
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button className="btn-icon" style={{ padding: '4px' }} onClick={() => openEditDialog('place', place, settlementId)}>
            <Edit size={14} />
          </Button>
          <Button className="btn-danger" style={{ padding: '4px' }} onClick={() => handleDelete('place', place.id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    );
  };

  const renderSettlement = (settlement, regionId) => {
    const SettlementIcon = SETTLEMENT_TYPES.find(t => t.id === settlement.settlement_type)?.icon || Home;
    const isExpanded = expanded[settlement.id];
    const isNew = lastGenerated?.entity_id === settlement.id;
    const places = settlement.places || [];
    
    return (
      <div key={settlement.id} style={{ marginLeft: '32px', marginBottom: '8px' }}>
        <div 
          style={{
            padding: '14px 18px',
            background: isNew ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 30, 60, 0.6)',
            border: `2px solid ${isNew ? '#22c55e' : '#4a7dff'}`,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            animation: isNew ? 'glow 2s ease-in-out' : 'none'
          }}
          onClick={() => toggleExpand(settlement.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isExpanded ? <ChevronDown size={18} color="#4a7dff" /> : <ChevronRight size={18} color="#4a7dff" />}
            <SettlementIcon size={20} color="#4a7dff" />
            <div>
              <span style={{ color: '#fff', fontWeight: '600' }}>{settlement.name}</span>
              <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '10px' }}>
                {SETTLEMENT_TYPES.find(t => t.id === settlement.settlement_type)?.label || 'Settlement'}
              </span>
            </div>
            {isNew && (
              <span style={{ background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' }}>
                JUST CREATED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
            <Button className="btn-icon" style={{ padding: '6px' }} onClick={() => openCreateDialog('place', settlement.id)}>
              <Plus size={16} />
            </Button>
            <Button className="btn-icon" style={{ padding: '6px' }} onClick={() => openEditDialog('settlement', settlement, regionId)}>
              <Edit size={16} />
            </Button>
            <Button className="btn-danger" style={{ padding: '6px' }} onClick={() => handleDelete('settlement', settlement.id)}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
        
        {isExpanded && places.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {places.map(place => renderPlace(place, settlement.id))}
          </div>
        )}
        
        {isExpanded && places.length === 0 && (
          <div style={{ marginLeft: '48px', padding: '12px', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
            No places of interest yet. Click + to add one.
          </div>
        )}
      </div>
    );
  };

  const renderRegion = (region, continentId) => {
    const RegionIcon = REGION_TYPES.find(t => t.id === region.region_type)?.icon || Map;
    const isExpanded = expanded[region.id];
    const isNew = lastGenerated?.entity_id === region.id;
    const settlements = region.settlements || [];
    
    return (
      <div key={region.id} style={{ marginLeft: '16px', marginBottom: '12px' }}>
        <div 
          style={{
            padding: '16px 20px',
            background: isNew ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 30, 60, 0.7)',
            border: `2px solid ${isNew ? '#22c55e' : '#a855f7'}`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            animation: isNew ? 'glow 2s ease-in-out' : 'none'
          }}
          onClick={() => toggleExpand(region.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isExpanded ? <ChevronDown size={20} color="#a855f7" /> : <ChevronRight size={20} color="#a855f7" />}
            <RegionIcon size={24} color="#a855f7" />
            <div>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>{region.name}</span>
              <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: '12px' }}>
                {REGION_TYPES.find(t => t.id === region.region_type)?.label || 'Region'}
              </span>
            </div>
            {isNew && (
              <span style={{ background: '#22c55e', color: '#000', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                JUST CREATED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <Button className="btn-icon" style={{ padding: '8px' }} onClick={() => openCreateDialog('settlement', region.id)} title="Add City/Town">
              <Plus size={18} />
            </Button>
            <Button className="btn-icon" style={{ padding: '8px' }} onClick={() => openEditDialog('region', region, continentId)}>
              <Edit size={18} />
            </Button>
            <Button className="btn-danger" style={{ padding: '8px' }} onClick={() => handleDelete('region', region.id)}>
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
        
        {isExpanded && settlements.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            {settlements.map(settlement => renderSettlement(settlement, region.id))}
          </div>
        )}
        
        {isExpanded && settlements.length === 0 && (
          <div style={{ marginLeft: '32px', padding: '16px', color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>
            No settlements yet. Click + to add a city, town, or village.
          </div>
        )}
      </div>
    );
  };

  const renderContinent = (continent) => {
    const ContinentIcon = CONTINENT_TYPES.find(t => t.id === continent.continent_type)?.icon || Globe;
    const isExpanded = expanded[continent.id];
    const isNew = lastGenerated?.entity_id === continent.id;
    const regions = continent.regions || [];
    
    return (
      <div key={continent.id} style={{ marginBottom: '20px' }}>
        <div 
          style={{
            padding: '20px 24px',
            background: isNew ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, rgba(30, 30, 60, 0.8) 0%, rgba(45, 45, 80, 0.8) 100%)',
            border: `3px solid ${isNew ? '#22c55e' : '#22c55e'}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.2)',
            animation: isNew ? 'glow 2s ease-in-out' : 'none'
          }}
          onClick={() => toggleExpand(continent.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isExpanded ? <ChevronDown size={24} color="#22c55e" /> : <ChevronRight size={24} color="#22c55e" />}
            <ContinentIcon size={32} color="#22c55e" />
            <div>
              <h3 style={{ color: '#fff', fontWeight: '800', fontSize: '20px', margin: 0 }}>{continent.name}</h3>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                {CONTINENT_TYPES.find(t => t.id === continent.continent_type)?.label || 'Continent'} • {regions.length} regions
              </span>
            </div>
            {isNew && (
              <span style={{ background: '#22c55e', color: '#000', padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '700' }}>
                JUST CREATED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }} onClick={e => e.stopPropagation()}>
            <Button className="btn-primary" style={{ padding: '10px 14px' }} onClick={() => openCreateDialog('region', continent.id)} title="Add Country/Region">
              <Plus size={20} />
            </Button>
            <Button className="btn-icon" style={{ padding: '10px' }} onClick={() => openEditDialog('continent', continent)}>
              <Edit size={20} />
            </Button>
            <Button className="btn-danger" style={{ padding: '10px' }} onClick={() => handleDelete('continent', continent.id)}>
              <Trash2 size={20} />
            </Button>
          </div>
        </div>
        
        {isExpanded && regions.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {regions.map(region => renderRegion(region, continent.id))}
          </div>
        )}
        
        {isExpanded && regions.length === 0 && (
          <div style={{ marginLeft: '16px', padding: '20px', color: '#64748b', fontSize: '15px', fontStyle: 'italic' }}>
            No countries or regions yet. Click + to add one.
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader className="animate-spin" size={32} color="#22c55e" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
            World Builder
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Build your world from continents down to taverns
          </p>
        </div>
        <Button 
          onClick={() => openCreateDialog('continent')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          data-testid="add-continent-btn"
        >
          <Globe size={20} />
          Add Continent
        </Button>
      </div>

      {/* Quick Tips */}
      <QuickTips 
        tips={TIPS.worldBuilder} 
        pageId="worldBuilder" 
        title="World Builder Tips"
      />

      {/* Hierarchy Legend */}
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '10px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '13px' }}>
          <Globe size={16} /> Continents
        </div>
        <span style={{ color: '#374151' }}>→</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '13px' }}>
          <Castle size={16} /> Countries/Regions
        </div>
        <span style={{ color: '#374151' }}>→</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4a7dff', fontSize: '13px' }}>
          <Building size={16} /> Cities/Towns
        </div>
        <span style={{ color: '#374151' }}>→</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', fontSize: '13px' }}>
          <Store size={16} /> Places
        </div>
      </div>

      {/* World Content */}
      {worldData.continents?.length === 0 ? (
        <Card style={{ background: 'rgba(30, 30, 60, 0.5)', border: '2px dashed #374151' }}>
          <CardContent style={{ padding: '60px', textAlign: 'center' }}>
            <Globe size={64} color="#22c55e" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>Your world awaits</h3>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              Start by adding a continent, then build out countries, cities, and places of interest.
            </p>
            <Button onClick={() => openCreateDialog('continent')} className="btn-primary">
              <Globe size={20} style={{ marginRight: '8px' }} />
              Create Your First Continent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {worldData.continents.map(continent => renderContinent(continent))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent style={{
          background: 'linear-gradient(180deg, #1a1a3e 0%, #0f0f23 100%)',
          border: '2px solid #22c55e',
          maxWidth: '500px'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {editingItem ? `Edit ${getTypeLabel()}` : `Add ${getTypeLabel()}`}
            </DialogTitle>
          </DialogHeader>
          
          {/* AI Generation */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid #22c55e',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Wand2 size={18} color="#22c55e" />
              <span style={{ color: '#22c55e', fontWeight: '600' }}>ROOK</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Describe a ${dialogType}...`}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid #374151', color: '#fff' }}
              />
              <Button 
                onClick={handleAIGenerate} 
                disabled={aiGenerating}
                className="btn-primary"
              >
                {aiGenerating ? <Loader className="animate-spin" size={18} /> : <Wand2 size={18} />}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '6px', display: 'block' }}>Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`${getTypeLabel()} name`}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid #374151', color: '#fff' }}
                />
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '6px', display: 'block' }}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '2px solid #374151',
                    color: '#fff'
                  }}
                >
                  <option value="">Select type...</option>
                  {getTypeOptions().map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '6px', display: 'block' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this location..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '2px solid #374151',
                    color: '#fff',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <Button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingItem ? 'Save Changes' : 'Create'}
                </Button>
                <Button type="button" onClick={() => setShowDialog(false)} className="btn-secondary">
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WorldBuilderTab;
