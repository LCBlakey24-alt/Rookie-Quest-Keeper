import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Navigation, Clock, Footprints, ChevronRight, 
  Building, Store, Beer, Church, Hammer, BookOpen, Home,
  Castle, Mountain, Waves, Trees, Compass, Route,
  Ship, Truck, Plane, ChevronDown, ChevronUp, Map
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// GM Theme - Red
const theme = {
  primary: '#F59E0B',
  hover: '#D97706',
  subtle: 'rgba(225, 29, 72, 0.15)',
  bg: '#0B0F19',
  card: '#111827',
  panel: '#111827',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(212, 175, 55, 0.15)',
  success: '#22C55E',
  cyan: '#06B6D4',
  warning: '#F59E0B'
};

const PIN_TYPES = {
  capital: { icon: Castle, color: '#EAB308', label: 'Capital' },
  city: { icon: Building, color: '#06B6D4', label: 'City' },
  town: { icon: Home, color: '#22C55E', label: 'Town' },
  village: { icon: Home, color: '#84CC16', label: 'Village' },
  landmark: { icon: Mountain, color: '#8B5CF6', label: 'Landmark' },
  dungeon: { icon: Mountain, color: '#D97706', label: 'Dungeon' },
  port: { icon: Waves, color: '#06B6D4', label: 'Port' },
  forest: { icon: Trees, color: '#16A34A', label: 'Forest' },
  custom: { icon: MapPin, color: '#F59E0B', label: 'Location' }
};

const POI_TYPES = {
  shop: { icon: Store, color: '#F59E0B', label: 'Shop' },
  tavern: { icon: Beer, color: '#F97316', label: 'Tavern/Inn' },
  temple: { icon: Church, color: '#8B5CF6', label: 'Temple' },
  blacksmith: { icon: Hammer, color: '#D97706', label: 'Blacksmith' },
  guild: { icon: Building, color: '#06B6D4', label: 'Guild Hall' },
  library: { icon: BookOpen, color: '#06B6D4', label: 'Library' },
  residence: { icon: Home, color: '#22C55E', label: 'Residence' },
  other: { icon: MapPin, color: '#F59E0B', label: 'Other' }
};

const TRAVEL_MODES = [
  { id: 'walking', label: 'On Foot', icon: Footprints, speed: 24 },
  { id: 'horseback', label: 'Horseback', icon: Navigation, speed: 48 },
  { id: 'cart', label: 'Cart', icon: Truck, speed: 16 },
  { id: 'ship', label: 'Ship', icon: Ship, speed: 72 },
  { id: 'flying', label: 'Flying', icon: Plane, speed: 96 }
];

function PartyLocationTracker({ campaignId }) {
  const [worldMaps, setWorldMaps] = useState([]);
  const [localMaps, setLocalMaps] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedWorldMap, setSelectedWorldMap] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [placesOfInterest, setPlacesOfInterest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [travelMode, setTravelMode] = useState('walking');
  const [expandedSections, setExpandedSections] = useState({
    current: true,
    places: true,
    travel: true
  });
  const [travelResult, setTravelResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [worldMapsRes, localMapsRes, locationsRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/world-maps`),
        axios.get(`${API}/campaigns/${campaignId}/local-maps`),
        axios.get(`${API}/campaigns/${campaignId}/locations`)
      ]);
      
      setWorldMaps(worldMapsRes.data || []);
      setLocalMaps(localMapsRes.data || []);
      setLocations(locationsRes.data || []);
      
      // Select first world map if available
      if (worldMapsRes.data?.length > 0) {
        setSelectedWorldMap(worldMapsRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to load location data:', error);
    } finally {
      setLoading(false);
    }
  };

  // When world map or current location changes, fetch nearby locations
  useEffect(() => {
    if (selectedWorldMap && currentLocation) {
      fetchNearbyLocations();
      fetchPlacesOfInterest();
    }
  }, [selectedWorldMap, currentLocation]);

  const fetchNearbyLocations = async () => {
    if (!selectedWorldMap || !currentLocation) return;
    
    try {
      const response = await axios.get(
        `${API}/campaigns/${campaignId}/world-maps/${selectedWorldMap.id}/nearby?pin_id=${currentLocation.id}`
      );
      setNearbyLocations(response.data.nearby_locations || []);
    } catch (error) {
      console.error('Failed to fetch nearby locations:', error);
      setNearbyLocations([]);
    }
  };

  const fetchPlacesOfInterest = () => {
    if (!currentLocation) {
      setPlacesOfInterest([]);
      return;
    }

    // Find local map for this location
    const linkedLocationId = currentLocation.linked_location_id;
    if (linkedLocationId) {
      const localMap = localMaps.find(m => m.location_id === linkedLocationId);
      if (localMap && localMap.pins) {
        setPlacesOfInterest(localMap.pins);
        return;
      }
    }

    // Also check places from the location itself
    const location = locations.find(l => l.id === currentLocation.linked_location_id);
    if (location?.places) {
      setPlacesOfInterest(location.places);
    } else {
      setPlacesOfInterest([]);
    }
  };

  const handleLocationSelect = (pin) => {
    setCurrentLocation(pin);
    setTravelResult(null);
    toast.success(`Party is now at ${pin.name}`);
  };

  const calculateTravelTo = async (destinationPinId) => {
    if (!selectedWorldMap || !currentLocation) return;
    
    try {
      const response = await axios.post(
        `${API}/campaigns/${campaignId}/world-maps/${selectedWorldMap.id}/calculate-travel`,
        {
          from_pin_id: currentLocation.id,
          to_pin_id: destinationPinId,
          travel_mode: travelMode
        }
      );
      setTravelResult(response.data);
    } catch (error) {
      toast.error('No direct path to this location');
    }
  };

  const moveToLocation = (destinationPin) => {
    setCurrentLocation(destinationPin);
    setTravelResult(null);
    toast.success(`Party traveled to ${destinationPin.name}`);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getPinIcon = (pinType) => {
    return PIN_TYPES[pinType]?.icon || MapPin;
  };

  const getPinColor = (pinType) => {
    return PIN_TYPES[pinType]?.color || '#F59E0B';
  };

  const getPOIIcon = (poiType) => {
    return POI_TYPES[poiType]?.icon || MapPin;
  };

  const getPOIColor = (poiType) => {
    return POI_TYPES[poiType]?.color || '#F59E0B';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading location data...
      </div>
    );
  }

  // Get all pins from the selected world map
  const allPins = selectedWorldMap?.pins || [];

  return (
    <div data-testid="party-location-tracker">
      <h2 style={{ 
        fontSize: '20px', 
        color: theme.text, 
        fontWeight: '400', 
        marginBottom: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px' 
      }}>
        <Compass size={24} style={{ color: theme.primary }} /> 
        Party Location
      </h2>

      {/* World Map Selector */}
      {worldMaps.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            color: theme.muted, 
            fontSize: '11px', 
            fontWeight: '400',
            letterSpacing: '1px',
            marginBottom: '8px' 
          }}>
            ACTIVE WORLD MAP
          </label>
          <select
            value={selectedWorldMap?.id || ''}
            onChange={(e) => {
              const map = worldMaps.find(m => m.id === e.target.value);
              setSelectedWorldMap(map);
              setCurrentLocation(null);
              setNearbyLocations([]);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontSize: '14px'
            }}
          >
            {worldMaps.map(map => (
              <option key={map.id} value={map.id}>{map.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* No World Maps Warning */}
      {worldMaps.length === 0 && (
        <div style={{
          background: theme.card,
          border: `1px dashed ${theme.border}`,
          padding: '30px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <Map size={40} style={{ color: theme.muted, marginBottom: '12px' }} />
          <p style={{ color: theme.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
            No world map uploaded yet
          </p>
          <p style={{ color: theme.muted, fontSize: '12px' }}>
            Upload a world map in your Campaign Dashboard → World Map tab
          </p>
        </div>
      )}

      {/* CURRENT LOCATION SECTION */}
      {selectedWorldMap && (
        <div style={{ 
          background: theme.card, 
          border: `1px solid ${theme.border}`,
          marginBottom: '16px'
        }}>
          <button
            onClick={() => toggleSection('current')}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: currentLocation ? theme.subtle : 'transparent',
              border: 'none',
              borderBottom: expandedSections.current ? `1px solid ${theme.border}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={18} color={currentLocation ? theme.primary : theme.muted} />
              <span style={{ 
                color: currentLocation ? theme.text : theme.muted, 
                fontWeight: '400',
                fontSize: '14px'
              }}>
                {currentLocation ? currentLocation.name : 'Select Current Location'}
              </span>
              {currentLocation && (
                <span style={{
                  background: getPinColor(currentLocation.pin_type),
                  padding: '2px 8px',
                  fontSize: '10px',
                  color: '#fff',
                  textTransform: 'uppercase',
                  fontWeight: '400'
                }}>
                  {PIN_TYPES[currentLocation.pin_type]?.label || 'Location'}
                </span>
              )}
            </div>
            {expandedSections.current ? <ChevronUp size={18} color={theme.muted} /> : <ChevronDown size={18} color={theme.muted} />}
          </button>

          {expandedSections.current && (
            <div style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {allPins.length === 0 ? (
                <p style={{ color: theme.muted, fontSize: '13px', textAlign: 'center' }}>
                  No locations pinned on this map yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {allPins.map(pin => {
                    const PinIcon = getPinIcon(pin.pin_type);
                    const isSelected = currentLocation?.id === pin.id;
                    
                    return (
                      <button
                        key={pin.id}
                        onClick={() => handleLocationSelect(pin)}
                        data-testid={`location-${pin.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          background: isSelected ? theme.subtle : theme.bg,
                          border: isSelected ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          background: getPinColor(pin.pin_type),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <PinIcon size={14} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: theme.text, fontSize: '13px', fontWeight: '500' }}>
                            {pin.name}
                          </div>
                          {pin.description && (
                            <div style={{ color: theme.muted, fontSize: '11px', marginTop: '2px' }}>
                              {pin.description.slice(0, 50)}{pin.description.length > 50 ? '...' : ''}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span style={{ color: theme.primary, fontSize: '11px', fontWeight: '400' }}>
                            HERE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PLACES OF INTEREST SECTION */}
      {currentLocation && (
        <div style={{ 
          background: theme.card, 
          border: `1px solid ${theme.border}`,
          marginBottom: '16px'
        }}>
          <button
            onClick={() => toggleSection('places')}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: expandedSections.places ? `1px solid ${theme.border}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={18} color={theme.warning} />
              <span style={{ color: theme.text, fontWeight: '400', fontSize: '14px' }}>
                Places of Interest
              </span>
              <span style={{ 
                background: theme.bg, 
                padding: '2px 8px', 
                fontSize: '11px', 
                color: theme.muted 
              }}>
                {placesOfInterest.length}
              </span>
            </div>
            {expandedSections.places ? <ChevronUp size={18} color={theme.muted} /> : <ChevronDown size={18} color={theme.muted} />}
          </button>

          {expandedSections.places && (
            <div style={{ padding: '16px' }}>
              {placesOfInterest.length === 0 ? (
                <p style={{ color: theme.muted, fontSize: '13px', textAlign: 'center' }}>
                  No places of interest mapped for this location
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {placesOfInterest.map(place => {
                    const POIIcon = getPOIIcon(place.pin_type || place.place_type);
                    const poiColor = getPOIColor(place.pin_type || place.place_type);
                    
                    return (
                      <div
                        key={place.id}
                        style={{
                          padding: '12px',
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: poiColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <POIIcon size={16} color="#fff" />
                        </div>
                        <div>
                          <div style={{ color: theme.text, fontSize: '13px', fontWeight: '400' }}>
                            {place.name}
                          </div>
                          <div style={{ color: poiColor, fontSize: '10px', textTransform: 'uppercase', marginTop: '2px' }}>
                            {POI_TYPES[place.pin_type || place.place_type]?.label || 'Place'}
                          </div>
                          {place.description && (
                            <div style={{ color: theme.muted, fontSize: '11px', marginTop: '4px' }}>
                              {place.description.slice(0, 80)}{place.description.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TRAVEL SECTION */}
      {currentLocation && (
        <div style={{ 
          background: theme.card, 
          border: `1px solid ${theme.border}`
        }}>
          <button
            onClick={() => toggleSection('travel')}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: expandedSections.travel ? `1px solid ${theme.border}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Route size={18} color={theme.cyan} />
              <span style={{ color: theme.text, fontWeight: '400', fontSize: '14px' }}>
                Travel Distances
              </span>
              <span style={{ 
                background: theme.bg, 
                padding: '2px 8px', 
                fontSize: '11px', 
                color: theme.muted 
              }}>
                {nearbyLocations.length} destinations
              </span>
            </div>
            {expandedSections.travel ? <ChevronUp size={18} color={theme.muted} /> : <ChevronDown size={18} color={theme.muted} />}
          </button>

          {expandedSections.travel && (
            <div style={{ padding: '16px' }}>
              {/* Travel Mode Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  color: theme.muted, 
                  fontSize: '11px',
                  fontWeight: '400',
                  letterSpacing: '1px',
                  marginBottom: '8px' 
                }}>
                  TRAVEL MODE
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {TRAVEL_MODES.map(mode => {
                    const Icon = mode.icon;
                    return (
                      <Button
                        key={mode.id}
                        onClick={() => setTravelMode(mode.id)}
                        style={{
                          background: travelMode === mode.id ? theme.cyan : 'transparent',
                          border: `1px solid ${travelMode === mode.id ? theme.cyan : theme.border}`,
                          color: travelMode === mode.id ? '#000' : theme.muted,
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icon size={14} />
                        {mode.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Nearby Locations List */}
              {nearbyLocations.length === 0 ? (
                <p style={{ color: theme.muted, fontSize: '13px', textAlign: 'center' }}>
                  No travel paths defined from this location
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {nearbyLocations.map(loc => {
                    const destPin = allPins.find(p => p.id === loc.pin_id);
                    const DestIcon = destPin ? getPinIcon(destPin.pin_type) : MapPin;
                    const destColor = destPin ? getPinColor(destPin.pin_type) : theme.muted;
                    
                    // Calculate travel time for current mode
                    const modeSpeed = TRAVEL_MODES.find(m => m.id === travelMode)?.speed || 24;
                    const travelDays = loc.distance / modeSpeed;
                    const travelTime = travelDays >= 1 
                      ? `${Math.floor(travelDays)}d ${Math.round((travelDays % 1) * 8)}h`
                      : `${Math.round(travelDays * 8)}h`;
                    
                    return (
                      <div
                        key={loc.pin_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: theme.bg,
                          border: `1px solid ${theme.border}`
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: destColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <DestIcon size={16} color="#fff" />
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ color: theme.text, fontSize: '14px', fontWeight: '400' }}>
                            {loc.name}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            <span style={{ color: theme.muted, fontSize: '12px' }}>
                              {loc.distance} {loc.distance_unit}
                            </span>
                            <span style={{ color: theme.warning, fontSize: '12px' }}>
                              {loc.terrain_type}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            color: theme.cyan, 
                            fontSize: '16px', 
                            fontWeight: '400' 
                          }}>
                            {travelTime}
                          </div>
                          <Button
                            onClick={() => {
                              if (destPin) {
                                moveToLocation(destPin);
                              }
                            }}
                            style={{
                              marginTop: '6px',
                              background: theme.primary,
                              border: 'none',
                              color: '#fff',
                              padding: '4px 12px',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Travel <ChevronRight size={12} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Travel Result Display */}
              {travelResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: `1px solid ${theme.cyan}`
                }}>
                  <div style={{ color: theme.cyan, fontSize: '12px', fontWeight: '400', marginBottom: '8px' }}>
                    TRAVEL CALCULATION
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: theme.muted }}>From:</span>
                    <span style={{ color: theme.text }}>{travelResult.from_location}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: theme.muted }}>To:</span>
                    <span style={{ color: theme.text }}>{travelResult.to_location}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: theme.muted }}>Distance:</span>
                    <span style={{ color: theme.text }}>{travelResult.distance} {travelResult.distance_unit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.muted }}>Time:</span>
                    <span style={{ color: theme.cyan, fontWeight: '400', fontSize: '16px' }}>{travelResult.formatted_time}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Location Info (always visible summary) */}
      {currentLocation && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: theme.subtle,
          border: `1px solid ${theme.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ color: theme.muted, fontSize: '10px', letterSpacing: '1px', marginBottom: '2px' }}>
              PARTY LOCATION
            </div>
            <div style={{ color: theme.text, fontSize: '16px', fontWeight: '400' }}>
              {currentLocation.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: theme.muted, fontSize: '10px' }}>
              {placesOfInterest.length} places • {nearbyLocations.length} routes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartyLocationTracker;
