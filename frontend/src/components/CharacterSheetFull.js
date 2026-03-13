import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Heart, Shield, Zap, Swords, BookOpen, Backpack, ChevronLeft,
  Plus, Minus, Skull, Wind, Edit3, Dices, Target, Sparkles
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme
const theme = {
  bg: { primary: '#0F0A1E', surface: '#1A112E', elevated: '#2E1F45' },
  sunset: { purple: '#8B5CF6', pink: '#EC4899', gold: '#F59E0B' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(139, 92, 246, 0.3)'
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

// Class features data
const CLASS_ACTIONS = {
  Fighter: {
    actions: [
      { name: 'Second Wind', desc: 'Regain 1d10 + level HP', type: 'heal', dice: '1d10' },
      { name: 'Action Surge', desc: 'Take an additional action (1/rest)', type: 'ability', level: 2 }
    ],
    bonusActions: [],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
    ]
  },
  Wizard: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: 'Arcane Recovery', desc: 'Recover spell slots (1/day)', type: 'ability' }
    ],
    bonusActions: [],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Shield (Spell)', desc: '+5 AC until next turn', type: 'spell', level: 1 }
    ]
  },
  Rogue: {
    actions: [
      { name: 'Sneak Attack', desc: 'Extra damage when advantage', type: 'attack', dice: '1d6', level: 1 }
    ],
    bonusActions: [
      { name: 'Cunning Action', desc: 'Dash, Disengage, or Hide', type: 'ability', level: 2 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' },
      { name: 'Uncanny Dodge', desc: 'Halve attack damage', type: 'ability', level: 5 }
    ]
  },
  Cleric: {
    actions: [
      { name: 'Spell Attack', desc: 'Cast a spell', type: 'spell', dice: '1d20' },
      { name: 'Turn Undead', desc: 'Channel Divinity', type: 'ability', level: 2 }
    ],
    bonusActions: [
      { name: 'Spiritual Weapon', desc: 'Attack with spiritual weapon', type: 'spell', dice: '1d8', level: 3 }
    ],
    reactions: [
      { name: 'Opportunity Attack', desc: 'Melee attack when enemy leaves reach', type: 'attack', dice: '1d20' }
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

// Dice roller function
const rollDice = (diceStr, modifier = 0, label = '') => {
  const match = diceStr.match(/(\d+)d(\d+)/);
  if (!match) return null;
  
  const [, numDice, dieSize] = match;
  const rolls = [];
  for (let i = 0; i < parseInt(numDice); i++) {
    rolls.push(Math.floor(Math.random() * parseInt(dieSize)) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  
  toast.success(
    <div>
      <strong>{label || diceStr}</strong>
      <div style={{ fontSize: '12px', opacity: 0.8 }}>
        Rolls: [{rolls.join(', ')}] {modifier !== 0 ? `${modifier >= 0 ? '+' : ''}${modifier}` : ''} = <strong>{total}</strong>
      </div>
    </div>,
    { duration: 5000 }
  );
  return total;
};

export default function CharacterSheetFull() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('combat');
  const [currentHp, setCurrentHp] = useState(0);

  useEffect(() => {
    if (characterId) fetchCharacter();
  }, [characterId]);

  const fetchCharacter = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/characters/${characterId}`);
      setCharacter(response.data);
      setCurrentHp(response.data.hp || response.data.max_hp || 10);
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
    const newHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    setCurrentHp(newHp);
    try {
      await axios.patch(`${API}/characters/${characterId}`, { hp: newHp });
    } catch (err) {
      console.error('Failed to update HP');
    }
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

  // Styles
  const pageStyle = {
    minHeight: '100vh',
    background: `linear-gradient(180deg, rgba(15, 10, 30, 0.85) 0%, rgba(15, 10, 30, 0.95) 100%), url('https://static.prod-images.emergentagent.com/jobs/b9fc55bd-0a80-4d15-9934-a7087e3445c8/images/9be68b2095230a13a9d52ed25ea5ba93da54c6f47b915d5cd89f4c7b8992a6d3.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden'
  };

  const panelStyle = {
    background: 'rgba(26, 17, 46, 0.85)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '16px'
  };

  const scrollBoxStyle = {
    overflowY: 'auto',
    maxHeight: '100%',
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.sunset.purple} transparent`
  };

  const actionBtnStyle = (type) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: type === 'attack' ? 'rgba(239, 68, 68, 0.15)' : 
                type === 'spell' ? 'rgba(139, 92, 246, 0.15)' :
                type === 'heal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${type === 'attack' ? 'rgba(239, 68, 68, 0.3)' : 
             type === 'spell' ? 'rgba(139, 92, 246, 0.3)' :
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
          <button onClick={() => navigate('/home')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header - Fixed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <button onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(139, 92, 246, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 16px', color: theme.text.primary, cursor: 'pointer' }}>
          <ChevronLeft size={18} /> Dashboard
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {character.name}
          </h1>
          <div style={{ color: theme.text.secondary, fontSize: '13px' }}>
            {character.race} {character.character_class} • Level {character.level || 1}
          </div>
        </div>

        <button onClick={() => navigate(`/characters/${characterId}/edit`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(139, 92, 246, 0.2)', border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '8px 16px', color: theme.text.primary, cursor: 'pointer' }}>
          <Edit3 size={16} /> Edit
        </button>
      </div>

      {/* Main Content - Fills remaining space */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 200px 1fr', gap: '16px', overflow: 'hidden', minHeight: 0 }}>
        
        {/* LEFT COLUMN: Abilities + Saving Throws */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.purple, marginBottom: '12px', fontSize: '0.9rem', flexShrink: 0 }}>Ability Scores</h3>
          
          <div style={{ ...scrollBoxStyle, flex: 1 }}>
            {SAVING_THROWS.map((ability) => {
              const score = abilities[ability];
              const mod = getModifier(score);
              const saveMod = mod + (character.saving_throw_proficiencies?.includes(ability) ? profBonus : 0);
              const isProficient = character.saving_throw_proficiencies?.includes(ability);
              
              return (
                <div key={ability} style={{ marginBottom: '12px', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '10px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: theme.text.muted, letterSpacing: '1px' }}>{ABILITY_SHORT[ability]}</span>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text.primary }}>{score}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: theme.sunset.gold }}>{formatModifier(mod)}</span>
                  </div>
                  <button
                    onClick={() => rollDice('1d20', saveMod, `${ABILITY_SHORT[ability]} Save`)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: isProficient ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                      border: `1px solid ${isProficient ? 'rgba(245, 158, 11, 0.4)' : theme.border}`,
                      borderRadius: '6px',
                      color: isProficient ? theme.sunset.gold : theme.text.secondary,
                      fontSize: '11px',
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
          <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', marginTop: '8px', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: theme.text.muted }}>PROFICIENCY</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.sunset.pink }}>+{profBonus}</div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Skills */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.pink, marginBottom: '12px', fontSize: '0.9rem', flexShrink: 0 }}>Skills</h3>
          
          <div style={{ ...scrollBoxStyle, flex: 1 }}>
            {SKILLS.map(skill => {
              const mod = getModifier(abilities[skill.ability]);
              const isProficient = character.skill_proficiencies?.includes(skill.name);
              const bonus = mod + (isProficient ? profBonus : 0);
              
              return (
                <button
                  key={skill.name}
                  onClick={() => rollDice('1d20', bonus, skill.name)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    marginBottom: '4px',
                    background: isProficient ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: isProficient ? theme.sunset.gold : theme.text.secondary,
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(139, 92, 246, 0.15)'}
                  onMouseLeave={(e) => e.target.style.background = isProficient ? 'rgba(245, 158, 11, 0.1)' : 'transparent'}
                >
                  <span>{isProficient && '● '}{skill.name}</span>
                  <span style={{ fontWeight: '600', color: theme.text.primary }}>{formatModifier(bonus)}</span>
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
            <div style={{ ...panelStyle, textAlign: 'center', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: theme.text.muted, fontSize: '10px', marginBottom: '4px' }}>
                <Heart size={12} /> HP
              </div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>
                <span style={{ color: currentHp < maxHp / 2 ? '#EF4444' : theme.text.primary }}>{currentHp}</span>
                <span style={{ color: theme.text.muted, fontSize: '14px' }}>/{maxHp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <button onClick={() => handleHpChange(-1)} style={{ padding: '4px 12px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', color: '#EF4444', cursor: 'pointer' }}><Minus size={14} /></button>
                <button onClick={() => handleHpChange(1)} style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.2)', border: 'none', borderRadius: '6px', color: '#10B981', cursor: 'pointer' }}><Plus size={14} /></button>
              </div>
            </div>

            {/* AC */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: theme.text.muted, fontSize: '10px', marginBottom: '4px' }}>
                <Shield size={12} /> AC
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.sunset.purple }}>{ac}</div>
            </div>

            {/* Initiative */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: theme.text.muted, fontSize: '10px', marginBottom: '4px' }}>
                <Zap size={12} /> INIT
              </div>
              <button
                onClick={() => rollDice('1d20', initiative, 'Initiative')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', fontWeight: 'bold', color: theme.sunset.pink }}
              >
                {formatModifier(initiative)}
              </button>
            </div>

            {/* Speed */}
            <div style={{ ...panelStyle, textAlign: 'center', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: theme.text.muted, fontSize: '10px', marginBottom: '4px' }}>
                <Wind size={12} /> SPEED
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.sunset.gold }}>{speed}<span style={{ fontSize: '12px' }}>ft</span></div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {['combat', 'spells', 'inventory', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activeTab === tab ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(139, 92, 246, 0.1)',
                  border: activeTab === tab ? 'none' : `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  color: theme.text.primary,
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? '600' : '400',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content - Scrollable */}
          <div style={{ ...panelStyle, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...scrollBoxStyle, flex: 1 }}>
              {activeTab === 'combat' && (
                <div>
                  {/* Actions */}
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.pink, marginBottom: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Swords size={16} /> Actions
                  </h4>
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                    {/* Unarmed Strike */}
                    <div
                      style={actionBtnStyle('attack')}
                      onClick={() => rollDice('1d20', profBonus + getModifier(abilities.strength), 'Unarmed Strike')}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: theme.text.primary, fontSize: '13px' }}>Unarmed Strike</div>
                        <div style={{ color: theme.text.muted, fontSize: '11px' }}>+{profBonus + getModifier(abilities.strength)} to hit • 1+{getModifier(abilities.strength)} bludgeoning</div>
                      </div>
                      <Dices size={18} style={{ color: '#EF4444' }} />
                    </div>
                    
                    {classActions.actions.filter(a => a.name !== 'Attack').map((action, i) => (
                      <div key={i} style={actionBtnStyle(action.type)} onClick={() => handleRoll(action)}>
                        <div>
                          <div style={{ fontWeight: '600', color: theme.text.primary, fontSize: '13px' }}>{action.name}</div>
                          <div style={{ color: theme.text.muted, fontSize: '11px' }}>{action.desc}</div>
                        </div>
                        {action.dice && <Dices size={18} style={{ color: action.type === 'spell' ? theme.sunset.purple : action.type === 'heal' ? '#10B981' : '#EF4444' }} />}
                      </div>
                    ))}
                  </div>

                  {/* Bonus Actions */}
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, marginBottom: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} /> Bonus Actions
                  </h4>
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                    {classActions.bonusActions.length > 0 ? classActions.bonusActions.map((action, i) => (
                      <div key={i} style={actionBtnStyle(action.type)} onClick={() => handleRoll(action)}>
                        <div>
                          <div style={{ fontWeight: '600', color: theme.text.primary, fontSize: '13px' }}>{action.name}</div>
                          <div style={{ color: theme.text.muted, fontSize: '11px' }}>{action.desc}</div>
                        </div>
                        {action.dice && <Dices size={18} style={{ color: theme.sunset.gold }} />}
                      </div>
                    )) : (
                      <div style={{ color: theme.text.muted, fontSize: '12px', fontStyle: 'italic' }}>No bonus actions available at this level</div>
                    )}
                  </div>

                  {/* Reactions */}
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.purple, marginBottom: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={16} /> Reactions
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {classActions.reactions.map((action, i) => (
                      <div key={i} style={actionBtnStyle(action.type)} onClick={() => handleRoll(action)}>
                        <div>
                          <div style={{ fontWeight: '600', color: theme.text.primary, fontSize: '13px' }}>{action.name}</div>
                          <div style={{ color: theme.text.muted, fontSize: '11px' }}>{action.desc}</div>
                        </div>
                        {action.dice && <Dices size={18} style={{ color: theme.sunset.purple }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'spells' && (
                <div>
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.purple, marginBottom: '12px' }}>Spellcasting</h4>
                  {['Wizard', 'Cleric', 'Bard', 'Druid', 'Sorcerer', 'Warlock', 'Paladin', 'Ranger'].includes(character.character_class) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: theme.text.muted }}>SPELL DC</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.sunset.purple }}>{8 + profBonus + getModifier(abilities.intelligence)}</div>
                      </div>
                      <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: theme.text.muted }}>SPELL ATK</div>
                        <button onClick={() => rollDice('1d20', profBonus + getModifier(abilities.intelligence), 'Spell Attack')} style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', color: theme.sunset.pink, cursor: 'pointer' }}>
                          +{profBonus + getModifier(abilities.intelligence)}
                        </button>
                      </div>
                      <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: theme.text.muted }}>ABILITY</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: theme.sunset.gold }}>INT</div>
                      </div>
                    </div>
                  )}
                  {character.spells?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {character.spells.map((spell, i) => (
                        <div key={i} style={{ padding: '10px', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '8px' }}>
                          <div style={{ fontWeight: '600', color: theme.text.primary }}>{spell.name}</div>
                          <div style={{ color: theme.text.muted, fontSize: '12px' }}>{spell.level ? `Level ${spell.level}` : 'Cantrip'} • {spell.school}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: theme.text.muted, textAlign: 'center', padding: '20px' }}>No spells known</div>
                  )}
                </div>
              )}

              {activeTab === 'inventory' && (
                <div>
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, marginBottom: '12px' }}>Inventory</h4>
                  {character.equipment?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {character.equipment.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '8px' }}>
                          <span style={{ color: theme.text.primary }}>{item.name || item}</span>
                          {item.quantity && <span style={{ color: theme.text.muted }}>x{item.quantity}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: theme.text.muted, textAlign: 'center', padding: '20px' }}>No items</div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  <h4 style={{ fontFamily: "'Cinzel', serif", color: theme.text.primary, marginBottom: '12px' }}>Character Notes</h4>
                  <div style={{ whiteSpace: 'pre-wrap', color: theme.text.secondary, lineHeight: '1.6' }}>
                    {character.notes || 'No notes yet.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
