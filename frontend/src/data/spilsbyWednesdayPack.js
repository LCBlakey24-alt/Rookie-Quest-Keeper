/**
 * Spilsby Wednesday - session 1 canon, from the GM's master source document
 * dated 4 November 2026.
 *
 * Everything here is transcribed from that document. Nothing is invented:
 * where the document says a thing is unresolved, this says so too, rather
 * than filling the gap. That is the rule the document itself sets out, and
 * it is also what AGENTS.md requires of campaign imports.
 *
 * The separation that matters
 * ---------------------------
 * The document's player-visibility rule is absolute: "Any NPC, location,
 * secret or world fact not explicitly recorded as learned by the Wednesday
 * party remains unknown to them." So every entry splits what the players
 * have actually learned (playerSummary) from what only the GM knows
 * (gmSecrets), and spilsbyWednesdayPack.test.js fails if a known GM secret
 * appears in a player-facing field.
 *
 * Wednesday is not Friday. The same world baseline is shared with the
 * Eldritch Heralds campaign, but outcomes, deaths, promotions, loot and
 * quest progress are separate. Nothing from Friday is imported here.
 */

const asList = (value) => (Array.isArray(value)
  ? value
  : String(value || '').split(';').map((item) => item.trim()).filter(Boolean));

const makeEntry = ({
  id, destination, title, category, playerSummary,
  gmSecrets = '', names = [], locations = [], hooks = [], tbd = '',
}) => ({
  id,
  destination,
  title,
  category,
  playerSummary,
  gmSecrets,
  names: asList(names),
  locations: asList(locations),
  hooks: asList(hooks),
  tbd,
});

/** The campaign's state at the end of session 1. */
export const spilsbyWednesdaySnapshot = {
  campaign: 'Spilsby Wednesday - Tia-Karta',
  rulesEdition: '2014',
  rulesNote: 'D&D 5e 2014-style rules plus locked Tia-Karta homebrew.',
  partyCount: 3,
  currentLocation: 'Outside the front door of Hollowmere Manor',
  currentObjective: 'Enter Hollowmere Manor and clear the infestation',
  sessionsCompleted: 1,
  manorInteriorExplored: false,
  infestationCleared: false,
  snapshotDate: '2026-11-04',
};

/** The three player characters, as the master document records them. */
export const spilsbyWednesdayParty = [
  {
    player: 'Josh',
    character: 'Josh',
    species: 'Wood Elf',
    classAndSubclass: 'Druid 5 - Circle of the Moon',
    background: 'Folk Hero',
    armorClass: 15,
    maxHp: 41,
    speed: '35 ft',
    abilities: { strength: 13, dexterity: 15, constitution: 16, intelligence: 15, wisdom: 18, charisma: 15 },
    spellSaveDc: 15,
    spellAttack: '+7',
    notes: 'Leather armour and shield equipped, giving AC 15. Village occupation: Photographer / Momentkeeper.',
  },
  {
    player: 'Kathryn',
    character: 'Rina Ironside',
    species: 'Goliath',
    classAndSubclass: 'Fighter 5 - Battle Master',
    background: 'Soldier',
    armorClass: 19,
    maxHp: 54,
    speed: '30 ft',
    abilities: { strength: 19, dexterity: 13, constitution: 18, intelligence: 11, wisdom: 13, charisma: 11 },
    spellSaveDc: null,
    spellAttack: null,
    notes: 'Chain Mail + Shield + Defense = AC 19. 4d8 Superiority Dice per short rest.',
  },
  {
    player: 'Paul',
    character: 'Orren Oakenshade',
    species: 'Wood Elf',
    classAndSubclass: 'Druid 5 - Circle of the Land (Forest)',
    background: 'Outlander',
    armorClass: 16,
    maxHp: 38,
    speed: '35 ft',
    abilities: { strength: 13, dexterity: 16, constitution: 14, intelligence: 12, wisdom: 20, charisma: 10 },
    spellSaveDc: 16,
    spellAttack: '+8',
    notes: 'Forest Circle spells always prepared: Barkskin, Spider Climb, Call Lightning, Plant Growth.',
  },
];

/**
 * What each NPC's status is from the players' side.
 *
 * This is the discovery state, not the NPC's stat block. Creating an NPC
 * profile does not make that NPC known to the players.
 */
export const spilsbyWednesdayDiscovery = [
  { npc: 'Edwin Hollowmere', status: 'met', playersKnow: 'Owner of Hollowmere Manor; requested help clearing an infestation.' },
  { npc: 'Corvin Hale', status: 'known by name through Edwin; not met', playersKnow: "Edwin's partner. Exact details depend on what Edwin said in session." },
  { npc: 'Firestarter', status: 'met and killed', playersKnow: 'Enemy encountered when the party returned to the burning village. Rina killed him with one sword strike.' },
  { npc: 'Opian', status: 'encountered in disguise; true identity unknown to players', playersKnow: 'Appeared as a cow and was involved in the mountain event and the Chaos Token agreement.' },
  { npc: 'Koltoro', status: 'encountered but identity unknown to players', playersKnow: 'The powerful figure fought by the other adventurers at the mountain summit.' },
];

export const spilsbyWednesdayLocations = [
  { location: 'Artificial/Fantasy Village', status: 'experienced; destroyed by fire' },
  { location: 'Mountain Summit', status: 'visited' },
  { location: 'Hollowmere Manor', status: 'discovered and reached; interior not yet explored' },
];

export const spilsbyWednesdayPack = {
  title: 'Spilsby Wednesday - Session 1 Canon',
  subtitle: 'Current campaign state, party, discoveries, resources and planned Hollowmere material, from the GM master source of 4 November 2026.',
  entries: [
    makeEntry({
      id: 'spilsby-snapshot',
      destination: 'sessionNotes',
      title: 'Campaign Snapshot after Session 1',
      category: 'Session State',
      playerSummary: 'The party stands outside the front door of Hollowmere Manor, hired by Edwin Hollowmere to clear an infestation inside. Session 1 is complete; the manor interior has not been explored.',
      gmSecrets: 'Infestation not cleared. Manor arrival confirmed. Three level-5 characters.',
      names: 'Edwin Hollowmere',
      locations: 'Hollowmere Manor',
      hooks: 'Enter the manor and clear the infestation.',
    }),
    makeEntry({
      id: 'spilsby-session-1-record',
      destination: 'chronicle',
      title: 'Session 1 - What Happened',
      category: 'Chronicle',
      playerSummary: [
        'The party began trapped inside a village where things increasingly felt wrong.',
        'Sent to find missing cows, they followed the trail toward the mountain.',
        'At the summit they found another adventuring group fighting a powerful figure.',
        'A cow broke a piece of the mountain free and drove it through that figure’s chest.',
        'The resulting explosion led into a Chaos Token agreement, which the party accepted.',
        'They woke at the summit and found an impossibly smooth, reflective, repellent glass-like shard.',
        'Hearing screams from the village they returned, confronted the Firestarter, and Rina killed him with a single sword strike to the head.',
        'The village burned down.',
        'Heading toward Balderin they found Edwin Hollowmere’s request-for-help flyer, met him, and accepted the job at Hollowmere Manor.',
        'They persuaded Edwin to tell them about his partner, Corvin Hale.',
        'They used one charge of Edwin’s teleportation stone to travel directly to the manor, leaving two charges.',
        'The session ended outside the front door, about to enter.',
      ].join(' '),
      gmSecrets: 'The cow was Opian in disguise. The mountain opponent was Koltoro. The glass-like shard is a fragment of Koltoro’s heart. The players know none of this.',
      names: 'Edwin Hollowmere; Corvin Hale; Firestarter; Rina Ironside',
      locations: 'Artificial/Fantasy Village; Mountain Summit; Hollowmere Manor; Balderin',
    }),
    makeEntry({
      id: 'spilsby-party-resources',
      destination: 'inventory',
      title: 'Party Inventory & Campaign Resources',
      category: 'Inventory',
      playerSummary: 'The party carries a shard that is incredibly shiny, unnaturally smooth and repels many materials and substances. They hold a teleportation stone with 2 charges remaining, and an accepted Chaos Token arrangement. Josh carries a Momentcatcher Camera.',
      gmSecrets: 'The shard is a fragment of Koltoro’s heart. One teleport charge was spent reaching Hollowmere Manor. The Chaos Token arrangement came from Opian after the mountain explosion.',
      names: 'Josh; Opian',
      hooks: 'Keep the shard’s player-facing name generic until its nature is earned in play.',
    }),
    makeEntry({
      id: 'spilsby-momentcatcher-camera',
      destination: 'inventory',
      title: 'Momentcatcher Camera',
      category: 'Wondrous Item',
      playerSummary: 'Common wondrous item, no attunement, 2 lb. A compact box camera that develops a loaded parchment slip into a hand-drawn magical image of whatever was in front of the lens. Holds one slip at a time; Josh starts with 8 prepared slips. A sheet of parchment costs 1 sp and cuts into 4 slips. Taking a photograph is an Action; the image develops over 1 minute. It records appearances, not hidden truth, and sees nothing the lens could not.',
      gmSecrets: 'A creature studying a relevant photograph for at least 1 minute may gain Advantage on an Intelligence (Investigation) check to examine a visible detail in it, once per clue per photograph.',
      names: 'Josh',
      hooks: 'Photographs are mundane parchment once developed and can be torn, burned or soaked.',
    }),
    makeEntry({
      id: 'spilsby-chaos-and-fate-tokens',
      destination: 'campaignRules',
      title: 'Chaos Tokens and Fate Tokens',
      category: 'Campaign Rules',
      playerSummary: 'Chaos Tokens are a shared party resource earned through natural 20s, strong roleplay, clever ideas, brave decisions and memorable moments. One token can nudge a d20, add 1d4, grant an extra Reaction, move 10 ft without opportunity attacks, or adjust a damage die. Two tokens buy an extra attack or Bonus Action, a reroll, or cancel Disadvantage. Three tokens buy an extra Action, drop to 1 HP instead of 0, or Advantage before rolling. Effects stack and can be bought repeatedly.',
      gmSecrets: 'Every Chaos Token spent gives the DM one Fate Token. Fate Tokens are committed before initiative and rolled 1d8 each: 1 Fated Vitality +10 HP, 2 Fated Defence +1 AC, 3 Fated Accuracy +1 attack, 4 Fated Power +2 damage, 5 Relentless Assault +1 attack on the Attack action, 6 Legendary Action, 7 Legendary Reaction, 8 Legendary Resistance.',
      hooks: 'Chaos spent by the party arms the DM in equal measure.',
    }),
    makeEntry({
      id: 'spilsby-locked-homebrew',
      destination: 'campaignRules',
      title: 'Locked Tia-Karta Homebrew',
      category: 'Campaign Rules',
      playerSummary: 'Spell Slot Combining: lower-level slots may combine to exactly the level being cast, if the character can normally cast that level. Higher slots cannot split and combined slots cannot be banked. Exhaustion Emergency Casting: each voluntarily taken exhaustion level covers one missing spell-slot level. Overexertion Attacks: after a turn’s normal attacks, each extra weapon or unarmed attack costs 1 exhaustion, and grants attacks only. Short Rest: minimum 1 continuous hour, 1 Hit Die per full hour. Long Rest: 6 hours; resources refresh but HP does not automatically return to full - that needs a specialist healing bed or equivalent facility.',
      gmSecrets: '',
      hooks: 'The long-rest HP rule makes healing facilities a resource worth seeking.',
    }),
    makeEntry({
      id: 'spilsby-hollowmere-prep',
      destination: 'encounters',
      title: 'Hollowmere Manor - Planned Encounters (GM only)',
      category: 'Encounter Prep',
      playerSummary: '',
      gmSecrets: [
        'None of this is confirmed in-session yet; the party is outside the front door.',
        'HM-01 Ceiling Skitter Ambush: medium attrition. 4 Hollowmere Giant Centipedes + 1 Chitin Guard Centipede in the entrance hall / service corridor. Triggered when the party crosses beneath the first webbed ceiling section. If trivial after round 1, two more arrive from a wall vent at initiative 10 on round 2.',
        'HM-02 The Breeding Gallery: hard tactical. 2 Chitin Guards + 4 Giant Centipedes, rotten gallery floor, 3 Egg Clusters (AC 12, HP 10, vulnerable to fire). One intact cluster hatches a centipede at initiative 10 on rounds 2 and 3. A DC 15 Nature or Animal Handling check using food or scent suppresses one cluster as an action.',
        'HM-03 Broodmother of Hollowmere: hard boss. Brood-Centipede Queen, Large monstrosity, AC 15, HP 82 base (92 if the party enters completely fresh), speed 40 ft and climb 40 ft, saves DEX +6 CON +6, blindsight 30 ft, attack +6 / save DC 13. Supported by 2 hidden Giant Centipedes and 2 dormant Egg Clusters in a cellar chamber with pillars, raised wine racks and climbable walls.',
        'Broodmother actions: Multiattack two Bites, or Bite and Tail Lash. Bite +6, 1d8+3 piercing + 1d6 poison, DC 13 CON or Poisoned. Tail Lash +6, reach 10 ft, 1d8+3 bludgeoning, DC 13 STR or pushed 10 ft. Brood Spray recharge 5-6, 15-ft cone, DC 13 DEX, 3d6 poison, failure also -10 ft speed. Skittering Burst bonus action 3/encounter. Chitin Curl reaction +2 AC. Nest Pulse at initiative 10 hatches a centipede or forces DC 13 DEX, maximum 3 extra centipedes.',
        'Balance note from the source: Josh now has 41 max HP, so use the full-strength versions by default; optional reinforcements are appropriate if all major resources are intact.',
      ].join(' '),
      locations: 'Hollowmere Manor',
      hooks: 'Victory is the Broodmother defeated or driven off and the active egg clusters destroyed or suppressed.',
    }),
    makeEntry({
      id: 'spilsby-hollowmere-rewards',
      destination: 'inventory',
      title: 'Hollowmere Rewards (GM only until earned)',
      category: 'Rewards',
      playerSummary: '',
      gmSecrets: [
        'Suggested Edwin payment: 225 gp total, 75 gp each, after proof the infestation is cleared.',
        'Harvestable: Centipede Venom Gland DC 14 Medicine/Nature, max 3, next weapon or ammo hit +1d6 poison, 25 gp each. Broodmother Venom Sac DC 15, 2 potent doses, next weapon hit +2d6 poison and DC 13 CON halves, 50 gp each. Reinforced Chitin Plate DC 13 Survival, 1 per Guard and 2 per Broodmother, crafting component, 20 gp each. Pheromone Gland DC 13 Nature, vermin repellent component, 40 gp. Brood Mandibles automatic, 1 pair, trophy, 30 gp.',
        'Optional alternative reward: 2 Potions of Healing plus one free identification of a recovered magical item later.',
        'Do not reveal hidden Hollowmere vault or casino material until earned in play.',
      ].join(' '),
      locations: 'Hollowmere Manor',
      names: 'Edwin Hollowmere',
    }),
    makeEntry({
      id: 'spilsby-continuity-holds',
      destination: 'sessionNotes',
      title: 'Open Continuity Holds',
      category: 'GM Notes',
      playerSummary: '',
      gmSecrets: 'Unresolved at the time of the snapshot, recorded rather than guessed: whether Josh is intentionally both player and character name; Rina Ironstride vs Ironside spelling, current sheet being authoritative; Orren’s rock-formation timeline; Neremore vs Nerime; Sho Unarith vs Sho’narith; Balgura government and magic licensing; the exact Wednesday in-world date and the stasis cause, location and awakening trigger; Meritheras exact magical build; Darktoe’s relationships and abilities; Aaron Crow’s identity and mechanics; Malerin’s surname, age, origin, reason for burning the village and relationship history with his sister; and whether Corvin is inside or outside Hollowmere Manor.',
      tbd: 'These are open questions from the source document, not decisions.',
    }),
  ],
};

export default spilsbyWednesdayPack;
