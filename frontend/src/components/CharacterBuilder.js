import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, User, Sparkles, Loader, Wand2, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Quick suggestion prompts for inspiration
const AI_SUGGESTIONS = [
  "A sneaky rogue who uses a bow and has a dark past",
  "A holy warrior seeking redemption for past sins",
  "A scholarly wizard obsessed with ancient secrets",
  "A nature-loving druid protecting their homeland",
  "A charming bard collecting tales of adventure"
];

// 5e Data
const RACES = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'
];

const CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
];

const BACKGROUNDS = [
  'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero', 'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin'
];

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
];

function CharacterBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [aiGenerated, setAiGenerated] = useState(false);
  
  const [characterData, setCharacterData] = useState({
    name: '',
    race: 'Human',
    character_class: 'Fighter',
    subclass: '',
    background: 'Folk Hero',
    level: 1,
    alignment: 'Neutral Good',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    backstory: '',
    personality_traits: '',
    ideals: '',
    bonds: '',
    flaws: ''
  });

  const handleChange = (field, value) => {
    setCharacterData(prev => ({ ...prev, [field]: value }));
  };

  // AI Character Generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) {
      toast.error('Description too short', {
        description: 'Please describe your character in at least 10 characters'
      });
      return;
    }

    setAiGenerating(true);
    try {
      const response = await axios.post(`${API}/ai/generate-character`, {
        description: aiPrompt
      });

      if (response.data.success && response.data.character) {
        const generated = response.data.character;
        
        // Map the generated data to our form
        setCharacterData(prev => ({
          ...prev,
          name: generated.name || prev.name,
          race: generated.race || prev.race,
          character_class: generated.character_class || prev.character_class,
          subclass: generated.subclass || '',
          background: generated.background || prev.background,
          level: generated.level || 1,
          alignment: generated.alignment || prev.alignment,
          strength: generated.strength || 10,
          dexterity: generated.dexterity || 10,
          constitution: generated.constitution || 10,
          intelligence: generated.intelligence || 10,
          wisdom: generated.wisdom || 10,
          charisma: generated.charisma || 10,
          personality_traits: generated.personality_traits || '',
          ideals: generated.ideals || '',
          bonds: generated.bonds || '',
          flaws: generated.flaws || '',
          backstory: generated.backstory || ''
        }));

        setAiGenerated(true);
        toast.success(response.data.message || 'Character generated!', {
          description: 'Review and customize before creating',
          duration: 4000
        });
      }
    } catch (error) {
      toast.error('AI generation failed', {
        description: error.response?.data?.detail || 'Please try again with a different description'
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const calculateModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const getTotalPoints = () => {
    return characterData.strength + characterData.dexterity + characterData.constitution +
           characterData.intelligence + characterData.wisdom + characterData.charisma;
  };

  const handleCreate = async () => {
    if (!characterData.name.trim()) {
      toast.error('Character name required', {
        description: 'Please enter a name for your character'
      });
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/characters`, characterData);
      
      toast.success(`${characterData.name} created!`, {
        description: 'Your character is ready for adventure',
        duration: 3000
      });
      
      // Navigate to character sheet
      navigate(`/characters/${response.data.character_id}`);
    } catch (error) {
      toast.error('Failed to create character', {
        description: error.response?.data?.detail || 'Please try again'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <Button onClick={() => navigate('/characters')} className="btn-icon">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 36px)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '4px'
            }}>
              Create Character
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Step {step} of 4
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: '8px',
          background: 'rgba(30, 64, 175, 0.3)',
          borderRadius: '4px',
          marginBottom: '32px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #14b8a6, #22c55e)',
            width: `${(step / 4) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Unseen Servant AI Panel */}
        <div style={{
          marginBottom: '24px',
          background: aiGenerated 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(20, 184, 166, 0.15))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.15))',
          border: aiGenerated ? '2px solid #22c55e' : '2px solid #8b5cf6',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Header - Always Visible */}
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            data-testid="ai-panel-toggle"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wand2 size={22} color="#ffffff" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ 
                  color: '#ffffff', 
                  fontSize: '18px', 
                  fontWeight: '700',
                  fontFamily: 'Montserrat, sans-serif',
                  margin: 0
                }}>
                  Unseen Servant
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                  {aiGenerated ? 'Character generated! Review below.' : 'Let AI create your character concept'}
                </p>
              </div>
            </div>
            {showAiPanel ? <ChevronUp size={24} color="#94a3b8" /> : <ChevronDown size={24} color="#94a3b8" />}
          </button>

          {/* Expandable Content */}
          {showAiPanel && (
            <div style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#a78bfa', 
                  fontSize: '14px', 
                  fontWeight: '600' 
                }}>
                  Describe your character
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., A mysterious elven wizard who was exiled from their homeland for practicing forbidden magic..."
                  data-testid="ai-character-prompt"
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
                />
              </div>

              {/* Quick Suggestions */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                  Quick ideas:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AI_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAiPrompt(suggestion)}
                      data-testid={`ai-suggestion-${idx}`}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: '20px',
                        color: '#c4b5fd',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(139, 92, 246, 0.4)';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(139, 92, 246, 0.2)';
                        e.target.style.color = '#c4b5fd';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                data-testid="ai-generate-btn"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: aiGenerating 
                    ? 'rgba(139, 92, 246, 0.5)' 
                    : 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: aiGenerating || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                {aiGenerating ? (
                  <>
                    <Loader className="spin" size={20} />
                    Summoning Character...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate with AI
                  </>
                )}
              </Button>

              {aiGenerated && (
                <p style={{ 
                  marginTop: '12px', 
                  color: '#22c55e', 
                  fontSize: '13px', 
                  textAlign: 'center' 
                }}>
                  ✨ Character generated! Review and edit the details below, then click "Create Character" when ready.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Character Name *
                  </label>
                  <Input
                    value={characterData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter character name..."
                    className="input"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                      Race
                    </label>
                    <select
                      value={characterData.race}
                      onChange={(e) => handleChange('race', e.target.value)}
                      className="input"
                      style={{ width: '100%', fontSize: '15px' }}
                    >
                      {RACES.map(race => (
                        <option key={race} value={race}>{race}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                      Class
                    </label>
                    <select
                      value={characterData.character_class}
                      onChange={(e) => handleChange('character_class', e.target.value)}
                      className="input"
                      style={{ width: '100%', fontSize: '15px' }}
                    >
                      {CLASSES.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                      Background
                    </label>
                    <select
                      value={characterData.background}
                      onChange={(e) => handleChange('background', e.target.value)}
                      className="input"
                      style={{ width: '100%', fontSize: '15px' }}
                    >
                      {BACKGROUNDS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                      Level
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={characterData.level}
                      onChange={(e) => handleChange('level', parseInt(e.target.value) || 1)}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Alignment
                  </label>
                  <select
                    value={characterData.alignment}
                    onChange={(e) => handleChange('alignment', e.target.value)}
                    className="input"
                    style={{ width: '100%', fontSize: '15px' }}
                  >
                    {ALIGNMENTS.map(align => (
                      <option key={align} value={align}>{align}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Ability Scores */}
        {step === 2 && (
          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Ability Scores
              </CardTitle>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                Point Buy: {getTotalPoints()}/60 (Standard: 60, Point Buy allows 8-15)
              </p>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                  const score = characterData[ability];
                  const modifier = calculateModifier(score);
                  return (
                    <div key={ability} style={{
                      padding: '20px',
                      background: 'rgba(30, 64, 175, 0.1)',
                      border: '2px solid #1e40af',
                      borderRadius: '16px'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{
                          display: 'block',
                          color: '#67e8f9',
                          fontSize: '16px',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          marginBottom: '4px'
                        }}>
                          {ability}
                        </label>
                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                          Modifier: {modifier >= 0 ? '+' : ''}{modifier}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="3"
                        max="20"
                        value={score}
                        onChange={(e) => handleChange(ability, parseInt(e.target.value) || 10)}
                        className="input"
                        style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid #a855f7',
                borderRadius: '12px'
              }}>
                <p style={{ color: '#a855f7', fontSize: '13px', lineHeight: '1.6' }}>
                  💡 <strong>Tip:</strong> Standard array: 15, 14, 13, 12, 10, 8. Point buy allows scores from 8-15 before racial bonuses.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Personality */}
        {step === 3 && (
          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Personality & Backstory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Personality Traits
                  </label>
                  <textarea
                    value={characterData.personality_traits}
                    onChange={(e) => handleChange('personality_traits', e.target.value)}
                    placeholder="What are your character's quirks and habits?"
                    className="textarea"
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Ideals
                  </label>
                  <textarea
                    value={characterData.ideals}
                    onChange={(e) => handleChange('ideals', e.target.value)}
                    placeholder="What does your character believe in?"
                    className="textarea"
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Bonds
                  </label>
                  <textarea
                    value={characterData.bonds}
                    onChange={(e) => handleChange('bonds', e.target.value)}
                    placeholder="Who or what is your character connected to?"
                    className="textarea"
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                    Flaws
                  </label>
                  <textarea
                    value={characterData.flaws}
                    onChange={(e) => handleChange('flaws', e.target.value)}
                    placeholder="What are your character's weaknesses?"
                    className="textarea"
                    style={{ minHeight: '80px' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Backstory */}
        {step === 4 && (
          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Backstory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
                  Tell Your Character's Story
                </label>
                <textarea
                  value={characterData.backstory}
                  onChange={(e) => handleChange('backstory', e.target.value)}
                  placeholder="Where did your character come from? What drives them? What are they searching for?"
                  className="textarea"
                  style={{ minHeight: '200px' }}
                />
              </div>

              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid #22c55e',
                borderRadius: '12px'
              }}>
                <h4 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
                  Character Summary
                </h4>
                <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>
                  <strong>{characterData.name || 'Your Character'}</strong> - Level {characterData.level} {characterData.race} {characterData.character_class}
                  <br />
                  Background: {characterData.background} | Alignment: {characterData.alignment}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button
            onClick={() => setStep(Math.max(1, step - 1))}
            className="btn-outline"
            disabled={step === 1}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Previous
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(Math.min(4, step + 1))}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={creating || !characterData.name.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {creating ? (
                <>
                  <Loader className="spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Create Character
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharacterBuilder;
