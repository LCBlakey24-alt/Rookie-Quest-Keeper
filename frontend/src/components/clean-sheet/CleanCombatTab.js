import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getClassResourceRules } from '@/data/classResourceRules';
import { CLASS_FEATURES } from '@/data/classFeatures';
import { getFighterProgressionSummary } from '@/data/fighterProgression';
import BarbarianSummarySection from './BarbarianSummarySection';
import FighterSummarySection from './FighterSummarySection';
import MonkSummarySection from './MonkSummarySection';
import PaladinSummarySection from './PaladinSummarySection';
import RogueSummarySection from './RogueSummarySection';
import { ActionSection, AttackCard, FighterFocusPanel, SimpleActionCard } from './CleanCombatTabCards';
import {
  fmt,
  gatherConsumables,
  gatherEquippedWeapons,
  getFighterCriticalRange,
  getFighterLevel,
  getFighterSubclassKey,
  getItemName,
  getItemQuantity,
  getPotionHealing,
  getSuperiorityDie,
  hasSaveProficiency,
  isFighter,
  mod,
  rollDice,
} from './cleanCombatTabUtils';

export default function CleanCombatTab({ character, ac, speed, proficiencyBonus, onRoll, onCharacterUpdate, onDiceResult }) {
  const [pendingDamage, setPendingDamage] = useState(null);
  const [lastDamage, setLastDamage] = useState(null);
  const [resourceDrafts, setResourceDrafts] = useState({});

  const strengthMod = mod(character?.strength);
  const dexterityMod = mod(character?.dexterity);
  const constitutionMod = mod(character?.constitution);
  const concentrationMod = constitutionMod + (hasSaveProficiency(character, 'constitution') ? proficiencyBonus : 0);
  const bestAbilityMod = Math.max(strengthMod, dexterityMod);
  const bestAttackMod = proficiencyBonus + bestAbilityMod;
  const unarmedDamageMod = Math.max(0, strengthMod);
  const className = character?.character_class || 'Adventurer';
  const fighterLevel = getFighterLevel(character);
  const fighterSubclass = getFighterSubclassKey(character);
  const fighterData = CLASS_FEATURES.fighter;
  const fighterRulesEdition = String(character?.rules_edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
  const fighterProgression = getFighterProgressionSummary(fighterLevel || 1, fighterRulesEdition);
  const fighterPlan = {
    attacksPerAction: fighterProgression.attacksPerAction,
    criticalRange: getFighterCriticalRange(character, fighterLevel),
    fightingStyle: character?.fighting_style || character?.fightingStyle || '',
    subclassLabel: fighterData?.subclasses?.[fighterSubclass]?.name || (fighterLevel >= 3 ? 'Choose/record subclass' : 'None yet'),
    rulesEdition: fighterRulesEdition,
    superiorityDie: getSuperiorityDie(fighterLevel),
    actionSurgeUses: fighterProgression.actionSurgeUses,
    indomitableUses: fighterProgression.indomitableUses,
    currentLevelFeatures: fighterProgression.currentLevelFeatures,
    nextFeatures: fighterProgression.nextFeatures,
  };
  const fighterManeuvers = [
    ...(character?.maneuvers || []),
    ...(character?.battle_master_maneuvers || []),
  ];
  const concentratingOn = character?.concentrating_on || character?.concentration || '';

  const equippedWeaponAttacks = useMemo(
    () => gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus],
  );

  const consumables = useMemo(() => gatherConsumables(character), [character]);

  const attackOptions = useMemo(() => ([
    ...(equippedWeaponAttacks.length > 0 ? equippedWeaponAttacks : [{
      id: 'main-attack',
      title: 'Weapon Attack',
      type: 'Action',
      attackLabel: 'Weapon Attack',
      details: 'Fallback weapon attack',
      attackMod: bestAttackMod,
      saveText: null,
      damageText: `1d8 ${fmt(bestAbilityMod)}`,
      damageType: 'weapon',
      damage: { label: 'Weapon Damage', count: 1, sides: 8, modifier: bestAbilityMod, damageType: 'weapon' },
    }]),
    {
      id: 'unarmed-strike',
      title: 'Unarmed Strike',
      type: 'Action',
      attackLabel: 'Unarmed Strike',
      details: 'Punch, kick, headbutt, or similar',
      attackMod: proficiencyBonus + strengthMod,
      saveText: null,
      damageText: `1 ${unarmedDamageMod ? fmt(unarmedDamageMod) : ''}`.trim(),
      damageType: 'bludgeoning',
      damage: { label: 'Unarmed Damage', count: 1, sides: 1, modifier: unarmedDamageMod, damageType: 'bludgeoning' },
    },
  ]), [bestAbilityMod, bestAttackMod, equippedWeaponAttacks, proficiencyBonus, strengthMod, unarmedDamageMod]);

  const classResources = useMemo(() => {
    const resources = character?.resources || {};
    return getClassResourceRules(character).map(rule => {
      const raw = resources[rule.key] || {};
      const max = Number(raw.max ?? raw.total ?? rule.maxValue ?? 0) || 0;
      const current = Number(resourceDrafts[rule.key] ?? raw.current ?? raw.remaining ?? max) || 0;
      return {
        key: rule.key,
        className: rule.className,
        label: rule.label,
        current: Math.max(0, Math.min(max, current)),
        max,
      };
    }).filter(resource => resource.max > 0);
  }, [character, resourceDrafts]);

  const rollAttack = (attack) => {
    onRoll(attack.attackLabel, attack.attackMod ?? bestAttackMod);
    setPendingDamage(attack.damage);
    setLastDamage(null);
  };

  const rollDamage = (damage) => {
    const result = rollDice(damage.count, damage.sides, damage.modifier);
    setLastDamage({ ...damage, ...result });
    setPendingDamage(null);
    onDiceResult?.({
      id: `${Date.now()}-damage`,
      label: damage.label || 'Damage',
      rolls: result.rolls,
      sides: damage.sides,
      modifier: damage.modifier,
      total: result.total,
      mode: 'damage',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    toast.success(`${damage.label || 'Damage'}: ${result.total} ${damage.damageType || ''}`.trim());
  };

  const rollConcentrationSave = () => onRoll('Concentration Save', concentrationMod);

  const saveConcentration = async (value) => {
    if (!onCharacterUpdate) return;
    await onCharacterUpdate({ concentrating_on: value, concentration: value }, { error: 'Could not update concentration' });
  };

  const updateResource = async (resource, delta) => {
    const next = Math.max(0, Math.min(resource.max, resource.current + delta));
    setResourceDrafts(prev => ({ ...prev, [resource.key]: next }));
    if (!onCharacterUpdate) return;
    const nextResources = {
      ...(character?.resources || {}),
      [resource.key]: {
        ...(character?.resources?.[resource.key] || {}),
        current: next,
        remaining: next,
        max: resource.max,
      },
    };
    const ok = await onCharacterUpdate({ resources: nextResources }, { error: `Could not update ${resource.label}` });
    if (ok !== false) toast.success(`${resource.label}: ${next}/${resource.max}`);
  };

  const spendResourceAndPatch = async (resourceKey, updates, label, preferredClassName = '') => {
    const preferred = preferredClassName
      ? classResources.find(item => item.key === resourceKey && item.className === preferredClassName)
      : null;
    const resource = preferred || classResources.find(item => item.key === resourceKey);
    if (!resource || resource.current <= 0 || !onCharacterUpdate) return false;
    const next = Math.max(0, resource.current - 1);
    setResourceDrafts(prev => ({ ...prev, [resource.key]: next }));
    const nextResources = {
      ...(character?.resources || {}),
      [resource.key]: {
        ...(character?.resources?.[resource.key] || {}),
        current: next,
        remaining: next,
        max: resource.max,
      },
    };
    const ok = await onCharacterUpdate({ ...updates, resources: nextResources }, { error: `Could not use ${label}` });
    if (ok !== false) toast.success(`${label}: ${next}/${resource.max} remaining`);
    return ok !== false;
  };

  const handleSecondWind = async () => {
    const heal = rollDice(1, 10, fighterLevel);
    const maxHp = Number(character?.max_hit_points || character?.max_hp || 10);
    const currentHp = Number(character?.current_hit_points ?? character?.hp ?? maxHp);
    const nextHp = Math.min(maxHp, currentHp + heal.total);
    onDiceResult?.({
      id: `${Date.now()}-second-wind`,
      label: 'Second Wind',
      rolls: heal.rolls,
      sides: 10,
      modifier: fighterLevel,
      total: heal.total,
      mode: 'healing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    await spendResourceAndPatch('second_wind', { current_hit_points: nextHp }, 'Second Wind', 'Fighter');
  };

  const handleActionSurge = async () => {
    await spendResourceAndPatch('action_surge', {}, 'Action Surge', 'Fighter');
  };

  const handleIndomitable = async () => {
    await spendResourceAndPatch('indomitable', {}, 'Indomitable', 'Fighter');
  };

  const handleManeuver = async (name) => {
    const ok = await spendResourceAndPatch('superiority_dice', {}, name, 'Fighter');
    if (ok) toast.info(`Apply ${name}: add d${fighterPlan.superiorityDie} superiority die where the maneuver says.`);
  };

  const handleSpendDiscipline = async (technique) => {
    const labels = { flurry: 'Flurry of Blows', patient: 'Patient Defense', step: 'Step of the Wind' };
    await spendResourceAndPatch('ki', {}, labels[technique] || 'Monk Discipline', 'Monk');
  };

  const handleLayOnHands = async () => {
    await spendResourceAndPatch('lay_on_hands', {}, 'Lay on Hands', 'Paladin');
  };

  const handleChannelDivinity = async () => {
    await spendResourceAndPatch('channel_divinity', {}, 'Channel Divinity', 'Paladin');
  };

  const useConsumable = async (item) => {
    const heal = getPotionHealing(item);
    const result = rollDice(heal.count, heal.sides, heal.modifier);
    toast.success(`${getItemName(item)} heals ${result.total} HP`);
    if (!onCharacterUpdate) return;
    const inventory = [...(character?.inventory || [])];
    const equipment = [...(character?.equipment || [])];
    const source = inventory.includes(item) ? inventory : equipment;
    const sourceIndex = source.findIndex(entry => entry === item);
    if (sourceIndex >= 0 && typeof source[sourceIndex] === 'object') {
      const qty = getItemQuantity(source[sourceIndex]);
      if (qty && qty > 1) source[sourceIndex] = { ...source[sourceIndex], quantity: qty - 1, qty: qty - 1 };
      else source.splice(sourceIndex, 1);
    }
    await onCharacterUpdate({
      current_hit_points: Math.min(Number(character?.max_hit_points || 10), Number(character?.current_hit_points || 0) + result.total),
      inventory,
      equipment,
    }, { error: 'Could not use consumable' });
  };

  return (
    <div className="clean-sheet-combat-wrap clean-sheet-actions-tab">
      <div className="clean-sheet-grid">
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-actions-hero">
          <div>
            <h2>Actions</h2>
            <p className="clean-sheet-muted">
              Main actions, bonus actions, reactions, attacks, class resources, concentration, and quick combat choices.
            </p>
          </div>
          <div className="clean-sheet-combat-summary clean-sheet-actions-summary">
            <div><span>Armor Class</span><strong>{ac}</strong></div>
            <div><span>Speed</span><strong>{speed}ft</strong></div>
            <div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong></div>
            <div><span>Best Attack</span><strong>{fmt(bestAttackMod)}</strong></div>
          </div>
        </section>

        <ActionSection title="Main Actions / Attacks">
          {attackOptions.map(attack => (
            <AttackCard
              key={attack.id}
              action={attack}
              onAttack={() => rollAttack(attack)}
              onDamage={() => rollDamage(attack.damage)}
              active={pendingDamage?.label === attack.damage.label}
            >
              {pendingDamage?.label === attack.damage.label && (
                <div className="clean-sheet-pending-damage">
                  <span>Attack rolled. If it hits, use the damage box on this card.</span>
                  <button type="button" onClick={() => setPendingDamage(null)}>Cancel</button>
                </div>
              )}
            </AttackCard>
          ))}
          <SimpleActionCard title="Dash" description="Gain extra movement equal to your speed this turn." />
          <SimpleActionCard title="Disengage" description="Your movement does not provoke opportunity attacks this turn." />
          <SimpleActionCard title="Dodge" description="Attack rolls against you have disadvantage until your next turn." />
          <SimpleActionCard title="Help" description="Give an ally advantage on a relevant check or attack." />
          <SimpleActionCard title="Ready" description="Prepare an action to trigger later this round." />
        </ActionSection>

        <ActionSection title="Bonus Actions">
          <SimpleActionCard title="Off-hand Attack" type="Bonus" description="Use when dual-wielding after taking the Attack action." onClick={() => onRoll('Off-hand Attack', bestAttackMod)} />
          {className === 'Rogue' && <SimpleActionCard title="Cunning Action" type="Bonus" description="Dash, Disengage, or Hide as a bonus action." />}
          {className === 'Monk' && <SimpleActionCard title="Martial Arts" type="Bonus" description="Make one unarmed strike after attacking with a monk weapon or unarmed strike." onClick={() => onRoll('Martial Arts', bestAttackMod)} />}
          {className === 'Barbarian' && <SimpleActionCard title="Rage" type="Bonus" description="Enter a rage if you have uses remaining; apply your sheet's Rage bonus and resistances." />}
          {isFighter(character) && <SimpleActionCard title="Second Wind" type="Bonus" description={`Regain 1d10 + ${fighterLevel} HP if you have a use remaining.`} onClick={handleSecondWind} />}
          <SimpleActionCard title="Use Class Feature" type="Bonus" description="Use any bonus action feature granted by class, race, feat, spell, or item." />
        </ActionSection>

        <ActionSection title="Reactions">
          <SimpleActionCard title="Opportunity Attack" type="Reaction" description="Attack a creature that leaves your reach." onClick={() => onRoll('Opportunity Attack', bestAttackMod)} />
          <SimpleActionCard title="Readied Action" type="Reaction" description="Use your reaction to trigger a previously readied action." />
          <SimpleActionCard title="Use Reaction Feature" type="Reaction" description="Use a reaction from a class feature, race, feat, spell, or item." />
        </ActionSection>

        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-actions-tools">
          <h2>Action Tools</h2>
          <div className="clean-sheet-combat-tools">
            <div className="clean-sheet-concentration-box">
              <span>Concentration</span>
              <input
                value={concentratingOn}
                onChange={(event) => saveConcentration(event.target.value)}
                placeholder="Spell or effect…"
                aria-label="Concentration spell or effect"
              />
              <button type="button" onClick={rollConcentrationSave}>Roll Save {fmt(concentrationMod)}</button>
              {concentratingOn && <button type="button" onClick={() => saveConcentration('')}>Clear</button>}
            </div>

            {classResources.length > 0 && (
              <div className="clean-sheet-resource-grid">
                {classResources.map(resource => (
                  <div key={`${resource.className || 'class'}-${resource.key}`} className="clean-sheet-resource-card">
                    <span>{resource.label}</span>
                    <strong>{resource.current}/{resource.max}</strong>
                    <div>
                      <button type="button" onClick={() => updateResource(resource, -1)} disabled={resource.current <= 0}>Use</button>
                      <button type="button" onClick={() => updateResource(resource, 1)} disabled={resource.current >= resource.max}>Restore</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {consumables.length > 0 && (
              <div className="clean-sheet-consumable-strip">
                <span>Quick Consumables</span>
                {consumables.map((item, index) => (
                  <button key={`${getItemName(item)}-${index}`} type="button" onClick={() => useConsumable(item)}>
                    {getItemName(item)}{getItemQuantity(item) ? ` x${getItemQuantity(item)}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {lastDamage && (
            <div className="clean-sheet-damage-result">
              <span>{lastDamage.label}</span>
              <strong>{lastDamage.total}</strong>
              <em>{lastDamage.notation} ({lastDamage.rolls.join(' + ')}) {lastDamage.damageType || ''}</em>
            </div>
          )}
        </section>

        <FighterFocusPanel
          fighterLevel={fighterLevel}
          fighterSubclass={fighterSubclass}
          fighterPlan={fighterPlan}
          maneuvers={fighterManeuvers}
          resources={classResources}
          onSecondWind={handleSecondWind}
          onActionSurge={handleActionSurge}
          onIndomitable={handleIndomitable}
          onManeuver={handleManeuver}
        />
        <FighterSummarySection character={character} />
        <BarbarianSummarySection character={character} />
        <MonkSummarySection character={character} resources={classResources} onSpendDiscipline={handleSpendDiscipline} />
        <PaladinSummarySection character={character} resources={classResources} onLayOnHands={handleLayOnHands} onChannelDivinity={handleChannelDivinity} />
        <RogueSummarySection character={character} />
      </div>
    </div>
  );
}
