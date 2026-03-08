import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Plus, ChevronUp, Shield, Swords, Sparkles, Heart, 
  BookOpen, Users, X, Check, AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Player Theme - Blue (Tron Legacy)
const theme = {
  primary: '#3B82F6',
  cyan: '#06B6D4',
  hover: '#60A5FA',
  subtle: 'rgba(59, 130, 246, 0.15)',
  glow: '0 0 20px rgba(6, 182, 212, 0.3)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444'
};

// Class icons and colors
const CLASS_DATA = {
  'Barbarian': { color: '#DC2626', icon: Swords },
  'Bard': { color: '#8B5CF6', icon: Sparkles },
  'Cleric': { color: '#F59E0B', icon: Heart },
  'Druid': { color: '#22C55E', icon: BookOpen },
  'Fighter': { color: '#64748B', icon: Shield },
  'Monk': { color: '#06B6D4', icon: Users },
  'Paladin': { color: '#EAB308', icon: Shield },
  'Ranger': { color: '#16A34A', icon: Swords },
  'Rogue': { color: '#1F2937', icon: Swords },
  'Sorcerer': { color: '#EC4899', icon: Sparkles },
  'Warlock': { color: '#7C3AED', icon: Sparkles },
  'Wizard': { color: '#3B82F6', icon: BookOpen },
  'Artificer': { color: '#F97316', icon: Shield },
};

const DEFAULT_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'
];

function MulticlassManager({ character, onCharacterUpdate }) {
  const [showMulticlassModal, setShowMulticlassModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemClasses, setSystemClasses] = useState([]);

  // Parse character classes
  const classes = character?.classes || [
    { name: character?.class || 'Unknown', level: character?.level || 1 }
  ];
  const totalLevel = classes.reduce((sum, c) => sum + c.level, 0);
  const canLevelUp = totalLevel < 20;

  useEffect(() => {
    if (showMulticlassModal) {
      fetchAvailableClasses();
    }
  }, [showMulticlassModal]);

  const fetchAvailableClasses = async () => {
    try {
      // Try to get classes from the rule system
      const systemId = character?.campaign_id ? '5e-2024' : '5e-2024'; // Default to 2024
      const response = await axios.get(`${API}/rule-systems/${systemId}/classes`);
      const dbClasses = response.data.classes || [];
      
      if (dbClasses.length > 0) {
        setSystemClasses(dbClasses);
        // Filter out classes the character already has
        const currentClassNames = classes.map(c => c.name.toLowerCase());
        const available = dbClasses.filter(c => !currentClassNames.includes(c.name.toLowerCase()));
        setAvailableClasses(available);
      } else {
        // Fallback to default classes
        const currentClassNames = classes.map(c => c.name.toLowerCase());
        const available = DEFAULT_CLASSES
          .filter(name => !currentClassNames.includes(name.toLowerCase()))
          .map(name => ({ name, description: '', multiclass_requirements: getDefaultRequirements(name) }));
        setAvailableClasses(available);
      }
    } catch (error) {
      // Fallback to default classes
      const currentClassNames = classes.map(c => c.name.toLowerCase());
      const available = DEFAULT_CLASSES
        .filter(name => !currentClassNames.includes(name.toLowerCase()))
        .map(name => ({ name, description: '', multiclass_requirements: getDefaultRequirements(name) }));
      setAvailableClasses(available);
    }
  };

  const getDefaultRequirements = (className) => {
    const reqs = {
      'Barbarian': { Strength: 13 },
      'Bard': { Charisma: 13 },
      'Cleric': { Wisdom: 13 },
      'Druid': { Wisdom: 13 },
      'Fighter': { Strength: 13 },
      'Monk': { Dexterity: 13, Wisdom: 13 },
      'Paladin': { Strength: 13, Charisma: 13 },
      'Ranger': { Dexterity: 13, Wisdom: 13 },
      'Rogue': { Dexterity: 13 },
      'Sorcerer': { Charisma: 13 },
      'Warlock': { Charisma: 13 },
      'Wizard': { Intelligence: 13 },
      'Artificer': { Intelligence: 13 },
    };
    return reqs[className] || {};
  };

  const checkRequirements = (requirements) => {
    if (!requirements || Object.keys(requirements).length === 0) return { met: true, failed: [] };
    
    const abilityScores = character?.ability_scores || {};
    const failed = [];
    
    for (const [ability, minScore] of Object.entries(requirements)) {
      const shortKey = ability.toLowerCase().slice(0, 3);
      const charScore = abilityScores[shortKey] || abilityScores[ability.toLowerCase()] || 10;
      if (charScore < minScore) {
        failed.push({ ability, required: minScore, current: charScore });
      }
    }
    
    return { met: failed.length === 0, failed };
  };

  const handleAddClass = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/characters/${character.id}/multiclass`, {
        class_name: selectedClass.name
      });
      
      toast.success(`Added ${selectedClass.name} to your character!`);
      onCharacterUpdate(response.data);
      setShowMulticlassModal(false);
      setSelectedClass(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add class');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelUpClass = async (className) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/characters/${character.id}/level-up-class`, {
        class_name: className
      });
      
      const result = response.data;
      toast.success(`Leveled up ${className}! Gained ${result.hp_gained} HP (rolled ${result.hp_roll})`);
      onCharacterUpdate(result.character);
      setShowLevelUpModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to level up');
    } finally {
      setLoading(false);
    }
  };

  const getClassIcon = (className) => {
    const data = CLASS_DATA[className] || { icon: Shield, color: theme.primary };
    return data;
  };

  return (
    <div>
      {/* Class Display */}
      <div style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: theme.cyan, fontSize: '14px', fontWeight: '700', margin: 0, letterSpacing: '1px' }}>
            CHARACTER CLASSES
          </h4>
          <span style={{ color: theme.muted, fontSize: '12px' }}>
            Total Level: {totalLevel}/20
          </span>
        </div>

        {/* Class List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {classes.map((cls, index) => {
            const classData = getClassIcon(cls.name);
            const Icon = classData.icon;
            
            return (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: theme.bg,
                border: `1px solid ${classData.color}40`,
                borderLeft: `3px solid ${classData.color}`
              }}>
                <Icon size={18} color={classData.color} />
                <span style={{ color: theme.text, fontWeight: '600', flex: 1 }}>{cls.name}</span>
                <span style={{
                  background: classData.color,
                  color: '#fff',
                  padding: '2px 10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  Lv {cls.level}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        {canLevelUp && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Button
              onClick={() => setShowLevelUpModal(true)}
              style={{
                flex: 1,
                background: theme.success,
                border: 'none',
                color: '#fff',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ChevronUp size={16} />
              Level Up
            </Button>
            <Button
              onClick={() => setShowMulticlassModal(true)}
              style={{
                flex: 1,
                background: 'transparent',
                border: `1px solid ${theme.primary}`,
                color: theme.primary,
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              Multiclass
            </Button>
          </div>
        )}
      </div>

      {/* Level Up Modal */}
      {showLevelUpModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.panel,
            border: `1px solid ${theme.cyan}`,
            padding: '24px',
            width: '90%',
            maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.cyan, margin: 0, fontSize: '18px' }}>
                Level Up - Choose Class
              </h3>
              <Button onClick={() => setShowLevelUpModal(false)} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <p style={{ color: theme.textSecondary, fontSize: '13px', marginBottom: '16px' }}>
              Select which class to gain a level in:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {classes.map((cls, index) => {
                const classData = getClassIcon(cls.name);
                const Icon = classData.icon;
                
                return (
                  <Button
                    key={index}
                    onClick={() => handleLevelUpClass(cls.name)}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      background: theme.bg,
                      border: `1px solid ${classData.color}60`,
                      color: theme.text,
                      justifyContent: 'flex-start'
                    }}
                  >
                    <Icon size={20} color={classData.color} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{cls.name}</span>
                    <span style={{ color: theme.muted, fontSize: '12px' }}>
                      Lv {cls.level} → {cls.level + 1}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Multiclass Modal */}
      {showMulticlassModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.panel,
            border: `1px solid ${theme.primary}`,
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0, fontSize: '18px' }}>
                Add New Class (Multiclass)
              </h3>
              <Button onClick={() => { setShowMulticlassModal(false); setSelectedClass(null); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            <p style={{ color: theme.textSecondary, fontSize: '13px', marginBottom: '16px' }}>
              Choose a new class to add to your character. You must meet the ability score requirements.
            </p>

            {/* Class Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {availableClasses.map((cls) => {
                const classData = getClassIcon(cls.name);
                const Icon = classData.icon;
                const requirements = cls.multiclass_requirements || getDefaultRequirements(cls.name);
                const reqCheck = checkRequirements(requirements);
                const isSelected = selectedClass?.name === cls.name;
                
                return (
                  <div
                    key={cls.name}
                    onClick={() => reqCheck.met && setSelectedClass(cls)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      background: isSelected ? theme.subtle : theme.bg,
                      border: `1px solid ${isSelected ? theme.primary : reqCheck.met ? theme.border : theme.error}40`,
                      cursor: reqCheck.met ? 'pointer' : 'not-allowed',
                      opacity: reqCheck.met ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icon size={20} color={classData.color} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: theme.text, fontWeight: '600' }}>{cls.name}</div>
                      <div style={{ color: theme.muted, fontSize: '11px', marginTop: '2px' }}>
                        {Object.entries(requirements).map(([ability, score]) => (
                          <span key={ability} style={{ marginRight: '8px' }}>
                            {ability} {score}+
                          </span>
                        ))}
                      </div>
                    </div>
                    {reqCheck.met ? (
                      isSelected && <Check size={18} color={theme.success} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} color={theme.error} />
                        <span style={{ color: theme.error, fontSize: '11px' }}>
                          Need {reqCheck.failed.map(f => `${f.ability} ${f.required}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => { setShowMulticlassModal(false); setSelectedClass(null); }}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '10px 20px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClass}
                disabled={!selectedClass || loading}
                style={{
                  background: selectedClass ? theme.success : theme.muted,
                  border: 'none',
                  color: '#fff',
                  padding: '10px 20px',
                  opacity: selectedClass ? 1 : 0.5
                }}
              >
                {loading ? 'Adding...' : `Add ${selectedClass?.name || 'Class'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MulticlassManager;
