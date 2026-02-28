import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ChevronRight, ChevronLeft, Check, User, Dices, RotateCcw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// D&D 5e 2024 Data
const DND_DATA = {
  races: [
    { id: 'human', name: 'Human', traits: '+1 to all abilities', speed: 30, size: 'Medium' },
    { id: 'elf', name: 'Elf', traits: 'Darkvision, Fey Ancestry, Trance', speed: 30, size: 'Medium', subraces: ['High Elf', 'Wood Elf', 'Dark Elf (Drow)'] },
    { id: 'dwarf', name: 'Dwarf', traits: 'Darkvision, Dwarven Resilience', speed: 25, size: 'Medium', subraces: ['Hill Dwarf', 'Mountain Dwarf'] },
    { id: 'halfling', name: 'Halfling', traits: 'Lucky, Brave, Halfling Nimbleness', speed: 25, size: 'Small', subraces: ['Lightfoot', 'Stout'] },
    { id: 'dragonborn', name: 'Dragonborn', traits: 'Breath Weapon, Damage Resistance', speed: 30, size: 'Medium', subraces: ['Chromatic', 'Metallic', 'Gem'] },
    { id: 'gnome', name: 'Gnome', traits: 'Darkvision, Gnome Cunning', speed: 25, size: 'Small', subraces: ['Forest Gnome', 'Rock Gnome'] },
    { id: 'half-elf', name: 'Half-Elf', traits: 'Darkvision, Fey Ancestry, Skill Versatility', speed: 30, size: 'Medium' },
    { id: 'half-orc', name: 'Half-Orc', traits: 'Darkvision, Relentless Endurance, Savage Attacks', speed: 30, size: 'Medium' },
    { id: 'tiefling', name: 'Tiefling', traits: 'Darkvision, Hellish Resistance, Infernal Legacy', speed: 30, size: 'Medium' },
    { id: 'aasimar', name: 'Aasimar', traits: 'Darkvision, Celestial Resistance, Healing Hands', speed: 30, size: 'Medium' },
    { id: 'goliath', name: 'Goliath', traits: "Stone's Endurance, Powerful Build", speed: 30, size: 'Medium' },
    { id: 'orc', name: 'Orc', traits: 'Darkvision, Adrenaline Rush', speed: 30, size: 'Medium' },
  ],
  classes: [
    { id: 'barbarian', name: 'Barbarian', hitDie: 12, primaryAbility: 'Strength', savingThrows: ['Strength', 'Constitution'], 
      subclasses: ['Path of the Berserker', 'Path of the Totem Warrior', 'Path of Wild Magic', 'Path of the Beast'],
      suggestedStats: { strength: 15, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 12, charisma: 10 } },
    { id: 'bard', name: 'Bard', hitDie: 8, primaryAbility: 'Charisma', savingThrows: ['Dexterity', 'Charisma'],
      subclasses: ['College of Lore', 'College of Valor', 'College of Glamour', 'College of Swords'],
      suggestedStats: { strength: 8, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 13, charisma: 15 } },
    { id: 'cleric', name: 'Cleric', hitDie: 8, primaryAbility: 'Wisdom', savingThrows: ['Wisdom', 'Charisma'],
      subclasses: ['Life Domain', 'Light Domain', 'War Domain', 'Trickery Domain', 'Knowledge Domain'],
      suggestedStats: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 15, charisma: 12 } },
    { id: 'druid', name: 'Druid', hitDie: 8, primaryAbility: 'Wisdom', savingThrows: ['Intelligence', 'Wisdom'],
      subclasses: ['Circle of the Land', 'Circle of the Moon', 'Circle of Spores', 'Circle of Stars'],
      suggestedStats: { strength: 8, dexterity: 12, constitution: 14, intelligence: 13, wisdom: 15, charisma: 10 } },
    { id: 'fighter', name: 'Fighter', hitDie: 10, primaryAbility: 'Strength or Dexterity', savingThrows: ['Strength', 'Constitution'],
      subclasses: ['Champion', 'Battle Master', 'Eldritch Knight', 'Echo Knight'],
      suggestedStats: { strength: 15, dexterity: 13, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 } },
    { id: 'monk', name: 'Monk', hitDie: 8, primaryAbility: 'Dexterity & Wisdom', savingThrows: ['Strength', 'Dexterity'],
      subclasses: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements', 'Way of Mercy'],
      suggestedStats: { strength: 10, dexterity: 15, constitution: 13, intelligence: 8, wisdom: 14, charisma: 12 } },
    { id: 'paladin', name: 'Paladin', hitDie: 10, primaryAbility: 'Strength & Charisma', savingThrows: ['Wisdom', 'Charisma'],
      subclasses: ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance', 'Oath of Glory'],
      suggestedStats: { strength: 15, dexterity: 10, constitution: 13, intelligence: 8, wisdom: 12, charisma: 14 } },
    { id: 'ranger', name: 'Ranger', hitDie: 10, primaryAbility: 'Dexterity & Wisdom', savingThrows: ['Strength', 'Dexterity'],
      subclasses: ['Hunter', 'Beast Master', 'Gloom Stalker', 'Fey Wanderer'],
      suggestedStats: { strength: 12, dexterity: 15, constitution: 13, intelligence: 8, wisdom: 14, charisma: 10 } },
    { id: 'rogue', name: 'Rogue', hitDie: 8, primaryAbility: 'Dexterity', savingThrows: ['Dexterity', 'Intelligence'],
      subclasses: ['Thief', 'Assassin', 'Arcane Trickster', 'Swashbuckler'],
      suggestedStats: { strength: 8, dexterity: 15, constitution: 13, intelligence: 14, wisdom: 10, charisma: 12 } },
    { id: 'sorcerer', name: 'Sorcerer', hitDie: 6, primaryAbility: 'Charisma', savingThrows: ['Constitution', 'Charisma'],
      subclasses: ['Draconic Bloodline', 'Wild Magic', 'Divine Soul', 'Aberrant Mind'],
      suggestedStats: { strength: 8, dexterity: 13, constitution: 14, intelligence: 10, wisdom: 12, charisma: 15 } },
    { id: 'warlock', name: 'Warlock', hitDie: 8, primaryAbility: 'Charisma', savingThrows: ['Wisdom', 'Charisma'],
      subclasses: ['The Fiend', 'The Archfey', 'The Great Old One', 'The Hexblade'],
      suggestedStats: { strength: 8, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 15 } },
    { id: 'wizard', name: 'Wizard', hitDie: 6, primaryAbility: 'Intelligence', savingThrows: ['Intelligence', 'Wisdom'],
      subclasses: ['School of Evocation', 'School of Abjuration', 'School of Divination', 'School of Necromancy'],
      suggestedStats: { strength: 8, dexterity: 13, constitution: 14, intelligence: 15, wisdom: 12, charisma: 10 } },
  ],
  backgrounds: [
    { id: 'acolyte', name: 'Acolyte', skills: ['Insight', 'Religion'], feature: 'Shelter of the Faithful' },
    { id: 'charlatan', name: 'Charlatan', skills: ['Deception', 'Sleight of Hand'], feature: 'False Identity' },
    { id: 'criminal', name: 'Criminal', skills: ['Deception', 'Stealth'], feature: 'Criminal Contact' },
    { id: 'entertainer', name: 'Entertainer', skills: ['Acrobatics', 'Performance'], feature: "By Popular Demand" },
    { id: 'folk-hero', name: 'Folk Hero', skills: ['Animal Handling', 'Survival'], feature: 'Rustic Hospitality' },
    { id: 'guild-artisan', name: 'Guild Artisan', skills: ['Insight', 'Persuasion'], feature: 'Guild Membership' },
    { id: 'hermit', name: 'Hermit', skills: ['Medicine', 'Religion'], feature: 'Discovery' },
    { id: 'noble', name: 'Noble', skills: ['History', 'Persuasion'], feature: 'Position of Privilege' },
    { id: 'outlander', name: 'Outlander', skills: ['Athletics', 'Survival'], feature: 'Wanderer' },
    { id: 'sage', name: 'Sage', skills: ['Arcana', 'History'], feature: 'Researcher' },
    { id: 'sailor', name: 'Sailor', skills: ['Athletics', 'Perception'], feature: "Ship's Passage" },
    { id: 'soldier', name: 'Soldier', skills: ['Athletics', 'Intimidation'], feature: 'Military Rank' },
  ]
};

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const STAT_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const STAT_LABELS = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

function PlayersTab({ campaignId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [characterData, setCharacterData] = useState({
    name: '',
    level: 1,
    race: null,
    subrace: null,
    class: null,
    subclass: null,
    background: null,
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    notes: ''
  });
  
  // Stats method state
  const [statMethod, setStatMethod] = useState('standard'); // 'standard', 'suggested', 'custom', 'rolled'
  const [standardArrayAssignments, setStandardArrayAssignments] = useState({});
  const [rolledStats, setRolledStats] = useState([]);
  const [rolledAssignments, setRolledAssignments] = useState({});
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, [campaignId]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/players`);
      setPlayers(response.data);
    } catch (error) {
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const calculateModifier = (stat) => Math.floor((stat - 10) / 2);

  const calculateHP = () => {
    if (!characterData.class) return 10;
    const classData = DND_DATA.classes.find(c => c.id === characterData.class);
    const conMod = calculateModifier(characterData.stats.constitution);
    // HP = Hit Die + CON mod at level 1, then average + CON mod per level
    const baseHP = classData.hitDie + conMod;
    const levelHP = characterData.level > 1 ? (characterData.level - 1) * (Math.floor(classData.hitDie / 2) + 1 + conMod) : 0;
    return Math.max(1, baseHP + levelHP);
  };

  const calculateAC = () => {
    return 10 + calculateModifier(characterData.stats.dexterity);
  };

  // Roll 4d6 drop lowest
  const roll4d6DropLowest = () => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    return { rolls, total: rolls[0] + rolls[1] + rolls[2] };
  };

  // Roll all 6 stats
  const rollAllStats = () => {
    setIsRolling(true);
    
    // Animate rolling
    let count = 0;
    const interval = setInterval(() => {
      setRolledStats(Array.from({ length: 6 }, () => ({
        rolls: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1],
        total: Math.floor(Math.random() * 13) + 6
      })));
      count++;
      if (count >= 8) {
        clearInterval(interval);
        // Final roll
        const finalStats = Array.from({ length: 6 }, () => roll4d6DropLowest());
        setRolledStats(finalStats);
        setRolledAssignments({});
        setIsRolling(false);
        toast.success('Stats rolled! Assign them to abilities.');
      }
    }, 100);
  };

  // Apply stats based on method
  const applyStats = () => {
    let newStats = { ...characterData.stats };
    
    if (statMethod === 'standard') {
      STAT_NAMES.forEach(stat => {
        if (standardArrayAssignments[stat] !== undefined) {
          newStats[stat] = standardArrayAssignments[stat];
        }
      });
    } else if (statMethod === 'suggested') {
      const classData = DND_DATA.classes.find(c => c.id === characterData.class);
      if (classData?.suggestedStats) {
        newStats = { ...classData.suggestedStats };
      }
    } else if (statMethod === 'rolled') {
      STAT_NAMES.forEach(stat => {
        if (rolledAssignments[stat] !== undefined) {
          newStats[stat] = rolledStats[rolledAssignments[stat]].total;
        }
      });
    }
    // 'custom' keeps current stats
    
    setCharacterData({ ...characterData, stats: newStats });
  };

  // Check if all standard array values are assigned
  const isStandardArrayComplete = () => {
    const assigned = Object.values(standardArrayAssignments);
    return assigned.length === 6 && STANDARD_ARRAY.every(val => assigned.includes(val));
  };

  // Check if all rolled stats are assigned
  const isRolledComplete = () => {
    const assigned = Object.values(rolledAssignments);
    return assigned.length === 6 && [0, 1, 2, 3, 4, 5].every(idx => assigned.includes(idx));
  };

  // Get available standard array values
  const getAvailableStandardValues = () => {
    const assigned = Object.values(standardArrayAssignments);
    return STANDARD_ARRAY.filter(val => !assigned.includes(val));
  };

  // Get available rolled stat indices
  const getAvailableRolledIndices = () => {
    const assigned = Object.values(rolledAssignments);
    return [0, 1, 2, 3, 4, 5].filter(idx => !assigned.includes(idx));
  };

  const handleSubmit = async () => {
    if (!characterData.name || !characterData.race || !characterData.class) {
      toast.error('Please complete all required steps');
      return;
    }

    // Apply stats before submitting
    applyStats();

    const classData = DND_DATA.classes.find(c => c.id === characterData.class);
    const raceData = DND_DATA.races.find(r => r.id === characterData.race);
    const backgroundData = DND_DATA.backgrounds.find(b => b.id === characterData.background);

    const formData = {
      name: characterData.name,
      character_class: `${classData.name}${characterData.subclass ? ` (${characterData.subclass})` : ''}`,
      level: characterData.level,
      hp: calculateHP(),
      max_hp: calculateHP(),
      ac: calculateAC(),
      stats: characterData.stats,
      notes: `Race: ${raceData.name}${characterData.subrace ? ` (${characterData.subrace})` : ''}\nBackground: ${backgroundData?.name || 'None'}\nTraits: ${raceData.traits}`
    };

    try {
      if (editingPlayer) {
        await axios.put(`${API}/campaigns/${campaignId}/players/${editingPlayer.id}`, formData);
        toast.success('Player updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/players`, formData);
        toast.success('Player created!');
      }
      fetchPlayers();
      resetForm();
    } catch (error) {
      toast.error('Failed to save player');
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setCharacterData({
      name: player.name,
      level: player.level,
      race: null,
      subrace: null,
      class: null,
      subclass: null,
      background: null,
      stats: player.stats,
      notes: player.notes
    });
    setStatMethod('custom');
    setWizardStep(5);
    setShowDialog(true);
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm('Delete this player?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/players/${playerId}`);
      toast.success('Player deleted');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const resetForm = () => {
    setCharacterData({
      name: '',
      level: 1,
      race: null,
      subrace: null,
      class: null,
      subclass: null,
      background: null,
      stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
      notes: ''
    });
    setEditingPlayer(null);
    setWizardStep(1);
    setStatMethod('standard');
    setStandardArrayAssignments({});
    setRolledStats([]);
    setRolledAssignments({});
    setShowDialog(false);
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return characterData.name.trim().length > 0;
      case 2: return characterData.race !== null;
      case 3: return characterData.class !== null;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const selectedRace = DND_DATA.races.find(r => r.id === characterData.race);
  const selectedClass = DND_DATA.classes.find(c => c.id === characterData.class);

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif', fontWeight: '800' }}>Players</h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-player-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Create Character
            </Button>
          </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <DialogHeader>
              <DialogTitle style={{ fontSize: '24px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif', fontWeight: '800' }}>
                {editingPlayer ? 'Edit Character' : 'Character Creator'}
              </DialogTitle>
            </DialogHeader>
            
            {/* Progress Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', gap: '8px' }}>
              {['Name & Level', 'Race', 'Class', 'Background', 'Stats'].map((step, idx) => (
                <div 
                  key={step}
                  onClick={() => idx + 1 <= wizardStep && setWizardStep(idx + 1)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 8px',
                    cursor: idx + 1 <= wizardStep ? 'pointer' : 'default',
                    background: wizardStep === idx + 1 ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' : 
                               idx + 1 < wizardStep ? 'rgba(34, 197, 94, 0.3)' : 'rgba(10, 10, 40, 0.6)',
                    border: `2px solid ${wizardStep === idx + 1 ? '#22c55e' : idx + 1 < wizardStep ? '#22c55e' : '#1e40af'}`,
                    borderRadius: '10px',
                    opacity: idx + 1 > wizardStep ? 0.5 : 1,
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ fontSize: '11px', marginBottom: '2px', color: '#94a3b8' }}>Step {idx + 1}</div>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#ffffff' }}>{step}</div>
                  {idx + 1 < wizardStep && <Check size={14} style={{ marginTop: '4px', color: '#22c55e' }} />}
                </div>
              ))}
            </div>

            {/* Step 1: Name & Level */}
            {wizardStep === 1 && (
              <div className="glow-panel">
                <h3 style={{ color: '#22c55e', marginBottom: '20px', fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}>
                  Character Name & Level
                </h3>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Character Name
                  </label>
                  <Input
                    data-testid="character-name-input"
                    value={characterData.name}
                    onChange={(e) => setCharacterData({ ...characterData, name: e.target.value })}
                    placeholder="Enter character name..."
                    className="input-glow"
                    style={{ fontSize: '18px', padding: '16px' }}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Starting Level
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setCharacterData({ ...characterData, level: lvl })}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          border: characterData.level === lvl ? '2px solid #22c55e' : '2px solid #1e40af',
                          background: characterData.level === lvl ? 'rgba(34, 197, 94, 0.3)' : 'rgba(10, 10, 40, 0.6)',
                          color: characterData.level === lvl ? '#22c55e' : '#ffffff',
                          fontWeight: '700',
                          fontSize: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'Montserrat, sans-serif'
                        }}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Race */}
            {wizardStep === 2 && (
              <div className="glow-panel">
                <h3 style={{ color: '#22c55e', marginBottom: '20px', fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}>
                  Choose Your Race
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {DND_DATA.races.map(race => (
                    <div
                      key={race.id}
                      data-testid={`race-${race.id}`}
                      onClick={() => setCharacterData({ ...characterData, race: race.id, subrace: null })}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: characterData.race === race.id ? '2px solid #22c55e' : '2px solid #1e40af',
                        background: characterData.race === race.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>{race.name}</div>
                      <div style={{ fontSize: '11px', color: '#67e8f9' }}>Speed: {race.speed}ft • {race.size}</div>
                    </div>
                  ))}
                </div>
                {selectedRace?.subraces && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#67e8f9', marginBottom: '12px', fontWeight: '600' }}>Choose Subrace</h4>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {selectedRace.subraces.map(subrace => (
                        <button
                          key={subrace}
                          onClick={() => setCharacterData({ ...characterData, subrace })}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: characterData.subrace === subrace ? '2px solid #22c55e' : '2px solid #1e40af',
                            background: characterData.subrace === subrace ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {subrace}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRace && (
                  <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #4a7dff', borderRadius: '10px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                      <strong style={{ color: '#22c55e' }}>Traits:</strong> {selectedRace.traits}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Class */}
            {wizardStep === 3 && (
              <div className="glow-panel">
                <h3 style={{ color: '#22c55e', marginBottom: '20px', fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}>
                  Choose Your Class
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {DND_DATA.classes.map(cls => (
                    <div
                      key={cls.id}
                      data-testid={`class-${cls.id}`}
                      onClick={() => setCharacterData({ ...characterData, class: cls.id, subclass: null })}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: characterData.class === cls.id ? '2px solid #22c55e' : '2px solid #1e40af',
                        background: characterData.class === cls.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>{cls.name}</div>
                      <div style={{ fontSize: '11px', color: '#67e8f9' }}>Hit Die: d{cls.hitDie}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{cls.primaryAbility}</div>
                    </div>
                  ))}
                </div>
                {selectedClass && characterData.level >= 3 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#67e8f9', marginBottom: '12px', fontWeight: '600' }}>Choose Subclass</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {selectedClass.subclasses.map(subclass => (
                        <button
                          key={subclass}
                          onClick={() => setCharacterData({ ...characterData, subclass })}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: characterData.subclass === subclass ? '2px solid #22c55e' : '2px solid #1e40af',
                            background: characterData.subclass === subclass ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}
                        >
                          {subclass}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Background */}
            {wizardStep === 4 && (
              <div className="glow-panel">
                <h3 style={{ color: '#22c55e', marginBottom: '20px', fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}>
                  Choose Your Background
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {DND_DATA.backgrounds.map(bg => (
                    <div
                      key={bg.id}
                      data-testid={`background-${bg.id}`}
                      onClick={() => setCharacterData({ ...characterData, background: bg.id })}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: characterData.background === bg.id ? '2px solid #22c55e' : '2px solid #1e40af',
                        background: characterData.background === bg.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>{bg.name}</div>
                      <div style={{ fontSize: '11px', color: '#67e8f9' }}>Skills: {bg.skills.join(', ')}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{bg.feature}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Stats */}
            {wizardStep === 5 && (
              <div className="glow-panel">
                <h3 style={{ color: '#22c55e', marginBottom: '20px', fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}>
                  Set Ability Scores
                </h3>
                
                {/* Stat Method Selection */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    How do you want to determine stats?
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'standard', label: 'Standard Array', desc: '15, 14, 13, 12, 10, 8' },
                      { id: 'suggested', label: 'Suggested for Class', desc: `Optimized for ${selectedClass?.name || 'your class'}` },
                      { id: 'rolled', label: 'Roll Stats', desc: '4d6 drop lowest' },
                      { id: 'custom', label: 'Custom', desc: 'Enter manually' }
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => {
                          setStatMethod(method.id);
                          if (method.id === 'suggested' && selectedClass?.suggestedStats) {
                            setCharacterData({ ...characterData, stats: { ...selectedClass.suggestedStats } });
                          }
                        }}
                        style={{
                          flex: '1 1 180px',
                          padding: '14px',
                          borderRadius: '12px',
                          border: statMethod === method.id ? '2px solid #22c55e' : '2px solid #1e40af',
                          background: statMethod === method.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>{method.label}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{method.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Standard Array Assignment */}
                {statMethod === 'standard' && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
                      Assign each value to an ability score. Click a stat, then click a value.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      {STANDARD_ARRAY.map(val => {
                        const isUsed = Object.values(standardArrayAssignments).includes(val);
                        return (
                          <div
                            key={val}
                            style={{
                              width: '50px',
                              height: '50px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '10px',
                              border: '2px solid #4a7dff',
                              background: isUsed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(10, 10, 40, 0.6)',
                              color: isUsed ? '#22c55e' : '#ffffff',
                              fontWeight: '700',
                              fontSize: '18px',
                              fontFamily: 'Montserrat, sans-serif',
                              opacity: isUsed ? 0.5 : 1
                            }}
                          >
                            {val}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {STAT_NAMES.map(stat => (
                        <div key={stat} style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '12px', padding: '12px' }}>
                          <label style={{ display: 'block', color: '#67e8f9', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                            {STAT_LABELS[stat]}
                          </label>
                          <select
                            value={standardArrayAssignments[stat] || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val) {
                                setStandardArrayAssignments({ ...standardArrayAssignments, [stat]: val });
                                setCharacterData({ ...characterData, stats: { ...characterData.stats, [stat]: val } });
                              } else {
                                const { [stat]: _, ...rest } = standardArrayAssignments;
                                setStandardArrayAssignments(rest);
                              }
                            }}
                            className="input-glow"
                            style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700' }}
                          >
                            <option value="">-</option>
                            {getAvailableStandardValues().concat(standardArrayAssignments[stat] ? [standardArrayAssignments[stat]] : [])
                              .sort((a, b) => b - a)
                              .filter((v, i, arr) => arr.indexOf(v) === i)
                              .map(val => (
                                <option key={val} value={val}>{val}</option>
                              ))}
                          </select>
                          <div style={{ marginTop: '4px', color: '#22c55e', fontWeight: '600', textAlign: 'center' }}>
                            {standardArrayAssignments[stat] ? `${calculateModifier(standardArrayAssignments[stat]) >= 0 ? '+' : ''}${calculateModifier(standardArrayAssignments[stat])}` : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Stats */}
                {statMethod === 'suggested' && selectedClass && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                      Optimized stat distribution for {selectedClass.name}. Primary: {selectedClass.primaryAbility}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {STAT_NAMES.map(stat => (
                        <div key={stat} style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #22c55e', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <label style={{ display: 'block', color: '#67e8f9', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600' }}>
                            {STAT_LABELS[stat]}
                          </label>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', fontFamily: 'Montserrat, sans-serif' }}>
                            {characterData.stats[stat]}
                          </div>
                          <div style={{ marginTop: '4px', color: '#22c55e', fontWeight: '600' }}>
                            {calculateModifier(characterData.stats[stat]) >= 0 ? '+' : ''}{calculateModifier(characterData.stats[stat])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rolled Stats */}
                {statMethod === 'rolled' && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                      <Button
                        onClick={rollAllStats}
                        disabled={isRolling}
                        className="btn-primary"
                        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                      >
                        <Dices size={18} className={isRolling ? 'animate-spin' : ''} />
                        {isRolling ? 'Rolling...' : rolledStats.length > 0 ? 'Reroll All' : 'Roll Stats'}
                      </Button>
                      {rolledStats.length > 0 && (
                        <Button
                          onClick={() => { setRolledStats([]); setRolledAssignments({}); }}
                          className="btn-outline"
                          style={{ display: 'flex', gap: '6px' }}
                        >
                          <RotateCcw size={16} /> Clear
                        </Button>
                      )}
                    </div>
                    
                    {rolledStats.length > 0 && (
                      <>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
                          Your rolled stats (4d6 drop lowest). Assign each to an ability.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                          {rolledStats.map((roll, idx) => {
                            const isUsed = Object.values(rolledAssignments).includes(idx);
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: '10px',
                                  border: '2px solid #4a7dff',
                                  background: isUsed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(10, 10, 40, 0.6)',
                                  opacity: isUsed ? 0.5 : 1,
                                  textAlign: 'center'
                                }}
                              >
                                <div style={{ fontSize: '24px', fontWeight: '700', color: isUsed ? '#22c55e' : '#ffffff', fontFamily: 'Montserrat, sans-serif' }}>
                                  {roll.total}
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  [{roll.rolls.join(', ')}]
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                          {STAT_NAMES.map(stat => (
                            <div key={stat} style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '12px', padding: '12px' }}>
                              <label style={{ display: 'block', color: '#67e8f9', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                                {STAT_LABELS[stat]}
                              </label>
                              <select
                                value={rolledAssignments[stat] !== undefined ? rolledAssignments[stat] : ''}
                                onChange={(e) => {
                                  const idx = parseInt(e.target.value);
                                  if (!isNaN(idx)) {
                                    setRolledAssignments({ ...rolledAssignments, [stat]: idx });
                                    setCharacterData({ ...characterData, stats: { ...characterData.stats, [stat]: rolledStats[idx].total } });
                                  } else {
                                    const { [stat]: _, ...rest } = rolledAssignments;
                                    setRolledAssignments(rest);
                                  }
                                }}
                                className="input-glow"
                                style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700' }}
                              >
                                <option value="">-</option>
                                {getAvailableRolledIndices().concat(rolledAssignments[stat] !== undefined ? [rolledAssignments[stat]] : [])
                                  .filter((v, i, arr) => arr.indexOf(v) === i)
                                  .sort((a, b) => rolledStats[b].total - rolledStats[a].total)
                                  .map(idx => (
                                    <option key={idx} value={idx}>{rolledStats[idx].total}</option>
                                  ))}
                              </select>
                              <div style={{ marginTop: '4px', color: '#22c55e', fontWeight: '600', textAlign: 'center' }}>
                                {rolledAssignments[stat] !== undefined ? `${calculateModifier(rolledStats[rolledAssignments[stat]].total) >= 0 ? '+' : ''}${calculateModifier(rolledStats[rolledAssignments[stat]].total)}` : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Custom Stats */}
                {statMethod === 'custom' && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                      Enter your ability scores manually (1-20).
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {STAT_NAMES.map(stat => (
                        <div key={stat} style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <label style={{ display: 'block', color: '#67e8f9', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600' }}>
                            {STAT_LABELS[stat]}
                          </label>
                          <Input
                            data-testid={`stat-${stat}`}
                            type="number"
                            min="1"
                            max="20"
                            value={characterData.stats[stat]}
                            onChange={(e) => setCharacterData({
                              ...characterData,
                              stats: { ...characterData.stats, [stat]: parseInt(e.target.value) || 10 }
                            })}
                            className="input-glow"
                            style={{ textAlign: 'center', fontSize: '20px', fontWeight: '700' }}
                          />
                          <div style={{ marginTop: '4px', color: '#22c55e', fontWeight: '600' }}>
                            {calculateModifier(characterData.stats[stat]) >= 0 ? '+' : ''}{calculateModifier(characterData.stats[stat])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calculated Values */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
                  <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #ef4444', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Hit Points</div>
                    <div style={{ color: '#ef4444', fontSize: '32px', fontWeight: '800', fontFamily: 'Montserrat, sans-serif' }}>{calculateHP()}</div>
                  </div>
                  <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #4a7dff', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Armor Class</div>
                    <div style={{ color: '#4a7dff', fontSize: '32px', fontWeight: '800', fontFamily: 'Montserrat, sans-serif' }}>{calculateAC()}</div>
                  </div>
                  <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #22c55e', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Level</div>
                    <div style={{ color: '#22c55e', fontSize: '32px', fontWeight: '800', fontFamily: 'Montserrat, sans-serif' }}>{characterData.level}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <Button
                onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                className="btn-secondary"
                disabled={wizardStep === 1}
                style={{ opacity: wizardStep === 1 ? 0.5 : 1, display: 'flex', gap: '6px' }}
              >
                <ChevronLeft size={16} /> Back
              </Button>
              {wizardStep < 5 ? (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="btn-primary"
                  disabled={!canProceed()}
                  style={{ opacity: canProceed() ? 1 : 0.5, display: 'flex', gap: '6px' }}
                >
                  Next <ChevronRight size={16} />
                </Button>
              ) : (
                <Button
                  data-testid="create-character-btn"
                  onClick={handleSubmit}
                  className="btn-primary"
                  style={{ display: 'flex', gap: '8px' }}
                >
                  <Check size={16} />
                  {editingPlayer ? 'Update' : 'Create'} Character
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {players.length === 0 ? (
        <div className="glow-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <User size={48} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
          <p style={{ color: '#ffffff' }}>No players added yet. Create your first character!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '20px' }}>
          {players.map(player => (
            <div key={player.id} data-testid={`player-card-${player.id}`} className="card-glow">
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif', fontWeight: '700', marginBottom: '4px' }}>
                  {player.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#22c55e', fontWeight: '600' }}>
                  {player.character_class} • Level {player.level}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#67e8f9' }}>HP</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>{player.hp}/{player.max_hp}</span>
                </div>
                <div className="hp-bar">
                  <div className="hp-bar-fill" style={{ width: `${(player.hp / player.max_hp) * 100}%` }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div className="stat-block" style={{ flex: 1 }}>
                  <div className="stat-label">AC</div>
                  <div className="stat-value">{player.ac}</div>
                </div>
                <div className="stat-block" style={{ flex: 1 }}>
                  <div className="stat-label">STR</div>
                  <div className="stat-value">{player.stats.strength}</div>
                </div>
                <div className="stat-block" style={{ flex: 1 }}>
                  <div className="stat-label">DEX</div>
                  <div className="stat-value">{player.stats.dexterity}</div>
                </div>
              </div>
              {player.notes && (
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', whiteSpace: 'pre-line' }}>{player.notes}</p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button data-testid={`edit-player-btn-${player.id}`} onClick={() => handleEdit(player)} className="btn-outline" style={{ flex: 1 }}>
                  <Edit size={14} />
                </Button>
                <Button data-testid={`delete-player-btn-${player.id}`} onClick={() => handleDelete(player.id)} className="btn-danger">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayersTab;
