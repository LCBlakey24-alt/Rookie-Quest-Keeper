const FIRST_NAMES = ['Aldric','Brenna','Cedric','Daria','Elara','Finn','Gwen','Haldor','Isolde','Jareth','Keira','Lyric','Maren','Nolan','Orla','Pavel','Quinn','Rhea','Soren','Thea','Ulric','Vera','Wren','Xara','Yoren','Zara','Ashwin','Belka','Corrin','Drina','Egan','Faye','Gareth','Hestia','Ivan','Jorik','Kalara','Leif','Miriel','Nyx'];
const SURNAMES = ['Blackwood','Ironforge','Silverleaf','Stormwind','Darkholme','Brightwater','Thornwall','Ashburn','Frostweave','Shadowmere','Goldcrest','Ravenscar','Stonehearth','Windrunner','Embervale','Nightwhisper','Deepforge','Starbloom','Greycloak','Redmane'];
const RACES = ['Human','Elf','Dwarf','Halfling','Gnome','Tiefling','Half-Orc','Half-Elf','Dragonborn'];
const PERSONALITY = ['nervous and fidgety','bold and brash','quiet and observant','warm and welcoming','suspicious of strangers','eager to gossip','deeply religious','world-weary','overly cheerful','hiding a dark secret','fiercely loyal','desperately greedy','painfully honest','a chronic liar','gentle and soft-spoken','loud and boisterous'];
const QUIRKS = ['constantly adjusts their hat','has a prominent scar across their nose','hums an old marching tune','collects unusual stones','refers to everyone as friend','keeps a pet rat nearby','taps their fingers when thinking','speaks in riddles','limps slightly','wears mismatched boots','laughs at inappropriate moments','keeps glancing over their shoulder'];
const MOTIVATIONS = ['seeking revenge','trying to pay off a debt','searching for a lost sibling','protecting a dangerous secret','gathering information for a patron','trying to start a new life','obsessed with rare items','working undercover','saving money to open their own shop'];

export const NPC_COMBAT_PRESETS = [
  { id: 'commoner', label: 'Commoner / Civilian', role: 'Civilian', level: 1, hp: 4, ac: 10, pb: 2, stats: [10,10,10,10,10,10], skills: ['persuasion'], saves: [], attacks: [{ name: 'Club', bonus: '+2', damage: '1d4 bludgeoning', notes: 'Melee Weapon Attack' }], abilities: [{ name: 'Panic', description: 'If badly hurt, this NPC will usually flee, surrender, or call for help.' }] },
  { id: 'guard', label: 'Guard / Soldier', role: 'Guard', level: 2, hp: 16, ac: 16, pb: 2, stats: [13,12,12,10,11,10], skills: ['athletics','perception'], saves: ['strength'], attacks: [{ name: 'Spear', bonus: '+3', damage: '1d6+1 piercing', notes: 'Thrown 20/60; versatile 1d8+1' }, { name: 'Light Crossbow', bonus: '+3', damage: '1d8+1 piercing', notes: 'Range 80/320' }], abilities: [{ name: 'Shield Wall', description: 'While adjacent to an ally with a shield, this NPC tries to hold a doorway or protect a target.' }] },
  { id: 'bandit', label: 'Bandit / Cutthroat', role: 'Criminal', level: 2, hp: 13, ac: 12, pb: 2, stats: [11,14,12,10,10,11], skills: ['stealth','deception'], saves: ['dexterity'], attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2 slashing', notes: 'Melee Weapon Attack' }, { name: 'Dagger', bonus: '+4', damage: '1d4+2 piercing', notes: 'Thrown 20/60' }], abilities: [{ name: 'Dirty Fighting', description: 'Once per fight, this NPC gains advantage if an ally is within 5 ft. of the target.' }] },
  { id: 'scout', label: 'Scout / Ranger', role: 'Scout', level: 3, hp: 22, ac: 13, pb: 2, stats: [11,15,12,11,14,10], skills: ['perception','stealth','survival','nature'], saves: ['dexterity','wisdom'], attacks: [{ name: 'Shortsword', bonus: '+4', damage: '1d6+2 piercing', notes: 'Melee Weapon Attack' }, { name: 'Longbow', bonus: '+4', damage: '1d8+2 piercing', notes: 'Range 150/600' }], abilities: [{ name: 'Keen Tracker', description: 'Advantage on Wisdom (Survival) checks to track creatures.' }, { name: 'Skirmisher', description: 'Prefers cover, distance, and hit-and-run movement.' }] },
  { id: 'thug', label: 'Thug / Bruiser', role: 'Enforcer', level: 3, hp: 32, ac: 12, pb: 2, stats: [15,11,14,10,10,11], skills: ['athletics','intimidation'], saves: ['strength'], attacks: [{ name: 'Mace', bonus: '+4', damage: '1d6+2 bludgeoning', notes: 'Melee Weapon Attack' }, { name: 'Heavy Crossbow', bonus: '+2', damage: '1d10 piercing', notes: 'Range 100/400' }], abilities: [{ name: 'Pack Tactics', description: 'This NPC has advantage on attack rolls if an ally is within 5 ft. of the target.' }] },
  { id: 'priest', label: 'Priest / Acolyte', role: 'Priest', level: 5, hp: 27, ac: 13, pb: 3, stats: [10,10,12,13,16,13], skills: ['medicine','religion','insight','persuasion'], saves: ['wisdom','charisma'], attacks: [{ name: 'Mace', bonus: '+2', damage: '1d6 bludgeoning', notes: 'Melee Weapon Attack' }, { name: 'Sacred Flame', bonus: 'DC 13', damage: '1d8 radiant', notes: 'Dex save; spell effect' }], abilities: [{ name: 'Spellcasting', description: 'Suggested spells: guidance, sacred flame, cure wounds, bless, sanctuary, lesser restoration, spiritual weapon.' }, { name: 'Channel Faith', description: 'May heal, bolster allies, or call for divine aid depending on the scene.' }] },
  { id: 'veteran', label: 'Veteran / Captain', role: 'Veteran', level: 6, hp: 58, ac: 17, pb: 3, stats: [16,13,14,11,12,13], skills: ['athletics','intimidation','perception'], saves: ['strength','constitution'], attacks: [{ name: 'Multiattack', bonus: '', damage: '', notes: 'Makes two melee attacks.' }, { name: 'Longsword', bonus: '+6', damage: '1d8+3 slashing', notes: 'Versatile 1d10+3' }, { name: 'Heavy Crossbow', bonus: '+4', damage: '1d10+1 piercing', notes: 'Range 100/400' }], abilities: [{ name: 'Battle Command', description: 'As a bonus action, one ally who can hear this NPC may move up to half speed.' }] },
  { id: 'mage', label: 'Mage / Arcanist', role: 'Mage', level: 7, hp: 40, ac: 12, pb: 3, stats: [9,14,12,17,12,11], skills: ['arcana','history','investigation'], saves: ['intelligence','wisdom'], attacks: [{ name: 'Quarterstaff', bonus: '+2', damage: '1d6-1 bludgeoning', notes: 'Versatile 1d8-1' }, { name: 'Fire Bolt', bonus: '+6', damage: '2d10 fire', notes: 'Ranged spell attack' }], abilities: [{ name: 'Spellcasting', description: 'Suggested spells: mage hand, prestidigitation, shield, magic missile, misty step, scorching ray, counterspell, fireball.' }, { name: 'Arcane Escape', description: 'Uses movement, cover, and defensive magic before trading blows.' }] },
  { id: 'assassin', label: 'Assassin / Killer', role: 'Assassin', level: 8, hp: 78, ac: 15, pb: 3, stats: [11,18,14,13,12,14], skills: ['acrobatics','deception','perception','stealth'], saves: ['dexterity','intelligence'], attacks: [{ name: 'Multiattack', bonus: '', damage: '', notes: 'Makes two shortsword or dagger attacks.' }, { name: 'Shortsword', bonus: '+7', damage: '1d6+4 piercing plus 3d6 poison', notes: 'Melee Weapon Attack' }, { name: 'Light Crossbow', bonus: '+7', damage: '1d8+4 piercing plus 3d6 poison', notes: 'Range 80/320' }], abilities: [{ name: 'Sneak Attack', description: 'Once per turn, deals +4d6 damage when it has advantage or an ally is adjacent to the target.' }, { name: 'Ambusher', description: 'Dangerous in the first round if hidden or disguised.' }] },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mod = (score) => Math.floor((Number(score || 10) - 10) / 2);
const plus = (value) => `${value >= 0 ? '+' : ''}${value}`;

export function abilityArrayToStats(values) {
  return { strength: values[0], dexterity: values[1], constitution: values[2], intelligence: values[3], wisdom: values[4], charisma: values[5] };
}

export function generateCombatReadyNpc({ presetId = 'guard', race = '', name = '', role = '' } = {}) {
  const preset = NPC_COMBAT_PRESETS.find(item => item.id === presetId) || NPC_COMBAT_PRESETS[1];
  const stats = abilityArrayToStats(preset.stats);
  const chosenRace = race || pick(RACES);
  const npcName = name || `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`;
  const dexMod = mod(stats.dexterity);
  const initiative = plus(dexMod);
  return {
    name: npcName,
    race: chosenRace,
    occupation: role || preset.role,
    role: role || preset.role,
    class_name: preset.role,
    level: preset.level,
    alignment: 'Neutral',
    description: `${chosenRace} ${preset.role.toLowerCase()} who is ${pick(PERSONALITY)} and ${pick(QUIRKS)}.`,
    appearance: `${npcName} looks like a ${preset.role.toLowerCase()} used to trouble. Their stance suggests they know how to handle themselves in a fight.`,
    personality: pick(PERSONALITY),
    backstory: `Motivation: ${pick(MOTIVATIONS)}.`,
    hp: preset.hp,
    max_hp: preset.hp,
    ac: preset.ac,
    speed: '30 ft.',
    proficiency_bonus: preset.pb,
    stats,
    saving_throws: preset.saves,
    skills: preset.skills,
    attacks: preset.attacks,
    abilities: preset.abilities,
    spells: preset.id === 'mage' ? { casting_ability: 'Intelligence', spell_save_dc: 14, spell_attack_bonus: 6, cantrips: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'], known_spells: ['Shield', 'Magic Missile', 'Misty Step', 'Scorching Ray', 'Counterspell', 'Fireball'], slot_level: 3, slot_count: 3 } : preset.id === 'priest' ? { casting_ability: 'Wisdom', spell_save_dc: 13, spell_attack_bonus: 5, cantrips: ['Guidance', 'Sacred Flame'], known_spells: ['Cure Wounds', 'Bless', 'Sanctuary', 'Lesser Restoration', 'Spiritual Weapon'], slot_level: 3, slot_count: 2 } : null,
    location: '',
    notes: `Combat-ready quick NPC. Initiative ${initiative}. Use as ${preset.label}.`,
    combat_role: preset.id,
    voice_note: pick(['Deep and gravelly','High-pitched and nasally','Smooth and melodic','Rough and scratchy','Soft whisper','Booming baritone','Slight stutter','Sharp and clipped']),
  };
}

export function npcToClipboardText(npc) {
  const stats = npc.stats || {};
  const attacks = Array.isArray(npc.attacks) ? npc.attacks.map(a => `- ${a.name}${a.bonus ? ` ${a.bonus}` : ''}: ${a.damage || a.notes || ''}${a.notes && a.damage ? ` (${a.notes})` : ''}`).join('\n') : '';
  const abilities = Array.isArray(npc.abilities) ? npc.abilities.map(a => `- ${a.name}: ${a.description}`).join('\n') : '';
  return `${npc.name} — ${npc.race} ${npc.role || npc.class_name}\nAC ${npc.ac}, HP ${npc.hp}, Speed ${npc.speed}, PB +${npc.proficiency_bonus}\nSTR ${stats.strength} DEX ${stats.dexterity} CON ${stats.constitution} INT ${stats.intelligence} WIS ${stats.wisdom} CHA ${stats.charisma}\nSaves: ${(npc.saving_throws || []).join(', ') || 'None'}\nSkills: ${(npc.skills || []).join(', ') || 'None'}\n\nAttacks:\n${attacks || '- None'}\n\nAbilities:\n${abilities || '- None'}\n\nNotes: ${npc.notes || ''}`;
}
