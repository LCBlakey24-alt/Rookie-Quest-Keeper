import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Dices, Sparkles, Shield, Swords, Plus, Check, Star, Zap, Users } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { MULTICLASS_REQUIREMENTS, MULTICLASS_PROFICIENCIES, canMulticlassInto, canMulticlassFrom, CLASSES } from '../data/characterRules5e';

const API = process.env.REACT_APP_BACKEND_URL;

// Theme colors matching Fantasy Sunset
const theme = {
  bg: { primary: '#0F0A1E', surface: '#1A112E', panel: 'rgba(26, 17, 46, 0.95)' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(139, 92, 246, 0.3)',
  sunset: { purple: '#8B5CF6', pink: '#EC4899', gold: '#F59E0B' },
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)'
};

// Hit dice by class
const HIT_DICE = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6
};

// ASI levels for each class
const ASI_LEVELS = {
  default: [4, 8, 12, 16, 19],
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue: [4, 8, 10, 12, 16, 19]
};

// Standard 5e feats
const FEATS = [
  { name: 'Alert', description: '+5 initiative, can\'t be surprised, no advantage for hidden attackers', prereq: null },
  { name: 'Athlete', description: '+1 STR/DEX, standing from prone costs 5ft, running jump +5ft', prereq: null },
  { name: 'Actor', description: '+1 CHA, advantage on deception/performance to impersonate', prereq: null },
  { name: 'Charger', description: 'Dash action lets you attack with +5 damage or shove', prereq: null },
  { name: 'Crossbow Expert', description: 'Ignore loading, no disadvantage in melee, bonus attack', prereq: null },
  { name: 'Defensive Duelist', description: 'Reaction to add proficiency to AC vs melee', prereq: 'DEX 13+' },
  { name: 'Dual Wielder', description: '+1 AC with two weapons, dual wield non-light weapons', prereq: null },
  { name: 'Dungeon Delver', description: 'Advantage on trap detection, resistance to trap damage', prereq: null },
  { name: 'Durable', description: '+1 CON, minimum hit dice healing = 2x CON mod', prereq: null },
  { name: 'Elemental Adept', description: 'Ignore resistance, treat 1s as 2s for chosen element', prereq: 'Spellcasting' },
  { name: 'Grappler', description: 'Advantage on attacks vs grappled, can pin creatures', prereq: 'STR 13+' },
  { name: 'Great Weapon Master', description: 'Bonus attack on crit/kill, -5 to hit for +10 damage', prereq: null },
  { name: 'Healer', description: 'Stabilize + 1HP, healer\'s kit restores 1d6+4+HD HP', prereq: null },
  { name: 'Heavily Armored', description: '+1 STR, gain heavy armor proficiency', prereq: 'Medium armor proficiency' },
  { name: 'Heavy Armor Master', description: '+1 STR, reduce nonmagical bludg/pierce/slash by 3', prereq: 'Heavy armor proficiency' },
  { name: 'Inspiring Leader', description: '10min speech grants level+CHA temp HP to 6 creatures', prereq: 'CHA 13+' },
  { name: 'Keen Mind', description: '+1 INT, always know north and hours until sunrise/set', prereq: null },
  { name: 'Lightly Armored', description: '+1 STR/DEX, gain light armor proficiency', prereq: null },
  { name: 'Linguist', description: '+1 INT, learn 3 languages, create ciphers', prereq: null },
  { name: 'Lucky', description: '3 luck points per day to reroll any d20', prereq: null },
  { name: 'Mage Slayer', description: 'Reaction attack on casters, advantage on saves, conc. disadvantage', prereq: null },
  { name: 'Magic Initiate', description: '2 cantrips + 1 1st-level spell from any class', prereq: null },
  { name: 'Martial Adept', description: 'Learn 2 maneuvers, gain 1 superiority die (d6)', prereq: null },
  { name: 'Medium Armor Master', description: 'No stealth disadvantage, +3 DEX to AC in medium armor', prereq: 'Medium armor proficiency' },
  { name: 'Mobile', description: '+10 speed, no opportunity attacks from attacked targets', prereq: null },
  { name: 'Moderately Armored', description: '+1 STR/DEX, gain medium armor and shield proficiency', prereq: 'Light armor proficiency' },
  { name: 'Mounted Combatant', description: 'Advantage vs smaller unmounted, redirect attacks to you', prereq: null },
  { name: 'Observant', description: '+1 INT/WIS, +5 passive perception and investigation', prereq: null },
  { name: 'Polearm Master', description: 'Bonus d4 attack, opportunity attack when entering reach', prereq: null },
  { name: 'Resilient', description: '+1 to ability, gain saving throw proficiency in it', prereq: null },
  { name: 'Ritual Caster', description: 'Learn 2 ritual spells, can cast them as rituals', prereq: 'INT or WIS 13+' },
  { name: 'Savage Attacker', description: 'Reroll melee weapon damage once per turn', prereq: null },
  { name: 'Sentinel', description: 'Opportunity attack stops movement, attack on ally attacks', prereq: null },
  { name: 'Sharpshooter', description: 'No disadvantage at long range, -5 to hit for +10 damage', prereq: null },
  { name: 'Shield Master', description: 'Bonus shove, add shield AC to DEX saves, evasion with shield', prereq: null },
  { name: 'Skilled', description: 'Gain 3 skill or tool proficiencies', prereq: null },
  { name: 'Skulker', description: 'Hide when lightly obscured, miss doesn\'t reveal position', prereq: 'DEX 13+' },
  { name: 'Spell Sniper', description: 'Double spell range, ignore cover, learn 1 cantrip', prereq: 'Spellcasting' },
  { name: 'Tavern Brawler', description: '+1 STR/CON, proficient with improvised, grapple on hit', prereq: null },
  { name: 'Tough', description: '+2 HP per level', prereq: null },
  { name: 'War Caster', description: 'Advantage on concentration, cast with hands full, spell as OA', prereq: 'Spellcasting' },
  { name: 'Weapon Master', description: '+1 STR/DEX, proficiency with 4 weapons', prereq: null }
];

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ABILITY_SHORT = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

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
    }
  }, [isOpen]);

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
    if (step === 0) return !isMulticlassing || multiclassClass; // Multiclass choice
    if (step === 1) return true; // HP method selection always valid
    if (step === 2 && hpMethod === 'roll') return hasRolled;
    if (step === 2 && hpMethod === 'average') return true;
    if (step === 3 && isAsiLevel) {
      if (choiceType === 'asi') {
        return asiChoices.ability1 && asiChoices.ability2;
      }
      if (choiceType === 'feat') {
        return selectedFeat !== null;
      }
      return false;
    }
    return true;
  };

  const getTotalSteps = () => {
    // Step 0: Class choice (continue or multiclass)
    // Step 1: HP method
    // Step 2: HP result
    // Step 3: ASI/Feat (if applicable)
    // Step 4: Confirm
    return isAsiLevel ? 5 : 4;
  };

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
          requestData.feat_name = selectedFeat?.name;
        }
      }

      // Use different endpoint for multiclassing
      const endpoint = isMulticlassing && multiclassClass 
        ? `${API}/api/characters/${character.id}/multiclass`
        : `${API}/api/characters/${character.id}/level-up`;
        
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
          boxShadow: '0 25px 80px rgba(139, 92, 246, 0.3)'
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
                    background: !isMulticlassing ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 10, 30, 0.5)',
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
                    background: hpMethod === 'average' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 10, 30, 0.5)',
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
                          boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4)',
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
                        background: 'rgba(139, 92, 246, 0.2)',
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

          {/* Step 3: ASI or Feat (if applicable) */}
          {step === 3 && isAsiLevel && (
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
                    background: choiceType === 'asi' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 10, 30, 0.5)',
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
                                background: isSelected1 ? theme.sunset.purple : 'rgba(139, 92, 246, 0.1)',
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
          {((step === 3 && !isAsiLevel) || (step === 4 && isAsiLevel)) && (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
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
          
          {((step === 3 && !isAsiLevel) || (step === 4 && isAsiLevel)) ? (
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
