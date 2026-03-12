import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { 
  Image, Loader2, RefreshCw, Download, Check, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Generate a unique color based on creature name
function generateCreatureColor(name, type = 'enemy') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Base hue on type
  let baseHue;
  if (type === 'player') baseHue = 210; // Blue
  else if (type === 'ally' || type === 'npc') baseHue = 140; // Green
  else baseHue = (Math.abs(hash) % 60) + 330; // Red/Orange range
  
  const saturation = 70 + (Math.abs(hash >> 8) % 30);
  const lightness = 45 + (Math.abs(hash >> 16) % 15);
  
  return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
}

// Simple token with initials
function SimpleToken({ name, size = 40, color, type = 'enemy', hp, maxHp }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  const tokenColor = color || generateCreatureColor(name, type);
  const hpPercent = maxHp ? (hp / maxHp) * 100 : 100;
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${tokenColor} 0%, ${tokenColor}99 100%)`,
      border: `3px solid ${type === 'enemy' ? '#ef4444' : type === 'player' ? '#3b82f6' : '#22c55e'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '800',
      fontSize: size * 0.35,
      color: '#fff',
      fontFamily: "Eros Book, sans-serif",
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      boxShadow: `0 0 ${size * 0.25}px ${tokenColor}60, inset 0 -${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.3)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* HP indicator ring */}
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          transform: 'rotate(-90deg)' 
        }}
        width={size} 
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 4}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 4}
          fill="none"
          stroke={hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444'}
          strokeWidth="3"
          strokeDasharray={`${(hpPercent / 100) * 2 * Math.PI * ((size / 2) - 4)} ${2 * Math.PI * ((size / 2) - 4)}`}
          style={{ transition: 'stroke-dasharray 0.3s' }}
        />
      </svg>
      <span style={{ zIndex: 1 }}>{initials}</span>
    </div>
  );
}

// Token with AI-generated portrait
function AIToken({ name, imageUrl, size = 60, type = 'enemy', hp, maxHp, isLoading }) {
  const hpPercent = maxHp ? (hp / maxHp) * 100 : 100;
  const borderColor = type === 'enemy' ? '#ef4444' : type === 'player' ? '#3b82f6' : '#22c55e';
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `3px solid ${borderColor}`,
      background: isLoading ? 'rgba(30, 30, 60, 0.8)' : '#1e1e3e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: `0 0 ${size * 0.3}px ${borderColor}40`
    }}>
      {isLoading ? (
        <Loader2 size={size * 0.4} color="#64748b" className="animate-spin" />
      ) : imageUrl ? (
        <img 
          src={imageUrl} 
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <SimpleToken name={name} size={size - 6} type={type} hp={hp} maxHp={maxHp} />
      )}
      
      {/* HP ring overlay */}
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          transform: 'rotate(-90deg)',
          pointerEvents: 'none'
        }}
        width={size} 
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size / 2) - 2}
          fill="none"
          stroke={hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444'}
          strokeWidth="3"
          strokeDasharray={`${(hpPercent / 100) * 2 * Math.PI * ((size / 2) - 2)} ${2 * Math.PI * ((size / 2) - 2)}`}
          style={{ transition: 'stroke-dasharray 0.3s' }}
        />
      </svg>
    </div>
  );
}

// Main Token Generator Component
function CombatTokenGenerator({ 
  combatants, 
  onTokensGenerated,
  campaignId 
}) {
  const [tokens, setTokens] = useState({});
  const [generating, setGenerating] = useState({});
  const [generatedAll, setGeneratedAll] = useState(false);
  
  // Check for existing tokens in DB on mount
  useEffect(() => {
    loadExistingTokens();
  }, [combatants]);
  
  const loadExistingTokens = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/tokens`);
      const existingTokens = {};
      (response.data || []).forEach(t => {
        existingTokens[t.entity_id] = t.image_url;
      });
      setTokens(existingTokens);
    } catch (error) {
      // Tokens endpoint might not exist yet
      console.log('No existing tokens found');
    }
  };
  
  const generateToken = async (combatant) => {
    setGenerating(prev => ({ ...prev, [combatant.id]: true }));
    
    try {
      // Build prompt for token art
      const creatureType = combatant.type || 'creature';
      const prompt = `Fantasy RPG circular token portrait of a ${combatant.name}, ${creatureType}, dramatic lighting, detailed, dark fantasy style, facing forward, head and shoulders, suitable for battle map token`;
      
      const response = await axios.post(`${API}/ai/generate-token`, {
        entity_id: combatant.id,
        entity_name: combatant.name,
        entity_type: combatant.type || 'enemy',
        campaign_id: campaignId,
        prompt
      });
      
      if (response.data.image_url) {
        setTokens(prev => ({
          ...prev,
          [combatant.id]: response.data.image_url
        }));
        toast.success(`Token generated for ${combatant.name}!`);
      }
    } catch (error) {
      console.error('Failed to generate token:', error);
      toast.error(`Failed to generate token for ${combatant.name}`);
    } finally {
      setGenerating(prev => ({ ...prev, [combatant.id]: false }));
    }
  };
  
  const generateAllTokens = async () => {
    setGeneratedAll(true);
    
    // Filter combatants without tokens
    const needsToken = combatants.filter(c => !tokens[c.id]);
    
    for (const combatant of needsToken) {
      await generateToken(combatant);
      // Small delay between generations
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (onTokensGenerated) {
      onTokensGenerated(tokens);
    }
  };
  
  const getTokenData = () => {
    return combatants.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type || 'enemy',
      imageUrl: tokens[c.id] || null,
      x: c.x || 100 + (combatants.indexOf(c) * 60),
      y: c.y || 100,
      size: c.size || 50,
      hp: c.hp,
      maxHp: c.maxHp,
      isEnemy: c.isEnemy ?? c.type !== 'player'
    }));
  };
  
  return (
    <div style={{
      background: 'rgba(10, 10, 46, 0.8)',
      border: '2px solid #374151',
      borderRadius: '14px',
      padding: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ 
          color: '#fff', 
          fontSize: '16px', 
          fontWeight: '400',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Image size={18} style={{ color: '#a855f7' }} />
          Combat Tokens
        </h3>
        <Button
          onClick={generateAllTokens}
          disabled={generatedAll && Object.keys(generating).every(k => !generating[k])}
          style={{
            padding: '8px 14px',
            background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px'
          }}
        >
          <Sparkles size={14} />
          Generate All Tokens
        </Button>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '12px'
      }}>
        {combatants.map(combatant => (
          <div 
            key={combatant.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div style={{ position: 'relative' }}>
              {tokens[combatant.id] ? (
                <AIToken
                  name={combatant.name}
                  imageUrl={tokens[combatant.id]}
                  size={60}
                  type={combatant.type || 'enemy'}
                  hp={combatant.hp}
                  maxHp={combatant.maxHp}
                  isLoading={generating[combatant.id]}
                />
              ) : (
                <SimpleToken
                  name={combatant.name}
                  size={60}
                  type={combatant.type || 'enemy'}
                  hp={combatant.hp}
                  maxHp={combatant.maxHp}
                />
              )}
              
              {/* Generate/Regenerate button */}
              <button
                onClick={() => generateToken(combatant)}
                disabled={generating[combatant.id]}
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: tokens[combatant.id] ? '#374151' : '#a855f7',
                  border: '2px solid #1e1e3e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={tokens[combatant.id] ? 'Regenerate token' : 'Generate token'}
              >
                {generating[combatant.id] ? (
                  <Loader2 size={12} color="#fff" className="animate-spin" />
                ) : tokens[combatant.id] ? (
                  <RefreshCw size={12} color="#94a3b8" />
                ) : (
                  <Sparkles size={12} color="#fff" />
                )}
              </button>
            </div>
            
            <span style={{ 
              color: '#94a3b8', 
              fontSize: '10px',
              textAlign: 'center',
              maxWidth: '70px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {combatant.name}
            </span>
          </div>
        ))}
      </div>
      
      {combatants.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '30px', 
          color: '#64748b' 
        }}>
          <Image size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No combatants to generate tokens for</p>
        </div>
      )}
    </div>
  );
}

// Export utilities
export { SimpleToken, AIToken, generateCreatureColor };
export default CombatTokenGenerator;
