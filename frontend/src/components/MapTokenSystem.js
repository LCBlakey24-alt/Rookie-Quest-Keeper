import React, { useState, useRef, useEffect } from 'react';
import { Map, Upload, Plus, Trash2, Move, ZoomIn, ZoomOut, RotateCcw, Grid, Eye, EyeOff, Users, Skull, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TOKEN_COLORS = [
  { id: 'blue', color: '#4a7dff', label: 'Blue' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'yellow', color: '#eab308', label: 'Yellow' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
  { id: 'white', color: '#ffffff', label: 'White' },
  { id: 'gray', color: '#64748b', label: 'Gray' },
];

const TOKEN_SIZES = [
  { id: 'tiny', size: 20, label: 'Tiny' },
  { id: 'small', size: 30, label: 'Small' },
  { id: 'medium', size: 40, label: 'Medium' },
  { id: 'large', size: 60, label: 'Large' },
  { id: 'huge', size: 80, label: 'Huge' },
  { id: 'gargantuan', size: 100, label: 'Gargantuan' },
];

function MapTokenSystem({ players = [], npcs = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [mapImage, setMapImage] = useState(null);
  const [mapUrl, setMapUrl] = useState('');
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [showAddToken, setShowAddToken] = useState(false);
  const [newToken, setNewToken] = useState({ name: '', color: 'blue', size: 'medium', isEnemy: false });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load map from URL
  const loadMapFromUrl = () => {
    if (!mapUrl.trim()) {
      toast.error('Please enter a map URL');
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setMapImage(img);
      toast.success('Map loaded!');
    };
    img.onerror = () => {
      toast.error('Failed to load map. Check the URL or try uploading.');
    };
    img.src = mapUrl;
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setMapImage(img);
        toast.success('Map uploaded!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Add token from players/NPCs
  const addPlayerToken = (player) => {
    const token = {
      id: `player-${player.id}-${Date.now()}`,
      name: player.name,
      color: TOKEN_COLORS[Math.floor(Math.random() * 4)].color, // Random player color
      size: 40,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      isEnemy: false,
      hp: player.hp,
      maxHp: player.max_hp
    };
    setTokens([...tokens, token]);
    toast.success(`Added ${player.name} token`);
  };

  const addNpcToken = (npc) => {
    const token = {
      id: `npc-${npc.id}-${Date.now()}`,
      name: npc.name,
      color: '#ef4444', // Red for enemies
      size: 40,
      x: 300 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      isEnemy: true,
      hp: npc.hp,
      maxHp: npc.hp
    };
    setTokens([...tokens, token]);
    toast.success(`Added ${npc.name} token`);
  };

  // Add custom token
  const addCustomToken = () => {
    if (!newToken.name.trim()) {
      toast.error('Enter a token name');
      return;
    }
    
    const colorObj = TOKEN_COLORS.find(c => c.id === newToken.color);
    const sizeObj = TOKEN_SIZES.find(s => s.id === newToken.size);
    
    const token = {
      id: `custom-${Date.now()}`,
      name: newToken.name,
      color: colorObj?.color || '#4a7dff',
      size: sizeObj?.size || 40,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      isEnemy: newToken.isEnemy
    };
    
    setTokens([...tokens, token]);
    setNewToken({ name: '', color: 'blue', size: 'medium', isEnemy: false });
    setShowAddToken(false);
    toast.success(`Added ${token.name} token`);
  };

  // Remove token
  const removeToken = (tokenId) => {
    setTokens(tokens.filter(t => t.id !== tokenId));
    if (selectedToken === tokenId) setSelectedToken(null);
  };

  // Clear all tokens
  const clearTokens = () => {
    if (!window.confirm('Remove all tokens?')) return;
    setTokens([]);
    setSelectedToken(null);
  };

  // Handle mouse events for token dragging
  const handleMouseDown = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    // Check if clicking on a token
    const clickedToken = [...tokens].reverse().find(token => {
      const dist = Math.sqrt(Math.pow(x - token.x, 2) + Math.pow(y - token.y, 2));
      return dist <= token.size / 2;
    });
    
    if (clickedToken) {
      setSelectedToken(clickedToken.id);
      setIsDragging(true);
      setDragOffset({
        x: x - clickedToken.x,
        y: y - clickedToken.y
      });
    } else if (e.button === 1 || e.shiftKey) {
      // Middle mouse or shift+click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
      setSelectedToken(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }
    
    if (!isDragging || !selectedToken) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    setTokens(tokens.map(token => {
      if (token.id === selectedToken) {
        let newX = x - dragOffset.x;
        let newY = y - dragOffset.y;
        
        // Snap to grid if enabled
        if (showGrid) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }
        
        return { ...token, x: newX, y: newY };
      }
      return token;
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    // Clear canvas
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw map
    if (mapImage) {
      ctx.drawImage(mapImage, 0, 0);
    }
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(74, 125, 255, 0.3)';
      ctx.lineWidth = 1 / zoom;
      
      const width = mapImage ? mapImage.width : 1000;
      const height = mapImage ? mapImage.height : 800;
      
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // Draw tokens
    tokens.forEach(token => {
      const isSelected = token.id === selectedToken;
      
      // Token circle
      ctx.beginPath();
      ctx.arc(token.x, token.y, token.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = token.color;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
      ctx.stroke();
      
      // Enemy indicator
      if (token.isEnemy) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, token.size / 2 + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
      
      // Name label
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${12 / zoom}px Montserrat, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(token.name.substring(0, 10), token.x, token.y + token.size / 2 + 14);
      
      // HP indicator if available
      if (token.hp !== undefined && token.maxHp) {
        const hpPercent = token.hp / token.maxHp;
        const hpWidth = token.size * 0.8;
        const hpHeight = 4 / zoom;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(token.x - hpWidth / 2, token.y + token.size / 2 + 18, hpWidth, hpHeight);
        
        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(token.x - hpWidth / 2, token.y + token.size / 2 + 18, hpWidth * hpPercent, hpHeight);
      }
    });
    
    ctx.restore();
  }, [mapImage, tokens, selectedToken, zoom, pan, showGrid, gridSize]);

  return (
    <div className="glow-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          color: '#ffffff',
          fontFamily: 'Cityworm, sans-serif',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Map size={22} style={{ color: '#22c55e' }} />
          Battle Map
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="btn-icon" title="Zoom In">
            <ZoomIn size={16} />
          </Button>
          <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="btn-icon" title="Zoom Out">
            <ZoomOut size={16} />
          </Button>
          <Button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="btn-icon" title="Reset View">
            <RotateCcw size={16} />
          </Button>
          <Button onClick={() => setShowGrid(!showGrid)} className="btn-icon" style={{ color: showGrid ? '#22c55e' : '#64748b' }} title="Toggle Grid">
            <Grid size={16} />
          </Button>
        </div>
      </div>

      {/* Map Upload */}
      {!mapImage && (
        <div style={{ 
          background: 'rgba(10, 10, 40, 0.6)',
          border: '2px dashed #1e40af',
          borderRadius: '12px',
          padding: '30px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <Map size={48} style={{ color: '#4a7dff', margin: '0 auto 16px' }} />
          <p style={{ color: '#ffffff', marginBottom: '16px', fontWeight: '600' }}>Load a Battle Map</p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              className="btn-primary"
              style={{ display: 'flex', gap: '8px' }}
            >
              <Upload size={16} />
              Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
            <Input
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="input-glow"
              style={{ fontSize: '13px' }}
            />
            <Button onClick={loadMapFromUrl} className="btn-outline">
              Load
            </Button>
          </div>
        </div>
      )}

      {/* Map Canvas */}
      {mapImage && (
        <>
          <div 
            ref={containerRef}
            style={{ 
              position: 'relative',
              width: '100%',
              height: '400px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #1e40af',
              cursor: isDragging ? 'grabbing' : isPanning ? 'grab' : 'default',
              marginBottom: '16px'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Token Controls */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Button onClick={() => setShowAddToken(!showAddToken)} className="btn-outline" style={{ display: 'flex', gap: '6px' }}>
              <Plus size={16} />
              Add Token
            </Button>
            {tokens.length > 0 && (
              <Button onClick={clearTokens} className="btn-danger" style={{ display: 'flex', gap: '6px' }}>
                <Trash2 size={16} />
                Clear All
              </Button>
            )}
            <Button onClick={() => setMapImage(null)} className="btn-outline" style={{ marginLeft: 'auto' }}>
              Change Map
            </Button>
          </div>

          {/* Add Token Form */}
          {showAddToken && (
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.6)',
              border: '2px solid #1e40af',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ color: '#67e8f9', marginBottom: '12px', fontWeight: '600' }}>Add Custom Token</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Name</label>
                  <Input
                    value={newToken.name}
                    onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                    placeholder="Token name"
                    className="input-glow"
                    style={{ fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Color</label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {TOKEN_COLORS.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        onClick={() => setNewToken({ ...newToken, color: c.id })}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c.color,
                          border: newToken.color === c.id ? '2px solid #ffffff' : '2px solid transparent',
                          cursor: 'pointer'
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Size</label>
                  <select
                    value={newToken.size}
                    onChange={(e) => setNewToken({ ...newToken, size: e.target.value })}
                    className="input-glow"
                    style={{ fontSize: '13px', padding: '6px' }}
                  >
                    {TOKEN_SIZES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={newToken.isEnemy}
                    onChange={(e) => setNewToken({ ...newToken, isEnemy: e.target.checked })}
                    style={{ accentColor: '#ef4444' }}
                  />
                  Enemy Token
                </label>
                <Button onClick={addCustomToken} className="btn-primary" style={{ padding: '8px 16px' }}>
                  Add Token
                </Button>
              </div>
            </div>
          )}

          {/* Quick Add from Campaign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Players */}
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.4)',
              border: '2px solid #4a7dff',
              borderRadius: '10px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Users size={16} style={{ color: '#4a7dff' }} />
                <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>Players</span>
              </div>
              {players.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '12px' }}>No players in campaign</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => addPlayerToken(player)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #4a7dff',
                        background: 'rgba(74, 125, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      + {player.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* NPCs */}
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.4)',
              border: '2px solid #ef4444',
              borderRadius: '10px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Skull size={16} style={{ color: '#ef4444' }} />
                <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>NPCs/Enemies</span>
              </div>
              {npcs.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '12px' }}>No NPCs in campaign</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {npcs.map(npc => (
                    <button
                      key={npc.id}
                      onClick={() => addNpcToken(npc)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #ef4444',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ffffff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      + {npc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Token List */}
          {tokens.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#67e8f9', fontSize: '13px', fontWeight: '600' }}>
                  Tokens on Map ({tokens.length})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tokens.map(token => (
                  <div
                    key={token.id}
                    onClick={() => setSelectedToken(token.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedToken === token.id ? '#22c55e' : token.color}`,
                      background: selectedToken === token.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Circle size={14} style={{ color: token.color, fill: token.color }} />
                    <span style={{ color: '#ffffff', fontSize: '12px' }}>{token.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeToken(token.id); }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p style={{ color: '#64748b', fontSize: '11px', marginTop: '12px', fontStyle: 'italic' }}>
        Tip: Click and drag tokens to move them. {showGrid ? 'Tokens snap to grid.' : ''} Shift+click to pan the map.
      </p>
    </div>
  );
}

export default MapTokenSystem;
