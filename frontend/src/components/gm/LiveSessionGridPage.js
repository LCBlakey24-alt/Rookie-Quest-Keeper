import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Dices, LogOut, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import LootGenerator from '@/components/LootGenerator';
import RandomTables from '@/components/RandomTables';
import PartyLocationTracker from '@/components/PartyLocationTracker';
import CombatTab from '@/components/gm/CombatTab';
import NpcsTab from '@/components/gm/NpcsTab';
import PartyTab from '@/components/gm/PartyTab';
import NotesTab from '@/components/gm/NotesTab';
import MonstersTab from '@/components/gm/MonstersTab';
import Soundboard from '@/components/gm/Soundboard';
import StoryArcTracker from '@/components/gm/StoryArcTracker';
import NPCRelationshipMap from '@/components/gm/NPCRelationshipMap';
import AISessionPlanner from '@/components/gm/AISessionPlanner';
import EventSystem from '@/components/gm/EventSystem';
import UnifiedReferenceCenter from '@/components/gm/UnifiedReferenceCenter';
import EnvironmentControl from '@/components/gm/EnvironmentControl';
import LiveSessionGridMode from '@/components/gm/LiveSessionGridMode';

const theme = {
  bg: {
    primary: '#1F1F23',
    surface: '#27272B',
    elevated: '#323235',
    panel: '#27272B',
    card: '#27272B',
    hover: 'rgba(239, 68, 68, 0.12)',
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
    gmSubtle: 'rgba(239, 68, 68, 0.12)',
  },
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(239, 68, 68, 0.42)',
  gradient: '#EF4444',
};

export default function LiveSessionGridPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [quickNote, setQuickNote] = useState('');
  const [processingNote, setProcessingNote] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatedName, setGeneratedName] = useState(null);
  const [nameRace, setNameRace] = useState('human');
  const [nameGender, setNameGender] = useState('any');
  const [savingNPC, setSavingNPC] = useState(false);
  const [savedNames, setSavedNames] = useState([]);
  const [showDiceFlicker, setShowDiceFlicker] = useState(false);
  const [diceRolls, setDiceRolls] = useState([]);
  const [diceLabel, setDiceLabel] = useState('');
  const [diceModifier, setDiceModifier] = useState(0);
  const [diceTotal, setDiceTotal] = useState(0);
  const [diceCrit, setDiceCrit] = useState(false);
  const [diceFumble, setDiceFumble] = useState(false);

  useEffect(() => { fetchAllData(); }, [campaignId]);

  const fetchAllData = async () => {
    try {
      const [campaignRes, playersRes, scenariosRes, calendarRes, notesRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}`),
        apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/calendar`).catch(() => ({ data: null })),
        apiClient.get(`/campaigns/${campaignId}/ingame-notes`).catch(() => ({ data: [] })),
      ]);
      setCampaign(campaignRes.data);
      setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
      setScenarios(Array.isArray(scenariosRes.data) ? scenariosRes.data : []);
      setCalendar(calendarRes.data || null);
      setSessionNotes(Array.isArray(notesRes.data) ? notesRes.data.slice(0, 30) : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load Live Grid data');
    } finally {
      setLoading(false);
    }
  };

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

    const inlineMod = notation.replace(/(\d+)?d(\d+)/gi, '').match(/([+-]\d+)/g);
    let modifier = 0;
    if (inlineMod) inlineMod.forEach(m => { modifier += parseInt(m); });
    total += modifier;

    const keptRoll = isAdvRoll ? rolls.find(r => !r.dropped) : rolls[0];
    setDiceRolls(isAdvRoll ? rolls.filter(r => !r.dropped) : rolls);
    setDiceLabel(label || notation);
    setDiceModifier(modifier);
    setDiceTotal(total);
    setDiceCrit(!!(keptRoll && keptRoll.sides === 20 && keptRoll.result === 20));
    setDiceFumble(!!(keptRoll && keptRoll.sides === 20 && keptRoll.result === 1));
    setShowDiceFlicker(true);
  };

  const handleSubmitNote = async () => {
    if (!quickNote.trim()) return;
    setProcessingNote(true);
    try {
      const noteRes = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content: quickNote });
      setSessionNotes(prev => [{ id: noteRes.data.id, content: quickNote, created_at: new Date().toISOString() }, ...prev]);
      setQuickNote('');
      toast.success('Note saved!');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save note');
    } finally {
      setProcessingNote(false);
    }
  };

  const launchCombat = (scenario) => {
    navigate(`/campaign/${campaignId}/combat`, { state: { scenario, campaignName: campaign?.name } });
  };

  const quickStartCombat = () => {
    const quickScenario = {
      id: 'quick-combat',
      name: 'Quick Combat',
      participants: players.map(p => ({
        id: p.id,
        name: p.name,
        type: 'player',
        hp: p.hp || p.max_hp || 10,
        maxHp: p.max_hp || p.hp || 10,
        ac: p.ac || 10,
        initiativeMod: Math.floor(((p.stats?.dexterity || 10) - 10) / 2),
        conditions: [],
        tokenColor: '#4a7dff',
        tokenSize: 40,
      })),
      show_grid: true,
      grid_size: 40,
    };
    launchCombat(quickScenario);
  };

  const generateRandomName = () => {
    const first = ['Aldric', 'Brynn', 'Cedric', 'Elowen', 'Kael', 'Mira'][Math.floor(Math.random() * 6)];
    const last = ['Blackwood', 'Stormwind', 'Ironfoot', 'Dawntracker', 'Ravencroft', 'Oakenshade'][Math.floor(Math.random() * 6)];
    setGeneratedName({ firstName: first, surname: last, fullName: `${first} ${last}`, race: nameRace, gender: nameGender });
  };

  const saveNameAsNPC = async () => {
    if (!generatedName) return;
    setSavingNPC(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/npcs`, {
        name: generatedName.fullName,
        race: generatedName.race,
        occupation: '',
        description: `A ${generatedName.race} named ${generatedName.fullName}.`,
        personality: '',
        notes: `Created from Live Grid on ${new Date().toLocaleDateString()}`,
      });
      toast.success(`${generatedName.fullName} saved as NPC!`);
      setSavedNames(prev => [...prev, { ...generatedName, id: response.data.id }]);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save NPC');
    } finally {
      setSavingNPC(false);
    }
  };

  const renderTool = (toolId) => {
    switch (toolId) {
      case 'combat':
        return <CombatTab theme={theme} campaignId={campaignId} scenarios={scenarios} selectedScenario={selectedScenario} setSelectedScenario={setSelectedScenario} launchCombat={launchCombat} quickStartCombat={quickStartCombat} players={players} setShowQuickCombat={() => {}} />;
      case 'party':
        return <PartyTab theme={theme} players={players} />;
      case 'notes':
        return <NotesTab theme={theme} campaignId={campaignId} quickNote={quickNote} setQuickNote={setQuickNote} processingNote={processingNote} handleSubmitNote={handleSubmitNote} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} />;
      case 'npcs':
        return <NpcsTab theme={theme} campaignId={campaignId} nameRace={nameRace} setNameRace={setNameRace} nameGender={nameGender} setNameGender={setNameGender} generatedName={generatedName} generateRandomName={generateRandomName} saveNameAsNPC={saveNameAsNPC} savingNPC={savingNPC} savedNames={savedNames} />;
      case 'monsters':
        return <MonstersTab theme={theme} campaignId={campaignId} />;
      case 'location':
        return <PartyLocationTracker campaignId={campaignId} />;
      case 'environment':
        return <EnvironmentControl campaignId={campaignId} campaign={campaign} onEnvironmentChange={(environment) => setCampaign(prev => prev ? { ...prev, campaign_environment: environment } : prev)} />;
      case 'reference-hub':
        return <UnifiedReferenceCenter onRollDamage={rollQuickDice} isCompact={false} />;
      case 'tables':
        return <RandomTables onSaveAsNote={(text) => setSessionNotes(prev => [{ id: Date.now().toString(), content: text, created_at: new Date().toISOString() }, ...prev])} />;
      case 'loot':
        return <LootGenerator />;
      case 'story':
        return <StoryArcTracker theme={theme} campaignId={campaignId} />;
      case 'planner':
        return <AISessionPlanner theme={theme} campaignId={campaignId} />;
      case 'sound':
        return <Soundboard theme={theme} campaignId={campaignId} />;
      case 'events':
        return <EventSystem theme={theme} campaignId={campaignId} />;
      case 'network':
        return <NPCRelationshipMap theme={theme} campaignId={campaignId} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner" /></div>;
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Button onClick={() => navigate(`/gm-screen/${campaignId}`)} className="btn-outline" style={smallButtonStyle}><ArrowLeft size={16} /> GM Screen</Button>
          <div style={{ minWidth: 0 }}>
            <h1 style={titleStyle}><Sword size={22} color={theme.accent.primary} /> {campaign?.name || 'Live Session'}</h1>
            <p style={subtitleStyle}>Configurable live play grid. Pick 1–6 panels and keep your GM tools open.</p>
            {calendar && <p style={calendarStyle}>{calendar.custom_months?.[calendar.current_month - 1]?.name || 'Month'} {calendar.current_day}, Year {calendar.current_year}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => rollQuickDice('1d20', 'D20')} className="btn-outline" style={smallButtonStyle}><Dices size={16} /> D20</Button>
          <Button onClick={() => navigate(`/campaign/${campaignId}`)} className="btn-primary" style={smallButtonStyle}><LogOut size={16} /> Campaign</Button>
        </div>
      </header>

      <section style={gridShellStyle}>
        <LiveSessionGridMode
          campaignId={campaignId}
          theme={theme}
          renderTool={renderTool}
          onOpenSingleTab={(toolId) => navigate(`/gm-screen/${campaignId}`, { state: { openTab: toolId } })}
          onRollDice={rollQuickDice}
        />
      </section>

      <DiceRollFlicker
        show={showDiceFlicker}
        rolls={diceRolls}
        label={diceLabel}
        modifier={diceModifier}
        total={diceTotal}
        isCrit={diceCrit}
        isFumble={diceFumble}
        onComplete={() => setShowDiceFlicker(false)}
      />
    </main>
  );
}

const pageStyle = { minHeight: '100vh', background: theme.bg.primary, color: theme.text.primary, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: theme.bg.panel, border: `1px solid ${theme.border}`, padding: 12 };
const titleStyle = { color: theme.text.primary, display: 'flex', alignItems: 'center', gap: 9, fontSize: 22, fontWeight: 900, margin: 0 };
const subtitleStyle = { color: theme.text.secondary, margin: '4px 0 0', fontSize: 13 };
const calendarStyle = { color: theme.accent.primary, margin: '4px 0 0', fontSize: 12, fontWeight: 800 };
const smallButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 0, fontWeight: 900 };
const gridShellStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' };
