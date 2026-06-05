import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getClassResourceRules } from '@/data/classResourceRules';
import { findWeaponRule, getWeaponAbilityMod } from '@/data/equipmentRules5e';

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

function getItemQuantity(item) {
  if (!item || typeof item === 'string') return null;
  return item.quantity ?? item.qty ?? item.count ?? null;
}

function isWeaponLike(item) {
  const name = normaliseName(getItemName(item));
  const type = normaliseName(item?.type || item?.category || item?.item_type || '');
  return type.includes('weapon') || Boolean(findWeaponRule(item)) || Boolean(name);
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

function AttackCard({ action, onClick, children, active }) {
  return (
    <div className={`clean-sheet-action-card-shell ${active ? 'active' : ''}`}>
      <button type="button" className="clean-sheet-action-card clean-sheet-attack-card" onClick={onClick}>
        <div className="clean-sheet-attack-card-top">
          <span className="clean-sheet-action-type">{action.type || 'Action'}</span>
          <strong>{action.title}</strong>
          {action.details && <span className="clean-sheet-attack-details">{action.details}</span>}
        </div>
        <div className="clean-sheet-attack-stat-row">
          <div><span>{action.saveText ? 'Save' : 'To Hit'}</span><strong>{action.saveText || fmt(action.attackMod || 0)}</strong></div>
          <div><span>Damage</span><strong>{action.damageText || '—'}</strong></div>
          <div><span>Type</span><strong>{action.damageType || '—'}</strong></div>
        </div>
      </button>
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

function ActionSection({ title, children }) {
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>{title}</h2>
      <div className="clean-sheet-action-grid">{children}</div>
    </section>
  );
}

export default function CleanCombatTab({ character, ac, speed, proficiencyBonus, onRoll, onCharacterUpdate }) {
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

      <ActionSection title="Attacks / Spells">{attackOptions.map(attack => <AttackCard key={attack.id} action={attack} onClick={() => rollAttack(attack)} active={pendingDamage?.label === attack.damage.label}>{pendingDamage?.label === attack.damage.label && <div className="clean-sheet-pending-damage"><span>Attack rolled. If it hits:</span><button type="button" className="clean-sheet-damage-button" onClick={() => rollDamage(attack.damage)}>Roll Damage</button><button type="button" onClick={() => setPendingDamage(null)}>Cancel</button></div>}</AttackCard>)}</ActionSection>
      <ActionSection title="Actions"><SimpleActionCard title="Dash" description="Gain extra movement equal to your speed this turn." /><SimpleActionCard title="Disengage" description="Your movement does not provoke opportunity attacks this turn." /><SimpleActionCard title="Dodge" description="Attack rolls against you have disadvantage until your next turn." /><SimpleActionCard title="Help" description="Give an ally advantage on a relevant check or attack." /><SimpleActionCard title="Ready" description="Prepare an action to trigger later this round." /></ActionSection>
      <ActionSection title="Bonus Actions"><SimpleActionCard title="Off-hand Attack" type="Bonus" description="Use when dual-wielding after taking the Attack action." onClick={() => onRoll('Off-hand Attack', bestAttackMod)} />{className === 'Rogue' && <SimpleActionCard title="Cunning Action" type="Bonus" description="Dash, Disengage, or Hide as a bonus action." />}{className === 'Monk' && <SimpleActionCard title="Martial Arts" type="Bonus" description="Make one unarmed strike after attacking with a monk weapon or unarmed strike." onClick={() => onRoll('Martial Arts', bestAttackMod)} />}{className === 'Barbarian' && <SimpleActionCard title="Rage" type="Bonus" description="Enter a rage if you have uses remaining." />}{className === 'Fighter' && <SimpleActionCard title="Second Wind" type="Bonus" description="Regain hit points once per rest if available." />}<SimpleActionCard title="Use Class Feature" type="Bonus" description="Use any bonus action feature granted by class, race, feat, spell, or item." /></ActionSection>
      <ActionSection title="Reactions"><SimpleActionCard title="Opportunity Attack" type="Reaction" description="Attack a creature that leaves your reach." onClick={() => onRoll('Opportunity Attack', bestAttackMod)} /><SimpleActionCard title="Readied Action" type="Reaction" description="Use your reaction to trigger a previously readied action." /><SimpleActionCard title="Use Reaction Feature" type="Reaction" description="Use a reaction from a class feature, race, feat, spell, or item." /></ActionSection>
      <section className="clean-sheet-panel clean-sheet-wide"><h2>Combat Summary</h2><div className="clean-sheet-combat-summary"><div><span>Armor Class</span><strong>{ac}</strong></div><div><span>Speed</span><strong>{speed}ft</strong></div><div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong></div><div><span>Best Attack</span><strong>{fmt(bestAttackMod)}</strong></div></div>{lastDamage && <div className="clean-sheet-damage-result"><span>{lastDamage.label}</span><strong>{lastDamage.total}</strong><em>{lastDamage.notation} ({lastDamage.rolls.join(' + ')}) {lastDamage.damageType || ''}</em></div>}</section>
    </div></div>
  );
}
