import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Edit, Heart, Shield, Zap, User, Sword, Book, 
  Sparkles, Save, X, Target, Activity, TrendingUp, Award, Link2,
  Star, Flame, Wand2, ScrollText, Crown, Dumbbell, Brain, Eye,
  MessageCircle, Plus, Minus, ChevronDown, ChevronUp, Check, Search,
  BookOpen, Swords, Package, Coins, Feather, Moon, Sun, CircleDot
} from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import JoinCampaignModal from '@/components/JoinCampaignModal';
import LevelUpModal from '@/components/LevelUpModal';
import DiceRollTooltip from '@/components/DiceRollTooltip';
import { RookSuggestionPopup, useRookSuggestions } from './RookSuggestions';
import { DiceRollButton } from '@/components/DiceRollButton';
import TronBackground from '@/components/TronBackground';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Skills with their linked abilities
const SKILLS = [
  { name: 'Acrobatics', ability: 'dexterity', icon: Activity },
  { name: 'Animal Handling', ability: 'wisdom', icon: Heart },
  { name: 'Arcana', ability: 'intelligence', icon: Sparkles },
  { name: 'Athletics', ability: 'strength', icon: Dumbbell },
  { name: 'Deception', ability: 'charisma', icon: MessageCircle },
  { name: 'History', ability: 'intelligence', icon: Book },
  { name: 'Insight', ability: 'wisdom', icon: Eye },
  { name: 'Intimidation', ability: 'charisma', icon: Flame },
  { name: 'Investigation', ability: 'intelligence', icon: Search },
  { name: 'Medicine', ability: 'wisdom', icon: Heart },
  { name: 'Nature', ability: 'intelligence', icon: Sun },
  { name: 'Perception', ability: 'wisdom', icon: Eye },
  { name: 'Performance', ability: 'charisma', icon: Star },
  { name: 'Persuasion', ability: 'charisma', icon: MessageCircle },
  { name: 'Religion', ability: 'intelligence', icon: Moon },
  { name: 'Sleight of Hand', ability: 'dexterity', icon: Feather },
  { name: 'Stealth', ability: 'dexterity', icon: Eye },
  { name: 'Survival', ability: 'wisdom', icon: Target }
];

// Ability score data - Tron Legacy Blue theme for players
const ABILITIES = [
  { key: 'strength', label: 'STR', fullName: 'Strength', color: '#3B82F6', icon: Dumbbell },
  { key: 'dexterity', label: 'DEX', fullName: 'Dexterity', color: '#06B6D4', icon: Zap },
  { key: 'constitution', label: 'CON', fullName: 'Constitution', color: '#0EA5E9', icon: Shield },
  { key: 'intelligence', label: 'INT', fullName: 'Intelligence', color: '#6366F1', icon: Brain },
  { key: 'wisdom', label: 'WIS', fullName: 'Wisdom', color: '#8B5CF6', icon: Eye },
  { key: 'charisma', label: 'CHA', fullName: 'Charisma', color: '#A855F7', icon: Star }
];

// Tab configuration - Consolidated for less clicking
const TABS = [
  { id: 'combat', label: 'Combat', icon: Sword },
  { id: 'character', label: 'Character', icon: User },
  { id: 'spells', label: 'Spells', icon: Wand2 },
  { id: 'inventory', label: 'Inventory', icon: Package }
];

// Spell level labels
const SPELL_LEVELS = {
  0: 'Cantrip',
  1: '1st Level',
  2: '2nd Level', 
  3: '3rd Level',
  4: '4th Level',
  5: '5th Level',
  6: '6th Level',
  7: '7th Level',
  8: '8th Level',
  9: '9th Level'
};

// Blue theme for player section - Tron Legacy aesthetic
const playerBlue = '#3B82F6';
const playerBlueHover = '#60A5FA';
const playerBlueSubtle = 'rgba(59, 130, 246, 0.15)';
const playerCyan = '#06B6D4';     // Tron Legacy cyan for highlights
const playerCyanGlow = '#22D3EE'; // Brighter cyan for glows
const playerSuccess = '#06B6D4';  // Use cyan instead of green for success states
const playerHP = '#EF4444';       // Keep red for HP (damage is universal)

// Dark panel styles (matching dark theme)
const glassPanel = {
  background: '#1A1A1A',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

// Compact Ability Score Block Component
function AbilityScoreBlock({ ability, score, modifier, isProficientSave, profBonus, onClick, isEditing, onScoreChange }) {
  const Icon = ability.icon;
  const saveModifier = isProficientSave ? modifier + profBonus : modifier;
  
  return (
    <div 
      data-testid={`ability-${ability.key}`}
      style={{
        ...glassPanel,
        padding: '10px 8px',
        transition: 'all 0.2s ease',
        textAlign: 'center',
        minWidth: '70px'
      }}
      className="hover:border-cyan-500/30"
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '4px',
        marginBottom: '4px'
      }}>
        <Icon size={12} color={ability.color} />
        <span style={{ 
          color: ability.color, 
          fontSize: '10px', 
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}>
          {ability.label}
        </span>
      </div>
      
      {isEditing ? (
        <Input
          type="number"
          value={score}
          onChange={(e) => onScoreChange(ability.key, parseInt(e.target.value) || 10)}
          style={{ 
            width: '50px', 
            textAlign: 'center', 
            margin: '0 auto',
            fontSize: '16px',
            fontWeight: '800',
            padding: '4px'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: '800', 
            color: '#fff',
            fontFamily: 'Cityworm, sans-serif',
            lineHeight: 1
          }}>
            {score}
          </div>
          {/* Clickable ability check dice roll */}
          <DiceRollButton 
            modifier={modifier}
            label={`${ability.fullName} Check`}
            color={ability.color}
            size="small"
          />
        </>
      )}
      
      <div style={{
        marginTop: '4px',
        paddingTop: '4px',
        borderTop: `1px solid ${ability.color}30`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {isProficientSave && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#06B6D4'
            }} />
          )}
          <span style={{ color: '#94a3b8', fontSize: '9px' }}>SAVE</span>
        </div>
        {/* Clickable saving throw dice roll */}
        <DiceRollButton 
          modifier={saveModifier}
          label={`${ability.fullName} Save`}
          color={isProficientSave ? '#06B6D4' : '#e2e8f0'}
          size="small"
          showDice={false}
        />
      </div>
    </div>
  );
}

// Compact Skill Row Component
function SkillRow({ skill, abilityMod, profBonus, isProficient, isExpert, onToggle, isEditing }) {
  const Icon = skill.icon;
  const totalMod = abilityMod + (isProficient ? profBonus : 0) + (isExpert ? profBonus : 0);
  
  const ability = ABILITIES.find(a => a.key === skill.ability);
  
  return (
    <div 
      data-testid={`skill-${skill.name.toLowerCase().replace(/ /g, '-')}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 8px',
        borderRadius: '6px',
        background: isProficient ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
        transition: 'all 0.15s ease'
      }}
      className="hover:bg-slate-700/30"
    >
      {isEditing && (
        <button
          onClick={() => onToggle(skill.name)}
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '3px',
            border: isProficient ? '2px solid #06B6D4' : '2px solid #475569',
            background: isProficient ? '#06B6D4' : 'transparent',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {isProficient && <Check size={10} color="#fff" />}
        </button>
      )}
      
      <Icon size={12} color={isProficient ? '#06B6D4' : '#64748b'} style={{ marginRight: '6px', flexShrink: 0 }} />
      
      <span style={{ 
        flex: 1,
        color: isProficient ? '#06B6D4' : '#e2e8f0',
        fontSize: '12px',
        fontWeight: isProficient ? '600' : '400',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {skill.name}
      </span>
      
      <span style={{ 
        color: ability?.color || '#64748b', 
        fontSize: '9px',
        marginRight: '8px',
        opacity: 0.7
      }}>
        {ability?.label}
      </span>
      
      {/* Clickable skill check dice roll */}
      <DiceRollButton 
        modifier={totalMod}
        label={skill.name}
        color={isProficient ? '#06B6D4' : '#fff'}
        size="small"
        showDice={false}
      />
    </div>
  );
}

// Spell Card Component
function SpellCard({ spell, isPrepared, onTogglePrepare, canPrepare }) {
  const [expanded, setExpanded] = useState(false);
  
  // Tron Legacy blue gradient for spell levels
  const levelColor = spell.level === 0 ? '#94a3b8' : 
    spell.level <= 2 ? '#06B6D4' : 
    spell.level <= 5 ? '#3B82F6' : 
    spell.level <= 7 ? '#6366F1' : '#8B5CF6';
  
  return (
    <div 
      data-testid={`spell-${spell.name.toLowerCase().replace(/ /g, '-')}`}
      style={{
        ...glassPanel,
        padding: '12px 16px',
        marginBottom: '8px'
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer' 
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {canPrepare && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePrepare(spell); }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: isPrepared ? '2px solid #06B6D4' : '2px solid #475569',
              background: isPrepared ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              marginRight: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isPrepared && <Check size={14} color="#06B6D4" />}
          </button>
        )}
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
              {spell.name}
            </span>
            {spell.concentration && (
              <span style={{ 
                background: '#7c3aed20',
                color: '#a78bfa',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                CONC
              </span>
            )}
            {spell.ritual && (
              <span style={{ 
                background: '#06b6d420',
                color: '#22d3ee',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                RITUAL
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <span style={{ color: levelColor, fontSize: '11px' }}>
              {SPELL_LEVELS[spell.level]}
            </span>
            <span style={{ color: '#64748b', fontSize: '11px' }}>
              {spell.school}
            </span>
          </div>
        </div>
        
        {expanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
      </div>
      
      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '10px' }}>CASTING TIME</span>
              <p style={{ color: '#e2e8f0', fontSize: '12px' }}>{spell.casting_time}</p>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10px' }}>RANGE</span>
              <p style={{ color: '#e2e8f0', fontSize: '12px' }}>{spell.range}</p>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10px' }}>COMPONENTS</span>
              <p style={{ color: '#e2e8f0', fontSize: '12px' }}>{spell.components?.join(', ')}</p>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '10px' }}>DURATION</span>
              <p style={{ color: '#e2e8f0', fontSize: '12px' }}>{spell.duration}</p>
            </div>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6' }}>
            {spell.description}
          </p>
          {spell.higher_levels && (
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
              <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: '600' }}>AT HIGHER LEVELS</span>
              <p style={{ color: '#93c5fd', fontSize: '11px', marginTop: '4px' }}>{spell.higher_levels}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Feature Card Component
function FeatureCard({ feature, source }) {
  const [expanded, setExpanded] = useState(false);
  
  // Tron Legacy blue palette for feature sources
  const sourceColors = {
    class: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA' },
    race: { bg: 'rgba(6, 182, 212, 0.12)', text: '#22D3EE' },
    feat: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818CF8' },
    background: { bg: 'rgba(139, 92, 246, 0.12)', text: '#A78BFA' }
  };
  
  const colors = sourceColors[source] || sourceColors.class;
  
  return (
    <div 
      data-testid={`feature-${feature.name?.toLowerCase().replace(/ /g, '-')}`}
      style={{
        ...glassPanel,
        padding: '12px 16px',
        marginBottom: '8px'
      }}
    >
      <div 
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Crown size={16} color={colors.text} style={{ marginRight: '12px' }} />
        <div style={{ flex: 1 }}>
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
            {feature.name}
          </span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <span style={{ 
              background: colors.bg, 
              color: colors.text, 
              fontSize: '9px', 
              padding: '2px 6px', 
              borderRadius: '4px',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              {source}
            </span>
            {feature.level && (
              <span style={{ color: '#64748b', fontSize: '11px' }}>Level {feature.level}</span>
            )}
            {feature.uses_per_rest && (
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                {feature.uses_at_level?.[1] || 1}x per {feature.uses_per_rest} rest
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
      </div>
      
      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6' }}>
            {feature.description}
          </p>
          {feature.benefits && (
            <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
              {feature.benefits.map((benefit, i) => (
                <li key={i} style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                  {benefit}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
function CharacterSheetFull() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('combat');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  
  // SRD Data
  const [srdSpells, setSrdSpells] = useState([]);
  const [srdClasses, setSrdClasses] = useState([]);
  const [srdFeats, setSrdFeats] = useState([]);
  const [loadingSrd, setLoadingSrd] = useState(true);
  
  // Spell filtering
  const [spellSearch, setSpellSearch] = useState('');
  const [spellLevelFilter, setSpellLevelFilter] = useState('all');
  const [spellViewMode, setSpellViewMode] = useState('prepared'); // 'prepared' or 'known'
  
  // ROOK Suggestions
  const { currentSuggestion, showRandomTip, dismissSuggestion } = useRookSuggestions(
    character?.character_class, 
    character?.level || 1
  );

  // Fetch character data
  useEffect(() => {
    fetchCharacter();
    fetchSrdData();
  }, [characterId]);

  // Show random tip after load
  useEffect(() => {
    if (character && !loading) {
      const timer = setTimeout(() => showRandomTip(), 5000);
      return () => clearTimeout(timer);
    }
  }, [character, loading]);

  const fetchCharacter = async () => {
    try {
      const response = await axios.get(`${API}/characters/${characterId}`);
      setCharacter(response.data);
      setEditData(response.data);
    } catch (error) {
      toast.error('Failed to load character');
      navigate('/player');
    } finally {
      setLoading(false);
    }
  };

  const fetchSrdData = async () => {
    try {
      const [spellsRes, classesRes, featsRes] = await Promise.all([
        axios.get(`${API}/srd/spells`),
        axios.get(`${API}/srd/classes`),
        axios.get(`${API}/srd/feats`)
      ]);
      setSrdSpells(spellsRes.data.spells || []);
      
      const classData = classesRes.data.classes || [];
      setSrdClasses(classData);
      
      // Get feats from dedicated endpoint
      const featsData = featsRes.data.feats || [];
      setSrdFeats(featsData);
    } catch (error) {
      console.error('Failed to load SRD data:', error);
    } finally {
      setLoadingSrd(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/characters/${characterId}`, editData);
      toast.success('Character updated!');
      setCharacter(editData);
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const calculateModifier = useCallback((score) => Math.floor((score - 10) / 2), []);
  
  const getModifierDisplay = useCallback((score) => {
    const mod = calculateModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }, [calculateModifier]);

  const getModifier = useCallback((score) => {
    return calculateModifier(score);
  }, [calculateModifier]);

  // Get class features based on character class and level
  const classFeatures = useMemo(() => {
    if (!character || !srdClasses.length) return [];
    const classData = srdClasses.find(c => 
      c.name.toLowerCase() === character.character_class?.toLowerCase()
    );
    if (!classData) return [];
    return classData.features?.filter(f => f.level <= character.level) || [];
  }, [character, srdClasses]);

  // Get available spells for class
  const availableSpells = useMemo(() => {
    if (!character || !srdSpells.length) return [];
    const classLower = character.character_class?.toLowerCase();
    return srdSpells.filter(spell => 
      spell.classes?.includes(classLower)
    );
  }, [character, srdSpells]);

  // Filtered spells
  const filteredSpells = useMemo(() => {
    let spells = availableSpells;
    if (spellSearch) {
      spells = spells.filter(s => 
        s.name.toLowerCase().includes(spellSearch.toLowerCase())
      );
    }
    if (spellLevelFilter !== 'all') {
      spells = spells.filter(s => s.level === parseInt(spellLevelFilter));
    }
    return spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [availableSpells, spellSearch, spellLevelFilter]);

  // Toggle spell preparation
  const toggleSpellPrepared = (spell) => {
    const current = editData.spells_known || [];
    const exists = current.find(s => s.name === spell.name);
    if (exists) {
      setEditData({
        ...editData,
        spells_known: current.filter(s => s.name !== spell.name)
      });
    } else {
      setEditData({
        ...editData,
        spells_known: [...current, { name: spell.name, level: spell.level, school: spell.school }]
      });
    }
  };

  // Toggle skill proficiency
  const toggleSkillProficiency = (skillName) => {
    const current = editData.skill_proficiencies || [];
    const skillKey = skillName.toLowerCase().replace(/ /g, '_');
    if (current.includes(skillKey)) {
      setEditData({
        ...editData,
        skill_proficiencies: current.filter(s => s !== skillKey)
      });
    } else {
      setEditData({
        ...editData,
        skill_proficiencies: [...current, skillKey]
      });
    }
  };

  const updateAbilityScore = (ability, value) => {
    setEditData({ ...editData, [ability]: value });
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', background: '#0B0F19' }}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (!character) return null;

  const data = editMode ? editData : character;
  const profBonus = data.proficiency_bonus || Math.ceil(1 + data.level / 4);

  return (
    <div data-testid="character-sheet-full" style={{
      minHeight: '100vh',
      background: '#0D0D0D',
      fontFamily: 'Cityworm, sans-serif'
    }}>
      {/* Subtle Blue Gradient Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.06) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              data-testid="back-btn"
              onClick={() => navigate('/player')} 
              style={{ 
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                padding: '12px'
              }}
            >
              <ArrowLeft size={20} color="#94a3b8" />
            </Button>
            <div>
              <h1 style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontFamily: 'Cityworm, sans-serif',
                fontWeight: '800',
                color: '#fff',
                marginBottom: '4px'
              }}>
                {data.name}
              </h1>
              <p style={{ color: '#67e8f9', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Level {editMode ? (
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={editData.level}
                    onChange={(e) => {
                      const newLevel = Math.min(20, Math.max(1, parseInt(e.target.value) || 1));
                      setEditData({ ...editData, level: newLevel, proficiency_bonus: Math.ceil(newLevel / 4) + 1 });
                    }}
                    style={{ width: '50px', padding: '2px 6px', textAlign: 'center', fontSize: '14px', display: 'inline-block' }}
                  />
                ) : (
                  data.level
                )} {data.race} {data.character_class}
                {data.subclass && ` (${data.subclass})`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Level Up Button - Only show if not at max level and not in edit mode */}
            {!editMode && data.level < 20 && (
              <Button 
                data-testid="level-up-btn"
                onClick={() => setShowLevelUpModal(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <TrendingUp size={16} />
                Level Up
              </Button>
            )}
            {!data.campaign_id && (
              <Button 
                data-testid="join-campaign-btn"
                onClick={() => setShowJoinModal(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Link2 size={16} />
                Join Campaign
              </Button>
            )}
            {editMode ? (
              <>
                <Button 
                  data-testid="cancel-edit-btn"
                  onClick={() => { setEditMode(false); setEditData(character); }}
                  style={{ 
                    background: 'transparent',
                    border: '1px solid #475569',
                    borderRadius: '0px',
                    padding: '10px 16px',
                    color: '#94a3b8'
                  }}
                >
                  <X size={16} style={{ marginRight: '6px' }} />
                  Cancel
                </Button>
                <Button 
                  data-testid="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ 
                    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                    border: 'none',
                    borderRadius: '0px',
                    padding: '10px 16px'
                  }}
                >
                  <Save size={16} style={{ marginRight: '6px' }} />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button 
                data-testid="edit-btn"
                onClick={() => setEditMode(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '10px 16px'
                }}
              >
                <Edit size={16} style={{ marginRight: '6px' }} />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* ALWAYS VISIBLE SECTION - Core Stats + Key Skills */}
        <div style={{
          ...glassPanel,
          padding: '10px 16px',
          marginBottom: '12px',
          background: 'linear-gradient(180deg, #1A1A1A 0%, #141414 100%)',
          borderBottom: '2px solid rgba(59, 130, 246, 0.3)'
        }}>
          {/* Row 1: Core Combat Stats + Key Skills */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* HP */}
            <div data-testid="hp-display" style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Heart size={14} color="#ef4444" />
              <div>
                <span style={{ color: '#94a3b8', fontSize: '8px', display: 'block', letterSpacing: '0.5px' }}>HP</span>
                {editMode ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Input
                      type="number"
                      value={editData.current_hit_points}
                      onChange={(e) => setEditData({ ...editData, current_hit_points: parseInt(e.target.value) || 0 })}
                      style={{ width: '35px', padding: '2px', textAlign: 'center', fontSize: '13px' }}
                    />
                    <span style={{ color: '#64748b', fontSize: '11px' }}>/</span>
                    <Input
                      type="number"
                      value={editData.max_hit_points}
                      onChange={(e) => setEditData({ ...editData, max_hit_points: parseInt(e.target.value) || 0 })}
                      style={{ width: '35px', padding: '2px', textAlign: 'center', fontSize: '13px' }}
                    />
                  </div>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '15px' }}>
                    {data.current_hit_points}/{data.max_hit_points}
                  </span>
                )}
              </div>
            </div>

            {/* AC */}
            <div data-testid="ac-display" style={{
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Shield size={14} color="#3b82f6" />
              <div>
                <span style={{ color: '#94a3b8', fontSize: '8px', display: 'block', letterSpacing: '0.5px' }}>AC</span>
                {editMode ? (
                  <Input
                    type="number"
                    value={editData.armor_class}
                    onChange={(e) => setEditData({ ...editData, armor_class: parseInt(e.target.value) || 10 })}
                    style={{ width: '35px', padding: '2px', textAlign: 'center', fontSize: '13px' }}
                  />
                ) : (
                  <span style={{ color: '#3b82f6', fontWeight: '700', fontSize: '15px' }}>
                    {data.armor_class}
                  </span>
                )}
              </div>
            </div>

            {/* Initiative */}
            <div data-testid="initiative-display" style={{
              padding: '6px 12px',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Zap size={14} color="#eab308" />
              <div>
                <span style={{ color: '#94a3b8', fontSize: '8px', display: 'block', letterSpacing: '0.5px' }}>INIT</span>
                <DiceRollButton 
                  modifier={getModifier(data.dexterity)}
                  label="Initiative"
                  color="#eab308"
                  size="small"
                />
              </div>
            </div>

            {/* Speed */}
            <div data-testid="speed-display" style={{
              padding: '6px 12px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Activity size={14} color="#06B6D4" />
              <div>
                <span style={{ color: '#94a3b8', fontSize: '8px', display: 'block', letterSpacing: '0.5px' }}>SPEED</span>
                <span style={{ color: '#06B6D4', fontWeight: '700', fontSize: '15px' }}>
                  {data.speed}ft
                </span>
              </div>
            </div>

            {/* Proficiency */}
            <div data-testid="prof-display" style={{
              padding: '6px 12px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Award size={14} color="#8B5CF6" />
              <div>
                <span style={{ color: '#94a3b8', fontSize: '8px', display: 'block', letterSpacing: '0.5px' }}>PROF</span>
                <span style={{ color: '#8B5CF6', fontWeight: '700', fontSize: '15px' }}>
                  +{profBonus}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '36px', background: 'rgba(148, 163, 184, 0.2)', margin: '0 4px' }} />

            {/* Key Skills - Always Visible */}
            <span style={{ color: '#64748b', fontSize: '9px', marginRight: '2px' }}>KEY</span>
            {['Perception', 'Investigation', 'Insight', 'Stealth', 'Athletics', 'Acrobatics'].map(skillName => {
              const skill = SKILLS.find(s => s.name === skillName);
              if (!skill) return null;
              const abilityMod = calculateModifier(data[skill.ability]);
              const isProficient = data.skill_proficiencies?.includes(skillName.toLowerCase().replace(/ /g, '_'));
              const totalMod = abilityMod + (isProficient ? profBonus : 0);
              const Icon = skill.icon;
              
              return (
                <div
                  key={skillName}
                  data-testid={`quick-skill-${skillName.toLowerCase()}`}
                  style={{
                    padding: '4px 8px',
                    background: isProficient ? 'rgba(6, 182, 212, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                    border: isProficient ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Icon size={11} color={isProficient ? '#06B6D4' : '#64748b'} />
                  <span style={{ 
                    color: isProficient ? '#06B6D4' : '#94a3b8', 
                    fontSize: '10px',
                    fontWeight: isProficient ? '600' : '400',
                    textDecoration: isProficient ? 'underline' : 'none'
                  }}>
                    {skillName.slice(0, 4)}
                  </span>
                  <DiceRollButton 
                    modifier={totalMod}
                    label={skillName}
                    color={isProficient ? '#06B6D4' : '#94a3b8'}
                    size="small"
                    showDice={false}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT AREA with Left Sidebar */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* LEFT SIDEBAR - All Skills + Saving Throws */}
          <div style={{ 
            width: '180px', 
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Saving Throws Box */}
            <div style={{ ...glassPanel, padding: '10px' }}>
              <h4 style={{ color: '#f59e0b', fontSize: '10px', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>
                SAVING THROWS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {ABILITIES.map(ability => {
                  const mod = calculateModifier(data[ability.key]);
                  const isProficient = data.saving_throw_proficiencies?.includes(ability.key);
                  const saveMod = isProficient ? mod + profBonus : mod;
                  return (
                    <div
                      key={`save-${ability.key}`}
                      data-testid={`save-${ability.key}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        background: isProficient ? `${ability.color}15` : 'transparent',
                        borderRadius: '4px',
                        borderLeft: isProficient ? `2px solid ${ability.color}` : '2px solid transparent'
                      }}
                    >
                      <span style={{ 
                        color: isProficient ? ability.color : '#94a3b8', 
                        fontSize: '10px',
                        fontWeight: isProficient ? '600' : '400',
                        textDecoration: isProficient ? 'underline' : 'none'
                      }}>
                        {ability.fullName}
                      </span>
                      <DiceRollButton 
                        modifier={saveMod}
                        label={`${ability.fullName} Save`}
                        color={isProficient ? ability.color : '#64748b'}
                        size="small"
                        showDice={false}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All Skills Box */}
            <div style={{ ...glassPanel, padding: '10px', flex: 1 }}>
              <h4 style={{ color: '#67e8f9', fontSize: '10px', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>
                ALL SKILLS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {SKILLS.map(skill => {
                  const abilityMod = calculateModifier(data[skill.ability]);
                  const isProficient = (editMode ? editData : data).skill_proficiencies?.includes(skill.name.toLowerCase().replace(/ /g, '_'));
                  const totalMod = abilityMod + (isProficient ? profBonus : 0);
                  const ability = ABILITIES.find(a => a.key === skill.ability);
                  
                  return (
                    <div
                      key={skill.name}
                      data-testid={`skill-${skill.name.toLowerCase().replace(/ /g, '-')}`}
                      onClick={() => {
                        if (editMode) {
                          toggleSkillProficiency(skill.name);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 5px',
                        background: isProficient ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                        borderRadius: '3px',
                        cursor: editMode ? 'pointer' : 'default',
                        borderLeft: isProficient ? '2px solid #06B6D4' : '2px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                        <span style={{ 
                          color: isProficient ? '#06B6D4' : '#94a3b8', 
                          fontSize: '10px',
                          fontWeight: isProficient ? '600' : '400',
                          textDecoration: isProficient ? 'underline' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {skill.name}
                        </span>
                        <span style={{ color: '#4b5563', fontSize: '8px' }}>
                          ({ability?.label})
                        </span>
                      </div>
                      <DiceRollButton 
                        modifier={totalMod}
                        label={skill.name}
                        color={isProficient ? '#06B6D4' : '#64748b'}
                        size="small"
                        showDice={false}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT - Tabs and Tab Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '12px',
              overflowX: 'auto',
              paddingBottom: '4px'
            }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...glassPanel,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%)'
                    : 'rgba(30, 41, 59, 0.6)',
                  border: isActive 
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(148, 163, 184, 0.1)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} color={isActive ? '#60a5fa' : '#64748b'} />
                <span style={{ 
                  color: isActive ? '#fff' : '#94a3b8',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '400'
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: '350px' }}>
          {/* Combat Tab - Main Play Screen */}
          {activeTab === 'combat' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Left Column: Abilities + Combat Resources + Attacks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Compact Ability Scores */}
                <div style={{ ...glassPanel, padding: '12px' }}>
                  <h3 style={{ color: '#67e8f9', fontSize: '13px', fontWeight: '700', marginBottom: '10px', fontFamily: 'Montserrat' }}>
                    Ability Scores
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    {ABILITIES.map(ability => (
                      <AbilityScoreBlock
                        key={ability.key}
                        ability={ability}
                        score={data[ability.key]}
                        modifier={calculateModifier(data[ability.key])}
                        isProficientSave={data.saving_throw_proficiencies?.includes(ability.key)}
                        profBonus={profBonus}
                        isEditing={editMode}
                        onScoreChange={updateAbilityScore}
                      />
                    ))}
                  </div>
                </div>

                {/* Combat Resources Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {/* Hit Dice */}
                  <div style={{ ...glassPanel, padding: '10px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block', marginBottom: '4px' }}>HIT DICE</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {editMode ? (
                        <Input
                          type="number"
                          value={editData.hit_dice_remaining || data.level}
                          onChange={(e) => setEditData({ ...editData, hit_dice_remaining: parseInt(e.target.value) || 0 })}
                          style={{ width: '35px', padding: '2px', textAlign: 'center', fontSize: '13px' }}
                        />
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '15px' }}>
                          {data.hit_dice_remaining ?? data.level}
                        </span>
                      )}
                      <span style={{ color: '#64748b', fontSize: '11px' }}>/{data.level}d{data.hit_die || 8}</span>
                    </div>
                  </div>
                  {/* Temp HP */}
                  <div style={{ ...glassPanel, padding: '10px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block', marginBottom: '4px' }}>TEMP HP</span>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editData.temp_hp || 0}
                        onChange={(e) => setEditData({ ...editData, temp_hp: parseInt(e.target.value) || 0 })}
                        style={{ width: '45px', padding: '2px', textAlign: 'center', fontSize: '13px' }}
                      />
                    ) : (
                      <span style={{ color: '#22d3ee', fontWeight: '700', fontSize: '15px' }}>
                        {data.temp_hp || 0}
                      </span>
                    )}
                  </div>
                  {/* Death Saves */}
                  <div style={{ ...glassPanel, padding: '10px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block', marginBottom: '4px' }}>DEATH SAVES</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[0, 1, 2].map(i => (
                          <div
                            key={`success-${i}`}
                            onClick={() => {
                              if (editMode) {
                                const current = editData.death_save_success || 0;
                                setEditData({ ...editData, death_save_success: i < current ? i : i + 1 });
                              }
                            }}
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              border: '2px solid #22c55e',
                              background: i < (data.death_save_success || 0) ? '#22c55e' : 'transparent',
                              cursor: editMode ? 'pointer' : 'default'
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[0, 1, 2].map(i => (
                          <div
                            key={`fail-${i}`}
                            onClick={() => {
                              if (editMode) {
                                const current = editData.death_save_failure || 0;
                                setEditData({ ...editData, death_save_failure: i < current ? i : i + 1 });
                              }
                            }}
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              border: '2px solid #ef4444',
                              background: i < (data.death_save_failure || 0) ? '#ef4444' : 'transparent',
                              cursor: editMode ? 'pointer' : 'default'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attacks/Weapons */}
                <div style={{ ...glassPanel, padding: '12px' }}>
                  <h3 style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', marginBottom: '10px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Swords size={14} /> Attacks
                  </h3>
                  {(!data.attacks?.length && !data.equipment?.filter(e => e.equipped && e.type === 'weapon')?.length) ? (
                    <div style={{ color: '#64748b', fontSize: '12px', padding: '8px', textAlign: 'center', border: '1px dashed rgba(148, 163, 184, 0.2)', borderRadius: '6px' }}>
                      No attacks. Add weapons in Edit mode.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* Show custom attacks */}
                      {(data.attacks || []).map((attack, i) => {
                        const abilityMod = attack.ability ? calculateModifier(data[attack.ability]) : calculateModifier(data.strength);
                        const attackBonus = abilityMod + (attack.proficient !== false ? profBonus : 0) + (attack.bonus || 0);
                        return (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px'
                          }}>
                            <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '500' }}>{attack.name}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <DiceRollButton 
                                modifier={attackBonus}
                                label={`${attack.name} Attack`}
                                color="#ef4444"
                                size="small"
                              />
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                {attack.damage || `1d6+${abilityMod}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Show equipped weapons from equipment */}
                      {(data.equipment || []).filter(e => e.equipped && (e.type === 'weapon' || e.damage)).map((weapon, i) => {
                        const isFinesse = weapon.properties?.includes('finesse');
                        const abilityMod = isFinesse 
                          ? Math.max(calculateModifier(data.strength), calculateModifier(data.dexterity))
                          : calculateModifier(data.strength);
                        const attackBonus = abilityMod + profBonus;
                        return (
                          <div key={`eq-${i}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px'
                          }}>
                            <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '500' }}>{weapon.name}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <DiceRollButton 
                                modifier={attackBonus}
                                label={`${weapon.name} Attack`}
                                color="#ef4444"
                                size="small"
                              />
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                {weapon.damage || '1d6'}{abilityMod >= 0 ? '+' : ''}{abilityMod}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Spells + Conditions + All Skills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Quick Spell Slots (if caster) */}
                {data.spellcasting_ability && (
                  <div style={{ ...glassPanel, padding: '12px' }}>
                    <h3 style={{ color: '#a855f7', fontSize: '13px', fontWeight: '700', marginBottom: '10px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wand2 size={14} /> Spell Slots
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                        const slotKey = `spell_slots_${level}`;
                        const usedKey = `spell_slots_${level}_used`;
                        const maxSlots = data[slotKey] || 0;
                        const usedSlots = data[usedKey] || 0;
                        if (maxSlots === 0) return null;
                        return (
                          <div key={level} style={{ textAlign: 'center', padding: '4px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '4px' }}>
                            <div style={{ color: '#a855f7', fontSize: '10px', marginBottom: '2px' }}>Lvl {level}</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                              {Array.from({ length: maxSlots }).map((_, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (editMode) {
                                      const newUsed = idx < usedSlots ? idx : idx + 1;
                                      setEditData({ ...editData, [usedKey]: newUsed });
                                    }
                                  }}
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '2px',
                                    border: '1px solid #a855f7',
                                    background: idx < usedSlots ? 'transparent' : '#a855f7',
                                    cursor: editMode ? 'pointer' : 'default'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '4px', textAlign: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block' }}>SAVE DC</span>
                        <span style={{ color: '#a855f7', fontWeight: '700', fontSize: '14px' }}>
                          {8 + profBonus + calculateModifier(data[data.spellcasting_ability] || 10)}
                        </span>
                      </div>
                      <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '4px', textAlign: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '9px', display: 'block' }}>ATTACK</span>
                        <span style={{ color: '#a855f7', fontWeight: '700', fontSize: '14px' }}>
                          +{profBonus + calculateModifier(data[data.spellcasting_ability] || 10)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prepared Spells Quick List */}
                {data.spells_prepared?.length > 0 && (
                  <div style={{ ...glassPanel, padding: '12px' }}>
                    <h3 style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700', marginBottom: '10px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> Prepared Spells
                      </span>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '400' }}>{data.spells_prepared?.length || 0}</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                      {data.spells_prepared.slice(0, 10).map((spell, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          background: spell.level === 0 ? 'rgba(148, 163, 184, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          <span style={{ color: '#e2e8f0' }}>{spell.name}</span>
                          <span style={{ color: spell.level === 0 ? '#94a3b8' : '#3b82f6', fontSize: '10px' }}>
                            {spell.level === 0 ? 'C' : spell.level}
                          </span>
                        </div>
                      ))}
                      {data.spells_prepared.length > 10 && (
                        <button 
                          onClick={() => setActiveTab('spells')}
                          style={{ color: '#3b82f6', fontSize: '11px', textAlign: 'center', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          + {data.spells_prepared.length - 10} more...
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Active Conditions */}
                <div style={{ ...glassPanel, padding: '12px' }}>
                  <h3 style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '700', marginBottom: '10px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CircleDot size={14} /> Conditions
                  </h3>
                  {(!data.conditions?.length) ? (
                    <div style={{ color: '#22c55e', fontSize: '12px', padding: '8px', textAlign: 'center' }}>
                      No active conditions
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {data.conditions.map((condition, i) => (
                        <span key={i} style={{
                          padding: '4px 8px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '4px',
                          color: '#fbbf24',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {condition}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Currency Quick View */}
                <div style={{ ...glassPanel, padding: '12px' }}>
                  <h3 style={{ color: '#eab308', fontSize: '13px', fontWeight: '700', marginBottom: '10px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Coins size={14} /> Currency
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {['gp', 'sp', 'cp'].map(coin => {
                      const fullName = coin === 'gp' ? 'gold' : coin === 'sp' ? 'silver' : 'copper';
                      const color = coin === 'gp' ? '#eab308' : coin === 'sp' ? '#9ca3af' : '#b45309';
                      return (
                        <div key={coin} style={{ textAlign: 'center' }}>
                          <span style={{ color, fontSize: '10px', display: 'block' }}>{coin.toUpperCase()}</span>
                          <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{data.currency?.[fullName] || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Character Tab - Info, Features, Feats, Personality */}
          {activeTab === 'character' && (
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '12px' }}>
              {/* Left Column: Character Info + Personality */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Character Info */}
                <div style={{ ...glassPanel, padding: '14px' }}>
                  <h3 style={{ color: '#67e8f9', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
                    Character Info
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Race', value: data.race },
                      { label: 'Class', value: data.character_class },
                      { label: 'Subclass', value: data.subclass || 'None' },
                      { label: 'Background', value: data.background || 'None' },
                      { label: 'Alignment', value: data.alignment },
                      { label: 'Experience', value: `${data.experience_points || 0} XP` }
                    ].map(item => (
                      <div key={item.label} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'rgba(30, 41, 59, 0.4)',
                        borderRadius: '6px'
                      }}>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>{item.label}</span>
                        <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '500' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Personality */}
                <div style={{ ...glassPanel, padding: '14px' }}>
                  <h3 style={{ color: '#ec4899', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
                    Personality
                  </h3>
                  {['personality_traits', 'ideals', 'bonds', 'flaws'].map(field => (
                    <div key={field} style={{ marginBottom: '10px' }}>
                      <label style={{ color: '#94a3b8', fontSize: '10px', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                        {field.replace('_', ' ')}
                      </label>
                      {editMode ? (
                        <textarea
                          value={editData[field] || ''}
                          onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                          style={{
                            width: '100%',
                            minHeight: '40px',
                            padding: '8px',
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '6px',
                            color: '#e2e8f0',
                            fontSize: '12px',
                            resize: 'vertical'
                          }}
                        />
                      ) : (
                        <p style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.5' }}>
                          {data[field] || 'Not specified'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Features & Feats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignContent: 'start' }}>
                {/* Class Features */}
                <div style={{ ...glassPanel, padding: '14px' }}>
                  <h3 style={{ color: '#60a5fa', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
                    Class Features ({data.character_class})
                  </h3>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {classFeatures.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '12px' }}>No class features loaded.</p>
                    ) : (
                      classFeatures.map((feature, i) => (
                        <FeatureCard key={i} feature={feature} source="class" />
                      ))
                    )}
                  </div>
                </div>

                {/* Racial Traits */}
                <div style={{ ...glassPanel, padding: '14px' }}>
                  <h3 style={{ color: '#22d3ee', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
                    Racial Traits ({data.race})
                  </h3>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {!data.racial_traits?.length ? (
                      <p style={{ color: '#64748b', fontSize: '12px' }}>No racial traits recorded.</p>
                    ) : (
                      data.racial_traits.map((trait, i) => (
                        <FeatureCard key={i} feature={trait} source="race" />
                      ))
                    )}
                  </div>
                </div>

                {/* Feats */}
                <div style={{ ...glassPanel, padding: '14px' }}>
                  <h3 style={{ color: '#fb923c', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
                    Feats
                  </h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {!data.feats?.length ? (
                      <p style={{ color: '#64748b', fontSize: '12px' }}>No feats selected.</p>
                    ) : (
                      data.feats.map((feat, i) => (
                        <FeatureCard key={i} feature={feat} source="feat" />
                      ))
                    )}
                    
                    {/* Available Feats from SRD */}
                    {editMode && srdFeats.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>AVAILABLE FEATS</h4>
                        {srdFeats.filter(f => !data.feats?.some(df => df.name === f.name)).slice(0, 5).map((feat, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setEditData({
                                ...editData,
                                feats: [...(editData.feats || []), { name: feat.name, description: feat.description }]
                              });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              background: 'rgba(249, 115, 22, 0.1)',
                              border: '1px solid rgba(249, 115, 22, 0.3)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              width: '100%',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Plus size={12} color="#fb923c" />
                            <span style={{ color: '#fb923c', fontSize: '11px' }}>{feat.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Backstory & Notes */}
                <div style={{ ...glassPanel, padding: '14px' }}>
                  <h3 style={{ color: '#a855f7', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
                    Backstory & Notes
                  </h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '10px', display: 'block', marginBottom: '4px' }}>BACKSTORY</label>
                    {editMode ? (
                      <textarea
                        value={editData.backstory || ''}
                        onChange={(e) => setEditData({ ...editData, backstory: e.target.value })}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '8px',
                          background: 'rgba(30, 41, 59, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '12px',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <p style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto' }}>
                        {data.backstory || 'No backstory written yet.'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '10px', display: 'block', marginBottom: '4px' }}>NOTES</label>
                    {editMode ? (
                      <textarea
                        value={editData.notes || ''}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '8px',
                          background: 'rgba(30, 41, 59, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '12px',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <p style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto' }}>
                        {data.notes || 'No notes yet.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spells Tab */}
          {activeTab === 'spells' && (
            <div>
              {/* Spellcasting Stats & Spell Slots */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
                {/* Spellcasting Info */}
                <div style={{ ...glassPanel, padding: '16px' }}>
                  <h4 style={{ color: '#a855f7', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>SPELLCASTING</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>Ability</span>
                      <span style={{ color: '#8B5CF6', fontWeight: '700', fontSize: '14px', textTransform: 'capitalize' }}>
                        {data.spellcasting_ability || 'None'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>Save DC</span>
                      <span style={{ color: '#6366F1', fontWeight: '700', fontSize: '14px' }}>
                        {data.spellcasting_ability ? 8 + profBonus + calculateModifier(data[data.spellcasting_ability] || 10) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>Attack Bonus</span>
                      <span style={{ color: '#06B6D4', fontWeight: '700', fontSize: '14px' }}>
                        {data.spellcasting_ability ? `+${profBonus + calculateModifier(data[data.spellcasting_ability] || 10)}` : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>Prepared</span>
                      <span style={{ color: '#3B82F6', fontWeight: '700', fontSize: '14px' }}>
                        {data.spells_prepared?.length || 0} / {Math.max(1, calculateModifier(data[data.spellcasting_ability] || 10) + (data.level || 1))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spell Slots */}
                <div style={{ ...glassPanel, padding: '16px' }}>
                  <h4 style={{ color: '#3b82f6', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>SPELL SLOTS</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                      const slotKey = `spell_slots_${level}`;
                      const usedKey = `spell_slots_${level}_used`;
                      const maxSlots = data[slotKey] || 0;
                      const usedSlots = data[usedKey] || 0;
                      const availableSlots = Math.max(0, maxSlots - usedSlots);
                      
                      return (
                        <div key={level} style={{ textAlign: 'center' }}>
                          <div style={{ 
                            color: maxSlots > 0 ? '#3b82f6' : '#475569', 
                            fontSize: '10px', 
                            marginBottom: '4px',
                            fontWeight: '600'
                          }}>
                            {level}
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            {maxSlots > 0 ? (
                              Array.from({ length: maxSlots }).map((_, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (editMode) {
                                      const newUsed = idx < usedSlots ? idx : idx + 1;
                                      setEditData({ ...editData, [usedKey]: newUsed });
                                    }
                                  }}
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    border: '2px solid #3b82f6',
                                    background: idx < usedSlots ? 'transparent' : '#3b82f6',
                                    cursor: editMode ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease'
                                  }}
                                />
                              ))
                            ) : (
                              <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '3px',
                                background: '#1e293b',
                                border: '1px solid #334155'
                              }} />
                            )}
                          </div>
                          {maxSlots > 0 && (
                            <div style={{ color: '#64748b', fontSize: '9px', marginTop: '2px' }}>
                              {availableSlots}/{maxSlots}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Spell Filters */}
              <div style={{ marginBottom: '20px' }}>
                {/* Sub-tabs: Prepared vs Known */}
                <div style={{ display: 'flex', gap: '0', marginBottom: '16px' }}>
                  <button
                    onClick={() => setSpellViewMode('prepared')}
                    data-testid="spells-tab-prepared"
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: spellViewMode === 'prepared' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'rgba(30, 41, 59, 0.5)',
                      border: 'none',
                      color: spellViewMode === 'prepared' ? '#fff' : '#94a3b8',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    PREPARED SPELLS ({data.spells_prepared?.length || 0})
                  </button>
                  <button
                    onClick={() => setSpellViewMode('known')}
                    data-testid="spells-tab-known"
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: spellViewMode === 'known' ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' : 'rgba(30, 41, 59, 0.5)',
                      border: 'none',
                      color: spellViewMode === 'known' ? '#fff' : '#94a3b8',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ALL KNOWN SPELLS ({data.spells_known?.length || 0})
                  </button>
                </div>

                {/* Search and Filter */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <Input
                      data-testid="spell-search"
                      placeholder="Search spells..."
                      value={spellSearch}
                      onChange={(e) => setSpellSearch(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                  <select
                    data-testid="spell-level-filter"
                    value={spellLevelFilter}
                    onChange={(e) => setSpellLevelFilter(e.target.value)}
                    style={{
                      ...glassPanel,
                      padding: '10px 16px',
                      color: '#e2e8f0',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Levels</option>
                    {Object.entries(SPELL_LEVELS).map(([level, label]) => (
                      <option key={level} value={level}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prepared Spells View */}
              {spellViewMode === 'prepared' && (
                <div>
                  {(!data.spells_prepared || data.spells_prepared.length === 0) ? (
                    <div style={{ 
                      ...glassPanel, 
                      padding: '40px', 
                      textAlign: 'center',
                      borderStyle: 'dashed'
                    }}>
                      <Wand2 size={48} color="#3b82f6" style={{ marginBottom: '16px', opacity: 0.5 }} />
                      <h4 style={{ color: '#e2e8f0', marginBottom: '8px' }}>No Spells Prepared</h4>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>
                        Go to "All Known Spells" to prepare spells for your adventure.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '8px' }}>
                      {data.spells_prepared
                        .filter(spell => {
                          const matchesSearch = spell.name.toLowerCase().includes(spellSearch.toLowerCase());
                          const matchesLevel = spellLevelFilter === 'all' || spell.level === parseInt(spellLevelFilter);
                          return matchesSearch && matchesLevel;
                        })
                        .map(spell => (
                          <SpellCard
                            key={spell.name}
                            spell={spell}
                            isPrepared={true}
                            onTogglePrepare={(s) => {
                              // Unprepare the spell
                              const newPrepared = (data.spells_prepared || []).filter(sp => sp.name !== s.name);
                              const newData = { ...editData, spells_prepared: newPrepared };
                              setEditData(newData);
                              if (!editMode) {
                                // Auto-save when not in edit mode
                                axios.put(`${API}/characters/${characterId}`, newData)
                                  .then(() => {
                                    setCharacter(newData);
                                    toast.success(`${s.name} unprepared`);
                                  })
                                  .catch(() => toast.error('Failed to update spells'));
                              }
                            }}
                            canPrepare={true}
                          />
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Known Spells View */}
              {spellViewMode === 'known' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '8px' }}>
                  {loadingSrd ? (
                    <p style={{ color: '#64748b' }}>Loading spells...</p>
                  ) : filteredSpells.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No spells available for your class.</p>
                  ) : (
                    filteredSpells.map(spell => {
                      const isKnown = data.spells_known?.some(s => s.name === spell.name);
                      const isPrepared = data.spells_prepared?.some(s => s.name === spell.name);
                      return (
                        <SpellCard
                          key={spell.name}
                          spell={spell}
                          isPrepared={isPrepared}
                          onTogglePrepare={(s) => {
                            if (isPrepared) {
                              // Unprepare
                              const newPrepared = (data.spells_prepared || []).filter(sp => sp.name !== s.name);
                              const newData = { ...editData, spells_prepared: newPrepared };
                              setEditData(newData);
                              if (!editMode) {
                                axios.put(`${API}/characters/${characterId}`, newData)
                                  .then(() => {
                                    setCharacter(newData);
                                    toast.success(`${s.name} unprepared`);
                                  })
                                  .catch(() => toast.error('Failed to update spells'));
                              }
                            } else {
                              // Prepare
                              const newPrepared = [...(data.spells_prepared || []), s];
                              const newKnown = data.spells_known?.some(sp => sp.name === s.name) 
                                ? data.spells_known 
                                : [...(data.spells_known || []), s];
                              const newData = { ...editData, spells_prepared: newPrepared, spells_known: newKnown };
                              setEditData(newData);
                              if (!editMode) {
                                axios.put(`${API}/characters/${characterId}`, newData)
                                  .then(() => {
                                    setCharacter(newData);
                                    toast.success(`${s.name} prepared!`);
                                  })
                                  .catch(() => toast.error('Failed to update spells'));
                              }
                            }
                          }}
                          canPrepare={true}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab - Equipment, Items, Currency */}
          {activeTab === 'inventory' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {/* Currency - Full */}
              <div style={{ ...glassPanel, padding: '14px' }}>
                <h3 style={{ color: '#eab308', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={14} color="#eab308" />
                  Currency
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {['copper', 'silver', 'electrum', 'gold', 'platinum'].map(coin => (
                    <div key={coin} style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px' }}>
                      <span style={{ 
                        color: coin === 'gold' ? '#eab308' : coin === 'platinum' ? '#94a3b8' : coin === 'copper' ? '#b45309' : coin === 'silver' ? '#9ca3af' : '#a855f7',
                        fontSize: '10px',
                        display: 'block',
                        marginBottom: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {coin.slice(0, 2)}
                      </span>
                      {editMode ? (
                        <Input
                          type="number"
                          value={editData.currency?.[coin] || 0}
                          onChange={(e) => setEditData({
                            ...editData,
                            currency: { ...editData.currency, [coin]: parseInt(e.target.value) || 0 }
                          })}
                          style={{ width: '100%', textAlign: 'center', padding: '4px', fontSize: '14px' }}
                        />
                      ) : (
                        <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                          {data.currency?.[coin] || 0}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Total in GP */}
                <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>TOTAL (in GP): </span>
                  <span style={{ color: '#eab308', fontWeight: '700', fontSize: '14px' }}>
                    {(
                      (data.currency?.platinum || 0) * 10 +
                      (data.currency?.gold || 0) +
                      (data.currency?.electrum || 0) * 0.5 +
                      (data.currency?.silver || 0) * 0.1 +
                      (data.currency?.copper || 0) * 0.01
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Equipment */}
              <div style={{ ...glassPanel, padding: '14px' }}>
                <h3 style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Swords size={14} color="#ef4444" />
                  Equipment
                </h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {!data.equipment?.length ? (
                    <div style={{ color: '#64748b', fontSize: '12px', padding: '20px', textAlign: 'center', border: '1px dashed rgba(148, 163, 184, 0.2)', borderRadius: '6px' }}>
                      No equipment recorded.
                    </div>
                  ) : (
                    data.equipment.map((item, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: item.equipped ? 'rgba(34, 197, 94, 0.1)' : 'rgba(30, 41, 59, 0.3)',
                        borderRadius: '6px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ color: item.equipped ? '#22c55e' : '#e2e8f0', fontSize: '12px' }}>
                          {item.name}
                        </span>
                        {item.equipped && (
                          <span style={{ color: '#22c55e', fontSize: '9px', fontWeight: '600', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '4px' }}>EQUIPPED</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inventory */}
              <div style={{ ...glassPanel, padding: '14px' }}>
                <h3 style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={14} color="#3b82f6" />
                  Inventory
                </h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {!data.inventory?.length ? (
                    <div style={{ color: '#64748b', fontSize: '12px', padding: '20px', textAlign: 'center', border: '1px dashed rgba(148, 163, 184, 0.2)', borderRadius: '6px' }}>
                      No items in inventory.
                    </div>
                  ) : (
                    data.inventory.map((item, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'rgba(59, 130, 246, 0.05)',
                        borderRadius: '6px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>{item.name}</span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>x{item.quantity || 1}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
            </div>  {/* End of Tab Content */}
          </div>  {/* End of RIGHT CONTENT */}
        </div>  {/* End of MAIN CONTENT AREA */}
      </div>

      {/* Join Campaign Modal */}
      <JoinCampaignModal
        characterId={characterId}
        characterName={character.name}
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={() => fetchCharacter()}
      />

      {/* Level Up Modal */}
      <LevelUpModal
        character={character}
        open={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        onLevelUp={(updatedCharacter) => {
          setCharacter(updatedCharacter);
          setEditData(updatedCharacter);
        }}
      />

      {/* ROOK Suggestions */}
      <RookSuggestionPopup
        suggestion={currentSuggestion}
        onDismiss={dismissSuggestion}
        position="bottom-right"
      />

      {/* First-time dice roll tooltip */}
      <DiceRollTooltip />
    </div>
  );
}

export default CharacterSheetFull;
