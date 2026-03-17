import React, { useRef, useEffect, useState, useCallback } from 'react';

const GRID_SIZE = 40; // pixels per grid square
const DEFAULT_MAP_WIDTH = 30; // grid squares
const DEFAULT_MAP_HEIGHT = 20; // grid squares

const TERRAIN_TYPES = {
  empty: { color: '#1a1a2e', name: 'Empty' },
  stone: { color: '#4a4a5a', name: 'Stone Floor' },
  wood: { color: '#8B4513', name: 'Wood Floor' },
  grass: { color: '#228B22', name: 'Grass' },
  water: { color: '#1e90ff', name: 'Water' },
  sand: { color: '#f4a460', name: 'Sand' },
  dirt: { color: '#8B7355', name: 'Dirt' },
  snow: { color: '#e8e8e8', name: 'Snow' },
  lava: { color: '#ff4500', name: 'Lava' },
  void: { color: '#000000', name: 'Void/Pit' }
};

const WALL_COLORS = {
  stone: '#555555',
  wood: '#654321',
  brick: '#8B0000',
  ice: '#87CEEB'
};

function MapCanvas({ 
  mapData, 
  onMapChange, 
  tool, 
  selectedTerrain,
  selectedWallType,
  tokens,
  onTokenMove,
  fogOfWar,
  onFogChange,
  showGrid,
  gridSize = GRID_SIZE,
  isPlayerView = false
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingToken, setDraggingToken] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Initialize map data if not provided
  const map = mapData || {
    width: DEFAULT_MAP_WIDTH,
    height: DEFAULT_MAP_HEIGHT,
    terrain: Array(DEFAULT_MAP_HEIGHT).fill(null).map(() => 
      Array(DEFAULT_MAP_WIDTH).fill('empty')
    ),
    walls: [], // [{x1, y1, x2, y2, type}]
    doors: [], // [{x, y, orientation, isOpen}]
    objects: [] // [{x, y, type, name}]
  };

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    return { x, y };
  }, [panOffset, zoom]);

  // Get grid cell from canvas coordinates
  const getGridCell = useCallback((canvasX, canvasY) => {
    const gridX = Math.floor(canvasX / gridSize);
    const gridY = Math.floor(canvasY / gridSize);
    return { gridX, gridY };
  }, [gridSize]);

  // Draw the entire map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    // Apply transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Draw terrain
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const terrainType = map.terrain[y]?.[x] || 'empty';
        const terrain = TERRAIN_TYPES[terrainType] || TERRAIN_TYPES.empty;
        
        ctx.fillStyle = terrain.color;
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);

        // Add subtle texture
        if (terrainType !== 'empty') {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          for (let i = 0; i < 3; i++) {
            const tx = x * gridSize + Math.random() * gridSize;
            const ty = y * gridSize + Math.random() * gridSize;
            ctx.fillRect(tx, ty, 2, 2);
          }
        }
      }
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= map.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * gridSize, 0);
        ctx.lineTo(x * gridSize, map.height * gridSize);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= map.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * gridSize);
        ctx.lineTo(map.width * gridSize, y * gridSize);
        ctx.stroke();
      }
    }

    // Draw walls
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    map.walls?.forEach(wall => {
      ctx.strokeStyle = WALL_COLORS[wall.type] || WALL_COLORS.stone;
      ctx.beginPath();
      ctx.moveTo(wall.x1 * gridSize, wall.y1 * gridSize);
      ctx.lineTo(wall.x2 * gridSize, wall.y2 * gridSize);
      ctx.stroke();
      
      // Wall shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(wall.x1 * gridSize + 2, wall.y1 * gridSize + 2);
      ctx.lineTo(wall.x2 * gridSize + 2, wall.y2 * gridSize + 2);
      ctx.stroke();
      ctx.lineWidth = 6;
    });

    // Draw doors
    map.doors?.forEach(door => {
      const dx = door.x * gridSize;
      const dy = door.y * gridSize;
      
      ctx.fillStyle = door.isOpen ? '#8B4513' : '#654321';
      if (door.orientation === 'horizontal') {
        ctx.fillRect(dx - gridSize/4, dy - 3, gridSize/2, 6);
      } else {
        ctx.fillRect(dx - 3, dy - gridSize/4, 6, gridSize/2);
      }
      
      // Door handle
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw fog of war (for player view)
    if (isPlayerView && fogOfWar) {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (fogOfWar[y]?.[x]) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
          }
        }
      }
    }

    // Draw tokens
    tokens?.forEach(token => {
      const tx = token.x * gridSize + gridSize / 2;
      const ty = token.y * gridSize + gridSize / 2;
      const radius = (gridSize / 2) - 4;

      // Token shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(tx + 2, ty + 2, radius, 0, Math.PI * 2);
      ctx.fill();

      // Token background
      const tokenColor = token.isEnemy ? '#ef4444' : token.isAlly ? '#F59E0B' : '#3b82f6';
      ctx.fillStyle = tokenColor;
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fill();

      // Token border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Token image or initials
      if (token.imageUrl) {
        // Would load image here
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${gridSize * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initials = token.name?.split(' ').map(w => w[0]).join('').substring(0, 2) || '?';
        ctx.fillText(initials, tx, ty);
      }

      // HP bar
      if (token.hp !== undefined && token.maxHp) {
        const hpPercent = token.hp / token.maxHp;
        const barWidth = gridSize - 8;
        const barHeight = 4;
        const barX = token.x * gridSize + 4;
        const barY = token.y * gridSize + gridSize - 8;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = hpPercent > 0.5 ? '#F59E0B' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
      }
    });

    // Draw hover highlight
    if (hoveredCell && !isPlayerView) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(
        hoveredCell.gridX * gridSize, 
        hoveredCell.gridY * gridSize, 
        gridSize, 
        gridSize
      );
      
      // Tool preview
      if (tool === 'terrain') {
        const terrain = TERRAIN_TYPES[selectedTerrain] || TERRAIN_TYPES.stone;
        ctx.fillStyle = terrain.color + '80';
        ctx.fillRect(
          hoveredCell.gridX * gridSize, 
          hoveredCell.gridY * gridSize, 
          gridSize, 
          gridSize
        );
      }
    }

    // Draw fog of war overlay (for GM editing)
    if (!isPlayerView && fogOfWar && tool === 'fog') {
      ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (fogOfWar[y]?.[x]) {
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
          }
        }
      }
    }

    ctx.restore();
  }, [map, tokens, fogOfWar, showGrid, gridSize, panOffset, zoom, hoveredCell, tool, selectedTerrain, isPlayerView]);

  // Redraw when dependencies change
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Handle mouse down
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const cell = getGridCell(coords.x, coords.y);

    // Middle mouse or space+click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Check if clicking on a token
    const clickedToken = tokens?.find(t => t.x === cell.gridX && t.y === cell.gridY);
    if (clickedToken && tool === 'select') {
      setDraggingToken(clickedToken);
      return;
    }

    // Start drawing
    if (tool !== 'select') {
      setIsDrawing(true);
      applyTool(cell.gridX, cell.gridY);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    const cell = getGridCell(coords.x, coords.y);
    
    // Update hovered cell
    if (cell.gridX >= 0 && cell.gridX < map.width && cell.gridY >= 0 && cell.gridY < map.height) {
      setHoveredCell(cell);
    } else {
      setHoveredCell(null);
    }

    // Handle panning
    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle token dragging
    if (draggingToken) {
      // Visual feedback handled in draw
      return;
    }

    // Continue drawing
    if (isDrawing) {
      applyTool(cell.gridX, cell.gridY);
    }
  };

  // Handle mouse up
  const handleMouseUp = (e) => {
    if (draggingToken) {
      const coords = getCanvasCoords(e);
      const cell = getGridCell(coords.x, coords.y);
      
      if (cell.gridX >= 0 && cell.gridX < map.width && cell.gridY >= 0 && cell.gridY < map.height) {
        onTokenMove?.(draggingToken.id, cell.gridX, cell.gridY);
      }
      setDraggingToken(null);
    }
    
    setIsPanning(false);
    setIsDrawing(false);
  };

  // Handle wheel for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.25, Math.min(3, prev * zoomFactor)));
  };

  // Apply the current tool
  const applyTool = (gridX, gridY) => {
    if (gridX < 0 || gridX >= map.width || gridY < 0 || gridY >= map.height) return;

    switch (tool) {
      case 'terrain':
        const newTerrain = [...map.terrain];
        if (!newTerrain[gridY]) newTerrain[gridY] = [];
        newTerrain[gridY][gridX] = selectedTerrain;
        onMapChange?.({ ...map, terrain: newTerrain });
        break;
        
      case 'eraser':
        const erasedTerrain = [...map.terrain];
        if (erasedTerrain[gridY]) {
          erasedTerrain[gridY][gridX] = 'empty';
        }
        onMapChange?.({ ...map, terrain: erasedTerrain });
        break;
        
      case 'fog':
        const newFog = fogOfWar ? [...fogOfWar] : 
          Array(map.height).fill(null).map(() => Array(map.width).fill(false));
        if (!newFog[gridY]) newFog[gridY] = [];
        newFog[gridY][gridX] = !newFog[gridY][gridX];
        onFogChange?.(newFog);
        break;
        
      default:
        break;
    }
  };

  // Resize canvas to fit container
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawMap();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawMap]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 
                draggingToken ? 'grabbing' :
                tool === 'select' ? 'default' : 'crosshair'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ display: 'block' }}
      />
    </div>
  );
}

export { TERRAIN_TYPES, WALL_COLORS, GRID_SIZE, DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT };
export default MapCanvas;
