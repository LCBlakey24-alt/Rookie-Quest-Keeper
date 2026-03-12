import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Loader, Store, ChevronDown, ChevronUp, Building, Beer, Church, Hammer, Home, BookOpen, X, Wand2, Check, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const PLACE_TYPES = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'tavern', label: 'Tavern/Inn', icon: Beer },
  { id: 'temple', label: 'Temple', icon: Church },
  { id: 'blacksmith', label: 'Blacksmith', icon: Hammer },
  { id: 'guild', label: 'Guild Hall', icon: Building },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'residence', label: 'Residence', icon: Home },
  { id: 'other', label: 'Other', icon: MapPin }
];

function LocationsTab({ campaignId }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location_type: '',
    description: '',
    notable_npcs: '',
    notes: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [generationType, setGenerationType] = useState('location'); // 'location' or 'place'
  const [selectedLocationForPlace, setSelectedLocationForPlace] = useState('');
  
  // Places of Interest state
  const [showPlaceDialog, setShowPlaceDialog] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [placeFormData, setPlaceFormData] = useState({
    name: '',
    place_type: 'shop',
    description: '',
    owner: '',
    services: '',
    notes: ''
  });

  useEffect(() => {
    fetchLocations();
  }, [campaignId]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/locations`);
      setLocations(response.data);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await axios.put(`${API}/campaigns/${campaignId}/locations/${editingLocation.id}`, formData);
        toast.success('Location updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/locations`, formData);
        toast.success('Location added!');
      }
      fetchLocations();
      resetForm();
    } catch (error) {
      toast.error('Failed to save location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      location_type: location.location_type,
      description: location.description,
      notable_npcs: location.notable_npcs,
      notes: location.notes
    });
    setShowDialog(true);
  };

  const handleDelete = async (locationId) => {
    if (deletingLocation === locationId) {
      try {
        const loc = locations.find(l => l.id === locationId);
        await axios.delete(`${API}/campaigns/${campaignId}/locations/${locationId}`);
        toast.success(`${loc?.name || 'Location'} removed`, {
          description: 'Location has been deleted'
        });
        fetchLocations();
      } catch (error) {
        toast.error('Failed to delete location');
      } finally {
        setDeletingLocation(null);
      }
    } else {
      setDeletingLocation(locationId);
      setTimeout(() => setDeletingLocation(null), 5000);
    }
  };

  // Filter locations by search
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.location_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      location_type: '',
      description: '',
      notable_npcs: '',
      notes: ''
    });
    setEditingLocation(null);
    setShowDialog(false);
  };

  // Places of Interest handlers
  const toggleLocationExpand = (locationId) => {
    setExpandedLocations(prev => ({
      ...prev,
      [locationId]: !prev[locationId]
    }));
  };

  const openAddPlaceDialog = (locationId) => {
    setSelectedLocationId(locationId);
    setEditingPlace(null);
    setPlaceFormData({
      name: '',
      place_type: 'shop',
      description: '',
      owner: '',
      services: '',
      notes: ''
    });
    setShowPlaceDialog(true);
  };

  const openEditPlaceDialog = (locationId, place) => {
    setSelectedLocationId(locationId);
    setEditingPlace(place);
    setPlaceFormData({
      name: place.name || '',
      place_type: place.place_type || 'shop',
      description: place.description || '',
      owner: place.owner || '',
      services: place.services || '',
      notes: place.notes || ''
    });
    setShowPlaceDialog(true);
  };

  const handlePlaceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlace) {
        await axios.put(`${API}/campaigns/${campaignId}/locations/${selectedLocationId}/places/${editingPlace.id}`, placeFormData);
        toast.success('Place updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/locations/${selectedLocationId}/places`, placeFormData);
        toast.success('Place added!');
      }
      fetchLocations();
      setShowPlaceDialog(false);
    } catch (error) {
      toast.error('Failed to save place');
    }
  };

  const handleDeletePlace = async (locationId, placeId) => {
    if (!window.confirm('Delete this place?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/locations/${locationId}/places/${placeId}`);
      toast.success('Place deleted');
      fetchLocations();
    } catch (error) {
      toast.error('Failed to delete place');
    }
  };

  const getPlaceIcon = (placeType) => {
    const type = PLACE_TYPES.find(t => t.id === placeType);
    return type ? type.icon : MapPin;
  };

  // ROOK - Auto-generate and save
  const handleUnseenServant = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to create');
      return;
    }
    
    if (generationType === 'place' && !selectedLocationForPlace) {
      toast.error('Please select a location for the place of interest');
      return;
    }
    
    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const requestData = {
        prompt: aiPrompt,
        entity_type: generationType === 'place' ? 'place_of_interest' : 'location',
        campaign_id: campaignId
      };
      
      if (generationType === 'place') {
        requestData.location_id = selectedLocationForPlace;
      }
      
      const response = await axios.post(`${API}/rook/generate`, requestData);
      
      if (response.data.success) {
        const message = generationType === 'place' 
          ? `✨ ${response.data.entity_name} has been added!`
          : `✨ ${response.data.entity_name} has been added to your world!`;
        toast.success(message);
        setLastGenerated(response.data);
        setAiPrompt('');
        fetchLocations();
        
        // Auto-expand the location if we added a place
        if (generationType === 'place') {
          setExpandedLocations(prev => ({ ...prev, [selectedLocationForPlace]: true }));
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'The ROOK failed to create';
      toast.error(errorMsg);
    } finally {
      setAiGenerating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff', marginBottom: '24px' }}>Locations</h2>
        <LoadingSkeleton type="grid" count={3} />
      </div>
    );
  }

  // Empty state
  if (locations.length === 0) {
    return (
      <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        <EmptyState
          icon={MapPin}
          title="No Locations Yet"
          description="Build your world by adding locations. Create cities, dungeons, forests, and more. Use the ROOK AI to generate them instantly."
          actionLabel="Create Your First Location"
          onAction={() => setShowDialog(true)}
          color="#22c55e"
        />
        
        {/* ROOK Panel - still show for empty state */}
        <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
          <Card className="parchment-dark" style={{ border: '2px solid #22c55e' }}>
            <CardHeader>
              <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 size={20} style={{ color: '#22c55e' }} />
                ROOK
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '16px', lineHeight: '1.5' }}>
                Describe a location and the ROOK will create it for your world.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  data-testid="rook-location-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="textarea"
                  style={{ minHeight: '100px', fontSize: '13px', borderColor: '#22c55e' }}
                  placeholder="Example: A haunted castle on a cliff overlooking a dark forest"
                />
              </div>
              <Button
                data-testid="summon-location-btn"
                onClick={handleUnseenServant}
                disabled={aiGenerating}
                className="btn-primary"
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: 'none'
                }}
              >
                {aiGenerating ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Summoning...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Summon Location
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Dialog for manual creation */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogContent className="modal" style={{ maxWidth: '600px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Add Location
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                <Input
                  data-testid="location-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="btn-primary">Add Location</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff' }}>
            Locations <span style={{ fontSize: '18px', color: '#94a3b8' }}>({filteredLocations.length})</span>
          </h2>
          <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-location-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                <Plus size={18} />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="modal" style={{ maxWidth: '600px' }}>
              <DialogHeader>
                <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                  {editingLocation ? 'Edit Location' : 'Add Location'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                    <Input
                      data-testid="location-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Type</label>
                    <Input
                      data-testid="location-type-input"
                      value={formData.location_type}
                      onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                      className="input"
                      placeholder="City, Dungeon, Forest..."
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                  <textarea
                    data-testid="location-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="textarea"
                    style={{ minHeight: '100px' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notable NPCs</label>
                  <Input
                    data-testid="location-npcs-input"
                    value={formData.notable_npcs}
                    onChange={(e) => setFormData({ ...formData, notable_npcs: e.target.value })}
                    className="input"
                    placeholder="Key NPCs found here..."
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                  <textarea
                    data-testid="location-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="textarea"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                  <Button data-testid="location-submit-btn" type="submit" className="btn-primary">{editingLocation ? 'Update' : 'Add'} Location</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        {locations.length > 3 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#94a3b8' 
                }} 
              />
              <Input
                placeholder="Search locations by name, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
        )}

        {/* No results from search */}
        {filteredLocations.length === 0 && searchTerm && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>No locations found matching "{searchTerm}"</p>
            <Button 
              onClick={() => setSearchTerm('')}
              className="btn-outline"
              style={{ marginTop: '12px' }}
            >
              Clear Search
            </Button>
          </div>
        )}

        {/* Place of Interest Dialog */}
        <Dialog open={showPlaceDialog} onOpenChange={setShowPlaceDialog}>
          <DialogContent className="modal" style={{ maxWidth: '550px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '22px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Store size={22} style={{ color: '#22c55e' }} />
                {editingPlace ? 'Edit Place' : 'Add Place of Interest'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePlaceSubmit} style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Name *</label>
                  <Input
                    data-testid="place-name-input"
                    value={placeFormData.name}
                    onChange={(e) => setPlaceFormData({ ...placeFormData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., The Rusty Tankard"
                    required
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Type</label>
                  <select
                    data-testid="place-type-select"
                    value={placeFormData.place_type}
                    onChange={(e) => setPlaceFormData({ ...placeFormData, place_type: e.target.value })}
                    className="input"
                    style={{ height: '40px', width: '100%' }}
                  >
                    {PLACE_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Owner/Proprietor</label>
                <Input
                  data-testid="place-owner-input"
                  value={placeFormData.owner}
                  onChange={(e) => setPlaceFormData({ ...placeFormData, owner: e.target.value })}
                  className="input"
                  placeholder="e.g., Grumgar the Dwarf"
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Description</label>
                <textarea
                  data-testid="place-description-input"
                  value={placeFormData.description}
                  onChange={(e) => setPlaceFormData({ ...placeFormData, description: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Describe this place..."
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Services/Items Offered</label>
                <textarea
                  data-testid="place-services-input"
                  value={placeFormData.services}
                  onChange={(e) => setPlaceFormData({ ...placeFormData, services: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="What can players buy, do, or find here?"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Notes</label>
                <textarea
                  data-testid="place-notes-input"
                  value={placeFormData.notes}
                  onChange={(e) => setPlaceFormData({ ...placeFormData, notes: e.target.value })}
                  className="textarea"
                  placeholder="GM notes, secrets, hooks..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={() => setShowPlaceDialog(false)}>Cancel</Button>
                <Button data-testid="place-submit-btn" type="submit" className="btn-primary">{editingPlace ? 'Update' : 'Add'} Place</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {filteredLocations.length === 0 && !searchTerm ? (
          <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#bae6fd' }}>No locations added yet. Build your world!</p>
          </Card>
        ) : filteredLocations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredLocations.map(location => {
              const isExpanded = expandedLocations[location.id];
              const places = location.places_of_interest || [];
              const isNewlyCreated = lastGenerated?.entity_id === location.id;
              
              return (
                <Card 
                  key={location.id} 
                  data-testid={`location-card-${location.id}`} 
                  className="card" 
                  style={{ 
                    overflow: 'visible',
                    animation: isNewlyCreated ? 'glow-pulse 2s ease-out' : 'none',
                    border: isNewlyCreated ? '2px solid #22c55e' : undefined
                  }}
                >
                  <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <MapPin size={24} style={{ color: '#22c55e', marginTop: '4px' }} />
                      <div style={{ flex: 1 }}>
                        <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {location.name}
                          {isNewlyCreated && (
                            <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} /> Just created
                            </span>
                          )}
                        </CardTitle>
                        {location.location_type && (
                          <p style={{ fontSize: '14px', color: '#67e8f9' }}>{location.location_type}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button data-testid={`edit-location-btn-${location.id}`} onClick={() => handleEdit(location)} className="btn-secondary" style={{ padding: '8px' }}>
                          <Edit size={14} />
                        </Button>
                        
                        {/* Delete with confirmation */}
                        {deletingLocation === location.id ? (
                          <div style={{ 
                            display: 'flex', 
                            gap: '4px', 
                            alignItems: 'center',
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid #ef4444'
                          }}>
                            <span style={{ fontSize: '11px', color: '#fff', whiteSpace: 'nowrap' }}>Delete?</span>
                            <Button
                              data-testid={`confirm-delete-location-${location.id}`}
                              onClick={() => handleDelete(location.id)}
                              className="btn-icon"
                              style={{ background: '#ef4444', minHeight: '28px', minWidth: '28px', padding: '4px' }}
                            >
                              <Check size={12} />
                            </Button>
                            <Button
                              onClick={() => setDeletingLocation(null)}
                              className="btn-icon"
                              style={{ minHeight: '28px', minWidth: '28px', padding: '4px' }}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        ) : (
                          <Button data-testid={`delete-location-btn-${location.id}`} onClick={() => handleDelete(location.id)} className="btn-danger" style={{ padding: '8px' }}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {location.description && (
                      <p style={{ fontSize: '14px', color: '#ffffff', marginBottom: '12px', lineHeight: '1.5' }}>{location.description}</p>
                    )}
                    {location.notable_npcs && (
                      <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 31, 143, 0.1)', borderRadius: '6px' }}>
                        <p style={{ fontSize: '12px', color: '#67e8f9', marginBottom: '4px' }}>Notable NPCs</p>
                        <p style={{ fontSize: '14px', color: '#ffffff' }}>{location.notable_npcs}</p>
                      </div>
                    )}
                    {location.notes && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontStyle: 'italic' }}>{location.notes}</p>
                    )}
                    
                    {/* Places of Interest Section */}
                    <div style={{ marginTop: '16px', borderTop: '1px solid #1e40af', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <button
                          onClick={() => toggleLocationExpand(location.id)}
                          data-testid={`toggle-places-${location.id}`}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: 0
                          }}
                        >
                          <Store size={16} style={{ color: '#22c55e' }} />
                          <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>
                            PLACES OF INTEREST ({places.length})
                          </span>
                          {isExpanded ? <ChevronUp size={16} style={{ color: '#22c55e' }} /> : <ChevronDown size={16} style={{ color: '#22c55e' }} />}
                        </button>
                        <Button
                          data-testid={`add-place-btn-${location.id}`}
                          onClick={() => openAddPlaceDialog(location.id)}
                          className="btn-outline"
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '11px',
                            borderColor: '#22c55e',
                            color: '#22c55e',
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center'
                          }}
                        >
                          <Plus size={12} />
                          Add Place
                        </Button>
                      </div>
                      
                      {isExpanded && places.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {places.map(place => {
                            const TypeIcon = getPlaceIcon(place.place_type);
                            const typeLabel = PLACE_TYPES.find(t => t.id === place.place_type)?.label || 'Place';
                            const isNewPlace = lastGenerated?.entity_id === place.id;
                            
                            return (
                              <div
                                key={place.id}
                                data-testid={`place-card-${place.id}`}
                                style={{
                                  background: 'rgba(34, 197, 94, 0.08)',
                                  border: isNewPlace ? '2px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.3)',
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  animation: isNewPlace ? 'glow-pulse 2s ease-out' : 'none'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <TypeIcon size={18} style={{ color: '#22c55e' }} />
                                    <div>
                                      <h5 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {place.name}
                                        {isNewPlace && <Check size={12} style={{ color: '#22c55e' }} />}
                                      </h5>
                                      <span style={{ 
                                        fontSize: '10px', 
                                        color: '#22c55e', 
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontWeight: '600'
                                      }}>
                                        {typeLabel}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      data-testid={`edit-place-btn-${place.id}`}
                                      onClick={() => openEditPlaceDialog(location.id, place)}
                                      style={{
                                        background: 'rgba(74, 125, 255, 0.2)',
                                        border: '1px solid #4a7dff',
                                        borderRadius: '4px',
                                        color: '#4a7dff',
                                        padding: '4px 6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      data-testid={`delete-place-btn-${place.id}`}
                                      onClick={() => handleDeletePlace(location.id, place.id)}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid #ef4444',
                                        borderRadius: '4px',
                                        color: '#ef4444',
                                        padding: '4px 6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                                
                                {place.owner && (
                                  <p style={{ fontSize: '12px', color: '#67e8f9', marginBottom: '4px' }}>
                                    <strong>Owner:</strong> {place.owner}
                                  </p>
                                )}
                                {place.description && (
                                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', lineHeight: '1.4' }}>
                                    {place.description}
                                  </p>
                                )}
                                {place.services && (
                                  <div style={{ 
                                    marginTop: '6px', 
                                    padding: '6px 8px', 
                                    background: 'rgba(10, 10, 40, 0.4)', 
                                    borderRadius: '6px' 
                                  }}>
                                    <p style={{ fontSize: '11px', color: '#eab308', marginBottom: '2px', fontWeight: '600' }}>Services/Items</p>
                                    <p style={{ fontSize: '11px', color: '#ffffff' }}>{place.services}</p>
                                  </div>
                                )}
                                {place.notes && (
                                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                                    {place.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {isExpanded && places.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                          No places added yet. Add shops, taverns, temples, and more!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ROOK Panel */}
      <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '2px solid #22c55e' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wand2 size={20} style={{ color: '#22c55e' }} />
              ROOK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: '13px', color: '#86efac', marginBottom: '16px', lineHeight: '1.5' }}>
              Generate locations or places of interest and auto-save them to your world.
            </p>
            
            {/* Generation Type Toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>
                What to create?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setGenerationType('location')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: generationType === 'location' ? '2px solid #22c55e' : '1px solid #374151',
                    background: generationType === 'location' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                    color: generationType === 'location' ? '#22c55e' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <MapPin size={14} />
                  Location
                </button>
                <button
                  onClick={() => setGenerationType('place')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: generationType === 'place' ? '2px solid #22c55e' : '1px solid #374151',
                    background: generationType === 'place' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                    color: generationType === 'place' ? '#22c55e' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Store size={14} />
                  Place
                </button>
              </div>
            </div>
            
            {/* Location selector for places */}
            {generationType === 'place' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>
                  Add to which location?
                </label>
                <select
                  value={selectedLocationForPlace}
                  onChange={(e) => setSelectedLocationForPlace(e.target.value)}
                  className="input"
                  style={{ width: '100%', borderColor: '#22c55e' }}
                >
                  <option value="">Select a location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#22c55e', fontWeight: '600' }}>
                {generationType === 'place' ? 'Describe the place' : 'Describe the location'}
              </label>
              <textarea
                data-testid="rook-location-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="textarea"
                style={{ minHeight: '100px', fontSize: '13px', borderColor: '#22c55e' }}
                placeholder={generationType === 'place' 
                  ? "Example: A seedy tavern where criminals meet to plan heists"
                  : "Example: A bustling port city with secret underground markets"
                }
              />
            </div>
            <Button
              data-testid="summon-location-btn"
              onClick={handleUnseenServant}
              disabled={aiGenerating}
              className="btn-primary"
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none'
              }}
            >
              {aiGenerating ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Summoning...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  {generationType === 'place' ? 'Summon Place' : 'Summon Location'}
                </>
              )}
            </Button>
            
            {lastGenerated && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(34, 197, 94, 0.15)', 
                border: '1px solid #22c55e',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Check size={16} style={{ color: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '13px' }}>Created!</span>
                </div>
                <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>{lastGenerated.entity_name}</p>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                  Click the edit button on the card to make changes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <style>{`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.6); }
          100% { box-shadow: 0 0 0px rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
}

export default LocationsTab;
