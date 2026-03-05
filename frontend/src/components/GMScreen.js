import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RQKLogoInline } from '@/components/ui/RQKLogo';
import { 
  Sword, Users, BookOpen, Send, Sparkles, 
  Loader, LogOut, Play, Dices, Coins, Swords, ArrowRight, Package, FileText, Shield, UserPlus, Shuffle, Skull, Wand2, PlusCircle, Zap, Map
} from 'lucide-react';
import DiceRoller from '@/components/DiceRoller';
import LootGenerator from '@/components/LootGenerator';
import PartyInventory from '@/components/PartyInventory';
import { QuickReferenceModal } from '@/components/QuickReference';
import MonsterLookup from '@/components/MonsterLookup';
import RandomTables from '@/components/RandomTables';
import QuickTips, { TIPS } from '@/components/QuickTips';
import CustomCreatureManager from '@/components/CustomCreatureManager';
import QuickCombatModal from '@/components/QuickCombatModal';
import { MapBuilder } from '@/components/MapBuilder';

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
  const [showMapBuilder, setShowMapBuilder] = useState(false);
  const [maps, setMaps] = useState([]);
  
  // Name Generator state
  const [generatedName, setGeneratedName] = useState(null);
  const [nameRace, setNameRace] = useState('human');
  const [nameGender, setNameGender] = useState('any');
  const [savingNPC, setSavingNPC] = useState(false);
  const [savedNames, setSavedNames] = useState([]);
  
  // Tab state - single tab for everything
  const [activeTab, setActiveTab] = useState('combat');

  useEffect(() => {
    fetchAllData();
  }, [campaignId]);

  const fetchAllData = async () => {
    try {
      const [campaignRes, playersRes, npcsRes, scenariosRes, calendarRes, notesRes, creaturesRes, mapsRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}`),
        axios.get(`${API}/campaigns/${campaignId}/players`),
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/combat-scenarios`),
        axios.get(`${API}/campaigns/${campaignId}/calendar`),
        axios.get(`${API}/campaigns/${campaignId}/ingame-notes`),
        axios.get(`${API}/campaigns/${campaignId}/custom-creatures`),
        axios.get(`${API}/campaigns/${campaignId}/maps`).catch(() => ({ data: [] }))
      ]);
      
      setCampaign(campaignRes.data);
      setPlayers(playersRes.data);
      setNPCs(npcsRes.data);
      setScenarios(scenariosRes.data);
      setCalendar(calendarRes.data);
      setSessionNotes(notesRes.data.slice(0, 30));
      setCustomCreatures(creaturesRes.data || []);
      setMaps(mapsRes.data || []);
    } catch (error) {
      toast.error('Failed to load GM Screen data');
    } finally {
      setLoading(false);
    }
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
    if (!window.confirm('End session and return to campaigns?')) return;
    toast.success('Session ended!');
    navigate('/campaigns');
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
    { id: 'combat', icon: Swords, label: 'Combat', color: '#ef4444' },
    { id: 'maps', icon: Map, label: 'Maps', color: '#06b6d4' },
    { id: 'dice', icon: Dices, label: 'Dice', color: '#a855f7' },
    { id: 'monsters', icon: Skull, label: 'Monsters', color: '#dc2626' },
    { id: 'creatures', icon: PlusCircle, label: 'Creatures', color: '#10b981' },
    { id: 'names', icon: UserPlus, label: 'Names', color: '#f97316' },
    { id: 'tables', icon: Wand2, label: 'Tables', color: '#22c55e' },
    { id: 'loot', icon: Coins, label: 'Loot Gen', color: '#eab308' },
    { id: 'inventory', icon: Package, label: 'Inventory', color: '#67e8f9' },
    { id: 'party', icon: Users, label: 'Party', color: '#4a7dff' },
    { id: 'notes', icon: FileText, label: 'Notes', color: '#94a3b8' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)' }}>
      {/* Header */}
      <div className="glow-panel" style={{ margin: '0', borderRadius: '0', padding: '12px 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo */}
            <RQKLogoInline size="small" />
            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <h1 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sword size={20} style={{ color: '#22D3EE' }} />
                {campaign?.name}
              </h1>
              {calendar && (
                <p style={{ fontSize: '11px', color: '#22D3EE', marginTop: '2px' }}>
                  {calendar.custom_months?.[calendar.current_month - 1]?.name || 'Month'} {calendar.current_day}, Year {calendar.current_year}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setShowQuickRef(true)} className="btn-outline" style={{ display: 'flex', gap: '6px', padding: '8px 14px', fontSize: '13px' }}>
              <BookOpen size={14} /> Reference
            </Button>
            <Button onClick={handleEndSession} className="btn-secondary" style={{ display: 'flex', gap: '6px', padding: '8px 14px', fontSize: '13px' }}>
              <LogOut size={14} /> End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Quick Tips */}
        <QuickTips 
          tips={TIPS.gmScreen} 
          pageId="gmScreen" 
          title="GM Screen Tips"
        />

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap', background: 'rgba(10, 10, 40, 0.5)', padding: '8px', borderRadius: '16px', border: '2px solid #1e40af' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              style={{
                flex: '1 1 auto',
                minWidth: '100px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                background: activeTab === tab.id ? `${tab.color}20` : 'transparent',
                color: activeTab === tab.id ? tab.color : '#94a3b8',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="glow-panel" style={{ minHeight: '500px' }}>
          {/* COMBAT TAB */}
          {activeTab === 'combat' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Swords size={24} style={{ color: '#ef4444' }} /> Combat Control
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Encounter Selector */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#67e8f9', fontWeight: '700', marginBottom: '12px' }}>Select Encounter</h3>
                  {scenarios.length === 0 ? (
                    <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px dashed #1e40af', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
                      <Swords size={32} style={{ color: '#1e40af', margin: '0 auto 12px' }} />
                      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>No encounters created</p>
                      <p style={{ color: '#64748b', fontSize: '11px' }}>Create encounters in the Combat Creator tab of your campaign dashboard</p>
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
                            background: selectedScenario?.id === s.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(10, 10, 40, 0.6)',
                            border: `2px solid ${selectedScenario?.id === s.id ? '#ef4444' : '#1e40af'}`,
                            borderRadius: '12px',
                            color: '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: '700', marginBottom: '4px', fontFamily: 'Montserrat', fontSize: '14px' }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: '#67e8f9', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>{s.combatants?.length || 0} combatants</span>
                            {s.map_url && <span style={{ color: '#22c55e' }}>Has Map</span>}
                            {s.combatants?.some(c => c.loot?.length > 0) && <span style={{ color: '#eab308' }}>Has Loot</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Combat Actions */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#67e8f9', fontWeight: '700', marginBottom: '12px' }}>Launch Combat</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button 
                      onClick={launchCombat} 
                      className="btn-secondary" 
                      data-testid="start-combat-btn"
                      disabled={!selectedScenario}
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '10px',
                        padding: '16px',
                        fontSize: '15px',
                        background: selectedScenario ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)' : undefined,
                        boxShadow: selectedScenario ? '0 0 25px rgba(239, 68, 68, 0.4)' : undefined,
                        opacity: selectedScenario ? 1 : 0.5
                      }}
                    >
                      <Play size={18} /> Start Combat <ArrowRight size={16} />
                    </Button>
                    
                    <Button 
                      onClick={quickStartCombat} 
                      className="btn-outline"
                      data-testid="quick-combat-btn"
                      disabled={players.length === 0}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
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
                        background: 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
                        border: 'none',
                        boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)'
                      }}
                    >
                      <Zap size={16} /> Spontaneous Combat
                    </Button>
                    
                    <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', fontStyle: 'italic', marginTop: '8px' }}>
                      Combat opens in a dedicated full-screen view with initiative tracker and battle map
                    </p>
                  </div>
                  
                  {/* Selected Encounter Preview */}
                  {selectedScenario && (
                    <div style={{ marginTop: '20px', background: 'rgba(10, 10, 40, 0.5)', border: '2px solid #1e40af', borderRadius: '12px', padding: '14px' }}>
                      <h4 style={{ fontSize: '13px', color: '#ffffff', fontWeight: '700', marginBottom: '10px' }}>{selectedScenario.name}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedScenario.combatants?.slice(0, 6).map(c => (
                          <div key={c.id} style={{ 
                            background: c.type === 'player' ? 'rgba(74, 125, 255, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                            border: `1px solid ${c.type === 'player' ? '#4a7dff' : '#ef4444'}`,
                            borderRadius: '8px', 
                            padding: '6px 10px',
                            fontSize: '11px',
                            color: '#fff'
                          }}>
                            {c.name}
                            {c.loot?.length > 0 && <Coins size={10} style={{ marginLeft: '4px', color: '#eab308' }} />}
                          </div>
                        ))}
                        {selectedScenario.combatants?.length > 6 && (
                          <div style={{ padding: '6px 10px', fontSize: '11px', color: '#64748b' }}>
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

          {/* MAPS TAB */}
          {activeTab === 'maps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Map size={24} style={{ color: '#06b6d4' }} /> Battle Maps
                </h2>
                <Button
                  onClick={() => setShowMapBuilder(true)}
                  data-testid="create-map-btn"
                  style={{
                    background: 'linear-gradient(180deg, #06b6d4 0%, #0891b2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <PlusCircle size={16} />
                  Create Map
                </Button>
              </div>
              
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                Build battle maps with terrain, walls, and fog of war. Place tokens and use in combat encounters.
              </p>
              
              {/* Saved Maps Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {maps.length > 0 ? maps.map(map => (
                  <div
                    key={map.id}
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '2px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      setShowMapBuilder(true);
                      // Would load this map
                    }}
                  >
                    <div style={{ 
                      height: '120px', 
                      background: 'rgba(0,0,0,0.3)', 
                      borderRadius: '8px', 
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Map size={32} style={{ color: '#06b6d4', opacity: 0.5 }} />
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>
                      {map.name}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                      {map.width}x{map.height} grid
                    </p>
                  </div>
                )) : (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'rgba(6, 182, 212, 0.05)',
                    borderRadius: '12px',
                    border: '2px dashed rgba(6, 182, 212, 0.3)'
                  }}>
                    <Map size={48} style={{ color: '#06b6d4', opacity: 0.3, margin: '0 auto 16px' }} />
                    <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      No Battle Maps Yet
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                      Create your first battle map with terrain, walls, and fog of war
                    </p>
                    <Button
                      onClick={() => setShowMapBuilder(true)}
                      style={{
                        background: 'linear-gradient(180deg, #06b6d4 0%, #0891b2 100%)'
                      }}
                    >
                      <PlusCircle size={16} style={{ marginRight: '6px' }} />
                      Create Your First Map
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DICE TAB */}
          {activeTab === 'dice' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Dices size={24} style={{ color: '#a855f7' }} /> Dice Roller
              </h2>
              <DiceRoller />
            </div>
          )}

          {/* MONSTER LOOKUP TAB */}
          {activeTab === 'monsters' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Skull size={24} style={{ color: '#dc2626' }} /> Monster Lookup
              </h2>
              <MonsterLookup />
            </div>
          )}

          {/* CUSTOM CREATURES TAB */}
          {activeTab === 'creatures' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlusCircle size={24} style={{ color: '#10b981' }} /> Custom Creatures
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                Create your own homebrew monsters or import creatures from CSV files. Custom creatures can be used in any encounter.
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
          )}

          {/* NAMES GENERATOR TAB */}
          {activeTab === 'names' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={24} style={{ color: '#f97316' }} /> NPC Name Generator
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Generator Controls */}
                <div>
                  <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #f97316', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: '#f97316', fontWeight: '700', marginBottom: '20px' }}>Generate a Name</h3>
                    
                    {/* Race Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Race</label>
                      <select
                        value={nameRace}
                        onChange={(e) => setNameRace(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '2px solid #374151',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '14px',
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
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gender</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['any', 'male', 'female'].map(g => (
                          <button
                            key={g}
                            onClick={() => setNameGender(g)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              background: nameGender === g ? 'rgba(249, 115, 22, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                              border: `2px solid ${nameGender === g ? '#f97316' : '#374151'}`,
                              borderRadius: '8px',
                              color: nameGender === g ? '#f97316' : '#94a3b8',
                              fontSize: '13px',
                              fontWeight: '600',
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
                        background: 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
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
                      marginTop: '20px',
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)',
                      border: '3px solid #f97316',
                      borderRadius: '16px',
                      padding: '24px',
                      textAlign: 'center',
                      animation: 'glow 2s ease-in-out'
                    }}>
                      <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Generated Name</p>
                      <h3 style={{ 
                        fontSize: '28px', 
                        color: '#fff', 
                        fontFamily: 'Montserrat', 
                        fontWeight: '800',
                        marginBottom: '8px',
                        textShadow: '0 0 20px rgba(249, 115, 22, 0.5)'
                      }}>
                        {generatedName.fullName}
                      </h3>
                      <p style={{ color: '#67e8f9', fontSize: '14px', marginBottom: '20px' }}>
                        {generatedName.gender} {generatedName.race.charAt(0).toUpperCase() + generatedName.race.slice(1)}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                          onClick={generateRandomName}
                          className="btn-secondary"
                          style={{ flex: 1 }}
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
                            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
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
                </div>
                
                {/* Saved Names This Session */}
                <div>
                  <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px solid #1e40af', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: '#22c55e', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserPlus size={18} />
                      Saved This Session ({savedNames.length})
                    </h3>
                    
                    {savedNames.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        <UserPlus size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p style={{ fontSize: '14px' }}>Names you save will appear here</p>
                        <p style={{ fontSize: '12px', marginTop: '4px' }}>They'll also be added to your campaign's NPC list</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                        {savedNames.map((name, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '12px 16px',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '2px solid #22c55e',
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>{name.fullName}</span>
                              <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '10px' }}>
                                {name.race.charAt(0).toUpperCase() + name.race.slice(1)}
                              </span>
                            </div>
                            <span style={{ 
                              background: '#22c55e', 
                              color: '#000', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontSize: '10px', 
                              fontWeight: '700' 
                            }}>
                              SAVED
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Tips */}
                  <div style={{ 
                    marginTop: '16px',
                    background: 'rgba(74, 125, 255, 0.1)',
                    border: '1px solid #4a7dff',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <p style={{ color: '#4a7dff', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>💡 Quick Tip</p>
                    <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>
                      Saved NPCs appear in your campaign's NPC tab where you can add more details like occupation, personality, and backstory!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RANDOM TABLES TAB */}
          {activeTab === 'tables' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wand2 size={24} style={{ color: '#22c55e' }} /> Random Tables
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
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Coins size={24} style={{ color: '#eab308' }} /> Loot Generator
              </h2>
              <LootGenerator />
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={24} style={{ color: '#67e8f9' }} /> Party Inventory
              </h2>
              <PartyInventory campaignId={campaignId} players={players} />
            </div>
          )}

          {/* PARTY TAB */}
          {activeTab === 'party' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={24} style={{ color: '#4a7dff' }} /> Party Overview
              </h2>
              
              {players.length === 0 ? (
                <div style={{ background: 'rgba(10, 10, 40, 0.6)', border: '2px dashed #1e40af', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <Users size={40} style={{ color: '#1e40af', margin: '0 auto 16px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>No players in campaign</p>
                  <p style={{ color: '#64748b', fontSize: '12px' }}>Add players in the Players tab of your campaign dashboard</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {players.map(player => (
                    <div
                      key={player.id}
                      className="card-glow"
                      style={{ padding: '16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ 
                          width: '48px', height: '48px', borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #4a7dff 0%, #22c55e 100%)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: '800', color: '#fff', fontSize: '18px', fontFamily: 'Montserrat'
                        }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '16px', fontFamily: 'Montserrat' }}>{player.name}</div>
                          <div style={{ color: '#67e8f9', fontSize: '12px' }}>
                            {player.race || 'Unknown'} {player.class || 'Adventurer'} {player.level ? `Lv.${player.level}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>HP</div>
                          <div style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>{player.hp || player.max_hp || '?'}/{player.max_hp || '?'}</div>
                        </div>
                        <div style={{ background: 'rgba(74, 125, 255, 0.15)', border: '1px solid #4a7dff', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#4a7dff', fontWeight: '600' }}>AC</div>
                          <div style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>{player.ac || '?'}</div>
                        </div>
                        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '600' }}>INIT</div>
                          <div style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>
                            {player.stats?.dexterity ? (() => {
                              const mod = Math.floor((player.stats.dexterity - 10) / 2);
                              return mod >= 0 ? `+${mod}` : `${mod}`;
                            })() : '?'}
                          </div>
                        </div>
                      </div>
                      
                      {player.stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginTop: '12px' }}>
                          {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((stat, i) => {
                            const statKey = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'][i];
                            const val = player.stats[statKey] || 10;
                            const mod = Math.floor((val - 10) / 2);
                            return (
                              <div key={stat} style={{ textAlign: 'center', background: 'rgba(10, 10, 40, 0.5)', borderRadius: '6px', padding: '4px' }}>
                                <div style={{ fontSize: '9px', color: '#64748b' }}>{stat}</div>
                                <div style={{ fontSize: '12px', color: '#fff', fontWeight: '700' }}>{val}</div>
                                <div style={{ fontSize: '9px', color: mod >= 0 ? '#22c55e' : '#ef4444' }}>{mod >= 0 ? '+' : ''}{mod}</div>
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
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'Montserrat', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={24} style={{ color: '#67e8f9' }} /> Session Notes
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Add Note */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#67e8f9', fontWeight: '700', marginBottom: '12px' }}>Quick Note</h3>
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    className="textarea-glow"
                    style={{ minHeight: '150px', marginBottom: '12px', fontSize: '13px', width: '100%' }}
                    placeholder="Write a quick note about the session... NPCs met, events, plot points, etc."
                  />
                  <Button 
                    onClick={handleSubmitNote} 
                    disabled={processingNote || !quickNote.trim()} 
                    className="btn-primary" 
                    style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center' }}
                  >
                    {processingNote ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Save Note
                  </Button>
                </div>

                {/* Notes List */}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#67e8f9', fontWeight: '700', marginBottom: '12px' }}>Recent Notes ({sessionNotes.length})</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionNotes.length === 0 ? (
                      <div style={{ background: 'rgba(10, 10, 40, 0.5)', border: '2px dashed #1e40af', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
                        <FileText size={32} style={{ color: '#1e40af', margin: '0 auto 12px' }} />
                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>No notes yet</p>
                      </div>
                    ) : (
                      sessionNotes.map(note => (
                        <div key={note.id} style={{ background: 'rgba(10, 10, 40, 0.5)', border: '1px solid #1e40af', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                          <div style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5' }}>{note.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
      
      {/* Map Builder */}
      {showMapBuilder && (
        <MapBuilder
          campaignId={campaignId}
          onClose={() => setShowMapBuilder(false)}
          onMapSaved={(savedMap) => {
            setMaps(prev => {
              const existing = prev.findIndex(m => m.id === savedMap.id);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = savedMap;
                return updated;
              }
              return [...prev, savedMap];
            });
          }}
        />
      )}
    </div>
  );
}

export default GMScreen;
