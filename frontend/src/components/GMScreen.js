import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
// Logo import removed for minimalist design
import { 
  Sword, Users, BookOpen, Send, 
  Loader, LogOut, Play, Dices, Coins, Swords, ArrowRight, Package, FileText, UserPlus, Shuffle, Skull, Wand2, PlusCircle, Zap, Compass, UserCircle, Music, Target, Volume2, Link2
} from 'lucide-react';
import DiceRoller from '@/components/DiceRoller';
import DiceRoller3D from '@/components/ui/DiceRoller3D';
import LootGenerator from '@/components/LootGenerator';
import PartyInventory from '@/components/PartyInventory';
import { QuickReferenceModal } from '@/components/QuickReference';
import MonsterLookup from '@/components/MonsterLookup';
import RandomTables from '@/components/RandomTables';
import QuickTips, { TIPS } from '@/components/QuickTips';
import CustomCreatureManager from '@/components/CustomCreatureManager';
import QuickCombatModal from '@/components/QuickCombatModal';
import PartyLocationTracker from '@/components/PartyLocationTracker';
import NPCQuickReference from '@/components/NPCQuickReference';
import TronBackground from '@/components/TronBackground';
// New GM Tools
import Soundboard from '@/components/gm/Soundboard';
import LiveSessionMode from '@/components/gm/LiveSessionMode';
import SmartSessionLog from '@/components/gm/SmartSessionLog';
import StoryArcTracker from '@/components/gm/StoryArcTracker';
import NPCRelationshipMap from '@/components/gm/NPCRelationshipMap';
import AICoGM from '@/components/gm/AICoGM';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function GMScreen({ username }) {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [showQuickRef, setShowQuickRef] = useState(false);
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
  const [showDicePanel, setShowDicePanel] = useState(true);
  
  // 3D Dice Roller state
  const [show3DDice, setShow3DDice] = useState(false);
  const [diceRolls, setDiceRolls] = useState([]);
  const [diceLabel, setDiceLabel] = useState('');
  const [diceModifier, setDiceModifier] = useState(0);
  const [diceTotal, setDiceTotal] = useState(0);
  const [diceCrit, setDiceCrit] = useState(false);
  const [diceFumble, setDiceFumble] = useState(false);
  
  // Live Session Mode state
  const [showLiveSession, setShowLiveSession] = useState(false);

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
      toast.error('Failed to load GM Screen data');
    } finally {
      setLoading(false);
    }
  };

  // 3D Dice Roll Function
  const roll3DDice = (notation, label = '') => {
    // Parse dice notation like "2d6", "1d20+5"
    const match = notation.match(/(\d+)?d(\d+)([+-]\d+)?/i);
    if (!match) return;
    
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const modifier = parseInt(match[3]) || 0;
    
    const rolls = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
      const result = Math.floor(Math.random() * sides) + 1;
      rolls.push({ sides, result });
      total += result;
    }
    
    total += modifier;
    
    const isCrit = count === 1 && sides === 20 && rolls[0].result === 20;
    const isFumble = count === 1 && sides === 20 && rolls[0].result === 1;
    
    setDiceRolls(rolls);
    setDiceLabel(label || notation);
    setDiceModifier(modifier);
    setDiceTotal(total);
    setDiceCrit(isCrit);
    setDiceFumble(isFumble);
    setShow3DDice(true);
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

  const tabs = [
    { id: 'combat', icon: Swords, label: 'Combat' },
    { id: 'location', icon: Compass, label: 'Location' },
    { id: 'npcs', icon: UserCircle, label: 'NPCs' },
    { id: 'network', icon: Link2, label: 'NPC Network' },
    { id: 'monsters', icon: Skull, label: 'Monsters' },
    { id: 'tables', icon: Wand2, label: 'Tables' },
    { id: 'loot', icon: Coins, label: 'Loot' },
    { id: 'dice', icon: Dices, label: 'Dice' },
    { id: 'party', icon: Users, label: 'Party' },
    { id: 'notes', icon: FileText, label: 'Notes' },
    { id: 'story', icon: Target, label: 'Story Arcs' },
    { id: 'sound', icon: Volume2, label: 'Soundboard' },
  ];

  // GM Theme - Midnight Neon (Dark Purple/Violet)
  const theme = {
    bg: { 
      primary: '#0B0B0D', 
      surface: '#131317', 
      elevated: '#1C1C24',
      panel: 'rgba(19, 19, 23, 0.9)',
      card: 'rgba(11, 11, 13, 0.8)',
      hover: 'rgba(138, 43, 226, 0.15)'
    },
    accent: { 
      primary: '#8A2BE2',      // Blue Violet
      secondary: '#4B0082',    // Indigo
      gold: '#F59E0B',         // Gold for highlights
      orange: '#BA55D3',       // Medium Orchid
      hover: '#9932CC',        // Dark Orchid
      subtle: 'rgba(138, 43, 226, 0.15)',
      glow: '0 0 20px rgba(138, 43, 226, 0.4)',
      // GM-specific accent (violet glow)
      gm: '#8A2BE2',
      gmSubtle: 'rgba(138, 43, 226, 0.15)'
    },
    text: { primary: '#F8F8FF', secondary: '#A0A0B0', muted: '#6B6B7B' },
    border: 'rgba(138, 43, 226, 0.3)',
    gradient: 'linear-gradient(135deg, #4B0082 0%, #8A2BE2 100%)'
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0B0B0D',
      position: 'relative'
    }}>
      {/* Gradient background - black at top, purple glow at bottom */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          linear-gradient(180deg, 
            rgba(11, 11, 13, 1) 0%, 
            rgba(11, 11, 13, 0.95) 40%, 
            rgba(75, 0, 130, 0.2) 70%,
            rgba(138, 43, 226, 0.15) 100%
          )
        `,
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
        background: 'radial-gradient(ellipse at 0% 100%, rgba(138, 43, 226, 0.1) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '50%',
        height: '50%',
        background: 'radial-gradient(ellipse at 100% 100%, rgba(75, 0, 130, 0.1) 0%, transparent 60%)',
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
        padding: '12px 24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '1px', height: '30px', background: theme.border }} />
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setShowQuickRef(true)} style={{ display: 'flex', gap: '6px', padding: '10px 16px', fontSize: '14px', background: 'rgba(138, 43, 226, 0.1)', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.text.secondary }}>
              <BookOpen size={16} /> Reference
            </Button>
            <Button onClick={handleEndSession} style={{ display: 'flex', gap: '6px', padding: '10px 16px', fontSize: '14px', background: theme.gradient, border: 'none', borderRadius: '10px', color: theme.text.primary }}>
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
          width: '210px',
          minWidth: '210px',
          background: theme.bg.panel,
          backdropFilter: 'blur(16px)',
          borderRight: `1px solid ${theme.border}`,
          padding: '16px 0',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontFamily: "'Cinzel', serif",
            color: theme.accent.gm,
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '12px',
            paddingLeft: '16px'
          }}>
            GM Tools
          </h3>
          
          {/* Sidebar Tabs with Sunset Hover Effect */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tabs.map(tab => {
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
                    position: 'relative',
                    padding: '12px 16px',
                    border: 'none',
                    background: isActive ? theme.gradient : (isHovered ? theme.bg.hover : 'transparent'),
                    color: isActive ? theme.text.primary : (isHovered ? theme.text.primary : theme.text.secondary),
                    fontWeight: '500',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left',
                    width: '100%',
                    minHeight: '46px',
                    overflow: 'hidden',
                    borderRadius: '6px'
                  }}
                >
                  <tab.icon size={18} />
                  <span style={{ flex: 1 }}>{tab.label}</span>
                  
                  {/* Purple/gold bar on right side - slides in on hover */}
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: isHovered && !isActive ? '3px' : '0px',
                    background: theme.accent.gm,
                    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </button>
              );
            })}
          </div>
          
          {/* Quick Tips */}
          <div style={{ padding: '16px', marginTop: '16px' }}>
            <QuickTips 
              tips={TIPS.gmScreen} 
              pageId="gmScreen" 
              title="GM Screen Tips"
            />
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          gap: '16px',
          overflowY: 'auto',
          padding: '24px',
          background: 'transparent'
        }}>
          {/* Tab Content */}
          <div style={{ 
            flex: 1,
            background: theme.bg.panel, 
            backdropFilter: 'blur(16px)', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px', 
            padding: '24px', 
            minHeight: '500px',
            overflowY: 'auto'
          }}>
            {/* COMBAT TAB */}
            {activeTab === 'combat' && (
              <div>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Swords size={24} style={{ color: theme.accent.primary }} /> Combat Control
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  {/* Encounter Selector */}
                  <div>
                    <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px' }}>Select Encounter</h3>
                    {scenarios.length === 0 ? (
                      <div style={{ background: theme.bg.card, border: `1px dashed ${theme.border}`, borderRadius: '10px', padding: '30px', textAlign: 'center' }}>
                        <Swords size={32} style={{ color: theme.text.muted, margin: '0 auto 12px' }} />
                        <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '8px' }}>No encounters created</p>
                        <p style={{ color: theme.text.muted, fontSize: '13px' }}>Create encounters in the Combat Creator tab of your campaign dashboard</p>
                      </div>
                    ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {scenarios.map(s => (
                        <button
                          key={s.id}
                          data-testid={`encounter-${s.id}`}
                          onClick={() => setSelectedScenario(s)}
                          style={{
                            padding: '14px 16px',
                            background: selectedScenario?.id === s.id ? theme.accent.gmSubtle : theme.bg.card,
                            border: `1px solid ${selectedScenario?.id === s.id ? theme.accent.gm : theme.border}`,
                            borderLeft: selectedScenario?.id === s.id ? `3px solid ${theme.accent.gm}` : `1px solid ${theme.border}`,
                            borderRadius: '10px',
                            color: theme.text.primary,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '4px', fontSize: '15px' }}>{s.name}</div>
                          <div style={{ fontSize: '13px', color: theme.text.secondary, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>{s.combatants?.length || 0} combatants</span>
                            {s.map_url && <span style={{ color: theme.accent.gm }}>Has Map</span>}
                            {s.combatants?.some(c => c.loot?.length > 0) && <span style={{ color: '#F59E0B' }}>Has Loot</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Combat Actions */}
                <div>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px' }}>Launch Combat</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button 
                      onClick={launchCombat} 
                      data-testid="start-combat-btn"
                      disabled={!selectedScenario}
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '10px',
                        padding: '16px',
                        fontSize: '16px',
                        background: selectedScenario ? theme.gradient : theme.bg.card,
                        border: 'none',
                        borderRadius: '10px',
                        color: theme.text.primary,
                        opacity: selectedScenario ? 1 : 0.5
                      }}
                    >
                      <Play size={18} /> Start Combat <ArrowRight size={16} />
                    </Button>
                    
                    <Button 
                      onClick={quickStartCombat} 
                      data-testid="quick-combat-btn"
                      disabled={players.length === 0}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(138, 43, 226, 0.1)', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.text.secondary, fontSize: '15px' }}
                    >
                      <Users size={16} /> Quick Start with Players ({players.length})
                    </Button>
                    
                    {/* Spontaneous Combat Button */}
                    <Button 
                      onClick={() => setShowQuickCombat(true)} 
                      data-testid="spontaneous-combat-btn"
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        padding: '14px',
                        background: 'rgba(239, 68, 68, 0.8)',
                        border: 'none',
                        borderRadius: '10px',
                        color: theme.text.primary,
                        fontSize: '15px'
                      }}
                    >
                      <Zap size={16} /> Spontaneous Combat
                    </Button>
                    
                    <p style={{ fontSize: '13px', color: theme.text.muted, textAlign: 'center', fontStyle: 'italic', marginTop: '8px' }}>
                      Combat opens in a dedicated full-screen view with initiative tracker and battle map
                    </p>
                  </div>
                  
                  {/* Selected Encounter Preview */}
                  {selectedScenario && (
                    <div style={{ marginTop: '20px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '14px' }}>
                      <h4 style={{ fontSize: '15px', color: theme.text.primary, fontWeight: '500', marginBottom: '10px' }}>{selectedScenario.name}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedScenario.combatants?.slice(0, 6).map(c => (
                          <div key={c.id} style={{ 
                            background: c.type === 'player' ? 'rgba(138, 43, 226, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                            border: `1px solid ${c.type === 'player' ? theme.accent.primary : '#EF4444'}`,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: theme.text.primary
                          }}>
                            {c.name}
                            {c.loot?.length > 0 && <Coins size={10} style={{ marginLeft: '4px', color: '#F59E0B' }} />}
                          </div>
                        ))}
                        {selectedScenario.combatants?.length > 6 && (
                          <div style={{ padding: '6px 10px', fontSize: '13px', color: theme.text.muted }}>
                            +{selectedScenario.combatants.length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LOCATION TAB */}
          {activeTab === 'location' && (
            <PartyLocationTracker campaignId={campaignId} />
          )}

          {/* NPCs TAB */}
          {/* NPCS TAB - Combined with Name Generator */}
          {activeTab === 'npcs' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCircle size={24} style={{ color: theme.accent.orange }} /> NPCs & Name Generator
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Left: Saved NPCs */}
                <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '16px' }}>
                    Saved NPCs
                  </h3>
                  <NPCQuickReference campaignId={campaignId} />
                </div>
                
                {/* Right: Name Generator */}
                <div>
                  <div style={{ background: theme.bg.card, border: `1px solid ${theme.accent.orange}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.orange, fontWeight: '600', marginBottom: '20px' }}>Generate NPC Name</h3>
                    
                    {/* Race Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: theme.text.secondary, fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Race</label>
                      <select
                        value={nameRace}
                        onChange={(e) => setNameRace(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(15, 10, 30, 0.6)',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '10px',
                          color: theme.text.primary,
                          fontSize: '15px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="human">Human</option>
                        <option value="elf">Elf</option>
                        <option value="dwarf">Dwarf</option>
                        <option value="halfling">Halfling</option>
                        <option value="orc">Orc / Half-Orc</option>
                        <option value="tiefling">Tiefling</option>
                      </select>
                    </div>
                    
                    {/* Gender Selection */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: theme.text.secondary, fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gender</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['any', 'male', 'female'].map(g => (
                          <button
                            key={g}
                            onClick={() => setNameGender(g)}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: nameGender === g ? 'rgba(249, 115, 22, 0.2)' : 'rgba(15, 10, 30, 0.5)',
                              border: `1px solid ${nameGender === g ? theme.accent.orange : theme.border}`,
                              borderRadius: '8px',
                              color: nameGender === g ? theme.accent.orange : theme.text.secondary,
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                              transition: 'all 0.2s'
                            }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Generate Button */}
                    <Button
                      onClick={generateRandomName}
                      className="btn-primary"
                      data-testid="generate-name-btn"
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '16px',
                        background: theme.gradient,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                    >
                      <Shuffle size={20} />
                      Generate Name
                    </Button>
                  </div>
                  
                  {/* Generated Name Display */}
                  {generatedName && (
                    <div style={{ 
                      background: 'rgba(138, 43, 226, 0.1)',
                      border: `1px solid ${theme.accent.primary}`,
                      borderRadius: '12px',
                      padding: '24px',
                      textAlign: 'center',
                      marginBottom: '20px'
                    }}>
                      <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Generated Name</p>
                      <h3 style={{ 
                        fontFamily: "'Cinzel', serif",
                        fontSize: '28px', 
                        color: theme.text.primary, 
                        fontWeight: '600',
                        marginBottom: '8px',
                        background: theme.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {generatedName.fullName}
                      </h3>
                      <p style={{ color: theme.accent.secondary, fontSize: '15px', marginBottom: '20px' }}>
                        {generatedName.gender} {generatedName.race.charAt(0).toUpperCase() + generatedName.race.slice(1)}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                          onClick={generateRandomName}
                          className="btn-secondary"
                          style={{ flex: 1, borderRadius: '10px', padding: '12px', fontSize: '14px' }}
                        >
                          <Shuffle size={16} style={{ marginRight: '6px' }} />
                          Reroll
                        </Button>
                        <Button
                          onClick={saveNameAsNPC}
                          disabled={savingNPC}
                          className="btn-primary"
                          data-testid="save-as-npc-btn"
                          style={{ 
                            flex: 1,
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '14px',
                            background: `linear-gradient(135deg, ${theme.accent.gm} 0%, #D97706 100%)`
                          }}
                        >
                          {savingNPC ? (
                            <Loader className="animate-spin" size={16} />
                          ) : (
                            <>
                              <UserPlus size={16} style={{ marginRight: '6px' }} />
                              Save as NPC
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Saved Names This Session */}
                  {savedNames.length > 0 && (
                    <div style={{ background: theme.bg.card, border: `1px solid ${theme.accent.primary}`, borderRadius: '12px', padding: '20px' }}>
                      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={16} />
                        Saved This Session ({savedNames.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                        {savedNames.map((name, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '10px 14px',
                              background: theme.accent.gmSubtle,
                              border: `1px solid ${theme.accent.gm}`,
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <span style={{ color: theme.text.primary, fontWeight: '500', fontSize: '14px' }}>{name.fullName}</span>
                              <span style={{ color: theme.text.secondary, fontSize: '12px', marginLeft: '8px' }}>
                                {name.race.charAt(0).toUpperCase() + name.race.slice(1)}
                              </span>
                            </div>
                            <span style={{ 
                              background: theme.accent.gm, 
                              color: '#000', 
                              padding: '3px 8px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: '600' 
                            }}>
                              SAVED
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DICE TAB */}
          {activeTab === 'dice' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Dices size={24} style={{ color: theme.accent.primary }} /> Dice Roller
              </h2>
              <DiceRoller />
            </div>
          )}

          {/* MONSTER LOOKUP TAB - Combined with Custom Creatures */}
          {activeTab === 'monsters' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Skull size={24} style={{ color: theme.accent.primary }} /> Monsters & Custom Creatures
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Left: Monster Lookup */}
                <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.primary, fontWeight: '600', marginBottom: '16px' }}>
                    SRD Monster Lookup
                  </h3>
                  <MonsterLookup />
                </div>
                
                {/* Right: Custom Creatures */}
                <div style={{ background: theme.bg.card, border: `1px solid ${theme.accent.gm}`, borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px' }}>
                    Custom Creatures
                  </h3>
                  <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '16px' }}>
                    Create homebrew monsters or import creatures from CSV files.
                  </p>
                  <CustomCreatureManager 
                    campaignId={campaignId}
                    isOpen={true}
                    onClose={() => {}}
                    onSelectCreature={(creature) => {
                      toast.success(`${creature.name} added! Go to Combat tab to use it in an encounter.`);
                    }}
                    embedded={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* RANDOM TABLES TAB */}
          {activeTab === 'tables' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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

          {/* LOOT GENERATOR TAB */}
          {activeTab === 'loot' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Coins size={24} style={{ color: theme.accent.gm }} /> Loot Generator
              </h2>
              <LootGenerator />
            </div>
          )}

          {/* PARTY TAB */}
          {activeTab === 'party' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={24} style={{ color: theme.accent.primary }} /> Party Overview
              </h2>
              
              {players.length === 0 ? (
                <div style={{ background: theme.bg.card, border: `1px dashed ${theme.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <Users size={40} style={{ color: theme.accent.primary, margin: '0 auto 16px' }} />
                  <p style={{ color: theme.text.secondary, fontSize: '15px', marginBottom: '8px' }}>No players in campaign</p>
                  <p style={{ color: theme.text.muted, fontSize: '14px' }}>Add players in the Players tab of your campaign dashboard</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {players.map(player => (
                    <div
                      key={player.id}
                      style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '18px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ 
                          width: '50px', height: '50px', borderRadius: '50%', 
                          background: theme.gradient, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: '700', color: theme.text.primary, fontSize: '20px', fontFamily: "'Cinzel', serif"
                        }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: theme.text.primary, fontWeight: '600', fontSize: '17px', fontFamily: "'Cinzel', serif" }}>{player.name}</div>
                          <div style={{ color: theme.accent.secondary, fontSize: '14px' }}>
                            {player.race || 'Unknown'} {player.class || 'Adventurer'} {player.level ? `Lv.${player.level}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <div style={{ background: 'rgba(236, 72, 153, 0.15)', border: `1px solid ${theme.accent.secondary}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: theme.accent.secondary, fontWeight: '500' }}>HP</div>
                          <div style={{ fontSize: '18px', color: theme.text.primary, fontWeight: '600' }}>{player.hp || player.max_hp || '?'}/{player.max_hp || '?'}</div>
                        </div>
                        <div style={{ background: 'rgba(138, 43, 226, 0.15)', border: `1px solid ${theme.accent.primary}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: theme.accent.primary, fontWeight: '500' }}>AC</div>
                          <div style={{ fontSize: '18px', color: theme.text.primary, fontWeight: '600' }}>{player.ac || '?'}</div>
                        </div>
                        <div style={{ background: theme.accent.gmSubtle, border: `1px solid ${theme.accent.gm}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: theme.accent.gm, fontWeight: '500' }}>INIT</div>
                          <div style={{ fontSize: '18px', color: theme.text.primary, fontWeight: '600' }}>
                            {player.stats?.dexterity ? (() => {
                              const mod = Math.floor((player.stats.dexterity - 10) / 2);
                              return mod >= 0 ? `+${mod}` : `${mod}`;
                            })() : '?'}
                          </div>
                        </div>
                      </div>
                      
                      {player.stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginTop: '14px' }}>
                          {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((stat, i) => {
                            const statKey = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'][i];
                            const val = player.stats[statKey] || 10;
                            const mod = Math.floor((val - 10) / 2);
                            return (
                              <div key={stat} style={{ textAlign: 'center', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '6px', padding: '6px' }}>
                                <div style={{ fontSize: '11px', color: theme.text.muted }}>{stat}</div>
                                <div style={{ fontSize: '14px', color: theme.text.primary, fontWeight: '500' }}>{val}</div>
                                <div style={{ fontSize: '11px', color: mod >= 0 ? theme.accent.gm : theme.accent.secondary }}>{mod >= 0 ? '+' : ''}{mod}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={24} style={{ color: theme.accent.secondary }} /> Session Notes
              </h2>
              
              <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Add Note */}
                <div>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px' }}>Quick Note</h3>
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    style={{ 
                      minHeight: '150px', 
                      marginBottom: '12px', 
                      fontSize: '15px', 
                      width: '100%',
                      background: 'rgba(15, 10, 30, 0.6)',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      color: theme.text.primary,
                      resize: 'vertical'
                    }}
                    placeholder="Write a quick note about the session... NPCs met, events, plot points, etc."
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      onClick={handleSubmitNote} 
                      disabled={processingNote || !quickNote.trim()} 
                      className="press-scale"
                      style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center', background: theme.gradient, color: theme.text.primary, border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px' }}
                    >
                      {processingNote ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Save Note
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!quickNote.trim()) return;
                        try {
                          await axios.post(`${API}/campaigns/${campaignId}/sync-note`, {
                            note_content: quickNote,
                            note_type: 'gm_note',
                            title: 'Session Update',
                            create_timeline_event: true
                          });
                          toast.success('Note synced to all players!');
                          setQuickNote('');
                        } catch (err) {
                          toast.error('Failed to sync note');
                        }
                      }}
                      disabled={!quickNote.trim()}
                      className="press-scale tab-glow"
                      style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        justifyContent: 'center', 
                        background: 'rgba(138, 43, 226, 0.2)', 
                        color: theme.accent.secondary, 
                        border: `1px solid ${theme.accent.secondary}`, 
                        borderRadius: '10px', 
                        padding: '14px', 
                        fontSize: '14px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Users size={16} /> Sync to Players
                    </Button>
                  </div>
                </div>

                {/* Notes List */}
                <div>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px' }}>Recent Notes ({sessionNotes.length})</h3>
                  <div className="scroll-smooth" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionNotes.length === 0 ? (
                      <div className="card-hover" style={{ background: theme.bg.card, border: `2px dashed ${theme.border}`, padding: '30px', textAlign: 'center', borderRadius: '10px' }}>
                        <FileText size={32} style={{ color: theme.text.muted, margin: '0 auto 12px' }} />
                        <p style={{ color: theme.text.secondary, fontSize: '13px' }}>No notes yet</p>
                      </div>
                    ) : (
                      sessionNotes.map(note => (
                        <div key={note.id} className="card-hover" style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', color: theme.text.muted, marginBottom: '6px' }}>
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                          <div style={{ color: theme.text.white, fontSize: '13px', lineHeight: '1.5' }}>{note.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STORY ARCS TAB */}
          {activeTab === 'story' && (
            <StoryArcTracker theme={theme} campaignId={campaignId} />
          )}

          {/* SOUNDBOARD TAB */}
          {activeTab === 'sound' && (
            <Soundboard theme={theme} campaignId={campaignId} />
          )}

          {/* NPC NETWORK TAB */}
          {activeTab === 'network' && (
            <NPCRelationshipMap theme={theme} campaignId={campaignId} />
          )}
          </div>
          
          {/* PERSISTENT DICE ROLLER PANEL */}
          <div style={{
            width: showDicePanel ? '320px' : '48px',
            minWidth: showDicePanel ? '320px' : '48px',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Toggle Button */}
            <button
              onClick={() => setShowDicePanel(!showDicePanel)}
              style={{
                background: theme.gradient,
                border: 'none',
                borderRadius: showDicePanel ? '12px 12px 0 0' : '12px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: showDicePanel ? 'space-between' : 'center',
                gap: '8px',
                color: '#fff',
                fontWeight: '600',
                fontSize: '14px',
                fontFamily: "'Cinzel', serif"
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
                borderRadius: '0 0 12px 12px',
                padding: '16px',
                flex: 1,
                overflowY: 'auto'
              }}>
                {/* Quick Roll Buttons */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: theme.text.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Quick Roll (3D)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
                      <button
                        key={die}
                        onClick={() => roll3DDice(`1${die}`, die.toUpperCase())}
                        style={{
                          padding: '10px 8px',
                          background: 'rgba(138, 43, 226, 0.2)',
                          border: `1px solid ${theme.accent.primary}`,
                          borderRadius: '8px',
                          color: theme.accent.primary,
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(138, 43, 226, 0.4)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)';
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
                  <p style={{ color: theme.text.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Common Rolls (3D)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { label: 'Attack (d20)', dice: '1d20' },
                      { label: 'Advantage', dice: '2d20' },
                      { label: 'Damage (2d6)', dice: '2d6' },
                      { label: 'Fireball (8d6)', dice: '8d6' },
                    ].map(({ label, dice }) => (
                      <button
                        key={dice}
                        onClick={() => roll3DDice(dice, label)}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(138, 43, 226, 0.15)',
                          border: `1px solid ${theme.accent.primary}`,
                          borderRadius: '8px',
                          color: theme.text.primary,
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(138, 43, 226, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(138, 43, 226, 0.15)';
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
                    onClick={() => roll3DDice('1d100', 'Percentile')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(138, 43, 226, 0.2)',
                      border: `1px solid ${theme.accent.primary}`,
                      borderRadius: '8px',
                      color: theme.accent.primary,
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(138, 43, 226, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)';
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

      <QuickReferenceModal isOpen={showQuickRef} onClose={() => setShowQuickRef(false)} />
      
      {/* Quick Combat Modal */}
      <QuickCombatModal
        isOpen={showQuickCombat}
        onClose={() => setShowQuickCombat(false)}
        campaignId={campaignId}
        players={players}
        customCreatures={customCreatures}
        onStartCombat={handleQuickCombatStart}
      />
      
      {/* 3D Dice Roller */}
      <DiceRoller3D
        isOpen={show3DDice}
        onClose={() => setShow3DDice(false)}
        rolls={diceRolls}
        label={diceLabel}
        modifier={diceModifier}
        total={diceTotal}
        isCrit={diceCrit}
        isFumble={diceFumble}
        theme="gm"
      />
      
      {/* AI Co-GM Assistant */}
      <AICoGM theme={theme} campaignId={campaignId} activeTab={activeTab} />
    </div>
  );
}

export default GMScreen;
