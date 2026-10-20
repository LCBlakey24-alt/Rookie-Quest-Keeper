import { canUseCombatRecord, recordedNumber } from './combatReadiness';

export function monsterCrValue(cr) {
  if (cr === null || cr === undefined || String(cr).trim() === '') return null;
  const raw = String(cr).trim();
  if (raw.includes('/')) {
    const [top, bottom] = raw.split('/').map(Number);
    return Number.isFinite(top) && bottom > 0 ? top / bottom : null;
  }
  return recordedNumber(raw, true);
}

function proficiencyForCr(cr) {
  const value = monsterCrValue(cr);
  if (value >= 29) return 9;
  if (value >= 25) return 8;
  if (value >= 21) return 7;
  if (value >= 17) return 6;
  if (value >= 13) return 5;
  if (value >= 5) return 3;
  return 2;
}

function mod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function plus(value) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function damageByCr(cr, attackAbilityMod) {
  const value = monsterCrValue(cr);
  const ability = Math.max(0, attackAbilityMod);
  if (value >= 17) return `4d10+${ability}`;
  if (value >= 11) return `3d10+${ability}`;
  if (value >= 5) return `2d10+${ability}`;
  if (value >= 2) return `1d10+${ability}`;
  if (value >= 1) return `1d8+${ability}`;
  if (value >= 0.5) return `1d6+${ability}`;
  return `1d4+${ability}`;
}

function inferredStats(monster) {
  if (monster.stats || monster.abilities_scores) return monster.stats || monster.abilities_scores;
  const type = String(monster.type || '').toLowerCase();
  const size = String(monster.size || '').toLowerCase();
  const cr = monsterCrValue(monster.cr || monster.challenge_rating);
  const large = ['large', 'huge', 'gargantuan'].includes(size);
  const strong = large ? 16 + Math.min(6, Math.floor(cr / 3)) : 12 + Math.min(6, Math.floor(cr / 4));
  const dex = type.includes('ooze') ? 6 : type.includes('undead') ? 10 : type.includes('beast') ? 14 : 12;
  const con = type.includes('undead') || type.includes('construct') ? 14 + Math.min(6, Math.floor(cr / 3)) : 12 + Math.min(6, Math.floor(cr / 4));
  const intel = type.includes('beast') || type.includes('ooze') ? 3 : type.includes('humanoid') ? 10 : 8;
  const wis = type.includes('beast') ? 12 : 10;
  const cha = type.includes('fey') || type.includes('celestial') || type.includes('fiend') || type.includes('dragon') ? 14 : 8;
  return { strength: strong, dexterity: dex, constitution: con, intelligence: intel, wisdom: wis, charisma: cha };
}

function inferredSkills(monster, stats) {
  if (Array.isArray(monster.skills)) return monster.skills;
  const text = `${monster.abilities || ''} ${monster.name || ''}`.toLowerCase();
  const skills = [];
  if (text.includes('keen') || text.includes('sight') || text.includes('smell') || text.includes('hearing')) skills.push('perception');
  if (text.includes('stealth') || text.includes('shadow')) skills.push('stealth');
  if (text.includes('spell')) skills.push('arcana');
  if ((stats.strength || 10) >= 15) skills.push('athletics');
  return [...new Set(skills)];
}

function inferredAttacks(monster, stats, pb) {
  // The verified SRD collection explicitly provides actions. An empty list
  // must stay empty; never invent attacks for a published stat block.
  if (monster.source === 'srd-5.1' && Array.isArray(monster.actions)) return monster.actions;
  if (Array.isArray(monster.actions) && monster.actions.length) return monster.actions;
  if (Array.isArray(monster.attacks) && monster.attacks.length) return monster.attacks;
  const type = String(monster.type || '').toLowerCase();
  const name = String(monster.name || '').toLowerCase();
  const abilityText = String(monster.abilities || '').toLowerCase();
  const dexBased = type.includes('humanoid') || name.includes('archer') || name.includes('snake') || name.includes('spider');
  const abilityMod = dexBased ? mod(stats.dexterity) : mod(stats.strength);
  const bonus = plus(pb + abilityMod);
  const damage = damageByCr(monster.cr || monster.challenge_rating, abilityMod);
  const damageType = abilityText.includes('poison') ? 'piercing plus poison' : type.includes('undead') ? 'necrotic or slashing' : type.includes('beast') ? 'piercing or slashing' : 'bludgeoning, piercing, or slashing';

  if (type.includes('humanoid')) {
    return [
      { name: 'Weapon Attack', bonus, damage: `${damage} ${damageType}`, notes: 'Use the weapon that fits the NPC/monster description.' },
      { name: 'Ranged Attack', bonus, damage: `${damage} piercing`, notes: 'Use if the creature has a bow, sling, thrown weapon, or similar ranged option.' },
    ];
  }

  if (name.includes('swarm')) {
    return [{ name: 'Swarm Attack', bonus, damage: `${damage} ${damageType}`, notes: 'Damage may be reduced when the swarm is below half hit points.' }];
  }

  if (abilityText.includes('breath')) {
    return [
      { name: 'Natural Weapon', bonus, damage: `${damage} ${damageType}`, notes: 'Bite, claw, slam, or similar attack.' },
      { name: 'Breath / Special Attack', bonus: `DC ${12 + pb}`, damage, notes: monster.abilities || 'Recharge or limited-use special attack.' },
    ];
  }

  return [{ name: 'Natural Weapon', bonus, damage: `${damage} ${damageType}`, notes: 'Bite, claw, slam, sting, or similar attack based on creature type.' }];
}

export function normaliseMonsterStatBlock(monster = {}) {
  // Only explicitly labelled legacy estimates retain their historical preview.
  // Custom and verified records must never gain invented missing mechanics.
  const legacy = monster.source === 'legacy-reference';
  const cr = monster.cr ?? monster.challenge_rating ?? null;
  const pb = recordedNumber(monster.proficiency_bonus) ?? (legacy ? proficiencyForCr(cr) : null);
  const stats = monster.stats || monster.ability_scores || monster.abilities_scores || (legacy ? inferredStats(monster) : {});
  const dex = mod(stats.dexterity);
  const hp = recordedNumber(monster.hp ?? monster.hit_points, true);
  const ac = recordedNumber(monster.ac ?? monster.armor_class);
  return {
    ...monster,
    cr,
    challenge_rating: cr,
    hp,
    hit_points: hp,
    ac,
    armor_class: ac,
    speed: monster.speed ?? null,
    stats,
    proficiency_bonus: pb,
    initiativeMod: monster.initiativeMod == null ? dex : Number(monster.initiativeMod),
    skills: Array.isArray(monster.skills) ? monster.skills : legacy ? inferredSkills(monster, stats) : [],
    saving_throws: monster.saving_throws || [],
    actions: Array.isArray(monster.actions) && monster.actions.length ? monster.actions :
      Array.isArray(monster.attacks) && monster.attacks.length ? monster.attacks :
        legacy ? inferredAttacks(monster, stats, pb) : [],
    abilities_text: monster.abilities || monster.description || '',
    combat_ready: canUseCombatRecord(monster),
  };
}

export function monsterToCombatant(monster, copyIndex = 0) {
  const statBlock = normaliseMonsterStatBlock(monster);
  if (!canUseCombatRecord(statBlock)) throw new Error('This reference needs confirmed HP and AC before combat.');
  const name = statBlock.name || 'Creature';
  return {
    id: `${statBlock.id || name}-${copyIndex}-${Date.now()}`,
    name: copyIndex > 0 ? `${name} ${copyIndex + 1}` : name,
    type: 'monster',
    hp: statBlock.hp,
    maxHp: statBlock.hp,
    ac: statBlock.ac,
    initiativeMod: statBlock.initiativeMod,
    conditions: [],
    description: statBlock.description || statBlock.abilities || '',
    stats: statBlock.stats,
    skills: statBlock.skills,
    saving_throws: statBlock.saving_throws,
    actions: statBlock.actions,
    reactions: statBlock.reactions || [],
    bonus_actions: statBlock.bonus_actions || [],
    special_abilities: statBlock.special_abilities || [],
    legendary_actions: statBlock.legendary_actions || [],
    legendary_resistance: statBlock.legendary_resistance,
    spells: statBlock.spells,
    speed: statBlock.speed,
    mechanics_status: statBlock.mechanics_status,
    import_review_required: statBlock.import_review_required,
    cr: statBlock.cr,
    creature_type: statBlock.type || 'creature',
    tokenColor: '#EF4444',
    tokenSize: 40,
  };
}
