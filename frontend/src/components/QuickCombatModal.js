import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, Search, Plus, Minus, Sword, Users, Shield, Heart, 
  Skull, Play, Trash2, Sparkles 
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function QuickCombatModal({ isOpen, onClose, campaignId, players, customCreatures, onStartCombat }) {
  const [monsters, setMonsters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [combatants, setCombatants] = useState([]);
  const [encounterName, setEncounterName] = useState('Quick Encounter');
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMonsters();
      // Auto-add players to combatants
      const playerCombatants = players.map(p => ({
        id: `player-${p.id || Math.random().toString(36).substr(2, 9)}`,
        name: p.name,
        type: 'player',
        hp: p.maxHp || 20,
        maxHp: p.maxHp || 20,
        ac: p.ac || 10,
        initiative: 0,
        initiativeMod: p.initiativeMod || 0,
        isPlayer: true
      }));
      setCombatants(playerCombatants);
    }
  }, [isOpen, players]);

  useEffect(() => {
    if (searchTerm.trim()) {
      // Search both monsters and custom creatures
      const monsterResults = monsters.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 15);
      
      const customResults = (customCreatures || []).filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.type?.toLowerCase().includes(searchTerm.toLowerCase())
      ).map(c => ({ ...c, isCustom: true }));
      
      setFilteredResults([...customResults, ...monsterResults]);
    } else {
      setFilteredResults([]);
    }
  }, [searchTerm, monsters, customCreatures]);

  const fetchMonsters = async () => {
    try {
      const response = await axios.get(`${API}/monsters`);
      setMonsters(response.data || []);
    } catch (error) {
      console.error('Failed to fetch monsters:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCR = (cr) => {
    if (cr === 0.125 || cr === '1/8') return '1/8';
    if (cr === 0.25 || cr === '1/4') return '1/4';
    if (cr === 0.5 || cr === '1/2') return '1/2';
    return cr?.toString() || '?';
  };

  const addCreature = (creature, count = 1) => {
    const newCombatants = [];
    for (let i = 0; i < count; i++) {
      const suffix = count > 1 ? ` #${combatants.filter(c => c.baseName === creature.name).length + i + 1}` : '';
      newCombatants.push({
        id: `enemy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${creature.name}${suffix}`,
        baseName: creature.name,
        type: 'enemy',
        hp: creature.hp || creature.hit_points || 10,
        maxHp: creature.hp || creature.hit_points || 10,
        ac: creature.ac || creature.armor_class || 10,
        initiative: 0,
        initiativeMod: creature.dexterity ? Math.floor((creature.dexterity - 10) / 2) : 0,
        cr: creature.cr || creature.challenge_rating,
        creatureType: creature.type,
        size: creature.size,
        speed: creature.speed,
        abilities: creature.abilities || creature.actions,
        isCustom: creature.isCustom || false,
        // Store full creature data for attack buttons
        fullData: creature
      });
    }
    setCombatants(prev => [...prev, ...newCombatants]);
    toast.success(`Added ${count}x ${creature.name}`);
    setSearchTerm('');
  };

  const removeCombatant = (id) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
  };

  const updateCombatantCount = (baseName, delta) => {
    const existing = combatants.filter(c => c.baseName === baseName && c.type === 'enemy');
    if (delta > 0) {
      const template = existing[0];
      if (template) {
        addCreature(template.fullData || template, delta);
      }
    } else if (delta < 0 && existing.length > 0) {
      // Remove the last one
      const toRemove = existing[existing.length - 1];
      removeCombatant(toRemove.id);
    }
  };

  const handleStartCombat = () => {
    if (combatants.length === 0) {
      toast.error('Add at least one combatant');
      return;
    }
    
    const scenario = {
      id: `quick-${Date.now()}`,
      name: encounterName,
      combatants: combatants.map(c => ({
        ...c,
        initiative: Math.floor(Math.random() * 20) + 1 + (c.initiativeMod || 0)
      }))
    };
    
    onStartCombat(scenario);
  };

  if (!isOpen) return null;

  // Group enemies by base name for display
  const enemyGroups = combatants
    .filter(c => c.type === 'enemy')
    .reduce((acc, c) => {
      const key = c.baseName || c.name;
      if (!acc[key]) {
        acc[key] = { ...c, count: 1 };
      } else {
        acc[key].count++;
      }
      return acc;
    }, {});

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a0a2e 0%, #1e1e4a 100%)',
        border: '2px solid #ef4444',
        borderRadius: '20px',
        padding: '24px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 0 60px rgba(239, 68, 68, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '24px', 
              fontFamily: "Eros Book, sans-serif",
              fontWeight: '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sword size={24} color="#ef4444" />
              Quick Combat
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Add creatures and start combat instantly
            </p>
          </div>
          <button
            onClick={onClose}
            data-testid="close-quick-combat"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer'
            }}
          >
            <X size={24} color="#fff" />
          </button>
        </div>

        {/* Encounter Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Encounter Name</label>
          <Input
            value={encounterName}
            onChange={(e) => setEncounterName(e.target.value)}
            data-testid="encounter-name-input"
            style={{ maxWidth: '300px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left - Search & Add */}
          <div>
            <h3 style={{ color: '#ef4444', fontSize: '14px', fontWeight: '400', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skull size={16} /> Add Creatures
            </h3>

            {/* Toggle Custom/Database */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setShowCustom(false)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: !showCustom ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  border: `2px solid ${!showCustom ? '#ef4444' : '#374151'}`,
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Monster Database
              </button>
              <button
                onClick={() => setShowCustom(true)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: showCustom ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  border: `2px solid ${showCustom ? '#a855f7' : '#374151'}`,
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={12} /> Custom Creatures
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={showCustom ? "Search custom creatures..." : "Search monsters..."}
                data-testid="creature-search-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>

            {/* Search Results */}
            {searchTerm && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid #374151',
                borderRadius: '12px',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                {filteredResults.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No creatures found
                  </div>
                ) : (
                  filteredResults.map((creature, idx) => (
                    <div
                      key={`${creature.name}-${idx}`}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #1f2937',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {creature.name}
                          {creature.isCustom && <Sparkles size={12} color="#a855f7" />}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>
                          CR {formatCR(creature.cr || creature.challenge_rating)} • {creature.type} • HP {creature.hp || creature.hit_points}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2, 3].map(n => (
                          <Button
                            key={n}
                            onClick={() => addCreature(creature, n)}
                            data-testid={`add-${creature.name}-${n}`}
                            style={{
                              padding: '6px 10px',
                              fontSize: '11px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid #ef4444',
                              color: '#ef4444'
                            }}
                          >
                            +{n}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Quick Add Custom Creatures */}
            {showCustom && !searchTerm && customCreatures && customCreatures.length > 0 && (
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid #6b21a8',
                borderRadius: '12px',
                padding: '12px',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                <p style={{ color: '#c4b5fd', fontSize: '11px', marginBottom: '10px' }}>Your Custom Creatures:</p>
                {customCreatures.map(creature => (
                  <div
                    key={creature.id}
                    style={{
                      padding: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: '400' }}>{creature.name}</div>
                      <div style={{ color: '#64748b', fontSize: '10px' }}>CR {creature.cr} • HP {creature.hp}</div>
                    </div>
                    <Button
                      onClick={() => addCreature({ ...creature, isCustom: true }, 1)}
                      style={{ padding: '4px 8px', fontSize: '10px' }}
                      className="btn-primary"
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right - Combatants List */}
          <div>
            <h3 style={{ color: '#4a7dff', fontSize: '14px', fontWeight: '400', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> Combatants ({combatants.length})
            </h3>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '2px solid #374151',
              borderRadius: '12px',
              padding: '12px',
              maxHeight: '350px',
              overflowY: 'auto'
            }}>
              {/* Players */}
              {combatants.filter(c => c.type === 'player').length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ color: '#4a7dff', fontSize: '11px', fontWeight: '400', marginBottom: '8px' }}>PLAYERS</p>
                  {combatants.filter(c => c.type === 'player').map(c => (
                    <div key={c.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'rgba(74, 125, 255, 0.1)',
                      border: '1px solid #4a7dff',
                      borderRadius: '8px',
                      marginBottom: '6px'
                    }}>
                      <span style={{ color: '#fff', fontSize: '13px' }}>{c.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
                        <span><Shield size={12} style={{ display: 'inline' }} /> {c.ac}</span>
                        <span><Heart size={12} style={{ display: 'inline' }} /> {c.hp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enemies */}
              {Object.keys(enemyGroups).length > 0 && (
                <div>
                  <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: '400', marginBottom: '8px' }}>ENEMIES</p>
                  {Object.values(enemyGroups).map(group => (
                    <div key={group.baseName} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      marginBottom: '6px'
                    }}>
                      <div>
                        <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {group.baseName}
                          {group.isCustom && <Sparkles size={10} color="#a855f7" />}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '10px' }}>
                          CR {formatCR(group.cr)} • AC {group.ac} • HP {group.hp}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => updateCombatantCount(group.baseName, -1)}
                          style={{
                            width: '24px', height: '24px',
                            background: 'rgba(239, 68, 68, 0.3)',
                            border: '1px solid #ef4444',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ color: '#fff', fontWeight: '400', minWidth: '20px', textAlign: 'center' }}>
                          {group.count}
                        </span>
                        <button
                          onClick={() => updateCombatantCount(group.baseName, 1)}
                          style={{
                            width: '24px', height: '24px',
                            background: 'rgba(34, 197, 94, 0.3)',
                            border: '1px solid #22c55e',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {combatants.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <Skull size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ fontSize: '13px' }}>No combatants added</p>
                  <p style={{ fontSize: '11px' }}>Search and add creatures above</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start Combat Button */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button onClick={onClose} className="btn-outline">Cancel</Button>
          <Button
            onClick={handleStartCombat}
            disabled={combatants.filter(c => c.type === 'enemy').length === 0}
            data-testid="start-quick-combat-btn"
            style={{
              background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
              opacity: combatants.filter(c => c.type === 'enemy').length === 0 ? 0.5 : 1
            }}
          >
            <Play size={18} /> Start Combat
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuickCombatModal;
