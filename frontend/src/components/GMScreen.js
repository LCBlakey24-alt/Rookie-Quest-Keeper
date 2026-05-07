import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Sword, Users, BookOpen, Send, 
  Loader, LogOut, Play, Dices, Coins, Swords, ArrowRight, Package, FileText, UserPlus, Shuffle, Skull, Wand2, PlusCircle, Zap, Compass, UserCircle, Music, Target, Volume2, Link2, Sparkles,
  ChevronDown, ChevronRight, BarChart3, Search, CloudRain
} from 'lucide-react';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import DiceRollHistory from './DiceRollHistory';
import LootGenerator from '@/components/LootGenerator';
import PartyInventory from '@/components/PartyInventory';
import RandomTables from '@/components/RandomTables';
import PartyLocationTracker from '@/components/PartyLocationTracker';
import TronBackground from '@/components/TronBackground';
import QuickCombatModal from '@/components/QuickCombatModal';
// Extracted GM Tab Components
import CombatTab from '@/components/gm/CombatTab';
import NpcsTab from '@/components/gm/NpcsTab';
import PartyTab from '@/components/gm/PartyTab';
import NotesTab from '@/components/gm/NotesTab';
import MonstersTab from '@/components/gm/MonstersTab';
import Soundboard from '@/components/gm/Soundboard';
import LiveSessionMode from '@/components/gm/LiveSessionMode';
import SmartSessionLog from '@/components/gm/SmartSessionLog';
import StoryArcTracker from '@/components/gm/StoryArcTracker';
import NPCRelationshipMap from '@/components/gm/NPCRelationshipMap';
import AICoGM from '@/components/gm/AICoGM';
import AISessionPlanner from '@/components/gm/AISessionPlanner';
import SessionTimer from '@/components/gm/SessionTimer';
import EventSystem from '@/components/gm/EventSystem';
import UnifiedReferenceCenter from '@/components/gm/UnifiedReferenceCenter';
import EnvironmentControl from '@/components/gm/EnvironmentControl';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function GMScreen({ username }) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [quickNote, setQuickNote] = useState('');
  const [processingNote, setProcessingNote] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showQuickCombat, setShowQuickCombat] = useState(false);
  const [customCreatures, setCustomCreatures] = useState([]);
  
  // Name Generator state
  const [generatedName, setGeneratedName] = useState(null);
  const [nameRace, setNameRace] = useState('human');
  const [nameGender, setNameGender] = useState('any');
  const [savingNPC, setSavingNPC] = useState(false);
  const [savedNames, setSavedNames] = useState([]);
  const [hoveredTab, setHoveredTab] = useState(null);
  
  // Tab state - single tab for everything
  const [activeTab, setActiveTab] = useState('combat');
  const [globalSearch, setGlobalSearch] = useState('');
  // Dice panel toggle persisted between sessions (default: visible)
  const [showDicePanel, setShowDicePanel] = useState(() => {
    try { return localStorage.getItem('gm.dicePanel.show') !== '0'; } catch { return true; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('gm.dicePanel.show', showDicePanel ? '1' : '0'); } catch { /* ignore */ }
  }, [showDicePanel]);
  
  // Compact dice result state
  const [showDiceFlicker, setShowDiceFlicker] = useState(false);
  const [diceRolls, setDiceRolls] = useState([]);
  const [diceLabel, setDiceLabel] = useState('');
  const [diceModifier, setDiceModifier] = useState(0);
  const [diceTotal, setDiceTotal] = useState(0);
  const [diceCrit, setDiceCrit] = useState(false);
  const [diceFumble, setDiceFumble] = useState(false);
  const [diceHistory, setDiceHistory] = useState([]);
  
  // Live Session Mode state
  const [showLiveSession, setShowLiveSession] = useState(false);
  
  // Grouped tab collapse state — persisted to localStorage so the sidebar
  // remembers what the GM had collapsed between sessions.
  const COLLAPSED_KEY = 'gm.sidebar.collapsedGroups';
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const toggleGroup = (group) => setCollapsedGroups(prev => {
    const next = { ...prev, [group]: !prev[group] };
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  // Rules edition (2014 vs 2024) — propagated to AI prompts via campaign.rules_edition
  const rulesEdition = campaign?.rules_edition === '2014' ? '2014' : '2024';
  const setRulesEdition = async (next) => {
    if (!campaign || !['2014', '2024'].includes(next)) return;
    if (rulesEdition === next) return;
    const prev = campaign;
    // Optimistic update
    setCampaign({ ...campaign, rules_edition: next });
    try {
      await axios.put(`${API}/campaigns/${campaignId}`, {
        name: campaign.name,
        description: campaign.description || '',
        system: campaign.system || '5e 2024 Compatible',
        rules_edition: next,
        world_setting: campaign.world_setting || 'custom',
        world_setting_notes: campaign.world_setting_notes || '',
      });
      toast.success(`Rules switched to D&D 5e ${next}`);
    } catch (err) {
      setCampaign(prev);
      toast.error('Failed to update rules edition');
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [campaignId]);

  const fetchAllData = async () => {
    try {
      const [campaignRes, playersRes, npcsRes, scenariosRes, calendarRes, notesRes, creaturesRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}`),
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/combat-scenarios`),
        axios.get(`${API}/campaigns/${campaignId}/calendar`),
        axios.get(`${API}/campaigns/${campaignId}/ingame-notes`),
        axios.get(`${API}/campaigns/${campaignId}/custom-creatures`)
      ]);
      
      setCampaign(campaignRes.data);
      setPlayers(playersRes.data);
      setNPCs(npcsRes.data);
      setScenarios(scenariosRes.data);
      setCalendar(calendarRes.data);
      setSessionNotes(notesRes.data.slice(0, 30));
      setCustomCreatures(creaturesRes.data || []);
    } catch (error) {
      toast.error('Failed to load Live Play data');
    } finally {
      setLoading(false);
    }
  };

  // Dice roll function - supports compound notation like "2d6+1d4+5"
  // rollType: 'normal', 'advantage', 'disadvantage'
  const rollQuickDice = (notation, label = '', rollType = 'normal') => {
    const diceGroups = notation.match(/(\d+)?d(\d+)/gi) || [];
    if (diceGroups.length === 0) return;
    
    const rolls = [];
    let total = 0;
    
    const isAdvRoll = (rollType === 'advantage' || rollType === 'disadvantage') && notation.match(/^(\d+)?d20$/i);
    
    if (isAdvRoll) {
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;
      const kept = rollType === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2);
      rolls.push({ sides: 20, result: r1, dropped: r1 !== kept });
      rolls.push({ sides: 20, result: r2, dropped: r2 !== kept });
      total = kept;
    } else {
      for (const group of diceGroups) {
        const match = group.match(/(\d+)?d(\d+)/i);
        if (!match) continue;
        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        for (let i = 0; i < count; i++) {
          const result = Math.floor(Math.random() * sides) + 1;
          rolls.push({ sides, result });
          total += result;
        }
      }
    }
    
    // Extract inline modifiers
    const inlineMod = notation.replace(/(\d+)?d(\d+)/gi, '').match(/([+-]\d+)/g);
    let modifier = 0;
    if (inlineMod) inlineMod.forEach(m => { modifier += parseInt(m); });
    total += modifier;
    
    const keptRoll = isAdvRoll ? rolls.find(r => !r.dropped) : rolls[0];
    const isCrit = keptRoll && keptRoll.sides === 20 && keptRoll.result === 20;
    const isFumble = keptRoll && keptRoll.sides === 20 && keptRoll.result === 1;
    
    setDiceRolls(isAdvRoll ? rolls.filter(r => !r.dropped) : rolls);
    setDiceLabel(label || notation);
    setDiceModifier(modifier);
    setDiceTotal(total);
    setDiceCrit(isCrit);
    setDiceFumble(isFumble);
    setShowDiceFlicker(true);

    setDiceHistory(prev => [{
      label: label || notation, total, modifier,
      rolls: isAdvRoll ? rolls.filter(r => !r.dropped) : rolls,
      allRolls: isAdvRoll ? rolls : undefined,
      rollType: rollType !== 'normal' ? rollType : undefined,
      isCrit, isFumble,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }, ...prev].slice(0, 50));
  };

  // Navigate to Combat Page with scenario data
  const launchCombat = () => {
    if (!selectedScenario) {
      toast.error('Select an encounter first');
      return;
    }
    
    navigate(`/campaign/${campaignId}/combat`, {
      state: {
        scenario: selectedScenario,
        campaignName: campaign?.name
      }
    });
  };

  // Quick start combat with just players
  const quickStartCombat = () => {
    if (players.length === 0) {
      toast.error('No players in campaign');
      return;
    }
    
    const quickScenario = {
      id: 'quick-combat',
      name: 'Quick Combat',
      combatants: players.map(p => ({
        id: `player-${p.id}`,
        entityId: p.id,
        name: p.name,
        type: 'player',
        hp: p.hp || p.max_hp || 10,
        maxHp: p.max_hp || p.hp || 10,
        ac: p.ac || 10,
        initiativeMod: Math.floor(((p.stats?.dexterity || 10) - 10) / 2),
        conditions: [],
        tokenColor: '#4a7dff',
        tokenSize: 40
      })),
      tokens: players.map((p, i) => ({
        id: `player-${p.id}`,
        name: p.name,
        color: '#4a7dff',
        size: 40,
        x: 100 + (i % 4) * 60,
        y: 100 + Math.floor(i / 4) * 60,
        isEnemy: false
      })),
      show_grid: true,
      grid_size: 40
    };
    
    navigate(`/campaign/${campaignId}/combat`, {
      state: {
        scenario: quickScenario,
        campaignName: campaign?.name
      }
    });
  };

  // Start Quick Combat from modal
  const handleQuickCombatStart = (scenario) => {
    setShowQuickCombat(false);
    navigate(`/campaign/${campaignId}/combat`, {
      state: {
        scenario: scenario,
        campaignName: campaign?.name
      }
    });
  };

  // Note submission
  const handleSubmitNote = async () => {
    if (!quickNote.trim()) return;
    setProcessingNote(true);
    try {
      const noteRes = await axios.post(`${API}/campaigns/${campaignId}/ingame-notes`, { content: quickNote });
      setSessionNotes(prev => [{ id: noteRes.data.id, content: quickNote, created_at: new Date().toISOString() }, ...prev]);
      setQuickNote('');
      toast.success('Note saved!');
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setProcessingNote(false);
    }
  };

  const handleEndSession = () => {
    if (!window.confirm('End session and return to campaign dashboard?')) return;
    toast.success('Session ended!');
    navigate(`/campaign/${campaignId}`);
  };

  // ==================== NAME GENERATOR ====================
  const NAME_LISTS = {
    human: {
      male: ['Aldric', 'Bram', 'Cedric', 'Dorian', 'Edmund', 'Felix', 'Gareth', 'Henrik', 'Ivan', 'Jasper', 'Kael', 'Leoric', 'Magnus', 'Nolan', 'Osric', 'Preston', 'Quincy', 'Roland', 'Stefan', 'Theron', 'Ulric', 'Victor', 'Willem', 'Xavier', 'Yorick', 'Zarek'],
      female: ['Adeline', 'Brynn', 'Celeste', 'Daphne', 'Elena', 'Fiona', 'Gwendolyn', 'Helena', 'Iris', 'Juliana', 'Katerina', 'Lydia', 'Miranda', 'Natalia', 'Ophelia', 'Penelope', 'Quinn', 'Rowena', 'Seraphina', 'Thalia', 'Una', 'Vivian', 'Willa', 'Xena', 'Yara', 'Zara'],
      surnames: ['Blackwood', 'Cromwell', 'Dunmore', 'Everhart', 'Fairfax', 'Greenfield', 'Hawthorne', 'Ironside', 'Jasper', 'Kingsley', 'Lancaster', 'Mercer', 'Northwood', 'Oakley', 'Pemberton', 'Queensbury', 'Ravencroft', 'Stormwind', 'Thornwood', 'Underhill', 'Vance', 'Westbrook', 'Yarwood', 'Ashford', 'Blackthorn']
    },
    elf: {
      male: ['Aelindor', 'Beluar', 'Caelum', 'Daeron', 'Elrohir', 'Faelar', 'Galamir', 'Haldir', 'Ilvaris', 'Joreal', 'Kelvhan', 'Lorien', 'Mirathil', 'Naerion', 'Orelion', 'Paelis', 'Quelion', 'Rindel', 'Sylvar', 'Thalion', 'Ulathir', 'Vaeril', 'Wyndor', 'Xalith', 'Yaviel', 'Zephyrian'],
      female: ['Aerith', 'Briella', 'Caelynn', 'Dialya', 'Elowen', 'Faelyn', 'Galadria', 'Halieth', 'Ilyana', 'Jenessa', 'Kaelith', 'Liriel', 'Myria', 'Naevys', 'Oloria', 'Phaedra', 'Quelenna', 'Ryllia', 'Sylphie', 'Tauriel', 'Ulindra', 'Vaenya', 'Wynaria', 'Xyrella', 'Yavanna', 'Zephyra'],
      surnames: ['Amakiir', 'Brightwood', 'Cormanthyr', 'Dawntracker', 'Evenwood', 'Featherfall', 'Gladewalker', 'Highsun', 'Ilphelkiir', 'Joralei', 'Korianthil', 'Leafwhisper', 'Moonbrook', 'Nightbreeze', 'Oakenshade', 'Proudleaf', 'Quillshade', 'Riverwind', 'Starweaver', 'Treewalker', 'Ulondar', 'Vinelash', 'Windrider', 'Xiloscient', 'Yaeldrin']
    },
    dwarf: {
      male: ['Adrik', 'Barendd', 'Connerad', 'Dain', 'Eberk', 'Fargrim', 'Gardain', 'Harbek', 'Ilikan', 'Jundar', 'Kilvar', 'Loderr', 'Morgran', 'Nural', 'Oskar', 'Pieter', 'Quarrel', 'Rurik', 'Storn', 'Thoradin', 'Ulfgar', 'Vonbin', 'Werend', 'Yangrit', 'Zambul', 'Baern'],
      female: ['Amber', 'Bardryn', 'Dagnal', 'Eldeth', 'Finellen', 'Gunnloda', 'Helja', 'Ilde', 'Jarana', 'Kathra', 'Liftrasa', 'Mardred', 'Nisstra', 'Oriff', 'Perra', 'Quillathe', 'Riswynn', 'Sannl', 'Torbera', 'Urshar', 'Vistra', 'Welda', 'Yurda', 'Zulda', 'Artin'],
      surnames: ['Battlehammer', 'Bronzebeard', 'Copperfist', 'Deepdelver', 'Emberforge', 'Firebeard', 'Goldvein', 'Hammerfell', 'Ironfoot', 'Jarnhammer', 'Keenstone', 'Loderr', 'Mountainheart', 'Narlstone', 'Orebreaker', 'Proudfoot', 'Quarrystone', 'Rockseeker', 'Stonefist', 'Thunderstone', 'Ungart', 'Vaultkeeper', 'Wyrmslayer', 'Yellowbrick']
    },
    halfling: {
      male: ['Alton', 'Barrus', 'Corrin', 'Dannad', 'Eldon', 'Filmore', 'Garret', 'Hobin', 'Idabod', 'Jasper', 'Kelby', 'Lyle', 'Merric', 'Nebin', 'Osborn', 'Perrin', 'Quentin', 'Roscoe', 'Sam', 'Tobias', 'Ulmo', 'Verne', 'Wellby', 'Xander', 'Yarro', 'Zeke'],
      female: ['Andry', 'Bree', 'Callie', 'Dora', 'Euphemia', 'Fenna', 'Gilda', 'Hilda', 'Ida', 'Jillian', 'Kithri', 'Lavinia', 'Marigold', 'Nedda', 'Olga', 'Paela', 'Quintessa', 'Rosie', 'Seraphina', 'Trym', 'Una', 'Vani', 'Wella', 'Xara', 'Yulla', 'Zanna'],
      surnames: ['Appleblossom', 'Brushgather', 'Copperkettle', 'Dewfoot', 'Elderberry', 'Fairweather', 'Goodbarrel', 'Hilltopple', 'Ivywood', 'Jumbuckle', 'Kettlewhistle', 'Leagallow', 'Mossfoot', 'Nimblefingers', 'Overhill', 'Proudfoot', 'Quickstep', 'Rosewood', 'Stoutbridge', 'Tealeaf', 'Underbough', 'Vineweaver', 'Wanderfoot', 'Yellowleaf']
    },
    orc: {
      male: ['Azog', 'Brug', 'Crag', 'Drog', 'Ezak', 'Feng', 'Grak', 'Hork', 'Igg', 'Jurk', 'Krag', 'Lurtz', 'Mok', 'Nok', 'Orgul', 'Prug', 'Qort', 'Ragash', 'Shagrat', 'Thokk', 'Urzog', 'Vark', 'Warg', 'Yagak', 'Zorn', 'Grukk'],
      female: ['Arza', 'Brikka', 'Cyla', 'Droga', 'Ezza', 'Fenka', 'Grisha', 'Hezra', 'Igra', 'Jezka', 'Krula', 'Lurza', 'Mogra', 'Nezka', 'Orza', 'Pryka', 'Qira', 'Rezka', 'Shezka', 'Thezka', 'Urza', 'Vreka', 'Wezka', 'Yezka', 'Zirka', 'Grika'],
      surnames: ['Bloodfist', 'Crimsontusk', 'Deathbringer', 'Earthshaker', 'Fleshrender', 'Goreclaw', 'Hellscream', 'Ironhide', 'Jawbreaker', 'Killgore', 'Lifebane', 'Maneater', 'Nightbane', 'Orcbane', 'Plaguebearer', 'Quickblade', 'Ragefist', 'Skullcrusher', 'Thundermaw', 'Underbite', 'Vileclaw', 'Warmaul', 'Yarnok', 'Zuluhed']
    },
    tiefling: {
      male: ['Akmenos', 'Barakas', 'Cemnos', 'Damakos', 'Ekemon', 'Fennriz', 'Gadreel', 'Hadriel', 'Iados', 'Jezreel', 'Kairon', 'Leucis', 'Melech', 'Naberius', 'Oriax', 'Pelaios', 'Qemuel', 'Raziel', 'Sariel', 'Therai', 'Uriel', 'Valefor', 'Wrath', 'Xaphan', 'Yeenoghu', 'Zaebos'],
      female: ['Akta', 'Bryseis', 'Criella', 'Damaia', 'Ea', 'Fennela', 'Gaelynn', 'Hecate', 'Ishara', 'Jezebel', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna', 'Phelaia', 'Qiriel', 'Rieta', 'Sekhmet', 'Tethys', 'Urielle', 'Vashti', 'Wren', 'Xena', 'Yennefer', 'Zariel'],
      surnames: ['Ashfall', 'Brimstone', 'Cinderhart', 'Darkmore', 'Emberheart', 'Flamewrath', 'Grimshaw', 'Hellborn', 'Infernos', 'Jadescale', 'Kindred', 'Lightsbane', 'Malison', 'Nighthollow', 'Onyx', 'Pyrewood', 'Quicksilver', 'Ravenscar', 'Shadowmend', 'Thornwood', 'Umbra', 'Voidwalker', 'Witchfire', 'Ynnead', 'Zephyr']
    }
  };

  const generateRandomName = () => {
    const raceNames = NAME_LISTS[nameRace] || NAME_LISTS.human;
    let firstName;
    
    if (nameGender === 'male') {
      firstName = raceNames.male[Math.floor(Math.random() * raceNames.male.length)];
    } else if (nameGender === 'female') {
      firstName = raceNames.female[Math.floor(Math.random() * raceNames.female.length)];
    } else {
      const allFirstNames = [...raceNames.male, ...raceNames.female];
      firstName = allFirstNames[Math.floor(Math.random() * allFirstNames.length)];
    }
    
    const surname = raceNames.surnames[Math.floor(Math.random() * raceNames.surnames.length)];
    
    setGeneratedName({
      firstName,
      surname,
      fullName: `${firstName} ${surname}`,
      race: nameRace,
      gender: nameGender === 'any' ? (raceNames.male.includes(firstName) ? 'Male' : 'Female') : nameGender
    });
  };

  const saveNameAsNPC = async () => {
    if (!generatedName) return;
    
    setSavingNPC(true);
    try {
      const npcData = {
        name: generatedName.fullName,
        race: generatedName.race.charAt(0).toUpperCase() + generatedName.race.slice(1),
        occupation: '',
        description: `A ${generatedName.race} named ${generatedName.fullName}. (Generated during session)`,
        personality: '',
        notes: `Created from Name Generator on ${new Date().toLocaleDateString()}`
      };
      
      const response = await axios.post(`${API}/campaigns/${campaignId}/npcs`, npcData);
      toast.success(`${generatedName.fullName} saved as NPC!`);
      setSavedNames(prev => [...prev, { ...generatedName, id: response.data.id }]);
      setNPCs(prev => [...prev, response.data]);
    } catch (error) {
      toast.error('Failed to save NPC');
    } finally {
      setSavingNPC(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;

  // GM Theme - minimalist dark grey, red linework, white text
  const theme = {
    bg: { 
      primary: '#1F1F23', 
      surface: '#27272B', 
      elevated: '#323235',
      panel: '#27272B',
      card: '#27272B',
      hover: 'rgba(239, 68, 68, 0.12)'
    },
    accent: { 
      primary: '#EF4444',
      secondary: '#B91C1C',
      gold: '#EF4444',
      orange: '#F87171',
      hover: '#F87171',
      subtle: 'rgba(239, 68, 68, 0.12)',
      glow: 'none',
      gm: '#EF4444',
      gmSubtle: 'rgba(239, 68, 68, 0.12)'
    },
    text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
    border: 'rgba(239, 68, 68, 0.42)',
    gradient: '#EF4444'
  };

  const tabGroups = [
    { group: 'COMBAT', color: '#EF4444', tabs: [
      { id: 'combat', icon: Swords, label: 'Combat' },
    ]},
    { group: 'WORLD', color: '#EF4444', tabs: [
      { id: 'location', icon: Compass, label: 'Location' },
      { id: 'environment', icon: CloudRain, label: 'Environment' },
      { id: 'events', icon: BarChart3, label: 'Events' },
    ]},
    { group: 'CHARACTERS', color: '#EF4444', tabs: [
      { id: 'npcs', icon: UserCircle, label: 'NPCs' },
      { id: 'network', icon: Link2, label: 'NPC Network' },
      { id: 'party', icon: Users, label: 'Party' },
      { id: 'monsters', icon: Skull, label: 'Monsters' },
    ]},
    { group: 'REFERENCE', color: '#EF4444', tabs: [
      { id: 'reference-hub', icon: BookOpen, label: 'Reference Hub' },
      { id: 'tables', icon: Wand2, label: 'Tables' },
      { id: 'loot', icon: Coins, label: 'Loot' },
    ]},
    { group: 'SESSION', color: '#EF4444', tabs: [
      { id: 'notes', icon: FileText, label: 'Notes' },
      { id: 'story', icon: Target, label: 'Story Arcs' },
      { id: 'planner', icon: Sparkles, label: 'AI Planner' },
      { id: 'sound', icon: Volume2, label: 'Soundboard' },
    ]},
  ];

  const globalSearchResults = React.useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [];

    const includesQuery = (...values) =>
      values.filter(Boolean).some(value => String(value).toLowerCase().includes(query));

    const results = [];

    players.forEach(player => {
      const name = player.character_name || player.name || player.character?.name;
      if (includesQuery(name, player.character_class, player.class, player.player_name)) {
        results.push({ type: 'Party', tab: 'party', label: name || 'Party member', meta: player.character_class || player.class || 'Player' });
      }
    });

    npcs.forEach(npc => {
      if (includesQuery(npc.name, npc.role, npc.location, npc.description)) {
        results.push({ type: 'NPC', tab: 'npcs', label: npc.name || 'NPC', meta: npc.role || npc.location || 'Character' });
      }
    });

    scenarios.forEach(scenario => {
      if (includesQuery(scenario.name, scenario.title, scenario.description)) {
        results.push({ type: 'Combat', tab: 'combat', label: scenario.name || scenario.title || 'Encounter', meta: 'Encounter' });
      }
    });

    sessionNotes.forEach(note => {
      if (includesQuery(note.title, note.content, note.category)) {
        results.push({ type: 'Note', tab: 'notes', label: note.title || note.content?.slice(0, 46) || 'Session note', meta: note.category || 'Note' });
      }
    });

    customCreatures.forEach(creature => {
      if (includesQuery(creature.name, creature.type, creature.description)) {
        results.push({ type: 'Monster', tab: 'monsters', label: creature.name || 'Creature', meta: creature.type || 'Custom creature' });
      }
    });

    return results.slice(0, 8);
  }, [customCreatures, globalSearch, npcs, players, scenarios, sessionNotes]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1F1F23',
      position: 'relative'
    }}>
      {/* Page background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#1F1F23',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      {/* Subtle corner glows */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '50%',
        height: '50%',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '50%',
        height: '50%',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      {/* Header */}
      <div style={{ 
        position: 'relative',
        zIndex: 10,
        background: theme.bg.panel,
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.border}`,
        padding: '8px 16px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '1px', height: '30px', background: theme.border }} />
            <div>
              <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', color: theme.text.primary, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sword size={22} style={{ color: theme.accent.gm }} />
                {campaign?.name}
              </h1>
              {calendar && (
                <p style={{ fontSize: '13px', color: theme.accent.gm, marginTop: '2px' }}>
                  {calendar.custom_months?.[calendar.current_month - 1]?.name || 'Month'} {calendar.current_day}, Year {calendar.current_year}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div data-testid="gm-global-search" style={{ position: 'relative', minWidth: 240 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text.muted, pointerEvents: 'none' }} />
              <input
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                placeholder="Search table..."
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px 0 30px',
                  borderRadius: 0,
                  border: `1px solid ${theme.border}`,
                  background: theme.bg.surface,
                  color: theme.text.primary,
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              {globalSearch.trim() && (
                <div style={{
                  position: 'absolute',
                  top: 42,
                  right: 0,
                  width: 320,
                  maxWidth: 'calc(100vw - 24px)',
                  background: theme.bg.panel,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 0,
                  padding: 6,
                  zIndex: 80,
                  boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
                }}>
                  {globalSearchResults.length === 0 ? (
                    <div style={{ padding: 10, color: theme.text.muted, fontSize: 12 }}>No results</div>
                  ) : globalSearchResults.map((result, index) => (
                    <button
                      key={`${result.type}-${result.label}-${index}`}
                      onClick={() => {
                        setActiveTab(result.tab);
                        setGlobalSearch('');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: 0,
                        background: 'transparent',
                        color: theme.text.primary,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.label}</span>
                        <span style={{ display: 'block', fontSize: 10, color: theme.text.muted, marginTop: 1 }}>{result.meta}</span>
                      </span>
                      <span style={{ fontSize: 10, color: theme.accent.gm, fontWeight: 800, textTransform: 'uppercase' }}>{result.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Rules edition toggle — propagates to AI via campaign.rules_edition */}
            <div data-testid="rules-edition-toggle" style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 0, overflow: 'hidden',
              border: `1px solid ${theme.border}`, background: 'rgba(239, 68, 68, 0.10)',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, padding: '0 8px', letterSpacing: 0.5 }}>
                RULES
              </span>
              {['2014', '2024'].map(ed => {
                const active = rulesEdition === ed;
                return (
                  <button
                    key={ed}
                    data-testid={`rules-edition-${ed}`}
                    onClick={() => setRulesEdition(ed)}
                    title={`Switch the AI and GM tools to D&D 5e ${ed} rules`}
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                      background: active ? '#EF4444' : 'transparent',
                      color: active ? '#FFFFFF' : theme.text.secondary,
                      border: 'none', cursor: 'pointer',
                      letterSpacing: 0.5, transition: 'all 0.12s',
                    }}>
                    {ed}
                  </button>
                );
              })}
            </div>
            <SessionTimer theme={theme} />
            <Button onClick={() => setActiveTab('reference-hub')} style={{ display: 'flex', gap: '6px', padding: '10px 16px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.12)', border: `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.secondary }}>
              <BookOpen size={16} /> Reference
            </Button>
            <Button onClick={handleEndSession} style={{ display: 'flex', gap: '6px', padding: '10px 16px', fontSize: '14px', background: theme.gradient, border: 'none', borderRadius: 0, color: '#FFFFFF' }}>
              <LogOut size={16} /> End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div style={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden',
        height: 'calc(100vh - 60px)'
      }}>
        {/* LEFT SIDEBAR - Tab Navigation */}
        <div style={{
          width: '188px',
          minWidth: '188px',
          background: theme.bg.panel,
          backdropFilter: 'blur(16px)',
          borderRight: `1px solid ${theme.border}`,
          padding: '10px 0',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontFamily: "'Montserrat', sans-serif",
            color: theme.accent.gm,
            fontSize: '13px',
            fontWeight: '800',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '12px',
            paddingLeft: '16px'
          }}>
            Live Play
          </h3>
          
          {/* Grouped Sidebar Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tabGroups.map(group => {
              const isCollapsed = collapsedGroups[group.group];
              const hasActive = group.tabs.some(t => t.id === activeTab);
              return (
                <div key={group.group}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.group)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', color: hasActive ? group.color : theme.text.muted,
                      fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                      transition: 'color 0.2s',
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: group.color, flexShrink: 0, opacity: hasActive ? 1 : 0.4 }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{group.group}</span>
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                  
                  {/* Group Tabs */}
                  {!isCollapsed && group.tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const isHovered = hoveredTab === tab.id && !isActive;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        onMouseEnter={() => setHoveredTab(tab.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                        data-testid={`tab-${tab.id}`}
                        className={`tab-glow press-scale ${isActive ? 'tab-active' : ''}`}
                        style={{
                          position: 'relative', padding: '10px 16px 10px 28px', border: 'none',
                          background: isActive ? theme.gradient : (isHovered ? theme.bg.hover : 'transparent'),
                          color: isActive ? '#FFFFFF' : (isHovered ? theme.text.primary : theme.text.secondary),
                          fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          textAlign: 'left', width: '100%', minHeight: '40px',
                          overflow: 'hidden', borderRadius: 0
                        }}
                      >
                        <tab.icon size={16} />
                        <span style={{ flex: 1 }}>{tab.label}</span>
                        <div style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0,
                          width: isHovered && !isActive ? '3px' : '0px',
                          background: group.color, transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
        gap: '10px',
        overflowY: 'auto',
          padding: '14px',
          background: 'transparent'
        }}>
          {/* Tab Content */}
          <div style={{ 
            flex: 1,
            background: theme.bg.panel, 
            backdropFilter: 'blur(16px)', 
            border: `1px solid ${theme.border}`, 
            borderRadius: 0,
            padding: '16px',
            minHeight: '500px',
            overflowY: 'auto'
          }}>
            {/* COMBAT TAB */}
            {activeTab === 'combat' && (
              <CombatTab theme={theme} campaignId={campaignId} scenarios={scenarios} selectedScenario={selectedScenario} setSelectedScenario={setSelectedScenario} launchCombat={launchCombat} quickStartCombat={quickStartCombat} players={players} setShowQuickCombat={setShowQuickCombat} />
            )}

          {/* LOCATION TAB */}
          {activeTab === 'location' && (
            <PartyLocationTracker campaignId={campaignId} />
          )}

          {/* ENVIRONMENT TAB */}
          {activeTab === 'environment' && (
            <EnvironmentControl
              campaignId={campaignId}
              campaign={campaign}
              onEnvironmentChange={(environment) => setCampaign(prev => prev ? { ...prev, campaign_environment: environment } : prev)}
            />
          )}

          {/* NPCs TAB */}
          {/* NPCS TAB - Combined with Name Generator */}
          {activeTab === 'npcs' && (
            <NpcsTab theme={theme} campaignId={campaignId} nameRace={nameRace} setNameRace={setNameRace} nameGender={nameGender} setNameGender={setNameGender} generatedName={generatedName} generateRandomName={generateRandomName} saveNameAsNPC={saveNameAsNPC} savingNPC={savingNPC} savedNames={savedNames} />
          )}

          {/* MONSTER LOOKUP TAB - Combined with Custom Creatures */}
          {activeTab === 'monsters' && (
            <MonstersTab theme={theme} campaignId={campaignId} />
          )}

          {/* RANDOM TABLES TAB */}
          {activeTab === 'tables' && (
            <div>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', color: theme.text.primary, fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wand2 size={24} style={{ color: theme.accent.gm }} /> Random Tables
              </h2>
              <RandomTables onSaveAsNote={(text) => {
                const newNote = {
                  id: Date.now().toString(),
                  content: text,
                  category: 'general',
                  timestamp: new Date().toISOString()
                };
                setSessionNotes(prev => [...prev, newNote]);
                toast.success('Added to session notes!');
              }} />
            </div>
          )}

          {/* UNIFIED REFERENCE HUB TAB */}
          {activeTab === 'reference-hub' && (
            <div>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', color: theme.text.primary, fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} style={{ color: theme.accent.gm }} /> Reference Center
              </h2>
              <UnifiedReferenceCenter onRollDamage={rollQuickDice} isCompact={false} />
            </div>
          )}

          {/* LOOT GENERATOR TAB */}
          {activeTab === 'loot' && (
            <div>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', color: theme.text.primary, fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Coins size={24} style={{ color: theme.accent.gm }} /> Loot Generator
              </h2>
              <LootGenerator />
            </div>
          )}

          {/* PARTY TAB */}
          {activeTab === 'party' && (
            <PartyTab theme={theme} players={players} />
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <NotesTab theme={theme} campaignId={campaignId} quickNote={quickNote} setQuickNote={setQuickNote} processingNote={processingNote} handleSubmitNote={handleSubmitNote} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} />
          )}

          {/* STORY ARCS TAB */}
          {activeTab === 'story' && (
            <StoryArcTracker theme={theme} campaignId={campaignId} />
          )}

          {/* AI PLANNER TAB */}
          {activeTab === 'planner' && (
            <AISessionPlanner theme={theme} campaignId={campaignId} />
          )}

          {/* SOUNDBOARD TAB */}
          {activeTab === 'sound' && (
            <Soundboard theme={theme} campaignId={campaignId} />
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <EventSystem theme={theme} campaignId={campaignId} />
          )}

          {/* NPC NETWORK TAB */}
          {activeTab === 'network' && (
            <NPCRelationshipMap theme={theme} campaignId={campaignId} />
          )}
          </div>
          
          {/* PERSISTENT DICE ROLLER PANEL */}
          <div style={{
            width: showDicePanel ? '280px' : '44px',
            minWidth: showDicePanel ? '280px' : '44px',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Toggle Button */}
            <button
              data-testid="dice-roller-toggle"
              onClick={() => setShowDicePanel(!showDicePanel)}
              style={{
                background: theme.gradient,
                border: 'none',
                borderRadius: 0,
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: showDicePanel ? 'space-between' : 'center',
                gap: '8px',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            >
              <Dices size={20} />
              {showDicePanel && <span>Quick Dice</span>}
              {showDicePanel && (
                <span style={{ fontSize: '18px', transform: 'rotate(90deg)' }}>›</span>
              )}
            </button>
            
            {/* Dice Panel Content */}
            {showDicePanel && (
              <div style={{
                background: theme.bg.panel,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${theme.border}`,
                borderTop: 'none',
                borderRadius: 0,
                padding: '16px',
                flex: 1,
                overflowY: 'auto'
              }}>
                {/* Quick Roll Buttons */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: theme.text.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Quick Roll</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
                      <button
                        key={die}
                        onClick={() => rollQuickDice(`1${die}`, die.toUpperCase())}
                        style={{
                          padding: '10px 8px',
                          background: 'rgba(239, 68, 68, 0.18)',
                          border: `1px solid ${theme.accent.primary}`,
                          borderRadius: 0,
                          color: theme.accent.primary,
                          fontSize: '13px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.28)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {die}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Common Rolls */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: theme.text.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Common Rolls</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { label: 'Attack (d20)', dice: '1d20' },
                      { label: 'Advantage', dice: '2d20' },
                      { label: 'Damage (2d6)', dice: '2d6' },
                      { label: 'Fireball (8d6)', dice: '8d6' },
                    ].map(({ label, dice }) => (
                      <button
                        key={dice}
                        onClick={() => rollQuickDice(dice, label)}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(239, 68, 68, 0.14)',
                          border: `1px solid ${theme.accent.primary}`,
                          borderRadius: 0,
                          color: theme.text.primary,
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.26)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.14)';
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* d100 / Percentile */}
                <div>
                  <p style={{ color: theme.text.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Percentile</p>
                  <button
                    onClick={() => rollQuickDice('1d100', 'Percentile')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: `1px solid ${theme.accent.primary}`,
                      borderRadius: 0,
                      color: theme.accent.primary,
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.28)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                    }}
                  >
                    Roll d100
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LiveSessionMode
        theme={theme}
        campaign={campaign}
        players={players}
        calendar={calendar}
        onRollDice={rollQuickDice}
        onQuickCombat={() => setShowQuickCombat(true)}
        onOpenTab={setActiveTab}
        onGenerateContent={(type) => setActiveTab(type === 'npc' ? 'npcs' : 'planner')}
        isActive={showLiveSession}
        onToggle={() => setShowLiveSession(prev => !prev)}
      />
      
      {/* Quick Combat Modal */}
      <QuickCombatModal
        isOpen={showQuickCombat}
        onClose={() => setShowQuickCombat(false)}
        campaignId={campaignId}
        players={players}
        customCreatures={customCreatures}
        onStartCombat={handleQuickCombatStart}
      />
      
      {/* Compact dice result */}
      <DiceRollFlicker
        isOpen={showDiceFlicker}
        onClose={() => setShowDiceFlicker(false)}
        rolls={diceRolls}
        label={diceLabel}
        modifier={diceModifier}
        total={diceTotal}
        isCrit={diceCrit}
        isFumble={diceFumble}
        theme="gm"
      />
      <DiceRollHistory
        history={diceHistory}
        theme="gm"
        onShare={(roll) => {
          const text = `GM rolled ${roll.label}: ${roll.total}${roll.isCrit ? ' (NAT 20!)' : roll.isFumble ? ' (NAT 1!)' : ''}`;
          navigator.clipboard.writeText(text).then(() => toast.success('Roll copied to clipboard!'));
        }}
      />
      
      {/* AI Co-GM Assistant */}
      <AICoGM theme={theme} campaignId={campaignId} activeTab={activeTab} />
    </div>
  );
}

export default GMScreen;
