import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Map, Upload, Plus, MapPin, Trash2, Save, X,
  Store, Beer, Church, Hammer, Building, BookOpen, Home,
  Eye, ZoomIn, ZoomOut, Edit2
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// GM Theme
const theme = {
  primary: '#E11D48',
  hover: '#F43F5E',
  subtle: 'rgba(225, 29, 72, 0.15)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22C55E'
};

const POI_TYPES = [
  { id: 'shop', label: 'Shop', icon: Store, color: '#F59E0B' },
  { id: 'tavern', label: 'Tavern/Inn', icon: Beer, color: '#F97316' },
  { id: 'temple', label: 'Temple', icon: Church, color: '#8B5CF6' },
  { id: 'blacksmith', label: 'Blacksmith', icon: Hammer, color: '#EF4444' },
  { id: 'guild', label: 'Guild Hall', icon: Building, color: '#3B82F6' },
  { id: 'library', label: 'Library', icon: BookOpen, color: '#06B6D4' },
  { id: 'residence', label: 'Residence', icon: Home, color: '#22C55E' },
  { id: 'other', label: 'Other', icon: MapPin, color: '#E11D48' }
];

function LocalMapTab({ campaignId }) {
  const [locations, setLocations] = useState([]);
  const [localMaps, setLocalMaps] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [mode, setMode] = useState('view'); // view, addPin
  const [showUpload, setShowUpload] = useState(false);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [zoom, setZoom] = useState(1);
  
  const fileInputRef = useRef(null);

  // Form data
  const [newMapData, setNewMapData] = useState({
    name: '',
    location_id: '',
    map_type: 'city',
    image_data: ''
  });

  const [pinForm, setPinForm] = useState({
    name: '',
    pin_type: 'shop',
    description: '',
    x: 50,
    y: 50
  });

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [locsRes, mapsRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/locations`),
        axios.get(`${API}/campaigns/${campaignId}/local-maps`)
      ]);
      setLocations(locsRes.data || []);
      setLocalMaps(mapsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Max 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewMapData({ ...newMapData, image_data: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateMap = async () => {
    if (!newMapData.name || !newMapData.image_data || !newMapData.location_id) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const response = await axios.post(`${API}/campaigns/${campaignId}/local-maps`, newMapData);
      setLocalMaps([...localMaps, response.data]);
      setSelectedMap(response.data);
      setShowUpload(false);
      setNewMapData({ name: '', location_id: '', map_type: 'city', image_data: '' });
      toast.success('Local map created!');
    } catch (error) {
      toast.error('Failed to create map');
    }
  };

  const handleMapClick = (e) => {
    if (!selectedMap || mode !== 'addPin') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPinForm({ ...pinForm, x, y });
    setShowPinEditor(true);
  };

  const handlePinClick = (pin, e) => {
    e.stopPropagation();
    if (mode === 'view') {
      setSelectedPin(pin);
      setPinForm({
        name: pin.name,
        pin_type: pin.pin_type,
        description: pin.description || '',
        x: pin.x,
        y: pin.y
      });
      // Don't immediately open editor - show info panel first
    }
  };

  const handleSavePin = async () => {
    if (!pinForm.name) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const poiType = POI_TYPES.find(t => t.id === pinForm.pin_type);
      const pinData = {
        ...pinForm,
        color: poiType?.color || '#E11D48',
        icon: poiType?.icon?.name || 'MapPin'
      };

      if (selectedPin) {
        await axios.put(
          `${API}/campaigns/${campaignId}/local-maps/${selectedMap.id}/pins/${selectedPin.id}`,
          pinData
        );
        toast.success('Place updated!');
      } else {
        await axios.post(
          `${API}/campaigns/${campaignId}/local-maps/${selectedMap.id}/pins`,
          pinData
        );
        toast.success('Place added!');
      }

      // Refresh maps
      const response = await axios.get(`${API}/campaigns/${campaignId}/local-maps`);
      setLocalMaps(response.data || []);
      setSelectedMap(response.data.find(m => m.id === selectedMap.id));
      
      setShowPinEditor(false);
      setSelectedPin(null);
      setPinForm({ name: '', pin_type: 'shop', description: '', x: 50, y: 50 });
      setMode('view');
    } catch (error) {
      toast.error('Failed to save place');
    }
  };

  const handleDeletePin = async (pinId) => {
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/local-maps/${selectedMap.id}/pins/${pinId}`);
      toast.success('Place deleted');
      
      const response = await axios.get(`${API}/campaigns/${campaignId}/local-maps`);
      setLocalMaps(response.data || []);
      setSelectedMap(response.data.find(m => m.id === selectedMap.id));
      setSelectedPin(null);
      setShowPinEditor(false);
    } catch (error) {
      toast.error('Failed to delete place');
    }
  };

  const handleDeleteMap = async () => {
    if (!selectedMap) return;
    
    if (!window.confirm('Delete this map? This cannot be undone.')) return;

    try {
      await axios.delete(`${API}/campaigns/${campaignId}/local-maps/${selectedMap.id}`);
      setLocalMaps(localMaps.filter(m => m.id !== selectedMap.id));
      setSelectedMap(null);
      toast.success('Map deleted');
    } catch (error) {
      toast.error('Failed to delete map');
    }
  };

  const getPinIcon = (pinType) => {
    const type = POI_TYPES.find(t => t.id === pinType);
    return type?.icon || MapPin;
  };

  const getPinColor = (pinType) => {
    const type = POI_TYPES.find(t => t.id === pinType);
    return type?.color || '#E11D48';
  };

  // Get maps for selected location
  const mapsForLocation = selectedLocation 
    ? localMaps.filter(m => m.location_id === selectedLocation.id)
    : localMaps;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading local maps...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Left Sidebar - Location List */}
      <div style={{
        width: '250px',
        borderRight: `1px solid ${theme.border}`,
        background: theme.panel,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ color: theme.primary, margin: '0 0 8px', fontSize: '14px', fontWeight: '700' }}>
            LOCATIONS
          </h3>
          <p style={{ color: theme.muted, fontSize: '11px', margin: 0 }}>
            Select a city/town to view its map
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div
            onClick={() => { setSelectedLocation(null); setSelectedMap(null); }}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              background: !selectedLocation ? theme.subtle : 'transparent',
              borderLeft: !selectedLocation ? `3px solid ${theme.primary}` : '3px solid transparent',
              color: theme.text
            }}
          >
            All Maps ({localMaps.length})
          </div>

          {locations.map(loc => {
            const mapCount = localMaps.filter(m => m.location_id === loc.id).length;
            const isSelected = selectedLocation?.id === loc.id;

            return (
              <div
                key={loc.id}
                onClick={() => {
                  setSelectedLocation(loc);
                  const locMaps = localMaps.filter(m => m.location_id === loc.id);
                  setSelectedMap(locMaps.length > 0 ? locMaps[0] : null);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isSelected ? theme.subtle : 'transparent',
                  borderLeft: isSelected ? `3px solid ${theme.primary}` : '3px solid transparent'
                }}
              >
                <div style={{ color: theme.text, fontSize: '13px', fontWeight: '500' }}>
                  {loc.name}
                </div>
                <div style={{ color: theme.muted, fontSize: '11px' }}>
                  {loc.location_type} • {mapCount} map{mapCount !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '12px', borderTop: `1px solid ${theme.border}` }}>
          <Button
            onClick={() => setShowUpload(true)}
            style={{
              width: '100%',
              background: theme.primary,
              border: 'none',
              color: '#fff',
              padding: '10px'
            }}
          >
            <Upload size={14} style={{ marginRight: '6px' }} />
            Upload Local Map
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.bg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {mapsForLocation.length > 0 && (
              <select
                value={selectedMap?.id || ''}
                onChange={(e) => setSelectedMap(mapsForLocation.find(m => m.id === e.target.value))}
                style={{
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: '8px 12px'
                }}
              >
                <option value="">Select a map...</option>
                {mapsForLocation.map(map => (
                  <option key={map.id} value={map.id}>{map.name}</option>
                ))}
              </select>
            )}
          </div>

          {selectedMap && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={() => setMode(mode === 'addPin' ? 'view' : 'addPin')}
                style={{
                  background: mode === 'addPin' ? theme.subtle : 'transparent',
                  border: `1px solid ${mode === 'addPin' ? theme.primary : theme.border}`,
                  color: mode === 'addPin' ? theme.primary : theme.muted,
                  padding: '8px 14px'
                }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} />
                Add Place
              </Button>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: '6px' }}
                >
                  <ZoomOut size={16} color={theme.muted} />
                </Button>
                <span style={{ color: theme.muted, fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: '6px' }}
                >
                  <ZoomIn size={16} color={theme.muted} />
                </Button>
              </div>

              <Button
                onClick={handleDeleteMap}
                style={{
                  background: 'transparent',
                  border: `1px solid #EF4444`,
                  color: '#EF4444',
                  padding: '8px'
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Map Display */}
        <div style={{ flex: 1, overflow: 'auto', background: theme.bg }}>
          {selectedMap ? (
            <div
              onClick={handleMapClick}
              style={{
                position: 'relative',
                width: `${100 * zoom}%`,
                cursor: mode === 'addPin' ? 'crosshair' : 'default'
              }}
            >
              {selectedMap.image_data && (
                <img
                  src={selectedMap.image_data}
                  alt={selectedMap.name}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              )}

              {/* Pins */}
              {selectedMap.pins?.map(pin => {
                const PinIcon = getPinIcon(pin.pin_type);
                const pinColor = getPinColor(pin.pin_type);
                const isSelected = selectedPin?.id === pin.id;

                return (
                  <div
                    key={pin.id}
                    onClick={(e) => handlePinClick(pin, e)}
                    data-testid={`local-pin-${pin.id}`}
                    style={{
                      position: 'absolute',
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: 'translate(-50%, -100%)',
                      cursor: 'pointer',
                      zIndex: isSelected ? 20 : 10
                    }}
                  >
                    <div style={{
                      background: pinColor,
                      padding: '5px',
                      borderRadius: '50% 50% 50% 0',
                      transform: 'rotate(-45deg)',
                      boxShadow: isSelected ? `0 0 12px ${pinColor}` : `0 2px 8px ${pinColor}50`,
                      border: isSelected ? '2px solid #fff' : 'none'
                    }}>
                      <PinIcon size={14} color="#fff" style={{ transform: 'rotate(45deg)' }} />
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: isSelected ? pinColor : 'rgba(0,0,0,0.85)',
                      padding: '2px 6px',
                      whiteSpace: 'nowrap',
                      fontSize: '10px',
                      color: '#fff',
                      marginTop: '2px',
                      fontWeight: isSelected ? '600' : '400'
                    }}>
                      {pin.name}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              color: theme.muted
            }}>
              <Map size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                {selectedLocation ? `No map for ${selectedLocation.name}` : 'Select a location or upload a map'}
              </p>
              <Button
                onClick={() => {
                  if (selectedLocation) {
                    setNewMapData({ ...newMapData, location_id: selectedLocation.id });
                  }
                  setShowUpload(true);
                }}
                style={{ background: theme.primary, border: 'none', color: '#fff', marginTop: '12px' }}
              >
                <Upload size={16} style={{ marginRight: '8px' }} />
                Upload Map
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Pin Info Panel */}
      {mode === 'view' && selectedPin && !showPinEditor && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '270px',
          background: theme.panel,
          border: `1px solid ${getPinColor(selectedPin.pin_type)}`,
          padding: '16px',
          maxWidth: '300px',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: getPinColor(selectedPin.pin_type),
                padding: '8px',
                borderRadius: '50%'
              }}>
                {React.createElement(getPinIcon(selectedPin.pin_type), { size: 16, color: '#fff' })}
              </div>
              <div>
                <h4 style={{ color: theme.text, margin: 0, fontSize: '15px', fontWeight: '600' }}>
                  {selectedPin.name}
                </h4>
                <span style={{ color: theme.muted, fontSize: '11px', textTransform: 'capitalize' }}>
                  {POI_TYPES.find(t => t.id === selectedPin.pin_type)?.label || selectedPin.pin_type}
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setSelectedPin(null)} 
              style={{ background: 'transparent', border: 'none', padding: '4px' }}
            >
              <X size={16} color={theme.muted} />
            </Button>
          </div>

          {selectedPin.description && (
            <p style={{ 
              color: theme.textSecondary, 
              fontSize: '12px', 
              lineHeight: '1.5',
              margin: '0 0 12px',
              padding: '10px',
              background: theme.bg,
              border: `1px solid ${theme.border}`
            }}>
              {selectedPin.description}
            </p>
          )}

          <Button
            onClick={() => {
              setPinForm({
                name: selectedPin.name,
                pin_type: selectedPin.pin_type,
                description: selectedPin.description || '',
                x: selectedPin.x,
                y: selectedPin.y
              });
              setShowPinEditor(true);
            }}
            style={{
              width: '100%',
              background: theme.primary,
              border: 'none',
              color: '#fff',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Edit2 size={14} />
            Edit Place
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.panel,
            border: `1px solid ${theme.primary}`,
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0 }}>Upload Local Map</h3>
              <Button onClick={() => setShowUpload(false)} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                LOCATION *
              </label>
              <select
                value={newMapData.location_id}
                onChange={(e) => setNewMapData({ ...newMapData, location_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <option value="">Select a location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.location_type})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                MAP NAME *
              </label>
              <Input
                value={newMapData.name}
                onChange={(e) => setNewMapData({ ...newMapData, name: e.target.value })}
                placeholder="e.g., Bouldering City Center"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                MAP TYPE
              </label>
              <select
                value={newMapData.map_type}
                onChange={(e) => setNewMapData({ ...newMapData, map_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <option value="city">City Map</option>
                <option value="town">Town Map</option>
                <option value="village">Village Map</option>
                <option value="building">Building Floor Plan</option>
                <option value="dungeon">Dungeon Map</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                MAP IMAGE *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${newMapData.image_data ? theme.success : theme.border}`,
                  padding: '30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: theme.bg
                }}
              >
                {newMapData.image_data ? (
                  <div>
                    <img
                      src={newMapData.image_data}
                      alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: '150px', marginBottom: '10px' }}
                    />
                    <p style={{ color: theme.success, margin: 0 }}>Click to change</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} color={theme.muted} style={{ marginBottom: '8px' }} />
                    <p style={{ color: theme.muted, margin: 0 }}>Click to upload</p>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowUpload(false)}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMap}
                disabled={!newMapData.name || !newMapData.image_data || !newMapData.location_id}
                style={{
                  background: newMapData.name && newMapData.image_data && newMapData.location_id ? theme.primary : theme.muted,
                  border: 'none',
                  color: '#fff'
                }}
              >
                <Save size={14} style={{ marginRight: '6px' }} />
                Create Map
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Editor Modal */}
      {showPinEditor && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.panel,
            border: `1px solid ${theme.primary}`,
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0 }}>
                {selectedPin ? 'Edit Place' : 'Add Place of Interest'}
              </h3>
              <Button onClick={() => { setShowPinEditor(false); setSelectedPin(null); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                NAME *
              </label>
              <Input
                value={pinForm.name}
                onChange={(e) => setPinForm({ ...pinForm, name: e.target.value })}
                placeholder="e.g., The Golden Dragon Inn"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                TYPE
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {POI_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.id}
                      onClick={() => setPinForm({ ...pinForm, pin_type: type.id })}
                      style={{
                        background: pinForm.pin_type === type.id ? type.color : 'transparent',
                        border: `1px solid ${pinForm.pin_type === type.id ? type.color : theme.border}`,
                        color: pinForm.pin_type === type.id ? '#fff' : theme.muted,
                        padding: '6px 10px',
                        fontSize: '11px'
                      }}
                    >
                      <Icon size={12} style={{ marginRight: '4px' }} />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                DESCRIPTION
              </label>
              <textarea
                value={pinForm.description}
                onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })}
                placeholder="What's notable about this place?"
                style={{
                  width: '100%',
                  height: '80px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: '10px',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {selectedPin && (
                <Button
                  onClick={() => handleDeletePin(selectedPin.id)}
                  style={{ background: '#EF4444', border: 'none', color: '#fff', marginRight: 'auto' }}
                >
                  <Trash2 size={14} style={{ marginRight: '6px' }} />
                  Delete
                </Button>
              )}
              <Button
                onClick={() => { setShowPinEditor(false); setSelectedPin(null); }}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePin}
                style={{ background: theme.primary, border: 'none', color: '#fff' }}
              >
                <Save size={14} style={{ marginRight: '6px' }} />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocalMapTab;
