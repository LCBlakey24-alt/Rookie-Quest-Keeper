import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Heart, Shield, Zap, Swords, BookOpen, Backpack, ChevronLeft,
  Plus, Minus, Skull, Wind, Edit3, Dices, Target, Sparkles, ArrowUp, User
} from 'lucide-react';
import LevelUpWizard from './LevelUpWizard';
import CharacterInventory from './CharacterInventory';
import CharacterCombatTab from './CharacterCombatTab';
import CharacterSpellbook from './CharacterSpellbook';
import SessionJournal from './SessionJournal';
import PlayerProgressionDashboard from './PlayerProgressionDashboard';
import RestPanel from './RestPanel';
import RookHints from './RookHints';
import { CLASS_FEATURES } from '../data/classFeatures';
import { SPELLCASTING_CLASSES, SPELL_SLOTS, PACT_MAGIC_SLOTS, SPELL_DATABASE } from '../data/spellDatabase';
import DiceRoller3D from './ui/DiceRoller3D';
import DiceRollHistory from './DiceRollHistory';
import { getConditionRollEffect, getConditionIndicator } from '../data/conditionEffects';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simplified theme (performance-first): dark blue + gold accents
const theme = {
  bg: { primary: '#0B1E3A', surface: '#10264A', elevated: '#15325F' },
  accent: { primary: '#D4AF37', secondary: '#B8941F', highlight: '#F1D77A' },
  text: { primary: '#F4F7FB', secondary: '#C7D3E3', muted: '#8EA0B8' },
  border: 'rgba(212, 175, 55, 0.45)',
  glow: 'none'
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
      { name: 'Reckless Attack', desc: 'Advantage on STR attacks, enemies have advantage on you', type: 'attack', dice: '1d20', rollType: 'advantage' }
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
  // rollType: 'normal', 'advantage', 'disadvantage'
  const rollDice = (notation, modifier = 0, label = '', rollType = 'normal') => {
    // Parse compound dice: "2d6+1d4+3" or simple "1d20"
    const diceGroups = notation.match(/(\d+)?d(\d+)/gi) || [];
    if (diceGroups.length === 0) return;
    
    const numMod = typeof modifier === 'number' ? modifier : (parseInt(modifier) || 0);
    const strLabel = typeof label === 'string' ? label : String(label || notation);
    
    const rolls = [];
    let total = 0;
    
    // Advantage/Disadvantage: roll 2d20 and pick highest/lowest
    const isAdvRoll = (rollType === 'advantage' || rollType === 'disadvantage') && notation.match(/^(\d+)?d20$/i);
    
    if (isAdvRoll) {
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;
      const kept = rollType === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2);
      rolls.push({ sides: 20, result: r1, dropped: r1 !== kept });
      rolls.push({ sides: 20, result: r2, dropped: r2 !== kept });
      total = kept;
    } else {
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
    }
    
    // Check for inline modifiers like "+5" in notation
    const inlineMod = notation.replace(/(\d+)?d(\d+)/gi, '').match(/([+-]\d+)/g);
    let totalMod = numMod;
    if (inlineMod) {
      inlineMod.forEach(m => { totalMod += parseInt(m); });
    }
    total += totalMod;
    
    const keptRoll = isAdvRoll ? rolls.find(r => !r.dropped) : rolls[0];
    const isCrit = keptRoll && keptRoll.sides === 20 && keptRoll.result === 20;
    const isFumble = keptRoll && keptRoll.sides === 20 && keptRoll.result === 1;
    
    setDiceRolls(isAdvRoll ? rolls.filter(r => !r.dropped) : rolls);
    setDiceLabel(strLabel || notation);
    setDiceModifier(totalMod);
    setDiceTotal(total);
    setDiceCrit(isCrit);
    setDiceFumble(isFumble);
    setShow3DDice(true);

    setDiceHistory(prev => [{
      label: strLabel || notation, total, modifier: totalMod,
      rolls: isAdvRoll ? rolls.filter(r => !r.dropped) : rolls,
      allRolls: isAdvRoll ? rolls : undefined,
      rollType: rollType !== 'normal' ? rollType : undefined,
      isCrit, isFumble,
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
      const charMaxHp = response.data.max_hit_points ?? response.data.max_hp ?? 10;
      const charHp = response.data.current_hit_points ?? response.data.hp ?? charMaxHp;
      setCurrentHp(Math.min(charHp, charMaxHp));
      setTempHp(response.data.temporary_hit_points || 0);
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
  const maxHp = character?.max_hit_points ?? character?.max_hp ?? (8 + getModifier(abilities.constitution));
  const ac = character?.armor_class ?? character?.ac ?? (10 + getModifier(abilities.dexterity));
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
            await axios.patch(`${API}/characters/${characterId}`, { current_hit_points: newHp });
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
      await axios.patch(`${API}/characters/${characterId}`, { current_hit_points: newHp });
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
    
    rollDice(action.dice, modifier, action.name, action.rollType || 'normal');
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
      setCurrentHp(response.data.current_hit_points ?? response.data.hp ?? currentHp);
      toast.success(`${type === 'short' ? 'Short' : 'Long'} rest complete`);
    } catch (err) {
      toast.error(`Rest failed: ${err.response?.data?.detail || 'unknown error'}`);
    }
  };

  // Styles - Electric Tundra (Player Mode)
  const pageStyle = {
    minHeight: '100vh',
    background: theme.bg.primary,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  };

  // Minimal background (removed expensive gradients/glows)
  const bgOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.bg.primary,
    pointerEvents: 'none',
    zIndex: 0
  };

  const bottomLeftGlow = {
    display: 'none'
  };

  const bottomRightGlow = {
    display: 'none'
  };

  const panelStyle = {
    background: 'rgba(10, 17, 64, 0.85)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${theme.border}`,
    borderRadius: '10px',
    padding: '10px',
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
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.text.primary, marginBottom: '16px' }}>Character Not Found</h2>
          <button onClick={() => navigate('/home')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #B8941F, #D4AF37)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>
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
      
      {/* Header - Fixed (Identity + Vitals Bar) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate('/home')} data-testid="sheet-back-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(77, 208, 225, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 14px', color: theme.text.primary, cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={18} /> Dashboard
        </button>

        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {character.portrait_url ? (
            <img src={character.portrait_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.accent.primary}`, boxShadow: theme.glow }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #B8941F, #D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={24} color="#fff" />
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.3rem', margin: 0, color: theme.accent.primary }}>
              {character.name}
            </h1>
            <div style={{ color: theme.text.secondary, fontSize: '12px' }}>
              {character.race}{character.subrace ? ` (${character.subrace})` : ''} • {character.character_class}{character.subclass ? ` (${character.subclass})` : ''} • Lv {character.level || 1}
            </div>
          </div>
        </div>

        {/* Vitals Bar - Always Visible */}
        <div data-testid="vitals-bar" style={{ display: 'flex', gap: '6px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* HP */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', minWidth: '90px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: theme.text.muted, fontWeight: 600 }}><Heart size={11} color="#EF4444" /> HP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <button onClick={() => handleHpChange(-1)} data-testid="hp-decrease" style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span data-testid="current-hp" style={{ fontSize: '15px', fontWeight: 700, color: currentHp <= maxHp / 4 ? '#EF4444' : '#fff', minWidth: '52px', textAlign: 'center' }}>
                {currentHp}/{maxHp}{tempHp > 0 && <span style={{ color: '#10B981', fontSize: '11px' }}> +{tempHp}</span>}
              </span>
              <button onClick={() => handleHpChange(1)} data-testid="hp-increase" style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          {/* AC */}
          <VitalChip icon={Shield} label="AC" value={ac} color={theme.accent.primary} testId="vital-ac" />
          {/* Initiative */}
          <VitalChip icon={Zap} label="INIT" value={formatModifier(initiative)} color={theme.accent.highlight} onClick={() => rollDice('1d20', initiative, 'Initiative')} testId="vital-init" />
          {/* Speed */}
          <VitalChip icon={Wind} label="SPD" value={`${speed}ft`} color={theme.accent.secondary} testId="vital-speed" />
          {/* Inspiration */}
          <button
            onClick={() => handleUpdateCharacter({ inspiration: !character.inspiration })}
            data-testid="inspiration-toggle"
            title="Toggle Inspiration"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', borderRadius: '10px',
              background: character.inspiration ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${character.inspiration ? 'rgba(245, 158, 11, 0.5)' : theme.border}`,
              cursor: 'pointer', minWidth: '60px'
            }}>
            <Sparkles size={14} color={character.inspiration ? '#F59E0B' : theme.text.muted} />
            <div style={{ fontSize: '9px', color: character.inspiration ? '#F59E0B' : theme.text.muted, fontWeight: 600, letterSpacing: '0.5px', marginTop: '2px' }}>INSP</div>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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
      <div className="character-sheet-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '190px 180px 1fr', gap: '10px', overflow: 'hidden', minHeight: 0 }}>
        
        {/* LEFT COLUMN: Abilities + Saving Throws */}
        <div className="card-hover" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.accent.primary, marginBottom: '6px', fontSize: '0.85rem', flexShrink: 0 }}>Ability Scores</h3>
          
          <div style={{ ...scrollBoxStyle, flex: 1 }}>
            {SAVING_THROWS.map((ability) => {
              const score = abilities[ability];
              const mod = getModifier(score);
              const saveMod = mod + (character.saving_throw_proficiencies?.includes(ability) ? profBonus : 0);
              const isProficient = character.saving_throw_proficiencies?.includes(ability);
              const saveContext = `${ABILITY_SHORT[ability].toLowerCase()}_save`;
              const condIndicator = getConditionIndicator(character?.conditions || [], saveContext);
              const condEffect = getConditionRollEffect(character?.conditions || [], saveContext);
              
              return (
                <div key={ability} style={{ marginBottom: '4px', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '8px', padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: theme.text.muted, letterSpacing: '1px', fontWeight: '600' }}>{ABILITY_SHORT[ability]}</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: theme.text.primary }}>{score}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: theme.accent.highlight }}>{formatModifier(mod)}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (condEffect.autoFail) {
                        toast.error(`${ABILITY_SHORT[ability]} Save: AUTO-FAIL (${condEffect.reason})`);
                        return;
                      }
                      rollDice('1d20', saveMod, `${ABILITY_SHORT[ability]} Save`, condEffect.mode);
                    }}
                    style={{
                      width: '100%', padding: '4px 6px',
                      background: isProficient ? 'rgba(245, 158, 11, 0.2)' : 'rgba(212, 175, 55, 0.12)',
                      border: `1px solid ${isProficient ? 'rgba(245, 158, 11, 0.4)' : theme.border}`,
                      borderRadius: '5px', color: isProficient ? theme.accent.highlight : theme.text.secondary,
                      fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>{isProficient && '● '}Save</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {condIndicator && (
                        <span title={condIndicator.tooltip} style={{ fontSize: '10px', fontWeight: 800, color: condIndicator.color }}>{condIndicator.symbol}</span>
                      )}
                      <span style={{ fontWeight: '600' }}>{formatModifier(saveMod)}</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Proficiency Bonus - inline */}
          <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '6px', marginTop: '4px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: theme.text.muted, fontWeight: '500' }}>PROF</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: theme.accent.secondary }}>+{profBonus}</span>
          </div>
        </div>

        {/* MIDDLE COLUMN: Skills */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.accent.secondary, marginBottom: '4px', fontSize: '0.85rem', flexShrink: 0 }}>Skills</h3>
          
          <div style={{ ...scrollBoxStyle, flex: 1 }}>
            {SKILLS.map(skill => {
              const mod = getModifier(abilities[skill.ability]);
              const isProficient = character.skill_proficiencies?.includes(skill.name);
              const bonus = mod + (isProficient ? profBonus : 0);
              const skillContext = `${skill.ability.substring(0, 3).toLowerCase()}_check`;
              const condIndicator = getConditionIndicator(character?.conditions || [], skillContext);
              const condEffect = getConditionRollEffect(character?.conditions || [], skillContext);
              
              return (
                <button
                  key={skill.name}
                  onClick={() => rollDice('1d20', bonus, skill.name, condEffect.mode)}
                  data-testid={`skill-${skill.name.toLowerCase().replace(' ', '-')}`}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 8px', marginBottom: '1px',
                    background: isProficient ? 'rgba(138, 43, 226, 0.15)' : condIndicator ? `${condIndicator.color}08` : 'transparent',
                    border: isProficient ? '1px solid rgba(138, 43, 226, 0.4)' : '1px solid transparent',
                    borderRadius: '4px', color: isProficient ? '#a78bfa' : theme.text.secondary,
                    fontSize: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {isProficient && <span style={{ color: theme.accent.primary, fontSize: '6px' }}>●</span>}
                    {skill.name}
                    {condIndicator && <span title={condIndicator.tooltip} style={{ fontSize: '9px', fontWeight: 800, color: condIndicator.color }}>{condIndicator.symbol}</span>}
                  </span>
                  <span style={{ fontWeight: '600', color: isProficient ? '#a78bfa' : theme.text.primary, fontSize: '13px' }}>{formatModifier(bonus)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Combat Stats + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
            {['overview', 'combat', 'spells', 'inventory', 'backstory', 'journal', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-glow press-scale ${activeTab === tab ? 'tab-active' : ''}`}
                style={{
                  flex: '1 1 auto',
                  minWidth: '80px',
                  padding: '12px 16px',
                  background: activeTab === tab ? 'linear-gradient(135deg, #B8941F, #D4AF37)' : 'rgba(212, 175, 55, 0.12)',
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

          {/* ROOK Hints */}
          <RookHints character={character} theme={theme} activeTab={activeTab} />

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
                  rollDice={rollDice}
                />
                <div style={{ marginTop: '8px' }}>
                  <RestPanel character={character} theme={theme} onRest={handleRest} onUpdateCharacter={handleUpdateCharacter} />
                </div>
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

            {activeTab === 'backstory' && (
              <BackstoryTab character={character} characterId={characterId} theme={theme} onUpdateCharacter={handleUpdateCharacter} />
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
                  <h4 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.text.primary, marginBottom: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <h4 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.accent.highlight, marginBottom: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    background: 'rgba(212, 175, 55, 0.12)',
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
      
      {/* Quick Dice Bar */}
      <div data-testid="quick-dice-bar" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '4px', padding: '6px 16px',
        background: 'rgba(10, 8, 25, 0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(77, 208, 225, 0.2)', borderBottom: 'none',
        borderRadius: '12px 12px 0 0', zIndex: 100,
      }}>
        {[
          { sides: 4, color: '#22C55E' }, { sides: 6, color: '#3B82F6' },
          { sides: 8, color: '#8B5CF6' }, { sides: 10, color: '#F59E0B' },
          { sides: 12, color: '#EC4899' }, { sides: 20, color: '#EF4444' },
          { sides: 100, color: '#6B7280', label: 'D%' },
        ].map(d => (
          <button
            key={d.sides}
            data-testid={`quick-d${d.sides}`}
            onClick={() => rollDice(`1d${d.sides}`, 0, d.label || `D${d.sides}`)}
            style={{
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              background: `${d.color}15`, border: `1px solid ${d.color}40`,
              color: d.color, fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              minWidth: 36, textAlign: 'center',
            }}
          >{d.label || `d${d.sides}`}</button>
        ))}
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


function BackstoryTab({ character, characterId, theme, onUpdateCharacter }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const backstory = character?.backstory || {};
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  const fields = [
    { key: 'personality_traits', label: 'Personality Traits', placeholder: 'I always have a plan. I am slow to trust but fiercely loyal.' },
    { key: 'ideals', label: 'Ideals', placeholder: 'Greater Good. Our lot is to lay down our lives in defense of others.' },
    { key: 'bonds', label: 'Bonds', placeholder: 'I have a family, but I have no idea where they are. I hope to see them again.' },
    { key: 'flaws', label: 'Flaws', placeholder: 'I have a weakness for the vices of the city, especially hard drink.' },
    { key: 'backstory_text', label: 'Backstory', placeholder: 'Born in a small village on the edge of the Sword Coast...', multiline: true },
    { key: 'allies_organizations', label: 'Allies & Organizations', placeholder: 'Member of the Harpers. Close friend of the innkeeper at the Yawning Portal.' },
    { key: 'appearance', label: 'Appearance', placeholder: 'Tall and weathered, with a prominent scar across the left cheek...' },
  ];

  const saveField = async (key) => {
    const newBackstory = { ...backstory, [key]: editVal };
    onUpdateCharacter({ backstory: newBackstory });
    try {
      await axios.patch(`${API}/characters/${characterId}`, { backstory: newBackstory });
      toast.success('Saved!');
    } catch {
      toast.error('Failed to save');
    }
    setEditing(null);
  };

  const panelStyle = { background: theme.bg.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '12px' };

  return (
    <div data-testid="backstory-tab" style={{ ...panelStyle, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      <h4 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.text.primary, margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <User size={16} color={theme.accent.primary} /> Character Backstory
      </h4>
      {fields.map(f => (
        <div key={f.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{f.label}</span>
            {editing !== f.key && (
              <button data-testid={`edit-${f.key}`} onClick={() => { setEditing(f.key); setEditVal(backstory[f.key] || ''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.accent.primary, fontSize: '11px', fontWeight: 600 }}>
                Edit
              </button>
            )}
          </div>
          {editing === f.key ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <textarea value={editVal} onChange={e => setEditVal(e.target.value)} rows={f.multiline ? 4 : 2}
                placeholder={f.placeholder}
                style={{
                  width: '100%', background: theme.bg.elevated, border: `1px solid ${theme.accent.primary}`,
                  borderRadius: '6px', color: theme.text.primary, padding: '8px', fontSize: '13px',
                  fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                }} />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(null)} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>Cancel</button>
                <button data-testid={`save-${f.key}`} onClick={() => saveField(f.key)} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: '13px', color: backstory[f.key] ? theme.text.secondary : theme.text.muted,
              lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: backstory[f.key] ? 'normal' : 'italic',
              padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)',
              minHeight: '28px', cursor: 'pointer',
            }} onClick={() => { setEditing(f.key); setEditVal(backstory[f.key] || ''); }}>
              {backstory[f.key] || f.placeholder}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


function VitalChip({ icon: Icon, label, value, color, onClick, testId }) {
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      data-testid={testId}
      type={interactive ? 'button' : undefined}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 12px', borderRadius: '10px',
        background: `${color}15`, border: `1px solid ${color}40`,
        cursor: interactive ? 'pointer' : 'default',
        minWidth: '60px', transition: 'all 0.2s',
        font: 'inherit', color: 'inherit'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#9EB0D0', fontWeight: 600 }}>
        <Icon size={11} color={color} /> {label}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color, marginTop: '2px' }}>{value}</div>
    </Tag>
  );
}
