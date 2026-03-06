import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Swords, Dices, FileText, Search, Plus, Trash2, 
  ChevronUp, ChevronDown, Play, Pause, SkipForward, RefreshCw,
  Shield, Heart, Zap, Users, Clock, BookOpen
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme
const theme = {
  bg: { black: '#0D0D0D', dark: '#141414', panel: '#1A1A1A', card: '#1F1F1F', hover: '#2A2A2A' },
  accent: { red: '#E11D48', redSubtle: 'rgba(225, 29, 72, 0.15)' },
  text: { white: '#FFFFFF', secondary: '#B3B3B3', muted: '#808080' },
  border: 'rgba(255, 255, 255, 0.1)'
};

function SessionMode({ campaignId: propCampaignId }) {
  const { campaignId: paramCampaignId } = useParams();
  const navigate = useNavigate();
  const campaignId = propCampaignId || paramCampaignId;

  // Combat State
  const [combatants, setCombatants] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [combatActive, setCombatActive] = useState(false);
  const [newCombatant, setNewCombatant] = useState({ name: '', initiative: '', hp: '', ac: '' });

  // Quick Notes State
  const [quickNote, setQuickNote] = useState('');
  const [sessionNotes, setSessionNotes] = useState([]);

  // Quick Reference State
  const [searchTerm, setSearchTerm] = useState('');
  const [conditions] = useState([
    { name: 'Blinded', effect: 'Auto-fail sight checks, disadvantage on attacks' },
    { name: 'Charmed', effect: 'Cannot attack charmer' },
    { name: 'Frightened', effect: 'Disadvantage while source visible' },
    { name: 'Grappled', effect: 'Speed 0' },
    { name: 'Incapacitated', effect: 'No actions or reactions' },
    { name: 'Paralyzed', effect: 'Auto-fail STR/DEX, attacks have advantage' },
    { name: 'Poisoned', effect: 'Disadvantage on attacks and checks' },
    { name: 'Prone', effect: 'Disadvantage on attacks, melee adv against' },
    { name: 'Restrained', effect: 'Speed 0, disadvantage on attacks/DEX saves' },
    { name: 'Stunned', effect: 'Incapacitated, auto-fail STR/DEX' },
    { name: 'Unconscious', effect: 'Incapacitated, prone, auto-crit in 5ft' },
  ]);

  // Dice Rolling
  const [lastRoll, setLastRoll] = useState(null);

  // Load session notes on mount
  useEffect(() => {
    if (campaignId) {
      loadSessionNotes();
    }
  }, [campaignId]);

  const loadSessionNotes = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/session-notes`);
      setSessionNotes(response.data.notes || []);
    } catch (error) {
      // Session notes endpoint may not exist yet, that's fine
      console.log('Session notes not available');
    }
  };

  // Combat Functions
  const addCombatant = () => {
    if (!newCombatant.name || !newCombatant.initiative) {
      toast.error('Name and initiative required');
      return;
    }
    const combatant = {
      id: Date.now(),
      name: newCombatant.name,
      initiative: parseInt(newCombatant.initiative) || 0,
      hp: parseInt(newCombatant.hp) || 0,
      maxHp: parseInt(newCombatant.hp) || 0,
      ac: parseInt(newCombatant.ac) || 10,
      conditions: [],
      isPlayer: false
    };
    setCombatants(prev => [...prev, combatant].sort((a, b) => b.initiative - a.initiative));
    setNewCombatant({ name: '', initiative: '', hp: '', ac: '' });
  };

  const removeCombatant = (id) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
  };

  const updateCombatantHp = (id, delta) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        const newHp = Math.max(0, c.hp + delta);
        return { ...c, hp: newHp };
      }
      return c;
    }));
  };

  const nextTurn = () => {
    if (combatants.length === 0) return;
    if (currentTurn >= combatants.length - 1) {
      setCurrentTurn(0);
      setRound(r => r + 1);
    } else {
      setCurrentTurn(t => t + 1);
    }
  };

  const toggleCondition = (combatantId, conditionName) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === combatantId) {
        const hasCondition = c.conditions.includes(conditionName);
        return {
          ...c,
          conditions: hasCondition 
            ? c.conditions.filter(cn => cn !== conditionName)
            : [...c.conditions, conditionName]
        };
      }
      return c;
    }));
  };

  // Dice Rolling
  const rollDice = (sides, count = 1) => {
    let total = 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }
    const result = {
      dice: `${count}d${sides}`,
      rolls,
      total,
      isCrit: sides === 20 && rolls.includes(20),
      isFail: sides === 20 && rolls.includes(1),
      timestamp: new Date().toLocaleTimeString()
    };
    setLastRoll(result);
    return result;
  };

  // Quick Notes
  const saveQuickNote = async () => {
    if (!quickNote.trim()) return;
    const note = {
      id: Date.now(),
      content: quickNote,
      timestamp: new Date().toISOString()
    };
    setSessionNotes(prev => [note, ...prev]);
    setQuickNote('');
    
    // Try to save to backend
    try {
      await axios.post(`${API}/campaigns/${campaignId}/in-game-notes`, {
        content: quickNote,
        type: 'session'
      });
    } catch (error) {
      // Silently fail - notes are still in local state
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme.bg.black, 
      fontFamily: 'Cityworm, Inter, sans-serif'
    }}
    data-testid="session-mode-page"
    >
      {/* Header */}
      <div style={{ 
        padding: '12px 20px',
        background: theme.accent.red,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
      data-testid="session-mode-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            data-testid="session-back-btn"
            onClick={() => navigate(`/campaign/${campaignId}`)} 
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '8px' }}
          >
            <ArrowLeft size={20} color="#fff" />
          </Button>
          <h1 data-testid="session-mode-title" style={{ color: '#fff', fontSize: '18px', fontWeight: '700', letterSpacing: '1px' }}>
            SESSION MODE
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Round {round}
          </span>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 320px', 
        gap: '0',
        height: 'calc(100vh - 52px)'
      }}>
        {/* Main Area - Combat Tracker */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {/* Combat Controls */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: theme.text.white, fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Swords size={20} style={{ color: theme.accent.red }} />
              Initiative Tracker
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                data-testid="combat-toggle-btn"
                onClick={() => setCombatActive(!combatActive)}
                style={{ 
                  background: combatActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  border: `1px solid ${combatActive ? '#ef4444' : '#22c55e'}`,
                  color: combatActive ? '#ef4444' : '#22c55e',
                  padding: '8px 16px',
                  fontSize: '13px'
                }}
              >
                {combatActive ? <Pause size={16} /> : <Play size={16} />}
                <span style={{ marginLeft: '6px' }}>{combatActive ? 'Pause' : 'Start'}</span>
              </Button>
              <Button
                data-testid="next-turn-btn"
                onClick={nextTurn}
                disabled={combatants.length === 0}
                style={{ 
                  background: theme.accent.red,
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: '13px'
                }}
              >
                <SkipForward size={16} />
                <span style={{ marginLeft: '6px' }}>Next</span>
              </Button>
            </div>
          </div>

          {/* Add Combatant Form */}
          <div 
            data-testid="add-combatant-form"
            style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '16px',
            padding: '12px',
            background: theme.bg.panel,
            border: `1px solid ${theme.border}`
          }}>
            <Input
              data-testid="combatant-name-input"
              value={newCombatant.name}
              onChange={(e) => setNewCombatant({ ...newCombatant, name: e.target.value })}
              placeholder="Name"
              style={{ flex: 2, background: theme.bg.dark, border: `1px solid ${theme.border}`, color: theme.text.white }}
            />
            <Input
              data-testid="combatant-initiative-input"
              value={newCombatant.initiative}
              onChange={(e) => setNewCombatant({ ...newCombatant, initiative: e.target.value })}
              placeholder="Init"
              type="number"
              style={{ flex: 1, background: theme.bg.dark, border: `1px solid ${theme.border}`, color: theme.text.white }}
            />
            <Input
              data-testid="combatant-hp-input"
              value={newCombatant.hp}
              onChange={(e) => setNewCombatant({ ...newCombatant, hp: e.target.value })}
              placeholder="HP"
              type="number"
              style={{ flex: 1, background: theme.bg.dark, border: `1px solid ${theme.border}`, color: theme.text.white }}
            />
            <Input
              data-testid="combatant-ac-input"
              value={newCombatant.ac}
              onChange={(e) => setNewCombatant({ ...newCombatant, ac: e.target.value })}
              placeholder="AC"
              type="number"
              style={{ flex: 1, background: theme.bg.dark, border: `1px solid ${theme.border}`, color: theme.text.white }}
            />
            <Button data-testid="add-combatant-btn" onClick={addCombatant} style={{ background: theme.accent.red, border: 'none', padding: '8px 12px' }}>
              <Plus size={18} />
            </Button>
          </div>

          {/* Combatants List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {combatants.length === 0 ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: theme.text.muted,
                background: theme.bg.panel,
                border: `1px dashed ${theme.border}`
              }}>
                <Users size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>Add combatants to start tracking initiative</p>
              </div>
            ) : (
              combatants.map((combatant, index) => (
                <div
                  key={combatant.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: index === currentTurn && combatActive ? theme.accent.redSubtle : theme.bg.panel,
                    border: index === currentTurn && combatActive ? `2px solid ${theme.accent.red}` : `1px solid ${theme.border}`,
                    position: 'relative'
                  }}
                >
                  {/* Initiative */}
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: theme.bg.dark,
                    border: `1px solid ${theme.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: theme.accent.red,
                    fontSize: '16px'
                  }}>
                    {combatant.initiative}
                  </div>

                  {/* Name & Conditions */}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: theme.text.white, fontWeight: '600', fontSize: '15px' }}>
                      {combatant.name}
                      {index === currentTurn && combatActive && (
                        <span style={{ 
                          marginLeft: '10px',
                          background: theme.accent.red,
                          color: '#fff',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {combatant.conditions.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {combatant.conditions.map(c => (
                          <span key={c} style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '2px 6px',
                            fontSize: '10px'
                          }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* HP */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      onClick={() => updateCombatantHp(combatant.id, -1)}
                      style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', padding: '6px', color: '#ef4444' }}
                    >
                      <ChevronDown size={16} />
                    </Button>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      background: theme.bg.dark,
                      border: `1px solid ${theme.border}`
                    }}>
                      <Heart size={14} style={{ color: combatant.hp <= combatant.maxHp / 4 ? '#ef4444' : '#22c55e' }} />
                      <span style={{ 
                        color: combatant.hp <= combatant.maxHp / 4 ? '#ef4444' : theme.text.white,
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {combatant.hp}/{combatant.maxHp}
                      </span>
                    </div>
                    <Button
                      onClick={() => updateCombatantHp(combatant.id, 1)}
                      style={{ background: 'rgba(34, 197, 94, 0.2)', border: 'none', padding: '6px', color: '#22c55e' }}
                    >
                      <ChevronUp size={16} />
                    </Button>
                  </div>

                  {/* AC */}
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: theme.bg.dark,
                    border: `1px solid ${theme.border}`
                  }}>
                    <Shield size={14} style={{ color: theme.accent.red }} />
                    <span style={{ color: theme.text.white, fontWeight: '700', fontSize: '14px' }}>
                      {combatant.ac}
                    </span>
                  </div>

                  {/* Remove */}
                  <Button
                    onClick={() => removeCombatant(combatant.id)}
                    style={{ background: 'transparent', border: 'none', padding: '6px' }}
                  >
                    <Trash2 size={16} color={theme.text.muted} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar - Quick Tools */}
        <div 
          data-testid="session-sidebar"
          style={{ 
          background: theme.bg.panel, 
          borderLeft: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Quick Dice */}
          <div data-testid="dice-roller-section" style={{ padding: '16px', borderBottom: `1px solid ${theme.border}` }}>
            <h3 style={{ color: theme.text.white, fontSize: '13px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dices size={16} style={{ color: theme.accent.red }} />
              Quick Dice
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                <button
                  key={sides}
                  data-testid={`dice-d${sides}`}
                  onClick={() => rollDice(sides)}
                  style={{
                    padding: '10px 4px',
                    background: theme.bg.dark,
                    border: `1px solid ${theme.border}`,
                    color: theme.text.white,
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  d{sides}
                </button>
              ))}
              <button
                data-testid="dice-adv"
                onClick={() => rollDice(20, 2)}
                style={{
                  padding: '10px 4px',
                  background: theme.accent.redSubtle,
                  border: `1px solid ${theme.accent.red}`,
                  color: theme.accent.red,
                  fontWeight: '700',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                ADV
              </button>
            </div>
            {lastRoll && (
              <div data-testid="dice-result" style={{ 
                marginTop: '12px', 
                padding: '12px',
                background: lastRoll.isCrit ? 'rgba(34, 197, 94, 0.15)' : lastRoll.isFail ? 'rgba(239, 68, 68, 0.15)' : theme.bg.dark,
                border: `1px solid ${lastRoll.isCrit ? '#22c55e' : lastRoll.isFail ? '#ef4444' : theme.border}`,
                textAlign: 'center'
              }}>
                <div style={{ color: theme.text.muted, fontSize: '11px' }}>{lastRoll.dice}</div>
                <div data-testid="dice-total" style={{ 
                  color: lastRoll.isCrit ? '#22c55e' : lastRoll.isFail ? '#ef4444' : theme.text.white,
                  fontSize: '28px',
                  fontWeight: '800'
                }}>
                  {lastRoll.total}
                </div>
                {lastRoll.isCrit && <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: '700' }}>NAT 20!</span>}
                {lastRoll.isFail && <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '700' }}>NAT 1!</span>}
              </div>
            )}
          </div>

          {/* Quick Notes */}
          <div data-testid="session-notes-section" style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: theme.text.white, fontSize: '13px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: theme.accent.red }} />
              Session Notes
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <Input
                data-testid="session-note-input"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveQuickNote()}
                placeholder="Quick note..."
                style={{ flex: 1, background: theme.bg.dark, border: `1px solid ${theme.border}`, color: theme.text.white, fontSize: '13px' }}
              />
              <Button data-testid="save-note-btn" onClick={saveQuickNote} style={{ background: theme.accent.red, border: 'none', padding: '8px' }}>
                <Plus size={16} />
              </Button>
            </div>
            <div data-testid="session-notes-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sessionNotes.slice(0, 10).map((note, i) => (
                <div key={note.id || i} style={{ 
                  padding: '8px 10px', 
                  background: theme.bg.dark,
                  border: `1px solid ${theme.border}`,
                  fontSize: '12px',
                  color: theme.text.secondary
                }}>
                  {note.content}
                </div>
              ))}
            </div>
          </div>

          {/* Conditions Reference */}
          <div data-testid="conditions-section" style={{ padding: '16px', maxHeight: '200px', overflowY: 'auto' }}>
            <h3 style={{ color: theme.text.white, fontSize: '13px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} style={{ color: theme.accent.red }} />
              Conditions
            </h3>
            <div data-testid="conditions-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {conditions.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(condition => (
                <div key={condition.name} style={{ 
                  padding: '6px 10px', 
                  background: theme.bg.dark,
                  border: `1px solid ${theme.border}`,
                  fontSize: '11px'
                }}>
                  <div style={{ color: theme.accent.red, fontWeight: '600' }}>{condition.name}</div>
                  <div style={{ color: theme.text.muted }}>{condition.effect}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionMode;
