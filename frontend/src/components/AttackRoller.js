import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sword, Target, Sparkles, Dices, X, Check, Shield, Zap } from 'lucide-react';
import DiceRollFlicker from './DiceRollFlicker';

// Parse dice notation from ability text
function parseDiceFromText(text) {
  if (!text) return [];
  
  // Match patterns like "2d6+4", "1d8", "3d10-2", "1d20+5"
  const diceRegex = /(\d+)d(\d+)([+-]\d+)?/gi;
  const matches = [];
  let match;
  
  while ((match = diceRegex.exec(text)) !== null) {
    matches.push({
      original: match[0],
      count: parseInt(match[1]),
      sides: parseInt(match[2]),
      modifier: match[3] ? parseInt(match[3]) : 0
    });
  }
  
  return matches;
}

// Roll dice
function rollDice(count, sides, modifier = 0) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { rolls, total, modifier };
}

// Parse abilities/attacks from creature data
function parseAttacks(creature) {
  const attacks = [];
  const abilitiesText = creature.abilities || creature.actions || '';
  
  // Common attack patterns
  const attackPatterns = [
    { regex: /multiattack[:\s]*([^.]+)/gi, isMultiattack: true },
    { regex: /(bite|claw|slam|tail|gore|sting|tentacle|fist|weapon|sword|greataxe|longsword|shortsword|dagger|spear|club|mace|quarterstaff|crossbow|longbow|shortbow)[:\s]*[^.]*?(\d+d\d+[+-]?\d*)[^.]*/gi, isMultiattack: false },
    { regex: /(breath|fire|ice|poison|acid|lightning|thunder|necrotic|radiant)[^.]*?(\d+d\d+)[^.]*/gi, isMultiattack: false },
  ];
  
  // Extract attack names and their dice
  const lines = abilitiesText.split(/[.,;]|\n/).filter(l => l.trim());
  
  lines.forEach(line => {
    const dice = parseDiceFromText(line);
    if (dice.length > 0) {
      // Try to extract attack name
      const nameMatch = line.match(/^([A-Za-z\s]+?)[\s:(-]/);
      const name = nameMatch ? nameMatch[1].trim() : line.substring(0, 20).trim();
      
      // Check if it contains "to hit" for attack rolls
      const toHitMatch = line.match(/([+-]?\d+)\s*to\s*hit/i);
      const toHitBonus = toHitMatch ? parseInt(toHitMatch[1]) : 0;
      
      attacks.push({
        name: name || 'Attack',
        description: line.trim(),
        toHitBonus: toHitBonus,
        damageDice: dice,
        isMultiattack: /multiattack/i.test(name)
      });
    }
  });
  
  // If no attacks found but creature has abilities, create a generic attack
  if (attacks.length === 0 && abilitiesText) {
    const genericDice = parseDiceFromText(abilitiesText);
    if (genericDice.length > 0) {
      attacks.push({
        name: 'Attack',
        description: abilitiesText.substring(0, 100),
        toHitBonus: 0,
        damageDice: genericDice,
        isMultiattack: false
      });
    }
  }
  
  return attacks;
}

function AttackRoller({ creature, onDamageApplied, onClose }) {
  const [targetAC, setTargetAC] = useState('');
  const [attackResults, setAttackResults] = useState(null);
  const [damageResults, setDamageResults] = useState(null);
  const [numAttacks, setNumAttacks] = useState(1);
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [critAnimation, setCritAnimation] = useState(false);
  const [rollFlicker, setRollFlicker] = useState(null);
  
  const attacks = parseAttacks(creature);

  // Trigger crit animation
  useEffect(() => {
    if (attackResults && attackResults.some(r => r.isCrit)) {
      setCritAnimation(true);
      const timer = setTimeout(() => setCritAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [attackResults]);

  const rollToHit = () => {
    if (!targetAC || !selectedAttack) return;
    
    const ac = parseInt(targetAC);
    const results = [];
    
    for (let i = 0; i < numAttacks; i++) {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + selectedAttack.toHitBonus;
      const isCrit = roll === 20;
      const isFumble = roll === 1;
      const hits = isCrit || (!isFumble && total >= ac);
      
      results.push({
        attackNum: i + 1,
        roll,
        bonus: selectedAttack.toHitBonus,
        total,
        targetAC: ac,
        hits,
        isCrit,
        isFumble
      });
    }
    
    setAttackResults(results);
    setDamageResults(null);
    const displayRoll = results[results.length - 1];
    setRollFlicker({
      label: results.length > 1 ? `${selectedAttack.name} attacks` : `${selectedAttack.name} attack`,
      rolls: [{ sides: 20, result: displayRoll.roll }],
      modifier: displayRoll.bonus,
      total: displayRoll.total,
      isCrit: displayRoll.isCrit,
      isFumble: displayRoll.isFumble,
    });
  };

  const rollDamage = () => {
    if (!attackResults || !selectedAttack) return;
    
    const hits = attackResults.filter(r => r.hits);
    if (hits.length === 0) {
      setDamageResults({ totalDamage: 0, rolls: [], message: 'No attacks hit!' });
      return;
    }
    
    let totalDamage = 0;
    const rolls = [];
    
    hits.forEach((hit, idx) => {
      const attackRolls = [];
      let attackDamage = 0;
      
      selectedAttack.damageDice.forEach(dice => {
        // Double dice on crit
        const diceCount = hit.isCrit ? dice.count * 2 : dice.count;
        const result = rollDice(diceCount, dice.sides, dice.modifier);
        attackRolls.push({
          dice: `${diceCount}d${dice.sides}${dice.modifier >= 0 ? '+' : ''}${dice.modifier || ''}`,
          rolls: result.rolls,
          total: result.total,
          isCrit: hit.isCrit
        });
        attackDamage += result.total;
      });
      
      rolls.push({
        attackNum: hit.attackNum,
        isCrit: hit.isCrit,
        damage: attackDamage,
        details: attackRolls
      });
      
      totalDamage += attackDamage;
    });
    
    const nextDamageResults = {
      totalDamage,
      rolls,
      hitsCount: hits.length,
      critsCount: hits.filter(h => h.isCrit).length
    };

    setDamageResults(nextDamageResults);
    setRollFlicker({
      label: `${selectedAttack.name} damage`,
      rolls: rolls.flatMap(attack => attack.details.flatMap(detail => {
        const sides = Number(detail.dice.match(/d(\d+)/i)?.[1]) || 6;
        return detail.rolls.map(result => ({ sides, result }));
      })),
      modifier: 0,
      total: totalDamage,
      isCrit: nextDamageResults.critsCount > 0,
      isFumble: false,
    });
  };

  const applyDamage = () => {
    if (damageResults && onDamageApplied) {
      onDamageApplied(damageResults.totalDamage);
    }
  };

  const resetRolls = () => {
    setAttackResults(null);
    setDamageResults(null);
    setTargetAC('');
  };

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.95)',
      border: '2px solid #ef4444',
      borderRadius: '16px',
      padding: '20px',
      marginTop: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#ef4444', fontSize: '16px', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sword size={18} /> {creature.name}'s Attacks
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#64748b" />
        </button>
      </div>

      {/* Crit Animation Overlay */}
      {critAnimation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'critFlash 1s ease-out'
        }}>
          <div style={{
            fontSize: '120px',
            fontWeight: '800',
            color: '#eab308',
            textShadow: '0 0 40px #eab308, 0 0 80px #eab308',
            animation: 'critPulse 1s ease-out',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            CRITICAL!
          </div>
        </div>
      )}

      {/* Attack Selection */}
      {attacks.length > 0 ? (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Select Attack:</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {attacks.map((attack, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedAttack(attack);
                  resetRolls();
                }}
                data-testid={`attack-option-${idx}`}
                style={{
                  padding: '10px 14px',
                  background: selectedAttack === attack ? 'rgba(239, 68, 68, 0.3)' : 'rgba(30, 30, 60, 0.6)',
                  border: `2px solid ${selectedAttack === attack ? '#ef4444' : '#374151'}`,
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '400',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div>{attack.name}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  {attack.toHitBonus >= 0 ? '+' : ''}{attack.toHitBonus} to hit • {attack.damageDice.map(d => d.original).join(' + ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px', textAlign: 'center', padding: '20px' }}>
          No attacks found. Add abilities to this creature with dice notation (e.g., "Bite: +5 to hit, 2d6+3 damage")
        </div>
      )}

      {selectedAttack && (
        <>
          {/* Attack Configuration */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '12px', 
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(30, 30, 60, 0.5)',
            borderRadius: '10px'
          }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Target AC
              </label>
              <Input
                type="number"
                value={targetAC}
                onChange={(e) => setTargetAC(e.target.value)}
                placeholder="Enter AC"
                data-testid="target-ac-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                <Dices size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Number of Attacks
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={numAttacks}
                onChange={(e) => setNumAttacks(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                data-testid="num-attacks-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Roll to Hit Button */}
          <Button
            onClick={rollToHit}
            disabled={!targetAC}
            data-testid="roll-to-hit-btn"
            style={{
              width: '100%',
              padding: '14px',
              marginBottom: '12px',
              background: targetAC ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)' : undefined,
              opacity: targetAC ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '400',
              fontSize: '14px'
            }}
          >
            <Target size={18} /> Roll to Hit ({numAttacks} attack{numAttacks > 1 ? 's' : ''})
          </Button>

          {/* Attack Results */}
          {attackResults && (
            <div style={{
              background: 'rgba(30, 30, 60, 0.6)',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '12px'
            }}>
              <h4 style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '400', marginBottom: '10px' }}>
                Attack Results vs AC {targetAC}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {attackResults.map((result, idx) => (
                  <div
                    key={idx}
                    data-testid={`attack-result-${idx}`}
                    className={result.isCrit ? 'crit-shake' : ''}
                    style={{
                      padding: '10px 14px',
                      background: result.isCrit ? 'rgba(234, 179, 8, 0.2)' : result.hits ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: `2px solid ${result.isCrit ? '#eab308' : result.hits ? '#F59E0B' : '#ef4444'}`,
                      borderRadius: '10px',
                      textAlign: 'center',
                      minWidth: '80px',
                      position: 'relative',
                      boxShadow: result.isCrit ? '0 0 30px rgba(234, 179, 8, 0.6)' : 'none',
                      animation: result.isCrit ? 'critGlow 0.5s ease-in-out infinite alternate' : 'none'
                    }}
                  >
                    {result.isCrit && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        animation: 'critSpin 2s linear infinite'
                      }}>
                        <Zap size={20} color="#eab308" fill="#eab308" />
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '800', 
                      color: result.isCrit ? '#eab308' : result.hits ? '#F59E0B' : '#ef4444',
                      fontFamily: 'Montserrat'
                    }}>
                      {result.total}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {result.roll} + {result.bonus}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '400',
                      marginTop: '4px',
                      color: result.isCrit ? '#eab308' : result.hits ? '#F59E0B' : '#ef4444'
                    }}>
                      {result.isCrit ? 'CRIT!' : result.isFumble ? 'FUMBLE!' : result.hits ? 'HIT' : 'MISS'}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {attackResults.filter(r => r.hits).length} of {attackResults.length} attacks hit
                  {attackResults.some(r => r.isCrit) && ` (${attackResults.filter(r => r.isCrit).length} critical!)`}
                </span>
              </div>
            </div>
          )}

          {/* Roll Damage Button */}
          {attackResults && attackResults.some(r => r.hits) && (
            <Button
              onClick={rollDamage}
              data-testid="roll-damage-btn"
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '12px',
                background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '400',
                fontSize: '14px',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)'
              }}
            >
              <Sparkles size={18} /> Roll Damage ({attackResults.filter(r => r.hits).length} hit{attackResults.filter(r => r.hits).length > 1 ? 's' : ''})
            </Button>
          )}

          {/* Damage Results */}
          {damageResults && damageResults.rolls && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '14px'
            }}>
              <h4 style={{ color: '#ef4444', fontSize: '13px', fontWeight: '400', marginBottom: '10px' }}>
                Damage Results
              </h4>
              
              {damageResults.rolls.map((roll, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '8px', 
                  padding: '8px', 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: '8px',
                  borderLeft: roll.isCrit ? '3px solid #eab308' : '3px solid #ef4444'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      Attack #{roll.attackNum} {roll.isCrit && '(CRITICAL!)'}
                    </span>
                    <span style={{ color: roll.isCrit ? '#eab308' : '#ef4444', fontWeight: '400', fontSize: '16px' }}>
                      {roll.damage} damage
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    {roll.details.map((d, i) => (
                      <span key={i}>
                        {d.dice}: [{d.rolls.join(', ')}] = {d.total}
                        {i < roll.details.length - 1 ? ' + ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Total Damage */}
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '400' }}>
                  TOTAL DAMAGE
                </span>
                <span style={{ 
                  color: '#fff', 
                  fontSize: '28px', 
                  fontWeight: '800',
                  fontFamily: 'Montserrat',
                  textShadow: '0 0 20px rgba(255,255,255,0.5)'
                }}>
                  {damageResults.totalDamage}
                </span>
              </div>
              
              {onDamageApplied && (
                <Button
                  onClick={applyDamage}
                  data-testid="apply-damage-btn"
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '12px',
                    background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} /> Apply {damageResults.totalDamage} Damage to Target
                </Button>
              )}
            </div>
          )}

          {/* Reset Button */}
          {(attackResults || damageResults) && (
            <Button
              onClick={resetRolls}
              className="btn-outline"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Reset & Roll Again
            </Button>
          )}
        </>
      )}
      
      {/* CSS Animations for Crit Effects */}
      <style>{`
        @keyframes critFlash {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { 
            opacity: 1;
            background: radial-gradient(circle, rgba(234, 179, 8, 0.3) 0%, transparent 70%);
          }
        }
        
        @keyframes critPulse {
          0% { 
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        
        @keyframes critGlow {
          0% {
            box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);
          }
          100% {
            box-shadow: 0 0 40px rgba(234, 179, 8, 0.8);
          }
        }
        
        @keyframes critSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .crit-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
      <DiceRollFlicker
        isOpen={!!rollFlicker}
        onClose={() => setRollFlicker(null)}
        rolls={rollFlicker?.rolls || []}
        label={rollFlicker?.label}
        modifier={rollFlicker?.modifier || 0}
        total={rollFlicker?.total || 0}
        isCrit={rollFlicker?.isCrit}
        isFumble={rollFlicker?.isFumble}
        theme="gm"
      />
    </div>
  );
}

export default AttackRoller;
