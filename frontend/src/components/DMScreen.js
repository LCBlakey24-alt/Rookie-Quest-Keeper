import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sword, Users, Scroll, Search, Edit, Save, X, BookOpen } from 'lucide-react';

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
                      <div className="stat-block\" style={{ flex: 1 }}>
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
      </div>
    </div>
  );
}

export default DMScreen;
