import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MapCanvas, { DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, TERRAIN_TYPES, GRID_SIZE } from './MapCanvas';
import MapToolbar from './MapToolbar';
import {
  ChevronLeft, ChevronRight, Users, Search, Plus, Trash2, Copy,
  Layers, Settings, X, Check, ArrowLeft
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Create empty map
function createEmptyMap(width = DEFAULT_MAP_WIDTH, height = DEFAULT_MAP_HEIGHT) {
  return {
    width,
    height,
    terrain: Array(height).fill(null).map(() => Array(width).fill('empty')),
    walls: [],
    doors: [],
    objects: []
  };
}

// Create empty fog of war
function createEmptyFog(width, height, hidden = true) {
  return Array(height).fill(null).map(() => Array(width).fill(hidden));
}

function MapBuilder({ campaignId, onClose, initialMap, onMapSaved }) {
  // Map state
  const [mapData, setMapData] = useState(initialMap || createEmptyMap());
  const [mapName, setMapName] = useState(initialMap?.name || 'Untitled Map');
  const [mapId, setMapId] = useState(initialMap?.id || null);

  // Tool state
  const [tool, setTool] = useState('terrain');
  const [selectedTerrain, setSelectedTerrain] = useState('stone');
  const [selectedWallType, setSelectedWallType] = useState('stone');
  
  // View state
  const [showGrid, setShowGrid] = useState(true);
  const [showFog, setShowFog] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Fog of war
  const [fogOfWar, setFogOfWar] = useState(() => 
    createEmptyFog(mapData.width, mapData.height, true)
  );
  
  // Tokens for preview
  const [tokens, setTokens] = useState(initialMap?.tokens || []);
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Side panel
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState('layers');
  
  // Saving
  const [saving, setSaving] = useState(false);
  
  // File input ref
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Handle map changes with history
  const handleMapChange = useCallback((newMap) => {
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(mapData);
    
    // Limit history
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMapData(newMap);
  }, [history, historyIndex, mapData]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      setMapData(history[historyIndex]);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMapData(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Token movement
  const handleTokenMove = useCallback((tokenId, newX, newY) => {
    setTokens(prev => prev.map(t => 
      t.id === tokenId ? { ...t, x: newX, y: newY } : t
    ));
  }, []);

  // Fog of war changes
  const handleFogChange = useCallback((newFog) => {
    setFogOfWar(newFog);
  }, []);

  // Save map
  const handleSave = async () => {
    setSaving(true);
    try {
      const mapPayload = {
        name: mapName,
        width: mapData.width,
        height: mapData.height,
        terrain: mapData.terrain,
        walls: mapData.walls,
        doors: mapData.doors,
        objects: mapData.objects,
        fog_of_war: fogOfWar,
        tokens: tokens.map(t => ({
          id: t.id,
          name: t.name,
          x: t.x,
          y: t.y,
          isEnemy: t.isEnemy,
          isAlly: t.isAlly
        }))
      };

      let response;
      if (mapId) {
        response = await axios.put(`${API}/campaigns/${campaignId}/maps/${mapId}`, mapPayload);
      } else {
        response = await axios.post(`${API}/campaigns/${campaignId}/maps`, mapPayload);
        setMapId(response.data.id);
      }

      toast.success('Map saved successfully!');
      onMapSaved?.(response.data);
    } catch (error) {
      console.error('Failed to save map:', error);
      toast.error('Failed to save map');
    } finally {
      setSaving(false);
    }
  };

  // Load map
  const handleLoad = () => {
    // This would open a modal to select from saved maps
    toast.info('Select a map from the campaign maps list');
  };

  // Export map as JSON
  const handleExport = () => {
    const exportData = {
      name: mapName,
      version: '1.0',
      ...mapData,
      fogOfWar
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Map exported!');
  };

  // Import background image
  const handleImportImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate grid size based on image
        const gridWidth = Math.ceil(img.width / GRID_SIZE);
        const gridHeight = Math.ceil(img.height / GRID_SIZE);
        
        // Create new map with background image
        const newMap = {
          ...createEmptyMap(gridWidth, gridHeight),
          backgroundImage: event.target?.result
        };
        
        setMapData(newMap);
        setFogOfWar(createEmptyFog(gridWidth, gridHeight, true));
        toast.success(`Image imported! Grid: ${gridWidth}x${gridHeight}`);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  // Resize map
  const handleResize = (newWidth, newHeight) => {
    const newTerrain = Array(newHeight).fill(null).map((_, y) =>
      Array(newWidth).fill(null).map((_, x) =>
        mapData.terrain[y]?.[x] || 'empty'
      )
    );
    
    const newFog = Array(newHeight).fill(null).map((_, y) =>
      Array(newWidth).fill(null).map((_, x) =>
        fogOfWar[y]?.[x] ?? true
      )
    );

    setMapData({ ...mapData, width: newWidth, height: newHeight, terrain: newTerrain });
    setFogOfWar(newFog);
  };

  // Add test token
  const addTestToken = () => {
    const newToken = {
      id: `token-${Date.now()}`,
      name: 'Test Token',
      x: Math.floor(mapData.width / 2),
      y: Math.floor(mapData.height / 2),
      isEnemy: Math.random() > 0.5,
      isAlly: false,
      hp: 20,
      maxHp: 20
    };
    setTokens(prev => [...prev, newToken]);
  };

  // Clear all fog
  const clearAllFog = () => {
    setFogOfWar(createEmptyFog(mapData.width, mapData.height, false));
    toast.success('All fog cleared!');
  };

  // Hide all (reset fog)
  const hideAll = () => {
    setFogOfWar(createEmptyFog(mapData.width, mapData.height, true));
    toast.success('Map hidden!');
  };

  // Fill terrain
  const fillTerrain = (terrainType) => {
    const newTerrain = Array(mapData.height).fill(null).map(() =>
      Array(mapData.width).fill(terrainType)
    );
    handleMapChange({ ...mapData, terrain: newTerrain });
    toast.success(`Filled with ${TERRAIN_TYPES[terrainType]?.name || terrainType}`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0a0a1a',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(10, 10, 46, 0.98)',
        borderBottom: '2px solid #374151',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            onClick={onClose}
            variant="outline"
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 style={{
            color: '#fff',
            fontSize: '20px',
            fontWeight: '800',
            fontFamily: 'Cityworm, sans-serif'
          }}>
            Map Builder
          </h1>
        </div>
        
        <div style={{ color: '#64748b', fontSize: '12px' }}>
          {mapData.width} x {mapData.height} grid • Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Toolbar */}
      <MapToolbar
        tool={tool}
        setTool={setTool}
        selectedTerrain={selectedTerrain}
        setSelectedTerrain={setSelectedTerrain}
        selectedWallType={selectedWallType}
        setSelectedWallType={setSelectedWallType}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showFog={showFog}
        setShowFog={setShowFog}
        onZoomIn={() => setZoom(z => Math.min(3, z * 1.2))}
        onZoomOut={() => setZoom(z => Math.max(0.25, z / 1.2))}
        onResetView={() => setZoom(1)}
        onSave={handleSave}
        onLoad={handleLoad}
        onExport={handleExport}
        onImportImage={handleImportImage}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < history.length - 1}
        mapName={mapName}
        setMapName={setMapName}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapCanvas
            mapData={mapData}
            onMapChange={handleMapChange}
            tool={tool}
            selectedTerrain={selectedTerrain}
            selectedWallType={selectedWallType}
            tokens={tokens}
            onTokenMove={handleTokenMove}
            fogOfWar={showFog ? fogOfWar : null}
            onFogChange={handleFogChange}
            showGrid={showGrid}
            gridSize={GRID_SIZE}
            zoom={zoom}
          />
          
          {/* Tool hint */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#94a3b8'
          }}>
            {tool === 'select' && 'Click and drag tokens to move them'}
            {tool === 'terrain' && 'Click or drag to paint terrain'}
            {tool === 'wall' && 'Click to place wall segments'}
            {tool === 'door' && 'Click on walls to place doors'}
            {tool === 'eraser' && 'Click or drag to erase terrain'}
            {tool === 'fog' && 'Click to toggle fog of war visibility'}
            {tool === 'token' && 'Click to place a token'}
            <span style={{ marginLeft: '12px', color: '#64748b' }}>
              Shift+Click to pan • Scroll to zoom
            </span>
          </div>
        </div>

        {/* Side Panel */}
        {showSidePanel && (
          <div style={{
            width: '280px',
            background: 'rgba(10, 10, 46, 0.95)',
            borderLeft: '2px solid #374151',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Panel Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #374151'
            }}>
              {[
                { id: 'layers', icon: Layers, label: 'Layers' },
                { id: 'tokens', icon: Users, label: 'Tokens' },
                { id: 'settings', icon: Settings, label: 'Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSidePanelTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: sidePanelTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    borderBottom: sidePanelTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    color: sidePanelTab === tab.id ? '#3b82f6' : '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {sidePanelTab === 'layers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                    Quick Fill
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {Object.entries(TERRAIN_TYPES).slice(0, 6).map(([key, terrain]) => (
                      <button
                        key={key}
                        onClick={() => fillTerrain(key)}
                        style={{
                          padding: '8px',
                          background: terrain.color,
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {terrain.name}
                      </button>
                    ))}
                  </div>
                  
                  <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginTop: '16px' }}>
                    Fog of War
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={clearAllFog}
                      variant="outline"
                      style={{ flex: 1, fontSize: '11px', padding: '8px' }}
                    >
                      Reveal All
                    </Button>
                    <Button
                      onClick={hideAll}
                      variant="outline"
                      style={{ flex: 1, fontSize: '11px', padding: '8px' }}
                    >
                      Hide All
                    </Button>
                  </div>
                </div>
              )}

              {sidePanelTab === 'tokens' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    onClick={addTestToken}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                      fontSize: '12px'
                    }}
                  >
                    <Plus size={14} style={{ marginRight: '6px' }} />
                    Add Test Token
                  </Button>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tokens.map(token => (
                      <div
                        key={token.id}
                        style={{
                          padding: '10px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: token.isEnemy ? '#ef4444' : token.isAlly ? '#22c55e' : '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          {token.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>
                            {token.name}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '10px' }}>
                            Position: ({token.x}, {token.y})
                          </div>
                        </div>
                        <button
                          onClick={() => setTokens(prev => prev.filter(t => t.id !== token.id))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    
                    {tokens.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '20px', 
                        color: '#64748b',
                        fontSize: '12px'
                      }}>
                        No tokens on map
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sidePanelTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      Map Width (squares)
                    </label>
                    <Input
                      type="number"
                      value={mapData.width}
                      onChange={(e) => handleResize(parseInt(e.target.value) || 10, mapData.height)}
                      min={5}
                      max={100}
                      style={{ background: 'rgba(0,0,0,0.3)' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                      Map Height (squares)
                    </label>
                    <Input
                      type="number"
                      value={mapData.height}
                      onChange={(e) => handleResize(mapData.width, parseInt(e.target.value) || 10)}
                      min={5}
                      max={100}
                      style={{ background: 'rgba(0,0,0,0.3)' }}
                    />
                  </div>
                  
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                      Keyboard Shortcuts
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.6' }}>
                      V - Select<br />
                      B - Terrain Brush<br />
                      W - Wall Tool<br />
                      E - Eraser<br />
                      F - Fog of War<br />
                      Ctrl+Z - Undo<br />
                      Ctrl+S - Save
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side Panel Toggle */}
        <button
          onClick={() => setShowSidePanel(!showSidePanel)}
          style={{
            position: 'absolute',
            right: showSidePanel ? '280px' : '0',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '48px',
            background: 'rgba(10, 10, 46, 0.95)',
            border: '2px solid #374151',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'right 0.2s'
          }}
        >
          {showSidePanel ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const data = JSON.parse(event.target?.result);
                setMapData(data);
                setMapName(data.name || 'Imported Map');
                if (data.fogOfWar) setFogOfWar(data.fogOfWar);
                toast.success('Map imported!');
              } catch {
                toast.error('Invalid map file');
              }
            };
            reader.readAsText(file);
          }
        }}
      />
      
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
}

export default MapBuilder;
