import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dice6, RefreshCw, Copy, User, MapPin, Scroll, Coins, 
  Swords, MessageSquare, Crown, Skull, Heart, Shield,
  Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

// GM Theme - Red (Tron Aries)
const theme = {
  primary: '#E11D48',
  hover: '#F43F5E',
  subtle: 'rgba(225, 29, 72, 0.15)',
  glow: '0 0 20px rgba(225, 29, 72, 0.3)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(255, 255, 255, 0.1)'
};

// Random data tables
const TABLES = {
  humanNames: {
    male: ['Aldric', 'Bran', 'Cedric', 'Doran', 'Edmund', 'Finn', 'Gareth', 'Hugh', 'Ivan', 'Jasper', 'Kael', 'Liam', 'Marcus', 'Nolan', 'Owen', 'Pierce', 'Quinn', 'Roland', 'Stefan', 'Theron', 'Ulric', 'Victor', 'William', 'Xavier', 'York', 'Zane'],
    female: ['Aria', 'Brynn', 'Clara', 'Diana', 'Elena', 'Fiona', 'Gwen', 'Helena', 'Iris', 'Julia', 'Kira', 'Luna', 'Mira', 'Nora', 'Olivia', 'Petra', 'Quinn', 'Rosa', 'Sara', 'Thea', 'Una', 'Vera', 'Willow', 'Xena', 'Yara', 'Zara'],
    surnames: ['Ashford', 'Blackwood', 'Coldwell', 'Dunmore', 'Everhart', 'Fairfax', 'Grimshaw', 'Hawthorne', 'Ironside', 'Jasper', 'Kingsley', 'Lockwood', 'Mercer', 'Northwood', 'Oakenshield', 'Pemberton', 'Queensbury', 'Ravencroft', 'Stormwind', 'Thornwood', 'Underhill', 'Valorian', 'Westbrook', 'Yarrow', 'Zenthar']
  },
  elfNames: {
    male: ['Aerandir', 'Caladrel', 'Elandor', 'Faelar', 'Galinndan', 'Hadarai', 'Ilanis', 'Kelvhan', 'Laucian', 'Mindartis', 'Naeris', 'Paelias', 'Quarion', 'Riardon', 'Soveliss', 'Tharivol', 'Varis', 'Xiloscient'],
    female: ['Adrie', 'Birel', 'Caelynn', 'Drusilia', 'Enna', 'Felosial', 'Gaelira', 'Halueth', 'Irann', 'Jehanne', 'Keyleth', 'Lia', 'Meriele', 'Naivara', 'Quelenna', 'Sariel', 'Thia', 'Valanthe', 'Xanaphia']
  },
  dwarfNames: {
    male: ['Adrik', 'Baern', 'Darrak', 'Eberk', 'Fargrim', 'Gardain', 'Harbek', 'Kildrak', 'Morgran', 'Orsik', 'Rurik', 'Taklinn', 'Thoradin', 'Ulfgar', 'Vondal'],
    female: ['Amber', 'Bardryn', 'Dagnal', 'Diesa', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Kristryd', 'Mardred', 'Riswynn', 'Torbera', 'Vistra']
  },
  tavernNames: {
    adjectives: ['Rusty', 'Golden', 'Silver', 'Crimson', 'Jade', 'Roaring', 'Sleeping', 'Dancing', 'Wandering', 'Drunken', 'Prancing', 'Flying', 'Broken', 'Lucky', 'Salty', 'Gilded', 'Weary', 'Merry', 'Howling', 'Silent'],
    nouns: ['Dragon', 'Griffin', 'Phoenix', 'Unicorn', 'Anchor', 'Tankard', 'Goblet', 'Crown', 'Sword', 'Shield', 'Stag', 'Boar', 'Raven', 'Wolf', 'Bear', 'Lion', 'Serpent', 'Kraken', 'Hydra', 'Basilisk'],
    formats: ['{adj} {noun}', 'The {adj} {noun}', '{noun} & {noun}', 'The {noun}\'s Rest', '{adj} {noun} Inn', 'The {noun}\'s Head']
  },
  shopNames: {
    types: ['Smithy', 'Apothecary', 'Armory', 'Emporium', 'Trading Post', 'Boutique', 'Workshop', 'Supplies', 'Goods', 'Wares'],
    owners: ['Ironforge', 'Silverhand', 'Goldweaver', 'Copperkettle', 'Bronzeblade', 'Steelwright', 'Gemcutter', 'Silkspinner', 'Leatherwork', 'Woodcarver']
  },
  treasureItems: {
    mundane: ['silver bracelet', 'gold ring', 'jeweled brooch', 'silk scarf', 'ivory comb', 'silver mirror', 'golden locket', 'pearl earrings', 'ruby pendant', 'sapphire ring'],
    art: ['painting of a noble', 'marble bust', 'golden statuette', 'silver chalice', 'jeweled dagger', 'ornate tapestry', 'crystal decanter', 'bronze sculpture', 'ivory figurine', 'jade idol'],
    gems: ['diamond', 'ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'pearl', 'opal', 'garnet', 'tourmaline']
  },
  plotHooks: [
    'A mysterious stranger offers gold for a "simple delivery"',
    'Children have been disappearing from the village at night',
    'An ancient map surfaces showing a location that shouldn\'t exist',
    'A noble\'s heir has been kidnapped, but they don\'t want guards involved',
    'Strange lights have been seen in the abandoned mine',
    'A dying man whispers a cryptic message and hands over a key',
    'The local temple\'s holy relic has been stolen',
    'Travelers report seeing a ghost ship on the river',
    'A reward is posted for the capture of a notorious bandit',
    'The village well has turned the water to blood',
    'A merchant claims to sell maps to a dragon\'s hoard',
    'Someone is murdering members of the thieves\' guild',
    'A plague is spreading, and the cure requires a rare ingredient',
    'An old debt comes due from someone the party doesn\'t remember',
    'A celestial event is approaching, and cultists are preparing'
  ],
  rumors: [
    'They say the old wizard\'s tower holds treasures beyond imagination',
    'I heard the baron is secretly a vampire',
    'The blacksmith\'s daughter can speak to animals',
    'There\'s a secret passage under the temple',
    'The forest is haunted by the spirits of an ancient battle',
    'A dragon was spotted flying over the mountains last week',
    'The merchant guild is smuggling something dangerous',
    'The new priest isn\'t what he seems',
    'There\'s a bounty on goblins - 5 gold per ear',
    'The duke\'s advisor is actually a doppelganger'
  ],
  encounters: {
    forest: ['2d4 wolves', '1d4 bandits', '1 owlbear', '2d6 goblins', '1 treant', '1d4 dire wolves', '1 green hag', '2d4 giant spiders'],
    dungeon: ['2d4 skeletons', '1d4 zombies', '1 gelatinous cube', '2d6 goblins', '1 mimic', '1d4 giant rats', '1 rust monster', '1 carrion crawler'],
    road: ['1d4 bandits', '2d4 wolves', '1 merchant caravan', '1d6 pilgrims', '1 noble\'s escort', '2d4 kobolds', '1 traveling performer', '1 bounty hunter'],
    urban: ['1d4 thugs', '1 pickpocket', '1 con artist', '1d4 guards', '1 spy', '1 cultist', '1 drunken noble', '1 street performer']
  },
  npcTraits: {
    personality: ['nervous', 'boisterous', 'secretive', 'friendly', 'suspicious', 'greedy', 'honorable', 'cowardly', 'brave', 'cunning', 'naive', 'wise', 'hot-tempered', 'patient', 'ambitious'],
    quirks: ['speaks in rhymes', 'constantly fidgets', 'laughs at inappropriate times', 'never makes eye contact', 'obsessed with cleanliness', 'collects odd trinkets', 'speaks very quietly', 'uses big words incorrectly', 'always hungry', 'superstitious'],
    secrets: ['is actually a spy', 'owes money to dangerous people', 'witnessed a murder', 'has a forbidden love', 'is heir to a fortune', 'made a deal with a devil', 'is a retired adventurer', 'knows the location of treasure', 'is being blackmailed', 'has a bounty on their head']
  }
};

// Roll function
const roll = (dice) => {
  const match = dice.match(/(\d+)?d(\d+)([+-]\d+)?/i);
  if (!match) return 1;
  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]) || 6;
  const mod = parseInt(match[3]) || 0;
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total + mod;
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function RandomGeneratorTables({ campaignId }) {
  const [results, setResults] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState('names');

  const addResult = (type, value, details = null) => {
    const newResult = {
      id: Date.now(),
      type,
      value,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [newResult, ...prev].slice(0, 20));
  };

  const copyResult = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generators = {
    names: {
      label: 'NPC Names',
      icon: User,
      items: [
        { label: 'Human (Male)', action: () => {
          const name = `${pick(TABLES.humanNames.male)} ${pick(TABLES.humanNames.surnames)}`;
          addResult('Human Male', name);
        }},
        { label: 'Human (Female)', action: () => {
          const name = `${pick(TABLES.humanNames.female)} ${pick(TABLES.humanNames.surnames)}`;
          addResult('Human Female', name);
        }},
        { label: 'Elf (Male)', action: () => {
          addResult('Elf Male', pick(TABLES.elfNames.male));
        }},
        { label: 'Elf (Female)', action: () => {
          addResult('Elf Female', pick(TABLES.elfNames.female));
        }},
        { label: 'Dwarf (Male)', action: () => {
          addResult('Dwarf Male', pick(TABLES.dwarfNames.male));
        }},
        { label: 'Dwarf (Female)', action: () => {
          addResult('Dwarf Female', pick(TABLES.dwarfNames.female));
        }},
        { label: 'Random NPC', action: () => {
          const race = pick(['Human', 'Elf', 'Dwarf', 'Halfling', 'Half-Orc']);
          const gender = pick(['male', 'female']);
          let name;
          if (race === 'Human') {
            name = `${pick(TABLES.humanNames[gender])} ${pick(TABLES.humanNames.surnames)}`;
          } else if (race === 'Elf') {
            name = pick(TABLES.elfNames[gender]);
          } else {
            name = pick(TABLES.dwarfNames[gender] || TABLES.humanNames[gender]);
          }
          const personality = pick(TABLES.npcTraits.personality);
          const quirk = pick(TABLES.npcTraits.quirks);
          addResult('Random NPC', name, `${race}, ${personality}, ${quirk}`);
        }}
      ]
    },
    places: {
      label: 'Place Names',
      icon: MapPin,
      items: [
        { label: 'Tavern Name', action: () => {
          const format = pick(TABLES.tavernNames.formats);
          const name = format
            .replace('{adj}', pick(TABLES.tavernNames.adjectives))
            .replace('{noun}', pick(TABLES.tavernNames.nouns))
            .replace('{noun}', pick(TABLES.tavernNames.nouns));
          addResult('Tavern', name);
        }},
        { label: 'Shop Name', action: () => {
          const name = `${pick(TABLES.shopNames.owners)}'s ${pick(TABLES.shopNames.types)}`;
          addResult('Shop', name);
        }},
        { label: 'Village Name', action: () => {
          const prefixes = ['Oak', 'River', 'Stone', 'Green', 'Silver', 'White', 'Black', 'Red', 'High', 'Low'];
          const suffixes = ['ford', 'vale', 'haven', 'wick', 'ton', 'bridge', 'hollow', 'moor', 'dale', 'keep'];
          addResult('Village', `${pick(prefixes)}${pick(suffixes)}`);
        }},
        { label: 'City Name', action: () => {
          const names = ['Valdris', 'Ironhold', 'Stormgate', 'Crystalport', 'Shadowmere', 'Goldcrest', 'Dragonspire', 'Ravenswatch', 'Thornwall', 'Sunhaven'];
          addResult('City', pick(names));
        }},
        { label: 'Dungeon Name', action: () => {
          const adj = ['Forgotten', 'Cursed', 'Ancient', 'Sunken', 'Burning', 'Frozen', 'Shadowed', 'Lost', 'Hidden', 'Ruined'];
          const noun = ['Crypt', 'Tomb', 'Caverns', 'Depths', 'Halls', 'Lair', 'Temple', 'Prison', 'Mines', 'Sanctum'];
          addResult('Dungeon', `The ${pick(adj)} ${pick(noun)}`);
        }}
      ]
    },
    treasure: {
      label: 'Treasure',
      icon: Coins,
      items: [
        { label: 'Individual (CR 0-4)', action: () => {
          const cp = roll('5d6');
          const sp = roll('3d6');
          const gp = roll('1d6');
          addResult('Treasure (Low)', `${cp} cp, ${sp} sp, ${gp} gp`);
        }},
        { label: 'Individual (CR 5-10)', action: () => {
          const sp = roll('4d6') * 10;
          const gp = roll('2d6') * 10;
          const gems = Math.random() > 0.7 ? `, ${pick(TABLES.treasureItems.gems)} (${roll('2d6') * 10} gp)` : '';
          addResult('Treasure (Mid)', `${sp} sp, ${gp} gp${gems}`);
        }},
        { label: 'Individual (CR 11+)', action: () => {
          const gp = roll('4d6') * 100;
          const pp = roll('1d6') * 10;
          const item = pick(TABLES.treasureItems.art);
          addResult('Treasure (High)', `${gp} gp, ${pp} pp, ${item} (${roll('2d6') * 100} gp)`);
        }},
        { label: 'Art Object', action: () => {
          const item = pick(TABLES.treasureItems.art);
          const value = pick([25, 50, 100, 250, 500, 750, 1000]);
          addResult('Art Object', `${item} (${value} gp)`);
        }},
        { label: 'Gemstone', action: () => {
          const gem = pick(TABLES.treasureItems.gems);
          const value = pick([10, 25, 50, 100, 250, 500, 1000, 5000]);
          addResult('Gemstone', `${gem} (${value} gp)`);
        }}
      ]
    },
    encounters: {
      label: 'Encounters',
      icon: Swords,
      items: [
        { label: 'Forest Encounter', action: () => {
          addResult('Forest', pick(TABLES.encounters.forest));
        }},
        { label: 'Dungeon Encounter', action: () => {
          addResult('Dungeon', pick(TABLES.encounters.dungeon));
        }},
        { label: 'Road Encounter', action: () => {
          addResult('Road', pick(TABLES.encounters.road));
        }},
        { label: 'Urban Encounter', action: () => {
          addResult('Urban', pick(TABLES.encounters.urban));
        }},
        { label: 'Random Terrain', action: () => {
          const terrain = pick(['forest', 'dungeon', 'road', 'urban']);
          addResult(`Random (${terrain})`, pick(TABLES.encounters[terrain]));
        }}
      ]
    },
    hooks: {
      label: 'Plot Hooks',
      icon: Scroll,
      items: [
        { label: 'Plot Hook', action: () => {
          addResult('Plot Hook', pick(TABLES.plotHooks));
        }},
        { label: 'Rumor', action: () => {
          addResult('Rumor', pick(TABLES.rumors));
        }},
        { label: 'NPC Secret', action: () => {
          addResult('Secret', pick(TABLES.npcTraits.secrets));
        }},
        { label: 'NPC Motivation', action: () => {
          const motivations = ['seeking revenge', 'protecting someone', 'gaining power', 'finding love', 'escaping their past', 'proving themselves', 'serving their god', 'accumulating wealth', 'discovering truth', 'achieving fame'];
          addResult('Motivation', pick(motivations));
        }}
      ]
    }
  };

  return (
    <div style={{
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '24px' 
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: theme.subtle,
          border: `1px solid ${theme.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Dice6 size={20} color={theme.primary} />
        </div>
        <div>
          <h3 style={{ 
            color: theme.primary, 
            fontSize: '18px', 
            fontWeight: '700',
            margin: 0,
            fontFamily: 'Cityworm, sans-serif'
          }}>
            RANDOM GENERATORS
          </h3>
          <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
            Quick-roll tables for names, places, treasure & more
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Generator Categories */}
        <div>
          {Object.entries(generators).map(([key, category]) => (
            <div key={key} style={{ marginBottom: '12px' }}>
              <button
                onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: expandedCategory === key ? theme.subtle : theme.bg,
                  border: `1px solid ${expandedCategory === key ? theme.primary : theme.border}`,
                  color: expandedCategory === key ? theme.primary : theme.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <category.icon size={18} />
                  {category.label}
                </span>
                {expandedCategory === key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandedCategory === key && (
                <div style={{
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  borderTop: 'none',
                  padding: '12px'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {category.items.map((item, i) => (
                      <Button
                        key={i}
                        onClick={item.action}
                        style={{
                          padding: '8px 14px',
                          background: theme.card,
                          border: `1px solid ${theme.border}`,
                          color: theme.textSecondary,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Dice6 size={12} />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Results */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ color: theme.text, fontSize: '14px', fontWeight: '600', margin: 0 }}>
              Results ({results.length})
            </h4>
            {results.length > 0 && (
              <Button
                onClick={() => setResults([])}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  fontSize: '11px'
                }}
              >
                Clear All
              </Button>
            )}
          </div>

          <div style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            height: '400px',
            overflowY: 'auto'
          }}>
            {results.length === 0 ? (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.muted
              }}>
                <Dice6 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Click a generator to roll</p>
              </div>
            ) : (
              <div style={{ padding: '12px' }}>
                {results.map((result) => (
                  <div
                    key={result.id}
                    style={{
                      padding: '12px',
                      background: theme.card,
                      border: `1px solid ${theme.border}`,
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div>
                        <span style={{
                          color: theme.primary,
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {result.type}
                        </span>
                        <p style={{
                          color: theme.text,
                          fontSize: '15px',
                          fontWeight: '600',
                          margin: '4px 0 0'
                        }}>
                          {result.value}
                        </p>
                        {result.details && (
                          <p style={{
                            color: theme.muted,
                            fontSize: '12px',
                            margin: '4px 0 0',
                            fontStyle: 'italic'
                          }}>
                            {result.details}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => copyResult(result.details ? `${result.value} (${result.details})` : result.value)}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: theme.muted
                        }}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RandomGeneratorTables;
