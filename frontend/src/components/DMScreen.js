import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sword, Users, Scroll, Search, Edit, Save, X, BookOpen, Send, Sparkles, Loader, LogOut, Clock, Trash2 } from 'lucide-react';
import DiceRoller from '@/components/DiceRoller';
import CombatTracker from '@/components/CombatTracker';
import LootGenerator from '@/components/LootGenerator';
import MapTokenSystem from '@/components/MapTokenSystem';
import { QuickReferenceModal } from '@/components/QuickReference';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function DMScreen({ username }) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [initiative, setInitiative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dmRules, setDmRules] = useState('');
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedSections, setHighlightedSections] = useState([]);
  const [quickNote, setQuickNote] = useState('');
  const [processingNote, setProcessingNote] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [showQuickRef, setShowQuickRef] = useState(false);

  const getDefaultRules = (system) => {
    const defaultRules = {
      'D&D 5e 2024': `# D&D 5e 2024 Quick Reference

## Combat
- Initiative: 1d20 + Dexterity modifier
- Attack Roll: 1d20 + ability modifier + proficiency bonus
- AC: Armor Class (target number to hit)
- Advantage/Disadvantage: Roll 2d20, take higher/lower

## Actions in Combat
- **Action**: Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object
- **Bonus Action**: Available if feature grants it
- **Reaction**: Opportunity Attack, readied actions
- **Movement**: Speed in feet (usually 30ft)

## Conditions
- **Blinded**: Can't see, attacks have disadvantage
- **Charmed**: Can't attack charmer
- **Frightened**: Disadvantage on ability checks and attacks
- **Grappled**: Speed = 0
- **Paralyzed**: Incapacitated, auto-fail STR/DEX saves
- **Prone**: Disadvantage on attacks, attacks against have advantage
- **Restrained**: Speed = 0, disadvantage on DEX saves
- **Stunned**: Incapacitated, auto-fail STR/DEX saves
- **Unconscious**: Incapacitated, drop everything, prone

## Ability Checks
- Skill Check: 1d20 + ability modifier + proficiency (if proficient)
- DC: Difficulty Class (target number)
- Common DCs: Easy 10, Medium 15, Hard 20, Very Hard 25

## Saving Throws
- 1d20 + ability modifier + proficiency (if proficient)
- Common: DEX (traps, spells), CON (poison, concentration), WIS (charm, fear)

## Rests
- **Short Rest**: 1 hour, spend Hit Dice to recover HP
- **Long Rest**: 8 hours, recover all HP and half of Hit Dice

## Death Saves
- 3 failures = death, 3 successes = stabilized
- Natural 20 = regain 1 HP, Natural 1 = 2 failures`,

      'Pathfinder 2e': `# Pathfinder 2e Quick Reference

## Actions (3-Action Economy)
Each turn: 3 actions + 1 reaction
- **Strike**: Attack (1 action, -5 for 2nd, -10 for 3rd)
- **Stride**: Move your Speed
- **Cast a Spell**: Varies by spell
- **Raise Shield**: +2 AC until next turn
- **Aid**: Help ally (+1 circumstance bonus)

## Degrees of Success
- Critical Success: Beat DC by 10+
- Success: Meet or beat DC
- Failure: Below DC
- Critical Failure: Fail by 10+`,

      'Call of Cthulhu 7e': `# Call of Cthulhu 7e Quick Reference

## Skill Rolls
- Roll 1d100, compare to skill rating
- **Regular Success**: Roll ≤ skill
- **Hard Success**: Roll ≤ half skill
- **Extreme Success**: Roll ≤ one-fifth skill

## Sanity
- Sanity Points: Start at POW stat
- Losing Sanity: See disturbing things
- **0 Sanity**: Permanent insanity`,

      'Other': `# TTRPG Quick Reference

## Basic Rules
[Customize for your game system]

## Combat
[Add combat rules]

## Skill Checks
[Add skill rules]`
    };

    return defaultRules[system] || defaultRules['Other'];
  };

  useEffect(() => {
    fetchAllData();
  }, [campaignId]);

  const fetchAllData = async () => {
    try {
      const [campaignRes, playersRes, npcsRes, initRes, settingRes, calendarRes, eventsRes, notesRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}`),
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/initiative`),
        axios.get(`${API}/campaigns/${campaignId}/setting`),
        axios.get(`${API}/campaigns/${campaignId}/calendar`),
        axios.get(`${API}/campaigns/${campaignId}/calendar-events`),
        axios.get(`${API}/campaigns/${campaignId}/ingame-notes`)
      ]);
      
      setCampaign(campaignRes.data);
      setPlayers(playersRes.data);
      setNPCs(npcsRes.data);
      setInitiative(initRes.data);
      setCalendar(calendarRes.data);
      setSessionNotes(notesRes.data.slice(0, 20));
      
      const cal = calendarRes.data;
      const events = eventsRes.data;
      const upcoming = events
        .map(event => ({ ...event, daysUntil: calculateDaysUntil(event, cal) }))
        .filter(event => event.daysUntil >= 0 && event.daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil);
      setUpcomingEvents(upcoming);
      
      const customRules = settingRes.data?.dm_rules;
      if (customRules) {
        setDmRules(customRules);
      } else {
        setDmRules(getDefaultRules(campaignRes.data.system));
      }
    } catch (error) {
      toast.error('Failed to load DM Screen data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntil = (event, cal) => {
    if (!cal) return 0;
    const currentDate = { year: cal.current_year, month: cal.current_month, day: cal.current_day };
    const eventDate = { year: event.year, month: event.month, day: event.day };
    
    if (eventDate.year > currentDate.year) return 999;
    if (eventDate.year < currentDate.year) return -1;
    if (eventDate.month > currentDate.month) {
      return (eventDate.month - currentDate.month) * 30 + (eventDate.day - currentDate.day);
    }
    if (eventDate.month < currentDate.month) return -1;
    return eventDate.day - currentDate.day;
  };

  const handleSaveRules = async () => {
    try {
      await axios.put(`${API}/campaigns/${campaignId}/setting`, { dm_rules: dmRules });
      toast.success('Rules saved!');
      setIsEditingRules(false);
    } catch (error) {
      toast.error('Failed to save rules');
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setHighlightedSections([]);
      return;
    }
    const lines = dmRules.split('\n');
    const matches = [];
    const search = searchTerm.toLowerCase();
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(search)) matches.push(index);
    });
    setHighlightedSections(matches);
    if (matches.length > 0) {
      const element = document.getElementById(`rule-line-${matches[0]}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.success(`Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`);
    } else {
      toast.error('No matches found');
    }
  };

  const handleSubmitNote = async () => {
    if (!quickNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setProcessingNote(true);
    try {
      const note = quickNote.toLowerCase();
      let daysToAdvance = 0;
      
      if (note.includes('long rest') || note.includes('long-rest')) {
        daysToAdvance = 1;
      } else {
        const dayMatch = note.match(/(\d+)\s*day[s]?\s*(pass|later|advance)/i);
        if (dayMatch) daysToAdvance = parseInt(dayMatch[1]);
      }

      if (daysToAdvance > 0) {
        await axios.post(`${API}/campaigns/${campaignId}/calendar/advance?days=${daysToAdvance}`);
        toast.success(`Time advanced ${daysToAdvance} day(s)`);
      }

      const noteRes = await axios.post(`${API}/campaigns/${campaignId}/ingame-notes`, { content: quickNote });
      
      const newNote = {
        id: noteRes.data.id,
        content: quickNote,
        created_at: new Date().toISOString()
      };
      setSessionNotes(prev => [newNote, ...prev]);

      try {
        const response = await axios.post(`${API}/campaigns/${campaignId}/ingame-notes/${noteRes.data.id}/process-ai`);
        await autoApplySuggestions(response.data.suggestions);
      } catch (aiError) {
        console.log('AI processing skipped');
      }
      
      toast.success('Note saved!');
      setQuickNote('');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setProcessingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/ingame-notes/${noteId}`);
      setSessionNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('End this session? All notes have been saved. This will close the DM Screen.')) return;
    
    toast.success('Session ended! All notes saved.');
    window.close();
    setTimeout(() => navigate('/campaigns'), 500);
  };

  const autoApplySuggestions = async (suggestions) => {
    if (!suggestions) return;
    let appliedCount = 0;

    try {
      if (suggestions.new_npcs?.length > 0) {
        for (const npc of suggestions.new_npcs) {
          await axios.post(`${API}/campaigns/${campaignId}/npcs`, {
            name: npc.name,
            description: npc.description,
            notes: npc.notes || '',
            hp: 10,
            ac: 10
          });
          appliedCount++;
        }
      }

      if (suggestions.new_locations?.length > 0) {
        for (const location of suggestions.new_locations) {
          await axios.post(`${API}/campaigns/${campaignId}/locations`, {
            name: location.name,
            location_type: location.type || '',
            description: location.description,
            notes: location.notes || ''
          });
          appliedCount++;
        }
      }

      if (appliedCount > 0) {
        toast.success(`Auto-added ${appliedCount} item(s)!`);
        fetchAllData();
      }
    } catch (error) {
      console.error('Error applying suggestions:', error);
    }
  };

  const formatNoteTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div className="glow-panel" style={{
        marginBottom: '24px',
        padding: '20px 28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              color: '#ffffff', 
              marginBottom: '10px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Sword size={28} style={{ color: '#22c55e' }} />
              {campaign?.name} - DM Screen
            </h1>
            {calendar && (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ 
                  background: 'rgba(74, 125, 255, 0.15)',
                  border: '1px solid #4a7dff',
                  borderRadius: '12px',
                  padding: '8px 16px'
                }}>
                  <p style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600' }}>
                    {calendar.custom_months[calendar.current_month - 1]?.name || 'Month'} {calendar.current_day}, Year {calendar.current_year}
                  </p>
                </div>
                {upcomingEvents.length > 0 && (
                  <div style={{ 
                    background: upcomingEvents[0].daysUntil === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(74, 125, 255, 0.15)',
                    border: `1px solid ${upcomingEvents[0].daysUntil === 0 ? '#22c55e' : '#4a7dff'}`,
                    borderRadius: '12px',
                    padding: '8px 16px'
                  }}>
                    <p style={{ fontSize: '13px', color: upcomingEvents[0].daysUntil === 0 ? '#22c55e' : '#ffffff', fontWeight: '600' }}>
                      {upcomingEvents[0].name}: {upcomingEvents[0].daysUntil === 0 ? 'TODAY!' : `${upcomingEvents[0].daysUntil} day(s)`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={() => setShowQuickRef(true)}
              className="btn-outline"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <BookOpen size={18} />
              Quick Ref
            </Button>
            <Button
              data-testid="end-session-btn"
              onClick={handleEndSession}
              className="btn-secondary"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <LogOut size={18} />
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Map Token System - Full Width */}
      <div style={{ maxWidth: '1600px', margin: '0 auto 24px' }}>
        <MapTokenSystem players={players} npcs={npcs} />
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '24px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {/* Dice Roller */}
        <DiceRoller />

        {/* Combat Tracker */}
        <CombatTracker players={players} npcs={npcs} />

        {/* Loot Generator */}
        <LootGenerator />

        {/* Players */}
        <div data-testid="dm-screen-players" className="glow-panel" style={{ height: 'fit-content' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Users size={24} style={{ color: '#22c55e' }} />
              Players
            </h2>
          </div>
          {players.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No players added</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {players.map(player => (
                <div key={player.id} data-testid={`dm-player-${player.id}`} className="card-glow" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', fontFamily: 'Montserrat, sans-serif' }}>{player.name}</h3>
                    <span className="system-badge" style={{ fontSize: '11px', padding: '4px 10px' }}>{player.character_class} {player.level}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <div className="stat-block" style={{ flex: 1 }}>
                      <div className="stat-label">HP</div>
                      <div className="stat-value" style={{ fontSize: '14px' }}>{player.hp}/{player.max_hp}</div>
                    </div>
                    <div className="stat-block" style={{ flex: 1 }}>
                      <div className="stat-label">AC</div>
                      <div className="stat-value" style={{ fontSize: '14px' }}>{player.ac}</div>
                    </div>
                    <div className="stat-block" style={{ flex: 1 }}>
                      <div className="stat-label">STR</div>
                      <div className="stat-value" style={{ fontSize: '14px' }}>{player.stats.strength}</div>
                    </div>
                    <div className="stat-block" style={{ flex: 1 }}>
                      <div className="stat-label">DEX</div>
                      <div className="stat-value" style={{ fontSize: '14px' }}>{player.stats.dexterity}</div>
                    </div>
                  </div>
                  <div className="hp-bar">
                    <div className="hp-bar-fill" style={{ width: `${(player.hp / player.max_hp) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NPCs Quick Reference */}
        <div data-testid="dm-screen-npcs" className="glow-panel" style={{ height: 'fit-content' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Scroll size={24} style={{ color: '#22c55e' }} />
              NPCs Quick Reference
            </h2>
          </div>
          {npcs.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No NPCs added</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {npcs.slice(0, 10).map(npc => (
                <div key={npc.id} data-testid={`dm-npc-${npc.id}`} className="card-glow" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', fontFamily: 'Montserrat, sans-serif' }}>{npc.name}</h3>
                    {npc.location && <span style={{ fontSize: '12px', color: '#67e8f9' }}>{npc.location}</span>}
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.5' }}>{npc.description}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="stat-block" style={{ flex: 1 }}>
                      <div className="stat-label">HP</div>
                      <div className="stat-value" style={{ fontSize: '14px' }}>{npc.hp}</div>
                    </div>
                    <div className="stat-block" style={{ flex: 1 }}>
                      <div className="stat-label">AC</div>
                      <div className="stat-value" style={{ fontSize: '14px' }}>{npc.ac}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Notes */}
        <div data-testid="dm-screen-notes" className="glow-panel" style={{ height: 'fit-content' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Sparkles size={24} style={{ color: '#22c55e' }} />
              Session Notes
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '14px' }}>
            Jot down notes during play. AI will auto-organize them!
          </p>
          <div style={{ marginBottom: '14px' }}>
            <textarea
              data-testid="quick-note-input"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="textarea-glow"
              style={{ minHeight: '90px', fontSize: '14px' }}
              placeholder="e.g., Met Eldrin the blacksmith, heading to Thornwood..."
              disabled={processingNote}
            />
          </div>
          <Button
            data-testid="submit-quick-note-btn"
            onClick={handleSubmitNote}
            disabled={processingNote || !quickNote.trim()}
            className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}
          >
            {processingNote ? (
              <><Loader size={16} className="loading-spinner" /> Processing...</>
            ) : (
              <><Send size={16} /> Add Note</>
            )}
          </Button>

          {/* Notes List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '14px', fontFamily: 'Montserrat, sans-serif' }}>Session Notes ({sessionNotes.length})</span>
            </div>
            {sessionNotes.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No notes yet this session</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessionNotes.map(note => (
                  <div key={note.id} className="card-glow" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {formatNoteTime(note.created_at)}
                        </div>
                        <div style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.5' }}>{note.content}</div>
                      </div>
                      <Button
                        onClick={() => handleDeleteNote(note.id)}
                        className="btn-icon"
                        style={{ padding: '6px', color: '#ef4444', border: '1px solid #ef4444' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rules Reference */}
        <div data-testid="dm-screen-rules" className="glow-panel" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <BookOpen size={24} style={{ color: '#22c55e' }} />
              Rules Reference - {campaign?.system}
            </h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isEditingRules ? (
                <>
                  <Button data-testid="save-rules-btn" onClick={handleSaveRules} className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                    <Save size={16} /> Save
                  </Button>
                  <Button data-testid="cancel-edit-rules-btn" onClick={() => { setIsEditingRules(false); fetchAllData(); }} className="btn-secondary">
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <Button data-testid="edit-rules-btn" onClick={() => setIsEditingRules(true)} className="btn-outline" style={{ display: 'flex', gap: '8px' }}>
                  <Edit size={16} /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <Input
                data-testid="rules-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search rules... (press Enter)"
                className="input-glow"
                style={{ paddingLeft: '44px' }}
              />
            </div>
            <Button data-testid="search-rules-btn" onClick={handleSearch} className="btn-primary">
              Search
            </Button>
          </div>

          {/* Rules Display/Edit */}
          {isEditingRules ? (
            <textarea
              data-testid="rules-edit-textarea"
              value={dmRules}
              onChange={(e) => setDmRules(e.target.value)}
              className="textarea-glow"
              style={{ minHeight: '500px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.7' }}
            />
          ) : (
            <div style={{
              background: 'rgba(10, 10, 40, 0.6)',
              border: '2px solid #1e40af',
              borderRadius: '12px',
              padding: '24px',
              maxHeight: '600px',
              overflow: 'auto'
            }}>
              {dmRules.split('\n').map((line, index) => {
                const isHeading = line.startsWith('#');
                const isSubHeading = line.startsWith('##');
                const isListItem = line.trim().startsWith('-') || line.trim().startsWith('*');
                const isHighlighted = highlightedSections.includes(index);
                
                let style = {
                  color: '#ffffff',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  marginBottom: '8px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: isHighlighted ? 'rgba(34, 197, 94, 0.3)' : 'transparent',
                  transition: 'background 0.3s'
                };

                if (isHeading && !isSubHeading) {
                  style = { ...style, fontSize: '24px', fontWeight: '800', color: '#22c55e', marginTop: '24px', marginBottom: '16px', fontFamily: 'Montserrat, sans-serif' };
                } else if (isSubHeading) {
                  style = { ...style, fontSize: '18px', fontWeight: '700', color: '#67e8f9', marginTop: '16px', marginBottom: '12px', fontFamily: 'Montserrat, sans-serif' };
                } else if (isListItem) {
                  style = { ...style, paddingLeft: '24px' };
                }

                return (
                  <div 
                    key={index} 
                    id={`rule-line-${index}`}
                    style={style}
                    dangerouslySetInnerHTML={{
                      __html: line
                        .replace(/^###?\s/, '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #22c55e;">$1</strong>')
                        .replace(/`(.*?)`/g, '<code style="background: rgba(34, 197, 94, 0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DMScreen;
