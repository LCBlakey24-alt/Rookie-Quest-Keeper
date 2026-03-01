import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

// D&D 5e Conditions Reference
export const CONDITIONS_REFERENCE = {
  blinded: {
    name: 'Blinded',
    description: 'A blinded creature can\'t see and automatically fails any ability check that requires sight.',
    effects: [
      'Attack rolls against the creature have advantage',
      'The creature\'s attack rolls have disadvantage'
    ]
  },
  charmed: {
    name: 'Charmed',
    description: 'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects.',
    effects: [
      'The charmer has advantage on any ability check to interact socially with the creature'
    ]
  },
  deafened: {
    name: 'Deafened',
    description: 'A deafened creature can\'t hear and automatically fails any ability check that requires hearing.',
    effects: []
  },
  frightened: {
    name: 'Frightened',
    description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.',
    effects: [
      'The creature can\'t willingly move closer to the source of its fear'
    ]
  },
  grappled: {
    name: 'Grappled',
    description: 'A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    effects: [
      'The condition ends if the grappler is incapacitated',
      'The condition ends if an effect removes the grappled creature from the grappler\'s reach'
    ]
  },
  incapacitated: {
    name: 'Incapacitated',
    description: 'An incapacitated creature can\'t take actions or reactions.',
    effects: []
  },
  invisible: {
    name: 'Invisible',
    description: 'An invisible creature is impossible to see without the aid of magic or a special sense.',
    effects: [
      'The creature is heavily obscured for hiding purposes',
      'The creature\'s location can be detected by noise or tracks',
      'Attack rolls against the creature have disadvantage',
      'The creature\'s attack rolls have advantage'
    ]
  },
  paralyzed: {
    name: 'Paralyzed',
    description: 'A paralyzed creature is incapacitated and can\'t move or speak.',
    effects: [
      'The creature automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage',
      'Any attack that hits is a critical hit if the attacker is within 5 feet'
    ]
  },
  petrified: {
    name: 'Petrified',
    description: 'A petrified creature is transformed into a solid inanimate substance (usually stone).',
    effects: [
      'Weight increases by a factor of ten',
      'The creature is incapacitated and unaware of surroundings',
      'Attack rolls against the creature have advantage',
      'The creature automatically fails Strength and Dexterity saving throws',
      'Resistance to all damage',
      'Immune to poison and disease'
    ]
  },
  poisoned: {
    name: 'Poisoned',
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    effects: []
  },
  prone: {
    name: 'Prone',
    description: 'A prone creature\'s only movement option is to crawl (costs extra movement) or stand up.',
    effects: [
      'The creature has disadvantage on attack rolls',
      'Attack rolls have advantage if attacker is within 5 feet, otherwise disadvantage'
    ]
  },
  restrained: {
    name: 'Restrained',
    description: 'A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    effects: [
      'Attack rolls against the creature have advantage',
      'The creature\'s attack rolls have disadvantage',
      'The creature has disadvantage on Dexterity saving throws'
    ]
  },
  stunned: {
    name: 'Stunned',
    description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly.',
    effects: [
      'The creature automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage'
    ]
  },
  unconscious: {
    name: 'Unconscious',
    description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.',
    effects: [
      'The creature drops whatever it\'s holding and falls prone',
      'The creature automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage',
      'Any attack that hits is a critical hit if the attacker is within 5 feet'
    ]
  },
  exhaustion: {
    name: 'Exhaustion',
    description: 'Exhaustion is measured in six levels. Effects are cumulative.',
    effects: [
      'Level 1: Disadvantage on ability checks',
      'Level 2: Speed halved',
      'Level 3: Disadvantage on attack rolls and saving throws',
      'Level 4: Hit point maximum halved',
      'Level 5: Speed reduced to 0',
      'Level 6: Death'
    ]
  },
  concentrating: {
    name: 'Concentrating',
    description: 'Some spells require concentration to maintain their effects.',
    effects: [
      'Casting another concentration spell ends the current one',
      'Taking damage requires a Constitution saving throw (DC 10 or half damage, whichever is higher)',
      'Being incapacitated or killed ends concentration',
      'GM may call for a save due to environmental phenomena'
    ]
  }
};

// Common Actions Reference
export const ACTIONS_REFERENCE = {
  attack: {
    name: 'Attack',
    description: 'Make a melee or ranged attack against a target.',
    details: 'Roll d20 + ability modifier + proficiency bonus (if proficient). Compare to target\'s AC.'
  },
  dash: {
    name: 'Dash',
    description: 'Gain extra movement equal to your speed for the current turn.',
    details: 'Any modifiers to your speed also apply to this extra movement.'
  },
  disengage: {
    name: 'Disengage',
    description: 'Your movement doesn\'t provoke opportunity attacks for the rest of the turn.',
    details: 'Useful for retreating from melee combat safely.'
  },
  dodge: {
    name: 'Dodge',
    description: 'Focus on avoiding attacks until your next turn.',
    details: 'Attack rolls against you have disadvantage if you can see the attacker. Dexterity saves have advantage. Lost if incapacitated or speed drops to 0.'
  },
  help: {
    name: 'Help',
    description: 'Aid an ally in attacking a creature or with an ability check.',
    details: 'The ally gains advantage on their next attack roll or ability check.'
  },
  hide: {
    name: 'Hide',
    description: 'Make a Dexterity (Stealth) check to hide from enemies.',
    details: 'Must be heavily obscured or have cover. Compared against enemy\'s passive Perception.'
  },
  ready: {
    name: 'Ready',
    description: 'Prepare to act in response to a specific trigger.',
    details: 'Uses your reaction when triggered. Spells require concentration until triggered.'
  },
  search: {
    name: 'Search',
    description: 'Devote attention to finding something.',
    details: 'Make a Wisdom (Perception) or Intelligence (Investigation) check.'
  },
  useObject: {
    name: 'Use an Object',
    description: 'Interact with an object that requires your action.',
    details: 'Drawing a second weapon, drinking a potion, pulling a lever, etc.'
  },
  grapple: {
    name: 'Grapple',
    description: 'Special melee attack to grab a creature.',
    details: 'Athletics check vs. target\'s Athletics or Acrobatics. Target must be no more than one size larger.'
  },
  shove: {
    name: 'Shove',
    description: 'Push a creature away or knock them prone.',
    details: 'Athletics check vs. target\'s Athletics or Acrobatics. Push 5 feet or knock prone.'
  }
};

// Damage Types Reference
export const DAMAGE_TYPES = {
  acid: { name: 'Acid', description: 'Corrosive spray or digestive enzymes', examples: 'Black dragon breath, acid splash' },
  bludgeoning: { name: 'Bludgeoning', description: 'Blunt force attacks', examples: 'Clubs, maces, falling' },
  cold: { name: 'Cold', description: 'Infernal chill', examples: 'White dragon breath, cone of cold' },
  fire: { name: 'Fire', description: 'Heat and flames', examples: 'Red dragon breath, fireball' },
  force: { name: 'Force', description: 'Pure magical energy', examples: 'Magic missile, eldritch blast' },
  lightning: { name: 'Lightning', description: 'Electrical energy', examples: 'Blue dragon breath, lightning bolt' },
  necrotic: { name: 'Necrotic', description: 'Life-draining energy', examples: 'Inflict wounds, chill touch' },
  piercing: { name: 'Piercing', description: 'Puncturing attacks', examples: 'Arrows, rapiers, fangs' },
  poison: { name: 'Poison', description: 'Venomous or toxic substances', examples: 'Green dragon breath, poison spray' },
  psychic: { name: 'Psychic', description: 'Mental assault', examples: 'Mind flayer attacks, psychic scream' },
  radiant: { name: 'Radiant', description: 'Holy or divine energy', examples: 'Guiding bolt, divine smite' },
  slashing: { name: 'Slashing', description: 'Cutting attacks', examples: 'Swords, axes, claws' },
  thunder: { name: 'Thunder', description: 'Concussive sound', examples: 'Thunderwave, shatter' }
};

// Quick Reference Popup Component
export function QuickReferencePopup({ type, id, children, position = 'top' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getReference = () => {
    switch (type) {
      case 'condition':
        return CONDITIONS_REFERENCE[id];
      case 'action':
        return ACTIONS_REFERENCE[id];
      case 'damage':
        return DAMAGE_TYPES[id];
      default:
        return null;
    }
  };
  
  const ref = getReference();
  if (!ref) return children;
  
  return (
    <span 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span style={{ 
        cursor: 'help', 
        borderBottom: '1px dotted #4a7dff',
        transition: 'all 0.2s'
      }}>
        {children}
      </span>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          [position === 'top' ? 'bottom' : 'top']: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: position === 'top' ? '8px' : 0,
          marginTop: position === 'bottom' ? '8px' : 0,
          width: '300px',
          background: 'linear-gradient(180deg, #0a0a2e 0%, #030014 100%)',
          border: '2px solid #4a7dff',
          borderRadius: '12px',
          padding: '14px',
          boxShadow: '0 0 30px rgba(74, 125, 255, 0.4)',
          zIndex: 1000,
          animation: 'popIn 0.2s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '10px',
            borderBottom: '1px solid #1e40af',
            paddingBottom: '8px'
          }}>
            <BookOpen size={16} style={{ color: '#22c55e' }} />
            <span style={{ 
              color: '#22c55e', 
              fontWeight: '700', 
              fontSize: '14px',
              fontFamily: 'Montserrat, sans-serif'
            }}>
              {ref.name}
            </span>
          </div>
          <p style={{ 
            color: '#ffffff', 
            fontSize: '12px', 
            lineHeight: '1.6',
            marginBottom: ref.effects?.length > 0 || ref.details ? '10px' : 0
          }}>
            {ref.description}
          </p>
          {ref.effects && ref.effects.length > 0 && (
            <ul style={{ 
              margin: 0, 
              paddingLeft: '16px',
              color: '#94a3b8',
              fontSize: '11px',
              lineHeight: '1.5'
            }}>
              {ref.effects.map((effect, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{effect}</li>
              ))}
            </ul>
          )}
          {ref.details && (
            <p style={{ 
              color: '#67e8f9', 
              fontSize: '11px', 
              fontStyle: 'italic',
              marginTop: '8px'
            }}>
              {ref.details}
            </p>
          )}
          {ref.examples && (
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '11px',
              marginTop: '8px'
            }}>
              <strong style={{ color: '#67e8f9' }}>Examples:</strong> {ref.examples}
            </p>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.95); }
          to { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </span>
  );
}

// Full Reference Modal
export function QuickReferenceModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('conditions');
  
  if (!isOpen) return null;
  
  const tabs = [
    { id: 'conditions', label: 'Conditions' },
    { id: 'actions', label: 'Actions' },
    { id: 'damage', label: 'Damage Types' }
  ];
  
  const getData = () => {
    switch (activeTab) {
      case 'conditions': return Object.values(CONDITIONS_REFERENCE);
      case 'actions': return Object.values(ACTIONS_REFERENCE);
      case 'damage': return Object.values(DAMAGE_TYPES);
      default: return [];
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div 
        className="modal"
        style={{ 
          maxWidth: '800px', 
          width: '100%', 
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            color: '#ffffff',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <BookOpen size={28} style={{ color: '#22c55e' }} />
            Quick Reference
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
          borderBottom: '2px solid #1e40af',
          paddingBottom: '12px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: activeTab === tab.id ? '2px solid #22c55e' : '2px solid transparent',
                background: activeTab === tab.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(10, 10, 40, 0.6)',
                color: activeTab === tab.id ? '#22c55e' : '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '12px'
        }}>
          {getData().map((item, idx) => (
            <div 
              key={idx}
              style={{
                background: 'rgba(10, 10, 40, 0.6)',
                border: '2px solid #1e40af',
                borderRadius: '12px',
                padding: '14px'
              }}
            >
              <h3 style={{ 
                color: '#22c55e', 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '8px',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                {item.name}
              </h3>
              <p style={{ 
                color: '#ffffff', 
                fontSize: '13px', 
                lineHeight: '1.5',
                marginBottom: item.effects?.length > 0 || item.details ? '10px' : 0
              }}>
                {item.description}
              </p>
              {item.effects && item.effects.length > 0 && (
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '16px',
                  color: '#94a3b8',
                  fontSize: '12px'
                }}>
                  {item.effects.map((effect, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{effect}</li>
                  ))}
                </ul>
              )}
              {item.details && (
                <p style={{ color: '#67e8f9', fontSize: '12px', fontStyle: 'italic' }}>
                  {item.details}
                </p>
              )}
              {item.examples && (
                <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '6px' }}>
                  <strong style={{ color: '#67e8f9' }}>Examples:</strong> {item.examples}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickReferencePopup;
