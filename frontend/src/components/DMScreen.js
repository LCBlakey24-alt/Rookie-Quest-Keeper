import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Sword, Users, Scroll, BookOpen, Send, Sparkles, 
  Loader, LogOut, Play, Dices, Coins, Swords, ArrowRight, Package
} from 'lucide-react';
import DiceRoller from '@/components/DiceRoller';
import LootGenerator from '@/components/LootGenerator';
import PartyInventory from '@/components/PartyInventory';
import { QuickReferenceModal } from '@/components/QuickReference';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [selectedScenario, setSelectedScenario] = useState(null);
  
  // UI state
  const [showTools, setShowTools] = useState('dice');

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

  // Navigate to Combat Page with scenario data
  const launchCombat = () => {
    if (!selectedScenario) {
      toast.error('Select an encounter first');
      return;
    }
    
    navigate(`/campaign/${campaignId}/combat`, {
      state: {
        scenario: selectedScenario,
        campaignName: campaign?.name
      }
    });
  };

  // Quick start combat with just players
  const quickStartCombat = () => {
    if (players.length === 0) {
      toast.error('No players in campaign');
      return;
    }
    
    // Create a quick scenario from players
    const quickScenario = {
      id: 'quick-combat',
      name: 'Quick Combat',
      combatants: players.map(p => ({
        id: `player-${p.id}`,
        entityId: p.id,
        name: p.name,
        type: 'player',
        hp: p.hp || p.max_hp || 10,
        maxHp: p.max_hp || p.hp || 10,
        ac: p.ac || 10,
        initiativeMod: Math.floor(((p.stats?.dexterity || 10) - 10) / 2),
        conditions: [],
        tokenColor: '#4a7dff',
        tokenSize: 40
      })),
      tokens: players.map((p, i) => ({
        id: `player-${p.id}`,
        name: p.name,
        color: '#4a7dff',
        size: 40,
        x: 100 + (i % 4) * 60,
        y: 100 + Math.floor(i / 4) * 60,
        isEnemy: false
      })),
      show_grid: true,
      grid_size: 40
    };
    
    navigate(`/campaign/${campaignId}/combat`, {
      state: {
        scenario: quickScenario,
        campaignName: campaign?.name
      }
    });
  };

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
    navigate('/campaigns');
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)' }}>
      {/* Header */}
      <div className="glow-panel" style={{ margin: '0', borderRadius: '0', padding: '16px 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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
            <Button onClick={() => setShowQuickRef(true)} className="btn-outline" style={{ display: 'flex', gap: '6px' }}><BookOpen size={16} /> Reference</Button>
            <Button onClick={handleEndSession} className="btn-secondary" style={{ display: 'flex', gap: '6px' }}><LogOut size={16} /> End Session</Button>
          </div>
        </div>
      </div>

      {/* Main Layout - 3 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* LEFT COLUMN - Combat Launcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Combat Box */}
          <div className="glow-panel" style={{ borderColor: '#ef4444' }}>
            <h3 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Swords size={22} style={{ color: '#ef4444' }} /> Combat
            </h3>
            
            {/* Encounter Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '13px', fontWeight: '600' }}>
                Select Encounter
              </label>
              {scenarios.length === 0 ? (
                <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px dashed #1e40af', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>No encounters created</p>
                  <p style={{ color: '#64748b', fontSize: '11px' }}>Create encounters in the Combat Creator tab</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {scenarios.map(s => (
                    <button
                      key={s.id}
                      data-testid={`encounter-${s.id}`}
                      onClick={() => setSelectedScenario(s)}
                      style={{
                        padding: '12px 14px',
                        background: selectedScenario?.id === s.id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(10, 10, 40, 0.6)',
                        border: `2px solid ${selectedScenario?.id === s.id ? '#22c55e' : '#1e40af'}`,
                        borderRadius: '10px',
                        color: '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: '700', marginBottom: '4px', fontFamily: 'Montserrat' }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#67e8f9', display: 'flex', gap: '12px' }}>
                        <span>{s.combatants?.length || 0} combatants</span>
                        {s.map_url && <span style={{ color: '#22c55e' }}>Has Map</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Launch Combat Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button 
                onClick={launchCombat} 
                className="btn-secondary" 
                data-testid="start-combat-btn"
                disabled={!selectedScenario}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px',
                  padding: '14px',
                  fontSize: '15px',
                  background: selectedScenario ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)' : undefined,
                  boxShadow: selectedScenario ? '0 0 25px rgba(239, 68, 68, 0.4)' : undefined,
                  opacity: selectedScenario ? 1 : 0.5
                }}
              >
                <Play size={18} /> Start Combat <ArrowRight size={16} />
              </Button>
              <Button 
                onClick={quickStartCombat} 
                className="btn-outline"
                data-testid="quick-combat-btn"
                disabled={players.length === 0}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Users size={16} /> Quick Start with Players ({players.length})
              </Button>
            </div>
            
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', textAlign: 'center', fontStyle: 'italic' }}>
              Combat opens in a dedicated full-screen view
            </p>
          </div>

          {/* Party Overview */}
          <div className="glow-panel">
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: '#4a7dff' }} /> Party Overview
            </h3>
            {players.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No players in campaign</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {players.slice(0, 6).map(player => (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'rgba(10, 10, 40, 0.5)',
                      border: '1px solid #1e40af',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>{player.name}</div>
                      <div style={{ color: '#67e8f9', fontSize: '11px' }}>{player.class || 'Adventurer'} {player.level ? `Lv.${player.level}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      <span style={{ color: '#ef4444' }}>HP: {player.hp || player.max_hp || '?'}</span>
                      <span style={{ color: '#67e8f9' }}>AC: {player.ac || '?'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN - Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tool Tabs */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'dice', icon: Dices, label: 'Dice' },
              { id: 'loot', icon: Coins, label: 'Loot' },
              { id: 'inventory', icon: Package, label: 'Inventory' },
            ].map(tab => (
              <Button
                key={tab.id}
                onClick={() => setShowTools(tab.id)}
                className={showTools === tab.id ? 'btn-primary' : 'btn-outline'}
                style={{ flex: 1, display: 'flex', gap: '6px', justifyContent: 'center', padding: '12px' }}
              >
                <tab.icon size={16} />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tool Content */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            {showTools === 'dice' && <DiceRoller />}
            {showTools === 'loot' && <LootGenerator />}
            {showTools === 'inventory' && <PartyInventory campaignId={campaignId} />}
          </div>
        </div>
            {showTools === 'loot' && <LootGenerator />}
          </div>
        </div>

        {/* RIGHT COLUMN - Notes */}
        <div className="glow-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#22c55e' }} /> Session Notes
          </h3>
          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            className="textarea-glow"
            style={{ minHeight: '100px', marginBottom: '10px', fontSize: '13px' }}
            placeholder="Quick note about the session..."
          />
          <Button 
            onClick={handleSubmitNote} 
            disabled={processingNote} 
            className="btn-primary" 
            style={{ width: '100%', marginBottom: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}
          >
            {processingNote ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Save Note
          </Button>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
            <h4 style={{ fontSize: '13px', color: '#67e8f9', marginBottom: '10px', fontWeight: '600' }}>Recent Notes</h4>
            {sessionNotes.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No notes yet</p>
            ) : (
              sessionNotes.map(note => (
                <div key={note.id} style={{ background: 'rgba(10,10,40,0.4)', border: '1px solid #1e40af', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{new Date(note.created_at).toLocaleTimeString()}</div>
                  <div style={{ color: '#fff', fontSize: '12px', lineHeight: '1.4' }}>{note.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <QuickReferenceModal isOpen={showQuickRef} onClose={() => setShowQuickRef(false)} />
    </div>
  );
}

export default DMScreen;
