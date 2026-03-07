import React, { useState } from 'react';
import { Coins, Gem, Sword, Scroll, Sparkles, RotateCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Loot tables based on CR and party level
const LOOT_TABLES = {
  individual: {
    low: { // CR 0-4
      copper: { min: 1, max: 30, chance: 0.6 },
      silver: { min: 1, max: 20, chance: 0.4 },
      gold: { min: 1, max: 10, chance: 0.2 },
      gems: { chance: 0.1, count: { min: 1, max: 1 } },
      items: { chance: 0.05 }
    },
    medium: { // CR 5-10
      silver: { min: 5, max: 50, chance: 0.5 },
      gold: { min: 5, max: 50, chance: 0.6 },
      platinum: { min: 1, max: 5, chance: 0.2 },
      gems: { chance: 0.3, count: { min: 1, max: 3 } },
      items: { chance: 0.2 }
    },
    high: { // CR 11-16
      gold: { min: 20, max: 200, chance: 0.7 },
      platinum: { min: 2, max: 20, chance: 0.5 },
      gems: { chance: 0.5, count: { min: 2, max: 6 } },
      items: { chance: 0.4 }
    },
    legendary: { // CR 17+
      gold: { min: 100, max: 1000, chance: 0.8 },
      platinum: { min: 10, max: 100, chance: 0.7 },
      gems: { chance: 0.7, count: { min: 3, max: 10 } },
      items: { chance: 0.6 }
    }
  }
};

const GEMS = {
  low: [
    { name: 'Azurite', value: 10 },
    { name: 'Banded Agate', value: 10 },
    { name: 'Blue Quartz', value: 10 },
    { name: 'Eye Agate', value: 10 },
    { name: 'Hematite', value: 10 },
    { name: 'Lapis Lazuli', value: 10 },
    { name: 'Malachite', value: 10 },
    { name: 'Moss Agate', value: 10 },
    { name: 'Obsidian', value: 10 },
    { name: 'Rhodochrosite', value: 10 },
    { name: 'Tiger Eye', value: 10 },
    { name: 'Turquoise', value: 10 }
  ],
  medium: [
    { name: 'Bloodstone', value: 50 },
    { name: 'Carnelian', value: 50 },
    { name: 'Chalcedony', value: 50 },
    { name: 'Chrysoprase', value: 50 },
    { name: 'Citrine', value: 50 },
    { name: 'Jasper', value: 50 },
    { name: 'Moonstone', value: 50 },
    { name: 'Onyx', value: 50 },
    { name: 'Quartz', value: 50 },
    { name: 'Sardonyx', value: 50 },
    { name: 'Star Rose Quartz', value: 50 },
    { name: 'Zircon', value: 50 }
  ],
  high: [
    { name: 'Amber', value: 100 },
    { name: 'Amethyst', value: 100 },
    { name: 'Chrysoberyl', value: 100 },
    { name: 'Coral', value: 100 },
    { name: 'Garnet', value: 100 },
    { name: 'Jade', value: 100 },
    { name: 'Jet', value: 100 },
    { name: 'Pearl', value: 100 },
    { name: 'Spinel', value: 100 },
    { name: 'Tourmaline', value: 100 }
  ],
  rare: [
    { name: 'Alexandrite', value: 500 },
    { name: 'Aquamarine', value: 500 },
    { name: 'Black Pearl', value: 500 },
    { name: 'Blue Spinel', value: 500 },
    { name: 'Peridot', value: 500 },
    { name: 'Topaz', value: 500 }
  ],
  legendary: [
    { name: 'Black Opal', value: 1000 },
    { name: 'Blue Sapphire', value: 1000 },
    { name: 'Emerald', value: 1000 },
    { name: 'Fire Opal', value: 1000 },
    { name: 'Opal', value: 1000 },
    { name: 'Star Ruby', value: 1000 },
    { name: 'Star Sapphire', value: 1000 },
    { name: 'Yellow Sapphire', value: 1000 },
    { name: 'Diamond', value: 5000 },
    { name: 'Jacinth', value: 5000 },
    { name: 'Ruby', value: 5000 }
  ]
};

const MAGIC_ITEMS = {
  common: [
    { name: 'Potion of Healing', type: 'Potion', desc: 'Restores 2d4+2 HP' },
    { name: 'Spell Scroll (Cantrip)', type: 'Scroll', desc: 'Contains a cantrip' },
    { name: 'Driftglobe', type: 'Wondrous', desc: 'Casts Light or Daylight' },
    { name: 'Bag of Holding', type: 'Wondrous', desc: 'Extradimensional storage' },
    { name: 'Cloak of Billowing', type: 'Wondrous', desc: 'Dramatic cape flourish' },
    { name: 'Hat of Disguise', type: 'Wondrous', desc: 'Cast Disguise Self at will' },
    { name: 'Immovable Rod', type: 'Wondrous', desc: 'Becomes fixed in place' },
    { name: 'Goggles of Night', type: 'Wondrous', desc: 'Grants darkvision 60ft' }
  ],
  uncommon: [
    { name: 'Potion of Greater Healing', type: 'Potion', desc: 'Restores 4d4+4 HP' },
    { name: 'Spell Scroll (1st-2nd level)', type: 'Scroll', desc: 'Contains a low-level spell' },
    { name: '+1 Weapon', type: 'Weapon', desc: '+1 to attack and damage' },
    { name: '+1 Shield', type: 'Armor', desc: '+1 additional AC' },
    { name: '+1 Armor', type: 'Armor', desc: '+1 to AC' },
    { name: 'Boots of Elvenkind', type: 'Wondrous', desc: 'Advantage on Stealth' },
    { name: 'Cloak of Elvenkind', type: 'Wondrous', desc: 'Advantage on Stealth' },
    { name: 'Gauntlets of Ogre Power', type: 'Wondrous', desc: 'STR becomes 19' },
    { name: 'Headband of Intellect', type: 'Wondrous', desc: 'INT becomes 19' },
    { name: 'Ring of Protection', type: 'Ring', desc: '+1 to AC and saves' },
    { name: 'Wand of Magic Missiles', type: 'Wand', desc: '7 charges, Magic Missile' },
    { name: 'Periapt of Wound Closure', type: 'Wondrous', desc: 'Stabilize automatically' }
  ],
  rare: [
    { name: 'Potion of Superior Healing', type: 'Potion', desc: 'Restores 8d4+8 HP' },
    { name: 'Spell Scroll (3rd-5th level)', type: 'Scroll', desc: 'Contains a mid-level spell' },
    { name: '+2 Weapon', type: 'Weapon', desc: '+2 to attack and damage' },
    { name: '+2 Shield', type: 'Armor', desc: '+2 additional AC' },
    { name: '+2 Armor', type: 'Armor', desc: '+2 to AC' },
    { name: 'Flame Tongue', type: 'Weapon', desc: '+2d6 fire damage' },
    { name: 'Cloak of Displacement', type: 'Wondrous', desc: 'Disadvantage to hit you' },
    { name: 'Belt of Giant Strength (Hill)', type: 'Wondrous', desc: 'STR becomes 21' },
    { name: 'Ring of Spell Storing', type: 'Ring', desc: 'Store up to 5 spell levels' },
    { name: 'Amulet of Health', type: 'Wondrous', desc: 'CON becomes 19' },
    { name: 'Staff of Fire', type: 'Staff', desc: 'Cast fire spells' },
    { name: 'Necklace of Fireballs', type: 'Wondrous', desc: 'Throw Fireballs' }
  ],
  veryRare: [
    { name: 'Potion of Supreme Healing', type: 'Potion', desc: 'Restores 10d4+20 HP' },
    { name: 'Spell Scroll (6th-8th level)', type: 'Scroll', desc: 'Contains a high-level spell' },
    { name: '+3 Weapon', type: 'Weapon', desc: '+3 to attack and damage' },
    { name: '+3 Armor', type: 'Armor', desc: '+3 to AC' },
    { name: 'Dancing Sword', type: 'Weapon', desc: 'Attacks on its own' },
    { name: 'Staff of Power', type: 'Staff', desc: '+2 AC, +2 saves, spells' },
    { name: 'Robe of Stars', type: 'Wondrous', desc: '+1 saves, Magic Missiles' },
    { name: 'Ring of Regeneration', type: 'Ring', desc: 'Regain 1d6 HP every 10 min' },
    { name: 'Manual of Bodily Health', type: 'Wondrous', desc: 'Increase CON by 2' }
  ],
  legendary: [
    { name: 'Potion of Storm Giant Strength', type: 'Potion', desc: 'STR becomes 29' },
    { name: 'Spell Scroll (9th level)', type: 'Scroll', desc: 'Contains Wish, etc.' },
    { name: 'Vorpal Sword', type: 'Weapon', desc: 'Decapitates on natural 20' },
    { name: 'Holy Avenger', type: 'Weapon', desc: '+3, extra vs fiends/undead' },
    { name: 'Staff of the Magi', type: 'Staff', desc: 'Powerful spellcasting' },
    { name: 'Ring of Three Wishes', type: 'Ring', desc: 'Cast Wish 3 times' },
    { name: 'Tome of the Stilled Tongue', type: 'Wondrous', desc: "Vecna's spellbook" },
    { name: 'Cloak of Invisibility', type: 'Wondrous', desc: 'True invisibility' }
  ]
};

const ART_OBJECTS = {
  25: [
    'Silver ewer', 'Carved bone statuette', 'Small gold bracelet', 'Cloth-of-gold vestments',
    'Black velvet mask', 'Copper chalice', 'Pair of engraved dice', 'Small mirror in painted frame'
  ],
  250: [
    'Gold ring with bloodstones', 'Carved ivory statuette', 'Large gold bracelet',
    'Silver necklace with gemstone pendant', 'Bronze crown', 'Silk robe with gold embroidery',
    'Well-made tapestry', 'Brass mug with jade inlay'
  ],
  750: [
    'Silver chalice with moonstones', 'Silver-plated sword with jet in hilt',
    'Carved harp of exotic wood', 'Small gold idol', 'Gold dragon comb with red garnets',
    'Bottle stopper cork with gold leaf', 'Ceremonial electrum dagger', 'Silver and gold brooch'
  ],
  2500: [
    'Fine gold chain with fire opal', 'Old masterpiece painting', 'Embroidered silk mantle',
    'Platinum bracelet with sapphire', 'Embroidered glove with jewel chips',
    'Jeweled anklet', 'Gold music box', 'Gold circlet with four aquamarines'
  ],
  7500: [
    'Jeweled gold crown', 'Jeweled platinum ring', 'Small gold statuette with rubies',
    'Gold cup with emeralds', 'Gold jewelry box with platinum filigree',
    'Painted gold child\'s sarcophagus', 'Jade game board with gold pieces', 'Bejeweled ivory horn'
  ]
};

function LootGenerator({ partyLevel = 5, enemiesDefeated = [] }) {
  const [generatedLoot, setGeneratedLoot] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [lootTier, setLootTier] = useState('medium');

  // Determine loot tier from party level
  const getTierFromLevel = (level) => {
    if (level <= 4) return 'low';
    if (level <= 10) return 'medium';
    if (level <= 16) return 'high';
    return 'legendary';
  };

  // Roll a random number between min and max
  const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Pick random item from array
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Generate loot
  const generateLoot = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const tier = lootTier;
      const table = LOOT_TABLES.individual[tier];
      const loot = {
        coins: { copper: 0, silver: 0, gold: 0, platinum: 0 },
        gems: [],
        artObjects: [],
        magicItems: [],
        totalValue: 0
      };

      // Roll for coins
      if (table.copper && Math.random() < table.copper.chance) {
        loot.coins.copper = roll(table.copper.min, table.copper.max);
      }
      if (table.silver && Math.random() < table.silver.chance) {
        loot.coins.silver = roll(table.silver.min, table.silver.max);
      }
      if (table.gold && Math.random() < table.gold.chance) {
        loot.coins.gold = roll(table.gold.min, table.gold.max);
      }
      if (table.platinum && Math.random() < table.platinum.chance) {
        loot.coins.platinum = roll(table.platinum.min, table.platinum.max);
      }

      // Roll for gems
      if (table.gems && Math.random() < table.gems.chance) {
        const count = roll(table.gems.count.min, table.gems.count.max);
        const gemTier = tier === 'low' ? 'low' : tier === 'medium' ? pickRandom(['low', 'medium']) : 
                        tier === 'high' ? pickRandom(['medium', 'high', 'rare']) : pickRandom(['rare', 'legendary']);
        for (let i = 0; i < count; i++) {
          const gem = pickRandom(GEMS[gemTier]);
          loot.gems.push({ ...gem });
        }
      }

      // Roll for art objects
      if (Math.random() < (tier === 'low' ? 0.1 : tier === 'medium' ? 0.2 : 0.3)) {
        const artValue = tier === 'low' ? 25 : tier === 'medium' ? pickRandom([25, 250]) : 
                         tier === 'high' ? pickRandom([250, 750]) : pickRandom([750, 2500, 7500]);
        loot.artObjects.push({
          name: pickRandom(ART_OBJECTS[artValue]),
          value: artValue
        });
      }

      // Roll for magic items
      if (table.items && Math.random() < table.items.chance) {
        const itemRarity = tier === 'low' ? 'common' : tier === 'medium' ? pickRandom(['common', 'uncommon']) :
                          tier === 'high' ? pickRandom(['uncommon', 'rare']) : pickRandom(['rare', 'veryRare', 'legendary']);
        const item = pickRandom(MAGIC_ITEMS[itemRarity]);
        loot.magicItems.push({ ...item, rarity: itemRarity });
      }

      // Calculate total value
      loot.totalValue = 
        loot.coins.copper * 0.01 +
        loot.coins.silver * 0.1 +
        loot.coins.gold +
        loot.coins.platinum * 10 +
        loot.gems.reduce((sum, g) => sum + g.value, 0) +
        loot.artObjects.reduce((sum, a) => sum + a.value, 0);

      setGeneratedLoot(loot);
      setIsGenerating(false);
      toast.success('Loot generated!');
    }, 500);
  };

  // Copy loot to clipboard
  const copyLoot = () => {
    if (!generatedLoot) return;
    
    let text = '=== LOOT ===\n';
    if (generatedLoot.coins.copper) text += `${generatedLoot.coins.copper} CP\n`;
    if (generatedLoot.coins.silver) text += `${generatedLoot.coins.silver} SP\n`;
    if (generatedLoot.coins.gold) text += `${generatedLoot.coins.gold} GP\n`;
    if (generatedLoot.coins.platinum) text += `${generatedLoot.coins.platinum} PP\n`;
    
    if (generatedLoot.gems.length > 0) {
      text += '\nGems:\n';
      generatedLoot.gems.forEach(g => text += `- ${g.name} (${g.value} gp)\n`);
    }
    
    if (generatedLoot.artObjects.length > 0) {
      text += '\nArt Objects:\n';
      generatedLoot.artObjects.forEach(a => text += `- ${a.name} (${a.value} gp)\n`);
    }
    
    if (generatedLoot.magicItems.length > 0) {
      text += '\nMagic Items:\n';
      generatedLoot.magicItems.forEach(i => text += `- ${i.name} (${i.rarity}) - ${i.desc}\n`);
    }
    
    text += `\nTotal Value: ~${Math.round(generatedLoot.totalValue)} gp`;
    
    navigator.clipboard.writeText(text);
    toast.success('Loot copied to clipboard!');
  };

  return (
    <div className="glow-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          color: '#ffffff',
          fontFamily: 'Cityworm, sans-serif',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Coins size={22} style={{ color: '#eab308' }} />
          Loot Generator
        </h3>
        {generatedLoot && (
          <Button
            onClick={copyLoot}
            className="btn-icon"
            style={{ padding: '6px' }}
            title="Copy to clipboard"
          >
            <Copy size={16} />
          </Button>
        )}
      </div>

      {/* Tier Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#67e8f9', fontWeight: '600' }}>
          Loot Tier
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'low', label: 'Low (CR 0-4)', color: '#94a3b8' },
            { id: 'medium', label: 'Medium (CR 5-10)', color: '#22c55e' },
            { id: 'high', label: 'High (CR 11-16)', color: '#4a7dff' },
            { id: 'legendary', label: 'Legendary (CR 17+)', color: '#a855f7' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setLootTier(t.id)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                border: lootTier === t.id ? `2px solid ${t.color}` : '2px solid #1e40af',
                background: lootTier === t.id ? `${t.color}20` : 'transparent',
                color: lootTier === t.id ? t.color : '#94a3b8',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={generateLoot}
        disabled={isGenerating}
        className="btn-primary"
        style={{ 
          width: '100%', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)',
          boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)'
        }}
      >
        <Sparkles size={18} className={isGenerating ? 'animate-spin' : ''} />
        {isGenerating ? 'Generating...' : 'Generate Loot'}
      </Button>

      {/* Generated Loot Display */}
      {generatedLoot && (
        <div>
          {/* Coins */}
          <div style={{ 
            background: 'rgba(10, 10, 40, 0.6)', 
            borderRadius: '10px', 
            padding: '14px',
            marginBottom: '12px',
            border: '2px solid #eab308'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Coins size={16} style={{ color: '#eab308' }} />
              <span style={{ color: '#ffffff', fontWeight: '700', fontFamily: 'Cityworm, sans-serif' }}>Coins</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {generatedLoot.coins.copper > 0 && (
                <span style={{ color: '#cd7f32', fontWeight: '600' }}>{generatedLoot.coins.copper} CP</span>
              )}
              {generatedLoot.coins.silver > 0 && (
                <span style={{ color: '#c0c0c0', fontWeight: '600' }}>{generatedLoot.coins.silver} SP</span>
              )}
              {generatedLoot.coins.gold > 0 && (
                <span style={{ color: '#ffd700', fontWeight: '600' }}>{generatedLoot.coins.gold} GP</span>
              )}
              {generatedLoot.coins.platinum > 0 && (
                <span style={{ color: '#e5e4e2', fontWeight: '600' }}>{generatedLoot.coins.platinum} PP</span>
              )}
              {Object.values(generatedLoot.coins).every(v => v === 0) && (
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>No coins</span>
              )}
            </div>
          </div>

          {/* Gems */}
          {generatedLoot.gems.length > 0 && (
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.6)', 
              borderRadius: '10px', 
              padding: '14px',
              marginBottom: '12px',
              border: '2px solid #a855f7'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Gem size={16} style={{ color: '#a855f7' }} />
                <span style={{ color: '#ffffff', fontWeight: '700', fontFamily: 'Cityworm, sans-serif' }}>Gems</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {generatedLoot.gems.map((gem, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#ffffff' }}>{gem.name}</span>
                    <span style={{ color: '#a855f7', fontWeight: '600' }}>{gem.value} gp</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Art Objects */}
          {generatedLoot.artObjects.length > 0 && (
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.6)', 
              borderRadius: '10px', 
              padding: '14px',
              marginBottom: '12px',
              border: '2px solid #06b6d4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Scroll size={16} style={{ color: '#06b6d4' }} />
                <span style={{ color: '#ffffff', fontWeight: '700', fontFamily: 'Cityworm, sans-serif' }}>Art Objects</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {generatedLoot.artObjects.map((art, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#ffffff' }}>{art.name}</span>
                    <span style={{ color: '#06b6d4', fontWeight: '600' }}>{art.value} gp</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Magic Items */}
          {generatedLoot.magicItems.length > 0 && (
            <div style={{ 
              background: 'rgba(10, 10, 40, 0.6)', 
              borderRadius: '10px', 
              padding: '14px',
              marginBottom: '12px',
              border: '2px solid #22c55e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sword size={16} style={{ color: '#22c55e' }} />
                <span style={{ color: '#ffffff', fontWeight: '700', fontFamily: 'Cityworm, sans-serif' }}>Magic Items</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {generatedLoot.magicItems.map((item, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(34, 197, 94, 0.1)', 
                    borderRadius: '8px', 
                    padding: '10px',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#ffffff', fontWeight: '700' }}>{item.name}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        borderRadius: '10px',
                        background: item.rarity === 'common' ? '#64748b' : 
                                   item.rarity === 'uncommon' ? '#22c55e' :
                                   item.rarity === 'rare' ? '#4a7dff' :
                                   item.rarity === 'veryRare' ? '#a855f7' : '#eab308',
                        color: '#ffffff',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {item.rarity}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.type}</div>
                    <div style={{ fontSize: '12px', color: '#67e8f9', marginTop: '4px' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Value */}
          <div style={{ 
            background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
            borderRadius: '10px', 
            padding: '14px',
            border: '2px solid #eab308',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Total Value</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#eab308', fontFamily: 'Cityworm, sans-serif' }}>
              ~{Math.round(generatedLoot.totalValue)} gp
            </div>
          </div>

          {/* Reroll Button */}
          <Button
            onClick={generateLoot}
            className="btn-outline"
            style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <RotateCcw size={16} />
            Reroll Loot
          </Button>
        </div>
      )}
    </div>
  );
}

export default LootGenerator;
