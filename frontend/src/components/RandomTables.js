import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle, Beer, User, Cloud, Lightbulb, MapPin, Scroll, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Random Tables Data
const RANDOM_TABLES = {
  tavern_names: {
    label: 'Tavern Name',
    icon: Beer,
    color: '#f97316',
    adjectives: ['The Golden', 'The Silver', 'The Rusty', 'The Prancing', 'The Sleeping', 'The Drunken', 'The Laughing', 'The Weary', 'The Lucky', 'The Broken', 'The Hidden', 'The Gilded', 'The Wandering', 'The Merry', 'The Old', 'The Royal', 'The Dancing', 'The Howling', 'The Salty', 'The Crimson'],
    nouns: ['Dragon', 'Griffin', 'Unicorn', 'Boar', 'Stag', 'Serpent', 'Phoenix', 'Ogre', 'Troll', 'Giant', 'Mermaid', 'Goblin', 'Knight', 'Bard', 'Wizard', 'Pegasus', 'Basilisk', 'Raven', 'Wolf', 'Bear'],
    generate: (data) => `${data.adjectives[Math.floor(Math.random() * data.adjectives.length)]} ${data.nouns[Math.floor(Math.random() * data.nouns.length)]}`
  },
  shop_names: {
    label: 'Shop Name',
    icon: MapPin,
    color: '#22c55e',
    prefixes: ["Mercer's", "Thaddeus'", "Elara's", "Grimsby's", "Thornwick's", "Ironhand's", "Silvertongue's", "Blackwood's", "Goldleaf's", "Stormwind's"],
    types: ['Emporium', 'Goods & Supplies', 'Curios', 'Fine Wares', 'Trading Post', 'Market', 'Bazaar', 'Provisions', 'Sundries', 'Boutique'],
    generate: (data) => `${data.prefixes[Math.floor(Math.random() * data.prefixes.length)]} ${data.types[Math.floor(Math.random() * data.types.length)]}`
  },
  npc_traits: {
    label: 'NPC Quirk',
    icon: User,
    color: '#a855f7',
    traits: [
      'Speaks in the third person',
      'Constantly fidgets with a coin',
      'Has a noticeable twitch',
      'Laughs at inappropriate times',
      'Always whispers',
      'Refers to everyone as "friend"',
      'Has a pet rat on their shoulder',
      'Chews on a toothpick',
      'Constantly scratches their head',
      'Hums tunelessly',
      'Ends sentences with "you know?"',
      'Has a thick, unplaceable accent',
      'Blinks excessively',
      'Always seems distracted',
      'Speaks very slowly',
      'Uses overly formal language',
      'Has a booming laugh',
      'Never makes eye contact',
      'Constantly checks over their shoulder',
      'Smells faintly of lavender',
      'Has ink-stained fingers',
      'Wears mismatched shoes',
      'Has a scar they love to explain',
      'Collects something unusual',
      'Is terrified of a common animal'
    ],
    generate: (data) => data.traits[Math.floor(Math.random() * data.traits.length)]
  },
  weather: {
    label: 'Weather',
    icon: Cloud,
    color: '#67e8f9',
    conditions: [
      'Clear skies, warm breeze',
      'Overcast with a chance of rain',
      'Light drizzle, muddy roads',
      'Heavy downpour, visibility poor',
      'Thick fog rolling in',
      'Bitterly cold wind',
      'Uncomfortably hot and humid',
      'Light snow beginning to fall',
      'Blizzard conditions',
      'Thunderstorm approaching',
      'Perfect traveling weather',
      'Hazy and dusty',
      'Rainbow visible in the distance',
      'Eerie stillness in the air',
      'Strong gusts of wind',
      'Frost covering everything',
      'Unseasonably warm',
      'Dark storm clouds gathering',
      'Mist rising from the ground',
      'Aurora visible in the night sky'
    ],
    generate: (data) => data.conditions[Math.floor(Math.random() * data.conditions.length)]
  },
  plot_hooks: {
    label: 'Plot Hook',
    icon: Lightbulb,
    color: '#eab308',
    hooks: [
      'A mysterious stranger offers gold for a simple delivery job',
      'Children have been disappearing from the village at night',
      'A noble offers a reward for recovering a stolen family heirloom',
      'Strange lights have been seen in the abandoned mine',
      'A traveling merchant claims to have a map to ancient ruins',
      'The local well has been poisoned - who is responsible?',
      'A ghost haunts the old manor, seeking to right a wrong',
      'Livestock are being killed by something in the forest',
      'A wanted poster shows a face one of you recognizes',
      'A dying man whispers a cryptic message and hands over a key',
      'The local lord is hiring bodyguards for a dangerous journey',
      'An old friend sends an urgent letter asking for help',
      'Strange symbols have appeared carved into trees overnight',
      'A prisoner claims to know the location of a dragons hoard',
      'The local temple has been desecrated and needs cleansing',
      'A bounty hunter is asking about one of the party members',
      'Unusual weather patterns suggest magical interference',
      'A festival is interrupted by an attack from an unknown enemy',
      'A magical item the party owns begins behaving strangely',
      "Someone is impersonating one of the party members in town"
    ],
    generate: (data) => data.hooks[Math.floor(Math.random() * data.hooks.length)]
  },
  loot_mundane: {
    label: 'Mundane Loot',
    icon: Scroll,
    color: '#94a3b8',
    items: [
      '3d6 copper pieces in a worn pouch',
      'A crumpled letter with illegible handwriting',
      'A half-eaten wheel of cheese',
      'A rusty key to an unknown lock',
      'A wooden holy symbol',
      'A deck of cards with two missing',
      'A small mirror, cracked',
      'A pouch of dried herbs',
      'A love letter never sent',
      'A wanted poster for someone else',
      'A crude map drawn on leather',
      'A lucky rabbits foot',
      'A flask of cheap wine',
      'A set of loaded dice',
      'A small bag of marbles',
      'A broken pocket watch',
      'A faded family portrait',
      'A receipt from a distant city',
      'A small wooden figurine',
      'A bundle of candles'
    ],
    generate: (data) => data.items[Math.floor(Math.random() * data.items.length)]
  }
};

function RandomTables({ onSaveAsNote }) {
  const [results, setResults] = useState([]);

  const rollTable = (tableKey) => {
    const table = RANDOM_TABLES[tableKey];
    const result = table.generate(table);
    
    const newResult = {
      id: Date.now(),
      type: tableKey,
      label: table.label,
      result,
      color: table.color,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setResults(prev => [newResult, ...prev.slice(0, 19)]);
  };

  const copyResult = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const clearResults = () => setResults([]);

  return (
    <div>
      {/* Table Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {Object.entries(RANDOM_TABLES).map(([key, table]) => {
          const IconComponent = table.icon;
          return (
            <Button
              key={key}
              onClick={() => rollTable(key)}
              data-testid={`roll-${key}-btn`}
              style={{
                padding: '16px 12px',
                background: `${table.color}15`,
                border: `2px solid ${table.color}`,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${table.color}30`;
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${table.color}15`;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <IconComponent size={24} color={table.color} />
              <span style={{ color: table.color, fontWeight: '700', fontSize: '13px' }}>
                {table.label}
              </span>
              <Shuffle size={14} color="#64748b" />
            </Button>
          );
        })}
      </div>

      {/* Results */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>
            Results ({results.length})
          </h3>
          {results.length > 0 && (
            <button
              onClick={clearResults}
              style={{
                background: 'transparent',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#64748b',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            <Shuffle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px' }}>Click a table above to generate!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((result) => (
              <div
                key={result.id}
                style={{
                  padding: '14px 16px',
                  background: `${result.color}10`,
                  border: `2px solid ${result.color}40`,
                  borderRadius: '10px',
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    color: result.color, 
                    fontSize: '11px', 
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {result.label}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '10px' }}>{result.timestamp}</span>
                </div>
                <p style={{ 
                  color: '#fff', 
                  fontSize: '15px', 
                  fontWeight: '600',
                  lineHeight: '1.5',
                  marginBottom: '10px'
                }}>
                  {result.result}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => copyResult(result.result)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#94a3b8',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                  {onSaveAsNote && (
                    <button
                      onClick={() => onSaveAsNote(result.result)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#22c55e',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} />
                      Save to Notes
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RandomTables;
