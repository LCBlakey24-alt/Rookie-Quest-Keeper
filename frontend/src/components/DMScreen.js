import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sword, Users, Scroll, Search, Edit, Save, X, BookOpen, Send, Sparkles, Loader } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function DMScreen({ username }) {
  const { campaignId } = useParams();
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

## Combat
- Initiative: Perception check
- Attack: 1d20 + proficiency + ability modifier
- AC: 10 + proficiency + DEX + armor
- Damage: Weapon die + STR/DEX modifier

## Conditions
- **Clumsy**: Penalty to DEX-based checks
- **Drained**: Penalty to CON-based checks
- **Enfeebled**: Penalty to STR-based checks
- **Flat-footed**: -2 AC
- **Frightened**: Penalties to all checks
- **Grabbed**: Can't move
- **Prone**: -2 AC, harder to attack

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
- **Critical**: Roll 01

## Combat
- Initiative: DEX order
- Fighting: Use Fighting skill (Brawl, Firearms, etc)
- Dodge: Use DEX to avoid attacks
- Damage: Varies by weapon

## Sanity
- Sanity Points: Start at POW stat
- Losing Sanity: See disturbing things, cast spells
- **0 Sanity**: Permanent insanity
- **Temporary Insanity**: Lose 5+ SAN in one go
- **Indefinite Insanity**: Lose 20% of SAN

## Luck
- Spend Luck to improve rolls
- Refreshes each session`,

      'Other': `# TTRPG Quick Reference

## Basic Rules
[Customize this section for your game system]

## Combat
[Add combat rules here]

## Skill Checks
[Add skill check rules here]

## Special Mechanics
[Add system-specific mechanics here]`
    };

    return defaultRules[system] || defaultRules['Other'];
  };

  useEffect(() => {
    fetchAllData();
  }, [campaignId]);

  const fetchAllData = async () => {
    try {
      const [campaignRes, playersRes, npcsRes, initRes, settingRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}`),
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/initiative`),
        axios.get(`${API}/campaigns/${campaignId}/setting`)
      ]);
      
      setCampaign(campaignRes.data);
      setPlayers(playersRes.data);
      setNPCs(npcsRes.data);
      setInitiative(initRes.data);
      
      // Load custom rules or default rules
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
      if (line.toLowerCase().includes(search)) {
        matches.push(index);
      }
    });

    setHighlightedSections(matches);

    // Scroll to first match
    if (matches.length > 0) {
      const element = document.getElementById(`rule-line-${matches[0]}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
      // Save the note first
      await axios.post(`${API}/campaigns/${campaignId}/ingame-notes`, { 
        content: quickNote 
      });

      // Get the note ID to process it
      const notesRes = await axios.get(`${API}/campaigns/${campaignId}/ingame-notes`);
      const latestNote = notesRes.data[0];

      // Process with AI
      const response = await axios.post(`${API}/campaigns/${campaignId}/ingame-notes/${latestNote.id}/process-ai`);
      
      setAiSuggestions(response.data.suggestions);
      
      // Auto-apply all suggestions
      await autoApplySuggestions(response.data.suggestions);
      
      toast.success('Note saved and processed!');
      setQuickNote('');
      setAiSuggestions(null);
    } catch (error) {
      toast.error('Failed to process note');
    } finally {
      setProcessingNote(false);
    }
  };

  const autoApplySuggestions = async (suggestions) => {
    let appliedCount = 0;

    try {
      // Apply new NPCs
      if (suggestions.new_npcs && suggestions.new_npcs.length > 0) {
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

      // Apply new locations
      if (suggestions.new_locations && suggestions.new_locations.length > 0) {
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

      // Apply new gods
      if (suggestions.new_gods && suggestions.new_gods.length > 0) {
        for (const god of suggestions.new_gods) {
          await axios.post(`${API}/campaigns/${campaignId}/gods`, {
            name: god.name,
            domain: god.domain || '',
            description: god.description
          });
          appliedCount++;
        }
      }

      if (appliedCount > 0) {
        toast.success(`Auto-added ${appliedCount} item(s) to your campaign!`);
        // Refresh data
        fetchAllData();
      }

      // Show manual update suggestions
      if (suggestions.npc_updates?.length > 0 || suggestions.location_updates?.length > 0) {
        let updateMessage = 'Updates detected: ';
        if (suggestions.npc_updates?.length > 0) {
          updateMessage += `${suggestions.npc_updates.length} NPC(s) `;
        }
        if (suggestions.location_updates?.length > 0) {
          updateMessage += `${suggestions.location_updates.length} Location(s)`;
        }
        toast.info(updateMessage + ' - Review manually', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error applying suggestions:', error);
    }
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
      background: 'linear-gradient(135deg, #1a1410 0%, #2d1810 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(20, 16, 12, 0.9)',
        borderBottom: '2px solid #5a4a2f',
        padding: '16px 24px',
        marginBottom: '20px',
        borderRadius: '12px'
      }}>
        <h1 className="medieval-heading" style={{ fontSize: '32px', color: '#d4af37', textAlign: 'center' }}>
          <Sword size={32} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
          {campaign?.name} - DM Screen
        </h1>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {/* Players */}
        <Card data-testid="dm-screen-players" className="parchment-dark" style={{ height: 'fit-content' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={24} />
              Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <p style={{ color: '#8b7355', textAlign: 'center', padding: '20px' }}>No players added</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {players.map(player => (
                  <div 
                    key={player.id}
                    data-testid={`dm-player-${player.id}`}
                    className="initiative-entry"
                    style={{ cursor: 'default' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 className="gold-text" style={{ fontSize: '16px' }}>{player.name}</h3>
                      <span style={{ fontSize: '12px', color: '#8b7355' }}>{player.character_class} {player.level}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
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
          </CardContent>
        </Card>

        {/* NPCs Quick Reference */}
        <Card data-testid="dm-screen-npcs" className="parchment-dark" style={{ height: 'fit-content' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Scroll size={24} />
              NPCs Quick Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            {npcs.length === 0 ? (
              <p style={{ color: '#8b7355', textAlign: 'center', padding: '20px' }}>No NPCs added</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {npcs.slice(0, 10).map(npc => (
                  <div 
                    key={npc.id}
                    data-testid={`dm-npc-${npc.id}`}
                    className="initiative-entry"
                    style={{ cursor: 'default' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 className="gold-text" style={{ fontSize: '16px' }}>{npc.name}</h3>
                      {npc.location && <span style={{ fontSize: '12px', color: '#8b7355' }}>{npc.location}</span>}
                    </div>
                    <p style={{ fontSize: '13px', color: '#e8dcc4', marginBottom: '8px' }}>{npc.description}</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
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
          </CardContent>
        </Card>

        {/* Quick Notes */}
        <Card data-testid="dm-screen-notes" className="parchment-dark" style={{ height: 'fit-content' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
              Session Quick Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: '#8b7355', fontSize: '14px', marginBottom: '12px', fontStyle: 'italic' }}>
              Return to the Campaign Management screen to add session notes and organize your data.
            </p>
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}>
              <p style={{ color: '#e8dcc4', fontSize: '13px', lineHeight: '1.6' }}>
                This DM Screen gives you quick access to player stats, NPCs, and combat information during gameplay.
                Use the main campaign page to add detailed notes, manage world content, and organize your campaign.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rules Reference */}
        <Card data-testid="dm-screen-rules" className="parchment-dark" style={{ gridColumn: '1 / -1' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BookOpen size={24} />
                Rules Reference - {campaign?.system}
              </CardTitle>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isEditingRules ? (
                  <>
                    <Button
                      data-testid="save-rules-btn"
                      onClick={handleSaveRules}
                      className="btn-primary"
                      style={{ display: 'flex', gap: '8px' }}
                    >
                      <Save size={16} />
                      Save
                    </Button>
                    <Button
                      data-testid="cancel-edit-rules-btn"
                      onClick={() => {
                        setIsEditingRules(false);
                        fetchAllData(); // Reset to saved version
                      }}
                      className="btn-secondary"
                    >
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <Button
                    data-testid="edit-rules-btn"
                    onClick={() => setIsEditingRules(true)}
                    className="btn-secondary"
                    style={{ display: 'flex', gap: '8px' }}
                  >
                    <Edit size={16} />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b7355' }} />
                <Input
                  data-testid="rules-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search rules... (press Enter)"
                  className="input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <Button
                data-testid="search-rules-btn"
                onClick={handleSearch}
                className="btn-primary"
              >
                Search
              </Button>
            </div>

            {/* Rules Display/Edit */}
            {isEditingRules ? (
              <textarea
                data-testid="rules-edit-textarea"
                value={dmRules}
                onChange={(e) => setDmRules(e.target.value)}
                className="textarea"
                style={{ 
                  minHeight: '500px', 
                  fontFamily: 'monospace', 
                  fontSize: '13px', 
                  lineHeight: '1.6' 
                }}
              />
            ) : (
              <div style={{
                background: 'rgba(20, 16, 12, 0.6)',
                border: '1px solid #5a4a2f',
                borderRadius: '8px',
                padding: '20px',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                {dmRules.split('\n').map((line, index) => {
                  const isHeading = line.startsWith('#');
                  const isSubHeading = line.startsWith('##');
                  const isListItem = line.trim().startsWith('-') || line.trim().startsWith('*');
                  const isHighlighted = highlightedSections.includes(index);
                  
                  let style = {
                    color: '#e8dcc4',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    marginBottom: '8px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: isHighlighted ? 'rgba(212, 175, 55, 0.3)' : 'transparent',
                    transition: 'background 0.3s'
                  };

                  if (isHeading && !isSubHeading) {
                    style = {
                      ...style,
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#d4af37',
                      marginTop: '24px',
                      marginBottom: '16px',
                      fontFamily: 'Crimson Text, serif'
                    };
                  } else if (isSubHeading) {
                    style = {
                      ...style,
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#d4af37',
                      marginTop: '16px',
                      marginBottom: '12px'
                    };
                  } else if (isListItem) {
                    style = {
                      ...style,
                      paddingLeft: '24px'
                    };
                  }

                  return (
                    <div 
                      key={index} 
                      id={`rule-line-${index}`}
                      style={style}
                      dangerouslySetInnerHTML={{
                        __html: line
                          .replace(/^###?\s/, '')
                          .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #d4af37;">$1</strong>')
                          .replace(/`(.*?)`/g, '<code style="background: rgba(212, 175, 55, 0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>')
                      }}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DMScreen;
