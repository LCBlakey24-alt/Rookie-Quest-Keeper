import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Sword, Users, Shield, Heart, Skull, SkipForward, RotateCcw, 
  Trash2, ChevronUp, ChevronDown, CircleDot, Grid, ZoomIn, ZoomOut, X,
  ArrowLeft
} from 'lucide-react';
import { QuickReferencePopup, QuickReferenceModal } from '@/components/QuickReference';

const CONDITIONS = [
  { id: 'blinded', label: 'Blind', color: '#64748b' },
  { id: 'charmed', label: 'Charm', color: '#ec4899' },
  { id: 'frightened', label: 'Fear', color: '#a855f7' },
  { id: 'grappled', label: 'Grap', color: '#f97316' },
  { id: 'incapacitated', label: 'Incap', color: '#78716c' },
  { id: 'invisible', label: 'Invis', color: '#06b6d4' },
  { id: 'paralyzed', label: 'Para', color: '#eab308' },
  { id: 'poisoned', label: 'Pois', color: '#22c55e' },
  { id: 'prone', label: 'Prone', color: '#92400e' },
  { id: 'restrained', label: 'Rest', color: '#dc2626' },
  { id: 'stunned', label: 'Stun', color: '#fbbf24' },
  { id: 'unconscious', label: 'Uncon', color: '#1e293b' },
  { id: 'concentrating', label: 'Conc', color: '#4a7dff' },
];

function CombatPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get scenario data from navigation state
  const scenarioData = location.state?.scenario;
  const campaignName = location.state?.campaignName || 'Campaign';
  
  // Combat state
  const [combatants, setCombatants] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [showQuickRef, setShowQuickRef] = useState(false);
  
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
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!scenarioData) {
      toast.error('No combat data found');
      navigate(`/dm-screen/${campaignId}`);
      return;
    }
    
    // Initialize combatants with rolled initiative
    const loadedCombatants = (scenarioData.combatants || []).map(c => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const initMod = c.initiativeMod || 0;
      return {
        ...c,
        initiative: roll + initMod,
        initiativeRoll: roll,
        hp: c.hp || c.maxHp || 10,
        conditions: c.conditions || [],
        deathSaves: { successes: 0, failures: 0 }
      };
    }).sort((a, b) => b.initiative - a.initiative);
    
    setCombatants(loadedCombatants);
    setTokens(scenarioData.tokens || []);
    setShowGrid(scenarioData.show_grid !== false);
    setGridSize(scenarioData.grid_size || 40);
    
    // Load map
    if (scenarioData.map_url) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setMapImage(img);
      img.onerror = () => console.log('Failed to load map');
      img.src = scenarioData.map_url;
    }
    
    toast.success(`Combat started! ${loadedCombatants.length} combatants rolled initiative.`);
  }, []);

  const nextTurn = () => {
    if (combatants.length === 0) return;
    if (currentTurn >= combatants.length - 1) {
      setCurrentTurn(0);
      setRound(r => r + 1);
      toast.success(`Round ${round + 1} begins!`);
    } else {
      setCurrentTurn(t => t + 1);
    }
  };

  const endCombat = () => {
    if (!window.confirm('End combat and return to DM Screen?')) return;
    toast.success('Combat ended!');
    navigate(`/dm-screen/${campaignId}`);
  };

  const updateHP = (id, change) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + change));
        const wasDown = c.hp <= 0;
        const nowDown = newHp <= 0;
        
        if (!wasDown && nowDown) {
          toast.warning(`${c.name} is down!`);
          return { ...c, hp: newHp, deathSaves: { successes: 0, failures: 0 } };
        }
        if (wasDown && !nowDown) {
          toast.success(`${c.name} is back up!`);
          return { ...c, hp: newHp, deathSaves: { successes: 0, failures: 0 } };
        }
        return { ...c, hp: newHp };
      }
      return c;
    }));
  };

  const rollDeathSave = (id) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        if (roll === 20) {
          toast.success(`${c.name} rolled NAT 20! Back with 1 HP!`);
          return { ...c, hp: 1, deathSaves: { successes: 0, failures: 0 } };
        }
        
        let newSaves = { ...c.deathSaves };
        if (roll === 1) {
          newSaves.failures = Math.min(3, newSaves.failures + 2);
          toast.error(`${c.name} rolled NAT 1! Two failures!`);
        } else if (roll >= 10) {
          newSaves.successes = Math.min(3, newSaves.successes + 1);
          toast.success(`${c.name} rolled ${roll} - Success (${newSaves.successes}/3)`);
        } else {
          newSaves.failures = Math.min(3, newSaves.failures + 1);
          toast.error(`${c.name} rolled ${roll} - Failure (${newSaves.failures}/3)`);
        }
        
        if (newSaves.successes >= 3) toast.success(`${c.name} stabilized!`);
        if (newSaves.failures >= 3) toast.error(`${c.name} has died!`);
        
        return { ...c, deathSaves: newSaves };
      }
      return c;
    }));
  };

  const toggleCondition = (id, conditionId) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        const has = c.conditions.includes(conditionId);
        return { ...c, conditions: has ? c.conditions.filter(x => x !== conditionId) : [...c.conditions, conditionId] };
      }
      return c;
    }));
  };

  const removeCombatant = (id) => {
    const idx = combatants.findIndex(c => c.id === id);
    setCombatants(prev => prev.filter(c => c.id !== id));
    setTokens(prev => prev.filter(t => t.id !== id));
    if (idx <= currentTurn && currentTurn > 0) setCurrentTurn(t => t - 1);
  };

  const moveInOrder = (id, dir) => {
    const idx = combatants.findIndex(c => c.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= combatants.length) return;
    
    const updated = [...combatants];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setCombatants(updated);
    
    if (idx === currentTurn) setCurrentTurn(newIdx);
    else if (newIdx === currentTurn) setCurrentTurn(idx);
  };

  // Token dragging
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const clicked = [...tokens].reverse().find(t => {
      const dist = Math.sqrt(Math.pow(x - t.x, 2) + Math.pow(y - t.y, 2));
      return dist <= t.size / 2;
    });
    
    if (clicked) {
      setSelectedToken(clicked.id);
      setIsDragging(true);
      setDragOffset({ x: x - clicked.x, y: y - clicked.y });
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
    
    setTokens(prev => prev.map(t => t.id === selectedToken ? { ...t, x, y } : t));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Canvas rendering
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
    
    // Draw map
    if (mapImage) {
      const scale = Math.min(canvas.width / zoom / mapImage.width, canvas.height / zoom / mapImage.height, 1);
      ctx.drawImage(mapImage, 0, 0, mapImage.width * scale, mapImage.height * scale);
    }
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(74, 125, 255, 0.25)';
      ctx.lineWidth = 1 / zoom;
      const w = mapImage ? mapImage.width : 1200;
      const h = mapImage ? mapImage.height : 800;
      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    
    // Draw tokens
    tokens.forEach(token => {
      const combatant = combatants.find(c => c.id === token.id);
      const isCurrent = combatants[currentTurn]?.id === token.id;
      const isSelected = token.id === selectedToken;
      
      // Current turn glow
      if (isCurrent) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, token.size / 2 + 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.fill();
      }
      
      // Token
      ctx.beginPath();
      ctx.arc(token.x, token.y, token.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = token.color || '#4a7dff';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#fff' : isCurrent ? '#22c55e' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = (isSelected || isCurrent ? 3 : 2) / zoom;
      ctx.stroke();
      
      // Enemy ring
      if (token.isEnemy) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, token.size / 2 + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
      
      // Name
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${11 / zoom}px Montserrat, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(token.name.substring(0, 10), token.x, token.y + token.size / 2 + 14);
      
      // HP bar
      if (combatant) {
        const pct = Math.max(0, combatant.hp / combatant.maxHp);
        const barW = token.size * 0.8;
        const barH = 6 / zoom;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(token.x - barW / 2, token.y + token.size / 2 + 18, barW, barH);
        ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(token.x - barW / 2, token.y + token.size / 2 + 18, barW * pct, barH);
      }
    });
    
    ctx.restore();
  }, [mapImage, tokens, selectedToken, showGrid, gridSize, zoom, pan, combatants, currentTurn]);

  if (!scenarioData) return null;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(10, 10, 46, 0.95)',
        borderBottom: '2px solid #1e40af',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 0 30px rgba(74, 125, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button onClick={endCombat} className="btn-icon"><ArrowLeft size={20} /></Button>
          <div>
            <h1 style={{ fontSize: '20px', color: '#fff', fontFamily: 'Montserrat', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sword size={22} style={{ color: '#ef4444' }} />
              {scenarioData.name}
            </h1>
            <p style={{ fontSize: '12px', color: '#67e8f9' }}>{campaignName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.2)', 
            border: '2px solid #ef4444', 
            borderRadius: '25px', 
            padding: '8px 20px',
            color: '#ef4444',
            fontWeight: '800',
            fontSize: '16px',
            fontFamily: 'Montserrat'
          }}>
            Round {round}
          </div>
          <Button onClick={nextTurn} className="btn-primary" style={{ display: 'flex', gap: '8px', padding: '12px 24px' }}>
            <SkipForward size={18} /> Next Turn
          </Button>
          <Button onClick={endCombat} className="btn-secondary" style={{ display: 'flex', gap: '8px' }}>
            <X size={18} /> End Combat
          </Button>
        </div>
      </div>

      {/* Main Content - Initiative Left, Map Right */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px 1fr', gap: '0' }}>
        {/* LEFT - Initiative Order */}
        <div style={{ 
          background: 'rgba(10, 10, 46, 0.7)',
          borderRight: '2px solid #1e40af',
          padding: '20px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 70px)'
        }}>
          <h2 style={{ fontSize: '18px', color: '#fff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: '#4a7dff' }} />
            Initiative Order
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {combatants.map((c, idx) => {
              const isCurrent = idx === currentTurn;
              const isDead = c.deathSaves?.failures >= 3;
              const isDown = c.hp <= 0 && !isDead;
              const isStable = c.deathSaves?.successes >= 3 && c.hp <= 0;
              const hpPct = Math.max(0, (c.hp / c.maxHp) * 100);
              
              return (
                <div
                  key={c.id}
                  style={{
                    background: isCurrent ? 'rgba(34, 197, 94, 0.15)' : isDead ? 'rgba(30,30,30,0.5)' : isDown ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 10, 40, 0.5)',
                    border: `2px solid ${isCurrent ? '#22c55e' : isDead ? '#64748b' : isDown ? '#ef4444' : c.type === 'player' ? '#4a7dff' : '#ef4444'}`,
                    borderRadius: '14px',
                    padding: '14px',
                    opacity: isDead ? 0.5 : 1,
                    boxShadow: isCurrent ? '0 0 20px rgba(34, 197, 94, 0.4)' : 'none',
                    transition: 'all 0.3s'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: isCurrent ? '#22c55e' : c.type === 'player' ? '#4a7dff' : '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800', fontSize: '16px', color: '#fff', fontFamily: 'Montserrat',
                      boxShadow: isCurrent ? '0 0 15px rgba(34, 197, 94, 0.6)' : 'none'
                    }}>
                      {c.initiative}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: isDead ? '#64748b' : '#fff', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.name}
                        {isDead && <Skull size={14} />}
                        {isCurrent && !isDown && <span style={{ fontSize: '11px', color: '#22c55e', background: 'rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: '10px' }}>TURN</span>}
                        {isDown && !isDead && !isStable && <span style={{ fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '10px' }}>DYING</span>}
                        {isStable && <span style={{ fontSize: '11px', color: '#eab308', background: 'rgba(234,179,8,0.2)', padding: '2px 8px', borderRadius: '10px' }}>STABLE</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {c.type === 'player' ? 'Player' : 'Enemy'} • Rolled: {c.initiativeRoll}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(10,10,40,0.6)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #1e40af' }}>
                      <Shield size={14} style={{ color: '#67e8f9' }} />
                      <span style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>{c.ac}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moveInOrder(c.id, 'up')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}><ChevronUp size={16} /></button>
                      <button onClick={() => moveInOrder(c.id, 'down')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}><ChevronDown size={16} /></button>
                    </div>
                    <button onClick={() => removeCombatant(c.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                  </div>

                  {/* HP Bar */}
                  <div style={{ marginBottom: isDown && !isDead ? '12px' : '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={14} style={{ color: hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444' }} />
                        <span style={{ fontSize: '14px', color: '#fff', fontWeight: '700' }}>{c.hp} / {c.maxHp}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[-10, -5, -1, 1, 5, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => updateHP(c.id, n)}
                            style={{
                              background: n < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                              border: `1px solid ${n < 0 ? '#ef4444' : '#22c55e'}`,
                              borderRadius: '6px',
                              color: n < 0 ? '#ef4444' : '#22c55e',
                              padding: '3px 7px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {n > 0 ? '+' : ''}{n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(10,10,40,0.8)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Death Saves */}
                  {isDown && !isDead && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #ef4444', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Skull size={14} /> Death Saves</span>
                        <Button onClick={() => rollDeathSave(c.id)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} disabled={isStable}>
                          <CircleDot size={14} style={{ marginRight: '4px' }} /> Roll
                        </Button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '6px', fontWeight: '600' }}>Success</div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #22c55e', background: i < c.deathSaves.successes ? '#22c55e' : 'transparent' }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '6px', fontWeight: '600' }}>Failure</div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #ef4444', background: i < c.deathSaves.failures ? '#ef4444' : 'transparent' }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditions */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {CONDITIONS.map(cond => {
                      const active = c.conditions?.includes(cond.id);
                      return (
                        <QuickReferencePopup key={cond.id} type="condition" id={cond.id} position="bottom">
                          <button
                            onClick={() => toggleCondition(c.id, cond.id)}
                            style={{
                              background: active ? `${cond.color}30` : 'transparent',
                              border: `1px solid ${active ? cond.color : '#1e40af'}`,
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              color: active ? cond.color : '#64748b',
                              cursor: 'pointer',
                              fontWeight: active ? '600' : '400'
                            }}
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
        </div>

        {/* RIGHT - Battle Map */}
        <div style={{ position: 'relative', background: '#0a0a2e' }}>
          {/* Map Controls */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', gap: '8px' }}>
            <Button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="btn-icon" style={{ background: 'rgba(10,10,46,0.9)' }}><ZoomIn size={18} /></Button>
            <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="btn-icon" style={{ background: 'rgba(10,10,46,0.9)' }}><ZoomOut size={18} /></Button>
            <Button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="btn-icon" style={{ background: 'rgba(10,10,46,0.9)' }}><RotateCcw size={18} /></Button>
            <Button onClick={() => setShowGrid(!showGrid)} className="btn-icon" style={{ background: 'rgba(10,10,46,0.9)', color: showGrid ? '#22c55e' : '#64748b' }}><Grid size={18} /></Button>
          </div>
          
          <div
            ref={containerRef}
            style={{ width: '100%', height: 'calc(100vh - 70px)', cursor: isDragging ? 'grabbing' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          
          {!mapImage && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#64748b' }}>
              <Grid size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No map loaded for this encounter</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>Tokens are displayed on the grid</p>
            </div>
          )}
        </div>
      </div>

      <QuickReferenceModal isOpen={showQuickRef} onClose={() => setShowQuickRef(false)} />
    </div>
  );
}

export default CombatPage;
