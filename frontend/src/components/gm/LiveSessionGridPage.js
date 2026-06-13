import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Dices, LogOut, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import { getAnimationTarget, rollDiceNotation } from '@/data/diceRoller';
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
import { GMHandoutsTab } from '@/components/tabs/HandoutsTab';

const theme = {
  bg: {
    primary: '#1F1F23',
    surface: '#27272B',
    elevated: '#323235',
    panel: '#27272B',
    card: '#27272B',
    hover: 'rgba(124, 58, 237, 0.12)',
  },
  accent: {
    primary: '#7C3AED',
    secondary: '#B91C1C',
    gold: '#7C3AED',
    orange: '#A78BFA',
    hover: '#A78BFA',
    subtle: 'rgba(124, 58, 237, 0.12)',
    glow: 'none',
    gm: '#7C3AED',
    gmSubtle: 'rgba(124, 58, 237, 0.12)',
  },
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(124, 58, 237, 0.42)',
  gradient: '#7C3AED',
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
  const [diceAnimationValue, setDiceAnimationValue] = useState(0);
  const [explodingDiceEnabled, setExplodingDiceEnabled] = useState(() => {
    try { return localStorage.getItem(`gm.explodingDice.${campaignId}`) === 'true'; } catch { return false; }
  });
  const [diceCrit, setDiceCrit] = useState(false);
  const [diceFumble, setDiceFumble] = useState(false);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  useEffect(() => { fetchAllData(); }, [campaignId]);

  useEffect(() => {
    try { localStorage.setItem(`gm.explodingDice.${campaignId}`, String(explodingDiceEnabled)); } catch { /* ignore */ }
  }, [campaignId, explodingDiceEnabled]);

  useEffect(() => {
    if (!campaign) return;
    try {
      const key = `gm.explodingDice.${campaignId}`;
      if (localStorage.getItem(key) === null) {
        setExplodingDiceEnabled(Boolean(campaign.allow_exploding_dice));
      }
    } catch {
      setExplodingDiceEnabled(Boolean(campaign.allow_exploding_dice));
    }
  }, [campaign, campaignId]);

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
      toast.error(error?.response?.data?.detail || 'Failed to load Live Play Mode');
    } finally {
      setLoading(false);
    }
  };

  const rollQuickDice = (notation, label = '', rollType = 'normal') => {
    const result = rollDiceNotation(notation, {
      rollType,
      exploding: explodingDiceEnabled,
    });
    if (!result.rolls.length) return;

    setDiceRolls(result.visibleRolls);
    setDiceLabel(label || notation);
    setDiceModifier(result.modifier);
    setDiceTotal(result.total);
    setDiceAnimationValue(getAnimationTarget(result));
    setDiceCrit(result.isCrit);
    setDiceFumble(result.isFumble);
    setShowDiceFlicker(true);

    if (result.explosionCount > 0) {
      toast.success(`Exploding dice! +${result.explosionCount} extra roll${result.explosionCount === 1 ? '' : 's'}`, {
        description: `${label || notation} kept rolling because a die hit its maximum.`,
      });
    }
  };

  const syncNoteIntoCampaignState = async (noteId) => {
    const syncRes = await apiClient.post(`/campaigns/${campaignId}/ingame-notes/${noteId}/sync`);
    const applied = syncRes.data?.applied_updates || [];
    setSessionRefreshKey(prev => prev + 1);
    await fetchAllData();

    if (applied.length > 0) {
      toast.success(`Note saved and ${applied.length} campaign update${applied.length === 1 ? '' : 's'} applied`, {
        description: applied.slice(0, 2).map(update => update.summary).join(' '),
      });
    } else {
      toast.success('Note saved', { description: 'No clear character, NPC, or location changes were detected automatically.' });
    }
  };

  const handleSubmitNote = async () => {
    if (!quickNote.trim()) return;
    setProcessingNote(true);
    try {
      const noteContent = quickNote.trim();
      const noteRes = await apiClient.post(`/campaigns/${campaignId}/ingame-notes`, { content: noteContent });
      setSessionNotes(prev => [{ ...noteRes.data, content: noteContent }, ...prev]);
      setQuickNote('');
      await syncNoteIntoCampaignState(noteRes.data.id);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save and sync note');
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
        notes: `Created from Live Play Mode on ${new Date().toLocaleDateString()}`,
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
      case 'handouts':
        return <GMHandoutsTab campaignId={campaignId} />;
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
          <Button onClick={() => navigate(`/campaign/${campaignId}`)} className="btn-outline" style={smallButtonStyle}><ArrowLeft size={16} /> Campaign Prep</Button>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Live Play Mode</p>
            <h1 style={titleStyle}><Sword size={22} color={theme.accent.primary} /> {campaign?.name || 'Live Session'}</h1>
            <p style={subtitleStyle}>Run the session from a focused GM Screen. Pick 1–4 panels and keep only your table-critical tools open.</p>
            {calendar && <p style={calendarStyle}>{calendar.custom_months?.[calendar.current_month - 1]?.name || 'Month'} {calendar.current_day}, Year {calendar.current_year}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={explodingToggleStyle} title="When enabled, non-d20 dice that roll their maximum roll again and add the extra result.">
            <input type="checkbox" checked={explodingDiceEnabled} onChange={(event) => setExplodingDiceEnabled(event.target.checked)} />
            Exploding dice
          </label>
          <Button onClick={() => rollQuickDice('1d20', 'D20')} className="btn-outline" style={smallButtonStyle}><Dices size={16} /> D20</Button>
          <Button onClick={() => navigate(`/campaign/${campaignId}`)} className="btn-primary" style={smallButtonStyle}><LogOut size={16} /> Exit to Prep</Button>
        </div>
      </header>

      <section style={gridShellStyle}>
        <LiveSessionGridMode
          campaignId={campaignId}
          theme={theme}
          renderTool={renderTool}
          onOpenSingleTab={() => null}
          onRollDice={rollQuickDice}
          refreshKey={sessionRefreshKey}
        />
      </section>

      <DiceRollFlicker
        show={showDiceFlicker}
        rolls={diceRolls}
        label={diceLabel}
        modifier={diceModifier}
        total={diceTotal}
        animationValue={diceAnimationValue}
        isCrit={diceCrit}
        isFumble={diceFumble}
        onComplete={() => setShowDiceFlicker(false)}
      />
    </main>
  );
}

const pageStyle = { height: '100dvh', maxHeight: '100dvh', background: theme.bg.primary, color: theme.text.primary, padding: 'clamp(8px, 1.1vw, 12px)', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: theme.bg.panel, border: `1px solid ${theme.border}`, padding: '8px 10px', flexShrink: 0 };
const eyebrowStyle = { color: theme.accent.primary, fontSize: 11, fontWeight: 900, letterSpacing: 1.3, textTransform: 'uppercase', margin: '0 0 4px' };
const titleStyle = { color: theme.text.primary, display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(17px, 1.5vw, 20px)', fontWeight: 900, margin: 0, minWidth: 0 };
const subtitleStyle = { color: theme.text.secondary, margin: '2px 0 0', fontSize: 11, lineHeight: 1.35 };
const calendarStyle = { color: theme.accent.primary, margin: '2px 0 0', fontSize: 11, fontWeight: 800 };
const smallButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 0, fontWeight: 900, minHeight: 34, padding: '6px 10px', fontSize: 12 };
const explodingToggleStyle = { minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 6, background: theme.accent.subtle, border: `1px solid ${theme.border}`, color: theme.text.secondary, padding: '6px 10px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer' };
const gridShellStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
