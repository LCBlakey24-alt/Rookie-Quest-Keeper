import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, BookOpen, Dices, Edit3, Heart, Shield, Sparkles, Swords, User, Zap } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import CleanCombatTab from '@/components/clean-sheet/CleanCombatTab';

const API = API_BASE;

const ABILITIES = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
];

const SKILLS = [
  ['Acrobatics', 'dexterity'], ['Animal Handling', 'wisdom'], ['Arcana', 'intelligence'],
  ['Athletics', 'strength'], ['Deception', 'charisma'], ['History', 'intelligence'],
  ['Insight', 'wisdom'], ['Intimidation', 'charisma'], ['Investigation', 'intelligence'],
  ['Medicine', 'wisdom'], ['Nature', 'intelligence'], ['Perception', 'wisdom'],
  ['Performance', 'charisma'], ['Persuasion', 'charisma'], ['Religion', 'intelligence'],
  ['Sleight of Hand', 'dexterity'], ['Stealth', 'dexterity'], ['Survival', 'wisdom'],
];

const tabs = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'combat', label: 'Combat', icon: Swords },
  { id: 'spells', label: 'Spells', icon: BookOpen },
  { id: 'inventory', label: 'Inventory', icon: Backpack },
  { id: 'notes', label: 'Notes', icon: Edit3 },
];

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
const getMaxHp = (c) => Number(c?.max_hit_points ?? c?.max_hp ?? 10) || 10;
const getCurrentHp = (c) => Number(c?.current_hit_points ?? c?.hp ?? getMaxHp(c)) || getMaxHp(c);

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="clean-sheet-stat-card">
      {Icon && <Icon size={18} />}
      <div className="clean-sheet-stat-value">{value}</div>
      <div className="clean-sheet-stat-label">{label}</div>
      {sub && <div className="clean-sheet-stat-sub">{sub}</div>}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="clean-sheet-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default function CleanCharacterSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingHp, setSavingHp] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/characters/${characterId}`);
        if (!cancelled) setCharacter(response.data);
      } catch (error) {
        toast.error('Failed to load character');
        if (!cancelled) setCharacter(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCharacter();
    return () => { cancelled = true; };
  }, [characterId]);

  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = Number(character?.temporary_hit_points ?? character?.temp_hp ?? 0) || 0;
  const dexMod = mod(character?.dexterity);
  const proficiencyBonus = 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
  const ac = Number(character?.armor_class ?? character?.ac ?? (10 + dexMod));
  const speed = Number(character?.speed ?? 30);
  const skillProficiencies = character?.skill_proficiencies || [];
  const saveProficiencies = character?.saving_throw_proficiencies || [];

  const hpPercent = useMemo(() => {
    if (!maxHp) return 0;
    return Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  }, [currentHp, maxHp]);

  const updateHp = async (delta) => {
    if (!character || savingHp) return;
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    setCharacter(prev => ({ ...prev, current_hit_points: nextHp }));
    setSavingHp(true);
    try {
      await axios.patch(`${API}/characters/${characterId}`, { current_hit_points: nextHp });
    } catch (error) {
      toast.error('Could not save HP');
      setCharacter(prev => ({ ...prev, current_hit_points: currentHp }));
    } finally {
      setSavingHp(false);
    }
  };

  if (loading) {
    return (
      <div className="clean-sheet-page clean-sheet-loading">
        <img src="/images/logo-mini.png" alt="ROOK" />
        <p>Loading character...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="clean-sheet-page clean-sheet-loading">
        <p>Character could not be loaded.</p>
        <button onClick={() => navigate('/home')}>Back to dashboard</button>
      </div>
    );
  }

  const subtitle = [
    character.race,
    character.subrace ? `(${character.subrace})` : null,
    character.character_class,
    character.subclass ? `(${character.subclass})` : null,
    `Lv ${character.level || 1}`,
  ].filter(Boolean).join(' • ');

  return (
    <div className="clean-sheet-page">
      <header className="clean-sheet-header">
        <button className="clean-sheet-back" onClick={() => navigate('/home')}>
          <ArrowLeft size={18} /> Dashboard
        </button>
        <div className="clean-sheet-identity">
          <div className="clean-sheet-portrait">
            {character.portrait_url ? <img src={character.portrait_url} alt="" /> : <User size={30} />}
          </div>
          <div>
            <p className="clean-sheet-kicker">Character</p>
            <h1>{character.name}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <button className="clean-sheet-edit" onClick={() => navigate(`/characters/${character.id}/edit`)}>
          <Edit3 size={18} /> Edit
        </button>
      </header>

      <section className="clean-sheet-vitals">
        <div className="clean-sheet-hp-card">
          <div className="clean-sheet-hp-top">
            <span><Heart size={18} /> HP</span>
            <strong>{currentHp}/{maxHp}{tempHp > 0 ? ` +${tempHp}` : ''}</strong>
          </div>
          <div className="clean-sheet-hp-bar"><div style={{ width: `${hpPercent}%` }} /></div>
          <div className="clean-sheet-hp-actions">
            <button onClick={() => updateHp(-1)} disabled={savingHp}>-</button>
            <button onClick={() => updateHp(1)} disabled={savingHp}>+</button>
          </div>
        </div>
        <StatCard icon={Shield} label="AC" value={ac} />
        <StatCard icon={Zap} label="Initiative" value={fmt(dexMod)} />
        <StatCard icon={Dices} label="Proficiency" value={fmt(proficiencyBonus)} />
        <StatCard icon={User} label="Speed" value={`${speed}ft`} />
      </section>

      <nav className="clean-sheet-tabs" aria-label="Character sheet sections">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={selected ? 'active' : ''}>
              <Icon size={17} /> <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="clean-sheet-content">
        {activeTab === 'overview' && (
          <div className="clean-sheet-grid">
            <section className="clean-sheet-panel">
              <h2>Ability Scores</h2>
              <div className="clean-sheet-abilities">
                {ABILITIES.map(([key, short]) => (
                  <div key={key} className="clean-sheet-ability">
                    <span>{short}</span>
                    <strong>{character[key] ?? 10}</strong>
                    <em>{fmt(mod(character[key]))}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="clean-sheet-panel">
              <h2>Saving Throws</h2>
              <div className="clean-sheet-list">
                {ABILITIES.map(([key, short]) => {
                  const proficient = saveProficiencies.includes(key) || saveProficiencies.includes(short.toLowerCase());
                  return <div key={key}><span>{short}</span><strong>{fmt(mod(character[key]) + (proficient ? proficiencyBonus : 0))}</strong></div>;
                })}
              </div>
            </section>

            <section className="clean-sheet-panel clean-sheet-wide">
              <h2>Skills</h2>
              <div className="clean-sheet-skills">
                {SKILLS.map(([skill, ability]) => {
                  const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
                  return <div key={skill}><span>{skill}</span><em>{ability.slice(0, 3).toUpperCase()}</em><strong>{fmt(mod(character[ability]) + (proficient ? proficiencyBonus : 0))}</strong></div>;
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'combat' && <CleanCombatTab character={character} ac={ac} speed={speed} proficiencyBonus={proficiencyBonus} />}
        {activeTab === 'spells' && <EmptyState title="Spells" text="Spell display will be rebuilt here with known, prepared, cantrips and slots separated clearly." />}
        {activeTab === 'inventory' && <EmptyState title="Inventory" text="Inventory will be rebuilt here with equipment, currency and carried items." />}
        {activeTab === 'notes' && <EmptyState title="Notes" text="Notes and journal entries will be rebuilt here in the next pass." />}
      </main>
    </div>
  );
}
