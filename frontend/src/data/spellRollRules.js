/**
 * How each damaging or healing spell in data/spellDatabase.js is rolled.
 *
 * The spell database already holds each spell's base dice and damage type;
 * this adds what a sheet needs to roll it at the table: whether it is a spell
 * attack (melee or ranged), a saving throw (and which ability), an automatic
 * hit, a rider on a weapon hit, or healing; how a cantrip grows with
 * character level; and the extra dice a higher spell slot adds.
 *
 * Values follow the 5e System Reference Document (SRD 5.1, CC-BY-4.0) and the
 * printed rules for the few non-SRD spells the database already lists. No
 * spell is added here that the database does not already contain.
 *
 * Fields:
 *   attack  'ranged' | 'melee'        a spell attack roll
 *   save    'STR' | 'DEX' | ...       targets make this saving throw
 *   auto    true                      no attack roll or save for damage
 *   rider   true                      extra damage added to a weapon hit
 *   heal    true                      restores hit points
 *   dice    'NdS[+NdS...]'            base damage or healing dice
 *   addMod  true                      add the spellcasting ability modifier
 *   type    damage type
 *   upcast  'NdS'                     added per slot level above the spell's
 *   upcastEvery 2                     ...or per two slot levels above it
 *   bySlot  { slot: 'NdS' }           dice by slot level (Elemental Weapon)
 *   cantrip true                      dice multiply at character level 5/11/17
 *   beams   true                      cantrip: more beams, not more dice
 *   darts   3                         Magic Missile: darts of 1d4+1, +1 per slot
 *   rays    3                         Scorching Ray: rays of `dice`, +1 per slot
 *   alt     { dice, label }           a second damage roll (Toll the Dead)
 *   fixed   n                         fixed damage, nothing to roll
 */
export const SPELL_ROLLS = {
  // Cantrips
  'Fire Bolt': { attack: 'ranged', dice: '1d10', type: 'fire', cantrip: true },
  'Ray of Frost': { attack: 'ranged', dice: '1d8', type: 'cold', cantrip: true },
  'Shocking Grasp': { attack: 'melee', dice: '1d8', type: 'lightning', cantrip: true },
  'Acid Splash': { save: 'DEX', dice: '1d6', type: 'acid', cantrip: true },
  'Chill Touch': { attack: 'ranged', dice: '1d8', type: 'necrotic', cantrip: true },
  'Sacred Flame': { save: 'DEX', dice: '1d8', type: 'radiant', cantrip: true },
  'Toll the Dead': { save: 'WIS', dice: '1d8', type: 'necrotic', cantrip: true, alt: { dice: '1d12', label: 'if hurt' } },
  'Word of Radiance': { save: 'CON', dice: '1d6', type: 'radiant', cantrip: true },
  'Produce Flame': { attack: 'ranged', dice: '1d8', type: 'fire', cantrip: true },
  'Thorn Whip': { attack: 'melee', dice: '1d6', type: 'piercing', cantrip: true },
  'Poison Spray': { save: 'CON', dice: '1d12', type: 'poison', cantrip: true },
  'Eldritch Blast': { attack: 'ranged', dice: '1d10', type: 'force', cantrip: true, beams: true },
  'Vicious Mockery': { save: 'WIS', dice: '1d4', type: 'psychic', cantrip: true },

  // 1st level
  'Magic Missile': { auto: true, darts: 3, type: 'force' },
  'Burning Hands': { save: 'DEX', dice: '3d6', type: 'fire', upcast: '1d6' },
  Thunderwave: { save: 'CON', dice: '2d8', type: 'thunder', upcast: '1d8' },
  'Chromatic Orb': { attack: 'ranged', dice: '3d8', type: 'chosen element', upcast: '1d8' },
  'Witch Bolt': { attack: 'ranged', dice: '1d12', type: 'lightning', upcast: '1d12' },
  'Ice Knife': { attack: 'ranged', dice: '1d10', type: 'piercing', burst: { save: 'DEX', dice: '2d6', type: 'cold', upcast: '1d6' } },
  'Guiding Bolt': { attack: 'ranged', dice: '4d6', type: 'radiant', upcast: '1d6' },
  'Inflict Wounds': { attack: 'melee', dice: '3d10', type: 'necrotic', upcast: '1d10' },
  'Hellish Rebuke': { save: 'DEX', dice: '2d10', type: 'fire', upcast: '1d10' },
  'Arms of Hadar': { save: 'STR', dice: '2d6', type: 'necrotic', upcast: '1d6' },
  'Dissonant Whispers': { save: 'WIS', dice: '3d6', type: 'psychic', upcast: '1d6' },
  Hex: { rider: true, dice: '1d6', type: 'necrotic' },
  'Divine Favor': { rider: true, dice: '1d4', type: 'radiant' },
  'Searing Smite': { rider: true, dice: '1d6', type: 'fire', upcast: '1d6' },
  'Thunderous Smite': { rider: true, dice: '2d6', type: 'thunder' },
  'Wrathful Smite': { rider: true, dice: '1d6', type: 'psychic' },
  "Hunter's Mark": { rider: true, dice: '1d6', type: 'weapon' },
  'Hail of Thorns': { save: 'DEX', dice: '1d10', type: 'piercing', upcast: '1d10' },
  'Cure Wounds': { heal: true, dice: '1d8', addMod: true, upcast: '1d8' },
  'Healing Word': { heal: true, dice: '1d4', addMod: true, upcast: '1d4' },

  // 2nd level
  'Scorching Ray': { attack: 'ranged', rays: 3, dice: '2d6', type: 'fire' },
  Shatter: { save: 'CON', dice: '3d8', type: 'thunder', upcast: '1d8' },
  'Spiritual Weapon': { attack: 'melee', dice: '1d8', addMod: true, type: 'force', upcast: '1d8', upcastEvery: 2 },
  Moonbeam: { save: 'CON', dice: '2d10', type: 'radiant', upcast: '1d10' },
  'Spike Growth': { auto: true, dice: '2d4', type: 'piercing (per 5 ft moved)' },
  'Heat Metal': { auto: true, dice: '2d8', type: 'fire', upcast: '1d8' },
  'Branding Smite': { rider: true, dice: '2d6', type: 'radiant', upcast: '1d6' },
  'Prayer of Healing': { heal: true, dice: '2d8', addMod: true, upcast: '1d8' },

  // 3rd level
  Fireball: { save: 'DEX', dice: '8d6', type: 'fire', upcast: '1d6' },
  'Lightning Bolt': { save: 'DEX', dice: '8d6', type: 'lightning', upcast: '1d6' },
  'Spirit Guardians': { save: 'WIS', dice: '3d8', type: 'radiant or necrotic', upcast: '1d8' },
  'Call Lightning': { save: 'DEX', dice: '3d10', type: 'lightning', upcast: '1d10' },
  'Hunger of Hadar': { auto: true, dice: '2d6', type: 'cold' },
  'Vampiric Touch': { attack: 'melee', dice: '3d6', type: 'necrotic', upcast: '1d6' },
  'Elemental Weapon': { rider: true, type: 'chosen element', bySlot: { 3: '1d4', 5: '2d4', 7: '3d4' } },
  'Mass Healing Word': { heal: true, dice: '1d4', addMod: true, upcast: '1d4' },

  // 4th level
  'Wall of Fire': { save: 'DEX', dice: '5d8', type: 'fire', upcast: '1d8' },
  'Ice Storm': { save: 'DEX', dice: '2d8+4d6', type: 'bludgeoning and cold', upcast: '1d8' },
  'Guardian of Faith': { save: 'DEX', fixed: 20, type: 'radiant' },
  Blight: { save: 'CON', dice: '8d8', type: 'necrotic', upcast: '1d8' },
  'Staggering Smite': { rider: true, dice: '4d6', type: 'psychic' },
  'Aura of Vitality': { heal: true, dice: '2d6' },

  // 5th level
  'Cone of Cold': { save: 'CON', dice: '8d8', type: 'cold', upcast: '1d8' },
  Cloudkill: { save: 'CON', dice: '5d8', type: 'poison', upcast: '1d8' },
  'Flame Strike': { save: 'DEX', dice: '4d6+4d6', type: 'fire and radiant', upcast: '1d6' },
  'Holy Weapon': { rider: true, dice: '2d8', type: 'radiant' },
  'Destructive Wave': { save: 'CON', dice: '5d6+5d6', type: 'thunder and radiant or necrotic' },
  'Banishing Smite': { rider: true, dice: '5d10', type: 'force' },
  'Synaptic Static': { save: 'INT', dice: '8d6', type: 'psychic' },
  'Mass Cure Wounds': { heal: true, dice: '3d8', addMod: true, upcast: '1d8' },
};

const normalise = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_KEY = Object.fromEntries(Object.entries(SPELL_ROLLS).map(([name, rule]) => [normalise(name), { name, ...rule }]));

/** The roll rule for a spell (by name), or null if it has nothing to roll. */
export function spellRollRule(spell) {
  const name = typeof spell === 'string' ? spell : spell?.name;
  return BY_KEY[normalise(name)] || null;
}

/** Cantrip damage tier: 1 below level 5, 2 from 5, 3 from 11, 4 from 17. */
export function cantripTier(characterLevel = 1) {
  const level = Number(characterLevel) || 1;
  if (level >= 17) return 4;
  if (level >= 11) return 3;
  if (level >= 5) return 2;
  return 1;
}

/** Parse 'NdS+NdS' into [{ count, sides }]. */
export function diceTerms(dice = '') {
  return String(dice).split('+').map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = part.match(/^(\d+)d(\d+)$/i);
    return match ? { count: Number(match[1]), sides: Number(match[2]) } : null;
  }).filter(Boolean);
}

/** Add `extra` dice to `terms`, merging into a term with the same die. */
function addDice(terms, extra, times = 1) {
  const result = terms.map((term) => ({ ...term }));
  if (!(times > 0)) return result;
  diceTerms(extra).forEach(({ count, sides }) => {
    const same = result.find((term) => term.sides === sides);
    if (same) same.count += count * times;
    else result.push({ count: count * times, sides });
  });
  return result;
}

const notationOf = (terms, modifier = 0) => {
  const dice = terms.map(({ count, sides }) => `${count}d${sides}`).join('+');
  if (!modifier) return dice;
  return `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
};

/**
 * Everything needed to roll a spell at the table.
 *
 * @param spell           { name, level }
 * @param characterLevel  for cantrip scaling
 * @param castingMod      spellcasting ability modifier
 * @param slotLevel       slot the spell is cast with (defaults to its level)
 * @returns null, or {
 *   kind: 'attack' | 'save' | 'auto' | 'rider' | 'heal',
 *   attack, save, type, notation, perHit, count, label, alt, burst, fixed
 * }
 *   `notation` is the dice to roll for one hit (one beam, ray or the whole
 *   spell); `count` is how many beams or rays there are.
 */
export function spellRoll(spell, { characterLevel = 1, castingMod = 0, slotLevel } = {}) {
  const rule = spellRollRule(spell);
  if (!rule) return null;
  const baseLevel = Number(spell?.level ?? 0) || 0;
  const slot = Math.max(baseLevel, Number(slotLevel) || baseLevel);
  const above = Math.max(0, slot - baseLevel);
  const kind = rule.heal ? 'heal' : rule.rider ? 'rider' : rule.attack ? 'attack' : rule.save ? 'save' : 'auto';
  const base = {
    kind,
    attack: rule.attack || null,
    save: rule.save || null,
    type: rule.type || null,
    slotLevel: baseLevel > 0 ? slot : 0,
    count: 1,
  };

  if (rule.fixed) return { ...base, fixed: rule.fixed, notation: null };

  if (rule.darts) {
    const darts = rule.darts + above;
    return { ...base, count: darts, notation: `${darts}d4+${darts}`, label: `${darts} darts` };
  }

  let terms;
  if (rule.bySlot) {
    const step = Object.keys(rule.bySlot).map(Number).filter((level) => level <= slot).sort((a, b) => b - a)[0];
    terms = diceTerms(rule.bySlot[step ?? Object.keys(rule.bySlot)[0]]);
  } else {
    terms = diceTerms(rule.dice);
  }

  let count = 1;
  if (rule.cantrip) {
    const tier = cantripTier(characterLevel);
    if (rule.beams) count = tier;
    else terms = terms.map((term) => ({ ...term, count: term.count * tier }));
  }
  if (rule.rays) count = rule.rays + above;
  if (rule.upcast && !rule.rays) {
    const steps = rule.upcastEvery ? Math.floor(above / rule.upcastEvery) : above;
    terms = addDice(terms, rule.upcast, steps);
  }

  const modifier = rule.addMod ? Number(castingMod) || 0 : 0;
  const result = { ...base, count, notation: notationOf(terms, modifier) };
  if (rule.beams) result.label = `${count} beam${count === 1 ? '' : 's'}`;
  if (rule.rays) result.label = `${count} rays`;
  if (rule.alt) {
    const altTerms = rule.cantrip
      ? diceTerms(rule.alt.dice).map((term) => ({ ...term, count: term.count * cantripTier(characterLevel) }))
      : diceTerms(rule.alt.dice);
    result.alt = { notation: notationOf(altTerms), label: rule.alt.label };
  }
  if (rule.burst) {
    result.burst = {
      save: rule.burst.save,
      type: rule.burst.type,
      notation: notationOf(addDice(diceTerms(rule.burst.dice), rule.burst.upcast, above)),
    };
  }
  return result;
}
