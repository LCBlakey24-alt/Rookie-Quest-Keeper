import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import CleanCombatTab from '@/components/clean-sheet/CleanCombatTab';
import CleanInventoryTab from '@/components/clean-sheet/CleanInventoryTab';
import CleanNotesTab from '@/components/clean-sheet/CleanNotesTab';
import CleanSheetCharacterTab from '@/components/clean-sheet/CleanSheetCharacterTab';
import CleanSheetCompactStatus from '@/components/clean-sheet/CleanSheetCompactStatus';
import CleanSheetFeatsTab from '@/components/clean-sheet/CleanSheetFeatsTab';
import CleanSheetFeaturesTab from '@/components/clean-sheet/CleanSheetFeaturesTab';
import CleanSheetHeader from '@/components/clean-sheet/CleanSheetHeader';
import CleanSheetOverviewTab from '@/components/clean-sheet/CleanSheetOverviewTab';
import CleanSheetPlayTools from '@/components/clean-sheet/CleanSheetPlayTools';
import CleanSheetSpeciesTab from '@/components/clean-sheet/CleanSheetSpeciesTab';
import CleanSheetTabs from '@/components/clean-sheet/CleanSheetTabs';
import CleanSpellsTab from '@/components/clean-sheet/CleanSpellsTab';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import LevelUpWizard from '@/components/LevelUpWizard';
import RookPlayerHelperTab from '@/components/clean-sheet/RookPlayerHelperTab';
import { deriveArmorClass } from '@/data/characterCombatDerivations';
import { getClassFeatures } from '@/data/classFeatures';
import { restoreClassResources } from '@/data/classResourceRules';
import {
  PASSIVE_SKILLS,
  SHEET_TABS,
  calculateHpDamage,
  calculateHpHealing,
  clampDeathCount,
  featureTypeLabel,
  getCurrentHp,
  getMaxHp,
  getTempHp,
  mod,
  parseHitDie,
  rollD20,
  rollHitDie,
  toArray,
} from '@/components/clean-sheet/cleanSheetUtils';
import '@/components/clean-sheet/CleanCharacterSheetPolish.css';
import '@/components/clean-sheet/CleanSheetListPolish.css';
import '@/components/clean-sheet/CleanSheetMobileBoxGrid.css';
import '@/components/clean-sheet/CleanSheetSunsetFinal.css';

const hasObjectItems = (value = {}) => Object.keys(value || {}).length > 0;
const hasAnyText = (...values) => values.some(value => String(value || '').trim().length > 0);

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
  const [activeTab, setActiveTab] = useState('character');
  const [rollBurst, setRollBurst] = useState(null);
  const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
  const [rollHistory, setRollHistory] = useState([]);
  const [showRollHistory, setShowRollHistory] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [rollMode, setRollMode] = useState('normal');
  const [rollBonus, setRollBonus] = useState(0);
  const [concentrationInput, setConcentrationInput] = useState('');
  const [showConcentrationInput, setShowConcentrationInput] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCharacter() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/characters/${characterId}`);
        if (!cancelled) setCharacter(response.data);
      } catch (error) {
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load character');
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
    const timeout = setTimeout(() => setRollBurst(null), 9000);
    return () => clearTimeout(timeout);
  }, [rollBurst]);

  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = getTempHp(character);
  const conMod = mod(character?.constitution);
  const proficiencyBonus = Number(character?.proficiency_bonus) || 2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
  const ac = deriveArmorClass(character);
  const speed = Number(character?.speed ?? 30);
  const skillProficiencies = character?.skill_proficiencies || [];
  const saveProficiencies = character?.saving_throw_proficiencies || [];
  const activeConditions = character?.conditions || [];
  const exhaustionLevel = Number(character?.exhaustion_level || 0);
  const deathSaveSuccesses = clampDeathCount(character?.death_saves_successes);
  const deathSaveFailures = clampDeathCount(character?.death_saves_failures);
  const hasInspiration = Boolean(character?.inspiration || character?.has_inspiration);
  const concentratingOn = character?.concentrating_on || character?.concentration || null;
  const concentratingName = concentratingOn ? (typeof concentratingOn === 'string' ? concentratingOn : concentratingOn?.name || String(concentratingOn)) : null;
  const hitDice = character?.hit_dice || `${character?.level || 1}d8`;
  const hitDieInfo = parseHitDie(hitDice);
  const hitDiceRemaining = Number(character?.hit_dice_remaining ?? character?.level ?? hitDieInfo.total) || 0;
  const showDeathSaves = currentHp <= 0 || deathSaveSuccesses > 0 || deathSaveFailures > 0;

  const passiveScores = useMemo(() => {
    return PASSIVE_SKILLS.map(([skill, ability]) => {
      const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
      return [skill, 10 + mod(character?.[ability]) + (proficient ? proficiencyBonus : 0)];
    });
  }, [character, proficiencyBonus, skillProficiencies]);

  const rulesEdition = String(character?.rules_edition || character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
  const personalityMissing = !hasAnyText(
    character?.personality_trait,
    character?.personality_traits,
    character?.ideal,
    character?.ideals,
    character?.bond,
    character?.bonds,
    character?.flaw,
    character?.flaws,
  );
  const speciesTraitsMissing = !toArray(character?.racial_traits || character?.species_traits || character?.traits).length;
  const languagesMissing = !toArray(character?.languages).length;
  const featsMissing = rulesEdition === '2024' && !toArray(character?.feats).length;
  const hasSpellcasting = Boolean(
    character?.spellcasting_ability ||
    hasObjectItems(character?.spell_slots) ||
    hasObjectItems(character?.spell_slots_remaining)
  );
  const spellChoicesMissing = hasSpellcasting && (
    !toArray(character?.cantrips_known || character?.cantrips).length ||
    ![
      ...toArray(character?.spells_known || character?.known_spells),
      ...toArray(character?.spells_prepared || character?.prepared_spells),
      ...toArray(character?.spellbook),
    ].length
  );
  const equipmentMissing = !toArray(character?.starting_equipment || character?.startingEquipment).length && !toArray(character?.equipment).length && !toArray(character?.inventory).length;
  const shoppingByGold = toArray(character?.starting_equipment || character?.startingEquipment).some(item => /starting gold|shopping/i.test(String(item)));
  const classMissing = !toArray(character?.class_features || character?.features).length;
  const tabAttention = {
    character: personalityMissing || !character?.backstory || (!character?.appearance && !character?.portrait_url),
    inventory: equipmentMissing || shoppingByGold,
    spells: spellChoicesMissing,
    class: classMissing,
    species: speciesTraitsMissing || languagesMissing,
    feats: featsMissing,
  };
  const sheetTabs = useMemo(() => SHEET_TABS.map(tab => ({
    ...tab,
    label: tab.id === 'species' ? (rulesEdition === '2024' ? 'Species' : 'Race') : tab.label,
    needsAttention: Boolean(tabAttention[tab.id]),
  })), [rulesEdition, tabAttention.character, tabAttention.inventory, tabAttention.spells, tabAttention.class, tabAttention.species, tabAttention.feats]);

  const classFeatureSummary = useMemo(() => {
    const className = character?.character_class;
    const level = Number(character?.level || 1);
    const tableFeatures = getClassFeatures(className, level, rulesEdition);
    const characterFeatures = toArray(character?.features || character?.class_features).map((feature, index) => (
      typeof feature === 'string'
        ? { name: feature, description: 'Saved on this character sheet.', type: 'passive', level: null, source: 'sheet' }
        : { ...feature, name: feature?.name || `Feature ${index + 1}`, source: 'sheet' }
    ));
    const merged = [...tableFeatures, ...characterFeatures];
    const seen = new Set();
    return merged
      .filter(feature => feature?.name && !feature.isChoice)
      .filter(feature => {
        const key = `${feature.name}-${feature.level || ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
  }, [character, rulesEdition]);

  const actionEconomyGroups = useMemo(() => {
    const groups = { Action: [], 'Bonus action': [], Reaction: [], Passive: [] };
    classFeatureSummary.forEach(feature => {
      const label = featureTypeLabel(feature.type);
      if (label === 'Action' || label === 'Special') groups.Action.push(feature);
      else if (label === 'Bonus action') groups['Bonus action'].push(feature);
      else if (label === 'Reaction') groups.Reaction.push(feature);
      else groups.Passive.push(feature);
    });
    return groups;
  }, [classFeatureSummary]);

  const proficiencySummary = useMemo(() => ([
    ['Armor', toArray(character?.armor_proficiencies || character?.proficiencies?.armor)],
    ['Weapons', toArray(character?.weapon_proficiencies || character?.proficiencies?.weapons)],
    ['Tools', toArray(character?.tool_proficiencies || character?.proficiencies?.tools)],
    ['Languages', toArray(character?.languages || character?.proficiencies?.languages)],
  ]), [character]);

  const getSafeAmount = (value) => Math.max(1, Math.min(999, Number(value) || 1));
  const getRollBonus = () => Number(rollBonus) || 0;

  const patchCharacter = async (updates, options = {}) => {
    const previous = character;
    setCharacter(prev => (prev ? { ...prev, ...updates } : prev));
    try {
      const response = await apiClient.patch(`/characters/${characterId}`, updates);
      if (response?.data && typeof response.data === 'object') setCharacter(response.data.character || response.data);
      if (options.success) toast.success(options.success);
      return true;
    } catch (error) {
      setCharacter(previous);
      toast.error(error?.formattedDetail || error?.response?.data?.detail || options.error || 'Could not save character update');
      return false;
    }
  };

  const updateHp = async (delta) => {
    if (!character || savingHp) return;
    const amount = Math.abs(Number(delta) || 0);
    const result = delta < 0
      ? calculateHpDamage({ currentHp, tempHp, maxHp, amount })
      : calculateHpHealing({ currentHp, maxHp, amount });
    const nextHp = result.current_hit_points;
    const updates = { current_hit_points: nextHp };
    if (delta < 0) {
      updates.temporary_hit_points = result.temporary_hit_points;
      updates.temp_hp = result.temp_hp;
    }
    if (nextHp > 0 && (deathSaveSuccesses || deathSaveFailures)) {
      updates.death_saves_successes = 0;
      updates.death_saves_failures = 0;
    }
    setSavingHp(true);
    await patchCharacter(updates, { error: 'Could not save HP' });
    setSavingHp(false);

    if (delta < 0 && character?.concentrating_on && result.hpDamage > 0) {
      const damageTaken = result.hpDamage;
      const concentrationDC = Math.max(10, Math.floor(damageTaken / 2));
      const spellName = character.concentrating_on?.name || character.concentrating_on;
      toast.warning(`Concentration check! Concentrating on ${spellName} — DC ${concentrationDC} Constitution save`, { duration: 8000 });
    }
  };

  const updateTempHp = async (delta) => {
    if (!character || savingTempHp) return;
    const nextTempHp = Math.max(0, tempHp + Number(delta || 0));
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

  const updateCharacterLocal = (updates) => setCharacter(prev => (prev ? { ...prev, ...updates } : prev));

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
    await patchCharacter({ conditions: nextConditions }, { error: 'Could not save condition' });
    setSavingQuickState(false);
  };

  const setDeathSaveCount = async (type, index) => {
    const current = type === 'success' ? deathSaveSuccesses : deathSaveFailures;
    const next = current === index + 1 ? index : index + 1;
    await patchCharacter(
      type === 'success' ? { death_saves_successes: next } : { death_saves_failures: next },
      { error: 'Could not save death save' }
    );
  };

  const resetDeathSaves = async () => {
    await patchCharacter({ death_saves_successes: 0, death_saves_failures: 0 }, { success: 'Death saves reset', error: 'Could not reset death saves' });
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
      await patchCharacter({ current_hit_points: 1, death_saves_successes: 0, death_saves_failures: 0 }, { success: 'Natural 20! You regain 1 HP.', error: 'Could not save death save result' });
      return;
    }
    if (roll === 1) {
      await patchCharacter({ death_saves_failures: Math.min(3, deathSaveFailures + 2) }, { success: 'Natural 1: two failures marked.', error: 'Could not save death save result' });
      return;
    }
    if (roll >= 10) {
      await patchCharacter({ death_saves_successes: Math.min(3, deathSaveSuccesses + 1) }, { success: 'Death save success marked.', error: 'Could not save death save result' });
    } else {
      await patchCharacter({ death_saves_failures: Math.min(3, deathSaveFailures + 1) }, { success: 'Death save failure marked.', error: 'Could not save death save result' });
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
    await patchCharacter({ current_hit_points: nextHp, hit_dice_remaining: Math.max(0, hitDiceRemaining - 1) }, { success: `Recovered ${nextHp - currentHp} HP`, error: 'Could not spend hit die' });
    setSavingQuickState(false);
  };

  const buildRestFallback = (restType) => {
    const restoreType = restType === 'long' ? 'long-rest' : 'short-rest';
    const updates = { resources: restoreClassResources(character, restoreType) };
    if (restType === 'long') {
      updates.current_hit_points = maxHp;
      updates.temporary_hit_points = 0;
      updates.temp_hp = 0;
      updates.death_saves_successes = 0;
      updates.death_saves_failures = 0;
      updates.spell_slots_remaining = character?.spell_slots || {};
      updates.hit_dice_remaining = Number(character?.level || hitDieInfo.total);
    }
    return updates;
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
      await patchCharacter(buildRestFallback(restType), { success: restType === 'long' ? 'Long rest applied' : 'Short rest applied', error: `Could not apply ${restType} rest` });
    } finally {
      setSavingQuickState(false);
    }
  };

  const saveConcentration = async (spellName) => {
    await patchCharacter({ concentrating_on: spellName, concentration: spellName }, { success: `Concentrating on ${spellName}` });
    setConcentrationInput('');
    setShowConcentrationInput(false);
  };

  const endConcentration = async () => {
    await patchCharacter({ concentrating_on: null, concentration: null }, { success: 'Concentration ended' });
  };

  const handleSelectTab = (tab) => {
    if (tab?.action === 'levelup') {
      setShowLevelUpWizard(true);
      return;
    }
    setActiveTab(tab?.id || tab);
  };

  const playTools = (
    <CleanSheetPlayTools
      activeConditions={activeConditions}
      concentratingName={concentratingName}
      concentrationInput={concentrationInput}
      currentHp={currentHp}
      deathSaveFailures={deathSaveFailures}
      deathSaveSuccesses={deathSaveSuccesses}
      exhaustionLevel={exhaustionLevel}
      hasInspiration={hasInspiration}
      hitDice={hitDice}
      hitDiceRemaining={hitDiceRemaining}
      maxHp={maxHp}
      passiveScores={passiveScores}
      rollBonus={rollBonus}
      rollHistory={rollHistory}
      rollMode={rollMode}
      savingQuickState={savingQuickState}
      showConditionPicker={showConditionPicker}
      showConcentrationInput={showConcentrationInput}
      showDeathSaves={showDeathSaves}
      showRollHistory={showRollHistory}
      onEndConcentration={endConcentration}
      onLongRest={() => handleRest('long')}
      onRollBonusChange={setRollBonus}
      onRollDeathSave={rollDeathSave}
      onRollHistoryToggle={setShowRollHistory}
      onRollModeChange={setRollMode}
      onSaveConcentration={saveConcentration}
      onSetConcentrationInput={setConcentrationInput}
      onShortRest={() => handleRest('short')}
      onShowConditionPickerChange={setShowConditionPicker}
      onShowConcentrationInputChange={setShowConcentrationInput}
      onSpendHitDie={spendHitDie}
      onToggleCondition={toggleCondition}
      onToggleDeathSave={setDeathSaveCount}
      onToggleInspiration={toggleInspiration}
      onResetDeathSaves={resetDeathSaves}
    />
  );

  const combatTools = (
    <CleanCombatTab
      character={character}
      ac={ac}
      speed={speed}
      proficiencyBonus={proficiencyBonus}
      onRoll={makeRoll}
      onCharacterUpdate={patchCharacter}
      onDiceResult={(entry) => {
        setRollBurst(entry);
        setRollHistory(prev => [entry, ...prev].slice(0, 12));
      }}
    />
  );

  if (loading) {
    return (
      <div className="clean-sheet-page character-page-v2 clean-sheet-loading">
        <img src="/brand/rqk-logo-mini.svg" alt="Rookie Quest Keeper" />
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
        <DiceRollFlicker
          isOpen={Boolean(rollBurst)}
          onClose={() => setRollBurst(null)}
          label={rollBurst.label}
          rolls={(rollBurst.rolls || rollBurst.allRolls || [rollBurst.d20]).filter(value => value !== undefined).map(value => ({
            sides: rollBurst.sides || (rollBurst.mode === 'hit-die' ? hitDieInfo.sides : 20),
            result: typeof value === 'object' ? value.result : value,
          }))}
          modifier={rollBurst.modifier}
          total={rollBurst.total}
          isCrit={rollBurst.mode !== 'hit-die' && rollBurst.d20 === 20}
          isFumble={rollBurst.mode !== 'hit-die' && rollBurst.d20 === 1}
          theme="player"
        />
      )}

      <CleanSheetHeader
        character={character}
        subtitle={subtitle}
        onEdit={() => navigate(`/characters/${character.id}/edit`)}
        onLevelUp={() => setShowLevelUpWizard(true)}
      />

      <CleanSheetCompactStatus
        currentHp={currentHp}
        maxHp={maxHp}
        tempHp={tempHp}
        hpAmount={hpAmount}
        tempHpAmount={tempHpAmount}
        savingHp={savingHp}
        savingTempHp={savingTempHp}
        onHpAmountChange={setHpAmount}
        onTempHpAmountChange={setTempHpAmount}
        onDamage={() => updateHp(-getSafeAmount(hpAmount))}
        onHeal={() => updateHp(getSafeAmount(hpAmount))}
        onTempHpAdd={() => updateTempHp(getSafeAmount(tempHpAmount || hpAmount))}
        onTempHpRemove={() => updateTempHp(-getSafeAmount(tempHpAmount || hpAmount))}
      />

      <CleanSheetTabs tabs={sheetTabs} activeTab={activeTab} onSelectTab={handleSelectTab} onBack={() => navigate('/home')} />

      <main className="clean-sheet-content">
        {activeTab === 'character' && (
          <CleanSheetCharacterTab
            character={character}
            ac={ac}
            speed={speed}
            proficiencyBonus={proficiencyBonus}
          />
        )}
        {activeTab === 'stats' && (
          <CleanSheetOverviewTab
            character={character}
            ac={ac}
            speed={speed}
            proficiencyBonus={proficiencyBonus}
            passiveScores={passiveScores}
            saveProficiencies={saveProficiencies}
            skillProficiencies={skillProficiencies}
            onRoll={makeRoll}
          />
        )}
        {activeTab === 'turn' && playTools}
        {activeTab === 'combat' && combatTools}
        {activeTab === 'rook' && <RookPlayerHelperTab character={character} />}
        {activeTab === 'spells' && <CleanSpellsTab character={character} onCharacterUpdate={patchCharacter} />}
        {activeTab === 'inventory' && <CleanInventoryTab character={character} onCharacterUpdate={updateCharacterLocal} onRoll={makeRoll} />}
        {activeTab === 'class' && (
          <CleanSheetFeaturesTab
            ac={ac}
            actionEconomyGroups={actionEconomyGroups}
            character={character}
            classFeatureSummary={classFeatureSummary}
            exhaustionLevel={exhaustionLevel}
            proficiencyBonus={proficiencyBonus}
            proficiencySummary={proficiencySummary}
            rulesEdition={rulesEdition}
            speed={speed}
            onOpenInventory={() => setActiveTab('inventory')}
          />
        )}
        {activeTab === 'features' && (
          <CleanSheetFeaturesTab
            ac={ac}
            actionEconomyGroups={actionEconomyGroups}
            character={character}
            classFeatureSummary={classFeatureSummary}
            exhaustionLevel={exhaustionLevel}
            proficiencyBonus={proficiencyBonus}
            proficiencySummary={proficiencySummary}
            rulesEdition={rulesEdition}
            speed={speed}
            onOpenInventory={() => setActiveTab('inventory')}
          />
        )}
        {activeTab === 'species' && <CleanSheetSpeciesTab character={character} rulesEdition={rulesEdition} />}
        {activeTab === 'feats' && <CleanSheetFeatsTab character={character} />}
        {activeTab === 'notes' && <CleanNotesTab character={character} onCharacterUpdate={updateCharacterLocal} />}
      </main>
    </div>
  );
}
