import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Dices, Sparkles, Shield, Swords, Plus, Check, Star, Zap, Users } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { MULTICLASS_REQUIREMENTS, MULTICLASS_PROFICIENCIES, canMulticlassInto, canMulticlassFrom, CLASSES } from '../data/characterRules5e';
import { CLASS_FEATURES } from '../data/classFeatures';
import { FEATURE_TYPE_CONFIG } from '../data/classResources';
import { SPELLCASTING_CLASSES, SPELL_SLOTS, PACT_MAGIC_SLOTS, CANTRIPS_KNOWN, SPELLS_KNOWN, getSpellsForClass, getMaxSpellLevel } from '../data/spellDatabase';
import { HIT_DICE, ASI_LEVELS, FEATS, ABILITIES, ABILITY_SHORT } from '../data/levelUpData';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme colors matching Fantasy Sunset
const theme = {
  bg: { primary: '#0F0A1E', surface: '#1A112E', panel: 'rgba(26, 17, 46, 0.95)' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(138, 43, 226, 0.3)',
  sunset: { purple: '#8A2BE2', pink: '#4DD0E1', gold: '#F59E0B' },
  gradient: 'linear-gradient(135deg, #8A2BE2 0%, #4DD0E1 50%, #F59E0B 100%)'
};

export default function LevelUpWizard({ character, isOpen, onClose, onLevelUp }) {
  const [step, setStep] = useState(0); // Start at 0 for multiclass choice
  const [hpMethod, setHpMethod] = useState('average'); // 'average' or 'roll'
  const [hpRoll, setHpRoll] = useState(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [choiceType, setChoiceType] = useState(null); // 'asi' or 'feat'
  const [asiChoices, setAsiChoices] = useState({ ability1: '', ability2: '' });
  const [selectedFeat, setSelectedFeat] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Multiclass state
  const [isMulticlassing, setIsMulticlassing] = useState(false);
  const [multiclassClass, setMulticlassClass] = useState(null);
  
  // Spell selection state
  const [selectedNewSpells, setSelectedNewSpells] = useState([]);
  const [selectedNewCantrips, setSelectedNewCantrips] = useState([]);
  
  // Fighter-specific state
  const [selectedFightingStyle, setSelectedFightingStyle] = useState(null);
  const [selectedSubclass, setSelectedSubclass] = useState(null);
  const [selectedManeuvers, setSelectedManeuvers] = useState([]);
  const [preflight, setPreflight] = useState(null);

  const currentLevel = character?.level || 1;
  const newLevel = currentLevel + 1;
  const characterClass = isMulticlassing && multiclassClass ? multiclassClass : (character?.character_class || 'Fighter');
  const hitDie = HIT_DICE[characterClass] || 8;
  const conMod = Math.floor(((character?.constitution || 10) - 10) / 2);
  
  // Get character stats for multiclass requirements
  const characterStats = {
    strength: character?.strength || 10,
    dexterity: character?.dexterity || 10,
    constitution: character?.constitution || 10,
    intelligence: character?.intelligence || 10,
    wisdom: character?.wisdom || 10,
    charisma: character?.charisma || 10
  };
  
  // Check multiclass eligibility
  const canMulticlass = canMulticlassFrom(characterStats, character?.character_class || 'Fighter');
  const availableMulticlasses = canMulticlass ? 
    Object.keys(CLASSES || {}).filter(cls => 
      cls !== character?.character_class && canMulticlassInto(characterStats, cls)
    ) : [];
  
  // Check if this level grants ASI/Feat (based on class being leveled)
  const classAsiLevels = ASI_LEVELS[characterClass] || ASI_LEVELS.default;
  // For multiclassing, ASI is based on class level, not total level
  const classLevel = isMulticlassing ? 1 : (character?.class_levels?.[characterClass] || currentLevel);
  const newClassLevel = classLevel + (isMulticlassing ? 0 : 1);
  const isAsiLevel = !isMulticlassing && classAsiLevels.includes(newClassLevel);
  
  // ─── Spellcasting progression ──────────────────────────────────
  const classInfo = SPELLCASTING_CLASSES[characterClass];
  const isSpellcaster = !!classInfo && !classInfo.subclassOnly;
  
  // Spell slots: old vs new
  const getSlots = (lvl) => {
    if (!classInfo) return {};
    if (classInfo.pactMagic) return PACT_MAGIC_SLOTS[lvl] || {};
    if (classInfo.halfCaster) {
      const startLvl = classInfo.halfCaster ? 2 : 1;
      if (lvl < startLvl) return {};
      return SPELL_SLOTS[Math.floor(lvl / 2)] || {};
    }
    return SPELL_SLOTS[lvl] || {};
  };
  const oldSlots = getSlots(currentLevel);
  const newSlots = getSlots(newLevel);
  
  // New cantrips to learn
  const cantripsTable = CANTRIPS_KNOWN[characterClass] || {};
  const getCantripCount = (lvl) => {
    let count = 0;
    for (const [l, c] of Object.entries(cantripsTable)) {
      if (Number(l) <= lvl) count = c;
    }
    return count;
  };
  const oldCantripCount = getCantripCount(currentLevel);
  const newCantripCount = getCantripCount(newLevel);
  const cantripGain = newCantripCount - oldCantripCount;
  
  // New spells to learn (for "known" casters)
  const spellsKnownTable = SPELLS_KNOWN[characterClass] || {};
  const getSpellsKnownCount = (lvl) => {
    let count = 0;
    for (const [l, c] of Object.entries(spellsKnownTable)) {
      if (Number(l) <= lvl) count = c;
    }
    return count;
  };
  const oldSpellsKnown = getSpellsKnownCount(currentLevel);
  const newSpellsKnown = getSpellsKnownCount(newLevel);
  const spellGain = newSpellsKnown - oldSpellsKnown;
  
  // Wizard special: gains 2 spells to spellbook each level
  const isWizard = characterClass === 'Wizard';
  const wizardSpellbookGain = isWizard ? 2 : 0;
  
  // Max spell level accessible at new level
  const maxSpellLevelOld = getMaxSpellLevel(characterClass, currentLevel);
  const maxSpellLevelNew = getMaxSpellLevel(characterClass, newLevel);
  const unlockedNewSpellLevel = maxSpellLevelNew > maxSpellLevelOld;
  
  // Available spells for selection
  const availableSpells = isSpellcaster ? getSpellsForClass(characterClass) : {};
  const existingSpellNames = (character?.spells_known || []).map(s => (s.name || s));
  const existingCantripNames = (character?.cantrips_known || []).map(s => (s.name || s));
  
  // ─── Class-specific detection ───────────────────────────────
  const classKey = characterClass?.toLowerCase();
  const classData = CLASS_FEATURES[classKey];
  const hasFightingStyleChoice = classData?.fighting_style_level === newClassLevel && classData?.fighting_styles;
  const hasSubclassChoice = classData?.subclass_level === newClassLevel && classData?.subclasses;
  const hasSubclassFeature = selectedSubclass && classData?.subclasses?.[selectedSubclass]?.features?.some(f => f.level === newClassLevel);
  const isBattleMaster = selectedSubclass === 'battle_master' || character?.subclass === 'battle_master';
  const bmNeedsManeuvers = isBattleMaster && classData?.subclasses?.battle_master?.features?.some(
    f => f.level === newClassLevel && f.name.includes('Combat Superiority')
  );
  const hasClassChoiceStep = hasFightingStyleChoice || hasSubclassChoice || bmNeedsManeuvers;
  
  // Load existing subclass from character data
  const effectiveSubclass = selectedSubclass || character?.subclass;

  // Determine step positions dynamically
  const classChoiceStep = hasClassChoiceStep ? 3 : -1;
  const spellcastingStep = isSpellcaster ? (hasClassChoiceStep ? 4 : 3) : -1;
  const asiStepPos = isAsiLevel ? (3 + (hasClassChoiceStep ? 1 : 0) + (isSpellcaster ? 1 : 0)) : -1;
  const confirmStepPos = 3 + (hasClassChoiceStep ? 1 : 0) + (isSpellcaster ? 1 : 0) + (isAsiLevel ? 1 : 0);
  
  // Calculate HP values
  const averageHp = Math.floor(hitDie / 2) + 1 + conMod;
  const rolledHp = hpRoll ? Math.max(1, hpRoll + conMod) : null;

  // Calculate new proficiency bonus
  const newProfBonus = 2 + Math.floor((newLevel - 1) / 4);
  const oldProfBonus = 2 + Math.floor((currentLevel - 1) / 4);
  const profBonusIncreased = newProfBonus > oldProfBonus;

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setStep(0); // Start at multiclass choice step
      setHpMethod('average');
      setHpRoll(null);
      setHasRolled(false);
      setChoiceType(null);
      setAsiChoices({ ability1: '', ability2: '' });
      setSelectedFeat(null);
      setIsMulticlassing(false);
      setMulticlassClass(null);
      setSelectedNewSpells([]);
      setSelectedNewCantrips([]);
      setSelectedFightingStyle(null);
      setSelectedSubclass(character?.subclass || null);
      setSelectedManeuvers(character?.maneuvers || []);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !character?.id) return;
    axios.get(`${API}/characters/${character.id}/level-up-options`, { params: { target_level: newLevel } })
      .then(res => setPreflight(res.data))
      .catch(() => setPreflight(null));
  }, [isOpen, character?.id, newLevel]);

  const rollHitDie = () => {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    setHpRoll(roll);
    setHasRolled(true);
    toast.success(`Rolled ${roll} on d${hitDie}!`);
  };

  const handleAsiSelect = (slot, ability) => {
    if (slot === 1) {
      setAsiChoices(prev => ({ ...prev, ability1: ability }));
    } else {
      setAsiChoices(prev => ({ ...prev, ability2: ability }));
    }
  };

  const canProceed = () => {
    if (step === 0) return !isMulticlassing || multiclassClass;
    if (step === 1) return true;
    if (step === 2 && hpMethod === 'roll') return hasRolled;
    if (step === 2 && hpMethod === 'average') return true;
    if (step === classChoiceStep) {
      if (hasFightingStyleChoice && !selectedFightingStyle) return false;
      if (hasSubclassChoice && !selectedSubclass) return false;
      if (bmNeedsManeuvers && selectedManeuvers.length < 3) return false;
      return true;
    }
    if (step === spellcastingStep) {
      // Known casters must select enough spells
      const neededSpells = classInfo?.type === 'known' ? spellGain : (isWizard ? wizardSpellbookGain : 0);
      const neededCantrips = cantripGain;
      if (neededSpells > 0 && selectedNewSpells.length < neededSpells) return false;
      if (neededCantrips > 0 && selectedNewCantrips.length < neededCantrips) return false;
      return true;
    }
    if (step === asiStepPos) {
      if (choiceType === 'asi') return asiChoices.ability1 && asiChoices.ability2;
      if (choiceType === 'feat') return selectedFeat !== null;
      return false;
    }
    return true;
  };

  const getTotalSteps = () => confirmStepPos + 1;

  const handleLevelUp = async () => {
    setLoading(true);
    try {
      const requestData = {
        new_level: newLevel,
        hp_method: hpMethod,
        hp_roll: hpMethod === 'roll' ? hpRoll : null
      };

      // Add multiclass info if multiclassing
      if (isMulticlassing && multiclassClass) {
        requestData.multiclass = true;
        requestData.new_class = multiclassClass;
      }

      if (isAsiLevel) {
        if (choiceType === 'asi') {
          requestData.choice_type = 'asi';
          requestData.asi_choices = asiChoices;
        } else if (choiceType === 'feat') {
          requestData.choice_type = 'feat';
          requestData.feat_choice = {
            name: selectedFeat?.name || 'Feat',
            description: selectedFeat?.description || ''
          };
        }
      }

      // Add spell selections
      if (selectedNewSpells.length > 0) {
        requestData.new_spells = selectedNewSpells.map(s => ({
          name: s.name, level: s.level || 1, school: s.school || ''
        }));
      }
      if (selectedNewCantrips.length > 0) {
        requestData.new_cantrips = selectedNewCantrips.map(s => ({
          name: s.name, level: 0, school: s.school || ''
        }));
      }
      
      // Add fighter-specific selections
      if (selectedFightingStyle) {
        requestData.fighting_style = selectedFightingStyle;
      }
      if (selectedSubclass && hasSubclassChoice) {
        requestData.subclass = selectedSubclass;
      }
      if (selectedManeuvers.length > 0) {
        requestData.maneuvers = selectedManeuvers;
      }

      // Use different endpoint for multiclassing
      if (preflight?.target_level && preflight.target_level !== newLevel) {
        toast.error('Level-up preflight mismatch. Please reopen level up.');
        setLoading(false);
        return;
      }
      const endpoint = isMulticlassing && multiclassClass 
        ? `${API}/characters/${character.id}/multiclass`
        : `${API}/characters/${character.id}/level-up`;
        
      await axios.post(endpoint, requestData);
      
      const levelUpMessage = isMulticlassing 
        ? `${character.name} multiclassed into ${multiclassClass}!`
        : `${character.name} is now Level ${newLevel}!`;
      
      toast.success(levelUpMessage, {
        description: `HP increased by ${hpMethod === 'roll' ? rolledHp : averageHp}`
      });
      
      if (onLevelUp) {
        onLevelUp(newLevel);
      }
      onClose();
    } catch (error) {
      console.error('Level up failed:', error);
      toast.error(error?.response?.data?.detail || 'Failed to level up character');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !character) return null;

  const totalSteps = getTotalSteps();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.bg.panel,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.border}`,
          borderRadius: '20px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(138, 43, 226, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: theme.gradient,
          padding: '24px',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: '50%',
              padding: '8px',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            <X size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={32} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#fff', margin: 0, fontWeight: '600' }}>
                Level Up!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: '15px' }}>
                {character.name} • {characterClass} {currentLevel} → {newLevel}
              </p>
            </div>
          </div>
          
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: i < step ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
          {/* Step 0: Class Choice (Continue or Multiclass) */}
          {step === 0 && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, fontSize: '18px', marginBottom: '8px' }}>
                Level Up: Choose Your Path
              </h3>
              <p style={{ color: theme.text.secondary, marginBottom: '24px', fontSize: '14px' }}>
                Continue as a {character?.character_class} or take a level in a new class.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Continue current class */}
                <button
                  onClick={() => { setIsMulticlassing(false); setMulticlassClass(null); }}
                  style={{
                    padding: '20px',
                    background: !isMulticlassing ? 'rgba(138, 43, 226, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                    border: `2px solid ${!isMulticlassing ? theme.sunset.purple : theme.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Swords size={24} style={{ color: theme.sunset.purple }} />
                    <div>
                      <div style={{ color: theme.text.primary, fontSize: '16px', fontWeight: '600' }}>
                        Continue as {character?.character_class} (Level {(character?.class_levels?.[character?.character_class] || currentLevel) + 1})
                      </div>
                      <div style={{ color: theme.text.muted, fontSize: '13px', marginTop: '2px' }}>
                        Gain {character?.character_class} features and d{HIT_DICE[character?.character_class] || 8} Hit Die
                      </div>
                      {/* Preview features for next level */}
                      {(() => {
                        const classKey = character?.character_class?.toLowerCase();
                        const classData = CLASS_FEATURES[classKey];
                        const nextFeatures = (classData?.features || []).filter(f => f.level === newLevel && !f.isChoice);
                        // Also include subclass features if character has a subclass
                        const subclassKey = character?.subclass;
                        const subFeatures = subclassKey && classData?.subclasses?.[subclassKey]
                          ? classData.subclasses[subclassKey].features.filter(f => f.level === newLevel)
                          : [];
                        const allFeatures = [...nextFeatures, ...subFeatures];
                        if (allFeatures.length === 0) return null;
                        return (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {allFeatures.map((feat, i) => {
                              const typeConfig = FEATURE_TYPE_CONFIG[feat.type] || FEATURE_TYPE_CONFIG.passive;
                              return (
                                <span key={i} style={{
                                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                  background: typeConfig.bg, color: typeConfig.color,
                                  fontWeight: 500,
                                }}>
                                  {feat.name}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    {!isMulticlassing && <Check size={20} style={{ color: theme.sunset.purple, marginLeft: 'auto' }} />}
                  </div>
                </button>
                
                {/* Multiclass option */}
                {canMulticlass && availableMulticlasses.length > 0 ? (
                  <div>
                    <button
                      onClick={() => setIsMulticlassing(true)}
                      style={{
                        width: '100%',
                        padding: '20px',
                        background: isMulticlassing ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                        border: `2px solid ${isMulticlassing ? theme.sunset.pink : theme.border}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={24} style={{ color: theme.sunset.pink }} />
                        <div>
                          <div style={{ color: theme.text.primary, fontSize: '16px', fontWeight: '600' }}>
                            Multiclass into a New Class
                          </div>
                          <div style={{ color: theme.text.muted, fontSize: '13px', marginTop: '2px' }}>
                            {availableMulticlasses.length} classes available based on your stats
                          </div>
                        </div>
                        {isMulticlassing && <Check size={20} style={{ color: theme.sunset.pink, marginLeft: 'auto' }} />}
                      </div>
                    </button>
                    
                    {/* Class selection grid */}
                    {isMulticlassing && (
                      <div style={{ 
                        marginTop: '16px', 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '10px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '4px'
                      }}>
                        {availableMulticlasses.map(cls => {
                          const reqs = MULTICLASS_REQUIREMENTS[cls];
                          const reqText = Object.entries(reqs || {})
                            .filter(([k]) => k !== 'or')
                            .map(([k, v]) => `${k.substring(0, 3).toUpperCase()} ${v}+`)
                            .join(reqs?.or ? ' or ' : ', ');
                          
                          return (
                            <button
                              key={cls}
                              onClick={() => setMulticlassClass(cls)}
                              style={{
                                padding: '14px',
                                background: multiclassClass === cls ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 10, 30, 0.6)',
                                border: `1px solid ${multiclassClass === cls ? theme.sunset.gold : theme.border}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ color: theme.text.primary, fontWeight: '600', fontSize: '14px' }}>{cls}</div>
                              <div style={{ color: theme.text.muted, fontSize: '11px', marginTop: '4px' }}>
                                d{HIT_DICE[cls]} HD • {reqText}
                              </div>
                              {multiclassClass === cls && (
                                <div style={{ color: theme.sunset.gold, fontSize: '11px', marginTop: '6px' }}>
                                  Gains: {MULTICLASS_PROFICIENCIES[cls]?.armor?.join(', ') || 'No armor'} armor
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    padding: '16px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: theme.text.muted,
                    fontSize: '13px'
                  }}>
                    <strong style={{ color: '#EF4444' }}>Multiclassing Unavailable:</strong>
                    <br />
                    You don't meet the stat requirements to multiclass. Most classes require 13+ in specific abilities.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: HP Method Selection */}
          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, fontSize: '18px', marginBottom: '8px' }}>
                Choose Hit Point Method
              </h3>
              <p style={{ color: theme.text.secondary, marginBottom: '24px', fontSize: '14px' }}>
                How would you like to determine your HP increase?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => setHpMethod('average')}
                  style={{
                    padding: '20px',
                    background: hpMethod === 'average' ? 'rgba(138, 43, 226, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                    border: `2px solid ${hpMethod === 'average' ? theme.sunset.purple : theme.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Shield size={24} style={{ color: theme.sunset.purple }} />
                    <div>
                      <div style={{ color: theme.text.primary, fontSize: '16px', fontWeight: '600' }}>
                        Take Average ({averageHp} HP)
                      </div>
                      <div style={{ color: theme.text.muted, fontSize: '13px', marginTop: '2px' }}>
                        Safe choice: {Math.floor(hitDie / 2) + 1} (avg d{hitDie}) + {conMod} (CON)
                      </div>
                    </div>
                    {hpMethod === 'average' && <Check size={20} style={{ color: theme.sunset.purple, marginLeft: 'auto' }} />}
                  </div>
                </button>
                
                <button
                  onClick={() => setHpMethod('roll')}
                  style={{
                    padding: '20px',
                    background: hpMethod === 'roll' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                    border: `2px solid ${hpMethod === 'roll' ? theme.sunset.pink : theme.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Dices size={24} style={{ color: theme.sunset.pink }} />
                    <div>
                      <div style={{ color: theme.text.primary, fontSize: '16px', fontWeight: '600' }}>
                        Roll Hit Dice (d{hitDie})
                      </div>
                      <div style={{ color: theme.text.muted, fontSize: '13px', marginTop: '2px' }}>
                        Risk it: Roll 1d{hitDie} + {conMod} (CON mod)
                      </div>
                    </div>
                    {hpMethod === 'roll' && <Check size={20} style={{ color: theme.sunset.pink, marginLeft: 'auto' }} />}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: HP Result */}
          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, fontSize: '18px', marginBottom: '8px' }}>
                {hpMethod === 'roll' ? 'Roll Your Hit Dice' : 'HP Increase Confirmed'}
              </h3>
              
              {hpMethod === 'roll' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  {!hasRolled ? (
                    <>
                      <p style={{ color: theme.text.secondary, marginBottom: '24px', fontSize: '15px' }}>
                        Click the die to roll your d{hitDie} for HP!
                      </p>
                      <button
                        onClick={rollHitDie}
                        style={{
                          width: '120px',
                          height: '120px',
                          borderRadius: '16px',
                          background: theme.gradient,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          boxShadow: '0 10px 40px rgba(138, 43, 226, 0.4)',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      >
                        <Dices size={48} color="#fff" />
                      </button>
                      <p style={{ color: theme.text.muted, marginTop: '16px', fontSize: '13px' }}>
                        Click to roll!
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '16px',
                        background: 'rgba(138, 43, 226, 0.2)',
                        border: `3px solid ${theme.sunset.purple}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        flexDirection: 'column'
                      }}>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: theme.text.primary }}>{hpRoll}</div>
                        <div style={{ fontSize: '14px', color: theme.text.muted }}>on d{hitDie}</div>
                      </div>
                      
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10B981',
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
                          <span style={{ color: theme.text.secondary }}>{hpRoll}</span>
                          <span style={{ color: theme.text.muted }}>+</span>
                          <span style={{ color: theme.text.secondary }}>{conMod}</span>
                          <span style={{ color: theme.text.muted }}>=</span>
                          <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '28px' }}>+{rolledHp} HP</span>
                        </div>
                        <div style={{ color: theme.text.muted, fontSize: '13px', marginTop: '4px' }}>
                          Roll + Constitution modifier
                        </div>
                      </div>
                      
                      <button
                        onClick={rollHitDie}
                        style={{
                          marginTop: '16px',
                          padding: '10px 20px',
                          background: 'transparent',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          color: theme.text.secondary,
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        <Dices size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Reroll (if GM allows)
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '3px solid #10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10B981' }}>+{averageHp}</div>
                    <div style={{ fontSize: '14px', color: theme.text.muted }}>HP</div>
                  </div>
                  
                  <div style={{ color: theme.text.secondary, fontSize: '15px' }}>
                    {Math.floor(hitDie / 2) + 1} (avg d{hitDie}) + {conMod} (CON) = <strong>+{averageHp} HP</strong>
                  </div>
                </div>
              )}
              
              {/* Proficiency bonus change */}
              {profBonusIncreased && (
                <div style={{
                  marginTop: '24px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${theme.sunset.gold}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Star size={24} style={{ color: theme.sunset.gold }} />
                  <div>
                    <div style={{ color: theme.sunset.gold, fontWeight: '600', fontSize: '15px' }}>
                      Proficiency Bonus Increased!
                    </div>
                    <div style={{ color: theme.text.secondary, fontSize: '13px' }}>
                      +{oldProfBonus} → +{newProfBonus}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Class-Specific Choices (Fighting Style, Subclass, Maneuvers) */}
          {step === classChoiceStep && hasClassChoiceStep && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, fontSize: '18px', marginBottom: '16px' }}>
                {hasSubclassChoice ? `Choose Your ${classData?.subclass_label || 'Subclass'}` : hasFightingStyleChoice ? 'Choose Fighting Style' : 'Martial Choices'}
              </h3>

              {/* Fighting Style Selection */}
              {hasFightingStyleChoice && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '12px' }}>
                    Choose a fighting style that defines your combat approach. This is a permanent specialization.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(classData?.fighting_styles || []).map(fs => (
                      <button
                        key={fs.name}
                        data-testid={`fighting-style-${fs.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setSelectedFightingStyle(fs.name)}
                        style={{
                          padding: '14px 16px', textAlign: 'left', borderRadius: '10px', cursor: 'pointer',
                          background: selectedFightingStyle === fs.name ? 'rgba(138, 43, 226, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                          border: `2px solid ${selectedFightingStyle === fs.name ? theme.sunset.purple : theme.border}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: theme.text.primary, fontWeight: 600, fontSize: '14px' }}>{fs.name}</div>
                            <div style={{ color: theme.text.muted, fontSize: '12px', marginTop: '2px' }}>{fs.description}</div>
                          </div>
                          {selectedFightingStyle === fs.name && <Check size={18} style={{ color: theme.sunset.purple, flexShrink: 0 }} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subclass Selection */}
              {hasSubclassChoice && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '12px' }}>
                    Choose your {classData?.subclass_label || 'subclass'}. This defines your specialization path and grants unique features as you level up.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(classData?.subclasses || {}).map(([key, sc]) => (
                      <button
                        key={key}
                        data-testid={`subclass-${key}`}
                        onClick={() => setSelectedSubclass(key)}
                        style={{
                          padding: '16px', textAlign: 'left', borderRadius: '12px', cursor: 'pointer',
                          background: selectedSubclass === key ? 'rgba(138, 43, 226, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                          border: `2px solid ${selectedSubclass === key ? theme.sunset.purple : theme.border}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: theme.text.primary, fontWeight: 700, fontSize: '15px' }}>{sc.name}</div>
                            <div style={{ color: theme.text.muted, fontSize: '12px', marginTop: '4px' }}>{sc.description}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                              {sc.features.filter(f => f.level === newClassLevel).map((f, i) => (
                                <span key={i} style={{
                                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                                  background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 500,
                                }}>{f.name}</span>
                              ))}
                            </div>
                          </div>
                          {selectedSubclass === key && <Check size={20} style={{ color: theme.sunset.purple, flexShrink: 0 }} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Battle Master Maneuver Selection */}
              {bmNeedsManeuvers && selectedSubclass === 'battle_master' && (
                <div>
                  <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '8px' }}>
                    Choose 3 maneuvers. These special combat techniques are fueled by your superiority dice.
                  </p>
                  <p style={{ color: theme.text.muted, fontSize: '12px', marginBottom: '12px' }}>
                    Selected: {selectedManeuvers.length}/3
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                    {(classData?.subclasses?.battle_master?.maneuvers || []).map(m => {
                      const isSelected = selectedManeuvers.includes(m.name);
                      return (
                        <button
                          key={m.name}
                          data-testid={`maneuver-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedManeuvers(prev => prev.filter(n => n !== m.name));
                            } else if (selectedManeuvers.length < 3) {
                              setSelectedManeuvers(prev => [...prev, m.name]);
                            }
                          }}
                          style={{
                            padding: '10px 14px', textAlign: 'left', borderRadius: '8px', cursor: 'pointer',
                            background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 10, 30, 0.4)',
                            border: `1px solid ${isSelected ? '#3B82F6' : theme.border}`,
                            opacity: !isSelected && selectedManeuvers.length >= 3 ? 0.4 : 1,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ color: theme.text.primary, fontWeight: 600, fontSize: '13px' }}>{m.name}</div>
                              <div style={{ color: theme.text.muted, fontSize: '11px', marginTop: '2px' }}>{m.description}</div>
                            </div>
                            {isSelected && <Check size={16} style={{ color: '#3B82F6', flexShrink: 0 }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Spellcasting Progression Step */}
          {step === spellcastingStep && isSpellcaster && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: '#EC4899', fontSize: '18px', marginBottom: '8px' }}>
                Spellcasting Progression
              </h3>
              <p style={{ color: theme.text.secondary, marginBottom: '16px', fontSize: '14px' }}>
                {characterClass} spellcasting changes at level {newLevel}.
              </p>

              {/* Spell Slot Changes */}
              {!classInfo.pactMagic ? (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Spell Slots
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.entries(newSlots).map(([lvl, count]) => {
                      const oldCount = oldSlots[lvl] || 0;
                      const isNew = count > oldCount;
                      return (
                        <div key={lvl} style={{
                          padding: '8px 12px', borderRadius: 8, minWidth: 60, textAlign: 'center',
                          background: isNew ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isNew ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                          <div style={{ fontSize: 10, color: theme.text.muted }}>Lvl {lvl}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: isNew ? '#EC4899' : theme.text.primary }}>
                            {count} {isNew && <span style={{ fontSize: 10, color: '#22C55E' }}>+{count - oldCount}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '20px', padding: 12, background: 'rgba(236,72,153,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.text.muted, marginBottom: 6 }}>PACT MAGIC</div>
                  <div style={{ color: theme.text.primary, fontSize: 14 }}>
                    {newSlots.slots} slot{newSlots.slots > 1 ? 's' : ''} at spell level {newSlots.level}
                    {(newSlots.slots !== oldSlots.slots || newSlots.level !== oldSlots.level) && (
                      <span style={{ color: '#22C55E', marginLeft: 8, fontSize: 12 }}>
                        {newSlots.slots !== oldSlots.slots && `+${newSlots.slots - (oldSlots.slots || 0)} slot `}
                        {newSlots.level !== oldSlots.level && `(now lvl ${newSlots.level})`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* New Spell Level Unlocked */}
              {unlockedNewSpellLevel && (
                <div style={{
                  marginBottom: '16px', padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Sparkles size={20} style={{ color: theme.sunset.gold }} />
                  <div>
                    <div style={{ color: theme.sunset.gold, fontWeight: 600, fontSize: 14 }}>
                      Level {maxSpellLevelNew} Spells Unlocked!
                    </div>
                    <div style={{ color: theme.text.muted, fontSize: 12 }}>
                      You can now learn and cast level {maxSpellLevelNew} spells.
                    </div>
                  </div>
                </div>
              )}

              {/* Cantrip Selection */}
              {cantripGain > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#4DD0E1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Choose {cantripGain} New Cantrip{cantripGain > 1 ? 's' : ''} ({selectedNewCantrips.length}/{cantripGain})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', padding: 4 }}>
                    {(availableSpells.cantrips || []).filter(s => !existingCantripNames.includes(s.name)).map(cantrip => {
                      const isSelected = selectedNewCantrips.some(s => s.name === cantrip.name);
                      return (
                        <button key={cantrip.name} onClick={() => {
                          setSelectedNewCantrips(prev =>
                            isSelected ? prev.filter(s => s.name !== cantrip.name)
                              : prev.length < cantripGain ? [...prev, cantrip] : prev
                          );
                        }} style={{
                          padding: '6px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                          background: isSelected ? 'rgba(77,208,225,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? '#4DD0E1' : 'rgba(255,255,255,0.08)'}`,
                          color: isSelected ? '#4DD0E1' : theme.text.secondary,
                          fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                        }} title={cantrip.description}>
                          {cantrip.name} {cantrip.damage && <span style={{ fontSize: 10, opacity: 0.7 }}>({cantrip.damage})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spell Selection for "known" casters */}
              {classInfo.type === 'known' && spellGain > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Choose {spellGain} New Spell{spellGain > 1 ? 's' : ''} ({selectedNewSpells.length}/{spellGain})
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}>
                    {Array.from({ length: maxSpellLevelNew }, (_, i) => i + 1).map(lvl => {
                      const spells = (availableSpells[lvl] || []).filter(s => !existingSpellNames.includes(s.name));
                      if (spells.length === 0) return null;
                      return (
                        <div key={lvl}>
                          <div style={{ fontSize: 10, color: theme.text.muted, fontWeight: 600, padding: '4px 0' }}>Level {lvl}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {spells.map(spell => {
                              const isSelected = selectedNewSpells.some(s => s.name === spell.name);
                              return (
                                <button key={spell.name} onClick={() => {
                                  setSelectedNewSpells(prev =>
                                    isSelected ? prev.filter(s => s.name !== spell.name)
                                      : prev.length < spellGain ? [...prev, { ...spell, level: lvl }] : prev
                                  );
                                }} title={spell.description} style={{
                                  padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                                  background: isSelected ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${isSelected ? '#EC4899' : 'rgba(255,255,255,0.06)'}`,
                                  color: isSelected ? '#EC4899' : theme.text.secondary,
                                  fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                                }}>
                                  {spell.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Wizard spellbook */}
              {isWizard && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Add {wizardSpellbookGain} Spells to Spellbook ({selectedNewSpells.length}/{wizardSpellbookGain})
                  </div>
                  <p style={{ color: theme.text.muted, fontSize: 12, marginBottom: 8 }}>
                    Your study has revealed new arcane secrets. Add {wizardSpellbookGain} wizard spells of a level you can cast.
                  </p>
                  <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}>
                    {Array.from({ length: maxSpellLevelNew }, (_, i) => i + 1).map(lvl => {
                      const spells = (availableSpells[lvl] || []).filter(s => !existingSpellNames.includes(s.name));
                      if (spells.length === 0) return null;
                      return (
                        <div key={lvl}>
                          <div style={{ fontSize: 10, color: theme.text.muted, fontWeight: 600, padding: '4px 0' }}>Level {lvl}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {spells.map(spell => {
                              const isSelected = selectedNewSpells.some(s => s.name === spell.name);
                              return (
                                <button key={spell.name} onClick={() => {
                                  setSelectedNewSpells(prev =>
                                    isSelected ? prev.filter(s => s.name !== spell.name)
                                      : prev.length < wizardSpellbookGain ? [...prev, { ...spell, level: lvl }] : prev
                                  );
                                }} title={spell.description} style={{
                                  padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                                  background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.06)'}`,
                                  color: isSelected ? '#8B5CF6' : theme.text.secondary,
                                  fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                                }}>
                                  {spell.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prepared casters info */}
              {classInfo.type === 'prepared' && !isWizard && (
                <div style={{
                  padding: 12, borderRadius: 8,
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                }}>
                  <div style={{ color: '#3B82F6', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Prepared Spells
                  </div>
                  <div style={{ color: theme.text.muted, fontSize: 12 }}>
                    As a {characterClass}, you can change your prepared spells after a long rest.
                    You can prepare {Math.max(1, Math.floor(((character?.[classInfo.ability] || 10) - 10) / 2) + newLevel)} spells from the {characterClass} spell list.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: ASI or Feat (if applicable) */}
          {step === asiStepPos && isAsiLevel && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, fontSize: '18px', marginBottom: '8px' }}>
                Ability Score Improvement
              </h3>
              <p style={{ color: theme.text.secondary, marginBottom: '20px', fontSize: '14px' }}>
                At level {newLevel}, you can increase your ability scores or take a feat.
              </p>
              
              {/* Choice between ASI and Feat */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                  onClick={() => setChoiceType('asi')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: choiceType === 'asi' ? 'rgba(138, 43, 226, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                    border: `2px solid ${choiceType === 'asi' ? theme.sunset.purple : theme.border}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: theme.text.primary,
                    fontSize: '15px',
                    fontWeight: '500'
                  }}
                >
                  <Plus size={20} style={{ marginBottom: '4px', color: theme.sunset.purple }} />
                  <br />
                  +2 to Abilities
                </button>
                <button
                  onClick={() => setChoiceType('feat')}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: choiceType === 'feat' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                    border: `2px solid ${choiceType === 'feat' ? theme.sunset.pink : theme.border}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: theme.text.primary,
                    fontSize: '15px',
                    fontWeight: '500'
                  }}
                >
                  <Zap size={20} style={{ marginBottom: '4px', color: theme.sunset.pink }} />
                  <br />
                  Take a Feat
                </button>
              </div>
              
              {/* ASI Selection */}
              {choiceType === 'asi' && (
                <div>
                  <p style={{ color: theme.text.muted, fontSize: '13px', marginBottom: '16px' }}>
                    Choose two ability scores to increase by 1 each (or one by 2):
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {ABILITIES.map(ability => {
                      const currentScore = character[ability] || 10;
                      const isSelected1 = asiChoices.ability1 === ability;
                      const isSelected2 = asiChoices.ability2 === ability;
                      const totalSelected = (isSelected1 ? 1 : 0) + (isSelected2 ? 1 : 0);
                      const wouldExceed = currentScore + totalSelected >= 20;
                      
                      return (
                        <div key={ability} style={{
                          background: 'rgba(15, 10, 30, 0.5)',
                          border: `1px solid ${isSelected1 || isSelected2 ? theme.sunset.purple : theme.border}`,
                          borderRadius: '10px',
                          padding: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ color: theme.text.primary, fontWeight: '600' }}>{ABILITY_SHORT[ability]}</span>
                            <span style={{ color: theme.sunset.gold, fontSize: '18px', fontWeight: 'bold' }}>
                              {currentScore}
                              {totalSelected > 0 && <span style={{ color: '#10B981' }}> +{totalSelected}</span>}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleAsiSelect(1, ability)}
                              disabled={wouldExceed && !isSelected1}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: isSelected1 ? theme.sunset.purple : 'rgba(138, 43, 226, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: isSelected1 ? '#fff' : theme.text.secondary,
                                cursor: wouldExceed && !isSelected1 ? 'not-allowed' : 'pointer',
                                opacity: wouldExceed && !isSelected1 ? 0.5 : 1,
                                fontSize: '13px'
                              }}
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleAsiSelect(2, ability)}
                              disabled={wouldExceed && !isSelected2}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: isSelected2 ? theme.sunset.pink : 'rgba(236, 72, 153, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: isSelected2 ? '#fff' : theme.text.secondary,
                                cursor: wouldExceed && !isSelected2 ? 'not-allowed' : 'pointer',
                                opacity: wouldExceed && !isSelected2 ? 0.5 : 1,
                                fontSize: '13px'
                              }}
                            >
                              +1
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Feat Selection */}
              {choiceType === 'feat' && (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {FEATS.map(feat => (
                      <button
                        key={feat.name}
                        onClick={() => setSelectedFeat(feat)}
                        style={{
                          padding: '12px 16px',
                          background: selectedFeat?.name === feat.name ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                          border: `1px solid ${selectedFeat?.name === feat.name ? theme.sunset.pink : theme.border}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: theme.text.primary, fontWeight: '600', fontSize: '15px' }}>{feat.name}</span>
                          {selectedFeat?.name === feat.name && <Check size={18} style={{ color: theme.sunset.pink }} />}
                        </div>
                        <div style={{ color: theme.text.muted, fontSize: '13px', marginTop: '4px' }}>{feat.description}</div>
                        {feat.prereq && (
                          <div style={{ color: theme.sunset.gold, fontSize: '12px', marginTop: '4px' }}>
                            Prerequisite: {feat.prereq}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Step: Confirmation */}
          {step === confirmStepPos && (
            <div>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: theme.sunset.gold, fontSize: '18px', marginBottom: '16px' }}>
                Confirm Level Up
              </h3>
              
              <div style={{
                background: 'rgba(15, 10, 30, 0.5)',
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', color: theme.text.muted }}>New Level</div>
                  <div style={{
                    fontSize: '56px',
                    fontWeight: 'bold',
                    background: theme.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {newLevel}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                    <span style={{ color: theme.text.secondary }}>HP Increase</span>
                    <span style={{ color: '#10B981', fontWeight: '600' }}>+{hpMethod === 'roll' ? rolledHp : averageHp}</span>
                  </div>
                  
                  {profBonusIncreased && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary }}>Proficiency Bonus</span>
                      <span style={{ color: theme.sunset.gold, fontWeight: '600' }}>+{oldProfBonus} → +{newProfBonus}</span>
                    </div>
                  )}
                  
                  {isAsiLevel && choiceType === 'asi' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary }}>Ability Increase</span>
                      <span style={{ color: theme.sunset.purple, fontWeight: '600' }}>
                        {ABILITY_SHORT[asiChoices.ability1]} +1, {ABILITY_SHORT[asiChoices.ability2]} +1
                      </span>
                    </div>
                  )}
                  
                  {isAsiLevel && choiceType === 'feat' && selectedFeat && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary }}>New Feat</span>
                      <span style={{ color: theme.sunset.pink, fontWeight: '600' }}>{selectedFeat.name}</span>
                    </div>
                  )}
                  
                  {/* Spell selections summary */}
                  {selectedNewCantrips.length > 0 && (
                    <div style={{ padding: '10px', background: 'rgba(77,208,225,0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary, fontSize: 13 }}>New Cantrips: </span>
                      <span style={{ color: '#4DD0E1', fontWeight: '600', fontSize: 13 }}>
                        {selectedNewCantrips.map(s => s.name).join(', ')}
                      </span>
                    </div>
                  )}
                  {selectedNewSpells.length > 0 && (
                    <div style={{ padding: '10px', background: 'rgba(236,72,153,0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary, fontSize: 13 }}>
                        {isWizard ? 'Spellbook Additions' : 'New Spells'}: </span>
                      <span style={{ color: '#EC4899', fontWeight: '600', fontSize: 13 }}>
                        {selectedNewSpells.map(s => s.name).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {/* Fighter selections summary */}
                  {selectedFightingStyle && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary }}>Fighting Style</span>
                      <span style={{ color: '#3B82F6', fontWeight: '600' }}>{selectedFightingStyle}</span>
                    </div>
                  )}
                  {selectedSubclass && hasSubclassChoice && classData?.subclasses?.[selectedSubclass] && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary }}>{classData?.subclass_label || 'Subclass'}</span>
                      <span style={{ color: theme.sunset.purple, fontWeight: '600' }}>{classData.subclasses[selectedSubclass].name}</span>
                    </div>
                  )}
                  {selectedManeuvers.length > 0 && (
                    <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: theme.text.secondary, fontSize: 13 }}>Maneuvers: </span>
                      <span style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>
                        {selectedManeuvers.join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {/* Features Gained at this Level */}
                  {(() => {
                    const classKey = (isMulticlassing ? multiclassClass : characterClass)?.toLowerCase();
                    const classData = CLASS_FEATURES[classKey];
                    const newFeatures = (classData?.features || []).filter(f => f.level === newLevel);
                    if (newFeatures.length === 0) return null;
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.sunset.gold, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
                          Features Gained
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {newFeatures.map((feat, i) => {
                            const typeConfig = FEATURE_TYPE_CONFIG[feat.type] || FEATURE_TYPE_CONFIG.passive;
                            return (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 10px', borderRadius: 6,
                                background: 'rgba(255,255,255,0.04)',
                                borderLeft: `3px solid ${typeConfig.color}`,
                              }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '1px 5px',
                                  borderRadius: 3, background: typeConfig.bg, color: typeConfig.color,
                                  minWidth: 24, textAlign: 'center',
                                }}>{typeConfig.short}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.primary }}>{feat.name}</div>
                                  <div style={{ fontSize: 11, color: theme.text.muted, marginTop: 2, lineHeight: 1.4 }}>
                                    {feat.description?.length > 120 ? feat.description.substring(0, 120) + '...' : feat.description}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          {step > 1 ? (
            <Button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1,
                padding: '14px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                color: theme.text.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ChevronLeft size={18} /> Back
            </Button>
          ) : (
            <Button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                color: theme.text.secondary
              }}
            >
              Cancel
            </Button>
          )}
          
          {step === confirmStepPos ? (
            <Button
              onClick={handleLevelUp}
              disabled={loading}
              style={{
                flex: 2,
                padding: '14px',
                background: theme.gradient,
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'Leveling Up...' : (
                <>
                  <Sparkles size={18} /> Confirm Level Up
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              style={{
                flex: 2,
                padding: '14px',
                background: canProceed() ? theme.gradient : theme.bg.surface,
                border: 'none',
                borderRadius: '10px',
                color: canProceed() ? '#fff' : theme.text.muted,
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: canProceed() ? 1 : 0.5
              }}
            >
              Next <ChevronRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
