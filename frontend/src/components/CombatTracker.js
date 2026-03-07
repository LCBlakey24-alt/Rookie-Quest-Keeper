import React, { useState, useEffect } from 'react';
import { Swords, Play, SkipForward, Plus, Trash2, Heart, Shield, Skull, RotateCcw, ChevronUp, ChevronDown, Zap, BookOpen, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QuickReferencePopup, QuickReferenceModal, CONDITIONS_REFERENCE } from '@/components/QuickReference';

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

function CombatTracker({ players = [], npcs = [] }) {
  const [combatActive, setCombatActive] = useState(false);
  const [combatants, setCombatants] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCombatant, setNewCombatant] = useState({ name: '', hp: 10, ac: 10, initiative: 0, isEnemy: true });
  const [showReference, setShowReference] = useState(false);

  const rollD20 = () => Math.floor(Math.random() * 20) + 1;
  const getInitMod = (dex) => Math.floor((dex - 10) / 2);

  const startCombat = () => {
    const allCombatants = [];

    players.forEach(player => {
      const dexMod = getInitMod(player.stats?.dexterity || 10);
      const roll = rollD20();
      allCombatants.push({
        id: `player-${player.id}`,
        name: player.name,
        type: 'player',
        hp: player.hp || player.max_hp || 10,
        maxHp: player.max_hp || 10,
        ac: player.ac || 10,
        initiative: roll + dexMod,
        initiativeRoll: roll,
        initiativeMod: dexMod,
        conditions: [],
        isEnemy: false,
        deathSaves: { successes: 0, failures: 0 }
      });
    });

    npcs.forEach(npc => {
      const roll = rollD20();
      allCombatants.push({
        id: `npc-${npc.id}`,
        name: npc.name,
        type: 'npc',
        hp: npc.hp || 10,
        maxHp: npc.hp || 10,
        ac: npc.ac || 10,
        initiative: roll,
        initiativeRoll: roll,
        initiativeMod: 0,
        conditions: [],
        isEnemy: true,
        deathSaves: { successes: 0, failures: 0 }
      });
    });

    allCombatants.sort((a, b) => b.initiative - a.initiative);
    setCombatants(allCombatants);
    setCurrentTurn(0);
    setRound(1);
    setCombatActive(true);
    toast.success('Combat started! Initiative rolled for all combatants.');
  };

  const addCombatant = () => {
    if (!newCombatant.name.trim()) {
      toast.error('Enter a name');
      return;
    }

    const roll = rollD20();
    const newEntry = {
      id: `custom-${Date.now()}`,
      name: newCombatant.name,
      type: 'custom',
      hp: parseInt(newCombatant.hp) || 10,
      maxHp: parseInt(newCombatant.hp) || 10,
      ac: parseInt(newCombatant.ac) || 10,
      initiative: roll + (parseInt(newCombatant.initiative) || 0),
      initiativeRoll: roll,
      initiativeMod: parseInt(newCombatant.initiative) || 0,
      conditions: [],
      isEnemy: newCombatant.isEnemy,
      deathSaves: { successes: 0, failures: 0 }
    };

    const updated = [...combatants, newEntry].sort((a, b) => b.initiative - a.initiative);
    const newIndex = updated.findIndex(c => c.id === newEntry.id);
    if (newIndex <= currentTurn) {
      setCurrentTurn(currentTurn + 1);
    }
    
    setCombatants(updated);
    setNewCombatant({ name: '', hp: 10, ac: 10, initiative: 0, isEnemy: true });
    setShowAddForm(false);
    toast.success(`${newEntry.name} joined combat!`);
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

  const updateHP = (id, change) => {
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + change));
        const wasUnconscious = c.hp <= 0;
        const nowUnconscious = newHp <= 0;
        
        // Reset death saves when dropping to 0 or healing from 0
        let newDeathSaves = c.deathSaves;
        if (!wasUnconscious && nowUnconscious) {
          newDeathSaves = { successes: 0, failures: 0 };
          toast.warning(`${c.name} is unconscious! Begin death saves.`);
        } else if (wasUnconscious && !nowUnconscious) {
          newDeathSaves = { successes: 0, failures: 0 };
          toast.success(`${c.name} is back up!`);
        }
        
        return { ...c, hp: newHp, deathSaves: newDeathSaves };
      }
      return c;
    }));
  };

  // Death Save functions
  const rollDeathSave = (id) => {
    const roll = rollD20();
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        let newSaves = { ...c.deathSaves };
        
        if (roll === 20) {
          // Natural 20: regain 1 HP
          toast.success(`${c.name} rolled a Natural 20! They regain 1 HP and are conscious!`);
          return { ...c, hp: 1, deathSaves: { successes: 0, failures: 0 } };
        } else if (roll === 1) {
          // Natural 1: 2 failures
          newSaves.failures = Math.min(3, newSaves.failures + 2);
          toast.error(`${c.name} rolled a Natural 1! Two death save failures!`);
        } else if (roll >= 10) {
          newSaves.successes = Math.min(3, newSaves.successes + 1);
          toast.success(`${c.name} rolled ${roll} - Success! (${newSaves.successes}/3)`);
        } else {
          newSaves.failures = Math.min(3, newSaves.failures + 1);
          toast.error(`${c.name} rolled ${roll} - Failure! (${newSaves.failures}/3)`);
        }
        
        // Check for stabilization or death
        if (newSaves.successes >= 3) {
          toast.success(`${c.name} has stabilized!`);
        } else if (newSaves.failures >= 3) {
          toast.error(`${c.name} has died!`);
        }
        
        return { ...c, deathSaves: newSaves };
      }
      return c;
    }));
  };

  const setDeathSave = (id, type, value) => {
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        const newSaves = { ...c.deathSaves, [type]: value };
        
        if (newSaves.successes >= 3) {
          toast.success(`${c.name} has stabilized!`);
        } else if (newSaves.failures >= 3) {
          toast.error(`${c.name} has died!`);
        }
        
        return { ...c, deathSaves: newSaves };
      }
      return c;
    }));
  };

  const toggleCondition = (id, conditionId) => {
    setCombatants(combatants.map(c => {
      if (c.id === id) {
        const hasCondition = c.conditions.includes(conditionId);
        return {
          ...c,
          conditions: hasCondition 
            ? c.conditions.filter(cond => cond !== conditionId)
            : [...c.conditions, conditionId]
        };
      }
      return c;
    }));
  };

  const removeCombatant = (id) => {
    const index = combatants.findIndex(c => c.id === id);
    setCombatants(combatants.filter(c => c.id !== id));
    if (index < currentTurn) {
      setCurrentTurn(Math.max(0, currentTurn - 1));
    } else if (index === currentTurn && currentTurn >= combatants.length - 1) {
      setCurrentTurn(0);
    }
  };

  const endCombat = () => {
    setCombatActive(false);
    setCombatants([]);
    setCurrentTurn(0);
    setRound(1);
    toast.success('Combat ended!');
  };

  const moveInOrder = (id, direction) => {
    const index = combatants.findIndex(c => c.id === id);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= combatants.length) return;
    
    const updated = [...combatants];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCombatants(updated);
    
    if (index === currentTurn) {
      setCurrentTurn(newIndex);
    } else if (newIndex === currentTurn) {
      setCurrentTurn(index);
    }
  };

  // Death Save Indicator Component
  const DeathSaveIndicator = ({ saves, type, combatantId }) => {
    const color = type === 'successes' ? '#22c55e' : '#ef4444';
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <button
            key={i}
            onClick={() => setDeathSave(combatantId, type, i < saves ? i : i + 1)}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${color}`,
              background: i < saves ? color : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="glow-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          color: '#ffffff',
          fontFamily: 'Cityworm, sans-serif',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Swords size={22} style={{ color: '#ef4444' }} />
          Combat Tracker
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            onClick={() => setShowReference(true)}
            className="btn-icon"
            style={{ padding: '6px' }}
            title="Quick Reference"
          >
            <BookOpen size={16} />
          </Button>
          {combatActive && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#ef4444',
              fontFamily: 'Cityworm, sans-serif'
            }}>
              Round {round}
            </div>
          )}
        </div>
      </div>

      {!combatActive ? (
        <div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
            Start combat to auto-roll initiative for all players and NPCs. You can add more combatants during battle.
          </p>
          
          <div style={{ 
            background: 'rgba(10, 10, 40, 0.4)', 
            borderRadius: '10px', 
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#67e8f9', fontSize: '13px', fontWeight: '600' }}>Players</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{players.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#67e8f9', fontSize: '13px', fontWeight: '600' }}>NPCs</span>
              <span style={{ color: '#ffffff', fontWeight: '700' }}>{npcs.length}</span>
            </div>
          </div>

          <Button
            onClick={startCombat}
            className="btn-secondary"
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)'
            }}
          >
            <Zap size={18} />
            Start Combat
          </Button>
        </div>
      ) : (
        <div>
          {/* Combat controls */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <Button
              onClick={nextTurn}
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <SkipForward size={16} />
              Next Turn
            </Button>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
            </Button>
            <Button
              onClick={endCombat}
              className="btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={16} />
            </Button>
          </div>

          {/* Add combatant form */}
          {showAddForm && (
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.6)', 
              border: '2px solid #1e40af',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px', gap: '8px', marginBottom: '10px' }}>
                <Input
                  placeholder="Name"
                  value={newCombatant.name}
                  onChange={(e) => setNewCombatant({ ...newCombatant, name: e.target.value })}
                  className="input-glow"
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                />
                <Input
                  placeholder="HP"
                  type="number"
                  value={newCombatant.hp}
                  onChange={(e) => setNewCombatant({ ...newCombatant, hp: e.target.value })}
                  className="input-glow"
                  style={{ fontSize: '13px', padding: '8px', textAlign: 'center' }}
                />
                <Input
                  placeholder="AC"
                  type="number"
                  value={newCombatant.ac}
                  onChange={(e) => setNewCombatant({ ...newCombatant, ac: e.target.value })}
                  className="input-glow"
                  style={{ fontSize: '13px', padding: '8px', textAlign: 'center' }}
                />
                <Input
                  placeholder="Init"
                  type="number"
                  value={newCombatant.initiative}
                  onChange={(e) => setNewCombatant({ ...newCombatant, initiative: e.target.value })}
                  className="input-glow"
                  style={{ fontSize: '13px', padding: '8px', textAlign: 'center' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={newCombatant.isEnemy}
                    onChange={(e) => setNewCombatant({ ...newCombatant, isEnemy: e.target.checked })}
                    style={{ accentColor: '#ef4444' }}
                  />
                  Enemy
                </label>
                <Button onClick={addCombatant} className="btn-primary" style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '13px' }}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Initiative order */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {combatants.map((combatant, index) => {
              const isCurrentTurn = index === currentTurn;
              const isDead = combatant.deathSaves.failures >= 3;
              const isUnconscious = combatant.hp <= 0 && !isDead;
              const isStabilized = combatant.deathSaves.successes >= 3 && combatant.hp <= 0;
              const hpPercent = (combatant.hp / combatant.maxHp) * 100;
              
              return (
                <div
                  key={combatant.id}
                  style={{
                    background: isCurrentTurn ? 'rgba(34, 197, 94, 0.15)' : 
                               isDead ? 'rgba(30, 30, 30, 0.5)' :
                               isUnconscious ? 'rgba(239, 68, 68, 0.1)' :
                               'rgba(10, 10, 40, 0.4)',
                    border: `2px solid ${isCurrentTurn ? '#22c55e' : isDead ? '#64748b' : isUnconscious ? '#ef4444' : combatant.isEnemy ? '#ef4444' : '#4a7dff'}`,
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '10px',
                    opacity: isDead ? 0.6 : 1,
                    transition: 'all 0.3s',
                    boxShadow: isCurrentTurn ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none'
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isCurrentTurn ? '#22c55e' : combatant.isEnemy ? '#ef4444' : '#4a7dff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '14px',
                      color: '#ffffff',
                      fontFamily: 'Cityworm, sans-serif',
                      flexShrink: 0
                    }}>
                      {combatant.initiative}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '15px', 
                        fontWeight: '700', 
                        color: isDead ? '#64748b' : '#ffffff',
                        fontFamily: 'Cityworm, sans-serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {combatant.name}
                        {isDead && <Skull size={14} style={{ color: '#64748b' }} />}
                        {isStabilized && <span style={{ fontSize: '11px', color: '#eab308' }}>● STABILIZED</span>}
                        {isUnconscious && !isStabilized && <span style={{ fontSize: '11px', color: '#ef4444' }}>● DYING</span>}
                        {isCurrentTurn && !isUnconscious && !isDead && <span style={{ fontSize: '11px', color: '#22c55e' }}>● ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {combatant.isEnemy ? 'Enemy' : 'Ally'} • Roll: {combatant.initiativeRoll}{combatant.initiativeMod !== 0 ? ` + ${combatant.initiativeMod}` : ''}
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      background: 'rgba(10, 10, 40, 0.5)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid #1e40af'
                    }}>
                      <Shield size={14} style={{ color: '#67e8f9' }} />
                      <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '13px' }}>{combatant.ac}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moveInOrder(combatant.id, 'up')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveInOrder(combatant.id, 'down')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <button onClick={() => removeCombatant(combatant.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* HP Bar */}
                  <div style={{ marginBottom: isUnconscious && !isStabilized && !isDead ? '12px' : '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={14} style={{ color: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444' }} />
                        <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                          {combatant.hp} / {combatant.maxHp}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => updateHP(combatant.id, -1)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', padding: '2px 8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>-1</button>
                        <button onClick={() => updateHP(combatant.id, -5)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', padding: '2px 8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>-5</button>
                        <button onClick={() => updateHP(combatant.id, 5)} style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: '6px', color: '#22c55e', padding: '2px 8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>+5</button>
                        <button onClick={() => updateHP(combatant.id, 1)} style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: '6px', color: '#22c55e', padding: '2px 8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>+1</button>
                      </div>
                    </div>
                    <div className="hp-bar" style={{ height: '8px' }}>
                      <div className="hp-bar-fill" style={{ 
                        width: `${hpPercent}%`,
                        background: hpPercent > 50 ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                                   hpPercent > 25 ? 'linear-gradient(90deg, #eab308, #ca8a04)' :
                                   'linear-gradient(90deg, #ef4444, #dc2626)'
                      }} />
                    </div>
                  </div>

                  {/* Death Saves - Only show for unconscious, non-dead combatants */}
                  {isUnconscious && !isDead && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '2px solid #ef4444',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <span style={{ 
                          color: '#ef4444', 
                          fontWeight: '700', 
                          fontSize: '13px',
                          fontFamily: 'Cityworm, sans-serif',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Skull size={16} />
                          Death Saves
                        </span>
                        <Button
                          onClick={() => rollDeathSave(combatant.id)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          disabled={isStabilized}
                        >
                          <CircleDot size={14} style={{ marginRight: '4px' }} />
                          Roll Save
                        </Button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '6px', fontWeight: '600' }}>Successes</div>
                          <DeathSaveIndicator 
                            saves={combatant.deathSaves.successes} 
                            type="successes" 
                            combatantId={combatant.id}
                          />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '6px', fontWeight: '600' }}>Failures</div>
                          <DeathSaveIndicator 
                            saves={combatant.deathSaves.failures} 
                            type="failures" 
                            combatantId={combatant.id}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditions */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {CONDITIONS.map(condition => {
                      const isActive = combatant.conditions.includes(condition.id);
                      return (
                        <QuickReferencePopup key={condition.id} type="condition" id={condition.id} position="bottom">
                          <button
                            onClick={() => toggleCondition(combatant.id, condition.id)}
                            style={{
                              background: isActive ? `${condition.color}30` : 'transparent',
                              border: `1px solid ${isActive ? condition.color : '#1e40af'}`,
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              color: isActive ? condition.color : '#64748b',
                              cursor: 'pointer',
                              fontWeight: isActive ? '600' : '400',
                              transition: 'all 0.2s'
                            }}
                          >
                            {condition.label}
                          </button>
                        </QuickReferencePopup>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {combatants.length === 0 && (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
              No combatants. Add players/NPCs to your campaign first.
            </p>
          )}
        </div>
      )}

      {/* Quick Reference Modal */}
      <QuickReferenceModal isOpen={showReference} onClose={() => setShowReference(false)} />
    </div>
  );
}

export default CombatTracker;
