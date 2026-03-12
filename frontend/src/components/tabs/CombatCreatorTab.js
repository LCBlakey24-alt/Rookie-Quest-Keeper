import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Plus, X, RotateCcw, Trash2, Swords, Save, Map, Upload, Grid, Image, Play, Coins, Package, Skull, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { MONSTER_DATABASE, MONSTER_TYPES, CR_OPTIONS, getCRValue, getXPFromCR } from '@/data/monsterDatabase';
import EncounterDifficultyCalculator from '@/components/EncounterDifficultyCalculator';
import QuickTips, { TIPS } from '@/components/QuickTips';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const TOKEN_COLORS = [
  { id: 'blue', color: '#4a7dff', label: 'Blue (Players)' },
  { id: 'green', color: '#22c55e', label: 'Green (Allies)' },
  { id: 'red', color: '#ef4444', label: 'Red (Enemies)' },
  { id: 'yellow', color: '#eab308', label: 'Yellow' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
];

function CombatCreatorTab({ campaignId }) {
  const [players, setPlayers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [combatants, setCombatants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  
  // Monster database state
  const [showMonsterSelector, setShowMonsterSelector] = useState(false);
  const [monsterSearch, setMonsterSearch] = useState('');
  const [monsterTypeFilter, setMonsterTypeFilter] = useState('all');
  const [monsterCRFilter, setMonsterCRFilter] = useState('all');
  
  // Map state
  const [mapImage, setMapImage] = useState(null);
  const [mapUrl, setMapUrl] = useState('');
  const [mapDataUrl, setMapDataUrl] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [playersRes, npcsRes, scenariosRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/combat-scenarios`)
      ]);
      setPlayers(playersRes.data);
      setNpcs(npcsRes.data);
      setScenarios(scenariosRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Map functions
  const loadMapFromUrl = () => {
    if (!mapUrl.trim()) {
      toast.error('Please enter a map URL');
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setMapImage(img);
      setMapDataUrl(mapUrl);
      toast.success('Map loaded!');
    };
    img.onerror = () => toast.error('Failed to load map');
    img.src = mapUrl;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setMapImage(img);
        setMapDataUrl(event.target.result);
        toast.success('Map uploaded!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const addToCombat = (entity, type) => {
    const colorIdx = type === 'player' ? 0 : 2;
    const newCombatant = {
      id: `${type}-${entity.id}-${Date.now()}`,
      entityId: entity.id,
      name: entity.name,
      type: type,
      initiative: 0,
      hp: entity.hp || entity.max_hp || 10,
      maxHp: entity.max_hp || entity.hp || 10,
      ac: entity.ac || 10,
      conditions: [],
      tokenColor: TOKEN_COLORS[colorIdx].color,
      tokenSize: 40,
      loot: [] // Array of {name, quantity, item_type, value, is_magical}
    };
    setCombatants([...combatants, newCombatant]);
    
    // Add token to map if map is loaded
    if (mapImage) {
      const newToken = {
        id: newCombatant.id,
        name: entity.name,
        color: TOKEN_COLORS[colorIdx].color,
        size: 40,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        isEnemy: type !== 'player'
      };
      setTokens([...tokens, newToken]);
    }
    
    toast.success(`Added ${entity.name}`);
  };

  const removeCombatant = (id) => {
    setCombatants(combatants.filter(c => c.id !== id));
    setTokens(tokens.filter(t => t.id !== id));
  };

  const updateInitiative = (id, value) => {
    setCombatants(combatants.map(c => 
      c.id === id ? { ...c, initiative: parseInt(value) || 0 } : c
    ));
  };

  const addLootToCombatant = (combatantId, lootItem) => {
    setCombatants(combatants.map(c => 
      c.id === combatantId 
        ? { ...c, loot: [...(c.loot || []), { ...lootItem, id: Date.now().toString() }] }
        : c
    ));
  };

  const removeLootFromCombatant = (combatantId, lootId) => {
    setCombatants(combatants.map(c => 
      c.id === combatantId 
        ? { ...c, loot: (c.loot || []).filter(l => l.id !== lootId) }
        : c
    ));
  };

  // Add monster from database
  const addMonsterFromDB = (monster) => {
    const colorIdx = 2; // Red for enemies
    const newCombatant = {
      id: `monster-${monster.name.replace(/\s+/g, '-')}-${Date.now()}`,
      entityId: `db-${monster.name}`,
      name: monster.name,
      type: 'npc',
      initiative: 0,
      hp: monster.hp,
      maxHp: monster.hp,
      ac: monster.ac,
      cr: monster.cr,
      monsterType: monster.type,
      abilities: monster.abilities,
      conditions: [],
      tokenColor: TOKEN_COLORS[colorIdx].color,
      tokenSize: monster.size === 'Large' ? 50 : monster.size === 'Huge' ? 70 : monster.size === 'Gargantuan' ? 90 : 40,
      loot: []
    };
    setCombatants([...combatants, newCombatant]);
    
    // Add token to map
    if (mapImage) {
      const newToken = {
        id: newCombatant.id,
        name: monster.name,
        color: TOKEN_COLORS[colorIdx].color,
        size: newCombatant.tokenSize,
        x: 200 + Math.random() * 150,
        y: 200 + Math.random() * 150,
        isEnemy: true
      };
      setTokens([...tokens, newToken]);
    }
    
    toast.success(`Added ${monster.name} (CR ${monster.cr})`);
  };

  // Filter monsters from database
  const filteredMonsters = MONSTER_DATABASE.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(monsterSearch.toLowerCase());
    const matchesType = monsterTypeFilter === 'all' || m.type === monsterTypeFilter;
    const matchesCR = monsterCRFilter === 'all' || m.cr === monsterCRFilter;
    return matchesSearch && matchesType && matchesCR;
  }).sort((a, b) => getCRValue(a.cr) - getCRValue(b.cr));

  const saveScenario = async () => {
    if (!scenarioName.trim()) {
      toast.error('Please enter a scenario name');
      return;
    }
    if (combatants.length === 0) {
      toast.error('Add at least one combatant');
      return;
    }

    const scenarioData = {
      name: scenarioName,
      description: scenarioDescription,
      combatants: combatants,
      map_url: mapDataUrl || null,
      tokens: tokens,
      grid_size: gridSize,
      show_grid: showGrid
    };

    try {
      if (selectedScenario) {
        await axios.put(`${API}/campaigns/${campaignId}/combat-scenarios/${selectedScenario.id}`, scenarioData);
        toast.success('Scenario updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/combat-scenarios`, scenarioData);
        toast.success('Scenario saved!');
      }
      fetchData();
      clearScenario();
    } catch (error) {
      toast.error('Failed to save scenario');
    }
  };

  const loadScenario = (scenario) => {
    setSelectedScenario(scenario);
    setScenarioName(scenario.name);
    setScenarioDescription(scenario.description || '');
    setCombatants(scenario.combatants || []);
    setTokens(scenario.tokens || []);
    setGridSize(scenario.grid_size || 40);
    setShowGrid(scenario.show_grid !== false);
    
    if (scenario.map_url) {
      setMapDataUrl(scenario.map_url);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setMapImage(img);
      img.src = scenario.map_url;
    } else {
      setMapImage(null);
      setMapDataUrl('');
    }
    
    toast.success(`Loaded: ${scenario.name}`);
  };

  const deleteScenario = async (scenarioId) => {
    if (!window.confirm('Delete this combat scenario?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/combat-scenarios/${scenarioId}`);
      toast.success('Scenario deleted');
      fetchData();
      if (selectedScenario?.id === scenarioId) clearScenario();
    } catch (error) {
      toast.error('Failed to delete scenario');
    }
  };

  const clearScenario = () => {
    setSelectedScenario(null);
    setScenarioName('');
    setScenarioDescription('');
    setCombatants([]);
    setTokens([]);
    setMapImage(null);
    setMapDataUrl('');
    setMapUrl('');
  };

  // Token dragging
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedToken = [...tokens].reverse().find(token => {
      const dist = Math.sqrt(Math.pow(x - token.x, 2) + Math.pow(y - token.y, 2));
      return dist <= token.size / 2;
    });
    
    if (clickedToken) {
      setSelectedToken(clickedToken.id);
      setIsDragging(true);
      setDragOffset({ x: x - clickedToken.x, y: y - clickedToken.y });
    } else {
      setSelectedToken(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedToken || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left - dragOffset.x;
    let y = e.clientY - rect.top - dragOffset.y;
    
    if (showGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    
    setTokens(tokens.map(t => t.id === selectedToken ? { ...t, x, y } : t));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !containerRef.current) return;
    
    canvas.width = containerRef.current.clientWidth;
    canvas.height = 400;
    
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (mapImage) {
      const scale = Math.min(canvas.width / mapImage.width, canvas.height / mapImage.height);
      const w = mapImage.width * scale;
      const h = mapImage.height * scale;
      ctx.drawImage(mapImage, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
    
    if (showGrid) {
      ctx.strokeStyle = 'rgba(74, 125, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    
    tokens.forEach(token => {
      ctx.beginPath();
      ctx.arc(token.x, token.y, token.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = token.color;
      ctx.fill();
      ctx.strokeStyle = token.id === selectedToken ? '#ffffff' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = token.id === selectedToken ? 3 : 2;
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(token.name.substring(0, 8), token.x, token.y + token.size / 2 + 12);
    });
  }, [mapImage, tokens, selectedToken, showGrid, gridSize]);

  const filteredEntities = () => {
    const search = searchTerm.toLowerCase();
    return {
      players: players.filter(p => p.name.toLowerCase().includes(search)),
      npcs: npcs.filter(n => n.name.toLowerCase().includes(search))
    };
  };

  if (loading) return <div className="loading-spinner"></div>;
  const { players: filteredPlayers, npcs: filteredNPCs } = filteredEntities();

  return (
    <div>
      {/* Quick Tips */}
      <QuickTips 
        tips={TIPS.combat} 
        pageId="combat" 
        title="Combat Creator Tips"
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
      {/* Saved Scenarios */}
      <div>
        <h3 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '16px', fontFamily: 'Cityworm, sans-serif', fontWeight: '700' }}>
          Saved Encounters
        </h3>
        {scenarios.length === 0 ? (
          <div className="glow-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>No encounters yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scenarios.map(scenario => (
              <div
                key={scenario.id}
                data-testid={`scenario-${scenario.id}`}
                onClick={() => loadScenario(scenario)}
                className="card-glow"
                style={{
                  cursor: 'pointer',
                  padding: '14px',
                  border: selectedScenario?.id === scenario.id ? '2px solid #22c55e' : '2px solid #1e40af',
                  background: selectedScenario?.id === scenario.id ? 'rgba(34, 197, 94, 0.1)' : 'rgba(10, 10, 60, 0.7)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{scenario.name}</h4>
                    <p style={{ fontSize: '11px', color: '#67e8f9' }}>
                      {scenario.combatants?.length || 0} combatants
                      {scenario.map_url && ' • Has Map'}
                    </p>
                  </div>
                  <Button
                    onClick={(e) => { e.stopPropagation(); deleteScenario(scenario.id); }}
                    className="btn-danger"
                    style={{ padding: '6px' }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Creator */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '26px', color: '#ffffff', fontFamily: 'Cityworm, sans-serif', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Swords size={28} style={{ color: '#ef4444' }} />
              Encounter Builder
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Create combat scenarios with maps and tokens</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setShowAddPanel(!showAddPanel)} className="btn-primary" style={{ display: 'flex', gap: '6px' }}>
              <Plus size={16} />
              {showAddPanel ? 'Hide' : 'Add Combatants'}
            </Button>
            {combatants.length > 0 && (
              <>
                <Button onClick={clearScenario} className="btn-outline"><RotateCcw size={16} /></Button>
                <Button onClick={saveScenario} className="btn-primary" style={{ display: 'flex', gap: '6px' }}>
                  <Save size={16} /> Save
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Scenario Info */}
        <div className="glow-panel" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '13px', fontWeight: '600' }}>Encounter Name *</label>
              <Input
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Goblin Ambush"
                className="input-glow"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '13px', fontWeight: '600' }}>Description</label>
              <Input
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                placeholder="Brief description..."
                className="input-glow"
              />
            </div>
          </div>
        </div>

        {/* Battle Map Section */}
        <div className="glow-panel" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Cityworm, sans-serif', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Map size={20} style={{ color: '#22c55e' }} />
              Battle Map
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={() => setShowGrid(!showGrid)} className="btn-icon" style={{ color: showGrid ? '#22c55e' : '#64748b' }}>
                <Grid size={16} />
              </Button>
              {mapImage && (
                <Button onClick={() => { setMapImage(null); setMapDataUrl(''); }} className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  Change Map
                </Button>
              )}
            </div>
          </div>

          {!mapImage ? (
            <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px dashed #1e40af', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
              <Image size={40} style={{ color: '#4a7dff', margin: '0 auto 12px' }} />
              <p style={{ color: '#ffffff', marginBottom: '16px', fontWeight: '600' }}>Add a Battle Map</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                <Button onClick={() => fileInputRef.current?.click()} className="btn-primary" style={{ display: 'flex', gap: '6px' }}>
                  <Upload size={16} /> Upload Image
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', maxWidth: '350px', margin: '0 auto' }}>
                <Input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="Or paste image URL..." className="input-glow" style={{ fontSize: '13px' }} />
                <Button onClick={loadMapFromUrl} className="btn-outline">Load</Button>
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #1e40af', cursor: isDragging ? 'grabbing' : 'default' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas ref={canvasRef} style={{ width: '100%', height: '400px', display: 'block' }} />
            </div>
          )}
          <p style={{ color: '#64748b', fontSize: '11px', marginTop: '10px', fontStyle: 'italic' }}>
            {mapImage ? 'Click and drag tokens to position them. They will snap to grid.' : 'Map is optional - you can create encounters without one.'}
          </p>
        </div>

        {/* Add Combatants Panel */}
        {showAddPanel && (
          <div className="glow-panel" style={{ marginBottom: '20px' }}>
            {/* Toggle between Campaign NPCs and Monster Database */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button 
                onClick={() => setShowMonsterSelector(false)} 
                className={showMonsterSelector ? 'btn-outline' : 'btn-primary'}
                style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }}
              >
                <Users size={16} /> Campaign Characters
              </Button>
              <Button 
                onClick={() => setShowMonsterSelector(true)} 
                className={showMonsterSelector ? 'btn-primary' : 'btn-outline'}
                style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', borderColor: showMonsterSelector ? '#ef4444' : undefined, background: showMonsterSelector ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)' : undefined }}
              >
                <Skull size={16} /> Monster Database ({MONSTER_DATABASE.length})
              </Button>
            </div>

            {!showMonsterSelector ? (
              <>
                {/* Campaign NPCs/Players */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search players, NPCs..."
                      className="input-glow"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {filteredPlayers.length > 0 && (
                    <div>
                      <h4 style={{ color: '#4a7dff', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>PLAYERS</h4>
                      {filteredPlayers.map(player => (
                        <div
                          key={player.id}
                          onClick={() => addToCombat(player, 'player')}
                          style={{ padding: '10px', background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4a7dff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e40af'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#ffffff', fontWeight: '600' }}>{player.name}</span>
                            <span style={{ color: '#67e8f9', fontSize: '12px' }}>HP:{player.hp} AC:{player.ac}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {filteredNPCs.length > 0 && (
                    <div>
                      <h4 style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>ENEMIES/NPCS</h4>
                      {filteredNPCs.map(npc => (
                        <div
                          key={npc.id}
                          onClick={() => addToCombat(npc, 'npc')}
                          style={{ padding: '10px', background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e40af'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#ffffff', fontWeight: '600' }}>{npc.name}</span>
                            <span style={{ color: '#67e8f9', fontSize: '12px' }}>HP:{npc.hp} AC:{npc.ac}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Monster Database */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <Input
                      value={monsterSearch}
                      onChange={(e) => setMonsterSearch(e.target.value)}
                      placeholder="Search monsters..."
                      className="input-glow"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                  <select
                    value={monsterTypeFilter}
                    onChange={(e) => setMonsterTypeFilter(e.target.value)}
                    className="input-glow"
                    style={{ padding: '8px 12px', minWidth: '130px' }}
                  >
                    <option value="all">All Types</option>
                    {MONSTER_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                  <select
                    value={monsterCRFilter}
                    onChange={(e) => setMonsterCRFilter(e.target.value)}
                    className="input-glow"
                    style={{ padding: '8px 12px', minWidth: '100px' }}
                  >
                    <option value="all">All CR</option>
                    {CR_OPTIONS.map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
                  </select>
                </div>
                
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '2px solid #1e40af', borderRadius: '10px' }}>
                  <p style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b', background: 'rgba(10, 10, 40, 0.8)', borderBottom: '1px solid #1e40af', position: 'sticky', top: 0, zIndex: 1 }}>
                    Showing {filteredMonsters.length} of {MONSTER_DATABASE.length} monsters
                  </p>
                  {filteredMonsters.slice(0, 100).map(monster => (
                    <div
                      key={`${monster.name}-${monster.cr}`}
                      onClick={() => addMonsterFromDB(monster)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid #1e40af',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: 'rgba(10, 10, 40, 0.6)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.borderLeftWidth = '4px'; e.currentTarget.style.borderLeftColor = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 10, 40, 0.6)'; e.currentTarget.style.borderLeftWidth = '0'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px' }}>{monster.name}</span>
                          <div style={{ fontSize: '11px', color: '#67e8f9', marginTop: '2px' }}>
                            {monster.size} {monster.type} • {monster.abilities !== 'None' ? monster.abilities : 'No special abilities'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            background: getCRValue(monster.cr) >= 10 ? 'rgba(239, 68, 68, 0.3)' : getCRValue(monster.cr) >= 5 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                            color: getCRValue(monster.cr) >= 10 ? '#ef4444' : getCRValue(monster.cr) >= 5 ? '#eab308' : '#22c55e',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            marginBottom: '2px'
                          }}>
                            CR {monster.cr}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            HP {monster.hp} • AC {monster.ac}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredMonsters.length > 100 && (
                    <p style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      Showing first 100 results. Refine your search to see more.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Combatants List */}
        {combatants.length === 0 ? (
          <div className="glow-panel" style={{ padding: '50px', textAlign: 'center' }}>
            <Swords size={48} style={{ color: '#1e40af', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', color: '#ffffff', marginBottom: '8px', fontFamily: 'Cityworm, sans-serif', fontWeight: '700' }}>No Combatants</h3>
            <p style={{ color: '#94a3b8' }}>Add players and enemies to build your encounter</p>
          </div>
        ) : (
          <div>
            {/* Encounter Difficulty Calculator */}
            <div style={{ marginBottom: '20px' }}>
              <EncounterDifficultyCalculator 
                monsters={combatants
                  .filter(c => c.type === 'enemy' || c.type === 'monster')
                  .map(c => ({ 
                    name: c.name, 
                    xp: c.xp || getXPFromCR(c.cr) || 0,
                    count: 1 
                  }))}
                partySize={combatants.filter(c => c.type === 'player').length || 4}
                partyLevel={5}
              />
            </div>
            
            <h4 style={{ color: '#67e8f9', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>COMBATANTS ({combatants.length})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {combatants.map(c => (
                <CombatantCard 
                  key={c.id} 
                  combatant={c}
                  onRemove={() => removeCombatant(c.id)}
                  onUpdateInitiative={(val) => updateInitiative(c.id, val)}
                  onAddLoot={(loot) => addLootToCombatant(c.id, loot)}
                  onRemoveLoot={(lootId) => removeLootFromCombatant(c.id, lootId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// Combatant Card with Loot
function CombatantCard({ combatant, onRemove, onUpdateInitiative, onAddLoot, onRemoveLoot }) {
  const [showLootForm, setShowLootForm] = useState(false);
  const [newLoot, setNewLoot] = useState({ name: '', quantity: 1, item_type: 'misc', value: '', is_magical: false });
  const c = combatant;

  const handleAddLoot = () => {
    if (!newLoot.name.trim()) {
      toast.error('Enter loot name');
      return;
    }
    onAddLoot(newLoot);
    setNewLoot({ name: '', quantity: 1, item_type: 'misc', value: '', is_magical: false });
    setShowLootForm(false);
    toast.success('Loot added!');
  };

  return (
    <div className="card-glow" style={{ padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
        <div>
          <h5 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '4px' }}>{c.name}</h5>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: c.type === 'player' ? 'rgba(74, 125, 255, 0.3)' : 'rgba(239, 68, 68, 0.3)', color: c.type === 'player' ? '#4a7dff' : '#ef4444', fontWeight: '600' }}>
            {c.type.toUpperCase()}
          </span>
        </div>
        <Button onClick={onRemove} className="btn-icon" style={{ padding: '4px', color: '#ef4444' }}><X size={14} /></Button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', color: '#67e8f9', display: 'block', marginBottom: '4px' }}>Initiative</label>
        <Input
          type="number"
          value={c.initiative}
          onChange={(e) => onUpdateInitiative(e.target.value)}
          className="input-glow"
          style={{ fontSize: '16px', fontWeight: '700', textAlign: 'center', padding: '8px' }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <div className="stat-block" style={{ flex: 1 }}><div className="stat-label">AC</div><div className="stat-value" style={{ fontSize: '14px' }}>{c.ac}</div></div>
        <div className="stat-block" style={{ flex: 1 }}><div className="stat-label">HP</div><div className="stat-value" style={{ fontSize: '14px' }}>{c.maxHp}</div></div>
      </div>

      {/* Loot Section - Only for NPCs/Enemies */}
      {c.type !== 'player' && (
        <div style={{ borderTop: '1px solid #1e40af', paddingTop: '10px', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#eab308', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Coins size={12} /> LOOT ({c.loot?.length || 0})
            </span>
            <button
              onClick={() => setShowLootForm(!showLootForm)}
              style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', borderRadius: '4px', color: '#eab308', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <Plus size={10} /> Add
            </button>
          </div>

          {/* Loot List */}
          {c.loot?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              {c.loot.map(loot => (
                <div key={loot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', padding: '6px 8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#fff' }}>{loot.name}</span>
                    {loot.is_magical && <span style={{ color: '#eab308', marginLeft: '4px' }}>✨</span>}
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>x{loot.quantity}</span>
                    {loot.value && <span style={{ fontSize: '10px', color: '#eab308', marginLeft: '6px' }}>{loot.value}</span>}
                  </div>
                  <button onClick={() => onRemoveLoot(loot.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Loot Form */}
          {showLootForm && (
            <div style={{ background: 'rgba(10, 10, 40, 0.5)', border: '1px solid #eab308', borderRadius: '8px', padding: '10px' }}>
              <Input
                value={newLoot.name}
                onChange={(e) => setNewLoot({ ...newLoot, name: e.target.value })}
                placeholder="Item name"
                className="input-glow"
                style={{ fontSize: '12px', marginBottom: '6px', height: '32px' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <Input
                  type="number"
                  value={newLoot.quantity}
                  onChange={(e) => setNewLoot({ ...newLoot, quantity: parseInt(e.target.value) || 1 })}
                  placeholder="Qty"
                  className="input-glow"
                  style={{ fontSize: '12px', width: '60px', height: '32px' }}
                  min="1"
                />
                <Input
                  value={newLoot.value}
                  onChange={(e) => setNewLoot({ ...newLoot, value: e.target.value })}
                  placeholder="Value (e.g., 50 gp)"
                  className="input-glow"
                  style={{ fontSize: '12px', flex: 1, height: '32px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  value={newLoot.item_type}
                  onChange={(e) => setNewLoot({ ...newLoot, item_type: e.target.value })}
                  className="input-glow"
                  style={{ fontSize: '11px', padding: '4px', flex: 1, height: '32px' }}
                >
                  <option value="weapon">Weapon</option>
                  <option value="armor">Armor</option>
                  <option value="potion">Potion</option>
                  <option value="scroll">Scroll</option>
                  <option value="magic_item">Magic Item</option>
                  <option value="misc">Misc</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308', fontSize: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newLoot.is_magical} onChange={(e) => setNewLoot({ ...newLoot, is_magical: e.target.checked })} style={{ accentColor: '#eab308' }} />
                  Magic
                </label>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <Button onClick={handleAddLoot} className="btn-primary" style={{ flex: 1, fontSize: '11px', padding: '6px' }}>Add</Button>
                <Button onClick={() => setShowLootForm(false)} className="btn-outline" style={{ fontSize: '11px', padding: '6px' }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CombatCreatorTab;
