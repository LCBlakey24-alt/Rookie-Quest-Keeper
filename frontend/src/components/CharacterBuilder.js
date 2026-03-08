import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { 
  ArrowLeft, ArrowRight, User, Sparkles, Loader, Wand2, 
  Check, Shield, Heart, Swords, BookOpen, Image, Dices, Star
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Quick suggestion prompts
const AI_SUGGESTIONS = [
  "A sneaky rogue with a bow and dark past",
  "A holy warrior seeking redemption",
  "A wizard obsessed with ancient secrets",
  "A druid protecting their homeland",
  "A charming bard collecting tales"
];

// Standard Array
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Recommended stats by class
const RECOMMENDED_STATS = {
  'Barbarian': { strength: 16, dexterity: 14, constitution: 15, intelligence: 8, wisdom: 10, charisma: 12 },
  'Bard': { strength: 8, dexterity: 14, constitution: 12, intelligence: 13, wisdom: 10, charisma: 16 },
  'Cleric': { strength: 14, dexterity: 10, constitution: 13, intelligence: 8, wisdom: 16, charisma: 12 },
  'Druid': { strength: 8, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 16, charisma: 10 },
  'Fighter': { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 8 },
  'Monk': { strength: 10, dexterity: 16, constitution: 14, intelligence: 8, wisdom: 15, charisma: 12 },
  'Paladin': { strength: 16, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 12, charisma: 15 },
  'Ranger': { strength: 12, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 15, charisma: 8 },
  'Rogue': { strength: 10, dexterity: 16, constitution: 14, intelligence: 13, wisdom: 12, charisma: 8 },
  'Sorcerer': { strength: 8, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 16 },
  'Warlock': { strength: 8, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 10, charisma: 16 },
  'Wizard': { strength: 8, dexterity: 14, constitution: 13, intelligence: 16, wisdom: 12, charisma: 10 }
};

// 5e Data - Expanded Race List
const RACES = [
  // Core Races (PHB)
  { name: 'Human', bonus: '+1 to all stats', source: 'PHB' },
  { name: 'Elf', bonus: '+2 DEX', source: 'PHB' },
  { name: 'Dwarf', bonus: '+2 CON', source: 'PHB' },
  { name: 'Halfling', bonus: '+2 DEX', source: 'PHB' },
  { name: 'Dragonborn', bonus: '+2 STR, +1 CHA', source: 'PHB' },
  { name: 'Gnome', bonus: '+2 INT', source: 'PHB' },
  { name: 'Half-Elf', bonus: '+2 CHA, +1 to two others', source: 'PHB' },
  { name: 'Half-Orc', bonus: '+2 STR, +1 CON', source: 'PHB' },
  { name: 'Tiefling', bonus: '+2 CHA, +1 INT', source: 'PHB' },
  // Volo's Guide / Mordenkainen's
  { name: 'Aasimar', bonus: '+2 CHA, +1 other', source: "Volo's" },
  { name: 'Firbolg', bonus: '+2 WIS, +1 STR', source: "Volo's" },
  { name: 'Goliath', bonus: '+2 STR, +1 CON', source: "Volo's" },
  { name: 'Kenku', bonus: '+2 DEX, +1 WIS', source: "Volo's" },
  { name: 'Lizardfolk', bonus: '+2 CON, +1 WIS', source: "Volo's" },
  { name: 'Tabaxi', bonus: '+2 DEX, +1 CHA', source: "Volo's" },
  { name: 'Triton', bonus: '+1 STR, +1 CON, +1 CHA', source: "Volo's" },
  { name: 'Bugbear', bonus: '+2 STR, +1 DEX', source: "Volo's" },
  { name: 'Goblin', bonus: '+2 DEX, +1 CON', source: "Volo's" },
  { name: 'Hobgoblin', bonus: '+2 CON, +1 INT', source: "Volo's" },
  { name: 'Kobold', bonus: '+2 DEX, -2 STR', source: "Volo's" },
  { name: 'Orc', bonus: '+2 STR, +1 CON', source: "Volo's" },
  { name: 'Yuan-ti Pureblood', bonus: '+2 CHA, +1 INT', source: "Volo's" },
  // Theros
  { name: 'Leonin', bonus: '+2 CON, +1 STR', source: 'Theros' },
  { name: 'Satyr', bonus: '+2 CHA, +1 DEX', source: 'Theros' },
  // Strixhaven / Wildemount
  { name: 'Owlin', bonus: '+2 to one, +1 to another', source: 'Strixhaven' },
  // Eberron
  { name: 'Changeling', bonus: '+2 CHA, +1 other', source: 'Eberron' },
  { name: 'Kalashtar', bonus: '+2 WIS, +1 CHA', source: 'Eberron' },
  { name: 'Shifter', bonus: '+2 DEX or WIS', source: 'Eberron' },
  { name: 'Warforged', bonus: '+2 CON, +1 other', source: 'Eberron' },
  // Ravnica
  { name: 'Centaur', bonus: '+2 STR, +1 WIS', source: 'Ravnica' },
  { name: 'Loxodon', bonus: '+2 CON, +1 WIS', source: 'Ravnica' },
  { name: 'Minotaur', bonus: '+2 STR, +1 CON', source: 'Ravnica' },
  { name: 'Simic Hybrid', bonus: '+2 CON, +1 other', source: 'Ravnica' },
  { name: 'Vedalken', bonus: '+2 INT, +1 WIS', source: 'Ravnica' },
  // Elemental Evil
  { name: 'Aarakocra', bonus: '+2 DEX, +1 WIS', source: 'EE' },
  { name: 'Genasi (Air)', bonus: '+2 CON, +1 DEX', source: 'EE' },
  { name: 'Genasi (Earth)', bonus: '+2 CON, +1 STR', source: 'EE' },
  { name: 'Genasi (Fire)', bonus: '+2 CON, +1 INT', source: 'EE' },
  { name: 'Genasi (Water)', bonus: '+2 CON, +1 WIS', source: 'EE' },
  // Spelljammer / Newer
  { name: 'Autognome', bonus: '+2 to one, +1 to another', source: 'Spelljammer' },
  { name: 'Giff', bonus: '+2 STR, +1 CON', source: 'Spelljammer' },
  { name: 'Hadozee', bonus: '+2 DEX, +1 other', source: 'Spelljammer' },
  { name: 'Plasmoid', bonus: '+2 to one, +1 to another', source: 'Spelljammer' },
  { name: 'Thri-kreen', bonus: '+2 DEX, +1 other', source: 'Spelljammer' },
  // Monsters of the Multiverse style (flexible ASI)
  { name: 'Harengon', bonus: '+2 to one, +1 to another', source: 'Witchlight' },
  { name: 'Fairy', bonus: '+2 to one, +1 to another', source: 'Witchlight' },
  // Custom
  { name: 'Custom Lineage', bonus: '+2 to one stat', source: 'Tasha\'s' },
];

const CLASSES = [
  { name: 'Barbarian', color: '#DC2626', hitDie: 'd12', primary: 'STR' },
  { name: 'Bard', color: '#EC4899', hitDie: 'd8', primary: 'CHA' },
  { name: 'Cleric', color: '#F59E0B', hitDie: 'd8', primary: 'WIS' },
  { name: 'Druid', color: '#22C55E', hitDie: 'd8', primary: 'WIS' },
  { name: 'Fighter', color: '#EF4444', hitDie: 'd10', primary: 'STR/DEX' },
  { name: 'Monk', color: '#14B8A6', hitDie: 'd8', primary: 'DEX/WIS' },
  { name: 'Paladin', color: '#FBBF24', hitDie: 'd10', primary: 'STR/CHA' },
  { name: 'Ranger', color: '#10B981', hitDie: 'd10', primary: 'DEX/WIS' },
  { name: 'Rogue', color: '#6B7280', hitDie: 'd8', primary: 'DEX' },
  { name: 'Sorcerer', color: '#7C3AED', hitDie: 'd6', primary: 'CHA' },
  { name: 'Warlock', color: '#6366F1', hitDie: 'd8', primary: 'CHA' },
  { name: 'Wizard', color: '#8B5CF6', hitDie: 'd6', primary: 'INT' }
];

const BACKGROUNDS = [
  { name: 'Acolyte', feature: 'Shelter of the Faithful', skills: ['Insight', 'Religion'], tools: [], languages: 2 },
  { name: 'Charlatan', feature: 'False Identity', skills: ['Deception', 'Sleight of Hand'], tools: ['Disguise kit', 'Forgery kit'], languages: 0 },
  { name: 'Criminal', feature: 'Criminal Contact', skills: ['Deception', 'Stealth'], tools: ['Gaming set', 'Thieves\' tools'], languages: 0 },
  { name: 'Entertainer', feature: 'By Popular Demand', skills: ['Acrobatics', 'Performance'], tools: ['Disguise kit', 'Musical instrument'], languages: 0 },
  { name: 'Folk Hero', feature: 'Rustic Hospitality', skills: ['Animal Handling', 'Survival'], tools: ['Artisan\'s tools', 'Vehicles (land)'], languages: 0 },
  { name: 'Guild Artisan', feature: 'Guild Membership', skills: ['Insight', 'Persuasion'], tools: ['Artisan\'s tools'], languages: 1 },
  { name: 'Hermit', feature: 'Discovery', skills: ['Medicine', 'Religion'], tools: ['Herbalism kit'], languages: 1 },
  { name: 'Noble', feature: 'Position of Privilege', skills: ['History', 'Persuasion'], tools: ['Gaming set'], languages: 1 },
  { name: 'Outlander', feature: 'Wanderer', skills: ['Athletics', 'Survival'], tools: ['Musical instrument'], languages: 1 },
  { name: 'Sage', feature: 'Researcher', skills: ['Arcana', 'History'], tools: [], languages: 2 },
  { name: 'Sailor', feature: 'Ship\'s Passage', skills: ['Athletics', 'Perception'], tools: ['Navigator\'s tools', 'Vehicles (water)'], languages: 0 },
  { name: 'Soldier', feature: 'Military Rank', skills: ['Athletics', 'Intimidation'], tools: ['Gaming set', 'Vehicles (land)'], languages: 0 },
  { name: 'Urchin', feature: 'City Secrets', skills: ['Sleight of Hand', 'Stealth'], tools: ['Disguise kit', 'Thieves\' tools'], languages: 0 },
];

// Subclasses by class
const SUBCLASSES = {
  'Barbarian': [
    { name: 'Path of the Berserker', level: 3, description: 'Frenzy in battle for extra attacks' },
    { name: 'Path of the Totem Warrior', level: 3, description: 'Channel spirit animals for power' },
    { name: 'Path of the Ancestral Guardian', level: 3, description: 'Spirits protect your allies' },
    { name: 'Path of the Storm Herald', level: 3, description: 'Elemental aura damages foes' },
    { name: 'Path of the Zealot', level: 3, description: 'Divine fury and resurrection' },
  ],
  'Bard': [
    { name: 'College of Lore', level: 3, description: 'Additional skills and cutting words' },
    { name: 'College of Valor', level: 3, description: 'Combat training and battle magic' },
    { name: 'College of Glamour', level: 3, description: 'Fey-inspired charm and beauty' },
    { name: 'College of Swords', level: 3, description: 'Blade flourishes in combat' },
    { name: 'College of Whispers', level: 3, description: 'Psychic blades and manipulation' },
  ],
  'Cleric': [
    { name: 'Life Domain', level: 1, description: 'Master healer with bonus healing' },
    { name: 'Light Domain', level: 1, description: 'Radiant damage and fire spells' },
    { name: 'War Domain', level: 1, description: 'Martial prowess and weapon attacks' },
    { name: 'Knowledge Domain', level: 1, description: 'Divine insights and skills' },
    { name: 'Tempest Domain', level: 1, description: 'Thunder and lightning powers' },
    { name: 'Trickery Domain', level: 1, description: 'Illusions and stealth' },
  ],
  'Druid': [
    { name: 'Circle of the Land', level: 2, description: 'Extra spells based on terrain' },
    { name: 'Circle of the Moon', level: 2, description: 'Powerful wild shape combat' },
    { name: 'Circle of Dreams', level: 2, description: 'Fey healing and teleportation' },
    { name: 'Circle of the Shepherd', level: 2, description: 'Summon and protect beasts' },
    { name: 'Circle of Spores', level: 2, description: 'Necrotic damage and undead' },
  ],
  'Fighter': [
    { name: 'Champion', level: 3, description: 'Improved critical hits' },
    { name: 'Battle Master', level: 3, description: 'Combat maneuvers and superiority dice' },
    { name: 'Eldritch Knight', level: 3, description: 'Combine fighting with magic' },
    { name: 'Samurai', level: 3, description: 'Fighting spirit and advantage' },
    { name: 'Echo Knight', level: 3, description: 'Create echo to attack from' },
  ],
  'Monk': [
    { name: 'Way of the Open Hand', level: 3, description: 'Stunning strikes and knockbacks' },
    { name: 'Way of Shadow', level: 3, description: 'Ninja-like stealth abilities' },
    { name: 'Way of the Four Elements', level: 3, description: 'Elemental martial arts' },
    { name: 'Way of the Kensei', level: 3, description: 'Master of chosen weapons' },
    { name: 'Way of Mercy', level: 3, description: 'Heal allies, harm enemies' },
  ],
  'Paladin': [
    { name: 'Oath of Devotion', level: 3, description: 'Classic holy warrior' },
    { name: 'Oath of the Ancients', level: 3, description: 'Protect nature and light' },
    { name: 'Oath of Vengeance', level: 3, description: 'Hunt evil relentlessly' },
    { name: 'Oath of Conquest', level: 3, description: 'Dominate with fear' },
    { name: 'Oath of Redemption', level: 3, description: 'Peace and second chances' },
  ],
  'Ranger': [
    { name: 'Hunter', level: 3, description: 'Specialized enemy tactics' },
    { name: 'Beast Master', level: 3, description: 'Bond with animal companion' },
    { name: 'Gloom Stalker', level: 3, description: 'Ambush from darkness' },
    { name: 'Horizon Walker', level: 3, description: 'Planar warrior abilities' },
    { name: 'Fey Wanderer', level: 3, description: 'Fey charm and psychic damage' },
  ],
  'Rogue': [
    { name: 'Thief', level: 3, description: 'Fast hands and second-story work' },
    { name: 'Assassin', level: 3, description: 'Deadly first strikes' },
    { name: 'Arcane Trickster', level: 3, description: 'Magic-enhanced roguery' },
    { name: 'Swashbuckler', level: 3, description: 'Charming duelist' },
    { name: 'Phantom', level: 3, description: 'Death-touched abilities' },
  ],
  'Sorcerer': [
    { name: 'Draconic Bloodline', level: 1, description: 'Dragon ancestry powers' },
    { name: 'Wild Magic', level: 1, description: 'Unpredictable magical surges' },
    { name: 'Divine Soul', level: 1, description: 'Access to cleric spells' },
    { name: 'Shadow Magic', level: 1, description: 'Darkness and fear' },
    { name: 'Aberrant Mind', level: 1, description: 'Psionic powers' },
  ],
  'Warlock': [
    { name: 'The Fiend', level: 1, description: 'Demonic patron, fire powers' },
    { name: 'The Archfey', level: 1, description: 'Fey patron, charm and teleport' },
    { name: 'The Great Old One', level: 1, description: 'Eldritch patron, psychic powers' },
    { name: 'The Celestial', level: 1, description: 'Divine patron, healing magic' },
    { name: 'The Hexblade', level: 1, description: 'Sentient weapon patron' },
  ],
  'Wizard': [
    { name: 'School of Evocation', level: 2, description: 'Powerful damage spells' },
    { name: 'School of Abjuration', level: 2, description: 'Protective magic' },
    { name: 'School of Conjuration', level: 2, description: 'Summoning and teleportation' },
    { name: 'School of Divination', level: 2, description: 'Portent and knowledge' },
    { name: 'School of Illusion', level: 2, description: 'Master of deception' },
    { name: 'School of Necromancy', level: 2, description: 'Command undead' },
  ],
};

// Starting equipment by class
const STARTING_EQUIPMENT = {
  'Barbarian': ['Greataxe or martial melee weapon', 'Two handaxes or simple weapon', 'Explorer\'s pack', '4 javelins'],
  'Bard': ['Rapier, longsword, or simple weapon', 'Diplomat\'s pack or entertainer\'s pack', 'Lute or musical instrument', 'Leather armor, dagger'],
  'Cleric': ['Mace or warhammer', 'Scale mail, leather, or chain mail', 'Light crossbow or simple weapon', 'Priest\'s pack or explorer\'s pack', 'Shield and holy symbol'],
  'Druid': ['Wooden shield or simple weapon', 'Scimitar or simple melee weapon', 'Leather armor', 'Explorer\'s pack', 'Druidic focus'],
  'Fighter': ['Chain mail or leather + longbow', 'Martial weapon + shield or two martial weapons', 'Light crossbow or two handaxes', 'Dungeoneer\'s pack or explorer\'s pack'],
  'Monk': ['Shortsword or simple weapon', '10 darts', 'Dungeoneer\'s pack or explorer\'s pack'],
  'Paladin': ['Martial weapon + shield or two martial weapons', '5 javelins or simple melee weapon', 'Priest\'s pack or explorer\'s pack', 'Chain mail, holy symbol'],
  'Ranger': ['Scale mail or leather armor', 'Two shortswords or two simple melee weapons', 'Dungeoneer\'s pack or explorer\'s pack', 'Longbow and quiver of 20 arrows'],
  'Rogue': ['Rapier or shortsword', 'Shortbow + quiver or shortsword', 'Burglar\'s, dungeoneer\'s, or explorer\'s pack', 'Leather armor, two daggers, thieves\' tools'],
  'Sorcerer': ['Light crossbow or simple weapon', 'Component pouch or arcane focus', 'Dungeoneer\'s pack or explorer\'s pack', '2 daggers'],
  'Warlock': ['Light crossbow or simple weapon', 'Component pouch or arcane focus', 'Scholar\'s pack or dungeoneer\'s pack', 'Leather armor, simple weapon, 2 daggers'],
  'Wizard': ['Quarterstaff or dagger', 'Component pouch or arcane focus', 'Scholar\'s pack or explorer\'s pack', 'Spellbook'],
};

// Common 1st-level spells by class (for casters)
const LEVEL_1_SPELLS = {
  'Bard': ['Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Faerie Fire', 'Healing Word', 'Heroism', 'Sleep', 'Thunderwave'],
  'Cleric': ['Bless', 'Command', 'Cure Wounds', 'Detect Magic', 'Guiding Bolt', 'Healing Word', 'Inflict Wounds', 'Protection from Evil', 'Shield of Faith'],
  'Druid': ['Cure Wounds', 'Entangle', 'Faerie Fire', 'Fog Cloud', 'Goodberry', 'Healing Word', 'Speak with Animals', 'Thunderwave'],
  'Paladin': ['Bless', 'Command', 'Cure Wounds', 'Detect Evil and Good', 'Divine Favor', 'Protection from Evil', 'Shield of Faith', 'Thunderous Smite'],
  'Ranger': ['Cure Wounds', 'Detect Magic', 'Ensnaring Strike', 'Fog Cloud', 'Goodberry', 'Hail of Thorns', 'Hunter\'s Mark', 'Longstrider'],
  'Sorcerer': ['Burning Hands', 'Charm Person', 'Chromatic Orb', 'Detect Magic', 'Disguise Self', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
  'Warlock': ['Armor of Agathys', 'Charm Person', 'Comprehend Languages', 'Expeditious Retreat', 'Hellish Rebuke', 'Hex', 'Protection from Evil', 'Witch Bolt'],
  'Wizard': ['Burning Hands', 'Charm Person', 'Comprehend Languages', 'Detect Magic', 'Disguise Self', 'Find Familiar', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep'],
};

// Cantrips by class
const CANTRIPS = {
  'Bard': ['Blade Ward', 'Dancing Lights', 'Friends', 'Light', 'Mage Hand', 'Message', 'Minor Illusion', 'Prestidigitation', 'True Strike', 'Vicious Mockery'],
  'Cleric': ['Guidance', 'Light', 'Mending', 'Resistance', 'Sacred Flame', 'Spare the Dying', 'Thaumaturgy', 'Toll the Dead', 'Word of Radiance'],
  'Druid': ['Druidcraft', 'Guidance', 'Mending', 'Poison Spray', 'Produce Flame', 'Resistance', 'Shillelagh', 'Thorn Whip'],
  'Sorcerer': ['Acid Splash', 'Blade Ward', 'Chill Touch', 'Dancing Lights', 'Fire Bolt', 'Friends', 'Light', 'Mage Hand', 'Message', 'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Ray of Frost', 'Shocking Grasp', 'True Strike'],
  'Warlock': ['Blade Ward', 'Chill Touch', 'Eldritch Blast', 'Friends', 'Mage Hand', 'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'True Strike'],
  'Wizard': ['Acid Splash', 'Blade Ward', 'Chill Touch', 'Dancing Lights', 'Fire Bolt', 'Friends', 'Light', 'Mage Hand', 'Message', 'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Ray of Frost', 'Shocking Grasp', 'True Strike'],
};

// Common feats
const FEATS = [
  { name: 'Alert', description: '+5 initiative, can\'t be surprised', prereq: 'None' },
  { name: 'Athlete', description: '+1 STR/DEX, climbing and jumping bonuses', prereq: 'None' },
  { name: 'Crossbow Expert', description: 'Ignore loading, no disadvantage in melee', prereq: 'None' },
  { name: 'Defensive Duelist', description: 'Use reaction to add proficiency to AC', prereq: 'DEX 13+' },
  { name: 'Dual Wielder', description: '+1 AC when dual wielding, use non-light weapons', prereq: 'None' },
  { name: 'Durable', description: '+1 CON, minimum HP on hit dice', prereq: 'None' },
  { name: 'Great Weapon Master', description: '-5 attack for +10 damage, bonus attack on crit/kill', prereq: 'None' },
  { name: 'Healer', description: 'Stabilize and heal with healer\'s kit', prereq: 'None' },
  { name: 'Lucky', description: '3 luck points to reroll dice', prereq: 'None' },
  { name: 'Magic Initiate', description: 'Learn 2 cantrips and 1 spell from a class', prereq: 'None' },
  { name: 'Mobile', description: '+10 speed, Dash through difficult terrain, avoid opportunity attacks', prereq: 'None' },
  { name: 'Observant', description: '+5 passive Perception/Investigation, read lips', prereq: 'None' },
  { name: 'Polearm Master', description: 'Bonus attack with butt end, opportunity attacks on approach', prereq: 'None' },
  { name: 'Resilient', description: '+1 to ability score, gain proficiency in that save', prereq: 'None' },
  { name: 'Sentinel', description: 'Opportunity attacks reduce speed to 0', prereq: 'None' },
  { name: 'Sharpshooter', description: '-5 attack for +10 damage, ignore cover, long range', prereq: 'None' },
  { name: 'Shield Master', description: 'Add shield AC to DEX saves, shove as bonus action', prereq: 'None' },
  { name: 'Skilled', description: 'Gain 3 skill or tool proficiencies', prereq: 'None' },
  { name: 'Tough', description: '+2 HP per level', prereq: 'None' },
  { name: 'War Caster', description: 'Advantage on concentration, somatic with hands full, spell opportunity attacks', prereq: 'Spellcasting' },
];

const ALIGNMENTS = [
  ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
  ['Lawful Neutral', 'Neutral', 'Chaotic Neutral'],
  ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil']
];

function CharacterBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId');
  
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState(null);
  
  // Campaign content state (custom races, classes, etc. from GM's uploaded rulesets)
  const [campaignContent, setCampaignContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  
  // Portrait state
  const [portraitGenerating, setPortraitGenerating] = useState(false);
  const [portraitImage, setPortraitImage] = useState(null);
  const [gender, setGender] = useState('neutral');
  
  // Stat generation state
  const [statMethod, setStatMethod] = useState('custom');
  const [isRolling, setIsRolling] = useState(false);
  const [rolledStats, setRolledStats] = useState({});
  const [diceAnimation, setDiceAnimation] = useState(null);
  
  // Fetch campaign content if campaignId is provided
  useEffect(() => {
    if (campaignId) {
      fetchCampaignContent();
      fetchCampaignName();
    }
  }, [campaignId]);
  
  const fetchCampaignContent = async () => {
    setLoadingContent(true);
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/content`);
      setCampaignContent(response.data);
      if (response.data.has_custom_content) {
        toast.success('Custom content loaded!', {
          description: 'Campaign-specific races, classes, and more are available'
        });
      }
    } catch (error) {
      console.error('Failed to load campaign content:', error);
    } finally {
      setLoadingContent(false);
    }
  };
  
  const fetchCampaignName = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}`);
      setCampaignName(response.data.name || '');
    } catch (error) {
      console.error('Failed to load campaign name');
    }
  };
  
  // Helper to format ability bonuses from object to string
  const formatAbilityBonuses = (bonuses) => {
    if (!bonuses) return 'Custom race';
    if (typeof bonuses === 'string') return bonuses;
    if (typeof bonuses === 'object') {
      const parts = [];
      const statMap = {
        strength: 'STR', dexterity: 'DEX', constitution: 'CON',
        intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA'
      };
      for (const [stat, value] of Object.entries(bonuses)) {
        if (value) {
          const abbrev = statMap[stat.toLowerCase()] || stat.toUpperCase();
          parts.push(`+${value} ${abbrev}`);
        }
      }
      return parts.join(', ') || 'Custom race';
    }
    return 'Custom race';
  };
  
  // Merge default options with campaign custom content
  const getMergedRaces = () => {
    const defaultRaces = RACES.map(r => ({ ...r, isCustom: false }));
    if (!campaignContent?.races?.length) return defaultRaces;
    
    const customRaces = campaignContent.races.map(r => ({
      name: r.name,
      bonus: formatAbilityBonuses(r.ability_bonuses) || r.description || 'Custom race',
      source: r.source || 'Custom',
      isCustom: true,
      fullData: r
    }));
    
    return [...customRaces, ...defaultRaces];
  };
  
  const getMergedClasses = () => {
    const defaultClasses = CLASSES.map(c => ({ ...c, isCustom: false }));
    if (!campaignContent?.classes?.length) return defaultClasses;
    
    const customClasses = campaignContent.classes.map(c => ({
      name: c.name,
      color: c.color || '#F59E0B',
      hitDie: c.hit_die || 'd8',
      primary: c.primary_ability || 'Varies',
      isCustom: true,
      fullData: c
    }));
    
    return [...customClasses, ...defaultClasses];
  };
  
  const getMergedBackgrounds = () => {
    const defaultBackgrounds = BACKGROUNDS.map(b => ({ ...b, isCustom: false }));
    if (!campaignContent?.backgrounds?.length) return defaultBackgrounds;
    
    const customBackgrounds = campaignContent.backgrounds.map(b => ({
      name: b.name,
      feature: b.feature || 'Custom feature',
      skills: b.skill_proficiencies || [],
      tools: b.tool_proficiencies || [],
      languages: b.languages || 0,
      isCustom: true,
      fullData: b
    }));
    
    return [...customBackgrounds, ...defaultBackgrounds];
  };
  
  const getMergedSubclasses = (className) => {
    const defaultSubclasses = (SUBCLASSES[className] || []).map(s => ({ ...s, isCustom: false }));
    if (!campaignContent?.subclasses?.length) return defaultSubclasses;
    
    const customSubclasses = campaignContent.subclasses
      .filter(s => s.parent_class === className)
      .map(s => ({
        name: s.name,
        level: s.subclass_level || 3,
        description: s.description || 'Custom subclass',
        isCustom: true,
        fullData: s
      }));
    
    return [...customSubclasses, ...defaultSubclasses];
  };
  
  const getMergedFeats = () => {
    const defaultFeats = FEATS.map(f => ({ ...f, isCustom: false }));
    if (!campaignContent?.feats?.length) return defaultFeats;
    
    const customFeats = campaignContent.feats.map(f => ({
      name: f.name,
      description: f.description || 'Custom feat',
      prereq: f.prerequisites || 'None',
      isCustom: true,
      fullData: f
    }));
    
    return [...customFeats, ...defaultFeats];
  };
  
  const [characterData, setCharacterData] = useState({
    name: '',
    race: 'Human',
    character_class: 'Fighter',
    subclass: '',
    background: 'Folk Hero',
    level: 1,
    alignment: 'Neutral Good',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    backstory: '',
    personality_traits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    // New fields
    selectedCantrips: [],
    selectedSpells: [],
    selectedFeat: '',
    equipment: [],
  });

  // Check if class is a spellcaster
  const isCaster = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'].includes(characterData.character_class);
  
  // Use merged content (custom + defaults)
  const mergedRaces = getMergedRaces();
  const mergedClasses = getMergedClasses();
  const mergedBackgrounds = getMergedBackgrounds();
  const availableSubclasses = getMergedSubclasses(characterData.character_class);
  const mergedFeats = getMergedFeats();
  
  const availableCantrips = CANTRIPS[characterData.character_class] || [];
  const availableSpells = LEVEL_1_SPELLS[characterData.character_class] || [];
  const startingEquipment = STARTING_EQUIPMENT[characterData.character_class] || [];
  const selectedBackground = mergedBackgrounds.find(b => b.name === characterData.background) || BACKGROUNDS[0];

  const handleChange = (field, value) => {
    setCharacterData(prev => ({ ...prev, [field]: value }));
  };

  // AI Character Generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) {
      toast.error('Please describe your character (at least 10 characters)');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await axios.post(`${API}/ai/generate-character`, {
        description: aiPrompt
      });

      if (response.data.success && response.data.character) {
        const generated = response.data.character;
        setCharacterData(prev => ({
          ...prev,
          name: generated.name || prev.name,
          race: generated.race || prev.race,
          character_class: generated.character_class || prev.character_class,
          background: generated.background || prev.background,
          level: generated.level || 1,
          alignment: generated.alignment || prev.alignment,
          strength: generated.strength || 10,
          dexterity: generated.dexterity || 10,
          constitution: generated.constitution || 10,
          intelligence: generated.intelligence || 10,
          wisdom: generated.wisdom || 10,
          charisma: generated.charisma || 10,
          personality_traits: generated.personality_traits || '',
          ideals: generated.ideals || '',
          bonds: generated.bonds || '',
          flaws: generated.flaws || '',
          backstory: generated.backstory || ''
        }));
        setAiGenerated(true);
        toast.success(`${generated.name} has been created!`, {
          description: 'Review and customize below'
        });
      }
    } catch (error) {
      toast.error('AI generation failed', {
        description: error.response?.data?.detail || 'Try again'
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Portrait Generation
  const handleGeneratePortrait = async () => {
    if (!characterData.name.trim()) {
      toast.error('Enter a name first');
      return;
    }

    setPortraitGenerating(true);
    try {
      const response = await axios.post(`${API}/ai/generate-portrait`, {
        name: characterData.name,
        race: characterData.race,
        character_class: characterData.character_class,
        gender: gender,
        appearance: characterData.backstory?.substring(0, 200) || ''
      });

      if (response.data.success && response.data.image_base64) {
        setPortraitImage(`data:image/png;base64,${response.data.image_base64}`);
        toast.success('Portrait generated!');
      }
    } catch (error) {
      toast.error('Portrait generation failed');
    } finally {
      setPortraitGenerating(false);
    }
  };

  // Roll 4d6 drop lowest
  const roll4d6DropLowest = () => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    return {
      total: rolls[0] + rolls[1] + rolls[2],
      rolls: rolls
    };
  };

  // Apply Standard Array
  const applyStandardArray = () => {
    setStatMethod('standard');
    const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const sortedArray = [...STANDARD_ARRAY];
    
    setCharacterData(prev => ({
      ...prev,
      strength: sortedArray[0],
      dexterity: sortedArray[1],
      constitution: sortedArray[2],
      intelligence: sortedArray[3],
      wisdom: sortedArray[4],
      charisma: sortedArray[5]
    }));
    
    toast.success('Standard Array Applied', {
      description: 'Assign these values as you like using Custom mode'
    });
  };

  // Apply Recommended Stats for class
  const applyRecommended = () => {
    setStatMethod('recommended');
    const recommended = RECOMMENDED_STATS[characterData.character_class];
    
    if (recommended) {
      setCharacterData(prev => ({
        ...prev,
        ...recommended
      }));
      toast.success(`Optimized for ${characterData.character_class}`, {
        description: 'Stats set for best performance'
      });
    }
  };

  // Roll all stats with animation
  const rollAllStats = async () => {
    setStatMethod('rolled');
    setIsRolling(true);
    
    const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const newStats = {};
    const newRolled = {};
    
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      
      // Show dice animation for this stat
      setDiceAnimation(stat);
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const result = roll4d6DropLowest();
      newStats[stat] = result.total;
      newRolled[stat] = result.rolls;
      
      // Update state progressively
      setCharacterData(prev => ({ ...prev, [stat]: result.total }));
      setRolledStats(prev => ({ ...prev, [stat]: result.rolls }));
    }
    
    setDiceAnimation(null);
    setIsRolling(false);
    
    const total = Object.values(newStats).reduce((a, b) => a + b, 0);
    toast.success('Dice Rolled!', {
      description: `Total: ${total} points`
    });
  };

  const calculateModifier = (score) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleSubmit = async () => {
    if (!characterData.name.trim()) {
      toast.error('Please enter a character name');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...characterData,
        max_hp: parseInt(CLASSES.find(c => c.name === characterData.character_class)?.hitDie?.slice(1) || 8) + 
                Math.floor((characterData.constitution - 10) / 2),
        armor_class: 10 + Math.floor((characterData.dexterity - 10) / 2),
        portrait_url: portraitImage || null,
        campaign_id: campaignId || null  // Link to campaign if creating for a specific campaign
      };

      await axios.post(`${API}/characters`, payload);
      toast.success('Character created!');
      navigate('/player');
    } catch (error) {
      // Check if it's a tier limit error
      if (error.response?.status === 403 && error.response?.data?.detail?.error === 'character_limit_reached') {
        const detail = error.response.data.detail;
        setUpgradeInfo({
          currentCount: detail.current_count,
          limit: detail.limit,
          suggestedTier: detail.upgrade_tier || 'player'
        });
        setShowUpgradePrompt(true);
      } else {
        toast.error('Failed to create character');
      }
    } finally {
      setCreating(false);
    }
  };

  // Blue theme for player section
  const playerBlue = '#3B82F6';
  const playerBlueHover = '#60A5FA';
  const playerBlueSubtle = 'rgba(59, 130, 246, 0.15)';

  const getClassColor = () => {
    return CLASSES.find(c => c.name === characterData.character_class)?.color || playerBlue;
  };

  const steps = isCaster 
    ? ['Concept', 'Race & Class', 'Abilities', 'Spells & Feats', 'Details']
    : ['Concept', 'Race & Class', 'Abilities', 'Features', 'Details'];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0D0D',
      padding: '24px',
      fontFamily: 'Cityworm, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <Button onClick={() => navigate('/')} className="btn-icon">
            <ArrowLeft size={20} />
          </Button>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '28px',
              fontFamily: 'Cityworm, sans-serif',
              fontWeight: '800',
              color: '#ffffff'
            }}>
              Create Character
            </h1>
            {campaignId && campaignName && (
              <p style={{ color: '#F59E0B', fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={14} />
                For campaign: <strong>{campaignName}</strong>
                {campaignContent?.has_custom_content && (
                  <span style={{ 
                    background: 'rgba(245, 158, 11, 0.2)', 
                    border: '1px solid #F59E0B',
                    padding: '2px 8px',
                    fontSize: '11px',
                    marginLeft: '8px'
                  }}>
                    Custom Content Available
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Loading indicator for campaign content */}
        {loadingContent && (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid #F59E0B',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Loader size={16} className="spin" style={{ color: '#F59E0B' }} />
            <span style={{ color: '#F59E0B', fontSize: '13px' }}>Loading campaign content...</span>
          </div>
        )}

        {/* Progress Steps */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '32px',
          padding: '0 20px'
        }}>
          {steps.map((s, i) => (
            <div 
              key={i}
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                opacity: i + 1 <= step ? 1 : 0.4
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: i + 1 < step ? '#10B981' : i + 1 === step ? getClassColor() : '#1F2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                marginRight: '10px'
              }}>
                {i + 1 < step ? <Check size={18} /> : i + 1}
              </div>
              <span style={{ 
                color: i + 1 === step ? '#fff' : '#9CA3AF',
                fontWeight: i + 1 === step ? '600' : '400',
                fontSize: '14px',
                display: i === steps.length - 1 || i === 0 ? 'block' : 'none'
              }} className="step-label">
                {s}
              </span>
              {i < steps.length - 1 && (
                <div style={{
                  height: '2px',
                  width: '60px',
                  background: i + 1 < step ? '#10B981' : '#1F2937',
                  margin: '0 12px',
                  display: 'none'
                }} className="step-connector" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Concept with AI */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* AI Generation Panel */}
            <Card style={{
              background: aiGenerated 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(34, 211, 238, 0.1))'
                : playerBlueSubtle,
              border: aiGenerated ? '1px solid #10B981' : `1px solid ${playerBlue}`,
            }}>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: playerBlueSubtle,
                    border: `1px solid ${playerBlue}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Wand2 size={24} color={playerBlue} />
                  </div>
                  <div>
                    <h3 style={{ 
                      color: '#fff', 
                      fontSize: '18px', 
                      fontWeight: '700',
                      fontFamily: 'Cityworm, sans-serif'
                    }}>
                      ROOK
                    </h3>
                    <p style={{ color: '#9CA3AF', fontSize: '13px' }}>
                      Describe your character idea
                    </p>
                  </div>
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Example: A mysterious half-elf wizard who was exiled for practicing forbidden magic..."
                  data-testid="ai-prompt"
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${playerBlue}40`,
                    color: '#E5E7EB',
                    fontSize: '14px',
                    resize: 'none',
                    marginBottom: '12px'
                  }}
                />

                {/* Quick Ideas */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#6B7280', fontSize: '12px', marginBottom: '8px' }}>Quick ideas:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {AI_SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setAiPrompt(s)}
                        style={{
                          padding: '5px 10px',
                          background: playerBlueSubtle,
                          border: `1px solid ${playerBlue}50`,
                          color: playerBlueHover,
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  data-testid="ai-generate-btn"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: aiGenerating ? 'rgba(59, 130, 246, 0.5)' : playerBlue,
                    border: 'none',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: aiGenerating || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {aiGenerating ? (
                    <><Loader className="spin" size={18} /> Generating...</>
                  ) : (
                    <><Sparkles size={18} /> Generate Character</>
                  )}
                </Button>

                {aiGenerated && (
                  <p style={{ color: '#10B981', fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>
                    ✓ Character generated! Review on the right →
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Manual Entry Panel */}
            <Card style={{
              background: '#111827',
              border: '1px solid #1F2937',
              borderRadius: '16px'
            }}>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ 
                  color: '#fff', 
                  fontSize: '18px', 
                  fontWeight: '700',
                  fontFamily: 'Cityworm, sans-serif',
                  marginBottom: '20px'
                }}>
                  Basic Info
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                    Character Name *
                  </label>
                  <Input
                    value={characterData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter name..."
                    className="input"
                    data-testid="character-name"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                      Race {campaignContent?.races?.length > 0 && <span style={{ color: '#F59E0B', fontSize: '10px' }}>★ Custom available</span>}
                    </label>
                    <select
                      value={characterData.race}
                      onChange={(e) => handleChange('race', e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      {campaignContent?.races?.length > 0 && (
                        <optgroup label="★ Campaign Custom">
                          {campaignContent.races.map(r => (
                            <option key={`custom-${r.name}`} value={r.name}>★ {r.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Standard Races">
                        {RACES.map(r => (
                          <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                      Class {campaignContent?.classes?.length > 0 && <span style={{ color: '#F59E0B', fontSize: '10px' }}>★ Custom available</span>}
                    </label>
                    <select
                      value={characterData.character_class}
                      onChange={(e) => handleChange('character_class', e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      {campaignContent?.classes?.length > 0 && (
                        <optgroup label="★ Campaign Custom">
                          {campaignContent.classes.map(c => (
                            <option key={`custom-${c.name}`} value={c.name}>★ {c.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Standard Classes">
                        {CLASSES.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                      Background {campaignContent?.backgrounds?.length > 0 && <span style={{ color: '#F59E0B', fontSize: '10px' }}>★ Custom available</span>}
                    </label>
                    <select
                      value={characterData.background}
                      onChange={(e) => handleChange('background', e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      {campaignContent?.backgrounds?.length > 0 && (
                        <optgroup label="★ Campaign Custom">
                          {campaignContent.backgrounds.map(b => (
                            <option key={`custom-${b.name}`} value={b.name}>★ {b.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Standard Backgrounds">
                        {BACKGROUNDS.map(b => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                      Level
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={characterData.level}
                      onChange={(e) => handleChange('level', parseInt(e.target.value) || 1)}
                      className="input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Race & Class Details */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Race Selection */}
            <Card style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '16px' }}>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                  <User size={20} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#22D3EE' }} />
                  Choose Race
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                  {/* Custom races first */}
                  {mergedRaces.filter(r => r.isCustom).length > 0 && (
                    <>
                      <div style={{ color: '#F59E0B', fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Star size={14} /> Campaign Custom
                      </div>
                      {mergedRaces.filter(r => r.isCustom).map(race => (
                        <button
                          key={`custom-${race.name}`}
                          onClick={() => handleChange('race', race.name)}
                          style={{
                            padding: '14px 16px',
                            background: characterData.race === race.name ? 'rgba(245, 158, 11, 0.15)' : '#1F2937',
                            border: characterData.race === race.name ? '2px solid #F59E0B' : '1px solid #F59E0B50',
                            borderRadius: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ color: '#F59E0B', fontWeight: '600', fontSize: '14px' }}>★ {race.name}</span>
                          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{race.bonus}</span>
                        </button>
                      ))}
                      <div style={{ borderBottom: '1px solid #374151', margin: '8px 0' }} />
                    </>
                  )}
                  {/* Standard races */}
                  {mergedRaces.filter(r => !r.isCustom).map(race => (
                    <button
                      key={race.name}
                      onClick={() => handleChange('race', race.name)}
                      style={{
                        padding: '14px 16px',
                        background: characterData.race === race.name ? 'rgba(34, 211, 238, 0.15)' : '#1F2937',
                        border: characterData.race === race.name ? '2px solid #22D3EE' : '1px solid #374151',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{race.name}</span>
                      <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{race.bonus}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Class Selection */}
            <Card style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '16px' }}>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                  <Swords size={20} style={{ marginRight: '8px', verticalAlign: 'middle', color: getClassColor() }} />
                  Choose Class
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                  {/* Custom classes first */}
                  {mergedClasses.filter(c => c.isCustom).length > 0 && (
                    <>
                      {mergedClasses.filter(c => c.isCustom).map(cls => (
                        <button
                          key={`custom-${cls.name}`}
                          onClick={() => handleChange('character_class', cls.name)}
                          style={{
                            padding: '12px',
                            background: characterData.character_class === cls.name ? 'rgba(245, 158, 11, 0.25)' : '#1F2937',
                            border: characterData.character_class === cls.name ? '2px solid #F59E0B' : '1px solid #F59E0B50',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            gridColumn: 'span 2'
                          }}
                        >
                          <div style={{ color: '#F59E0B', fontWeight: '600', fontSize: '13px' }}>★ {cls.name}</div>
                          <div style={{ color: '#9CA3AF', fontSize: '11px' }}>{cls.hitDie} • {cls.primary}</div>
                        </button>
                      ))}
                    </>
                  )}
                  {/* Standard classes */}
                  {mergedClasses.filter(c => !c.isCustom).map(cls => (
                    <button
                      key={cls.name}
                      onClick={() => handleChange('character_class', cls.name)}
                      style={{
                        padding: '12px',
                        background: characterData.character_class === cls.name ? `${cls.color}25` : '#1F2937',
                        border: characterData.character_class === cls.name ? `2px solid ${cls.color}` : '1px solid #374151',
                        borderRadius: '10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>{cls.name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: '11px' }}>{cls.hitDie} • {cls.primary}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Ability Scores */}
        {step === 3 && (
          <div>
            {/* Stat Generation Method Selector */}
            <Card style={{ 
              background: '#111827', 
              border: '1px solid #1F2937', 
              borderRadius: '16px',
              marginBottom: '20px'
            }}>
              <CardContent style={{ padding: '20px' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                  How would you like to generate stats?
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { id: 'custom', label: 'Custom', desc: 'Point Buy', color: '#9CA3AF' },
                    { id: 'standard', label: 'Standard', desc: '15,14,13,12,10,8', color: '#22D3EE' },
                    { id: 'recommended', label: 'Recommended', desc: `Best for ${characterData.character_class}`, color: '#10B981' },
                    { id: 'rolled', label: 'Roll Dice', desc: '4d6 drop lowest', color: '#F59E0B' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => {
                        if (method.id === 'standard') applyStandardArray();
                        else if (method.id === 'recommended') applyRecommended();
                        else if (method.id === 'rolled') rollAllStats();
                        else setStatMethod('custom');
                      }}
                      disabled={isRolling}
                      style={{
                        padding: '16px 12px',
                        background: statMethod === method.id ? `${method.color}20` : '#1F2937',
                        border: statMethod === method.id ? `2px solid ${method.color}` : '1px solid #374151',
                        borderRadius: '12px',
                        cursor: isRolling ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                    >
                      {method.id === 'rolled' && (
                        <Dices size={24} style={{ color: method.color, marginBottom: '8px' }} />
                      )}
                      <div style={{ 
                        color: statMethod === method.id ? method.color : '#fff', 
                        fontWeight: '700', 
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {method.label}
                      </div>
                      <div style={{ color: '#6B7280', fontSize: '11px' }}>
                        {method.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ability Scores Grid */}
            <Card style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '16px' }}>
              <CardContent style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
                    Ability Scores
                  </h3>
                  {statMethod === 'rolled' && (
                    <Button
                      onClick={rollAllStats}
                      disabled={isRolling}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isRolling ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Dices size={16} className={isRolling ? 'spin' : ''} />
                      {isRolling ? 'Rolling...' : 'Re-roll All'}
                    </Button>
                  )}
                </div>
              
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { key: 'strength', label: 'STR', icon: Swords, color: '#EF4444' },
                    { key: 'dexterity', label: 'DEX', icon: ArrowRight, color: '#22D3EE' },
                    { key: 'constitution', label: 'CON', icon: Heart, color: '#F59E0B' },
                    { key: 'intelligence', label: 'INT', icon: BookOpen, color: '#8B5CF6' },
                    { key: 'wisdom', label: 'WIS', icon: User, color: '#10B981' },
                    { key: 'charisma', label: 'CHA', icon: Sparkles, color: '#EC4899' }
                  ].map(stat => (
                    <div 
                      key={stat.key}
                      style={{
                        background: diceAnimation === stat.key 
                          ? 'rgba(245, 158, 11, 0.2)' 
                          : '#1F2937',
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center',
                        border: diceAnimation === stat.key 
                          ? '2px solid #F59E0B' 
                          : '1px solid #374151',
                        transition: 'all 0.3s',
                        animation: diceAnimation === stat.key ? 'glow-pulse 0.5s ease-in-out' : 'none'
                      }}
                    >
                      <stat.icon size={24} style={{ color: stat.color, marginBottom: '8px' }} />
                      <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                        {stat.label}
                      </div>
                      
                      {/* Dice rolling animation */}
                      {diceAnimation === stat.key ? (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '50px'
                        }}>
                          <div style={{
                            fontSize: '32px',
                            animation: 'spin 0.3s linear infinite'
                          }}>
                            🎲
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Show rolled dice if in rolled mode */}
                          {statMethod === 'rolled' && rolledStats[stat.key] && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'center', 
                              gap: '4px', 
                              marginBottom: '8px' 
                            }}>
                              {rolledStats[stat.key].map((die, i) => (
                                <span 
                                  key={i}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    background: i === 3 ? '#374151' : stat.color + '30',
                                    border: i === 3 ? '1px solid #4B5563' : `1px solid ${stat.color}`,
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: i === 3 ? '#6B7280' : stat.color,
                                    textDecoration: i === 3 ? 'line-through' : 'none'
                                  }}
                                >
                                  {die}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Custom mode: show +/- buttons */}
                          {statMethod === 'custom' ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button
                                onClick={() => handleChange(stat.key, Math.max(3, characterData[stat.key] - 1))}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: '#374151',
                                  border: 'none',
                                  color: '#fff',
                                  fontSize: '18px',
                                  cursor: 'pointer'
                                }}
                              >
                                −
                              </button>
                              <span style={{ 
                                color: '#fff', 
                                fontSize: '28px', 
                                fontWeight: '800',
                                minWidth: '40px'
                              }}>
                                {characterData[stat.key]}
                              </span>
                              <button
                                onClick={() => handleChange(stat.key, Math.min(20, characterData[stat.key] + 1))}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: '#374151',
                                  border: 'none',
                                  color: '#fff',
                                  fontSize: '18px',
                                  cursor: 'pointer'
                                }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            // Other modes: just show the value
                            <span style={{ 
                              color: '#fff', 
                              fontSize: '32px', 
                              fontWeight: '800',
                              display: 'block'
                            }}>
                              {characterData[stat.key]}
                            </span>
                          )}
                        </>
                      )}
                      
                      <div style={{ 
                        color: stat.color, 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: stat.color + '20',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {calculateModifier(characterData[stat.key])}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Stats Summary */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '32px', 
                  marginTop: '24px',
                  padding: '20px',
                  background: playerBlueSubtle,
                  border: `1px solid ${playerBlue}30`
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Heart size={24} style={{ color: '#EF4444', marginBottom: '4px' }} />
                    <div style={{ color: '#EF4444', fontSize: '24px', fontWeight: '800' }}>
                      {parseInt(CLASSES.find(c => c.name === characterData.character_class)?.hitDie?.slice(1) || 8) + 
                       Math.floor((characterData.constitution - 10) / 2)}
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600' }}>Hit Points</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Shield size={24} style={{ color: '#22D3EE', marginBottom: '4px' }} />
                    <div style={{ color: '#22D3EE', fontSize: '24px', fontWeight: '800' }}>
                      {10 + Math.floor((characterData.dexterity - 10) / 2)}
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600' }}>Armor Class</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Sparkles size={24} style={{ color: '#F59E0B', marginBottom: '4px' }} />
                    <div style={{ color: '#F59E0B', fontSize: '24px', fontWeight: '800' }}>
                      {characterData.strength + characterData.dexterity + characterData.constitution + 
                       characterData.intelligence + characterData.wisdom + characterData.charisma}
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600' }}>Total Points</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Subclass, Spells & Feats */}
        {step === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            <Card style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CardContent style={{ padding: '24px' }}>
                {/* Subclass Selection */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={20} style={{ color: playerBlue }} />
                    Choose Your Subclass
                    {availableSubclasses.some(s => s.isCustom) && (
                      <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: '500' }}>★ Custom available</span>
                    )}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                    {/* Custom subclasses first */}
                    {availableSubclasses.filter(s => s.isCustom).map(sub => (
                      <button
                        key={`custom-${sub.name}`}
                        onClick={() => handleChange('subclass', sub.name)}
                        style={{
                          padding: '16px',
                          background: characterData.subclass === sub.name ? 'rgba(245, 158, 11, 0.15)' : '#1F1F1F',
                          border: characterData.subclass === sub.name ? '2px solid #F59E0B' : '1px solid #F59E0B50',
                          color: characterData.subclass === sub.name ? '#F59E0B' : '#fff',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#F59E0B' }}>★ {sub.name}</div>
                        <div style={{ fontSize: '12px', color: '#808080' }}>{sub.description}</div>
                        <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '8px' }}>Unlocks at Level {sub.level}</div>
                      </button>
                    ))}
                    {/* Standard subclasses */}
                    {availableSubclasses.filter(s => !s.isCustom).map(sub => (
                      <button
                        key={sub.name}
                        onClick={() => handleChange('subclass', sub.name)}
                        style={{
                          padding: '16px',
                          background: characterData.subclass === sub.name ? playerBlueSubtle : '#1F1F1F',
                          border: characterData.subclass === sub.name ? `2px solid ${playerBlue}` : '1px solid rgba(255,255,255,0.1)',
                          color: characterData.subclass === sub.name ? playerBlue : '#fff',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{sub.name}</div>
                        <div style={{ fontSize: '12px', color: '#808080' }}>{sub.description}</div>
                        <div style={{ fontSize: '11px', color: playerBlue, marginTop: '8px' }}>Unlocks at Level {sub.level}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spells for Casters */}
                {isCaster && availableCantrips.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Wand2 size={20} style={{ color: playerBlue }} />
                      Select Cantrips
                    </h3>
                    <p style={{ color: '#808080', fontSize: '13px', marginBottom: '12px' }}>
                      Choose your starting cantrips (select 2-3)
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {availableCantrips.map(cantrip => (
                        <button
                          key={cantrip}
                          onClick={() => {
                            const current = characterData.selectedCantrips || [];
                            if (current.includes(cantrip)) {
                              handleChange('selectedCantrips', current.filter(c => c !== cantrip));
                            } else if (current.length < 4) {
                              handleChange('selectedCantrips', [...current, cantrip]);
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            background: characterData.selectedCantrips?.includes(cantrip) ? playerBlueSubtle : '#1F1F1F',
                            border: characterData.selectedCantrips?.includes(cantrip) ? `1px solid ${playerBlue}` : '1px solid rgba(255,255,255,0.1)',
                            color: characterData.selectedCantrips?.includes(cantrip) ? playerBlue : '#B3B3B3',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          {cantrip}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: '#808080', fontSize: '11px', marginTop: '8px' }}>
                      Selected: {characterData.selectedCantrips?.length || 0}
                    </p>
                  </div>
                )}

                {/* Level 1 Spells for Casters */}
                {isCaster && availableSpells.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
                      Select 1st Level Spells
                    </h3>
                    <p style={{ color: '#808080', fontSize: '13px', marginBottom: '12px' }}>
                      Choose your prepared/known spells (select 2-4)
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {availableSpells.map(spell => (
                        <button
                          key={spell}
                          onClick={() => {
                            const current = characterData.selectedSpells || [];
                            if (current.includes(spell)) {
                              handleChange('selectedSpells', current.filter(s => s !== spell));
                            } else if (current.length < 6) {
                              handleChange('selectedSpells', [...current, spell]);
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            background: characterData.selectedSpells?.includes(spell) ? playerBlueSubtle : '#1F1F1F',
                            border: characterData.selectedSpells?.includes(spell) ? `1px solid ${playerBlue}` : '1px solid rgba(255,255,255,0.1)',
                            color: characterData.selectedSpells?.includes(spell) ? playerBlue : '#B3B3B3',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          {spell}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: '#808080', fontSize: '11px', marginTop: '8px' }}>
                      Selected: {characterData.selectedSpells?.length || 0}
                    </p>
                  </div>
                )}

                {/* Starting Equipment */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={20} style={{ color: playerBlue }} />
                    Starting Equipment
                  </h3>
                  <div style={{ background: '#1F1F1F', border: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>
                    <p style={{ color: '#808080', fontSize: '12px', marginBottom: '8px' }}>As a {characterData.character_class}, you start with:</p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {startingEquipment.map((item, i) => (
                        <li key={i} style={{ color: '#B3B3B3', fontSize: '13px', marginBottom: '6px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Background Feature */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
                    Background Feature: {selectedBackground.feature}
                  </h3>
                  <div style={{ background: '#1F1F1F', border: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>
                    <p style={{ color: '#808080', fontSize: '12px', marginBottom: '8px' }}>Skills: {selectedBackground.skills?.join(', ')}</p>
                    {selectedBackground.tools?.length > 0 && (
                      <p style={{ color: '#808080', fontSize: '12px', marginBottom: '8px' }}>Tools: {selectedBackground.tools.join(', ')}</p>
                    )}
                    {selectedBackground.languages > 0 && (
                      <p style={{ color: '#808080', fontSize: '12px' }}>Languages: {selectedBackground.languages} of your choice</p>
                    )}
                  </div>
                </div>

                {/* Optional Feat */}
                <div>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} style={{ color: playerBlue }} />
                    Optional Starting Feat
                    {mergedFeats.some(f => f.isCustom) && (
                      <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: '500' }}>★ Custom available</span>
                    )}
                  </h3>
                  <p style={{ color: '#808080', fontSize: '13px', marginBottom: '12px' }}>
                    If your DM allows variant human or a free feat at level 1
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {/* Custom feats first */}
                    {mergedFeats.filter(f => f.isCustom).map(feat => (
                      <button
                        key={`custom-${feat.name}`}
                        onClick={() => handleChange('selectedFeat', feat.name === characterData.selectedFeat ? '' : feat.name)}
                        style={{
                          padding: '12px',
                          background: characterData.selectedFeat === feat.name ? 'rgba(245, 158, 11, 0.15)' : '#1F1F1F',
                          border: characterData.selectedFeat === feat.name ? '1px solid #F59E0B' : '1px solid #F59E0B50',
                          color: characterData.selectedFeat === feat.name ? '#F59E0B' : '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '2px', color: '#F59E0B' }}>★ {feat.name}</div>
                        <div style={{ color: '#808080', fontSize: '11px' }}>{feat.description}</div>
                      </button>
                    ))}
                    {/* Standard feats */}
                    {mergedFeats.filter(f => !f.isCustom).map(feat => (
                      <button
                        key={feat.name}
                        onClick={() => handleChange('selectedFeat', feat.name === characterData.selectedFeat ? '' : feat.name)}
                        style={{
                          padding: '12px',
                          background: characterData.selectedFeat === feat.name ? playerBlueSubtle : '#1F1F1F',
                          border: characterData.selectedFeat === feat.name ? `1px solid ${playerBlue}` : '1px solid rgba(255,255,255,0.1)',
                          color: characterData.selectedFeat === feat.name ? playerBlue : '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>{feat.name}</div>
                        <div style={{ color: '#808080', fontSize: '11px' }}>{feat.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Details & Portrait */}
        {step === 5 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
            <Card style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '16px' }}>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                  Character Details
                </h3>

                {/* Alignment Grid */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                    Alignment
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {ALIGNMENTS.flat().map(align => (
                      <button
                        key={align}
                        onClick={() => handleChange('alignment', align)}
                        style={{
                          padding: '10px 6px',
                          background: characterData.alignment === align ? getClassColor() + '30' : '#1F2937',
                          border: characterData.alignment === align ? `1px solid ${getClassColor()}` : '1px solid #374151',
                          borderRadius: '6px',
                          color: characterData.alignment === align ? '#fff' : '#9CA3AF',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backstory */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#22D3EE', fontSize: '13px', fontWeight: '600' }}>
                    Backstory
                  </label>
                  <textarea
                    value={characterData.backstory}
                    onChange={(e) => handleChange('backstory', e.target.value)}
                    placeholder="Where did your character come from? What drives them?"
                    className="textarea"
                    style={{ minHeight: '150px' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Portrait Panel */}
            <Card style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', height: 'fit-content' }}>
              <CardContent style={{ padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Image size={18} style={{ color: playerBlue }} />
                  Portrait
                </h3>

                {/* Portrait Display */}
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: portraitImage ? 'transparent' : playerBlueSubtle,
                  border: `1px dashed ${playerBlue}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  overflow: 'hidden'
                }}>
                  {portraitImage ? (
                    <img 
                      src={portraitImage} 
                      alt="Character portrait"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={48} style={{ color: '#374151' }} />
                  )}
                </div>

                {/* Gender Selection */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  {['male', 'female', 'neutral'].map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: gender === g ? `1px solid ${playerBlue}` : '1px solid rgba(255,255,255,0.1)',
                        background: gender === g ? playerBlueSubtle : 'transparent',
                        color: gender === g ? playerBlueHover : '#9CA3AF',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleGeneratePortrait}
                  disabled={portraitGenerating || !characterData.name.trim()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: portraitGenerating ? 'rgba(59, 130, 246, 0.5)' : playerBlue,
                    border: 'none',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: portraitGenerating || !characterData.name.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {portraitGenerating ? (
                    <><Loader className="spin" size={16} /> Generating...</>
                  ) : (
                    <><Sparkles size={16} /> Generate Portrait</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '32px',
          padding: '20px',
          background: '#111827',
          borderRadius: '12px',
          border: '1px solid #1F2937'
        }}>
          <Button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="btn-secondary"
            style={{ opacity: step === 1 ? 0.5 : 1 }}
          >
            <ArrowLeft size={18} style={{ marginRight: '8px' }} />
            Back
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(Math.min(5, step + 1))}
              className="btn-primary"
              style={{ background: playerBlue }}
            >
              Next
              <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={creating || !characterData.name.trim()}
              data-testid="create-character-btn"
              style={{
                padding: '14px 28px',
                background: playerBlue,
                border: 'none',
                color: '#fff',
                fontWeight: '700',
                fontSize: '15px',
                cursor: creating || !characterData.name.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              {creating ? (
                <><Loader className="spin" size={18} /> Creating...</>
              ) : (
                <><Check size={18} /> Create Character</>
              )}
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .step-label { display: none !important; }
          .step-connector { display: none !important; }
        }
      `}</style>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && upgradeInfo && (
        <UpgradePrompt
          type="character"
          currentCount={upgradeInfo.currentCount}
          limit={upgradeInfo.limit}
          suggestedTier={upgradeInfo.suggestedTier}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}

export default CharacterBuilder;
