import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Shield, Swords, Scroll, Coins, Target, ChevronDown, ChevronUp, Zap, Heart, Dices, BookOpen, Users, Wand2, X, Loader2 } from 'lucide-react';
import { ITEMS_DATABASE, ITEM_TYPES, RARITY_OPTIONS } from '@/data/itemsDatabase';
import { API_BASE } from '@/lib/api';

const API_URL = API_BASE;

// Theme colors
const theme = {
  accent: '#E11D48',
  accentSubtle: 'rgba(225, 29, 72, 0.15)',
  bg: { card: '#1F1F1F', dark: '#141414', hover: '#2A2A2A', panel: '#1A1A1A' },
  text: { white: '#FFFFFF', secondary: '#B3B3B3', muted: '#808080' },
  border: 'rgba(255, 255, 255, 0.1)'
};

// TTRPG 5e Difficulty Classes
const DIFFICULTY_CLASSES = [
  { dc: 5, difficulty: 'Very Easy', description: 'Almost anyone can succeed' },
  { dc: 10, difficulty: 'Easy', description: 'A typical person has a 50% chance' },
  { dc: 15, difficulty: 'Medium', description: 'Requires some skill or training' },
  { dc: 20, difficulty: 'Hard', description: 'Even skilled individuals may fail' },
  { dc: 25, difficulty: 'Very Hard', description: 'Only experts attempt this' },
  { dc: 30, difficulty: 'Nearly Impossible', description: 'Heroic effort required' },
];

// Conditions Reference
const CONDITIONS = [
  { name: 'Blinded', effect: 'Cannot see, auto-fail sight checks, disadvantage on attacks, attackers have advantage' },
  { name: 'Charmed', effect: 'Cannot attack charmer, charmer has advantage on social checks' },
  { name: 'Deafened', effect: 'Cannot hear, auto-fail hearing checks' },
  { name: 'Frightened', effect: 'Disadvantage on checks/attacks while source is visible, cannot willingly move closer' },
  { name: 'Grappled', effect: 'Speed becomes 0, cannot benefit from speed bonuses' },
  { name: 'Incapacitated', effect: 'Cannot take actions or reactions' },
  { name: 'Invisible', effect: 'Cannot be seen without magic, advantage on attacks, attackers have disadvantage' },
  { name: 'Paralyzed', effect: 'Incapacitated, cannot move/speak, auto-fail STR/DEX saves, attacks have advantage, hits within 5ft are crits' },
  { name: 'Petrified', effect: 'Turned to stone, weight x10, incapacitated, resistant to all damage' },
  { name: 'Poisoned', effect: 'Disadvantage on attacks and ability checks' },
  { name: 'Prone', effect: 'Disadvantage on attacks, melee attacks against have advantage, ranged have disadvantage' },
  { name: 'Restrained', effect: 'Speed 0, disadvantage on attacks and DEX saves, attacks against have advantage' },
  { name: 'Stunned', effect: 'Incapacitated, cannot move, auto-fail STR/DEX saves, attacks have advantage' },
  { name: 'Unconscious', effect: 'Incapacitated, prone, auto-fail STR/DEX saves, attacks have advantage, hits within 5ft are crits' },
  { name: 'Exhaustion', effect: '1=Disadvantage on checks, 2=Half speed, 3=Disadvantage on attacks/saves, 4=Half HP, 5=Speed 0, 6=Death' },
];

// Cover Rules
const COVER_RULES = [
  { type: 'Half Cover', ac: '+2', dex: '+2', description: 'Low wall, furniture, another creature' },
  { type: 'Three-Quarters Cover', ac: '+5', dex: '+5', description: 'Portcullis, arrow slit, tree trunk' },
  { type: 'Total Cover', ac: 'N/A', dex: 'N/A', description: 'Cannot be targeted directly by attacks or spells' },
];

// Spell Schools with colors
const SPELL_SCHOOLS = {
  'Abjuration': '#3B82F6',
  'Conjuration': '#F59E0B',
  'Divination': '#A855F7',
  'Enchantment': '#EC4899',
  'Evocation': '#EF4444',
  'Illusion': '#8B5CF6',
  'Necromancy': '#6B7280',
  'Transmutation': '#22C55E',
};

function QuickReferenceTab({ campaignId }) {
  const [activeSection, setActiveSection] = useState('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [showMagicOnly, setShowMagicOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    dc: true,
    conditions: false,
    cover: false
  });

  // API Data States
  const [spells, setSpells] = useState([]);
  const [classes, setClasses] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState({ spells: false, classes: false, races: false });
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedRace, setSelectedRace] = useState(null);
  
  // Spell Filters
  const [spellLevelFilter, setSpellLevelFilter] = useState('all');
  const [spellSchoolFilter, setSpellSchoolFilter] = useState('all');
  const [spellClassFilter, setSpellClassFilter] = useState('all');

  // Fetch spells from API
  const fetchSpells = useCallback(async () => {
    if (spells.length > 0) return;
    setLoading(prev => ({ ...prev, spells: true }));
    try {
      const response = await fetch(`${API_URL}/srd/spells`);
      const data = await response.json();
      setSpells(data.spells || []);
    } catch (error) {
      console.error('Failed to fetch spells:', error);
    } finally {
      setLoading(prev => ({ ...prev, spells: false }));
    }
  }, [spells.length]);

  // Fetch classes from API
  const fetchClasses = useCallback(async () => {
    if (classes.length > 0) return;
    setLoading(prev => ({ ...prev, classes: true }));
    try {
      const response = await fetch(`${API_URL}/srd/classes`);
      const data = await response.json();
      setClasses(data.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(prev => ({ ...prev, classes: false }));
    }
  }, [classes.length]);

  // Fetch races from API
  const fetchRaces = useCallback(async () => {
    if (races.length > 0) return;
    setLoading(prev => ({ ...prev, races: true }));
    try {
      const response = await fetch(`${API_URL}/srd/races`);
      const data = await response.json();
      setRaces(data.races || []);
    } catch (error) {
      console.error('Failed to fetch races:', error);
    } finally {
      setLoading(prev => ({ ...prev, races: false }));
    }
  }, [races.length]);

  // Fetch data when section changes
  useEffect(() => {
    if (activeSection === 'spells') fetchSpells();
    if (activeSection === 'classes') fetchClasses();
    if (activeSection === 'races') fetchRaces();
  }, [activeSection, fetchSpells, fetchClasses, fetchRaces]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter items
  const filteredItems = ITEMS_DATABASE.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = itemTypeFilter === 'all' || item.type === itemTypeFilter;
    const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
    const matchesMagic = !showMagicOnly || item.is_magic;
    return matchesSearch && matchesType && matchesRarity && matchesMagic;
  }).slice(0, 100);

  // Filter spells
  const filteredSpells = spells.filter(spell => {
    const matchesSearch = spell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (spell.description && spell.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = spellLevelFilter === 'all' || spell.level === parseInt(spellLevelFilter);
    const matchesSchool = spellSchoolFilter === 'all' || spell.school?.toLowerCase() === spellSchoolFilter.toLowerCase();
    const matchesClass = spellClassFilter === 'all' || (spell.classes && spell.classes.some(c => c.toLowerCase() === spellClassFilter.toLowerCase()));
    return matchesSearch && matchesLevel && matchesSchool && matchesClass;
  });

  // Filter classes
  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter races
  const filteredRaces = races.filter(race =>
    race.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (race.traits && race.traits.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const sections = [
    { id: 'items', label: 'Items', icon: Swords },
    { id: 'spells', label: 'Spells', icon: Wand2 },
    { id: 'classes', label: 'Classes', icon: Users },
    { id: 'races', label: 'Races', icon: BookOpen },
    { id: 'rules', label: 'Rules', icon: Scroll },
  ];

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'Legendary': return '#F59E0B';
      case 'Very Rare': return '#A855F7';
      case 'Rare': return '#3B82F6';
      case 'Uncommon': return '#22C55E';
      default: return theme.text.muted;
    }
  };

  // Get unique spell classes for filter
  const spellClassOptions = [...new Set(spells.flatMap(s => s.classes || []))].sort();

  return (
    <div style={{ fontFamily: 'Cityworm, sans-serif' }} data-testid="quick-reference-tab">
      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {sections.map(section => (
          <Button
            key={section.id}
            onClick={() => { 
              setActiveSection(section.id); 
              setSearchTerm(''); 
              setSelectedSpell(null);
              setSelectedClass(null);
              setSelectedRace(null);
            }}
            data-testid={`reference-tab-${section.id}`}
            style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              background: activeSection === section.id ? theme.accent : 'transparent',
              border: activeSection === section.id ? 'none' : `1px solid ${theme.border}`,
              color: activeSection === section.id ? theme.text.white : theme.text.secondary,
              padding: '10px 16px'
            }}
          >
            <section.icon size={16} />
            {section.label}
          </Button>
        ))}
      </div>

      {/* Search Bar - Global */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.text.muted }} />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${activeSection}...`}
          style={{ 
            paddingLeft: '38px',
            background: theme.bg.dark,
            border: `1px solid ${theme.border}`,
            color: theme.text.white
          }}
          data-testid="reference-search-input"
        />
      </div>

      {/* Items Section */}
      {activeSection === 'items' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: theme.text.white, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Swords size={24} style={{ color: theme.accent }} />
              Items Database
            </h2>
            <span style={{ color: theme.text.muted, fontSize: '14px' }}>
              {ITEMS_DATABASE.length.toLocaleString()} items
            </span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              data-testid="item-type-filter"
              style={{ 
                padding: '8px 12px', 
                minWidth: '150px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white
              }}
            >
              <option value="all">All Types</option>
              {ITEM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              data-testid="item-rarity-filter"
              style={{ 
                padding: '8px 12px', 
                minWidth: '130px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white
              }}
            >
              <option value="all">All Rarities</option>
              {RARITY_OPTIONS.map(rarity => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.accent, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showMagicOnly} 
                onChange={(e) => setShowMagicOnly(e.target.checked)}
                style={{ accentColor: theme.accent }}
              />
              <span style={{ fontSize: '13px' }}>Magic Only</span>
            </label>
          </div>

          {/* Items Grid with Click-to-Expand */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {filteredItems.map((item, index) => (
              <div 
                key={`${item.name}-${index}`}
                onClick={() => setSelectedItem(selectedItem?.name === item.name ? null : item)}
                data-testid={`item-card-${index}`}
                style={{ 
                  padding: '16px',
                  background: selectedItem?.name === item.name ? theme.accentSubtle : theme.bg.card,
                  border: `1px solid ${selectedItem?.name === item.name ? theme.accent : theme.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ color: theme.text.white, fontWeight: '600', fontSize: '14px' }}>
                      {item.name}
                    </span>
                    {item.is_magic && <span style={{ color: theme.accent, marginLeft: '6px' }}>✨</span>}
                  </div>
                  <span style={{ fontSize: '11px', color: getRarityColor(item.rarity) }}>
                    {item.rarity || 'Common'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '8px' }}>
                  {item.type} {item.damage && `• ${item.damage} ${item.damage_type}`} {item.value && `• ${item.value} gp`}
                </div>
                {selectedItem?.name === item.name && item.description && (
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: `1px solid ${theme.border}`,
                    fontSize: '13px',
                    color: theme.text.secondary,
                    lineHeight: '1.6'
                  }}>
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ marginTop: '12px', fontSize: '12px', color: theme.text.muted }}>
            Showing {filteredItems.length} of {ITEMS_DATABASE.length} items. Click an item to see its description.
          </p>
        </div>
      )}

      {/* Spells Section - Enhanced with API Data */}
      {activeSection === 'spells' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: theme.text.white, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Wand2 size={24} style={{ color: theme.accent }} />
              SRD Spells
            </h2>
            <span style={{ color: theme.text.muted, fontSize: '14px' }}>
              {loading.spells ? <Loader2 size={16} className="animate-spin" /> : `${spells.length} spells`}
            </span>
          </div>

          {/* Spell Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select
              value={spellLevelFilter}
              onChange={(e) => setSpellLevelFilter(e.target.value)}
              data-testid="spell-level-filter"
              style={{ 
                padding: '8px 12px', 
                minWidth: '120px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white
              }}
            >
              <option value="all">All Levels</option>
              <option value="0">Cantrip</option>
              {[1,2,3,4,5,6,7,8,9].map(level => (
                <option key={level} value={level}>Level {level}</option>
              ))}
            </select>
            <select
              value={spellSchoolFilter}
              onChange={(e) => setSpellSchoolFilter(e.target.value)}
              data-testid="spell-school-filter"
              style={{ 
                padding: '8px 12px', 
                minWidth: '140px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white
              }}
            >
              <option value="all">All Schools</option>
              {Object.keys(SPELL_SCHOOLS).map(school => (
                <option key={school} value={school}>{school}</option>
              ))}
            </select>
            <select
              value={spellClassFilter}
              onChange={(e) => setSpellClassFilter(e.target.value)}
              data-testid="spell-class-filter"
              style={{ 
                padding: '8px 12px', 
                minWidth: '140px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white
              }}
            >
              <option value="all">All Classes</option>
              {spellClassOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {loading.spells ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: theme.accent }} />
            </div>
          ) : (
            <>
              {/* Spells Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
                {filteredSpells.slice(0, 50).map((spell, index) => (
                  <div 
                    key={`${spell.name}-${index}`}
                    onClick={() => setSelectedSpell(selectedSpell?.name === spell.name ? null : spell)}
                    data-testid={`spell-card-${index}`}
                    style={{ 
                      padding: '16px',
                      background: selectedSpell?.name === spell.name ? theme.accentSubtle : theme.bg.card,
                      border: `1px solid ${selectedSpell?.name === spell.name ? theme.accent : theme.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: theme.text.white, fontWeight: '600', fontSize: '16px' }}>{spell.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ 
                          background: SPELL_SCHOOLS[spell.school] || theme.text.muted, 
                          color: '#fff', 
                          padding: '2px 8px', 
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {spell.school}
                        </span>
                        <span style={{ 
                          background: theme.accentSubtle, 
                          color: theme.accent, 
                          padding: '2px 8px', 
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '10px' }}>
                      {spell.casting_time} • {spell.range} • {spell.duration}
                      {spell.concentration && <span style={{ color: theme.accent, marginLeft: '8px' }}>⚡ Concentration</span>}
                      {spell.ritual && <span style={{ color: '#22C55E', marginLeft: '8px' }}>📜 Ritual</span>}
                    </div>
                    
                    {/* Full description when selected */}
                    {selectedSpell?.name === spell.name && (
                      <div style={{ 
                        marginTop: '12px', 
                        paddingTop: '12px', 
                        borderTop: `1px solid ${theme.border}`
                      }}>
                        <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '8px' }}>
                          <strong>Components:</strong> {spell.components?.join(', ')}
                          {spell.material && <span> ({spell.material})</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '8px' }}>
                          <strong>Classes:</strong> {spell.classes?.join(', ')}
                        </div>
                        <p style={{ fontSize: '13px', color: theme.text.secondary, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {spell.description}
                        </p>
                        {spell.higher_levels && (
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '10px', 
                            background: theme.bg.dark, 
                            border: `1px solid ${theme.border}` 
                          }}>
                            <strong style={{ color: theme.accent, fontSize: '12px' }}>At Higher Levels:</strong>
                            <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px', lineHeight: '1.5' }}>
                              {spell.higher_levels}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '16px', fontSize: '12px', color: theme.text.muted }}>
                Showing {Math.min(filteredSpells.length, 50)} of {filteredSpells.length} spells. Click a spell for full details.
              </p>
            </>
          )}
        </div>
      )}

      {/* Classes Section - Enhanced with API Data */}
      {activeSection === 'classes' && (
        <div>
          <h2 style={{ fontSize: '20px', color: theme.text.white, fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} style={{ color: theme.accent }} />
            Character Classes
            {loading.classes && <Loader2 size={20} className="animate-spin" style={{ color: theme.accent }} />}
          </h2>

          {loading.classes ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: theme.accent }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
              {filteredClasses.map((cls, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedClass(selectedClass?.name === cls.name ? null : cls)}
                  data-testid={`class-card-${index}`}
                  style={{ 
                    padding: '16px',
                    background: selectedClass?.name === cls.name ? theme.accentSubtle : theme.bg.card,
                    border: `1px solid ${selectedClass?.name === cls.name ? theme.accent : theme.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <h3 style={{ color: theme.text.white, fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
                    {cls.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: theme.text.muted, marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span><strong style={{ color: theme.accent }}>Hit Die:</strong> {cls.hit_die}</span>
                    <span><strong style={{ color: theme.accent }}>Saves:</strong> {cls.saving_throws?.join(', ')}</span>
                  </div>
                  
                  {/* Full details when selected */}
                  {selectedClass?.name === cls.name && (
                    <div style={{ 
                      marginTop: '12px', 
                      paddingTop: '12px', 
                      borderTop: `1px solid ${theme.border}`
                    }}>
                      {cls.proficiencies && cls.proficiencies.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Proficiencies:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px' }}>
                            {cls.proficiencies.join(', ')}
                          </p>
                        </div>
                      )}
                      {cls.starting_equipment && cls.starting_equipment.length > 0 && (
                        <div>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Starting Equipment:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px' }}>
                            {cls.starting_equipment.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: '16px', fontSize: '12px', color: theme.text.muted }}>
            {classes.length} classes available. Click a class for full details.
          </p>
        </div>
      )}

      {/* Races Section - Enhanced with API Data */}
      {activeSection === 'races' && (
        <div>
          <h2 style={{ fontSize: '20px', color: theme.text.white, fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={24} style={{ color: theme.accent }} />
            Character Races
            {loading.races && <Loader2 size={20} className="animate-spin" style={{ color: theme.accent }} />}
          </h2>

          {loading.races ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: theme.accent }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
              {filteredRaces.map((race, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedRace(selectedRace?.name === race.name ? null : race)}
                  data-testid={`race-card-${index}`}
                  style={{ 
                    padding: '16px',
                    background: selectedRace?.name === race.name ? theme.accentSubtle : theme.bg.card,
                    border: `1px solid ${selectedRace?.name === race.name ? theme.accent : theme.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <h3 style={{ color: theme.text.white, fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
                    {race.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: theme.text.muted, marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span><strong style={{ color: theme.accent }}>ASI:</strong> {race.ability_bonuses}</span>
                    <span><strong style={{ color: theme.accent }}>Speed:</strong> {race.speed} ft</span>
                    <span><strong style={{ color: theme.accent }}>Size:</strong> {race.size}</span>
                  </div>
                  
                  {/* Traits summary */}
                  {race.traits && race.traits.length > 0 && (
                    <p style={{ fontSize: '12px', color: theme.text.secondary }}>
                      <strong style={{ color: theme.accent }}>Traits:</strong> {race.traits.join(', ')}
                    </p>
                  )}
                  
                  {/* Full details when selected */}
                  {selectedRace?.name === race.name && (
                    <div style={{ 
                      marginTop: '12px', 
                      paddingTop: '12px', 
                      borderTop: `1px solid ${theme.border}`
                    }}>
                      {race.age && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Age:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px', lineHeight: '1.5' }}>
                            {race.age}
                          </p>
                        </div>
                      )}
                      {race.alignment && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Alignment:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px', lineHeight: '1.5' }}>
                            {race.alignment}
                          </p>
                        </div>
                      )}
                      {race.size_description && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Size:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px', lineHeight: '1.5' }}>
                            {race.size_description}
                          </p>
                        </div>
                      )}
                      {race.languages && race.languages.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Languages:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px' }}>
                            {race.languages.join(', ')}
                          </p>
                        </div>
                      )}
                      {race.subraces && race.subraces.length > 0 && (
                        <div>
                          <strong style={{ color: theme.accent, fontSize: '12px' }}>Subraces:</strong>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '4px' }}>
                            {race.subraces.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: '16px', fontSize: '12px', color: theme.text.muted }}>
            {races.length} races available. Click a race for full details.
          </p>
        </div>
      )}

      {/* Rules Section */}
      {activeSection === 'rules' && (
        <div>
          <h2 style={{ fontSize: '20px', color: theme.text.white, fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Scroll size={24} style={{ color: theme.accent }} />
            Rules Quick Reference
          </h2>

          {/* Difficulty Classes */}
          <div style={{ marginBottom: '16px', background: theme.bg.card, border: `1px solid ${theme.border}` }}>
            <div 
              onClick={() => toggleSection('dc')}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h3 style={{ fontSize: '16px', color: theme.text.white, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Target size={20} style={{ color: theme.accent }} />
                Difficulty Classes (DC)
              </h3>
              {expandedSections.dc ? <ChevronUp size={20} color={theme.accent} /> : <ChevronDown size={20} color={theme.accent} />}
            </div>
            {expandedSections.dc && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {DIFFICULTY_CLASSES.map(dc => (
                  <div key={dc.dc} style={{ background: theme.bg.dark, border: `1px solid ${theme.border}`, padding: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: theme.accent }}>{dc.dc}</div>
                    <div style={{ fontSize: '14px', color: theme.text.white, fontWeight: '600' }}>{dc.difficulty}</div>
                    <div style={{ fontSize: '12px', color: theme.text.muted }}>{dc.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conditions */}
          <div style={{ marginBottom: '16px', background: theme.bg.card, border: `1px solid ${theme.border}` }}>
            <div 
              onClick={() => toggleSection('conditions')}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h3 style={{ fontSize: '16px', color: theme.text.white, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={20} style={{ color: theme.accent }} />
                Conditions
              </h3>
              {expandedSections.conditions ? <ChevronUp size={20} color={theme.accent} /> : <ChevronDown size={20} color={theme.accent} />}
            </div>
            {expandedSections.conditions && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {CONDITIONS.map(condition => (
                  <div key={condition.name} style={{ background: theme.bg.dark, border: `1px solid ${theme.border}`, padding: '12px' }}>
                    <div style={{ fontSize: '14px', color: theme.accent, fontWeight: '600', marginBottom: '6px' }}>{condition.name}</div>
                    <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: '1.5' }}>{condition.effect}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cover */}
          <div style={{ marginBottom: '16px', background: theme.bg.card, border: `1px solid ${theme.border}` }}>
            <div 
              onClick={() => toggleSection('cover')}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h3 style={{ fontSize: '16px', color: theme.text.white, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} style={{ color: theme.accent }} />
                Cover Rules
              </h3>
              {expandedSections.cover ? <ChevronUp size={20} color={theme.accent} /> : <ChevronDown size={20} color={theme.accent} />}
            </div>
            {expandedSections.cover && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {COVER_RULES.map(cover => (
                  <div key={cover.type} style={{ background: theme.bg.dark, border: `1px solid ${theme.border}`, padding: '12px' }}>
                    <div style={{ fontSize: '14px', color: theme.accent, fontWeight: '600', marginBottom: '6px' }}>{cover.type}</div>
                    <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '4px' }}>AC: {cover.ac} | DEX Save: {cover.dex}</div>
                    <div style={{ fontSize: '12px', color: theme.text.secondary }}>{cover.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickReferenceTab;
