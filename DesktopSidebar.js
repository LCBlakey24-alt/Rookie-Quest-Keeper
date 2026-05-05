import React from 'react';
import { Star, Shield, Sword, Globe } from 'lucide-react';

const AbilityBlock = ({ label, score, theme, skills = [], character }) => {
  const mod = Math.floor((score - 10) / 2);
  const modStr = mod >= 0 ? `+${mod}` : mod;
  const profBonus = character.proficiency_bonus || 2;

  // Helper to determine skill modifier
  const getSkillMod = (skillName) => {
    const skillData = character.skills?.[skillName.toLowerCase()];
    let total = mod;
    if (skillData?.proficient) total += profBonus;
    if (skillData?.expertise) total += profBonus;
    return total >= 0 ? `+${total}` : total;
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${theme.border}44`,
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '12px',
      transition: 'transform 0.2s',
      cursor: 'default'
    }}>
      {/* Main Stat Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}33`, paddingBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          <span style={{ fontSize: '11px', color: theme.text.primary, opacity: 0.8 }}>Score: {score}</span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: '900', color: theme.accent || '#D4A017' }}>{modStr}</div>
      </div>

      {/* Nested Skills */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          {skills.map(skill => {
            const isProficient = character.skills?.[skill.toLowerCase()]?.proficient;
            const isExpert = character.skills?.[skill.toLowerCase()]?.expertise;
            
            return (
              <div key={skill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    border: `1px solid ${theme.accent}`,
                    background: isProficient ? theme.accent : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isExpert && <Star size={4} color="#0A1628" fill="#0A1628" />}
                  </div>
                  <span style={{ color: theme.text.primary, opacity: isProficient ? 1 : 0.6 }}>{skill}</span>
                </div>
                <span style={{ fontWeight: '700', color: isProficient ? theme.accent : theme.text.muted }}>
                  {getSkillMod(skill)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DesktopSidebar = ({ character, theme }) => {
  const abilityData = [
    { label: 'Strength', key: 'strength', skills: ['Athletics'] },
    { label: 'Dexterity', key: 'dexterity', skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'] },
    { label: 'Constitution', key: 'constitution', skills: [] },
    { label: 'Intelligence', key: 'intelligence', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'] },
    { label: 'Wisdom', key: 'wisdom', skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'] },
    { label: 'Charisma', key: 'charisma', skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'] },
  ];

  return (
    <aside style={{
      width: '320px',
      background: 'rgba(3, 0, 20, 0.5)',
      borderRight: `1px solid ${theme.border}`,
      padding: '32px 24px',
      height: '100%',
      overflowY: 'auto',
      scrollbarWidth: 'none'
    }}>
      <h3 style={{ fontSize: '12px', fontWeight: '800', color: theme.accent, textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>
        Abilities & Skills
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {abilityData.map(a => (
          <AbilityBlock 
            key={a.key} 
            label={a.label} 
            score={character[a.key] || 10} 
            skills={a.skills} 
            theme={theme}
            character={character}
          />
        ))}
      </div>

      {/* Passive Scores */}
      <div style={{ 
        background: 'rgba(212,160,23,0.05)', 
        borderRadius: '8px', 
        padding: '16px',
        border: `1px solid ${theme.accent}33`
      }}>
        {[
          { label: 'Passive Perception', val: 14 },
          { label: 'Passive Investigation', val: 12 },
          { label: 'Passive Insight', val: 15 }
        ].map(p => (
          <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: theme.text.muted }}>{p.label}</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: theme.accent }}>{p.val}</span>
          </div>
        ))}
      </div>

      {/* Proficiencies & Languages */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: '800', color: theme.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.1em' }}>
          Training
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Shield size={14} color={theme.text.muted} />
            <div>
              <div style={{ fontSize: '10px', color: theme.text.muted, fontWeight: '700' }}>ARMOR</div>
              <div style={{ fontSize: '12px', color: theme.text.primary }}>Light, Medium, Shields</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Sword size={14} color={theme.text.muted} />
            <div>
              <div style={{ fontSize: '10px', color: theme.text.muted, fontWeight: '700' }}>WEAPONS</div>
              <div style={{ fontSize: '12px', color: theme.text.primary }}>Simple, Martial</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Globe size={14} color={theme.text.muted} />
            <div>
              <div style={{ fontSize: '10px', color: theme.text.muted, fontWeight: '700' }}>LANGUAGES</div>
              <div style={{ fontSize: '12px', color: theme.text.primary }}>Common, Elvish</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;