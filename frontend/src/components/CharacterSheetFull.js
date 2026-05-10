import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Heart, Shield, Zap, Swords, BookOpen, Backpack, ChevronLeft,
  Wind, Edit3, Dices, Sparkles, ArrowUp, User
} from 'lucide-react';
import LevelUpWizard from './LevelUpWizard';
import CharacterInventory from './CharacterInventory';
import CharacterCombatTab from './CharacterCombatTab';
import CharacterSpellbook from './CharacterSpellbook';
import SessionJournal from './SessionJournal';
import PlayerProgressionDashboard from './PlayerProgressionDashboard';
import RestPanel from './RestPanel';
import CombatLog from './CombatLog';
import RookHints from './RookHints';
import { canCharacterCastSpells } from '../data/spellDatabase';
import { CLASS_RESOURCES, getResourceMax, getRestoreType } from '../data/classResources';
import DiceRollFlicker from './DiceRollFlicker';
import DiceRollHistory from './DiceRollHistory';
import { getConditionRollEffect, getConditionIndicator, CONDITION_EFFECTS } from '../data/conditionEffects';
import { getClassAccent, theme as globalTheme } from '../lib/theme';
import { API_BASE } from '../lib/api';
import CharacterHeader from './CharacterHeader';
import CharacterLeftPanel from './CharacterLeftPanel';
import CharacterSkillsPanel from './CharacterSkillsPanel';
import CharacterTabs from './CharacterTabs';
import MobileCharacterSheetLayout from './MobileCharacterSheetLayout';

const API = API_BASE;

// Use global theme from lib/theme.js so theme changes cascade
const theme = globalTheme;

const CHARACTER_TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'combat', label: 'Combat', icon: Swords },
  { id: 'spells', label: 'Spells', icon: BookOpen },
  { id: 'inventory', label: 'Inventory', icon: Backpack },
  { id: 'backstory', label: 'Story', icon: User },
  { id: 'journal', label: 'Journal', icon: Dices },
  { id: 'notes', label: 'Notes', icon: Edit3 }
];

const getModifier = (score) => Math.floor((score - 10) / 2);
const formatModifier = (mod) => (mod >= 0 ? `+${mod}` : `${mod}`);
const getTempHp = (source) => Math.max(0, Number(source?.temporary_hit_points ?? source?.temp_hp ?? 0) || 0);

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
  const [isMobileSheet, setIsMobileSheet] = useState(() => window.innerWidth <= 720);
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
  const canUseSpells = useMemo(() => canCharacterCastSpells(character), [character]);
  const visibleTabs = useMemo(
    () => CHARACTER_TABS.filter(tab => tab.id !== 'spells' || canUseSpells),
    [canUseSpells]
  );

  // Per-character Combat Log (in-memory; capped at 100 most recent)
  const [combatLog, setCombatLog] = useState([]);
  const logEvent = (type, text) => {
    setCombatLog(prev => [
      ...prev.slice(-99),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), type, text }
    ]);
  };
  const clearCombatLog = () => setCombatLog([]);

  // Listen for the CombatLog "Share Recap" copy-success event so we can show a toast.
  useEffect(() => {
    const handler = (e) => toast.success(e?.detail || 'Recap copied');
    window.addEventListener('rook:toast', handler);
    return () => window.removeEventListener('rook:toast', handler);
  }, []);

  // Persisted setter — also pushes used_spell_slots to backend so it survives reloads.
  const persistUsedSlots = (next) => {
    setUsedSlots(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      // Fire-and-forget PATCH; errors are non-fatal (UI will retry on next click)
      if (characterId) {
        axios.patch(`${API}/characters/${characterId}`, { used_spell_slots: resolved })
          .catch(() => toast.error('Could not save spell slots'));
      }
      return resolved;
    });
  };
  
  // Compact dice result state
  const [showDiceFlicker, setShowDiceFlicker] = useState(false);
  const [diceRolls, setDiceRolls] = useState([]);
  const [diceLabel, setDiceLabel] = useState('');
  const [diceModifier, setDiceModifier] = useState(0);
  const [diceTotal, setDiceTotal] = useState(0);
  const [diceCrit, setDiceCrit] = useState(false);
  const [diceFumble, setDiceFumble] = useState(false);
  const [diceHistory, setDiceHistory] = useState([]);

  // Dice roll function - supports compound notation like "2d6+1d4" or "1d20+1d4"
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
    setShowDiceFlicker(true);

    setDiceHistory(prev => [{
      label: strLabel || notation, total, modifier: totalMod,
      rolls: isAdvRoll ? rolls.filter(r => !r.dropped) : rolls,
      allRolls: isAdvRoll ? rolls : undefined,
      rollType: rollType !== 'normal' ? rollType : undefined,
      isCrit, isFumble,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }, ...prev].slice(0, 50));

    // Combat Log: classify the roll
    const lower = (strLabel || '').toLowerCase();
    let logType = 'roll';
    if (lower.includes('attack') || lower.includes('hit') || lower.includes('strike')) logType = 'attack';
    else if (lower.includes('cast') || lower.includes('spell') || lower.includes('cantrip') ||
             lower.includes('bolt') || lower.includes('blast') || lower.includes('cure') ||
             lower.includes('heal') || lower.includes('lvl ')) logType = 'spell';
    const advTag = rollType !== 'normal' ? ` [${rollType.toUpperCase()}]` : '';
    const critTag = isCrit ? ' — CRIT!' : isFumble ? ' — FUMBLE' : '';
    logEvent(logType, `${strLabel || notation}: ${total}${advTag}${critTag}`);
  };

  useEffect(() => {
    if (characterId) fetchCharacter();
  }, [characterId]);

  useEffect(() => {
    if (activeTab === 'spells' && !canUseSpells) {
      setActiveTab('overview');
    }
  }, [activeTab, canUseSpells]);

  useEffect(() => {
    const onResize = () => setIsMobileSheet(window.innerWidth <= 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchCharacter = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/characters/${characterId}`);
      const payload = response?.data?.character ?? response?.data;
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid character payload');
      }
      setCharacter(payload);
      setError(null);
      // Clamp HP to ensure it never exceeds max_hp (fixes bug where HP displays higher than max)
      const charMaxHp = payload.max_hit_points ?? payload.max_hp ?? 10;
      const charHp = payload.current_hit_points ?? payload.hp ?? charMaxHp;
      setCurrentHp(Math.min(charHp, charMaxHp));
      setTempHp(getTempHp(payload));
      // Hydrate spell slot usage from server so it survives reloads
      setUsedSlots(payload.used_spell_slots || {});
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
  const exhaustion = character?.exhaustion_level || 0;
  const rawMaxHp = character?.max_hit_points ?? character?.max_hp ?? (8 + getModifier(abilities.constitution));
  const maxHp = exhaustion >= 4 ? Math.floor(rawMaxHp / 2) : rawMaxHp;
  const ac = character?.armor_class ?? character?.ac ?? (10 + getModifier(abilities.dexterity));
  const initiative = getModifier(abilities.dexterity);
  const rawSpeed = character?.speed || 30;
  const activeConditions = Array.isArray(character?.conditions) ? character.conditions : [];
  // Conditions that reduce speed to 0 per 5e RAW
  const speedZeroConditions = ['grappled', 'restrained', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
  const hasSpeedZero = speedZeroConditions.some(c => activeConditions.includes(c));
  const speed = (exhaustion >= 5 || hasSpeedZero)
    ? 0
    : (exhaustion >= 2 ? Math.floor(rawSpeed / 2) : rawSpeed);
  // Conditions preventing actions (incapacitated chain)
  const incapacitatingConditions = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
  const isIncapacitated = incapacitatingConditions.some(c => activeConditions.includes(c));

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
    if (delta !== 0) {
      logEvent(delta < 0 ? 'damage' : 'heal',
        delta < 0 ? `Took ${Math.abs(delta)} damage` : `Recovered ${delta} HP`);
    }
    // Handle damage (negative delta)
    if (delta < 0) {
      const damage = Math.abs(delta);
      // Damage temp HP first
      if (tempHp > 0) {
        if (damage <= tempHp) {
          const newTempHp = tempHp - damage;
          setTempHp(newTempHp);
          setCharacter(prev => prev ? { ...prev, temporary_hit_points: newTempHp, temp_hp: newTempHp } : prev);
          try {
            await axios.patch(`${API}/characters/${characterId}`, { temporary_hit_points: newTempHp });
          } catch {
            console.error('Failed to update temporary HP');
          }
          return; // All damage absorbed by temp HP
        } else {
          const remainingDamage = damage - tempHp;
          setTempHp(0);
          const newHp = Math.max(0, currentHp - remainingDamage);
          setCurrentHp(newHp);
          setCharacter(prev => prev ? { ...prev, current_hit_points: newHp, temporary_hit_points: 0, temp_hp: 0 } : prev);
          try {
            await axios.patch(`${API}/characters/${characterId}`, {
              current_hit_points: newHp,
              temporary_hit_points: 0
            });
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
    setCharacter(prev => prev ? { ...prev, current_hit_points: newHp } : prev);
    try {
      await axios.patch(`${API}/characters/${characterId}`, { current_hit_points: newHp });
    } catch (err) {
      console.error('Failed to update HP');
    }
  };

  const handleTempHpChange = (delta) => {
    const newTempHp = Math.max(0, tempHp + delta);
    setTempHp(newTempHp);
    setCharacter(prev => prev ? { ...prev, temporary_hit_points: newTempHp, temp_hp: newTempHp } : prev);
    axios.patch(`${API}/characters/${characterId}`, { temporary_hit_points: newTempHp }).catch(() => {
      console.error('Failed to update temporary HP');
    });
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
    const prevSnapshot = character;
    const hasHpUpdate = updates && ('current_hit_points' in updates || 'hp' in updates);
    const hasTempHpUpdate = updates && ('temporary_hit_points' in updates || 'temp_hp' in updates);
    const normalizedTempHp = hasTempHpUpdate ? getTempHp(updates) : null;
    const localUpdates = hasTempHpUpdate
      ? { ...updates, temporary_hit_points: normalizedTempHp, temp_hp: normalizedTempHp }
      : updates;
    const apiUpdates = hasTempHpUpdate
      ? { ...updates, temporary_hit_points: normalizedTempHp }
      : updates;
    if (apiUpdates && 'temp_hp' in apiUpdates) delete apiUpdates.temp_hp;

    // Combat Log: track condition + exhaustion changes
    if (localUpdates && 'conditions' in localUpdates && Array.isArray(localUpdates.conditions)) {
      const before = new Set(character?.conditions || []);
      const after = new Set(localUpdates.conditions);
      after.forEach(c => { if (!before.has(c)) logEvent('condition', `Gained condition: ${c}`); });
      before.forEach(c => { if (!after.has(c)) logEvent('condition', `Removed condition: ${c}`); });
    }
    if (localUpdates && 'exhaustion_level' in localUpdates) {
      const before = character?.exhaustion_level || 0;
      const after = localUpdates.exhaustion_level || 0;
      if (after !== before) logEvent('condition', `Exhaustion ${before} → ${after}`);
    }
    if (hasHpUpdate) {
      const nextHp = localUpdates.current_hit_points ?? localUpdates.hp;
      if (nextHp !== undefined) setCurrentHp(Math.max(0, Math.min(maxHp, Number(nextHp) || 0)));
    }
    if (hasTempHpUpdate) setTempHp(normalizedTempHp);

    setCharacter(prev => prev ? { ...prev, ...localUpdates } : prev);
    try {
      await axios.patch(`${API}/characters/${characterId}`, apiUpdates);
    } catch (err) {
      console.error('Failed to persist character update:', err);
      toast.error('Could not save character update');
      // Roll back optimistic update so UI matches server
      setCharacter(prevSnapshot);
      if (hasHpUpdate) setCurrentHp(prevSnapshot?.current_hit_points ?? prevSnapshot?.hp ?? currentHp);
      if (hasTempHpUpdate) setTempHp(getTempHp(prevSnapshot));
      // Rethrow so callers (e.g. Learn Spell) can show real error toasts
      throw err;
    }
  };

  const handleUpdateResources = async (resources) => {
    try {
      await axios.put(`${API}/characters/${characterId}/resources`, resources);
      setCharacter(prev => prev ? { ...prev, resources } : prev);
    } catch (err) {
      console.error('Failed to update resources');
      toast.error('Could not save resources');
    }
  };

  const getRestoredResourcesForRest = (restType, sourceCharacter) => {
    const className = sourceCharacter?.character_class;
    const classResources = CLASS_RESOURCES[className] || [];
    const currentResources = sourceCharacter?.resources || {};
    if (classResources.length === 0) return currentResources;

    const level = sourceCharacter?.level || 1;
    const abilityScores = {
      strength: sourceCharacter?.strength,
      dexterity: sourceCharacter?.dexterity,
      constitution: sourceCharacter?.constitution,
      intelligence: sourceCharacter?.intelligence,
      wisdom: sourceCharacter?.wisdom,
      charisma: sourceCharacter?.charisma
    };

    const restored = { ...currentResources };
    classResources.forEach(res => {
      if (res.minLevel && level < res.minLevel) return;
      const max = getResourceMax(res, level, abilityScores);
      if (max <= 0) return;
      const restoresOn = getRestoreType(res, level);
      if (restType === 'long' || restoresOn === restType) {
        restored[res.key] = max;
      }
    });

    return restored;
  };

  const handleRest = async (type) => {
    try {
      const url = type === 'short'
        ? `${API}/characters/${characterId}/short-rest?hit_dice_to_spend=1`
        : `${API}/characters/${characterId}/long-rest`;
      const response = await axios.post(url);
      const restoredResources = getRestoredResourcesForRest(type, response.data);
      const restedCharacter = { ...response.data, resources: restoredResources };
      setCharacter(restedCharacter);
      setCurrentHp(restedCharacter.current_hit_points ?? restedCharacter.hp ?? currentHp);
      setTempHp(getTempHp(restedCharacter));

      if (Object.keys(restoredResources).length > 0) {
        axios.put(`${API}/characters/${characterId}/resources`, restoredResources)
          .catch(() => toast.error('Could not save restored resources'));
      }

      // Spell slot recovery per 5e RAW
      if (type === 'long') {
        // Long rest: ALL spell slots restored
        setUsedSlots({});
        axios.patch(`${API}/characters/${characterId}`, { used_spell_slots: {} }).catch(() => {});
      } else {
        // Short rest: ONLY Pact Magic (Warlock) slots restored
        setUsedSlots(prev => {
          const next = { ...prev, pact: 0 };
          axios.patch(`${API}/characters/${characterId}`, { used_spell_slots: next }).catch(() => {});
          return next;
        });
      }

      toast.success(`${type === 'short' ? 'Short' : 'Long'} rest complete`);
      logEvent('rest', type === 'long'
        ? 'Long Rest: HP fully restored, all spell slots restored'
        : 'Short Rest: Pact Magic slots restored');
    } catch (err) {
      toast.error(`Rest failed: ${err.response?.data?.detail || 'unknown error'}`);
    }
  };

  const renderTabContent = (tabId) => {
    if (tabId === 'overview') {
      return (
        <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
          <PlayerProgressionDashboard character={character} characterId={characterId} />
        </div>
      );
    }

    if (tabId === 'combat') {
      return (
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
          <div style={{ marginTop: '8px' }}>
            <CombatLog entries={combatLog} onClear={clearCombatLog} theme={theme} characterName={character?.name} />
          </div>
        </div>
      );
    }

    if (tabId === 'spells' && canUseSpells) {
      return (
        <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
          <CharacterSpellbook
            character={character}
            usedSlots={usedSlots}
            setUsedSlots={persistUsedSlots}
            rollDice={rollDice}
            onUpdateCharacter={handleUpdateCharacter}
            onRest={handleRest}
          />
        </div>
      );
    }

    if (tabId === 'inventory') {
      return (
        <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
          <CharacterInventory
            characterId={characterId}
            character={character}
            onUpdate={fetchCharacter}
          />
        </div>
      );
    }

    if (tabId === 'backstory') {
      return <BackstoryTab character={character} characterId={characterId} theme={theme} onUpdateCharacter={handleUpdateCharacter} />;
    }

    if (tabId === 'journal') {
      return (
        <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px' }}>
          <SessionJournal characterId={characterId} campaignId={character?.campaign_id} />
        </div>
      );
    }

    if (tabId === 'notes') {
      return (
        <div style={{ ...scrollBoxStyle, flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4 style={{ fontFamily: "'Montserrat', sans-serif", color: theme.text.primary, marginBottom: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: theme.accent.primary }} />
              Character Notes
            </h4>
            <div style={{ whiteSpace: 'pre-wrap', color: theme.text.secondary, lineHeight: '1.7', fontSize: '15px', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '10px', padding: '16px', minHeight: '80px' }}>
              {character.notes || 'No personal notes yet.'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Styles - Electric Tundra (Player Mode)
  const pageStyle = {
    minHeight: '100vh',
    background: theme.bg.primary,
    padding: '12px',
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
    borderRadius: '8px',
    padding: '8px',
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
    background: type === 'attack' ? 'rgba(212, 160, 23, 0.15)' : 
                type === 'spell' ? 'rgba(0, 102, 255, 0.15)' :
                type === 'heal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${type === 'attack' ? 'rgba(212, 160, 23, 0.3)' : 
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
          <button onClick={() => navigate('/home')} style={{ padding: '12px 24px', background: theme.accent.primary, border: `1px solid ${theme.accent.primary}`, borderRadius: '8px', color: theme.bg.primary, cursor: 'pointer', fontWeight: 700 }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="character-sheet-full" className="character-sheet-shell" style={pageStyle}>
      {/* Left sidebar navigation for player pages (minimalist sharp design) */}
      <aside className="character-sidebar" style={{
        position: 'absolute', left: 12, top: 12, bottom: 12,
        width: 220, padding: 12, zIndex: 6, overflowY: 'auto'
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: theme.text.primary, marginBottom: 8 }}>CHARACTER</div>
        {['overview','combat','spells','inventory','backstory','journal','notes'].map(id => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', marginBottom: 6, textAlign: 'left',
            background: activeTab === id ? theme.bg.surface : 'transparent',
            color: activeTab === id ? theme.text.primary : theme.text.muted,
            border: activeTab === id ? `2px solid ${theme.accent.primary}` : `1px solid ${theme.border}`,
            borderRadius: 0, cursor: 'pointer', fontWeight: 800
          }}>{id.toUpperCase()}</button>
        ))}
      </aside>
      <style>{`
          .character-sheet-shell {
            --sheet-panel-gap: 8px;
          }

        .character-sheet-shell button,
        .character-sheet-shell input,
        .character-sheet-shell select,
        .character-sheet-shell textarea {
          letter-spacing: 0 !important;
        }

        .character-sheet-tabs {
          scrollbar-width: thin;
        }

        @media (max-width: 1240px) {
          .character-sheet-shell {
            height: auto !important;
            min-height: 100vh !important;
            overflow: auto !important;
            padding: 10px !important;
          }

          .character-sheet-header {
            align-items: stretch !important;
            flex-wrap: wrap !important;
          }

          .character-sheet-identity {
            order: -1;
            flex: 1 1 360px !important;
          }

          .character-sheet-vitals {
            justify-content: flex-start !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            padding-bottom: 2px !important;
          }

          .character-sheet-grid {
            display: flex !important;
            flex-direction: column !important;
            overflow: visible !important;
            min-height: auto !important;
            gap: 8px !important;
          }

          .character-sheet-tabs {
            position: sticky !important;
            top: 0 !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            padding: 6px !important;
          }

          .character-sheet-tabs button {
            flex: 0 0 auto !important;
            min-width: 94px !important;
            min-height: 40px !important;
            padding: 8px 10px !important;
            font-size: 12px !important;
          }
        }

        @media (max-width: 720px) {
          .character-sidebar {
            display: none !important;
          }

          .character-sheet-header {
            gap: 8px !important;
            margin-bottom: 8px !important;
          }

          .character-sheet-identity h1 {
            font-size: 1.05rem !important;
          }

          .character-sheet-identity img,
          .character-sheet-identity .portrait-fallback {
            width: 42px !important;
            height: 42px !important;
          }

          .character-sheet-header-actions {
            width: 100%;
          }

          .character-sheet-header-actions button {
            flex: 1;
            justify-content: center;
            padding: 7px 10px !important;
            font-size: 12px !important;
          }

          .character-sheet-tabs button span {
            display: none;
          }

          .character-sheet-tabs button {
            min-width: 46px !important;
            width: 46px !important;
            padding: 8px !important;
          }

          .quick-dice-bar {
            max-width: calc(100vw - 16px);
            overflow-x: auto;
            padding: 5px 8px !important;
          }

          .quick-dice-bar button {
            min-width: 34px !important;
            padding: 5px 8px !important;
          }
        }
      `}</style>
      {/* Background gradient overlay */}
      <div style={bgOverlayStyle} />
      {/* Corner glows */}
      <div style={bottomLeftGlow} />
      <div style={bottomRightGlow} />
      
      {/* Header - Fixed (Identity + Vitals Bar) */}
      <CharacterHeader
        character={character}
        theme={theme}
        navigate={navigate}
        currentHp={currentHp}
        maxHp={maxHp}
        tempHp={tempHp}
        handleHpChange={handleHpChange}
        handleTempHpChange={handleTempHpChange}
        initiative={initiative}
        ac={ac}
        speed={speed}
        setShowLevelUpWizard={setShowLevelUpWizard}
        rollDice={rollDice}
        setActiveTab={setActiveTab}
        canUseSpells={canUseSpells}
        onToggleInspiration={(val) => handleUpdateCharacter({ inspiration: val })}
      />

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
      <div className="character-sheet-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '168px 172px minmax(0, 1fr)', gap: '8px', overflow: 'hidden', minHeight: 0 }}>
        
        {/* LEFT & MIDDLE: Extracted panels for readability and reuse */}
        <CharacterLeftPanel character={character} theme={theme} abilities={abilities} profBonus={profBonus} rollDice={rollDice} handleUpdateCharacter={handleUpdateCharacter} />
        <CharacterSkillsPanel character={character} theme={theme} abilities={abilities} profBonus={profBonus} rollDice={rollDice} />

        {/* RIGHT COLUMN: Combat Stats + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>

          {/* Tabs (extracted) */}
          {!isMobileSheet && <CharacterTabs visibleTabs={visibleTabs} activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />}

          {/* ROOK Hints */}
          <RookHints character={character} theme={theme} activeTab={activeTab} />

          {/* Tab Content - Scrollable */}
          <div style={{ ...panelStyle, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {isMobileSheet ? (
              <MobileCharacterSheetLayout
                theme={{
                  bg: { primary: '#0a0a0a' },
                  border: 'rgba(239, 68, 68, 0.45)',
                  accent: { primary: '#ef4444', highlight: '#ffffff' },
                  text: { muted: 'rgba(255,255,255,0.75)' }
                }}
                currentPage={Math.max(0, visibleTabs.findIndex((tab) => tab.id === activeTab))}
                pages={visibleTabs.map((tab) => (
                  <div key={tab.id} style={{ ...panelStyle, color: '#fff', borderColor: 'rgba(239, 68, 68, 0.35)' }}>
                    {renderTabContent(tab.id)}
                  </div>
                ))}
                onPageChange={(pageIndex) => setActiveTab(visibleTabs[pageIndex]?.id || 'overview')}
              />
            ) : renderTabContent(activeTab)}

            {!isMobileSheet && activeTab === 'notes' && (
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
                    border: '1px solid rgba(212, 160, 23, 0.2)',
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
      <div data-testid="quick-dice-bar" className="quick-dice-bar" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '4px', padding: '6px 16px',
        background: 'rgba(10, 8, 25, 0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(212, 160, 23, 0.2)', borderBottom: 'none',
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
      
      {/* Compact dice result */}
      <DiceRollFlicker
        isOpen={showDiceFlicker}
        onClose={() => setShowDiceFlicker(false)}
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


 
