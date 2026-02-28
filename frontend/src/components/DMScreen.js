import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sword, Users, Scroll, Search, Edit, Save, X, BookOpen, Send, Sparkles, 
  Loader, LogOut, Clock, Trash2, SkipForward, Plus, Heart, Shield, Skull, 
  RotateCcw, ChevronUp, ChevronDown, Zap, CircleDot, Play, Grid, ZoomIn, ZoomOut,
  Dices, Coins
} from 'lucide-react';
import DiceRoller from '@/components/DiceRoller';
import LootGenerator from '@/components/LootGenerator';
import { QuickReferencePopup, QuickReferenceModal, CONDITIONS_REFERENCE } from '@/components/QuickReference';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CONDITIONS = [
  { id: 'blinded', label: 'Blinded', color: '#64748b' },
  { id: 'charmed', label: 'Charmed', color: '#ec4899' },
  { id: 'frightened', label: 'Frightened', color: '#a855f7' },
  { id: 'grappled', label: 'Grappled', color: '#f97316' },
  { id: 'incapacitated', label: 'Incapacitated', color: '#78716c' },
  { id: 'invisible', label: 'Invisible', color: '#06b6d4' },
  { id: 'paralyzed', label: 'Paralyzed', color: '#eab308' },
  { id: 'poisoned', label: 'Poisoned', color: '#22c55e' },
  { id: 'prone', label: 'Prone', color: '#92400e' },
  { id: 'restrained', label: 'Restrained', color: '#dc2626' },
  { id: 'stunned', label: 'Stunned', color: '#fbbf24' },
  { id: 'unconscious', label: 'Unconscious', color: '#1e293b' },
  { id: 'concentrating', label: 'Concentrating', color: '#4a7dff' },
];

function DMScreen({ username }) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [calendar, setCalendar] = useState(null);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [quickNote, setQuickNote] = useState('');
  const [processingNote, setProcessingNote] = useState(false);
  
  // Combat state
  const [combatActive, setCombatActive] = useState(false);
  const [combatants, setCombatants] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState(null);
  
  // Map state
  const [mapImage, setMapImage] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(40);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // UI state
  const [showTools, setShowTools] = useState('dice'); // 'dice', 'loot', 'notes'
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchAllData();
  }, [campaignId]);

  const fetchAllData = async () => {
    try {
      const [campaignRes, playersRes, npcsRes, scenariosRes, calendarRes, notesRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}`),
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/combat-scenarios`),
        axios.get(`${API}/campaigns/${campaignId}/calendar`),
        axios.get(`${API}/campaigns/${campaignId}/ingame-notes`)
      ]);
      
      setCampaign(campaignRes.data);
      setPlayers(playersRes.data);
      setNPCs(npcsRes.data);
      setScenarios(scenariosRes.data);
      setCalendar(calendarRes.data);
      setSessionNotes(notesRes.data.slice(0, 20));
    } catch (error) {
      toast.error('Failed to load DM Screen data');
    } finally {
      setLoading(false);
    }
  };

  // Load scenario into combat
  const loadScenarioIntoCombat = (scenario) => {
    setSelectedScenario(scenario);
    
    // Set up combatants with initiative rolls
    const loadedCombatants = (scenario.combatants || []).map(c => ({
      ...c,
      initiative: c.initiative || Math.floor(Math.random() * 20) + 1,
      hp: c.hp || c.maxHp,
      deathSaves: { successes: 0, failures: 0 }
    })).sort((a, b) => b.initiative - a.initiative);
    
    setCombatants(loadedCombatants);
    setTokens(scenario.tokens || []);
    setShowGrid(scenario.show_grid !== false);
    setGridSize(scenario.grid_size || 40);
    
    // Load map if present
    if (scenario.map_url) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setMapImage(img);
      img.src = scenario.map_url;
    } else {
      setMapImage(null);
    }
    
    toast.success(`Loaded encounter: ${scenario.name}`);
  };

  // Start combat from loaded scenario
  const startCombat = () => {
    if (combatants.length === 0) {
      toast.error('Load an encounter first');
      return;
    }
    
    // Roll initiative for all
    const withInitiative = combatants.map(c => ({
      ...c,
      initiative: Math.floor(Math.random() * 20) + 1 + (c.initiativeMod || 0),
      deathSaves: { successes: 0, failures: 0 }
    })).sort((a, b) => b.initiative - a.initiative);
    
    setCombatants(withInitiative);
    setCurrentTurn(0);
    setRound(1);
    setCombatActive(true);
    toast.success('Combat started! Initiative rolled.');
  };

  // Quick start with players
  const quickStartCombat = () => {
    const allCombatants = [];
    
    players.forEach(player => {
      const dexMod = Math.floor(((player.stats?.dexterity || 10) - 10) / 2);
      allCombatants.push({
        id: `player-${player.id}`,
        name: player.name,
        type: 'player',
        hp: player.hp || player.max_hp,
        maxHp: player.max_hp || player.hp || 10,
        ac: player.ac || 10,
        initiative: Math.floor(Math.random() * 20) + 1 + dexMod,
        conditions: [],
        isEnemy: false,
        deathSaves: { successes: 0, failures: 0 },
        tokenColor: '#4a7dff',
        tokenSize: 40
      });
    });
    
    allCombatants.sort((a, b) => b.initiative - a.initiative);
    setCombatants(allCombatants);
    setCurrentTurn(0);
    setRound(1);
    setCombatActive(true);
    
    // Create tokens for map
    const newTokens = allCombatants.map((c, i) => ({
      id: c.id,
      name: c.name,
      color: c.tokenColor || '#4a7dff',
      size: 40,
      x: 100 + (i % 4) * 50,
      y: 100 + Math.floor(i / 4) * 50,
      isEnemy: c.isEnemy
    }));
    setTokens(newTokens);
    
    toast.success('Quick combat started with players!');
  };

  const nextTurn = () => {
    if (currentTurn >= combatants.length - 1) {
      setCurrentTurn(0);
      setRound(round + 1);
      toast.success(`Round ${round + 1} begins!`);
    } else {
      setCurrentTurn(currentTurn + 1);
    }
  };

  const endCombat = () => {
    setCombatActive(false);
    setCurrentTurn(0);
    setRound(1);
    toast.success('Combat ended!');
  };

  const updateHP = (id, change) => {
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + change));
        const wasUnconscious = c.hp <= 0;
        const nowUnconscious = newHp <= 0;
        
        let newDeathSaves = c.deathSaves;
        if (!wasUnconscious && nowUnconscious) {
          newDeathSaves = { successes: 0, failures: 0 };
          toast.warning(`${c.name} is unconscious!`);
        } else if (wasUnconscious && !nowUnconscious) {
          newDeathSaves = { successes: 0, failures: 0 };
          toast.success(`${c.name} is back up!`);
        }
        
        return { ...c, hp: newHp, deathSaves: newDeathSaves };
      }
      return c;
    }));
  };

  const rollDeathSave = (id) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        let newSaves = { ...c.deathSaves };
        
        if (roll === 20) {
          toast.success(`${c.name} rolled a Natural 20! They regain 1 HP!`);
          return { ...c, hp: 1, deathSaves: { successes: 0, failures: 0 } };
        } else if (roll === 1) {
          newSaves.failures = Math.min(3, newSaves.failures + 2);
          toast.error(`${c.name} rolled a Natural 1! Two failures!`);
        } else if (roll >= 10) {
          newSaves.successes = Math.min(3, newSaves.successes + 1);
          toast.success(`${c.name} rolled ${roll} - Success! (${newSaves.successes}/3)`);
        } else {
          newSaves.failures = Math.min(3, newSaves.failures + 1);
          toast.error(`${c.name} rolled ${roll} - Failure! (${newSaves.failures}/3)`);
        }
        
        if (newSaves.successes >= 3) toast.success(`${c.name} stabilized!`);
        if (newSaves.failures >= 3) toast.error(`${c.name} has died!`);
        
        return { ...c, deathSaves: newSaves };
      }
      return c;
    }));
  };

  const toggleCondition = (id, conditionId) => {
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        const hasCondition = c.conditions?.includes(conditionId);
        return {
          ...c,
          conditions: hasCondition 
            ? c.conditions.filter(cond => cond !== conditionId)
            : [...(c.conditions || []), conditionId]
        };
      }
      return c;
    }));
  };

  const removeCombatant = (id) => {
    const index = combatants.findIndex(c => c.id === id);
    setCombatants(combatants.filter(c => c.id !== id));
    setTokens(tokens.filter(t => t.id !== id));
    if (index < currentTurn) setCurrentTurn(Math.max(0, currentTurn - 1));
  };

  // Map token handling
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
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
    let x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
    let y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
    
    if (showGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    
    setTokens(tokens.map(t => t.id === selectedToken ? { ...t, x, y } : t));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Render map canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !containerRef.current) return;
    
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight;
    
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    if (mapImage) {
      ctx.drawImage(mapImage, 0, 0);
    }
    
    if (showGrid) {
      ctx.strokeStyle = 'rgba(74, 125, 255, 0.3)';
      ctx.lineWidth = 1 / zoom;
      const width = mapImage ? mapImage.width : 1000;
      const height = mapImage ? mapImage.height : 800;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    }
    
    // Draw tokens with current turn highlight
    tokens.forEach(token => {
      const combatant = combatants.find(c => c.id === token.id);
      const isCurrentTurn = combatActive && combatants[currentTurn]?.id === token.id;
      const isSelected = token.id === selectedToken;
      
      // Outer glow for current turn
      if (isCurrentTurn) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, token.size / 2 + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.fill();
      }
      
      ctx.beginPath();
      ctx.arc(token.x, token.y, token.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = token.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : isCurrentTurn ? '#22c55e' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = (isSelected || isCurrentTurn ? 3 : 2) / zoom;
      ctx.stroke();
      
      if (token.isEnemy) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, token.size / 2 + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${11 / zoom}px Montserrat, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(token.name.substring(0, 10), token.x, token.y + token.size / 2 + 14);
      
      // HP bar
      if (combatant) {
        const hpPercent = combatant.hp / combatant.maxHp;
        const hpWidth = token.size * 0.8;
        const hpHeight = 5 / zoom;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(token.x - hpWidth / 2, token.y + token.size / 2 + 18, hpWidth, hpHeight);
        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(token.x - hpWidth / 2, token.y + token.size / 2 + 18, hpWidth * Math.max(0, hpPercent), hpHeight);
      }
    });
    
    ctx.restore();
  }, [mapImage, tokens, selectedToken, showGrid, gridSize, zoom, pan, combatants, currentTurn, combatActive]);

  // Note submission
  const handleSubmitNote = async () => {
    if (!quickNote.trim()) return;
    setProcessingNote(true);
    try {
      const noteRes = await axios.post(`${API}/campaigns/${campaignId}/ingame-notes`, { content: quickNote });
      setSessionNotes(prev => [{ id: noteRes.data.id, content: quickNote, created_at: new Date().toISOString() }, ...prev]);
      setQuickNote('');
      toast.success('Note saved!');
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setProcessingNote(false);
    }
  };

  const handleEndSession = () => {
    if (!window.confirm('End session?')) return;
    toast.success('Session ended!');
    window.close();
    setTimeout(() => navigate('/campaigns'), 500);
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)' }}>
      {/* Header */}
      <div className="glow-panel" style={{ margin: '0', borderRadius: '0', padding: '16px 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sword size={24} style={{ color: '#22c55e' }} />
              {campaign?.name} - DM Screen
            </h1>
            {calendar && (
              <p style={{ fontSize: '13px', color: '#67e8f9', marginTop: '4px' }}>
                {calendar.custom_months?.[calendar.current_month - 1]?.name || 'Month'} {calendar.current_day}, Year {calendar.current_year}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {combatActive && <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '20px', padding: '8px 16px', color: '#ef4444', fontWeight: '700', fontFamily: 'Montserrat' }}>Round {round}</div>}
            <Button onClick={() => setShowQuickRef(true)} className="btn-outline" style={{ display: 'flex', gap: '6px' }}><BookOpen size={16} /> Reference</Button>
            <Button onClick={handleEndSession} className="btn-secondary" style={{ display: 'flex', gap: '6px' }}><LogOut size={16} /> End Session</Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr 320px', gap: '20px', padding: '20px', maxWidth: '1800px', margin: '0 auto', minHeight: 'calc(100vh - 100px)' }}>
        
        {/* LEFT COLUMN - Initiative & Combat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Encounter Selector */}
          {!combatActive && (
            <div className="glow-panel">
              <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Swords size={18} style={{ color: '#ef4444' }} /> Load Encounter
              </h3>
              {scenarios.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No saved encounters. Create one in Combat Creator tab.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {scenarios.map(s => (
                    <button
                      key={s.id}
                      onClick={() => loadScenarioIntoCombat(s)}
                      style={{
                        padding: '10px 14px',
                        background: selectedScenario?.id === s.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                        border: `2px solid ${selectedScenario?.id === s.id ? '#22c55e' : '#1e40af'}`,
                        borderRadius: '10px',
                        color: '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '2px' }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#67e8f9' }}>{s.combatants?.length || 0} combatants {s.map_url && '• Has Map'}</div>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Button onClick={startCombat} className="btn-secondary" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }} disabled={combatants.length === 0}>
                  <Play size={16} /> Start Combat
                </Button>
                <Button onClick={quickStartCombat} className="btn-outline" style={{ flex: 1 }} disabled={players.length === 0}>
                  Quick Start
                </Button>
              </div>
            </div>
          )}

          {/* Combat Controls */}
          {combatActive && (
            <div className="glow-panel" style={{ borderColor: '#22c55e' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={nextTurn} className="btn-primary" style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <SkipForward size={16} /> Next Turn
                </Button>
                <Button onClick={endCombat} className="btn-secondary"><RotateCcw size={16} /></Button>
              </div>
            </div>
          )}

          {/* Initiative Order */}
          <div className="glow-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: '#4a7dff' }} /> Initiative Order
            </h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {combatants.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Load an encounter to see combatants</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {combatants.map((c, idx) => {
                    const isCurrentTurn = combatActive && idx === currentTurn;
                    const isDead = c.deathSaves?.failures >= 3;
                    const isUnconscious = c.hp <= 0 && !isDead;
                    const hpPercent = (c.hp / c.maxHp) * 100;
                    
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: isCurrentTurn ? 'rgba(34, 197, 94, 0.15)' : isDead ? 'rgba(30,30,30,0.5)' : isUnconscious ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 10, 40, 0.4)',
                          border: `2px solid ${isCurrentTurn ? '#22c55e' : isDead ? '#64748b' : isUnconscious ? '#ef4444' : c.type === 'player' ? '#4a7dff' : '#ef4444'}`,
                          borderRadius: '12px',
                          padding: '12px',
                          opacity: isDead ? 0.6 : 1,
                          boxShadow: isCurrentTurn ? '0 0 15px rgba(34, 197, 94, 0.3)' : 'none'
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isCurrentTurn ? '#22c55e' : c.type === 'player' ? '#4a7dff' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', color: '#fff', fontFamily: 'Montserrat' }}>
                            {c.initiative}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: isDead ? '#64748b' : '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {c.name}
                              {isDead && <Skull size={12} />}
                              {isCurrentTurn && <span style={{ fontSize: '10px', color: '#22c55e' }}>● TURN</span>}
                              {isUnconscious && !isDead && <span style={{ fontSize: '10px', color: '#ef4444' }}>● DYING</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(10,10,40,0.5)', padding: '4px 8px', borderRadius: '6px' }}>
                            <Shield size={12} style={{ color: '#67e8f9' }} />
                            <span style={{ fontWeight: '700', fontSize: '12px', color: '#fff' }}>{c.ac}</span>
                          </div>
                          <button onClick={() => removeCombatant(c.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                        </div>
                        
                        {/* HP */}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Heart size={12} style={{ color: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444' }} />
                              <span style={{ fontSize: '12px', color: '#fff', fontWeight: '600' }}>{c.hp}/{c.maxHp}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => updateHP(c.id, -5)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', padding: '2px 6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>-5</button>
                              <button onClick={() => updateHP(c.id, -1)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', padding: '2px 6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>-1</button>
                              <button onClick={() => updateHP(c.id, 1)} style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: '4px', color: '#22c55e', padding: '2px 6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>+1</button>
                              <button onClick={() => updateHP(c.id, 5)} style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: '4px', color: '#22c55e', padding: '2px 6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>+5</button>
                            </div>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(10,10,40,0.8)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max(0, hpPercent)}%`, background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444', transition: 'width 0.3s' }} />
                          </div>
                        </div>

                        {/* Death Saves */}
                        {isUnconscious && !isDead && (
                          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '12px' }}>Death Saves</span>
                              <Button onClick={() => rollDeathSave(c.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}><CircleDot size={12} /> Roll</Button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#22c55e', marginBottom: '4px' }}>Success</div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[0, 1, 2].map(i => (
                                    <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #22c55e', background: i < c.deathSaves.successes ? '#22c55e' : 'transparent' }} />
                                  ))}
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '4px' }}>Failure</div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[0, 1, 2].map(i => (
                                    <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #ef4444', background: i < c.deathSaves.failures ? '#ef4444' : 'transparent' }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Conditions */}
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {CONDITIONS.map(cond => {
                            const isActive = c.conditions?.includes(cond.id);
                            return (
                              <QuickReferencePopup key={cond.id} type="condition" id={cond.id} position="bottom">
                                <button
                                  onClick={() => toggleCondition(c.id, cond.id)}
                                  style={{ background: isActive ? `${cond.color}30` : 'transparent', border: `1px solid ${isActive ? cond.color : '#1e40af'}`, borderRadius: '3px', padding: '1px 5px', fontSize: '9px', color: isActive ? cond.color : '#64748b', cursor: 'pointer', fontWeight: isActive ? '600' : '400' }}
                                >
                                  {cond.label}
                                </button>
                              </QuickReferencePopup>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN - Battle Map */}
        <div className="glow-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Battle Map
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="btn-icon" style={{ padding: '6px' }}><ZoomIn size={14} /></Button>
              <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="btn-icon" style={{ padding: '6px' }}><ZoomOut size={14} /></Button>
              <Button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="btn-icon" style={{ padding: '6px' }}><RotateCcw size={14} /></Button>
              <Button onClick={() => setShowGrid(!showGrid)} className="btn-icon" style={{ padding: '6px', color: showGrid ? '#22c55e' : '#64748b' }}><Grid size={14} /></Button>
            </div>
          </div>
          <div
            ref={containerRef}
            style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '2px solid #1e40af', cursor: isDragging ? 'grabbing' : 'default', minHeight: '400px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          {!mapImage && (
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
              Load an encounter with a map from the left panel
            </p>
          )}
        </div>

        {/* RIGHT COLUMN - Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tool Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'dice', icon: Dices, label: 'Dice' },
              { id: 'loot', icon: Coins, label: 'Loot' },
              { id: 'notes', icon: Scroll, label: 'Notes' }
            ].map(tab => (
              <Button
                key={tab.id}
                onClick={() => setShowTools(tab.id)}
                className={showTools === tab.id ? 'btn-primary' : 'btn-outline'}
                style={{ flex: 1, display: 'flex', gap: '4px', justifyContent: 'center', padding: '10px' }}
              >
                <tab.icon size={14} />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tool Content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {showTools === 'dice' && <DiceRoller />}
            {showTools === 'loot' && <LootGenerator />}
            {showTools === 'notes' && (
              <div className="glow-panel">
                <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: '#22c55e' }} /> Quick Notes
                </h3>
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="textarea-glow"
                  style={{ minHeight: '80px', marginBottom: '10px', fontSize: '13px' }}
                  placeholder="Quick note..."
                />
                <Button onClick={handleSubmitNote} disabled={processingNote} className="btn-primary" style={{ width: '100%', marginBottom: '12px' }}>
                  {processingNote ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Save Note
                </Button>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {sessionNotes.map(note => (
                    <div key={note.id} style={{ background: 'rgba(10,10,40,0.4)', border: '1px solid #1e40af', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{new Date(note.created_at).toLocaleTimeString()}</div>
                      <div style={{ color: '#fff', fontSize: '12px' }}>{note.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <QuickReferenceModal isOpen={showQuickRef} onClose={() => setShowQuickRef(false)} />
    </div>
  );
}

export default DMScreen;
