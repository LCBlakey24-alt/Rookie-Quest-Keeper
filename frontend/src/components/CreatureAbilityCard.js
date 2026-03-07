import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sword, Zap, Sparkles, Target, BookOpen, ChevronDown, ChevronUp,
  Wand2, Shield, Flame, Snowflake, Skull, Wind
} from 'lucide-react';

// Parse abilities/attacks from creature data
function parseAbilities(creature) {
  const abilities = [];
  const text = creature.abilities || creature.actions || '';
  
  if (!text) return abilities;
  
  // Split by common delimiters
  const lines = text.split(/[.;]|\n/).filter(l => l.trim().length > 5);
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Extract dice notation
    const diceRegex = /(\d+)d(\d+)([+-]\d+)?/gi;
    const diceMatches = [];
    let match;
    while ((match = diceRegex.exec(trimmed)) !== null) {
      diceMatches.push({
        original: match[0],
        count: parseInt(match[1]),
        sides: parseInt(match[2]),
        modifier: match[3] ? parseInt(match[3]) : 0
      });
    }
    
    // Extract to-hit bonus
    const toHitMatch = trimmed.match(/([+-]?\d+)\s*to\s*hit/i);
    const toHitBonus = toHitMatch ? parseInt(toHitMatch[1]) : null;
    
    // Extract ability name
    const nameMatch = trimmed.match(/^([A-Za-z\s]+?)[\s:(-]/);
    let name = nameMatch ? nameMatch[1].trim() : `Ability ${idx + 1}`;
    
    // Detect ability type
    let type = 'action';
    let icon = 'sword';
    
    if (/multiattack/i.test(name)) {
      type = 'multiattack';
      icon = 'swords';
    } else if (/spell|cast|magic/i.test(trimmed)) {
      type = 'spell';
      icon = 'wand';
    } else if (/breath|fire|flame/i.test(trimmed)) {
      type = 'breath';
      icon = 'flame';
    } else if (/ice|cold|frost/i.test(trimmed)) {
      type = 'breath';
      icon = 'snowflake';
    } else if (/poison|necrotic|death/i.test(trimmed)) {
      type = 'special';
      icon = 'skull';
    } else if (/lightning|thunder/i.test(trimmed)) {
      type = 'breath';
      icon = 'zap';
    } else if (/bite|claw|slam|fist|tail|gore|sting/i.test(name.toLowerCase())) {
      type = 'melee';
      icon = 'sword';
    } else if (/bow|crossbow|throw|ranged/i.test(trimmed)) {
      type = 'ranged';
      icon = 'target';
    }
    
    abilities.push({
      id: `ability-${idx}`,
      name: name.substring(0, 25),
      description: trimmed.substring(0, 200),
      type,
      icon,
      toHitBonus,
      dice: diceMatches,
      hasDice: diceMatches.length > 0
    });
  });
  
  return abilities;
}

// Roll dice utility
function rollDice(count, sides, modifier = 0) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, total };
}

// Icon component selector
function AbilityIcon({ icon, size = 14, color = '#fff' }) {
  const iconMap = {
    sword: Sword,
    swords: Zap,
    wand: Wand2,
    flame: Flame,
    snowflake: Snowflake,
    skull: Skull,
    zap: Zap,
    target: Target,
    wind: Wind
  };
  const IconComponent = iconMap[icon] || Sword;
  return <IconComponent size={size} color={color} />;
}

function CreatureAbilityCard({ creature, onRollResult, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [rolling, setRolling] = useState(null);
  
  const abilities = parseAbilities(creature);
  
  if (abilities.length === 0) {
    return null;
  }
  
  const handleRoll = (ability) => {
    setRolling(ability.id);
    
    // Simulate roll animation
    setTimeout(() => {
      const results = [];
      
      // Roll to hit if applicable
      if (ability.toHitBonus !== null) {
        const hitRoll = Math.floor(Math.random() * 20) + 1;
        const hitTotal = hitRoll + ability.toHitBonus;
        results.push({
          type: 'attack',
          roll: hitRoll,
          bonus: ability.toHitBonus,
          total: hitTotal,
          isCrit: hitRoll === 20,
          isFumble: hitRoll === 1
        });
      }
      
      // Roll damage dice
      ability.dice.forEach(d => {
        const damageRoll = rollDice(d.count, d.sides, d.modifier);
        results.push({
          type: 'damage',
          dice: d.original,
          rolls: damageRoll.rolls,
          total: damageRoll.total
        });
      });
      
      const totalDamage = results
        .filter(r => r.type === 'damage')
        .reduce((sum, r) => sum + r.total, 0);
      
      const rollResult = {
        ability: ability.name,
        creature: creature.name,
        results,
        totalDamage,
        timestamp: new Date().toISOString()
      };
      
      setLastRoll(rollResult);
      setRolling(null);
      
      if (onRollResult) {
        onRollResult(rollResult);
      }
    }, 300);
  };
  
  const getTypeColor = (type) => {
    switch (type) {
      case 'multiattack': return '#a855f7';
      case 'spell': return '#3b82f6';
      case 'breath': return '#f97316';
      case 'special': return '#22c55e';
      case 'ranged': return '#06b6d4';
      default: return '#ef4444';
    }
  };

  if (compact) {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px',
        marginTop: '8px'
      }}>
        <div 
          onClick={() => setExpanded(!expanded)}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={12} />
            {abilities.length} Abilities
          </span>
          {expanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
        </div>
        
        {expanded && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {abilities.map(ability => (
              <button
                key={ability.id}
                onClick={() => ability.hasDice && handleRoll(ability)}
                disabled={!ability.hasDice || rolling === ability.id}
                style={{
                  padding: '4px 8px',
                  background: `${getTypeColor(ability.type)}20`,
                  border: `1px solid ${getTypeColor(ability.type)}`,
                  borderRadius: '6px',
                  color: ability.hasDice ? getTypeColor(ability.type) : '#64748b',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: ability.hasDice ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: rolling === ability.id ? 0.6 : 1
                }}
                title={ability.description}
              >
                <AbilityIcon icon={ability.icon} size={10} color={getTypeColor(ability.type)} />
                {ability.name}
                {ability.hasDice && (
                  <span style={{ opacity: 0.7 }}>
                    {ability.dice.map(d => d.original).join('+')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        
        {lastRoll && expanded && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            fontSize: '11px'
          }}>
            <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
              {lastRoll.ability}
            </div>
            {lastRoll.results.map((r, i) => (
              <div key={i} style={{ color: '#94a3b8' }}>
                {r.type === 'attack' && (
                  <span style={{ color: r.isCrit ? '#eab308' : r.total >= 15 ? '#22c55e' : '#fff' }}>
                    Attack: {r.roll}+{r.bonus}={r.total} {r.isCrit && '(CRIT!)'}
                  </span>
                )}
                {r.type === 'damage' && (
                  <span>
                    {r.dice}: [{r.rolls.join(',')}]={r.total}
                  </span>
                )}
              </div>
            ))}
            {lastRoll.totalDamage > 0 && (
              <div style={{ color: '#ef4444', fontWeight: '700', marginTop: '4px' }}>
                Total: {lastRoll.totalDamage} damage
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.4)',
      border: '2px solid #374151',
      borderRadius: '12px',
      padding: '14px',
      marginTop: '12px'
    }}>
      <h4 style={{ 
        color: '#ef4444', 
        fontSize: '14px', 
        fontWeight: '700', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Sparkles size={16} />
        Abilities & Actions
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {abilities.map(ability => (
          <div
            key={ability.id}
            style={{
              padding: '10px 12px',
              background: `${getTypeColor(ability.type)}10`,
              border: `1px solid ${getTypeColor(ability.type)}40`,
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: `${getTypeColor(ability.type)}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AbilityIcon icon={ability.icon} size={14} color={getTypeColor(ability.type)} />
                </div>
                <span style={{ color: '#fff', fontWeight: '700', fontSize: '13px' }}>
                  {ability.name}
                </span>
                <span style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  background: `${getTypeColor(ability.type)}30`,
                  color: getTypeColor(ability.type),
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  {ability.type}
                </span>
              </div>
              <p style={{ 
                color: '#94a3b8', 
                fontSize: '11px', 
                lineHeight: '1.4',
                margin: 0
              }}>
                {ability.description}
              </p>
              {ability.toHitBonus !== null && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#67e8f9' }}>
                  <Target size={10} style={{ display: 'inline', marginRight: '4px' }} />
                  {ability.toHitBonus >= 0 ? '+' : ''}{ability.toHitBonus} to hit
                  {ability.dice.length > 0 && (
                    <span style={{ marginLeft: '8px', color: '#ef4444' }}>
                      {ability.dice.map(d => d.original).join(' + ')} damage
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {ability.hasDice && (
              <Button
                onClick={() => handleRoll(ability)}
                disabled={rolling === ability.id}
                data-testid={`roll-ability-${ability.id}`}
                style={{
                  padding: '8px 12px',
                  background: rolling === ability.id 
                    ? 'rgba(100, 100, 100, 0.3)'
                    : `linear-gradient(180deg, ${getTypeColor(ability.type)} 0%, ${getTypeColor(ability.type)}cc 100%)`,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 15px ${getTypeColor(ability.type)}40`
                }}
              >
                <Zap size={12} />
                {rolling === ability.id ? 'Rolling...' : 'Roll'}
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {/* Last Roll Result */}
      {lastRoll && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid #ef4444',
          borderRadius: '10px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px' }}>
              {lastRoll.ability} Result
            </span>
            {lastRoll.results.some(r => r.isCrit) && (
              <span style={{
                background: '#eab308',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '800'
              }}>
                CRITICAL HIT!
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {lastRoll.results.map((r, i) => (
              <div key={i} style={{
                padding: '6px 10px',
                background: r.type === 'attack' 
                  ? (r.isCrit ? 'rgba(234, 179, 8, 0.3)' : 'rgba(59, 130, 246, 0.3)')
                  : 'rgba(239, 68, 68, 0.3)',
                border: `1px solid ${r.type === 'attack' ? (r.isCrit ? '#eab308' : '#3b82f6') : '#ef4444'}`,
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                {r.type === 'attack' ? (
                  <span style={{ color: r.isCrit ? '#eab308' : '#3b82f6' }}>
                    d20: {r.roll} + {r.bonus} = <strong>{r.total}</strong>
                  </span>
                ) : (
                  <span style={{ color: '#ef4444' }}>
                    {r.dice}: [{r.rolls.join(', ')}] = <strong>{r.total}</strong>
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {lastRoll.totalDamage > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>
                Total Damage
              </span>
              <span style={{ 
                color: '#fff', 
                fontSize: '22px', 
                fontWeight: '800',
                fontFamily: 'Montserrat'
              }}>
                {lastRoll.totalDamage}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CreatureAbilityCard;
