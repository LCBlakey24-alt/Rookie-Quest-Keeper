import React, { useState, useEffect } from 'react';
import { Users, Skull, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// XP Thresholds by Level (from TTRPG 5e system)
const XP_THRESHOLDS = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 }
};

// Encounter multipliers based on number of monsters
const ENCOUNTER_MULTIPLIERS = {
  1: 1,
  2: 1.5,
  '3-6': 2,
  '7-10': 2.5,
  '11-14': 3,
  '15+': 4
};

function EncounterDifficultyCalculator({ monsters = [], partySize = 4, partyLevel = 5 }) {
  const [difficulty, setDifficulty] = useState(null);
  const [manualPartySize, setManualPartySize] = useState(partySize);
  const [manualPartyLevel, setManualPartyLevel] = useState(partyLevel);

  useEffect(() => {
    calculateDifficulty();
  }, [monsters, manualPartySize, manualPartyLevel]);

  const getMultiplier = (monsterCount) => {
    if (monsterCount <= 1) return 1;
    if (monsterCount === 2) return 1.5;
    if (monsterCount <= 6) return 2;
    if (monsterCount <= 10) return 2.5;
    if (monsterCount <= 14) return 3;
    return 4;
  };

  const calculateDifficulty = () => {
    const level = Math.min(20, Math.max(1, manualPartyLevel));
    const size = Math.max(1, manualPartySize);
    
    // Get party thresholds
    const thresholds = XP_THRESHOLDS[level];
    const partyEasy = thresholds.easy * size;
    const partyMedium = thresholds.medium * size;
    const partyHard = thresholds.hard * size;
    const partyDeadly = thresholds.deadly * size;

    // Calculate total monster XP
    let totalBaseXP = 0;
    let monsterCount = 0;
    
    monsters.forEach(monster => {
      const count = monster.count || 1;
      const xp = monster.xp || 0;
      totalBaseXP += xp * count;
      monsterCount += count;
    });

    // Apply encounter multiplier
    const multiplier = getMultiplier(monsterCount);
    const adjustedXP = Math.floor(totalBaseXP * multiplier);

    // Determine difficulty
    let difficultyLevel = 'trivial';
    let color = '#F59E0B';
    let icon = CheckCircle;
    
    if (adjustedXP >= partyDeadly) {
      difficultyLevel = 'deadly';
      color = '#ef4444';
      icon = Skull;
    } else if (adjustedXP >= partyHard) {
      difficultyLevel = 'hard';
      color = '#f97316';
      icon = AlertTriangle;
    } else if (adjustedXP >= partyMedium) {
      difficultyLevel = 'medium';
      color = '#eab308';
      icon = Info;
    } else if (adjustedXP >= partyEasy) {
      difficultyLevel = 'easy';
      color = '#F59E0B';
      icon = CheckCircle;
    }

    setDifficulty({
      level: difficultyLevel,
      color,
      icon,
      totalBaseXP,
      adjustedXP,
      multiplier,
      monsterCount,
      thresholds: {
        easy: partyEasy,
        medium: partyMedium,
        hard: partyHard,
        deadly: partyDeadly
      }
    });
  };

  const DifficultyIcon = difficulty?.icon || CheckCircle;

  return (
    <div style={{
      background: 'rgba(10, 10, 40, 0.6)',
      border: '2px solid #1e40af',
      borderRadius: '12px',
      padding: '16px'
    }}>
      <h3 style={{ 
        color: '#4a7dff', 
        fontSize: '14px', 
        fontWeight: '400', 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Users size={18} />
        Encounter Difficulty
      </h3>

      {/* Party Settings */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
            Party Size
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={manualPartySize}
            onChange={(e) => setManualPartySize(parseInt(e.target.value) || 1)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid #374151',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '400',
              textAlign: 'center'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
            Avg Level
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={manualPartyLevel}
            onChange={(e) => setManualPartyLevel(parseInt(e.target.value) || 1)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid #374151',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '400',
              textAlign: 'center'
            }}
          />
        </div>
      </div>

      {/* Difficulty Result */}
      {difficulty && (
        <>
          <div style={{
            padding: '16px',
            background: `${difficulty.color}15`,
            border: `3px solid ${difficulty.color}`,
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <DifficultyIcon size={32} color={difficulty.color} style={{ marginBottom: '8px' }} />
            <p style={{ 
              color: difficulty.color, 
              fontSize: '24px', 
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              {difficulty.level}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
              {difficulty.adjustedXP.toLocaleString()} adjusted XP
              {difficulty.multiplier > 1 && (
                <span style={{ color: '#64748b' }}> (x{difficulty.multiplier} multiplier)</span>
              )}
            </p>
          </div>

          {/* XP Thresholds */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
              Party XP Thresholds
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { label: 'Easy', value: difficulty.thresholds.easy, color: '#F59E0B' },
                { label: 'Medium', value: difficulty.thresholds.medium, color: '#eab308' },
                { label: 'Hard', value: difficulty.thresholds.hard, color: '#f97316' },
                { label: 'Deadly', value: difficulty.thresholds.deadly, color: '#ef4444' }
              ].map(t => (
                <div key={t.label} style={{
                  padding: '8px 4px',
                  background: difficulty.level === t.label.toLowerCase() ? `${t.color}30` : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${difficulty.level === t.label.toLowerCase() ? t.color : '#374151'}`,
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: t.color, fontSize: '10px', fontWeight: '400' }}>{t.label}</p>
                  <p style={{ color: '#fff', fontSize: '12px', fontWeight: '400' }}>{t.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monster Summary */}
          <div style={{
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <span style={{ color: '#64748b' }}>
              <Skull size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {difficulty.monsterCount} monster{difficulty.monsterCount !== 1 ? 's' : ''}
            </span>
            <span style={{ color: '#94a3b8' }}>
              Base XP: {difficulty.totalBaseXP.toLocaleString()}
            </span>
          </div>
        </>
      )}

      {monsters.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          <Skull size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <p style={{ fontSize: '12px' }}>Add monsters to calculate difficulty</p>
        </div>
      )}
    </div>
  );
}

export default EncounterDifficultyCalculator;
