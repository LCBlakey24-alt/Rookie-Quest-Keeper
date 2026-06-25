import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { RotateCcw, ScrollText } from 'lucide-react';

import CleanSheetVitals from '@/components/clean-sheet/CleanSheetVitals';
import CleanSheetPlayTools from '@/components/clean-sheet/CleanSheetPlayTools';
import CleanSpellsTab from '@/components/clean-sheet/CleanSpellsTab';
import {
  PASSIVE_SKILLS,
  SHEET_TABS,
  calculateHpDamage,
  calculateHpHealing,
  clampDeathCount,
  getCurrentHp,
  getMaxHp,
  getTempHp,
  mod,
  parseHitDie,
  rollD20,
  rollHitDie,
} from '@/components/clean-sheet/cleanSheetUtils';
import {
  getPrototypeClassOptions,
  loadPrototypeCharacter,
  resetPrototypeCharacter,
  savePrototypeCharacter,
} from '@/data/prototypeCharacters';
import './PrototypeMobileLab.css';

function restoreResources(resources = {}, restType = 'long-rest') {
  return Object.entries(resources || {}).reduce((next, [key, value]) => {
    if (!value || typeof value !== 'object') {
      next[key] = value;
      return next;
    }
    const shouldRestore = restType === 'long-rest' || value.restore === 'short-rest';
    next[key] = shouldRestore
      ? { ...value, current: value.max ?? value.current ?? value.remaining ?? 0, remaining: value.max ?? value.current ?? value.remaining ?? 0 }
      : value;
    return next;
  }, {});
}

function OverviewPanel({ character }) {
  const resources = Object.values(character.resources || {});
  return (
    <div className="prototype-card-grid">
      <section className="prototype-card">
        <h2>Stats</h2>
        <div className="prototype-stat-grid">
          {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => (
            <div key={ability}>
              <span>{ability.slice(0, 3).toUpperCase()}</span>
              <strong>{character[ability]}</strong>
              <em>{mod(character[ability]) >= 0 ? '+' : ''}{mod(character[ability])}</em>
            </div>
          ))}
        </div>
      </section>
      <section className="prototype-card">
        <h2>Resources</h2>
        {resources.length ? resources.map(resource => (
          <div className="prototype-resource-row" key={resource.label}>
            <span>{resource.label}</span>
            <strong>{resource.remaining ?? resource.current ?? 0} / {resource.max ?? 0}</strong>
            <em>{resource.restore}</em>
          </div>
        )) : <p>No class resources for this prototype.</p>}
      </section>
      <section className="prototype-card prototype-card--wide">
        <h2>Testing notes</h2>
        <p>This is a local-only test character. Changes save to this browser, so you can test without the backend.</p>
        <p>Use this page to check HP, temp HP, Hit Dice, rests, class resources, spell slots, conditions, and mobile navigation.</p>
      </section>
    </div>
  );
}

function CombatPanel({ character, onRoll }) {
  const attacks = (character.features || []).filter(feature => ['action', 'special'].includes(feature.type));
  return (
    <section className="prototype-card prototype-card--wide">
      <h2>Combat checks</h2>
      <div className="prototype-action-list">
        {(attacks.length ? attacks : [{ name: 'Weapon Attack' }, { name: 'Ability Check' }]).map(action => (
          <button key={action.name} type="button" onClick={() => onRoll(action.name, mod(character.strength) + character.proficiency_bonus)}>
            Roll {action.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function InventoryPanel({ character, onUpdate }) {
  return (
    <section className="prototype-card prototype-card--wide">
      <h2>Inventory</h2>
      <div className="prototype-action-list">
        {(character.inventory || []).map((item, index) => (
          <div className="prototype-resource-row" key={`${item.name}-${index}`}>
            <span>{item.name}</span>
            <strong>×{item.quantity ?? 1}</strong>
            <button
              type="button"
              onClick={() => {
                const nextInventory = [...(character.inventory || [])];
                nextInventory[index] = { ...item, quantity: Math.max(0, Number(item.quantity || 1) - 1) };
                onUpdate({ inventory: nextInventory }, { success: `${item.name} used` });
              }}
            >
              Use
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesPanel({ character, onUpdate }) {
  const [draft, setDraft] = useState(character.notes || '');
  return (
    <section className="prototype-card prototype-card--wide">
      <h2>Notes</h2>
      <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={8} />
      <button type="button" onClick={() => onUpdate({ notes: draft }, { success: 'Prototype notes saved' })}>Save notes locally</button>
    </section>
  );
}

export default function PrototypeMobileLab() {
  const classOptions = useMemo(() => getPrototypeClassOptions(), []);
  const [selectedId, setSelectedId] = useState(classOptions[0]?.id || 'prototype-warlock');
  const [character, setCharacter] = useState(() => loadPrototypeCharacter(classOptions[0]?.id || 'prototype-warlock'));
  const [activeTab, setActiveTab] = useState('overview');
  const [hpAmount, setHpAmount] = useState(1);
  const [tempHpAmount, setTempHpAmount] = useState(1);
  const [rollBonus, setRollBonus] = useState(0);
  const [rollMode, setRollMode] = useState('normal');
  const [rollHistory, setRollHistory] = useState([]);
  const [showRollHistory, setShowRollHistory] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [showConcentrationInput, setShowConcentrationInput] = useState(false);
  const [concentrationInput, setConcentrationInput] = useState('');
  const [saving, setSaving] = useState(false);

  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = getTempHp(character);
  const hitDieInfo = parseHitDie(character.hit_dice);
  const hitDiceRemaining = Number(character.hit_dice_remaining ?? hitDieInfo.total) || 0;
  const skillProficiencies = character.skill_proficiencies || [];
  const proficiencyBonus = Number(character.proficiency_bonus) || 2;
  const passiveScores = PASSIVE_SKILLS.map(([skill, ability]) => {
    const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
    return [skill, 10 + mod(character[ability]) + (proficient ? proficiencyBonus : 0)];
  });
  const deathSaveSuccesses = clampDeathCount(character.death_saves_successes);
  const deathSaveFailures = clampDeathCount(character.death_saves_failures);
  const concentratingName = character.concentrating_on || character.concentration || '';

  const saveLocal = (updates, options = {}) => {
    const next = savePrototypeCharacter(selectedId, { ...character, ...updates });
    setCharacter(next);
    if (options.success) toast.success(options.success);
    return true;
  };

  const switchCharacter = (id) => {
    setSelectedId(id);
    setCharacter(loadPrototypeCharacter(id));
    setActiveTab('overview');
  };

  const makeRoll = (label, modifier = 0) => {
    const result = rollD20((Number(modifier) || 0) + (Number(rollBonus) || 0), rollMode);
    const entry = { id: `${Date.now()}-${label}`, label, ...result, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setRollHistory(prev => [entry, ...prev].slice(0, 12));
    toast.success(`${label}: ${entry.total}`);
  };

  const updateHp = (delta) => {
    const amount = Math.max(1, Number(Math.abs(delta)) || 1);
    const result = delta < 0
      ? calculateHpDamage({ currentHp, tempHp, maxHp, amount })
      : calculateHpHealing({ currentHp, maxHp, amount });
    saveLocal(result, { success: delta < 0 ? 'Damage applied locally' : 'Healing applied locally' });
  };

  const updateTempHp = (delta) => {
    const nextTemp = Math.max(0, tempHp + delta);
    saveLocal({ temporary_hit_points: nextTemp, temp_hp: nextTemp }, { success: 'Temp HP updated locally' });
  };

  const spendHitDie = () => {
    if (hitDiceRemaining <= 0) return toast.error('No hit dice remaining');
    if (currentHp >= maxHp) return toast.info('Already at full HP');
    const result = rollHitDie(hitDieInfo.sides, mod(character.constitution));
    saveLocal({
      current_hit_points: Math.min(maxHp, currentHp + result.total),
      hit_dice_remaining: Math.max(0, hitDiceRemaining - 1),
    }, { success: `Recovered ${result.total} HP locally` });
  };

  const handleRest = (restType) => {
    setSaving(true);
    const isLong = restType === 'long';
    const spellSlots = character.spell_slots || {};
    const next = {
      resources: restoreResources(character.resources, isLong ? 'long-rest' : 'short-rest'),
    };

    if (!isLong && character.character_class === 'Warlock') {
      next.spell_slots_remaining = { ...spellSlots };
    }

    if (isLong) {
      next.current_hit_points = maxHp;
      next.temporary_hit_points = 0;
      next.temp_hp = 0;
      next.spell_slots_remaining = { ...spellSlots };
      next.death_saves_successes = 0;
      next.death_saves_failures = 0;
      next.exhaustion_level = Math.max(0, Number(character.exhaustion_level || 0) - 1);
      next.hit_dice_remaining = Math.min(hitDieInfo.total, hitDiceRemaining + Math.max(1, Math.floor((Number(character.level) || 1) / 2)));
    }

    saveLocal(next, { success: isLong ? 'Long rest applied locally' : 'Short rest applied locally' });
    setSaving(false);
  };

  return (
    <div className="prototype-mobile-lab">
      <aside className="prototype-mobile-rail" aria-label="Prototype sheet sections">
        {SHEET_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)} aria-label={tab.label}>
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </aside>

      <main className="prototype-mobile-main">
        <header className="prototype-mobile-header">
          <div>
            <span>Local Prototype Mode</span>
            <h1>{character.name}</h1>
            <p>{character.race} • {character.character_class} {character.subclass ? `(${character.subclass})` : ''} • Lv {character.level}</p>
          </div>
          <select value={selectedId} onChange={event => switchCharacter(event.target.value)} aria-label="Choose prototype character">
            {classOptions.map(option => (
              <option key={option.id} value={option.id}>{option.className} — {option.name}</option>
            ))}
          </select>
          <div className="prototype-mobile-header-actions">
            <Link to="/prototype">Prototype Hub</Link>
            <button type="button" onClick={() => setCharacter(resetPrototypeCharacter(selectedId))}><RotateCcw size={16} /> Reset</button>
            <Link to="/prototype-gm"><ScrollText size={16} /> Tia-Karta GM</Link>
          </div>
        </header>

        <CleanSheetVitals
          currentHp={currentHp}
          maxHp={maxHp}
          hpAmount={hpAmount}
          tempHp={tempHp}
          tempHpAmount={tempHpAmount}
          savingHp={false}
          savingTempHp={false}
          hitDice={character.hit_dice}
          hitDiceRemaining={hitDiceRemaining}
          hitDiceTotal={hitDieInfo.total}
          onHpAmountChange={setHpAmount}
          onTempHpAmountChange={setTempHpAmount}
          onDamage={() => updateHp(-hpAmount)}
          onHeal={() => updateHp(hpAmount)}
          onRemoveTempHp={() => updateTempHp(-Number(tempHpAmount || 1))}
          onAddTempHp={() => updateTempHp(Number(tempHpAmount || 1))}
          onSpendHitDie={spendHitDie}
        />

        <CleanSheetPlayTools
          activeConditions={character.conditions || []}
          concentratingName={concentratingName}
          concentrationInput={concentrationInput}
          currentHp={currentHp}
          deathSaveFailures={deathSaveFailures}
          deathSaveSuccesses={deathSaveSuccesses}
          exhaustionLevel={Number(character.exhaustion_level || 0)}
          hitDice={character.hit_dice}
          hitDiceRemaining={hitDiceRemaining}
          maxHp={maxHp}
          passiveScores={passiveScores}
          rollBonus={rollBonus}
          rollHistory={rollHistory}
          rollMode={rollMode}
          savingQuickState={saving}
          showConditionPicker={showConditionPicker}
          showConcentrationInput={showConcentrationInput}
          showDeathSaves={currentHp <= 0 || deathSaveSuccesses > 0 || deathSaveFailures > 0}
          showRollHistory={showRollHistory}
          hasInspiration={Boolean(character.inspiration || character.has_inspiration)}
          onEndConcentration={() => saveLocal({ concentrating_on: '', concentration: '' }, { success: 'Concentration ended locally' })}
          onLongRest={() => handleRest('long')}
          onRollBonusChange={setRollBonus}
          onRollDeathSave={() => makeRoll('Death Save', 0)}
          onRollHistoryToggle={setShowRollHistory}
          onRollModeChange={setRollMode}
          onSaveConcentration={(spellName) => saveLocal({ concentrating_on: spellName, concentration: spellName }, { success: `Concentrating on ${spellName}` })}
          onSetConcentrationInput={setConcentrationInput}
          onShortRest={() => handleRest('short')}
          onShowConditionPickerChange={setShowConditionPicker}
          onShowConcentrationInputChange={setShowConcentrationInput}
          onSpendHitDie={spendHitDie}
          onToggleCondition={(condition) => {
            const active = character.conditions || [];
            saveLocal({ conditions: active.includes(condition) ? active.filter(item => item !== condition) : [...active, condition] });
          }}
          onToggleDeathSave={(type, index) => saveLocal(type === 'success' ? { death_saves_successes: index + 1 } : { death_saves_failures: index + 1 })}
          onToggleInspiration={() => saveLocal({ inspiration: !character.inspiration, has_inspiration: !character.has_inspiration })}
          onResetDeathSaves={() => saveLocal({ death_saves_successes: 0, death_saves_failures: 0 })}
        />

        <section className="prototype-mobile-content">
          {activeTab === 'overview' && <OverviewPanel character={character} />}
          {activeTab === 'combat' && <CombatPanel character={character} onRoll={makeRoll} />}
          {activeTab === 'spells' && <CleanSpellsTab character={character} onCharacterUpdate={saveLocal} />}
          {activeTab === 'inventory' && <InventoryPanel character={character} onUpdate={saveLocal} />}
          {activeTab === 'notes' && <NotesPanel character={character} onUpdate={saveLocal} />}
        </section>
      </main>
    </div>
  );
}
