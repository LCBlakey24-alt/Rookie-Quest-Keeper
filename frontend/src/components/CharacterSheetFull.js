import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Heart, Shield, Zap, Swords, BookOpen, Backpack, ChevronLeft,
  Plus, Minus, Skull, Wind, Edit3, Dices, Target, Sparkles, ArrowUp
} from 'lucide-react';
import LevelUpWizard from './LevelUpWizard';
import CharacterInventory from './CharacterInventory';
import CharacterCombatTab from './CharacterCombatTab';
import CharacterSpellbook from './CharacterSpellbook';
import SessionJournal from './SessionJournal';
import PlayerProgressionDashboard from './PlayerProgressionDashboard';
import { CLASS_FEATURES } from '../data/classFeatures';
import { SPELLCASTING_CLASSES, SPELL_SLOTS, PACT_MAGIC_SLOTS, SPELL_DATABASE } from '../data/spellDatabase';
import DiceRoller3D from './ui/DiceRoller3D';
import DiceRollHistory from './DiceRollHistory';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme - Electric Tundra (Player Mode)
const theme = {
  bg: { primary: '#050A30', surface: '#0A1140', elevated: '#0C1650' },
  accent: { primary: '#4DD0E1', secondary: '#0066FF', highlight: '#00CED1' },
  text: { primary: '#F0F8FF', secondary: '#9EB0D0', muted: '#6B7B9B' },
  border: 'rgba(77, 208, 225, 0.3)',
  glow: '0 0 20px rgba(77, 208, 225, 0.3)'
};

const getModifier = (score) => Math.floor((score - 10) / 2);
const formatModifier = (mod) => (mod >= 0 ? `+${mod}` : `${mod}`);

const SKILLS = [
  { name: 'Acrobatics', ability: 'dexterity' },
  { name: 'Animal Handling', ability: 'wisdom' },
  { name: 'Arcana', ability: 'intelligence' },
  { name: 'Athletics', ability: 'strength' },
  { name: 'Deception', ability: 'charisma' },
  { name: 'History', ability: 'intelligence' },
  { name: 'Insight', ability: 'wisdom' },
  { name: 'Intimidation', ability: 'charisma' },
  { name: 'Investigation', ability: 'intelligence' },
  { name: 'Medicine', ability: 'wisdom' },
  { name: 'Nature', ability: 'intelligence' },
  { name: 'Perception', ability: 'wisdom' },
  { name: 'Performance', ability: 'charisma' },
  { name: 'Persuasion', ability: 'charisma' },
  { name: 'Religion', ability: 'intelligence' },
  { name: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'Stealth', ability: 'dexterity' },
  { name: 'Survival', ability: 'wisdom' }
];

const SAVING_THROWS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ABILITY_SHORT = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

// Class features data - expanded
const CLASS_ACTIONS = {
  Barbarian: {
    actions: [
      { name: 'Reckless Attack', desc: 'Advantage on STR attacks, enemies have advantage on you', type: 'attack', dice: '1d20' }
    ],
    bonusActions: [
      { name: 'Rage', desc: '+2 damage, resistance to physical damage', type: 'ability', level: 1 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Bard: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' }
    ],
    bonusActions: [
      { name: 'Bardic Inspiration', desc: 'Give ally 1d6 inspiration die', type: 'support', dice: '1d6', level: 1 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Cutting Words', desc: 'Subtract 1d6 from enemy roll', type: 'support', dice: '1d6', level: 3 }
    ]
  },
  Cleric: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: 'Turn Undead', desc: 'Channel Divinity: undead must flee', type: 'ability', level: 2 }
    ],
    bonusActions: [
      { name: 'Spiritual Weapon', desc: 'Attack with spiritual weapon', type: 'spell', dice: '1d8', level: 3 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Warding Flare', desc: 'Impose disadvantage on attack (Light)', type: 'ability', level: 1 }
    ]
  },
  Druid: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: 'Wild Shape', desc: 'Transform into beast form', type: 'ability', level: 2 }
    ],
    bonusActions: [
      { name: 'Wild Shape', desc: 'Transform into beast (bonus at lvl 2)', type: 'ability', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Fighter: {
    actions: [
      { name: 'Second Wind', desc: 'Regain 1d10 + level HP', type: 'heal', dice: '1d10', level: 1 },
      { name: 'Action Surge', desc: 'Take an additional action (1/rest)', type: 'ability', level: 2 }
    ],
    bonusActions: [],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Monk: {
    actions: [
      { name: 'Flurry of Blows', desc: 'Two unarmed strikes (1 ki)', type: 'attack', dice: '1d20', level: 2 },
      { name: 'Stunning Strike', desc: 'Stun target on hit (1 ki)', type: 'ability', level: 5 }
    ],
    bonusActions: [
      { name: 'Martial Arts', desc: 'Unarmed strike or monk weapon', type: 'attack', dice: '1d20', level: 1 },
      { name: 'Patient Defense', desc: 'Dodge as bonus action (1 ki)', type: 'defense', level: 2 },
      { name: 'Step of the Wind', desc: 'Dash/Disengage + jump (1 ki)', type: 'move', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Deflect Missiles', desc: 'Reduce ranged damage by 1d10+DEX+lvl', type: 'defense', dice: '1d10', level: 3 },
      { name: 'Slow Fall', desc: 'Reduce fall damage by 5x level', type: 'defense', level: 4 }
    ]
  },
  Paladin: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: 'Lay on Hands', desc: 'Heal up to 5x level HP', type: 'heal', level: 1 },
      { name: 'Channel Divinity', desc: 'Sacred Weapon or Turn Unholy', type: 'ability', level: 3 }
    ],
    bonusActions: [
      { name: 'Divine Smite', desc: 'Add 2d8+ radiant to hit (spell slot)', type: 'attack', dice: '2d8', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Ranger: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: "Hunter's Mark", desc: '+1d6 damage to marked target', type: 'spell', dice: '1d6', level: 2 }
    ],
    bonusActions: [
      { name: "Hunter's Mark", desc: 'Mark a creature (bonus action)', type: 'spell', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Rogue: {
    actions: [
      { name: 'Sneak Attack', desc: 'Extra 1d6 damage with advantage', type: 'attack', dice: '1d6', level: 1 }
    ],
    bonusActions: [
      { name: 'Cunning Action', desc: 'Dash, Disengage, or Hide', type: 'ability', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Uncanny Dodge', desc: 'Halve attack damage', type: 'defense', level: 5 }
    ]
  },
  Sorcerer: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' }
    ],
    bonusActions: [
      { name: 'Quickened Spell', desc: 'Cast spell as bonus (2 SP)', type: 'spell', level: 3 },
      { name: 'Font of Magic', desc: 'Convert spell slots to SP or vice versa', type: 'ability', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Warlock: {
    actions: [
      { name: 'Eldritch Blast', desc: '1d10 force, +CHA if Agonizing', type: 'spell', dice: '1d10', level: 1 },
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' }
    ],
    bonusActions: [
      { name: "Hexblade's Curse", desc: '+prof damage, crit on 19-20', type: 'ability', level: 1 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Armor of Hexes', desc: '50% miss chance vs cursed', type: 'defense', level: 10 }
    ]
  },
  Wizard: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: 'Arcane Recovery', desc: 'Recover spell slots (1/day)', type: 'ability', level: 1 }
    ],
    bonusActions: [],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Shield', desc: '+5 AC until next turn (spell)', type: 'spell', level: 1 }
    ]
  }
};

// Default actions for all classes
const DEFAULT_ACTIONS = {
  actions: [
    { name: 'Attack', desc: 'Make a melee or ranged attack', type: 'attack', dice: '1d20' },
    { name: 'Dash', desc: 'Double movement speed', type: 'move' },
    { name: 'Dodge', desc: 'Attacks against you have disadvantage', type: 'defense' },
    { name: 'Help', desc: 'Give ally advantage on next check', type: 'support' },
    { name: 'Hide', desc: 'Make a Stealth check', type: 'skill', dice: '1d20' },
    { name: 'Ready', desc: 'Prepare an action for a trigger', type: 'ability' }
  ],
  bonusActions: [],
  reactions: [
    { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
  ]
};

export default function CharacterSheetFull() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentHp, setCurrentHp] = useState(0);
  const [tempHp, setTempHp] = useState(0);
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  
  // Spell slot tracking - { 1: 0, 2: 0, ... } = used slots per level
  const [usedSlots, setUsedSlots] = useState({});
  
  // 3D Dice Roller state
  const [show3DDice, setShow3DDice] = useState(false);
  const [diceRolls, setDiceRolls] = useState([]);
  const [diceLabel, setDiceLabel] = useState('');
  const [diceModifier, setDiceModifier] = useState(0);
  const [diceTotal, setDiceTotal] = useState(0);
  const [diceCrit, setDiceCrit] = useState(false);
  const [diceFumble, setDiceFumble] = useState(false);
  const [diceHistory, setDiceHistory] = useState([]);

  // 3D Dice Roll Function - supports compound notation like "2d6+1d4" or "1d20+1d4"
  const rollDice = (notation, modifier = 0, label = '') => {
    // Parse compound dice: "2d6+1d4+3" or simple "1d20"
    const diceGroups = notation.match(/(\d+)?d(\d+)/gi) || [];
    if (diceGroups.length === 0) return;
    
    const numMod = typeof modifier === 'number' ? modifier : (parseInt(modifier) || 0);
    const strLabel = typeof label === 'string' ? label : String(label || notation);
    
    const rolls = [];
    let total = 0;
    
    for (const group of diceGroups) {
      const match = group.match(/(\d+)?d(\d+)/i);
      if (!match) continue;
      const count = parseInt(match[1]) || 1;
      const sides = parseInt(match[2]);
      for (let i = 0; i < count; i++) {
        const result = Math.floor(Math.random() * sides) + 1;
        rolls.push({ sides, result });
        total += result;
      }
    }
    
    // Check for inline modifiers like "+5" in notation
    const inlineMod = notation.replace(/(\d+)?d(\d+)/gi, '').match(/([+-]\d+)/g);
    let totalMod = numMod;
    if (inlineMod) {
      inlineMod.forEach(m => { totalMod += parseInt(m); });
    }
    total += totalMod;
    
    const isCrit = rolls.length >= 1 && rolls[0].sides === 20 && rolls[0].result === 20;
    const isFumble = rolls.length >= 1 && rolls[0].sides === 20 && rolls[0].result === 1;
    
    setDiceRolls(rolls);
    setDiceLabel(strLabel || notation);
    setDiceModifier(totalMod);
    setDiceTotal(total);
    setDiceCrit(isCrit);
    setDiceFumble(isFumble);
    setShow3DDice(true);

    setDiceHistory(prev => [{
      label: strLabel || notation, total, modifier: totalMod,
      rolls, isCrit, isFumble,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (characterId) fetchCharacter();
  }, [characterId]);

  const fetchCharacter = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/characters/${characterId}`);
      setCharacter(response.data);
      // Clamp HP to ensure it never exceeds max_hp (fixes bug where HP displays higher than max)
      const charMaxHp = response.data.max_hp || 10;
      const charHp = response.data.hp || charMaxHp;
      setCurrentHp(Math.min(charHp, charMaxHp));
    } catch (err) {
      setError('Failed to load character');
      toast.error('Failed to load character');
    } finally {
      setLoading(false);
    }
  };

  const abilities = useMemo(() => {
    if (!character) return {};
    return {
      strength: character.strength || 10,
      dexterity: character.dexterity || 10,
      constitution: character.constitution || 10,
      intelligence: character.intelligence || 10,
      wisdom: character.wisdom || 10,
      charisma: character.charisma || 10
    };
  }, [character]);

  const profBonus = useMemo(() => Math.ceil((character?.level || 1) / 4) + 1, [character]);
  const maxHp = character?.max_hp || (8 + getModifier(abilities.constitution));
  const ac = character?.ac || (10 + getModifier(abilities.dexterity));
  const initiative = getModifier(abilities.dexterity);
  const speed = character?.speed || 30;

  // Get class-specific actions
  const classActions = useMemo(() => {
    const className = character?.character_class;
    const level = character?.level || 1;
    const base = CLASS_ACTIONS[className] || DEFAULT_ACTIONS;
    
    // Filter by level
    const filterByLevel = (arr) => arr.filter(a => !a.level || a.level <= level);
    
    return {
      actions: [...DEFAULT_ACTIONS.actions, ...filterByLevel(base.actions || [])],
      bonusActions: filterByLevel(base.bonusActions || []),
      reactions: filterByLevel(base.reactions || DEFAULT_ACTIONS.reactions)
    };
  }, [character]);

  const handleHpChange = async (delta) => {
    // Handle damage (negative delta)
    if (delta < 0) {
      const damage = Math.abs(delta);
      // Damage temp HP first
      if (tempHp > 0) {
        if (damage <= tempHp) {
          setTempHp(tempHp - damage);
          return; // All damage absorbed by temp HP
        } else {
          const remainingDamage = damage - tempHp;
          setTempHp(0);
          const newHp = Math.max(0, currentHp - remainingDamage);
          setCurrentHp(newHp);
          try {
            await axios.patch(`${API}/characters/${characterId}`, { hp: newHp });
          } catch (err) {
            console.error('Failed to update HP');
          }
          return;
        }
      }
    }
    
    // Healing or direct damage without temp HP
    const newHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    setCurrentHp(newHp);
    try {
      await axios.patch(`${API}/characters/${characterId}`, { hp: newHp });
    } catch (err) {
      console.error('Failed to update HP');
    }
  };

  const handleTempHpChange = (delta) => {
    const newTempHp = Math.max(0, tempHp + delta);
    setTempHp(newTempHp);
  };

  const handleRoll = (action, ability = null) => {
    if (!action.dice) {
      toast.info(`${action.name}: ${action.desc}`);
      return;
    }
    
    let modifier = 0;
    if (action.type === 'attack' || action.type === 'spell') {
      modifier = profBonus + (ability ? getModifier(abilities[ability]) : getModifier(abilities.strength));
    } else if (action.type === 'skill') {
      modifier = ability ? getModifier(abilities[ability]) : 0;
    }
    
    rollDice(action.dice, modifier, action.name);
  };

  // Resource & Rest handlers
  const handleUpdateCharacter = async (updates) => {
    setCharacter(prev => prev ? { ...prev, ...updates } : prev);
    try {
      await axios.patch(`${API}/characters/${characterId}`, updates);
    } catch (err) {
      console.error('Failed to persist character update:', err);
    }
  };

  const handleUpdateResources = async (resources) => {
    try {
      await axios.put(`${API}/characters/${characterId}/resources`, resources);
      setCharacter(prev => prev ? { ...prev, resources } : prev);
    } catch (err) {
      console.error('Failed to update resources');
    }
  };

  const handleRest = async (type) => {
    try {
      const url = type === 'short'
        ? `${API}/characters/${characterId}/short-rest?hit_dice_to_spend=1`
        : `${API}/characters/${characterId}/long-rest`;
      const response = await axios.post(url);
      setCharacter(response.data);
      setCurrentHp(response.data.current_hit_points || response.data.hp || currentHp);
      toast.success(`${type === 'short' ? 'Short' : 'Long'} rest complete`);
    } catch (err) {
      toast.error(`Rest failed: ${err.response?.data?.detail || 'unknown error'}`);
    }
  };

  // Styles - Electric Tundra (Player Mode)
  const pageStyle = {
    minHeight: '100vh',
    background: '#050A30',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative'
  };

  // Background gradient overlay - black at top, blue/cyan glow at bottom
  const bgOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      linear-gradient(180deg, 
        rgba(5, 10, 48, 1) 0%, 
        rgba(5, 10, 48, 0.95) 40%, 
        rgba(0, 102, 255, 0.15) 70%,
        rgba(77, 208, 225, 0.12) 100%
      )
    `,
    pointerEvents: 'none',
    zIndex: 0
  };

  // Subtle corner glows
  const bottomLeftGlow = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '50%',
    height: '50%',
    background: 'radial-gradient(ellipse at 0% 100%, rgba(0, 102, 255, 0.1) 0%, transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0
  };

  const bottomRightGlow = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    width: '50%',
    height: '50%',
    background: 'radial-gradient(ellipse at 100% 100%, rgba(77, 208, 225, 0.08) 0%, transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0
  };

  const panelStyle = {
    background: 'rgba(10, 17, 64, 0.85)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '16px',
    position: 'relative',
    zIndex: 1
  };

  const scrollBoxStyle = {
    overflowY: 'auto',
    maxHeight: '100%',
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.accent.primary} transparent`
  };

  const actionBtnStyle = (type) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: type === 'attack' ? 'rgba(77, 208, 225, 0.15)' : 
                type === 'spell' ? 'rgba(0, 102, 255, 0.15)' :
                type === 'heal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${type === 'attack' ? 'rgba(77, 208, 225, 0.3)' : 
             type === 'spell' ? 'rgba(0, 102, 255, 0.3)' :
             type === 'heal' ? 'rgba(16, 185, 129, 0.3)' : theme.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...panelStyle, textAlign: 'center', padding: '60px', margin: 'auto' }}>
          <div style={{ color: theme.text.muted }}>Loading character...</div>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div style={pageStyle}>
        <div style={{ ...panelStyle, textAlign: 'center', padding: '60px', margin: 'auto' }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, marginBottom: '16px' }}>Character Not Found</h2>
          <button onClick={() => navigate('/home')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #0066FF, #4DD0E1)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Background gradient overlay */}
      <div style={bgOverlayStyle} />
      {/* Corner glows */}
      <div style={bottomLeftGlow} />
      <div style={bottomRightGlow} />
      
      {/* Header - Fixed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(77, 208, 225, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 16px', color: theme.text.primary, cursor: 'pointer' }}>
          <ChevronLeft size={18} /> Dashboard
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', background: 'linear-gradient(135deg, #0066FF, #4DD0E1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {character.name}
          </h1>
          <div style={{ color: theme.text.secondary, fontSize: '13px' }}>
            {character.race} {character.character_class} • Level {character.level || 1}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(character.level || 1) < 20 && (
            <button 
              onClick={() => setShowLevelUpWizard(true)} 
              data-testid="level-up-btn"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'linear-gradient(135deg, #F59E0B, #D97706)', 
                border: 'none', 
                borderRadius: '10px', 
                padding: '8px 16px', 
                color: '#fff', 
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              <ArrowUp size={16} /> Level Up
            </button>
          )}
          <button onClick={() => navigate(`/characters/${characterId}/edit`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(77, 208, 225, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 16px', color: theme.text.primary, cursor: 'pointer' }}>
            <Edit3 size={16} /> Edit
          </button>
        </div>
      </div>

      {/* Level Up Wizard Modal */}
      <LevelUpWizard 
        character={character}
        isOpen={showLevelUpWizard}
        onClose={() => setShowLevelUpWizard(false)}
        onLevelUp={() => {
          fetchCharacter(); // Refresh character data
          setShowLevelUpWizard(false);
        }}
      />

      {/* Main Content - Fills remaining space */}
      <div className="character-sheet-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 200px 1fr', gap: '16px', overflow: 'hidden', minHeight: 0 }}>
        
        {/* LEFT COLUMN: Abilities + Saving Throws */}
        <div className="card-hover" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.accent.primary, marginBottom: '12px', fontSize: '1rem', flexShrink: 0 }}>Ability Scores</h3>
          
          <div style={{ ...scrollBoxStyle, flex: 1 }}>
            {SAVING_THROWS.map((ability) => {
              const score = abilities[ability];
              const mod = getModifier(score);
              const saveMod = mod + (character.saving_throw_proficiencies?.includes(ability) ? profBonus : 0);
              const isProficient = character.saving_throw_proficiencies?.includes(ability);
              
              return (
                <div key={ability} style={{ marginBottom: '12px', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: theme.text.muted, letterSpacing: '1px', fontWeight: '600' }}>{ABILITY_SHORT[ability]}</span>
                    <span style={{ fontSize: '22px', fontWeight: 'bold', color: theme.text.primary }}>{score}</span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: theme.accent.highlight }}>{formatModifier(mod)}</span>
                  </div>
                  <button
                    onClick={() => rollDice('1d20', saveMod, `${ABILITY_SHORT[ability]} Save`)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: isProficient ? 'rgba(245, 158, 11, 0.2)' : 'rgba(77, 208, 225, 0.1)',
                      border: `1px solid ${isProficient ? 'rgba(245, 158, 11, 0.4)' : theme.border}`,
                      borderRadius: '6px',
                      color: isProficient ? theme.accent.highlight : theme.text.secondary,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{isProficient && '● '}Save</span>
                    <span style={{ fontWeight: '600' }}>{formatModifier(saveMod)}</span>
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Proficiency Bonus */}
          <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', marginTop: '8px', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: theme.text.muted, fontWeight: '500' }}>PROFICIENCY</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: theme.accent.secondary }}>+{profBonus}</div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Skills */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.accent.secondary, marginBottom: '12px', fontSize: '1rem', flexShrink: 0 }}>Skills</h3>
          
          <div style={{ ...scrollBoxStyle, flex: 1 }}>
            {SKILLS.map(skill => {
              const mod = getModifier(abilities[skill.ability]);
              const isProficient = character.skill_proficiencies?.includes(skill.name);
              const bonus = mod + (isProficient ? profBonus : 0);
              
              return (
                <button
                  key={skill.name}
                  onClick={() => rollDice('1d20', bonus, skill.name)}
                  data-testid={`skill-${skill.name.toLowerCase().replace(' ', '-')}`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    marginBottom: '4px',
                    background: isProficient ? 'rgba(138, 43, 226, 0.15)' : 'transparent',
                    border: isProficient ? '1px solid rgba(138, 43, 226, 0.4)' : '1px solid transparent',
                    borderRadius: '6px',
                    color: isProficient ? '#a78bfa' : theme.text.secondary,
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    boxShadow: isProficient ? '0 0 10px rgba(138, 43, 226, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(138, 43, 226, 0.25)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(138, 43, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isProficient ? 'rgba(138, 43, 226, 0.15)' : 'transparent';
                    e.currentTarget.style.boxShadow = isProficient ? '0 0 10px rgba(138, 43, 226, 0.3)' : 'none';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isProficient && <span style={{ color: theme.accent.primary, fontSize: '8px' }}>●</span>}
                    {skill.name}
                  </span>
                  <span style={{ fontWeight: '600', color: isProficient ? '#a78bfa' : theme.text.primary, fontSize: '15px' }}>{formatModifier(bonus)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Combat Stats + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          {/* Combat Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', flexShrink: 0 }}>
            {/* HP */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: theme.text.muted, fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                <Heart size={14} /> HP
              </div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '4px' }}>
                <span style={{ color: currentHp < maxHp / 2 ? '#EF4444' : theme.text.primary }}>{currentHp}</span>
                <span style={{ color: theme.text.muted, fontSize: '18px' }}>/{maxHp}</span>
              </div>
              {/* Temp HP */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '4px', 
                marginBottom: '8px',
                padding: '4px 8px',
                background: tempHp > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                border: tempHp > 0 ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent'
              }}>
                <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: '500' }}>TEMP</span>
                <button 
                  onClick={() => handleTempHpChange(-1)} 
                  style={{ padding: '2px 6px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}
                >-</button>
                <span style={{ color: tempHp > 0 ? '#3b82f6' : theme.text.muted, fontSize: '14px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>{tempHp}</span>
                <button 
                  onClick={() => handleTempHpChange(1)} 
                  style={{ padding: '2px 6px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}
                >+</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <button onClick={() => handleHpChange(-1)} style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', color: '#EF4444', cursor: 'pointer' }}><Minus size={16} /></button>
                <button onClick={() => handleHpChange(1)} style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.2)', border: 'none', borderRadius: '6px', color: '#10B981', cursor: 'pointer' }}><Plus size={16} /></button>
              </div>
            </div>

            {/* AC */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: theme.text.muted, fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                <Shield size={14} /> AC
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.accent.primary }}>{ac}</div>
            </div>

            {/* Initiative */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: theme.text.muted, fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                <Zap size={14} /> INIT
              </div>
              <button
                onClick={() => rollDice('1d20', initiative, 'Initiative')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px', fontWeight: 'bold', color: theme.accent.secondary }}
              >
                {formatModifier(initiative)}
              </button>
            </div>

            {/* Speed */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: theme.text.muted, fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                <Wind size={14} /> SPEED
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.accent.highlight }}>{speed}<span style={{ fontSize: '14px' }}>ft</span></div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {['overview', 'combat', 'spells', 'inventory', 'journal', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-glow press-scale ${activeTab === tab ? 'tab-active' : ''}`}
                style={{
                  flex: '1 1 auto',
                  minWidth: '80px',
                  padding: '12px 16px',
                  background: activeTab === tab ? 'linear-gradient(135deg, #0066FF, #4DD0E1)' : 'rgba(77, 208, 225, 0.1)',
                  border: activeTab === tab ? 'none' : `1px solid ${theme.border}`,
                  borderRadius: '10px',
                  color: theme.text.primary,
                  fontSize: '15px',
                  fontWeight: activeTab === tab ? '600' : '400',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content - Scrollable */}
          <div style={{ ...panelStyle, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'overview' && (
              <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
                <PlayerProgressionDashboard character={character} characterId={characterId} />
              </div>
            )}

            {activeTab === 'combat' && (
              <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
                <CharacterCombatTab
                  character={character}
                  onUpdateCharacter={handleUpdateCharacter}
                  onUpdateResources={handleUpdateResources}
                  onRest={handleRest}
                  isGMMode={false}
                />
              </div>
            )}

            {activeTab === 'spells' && (
              <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
                <CharacterSpellbook
                  character={character}
                  usedSlots={usedSlots}
                  setUsedSlots={setUsedSlots}
                  rollDice={rollDice}
                  onUpdateCharacter={handleUpdateCharacter}
                />
              </div>
            )}

            {activeTab === 'inventory' && (
              <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
                <CharacterInventory 
                  characterId={characterId}
                  character={character}
                  onUpdate={fetchCharacter}
                />
              </div>
            )}

            {activeTab === 'journal' && (
              <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
                <SessionJournal characterId={characterId} campaignId={character?.campaign_id} />
              </div>
            )}

            {activeTab === 'notes' && (
              <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Character Notes Section */}
                <div>
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, marginBottom: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={18} style={{ color: theme.accent.primary }} />
                    Character Notes
                  </h4>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    color: theme.text.secondary, 
                    lineHeight: '1.7', 
                    fontSize: '15px',
                    background: 'rgba(15, 10, 30, 0.5)',
                    borderRadius: '10px',
                    padding: '16px',
                    minHeight: '80px'
                  }}>
                    {character.notes || 'No personal notes yet.'}
                  </div>
                </div>
                
                {/* GM Synced Notes Section */}
                {character.gm_notes && character.gm_notes.length > 0 && (
                  <div>
                    <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.accent.highlight, marginBottom: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} style={{ color: theme.accent.highlight }} />
                      GM Updates
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {character.gm_notes.slice(0, 5).map((note, i) => (
                        <div key={i} className="card-hover" style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '10px',
                          padding: '14px'
                        }}>
                          <div style={{ fontSize: '13px', color: theme.accent.highlight, fontWeight: '600', marginBottom: '6px' }}>
                            {note.title || 'GM Note'}
                          </div>
                          <div style={{ fontSize: '14px', color: theme.text.secondary, lineHeight: '1.5' }}>
                            {note.content}
                          </div>
                          {note.timestamp && (
                            <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '8px' }}>
                              {new Date(note.timestamp).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Campaign Timeline Hint */}
                {character.campaign_id && (
                  <div style={{ 
                    marginTop: 'auto',
                    padding: '12px 16px',
                    background: 'rgba(77, 208, 225, 0.1)',
                    border: '1px solid rgba(77, 208, 225, 0.2)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: theme.text.muted,
                    textAlign: 'center'
                  }}>
                    <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', color: theme.accent.primary }} />
                    Your GM can sync session notes and updates to you directly
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 3D Dice Roller Overlay */}
      <DiceRoller3D 
        isOpen={show3DDice}
        onClose={() => setShow3DDice(false)}
        rolls={diceRolls}
        label={diceLabel}
        modifier={diceModifier}
        total={diceTotal}
        isCrit={diceCrit}
        isFumble={diceFumble}
        theme="player"
      />
      <DiceRollHistory
        history={diceHistory}
        theme="player"
        onShare={(roll) => {
          const text = `${character?.name || 'Player'} rolled ${roll.label}: ${roll.total}${roll.isCrit ? ' (NAT 20!)' : roll.isFumble ? ' (NAT 1!)' : ''}`;
          navigator.clipboard.writeText(text).then(() => toast.success('Roll copied to clipboard!'));
        }}
      />
    </div>
  );
}
