import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, BookOpen, Dices, Edit3, Heart, Shield, Sparkles, Swords, TrendingUp, User, Zap } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import CleanCombatTab from '@/components/clean-sheet/CleanCombatTab';
import CleanInventoryTab from '@/components/clean-sheet/CleanInventoryTab';
import CleanSpellsTab from '@/components/clean-sheet/CleanSpellsTab';

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
const getTempHp = (c) => Number(c?.temporary_hit_points ?? c?.temp_hp ?? 0) || 0;

function rollD20(modifier = 0) {
  const d20 = Math.floor(Math.random() * 20) + 1;
  return { d20, modifier, total: d20 + modifier };
}

function StatCard({ icon: Icon, label, value, sub, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`clean-sheet-stat-card ${onClick ? 'clean-sheet-clickable' : ''}`}>
      {Icon && <Icon size={18} />}
      <div className="clean-sheet-stat-value">{value}</div>
      <div className="clean-sheet-stat-label">{label}</div>
      {sub && <div className="clean-sheet-stat-sub">{sub}</div>}
    </Tag>
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
  const [savingTempHp, setSavingTempHp] = useState(false);
  const [hpAmount, setHpAmount] = useState(1);
  const [tempHpAmount, setTempHpAmount] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [rollBurst, setRollBurst] = useState(null);

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

  useEffect(() => {
    if (!rollBurst) return undefined;
    const timeout = setTimeout(() => setRollBurst(null), 1800);
    return () => clearTimeout(timeout);
  }, [rollBurst]);

  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = getTempHp(character);
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

  const getSafeAmount = (value) => Math.max(1, Math.min(999, Number(value) || 1));

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

  const updateTempHp = async (delta) => {
    if (!character || savingTempHp) return;
    const nextTempHp = Math.max(0, tempHp + delta);
    setCharacter(prev => ({ ...prev, temporary_hit_points: nextTempHp, temp_hp: nextTempHp }));
    setSavingTempHp(true);
    try {
      await axios.patch(`${API}/characters/${characterId}`, { temporary_hit_points: nextTempHp });
    } catch (error) {
      toast.error('Could not save temporary HP');
      setCharacter(prev => ({ ...prev, temporary_hit_points: tempHp, temp_hp: tempHp }));
    } finally {
      setSavingTempHp(false);
    }
  };

  const makeRoll = (label, modifier) => {
    const result = rollD20(modifier);
    setRollBurst({ label, ...result, id: `${Date.now()}-${Math.random()}` });
  };

  const updateCharacterLocal = (updates) => {
    setCharacter(prev => (prev ? { ...prev, ...updates } : prev));
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
      {rollBurst && (
        <div key={rollBurst.id} className="clean-sheet-roll-burst" aria-live="polite">
          <span>{rollBurst.label}</span>
          <strong>{rollBurst.total}</strong>
          <em>d20 {rollBurst.d20} {fmt(rollBurst.modifier)}</em>
        </div>
      )}

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
        <div className="clean-sheet-header-actions">
          <button className="clean-sheet-level" onClick={() => toast.info('Level Up is coming back in the next pass.')}>
            <TrendingUp size={18} /> Level Up
          </button>
          <button className="clean-sheet-edit" onClick={() => navigate(`/characters/${character.id}/edit`)}>
            <Edit3 size={18} /> Edit
          </button>
        </div>
      </header>

      <section className="clean-sheet-vitals">
        <div className="clean-sheet-hp-card">
          <div className="clean-sheet-hp-top">
            <span><Heart size={18} /> HP</span>
            <strong>{currentHp}/{maxHp}</strong>
          </div>
          <div className="clean-sheet-hp-bar"><div style={{ width: `${hpPercent}%` }} /></div>
          <div className="clean-sheet-hp-bulk-row">
            <input
              type="number"
              min="1"
              max="999"
              value={hpAmount}
              onChange={(e) => setHpAmount(e.target.value)}
              aria-label="HP amount"
            />
            <button onClick={() => updateHp(-getSafeAmount(hpAmount))} disabled={savingHp}>Damage</button>
            <button onClick={() => updateHp(getSafeAmount(hpAmount))} disabled={savingHp}>Heal</button>
          </div>
          <div className="clean-sheet-temp-hp-row clean-sheet-temp-hp-bulk-row">
            <span>Temp HP</span>
            <strong>{tempHp}</strong>
            <input
              type="number"
              min="1"
              max="999"
              value={tempHpAmount}
              onChange={(e) => setTempHpAmount(e.target.value)}
              aria-label="Temporary HP amount"
            />
            <button onClick={() => updateTempHp(-getSafeAmount(tempHpAmount))} disabled={savingTempHp || tempHp <= 0}>Remove</button>
            <button onClick={() => updateTempHp(getSafeAmount(tempHpAmount))} disabled={savingTempHp}>Add</button>
          </div>
        </div>
        <StatCard icon={Shield} label="AC" value={ac} />
        <StatCard icon={Zap} label="Initiative" value={fmt(dexMod)} onClick={() => makeRoll('Initiative', dexMod)} />
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
                {ABILITIES.map(([key, short]) => {
                  const abilityMod = mod(character[key]);
                  return (
                    <button key={key} type="button" className="clean-sheet-ability clean-sheet-clickable" onClick={() => makeRoll(`${short} Check`, abilityMod)}>
                      <span>{short}</span>
                      <strong>{character[key] ?? 10}</strong>
                      <em>{fmt(abilityMod)}</em>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="clean-sheet-panel">
              <h2>Saving Throws</h2>
              <div className="clean-sheet-save-grid">
                {ABILITIES.map(([key, short]) => {
                  const proficient = saveProficiencies.includes(key) || saveProficiencies.includes(short.toLowerCase());
                  const saveMod = mod(character[key]) + (proficient ? proficiencyBonus : 0);
                  return (
                    <button key={key} type="button" className="clean-sheet-save-card" onClick={() => makeRoll(`${short} Save`, saveMod)}>
                      <span>{short}</span>
                      <strong>{fmt(saveMod)}</strong>
                      {proficient && <em>Proficient</em>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="clean-sheet-panel clean-sheet-wide">
              <h2>Skills</h2>
              <div className="clean-sheet-skill-grid">
                {SKILLS.map(([skill, ability]) => {
                  const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
                  const skillMod = mod(character[ability]) + (proficient ? proficiencyBonus : 0);
                  return (
                    <button key={skill} type="button" className="clean-sheet-skill-card" onClick={() => makeRoll(skill, skillMod)}>
                      <span>{skill}</span>
                      <em>{ability.slice(0, 3).toUpperCase()}</em>
                      <strong>{fmt(skillMod)}</strong>
                      {proficient && <small>Proficient</small>}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'combat' && <CleanCombatTab character={character} ac={ac} speed={speed} proficiencyBonus={proficiencyBonus} onRoll={makeRoll} />}
        {activeTab === 'spells' && <CleanSpellsTab character={character} />}
        {activeTab === 'inventory' && <CleanInventoryTab character={character} onCharacterUpdate={updateCharacterLocal} />}
        {activeTab === 'notes' && <EmptyState title="Notes" text="Notes and journal entries will be rebuilt here in the next pass." />}
      </main>
    </div>
  );
}
