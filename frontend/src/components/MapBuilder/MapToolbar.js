import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Grid3X3, Square, Eraser, MousePointer, Eye, EyeOff, Move,
  ZoomIn, ZoomOut, Save, FolderOpen, Download, Upload, Undo, Redo,
  Layers, PaintBucket, DoorOpen, Minus, Plus, RotateCcw, Image
} from 'lucide-react';
import { TERRAIN_TYPES, WALL_COLORS } from './MapCanvas';

const TOOLS = [
  { id: 'select', icon: MousePointer, name: 'Select', shortcut: 'V' },
  { id: 'terrain', icon: PaintBucket, name: 'Terrain', shortcut: 'B' },
  { id: 'wall', icon: Minus, name: 'Wall', shortcut: 'W' },
  { id: 'door', icon: DoorOpen, name: 'Door', shortcut: 'D' },
  { id: 'eraser', icon: Eraser, name: 'Eraser', shortcut: 'E' },
  { id: 'fog', icon: Eye, name: 'Fog of War', shortcut: 'F' },
  { id: 'token', icon: Move, name: 'Place Token', shortcut: 'T' }
];

function MapToolbar({ 
  tool, 
  setTool, 
  selectedTerrain, 
  setSelectedTerrain,
  selectedWallType,
  setSelectedWallType,
  showGrid,
  setShowGrid,
  showFog,
  setShowFog,
  onZoomIn,
  onZoomOut,
  onResetView,
  onSave,
  onLoad,
  onExport,
  onImportImage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  mapName,
  setMapName
}) {
  const [showTerrainPicker, setShowTerrainPicker] = useState(false);
  const [showWallPicker, setShowWallPicker] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      const key = e.key.toUpperCase();
      const toolByShortcut = TOOLS.find(t => t.shortcut === key);
      if (toolByShortcut) {
        setTool(toolByShortcut.id);
      }
      
      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) onRedo?.();
          else onUndo?.();
        }
        if (e.key === 's') {
          e.preventDefault();
          onSave?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, onUndo, onRedo, onSave]);

  return (
    <div style={{
      background: 'rgba(10, 10, 46, 0.95)',
      borderBottom: '2px solid #374151',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      {/* Map Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Input
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          placeholder="Map name..."
          style={{
            width: '180px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid #374151',
            fontSize: '13px'
          }}
        />
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '32px', background: '#374151' }} />

      {/* Tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {TOOLS.map(t => {
          const Icon = t.icon;
          const isActive = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.name} (${t.shortcut})`}
              data-testid={`tool-${t.id}`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: `2px solid ${isActive ? '#3b82f6' : 'transparent'}`,
                background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.3)',
                color: isActive ? '#3b82f6' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      {/* Terrain Picker */}
      {tool === 'terrain' && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowTerrainPicker(!showTerrainPicker)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid #374151',
              background: TERRAIN_TYPES[selectedTerrain]?.color || '#4a4a5a',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: TERRAIN_TYPES[selectedTerrain]?.color,
              border: '1px solid rgba(255,255,255,0.3)'
            }} />
            {TERRAIN_TYPES[selectedTerrain]?.name || 'Select Terrain'}
          </button>
          
          {showTerrainPicker && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'rgba(10, 10, 46, 0.98)',
              border: '2px solid #374151',
              borderRadius: '12px',
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '4px',
              zIndex: 1000
            }}>
              {Object.entries(TERRAIN_TYPES).map(([key, terrain]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTerrain(key);
                    setShowTerrainPicker(false);
                  }}
                  title={terrain.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: selectedTerrain === key ? '2px solid #3b82f6' : '1px solid #374151',
                    background: terrain.color,
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wall Type Picker */}
      {tool === 'wall' && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowWallPicker(!showWallPicker)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid #374151',
              background: WALL_COLORS[selectedWallType] || '#555555',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {selectedWallType?.charAt(0).toUpperCase() + selectedWallType?.slice(1) || 'Stone'} Wall
          </button>
          
          {showWallPicker && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'rgba(10, 10, 46, 0.98)',
              border: '2px solid #374151',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 1000
            }}>
              {Object.entries(WALL_COLORS).map(([key, color]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedWallType(key);
                    setShowWallPicker(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: selectedWallType === key ? '2px solid #3b82f6' : '1px solid #374151',
                    background: color,
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ width: '1px', height: '32px', background: '#374151' }} />

      {/* View Controls */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: `2px solid ${showGrid ? '#22c55e' : 'transparent'}`,
            background: showGrid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0,0,0,0.3)',
            color: showGrid ? '#22c55e' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Grid3X3 size={18} />
        </button>
        
        <button
          onClick={() => setShowFog(!showFog)}
          title="Toggle Fog of War Preview"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: `2px solid ${showFog ? '#a855f7' : 'transparent'}`,
            background: showFog ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.3)',
            color: showFog ? '#a855f7' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {showFog ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        <button onClick={onZoomOut} title="Zoom Out" style={viewButtonStyle}>
          <ZoomOut size={18} />
        </button>
        <button onClick={onZoomIn} title="Zoom In" style={viewButtonStyle}>
          <ZoomIn size={18} />
        </button>
        <button onClick={onResetView} title="Reset View" style={viewButtonStyle}>
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '32px', background: '#374151' }} />

      {/* History */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Undo (Ctrl+Z)" 
          style={{
            ...viewButtonStyle,
            opacity: canUndo ? 1 : 0.4
          }}
        >
          <Undo size={18} />
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)" 
          style={{
            ...viewButtonStyle,
            opacity: canRedo ? 1 : 0.4
          }}
        >
          <Redo size={18} />
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* File Operations */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          onClick={onImportImage}
          variant="outline"
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Image size={14} />
          Import Image
        </Button>
        
        <Button
          onClick={onLoad}
          variant="outline"
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FolderOpen size={14} />
          Load
        </Button>
        
        <Button
          onClick={onSave}
          data-testid="save-map-btn"
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Save size={14} />
          Save Map
        </Button>
      </div>
    </div>
  );
}

const viewButtonStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: 'none',
  background: 'rgba(0,0,0,0.3)',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

export default MapToolbar;
