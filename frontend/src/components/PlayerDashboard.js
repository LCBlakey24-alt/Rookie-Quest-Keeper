import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, User, ArrowLeft, Settings, LogOut, Swords, Shield, Heart,
  Sparkles, Link, Loader, ChevronRight, Users, BookOpen, FileText, Package
} from 'lucide-react';
import PlayerNotesTab from './tabs/PlayerNotesTab';
import SessionJournal from './SessionJournal';
import PlayerPartyLoot from './PlayerPartyLoot';
import { RookSuggestionPopup, useRookSuggestions, getRandomTip } from './RookSuggestions';
import { RQKLogoInline } from '@/components/ui/RQKLogo';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Dark Minimalist Theme - BLUE for Players
const playerTheme = {
  primary: '#3B82F6',
  hover: '#60A5FA',
  subtle: 'rgba(59, 130, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.1)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080'
};

function PlayerDashboard({ username, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('characters');
  const [characters, setCharacters] = useState([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  
  // ROOK suggestions based on selected character
  const characterClass = selectedCharacter?.character_class || 'fighter';
  const characterLevel = selectedCharacter?.level || 1;
  const { currentSuggestion, showRandomTip, dismissSuggestion } = useRookSuggestions(characterClass, characterLevel);

  useEffect(() => {
    fetchData();
    
    // Show a random tip after 5 seconds on dashboard
    const tipTimer = setTimeout(() => {
      showRandomTip();
    }, 5000);
    
    return () => clearTimeout(tipTimer);
  }, []);

  const fetchData = async () => {
    try {
      const [charsRes, campaignsRes] = await Promise.all([
        axios.get(`${API}/characters`),
        axios.get(`${API}/player/campaigns`)
      ]);
      setCharacters(charsRes.data);
      setJoinedCampaigns(campaignsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    if (!selectedCharacter) {
      toast.error('Please select a character to join with');
      return;
    }

    setJoining(true);
    try {
      const response = await axios.post(`${API}/campaigns/join`, {
        invite_code: inviteCode.trim().toUpperCase(),
        character_id: selectedCharacter
      });
      
      toast.success('Joined campaign!', {
        description: `You've joined ${response.data.campaign_name}`
      });
      setShowJoinDialog(false);
      setInviteCode('');
      setSelectedCharacter(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to join', {
        description: error.response?.data?.detail || 'Invalid invite code'
      });
    } finally {
      setJoining(false);
    }
  };

  const getClassColor = (charClass) => {
    const colors = {
      'Fighter': '#EF4444',
      'Wizard': '#8B5CF6',
      'Rogue': '#6B7280',
      'Cleric': '#F59E0B',
      'Ranger': '#10B981',
      'Paladin': '#FBBF24',
      'Barbarian': '#DC2626',
      'Bard': '#EC4899',
      'Druid': '#22C55E',
      'Monk': '#14B8A6',
      'Sorcerer': '#7C3AED',
      'Warlock': '#6366F1'
    };
    return colors[charClass] || playerTheme.primary;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: playerTheme.bg,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Parallax Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0
      }}>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${playerTheme.subtle} 1px, transparent 1px),
            linear-gradient(90deg, ${playerTheme.subtle} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          border: `1px solid ${playerTheme.border}`,
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          border: `1px solid ${playerTheme.subtle}`,
          borderRadius: '50%'
        }} />
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.1) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Header */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(11, 15, 25, 0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            onClick={() => navigate('/home')}
            className="btn-icon"
            data-testid="back-btn"
          >
            <ArrowLeft size={20} />
          </Button>
          <RQKLogoInline size="small" />
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <h1 style={{
              fontSize: '20px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '800',
              color: '#ffffff'
            }}>
              Player Hub
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Manage your characters and campaigns
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button 
            onClick={() => navigate('/account')}
            className="btn-icon"
          >
            <Settings size={18} />
          </Button>
          <Button 
            onClick={onLogout}
            className="btn-icon"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 10, padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Tab Navigation - Glass morphism style */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          padding: '10px',
          background: 'rgba(17, 24, 39, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
        }}>
          <button
            onClick={() => setActiveTab('characters')}
            data-testid="tab-characters"
            style={{
              padding: '12px 24px',
              background: activeTab === 'characters' 
                ? 'linear-gradient(135deg, #22D3EE 0%, #10B981 100%)' 
                : 'transparent',
              border: activeTab === 'characters' 
                ? 'none' 
                : '1px solid #374151',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'Cityworm, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <User size={18} />
            Characters
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            data-testid="tab-notes"
            style={{
              padding: '12px 24px',
              background: activeTab === 'notes' 
                ? 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)' 
                : 'transparent',
              border: activeTab === 'notes' 
                ? 'none' 
                : '1px solid #374151',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'Cityworm, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <FileText size={18} />
            Notes
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            data-testid="tab-journal"
            style={{
              padding: '12px 24px',
              background: activeTab === 'journal' 
                ? 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)' 
                : 'transparent',
              border: activeTab === 'journal' 
                ? 'none' 
                : '1px solid #374151',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'Cityworm, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <BookOpen size={18} />
            Journal
          </button>
          <button
            onClick={() => setActiveTab('loot')}
            data-testid="tab-loot"
            style={{
              padding: '12px 24px',
              background: activeTab === 'loot' 
                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
                : 'transparent',
              border: activeTab === 'loot' 
                ? 'none' 
                : '1px solid #374151',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              fontFamily: 'Cityworm, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Package size={18} />
            Party Loot
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'characters' && (
          <>
            {/* Quick Actions */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              marginBottom: '40px'
            }}>
              <Button
                onClick={() => navigate('/characters/new')}
                data-testid="create-character-btn"
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #22D3EE 0%, #10B981 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '16px',
                  fontFamily: 'Cityworm, sans-serif',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)'
                }}
              >
                <Plus size={24} />
                Create New Character
              </Button>
              
              <Button
                onClick={() => setShowJoinDialog(true)}
                data-testid="join-campaign-btn"
                style={{
                  padding: '20px',
                  background: playerTheme.primary,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '16px',
                  fontFamily: 'Cityworm, sans-serif',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
                }}
              >
                <Link size={24} />
                Join Campaign
              </Button>
            </div>

        {/* My Characters Section */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '700',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <User size={24} style={{ color: '#22D3EE' }} />
              My Characters
              <span style={{ 
                fontSize: '14px', 
                color: '#9CA3AF',
                fontWeight: '500'
              }}>
                ({characters.length})
              </span>
            </h2>
          </div>

          {characters.length === 0 ? (
            <Card style={{
              background: '#111827',
              border: '2px dashed #1F2937',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center'
            }}>
              <User size={48} style={{ color: '#374151', marginBottom: '16px' }} />
              <h3 style={{ 
                color: '#9CA3AF', 
                fontSize: '18px', 
                marginBottom: '8px',
                fontFamily: 'Cityworm, sans-serif',
                fontWeight: '600'
              }}>
                No Characters Yet
              </h3>
              <p style={{ color: '#6B7280', marginBottom: '20px' }}>
                Create your first character to join adventures
              </p>
              <Button
                onClick={() => navigate('/characters/new')}
                className="btn-primary"
              >
                <Plus size={18} style={{ marginRight: '8px' }} />
                Create Character
              </Button>
            </Card>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {characters.map(char => (
                <Card
                  key={char.id}
                  data-testid={`character-card-${char.id}`}
                  onClick={() => navigate(`/characters/${char.id}`)}
                  style={{
                    background: '#111827',
                    border: '1px solid #1F2937',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                  }}
                  className="glow-card"
                >
                  {/* Character Header with Class Color */}
                  <div style={{
                    height: '8px',
                    background: `linear-gradient(90deg, ${getClassColor(char.character_class)}, ${getClassColor(char.character_class)}88)`
                  }} />
                  
                  <CardContent style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {/* Character Avatar */}
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${getClassColor(char.character_class)}40, ${getClassColor(char.character_class)}20)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${getClassColor(char.character_class)}60`,
                        flexShrink: 0
                      }}>
                        {char.portrait_url ? (
                          <img 
                            src={char.portrait_url} 
                            alt={char.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                          />
                        ) : (
                          <User size={28} style={{ color: getClassColor(char.character_class) }} />
                        )}
                      </div>
                      
                      {/* Character Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: '18px',
                          fontFamily: 'Cityworm, sans-serif',
                          fontWeight: '700',
                          color: '#ffffff',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {char.name}
                        </h3>
                        <p style={{ 
                          color: '#9CA3AF', 
                          fontSize: '14px',
                          marginBottom: '8px'
                        }}>
                          Level {char.level} {char.race} {char.character_class}
                        </p>
                        
                        {/* Campaign Badge */}
                        {char.campaign_id ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: 'rgba(124, 58, 237, 0.2)',
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: '#C4B5FD'
                          }}>
                            <Users size={12} />
                            In Campaign
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            background: 'rgba(107, 114, 128, 0.2)',
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: '#9CA3AF'
                          }}>
                            Available
                          </span>
                        )}
                      </div>
                      
                      <ChevronRight size={20} style={{ color: '#6B7280', alignSelf: 'center' }} />
                    </div>
                    
                    {/* Quick Stats */}
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #1F2937'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px'
                      }}>
                        <Heart size={14} style={{ color: '#EF4444' }} />
                        <span style={{ color: '#EF4444', fontSize: '13px', fontWeight: '600' }}>
                          {char.max_hp || '—'} HP
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(34, 211, 238, 0.1)',
                        borderRadius: '8px'
                      }}>
                        <Shield size={14} style={{ color: '#22D3EE' }} />
                        <span style={{ color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                          {char.armor_class || '—'} AC
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Joined Campaigns Section */}
        <section>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '700',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <BookOpen size={24} style={{ color: playerTheme.primary }} />
              My Campaigns
              <span style={{ 
                fontSize: '14px', 
                color: '#9CA3AF',
                fontWeight: '500'
              }}>
                ({joinedCampaigns.length})
              </span>
            </h2>
          </div>

          {joinedCampaigns.length === 0 ? (
            <Card style={{
              background: playerTheme.card,
              border: `1px dashed ${playerTheme.border}`,
              padding: '48px',
              textAlign: 'center'
            }}>
              <BookOpen size={48} style={{ color: '#374151', marginBottom: '16px' }} />
              <h3 style={{ 
                color: '#9CA3AF', 
                fontSize: '18px', 
                marginBottom: '8px',
                fontFamily: 'Cityworm, sans-serif',
                fontWeight: '600'
              }}>
                No Campaigns Joined
              </h3>
              <p style={{ color: '#6B7280', marginBottom: '20px' }}>
                Ask your GM for an invite code to join their campaign
              </p>
              <Button
                onClick={() => setShowJoinDialog(true)}
                className="btn-primary"
              >
                <Link size={18} style={{ marginRight: '8px' }} />
                Join Campaign
              </Button>
            </Card>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {joinedCampaigns.map(campaign => (
                <Card
                  key={campaign.id}
                  data-testid={`campaign-card-${campaign.id}`}
                  style={{
                    background: '#111827',
                    border: '1px solid #1F2937',
                    borderRadius: '16px',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    height: '4px',
                    background: playerTheme.primary
                  }} />
                  <CardContent style={{ padding: '20px' }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontFamily: 'Cityworm, sans-serif',
                      fontWeight: '700',
                      color: '#ffffff',
                      marginBottom: '8px'
                    }}>
                      {campaign.name}
                    </h3>
                    <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '12px' }}>
                      GM: {campaign.gm_name || 'Unknown'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="system-badge">
                        {campaign.system || '5e'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        </>
        )}

        {/* Notes Tab Content */}
        {activeTab === 'notes' && (
          <PlayerNotesTab campaigns={joinedCampaigns} />
        )}

        {activeTab === 'journal' && (
          <SessionJournal 
            characterId={selectedCharacter?.id}
            campaignId={null}
          />
        )}

        {activeTab === 'loot' && (
          <div>
            {joinedCampaigns.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#6B7280'
              }}>
                <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3 style={{ color: '#fff', marginBottom: '8px' }}>No Campaigns Joined</h3>
                <p>Join a campaign to view shared party loot</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {joinedCampaigns.map(campaign => (
                  <div key={campaign.id}>
                    <h3 style={{ 
                      color: '#F59E0B', 
                      fontSize: '16px', 
                      fontWeight: '700',
                      marginBottom: '12px',
                      fontFamily: 'Cityworm, sans-serif'
                    }}>
                      {campaign.name}
                    </h3>
                    <PlayerPartyLoot 
                      campaignId={campaign.id}
                      characterId={selectedCharacter?.id}
                      characterName={selectedCharacter?.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Join Campaign Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="modal" style={{ maxWidth: '480px' }}>
          <DialogHeader>
            <DialogTitle style={{
              fontSize: '24px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '700',
              color: '#ffffff'
            }}>
              Join Campaign
            </DialogTitle>
          </DialogHeader>
          
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#22D3EE',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Invite Code
              </label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., ABC123)"
                className="input"
                style={{ 
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  fontSize: '18px',
                  textAlign: 'center'
                }}
                data-testid="invite-code-input"
              />
              <p style={{ 
                color: '#6B7280', 
                fontSize: '12px', 
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Ask your Game Master for the campaign invite code
              </p>
            </div>

            {characters.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  color: '#22D3EE',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Select Character to Join With
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {characters.filter(c => !c.campaign_id).map(char => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char.id)}
                      data-testid={`select-char-${char.id}`}
                      style={{
                        padding: '14px 16px',
                        background: selectedCharacter === char.id 
                          ? 'rgba(34, 211, 238, 0.2)' 
                          : '#1F2937',
                        border: selectedCharacter === char.id 
                          ? '2px solid #22D3EE' 
                          : '1px solid #374151',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${getClassColor(char.character_class)}40, ${getClassColor(char.character_class)}20)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={20} style={{ color: getClassColor(char.character_class) }} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>
                          {char.name}
                        </p>
                        <p style={{ color: '#9CA3AF', fontSize: '12px' }}>
                          Level {char.level} {char.race} {char.character_class}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {characters.filter(c => !c.campaign_id).length === 0 && (
                  <p style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                    All your characters are already in campaigns
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                onClick={() => setShowJoinDialog(false)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinCampaign}
                disabled={joining || !inviteCode.trim() || !selectedCharacter}
                className="btn-primary"
                style={{ flex: 1 }}
                data-testid="confirm-join-btn"
              >
                {joining ? (
                  <>
                    <Loader className="spin" size={18} style={{ marginRight: '8px' }} />
                    Joining...
                  </>
                ) : (
                  'Join Campaign'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ROOK AI Suggestion Popup */}
      {currentSuggestion && (
        <RookSuggestionPopup
          suggestion={currentSuggestion}
          onDismiss={dismissSuggestion}
          position="bottom-right"
          autoHide={true}
          autoHideDelay={15000}
        />
      )}
    </div>
  );
}

export default PlayerDashboard;
