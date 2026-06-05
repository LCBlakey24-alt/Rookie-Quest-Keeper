import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Map, Upload, Plus, MapPin, Trash2, Edit2, Save, X, Navigation,
  Castle, Building, Home, Mountain, Waves, Trees, Route, Clock,
  ChevronDown, Settings, Compass, Footprints, Ship, Plane, Truck,
  Link2, Eye, ZoomIn, ZoomOut, Grid3X3, Hexagon, Diamond, Move,
  Pencil, Play
} from 'lucide-react';


// GM Theme - Midnight Neon
const theme = {
  primary: '#8A2BE2',
  hover: '#9932CC',
  subtle: 'rgba(138, 43, 226, 0.15)',
  glow: '0 0 20px rgba(138, 43, 226, 0.3)',
  bg: '#0B0B0D',
  card: 'rgba(15, 10, 30, 0.9)',
  panel: 'rgba(15, 10, 30, 0.95)',
  text: '#F8F8FF',
  textSecondary: '#9EB0D0',
  muted: '#6B7B9B',
  border: 'rgba(138, 43, 226, 0.2)',
  success: '#22C55E',
  warning: '#F59E0B',
  cyan: '#4DD0E1',
  gradient: 'linear-gradient(135deg, #4B0082, #8A2BE2)'
};

const PIN_TYPES = [
  { id: 'capital', label: 'Capital City', icon: Castle, color: '#EAB308' },
  { id: 'city', label: 'City', icon: Building, color: '#3B82F6' },
  { id: 'town', label: 'Town', icon: Home, color: '#22C55E' },
  { id: 'village', label: 'Village', icon: Home, color: '#84CC16' },
  { id: 'landmark', label: 'Landmark', icon: Mountain, color: '#8A2BE2' },
  { id: 'dungeon', label: 'Dungeon', icon: Mountain, color: '#EF4444' },
  { id: 'port', label: 'Port', icon: Waves, color: '#4DD0E1' },
  { id: 'forest', label: 'Forest', icon: Trees, color: '#16A34A' },
  { id: 'custom', label: 'Custom', icon: MapPin, color: '#8A2BE2' }
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

const GRID_TYPES = [
  { id: 'none', label: 'No Grid' },
  { id: 'square', label: 'Square' },
  { id: 'hex', label: 'Hexagon' },
  { id: 'diamond', label: 'Diamond' }
];

// Grid overlay renderer
function GridOverlay({ type, cellSize, mapWidth, mapHeight, opacity }) {
  if (type === 'none' || !mapWidth || !mapHeight) return null;

  const cols = Math.ceil(mapWidth / cellSize) + 1;
  const rows = Math.ceil(mapHeight / cellSize) + 1;

  if (type === 'square') {
    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={mapHeight}
            stroke="rgba(138,43,226,0.3)" strokeWidth="1" opacity={opacity} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * cellSize} x2={mapWidth} y2={i * cellSize}
            stroke="rgba(138,43,226,0.3)" strokeWidth="1" opacity={opacity} />
        ))}
        <text x="4" y={cellSize - 4} fill="rgba(138,43,226,0.5)" fontSize="10" fontFamily="monospace">1 day</text>
      </svg>
    );
  }

  if (type === 'hex') {
    const hexW = cellSize;
    const hexH = cellSize * 0.866;
    const paths = [];
    for (let row = 0; row < rows + 1; row++) {
      for (let col = 0; col < cols + 1; col++) {
        const cx = col * hexW * 0.75;
        const cy = row * hexH + (col % 2 === 1 ? hexH / 2 : 0);
        const r = hexW / 2;
        const pts = Array.from({ length: 6 }).map((_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        paths.push(<polygon key={`${row}-${col}`} points={pts} fill="none" stroke="rgba(138,43,226,0.3)" strokeWidth="1" opacity={opacity} />);
      }
    }
    return <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>{paths}</svg>;
  }

  if (type === 'diamond') {
    const paths = [];
    for (let row = 0; row < rows + 1; row++) {
      for (let col = 0; col < cols + 1; col++) {
        const cx = col * cellSize + (row % 2 === 1 ? cellSize / 2 : 0);
        const cy = row * cellSize / 2;
        const half = cellSize / 2;
        const pts = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
        paths.push(<polygon key={`${row}-${col}`} points={pts} fill="none" stroke="rgba(138,43,226,0.3)" strokeWidth="1" opacity={opacity} />);
      }
    }
    return <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>{paths}</svg>;
  }

  return null;
}

// Travel animation component
function TravelAnimator({ fromPin, toPin, pathPoints, dayProgress, totalDays, mapWidth, mapHeight }) {
  if (!fromPin || !toPin || !mapWidth) return null;
  
  const progress = Math.min(dayProgress / Math.max(totalDays, 1), 1);
  
  // If we have custom path points, interpolate along them
  let cx, cy;
  if (pathPoints && pathPoints.length > 1) {
    const totalLen = pathPoints.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const dx = p[0] - pathPoints[i-1][0];
      const dy = p[1] - pathPoints[i-1][1];
      return sum + Math.sqrt(dx*dx + dy*dy);
    }, 0);
    const targetLen = totalLen * progress;
    let accumulated = 0;
    for (let i = 1; i < pathPoints.length; i++) {
      const dx = pathPoints[i][0] - pathPoints[i-1][0];
      const dy = pathPoints[i][1] - pathPoints[i-1][1];
      const segLen = Math.sqrt(dx*dx + dy*dy);
      if (accumulated + segLen >= targetLen) {
        const t = (targetLen - accumulated) / segLen;
        cx = pathPoints[i-1][0] + dx * t;
        cy = pathPoints[i-1][1] + dy * t;
        break;
      }
      accumulated += segLen;
    }
    if (cx === undefined) { cx = toPin.x; cy = toPin.y; }
  } else {
    cx = fromPin.x + (toPin.x - fromPin.x) * progress;
    cy = fromPin.y + (toPin.y - fromPin.y) * progress;
  }

  return (
    <div style={{
      position: 'absolute', left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)',
      zIndex: 50, pointerEvents: 'none'
    }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', background: theme.cyan,
        boxShadow: `0 0 16px ${theme.cyan}, 0 0 32px ${theme.cyan}40`,
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
        background: theme.cyan, padding: '2px 8px', borderRadius: '4px', marginTop: '4px',
        whiteSpace: 'nowrap', fontSize: '11px', color: '#000', fontWeight: '600'
      }}>
        Day {dayProgress} / {totalDays}
      </div>
    </div>
  );
}

function WorldMapTab({ campaignId }) {
  const [worldMaps, setWorldMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  
  // UI State
  const [mode, setMode] = useState('view'); // view, addPin, addPath, travel, drawPath, movePin
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
  const [hoveredPin, setHoveredPin] = useState(null);
  
  // Travel animation
  const [travelAnim, setTravelAnim] = useState(null); // { from, to, dayProgress, totalDays, pathPoints }
  
  // Map zoom/pan
  const [zoom, setZoom] = useState(1);
  const mapRef = useRef(null);
  const fileInputRef = useRef(null);
  const mapImageRef = useRef(null);
  
  // Grid overlay
  const [gridType, setGridType] = useState('none');
  const [gridSize, setGridSize] = useState(50); // px per cell (1 day travel)
  const [gridOpacity, setGridOpacity] = useState(0.5);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  
  // Drawing state for custom paths
  const [drawPoints, setDrawPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Dragging pin state  
  const [draggingPin, setDraggingPin] = useState(null);
  const draggingPinRef = useRef(null);

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
      const response = await apiClient.get(`/campaigns/${campaignId}/world-maps`);
      const maps = response.data || [];
      setWorldMaps(maps);
      if (maps.length > 0 && !selectedMap) {
        setSelectedMap(maps[0]);
      } else if (selectedMap) {
        // Refresh the selected map data
        const updated = maps.find(m => m.id === selectedMap.id);
        if (updated) setSelectedMap(updated);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/locations`);
      setLocations(response.data || []);
    } catch (error) {

    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large. Max 10MB.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => setNewMapData({ ...newMapData, image_data: event.target.result });
    reader.readAsDataURL(file);
  };

  const handleCreateMap = async () => {
    if (!newMapData.name || !newMapData.image_data) { toast.error('Please provide a name and upload an image'); return; }
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/world-maps`, newMapData);
      const newMap = response.data;
      setWorldMaps(prev => [...prev, newMap]);
      setSelectedMap(newMap);
      setShowUpload(false);
      setNewMapData({ name: '', scale_value: 50, scale_unit: 'miles', image_data: '' });
      toast.success('World map created!');
    } catch (error) { toast.error('Failed to create map'); }
  };

  // Map image load handler to get dimensions
  const handleMapImageLoad = (e) => {
    setMapDimensions({ width: e.target.naturalWidth, height: e.target.naturalHeight });
  };

  // Get position % from mouse event on the map container
  const getMapPercent = useCallback((e) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  }, []);

  const handleMapClick = useCallback((e) => {
    if (!selectedMap) return;
    if (mode === 'view' || mode === 'movePin') return;

    const pos = getMapPercent(e);
    if (!pos) return;

    if (mode === 'addPin') {
      setPinForm(f => ({ ...f, x: pos.x, y: pos.y }));
      setShowPinEditor(true);
    } else if (mode === 'addPath') {
      const clickedPin = selectedMap.pins?.find(pin => Math.abs(pin.x - pos.x) < 3 && Math.abs(pin.y - pos.y) < 3);
      if (clickedPin) {
        if (!pathStart) {
          setPathStart(clickedPin);
          toast.info(`Path from: ${clickedPin.name}. Click another location.`);
        } else if (clickedPin.id !== pathStart.id) {
          setSelectedPin(clickedPin);
          setShowPathEditor(true);
        }
      }
    } else if (mode === 'travel') {
      const clickedPin = selectedMap.pins?.find(pin => Math.abs(pin.x - pos.x) < 3 && Math.abs(pin.y - pos.y) < 3);
      if (clickedPin) {
        if (!travelFrom) {
          setTravelFrom(clickedPin);
          fetchNearbyLocations(clickedPin.id);
          toast.info(`From: ${clickedPin.name}. Click destination.`);
        } else {
          setTravelTo(clickedPin);
          calculateTravel(travelFrom.id, clickedPin.id);
        }
      }
    }
  }, [selectedMap, mode, pathStart, travelFrom, getMapPercent]);

  // Drawing handlers for freehand paths
  const handleDrawStart = useCallback((e) => {
    if (mode !== 'drawPath' || !selectedMap) return;
    const pos = getMapPercent(e);
    if (!pos) return;
    setIsDrawing(true);
    setDrawPoints([pos]);
  }, [mode, selectedMap, getMapPercent]);

  const handleDrawMove = useCallback((e) => {
    if (!isDrawing || mode !== 'drawPath') return;
    const pos = getMapPercent(e);
    if (!pos) return;
    setDrawPoints(prev => [...prev, pos]);
  }, [isDrawing, mode, getMapPercent]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (drawPoints.length > 2) {
      // Find nearest pins to start and end of the drawn line
      const startPt = drawPoints[0];
      const endPt = drawPoints[drawPoints.length - 1];
      const findNearest = (pt) => {
        let closest = null, minDist = Infinity;
        selectedMap?.pins?.forEach(pin => {
          const d = Math.sqrt((pin.x - pt.x)**2 + (pin.y - pt.y)**2);
          if (d < minDist) { minDist = d; closest = pin; }
        });
        return minDist < 8 ? closest : null;
      };
      const nearStart = findNearest(startPt);
      const nearEnd = findNearest(endPt);
      if (nearStart && nearEnd && nearStart.id !== nearEnd.id) {
        setPathStart(nearStart);
        setSelectedPin(nearEnd);
        // Store the drawn points for saving
        setPathForm(f => ({ ...f, custom_points: drawPoints.map(p => [p.x, p.y]) }));
        setShowPathEditor(true);
      } else {
        toast.info('Draw a line between two location pins to create a path');
        setDrawPoints([]);
      }
    } else {
      setDrawPoints([]);
    }
  }, [isDrawing, drawPoints, selectedMap]);

  // Pin dragging handlers
  const handlePinDragStart = useCallback((pin, e) => {
    if (mode !== 'movePin') return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingPin(pin.id);
    draggingPinRef.current = pin;
  }, [mode]);

  const handlePinDragMove = useCallback((e) => {
    if (!draggingPin) return;
    const pos = getMapPercent(e);
    if (!pos) return;
    // Update pin position in local state immediately
    setSelectedMap(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pins: prev.pins?.map(p => p.id === draggingPin ? { ...p, x: pos.x, y: pos.y } : p)
      };
    });
  }, [draggingPin, getMapPercent]);

  const handlePinDragEnd = useCallback(async () => {
    if (!draggingPin || !selectedMap) { setDraggingPin(null); return; }
    const pin = selectedMap.pins?.find(p => p.id === draggingPin);
    if (!pin) { setDraggingPin(null); return; }
    
    // Save the new position to backend
    try {
      await apiClient.put(
        `/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${pin.id}`,
        { x: pin.x, y: pin.y, name: pin.name, pin_type: pin.pin_type, description: pin.description || '' }
      );
      // Also update worldMaps state
      setWorldMaps(prev => prev.map(m => m.id === selectedMap.id ? selectedMap : m));
    } catch (error) {
      toast.error('Failed to save pin position');
      fetchWorldMaps(); // Revert on failure
    }
    setDraggingPin(null);
    draggingPinRef.current = null;
  }, [draggingPin, selectedMap, campaignId]);

  // Mouse move handler for the map container
  const handleMapMouseMove = useCallback((e) => {
    if (draggingPin) { handlePinDragMove(e); return; }
    if (isDrawing && mode === 'drawPath') { handleDrawMove(e); return; }
  }, [draggingPin, isDrawing, mode, handlePinDragMove, handleDrawMove]);

  const handleMapMouseUp = useCallback(() => {
    if (draggingPin) handlePinDragEnd();
    if (isDrawing) handleDrawEnd();
  }, [draggingPin, isDrawing, handlePinDragEnd, handleDrawEnd]);

  const handlePinClick = (pin, e) => {
    e.stopPropagation();
    if (mode === 'movePin') return; // Don't select when in move mode
    if (mode === 'view') {
      setSelectedPin(pin);
      setPinForm({ name: pin.name, pin_type: pin.pin_type || 'city', description: pin.description || '', linked_location_id: pin.linked_location_id || '', x: pin.x, y: pin.y });
    } else if (mode === 'addPath') {
      if (!pathStart) { setPathStart(pin); toast.info(`Path from: ${pin.name}. Click another location.`); }
      else if (pin.id !== pathStart.id) { setSelectedPin(pin); setShowPathEditor(true); }
    } else if (mode === 'travel') {
      if (!travelFrom) { setTravelFrom(pin); fetchNearbyLocations(pin.id); }
      else { setTravelTo(pin); calculateTravel(travelFrom.id, pin.id); }
    }
  };

  const handleSavePin = async () => {
    if (!pinForm.name) { toast.error('Please enter a name'); return; }
    try {
      const pinType = PIN_TYPES.find(t => t.id === pinForm.pin_type);
      const pinData = { ...pinForm, color: pinType?.color || '#8A2BE2', icon: pinType?.icon?.name || 'MapPin' };

      if (selectedPin) {
        await apiClient.put(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${selectedPin.id}`, pinData);
        // Update locally without full refetch
        setSelectedMap(prev => ({
          ...prev,
          pins: prev.pins?.map(p => p.id === selectedPin.id ? { ...p, ...pinData } : p)
        }));
        toast.success('Pin updated!');
      } else {
        const response = await apiClient.post(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins`, pinData);
        const newPin = response.data;
        // Add pin to local state immediately - no refresh needed
        setSelectedMap(prev => ({
          ...prev,
          pins: [...(prev.pins || []), newPin]
        }));
        toast.success('Pin added!');
      }

      setShowPinEditor(false);
      setSelectedPin(null);
      setPinForm({ name: '', pin_type: 'city', description: '', linked_location_id: '', x: 50, y: 50 });
      setMode('view');
      // Background sync
      fetchWorldMaps();
    } catch (error) { toast.error('Failed to save pin'); }
  };

  const handleDeletePin = async (pinId) => {
    try {
      await apiClient.delete(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${pinId}`);
      // Remove locally immediately
      setSelectedMap(prev => ({
        ...prev,
        pins: prev.pins?.filter(p => p.id !== pinId),
        paths: prev.paths?.filter(path => path.from_pin_id !== pinId && path.to_pin_id !== pinId)
      }));
      toast.success('Pin deleted');
      setSelectedPin(null);
      fetchWorldMaps();
    } catch (error) { toast.error('Failed to delete pin'); }
  };

  const handleSavePath = async () => {
    if (!pathStart || !selectedPin || !pathForm.distance_value) {
      toast.error('Please select two locations and enter distance');
      return;
    }
    try {
      const payload = {
        from_pin_id: pathStart.id,
        to_pin_id: selectedPin.id,
        distance_value: pathForm.distance_value,
        distance_unit: pathForm.distance_unit,
        terrain_type: pathForm.terrain_type,
        terrain_modifier: pathForm.terrain_modifier,
        notes: pathForm.notes
      };
      // Include custom drawn points if any
      if (pathForm.custom_points?.length > 0) {
        payload.custom_points = pathForm.custom_points;
      }
      const response = await apiClient.post(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/paths`, payload);
      // Add path locally
      setSelectedMap(prev => ({
        ...prev,
        paths: [...(prev.paths || []), response.data]
      }));
      toast.success('Path created!');
      setShowPathEditor(false);
      setPathStart(null);
      setSelectedPin(null);
      setDrawPoints([]);
      setPathForm({ distance_value: 0, distance_unit: 'miles', terrain_type: 'road', terrain_modifier: 1.0, notes: '' });
      setMode('view');
      fetchWorldMaps();
    } catch (error) { toast.error('Failed to create path'); }
  };

  const fetchNearbyLocations = async (pinId) => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/nearby?pin_id=${pinId}`);
      setNearbyLocations(response.data.nearby_locations || []);
    } catch { }
  };

  const calculateTravel = async (fromId, toId) => {
    try {
      const response = await apiClient.post(
        `/campaigns/${campaignId}/world-maps/${selectedMap.id}/calculate-travel`,
        { from_pin_id: fromId, to_pin_id: toId, travel_mode: travelMode }
      );
      setTravelResult(response.data);
      setShowTravelCalc(true);
    } catch (error) { toast.error('No path exists between these locations'); }
  };

  // Start travel animation
  const startTravelAnimation = () => {
    if (!travelResult || !travelFrom || !travelTo) return;
    const totalDays = Math.ceil(travelResult.travel_hours / 8); // 8 hrs travel per day
    const fromPin = travelFrom;
    const toPin = travelTo;
    // Find the path between these pins for custom points
    const path = selectedMap?.paths?.find(p =>
      (p.from_pin_id === fromPin.id && p.to_pin_id === toPin.id) ||
      (p.to_pin_id === fromPin.id && p.from_pin_id === toPin.id)
    );
    const pathPoints = path?.custom_points || null;
    
    setTravelAnim({ from: fromPin, to: toPin, dayProgress: 0, totalDays, pathPoints });
    setShowTravelCalc(false);
    
    // Animate day by day
    let day = 0;
    const interval = setInterval(() => {
      day++;
      if (day > totalDays) {
        clearInterval(interval);
        setTravelAnim(null);
        toast.success(`Party arrived at ${toPin.name}!`);
        return;
      }
      setTravelAnim(prev => prev ? { ...prev, dayProgress: day } : null);
    }, 1200); // 1.2s per day
  };

  const getPinIcon = (pinType) => PIN_TYPES.find(t => t.id === pinType)?.icon || MapPin;
  const getPinColor = (pinType) => PIN_TYPES.find(t => t.id === pinType)?.color || '#8A2BE2';

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>Loading world maps...</div>;
  }

  return (
    <div data-testid="world-map-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.panel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Map size={24} color={theme.primary} />
          <div>
            <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: '700', margin: 0 }}>WORLD MAP</h3>
            <p style={{ color: theme.muted, fontSize: '12px', margin: 0 }}>{selectedMap ? selectedMap.name : 'No map selected'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {worldMaps.length > 0 && (
            <select value={selectedMap?.id || ''} onChange={(e) => setSelectedMap(worldMaps.find(m => m.id === e.target.value))}
              style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, padding: '8px 12px', fontSize: '13px', borderRadius: '6px' }}>
              {worldMaps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
            </select>
          )}
          <Button onClick={() => setShowUpload(true)} style={{ background: theme.gradient, border: 'none', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} /> Upload Map
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {selectedMap && (
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '6px', background: theme.bg, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'view', icon: Eye, label: 'View', color: theme.primary },
            { id: 'addPin', icon: MapPin, label: 'Add Pin', color: theme.primary },
            { id: 'movePin', icon: Move, label: 'Move Pin', color: theme.success },
            { id: 'addPath', icon: Route, label: 'Line Path', color: theme.warning },
            { id: 'drawPath', icon: Pencil, label: 'Draw Path', color: '#EC4899' },
            { id: 'travel', icon: Compass, label: 'Travel', color: theme.cyan },
          ].map(btn => (
            <Button key={btn.id} onClick={() => { setMode(btn.id); setPathStart(null); setTravelFrom(null); setTravelTo(null); setDrawPoints([]); }}
              data-testid={`mode-${btn.id}`}
              style={{
                background: mode === btn.id ? `${btn.color}20` : 'transparent',
                border: `1px solid ${mode === btn.id ? btn.color : theme.border}`,
                color: mode === btn.id ? btn.color : theme.muted,
                padding: '6px 12px', fontSize: '12px', borderRadius: '6px'
              }}>
              <btn.icon size={14} style={{ marginRight: '4px' }} /> {btn.label}
            </Button>
          ))}
          
          <div style={{ width: '1px', height: '24px', background: theme.border, margin: '0 4px' }} />
          
          {/* Grid controls */}
          <select data-testid="grid-selector" value={gridType} onChange={(e) => setGridType(e.target.value)}
            style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, padding: '6px 10px', fontSize: '12px', borderRadius: '6px' }}>
            {GRID_TYPES.map(g => <option key={g.id} value={g.id}>{g.label} Grid</option>)}
          </select>
          
          {gridType !== 'none' && (
            <input type="range" min="20" max="120" value={gridSize} onChange={e => setGridSize(parseInt(e.target.value))}
              style={{ width: '80px' }} title={`Grid size: ${gridSize}px (1 day travel)`} />
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <Button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: '6px', borderRadius: '6px' }}>
              <ZoomOut size={16} color={theme.muted} />
            </Button>
            <span style={{ color: theme.muted, fontSize: '12px', minWidth: '50px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <Button onClick={() => setZoom(Math.min(3, zoom + 0.25))} style={{ background: 'transparent', border: `1px solid ${theme.border}`, padding: '6px', borderRadius: '6px' }}>
              <ZoomIn size={16} color={theme.muted} />
            </Button>
          </div>
        </div>
      )}

      {/* Mode Hint Bar */}
      {selectedMap && mode !== 'view' && (
        <div style={{ padding: '6px 20px', background: `${mode === 'movePin' ? theme.success : mode === 'drawPath' ? '#EC4899' : theme.primary}15`,
          borderBottom: `1px solid ${mode === 'movePin' ? theme.success : mode === 'drawPath' ? '#EC4899' : theme.primary}30`,
          fontSize: '12px', color: mode === 'movePin' ? theme.success : mode === 'drawPath' ? '#EC4899' : theme.primary }}>
          {mode === 'addPin' && 'Click on the map to place a new location pin'}
          {mode === 'movePin' && 'Click and drag any pin to reposition it'}
          {mode === 'addPath' && (pathStart ? `Click destination pin (from: ${pathStart.name})` : 'Click a pin to start the path')}
          {mode === 'drawPath' && 'Click and drag to draw a custom path between two pins'}
          {mode === 'travel' && (travelFrom ? `Click destination (from: ${travelFrom.name})` : 'Click a pin to set travel origin')}
        </div>
      )}

      {/* Map Display */}
      <div style={{ flex: 1, overflow: 'auto', background: theme.bg, position: 'relative' }}>
        {selectedMap ? (
          <div
            ref={mapRef}
            onClick={handleMapClick}
            onMouseDown={mode === 'drawPath' ? handleDrawStart : undefined}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={handleMapMouseUp}
            style={{
              position: 'relative',
              width: `${100 * zoom}%`,
              minHeight: '500px',
              cursor: mode === 'addPin' ? 'crosshair' : mode === 'movePin' ? 'move' : mode === 'drawPath' ? 'crosshair' : 'default'
            }}
          >
            {/* Map Image */}
            {selectedMap.image_data && (
              <img src={selectedMap.image_data} alt={selectedMap.name} ref={mapImageRef} onLoad={handleMapImageLoad}
                style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
            )}

            {/* Grid Overlay */}
            <GridOverlay type={gridType} cellSize={gridSize} mapWidth={mapRef.current?.clientWidth || 800} mapHeight={mapRef.current?.clientHeight || 500} opacity={gridOpacity} />

            {/* Paths SVG */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {selectedMap.paths?.map(path => {
                const fromPin = selectedMap.pins?.find(p => p.id === path.from_pin_id);
                const toPin = selectedMap.pins?.find(p => p.id === path.to_pin_id);
                if (!fromPin || !toPin) return null;

                // Custom drawn path or straight line
                if (path.custom_points && path.custom_points.length > 1) {
                  const d = path.custom_points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0]}% ${pt[1]}%`).join(' ');
                  return (
                    <path key={path.id} d={d} fill="none"
                      stroke={path.terrain_type === 'road' ? theme.primary : '#9EB0D0'}
                      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
                  );
                }

                return (
                  <line key={path.id}
                    x1={`${fromPin.x}%`} y1={`${fromPin.y}%`} x2={`${toPin.x}%`} y2={`${toPin.y}%`}
                    stroke={path.terrain_type === 'road' ? theme.primary : '#9EB0D0'}
                    strokeWidth="2" strokeDasharray={path.terrain_type === 'road' ? '0' : '5,5'} opacity={0.7} />
                );
              })}

              {/* Currently drawing path */}
              {drawPoints.length > 1 && (
                <path d={drawPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x}% ${pt.y}%`).join(' ')}
                  fill="none" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} strokeDasharray="6,4" />
              )}
            </svg>

            {/* Pins */}
            {selectedMap.pins?.map(pin => {
              const PinIcon = getPinIcon(pin.pin_type);
              const pinColor = getPinColor(pin.pin_type);
              const isSelected = selectedPin?.id === pin.id || travelFrom?.id === pin.id || travelTo?.id === pin.id;
              const isPathSrc = pathStart?.id === pin.id;
              const isDrag = draggingPin === pin.id;

              return (
                <div key={pin.id}
                  onClick={(e) => handlePinClick(pin, e)}
                  onMouseDown={(e) => handlePinDragStart(pin, e)}
                  onMouseEnter={() => setHoveredPin(pin)}
                  onMouseLeave={() => setHoveredPin(null)}
                  data-testid={`map-pin-${pin.id}`}
                  style={{
                    position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)',
                    cursor: mode === 'movePin' ? (isDrag ? 'grabbing' : 'grab') : 'pointer',
                    zIndex: isSelected || isPathSrc || isDrag || hoveredPin?.id === pin.id ? 10 : 1,
                    transition: isDrag ? 'none' : 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    background: isPathSrc ? theme.warning : pinColor,
                    padding: '6px', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
                    boxShadow: (isSelected || isPathSrc || isDrag) ? `0 0 12px ${isPathSrc ? theme.warning : pinColor}` : 'none',
                    border: (isSelected || isPathSrc || isDrag) ? '2px solid #fff' : 'none',
                    animation: isPathSrc ? 'pulse 1.5s ease-in-out infinite' : 'none'
                  }}>
                    <PinIcon size={16} color="#fff" style={{ transform: 'rotate(45deg)' }} />
                  </div>
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    background: isPathSrc ? theme.warning : 'rgba(0,0,0,0.85)', padding: '2px 6px',
                    whiteSpace: 'nowrap', fontSize: '11px', borderRadius: '3px',
                    color: isPathSrc ? '#000' : '#fff', marginTop: '4px', fontWeight: isPathSrc ? '600' : '400'
                  }}>
                    {isPathSrc ? `FROM: ${pin.name}` : pin.name}
                  </div>

                  {/* Hover Preview Card */}
                  {hoveredPin?.id === pin.id && !isDrag && !isSelected && (
                    <div
                      data-testid={`pin-preview-${pin.id}`}
                      style={{
                        position: 'absolute',
                        bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        marginBottom: '12px',
                        width: '220px',
                        background: 'rgba(10, 5, 25, 0.95)',
                        border: `1px solid ${pinColor}40`,
                        borderRadius: '10px',
                        padding: '10px 12px',
                        boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 8px ${pinColor}30`,
                        backdropFilter: 'blur(12px)',
                        zIndex: 100,
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <PinIcon size={14} color={pinColor} />
                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{pin.name}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: pinColor, textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                        {PIN_TYPES.find(t => t.id === pin.pin_type)?.label || pin.pin_type}
                      </div>
                      {pin.description && (
                        <p style={{ color: '#9EB0D0', fontSize: '11px', lineHeight: '1.4', margin: 0, maxHeight: '60px', overflow: 'hidden' }}>
                          {pin.description.length > 120 ? pin.description.substring(0, 120) + '...' : pin.description}
                        </p>
                      )}
                      {pin.linked_location_id && (
                        <div style={{ marginTop: '4px', fontSize: '10px', color: theme.cyan, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Link2 size={10} /> Linked location
                        </div>
                      )}
                      {!pin.description && (
                        <p style={{ color: '#6B7B9B', fontSize: '11px', fontStyle: 'italic' }}>Click to view details</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Travel Animation */}
            {travelAnim && (
              <TravelAnimator
                fromPin={travelAnim.from} toPin={travelAnim.to}
                pathPoints={travelAnim.pathPoints}
                dayProgress={travelAnim.dayProgress} totalDays={travelAnim.totalDays}
                mapWidth={mapRef.current?.clientWidth} mapHeight={mapRef.current?.clientHeight}
              />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: theme.muted }}>
            <Map size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No world map uploaded</p>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>Upload a map image to start pinning locations</p>
            <Button onClick={() => setShowUpload(true)} style={{ background: theme.gradient, border: 'none', color: '#fff' }}>
              <Upload size={16} style={{ marginRight: '8px' }} /> Upload World Map
            </Button>
          </div>
        )}
      </div>

      {/* Travel Mode Panel */}
      {mode === 'travel' && travelFrom && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: theme.panel, border: `1px solid ${theme.cyan}`, borderRadius: '12px', padding: '16px', maxWidth: '300px', zIndex: 100, backdropFilter: 'blur(12px)' }}>
          <h4 style={{ color: theme.cyan, margin: '0 0 12px', fontSize: '14px' }}>TRAVEL FROM: {travelFrom.name}</h4>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: theme.muted, fontSize: '11px', display: 'block', marginBottom: '6px' }}>TRAVEL MODE</label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {TRAVEL_MODES.map(m => {
                const Icon = m.icon;
                return (
                  <Button key={m.id} onClick={() => setTravelMode(m.id)}
                    style={{ background: travelMode === m.id ? theme.cyan : 'transparent', border: `1px solid ${travelMode === m.id ? theme.cyan : theme.border}`,
                      color: travelMode === m.id ? '#000' : theme.muted, padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}>
                    <Icon size={12} style={{ marginRight: '4px' }} /> {m.label}
                  </Button>
                );
              })}
            </div>
          </div>
          {nearbyLocations.length > 0 && (
            <div>
              <label style={{ color: theme.muted, fontSize: '11px', display: 'block', marginBottom: '6px' }}>NEARBY DESTINATIONS</label>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {nearbyLocations.map(loc => (
                  <div key={loc.pin_id} onClick={() => {
                    const pin = selectedMap.pins?.find(p => p.id === loc.pin_id);
                    if (pin) { setTravelTo(pin); calculateTravel(travelFrom.id, pin.id); }
                  }}
                    style={{ padding: '8px', background: theme.bg, marginBottom: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderRadius: '4px' }}>
                    <span style={{ color: theme.text, fontSize: '13px' }}>{loc.name}</span>
                    <span style={{ color: theme.cyan, fontSize: '11px' }}>{loc.walking_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button onClick={() => { setTravelFrom(null); setTravelTo(null); setNearbyLocations([]); }}
            style={{ width: '100%', marginTop: '12px', background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '8px', borderRadius: '6px' }}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* Selected Pin Info Panel */}
      {mode === 'view' && selectedPin && !showPinEditor && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: theme.panel, border: `1px solid ${theme.primary}`,
          borderRadius: '12px', padding: '16px', maxWidth: '320px', zIndex: 100, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: getPinColor(selectedPin.pin_type), padding: '8px', borderRadius: '50%' }}>
                {React.createElement(getPinIcon(selectedPin.pin_type), { size: 18, color: '#fff' })}
              </div>
              <div>
                <h4 style={{ color: theme.text, margin: 0, fontSize: '16px', fontWeight: '600' }}>{selectedPin.name}</h4>
                <span style={{ color: theme.muted, fontSize: '12px', textTransform: 'capitalize' }}>{selectedPin.pin_type}</span>
              </div>
            </div>
            <Button onClick={() => setSelectedPin(null)} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
              <X size={18} color={theme.muted} />
            </Button>
          </div>
          {selectedPin.description && (
            <p style={{ color: theme.textSecondary, fontSize: '13px', lineHeight: '1.5', margin: '0 0 12px', padding: '10px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
              {selectedPin.description}
            </p>
          )}
          {selectedMap.paths?.some(p => p.from_pin_id === selectedPin.id || p.to_pin_id === selectedPin.id) && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: theme.muted, fontSize: '11px', display: 'block', marginBottom: '6px' }}>CONNECTED ROUTES</label>
              <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {selectedMap.paths.filter(p => p.from_pin_id === selectedPin.id || p.to_pin_id === selectedPin.id).map(path => {
                  const destId = path.from_pin_id === selectedPin.id ? path.to_pin_id : path.from_pin_id;
                  const destPin = selectedMap.pins?.find(p => p.id === destId);
                  return destPin && (
                    <div key={path.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: theme.bg, marginBottom: '4px', fontSize: '12px', borderRadius: '4px' }}>
                      <span style={{ color: theme.text }}>{destPin.name}</span>
                      <span style={{ color: theme.warning }}>{path.distance_value} {path.distance_unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setShowPinEditor(true)} style={{ flex: 1, background: theme.gradient, border: 'none', color: '#fff', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '6px' }}>
              <Edit2 size={14} /> Edit
            </Button>
            <Button onClick={() => { setTravelFrom(selectedPin); fetchNearbyLocations(selectedPin.id); setMode('travel'); setSelectedPin(null); }}
              style={{ flex: 1, background: theme.cyan, border: 'none', color: '#000', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '6px' }}>
              <Compass size={14} /> Travel From
            </Button>
          </div>
        </div>
      )}

      {/* Travel Result Modal */}
      {showTravelCalc && travelResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: theme.panel, border: `1px solid ${theme.cyan}`, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: theme.cyan, margin: 0 }}><Clock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Travel Time</h3>
              <Button onClick={() => setShowTravelCalc(false)} style={{ background: 'transparent', border: 'none', padding: '4px' }}><X size={20} color={theme.muted} /></Button>
            </div>
            <div style={{ background: theme.bg, padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
              {[
                ['From:', travelResult.from_location, theme.text],
                ['To:', travelResult.to_location, theme.text],
                ['Distance:', `${travelResult.distance} ${travelResult.distance_unit}`, theme.text],
                ['Terrain:', travelResult.terrain_type, theme.warning],
                ['Travel Mode:', travelResult.travel_mode, theme.text]
              ].map(([label, val, c]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: theme.muted }}>{label}</span>
                  <span style={{ color: c, fontWeight: '600' }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ background: theme.subtle, border: `1px solid ${theme.cyan}`, borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ color: theme.muted, fontSize: '12px', marginBottom: '4px' }}>ESTIMATED TRAVEL TIME</div>
              <div style={{ color: theme.cyan, fontSize: '28px', fontWeight: '800' }}>{travelResult.formatted_time}</div>
              <div style={{ color: theme.muted, fontSize: '12px', marginTop: '4px' }}>({travelResult.speed_per_day} {travelResult.distance_unit}/day)</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={() => setShowTravelCalc(false)} style={{ flex: 1, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '10px', borderRadius: '8px' }}>Close</Button>
              <Button onClick={startTravelAnimation} data-testid="animate-travel-btn"
                style={{ flex: 1, background: theme.cyan, border: 'none', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Play size={14} /> Animate Travel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Map Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: theme.panel, border: `1px solid ${theme.primary}`, borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0 }}>Upload World Map</h3>
              <Button onClick={() => setShowUpload(false)} style={{ background: 'transparent', border: 'none', padding: '4px' }}><X size={20} color={theme.muted} /></Button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>MAP NAME *</label>
              <Input value={newMapData.name} onChange={(e) => setNewMapData({ ...newMapData, name: e.target.value })} placeholder="e.g., The Realm of Eldoria"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>SCALE (1 inch = X)</label>
                <Input type="number" value={newMapData.scale_value} onChange={(e) => setNewMapData({ ...newMapData, scale_value: parseFloat(e.target.value) })}
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>UNIT</label>
                <select value={newMapData.scale_unit} onChange={(e) => setNewMapData({ ...newMapData, scale_unit: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '6px' }}>
                  <option value="miles">Miles</option><option value="km">Kilometers</option><option value="leagues">Leagues</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>MAP IMAGE *</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${newMapData.image_data ? theme.success : theme.border}`, borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer', background: theme.bg }}>
                {newMapData.image_data ? (
                  <div>
                    <img src={newMapData.image_data} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px', borderRadius: '8px' }} />
                    <p style={{ color: theme.success, margin: 0 }}>Image uploaded! Click to change.</p>
                  </div>
                ) : (
                  <><Upload size={32} color={theme.muted} style={{ marginBottom: '8px' }} /><p style={{ color: theme.muted, margin: 0 }}>Click to upload map image</p><p style={{ color: theme.muted, fontSize: '12px', margin: '4px 0 0' }}>PNG, JPG up to 10MB</p></>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowUpload(false)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: '8px' }}>Cancel</Button>
              <Button onClick={handleCreateMap} disabled={!newMapData.name || !newMapData.image_data}
                style={{ background: newMapData.name && newMapData.image_data ? theme.gradient : theme.muted, border: 'none', color: '#fff', borderRadius: '8px' }}>
                <Save size={16} style={{ marginRight: '6px' }} /> Create Map
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Editor Modal */}
      {showPinEditor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: theme.panel, border: `1px solid ${theme.primary}`, borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0 }}>{selectedPin ? 'Edit Location' : 'Add Location Pin'}</h3>
              <Button onClick={() => { setShowPinEditor(false); setSelectedPin(null); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}><X size={20} color={theme.muted} /></Button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>LOCATION NAME *</label>
              <Input value={pinForm.name} onChange={(e) => setPinForm({ ...pinForm, name: e.target.value })} placeholder="e.g., City of Bouldering"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>LOCATION TYPE</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PIN_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button key={type.id} onClick={() => setPinForm({ ...pinForm, pin_type: type.id })}
                      style={{ background: pinForm.pin_type === type.id ? type.color : 'transparent', border: `1px solid ${pinForm.pin_type === type.id ? type.color : theme.border}`,
                        color: pinForm.pin_type === type.id ? '#fff' : theme.muted, padding: '6px 10px', fontSize: '12px', borderRadius: '6px' }}>
                      <Icon size={12} style={{ marginRight: '4px' }} /> {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>LINK TO EXISTING LOCATION</label>
              <select value={pinForm.linked_location_id} onChange={(e) => setPinForm({ ...pinForm, linked_location_id: e.target.value })}
                style={{ width: '100%', padding: '8px', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '6px' }}>
                <option value="">-- Create New / No Link --</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name} ({loc.location_type})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>DESCRIPTION</label>
              <textarea value={pinForm.description} onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })} placeholder="Brief description..."
                style={{ width: '100%', height: '80px', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, padding: '10px', resize: 'none', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {selectedPin && (
                <Button onClick={() => handleDeletePin(selectedPin.id)} style={{ background: '#EF4444', border: 'none', color: '#fff', marginRight: 'auto', borderRadius: '8px' }}>
                  <Trash2 size={14} style={{ marginRight: '6px' }} /> Delete
                </Button>
              )}
              <Button onClick={() => { setShowPinEditor(false); setSelectedPin(null); }} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: '8px' }}>Cancel</Button>
              <Button onClick={handleSavePin} style={{ background: theme.gradient, border: 'none', color: '#fff', borderRadius: '8px' }}>
                <Save size={14} style={{ marginRight: '6px' }} /> Save Pin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Path Editor Modal */}
      {showPathEditor && pathStart && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: theme.panel, border: `1px solid ${theme.warning}`, borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.warning, margin: 0 }}>Create Travel Path</h3>
              <Button onClick={() => { setShowPathEditor(false); setPathStart(null); setDrawPoints([]); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}><X size={20} color={theme.muted} /></Button>
            </div>
            {drawPoints.length > 0 && (
              <div style={{ padding: '8px 12px', background: '#EC489915', border: '1px solid #EC489930', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#EC4899' }}>
                Custom drawn path ({drawPoints.length} points)
              </div>
            )}
            <div style={{ background: theme.bg, padding: '12px', marginBottom: '16px', borderRadius: '8px' }}>
              <p style={{ color: theme.muted, fontSize: '12px', margin: '0 0 4px' }}>FROM</p>
              <p style={{ color: theme.text, margin: 0, fontWeight: '600' }}>{pathStart.name}</p>
            </div>
            <div style={{ background: theme.bg, padding: '12px', marginBottom: '16px', borderRadius: '8px' }}>
              <p style={{ color: theme.muted, fontSize: '12px', margin: '0 0 4px' }}>TO</p>
              <p style={{ color: theme.text, margin: 0, fontWeight: '600' }}>{selectedPin?.name || 'Select destination'}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>DISTANCE *</label>
                <Input type="number" value={pathForm.distance_value} onChange={(e) => setPathForm({ ...pathForm, distance_value: parseFloat(e.target.value) || 0 })} placeholder="e.g., 50"
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>UNIT</label>
                <select value={pathForm.distance_unit} onChange={(e) => setPathForm({ ...pathForm, distance_unit: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '6px' }}>
                  <option value="miles">Miles</option><option value="km">Kilometers</option><option value="leagues">Leagues</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px' }}>TERRAIN TYPE</label>
              <select value={pathForm.terrain_type} onChange={(e) => { const t = TERRAIN_TYPES.find(t => t.id === e.target.value); setPathForm({ ...pathForm, terrain_type: e.target.value, terrain_modifier: t?.modifier || 1.0 }); }}
                style={{ width: '100%', padding: '8px', background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '6px' }}>
                {TERRAIN_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} (x{t.modifier})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setShowPathEditor(false); setPathStart(null); setDrawPoints([]); }} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: '8px' }}>Cancel</Button>
              <Button onClick={handleSavePath} disabled={!pathForm.distance_value} style={{ background: pathForm.distance_value ? theme.warning : theme.muted, border: 'none', color: '#fff', borderRadius: '8px' }}>
                <Save size={14} style={{ marginRight: '6px' }} /> Create Path
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}

export default WorldMapTab;
