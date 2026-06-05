import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, ChevronDown, ChevronRight, FileText, Heart, Shield, Star, Swords, User, Wand2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'actions', label: 'Actions', icon: Swords },
  { id: 'spells', label: 'Spells', icon: Wand2 },
  { id: 'inventory', label: 'Inventory', icon: Backpack },
  { id: 'features', label: 'Features', icon: Star },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'status', label: 'Status', icon: Heart },
];

const CONDITIONS = ['blinded', 'charmed', 'frightened', 'grappled', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];
const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => value >= 0 ? `+${value}` : `${value}`;
const list = value => Array.isArray(value) ? value : [];
const itemName = (item, fallback) => typeof item === 'string' ? item : item?.name || item?.label || fallback;
const itemText = (item) => typeof item === 'string' ? 'Details not saved yet.' : item?.description || item?.notes || item?.damage || item?.type || item?.source || 'Details not saved yet.';

export default function PlayerMobileRailSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('rq.playerRailTab') || 'overview');
  const [expanded, setExpanded] = useState({});
  const [hpAmount, setHpAmount] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCharacter() {
      try {
        const response = await apiClient.get(`/characters/${characterId}`);
        if (!cancelled) setCharacter(response.data);
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Failed to load character');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCharacter();
    return () => { cancelled = true; };
  }, [characterId]);

  useEffect(() => { localStorage.setItem('rq.playerRailTab', activeTab); }, [activeTab]);

  const saveCharacterPatch = async (updates, successMessage = '') => {
    const previous = character;
    const optimistic = { ...character, ...updates };
    setCharacter(optimistic);
    setSaving(true);
    try {
      const response = await apiClient.patch(`/characters/${characterId}`, updates);
      setCharacter(response.data || optimistic);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      setCharacter(previous);
      toast.error(error?.response?.data?.detail || 'Could not save character update');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) return <main style={page}><section style={message}>Loading character...</section></main>;
  if (!character) return <main style={page}><section style={message}>Character could not be loaded.<button style={button} onClick={() => navigate('/player')}>Back to Player Dashboard</button></section></main>;

  const maxHp = Number(character.max_hit_points || character.max_hp || 10);
  const currentHp = Math.max(0, Math.min(maxHp, Number(character.current_hit_points || character.hp || maxHp)));
  const ac = Number(character.armor_class || character.ac || 10 + mod(character.dexterity));
  const speed = Number(character.speed || 30);
  const subtitle = [character.race, character.character_class, `Lv ${character.level || 1}`].filter(Boolean).join(' • ');
  const context = { character, expanded, toggleExpanded, saveCharacterPatch, currentHp, maxHp, hpAmount, setHpAmount, saving };

  return (
    <main style={page} data-testid="player-mobile-rail-sheet">
      <aside style={rail}>
        <button aria-label="Back" onClick={() => navigate('/player')} style={railBack}><ArrowLeft size={20} /></button>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return <button key={tab.id} aria-label={tab.label} title={tab.label} onClick={() => setActiveTab(tab.id)} style={railBtn(active)}><Icon size={21} /></button>;
        })}
      </aside>

      <section style={content}>
        <header style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={portrait}>{character.portrait_url ? <img src={character.portrait_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} />}</div>
            <div style={{ minWidth: 0 }}>
              <p style={kicker}>Player Sheet</p>
              <h1 style={title}>{character.name || 'Unnamed Character'}</h1>
              <p style={sub}>{subtitle}</p>
            </div>
          </div>
          <div style={vitals}>
            <Vital label="HP" value={`${currentHp}/${maxHp}`} />
            <Vital label="AC" value={ac} />
            <Vital label="Speed" value={`${speed}ft`} />
          </div>
          {saving && <p style={{ ...body, marginTop: 8, color: '#D62839' }}>Saving...</p>}
        </header>

        <h2 style={sectionTitle}>{tabs.find(t => t.id === activeTab)?.label}</h2>
        {activeTab === 'overview' && <Overview character={character} ac={ac} speed={speed} />}
        {activeTab === 'actions' && <GroupedCards groups={[['Actions', [...list(character.attacks), ...list(character.actions)]], ['Bonus Actions', list(character.bonus_actions)], ['Reactions', list(character.reactions)]]} empty="No actions listed yet." {...context} />}
        {activeTab === 'spells' && <GroupedCards groups={[['Cantrips', list(character.cantrips_known)], ['Known Spells', list(character.spells_known)], ['Prepared Spells', list(character.spells_prepared)], ['Other Spells', [...list(character.prepared_spells), ...list(character.known_spells), ...list(character.spells)]]]} empty="No spells listed yet." {...context} />}
        {activeTab === 'inventory' && <GroupedCards groups={[['Equipped', Object.values(character.equipped || {}).filter(Boolean)], ['Equipment', list(character.equipment)], ['Inventory', list(character.inventory)], ['Magic Items', list(character.magic_items)]]} empty="No inventory listed yet." {...context} />}
        {activeTab === 'features' && <GroupedCards groups={[['Class Features', list(character.class_features)], ['Race Traits', [...list(character.racial_traits), ...list(character.race_features)]], ['Feats', list(character.feats)], ['Other Features', list(character.features)]]} empty="No features listed yet." {...context} />}
        {activeTab === 'notes' && <Panel title="Notes"><p style={body}>{character.notes || character.backstory || 'No notes saved yet.'}</p></Panel>}
        {activeTab === 'status' && <Status {...context} />}
      </section>
    </main>
  );
}

function Vital({ label, value }) { return <div style={vital}><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, children }) { return <section style={panel}><h3 style={panelTitle}>{title}</h3>{children}</section>; }
function Line({ label, value }) { return <div style={line}><span>{label}</span><strong>{value}</strong></div>; }

function Overview({ character, ac, speed }) {
  return <div style={stack}><div style={grid}><Line label="AC" value={ac} /><Line label="Speed" value={`${speed}ft`} /><Line label="Initiative" value={fmt(mod(character.dexterity))} /></div><Panel title="Ability Scores"><div style={grid}>{['strength','dexterity','constitution','intelligence','wisdom','charisma'].map(key => <Line key={key} label={key.slice(0,3).toUpperCase()} value={`${character[key] || 10} (${fmt(mod(character[key]))})`} />)}</div></Panel></div>;
}

function GroupedCards({ groups, empty, expanded, toggleExpanded }) {
  const hasAny = groups.some(([, items]) => items.length > 0);
  if (!hasAny) return <Panel title="Nothing here yet"><p style={body}>{empty}</p></Panel>;
  return <div style={stack}>{groups.filter(([, items]) => items.length > 0).map(([groupName, items]) => <Panel key={groupName} title={groupName}>{items.map((item, index) => { const key = `${groupName}-${index}`; const open = !!expanded[key]; return <article key={key} style={expandCard}><button type="button" onClick={() => toggleExpanded(key)} style={expandButton}><span>{itemName(item, `${groupName} ${index + 1}`)}</span>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>{open && <p style={{ ...body, padding: 10 }}>{itemText(item)}</p>}</article>; })}</Panel>)}</div>;
}

function Status({ character, currentHp, maxHp, hpAmount, setHpAmount, saveCharacterPatch, saving }) {
  const conditions = list(character.conditions);
  const applyHp = (delta) => {
    const amount = Math.max(1, Number(hpAmount) || 1);
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + (delta * amount)));
    saveCharacterPatch({ current_hit_points: nextHp });
  };
  const toggleCondition = (condition) => {
    const next = conditions.includes(condition) ? conditions.filter(item => item !== condition) : [...conditions, condition];
    saveCharacterPatch({ conditions: next });
  };
  const toggleInspiration = () => saveCharacterPatch({ inspiration: !(character.inspiration || character.has_inspiration) });

  return <div style={stack}>
    <Panel title="HP Controls"><Line label="HP" value={`${currentHp}/${maxHp}`} /><Line label="Temp HP" value={character.temporary_hit_points || character.temp_hp || 0} /><div style={hpControls}><input disabled={saving} type="number" min="1" value={hpAmount} onChange={e => setHpAmount(e.target.value)} style={numberInput} /><button disabled={saving} style={dangerButton} onClick={() => applyHp(-1)}>Damage</button><button disabled={saving} style={button} onClick={() => applyHp(1)}>Heal</button></div></Panel>
    <Panel title="Status"><button disabled={saving} onClick={toggleInspiration} style={pillButton(character.inspiration || character.has_inspiration)}>Inspiration</button>{character.concentrating_on && <Line label="Concentration" value={character.concentrating_on} />}<Line label="Death save successes" value={character.death_saves_successes || 0} /><Line label="Death save failures" value={character.death_saves_failures || 0} /></Panel>
    <Panel title="Conditions"><div style={conditionGrid}>{CONDITIONS.map(condition => <button disabled={saving} key={condition} onClick={() => toggleCondition(condition)} style={pillButton(conditions.includes(condition))}>{condition}</button>)}</div></Panel>
  </div>;
}

const page = { minHeight: '100dvh', background: '#1A1A1A', color: '#FFFFFF', display: 'flex', overflowX: 'hidden' };
const rail = { position: 'fixed', inset: '0 auto 0 0', width: 54, background: '#171717', borderRight: '1px solid rgba(193,18,31,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 6px', zIndex: 50 };
const railBack = { width: 42, height: 42, background: '#1F1F1F', border: '1px solid rgba(193,18,31,0.35)', color: '#FFFFFF', display: 'grid', placeItems: 'center' };
const railBtn = active => ({ width: 42, height: 44, background: active ? '#C1121F' : 'transparent', border: active ? '1px solid #D62839' : '1px solid transparent', color: active ? '#FFFFFF' : '#D6D6D6', display: 'grid', placeItems: 'center' });
const content = { marginLeft: 54, width: 'calc(100% - 54px)', minHeight: '100dvh', padding: 10, overflowY: 'auto' };
const header = { background: '#242424', border: '1px solid rgba(193,18,31,0.35)', padding: 12, marginBottom: 12 };
const portrait = { width: 42, height: 42, background: '#1F1F1F', border: '1px solid rgba(193,18,31,0.35)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: '0 0 auto' };
const kicker = { color: '#D62839', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, margin: 0 };
const title = { color: '#FFFFFF', fontSize: 20, fontWeight: 900, margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const sub = { color: '#A0A0A0', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const vitals = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 10 };
const vital = { background: '#1F1F1F', border: '1px solid rgba(193,18,31,0.35)', padding: 8, textAlign: 'center' };
const sectionTitle = { fontSize: 18, fontWeight: 900, color: '#FFFFFF', margin: '0 0 10px' };
const stack = { display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 30 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 };
const panel = { background: '#242424', border: '1px solid rgba(193,18,31,0.35)', padding: 10 };
const panelTitle = { color: '#D62839', fontSize: 14, fontWeight: 900, margin: '0 0 9px' };
const line = { background: '#1F1F1F', border: '1px solid rgba(193,18,31,0.35)', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', gap: 8, color: '#D6D6D6', fontSize: 12, marginBottom: 6 };
const body = { color: '#D6D6D6', fontSize: 13, lineHeight: 1.55, margin: 0 };
const message = { marginLeft: 54, padding: 24, color: '#D6D6D6' };
const button = { background: '#C1121F', border: '1px solid #D62839', color: '#FFFFFF', padding: '10px 12px', fontWeight: 900 };
const dangerButton = { background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.55)', color: '#FFFFFF', padding: '10px 12px', fontWeight: 900 };
const expandCard = { background: '#1F1F1F', border: '1px solid rgba(193,18,31,0.35)', marginBottom: 7 };
const expandButton = { width: '100%', background: 'transparent', border: 'none', color: '#FFFFFF', padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' };
const hpControls = { display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 8, marginTop: 8 };
const numberInput = { background: '#1F1F1F', border: '1px solid rgba(193,18,31,0.35)', color: '#FFFFFF', padding: 10, minWidth: 0 };
const conditionGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 7 };
const pillButton = active => ({ background: active ? '#C1121F' : '#1F1F1F', border: active ? '1px solid #D62839' : '1px solid rgba(193,18,31,0.35)', color: '#FFFFFF', padding: 9, textTransform: 'capitalize', fontWeight: 900 });
