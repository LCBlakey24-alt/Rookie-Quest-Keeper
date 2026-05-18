import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { 
  Sword, Users, Shield, Heart, Skull, SkipForward, RotateCcw, 
  Trash2, ChevronUp, ChevronDown, CircleDot, Grid, ZoomIn, ZoomOut, X,
  ArrowLeft, Coins, Package, Target, UserPlus, Sparkles, Map, Lightbulb
} from 'lucide-react';
import { QuickReferencePopup, QuickReferenceModal } from '@/components/QuickReference';
import AttackRoller from '@/components/AttackRoller';
import CreatureAbilityCard from '@/components/CreatureAbilityCard';
import NPCCombatRecruiter from '@/components/NPCCombatRecruiter';
import { SimpleToken } from '@/components/CombatTokenGenerator';
import { RookSuggestionPopup, useRookSuggestions } from '@/components/RookSuggestions';
import MapCanvas from '@/components/MapBuilder/MapCanvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CONDITIONS = [
  { id: 'blinded', label: 'Blind', color: '#64748b', desc: 'Can\'t see. Auto-fail sight checks. Attacks have disadvantage, attackers have advantage.' },
  { id: 'charmed', label: 'Charm', color: '#ec4899', desc: 'Can\'t attack the charmer. Charmer has advantage on social checks.' },
  { id: 'frightened', label: 'Fear', color: '#a855f7', desc: 'Disadvantage on ability checks & attacks while source is in line of sight.' },
  { id: 'grappled', label: 'Grap', color: '#f97316', desc: 'Speed becomes 0. Ends if grappler is incapacitated or forced apart.' },
  { id: 'incapacitated', label: 'Incap', color: '#78716c', desc: 'Can\'t take actions or reactions.' },
  { id: 'invisible', label: 'Invis', color: '#06b6d4', desc: 'Impossible to see without magic. Advantage on attacks, attackers have disadvantage.' },
  { id: 'paralyzed', label: 'Para', color: '#eab308', desc: 'Incapacitated, can\'t move or speak. Auto-fail STR/DEX saves. Melee hits are crits.' },
  { id: 'poisoned', label: 'Pois', color: '#22C55E', desc: 'Disadvantage on attack rolls and ability checks.' },
  { id: 'prone', label: 'Prone', color: '#92400e', desc: 'Disadvantage on attacks. Melee attacks have advantage, ranged have disadvantage.' },
  { id: 'restrained', label: 'Rest', color: '#dc2626', desc: 'Speed 0. Attacks have disadvantage. Attackers have advantage. Disadvantage on DEX saves.' },
  { id: 'stunned', label: 'Stun', color: '#fbbf24', desc: 'Incapacitated, can\'t move. Auto-fail STR/DEX saves. Attackers have advantage.' },
  { id: 'unconscious', label: 'Uncon', color: '#1e293b', desc: 'Incapacitated, can\'t move/speak, drops items. Auto-fail STR/DEX saves. Melee crits.' },
  { id: 'concentrating', label: 'Conc', color: '#4a7dff', desc: 'Maintaining a spell. CON save on damage (DC 10 or half damage, whichever is higher).' },
  { id: 'hasted', label: 'Haste', color: '#22d3ee', desc: '+2 AC, advantage on DEX saves, doubled speed, extra action. Lethargy when spell ends.' },
  { id: 'raging', label: 'Rage', color: '#EF4444', desc: 'Advantage on STR checks/saves. Bonus melee damage. Resistance to B/P/S damage.' },
  { id: 'hexed', label: 'Hex', color: '#9333ea', desc: 'Extra 1d6 necrotic damage from caster. Disadvantage on one chosen ability check.' },
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
  const [collectedLoot, setCollectedLoot] = useState([]);
  const [showLootPanel, setShowLootPanel] = useState(false);
  const [attackingCreature, setAttackingCreature] = useState(null);
  const [showNPCRecruiter, setShowNPCRecruiter] = useState(false);
  const [expandedAbilities, setExpandedAbilities] = useState({});
  // Hide monster HP from screen-shared view (GM still sees the values via tooltip)
  const [hideMonsterHp, setHideMonsterHp] = useState(false);
  // Drag-to-reorder initiative
  const [draggedId, setDraggedId] = useState(null);
  const handleDragStart = (id) => () => setDraggedId(id);
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (targetId) => (e) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }
    setCombatants(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(c => c.id === draggedId);
      const toIdx = next.findIndex(c => c.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedId(null);
    toast.success('Initiative reordered');
  };
  
  // Map integration state
  const [selectedMap, setSelectedMap] = useState(null);
  const [availableMaps, setAvailableMaps] = useState([]);
  const [showMapSelector, setShowMapSelector] = useState(false);
  
  // ROOK suggestions
  const { currentSuggestion, showSuggestion, dismissSuggestion } = useRookSuggestions('fighter', 5);
  
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
      navigate(`/campaign/${campaignId}`);
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
    
    // Load map if specified in scenario
    if (scenarioData.map_url) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setMapImage(img);
      img.onerror = () => {
        // Image failed to load - use fallback
      };
      img.src = scenarioData.map_url;
    }
    
    // Fetch available maps for this campaign
    fetchAvailableMaps();
    
    // Show ROOK combat start suggestion
    setTimeout(() => showSuggestion('combat_start'), 2000);
    
    toast.success(`Combat started! ${loadedCombatants.length} combatants rolled initiative.`);
  }, []);

  // Fetch available maps
  const fetchAvailableMaps = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/maps`);
      setAvailableMaps(response.data || []);
    } catch (error) {
      toast.info('No maps available for this campaign yet.');
    }
  };

  // Load a map into combat
  const loadMapIntoCombat = (map) => {
    setSelectedMap(map);
    setShowMapSelector(false);
    
    // Position tokens on the map
    if (combatants.length > 0) {
      const newTokens = combatants.map((c, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        return {
          id: c.id,
          name: c.name,
          x: 2 + col,
          y: 2 + row,
          isEnemy: c.isEnemy !== false && c.type !== 'player',
          hp: c.hp,
          maxHp: c.maxHp
        };
      });
      setTokens(newTokens);
    }
    
    toast.success(`Loaded map: ${map.name}`);
  };

  // Handle token movement on map
  const handleMapTokenMove = (tokenId, newX, newY) => {
    setTokens(prev => prev.map(t => 
      t.id === tokenId ? { ...t, x: newX, y: newY } : t
    ));
  };

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

  const endCombat = async () => {
    if (!window.confirm('End combat and return to campaign?')) return;
    // Sync each player combatant's HP back to their character record so it persists
    try {
      const playerCombatants = combatants.filter(c => c.type === 'player' && c.character_id);
      await Promise.all(playerCombatants.map(c =>
        axios.patch(`${API}/characters/${c.character_id}`, {
          current_hit_points: c.hp,
          temporary_hit_points: c.tempHp || 0,
          conditions: c.conditions || [],
        }).catch(() => null) // non-fatal per character
      ));
      if (playerCombatants.length > 0) {
        toast.success(`Combat ended — synced HP for ${playerCombatants.length} player(s)`);
      } else {
        toast.success('Combat ended!');
      }
    } catch (err) {
      toast.error('Combat ended (some HP changes may not have synced)');
    }
    navigate(`/campaign/${campaignId}`);
  };

  const updateHP = (id, change) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + change));
        const wasDown = c.hp <= 0;
        const nowDown = newHp <= 0;
        const damageTaken = change < 0 ? Math.abs(change) : 0;

        // Concentration save prompt — D&D 5e: any time a concentrating caster
        // takes damage, they make a CON save vs DC max(10, half-damage).
        if (damageTaken > 0 && c.concentrating_on) {
          const dc = Math.max(10, Math.floor(damageTaken / 2));
          toast.warning(
            `${c.name} is concentrating on "${c.concentrating_on}" — DC ${dc} CON save!`,
            { duration: 8000 }
          );
        }

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

  // Collect loot from defeated enemy
  const collectLoot = (combatant) => {
    if (!combatant.loot || combatant.loot.length === 0) {
      toast.info(`${combatant.name} has no loot`);
      return;
    }
    
    // Add to collected loot
    const lootItems = combatant.loot.map(l => ({
      ...l,
      source: combatant.name,
      collectedAt: new Date().toISOString()
    }));
    
    setCollectedLoot(prev => [...prev, ...lootItems]);
    
    // Mark combatant's loot as collected
    setCombatants(prev => prev.map(c => 
      c.id === combatant.id ? { ...c, lootCollected: true } : c
    ));
    
    toast.success(`Collected ${lootItems.length} item(s) from ${combatant.name}!`);
    setShowLootPanel(true);
  };

  // Add collected loot to party inventory
  const addLootToInventory = async () => {
    if (collectedLoot.length === 0) {
      toast.info('No loot to add');
      return;
    }

    try {
      let added = 0;
      for (const loot of collectedLoot) {
        await axios.post(`${API}/campaigns/${campaignId}/inventory`, {
          name: loot.name,
          quantity: loot.quantity || 1,
          item_type: loot.item_type || 'misc',
          value: loot.value || '',
          is_magical: loot.is_magical || false,
          description: `Looted from ${loot.source}`,
          notes: `Combat loot - Round ${round}`
        });
        added++;
      }
      
      toast.success(`Added ${added} item(s) to party inventory!`);
      setCollectedLoot([]);
      setShowLootPanel(false);
    } catch (error) {
      toast.error('Failed to add loot to inventory');
    }
  };

  // Get total loot available from defeated enemies
  const defeatedWithLoot = combatants.filter(c => 
    c.type !== 'player' && 
    c.hp <= 0 && 
    c.loot?.length > 0 && 
    !c.lootCollected
  );

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

  // Add NPC/Creature to combat mid-battle
  const addCombatant = (newCombatant) => {
    const updated = [...combatants, newCombatant].sort((a, b) => b.initiative - a.initiative);
    const newIndex = updated.findIndex(c => c.id === newCombatant.id);
    
    // Adjust currentTurn if new combatant is inserted before current
    if (newIndex <= currentTurn) {
      setCurrentTurn(prev => prev + 1);
    }
    
    setCombatants(updated);
    
    // Add token to map
    const tokenX = 100 + (tokens.length * 60) % 600;
    const tokenY = 100 + Math.floor(tokens.length / 10) * 60;
    setTokens(prev => [...prev, {
      id: newCombatant.id,
      name: newCombatant.name,
      x: tokenX,
      y: tokenY,
      size: 50,
      color: newCombatant.isEnemy ? '#ef4444' : '#F59E0B',
      isEnemy: newCombatant.isEnemy
    }]);
  };

  // Toggle ability card expansion for a combatant
  const toggleAbilities = (id) => {
    setExpandedAbilities(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
    
    ctx.fillStyle = '#0A1628';
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
      ctx.strokeStyle = isSelected ? '#fff' : isCurrent ? '#F59E0B' : 'rgba(0,0,0,0.5)';
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
        ctx.fillStyle = pct > 0.5 ? '#F59E0B' : pct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(token.x - barW / 2, token.y + token.size / 2 + 18, barW * pct, barH);
      }
    });
    
    ctx.restore();
  }, [mapImage, tokens, selectedToken, showGrid, gridSize, zoom, pan, combatants, currentTurn]);

  if (!scenarioData) return null;

  // Unified navy and gold theme
  const theme = {
    bg: { primary: '#0A1628', surface: '#0F2440', panel: 'rgba(15, 36, 64, 0.95)' },
    text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
    border: 'rgba(212, 160, 23, 0.35)',
    sunset: { purple: '#D4A017', pink: '#F5C542', gold: '#D4A017' },
    gradient: 'linear-gradient(135deg, #D4A017, #F5C542)'
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0A1628',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: '#0F2440',
        borderBottom: '1px solid rgba(212, 160, 23, 0.35)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button data-testid="combat-back-btn" onClick={endCombat} title="Back to GM Screen"
            style={{
              background: 'rgba(212, 160, 23, 0.10)',
              border: '1px solid rgba(212, 160, 23, 0.35)',
              borderRadius: '10px', padding: '8px 12px',
              color: '#D4A017', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <ArrowLeft size={18} /> Back
          </Button>
          <div>
            <h1 style={{ fontSize: '22px', color: theme.text.primary, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sword size={22} style={{ color: '#D4A017' }} />
              {scenarioData.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#94A3B8' }}>{campaignName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div data-testid="combat-round-counter" style={{ 
            background: 'rgba(212, 160, 23, 0.12)', 
            border: '1px solid #D4A017', 
            borderRadius: '12px', 
            padding: '8px 18px',
            color: '#D4A017',
            fontWeight: '800',
            fontSize: '16px',
            letterSpacing: 1,
          }}>
            ROUND {round}
          </div>
          <button data-testid="toggle-monster-hp"
            onClick={() => setHideMonsterHp(v => !v)}
            title={hideMonsterHp ? 'Monster HP is hidden — show numeric values' : 'Hide monster HP for screen-share play'}
            style={{
              background: hideMonsterHp ? 'rgba(212, 160, 23, 0.18)' : 'transparent',
              border: '1px solid rgba(212, 160, 23, 0.40)',
              borderRadius: '10px',
              padding: '8px 14px',
              color: '#D4A017',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.5,
              cursor: 'pointer',
            }}>
            {hideMonsterHp ? 'HP HIDDEN' : 'HIDE HP'}
          </button>
          <Button onClick={nextTurn} style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: '#D4A017', border: 'none', borderRadius: '10px', color: '#0A1628', fontWeight: '800' }}>
            <SkipForward size={18} /> Next Turn
          </Button>
          <Button onClick={endCombat} style={{ display: 'flex', gap: '8px', padding: '12px 20px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.text.secondary }}>
            <X size={18} /> End Combat
          </Button>
        </div>
      </div>

      {/* Main Content - Initiative Left, Map Right */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '420px 1fr', gap: '0' }}>
        {/* LEFT - Initiative Order */}
        <div style={{ 
          background: theme.bg.panel,
          backdropFilter: 'blur(16px)',
          borderRight: `1px solid ${theme.border}`,
          padding: '20px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 70px)'
        }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', color: theme.text.primary, fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: theme.sunset.purple }} />
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
                  draggable
                  onDragStart={handleDragStart(c.id)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(c.id)}
                  data-testid={`initiative-card-${c.id}`}
                  title="Drag to reorder initiative"
                  style={{
                    background: isCurrent ? 'rgba(16, 185, 129, 0.15)' : isDead ? 'rgba(30,30,30,0.5)' : isDown ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 22, 40, 0.72)',
                    border: `2px solid ${isCurrent ? '#10B981' : isDead ? '#64748b' : isDown ? '#ef4444' : c.type === 'player' ? theme.sunset.purple : '#ef4444'}`,
                    borderRadius: '14px',
                    padding: '14px',
                    opacity: draggedId === c.id ? 0.4 : isDead ? 0.5 : 1,
                    boxShadow: isCurrent ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none',
                    transition: 'all 0.3s',
                    cursor: 'grab',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: isCurrent ? '#10B981' : c.type === 'player' ? theme.sunset.purple : '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800', fontSize: '18px', color: c.type === 'player' && !isCurrent ? '#0A1628' : '#fff', fontFamily: "'Montserrat', sans-serif",
                      boxShadow: isCurrent ? '0 0 15px rgba(16, 185, 129, 0.6)' : 'none'
                    }}>
                      {c.initiative}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: isDead ? '#64748b' : theme.text.primary, fontFamily: "'Montserrat', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.name}
                        {isDead && <Skull size={14} />}
                        {isCurrent && !isDown && <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16,185,129,0.2)', padding: '3px 10px', borderRadius: '10px', fontWeight: '800' }}>TURN</span>}
                        {isDown && !isDead && !isStable && <span style={{ fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.2)', padding: '3px 10px', borderRadius: '10px', fontWeight: '800' }}>DYING</span>}
                        {isStable && <span style={{ fontSize: '11px', color: '#eab308', background: 'rgba(234,179,8,0.2)', padding: '3px 10px', borderRadius: '10px', fontWeight: '800' }}>STABLE</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.text.muted }}>
                        {c.type === 'player' ? 'Player' : 'Enemy'} • Rolled: {c.initiativeRoll}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(212, 160, 23, 0.10)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                      <Shield size={14} style={{ color: theme.sunset.gold }} />
                      <span style={{ fontWeight: '800', fontSize: '15px', color: theme.text.primary }}>{c.ac}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moveInOrder(c.id, 'up')} style={{ background: 'transparent', border: 'none', color: theme.text.muted, cursor: 'pointer', padding: '2px' }}><ChevronUp size={16} /></button>
                      <button onClick={() => moveInOrder(c.id, 'down')} style={{ background: 'transparent', border: 'none', color: theme.text.muted, cursor: 'pointer', padding: '2px' }}><ChevronDown size={16} /></button>
                    </div>
                    <button onClick={() => removeCombatant(c.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                  </div>

                  {/* HP Bar */}
                  <div style={{ marginBottom: isDown && !isDead ? '12px' : '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={14} style={{ color: hpPct > 50 ? '#10B981' : hpPct > 25 ? '#eab308' : '#ef4444' }} />
                        <span title={hideMonsterHp && c.type !== 'player' ? `${c.hp} / ${c.maxHp} (hidden from view)` : undefined}
                          style={{ fontSize: '15px', color: theme.text.primary, fontWeight: '800' }}>
                          {hideMonsterHp && c.type !== 'player'
                            ? (hpPct > 75 ? 'Healthy' : hpPct > 50 ? 'Wounded' : hpPct > 25 ? 'Bloodied' : hpPct > 0 ? 'Critical' : 'Down')
                            : `${c.hp} / ${c.maxHp}`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[-10, -5, -1, 1, 5, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => updateHP(c.id, n)}
                            style={{
                              background: n < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                              border: `1px solid ${n < 0 ? '#ef4444' : '#10B981'}`,
                              borderRadius: '6px',
                              color: n < 0 ? '#ef4444' : '#10B981',
                              padding: '4px 8px',
                              fontSize: '13px',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            {n > 0 ? '+' : ''}{n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ height: '10px', background: 'rgba(15,10,30,0.8)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 50 ? '#10B981' : hpPct > 25 ? '#eab308' : '#ef4444', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Death Saves */}
                  {isDown && !isDead && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #ef4444', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Skull size={14} /> Death Saves</span>
                        <Button onClick={() => rollDeathSave(c.id)} style={{ padding: '6px 14px', fontSize: '13px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }} disabled={isStable}>
                          <CircleDot size={14} style={{ marginRight: '4px' }} /> Roll
                        </Button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#10B981', marginBottom: '6px', fontWeight: '800' }}>Success</div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #10B981', background: i < c.deathSaves.successes ? '#10B981' : 'transparent' }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '6px', fontWeight: '800' }}>Failure</div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ef4444', background: i < c.deathSaves.failures ? '#ef4444' : 'transparent' }} />
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
                            title={cond.desc}
                            style={{
                              background: active ? `${cond.color}30` : 'transparent',
                              border: `1px solid ${active ? cond.color : theme.border}`,
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              color: active ? cond.color : theme.text.muted,
                              cursor: 'pointer',
                              fontWeight: active ? '600' : '500'
                            }}
                          >
                            {cond.label}
                          </button>
                        </QuickReferencePopup>
                      );
                    })}
                  </div>

                  {/* Creature Abilities - Clickable actions with dice */}
                  {c.type !== 'player' && c.abilities && (
                    <CreatureAbilityCard 
                      creature={c}
                      compact={true}
                      onRollResult={(result) => {
                        toast.success(`${result.ability}: ${result.totalDamage} damage!`);
                      }}
                    />
                  )}

                  {/* Attack Button - Show for enemies that are alive */}
                  {c.type !== 'player' && c.hp > 0 && (
                    <button
                      onClick={() => setAttackingCreature(attackingCreature?.id === c.id ? null : c)}
                      data-testid={`attack-btn-${c.id}`}
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '10px',
                        background: attackingCreature?.id === c.id 
                          ? 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)' 
                          : 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 0 15px rgba(249, 115, 22, 0.4)'
                      }}
                    >
                      <Target size={16} /> {attackingCreature?.id === c.id ? 'Close Attack Panel' : 'Attack'}
                    </button>
                  )}
                  
                  {/* Attack Roller Panel */}
                  {attackingCreature?.id === c.id && (
                    <AttackRoller 
                      creature={c}
                      onClose={() => setAttackingCreature(null)}
                      onDamageApplied={(damage) => {
                        toast.info(`Apply ${damage} damage to a target using the HP buttons above`);
                      }}
                    />
                  )}

                  {/* Loot Button - Show when enemy is defeated and has loot */}
                  {c.type !== 'player' && c.hp <= 0 && c.loot?.length > 0 && !c.lootCollected && (
                    <button
                      onClick={() => collectLoot(c)}
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '10px',
                        background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 0 20px rgba(234, 179, 8, 0.5)',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <Coins size={16} /> Collect Loot ({c.loot.length} items)
                    </button>
                  )}
                  
                  {/* Loot collected indicator */}
                  {c.lootCollected && (
                    <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #F59E0B', borderRadius: '8px', textAlign: 'center', fontSize: '11px', color: '#F59E0B', fontWeight: '800' }}>
                      <Package size={12} style={{ marginRight: '4px', display: 'inline' }} /> Loot Collected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Add NPCs/Creatures to Combat */}
          <div style={{ marginTop: '16px' }}>
            <NPCCombatRecruiter 
              campaignId={campaignId}
              existingCombatantIds={combatants.map(c => c.id)}
              onAddNPC={addCombatant}
            />
          </div>
        </div>

        {/* RIGHT - Battle Map */}
        <div style={{ position: 'relative', background: '#0A1628' }}>
          {/* Map Controls */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', gap: '8px' }}>
            <Button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="btn-icon" style={{ background: 'rgba(15,36,64,0.92)' }}><ZoomIn size={18} /></Button>
            <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="btn-icon" style={{ background: 'rgba(15,36,64,0.92)' }}><ZoomOut size={18} /></Button>
            <Button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="btn-icon" style={{ background: 'rgba(15,36,64,0.92)' }}><RotateCcw size={18} /></Button>
            <Button onClick={() => setShowGrid(!showGrid)} className="btn-icon" style={{ background: 'rgba(15,36,64,0.92)', color: showGrid ? '#F59E0B' : '#64748b' }}><Grid size={18} /></Button>
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

      {/* Loot Panel */}
      {showLootPanel && collectedLoot.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '350px',
          background: 'rgba(15, 36, 64, 0.98)',
          border: '2px solid #eab308',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 0 40px rgba(234, 179, 8, 0.3)',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', color: '#eab308', fontFamily: 'Montserrat', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={18} /> Collected Loot ({collectedLoot.length})
            </h3>
            <button onClick={() => setShowLootPanel(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
          
          <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '12px' }}>
            {collectedLoot.map((loot, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', marginBottom: '6px' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {loot.name}
                    {loot.is_magical && <span style={{ color: '#eab308' }}>✨</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    x{loot.quantity || 1} • From: {loot.source}
                    {loot.value && <span style={{ color: '#eab308', marginLeft: '6px' }}>{loot.value}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={addLootToInventory} 
            className="btn-primary" 
            style={{ 
              width: '100%', 
              display: 'flex', 
              gap: '8px', 
              justifyContent: 'center',
              background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)',
              color: '#000'
            }}
          >
            <Package size={16} /> Add All to Party Inventory
          </Button>
        </div>
      )}

      {/* Loot Available Indicator */}
      {!showLootPanel && (collectedLoot.length > 0 || defeatedWithLoot.length > 0) && (
        <button
          onClick={() => setShowLootPanel(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            color: '#000',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.5)',
            zIndex: 100
          }}
        >
          <Coins size={18} />
          {collectedLoot.length > 0 ? `${collectedLoot.length} Loot` : `${defeatedWithLoot.length} Loot Available`}
        </button>
      )}

      {/* Map Selector Button */}
      {availableMaps.length > 0 && !selectedMap && (
        <button
          onClick={() => setShowMapSelector(true)}
          data-testid="load-map-btn"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            padding: '14px 20px',
            background: 'linear-gradient(180deg, #D4A017 0%, #A87912 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#0A1628',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 30px rgba(212, 160, 23, 0.25)',
            zIndex: 100
          }}
        >
          <Map size={18} />
          Load Battle Map ({availableMaps.length})
        </button>
      )}

      {/* Map Selector Modal */}
      {showMapSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(15, 36, 64, 0.96)',
            border: '2px solid rgba(212, 160, 23, 0.35)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Map size={24} color="#D4A017" />
                Select Battle Map
              </h2>
              <button data-testid="close-map-selector-btn" onClick={() => setShowMapSelector(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {availableMaps.map(map => (
                <button
                  key={map.id}
                  onClick={() => loadMapIntoCombat(map)}
                  style={{
                    background: 'rgba(212, 160, 23, 0.10)',
                    border: '2px solid rgba(212, 160, 23, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    height: '80px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Map size={32} color="#D4A017" style={{ opacity: 0.5 }} />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '800', margin: '0 0 4px 0' }}>
                    {map.name}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                    {map.width}x{map.height} grid
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ROOK AI Suggestion Popup */}
      {currentSuggestion && (
        <RookSuggestionPopup
          suggestion={currentSuggestion}
          onDismiss={dismissSuggestion}
          position="bottom-right"
          autoHide={true}
          autoHideDelay={12000}
        />
      )}

      <QuickReferenceModal isOpen={showQuickRef} onClose={() => setShowQuickRef(false)} />
    </div>
  );
}

export default CombatPage;
