import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Activity,
  ArrowLeft,
  Backpack,
  BookOpen,
  Coffee,
  Dices,
  Edit3,
  Heart,
  History,
  Moon,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import CleanCombatTab from '@/components/clean-sheet/CleanCombatTab';
import CleanInventoryTab from '@/components/clean-sheet/CleanInventoryTab';
import CleanSpellsTab from '@/components/clean-sheet/CleanSpellsTab';
import CleanNotesTab from '@/components/clean-sheet/CleanNotesTab';
import LevelUpWizard from '@/components/LevelUpWizard';

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

const PASSIVE_SKILLS = [
  ['Perception', 'wisdom'],
  ['Insight', 'wisdom'],
  ['Investigation', 'intelligence'],
];

const COMMON_CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
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
const clampDeathCount = (value) => Math.max(0, Math.min(3, Number(value) || 0));

function parseHitDie(hitDice = '1d8') {
  const match = String(hitDice).match(/(\d+)d(\d+)/i);
  if (!match) return { total: 1, sides: 8 };
  return { total: Number(match[1]) || 1, sides: Number(match[2]) || 8 };
}

function rollD20(modifier = 0, rollMode = 'normal') {
  const first = Math.floor(Math.random() * 20) + 1;
  if (rollMode !== 'advantage' && rollMode !== 'disadvantage') {
    return { d20: first, modifier, total: first + modifier, mode: 'normal', allRolls: [first] };
  }
  const second = Math.floor(Math.random() * 20) + 1;
  const kept = rollMode === 'advantage' ? Math.max(first, second) : Math.min(first, second);
  return { d20: kept, modifier, total: kept + modifier, mode: rollMode, allRolls: [first, second] };
}

function rollHitDie(sides = 8, modifier = 0) {
  const die = Math.floor(Math.random() * sides) + 1;
  return { die, total: Math.max(1, die + modifier) };
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

export default function CleanCharacterSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingHp, setSavingHp] = useState(false);
  const [savingTempHp, setSavingTempHp] = useState(false);
  const [savingQuickState, setSavingQuickState] = useState(false);
  const [hpAmount, setHpAmount] = useState(1);
  const [tempHpAmount, setTempHpAmount] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [rollBurst, setRollBurst] = useState(null);
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  const [rollHistory, setRollHistory] = useState([]);
  const [showRollHistory, setShowRollHistory] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [rollMode, setRollMode] = useState('normal');
  const [rollBonus, setRollBonus] = useState(0);
  const [reloadingCharacter, setReloadingCharacter] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/characters/${characterId}`);
        if (!cancelled) setCharacter(response.data);
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Failed to load character');
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
    const timeout = setTimeout(() => setRollBurst(null), 6000);
    return () => clearTimeout(timeout);
  }, [rollBurst]);

  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = getTempHp(character);
  const dexMod = mod(character?.dexterity);
  const conMod = mod(character?.constitution);
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
  const ac = Number(character?.armor_class ?? character?.ac ?? (10 + dexMod));
  const speed = Number(character?.speed ?? 30);
  const skillProficiencies = character?.skill_proficiencies || [];
  const saveProficiencies = character?.saving_throw_proficiencies || [];
  const activeConditions = character?.conditions || [];
  const exhaustionLevel = Number(character?.exhaustion_level || 0);
  const deathSaveSuccesses = clampDeathCount(character?.death_saves_successes);
  const deathSaveFailures = clampDeathCount(character?.death_saves_failures);
  const hasInspiration = Boolean(character?.inspiration || character?.has_inspiration);
  const hitDice = character?.hit_dice || `${character?.level || 1}d8`;
  const hitDieInfo = parseHitDie(hitDice);
  const hitDiceRemaining = Number(character?.hit_dice_remaining ?? character?.level ?? hitDieInfo.total) || 0;

  const hpPercent = useMemo(() => {
    if (!maxHp) return 0;
    return Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  }, [currentHp, maxHp]);

  const passiveScores = useMemo(() => {
    return PASSIVE_SKILLS.map(([skill, ability]) => {
      const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
      return [skill, 10 + mod(character?.[ability]) + (proficient ? proficiencyBonus : 0)];
    });
  }, [character, proficiencyBonus, skillProficiencies]);

  const getSafeAmount = (value) => Math.max(1, Math.min(999, Number(value) || 1));
  const getRollBonus = () => Number(rollBonus) || 0;

  const patchCharacter = async (updates, options = {}) => {
    const previous = character;
    setCharacter(prev => (prev ? { ...prev, ...updates } : prev));
    try {
      const response = await apiClient.patch(`/characters/${characterId}`, updates);
      if (response?.data && typeof response.data === 'object') {
        setCharacter(response.data.character || response.data);
      }
      if (options.success) toast.success(options.success);
      return true;
    } catch (error) {
      setCharacter(previous);
      toast.error(error?.response?.data?.detail || options.error || 'Could not save character update');
      return false;
    }
  };

  const reloadCharacter = async () => {
    if (reloadingCharacter) return;
    setReloadingCharacter(true);
    try {
      const response = await apiClient.get(`/characters/${characterId}`);
      setCharacter(response.data);
      toast.success('Character refreshed');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to refresh character');
    } finally {
      setReloadingCharacter(false);
    }
  };

  const updateHp = async (delta) => {
    if (!character || savingHp) return;
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    const updates = { current_hit_points: nextHp };
    if (nextHp > 0 && (deathSaveSuccesses || deathSaveFailures)) {
      updates.death_saves_successes = 0;
      updates.death_saves_failures = 0;
    }
    setSavingHp(true);
    await patchCharacter(updates, { error: 'Could not save HP' });
    setSavingHp(false);
  };

  const updateTempHp = async (delta) => {
    if (!character || savingTempHp) return;
    const nextTempHp = Math.max(0, tempHp + delta);
    setSavingTempHp(true);
    await patchCharacter(
      { temporary_hit_points: nextTempHp, temp_hp: nextTempHp },
      { error: 'Could not save temporary HP' }
    );
    setSavingTempHp(false);
  };

  const makeRoll = (label, modifier) => {
    const totalModifier = (Number(modifier) || 0) + getRollBonus();
    const result = rollD20(totalModifier, rollMode);
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      label,
      ...result,
      baseModifier: Number(modifier) || 0,
      customModifier: getRollBonus(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setRollBurst(entry);
    setRollHistory(prev => [entry, ...prev].slice(0, 12));
  };

  const updateCharacterLocal = (updates) => {
    setCharacter(prev => (prev ? { ...prev, ...updates } : prev));
  };

  const toggleInspiration = async () => {
    if (savingQuickState) return;
    setSavingQuickState(true);
    await patchCharacter(
      { inspiration: !hasInspiration, has_inspiration: !hasInspiration },
      { success: !hasInspiration ? 'Inspiration gained' : 'Inspiration removed', error: 'Could not save inspiration' }
    );
    setSavingQuickState(false);
  };

  const toggleCondition = async (condition) => {
    if (savingQuickState) return;
    const nextConditions = activeConditions.includes(condition)
      ? activeConditions.filter(c => c !== condition)
      : [...activeConditions, condition];
    setSavingQuickState(true);
    await patchCharacter(
      { conditions: nextConditions },
      { error: 'Could not save condition' }
    );
    setSavingQuickState(false);
  };

  const setDeathSaveCount = async (type, index) => {
    const current = type === 'success' ? deathSaveSuccesses : deathSaveFailures;
    const next = current === index + 1 ? index : index + 1;
    const updates = type === 'success'
      ? { death_saves_successes: next }
      : { death_saves_failures: next };
    await patchCharacter(updates, { error: 'Could not save death save' });
  };

  const resetDeathSaves = async () => {
    await patchCharacter(
      { death_saves_successes: 0, death_saves_failures: 0 },
      { success: 'Death saves reset', error: 'Could not reset death saves' }
    );
  };

  const rollDeathSave = async () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const entry = {
      id: `${Date.now()}-death-save`,
      label: 'Death Save',
      d20: roll,
      modifier: 0,
      total: roll,
      mode: 'normal',
      allRolls: [roll],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setRollBurst(entry);
    setRollHistory(prev => [entry, ...prev].slice(0, 12));

    if (roll === 20) {
      await patchCharacter(
        { current_hit_points: 1, death_saves_successes: 0, death_saves_failures: 0 },
        { success: 'Natural 20! You regain 1 HP.', error: 'Could not save death save result' }
      );
      return;
    }

    if (roll === 1) {
      await patchCharacter(
        { death_saves_failures: Math.min(3, deathSaveFailures + 2) },
        { success: 'Natural 1: two failures marked.', error: 'Could not save death save result' }
      );
      return;
    }

    if (roll >= 10) {
      await patchCharacter(
        { death_saves_successes: Math.min(3, deathSaveSuccesses + 1) },
        { success: 'Death save success marked.', error: 'Could not save death save result' }
      );
    } else {
      await patchCharacter(
        { death_saves_failures: Math.min(3, deathSaveFailures + 1) },
        { success: 'Death save failure marked.', error: 'Could not save death save result' }
      );
    }
  };

  const spendHitDie = async () => {
    if (!character || savingQuickState) return;
    if (hitDiceRemaining <= 0) {
      toast.error('No hit dice remaining');
      return;
    }
    if (currentHp >= maxHp) {
      toast.info('Already at full HP');
      return;
    }

    const result = rollHitDie(hitDieInfo.sides, conMod);
    const nextHp = Math.min(maxHp, currentHp + result.total);
    const entry = {
      id: `${Date.now()}-hit-die`,
      label: `Hit Die d${hitDieInfo.sides}`,
      d20: result.die,
      modifier: conMod,
      total: result.total,
      mode: 'hit-die',
      allRolls: [result.die],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setRollBurst(entry);
    setRollHistory(prev => [entry, ...prev].slice(0, 12));
    setSavingQuickState(true);
    await patchCharacter(
      { current_hit_points: nextHp, hit_dice_remaining: Math.max(0, hitDiceRemaining - 1) },
      { success: `Recovered ${nextHp - currentHp} HP`, error: 'Could not spend hit die' }
    );
    setSavingQuickState(false);
  };

  const handleRest = async (restType) => {
    if (!character || savingQuickState) return;
    setSavingQuickState(true);
    const endpoint = restType === 'long' ? 'long-rest' : 'short-rest';
    try {
      const response = await apiClient.post(`/characters/${characterId}/${endpoint}`);
      const updated = response.data?.character || response.data;
      if (updated && typeof updated === 'object') setCharacter(updated);
      toast.success(restType === 'long' ? 'Long rest completed' : 'Short rest completed');
    } catch (error) {
      if (restType === 'long') {
        await patchCharacter(
          {
            current_hit_points: maxHp,
            temporary_hit_points: 0,
            temp_hp: 0,
            death_saves_successes: 0,
            death_saves_failures: 0,
            spell_slots_remaining: character?.spell_slots || {},
            hit_dice_remaining: Number(character?.level || hitDieInfo.total),
          },
          { success: 'Long rest applied', error: 'Could not apply long rest' }
        );
      } else {
        toast.error(error?.response?.data?.detail || 'Could not complete short rest');
      }
    } finally {
      setSavingQuickState(false);
    }
  };

  if (loading) {
    return (
      <div className="clean-sheet-page character-page-v2 clean-sheet-loading">
        <img src="/images/logo-mini.png" alt="ROOK" />
        <p>Loading character...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="clean-sheet-page character-page-v2 clean-sheet-loading">
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

  const showDeathSaves = currentHp <= 0 || deathSaveSuccesses > 0 || deathSaveFailures > 0;

  return (
    <div className="clean-sheet-page character-page-v2">
      {showLevelUpWizard && character && (
        <LevelUpWizard
          character={character}
          isOpen={showLevelUpWizard}
          onClose={() => setShowLevelUpWizard(false)}
          onLevelUp={() => {
            setShowLevelUpWizard(false);
            setTimeout(() => window.location.reload(), 500);
          }}
        />
      )}

      {rollBurst && (
        <div key={rollBurst.id} className="clean-sheet-roll-burst" aria-live="polite">
          <span>{rollBurst.label}</span>
          <strong>{rollBurst.total}</strong>
          <em>
            {rollBurst.mode === 'hit-die'
              ? `d${hitDieInfo.sides} ${rollBurst.d20} ${fmt(rollBurst.modifier)}`
              : `d20 ${rollBurst.d20} ${fmt(rollBurst.modifier)}${rollBurst.mode && rollBurst.mode !== 'normal' ? ` • ${rollBurst.mode}` : ''}`}
          </em>
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
          <button className="clean-sheet-level" onClick={() => setShowLevelUpWizard(true)}>
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

      <section className="clean-sheet-mobile-tools" data-testid="mobile-play-essentials">
        <div className="clean-sheet-status-row">
          <button type="button" className={`clean-sheet-inspiration ${hasInspiration ? 'active' : ''}`} onClick={toggleInspiration} disabled={savingQuickState} data-testid="inspiration-toggle">
            <Star size={17} /> {hasInspiration ? 'Inspired' : 'Inspiration'}
          </button>
          <button type="button" className="clean-sheet-rest-button" onClick={() => handleRest('short')} disabled={savingQuickState} data-testid="short-rest-btn">
            <Coffee size={17} /> Short Rest
          </button>
          <button type="button" className="clean-sheet-rest-button" onClick={() => handleRest('long')} disabled={savingQuickState} data-testid="long-rest-btn">
            <Moon size={17} /> Long Rest
          </button>
        </div>

        <div className="clean-sheet-roll-controls" data-testid="roll-controls">
          <div className="clean-sheet-roll-mode-group" aria-label="Roll mode">
            {['normal', 'advantage', 'disadvantage'].map(mode => (
              <button key={mode} type="button" className={rollMode === mode ? 'active' : ''} onClick={() => setRollMode(mode)}>
                {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Adv' : 'Dis'}
              </button>
            ))}
          </div>
          <label>
            <span>Bonus</span>
            <input type="number" value={rollBonus} onChange={(event) => setRollBonus(event.target.value)} aria-label="Custom roll bonus" />
          </label>
        </div>

        <div className="clean-sheet-passives" data-testid="passive-scores-strip">
          {passiveScores.map(([label, value]) => (
            <div key={label}><span>Passive {label}</span><strong>{value}</strong></div>
          ))}
        </div>

        <div className="clean-sheet-hitdice-row" data-testid="hit-dice-row">
          <span><Activity size={15} /> Hit Dice</span>
          <strong>{hitDiceRemaining} / {hitDice}</strong>
          <button type="button" onClick={spendHitDie} disabled={savingQuickState || hitDiceRemaining <= 0 || currentHp >= maxHp}>Spend</button>
        </div>

        <div className="clean-sheet-condition-panel" data-testid="conditions-strip">
          <button type="button" onClick={() => setShowConditionPicker(prev => !prev)} className="clean-sheet-condition-toggle">
            Conditions {activeConditions.length > 0 ? `(${activeConditions.length})` : ''}
          </button>
          {exhaustionLevel > 0 && <span className="clean-sheet-condition-chip danger">Exhaustion {exhaustionLevel}</span>}
          {activeConditions.length === 0 && exhaustionLevel === 0 ? (
            <span className="clean-sheet-no-conditions">No active conditions</span>
          ) : (
            activeConditions.map(condition => <span key={condition} className="clean-sheet-condition-chip">{condition}</span>)
          )}
          {showConditionPicker && (
            <div className="clean-sheet-condition-picker">
              {COMMON_CONDITIONS.map(condition => (
                <button
                  key={condition}
                  type="button"
                  className={activeConditions.includes(condition) ? 'active' : ''}
                  onClick={() => toggleCondition(condition)}
                  disabled={savingQuickState}
                >
                  {condition}
                </button>
              ))}
            </div>
          )}
        </div>

        {showDeathSaves && (
          <div className="clean-sheet-death-saves" data-testid="death-saves-panel">
            <div className="clean-sheet-death-title"><Skull size={17} /> Death Saves</div>
            <DeathSaveTrack label="Successes" type="success" count={deathSaveSuccesses} onToggle={setDeathSaveCount} />
            <DeathSaveTrack label="Failures" type="failure" count={deathSaveFailures} onToggle={setDeathSaveCount} />
            <div className="clean-sheet-death-actions">
              <button type="button" onClick={rollDeathSave}>Roll Death Save</button>
              <button type="button" onClick={resetDeathSaves}><RotateCcw size={15} /> Reset</button>
            </div>
          </div>
        )}

        <div className="clean-sheet-roll-history-panel" data-testid="roll-history-panel">
          <button type="button" onClick={() => setShowRollHistory(prev => !prev)} className="clean-sheet-roll-history-toggle">
            <History size={16} /> Last Rolls {rollHistory.length > 0 ? `(${rollHistory.length})` : ''}
          </button>
          {showRollHistory && (
            <div className="clean-sheet-roll-history-list">
              {rollHistory.length === 0 ? (
                <p>No rolls yet.</p>
              ) : (
                rollHistory.map(entry => (
                  <div key={entry.id}>
                    <span>{entry.label}</span>
                    <strong>{entry.total}</strong>
                    <em>{entry.time} • {entry.mode === 'hit-die' ? `die ${entry.d20}` : `d20 ${entry.d20}`} {fmt(entry.modifier)}{entry.mode && entry.mode !== 'normal' && entry.mode !== 'hit-die' ? ` • ${entry.mode}` : ''}</em>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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
        {activeTab === 'spells' && <CleanSpellsTab character={character} onCharacterUpdate={patchCharacter} />}
        {activeTab === 'inventory' && <CleanInventoryTab character={character} onCharacterUpdate={updateCharacterLocal} />}
        {activeTab === 'notes' && <CleanNotesTab character={character} onCharacterUpdate={updateCharacterLocal} />}
      </main>
    </div>
  );
}

function DeathSaveTrack({ label, type, count, onToggle }) {
  return (
    <div className="clean-sheet-death-track">
      <span>{label}</span>
      <div>
        {[0, 1, 2].map(index => (
          <button
            key={index}
            type="button"
            className={index < count ? 'marked' : ''}
            onClick={() => onToggle(type, index)}
            aria-label={`${label} ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
