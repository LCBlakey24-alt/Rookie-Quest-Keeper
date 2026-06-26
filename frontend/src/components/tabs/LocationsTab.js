import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Loader,
  Store,
  ChevronDown,
  ChevronUp,
  Building,
  Beer,
  Church,
  Hammer,
  Home,
  BookOpen,
  X,
  Wand2,
  Check,
  Search,
  Globe,
  Compass,
} from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import apiClient from '@/lib/apiClient';

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  input: '#242424',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  accent: '#d00000',
  accentHover: '#ff3b3b',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  soft: 'rgba(255,255,255,0.74)',
};

const LOCATION_TYPES = [
  { id: 'region', label: 'Region / Continent', hint: 'Large areas, kingdoms, continents, wild regions.', icon: Globe },
  { id: 'settlement', label: 'City / Town / Settlement', hint: 'Cities, towns, villages, camps, ports.', icon: Building },
  { id: 'dungeon', label: 'Dungeon / Ruin', hint: 'Dungeons, ruins, tombs, lairs, fortresses.', icon: Compass },
  { id: 'wilderness', label: 'Wilderness', hint: 'Forests, mountains, deserts, seas, roads.', icon: MapPin },
  { id: 'landmark', label: 'Landmark', hint: 'Famous places, monuments, towers, portals.', icon: MapPin },
  { id: 'base', label: 'Base / Hideout', hint: 'Party bases, faction bases, safehouses.', icon: Home },
  { id: 'realm', label: 'Plane / Realm', hint: 'Other planes, afterlives, pocket worlds.', icon: Globe },
  { id: 'other', label: 'Other', hint: 'Anything that does not neatly fit elsewhere.', icon: MapPin },
];

const PLACE_TYPES = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'tavern', label: 'Tavern / Inn', icon: Beer },
  { id: 'temple', label: 'Temple / Shrine', icon: Church },
  { id: 'blacksmith', label: 'Blacksmith / Workshop', icon: Hammer },
  { id: 'guild', label: 'Guild / Faction Hall', icon: Building },
  { id: 'library', label: 'Library / Archive', icon: BookOpen },
  { id: 'residence', label: 'Residence', icon: Home },
  { id: 'landmark', label: 'Local Landmark', icon: MapPin },
  { id: 'other', label: 'Other', icon: MapPin },
];

const emptyLocationForm = {
  name: '',
  location_type: 'settlement',
  description: '',
  notable_npcs: '',
  notes: '',
};

const emptyPlaceForm = {
  name: '',
  place_type: 'shop',
  description: '',
  owner: '',
  services: '',
  notes: '',
};

function typeLabel(typeId) {
  return LOCATION_TYPES.find(type => type.id === typeId)?.label || typeId || 'Location';
}

function typeHint(typeId) {
  return LOCATION_TYPES.find(type => type.id === typeId)?.hint || '';
}

function placeTypeLabel(typeId) {
  return PLACE_TYPES.find(type => type.id === typeId)?.label || typeId || 'Place';
}

function placeTypeIcon(typeId) {
  return PLACE_TYPES.find(type => type.id === typeId)?.icon || MapPin;
}

function sortLocations(items) {
  return [...items].sort((a, b) => {
    const typeCompare = typeLabel(a.location_type).localeCompare(typeLabel(b.location_type));
    if (typeCompare !== 0) return typeCompare;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function LocationsTab({ campaignId }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState(emptyLocationForm);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [showPlaceDialog, setShowPlaceDialog] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [placeFormData, setPlaceFormData] = useState(emptyPlaceForm);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [generationType, setGenerationType] = useState('location');
  const [selectedLocationForPlace, setSelectedLocationForPlace] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [campaignId]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/campaigns/${campaignId}/locations`);
      setLocations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const sortedLocations = useMemo(() => sortLocations(locations), [locations]);

  const filteredLocations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedLocations.filter(location => {
      const matchesType = typeFilter === 'all' || location.location_type === typeFilter;
      const matchesSearch = !query || [
        location.name,
        typeLabel(location.location_type),
        location.location_type,
        location.description,
        location.notable_npcs,
        location.notes,
        ...(location.places_of_interest || []).flatMap(place => [place.name, place.description, place.owner, place.services, place.notes]),
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [sortedLocations, searchTerm, typeFilter]);

  const stats = useMemo(() => {
    const places = locations.reduce((total, location) => total + (location.places_of_interest?.length || 0), 0);
    const types = new Set(locations.map(location => location.location_type).filter(Boolean));
    return { locations: locations.length, places, types: types.size };
  }, [locations]);

  const resetLocationForm = () => {
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

    const payload = {
      name: formData.name.trim(),
      location_type: formData.location_type || 'other',
      description: formData.description.trim(),
      notable_npcs: formData.notable_npcs.trim(),
      notes: formData.notes.trim(),
    };

    try {
      if (editingLocation) {
        await apiClient.put(`/campaigns/${campaignId}/locations/${editingLocation.id}`, payload);
        toast.success('Location updated');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/locations`, payload);
        toast.success('Location added');
      }
      await fetchLocations();
      resetLocationForm();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      location_type: location.location_type || 'other',
      description: location.description || '',
      notable_npcs: location.notable_npcs || '',
      notes: location.notes || '',
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
      toast.success(`${location?.name || 'Location'} removed`);
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
      place_type: place.place_type || 'other',
      description: place.description || '',
      owner: place.owner || '',
      services: place.services || '',
      notes: place.notes || '',
    });
    setShowPlaceDialog(true);
  };

  const handlePlaceSubmit = async (event) => {
    event.preventDefault();
    if (!selectedLocationId || !placeFormData.name.trim()) {
      toast.error('Place name is required');
      return;
    }

    const payload = {
      name: placeFormData.name.trim(),
      place_type: placeFormData.place_type || 'other',
      description: placeFormData.description.trim(),
      owner: placeFormData.owner.trim(),
      services: placeFormData.services.trim(),
      notes: placeFormData.notes.trim(),
    };

    try {
      if (editingPlace) {
        await apiClient.put(`/campaigns/${campaignId}/locations/${selectedLocationId}/places/${editingPlace.id}`, payload);
        toast.success('Place updated');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/locations/${selectedLocationId}/places`, payload);
        toast.success('Place added');
      }
      await fetchLocations();
      setExpandedLocations(prev => ({ ...prev, [selectedLocationId]: true }));
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

  const handleRookGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Describe what you want Rook to create');
      return;
    }
    if (generationType === 'place' && !selectedLocationForPlace) {
      toast.error('Choose a location for this place of interest');
      return;
    }

    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const requestData = {
        prompt: aiPrompt,
        entity_type: generationType === 'place' ? 'place_of_interest' : 'location',
        campaign_id: campaignId,
      };
      if (generationType === 'place') requestData.location_id = selectedLocationForPlace;

      const response = await apiClient.post('/rook/generate', requestData);
      if (response.data?.success) {
        toast.success(generationType === 'place' ? `Rook added ${response.data.entity_name}` : `Rook added ${response.data.entity_name} to your world`);
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
      <section style={pageStyle}>
        <h2 style={titleStyle}>Locations</h2>
        <LoadingSkeleton type="grid" count={3} />
      </section>
    );
  }

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>World Bible</p>
          <h2 style={titleStyle}>Locations</h2>
          <p style={subtitleStyle}>Reusable places for any campaign: regions, settlements, dungeons, wilderness, landmarks, bases, realms, and local points of interest.</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetLocationForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-location-btn" style={primaryButtonStyle}>
              <Plus size={18} /> Add Location
            </Button>
          </DialogTrigger>
          <LocationDialog editingLocation={editingLocation} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onCancel={resetLocationForm} />
        </Dialog>
      </header>

      <section style={importRuleStyle}>
        <p style={ruleLabelStyle}>Import rule</p>
        <p style={ruleTextStyle}>Only add a thing here if it is a place. People go in NPCs & Figures. Organisations, gods, governments, and cults go in Powers & Factions. Past events go in Chronicle.</p>
      </section>

      <section style={statsStyle}>
        <Stat label="Locations" value={stats.locations} />
        <Stat label="Places of interest" value={stats.places} />
        <Stat label="Types used" value={stats.types} />
      </section>

      <section style={controlsStyle}>
        <div style={searchWrapStyle}>
          <Search size={18} style={searchIconStyle} />
          <Input
            placeholder="Search names, types, descriptions, NPCs, notes, or places..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={searchInputStyle}
          />
        </div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={selectStyle} aria-label="Filter locations by type">
          <option value="all">All location types</option>
          {LOCATION_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
      </section>

      <div style={layoutStyle}>
        <main style={{ minWidth: 0 }}>
          {locations.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No locations yet"
              description="Start broad with regions or settlements, then add smaller places of interest inside them."
              actionLabel="Create Your First Location"
              onAction={() => setShowDialog(true)}
              color={rq.accent}
            />
          ) : filteredLocations.length === 0 ? (
            <section style={emptyCardStyle}>
              <p style={mutedTextStyle}>No locations found for that search/filter.</p>
              <Button onClick={() => { setSearchTerm(''); setTypeFilter('all'); }} style={secondaryButtonStyle}>Clear filters</Button>
            </section>
          ) : (
            <div style={cardsStyle}>
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
                  lastGenerated={lastGenerated}
                />
              ))}
            </div>
          )}
        </main>

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
      </div>

      <Dialog open={showPlaceDialog} onOpenChange={(open) => { if (!open) resetPlaceForm(); setShowPlaceDialog(open); }}>
        <PlaceDialog editingPlace={editingPlace} placeFormData={placeFormData} setPlaceFormData={setPlaceFormData} onSubmit={handlePlaceSubmit} onCancel={resetPlaceForm} />
      </Dialog>

      <style>{`@keyframes rq-location-pulse { 0% { box-shadow: 0 0 0 2px rgba(208,0,0,0.45); } 100% { box-shadow: none; } }`}</style>
    </section>
  );
}

function Stat({ label, value }) {
  return <div style={statStyle}><strong style={statValueStyle}>{value}</strong><span style={statLabelStyle}>{label}</span></div>;
}

function LocationDialog({ editingLocation, formData, setFormData, onSubmit, onCancel }) {
  return (
    <DialogContent className="modal" style={dialogStyle}>
      <DialogHeader>
        <DialogTitle style={dialogTitleStyle}>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} style={formStyle}>
        <div style={twoColumnStyle}>
          <TextField label="Name" testId="location-name-input" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} placeholder="Neremore, Blackmere, Western Kingdoms..." required />
          <SelectField label="Type" testId="location-type-input" value={formData.location_type} onChange={(value) => setFormData({ ...formData, location_type: value })} options={LOCATION_TYPES} />
        </div>
        <p style={hintTextStyle}>{typeHint(formData.location_type)}</p>
        <TextAreaField label="Description" testId="location-description-input" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} minHeight={130} placeholder="What is this place? What would players notice or know?" />
        <TextField label="Notable NPCs" testId="location-npcs-input" value={formData.notable_npcs} onChange={(value) => setFormData({ ...formData, notable_npcs: value })} placeholder="Names only or short notes. Full NPCs go in NPCs & Figures." />
        <TextAreaField label="GM notes" testId="location-notes-input" value={formData.notes} onChange={(value) => setFormData({ ...formData, notes: value })} placeholder="Secrets, hooks, changes, travel notes, hidden truths." />
        <FormActions onCancel={onCancel} submitTestId="location-submit-btn" submitText={editingLocation ? 'Update Location' : 'Add Location'} />
      </form>
    </DialogContent>
  );
}

function PlaceDialog({ editingPlace, placeFormData, setPlaceFormData, onSubmit, onCancel }) {
  return (
    <DialogContent className="modal" style={{ ...dialogStyle, maxWidth: 560 }}>
      <DialogHeader>
        <DialogTitle style={dialogTitleStyle}>{editingPlace ? 'Edit Place of Interest' : 'Add Place of Interest'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} style={formStyle}>
        <div style={twoColumnStyle}>
          <TextField label="Name" testId="place-name-input" value={placeFormData.name} onChange={(value) => setPlaceFormData({ ...placeFormData, name: value })} placeholder="The Rusty Tankard, Queen's Gate, Old Catacombs..." required />
          <SelectField label="Type" testId="place-type-select" value={placeFormData.place_type} onChange={(value) => setPlaceFormData({ ...placeFormData, place_type: value })} options={PLACE_TYPES} />
        </div>
        <TextField label="Owner / linked NPC" testId="place-owner-input" value={placeFormData.owner} onChange={(value) => setPlaceFormData({ ...placeFormData, owner: value })} placeholder="Optional. Full NPCs still belong in NPCs & Figures." />
        <TextAreaField label="Description" testId="place-description-input" value={placeFormData.description} onChange={(value) => setPlaceFormData({ ...placeFormData, description: value })} minHeight={90} placeholder="What is this smaller place inside the location?" />
        <TextAreaField label="Services / purpose" testId="place-services-input" value={placeFormData.services} onChange={(value) => setPlaceFormData({ ...placeFormData, services: value })} minHeight={70} placeholder="What can players buy, learn, do, unlock, or discover here?" />
        <TextAreaField label="GM notes" testId="place-notes-input" value={placeFormData.notes} onChange={(value) => setPlaceFormData({ ...placeFormData, notes: value })} placeholder="Hooks, secrets, clues, changes, or hidden uses." />
        <FormActions onCancel={onCancel} submitTestId="place-submit-btn" submitText={editingPlace ? 'Update Place' : 'Add Place'} />
      </form>
    </DialogContent>
  );
}

function TextField({ label, testId, value, onChange, placeholder, required = false }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <Input data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} style={inputStyle} />
    </label>
  );
}

function SelectField({ label, testId, value, onChange, options }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <select data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} style={selectStyle}>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function TextAreaField({ label, testId, value, onChange, placeholder, minHeight = 90 }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <textarea data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ ...textareaStyle, minHeight }} />
    </label>
  );
}

function FormActions({ onCancel, submitText, submitTestId }) {
  return (
    <div style={formActionsStyle}>
      <Button type="button" onClick={onCancel} style={secondaryButtonStyle}>Cancel</Button>
      <Button data-testid={submitTestId} type="submit" style={primaryButtonStyle}>{submitText}</Button>
    </div>
  );
}

function LocationCard({ location, isExpanded, isNewlyCreated, deletingLocation, onToggle, onEdit, onDelete, onCancelDelete, onAddPlace, onEditPlace, onDeletePlace, lastGenerated }) {
  const places = location.places_of_interest || [];
  const LocationIcon = LOCATION_TYPES.find(type => type.id === location.location_type)?.icon || MapPin;

  return (
    <article data-testid={`location-card-${location.id}`} style={{ ...locationCardStyle, animation: isNewlyCreated ? 'rq-location-pulse 1.6s ease-out' : 'none' }}>
      <header style={locationHeaderStyle}>
        <div style={locationIconStyle}><LocationIcon size={22} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={titleRowStyle}>
            <h3 style={locationTitleStyle}>{location.name || 'Unnamed Location'}</h3>
            {isNewlyCreated && <span style={newBadgeStyle}><Check size={13} /> Just created</span>}
          </div>
          <p style={typeTextStyle}>{typeLabel(location.location_type)}</p>
        </div>
        <div style={cardActionsStyle}>
          <Button data-testid={`edit-location-btn-${location.id}`} onClick={onEdit} style={iconButtonStyle}><Edit size={14} /></Button>
          {deletingLocation === location.id ? (
            <div style={deleteConfirmStyle}>
              <span style={deleteTextStyle}>Delete?</span>
              <Button data-testid={`confirm-delete-location-${location.id}`} onClick={onDelete} style={dangerMiniStyle}><Check size={12} /></Button>
              <Button onClick={onCancelDelete} style={iconButtonStyle}><X size={12} /></Button>
            </div>
          ) : (
            <Button data-testid={`delete-location-btn-${location.id}`} onClick={onDelete} style={dangerIconStyle}><Trash2 size={14} /></Button>
          )}
        </div>
      </header>

      {location.description && <p style={descriptionStyle}>{location.description}</p>}
      <div style={infoGridStyle}>
        {location.notable_npcs && <InfoBox title="Notable NPCs" value={location.notable_npcs} />}
        {location.notes && <InfoBox title="GM Notes" value={location.notes} muted />}
      </div>

      <section style={placesSectionStyle}>
        <div style={placesHeaderStyle}>
          <button onClick={onToggle} data-testid={`toggle-places-${location.id}`} style={toggleButtonStyle}>
            <Store size={16} />
            <span>Places of interest ({places.length})</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <Button data-testid={`add-place-btn-${location.id}`} onClick={onAddPlace} style={smallButtonStyle}><Plus size={12} /> Add Place</Button>
        </div>

        {isExpanded && places.length > 0 && (
          <div style={placesListStyle}>
            {places.map(place => (
              <PlaceCard key={place.id} place={place} isNewPlace={lastGenerated?.entity_id === place.id} onEdit={() => onEditPlace(place)} onDelete={() => onDeletePlace(place.id)} />
            ))}
          </div>
        )}
        {isExpanded && places.length === 0 && <p style={emptyPlacesStyle}>No smaller places added yet. Add shops, gates, temples, hideouts, landmarks, rooms, or clues inside this location.</p>}
      </section>
    </article>
  );
}

function InfoBox({ title, value, muted = false }) {
  return (
    <div style={infoBoxStyle}>
      <strong style={infoTitleStyle}>{title}</strong>
      <p style={{ ...infoValueStyle, color: muted ? rq.muted : rq.soft }}>{value}</p>
    </div>
  );
}

function PlaceCard({ place, isNewPlace, onEdit, onDelete }) {
  const TypeIcon = placeTypeIcon(place.place_type);
  return (
    <article style={{ ...placeCardStyle, animation: isNewPlace ? 'rq-location-pulse 1.6s ease-out' : 'none' }}>
      <div style={placeIconStyle}><TypeIcon size={17} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4 style={placeTitleStyle}>{place.name}</h4>
        <p style={placeMetaStyle}>{placeTypeLabel(place.place_type)}</p>
        {place.description && <p style={placeTextStyle}>{place.description}</p>}
        {place.owner && <p style={placeSmallStyle}><strong>Linked NPC:</strong> {place.owner}</p>}
        {place.services && <p style={placeSmallStyle}><strong>Purpose:</strong> {place.services}</p>}
        {place.notes && <p style={placeNoteStyle}>{place.notes}</p>}
      </div>
      <div style={placeActionsStyle}>
        <Button onClick={onEdit} style={iconButtonStyle}><Edit size={12} /></Button>
        <Button onClick={onDelete} style={dangerIconStyle}><Trash2 size={12} /></Button>
      </div>
    </article>
  );
}

function RookPanel({ locations, aiPrompt, setAiPrompt, aiGenerating, generationType, setGenerationType, selectedLocationForPlace, setSelectedLocationForPlace, lastGenerated, onGenerate }) {
  return (
    <aside style={rookPanelStyle}>
      <div style={rookHeaderStyle}>
        <Wand2 size={20} />
        <div>
          <h3 style={sideTitleStyle}>Rook location helper</h3>
          <p style={sideTextStyle}>Draft a generic place entry, then sort it into the right reusable location box.</p>
        </div>
      </div>

      <div style={generationToggleStyle}>
        <button type="button" onClick={() => setGenerationType('location')} style={toggleChoiceStyle(generationType === 'location')}>Location</button>
        <button type="button" onClick={() => setGenerationType('place')} style={toggleChoiceStyle(generationType === 'place')}>Place inside location</button>
      </div>

      {generationType === 'place' && (
        <label style={fieldStyle}>
          <span style={labelStyle}>Parent location</span>
          <select value={selectedLocationForPlace} onChange={(event) => setSelectedLocationForPlace(event.target.value)} style={selectStyle}>
            <option value="">Choose a location</option>
            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
      )}

      <label style={fieldStyle}>
        <span style={labelStyle}>Prompt</span>
        <textarea
          value={aiPrompt}
          onChange={(event) => setAiPrompt(event.target.value)}
          placeholder={generationType === 'place' ? 'A secret black-market shop under a ruined bridge...' : 'A rebuilt capital city with political tension and old buried secrets...'}
          style={{ ...textareaStyle, minHeight: 120 }}
        />
      </label>

      <Button onClick={onGenerate} disabled={aiGenerating} style={primaryButtonStyle}>
        {aiGenerating ? <><Loader size={16} className="spin" /> Creating...</> : <><Wand2 size={16} /> Ask Rook</>}
      </Button>

      {lastGenerated && (
        <div style={generatedBoxStyle}>
          <p style={ruleLabelStyle}>Last created</p>
          <p style={sideTextStyle}>{lastGenerated.entity_name || 'New entry added'}</p>
        </div>
      )}
    </aside>
  );
}

const pageStyle = { display: 'grid', gap: 16, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, padding: 16 };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 780 };
const primaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: rq.accent, color: rq.text, padding: '0 14px', fontWeight: 950, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: rq.card, color: rq.text, padding: '0 14px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const smallButtonStyle = { ...secondaryButtonStyle, minHeight: 34, padding: '0 10px', fontSize: 12 };
const importRuleStyle = { background: rq.panel, borderLeft: `6px solid ${rq.accent}`, padding: 14, display: 'grid', gap: 4 };
const ruleLabelStyle = { margin: 0, color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950 };
const ruleTextStyle = { margin: 0, color: rq.soft, lineHeight: 1.45, fontSize: 14 };
const statsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}` };
const statStyle = { minHeight: 68, padding: '12px 14px', display: 'grid', alignContent: 'center', gap: 3, borderRight: `1px solid ${rq.line}` };
const statValueStyle = { color: rq.text, fontSize: 24, fontWeight: 950 };
const statLabelStyle = { color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 };
const controlsStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(190px, 280px)', gap: 10 };
const searchWrapStyle = { position: 'relative', minWidth: 0 };
const searchIconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: rq.muted, zIndex: 1 };
const searchInputStyle = { ...inputBaseStyle(), paddingLeft: 40 };
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)', gap: 16, alignItems: 'start' };
const cardsStyle = { display: 'grid', gap: 14 };
const emptyCardStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 18, display: 'grid', gap: 12, justifyItems: 'start' };
const mutedTextStyle = { margin: 0, color: rq.soft };
const dialogStyle = { maxWidth: 680, background: rq.bg, backgroundColor: rq.bg, border: `1px solid ${rq.lineStrong}`, borderRadius: 0, color: rq.text, boxShadow: 'none', fontFamily: fontStack };
const dialogTitleStyle = { color: rq.text, fontSize: 26, fontWeight: 950, letterSpacing: '-0.03em', fontFamily: fontStack };
const formStyle = { display: 'grid', gap: 12, marginTop: 16 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 };
const fieldStyle = { display: 'grid', gap: 6 };
const labelStyle = { color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
function inputBaseStyle() { return { width: '100%', minHeight: 44, border: `1px solid ${rq.lineStrong}`, borderRadius: 0, background: rq.input, color: rq.text, padding: '0 11px', fontFamily: fontStack, fontSize: 14, outline: 'none', colorScheme: 'dark' }; }
const inputStyle = inputBaseStyle();
const selectStyle = { ...inputBaseStyle(), appearance: 'auto' };
const textareaStyle = { width: '100%', border: `1px solid ${rq.lineStrong}`, borderRadius: 0, background: rq.input, color: rq.text, padding: 12, fontFamily: fontStack, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.45, colorScheme: 'dark' };
const hintTextStyle = { margin: '-4px 0 2px', color: rq.muted, fontSize: 12, lineHeight: 1.35 };
const formActionsStyle = { display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: `1px solid ${rq.line}`, paddingTop: 12, marginTop: 4 };
const locationCardStyle = { background: rq.card, border: `1px solid ${rq.line}`, padding: 0, color: rq.text };
const locationHeaderStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderBottom: `1px solid ${rq.line}` };
const locationIconStyle = { width: 42, height: 42, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `5px solid ${rq.accent}`, flex: '0 0 auto' };
const titleRowStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const locationTitleStyle = { margin: 0, color: rq.text, fontSize: 21, fontWeight: 950, letterSpacing: '-0.02em' };
const typeTextStyle = { margin: '4px 0 0', color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 };
const cardActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' };
const iconButtonStyle = { minWidth: 34, minHeight: 34, border: 0, borderRadius: 0, background: rq.panel, color: rq.text, padding: 0, display: 'grid', placeItems: 'center' };
const dangerIconStyle = { ...iconButtonStyle, background: 'rgba(208,0,0,0.28)' };
const dangerMiniStyle = { ...iconButtonStyle, background: rq.accent };
const deleteConfirmStyle = { display: 'flex', alignItems: 'center', gap: 6, background: rq.panel, padding: 4 };
const deleteTextStyle = { color: rq.text, fontSize: 11, fontWeight: 900 };
const newBadgeStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, background: rq.accent, color: rq.text, padding: '4px 7px', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const descriptionStyle = { margin: 0, padding: 14, color: rq.soft, lineHeight: 1.5, borderBottom: `1px solid ${rq.line}` };
const infoGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 };
const infoBoxStyle = { padding: 14, borderBottom: `1px solid ${rq.line}`, borderRight: `1px solid ${rq.line}` };
const infoTitleStyle = { display: 'block', color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 950, marginBottom: 6 };
const infoValueStyle = { margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' };
const placesSectionStyle = { padding: 14, display: 'grid', gap: 12 };
const placesHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' };
const toggleButtonStyle = { border: 0, background: 'transparent', color: rq.text, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 950, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12, fontFamily: fontStack };
const placesListStyle = { display: 'grid', gap: 10 };
const emptyPlacesStyle = { margin: 0, color: rq.muted, lineHeight: 1.4, fontSize: 13 };
const placeCardStyle = { display: 'flex', gap: 10, alignItems: 'flex-start', background: rq.panel, border: `1px solid ${rq.line}`, padding: 12 };
const placeIconStyle = { width: 34, height: 34, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `4px solid ${rq.accent}`, flex: '0 0 auto' };
const placeTitleStyle = { margin: 0, color: rq.text, fontSize: 16, fontWeight: 950 };
const placeMetaStyle = { margin: '3px 0 0', color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 };
const placeTextStyle = { margin: '8px 0 0', color: rq.soft, lineHeight: 1.42, fontSize: 13 };
const placeSmallStyle = { margin: '6px 0 0', color: rq.soft, lineHeight: 1.35, fontSize: 12 };
const placeNoteStyle = { margin: '8px 0 0', color: rq.muted, lineHeight: 1.35, fontSize: 12, background: rq.bg, padding: 8 };
const placeActionsStyle = { display: 'flex', gap: 6 };
const rookPanelStyle = { position: 'sticky', top: 80, display: 'grid', gap: 12, background: rq.card, border: `1px solid ${rq.line}`, padding: 14 };
const rookHeaderStyle = { display: 'flex', gap: 10, alignItems: 'flex-start', color: rq.text };
const sideTitleStyle = { margin: 0, color: rq.text, fontSize: 18, fontWeight: 950 };
const sideTextStyle = { margin: '4px 0 0', color: rq.soft, lineHeight: 1.4, fontSize: 13 };
const generationToggleStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `1px solid ${rq.line}` };
const toggleChoiceStyle = (active) => ({ border: 0, borderRight: `1px solid ${rq.line}`, background: active ? rq.accent : rq.panel, color: rq.text, padding: '10px 8px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack });
const generatedBoxStyle = { background: rq.panel, borderLeft: `5px solid ${rq.accent}`, padding: 10 };

export default LocationsTab;
