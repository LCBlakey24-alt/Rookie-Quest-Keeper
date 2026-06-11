import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Plus, Edit, Trash2, MapPin, Loader, Store, ChevronDown, ChevronUp,
  Building, Beer, Church, Hammer, Home, BookOpen, X, Wand2, Check, Search
} from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  success: 'var(--rq-success, #2E8B57)',
  danger: 'var(--rq-danger, #C1121F)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

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

const emptyLocationForm = {
  name: '',
  location_type: '',
  description: '',
  notable_npcs: '',
  notes: ''
};

const emptyPlaceForm = {
  name: '',
  place_type: 'shop',
  description: '',
  owner: '',
  services: '',
  notes: ''
};

function LocationsTab({ campaignId }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState(emptyLocationForm);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [generationType, setGenerationType] = useState('location');
  const [selectedLocationForPlace, setSelectedLocationForPlace] = useState('');
  const [showPlaceDialog, setShowPlaceDialog] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [placeFormData, setPlaceFormData] = useState(emptyPlaceForm);

  useEffect(() => {
    fetchLocations();
  }, [campaignId]);

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/locations`);
      setLocations(response.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter(location =>
      location.name?.toLowerCase().includes(query) ||
      location.location_type?.toLowerCase().includes(query) ||
      location.description?.toLowerCase().includes(query)
    );
  }, [locations, searchTerm]);

  const resetForm = () => {
    setFormData(emptyLocationForm);
    setEditingLocation(null);
    setShowDialog(false);
  };

  const resetPlaceForm = () => {
    setPlaceFormData(emptyPlaceForm);
    setEditingPlace(null);
    setSelectedLocationId(null);
    setShowPlaceDialog(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    try {
      if (editingLocation) {
        await apiClient.put(`/campaigns/${campaignId}/locations/${editingLocation.id}`, formData);
        toast.success('Location updated!');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/locations`, formData);
        toast.success('Location added!');
      }
      await fetchLocations();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      location_type: location.location_type || '',
      description: location.description || '',
      notable_npcs: location.notable_npcs || '',
      notes: location.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (locationId) => {
    if (deletingLocation !== locationId) {
      setDeletingLocation(locationId);
      setTimeout(() => setDeletingLocation(null), 5000);
      return;
    }

    try {
      const location = locations.find(item => item.id === locationId);
      await apiClient.delete(`/campaigns/${campaignId}/locations/${locationId}`);
      toast.success(`${location?.name || 'Location'} removed`, { description: 'Location has been deleted' });
      setDeletingLocation(null);
      await fetchLocations();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete location');
      setDeletingLocation(null);
    }
  };

  const toggleLocationExpand = (locationId) => {
    setExpandedLocations(prev => ({ ...prev, [locationId]: !prev[locationId] }));
  };

  const openAddPlaceDialog = (locationId) => {
    setSelectedLocationId(locationId);
    setEditingPlace(null);
    setPlaceFormData(emptyPlaceForm);
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

  const handlePlaceSubmit = async (event) => {
    event.preventDefault();
    if (!selectedLocationId || !placeFormData.name.trim()) {
      toast.error('Place name is required');
      return;
    }

    try {
      if (editingPlace) {
        await apiClient.put(`/campaigns/${campaignId}/locations/${selectedLocationId}/places/${editingPlace.id}`, placeFormData);
        toast.success('Place updated!');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/locations/${selectedLocationId}/places`, placeFormData);
        toast.success('Place added!');
      }
      await fetchLocations();
      resetPlaceForm();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save place');
    }
  };

  const handleDeletePlace = async (locationId, placeId) => {
    if (!window.confirm('Delete this place?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/locations/${locationId}/places/${placeId}`);
      toast.success('Place deleted');
      await fetchLocations();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete place');
    }
  };

  const getPlaceIcon = (placeType) => PLACE_TYPES.find(type => type.id === placeType)?.icon || MapPin;

  const handleRookGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want Rook to create');
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
      if (generationType === 'place') requestData.location_id = selectedLocationForPlace;

      const response = await apiClient.post('/rook/generate', requestData);

      if (response.data.success) {
        toast.success(
          generationType === 'place'
            ? `Rook added ${response.data.entity_name}!`
            : `Rook added ${response.data.entity_name} to your world!`
        );
        setLastGenerated(response.data);
        setAiPrompt('');
        await fetchLocations();
        if (generationType === 'place') {
          setExpandedLocations(prev => ({ ...prev, [selectedLocationForPlace]: true }));
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Rook could not create this entry');
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="medieval-heading" style={headingStyle}>Locations</h2>
        <LoadingSkeleton type="grid" count={3} />
      </div>
    );
  }

  return (
    <div className="campaign-management-grid" style={layoutStyle}>
      <div>
        <div style={topBarStyle}>
          <h2 className="medieval-heading" style={headingStyle}>
            Locations <span style={countStyle}>({filteredLocations.length})</span>
          </h2>
          <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-location-btn" className="btn-primary" style={inlineButtonStyle}>
                <Plus size={18} />
                Add Location
              </Button>
            </DialogTrigger>
            <LocationDialog editingLocation={editingLocation} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onCancel={resetForm} />
          </Dialog>
        </div>

        {locations.length > 3 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={searchIconStyle} />
              <Input
                placeholder="Search locations by name, type, or description..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
        )}

        {locations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No Locations Yet"
            description="Build your world by adding locations. Create cities, dungeons, forests, and more. Ask Rook to draft text entries for you."
            actionLabel="Create Your First Location"
            onAction={() => setShowDialog(true)}
            color={rq.accent}
          />
        ) : filteredLocations.length === 0 ? (
          <Card style={emptyCardStyle}>
            <p style={{ color: rq.muted }}>No locations found matching "{searchTerm}"</p>
            <Button onClick={() => setSearchTerm('')} className="btn-outline" style={{ marginTop: '12px' }}>Clear Search</Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredLocations.map(location => (
              <LocationCard
                key={location.id}
                location={location}
                isExpanded={!!expandedLocations[location.id]}
                isNewlyCreated={lastGenerated?.entity_id === location.id}
                deletingLocation={deletingLocation}
                onToggle={() => toggleLocationExpand(location.id)}
                onEdit={() => handleEdit(location)}
                onDelete={() => handleDelete(location.id)}
                onCancelDelete={() => setDeletingLocation(null)}
                onAddPlace={() => openAddPlaceDialog(location.id)}
                onEditPlace={(place) => openEditPlaceDialog(location.id, place)}
                onDeletePlace={(placeId) => handleDeletePlace(location.id, placeId)}
                getPlaceIcon={getPlaceIcon}
                lastGenerated={lastGenerated}
              />
            ))}
          </div>
        )}
      </div>

      <RookPanel
        locations={locations}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        aiGenerating={aiGenerating}
        generationType={generationType}
        setGenerationType={setGenerationType}
        selectedLocationForPlace={selectedLocationForPlace}
        setSelectedLocationForPlace={setSelectedLocationForPlace}
        lastGenerated={lastGenerated}
        onGenerate={handleRookGenerate}
      />

      <Dialog open={showPlaceDialog} onOpenChange={(open) => { if (!open) resetPlaceForm(); setShowPlaceDialog(open); }}>
        <PlaceDialog editingPlace={editingPlace} placeFormData={placeFormData} setPlaceFormData={setPlaceFormData} onSubmit={handlePlaceSubmit} onCancel={resetPlaceForm} />
      </Dialog>

      <style>{`@keyframes glow-pulse { 0% { box-shadow: 0 0 20px rgba(193,18,31,0.5); } 100% { box-shadow: 0 0 0 rgba(193,18,31,0); } }`}</style>
    </div>
  );
}

function LocationDialog({ editingLocation, formData, setFormData, onSubmit, onCancel }) {
  return (
    <DialogContent className="modal" style={dialogStyle}>
      <DialogHeader>
        <DialogTitle className="medieval-heading" style={dialogTitleStyle}>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} style={{ marginTop: '20px' }}>
        <div style={twoColumnStyle}>
          <TextField label="Name" testId="location-name-input" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} required />
          <TextField label="Type" testId="location-type-input" value={formData.location_type} onChange={(value) => setFormData({ ...formData, location_type: value })} placeholder="City, Dungeon, Forest..." />
        </div>
        <TextAreaField label="Description" testId="location-description-input" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} minHeight="100px" />
        <TextField label="Notable NPCs" testId="location-npcs-input" value={formData.notable_npcs} onChange={(value) => setFormData({ ...formData, notable_npcs: value })} placeholder="Key NPCs found here..." />
        <TextAreaField label="Notes" testId="location-notes-input" value={formData.notes} onChange={(value) => setFormData({ ...formData, notes: value })} />
        <FormActions onCancel={onCancel} submitTestId="location-submit-btn" submitText={editingLocation ? 'Update Location' : 'Add Location'} />
      </form>
    </DialogContent>
  );
}

function PlaceDialog({ editingPlace, placeFormData, setPlaceFormData, onSubmit, onCancel }) {
  return (
    <DialogContent className="modal" style={{ ...dialogStyle, maxWidth: '550px' }}>
      <DialogHeader>
        <DialogTitle className="medieval-heading" style={{ ...dialogTitleStyle, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Store size={22} style={{ color: rq.accent }} />
          {editingPlace ? 'Edit Place' : 'Add Place of Interest'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} style={{ marginTop: '16px' }}>
        <div style={twoColumnStyle}>
          <TextField label="Name" testId="place-name-input" value={placeFormData.name} onChange={(value) => setPlaceFormData({ ...placeFormData, name: value })} placeholder="e.g., The Rusty Tankard" required />
          <div>
            <label style={labelStyle}>Type</label>
            <select
              data-testid="place-type-select"
              value={placeFormData.place_type}
              onChange={(event) => setPlaceFormData({ ...placeFormData, place_type: event.target.value })}
              className="input"
              style={{ height: '40px', width: '100%' }}
            >
              {PLACE_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </div>
        </div>
        <TextField label="Owner/Proprietor" testId="place-owner-input" value={placeFormData.owner} onChange={(value) => setPlaceFormData({ ...placeFormData, owner: value })} placeholder="e.g., Grumgar the Dwarf" />
        <TextAreaField label="Description" testId="place-description-input" value={placeFormData.description} onChange={(value) => setPlaceFormData({ ...placeFormData, description: value })} minHeight="80px" placeholder="Describe this place..." />
        <TextAreaField label="Services/Items Offered" testId="place-services-input" value={placeFormData.services} onChange={(value) => setPlaceFormData({ ...placeFormData, services: value })} minHeight="60px" placeholder="What can players buy, do, or find here?" />
        <TextAreaField label="Notes" testId="place-notes-input" value={placeFormData.notes} onChange={(value) => setPlaceFormData({ ...placeFormData, notes: value })} placeholder="GM notes, secrets, hooks..." />
        <FormActions onCancel={onCancel} submitTestId="place-submit-btn" submitText={editingPlace ? 'Update Place' : 'Add Place'} />
      </form>
    </DialogContent>
  );
}

function TextField({ label, testId, value, onChange, placeholder, required = false }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <Input data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} className="input" placeholder={placeholder} required={required} />
    </div>
  );
}

function TextAreaField({ label, testId, value, onChange, placeholder, minHeight = '80px' }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <textarea data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} className="textarea" style={{ minHeight }} placeholder={placeholder} />
    </div>
  );
}

function FormActions({ onCancel, submitText, submitTestId }) {
  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <Button type="button" className="btn-secondary" onClick={onCancel}>Cancel</Button>
      <Button data-testid={submitTestId} type="submit" className="btn-primary">{submitText}</Button>
    </div>
  );
}

function LocationCard({ location, isExpanded, isNewlyCreated, deletingLocation, onToggle, onEdit, onDelete, onCancelDelete, onAddPlace, onEditPlace, onDeletePlace, getPlaceIcon, lastGenerated }) {
  const places = location.places_of_interest || [];

  return (
    <Card data-testid={`location-card-${location.id}`} className="card" style={{ overflow: 'visible', animation: isNewlyCreated ? 'glow-pulse 2s ease-out' : 'none', border: isNewlyCreated ? `2px solid ${rq.accent}` : `1px solid ${rq.border}` }}>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
          <MapPin size={24} style={{ color: rq.accent, marginTop: '4px' }} />
          <div style={{ flex: 1 }}>
            <CardTitle className="medieval-heading" style={cardTitleStyle}>
              {location.name}
              {isNewlyCreated && <span style={newBadgeStyle}><Check size={14} /> Just created</span>}
            </CardTitle>
            {location.location_type && <p style={typeTextStyle}>{location.location_type}</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button data-testid={`edit-location-btn-${location.id}`} onClick={onEdit} className="btn-secondary" style={{ padding: '8px' }}><Edit size={14} /></Button>
            {deletingLocation === location.id ? (
              <div style={deleteConfirmStyle}>
                <span style={{ fontSize: '11px', color: rq.text, whiteSpace: 'nowrap' }}>Delete?</span>
                <Button data-testid={`confirm-delete-location-${location.id}`} onClick={onDelete} className="btn-icon" style={confirmDeleteButtonStyle}><Check size={12} /></Button>
                <Button onClick={onCancelDelete} className="btn-icon" style={smallIconButtonStyle}><X size={12} /></Button>
              </div>
            ) : (
              <Button data-testid={`delete-location-btn-${location.id}`} onClick={onDelete} className="btn-danger" style={{ padding: '8px' }}><Trash2 size={14} /></Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {location.description && <p style={descriptionStyle}>{location.description}</p>}
        {location.notable_npcs && (
          <InfoBox title="Notable NPCs" value={location.notable_npcs} />
        )}
        {location.notes && <p style={notesStyle}>{location.notes}</p>}

        <div style={placesSectionStyle}>
          <div style={placesHeaderStyle}>
            <button onClick={onToggle} data-testid={`toggle-places-${location.id}`} style={toggleButtonStyle}>
              <Store size={16} style={{ color: rq.accent }} />
              <span style={placesTitleStyle}>PLACES OF INTEREST ({places.length})</span>
              {isExpanded ? <ChevronUp size={16} style={{ color: rq.accent }} /> : <ChevronDown size={16} style={{ color: rq.accent }} />}
            </button>
            <Button data-testid={`add-place-btn-${location.id}`} onClick={onAddPlace} className="btn-outline" style={addPlaceButtonStyle}>
              <Plus size={12} /> Add Place
            </Button>
          </div>

          {isExpanded && places.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {places.map(place => (
                <PlaceCard key={place.id} place={place} TypeIcon={getPlaceIcon(place.place_type)} isNewPlace={lastGenerated?.entity_id === place.id} onEdit={() => onEditPlace(place)} onDelete={() => onDeletePlace(place.id)} />
              ))}
            </div>
          )}

          {isExpanded && places.length === 0 && <p style={emptyPlacesStyle}>No places added yet. Add shops, taverns, temples, and more.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlaceCard({ place, TypeIcon, isNewPlace, onEdit, onDelete }) {
  const typeLabel = PLACE_TYPES.find(type => type.id === place.place_type)?.label || 'Place';

  return (
    <div data-testid={`place-card-${place.id}`} style={{ ...placeCardStyle, border: isNewPlace ? `2px solid ${rq.accent}` : `1px solid ${rq.border}` }}>
      <div style={placeTopRowStyle}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <TypeIcon size={18} style={{ color: rq.accent }} />
          <div>
            <h5 style={placeTitleStyle}>{place.name}{isNewPlace && <Check size={12} style={{ color: rq.accent }} />}</h5>
            <span style={placeTypeBadgeStyle}>{typeLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button data-testid={`edit-place-btn-${place.id}`} onClick={onEdit} style={placeActionButtonStyle}><Edit size={12} /></button>
          <button data-testid={`delete-place-btn-${place.id}`} onClick={onDelete} style={placeDangerButtonStyle}><X size={12} /></button>
        </div>
      </div>
      {place.owner && <p style={placeMetaStyle}><strong>Owner:</strong> {place.owner}</p>}
      {place.description && <p style={placeDescriptionStyle}>{place.description}</p>}
      {place.services && <InfoBox title="Services/Items" value={place.services} compact />}
      {place.notes && <p style={placeNotesStyle}>{place.notes}</p>}
    </div>
  );
}

function InfoBox({ title, value, compact = false }) {
  return (
    <div style={compact ? compactInfoBoxStyle : infoBoxStyle}>
      <p style={infoTitleStyle}>{title}</p>
      <p style={infoValueStyle}>{value}</p>
    </div>
  );
}

function RookPanel({ locations, aiPrompt, setAiPrompt, aiGenerating, generationType, setGenerationType, selectedLocationForPlace, setSelectedLocationForPlace, lastGenerated, onGenerate }) {
  return (
    <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
      <Card className="parchment-dark" style={rookPanelStyle}>
        <CardHeader>
          <CardTitle className="medieval-heading" style={rookTitleStyle}>
            <Wand2 size={20} style={{ color: rq.accent }} />
            Rook Location Helper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p style={rookIntroStyle}>Ask Rook to draft and auto-save text entries for locations or places of interest.</p>
          <div style={{ marginBottom: '16px' }}>
            <label style={rookLabelStyle}>What to create?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ToggleButton active={generationType === 'location'} onClick={() => setGenerationType('location')} icon={MapPin} label="Location" />
              <ToggleButton active={generationType === 'place'} onClick={() => setGenerationType('place')} icon={Store} label="Place" />
            </div>
          </div>

          {generationType === 'place' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={rookLabelStyle}>Add to which location?</label>
              <select value={selectedLocationForPlace} onChange={(event) => setSelectedLocationForPlace(event.target.value)} className="input" style={{ width: '100%', borderColor: rq.accent }}>
                <option value="">Select a location...</option>
                {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={rookLabelStyle}>{generationType === 'place' ? 'Describe the place' : 'Describe the location'}</label>
            <textarea
              data-testid="rook-location-prompt"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              className="textarea"
              style={{ minHeight: '100px', fontSize: '13px', borderColor: rq.accent }}
              placeholder={generationType === 'place' ? 'Example: A seedy tavern where criminals meet to plan heists' : 'Example: A bustling port city with secret underground markets'}
            />
          </div>
          <Button data-testid="summon-location-btn" onClick={onGenerate} disabled={aiGenerating} className="btn-primary" style={rookButtonStyle}>
            {aiGenerating ? <><Loader size={16} className="animate-spin" />Rook is drafting...</> : <><Wand2 size={16} />{generationType === 'place' ? 'Ask Rook for Place' : 'Ask Rook for Location'}</>}
          </Button>

          {lastGenerated && (
            <div style={lastGeneratedStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Check size={16} style={{ color: rq.accent }} />
                <span style={{ color: rq.accent, fontWeight: 900, fontSize: '13px' }}>Created</span>
              </div>
              <p style={{ color: rq.text, fontSize: '14px', fontWeight: 900 }}>{lastGenerated.entity_name}</p>
              <p style={{ color: rq.muted, fontSize: '12px', marginTop: '4px' }}>Use the edit button on the card to make changes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleButton({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick} style={toggleStyle(active)}>
      <Icon size={14} /> {label}
    </button>
  );
}

const layoutStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 'clamp(14px, 4vw, 24px)', minWidth: 0 };
const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' };
const headingStyle = { fontSize: '28px', color: rq.text, marginBottom: '24px' };
const countStyle = { fontSize: '18px', color: rq.muted };
const inlineButtonStyle = { display: 'flex', gap: '8px', borderRadius: rq.radiusSm };
const searchIconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: rq.muted };
const emptyCardStyle = { padding: '40px', textAlign: 'center', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius };
const dialogStyle = { maxWidth: '600px', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: rq.radius };
const dialogTitleStyle = { fontSize: '24px', color: rq.text };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' };
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', color: rq.accentHover, fontWeight: 900 };
const cardTitleStyle = { fontSize: '20px', color: rq.text, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' };
const newBadgeStyle = { fontSize: '12px', color: rq.accent, display: 'flex', alignItems: 'center', gap: '4px' };
const typeTextStyle = { fontSize: '14px', color: rq.accentHover };
const deleteConfirmStyle = { display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 8px', background: rq.accentSoft, borderRadius: rq.radiusSm, border: `1px solid ${rq.border}` };
const confirmDeleteButtonStyle = { background: rq.danger, minHeight: '28px', minWidth: '28px', padding: '4px' };
const smallIconButtonStyle = { minHeight: '28px', minWidth: '28px', padding: '4px' };
const descriptionStyle = { fontSize: '14px', color: rq.text, marginBottom: '12px', lineHeight: '1.5' };
const notesStyle = { fontSize: '12px', color: rq.muted, marginBottom: '12px', fontStyle: 'italic' };
const placesSectionStyle = { marginTop: '16px', borderTop: `1px solid ${rq.borderDefault}`, paddingTop: '16px' };
const placesHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' };
const toggleButtonStyle = { background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0 };
const placesTitleStyle = { color: rq.accent, fontSize: '13px', fontWeight: 900 };
const addPlaceButtonStyle = { padding: '4px 10px', fontSize: '11px', borderColor: rq.accent, color: rq.accent, display: 'flex', gap: '4px', alignItems: 'center', borderRadius: rq.radiusSm };
const emptyPlacesStyle = { fontSize: '12px', color: rq.muted, fontStyle: 'italic', textAlign: 'center', padding: '12px' };
const placeCardStyle = { background: rq.input, borderRadius: rq.radiusSm, padding: '12px 14px' };
const placeTopRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', gap: '12px' };
const placeTitleStyle = { color: rq.text, fontSize: '14px', fontWeight: 900, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' };
const placeTypeBadgeStyle = { fontSize: '10px', color: rq.accent, background: rq.accentSoft, padding: '2px 8px', borderRadius: rq.radiusSm, fontWeight: 900 };
const placeActionButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, color: rq.accent, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const placeDangerButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm, color: rq.danger, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const placeMetaStyle = { fontSize: '12px', color: rq.textSecondary, marginBottom: '4px' };
const placeDescriptionStyle = { fontSize: '12px', color: rq.muted, marginBottom: '4px', lineHeight: '1.4' };
const placeNotesStyle = { fontSize: '11px', color: rq.muted, marginTop: '6px', fontStyle: 'italic' };
const infoBoxStyle = { marginBottom: '12px', padding: '8px', background: rq.accentSoft, borderRadius: rq.radiusSm, border: `1px solid ${rq.border}` };
const compactInfoBoxStyle = { marginTop: '6px', padding: '6px 8px', background: rq.accentSoft, borderRadius: rq.radiusSm, border: `1px solid ${rq.border}` };
const infoTitleStyle = { fontSize: '12px', color: rq.accentHover, marginBottom: '4px', fontWeight: 900 };
const infoValueStyle = { fontSize: '14px', color: rq.text };
const rookPanelStyle = { border: `1px solid ${rq.border}`, background: rq.panel, borderRadius: rq.radius };
const rookTitleStyle = { fontSize: '20px', color: rq.text, display: 'flex', alignItems: 'center', gap: '8px' };
const rookIntroStyle = { fontSize: '13px', color: rq.textSecondary, marginBottom: '16px', lineHeight: '1.5' };
const rookLabelStyle = { display: 'block', marginBottom: '8px', fontSize: '12px', color: rq.accentHover, fontWeight: 900 };
const rookButtonStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: rq.radiusSm };
const toggleStyle = (active) => ({ flex: 1, padding: '8px 12px', borderRadius: rq.radiusSm, border: active ? `1px solid ${rq.accent}` : `1px solid ${rq.borderDefault}`, background: active ? rq.accentSoft : 'transparent', color: active ? rq.accentHover : rq.muted, fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' });
const lastGeneratedStyle = { marginTop: '16px', padding: '12px', background: rq.accentSoft, border: `1px solid ${rq.border}`, borderRadius: rq.radiusSm };

export default LocationsTab;
