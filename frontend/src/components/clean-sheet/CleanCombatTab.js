import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getClassResourceRules } from '@/data/classResourceRules';
import { getCharacterActionFeatures } from '@/data/characterFeatureSelectors';
import { ActionSection, AttackCard, SimpleActionCard } from './CleanCombatTabCards';
import {
  fmt,
  gatherConsumables,
  gatherEquippedWeapons,
  getItemName,
  getItemQuantity,
  getPotionHealing,
  hasSaveProficiency,
  isFighter,
  mod,
  rollDice,
} from './cleanCombatTabUtils';

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const labelText = (label, character) => (typeof label === 'function' ? label(character) : label);

function actionTypeFromText(text = '', fallback = 'action') {
  const normalised = String(text || '').toLowerCase();
  if (/reaction/.test(normalised)) return 'reaction';
  if (/bonus/.test(normalised)) return 'bonus';
  if (/minute|hour|ritual|special/.test(normalised)) return null;
  if (/action/.test(normalised)) return 'action';
  return fallback;
}

function spellLevelLabel(level) {
  if (Number(level) === 0) return 'Cantrip';
  if (!level && level !== 0) return 'Spell';
  return `Level ${level}`;
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
    .filter((feature) => {
      const key = `${feature.actionType}-${normalizeName(feature.name)}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function lowestUsableSlot(slots = {}, remaining = {}, spellLevel = 1) {
  const keys = Array.from(new Set([...Object.keys(slots || {}), ...Object.keys(remaining || {})]))
    .map(Number)
    .filter((level) => level >= Number(spellLevel || 1))
    .sort((a, b) => a - b);

  return keys.find((level) => Number(remaining[level] ?? slots[level] ?? 0) > 0) || null;
}

function resourceValue(character, rule) {
  const existing = character?.resources?.[rule.key] || {};
  const max = Number(existing.max ?? existing.total ?? rule.maxValue ?? 0) || 0;
  const current = Number(existing.current ?? existing.remaining ?? max) || 0;
  return {
    ...rule,
    label: labelText(rule.label, character),
    current: Math.max(0, Math.min(max, current)),
    max,
  };
}

function resourceActionCards(character, resources, handlers) {
  const byKey = Object.fromEntries(resources.map((resource) => [resource.key, resource]));
  const cards = {
    action: [],
    bonus: [],
    reaction: [],
  };

  const add = (bucket, key, title, description, onClick) => {
    const resource = byKey[key];
    const suffix = resource ? ` • ${resource.label} ${resource.current}/${resource.max}` : '';
    cards[bucket].push({
      key: `${bucket}-${key}-${title}`,
      title,
      type: resource?.label || 'Resource',
      description: `${description}${suffix}`,
      disabled: Boolean(resource && resource.current <= 0),
      onClick,
    });
  };

  const className = normalizeName(character?.character_class || character?.class_name || character?.class);
  const level = Number(character?.level || 1);

  if (byKey.ki || className === 'monk') {
    add('bonus', 'ki', 'Flurry of Blows', 'Spend 1 Ki/Discipline Point to make extra unarmed strikes after taking the Attack action.', () => handlers.spendResource('ki', 'Flurry of Blows'));
    add('bonus', 'ki', 'Patient Defense', 'Spend 1 Ki/Discipline Point to Dodge as a bonus action.', () => handlers.spendResource('ki', 'Patient Defense'));
    add('bonus', 'ki', 'Step of the Wind', 'Spend 1 Ki/Discipline Point to Dash or Disengage as a bonus action.', () => handlers.spendResource('ki', 'Step of the Wind'));
  }

  if (byKey.sorcery_points || className === 'sorcerer') {
    add('bonus', 'sorcery_points', 'Convert Sorcery Points', 'Use sorcery points for Metamagic or to create spell slots if your table uses that rule.', () => handlers.spendResource('sorcery_points', 'Sorcery Points'));
    add('bonus', 'sorcery_points', 'Metamagic', 'Spend sorcery points on a Metamagic option you know.', () => handlers.spendResource('sorcery_points', 'Metamagic'));
  }

  if (byKey.rage || className === 'barbarian') {
    add('bonus', 'rage', 'Rage', 'Enter a rage and apply your rage bonuses and resistances.', () => handlers.spendResource('rage', 'Rage'));
  }

  if (byKey.bardic_inspiration || className === 'bard') {
    add('bonus', 'bardic_inspiration', 'Bardic Inspiration', 'Give one creature an inspiration die.', () => handlers.spendResource('bardic_inspiration', 'Bardic Inspiration'));
  }

  if (byKey.second_wind || className === 'fighter') {
    add('bonus', 'second_wind', 'Second Wind', 'Regain hit points using your fighter resource.', () => handlers.spendResource('second_wind', 'Second Wind'));
  }

  if (byKey.action_surge || className === 'fighter') {
    add('action', 'action_surge', 'Action Surge', 'Take one additional action on your turn.', () => handlers.spendResource('action_surge', 'Action Surge'));
  }

  if (byKey.indomitable || className === 'fighter') {
    add('reaction', 'indomitable', 'Indomitable', 'Reroll a failed saving throw when this feature applies.', () => handlers.spendResource('indomitable', 'Indomitable'));
  }

  if (byKey.superiority_dice) {
    add('action', 'superiority_dice', 'Battle Master Maneuver', 'Spend a superiority die when a maneuver applies.', () => handlers.spendResource('superiority_dice', 'Superiority Die'));
    add('reaction', 'superiority_dice', 'Reaction Maneuver', 'Use a reaction maneuver such as Riposte or Parry if known.', () => handlers.spendResource('superiority_dice', 'Reaction Maneuver'));
  }

  if (byKey.wild_shape || className === 'druid') {
    add('action', 'wild_shape', 'Wild Shape', 'Transform using a Wild Shape use.', () => handlers.spendResource('wild_shape', 'Wild Shape'));
  }

  if (byKey.channel_divinity) {
    add(level >= 3 && className === 'paladin' ? 'action' : 'action', 'channel_divinity', 'Channel Divinity', 'Use a Channel Divinity option from your class or subclass.', () => handlers.spendResource('channel_divinity', 'Channel Divinity'));
  }

  if (byKey.lay_on_hands || className === 'paladin') {
    add('action', 'lay_on_hands', 'Lay on Hands', 'Spend points from your healing pool.', () => handlers.spendResource('lay_on_hands', 'Lay on Hands'));
  }

  if (byKey.arcane_recovery || className === 'wizard') {
    add('action', 'arcane_recovery', 'Arcane Recovery', 'Recover spell slots during a short rest when this applies.', () => handlers.spendResource('arcane_recovery', 'Arcane Recovery'));
  }

  return cards;
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
  const unarmedDamageMod = Math.max(0, strengthMod);
  const className = character?.character_class || 'Adventurer';

  const equippedWeaponAttacks = useMemo(
    () => gatherEquippedWeapons(character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus),
    [character, strengthMod, dexterityMod, bestAbilityMod, proficiencyBonus],
  );
  const consumables = useMemo(() => gatherConsumables(character), [character]);
  const spells = useMemo(() => gatherCharacterSpells(character), [character]);
  const actionFeatures = useMemo(() => gatherActionFeatures(character), [character]);
  const classResources = useMemo(() => getClassResourceRules(character).map((rule) => {
    const resource = resourceValue(character, rule);
    const draft = resourceDrafts[rule.key];
    return draft === undefined ? resource : { ...resource, current: draft };
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
    if (ok !== false) toast.success(`${label}: ${next}/${resource.max} remaining`);
  };

  const resourceActions = useMemo(() => resourceActionCards(character, classResources, {
    spendResource: (resourceKey, label) => updateResource(resourceKey, label, -1),
  }), [character, classResources]);

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

  const handleSlotChange = async (nextRemaining) => {
    if (!onCharacterUpdate) return false;
    return onCharacterUpdate(
      { spell_slots_remaining: nextRemaining },
      { error: 'Could not update spell slots' },
    );
  };

  const castSpell = async (spell) => {
    const level = Number(spell.level || 0);
    const spellName = spell.name || 'Spell';

    if (level <= 0) {
      toast.success(`${spellName} used`, { description: 'Cantrips do not spend spell slots.' });
      return;
    }

    const slots = character?.spell_slots || {};
    const remaining = character?.spell_slots_remaining && Object.keys(character.spell_slots_remaining).length
      ? character.spell_slots_remaining
      : slots;
    const slotLevel = lowestUsableSlot(slots, remaining, level);

    if (!slotLevel) {
      toast.error(`No level ${level}+ spell slots left`);
      return;
    }

    const nextRemaining = {
      ...(remaining || {}),
      [slotLevel]: Math.max(0, Number(remaining[slotLevel] ?? slots[slotLevel] ?? 0) - 1),
    };
    const ok = await handleSlotChange(nextRemaining);
    if (ok !== false) toast.success(`${spellName} cast`, { description: `Spent a level ${slotLevel} spell slot.` });
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

  const featureCards = (features) => features.map((feature) => (
    <SimpleActionCard
      key={`${feature.actionType}-${feature.name}`}
      title={feature.name}
      type={feature.actionType === 'bonus' ? 'Bonus' : feature.actionType === 'reaction' ? 'Reaction' : 'Action'}
      description={feature.description || 'Feature saved on this character.'}
    />
  ));

  const spellCards = (spellList, typeLabel) => spellList.map((spell) => (
    <SimpleActionCard
      key={`${typeLabel}-${spell.name}`}
      title={spell.name}
      type={spellLevelLabel(spell.level)}
      description={`${spell.source || 'Spell'}${spell.castingTime ? ` • ${spell.castingTime}` : ''}${spell.description ? ` — ${spell.description.slice(0, 120)}${spell.description.length > 120 ? '…' : ''}` : ''}`}
      onClick={() => castSpell(spell)}
    />
  ));

  const resourceCards = (cards) => cards.map((card) => (
    <SimpleActionCard
      key={card.key}
      title={card.title}
      type={card.type}
      description={card.description}
      onClick={card.onClick}
      disabled={card.disabled}
    />
  ));

  return (
    <div className="clean-sheet-combat-wrap clean-sheet-actions-tab">
      <div className="clean-sheet-grid">
        <ActionSection title="Actions">
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
          <SimpleActionCard title="Off-hand Attack" type="Bonus" description="Use when dual-wielding after taking the Attack action." onClick={() => onRoll('Off-hand Attack', bestAttackMod)} />
          {className === 'Rogue' && <SimpleActionCard title="Cunning Action" type="Bonus" description="Dash, Disengage, or Hide as a bonus action." />}
        </ActionSection>

        <ActionSection title="Reactions">
          {spellCards(groupedSpells.reaction, 'reaction')}
          {resourceCards(resourceActions.reaction)}
          {featureCards(groupedFeatures.reaction)}
          <SimpleActionCard title="Opportunity Attack" type="Reaction" description="Attack a creature that leaves your reach." onClick={() => onRoll('Opportunity Attack', bestAttackMod)} />
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
