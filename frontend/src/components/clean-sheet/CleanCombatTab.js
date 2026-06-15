import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getClassResourceRules } from '@/data/classResourceRules';
import { CLASS_FEATURES } from '@/data/classFeatures';
import { getFighterProgressionSummary } from '@/data/fighterProgression';
import { findWeaponRule, getWeaponAbilityMod } from '@/data/equipmentRules5e';
import FighterSummarySection from './FighterSummarySection';
import BarbarianSummarySection from './BarbarianSummarySection';
import RogueSummarySection from './RogueSummarySection';
import MonkSummarySection from './MonkSummarySection';
import { isBarbarianCharacter } from '@/data/barbarianCharacterShape';
import { isRogueCharacter } from '@/data/rogueCharacterShape';
import { isMonkCharacter } from '@/data/monkCharacterShape';

const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

function hasSaveProficiency(character, ability) {
  const saves = character?.saving_throw_proficiencies || [];
  const short = ability.slice(0, 3).toLowerCase();
  return saves.some(save => String(save).toLowerCase() === ability || String(save).toLowerCase() === short);
}

function rollDice(count = 1, sides = 8, modifier = 0) {
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = Math.max(1, rolls.reduce((sum, value) => sum + value, 0) + modifier);
  return { rolls, total, notation: `${count}d${sides}${modifier ? ` ${fmt(modifier)}` : ''}` };
}

function parseDamageDice(value) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/(\d+)d(\d+)/i);
  if (!match) {
    const flat = Number(text);
    return flat > 0 ? { count: flat, sides: 1 } : null;
  }
  return { count: Number(match[1]), sides: Number(match[2]) };
}

function normaliseName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z]/g, '');
}

function getItemName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.name || item.item_name || item.label || item.title || '';
}

function isFighter(character) {
  return normaliseName(character?.character_class) === 'fighter';
}

function getFighterLevel(character) {
  const classLevels = character?.multiclass_levels || character?.class_levels || {};
  const fighterEntry = Object.entries(classLevels).find(([cls]) => normaliseName(cls) === 'fighter');
  if (fighterEntry) return Number(fighterEntry[1]) || 0;
  return isFighter(character) ? Number(character?.level || 1) || 1 : 0;
}

function getFighterSubclassKey(character) {
  return normaliseName(character?.subclass || '').replace('battlemaster', 'battle_master').replace('eldritchknight', 'eldritch_knight');
}

function getFighterCriticalRange(character, level) {
  const subclass = getFighterSubclassKey(character);
  if (subclass !== 'champion') return 20;
  if (level >= 15) return 18;
  if (level >= 3) return 19;
  return 20;
}

function getSuperiorityDie(level) {
  if (level >= 18) return 12;
  if (level >= 10) return 10;
  return 8;
}

function getItemQuantity(item) {
  if (!item || typeof item === 'string') return null;
  return item.quantity ?? item.qty ?? item.count ?? null;
}

function isWeaponLike(item) {
  const type = normaliseName(item?.type || item?.category || item?.item_type || '');
  return Boolean(
    type.includes('weapon')
    || findWeaponRule(item)
    || item?.damage
    || item?.damage_dice
    || item?.dice
    || item?.damageDice
  );
}

function isConsumableLike(item) {
  const name = normaliseName(getItemName(item));
  const type = normaliseName(item?.type || item?.category || item?.item_type || '');
  return type.includes('consumable') || type.includes('potion') || name.includes('potion') || name.includes('healing');
}

function getPotionHealing(item) {
  const text = `${getItemName(item)} ${item?.description || ''} ${item?.effect || ''}`.toLowerCase();
  if (text.includes('supreme')) return { count: 10, sides: 4, modifier: 20 };
  if (text.includes('superior')) return { count: 8, sides: 4, modifier: 8 };
  if (text.includes('greater')) return { count: 4, sides: 4, modifier: 4 };
  return { count: 2, sides: 4, modifier: 2 };
}

function getWeaponProfile(item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const rule = findWeaponRule(item);
  const name = rule?.name || getItemName(item) || 'Weapon Attack';
  const explicitDice = parseDamageDice(item?.damage || item?.damage_dice || item?.dice || item?.damageDice);
  const ruleDice = parseDamageDice(rule?.damage);
  const dice = explicitDice || ruleDice || { count: 1, sides: 8 };
  const explicitAbility = String(item?.ability || item?.attack_ability || '').toLowerCase();
  const abilityMod = explicitAbility.includes('dex')
    ? dexterityMod
    : explicitAbility.includes('str')
      ? strengthMod
      : getWeaponAbilityMod(rule, strengthMod, dexterityMod);
  const damageType = item?.damage_type || item?.damageType || rule?.damageType || 'weapon';
  const range = item?.range || rule?.range || 'Melee or ranged';
  const properties = item?.properties || item?.property || item?.notes || (rule?.properties || []).join(', ');
  const itemBonus = Number(item?.attack_bonus || 0);
  const attackMod = proficiencyBonus + abilityMod + itemBonus;
  const totalDamageMod = abilityMod + itemBonus;
  const damageText = dice.sides === 1
    ? `${dice.count}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`
    : `${dice.count}d${dice.sides}${totalDamageMod ? ` ${fmt(totalDamageMod)}` : ''}`;

  return {
    id: `weapon-${String(name).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: name,
    type: 'Action',
    attackLabel: `${name} Attack`,
    details: properties ? `${range} • ${properties}` : range,
    attackMod,
    saveText: null,
    damageText,
    damageType,
    damage: { label: `${name} Damage`, count: dice.count, sides: dice.sides, modifier: totalDamageMod, damageType }
  };
}

function gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus) {
  const candidates = [];
  const equipped = character?.equipped || {};
  ['mainHand', 'main_hand', 'weapon', 'offHand', 'off_hand'].forEach(key => { if (equipped?.[key]) candidates.push(equipped[key]); });
  [...(character?.equipment || []), ...(character?.inventory || [])].forEach(item => { if (item?.equipped || item?.is_equipped) candidates.push(item); });
  const weapons = candidates.filter(isWeaponLike).map(item => getWeaponProfile(item, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus));
  const seen = new Set();
  return weapons.filter(weapon => {
    const key = weapon.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function gatherConsumables(character) {
  return [...(character?.equipment || []), ...(character?.inventory || [])].filter(isConsumableLike).slice(0, 6);
}

function AttackCard({ action, onAttack, onDamage, children, active }) {
  const isSave = Boolean(action.saveText);
  return (
    <div className={`clean-sheet-action-card-shell ${active ? 'active' : ''}`}>
      <article className="clean-sheet-action-card clean-sheet-attack-card">
        <div className="clean-sheet-attack-card-top">
          <span className="clean-sheet-action-type">{action.type || 'Action'}</span>
          <strong>{action.title}</strong>
          {action.details && <span className="clean-sheet-attack-details">{action.details}</span>}
        </div>
        <div className="clean-sheet-attack-stat-row">
          <button type="button" onClick={onAttack} className="clean-sheet-attack-stat-box clean-sheet-attack-roll-box"><span>{isSave ? 'Save DC' : 'To Hit'}</span><strong>{action.saveText || fmt(action.attackMod || 0)}</strong></button>
          <button type="button" onClick={onDamage} className="clean-sheet-attack-stat-box clean-sheet-damage-roll-box" disabled={!action.damage}><span>Damage</span><strong>{action.damageText || '—'}</strong></button>
          <div className="clean-sheet-attack-stat-box clean-sheet-attack-detail-box"><span>Details</span><strong>{action.damageType || action.conditionText || 'No extra effect'}</strong></div>
        </div>
      </article>
      {children}
    </div>
  );
}

function SimpleActionCard({ title, description, type = 'Action', onClick }) {
  return (
    <div className="clean-sheet-action-card-shell">
      <button type="button" className="clean-sheet-action-card" onClick={onClick}>
        <span className="clean-sheet-action-type">{type}</span>
        <strong>{title}</strong>
        <span>{description}</span>
      </button>
    </div>
  );
}

function FeatureList({ title, features }) {
  if (!features?.length) return null;
  return (
    <div className="clean-sheet-maneuver-panel">
      <div className="clean-sheet-maneuver-header">
        <strong>{title}</strong>
        <span>{features.length} item{features.length === 1 ? '' : 's'}</span>
      </div>
      <div className="clean-sheet-maneuver-grid">
        {features.map(feature => (
          <div key={`${feature.level}-${feature.key || feature.name}`} className="clean-sheet-action-card">
            <span className="clean-sheet-action-type">Level {feature.level}</span>
            <strong>{feature.name}</strong>
            <span>{feature.choiceType ? `Choice: ${feature.choiceType.replace(/_/g, ' ')}` : feature.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FighterFocusPanel({ fighterLevel, fighterSubclass, fighterPlan, maneuvers, resources, onSecondWind, onActionSurge, onIndomitable, onManeuver }) {
  if (!fighterLevel) return null;
  const actionSurge = resources.find(resource => resource.key === 'action_surge');
  const secondWind = resources.find(resource => resource.key === 'second_wind');
  const indomitable = resources.find(resource => resource.key === 'indomitable');
  const superiority = resources.find(resource => resource.key === 'superiority_dice');
  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="fighter-focus-panel">
      <div className="clean-sheet-fighter-heading">
        <div>
          <h2>Fighter Command</h2>
          <p>Track your core fighter loop: attacks, Action Surge, Second Wind, Indomitable, fighting style, and subclass tools.</p>
        </div>
        <span>Fighter {fighterLevel}</span>
      </div>
      <div className="clean-sheet-fighter-stat-grid">
        <div><span>Attacks/action</span><strong>{fighterPlan.attacksPerAction}</strong><em>Extra Attack included.</em></div>
        <div><span>Critical range</span><strong>{fighterPlan.criticalRange === 20 ? '20' : `${fighterPlan.criticalRange}–20`}</strong><em>{fighterSubclass === 'champion' ? 'Champion improved criticals.' : 'Standard critical range.'}</em></div>
        <div><span>Fighting style</span><strong>{fighterPlan.fightingStyle || 'Pick/record'}</strong><em>Shown from the sheet if saved.</em></div>
        <div><span>Subclass</span><strong>{fighterPlan.subclassLabel}</strong><em>{fighterPlan.rulesEdition} rules.</em></div>
        <div><span>Action Surge uses</span><strong>{fighterPlan.actionSurgeUses}</strong><em>From Fighter progression.</em></div>
        <div><span>Indomitable uses</span><strong>{fighterPlan.indomitableUses}</strong><em>From Fighter progression.</em></div>
      </div>
      <FeatureList title="This level" features={fighterPlan.currentLevelFeatures} />
      <FeatureList title="Coming next" features={fighterPlan.nextFeatures} />
      <div className="clean-sheet-fighter-buttons">
        <button type="button" onClick={onSecondWind} disabled={!secondWind || secondWind.current <= 0}>Second Wind {secondWind ? `${secondWind.current}/${secondWind.max}` : ''}</button>
        <button type="button" onClick={onActionSurge} disabled={!actionSurge || actionSurge.current <= 0}>Action Surge {actionSurge ? `${actionSurge.current}/${actionSurge.max}` : ''}</button>
        <button type="button" onClick={onIndomitable} disabled={!indomitable || indomitable.current <= 0}>Indomitable {indomitable ? `${indomitable.current}/${indomitable.max}` : ''}</button>
      </div>
      {fighterSubclass === 'battle_master' && (
        <div className="clean-sheet-maneuver-panel">
          <div className="clean-sheet-maneuver-header">
            <strong>Battle Master Maneuvers</strong>
            <span>{superiority ? `${superiority.current}/${superiority.max}` : 'No'} superiority dice • d{fighterPlan.superiorityDie}</span>
          </div>
          <div className="clean-sheet-maneuver-grid">
            {(maneuvers.length ? maneuvers : (CLASS_FEATURES.fighter?.subclasses?.battle_master?.maneuvers || []).slice(0, 6)).map((maneuver) => {
              const name = typeof maneuver === 'string' ? maneuver : maneuver.name;
              const description = typeof maneuver === 'string'
                ? (CLASS_FEATURES.fighter?.subclasses?.battle_master?.maneuvers || []).find(item => item.name === maneuver)?.description || 'Spend a superiority die when the maneuver applies.'
                : maneuver.description;
              return (
                <button key={name} type="button" onClick={() => onManeuver(name)} disabled={!superiority || superiority.current <= 0}>
                  <strong>{name}</strong>
                  <span>{description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function ActionSection({ title, children }) {
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>{title}</h2>
      <div className="clean-sheet-action-grid">{children}</div>
    </section>
  );
}

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

  const equippedWeaponAttacks = useMemo(() => gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus), [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus]);
  const consumables = useMemo(() => gatherConsumables(character), [character]);

  const attackOptions = useMemo(() => ([
    ...(equippedWeaponAttacks.length > 0 ? equippedWeaponAttacks : [{
      id: 'main-attack', title: 'Weapon Attack', type: 'Action', attackLabel: 'Weapon Attack', details: 'Fallback weapon attack',
      attackMod: bestAttackMod, saveText: null, damageText: `1d8 ${fmt(bestAbilityMod)}`, damageType: 'weapon',
      damage: { label: 'Weapon Damage', count: 1, sides: 8, modifier: bestAbilityMod, damageType: 'weapon' }
    }]),
    {
      id: 'unarmed-strike', title: 'Unarmed Strike', type: 'Action', attackLabel: 'Unarmed Strike', details: 'Punch, kick, headbutt, or similar',
      attackMod: proficiencyBonus + strengthMod, saveText: null, damageText: `1 ${unarmedDamageMod ? fmt(unarmedDamageMod) : ''}`.trim(), damageType: 'bludgeoning',
      damage: { label: 'Unarmed Damage', count: 1, sides: 1, modifier: unarmedDamageMod, damageType: 'bludgeoning' }
    }
  ]), [bestAbilityMod, bestAttackMod, equippedWeaponAttacks, proficiencyBonus, strengthMod, unarmedDamageMod]);

  const classResources = useMemo(() => {
    const resources = character?.resources || {};
    return getClassResourceRules(character).map(rule => {
      const raw = resources[rule.key] || {};
      const max = Number(raw.max ?? raw.total ?? rule.maxValue ?? 0) || 0;
      const current = Number(resourceDrafts[rule.key] ?? raw.current ?? raw.remaining ?? max) || 0;
      return { key: rule.key, label: rule.label, current: Math.max(0, Math.min(max, current)), max };
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
    const nextResources = { ...(character?.resources || {}), [resource.key]: { ...(character?.resources?.[resource.key] || {}), current: next, remaining: next, max: resource.max } };
    const ok = await onCharacterUpdate({ resources: nextResources }, { error: `Could not update ${resource.label}` });
    if (ok !== false) toast.success(`${resource.label}: ${next}/${resource.max}`);
  };

  const spendResourceAndPatch = async (resourceKey, updates, label) => {
    const resource = classResources.find(item => item.key === resourceKey);
    if (!resource || resource.current <= 0 || !onCharacterUpdate) return false;
    const next = Math.max(0, resource.current - 1);
    setResourceDrafts(prev => ({ ...prev, [resource.key]: next }));
    const nextResources = { ...(character?.resources || {}), [resource.key]: { ...(character?.resources?.[resource.key] || {}), current: next, remaining: next, max: resource.max } };
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
    await spendResourceAndPatch('second_wind', { current_hit_points: nextHp }, 'Second Wind');
  };

  const handleActionSurge = async () => {
    await spendResourceAndPatch('action_surge', {}, 'Action Surge');
  };

  const handleIndomitable = async () => {
    await spendResourceAndPatch('indomitable', {}, 'Indomitable');
  };

  const handleManeuver = async (name) => {
    const ok = await spendResourceAndPatch('superiority_dice', {}, name);
    if (ok) toast.info(`Apply ${name}: add d${fighterPlan.superiorityDie} superiority die where the maneuver says.`);
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
    await onCharacterUpdate({ current_hit_points: Math.min(Number(character?.max_hit_points || 10), Number(character?.current_hit_points || 0) + result.total), inventory, equipment }, { error: 'Could not use consumable' });
  };

  return (
    <div className="clean-sheet-combat-wrap"><div className="clean-sheet-grid">
      <section className="clean-sheet-panel clean-sheet-wide"><h2>Combat Quick Tools</h2><div className="clean-sheet-combat-tools">
        <div className="clean-sheet-concentration-box"><span>Concentration</span><input value={concentratingOn} onChange={(event) => saveConcentration(event.target.value)} placeholder="Spell or effect…" aria-label="Concentration spell or effect" /><button type="button" onClick={rollConcentrationSave}>Roll Save {fmt(concentrationMod)}</button>{concentratingOn && <button type="button" onClick={() => saveConcentration('')}>Clear</button>}</div>
        {classResources.length > 0 && <div className="clean-sheet-resource-grid">{classResources.map(resource => <div key={resource.key} className="clean-sheet-resource-card"><span>{resource.label}</span><strong>{resource.current}/{resource.max}</strong><div><button type="button" onClick={() => updateResource(resource, -1)} disabled={resource.current <= 0}>Use</button><button type="button" onClick={() => updateResource(resource, 1)} disabled={resource.current >= resource.max}>Restore</button></div></div>)}</div>}
        {consumables.length > 0 && <div className="clean-sheet-consumable-strip"><span>Quick Consumables</span>{consumables.map((item, index) => <button key={`${getItemName(item)}-${index}`} type="button" onClick={() => useConsumable(item)}>{getItemName(item)}{getItemQuantity(item) ? ` x${getItemQuantity(item)}` : ''}</button>)}</div>}
      </div></section>

      <FighterFocusPanel fighterLevel={fighterLevel} fighterSubclass={fighterSubclass} fighterPlan={fighterPlan} maneuvers={fighterManeuvers} resources={classResources} onSecondWind={handleSecondWind} onActionSurge={handleActionSurge} onIndomitable={handleIndomitable} onManeuver={handleManeuver} />
      <FighterSummarySection character={character} />
      <BarbarianSummarySection character={character} resources={classResources} onRage={() => spendResourceAndPatch('rage', { raging: true, is_raging: true }, 'Rage')} />
      <RogueSummarySection character={character} />
      <MonkSummarySection character={character} resources={classResources} onSpendDiscipline={(mode) => spendResourceAndPatch('ki', { monk_discipline_last: mode }, 'Monk Discipline')} />

      <ActionSection title="Attacks / Spells">{attackOptions.map(attack => <AttackCard key={attack.id} action={attack} onAttack={() => rollAttack(attack)} onDamage={() => rollDamage(attack.damage)} active={pendingDamage?.label === attack.damage.label}>{pendingDamage?.label === attack.damage.label && <div className="clean-sheet-pending-damage"><span>Attack rolled. If it hits, use the damage box on this card.</span><button type="button" onClick={() => setPendingDamage(null)}>Cancel</button></div>}</AttackCard>)}</ActionSection>
      <ActionSection title="Actions"><SimpleActionCard title="Dash" description="Gain extra movement equal to your speed this turn." /><SimpleActionCard title="Disengage" description="Your movement does not provoke opportunity attacks this turn." /><SimpleActionCard title="Dodge" description="Attack rolls against you have disadvantage until your next turn." /><SimpleActionCard title="Help" description="Give an ally advantage on a relevant check or attack." /><SimpleActionCard title="Ready" description="Prepare an action to trigger later this round." /></ActionSection>
      <ActionSection title="Bonus Actions"><SimpleActionCard title="Off-hand Attack" type="Bonus" description="Use when dual-wielding after taking the Attack action." onClick={() => onRoll('Off-hand Attack', bestAttackMod)} />{isRogueCharacter(character) && <SimpleActionCard title="Cunning Action" type="Bonus" description="Dash, Disengage, or Hide as a bonus action." />}{isMonkCharacter(character) && <SimpleActionCard title="Martial Arts" type="Bonus" description="Make one unarmed strike after attacking with a monk weapon or unarmed strike." onClick={() => onRoll('Martial Arts', bestAttackMod)} />}{isBarbarianCharacter(character) && <SimpleActionCard title="Rage" type="Bonus" description="Spend one Rage use and mark Rage active. Apply your Rage bonus and resistances." onClick={() => spendResourceAndPatch('rage', { raging: true, is_raging: true }, 'Rage')} />}{isFighter(character) && <SimpleActionCard title="Second Wind" type="Bonus" description={`Regain 1d10 + ${fighterLevel} HP if you have a use remaining.`} onClick={handleSecondWind} />}<SimpleActionCard title="Use Class Feature" type="Bonus" description="Use any bonus action feature granted by class, race, feat, spell, or item." /></ActionSection>
      <ActionSection title="Reactions"><SimpleActionCard title="Opportunity Attack" type="Reaction" description="Attack a creature that leaves your reach." onClick={() => onRoll('Opportunity Attack', bestAttackMod)} /><SimpleActionCard title="Readied Action" type="Reaction" description="Use your reaction to trigger a previously readied action." /><SimpleActionCard title="Use Reaction Feature" type="Reaction" description="Use a reaction from a class feature, race, feat, spell, or item." /></ActionSection>
      <section className="clean-sheet-panel clean-sheet-wide"><h2>Combat Summary</h2><div className="clean-sheet-combat-summary"><div><span>Armor Class</span><strong>{ac}</strong></div><div><span>Speed</span><strong>{speed}ft</strong></div><div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong></div><div><span>Best Attack</span><strong>{fmt(bestAttackMod)}</strong></div></div>{lastDamage && <div className="clean-sheet-damage-result"><span>{lastDamage.label}</span><strong>{lastDamage.total}</strong><em>{lastDamage.notation} ({lastDamage.rolls.join(' + ')}) {lastDamage.damageType || ''}</em></div>}</section>
    </div></div>
  );
}
