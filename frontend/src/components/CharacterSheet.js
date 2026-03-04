import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Edit, Heart, Shield, Zap, User, Sword, Book, 
  Sparkles, Save, X, Target, Activity, TrendingUp, Award, Link2
} from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import JoinCampaignModal from '@/components/JoinCampaignModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

function CharacterSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchCharacter();
  }, [characterId]);

  const fetchCharacter = async () => {
    try {
      const response = await axios.get(`${API}/characters/${characterId}`);
      setCharacter(response.data);
      setEditData(response.data);
    } catch (error) {
      toast.error('Failed to load character', {
        description: error.response?.data?.detail || 'Character not found'
      });
      navigate('/characters');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/characters/${characterId}`, editData);
      toast.success('Character updated!', {
        description: 'Changes saved successfully'
      });
      setCharacter(editData);
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to save changes', {
        description: error.response?.data?.detail || 'Please try again'
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateModifier = (score) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getSkillModifier = (skill) => {
    if (!character) return '+0';
    const abilityScore = character[skill.ability];
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    const isProficient = character.skill_proficiencies?.includes(skill.name.toLowerCase().replace(/ /g, '_'));
    const profBonus = isProficient ? character.proficiency_bonus : 0;
    const total = abilityMod + profBonus;
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getSavingThrowModifier = (ability) => {
    if (!character) return '+0';
    const abilityScore = character[ability];
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    const isProficient = character.saving_throw_proficiencies?.includes(ability);
    const profBonus = isProficient ? character.proficiency_bonus : 0;
    const total = abilityMod + profBonus;
    return total >= 0 ? `+${total}` : `${total}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (!character) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button onClick={() => navigate('/characters')} className="btn-icon">
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '800',
                color: '#ffffff',
                marginBottom: '4px'
              }}>
                {character.name}
              </h1>
              <p style={{ color: '#67e8f9', fontSize: '16px' }}>
                Level {character.level} {character.race} {character.character_class}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {character.campaign_id ? (
              <Button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={18} color="#22c55e" />
                Linked to Campaign
              </Button>
            ) : (
              <Button 
                onClick={() => setShowJoinModal(true)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Link2 size={18} />
                Join Campaign
              </Button>
            )}
            {editMode ? (
              <>
                <Button 
                  onClick={() => setEditMode(false)}
                  className="btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <X size={18} />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setEditMode(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Edit size={18} />
                Edit Character
              </Button>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Left Column - Core Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Ability Scores */}
            <Card className="glow-card">
              <CardHeader>
                <CardTitle style={{ fontSize: '18px', color: '#67e8f9' }}>Ability Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => (
                    <div key={ability} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(30, 64, 175, 0.1)',
                      border: '2px solid #1e40af',
                      borderRadius: '12px'
                    }}>
                      <span style={{ 
                        color: '#67e8f9', 
                        fontSize: '14px', 
                        fontWeight: '700',
                        textTransform: 'capitalize' 
                      }}>
                        {ability.substring(0, 3).toUpperCase()}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        {editMode ? (
                          <Input
                            type="number"
                            value={editData[ability]}
                            onChange={(e) => setEditData({ ...editData, [ability]: parseInt(e.target.value) || 10 })}
                            style={{ width: '60px', textAlign: 'center', padding: '4px' }}
                          />
                        ) : (
                          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff' }}>
                            {character[ability]}
                          </div>
                        )}
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                          {calculateModifier(editMode ? editData[ability] : character[ability])}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Combat Stats */}
            <Card className="glow-card">
              <CardHeader>
                <CardTitle style={{ fontSize: '18px', color: '#ef4444' }}>Combat</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* HP */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Heart size={18} color="#ef4444" />
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Hit Points</span>
                    </div>
                    {editMode ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Input
                          type="number"
                          value={editData.current_hit_points}
                          onChange={(e) => setEditData({ ...editData, current_hit_points: parseInt(e.target.value) || 0 })}
                          style={{ width: '80px' }}
                        />
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <Input
                          type="number"
                          value={editData.max_hit_points}
                          onChange={(e) => setEditData({ ...editData, max_hit_points: parseInt(e.target.value) || 0 })}
                          style={{ width: '80px' }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444' }}>
                        {character.current_hit_points} / {character.max_hit_points}
                      </div>
                    )}
                  </div>

                  {/* AC */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Shield size={18} color="#4a7dff" />
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Armor Class</span>
                    </div>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editData.armor_class}
                        onChange={(e) => setEditData({ ...editData, armor_class: parseInt(e.target.value) || 10 })}
                        style={{ width: '100px' }}
                      />
                    ) : (
                      <div style={{ fontSize: '32px', fontWeight: '800', color: '#4a7dff' }}>
                        {character.armor_class}
                      </div>
                    )}
                  </div>

                  {/* Initiative */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Zap size={18} color="#eab308" />
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Initiative</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#eab308' }}>
                      {calculateModifier(character.dexterity + (character.initiative_bonus || 0))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Activity size={18} color="#22c55e" />
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Speed</span>
                    </div>
                    {editMode ? (
                      <Input
                        type="number"
                        value={editData.speed}
                        onChange={(e) => setEditData({ ...editData, speed: parseInt(e.target.value) || 30 })}
                        style={{ width: '100px' }}
                      />
                    ) : (
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#22c55e' }}>
                        {character.speed} ft
                      </div>
                    )}
                  </div>

                  {/* Proficiency Bonus */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Award size={18} color="#a855f7" />
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Proficiency Bonus</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#a855f7' }}>
                      +{character.proficiency_bonus}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Saving Throws & Skills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Saving Throws */}
              <Card className="glow-card">
                <CardHeader>
                  <CardTitle style={{ fontSize: '18px', color: '#67e8f9' }}>Saving Throws</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => {
                      const isProficient = character.saving_throw_proficiencies?.includes(ability);
                      return (
                        <div key={ability} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: isProficient ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                          borderRadius: '8px'
                        }}>
                          <span style={{ 
                            color: isProficient ? '#22c55e' : '#94a3b8',
                            fontSize: '14px',
                            textTransform: 'capitalize'
                          }}>
                            {ability}
                          </span>
                          <span style={{ 
                            color: '#ffffff', 
                            fontWeight: '700',
                            fontSize: '14px'
                          }}>
                            {getSavingThrowModifier(ability)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="glow-card">
                <CardHeader>
                  <CardTitle style={{ fontSize: '18px', color: '#67e8f9' }}>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                    {SKILLS.map((skill) => {
                      const isProficient = character.skill_proficiencies?.includes(skill.name.toLowerCase().replace(/ /g, '_'));
                      return (
                        <div key={skill.name} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          background: isProficient ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                          borderRadius: '8px'
                        }}>
                          <span style={{ 
                            color: isProficient ? '#22c55e' : '#94a3b8',
                            fontSize: '13px'
                          }}>
                            {skill.name}
                          </span>
                          <span style={{ 
                            color: '#ffffff', 
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            {getSkillModifier(skill)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personality */}
            <Card className="glow-card">
              <CardHeader>
                <CardTitle style={{ fontSize: '18px', color: '#67e8f9' }}>Personality</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                      Traits
                    </label>
                    {editMode ? (
                      <textarea
                        value={editData.personality_traits}
                        onChange={(e) => setEditData({ ...editData, personality_traits: e.target.value })}
                        className="textarea"
                        style={{ minHeight: '80px', fontSize: '13px' }}
                      />
                    ) : (
                      <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6' }}>
                        {character.personality_traits || 'None'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                      Ideals
                    </label>
                    {editMode ? (
                      <textarea
                        value={editData.ideals}
                        onChange={(e) => setEditData({ ...editData, ideals: e.target.value })}
                        className="textarea"
                        style={{ minHeight: '80px', fontSize: '13px' }}
                      />
                    ) : (
                      <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6' }}>
                        {character.ideals || 'None'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                      Bonds
                    </label>
                    {editMode ? (
                      <textarea
                        value={editData.bonds}
                        onChange={(e) => setEditData({ ...editData, bonds: e.target.value })}
                        className="textarea"
                        style={{ minHeight: '80px', fontSize: '13px' }}
                      />
                    ) : (
                      <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6' }}>
                        {character.bonds || 'None'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                      Flaws
                    </label>
                    {editMode ? (
                      <textarea
                        value={editData.flaws}
                        onChange={(e) => setEditData({ ...editData, flaws: e.target.value })}
                        className="textarea"
                        style={{ minHeight: '80px', fontSize: '13px' }}
                      />
                    ) : (
                      <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6' }}>
                        {character.flaws || 'None'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backstory */}
            <Card className="glow-card">
              <CardHeader>
                <CardTitle style={{ fontSize: '18px', color: '#67e8f9' }}>Backstory</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <textarea
                    value={editData.backstory}
                    onChange={(e) => setEditData({ ...editData, backstory: e.target.value })}
                    className="textarea"
                    style={{ minHeight: '150px' }}
                  />
                ) : (
                  <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.8' }}>
                    {character.backstory || 'No backstory written yet.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Join Campaign Modal */}
      <JoinCampaignModal
        characterId={characterId}
        characterName={character.name}
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={(campaign) => {
          fetchCharacter(); // Refresh to show linked status
        }}
      />
    </div>
  );
}

export default CharacterSheet;
