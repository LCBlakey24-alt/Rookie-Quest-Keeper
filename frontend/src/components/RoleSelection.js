import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RQKLogoInline } from '@/components/ui/RQKLogo';
import { Crown, User, Swords, BookOpen, Users, Sparkles, Settings, LogOut } from 'lucide-react';

function RoleSelection({ username, onLogout }) {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0B0F19 0%, #111827 50%, #0B0F19 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1F2937'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <RQKLogoInline size="small" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '14px' }}>
            Welcome, <span style={{ color: '#22D3EE', fontWeight: '600' }}>{username}</span>
          </span>
          <Button 
            onClick={() => navigate('/account')}
            className="btn-icon"
            style={{ padding: '8px' }}
          >
            <Settings size={18} />
          </Button>
          <Button 
            onClick={onLogout}
            className="btn-icon"
            style={{ padding: '8px' }}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}>
        {/* Welcome Message */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontFamily: 'Cityworm, sans-serif',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '16px'
          }}>
            Choose Your{' '}
            <span className="rainbow-text">Adventure</span>
          </h1>
          <p style={{ 
            color: '#9CA3AF', 
            fontSize: '18px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            Are you running a game or joining one?
          </p>
        </div>

        {/* Role Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          maxWidth: '800px',
          width: '100%'
        }}>
          {/* Game Master Card */}
          <Card 
            data-testid="gm-role-card"
            onClick={() => navigate('/campaigns')}
            style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
              border: '2px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
            className="glow-card"
          >
            <CardHeader style={{ paddingBottom: '12px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'rgba(225, 29, 72, 0.15)',
                border: '2px solid #E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 0 30px rgba(225, 29, 72, 0.3)'
              }}>
                <Crown size={40} color="#E11D48" />
              </div>
              <CardTitle style={{
                fontSize: '28px',
                fontFamily: 'Cityworm, sans-serif',
                fontWeight: '800',
                color: '#ffffff'
              }}>
                Game Master
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ 
                color: '#9CA3AF', 
                fontSize: '15px', 
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                Create and manage campaigns, build worlds, run combat encounters, and guide your players through epic adventures.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {[
                  { icon: BookOpen, label: 'Worldbuilding' },
                  { icon: Swords, label: 'Combat' },
                  { icon: Users, label: 'NPCs' },
                  { icon: Sparkles, label: 'AI Tools' }
                ].map((item, idx) => (
                  <span 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(124, 58, 237, 0.2)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#C4B5FD'
                    }}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </span>
                ))}
              </div>
              <Button 
                className="btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  fontSize: '16px'
                }}
              >
                Enter as Game Master
              </Button>
            </CardContent>
          </Card>

          {/* Player Card - Uses BLUE theme */}
          <Card 
            data-testid="player-role-card"
            onClick={() => navigate('/player')}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
            className="glow-card"
          >
            <CardHeader style={{ paddingBottom: '12px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '2px solid #3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
              }}>
                <User size={40} color="#3B82F6" />
              </div>
              <CardTitle style={{
                fontSize: '28px',
                fontFamily: 'Cityworm, sans-serif',
                fontWeight: '800',
                color: '#ffffff'
              }}>
                Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ 
                color: '#9CA3AF', 
                fontSize: '15px', 
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                Create your hero, join campaigns with an invite code, manage your character sheet, and track your equipment and abilities.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {[
                  { icon: User, label: 'Characters' },
                  { icon: Swords, label: 'Combat' },
                  { icon: BookOpen, label: 'Inventory' },
                  { icon: Sparkles, label: 'AI Builder' }
                ].map((item, idx) => (
                  <span 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(34, 211, 238, 0.2)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#A7F3D0'
                    }}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </span>
                ))}
              </div>
              <Button 
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  fontSize: '16px',
                  background: '#3B82F6',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontFamily: 'Cityworm, sans-serif',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
                }}
              >
                Enter as Player
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
