import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Map, Upload, Plus, MapPin, Trash2, Edit2, Save, X, Navigation,
  Castle, Building, Home, Mountain, Waves, Trees, Route, Clock,
  ChevronDown, Settings, Compass, Footprints, Ship, Plane, Truck,
  Link2, Eye, ZoomIn, ZoomOut
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// GM Theme - Red (Tron Aries)
const theme = {
  primary: '#E11D48',
  hover: '#F43F5E',
  subtle: 'rgba(225, 29, 72, 0.15)',
  glow: '0 0 20px rgba(225, 29, 72, 0.3)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22C55E',
  warning: '#F59E0B',
  cyan: '#06B6D4'
};

const PIN_TYPES = [
  { id: 'capital', label: 'Capital City', icon: Castle, color: '#EAB308' },
  { id: 'city', label: 'City', icon: Building, color: '#3B82F6' },
  { id: 'town', label: 'Town', icon: Home, color: '#22C55E' },
  { id: 'village', label: 'Village', icon: Home, color: '#84CC16' },
  { id: 'landmark', label: 'Landmark', icon: Mountain, color: '#8B5CF6' },
  { id: 'dungeon', label: 'Dungeon', icon: Mountain, color: '#EF4444' },
  { id: 'port', label: 'Port', icon: Waves, color: '#06B6D4' },
  { id: 'forest', label: 'Forest', icon: Trees, color: '#16A34A' },
  { id: 'custom', label: 'Custom', icon: MapPin, color: '#E11D48' }
];

const TERRAIN_TYPES = [
  { id: 'road', label: 'Road', modifier: 1.0 },
  { id: 'trail', label: 'Trail', modifier: 1.25 },
  { id: 'wilderness', label: 'Wilderness', modifier: 1.5 },
  { id: 'forest', label: 'Dense Forest', modifier: 2.0 },
  { id: 'mountain', label: 'Mountain Pass', modifier: 2.5 },
  { id: 'swamp', label: 'Swamp', modifier: 3.0 },
  { id: 'desert', label: 'Desert', modifier: 1.5 },
  { id: 'water', label: 'Water (by boat)', modifier: 0.75 }
];

const TRAVEL_MODES = [
  { id: 'walking', label: 'On Foot', icon: Footprints, speed: 24 },
  { id: 'horseback', label: 'Horseback', icon: Navigation, speed: 48 },
  { id: 'cart', label: 'Cart/Wagon', icon: Truck, speed: 16 },
  { id: 'ship', label: 'Ship', icon: Ship, speed: 72 },
  { id: 'flying', label: 'Flying', icon: Plane, speed: 96 }
];

function WorldMapTab({ campaignId }) {
  const [worldMaps, setWorldMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  
  // UI State
  const [mode, setMode] = useState('view'); // view, addPin, addPath, travel
  const [showUpload, setShowUpload] = useState(false);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [showPathEditor, setShowPathEditor] = useState(false);
  const [showTravelCalc, setShowTravelCalc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Selected items
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [pathStart, setPathStart] = useState(null);
  
  // Travel calculator
  const [travelFrom, setTravelFrom] = useState(null);
  const [travelTo, setTravelTo] = useState(null);
  const [travelMode, setTravelMode] = useState('walking');
  const [travelResult, setTravelResult] = useState(null);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  
  // Map zoom/pan
  const [zoom, setZoom] = useState(1);
  const mapRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form data for new map
  const [newMapData, setNewMapData] = useState({
    name: '',
    scale_value: 50,
    scale_unit: 'miles',
    image_data: ''
  });

  // Pin form
  const [pinForm, setPinForm] = useState({
    name: '',
    pin_type: 'city',
    description: '',
    linked_location_id: '',
    x: 50,
    y: 50
  });

  // Path form
  const [pathForm, setPathForm] = useState({
    distance_value: 0,
    distance_unit: 'miles',
    terrain_type: 'road',
    terrain_modifier: 1.0,
    notes: ''
  });

  useEffect(() => {
    fetchWorldMaps();
    fetchLocations();
  }, [campaignId]);

  const fetchWorldMaps = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/world-maps`);
      setWorldMaps(response.data || []);
      if (response.data?.length > 0 && !selectedMap) {
        setSelectedMap(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load world maps:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/locations`);
      setLocations(response.data || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
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
    if (!newMapData.name || !newMapData.image_data) {
      toast.error('Please provide a name and upload an image');
      return;
    }

    try {
      const response = await axios.post(`${API}/campaigns/${campaignId}/world-maps`, newMapData);
      setWorldMaps([...worldMaps, response.data]);
      setSelectedMap(response.data);
      setShowUpload(false);
      setNewMapData({ name: '', scale_value: 50, scale_unit: 'miles', image_data: '' });
      toast.success('World map created!');
    } catch (error) {
      toast.error('Failed to create map');
    }
  };

  const handleMapClick = useCallback((e) => {
    if (!selectedMap || mode === 'view') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (mode === 'addPin') {
      setPinForm({ ...pinForm, x, y });
      setShowPinEditor(true);
    } else if (mode === 'addPath') {
      // Find if clicked near a pin
      const clickedPin = selectedMap.pins?.find(pin => {
        const dx = Math.abs(pin.x - x);
        const dy = Math.abs(pin.y - y);
        return dx < 3 && dy < 3;
      });

      if (clickedPin) {
        if (!pathStart) {
          setPathStart(clickedPin);
          toast.info(`Path from: ${clickedPin.name}. Click another location.`);
        } else if (clickedPin.id !== pathStart.id) {
          // Create path
          setPathForm({ ...pathForm });
          setShowPathEditor(true);
        }
      }
    } else if (mode === 'travel') {
      const clickedPin = selectedMap.pins?.find(pin => {
        const dx = Math.abs(pin.x - x);
        const dy = Math.abs(pin.y - y);
        return dx < 3 && dy < 3;
      });

      if (clickedPin) {
        if (!travelFrom) {
          setTravelFrom(clickedPin);
          fetchNearbyLocations(clickedPin.id);
          toast.info(`From: ${clickedPin.name}. Click destination or select from list.`);
        } else {
          setTravelTo(clickedPin);
          calculateTravel(travelFrom.id, clickedPin.id);
        }
      }
    }
  }, [selectedMap, mode, pathStart, travelFrom, pinForm, pathForm]);

  const handlePinClick = (pin, e) => {
    e.stopPropagation();
    
    if (mode === 'view') {
      setSelectedPin(pin);
      // Populate pin form for editing
      setPinForm({
        name: pin.name,
        pin_type: pin.pin_type || 'city',
        description: pin.description || '',
        linked_location_id: pin.linked_location_id || '',
        x: pin.x,
        y: pin.y
      });
    } else if (mode === 'addPath') {
      if (!pathStart) {
        setPathStart(pin);
        toast.info(`Path from: ${pin.name}. Click another location.`);
      } else if (pin.id !== pathStart.id) {
        // Store the destination pin and show path editor
        setSelectedPin(pin);
        setShowPathEditor(true);
      }
    } else if (mode === 'travel') {
      if (!travelFrom) {
        setTravelFrom(pin);
        fetchNearbyLocations(pin.id);
      } else {
        setTravelTo(pin);
        calculateTravel(travelFrom.id, pin.id);
      }
    }
  };

  const handleSavePin = async () => {
    if (!pinForm.name) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const pinType = PIN_TYPES.find(t => t.id === pinForm.pin_type);
      const pinData = {
        ...pinForm,
        color: pinType?.color || '#E11D48',
        icon: pinType?.icon?.name || 'MapPin'
      };

      if (selectedPin) {
        // Update existing pin
        await axios.put(
          `${API}/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${selectedPin.id}`,
          pinData
        );
        toast.success('Pin updated!');
      } else {
        // Create new pin
        await axios.post(
          `${API}/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins`,
          pinData
        );
        toast.success('Pin added!');
      }

      fetchWorldMaps();
      setShowPinEditor(false);
      setSelectedPin(null);
      setPinForm({ name: '', pin_type: 'city', description: '', linked_location_id: '', x: 50, y: 50 });
      setMode('view');
    } catch (error) {
      toast.error('Failed to save pin');
    }
  };

  const handleDeletePin = async (pinId) => {
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${pinId}`);
      toast.success('Pin deleted');
      fetchWorldMaps();
      setSelectedPin(null);
    } catch (error) {
      toast.error('Failed to delete pin');
    }
  };

  const handleSavePath = async () => {
    if (!pathStart || !selectedPin || !pathForm.distance_value) {
      toast.error('Please select two locations and enter distance');
      return;
    }

    try {
      await axios.post(
        `${API}/campaigns/${campaignId}/world-maps/${selectedMap.id}/paths`,
        {
          from_pin_id: pathStart.id,
          to_pin_id: selectedPin.id,
          ...pathForm
        }
      );

      toast.success('Path created!');
      fetchWorldMaps();
      setShowPathEditor(false);
      setPathStart(null);
      setSelectedPin(null);
      setPathForm({ distance_value: 0, distance_unit: 'miles', terrain_type: 'road', terrain_modifier: 1.0, notes: '' });
      setMode('view');
    } catch (error) {
      toast.error('Failed to create path');
    }
  };

  const fetchNearbyLocations = async (pinId) => {
    try {
      const response = await axios.get(
        `${API}/campaigns/${campaignId}/world-maps/${selectedMap.id}/nearby?pin_id=${pinId}`
      );
      setNearbyLocations(response.data.nearby_locations || []);
    } catch (error) {
      console.error('Failed to fetch nearby locations:', error);
    }
  };

  const calculateTravel = async (fromId, toId) => {
    try {
      const response = await axios.post(
        `${API}/campaigns/${campaignId}/world-maps/${selectedMap.id}/calculate-travel`,
        {
          from_pin_id: fromId,
          to_pin_id: toId,
          travel_mode: travelMode
        }
      );
      setTravelResult(response.data);
      setShowTravelCalc(true);
    } catch (error) {
      toast.error('No path exists between these locations');
    }
  };

  const getPinIcon = (pinType) => {
    const type = PIN_TYPES.find(t => t.id === pinType);
    return type?.icon || MapPin;
  };

  const getPinColor = (pinType) => {
    const type = PIN_TYPES.find(t => t.id === pinType);
    return type?.color || '#E11D48';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading world maps...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: theme.panel
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Map size={24} color={theme.primary} />
          <div>
            <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>
              WORLD MAP
            </h3>
            <p style={{ color: theme.muted, fontSize: '12px', margin: 0 }}>
              {selectedMap ? selectedMap.name : 'No map selected'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Map Selector */}
          {worldMaps.length > 0 && (
            <select
              value={selectedMap?.id || ''}
              onChange={(e) => setSelectedMap(worldMaps.find(m => m.id === e.target.value))}
              style={{
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                padding: '8px 12px',
                fontSize: '13px'
              }}
            >
              {worldMaps.map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>
          )}

          <Button
            onClick={() => setShowUpload(true)}
            style={{
              background: theme.primary,
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={16} />
            Upload Map
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {selectedMap && (
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          gap: '8px',
          background: theme.bg,
          flexWrap: 'wrap'
        }}>
          <Button
            onClick={() => { setMode('view'); setPathStart(null); setTravelFrom(null); }}
            style={{
              background: mode === 'view' ? theme.subtle : 'transparent',
              border: `1px solid ${mode === 'view' ? theme.primary : theme.border}`,
              color: mode === 'view' ? theme.primary : theme.muted,
              padding: '8px 14px'
            }}
          >
            <Eye size={14} style={{ marginRight: '6px' }} />
            View
          </Button>

          <Button
            onClick={() => { setMode('addPin'); setPathStart(null); setTravelFrom(null); }}
            style={{
              background: mode === 'addPin' ? theme.subtle : 'transparent',
              border: `1px solid ${mode === 'addPin' ? theme.primary : theme.border}`,
              color: mode === 'addPin' ? theme.primary : theme.muted,
              padding: '8px 14px'
            }}
          >
            <MapPin size={14} style={{ marginRight: '6px' }} />
            Add Location
          </Button>

          <Button
            onClick={() => { setMode('addPath'); setPathStart(null); setTravelFrom(null); }}
            style={{
              background: mode === 'addPath' ? theme.subtle : 'transparent',
              border: `1px solid ${mode === 'addPath' ? theme.primary : theme.border}`,
              color: mode === 'addPath' ? theme.primary : theme.muted,
              padding: '8px 14px'
            }}
          >
            <Route size={14} style={{ marginRight: '6px' }} />
            Add Path
          </Button>

          <Button
            onClick={() => { setMode('travel'); setPathStart(null); setTravelFrom(null); setTravelTo(null); setTravelResult(null); }}
            style={{
              background: mode === 'travel' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: `1px solid ${mode === 'travel' ? theme.cyan : theme.border}`,
              color: mode === 'travel' ? theme.cyan : theme.muted,
              padding: '8px 14px'
            }}
          >
            <Compass size={14} style={{ marginRight: '6px' }} />
            Travel Calculator
          </Button>

          <div style={{ flex: 1 }} />

          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <Button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: '6px' }}
            >
              <ZoomOut size={16} color={theme.muted} />
            </Button>
            <span style={{ color: theme.muted, fontSize: '12px', minWidth: '50px', textAlign: 'center' }}>
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
            onClick={() => setShowSettings(true)}
            style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: '8px' }}
          >
            <Settings size={16} color={theme.muted} />
          </Button>
        </div>
      )}

      {/* Map Display */}
      <div style={{ flex: 1, overflow: 'auto', background: theme.bg, position: 'relative' }}>
        {selectedMap ? (
          <div
            ref={mapRef}
            onClick={handleMapClick}
            style={{
              position: 'relative',
              width: `${100 * zoom}%`,
              minHeight: '500px',
              cursor: mode !== 'view' ? 'crosshair' : 'default'
            }}
          >
            {/* Map Image */}
            {selectedMap.image_data && (
              <img
                src={selectedMap.image_data}
                alt={selectedMap.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            )}

            {/* Paths (render first so pins appear on top) */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {selectedMap.paths?.map(path => {
                const fromPin = selectedMap.pins?.find(p => p.id === path.from_pin_id);
                const toPin = selectedMap.pins?.find(p => p.id === path.to_pin_id);
                if (!fromPin || !toPin) return null;

                return (
                  <line
                    key={path.id}
                    x1={`${fromPin.x}%`}
                    y1={`${fromPin.y}%`}
                    x2={`${toPin.x}%`}
                    y2={`${toPin.y}%`}
                    stroke={path.terrain_type === 'road' ? '#F59E0B' : '#9CA3AF'}
                    strokeWidth="2"
                    strokeDasharray={path.terrain_type === 'road' ? '0' : '5,5'}
                    opacity={0.7}
                  />
                );
              })}
            </svg>

            {/* Pins */}
            {selectedMap.pins?.map(pin => {
              const PinIcon = getPinIcon(pin.pin_type);
              const pinColor = getPinColor(pin.pin_type);
              const isSelected = selectedPin?.id === pin.id || travelFrom?.id === pin.id || travelTo?.id === pin.id;
              const isPathStart = pathStart?.id === pin.id;

              return (
                <div
                  key={pin.id}
                  onClick={(e) => handlePinClick(pin, e)}
                  data-testid={`map-pin-${pin.id}`}
                  style={{
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -100%)',
                    cursor: 'pointer',
                    zIndex: isSelected || isPathStart ? 10 : 1
                  }}
                >
                  <div style={{
                    background: isPathStart ? theme.warning : pinColor,
                    padding: '6px',
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    boxShadow: (isSelected || isPathStart) ? `0 0 12px ${isPathStart ? theme.warning : pinColor}` : 'none',
                    border: (isSelected || isPathStart) ? '2px solid #fff' : 'none',
                    animation: isPathStart ? 'pulse 1.5s ease-in-out infinite' : 'none'
                  }}>
                    <PinIcon size={16} color="#fff" style={{ transform: 'rotate(45deg)' }} />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isPathStart ? theme.warning : 'rgba(0,0,0,0.8)',
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    color: isPathStart ? '#000' : '#fff',
                    marginTop: '4px',
                    fontWeight: isPathStart ? '600' : '400'
                  }}>
                    {isPathStart ? `FROM: ${pin.name}` : pin.name}
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
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No world map uploaded</p>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>Upload a map image to start pinning locations</p>
            <Button
              onClick={() => setShowUpload(true)}
              style={{ background: theme.primary, border: 'none', color: '#fff' }}
            >
              <Upload size={16} style={{ marginRight: '8px' }} />
              Upload World Map
            </Button>
          </div>
        )}
      </div>

      {/* Travel Mode Panel (when in travel mode) */}
      {mode === 'travel' && travelFrom && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: theme.panel,
          border: `1px solid ${theme.cyan}`,
          padding: '16px',
          maxWidth: '300px',
          zIndex: 100
        }}>
          <h4 style={{ color: theme.cyan, margin: '0 0 12px', fontSize: '14px' }}>
            TRAVEL FROM: {travelFrom.name}
          </h4>

          {/* Travel Mode Selection */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: theme.muted, fontSize: '11px', display: 'block', marginBottom: '6px' }}>
              TRAVEL MODE
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {TRAVEL_MODES.map(m => {
                const Icon = m.icon;
                return (
                  <Button
                    key={m.id}
                    onClick={() => setTravelMode(m.id)}
                    style={{
                      background: travelMode === m.id ? theme.cyan : 'transparent',
                      border: `1px solid ${travelMode === m.id ? theme.cyan : theme.border}`,
                      color: travelMode === m.id ? '#000' : theme.muted,
                      padding: '4px 8px',
                      fontSize: '11px'
                    }}
                  >
                    <Icon size={12} style={{ marginRight: '4px' }} />
                    {m.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Nearby Locations */}
          {nearbyLocations.length > 0 && (
            <div>
              <label style={{ color: theme.muted, fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                NEARBY DESTINATIONS
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {nearbyLocations.map(loc => (
                  <div
                    key={loc.pin_id}
                    onClick={() => {
                      const pin = selectedMap.pins?.find(p => p.id === loc.pin_id);
                      if (pin) {
                        setTravelTo(pin);
                        calculateTravel(travelFrom.id, pin.id);
                      }
                    }}
                    style={{
                      padding: '8px',
                      background: theme.bg,
                      marginBottom: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: theme.text, fontSize: '13px' }}>{loc.name}</span>
                    <span style={{ color: theme.cyan, fontSize: '11px' }}>{loc.walking_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => { setTravelFrom(null); setTravelTo(null); setNearbyLocations([]); }}
            style={{
              width: '100%',
              marginTop: '12px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.muted,
              padding: '8px'
            }}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Selected Pin Info Panel (view mode) */}
      {mode === 'view' && selectedPin && !showPinEditor && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: theme.panel,
          border: `1px solid ${theme.primary}`,
          padding: '16px',
          maxWidth: '320px',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: getPinColor(selectedPin.pin_type),
                padding: '8px',
                borderRadius: '50%'
              }}>
                {React.createElement(getPinIcon(selectedPin.pin_type), { size: 18, color: '#fff' })}
              </div>
              <div>
                <h4 style={{ color: theme.text, margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  {selectedPin.name}
                </h4>
                <span style={{ color: theme.muted, fontSize: '12px', textTransform: 'capitalize' }}>
                  {selectedPin.pin_type}
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setSelectedPin(null)} 
              style={{ background: 'transparent', border: 'none', padding: '4px' }}
            >
              <X size={18} color={theme.muted} />
            </Button>
          </div>

          {selectedPin.description && (
            <p style={{ 
              color: theme.textSecondary, 
              fontSize: '13px', 
              lineHeight: '1.5',
              margin: '0 0 12px',
              padding: '10px',
              background: theme.bg,
              border: `1px solid ${theme.border}`
            }}>
              {selectedPin.description}
            </p>
          )}

          {/* Connected paths info */}
          {selectedMap.paths?.some(p => p.from_pin_id === selectedPin.id || p.to_pin_id === selectedPin.id) && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: theme.muted, fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                CONNECTED ROUTES
              </label>
              <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {selectedMap.paths
                  .filter(p => p.from_pin_id === selectedPin.id || p.to_pin_id === selectedPin.id)
                  .map(path => {
                    const destId = path.from_pin_id === selectedPin.id ? path.to_pin_id : path.from_pin_id;
                    const destPin = selectedMap.pins?.find(p => p.id === destId);
                    return destPin && (
                      <div key={path.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: theme.bg,
                        marginBottom: '4px',
                        fontSize: '12px'
                      }}>
                        <span style={{ color: theme.text }}>{destPin.name}</span>
                        <span style={{ color: theme.warning }}>
                          {path.distance_value} {path.distance_unit} ({path.terrain_type})
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={() => {
                setShowPinEditor(true);
              }}
              style={{
                flex: 1,
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
              Edit
            </Button>
            <Button
              onClick={() => {
                setTravelFrom(selectedPin);
                fetchNearbyLocations(selectedPin.id);
                setMode('travel');
                setSelectedPin(null);
              }}
              style={{
                flex: 1,
                background: theme.cyan,
                border: 'none',
                color: '#000',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Compass size={14} />
              Travel From
            </Button>
          </div>
        </div>
      )}

      {/* Travel Result Modal */}
      {showTravelCalc && travelResult && (
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
            border: `1px solid ${theme.cyan}`,
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: theme.cyan, margin: 0 }}>
                <Clock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Travel Time
              </h3>
              <Button onClick={() => setShowTravelCalc(false)} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <div style={{ background: theme.bg, padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: theme.muted }}>From:</span>
                <span style={{ color: theme.text, fontWeight: '600' }}>{travelResult.from_location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: theme.muted }}>To:</span>
                <span style={{ color: theme.text, fontWeight: '600' }}>{travelResult.to_location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: theme.muted }}>Distance:</span>
                <span style={{ color: theme.text }}>{travelResult.distance} {travelResult.distance_unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: theme.muted }}>Terrain:</span>
                <span style={{ color: theme.warning }}>{travelResult.terrain_type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: theme.muted }}>Travel Mode:</span>
                <span style={{ color: theme.text }}>{travelResult.travel_mode}</span>
              </div>
            </div>

            <div style={{
              background: theme.subtle,
              border: `1px solid ${theme.cyan}`,
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: theme.muted, fontSize: '12px', marginBottom: '4px' }}>ESTIMATED TRAVEL TIME</div>
              <div style={{ color: theme.cyan, fontSize: '28px', fontWeight: '800' }}>
                {travelResult.formatted_time}
              </div>
              <div style={{ color: theme.muted, fontSize: '12px', marginTop: '4px' }}>
                ({travelResult.speed_per_day} {travelResult.distance_unit}/day)
              </div>
            </div>

            <Button
              onClick={() => setShowTravelCalc(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                background: theme.cyan,
                border: 'none',
                color: '#000',
                padding: '10px'
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Upload Map Modal */}
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
              <h3 style={{ color: theme.primary, margin: 0 }}>Upload World Map</h3>
              <Button onClick={() => setShowUpload(false)} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                MAP NAME *
              </label>
              <Input
                value={newMapData.name}
                onChange={(e) => setNewMapData({ ...newMapData, name: e.target.value })}
                placeholder="e.g., The Realm of Eldoria"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                  SCALE (1 inch = X)
                </label>
                <Input
                  type="number"
                  value={newMapData.scale_value}
                  onChange={(e) => setNewMapData({ ...newMapData, scale_value: parseFloat(e.target.value) })}
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                  UNIT
                </label>
                <select
                  value={newMapData.scale_unit}
                  onChange={(e) => setNewMapData({ ...newMapData, scale_unit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    color: theme.text
                  }}
                >
                  <option value="miles">Miles</option>
                  <option value="km">Kilometers</option>
                  <option value="leagues">Leagues</option>
                </select>
              </div>
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
                      style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px' }}
                    />
                    <p style={{ color: theme.success, margin: 0 }}>Image uploaded! Click to change.</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} color={theme.muted} style={{ marginBottom: '8px' }} />
                    <p style={{ color: theme.muted, margin: 0 }}>Click to upload map image</p>
                    <p style={{ color: theme.muted, fontSize: '12px', margin: '4px 0 0' }}>PNG, JPG up to 10MB</p>
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
                disabled={!newMapData.name || !newMapData.image_data}
                style={{
                  background: newMapData.name && newMapData.image_data ? theme.primary : theme.muted,
                  border: 'none',
                  color: '#fff'
                }}
              >
                <Save size={16} style={{ marginRight: '6px' }} />
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
            maxWidth: '450px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0 }}>
                {selectedPin ? 'Edit Location' : 'Add Location Pin'}
              </h3>
              <Button onClick={() => { setShowPinEditor(false); setSelectedPin(null); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                LOCATION NAME *
              </label>
              <Input
                value={pinForm.name}
                onChange={(e) => setPinForm({ ...pinForm, name: e.target.value })}
                placeholder="e.g., City of Bouldering"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                LOCATION TYPE
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PIN_TYPES.map(type => {
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
                        fontSize: '12px'
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
                LINK TO EXISTING LOCATION (Optional)
              </label>
              <select
                value={pinForm.linked_location_id}
                onChange={(e) => setPinForm({ ...pinForm, linked_location_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <option value="">-- Create New / No Link --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.location_type})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                DESCRIPTION
              </label>
              <textarea
                value={pinForm.description}
                onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })}
                placeholder="Brief description of this location..."
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
                Save Pin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Path Editor Modal */}
      {showPathEditor && pathStart && (
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
            border: `1px solid ${theme.warning}`,
            padding: '24px',
            maxWidth: '450px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.warning, margin: 0 }}>Create Travel Path</h3>
              <Button onClick={() => { setShowPathEditor(false); setPathStart(null); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <div style={{ background: theme.bg, padding: '12px', marginBottom: '16px' }}>
              <p style={{ color: theme.muted, fontSize: '12px', margin: '0 0 4px' }}>FROM</p>
              <p style={{ color: theme.text, margin: 0, fontWeight: '600' }}>{pathStart.name}</p>
            </div>

            <div style={{ background: theme.bg, padding: '12px', marginBottom: '16px' }}>
              <p style={{ color: theme.muted, fontSize: '12px', margin: '0 0 4px' }}>TO</p>
              <p style={{ color: theme.text, margin: 0, fontWeight: '600' }}>{selectedPin?.name || 'Select destination'}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                  DISTANCE *
                </label>
                <Input
                  type="number"
                  value={pathForm.distance_value}
                  onChange={(e) => setPathForm({ ...pathForm, distance_value: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 50"
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                  UNIT
                </label>
                <select
                  value={pathForm.distance_unit}
                  onChange={(e) => setPathForm({ ...pathForm, distance_unit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    color: theme.text
                  }}
                >
                  <option value="miles">Miles</option>
                  <option value="km">Kilometers</option>
                  <option value="leagues">Leagues</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                TERRAIN TYPE (affects travel time)
              </label>
              <select
                value={pathForm.terrain_type}
                onChange={(e) => {
                  const terrain = TERRAIN_TYPES.find(t => t.id === e.target.value);
                  setPathForm({ 
                    ...pathForm, 
                    terrain_type: e.target.value,
                    terrain_modifier: terrain?.modifier || 1.0
                  });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                {TERRAIN_TYPES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label} (x{t.modifier} travel time)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>
                NOTES (Optional)
              </label>
              <textarea
                value={pathForm.notes}
                onChange={(e) => setPathForm({ ...pathForm, notes: e.target.value })}
                placeholder="e.g., Dangerous mountain pass, toll road..."
                style={{
                  width: '100%',
                  height: '60px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: '10px',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => { setShowPathEditor(false); setPathStart(null); }}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePath}
                disabled={!pathForm.distance_value}
                style={{
                  background: pathForm.distance_value ? theme.warning : theme.muted,
                  border: 'none',
                  color: '#fff'
                }}
              >
                <Save size={14} style={{ marginRight: '6px' }} />
                Create Path
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorldMapTab;
