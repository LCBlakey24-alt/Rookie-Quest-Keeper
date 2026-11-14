import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getClassResourceRules } from '../../data/classResourceRules';
import { getCharacterActionFeatures } from '../../data/characterFeatureSelectors';
import { buildCharacterSpellCastUpdate } from '../../data/characterSpellCastingActions';
import { spellRequiresConcentration } from '../../data/spellConcentrationRules';
import { characterRulesEdition } from '../../data/characterSpellListRules';
import { resourceActionCards, resourceValue } from '../../data/actionEconomyCards';
import CombatSpellActionCard from './CombatSpellActionCard';
import UsesLeftPanel from './UsesLeftPanel';
import { castableSpells } from '../hex-sheet/magicModel';
import { resourceAdjustUpdate, slotAdjustUpdate, spellSlotRows } from '../../data/spentResourceRestore';
import { ActionSection, AttackCard, SimpleActionCard, VariableResourceActionCard } from './CleanCombatTabCards';
import {
  buildConsumableUseUpdate,
  fmt,
  gatherConsumables,
  gatherEquippedWeapons,
  getEquippedWeaponAttack,
  getItemName,
  getItemQuantity,
  getMonkBonusUnarmedAction,
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

/**
 * The spells Combat offers: exactly the Magic wheel's castable spells (one
 * shared list), so names are filled in from the built-in spells before their
 * level or casting time is decided, a Wizard's unprepared spellbook is left
 * out, and a spell known through two classes keeps one copy per class.
 */
function gatherCharacterSpells(character = {}) {
  return castableSpells(character).map((spell) => {
    const normalised = normaliseSpell(spell, spell.level, spell.level === 0 ? 'Cantrip' : 'Spell');
    // The built-in list has no casting-time field, but its reaction and
    // bonus-action spells say so first ("Reaction: +5 AC ...").
    const lead = /^\s*(reaction|bonus action)\b/i.exec(normalised.description || '');
    return { ...normalised, key: spell.key, castingTime: normalised.castingTime || (lead ? lead[1] : '') };
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

/**
 * `section` ('action' | 'bonus' | 'reaction' | 'other') shows a single group,
 * for the hexagonal sheet's Combat wheel, which lists one group below the
 * wheel at a time. Without it every group is shown, as on the classic sheet.
 */
export default function CleanCombatTab({ character, proficiencyBonus, onRoll, onCharacterUpdate, onDiceResult, section = null, getLatestCharacter = null }) {
  const shows = (group) => !section || (Array.isArray(section) ? section.includes(group) : section === group);
  const [pendingDamage, setPendingDamage] = useState(null);
  const [lastDamage, setLastDamage] = useState(null);
  const [resourceDrafts, setResourceDrafts] = useState({});
  // The character as it is now, for an Undo pressed after later changes.
  const characterRef = useRef(character);
  characterRef.current = character;
  // The host's latest state when it has one: this tab may have closed by the
  // time an Undo is pressed, and its own copy stops updating then.
  const latest = () => getLatestCharacter?.() || characterRef.current;

  const strengthMod = mod(character?.strength);
  const dexterityMod = mod(character?.dexterity);
  const constitutionMod = mod(character?.constitution);
  const concentrationMod = constitutionMod + (hasSaveProficiency(character, 'constitution') ? proficiencyBonus : 0);
  const bestAbilityMod = Math.max(strengthMod, dexterityMod);
  const bestAttackMod = proficiencyBonus + bestAbilityMod;
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
  const monkBonusAttack = useMemo(
    () => getMonkBonusUnarmedAction(character, unarmedAttack),
    [character, unarmedAttack],
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

  const classResourcesRef = useRef(classResources);
  classResourcesRef.current = classResources;

  // Spend (negative delta) or give back (positive) uses of a class resource.
  // Works from the latest values, so an Undo never rolls back later spends.
  const updateResource = async (resourceKey, label, delta = -1) => {
    const known = classResourcesRef.current.find((item) => item.key === resourceKey);
    if (!known || !onCharacterUpdate) return;
    // With a host that keeps the latest state, count from that (this tab may
    // have closed since the spend being undone).
    const resource = getLatestCharacter ? resourceValue(latest(), known) : known;
    const change = resourceAdjustUpdate(latest(), resource, delta);
    if (!change) return;
    const previous = resource.current;
    setResourceDrafts((prev) => ({ ...prev, [resourceKey]: change.next }));
    const ok = await onCharacterUpdate(change.updates, { error: delta < 0 ? `Could not use ${label}` : `Could not give back ${label}` });
    if (ok === false) {
      setResourceDrafts((prev) => ({ ...prev, [resourceKey]: previous }));
      return;
    }
    if (delta < 0) {
      toast.success(`${label}: ${change.next}/${resource.max} remaining`, {
        action: { label: 'Undo', onClick: () => updateResource(resourceKey, label, -delta) },
      });
    } else {
      toast.success(`${label}: ${change.next}/${resource.max} remaining`, { description: 'Given back.' });
    }
  };

  // Spend or give back one spell slot of a level (or a Pact Magic slot).
  const adjustSlot = async (slot, delta) => {
    if (!onCharacterUpdate) return false;
    const updates = slotAdjustUpdate(latest(), slot, delta);
    if (!updates) return false;
    // Pact Magic is also a class resource: drop any draft of it so both read the saved value.
    if (slot.source === 'pact') setResourceDrafts(({ pact_magic: _dropped, ...rest }) => rest);
    const ok = await onCharacterUpdate(updates, { error: 'Could not update spell slots' });
    return ok !== false;
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
    if (spell.level === null || spell.level === undefined) {
      toast.error(`Set ${spellName}'s level in Manage spells before casting it.`);
      return;
    }
    const cast = buildCharacterSpellCastUpdate(character, spell, { explicitOption });

    if (!cast.ok) {
      toast.error(cast.reason || `No spell slot available for ${spellName}`);
      return;
    }

    // A concentration spell marks the caster as concentrating, like casting
    // from the Spells tab; the sheet asks before replacing a current one.
    const concentration = spellRequiresConcentration(spell, { edition: characterRulesEdition(character) })
      ? { concentrating_on: spellName, concentration: spellName }
      : null;

    if (cast.option?.source === 'cantrip') {
      if (concentration && onCharacterUpdate) {
        const ok = await onCharacterUpdate(concentration, { error: 'Could not set concentration' });
        if (ok === false) return;
      }
      toast.success(`${spellName} used`, { description: 'Cantrips do not spend spell slots.' });
      return;
    }

    if (!onCharacterUpdate) {
      toast.error('Open a saved character before spending spell slots.');
      return;
    }

    const ok = await onCharacterUpdate(
      { ...cast.updates, ...(concentration || {}) },
      { error: cast.option?.source === 'pact' ? 'Could not update Pact Magic' : 'Could not update spell slots' },
    );
    if (ok === false) return;

    const description = cast.option?.source === 'pact'
      ? `Spent a level ${cast.option.level} Pact Magic slot.`
      : `Spent a level ${cast.option?.level} spell slot.`;
    // Undo: the slot comes back, and so does whatever was being concentrated
    // on before this cast.
    const before = { concentrating_on: character?.concentrating_on || '', concentration: character?.concentration || '' };
    toast.success(`${spellName} cast`, {
      description,
      action: {
        label: 'Undo',
        onClick: async () => {
          const restored = await adjustSlot({ source: cast.option?.source, level: cast.option?.level }, 1);
          if (restored && concentration && latest()?.concentrating_on === spellName) {
            await onCharacterUpdate(before, { error: 'Could not restore concentration' });
          }
          if (restored) toast.success(`${spellName} undone`, { description: 'The slot is back.' });
        },
      },
    });
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
      key={`${typeLabel}-${spell.key || spell.name}`}
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
      {/* The hexagon sheet lists one group at a time; what's left to spend,
          with a way to give back a use tapped by accident, sits above it. */}
      {section && (
        <UsesLeftPanel
          // Pact Magic shows once, as a slot row, not again as a resource.
          resources={classResources.filter((resource) => resource.key !== 'pact_magic')}
          slots={spellSlotRows(character)}
          onResource={(resource, delta) => updateResource(resource.key, resource.label, delta)}
          onSlot={async (slot, delta) => {
            if (await adjustSlot(slot, delta)) toast.success(delta > 0 ? 'Spell slot given back' : 'Spell slot spent');
          }}
          disabled={!onCharacterUpdate}
        />
      )}
      <div className="clean-sheet-grid">
        {shows('action') && <ActionSection
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
        </ActionSection>}

        {shows('bonus') && <ActionSection title="Bonus Actions">
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
          {monkBonusAttack && (
            <SimpleActionCard
              title={monkBonusAttack.title}
              type={monkBonusAttack.type}
              description={monkBonusAttack.description}
              onClick={() => onRoll(monkBonusAttack.attackLabel, monkBonusAttack.attackMod)}
            />
          )}
        </ActionSection>}

        {shows('reaction') && <ActionSection title="Reactions">
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
        </ActionSection>}

        {section === 'other' && resourceActions.other.length === 0 && (
          <ActionSection title="Other Features" summary="Nothing here yet: this character has no triggered, passive or rest-timed features that skip the action economy." />
        )}

        {shows('other') && resourceActions.other.length > 0 && (
          <ActionSection title="Other Features" summary="Triggered, passive, or rest-timed features that do not spend your Action, Bonus Action, or Reaction.">
            {resourceCards(resourceActions.other)}
          </ActionSection>
        )}

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