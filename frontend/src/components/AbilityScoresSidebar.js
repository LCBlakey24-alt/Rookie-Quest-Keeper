import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DiceRollButton from '@/components/DiceRollButton';

const theme = {
  bg: { primary: '#0A1628', surface: '#0F2440', elevated: '#14304F' },
  accent: { primary: '#D4A017', secondary: '#F5C542' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(212, 160, 23, 0.35)',
  success: '#10b981',
  warning: '#f59e0b'
};

const ABILITY_SHORT = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA'
};

const ABILITIES_ORDER = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

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

const getModifier = (score) => Math.floor((score - 10) / 2);
const formatModifier = (mod) => (mod >= 0 ? `+${mod}` : `${mod}`);

export default function AbilityScoresSidebar({ character, onRollSkill, onRollAbility, onRollSave, isCompact = false }) {
  const [expandedSection, setExpandedSection] = useState('abilities');
  const [skillFilter, setSkillFilter] = useState('all'); // all, proficient, expertise

  if (!character) return null;

  // Calculate skill modifiers
  const getSkillMod = (skillAbility) => {
    const abilityScore = character[skillAbility] || 10;
    const baseMod = getModifier(abilityScore);
    // TODO: Add proficiency bonus if character is proficient in this skill
    return baseMod;
  };

  // Filter skills based on filter
  const filteredSkills = SKILLS.filter(skill => {
    if (skillFilter === 'all') return true;
    // TODO: Filter by proficiency/expertise once that data is available
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: isCompact ? '600px' : '100%',
        overflowY: 'auto',
        paddingRight: '8px'
      }}
    >
      {/* ABILITY SCORES BAR */}
      <div
        style={{
          padding: '12px',
          background: theme.bg.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            cursor: 'pointer'
          }}
          onClick={() => setExpandedSection(expandedSection === 'abilities' ? '' : 'abilities')}
        >
          <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text.muted, textTransform: 'uppercase' }}>
            Ability Scores
          </div>
          <div style={{ color: theme.accent.primary }}>
            {expandedSection === 'abilities' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expandedSection === 'abilities' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {ABILITIES_ORDER.map(ability => {
              const score = character[ability] || 10;
              const mod = getModifier(score);
              return (
                <div
                  key={ability}
                  style={{
                    padding: '8px',
                    background: theme.bg.elevated,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => onRollAbility?.(ability)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = theme.accent.primary;
                    e.currentTarget.style.background = '#1a3a52';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.background = theme.bg.elevated;
                  }}
                >
                  <div style={{ fontSize: '10px', color: theme.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {ABILITY_SHORT[ability]}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: theme.accent.primary }}>
                    {score}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.text.secondary }}>
                    {formatModifier(mod)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SAVING THROWS */}
      <div
        style={{
          padding: '12px',
          background: theme.bg.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: theme.text.muted,
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}
        >
          Saving Throws
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {ABILITIES_ORDER.map(ability => {
            const mod = getModifier(character[ability] || 10);
            const isProficient = character.saving_throws?.[ability] || false;
            const profBonus = character.proficiency_bonus || 2;
            const totalMod = isProficient ? mod + profBonus : mod;

            return (
              <div
                key={ability}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: isProficient ? 'rgba(212, 160, 23, 0.1)' : theme.bg.elevated,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '12px'
                }}
                onClick={() => onRollSave?.(ability)}
              >
                <span style={{ color: theme.text.secondary }}>
                  {ABILITY_SHORT[ability]} Save
                </span>
                <span
                  style={{
                    color: isProficient ? theme.accent.primary : theme.text.secondary,
                    fontWeight: isProficient ? '700' : '400',
                    marginLeft: '8px'
                  }}
                >
                  {formatModifier(totalMod)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SKILLS SECTION */}
      <div
        style={{
          padding: '12px',
          background: theme.bg.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            cursor: 'pointer'
          }}
          onClick={() => setExpandedSection(expandedSection === 'skills' ? '' : 'skills')}
        >
          <div style={{ fontSize: '11px', fontWeight: '600', color: theme.text.muted, textTransform: 'uppercase' }}>
            Skills ({filteredSkills.length})
          </div>
          <div style={{ color: theme.accent.primary }}>
            {expandedSection === 'skills' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expandedSection === 'skills' && (
          <>
            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {['all', 'proficient', 'expertise'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setSkillFilter(filter)}
                  style={{
                    padding: '4px 8px',
                    background: skillFilter === filter ? theme.accent.primary : theme.bg.elevated,
                    color: skillFilter === filter ? theme.bg.primary : theme.text.secondary,
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Skills List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredSkills.map(skill => {
                const mod = getSkillMod(skill.ability);
                const profBonus = character.proficiency_bonus || 2;
                // TODO: Check if proficient/expert in this skill
                const isProficient = false;
                const isExpertise = false;
                const totalMod = isProficient ? mod + profBonus : isExpertise ? mod + (profBonus * 2) : mod;

                return (
                  <div
                    key={skill.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      background: isProficient || isExpertise ? 'rgba(212, 160, 23, 0.1)' : theme.bg.elevated,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '12px'
                    }}
                    onClick={() => onRollSkill?.(skill.name, skill.ability)}
                  >
                    <span style={{ color: theme.text.secondary }}>
                      {skill.name}
                      <span style={{ fontSize: '10px', color: theme.text.muted, marginLeft: '4px' }}>
                        ({ABILITY_SHORT[skill.ability]})
                      </span>
                    </span>
                    <span
                      style={{
                        color: isProficient || isExpertise ? theme.accent.primary : theme.text.secondary,
                        fontWeight: isProficient || isExpertise ? '700' : '400',
                        marginLeft: '8px'
                      }}
                    >
                      {formatModifier(totalMod)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
