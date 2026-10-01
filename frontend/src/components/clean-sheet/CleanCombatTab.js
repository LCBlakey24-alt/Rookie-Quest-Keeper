import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getClassResourceRules } from '../../data/classResourceRules';
import { getCharacterActionFeatures } from '../../data/characterFeatureSelectors';
import { buildCharacterSpellCastUpdate } from '../../data/characterSpellCastingActions';
import { resourceActionCards, resourceValue } from '../../data/actionEconomyCards';
import CombatSpellActionCard from './CombatSpellActionCard';
import { ActionSection, AttackCard, SimpleActionCard, VariableResourceActionCard } from './CleanCombatTabCards';
import {
  buildConsumableUseUpdate,
  fmt,
  gatherConsumables,
  gatherEquippedWeapons,
  getEquippedWeaponAttack,
  getItemName,
  getItemQuantity,
  getOpportunityAttackProfile,
  getPotionHealing,
  getUnarmedStrikeProfile,
  getAttacksPerAction,
  getFighterCriticalRange,
  getFighterLevel,
  hasSaveProficiency,
  mod,
  rollAttackDamage,
  rollDice,
} from './cleanCombatTabUtils';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const RESOURCE_BACKED_FEATURES = new Set([
  'flurryofblows',
  'patientdefense',
  'stepofthewind',
  'rage',
  'bardicinspiration',
  'secondwind',
  'actionsurge',
  'indomitable',
  'battlemastermaneuver',
  'wildshape',
  'channeldivinity',
  'layonhands',
  'arcanerecovery',
  'metamagic',
]);

function actionTypeFromText(text = '', fallback = 'action') {
  const normalised = String(text || '').toLowerCase();
  if (/reaction/.test(normalised)) return 'reaction';
  if (/bonus/.test(normalised)) return 'bonus';
  if (/minute|hour|ritual|special/.test(normalised)) return null;
  if (/action/.test(normalised)) return 'action';
  return fallback;
}

function normaliseSpell(spell, fallbackLevel = null, source = '') {
  if (!spell) return null;
  if (typeof spell === 'string') {
    return {
      name: spell,
      level: fallbackLevel,
      description: '',
      castingTime: '',
      source,
    };
  }

  return {
    ...spell,
    name: spell.name || spell.spell_name || spell.title || 'Unknown Spell',
    level: spell.level ?? spell.spell_level ?? fallbackLevel,
    description: spell.description || spell.desc || spell.summary || '',
    castingTime: spell.casting_time || spell.castingTime || spell.time || spell.action_type || spell.activation?.type || spell.activation || '',
    source,
  };
}

function gatherCharacterSpells(character = {}) {
  const spellSources = [
    [character?.cantrips_known || character?.cantrips, 0, 'Cantrip'],
    [character?.spells_prepared || character?.prepared_spells, null, 'Prepared Spell'],
    [character?.spells_known || character?.known_spells || character?.spellbook, null, 'Known Spell'],
  ];
  const seen = new Set();

  return spellSources
    .flatMap(([spells, fallbackLevel, source]) => toArray(spells).map((spell) => normaliseSpell(spell, fallbackLevel, source)))
    .filter(Boolean)
    .filter((spell) => {
      const key = normalizeName(spell.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normaliseFeature(feature) {
  if (!feature) return null;
  if (typeof feature === 'string') {
    return { name: feature, description: 'Feature saved on this character.', actionType: null };
  }

  return {
    ...feature,
    name: feature.name || feature.title || 'Feature',
    description: feature.description || feature.summary || feature.text || '',
    actionType: actionTypeFromText(feature.action_type || feature.activation?.type || feature.activation || feature.type || '', null),
  };
}

function gatherActionFeatures(character = {}) {
  const featureSources = [
    getCharacterActionFeatures(character),
    character?.features,
    character?.class_features,
    character?.racial_traits,
    character?.species_features,
    character?.feats,
  ];
  const seen = new Set();

  return featureSources
    .flatMap((features) => toArray(features).map(normaliseFeature))
    .filter(Boolean)
    .filter((feature) => ['action', 'bonus', 'reaction'].includes(feature.actionType))
    .filter((feature) => !RESOURCE_BACKED_FEATURES.has(normalizeName(feature.name)))
    .filter((feature) => {
      const key = `${feature.actionType}-${normalizeName(feature.name)}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function CleanCombatTab({ character, proficiencyBonus, onRoll, onCharacterUpdate, onDiceResult }) {
  const [pendingDamage, setPendingDamage] = useState(null);
  const [lastDamage, setLastDamage] = useState(null);
  const [resourceDrafts, setResourceDrafts] = useState({});

  const strengthMod = mod(character?.strength);
  const dexterityMod = mod(character?.dexterity);
  const constitutionMod = mod(character?.constitution);
  const concentrationMod = constitutionMod + (hasSaveProficiency(character, 'constitution') ? proficiencyBonus : 0);
  const bestAbilityMod = Math.max(strengthMod, dexterityMod);
  const bestAttackMod = proficiencyBonus + bestAbilityMod;
  const className = character?.character_class || 'Adventurer';
  const classKey = normalizeName(className);
  const criticalRange = getFighterCriticalRange(character, getFighterLevel(character));
  const attacksPerAction = useMemo(() => getAttacksPerAction(character), [character]);

  const equippedWeaponAttacks = useMemo(
    () => gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus],
  );
  const mainHandAttack = useMemo(
    () => getEquippedWeaponAttack(character, 'mainHand', strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus],
  );
  const offHandAttack = useMemo(
    () => getEquippedWeaponAttack(character, 'offHand', strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus],
  );
  const canShowOffHandAttack = Boolean(mainHandAttack && offHandAttack);
  const unarmedAttack = useMemo(
    () => getUnarmedStrikeProfile(character, strengthMod, dexterityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, proficiencyBonus],
  );
  const opportunityAttack = useMemo(
    () => getOpportunityAttackProfile(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus],
  );
  const consumables = useMemo(() => gatherConsumables(character), [character]);
  const spells = useMemo(() => gatherCharacterSpells(character), [character]);
  const actionFeatures = useMemo(() => gatherActionFeatures(character), [character]);
  const classResources = useMemo(() => getClassResourceRules(character).map((rule) => {
    const resource = resourceValue(character, rule);
    const draft = resourceDrafts[rule.key];
    return draft === undefined ? resource : { ...resource, current: Math.min(resource.max, draft) };
  }), [character, resourceDrafts]);

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
    unarmedAttack,
  ]), [bestAbilityMod, bestAttackMod, equippedWeaponAttacks, unarmedAttack]);

  const groupedSpells = useMemo(() => ({
    action: spells.filter((spell) => actionTypeFromText(spell.castingTime, 'action') === 'action'),
    bonus: spells.filter((spell) => actionTypeFromText(spell.castingTime, 'action') === 'bonus'),
    reaction: spells.filter((spell) => actionTypeFromText(spell.castingTime, 'action') === 'reaction'),
  }), [spells]);

  const groupedFeatures = useMemo(() => ({
    action: actionFeatures.filter((feature) => feature.actionType === 'action'),
    bonus: actionFeatures.filter((feature) => feature.actionType === 'bonus'),
    reaction: actionFeatures.filter((feature) => feature.actionType === 'reaction'),
  }), [actionFeatures]);

  const updateResource = async (resourceKey, label, delta = -1) => {
    const resource = classResources.find((item) => item.key === resourceKey);
    if (!resource || resource.current <= 0 || !onCharacterUpdate) return;
    const previous = resource.current;
    const next = Math.max(0, Math.min(resource.max, resource.current + delta));
    setResourceDrafts((prev) => ({ ...prev, [resourceKey]: next }));
    const nextResources = {
      ...(character?.resources || {}),
      [resourceKey]: {
        ...(character?.resources?.[resourceKey] || {}),
        label: resource.label,
        current: next,
        remaining: next,
        max: resource.max,
        restore: resource.restore || character?.resources?.[resourceKey]?.restore,
      },
    };
    const ok = await onCharacterUpdate({ resources: nextResources }, { error: `Could not use ${label}` });
    if (ok === false) {
      setResourceDrafts((prev) => ({ ...prev, [resourceKey]: previous }));
      return;
    }
    toast.success(`${label}: ${next}/${resource.max} remaining`);
  };

  const resourceActions = useMemo(() => resourceActionCards(character, classResources, {
    spendResource: (resourceKey, label, amount = 1) => updateResource(resourceKey, label, -Math.max(1, Math.floor(Number(amount) || 1))),
  }), [character, classResources]);

  const rollAttack = (attack) => {
    const result = onRoll(attack.attackLabel, attack.attackMod ?? bestAttackMod);
    const natural = Number(result?.d20);

    if (natural === 1) {
      setPendingDamage(null);
      setLastDamage(null);
      toast.error('Natural 1 — the attack misses.');
      return;
    }

    const critical = Number.isFinite(natural) && natural >= criticalRange;
    setPendingDamage({ ...attack.damage, critical });
    setLastDamage(null);

    if (critical) {
      toast.success('Critical hit — damage dice will be doubled.');
    }
  };

  const rollDamage = (damage) => {
    const result = rollAttackDamage(damage, { critical: Boolean(damage?.critical) });
    setLastDamage({ ...damage, ...result });
    setPendingDamage(null);
    onDiceResult?.({
      id: `${Date.now()}-damage`,
      label: damage.critical ? `Critical ${damage.label || 'Damage'}` : damage.label || 'Damage',
      rolls: result.rolls,
      sides: damage.sides,
      modifier: damage.modifier,
      total: result.total,
      critical: result.critical,
      mode: 'damage',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    toast.success(`${damage.critical ? 'Critical ' : ''}${damage.label || 'Damage'}: ${result.total} ${damage.damageType || ''}`.trim());
  };

  const castSpell = async (spell, explicitOption = null) => {
    const spellName = spell.name || 'Spell';
    const cast = buildCharacterSpellCastUpdate(character, spell, { explicitOption });

    if (!cast.ok) {
      toast.error(cast.reason || `No spell slot available for ${spellName}`);
      return;
    }

    if (cast.option?.source === 'cantrip') {
      toast.success(`${spellName} used`, { description: 'Cantrips do not spend spell slots.' });
      return;
    }

    if (!onCharacterUpdate) {
      toast.error('Open a saved character before spending spell slots.');
      return;
    }

    const ok = await onCharacterUpdate(
      cast.updates,
      { error: cast.option?.source === 'pact' ? 'Could not update Pact Magic' : 'Could not update spell slots' },
    );
    if (ok === false) return;

    const description = cast.option?.source === 'pact'
      ? `Spent a level ${cast.option.level} Pact Magic slot.`
      : `Spent a level ${cast.option?.level} spell slot.`;
    toast.success(`${spellName} cast`, { description });
  };

  const useConsumable = async (item) => {
    if (!onCharacterUpdate) {
      toast.error('Open a saved character before using consumables.');
      return;
    }
    const heal = getPotionHealing(item);
    const result = rollDice(heal.count, heal.sides, heal.modifier);
    const updates = buildConsumableUseUpdate(character, item, result.total);
    if (!updates.consumed) {
      toast.error(`Could not find ${getItemName(item)} in this character's inventory.`);
      return;
    }
    const ok = await onCharacterUpdate({
      current_hit_points: updates.current_hit_points,
      inventory: updates.inventory,
      equipment: updates.equipment,
    }, { error: 'Could not use consumable' });
    if (ok === false) return;
    toast.success(`${getItemName(item)} heals ${result.total} HP`);
  };

  const featureCards = (features) => features.map((feature) => (
    <SimpleActionCard
      key={`${feature.actionType}-${feature.name}`}
      title={feature.name}
      type={feature.actionType === 'bonus' ? 'Bonus' : feature.actionType === 'reaction' ? 'Reaction' : 'Action'}
      description={feature.description || 'Feature saved on this character.'}
    />
  ));

  const spellCards = (spellList, typeLabel) => spellList.map((spell) => (
    <CombatSpellActionCard
      key={`${typeLabel}-${spell.name}`}
      character={character}
      spell={spell}
      typeLabel={typeLabel}
      onCast={castSpell}
    />
  ));

  const resourceCards = (cards) => cards.map((card) => (
    card.variableCost
      ? <VariableResourceActionCard key={card.key} card={card} />
      : (
        <SimpleActionCard
          key={card.key}
          title={card.title}
          type={card.type}
          description={card.description}
          onClick={card.onClick}
          disabled={card.disabled}
        />
      )
  ));

  return (
    <div className="clean-sheet-combat-wrap clean-sheet-actions-tab">
      <div className="clean-sheet-grid">
        <ActionSection
          title="Actions"
          summary={`Attack action: ${attacksPerAction} attack${attacksPerAction === 1 ? '' : 's'}`}
        >
          {attackOptions.map(attack => (
            <AttackCard
              key={attack.id}
              action={attack}
              onAttack={() => rollAttack(attack)}
              onDamage={() => rollDamage(pendingDamage?.label === attack.damage.label ? pendingDamage : attack.damage)}
              active={pendingDamage?.label === attack.damage.label}
            >
              {pendingDamage?.label === attack.damage.label && (
                <div className="clean-sheet-pending-damage">
                  <span>{pendingDamage?.critical ? 'Critical hit. Damage dice will be doubled.' : 'Attack rolled. If it hits, use the damage box on this card.'}</span>
                  <button type="button" onClick={() => setPendingDamage(null)}>Cancel</button>
                </div>
              )}
            </AttackCard>
          ))}
          {spellCards(groupedSpells.action, 'action')}
          {resourceCards(resourceActions.action)}
          {featureCards(groupedFeatures.action)}
          {consumables.map((item, index) => (
            <SimpleActionCard
              key={`${getItemName(item)}-${index}`}
              title={getItemName(item)}
              type="Item"
              description={`Use this item${getItemQuantity(item) ? ` • x${getItemQuantity(item)}` : ''}`}
              onClick={() => useConsumable(item)}
            />
          ))}
          <SimpleActionCard title="Dash" description="Gain extra movement equal to your speed this turn." />
          <SimpleActionCard title="Disengage" description="Your movement does not provoke opportunity attacks this turn." />
          <SimpleActionCard title="Dodge" description="Attack rolls against you have disadvantage until your next turn." />
          <SimpleActionCard title="Help" description="Give an ally advantage on a relevant check or attack." />
          <SimpleActionCard title="Ready" description="Prepare an action to trigger later this round." />
          <SimpleActionCard title="Roll Concentration Save" description={`Constitution save ${fmt(concentrationMod)} if damage threatens concentration.`} onClick={() => onRoll('Concentration Save', concentrationMod)} />
        </ActionSection>

        <ActionSection title="Bonus Actions">
          {spellCards(groupedSpells.bonus, 'bonus')}
          {resourceCards(resourceActions.bonus)}
          {featureCards(groupedFeatures.bonus)}
          {canShowOffHandAttack && (
            <SimpleActionCard
              title={`Off-hand Attack · ${offHandAttack.title}`}
              type="Bonus"
              description={`${fmt(offHandAttack.attackMod)} to hit • Use when your current two-weapon rules allow this extra attack.`}
              onClick={() => onRoll(`${offHandAttack.title} Off-hand Attack`, offHandAttack.attackMod)}
            />
          )}
          {classKey === 'rogue' && <SimpleActionCard title="Cunning Action" type="Bonus" description="Dash, Disengage, or Hide as a bonus action." />}
        </ActionSection>

        <ActionSection title="Reactions">
          {spellCards(groupedSpells.reaction, 'reaction')}
          {resourceCards(resourceActions.reaction)}
          {featureCards(groupedFeatures.reaction)}
          <SimpleActionCard
            title={`Opportunity Attack · ${opportunityAttack.title}`}
            type="Reaction"
            description={`${fmt(opportunityAttack.attackMod)} to hit • Make a melee attack when a creature leaves your reach.`}
            onClick={() => onRoll(opportunityAttack.attackLabel, opportunityAttack.attackMod)}
          />
          <SimpleActionCard title="Readied Action" type="Reaction" description="Use your reaction to trigger a previously readied action." />
          <SimpleActionCard title="Use Reaction Feature" type="Reaction" description="Use a reaction from a class feature, species trait, feat, spell, or item." />
        </ActionSection>

        {lastDamage && (
          <section className="clean-sheet-panel clean-sheet-wide clean-sheet-last-result">
            <h2>Last Damage Roll</h2>
            <div className="clean-sheet-damage-result">
              <span>{lastDamage.label}</span>
              <strong>{lastDamage.total}</strong>
              <em>{lastDamage.notation} ({lastDamage.rolls.join(' + ')}) {lastDamage.damageType || ''}</em>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}