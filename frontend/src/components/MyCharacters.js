import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, User, Sword, Heart, Shield, Trash2, Edit, ArrowLeft, Lock } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useSubscription } from '@/hooks/useSubscription';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MyCharacters({ username, onLogout }) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingCharacter, setDeletingCharacter] = useState(null);
  const { tier, canCreateCharacter } = useSubscription();

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await axios.get(`${API}/characters`);
      setCharacters(response.data);
    } catch (error) {
      toast.error('Failed to load characters', {
        description: error.response?.data?.detail || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (characterId) => {
    if (deletingCharacter === characterId) {
      // Confirmed, delete
      try {
        const character = characters.find(c => c.id === characterId);
        await axios.delete(`${API}/characters/${characterId}`);
        toast.success(`${character.name} deleted`, {
          description: 'Character removed from your collection'
        });
        fetchCharacters();
      } catch (error) {
        toast.error('Failed to delete character', {
          description: error.response?.data?.detail || 'Please try again'
        });
      } finally {
        setDeletingCharacter(null);
      }
    } else {
      // First click - show confirmation
      setDeletingCharacter(characterId);
      setTimeout(() => setDeletingCharacter(null), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '32px', color: '#ffffff', marginBottom: '24px' }}>My Characters</h1>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              onClick={() => navigate('/campaigns')}
              className="btn-icon"
            >
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
                My Characters
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Manage your player characters
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => {
              if (canCreateCharacter(characters.length)) {
                navigate('/characters/new');
              } else {
                toast.error('Character limit reached!', {
                  description: 'Free tier allows 1 character. Upgrade to Hero or Legendary for unlimited characters!'
                });
                navigate('/pricing');
              }
            }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {canCreateCharacter(characters.length) ? <Plus size={20} /> : <Lock size={20} />}
            Create Character
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {characters.length === 0 ? (
          <EmptyState
            icon={User}
            title="No Characters Yet"
            description="Create your first player character to begin your adventure. Build a hero with unique abilities, equipment, and backstory."
            actionLabel="Create Your First Character"
            onAction={() => navigate('/characters/new')}
            color="#4a7dff"
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {characters.map((character) => (
              <Card
                key={character.id}
                className="glow-card clickable-box"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/characters/${character.id}`)}
              >
                <CardContent style={{ padding: '24px' }}>
                  {/* Character Header */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: '22px',
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: '700',
                          color: '#ffffff',
                          marginBottom: '6px'
                        }}>
                          {character.name}
                        </h3>
                        <p style={{ color: '#67e8f9', fontSize: '14px', marginBottom: '4px' }}>
                          Level {character.level} {character.race} {character.character_class}
                        </p>
                        {character.subclass && (
                          <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                            {character.subclass}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/characters/${character.id}/edit`);
                          }}
                          className="btn-icon"
                          title="Edit character"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(character.id);
                          }}
                          className="btn-icon"
                          title="Delete character"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Campaign Badge */}
                    {character.campaign_id && (
                      <div style={{
                        marginTop: '12px',
                        padding: '6px 12px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        display: 'inline-block'
                      }}>
                        <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600' }}>
                          Linked to Campaign
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '2px solid #ef4444',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <Heart size={18} color="#ef4444" />
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>
                        {character.current_hit_points}/{character.max_hit_points}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>HP</div>
                    </div>

                    <div style={{
                      padding: '12px',
                      background: 'rgba(74, 125, 255, 0.1)',
                      border: '2px solid #4a7dff',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <Shield size={18} color="#4a7dff" />
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#4a7dff' }}>
                        {character.armor_class}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>AC</div>
                    </div>

                    <div style={{
                      padding: '12px',
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '2px solid #a855f7',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <Sword size={18} color="#a855f7" />
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#a855f7' }}>
                        +{character.proficiency_bonus}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Prof</div>
                    </div>
                  </div>

                  {/* Backstory Preview */}
                  {character.backstory && (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(30, 41, 59, 0.4)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #67e8f9'
                    }}>
                      <p style={{
                        color: '#94a3b8',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {character.backstory}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyCharacters;
