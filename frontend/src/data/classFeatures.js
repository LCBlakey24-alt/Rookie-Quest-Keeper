// Class Features Database - Actions, Bonus Actions, Reactions, and Passive abilities by class and level

export const CLASS_FEATURES = {
  barbarian: {
    hit_die: 12,
    spellcasting: null,
    features: [
      { level: 1, name: 'Rage', type: 'bonus_action', description: 'Enter a rage. +2 damage, resistance to physical damage, advantage on STR checks. Lasts 1 minute.', uses: '2/long rest' },
      { level: 1, name: 'Unarmored Defense', type: 'passive', description: 'AC = 10 + DEX + CON when not wearing armor' },
      { level: 2, name: 'Reckless Attack', type: 'action_modifier', description: 'Gain advantage on melee attacks this turn, but attacks against you have advantage until your next turn' },
      { level: 2, name: 'Danger Sense', type: 'passive', description: 'Advantage on DEX saves against effects you can see' },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action' },
      { level: 5, name: 'Fast Movement', type: 'passive', description: '+10 ft speed when not wearing heavy armor' },
      { level: 7, name: 'Feral Instinct', type: 'passive', description: 'Advantage on initiative, can act normally if surprised by raging' },
      { level: 9, name: 'Brutal Critical', type: 'passive', description: 'Roll 1 additional weapon damage die on critical hits' },
      { level: 11, name: 'Relentless Rage', type: 'passive', description: 'If reduced to 0 HP while raging, DC 10 CON save to drop to 1 HP instead' },
      { level: 15, name: 'Persistent Rage', type: 'passive', description: 'Rage only ends early if you choose or fall unconscious' },
      { level: 18, name: 'Indomitable Might', type: 'passive', description: 'STR checks minimum equal to STR score' },
      { level: 20, name: 'Primal Champion', type: 'passive', description: '+4 STR, +4 CON (max 24)' }
    ]
  },

  bard: {
    hit_die: 8,
    spellcasting: 'charisma',
    features: [
      { level: 1, name: 'Bardic Inspiration', type: 'bonus_action', description: 'Give ally a d6 inspiration die to add to one ability check, attack roll, or saving throw within 10 minutes', uses: 'CHA mod/long rest' },
      { level: 2, name: 'Jack of All Trades', type: 'passive', description: 'Add half proficiency bonus to any ability check you\'re not proficient in' },
      { level: 2, name: 'Song of Rest', type: 'passive', description: 'Allies regain extra 1d6 HP during short rest' },
      { level: 3, name: 'Expertise', type: 'passive', description: 'Double proficiency bonus on two skills' },
      { level: 5, name: 'Bardic Inspiration (d8)', type: 'bonus_action', description: 'Inspiration die increases to d8', uses: 'CHA mod/short rest' },
      { level: 5, name: 'Font of Inspiration', type: 'passive', description: 'Regain Bardic Inspiration on short rest' },
      { level: 6, name: 'Countercharm', type: 'action', description: 'Allies within 30ft have advantage on saves vs frightened/charmed while you perform' },
      { level: 10, name: 'Bardic Inspiration (d10)', type: 'bonus_action', description: 'Inspiration die increases to d10', uses: 'CHA mod/short rest' },
      { level: 10, name: 'Magical Secrets', type: 'passive', description: 'Learn 2 spells from any class' },
      { level: 15, name: 'Bardic Inspiration (d12)', type: 'bonus_action', description: 'Inspiration die increases to d12', uses: 'CHA mod/short rest' },
      { level: 20, name: 'Superior Inspiration', type: 'passive', description: 'Regain 1 Bardic Inspiration if you have none when rolling initiative' }
    ]
  },

  cleric: {
    hit_die: 8,
    spellcasting: 'wisdom',
    features: [
      { level: 1, name: 'Divine Domain', type: 'passive', description: 'Choose a divine domain that grants bonus spells and abilities' },
      { level: 2, name: 'Channel Divinity (1/rest)', type: 'action', description: 'Use divine energy to fuel magical effects. Turn Undead: Undead must flee for 1 minute on failed WIS save', uses: '1/short rest' },
      { level: 2, name: 'Turn Undead', type: 'action', description: 'Undead within 30ft must make WIS save or be turned for 1 minute' },
      { level: 5, name: 'Destroy Undead (CR 1/2)', type: 'passive', description: 'Undead CR 1/2 or lower are instantly destroyed when failing Turn Undead save' },
      { level: 6, name: 'Channel Divinity (2/rest)', type: 'action', description: 'Use Channel Divinity twice between rests', uses: '2/short rest' },
      { level: 8, name: 'Destroy Undead (CR 1)', type: 'passive', description: 'Destroy undead CR 1 or lower' },
      { level: 10, name: 'Divine Intervention', type: 'action', description: 'Call upon your deity for aid. Roll percentile dice - if roll <= cleric level, deity intervenes', uses: '1/long rest' },
      { level: 11, name: 'Destroy Undead (CR 2)', type: 'passive', description: 'Destroy undead CR 2 or lower' },
      { level: 14, name: 'Destroy Undead (CR 3)', type: 'passive', description: 'Destroy undead CR 3 or lower' },
      { level: 17, name: 'Destroy Undead (CR 4)', type: 'passive', description: 'Destroy undead CR 4 or lower' },
      { level: 18, name: 'Channel Divinity (3/rest)', type: 'action', description: 'Use Channel Divinity three times between rests', uses: '3/short rest' },
      { level: 20, name: 'Divine Intervention Improved', type: 'action', description: 'Divine Intervention automatically succeeds', uses: '1/long rest' }
    ]
  },

  druid: {
    hit_die: 8,
    spellcasting: 'wisdom',
    features: [
      { level: 1, name: 'Druidic', type: 'passive', description: 'Know the secret Druidic language' },
      { level: 2, name: 'Wild Shape', type: 'action', description: 'Transform into a beast you\'ve seen (max CR 1/4, no flying/swimming). Lasts hours = druid level / 2', uses: '2/short rest' },
      { level: 4, name: 'Wild Shape (CR 1/2)', type: 'action', description: 'Transform into beasts up to CR 1/2, can swim', uses: '2/short rest' },
      { level: 8, name: 'Wild Shape (CR 1)', type: 'action', description: 'Transform into beasts up to CR 1, can fly', uses: '2/short rest' },
      { level: 18, name: 'Timeless Body', type: 'passive', description: 'Age 10x slower, can\'t be magically aged' },
      { level: 18, name: 'Beast Spells', type: 'passive', description: 'Can cast spells in Wild Shape form' },
      { level: 20, name: 'Archdruid', type: 'passive', description: 'Unlimited Wild Shape uses, ignore verbal/somatic components' }
    ]
  },

  fighter: {
    hit_die: 10,
    spellcasting: null,
    subclass_level: 3,
    subclass_label: 'Martial Archetype',
    fighting_style_level: 1,
    fighting_styles: [
      { name: 'Archery', description: '+2 bonus to attack rolls with ranged weapons' },
      { name: 'Defense', description: '+1 AC while wearing armor' },
      { name: 'Dueling', description: '+2 damage when wielding one melee weapon in one hand and no other weapons' },
      { name: 'Great Weapon Fighting', description: 'Reroll 1s and 2s on damage dice with two-handed/versatile melee weapons' },
      { name: 'Protection', description: 'Reaction: impose disadvantage on attack against adjacent ally (requires shield)' },
      { name: 'Two-Weapon Fighting', description: 'Add ability modifier to off-hand attack damage' },
    ],
    features: [
      { level: 1, name: 'Fighting Style', type: 'passive', description: 'Choose a fighting style specialization', isChoice: true },
      { level: 1, name: 'Second Wind', type: 'bonus_action', description: 'Regain 1d10 + fighter level HP as a bonus action', uses: '1/short rest' },
      { level: 2, name: 'Action Surge', type: 'special', description: 'Take one additional action on your turn (1 use)', uses: '1/short rest' },
      { level: 3, name: 'Martial Archetype', type: 'passive', description: 'Choose your fighter subclass: Champion, Battle Master, or Eldritch Knight', isChoice: true },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action', replaces: null },
      { level: 9, name: 'Indomitable', type: 'reaction', description: 'Reroll a failed saving throw (1 use, must use new roll)', uses: '1/long rest' },
      { level: 11, name: 'Extra Attack (2)', type: 'passive', description: 'Attack three times when you take the Attack action', replaces: 'Extra Attack' },
      { level: 13, name: 'Indomitable (2 uses)', type: 'reaction', description: 'Reroll a failed saving throw (2 uses per long rest)', uses: '2/long rest', replaces: 'Indomitable' },
      { level: 17, name: 'Action Surge (2 uses)', type: 'special', description: 'Use Action Surge twice between rests (not same turn)', uses: '2/short rest', replaces: 'Action Surge' },
      { level: 17, name: 'Indomitable (3 uses)', type: 'reaction', description: 'Reroll a failed saving throw (3 uses per long rest)', uses: '3/long rest', replaces: 'Indomitable (2 uses)' },
      { level: 20, name: 'Extra Attack (3)', type: 'passive', description: 'Attack four times when you take the Attack action', replaces: 'Extra Attack (2)' },
    ],
    subclasses: {
      champion: {
        name: 'Champion',
        description: 'Focuses on raw physical power and combat consistency',
        features: [
          { level: 3, name: 'Improved Critical', type: 'passive', description: 'Critical hit on 19-20 (expanded critical range)' },
          { level: 7, name: 'Remarkable Athlete', type: 'passive', description: 'Add half proficiency bonus (round up) to STR, DEX, CON checks without proficiency. Running long jump +STR mod ft.' },
          { level: 10, name: 'Additional Fighting Style', type: 'passive', description: 'Choose a second Fighting Style', isChoice: true },
          { level: 15, name: 'Superior Critical', type: 'passive', description: 'Critical hit on 18-20 (further expanded critical range)', replaces: 'Improved Critical' },
          { level: 18, name: 'Survivor', type: 'passive', description: 'At start of turn, regain 5 + CON mod HP if below half and above 0' },
        ],
      },
      battle_master: {
        name: 'Battle Master',
        description: 'Employs martial maneuvers fueled by superiority dice',
        features: [
          { level: 3, name: 'Combat Superiority', type: 'resource', description: 'Learn 3 maneuvers, gain 4 superiority dice (d8). Regain on short/long rest. Save DC = 8 + prof + STR/DEX mod.', uses: '4/short rest' },
          { level: 3, name: 'Student of War', type: 'passive', description: 'Gain proficiency with one artisan\'s tools' },
          { level: 7, name: 'Know Your Enemy', type: 'passive', description: 'Study a creature for 1 min outside combat to learn if equal/superior/inferior in STR, DEX, CON, AC, HP, level, fighter levels' },
          { level: 10, name: 'Improved Combat Superiority', type: 'passive', description: 'Superiority dice become d10. Learn 2 additional maneuvers (5 total).' },
          { level: 15, name: 'Relentless', type: 'passive', description: 'If you have no superiority dice when rolling initiative, regain 1' },
          { level: 18, name: 'Superior Combat Superiority', type: 'passive', description: 'Superiority dice become d12. Learn 2 additional maneuvers (7 total).' },
        ],
        maneuvers: [
          { name: 'Commander\'s Strike', description: 'Forgo one attack; ally uses reaction to attack + superiority die damage' },
          { name: 'Disarming Attack', description: 'Add superiority die to damage; target drops one held item (STR save)' },
          { name: 'Distracting Strike', description: 'Add superiority die to damage; next ally attack has advantage' },
          { name: 'Evasive Footwork', description: 'Add superiority die to AC while moving' },
          { name: 'Feinting Attack', description: 'Bonus action feint; advantage on next attack + superiority die damage' },
          { name: 'Goading Attack', description: 'Add superiority die to damage; target has disadvantage attacking others (WIS save)' },
          { name: 'Lunging Attack', description: '+5 ft reach for one attack + superiority die damage' },
          { name: 'Maneuvering Attack', description: 'Add superiority die to damage; ally moves half speed no OA' },
          { name: 'Menacing Attack', description: 'Add superiority die to damage; target is frightened (WIS save)' },
          { name: 'Parry', description: 'Reaction: reduce melee damage by superiority die + DEX mod' },
          { name: 'Precision Attack', description: 'Add superiority die to attack roll' },
          { name: 'Pushing Attack', description: 'Add superiority die to damage; push Large or smaller 15 ft (STR save)' },
          { name: 'Rally', description: 'Bonus action: ally gains superiority die + CHA mod temp HP' },
          { name: 'Riposte', description: 'Reaction when missed: attack + superiority die damage' },
          { name: 'Sweeping Attack', description: 'On hit, deal superiority die damage to adjacent creature' },
          { name: 'Trip Attack', description: 'Add superiority die to damage; knock Large or smaller prone (STR save)' },
        ],
      },
      eldritch_knight: {
        name: 'Eldritch Knight',
        description: 'Combines martial prowess with arcane spellcasting',
        spellcasting: 'intelligence',
        features: [
          { level: 3, name: 'Spellcasting', type: 'passive', description: 'Cast wizard spells using Intelligence. Learn 3 spells (2 must be abjuration/evocation) + 2 cantrips.' },
          { level: 3, name: 'Weapon Bond', type: 'passive', description: 'Bond with up to two weapons. Cannot be disarmed; summon bonded weapon as bonus action.' },
          { level: 7, name: 'War Magic', type: 'bonus_action', description: 'After casting a cantrip, make one weapon attack as a bonus action' },
          { level: 10, name: 'Eldritch Strike', type: 'passive', description: 'Creature hit by your weapon attack has disadvantage on next save vs your spell' },
          { level: 15, name: 'Arcane Charge', type: 'passive', description: 'Teleport up to 30 ft when you Action Surge' },
          { level: 18, name: 'Improved War Magic', type: 'bonus_action', description: 'After casting any spell, make one weapon attack as bonus action', replaces: 'War Magic' },
        ],
      },
    },
  },

  monk: {
    hit_die: 8,
    spellcasting: null,
    features: [
      { level: 1, name: 'Unarmored Defense', type: 'passive', description: 'AC = 10 + DEX + WIS when not wearing armor' },
      { level: 1, name: 'Martial Arts', type: 'bonus_action', description: 'Make one unarmed strike as bonus action after Attack action. Martial arts die: d4' },
      { level: 2, name: 'Ki', type: 'resource', description: 'Ki points = monk level. Regain all on short rest', uses: 'Level/short rest' },
      { level: 2, name: 'Flurry of Blows', type: 'bonus_action', description: 'Spend 1 ki after Attack action to make 2 unarmed strikes as bonus action', uses: '1 ki' },
      { level: 2, name: 'Patient Defense', type: 'bonus_action', description: 'Spend 1 ki to take Dodge action as bonus action', uses: '1 ki' },
      { level: 2, name: 'Step of the Wind', type: 'bonus_action', description: 'Spend 1 ki to take Disengage or Dash as bonus action, jump distance doubled', uses: '1 ki' },
      { level: 2, name: 'Unarmored Movement', type: 'passive', description: '+10 ft speed when not wearing armor or shield' },
      { level: 3, name: 'Deflect Missiles', type: 'reaction', description: 'Reduce ranged weapon damage by 1d10 + DEX + monk level. Can catch and throw back for 1 ki' },
      { level: 4, name: 'Slow Fall', type: 'reaction', description: 'Reduce falling damage by 5 x monk level' },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action' },
      { level: 5, name: 'Stunning Strike', type: 'action_modifier', description: 'Spend 1 ki when you hit - target must CON save or be stunned until end of your next turn', uses: '1 ki' },
      { level: 6, name: 'Ki-Empowered Strikes', type: 'passive', description: 'Unarmed strikes count as magical' },
      { level: 7, name: 'Evasion', type: 'passive', description: 'DEX saves for half damage: take no damage on success, half on fail' },
      { level: 7, name: 'Stillness of Mind', type: 'action', description: 'End one charmed or frightened effect on yourself' },
      { level: 10, name: 'Purity of Body', type: 'passive', description: 'Immune to disease and poison' },
      { level: 13, name: 'Tongue of the Sun and Moon', type: 'passive', description: 'Understand all spoken languages, any creature understands you' },
      { level: 14, name: 'Diamond Soul', type: 'passive', description: 'Proficiency in all saving throws. Spend 1 ki to reroll failed save' },
      { level: 15, name: 'Timeless Body', type: 'passive', description: 'No frailty of age, can\'t be magically aged, don\'t need food or water' },
      { level: 18, name: 'Empty Body', type: 'action', description: 'Spend 4 ki to become invisible for 1 minute with resistance to all damage except force', uses: '4 ki' },
      { level: 20, name: 'Perfect Self', type: 'passive', description: 'Regain 4 ki if you have none when rolling initiative' }
    ]
  },

  paladin: {
    hit_die: 10,
    spellcasting: 'charisma',
    spellcasting_start: 2,
    features: [
      { level: 1, name: 'Divine Sense', type: 'action', description: 'Detect celestials, fiends, and undead within 60 ft', uses: '1 + CHA mod/long rest' },
      { level: 1, name: 'Lay on Hands', type: 'action', description: 'Heal HP from a pool equal to paladin level x 5, or cure disease/poison for 5 points', uses: 'Level x 5/long rest' },
      { level: 2, name: 'Fighting Style', type: 'passive', description: 'Choose a fighting style that grants combat bonuses' },
      { level: 2, name: 'Divine Smite', type: 'action_modifier', description: 'Expend spell slot when you hit to deal +2d8 radiant damage (+1d8 per slot above 1st, max 5d8). +1d8 vs undead/fiends' },
      { level: 3, name: 'Divine Health', type: 'passive', description: 'Immune to disease' },
      { level: 3, name: 'Channel Divinity', type: 'action', description: 'Sacred Weapon: +CHA to attacks for 1 minute. Turn the Unholy: Fiends/undead flee', uses: '1/short rest' },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action' },
      { level: 6, name: 'Aura of Protection', type: 'passive', description: 'You and allies within 10 ft add your CHA modifier to saving throws' },
      { level: 10, name: 'Aura of Courage', type: 'passive', description: 'You and allies within 10 ft can\'t be frightened' },
      { level: 11, name: 'Improved Divine Smite', type: 'passive', description: 'All melee weapon attacks deal +1d8 radiant damage' },
      { level: 14, name: 'Cleansing Touch', type: 'action', description: 'End one spell on yourself or willing creature you touch', uses: 'CHA mod/long rest' },
      { level: 18, name: 'Aura Improvements', type: 'passive', description: 'Auras extend to 30 ft' }
    ]
  },

  ranger: {
    hit_die: 10,
    spellcasting: 'wisdom',
    spellcasting_start: 2,
    features: [
      { level: 1, name: 'Favored Enemy', type: 'passive', description: 'Advantage on Survival checks to track and INT checks to recall info about chosen enemy type' },
      { level: 1, name: 'Natural Explorer', type: 'passive', description: 'Double proficiency on INT/WIS checks in favored terrain, difficult terrain doesn\'t slow group' },
      { level: 2, name: 'Fighting Style', type: 'passive', description: 'Choose a fighting style that grants combat bonuses' },
      { level: 3, name: 'Primeval Awareness', type: 'action', description: 'Spend spell slot to sense aberrations, celestials, dragons, elementals, fey, fiends, undead within 1 mile (6 in favored terrain)' },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action' },
      { level: 8, name: 'Land\'s Stride', type: 'passive', description: 'Move through nonmagical difficult terrain with no extra cost, advantage vs plants that impede movement' },
      { level: 10, name: 'Hide in Plain Sight', type: 'action', description: 'Spend 1 minute camouflaging to gain +10 to Stealth while still' },
      { level: 14, name: 'Vanish', type: 'bonus_action', description: 'Hide as bonus action, can\'t be tracked nonmagically unless you choose' },
      { level: 18, name: 'Feral Senses', type: 'passive', description: 'No disadvantage attacking creatures you can\'t see, know location of invisible creatures within 30 ft' },
      { level: 20, name: 'Foe Slayer', type: 'passive', description: 'Add WIS modifier to attack or damage roll against favored enemy once per turn' }
    ]
  },

  rogue: {
    hit_die: 8,
    spellcasting: null,
    features: [
      { level: 1, name: 'Expertise', type: 'passive', description: 'Double proficiency bonus on two skills' },
      { level: 1, name: 'Sneak Attack', type: 'action_modifier', description: 'Once per turn, deal extra 1d6 damage when you have advantage or ally is within 5ft of target' },
      { level: 2, name: 'Cunning Action', type: 'bonus_action', description: 'Dash, Disengage, or Hide as a bonus action' },
      { level: 3, name: 'Sneak Attack (2d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 2d6' },
      { level: 5, name: 'Uncanny Dodge', type: 'reaction', description: 'Halve the damage of an attack you can see', uses: 'Unlimited' },
      { level: 5, name: 'Sneak Attack (3d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 3d6' },
      { level: 7, name: 'Evasion', type: 'passive', description: 'DEX saves for half damage: take no damage on success, half on fail' },
      { level: 7, name: 'Sneak Attack (4d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 4d6' },
      { level: 9, name: 'Sneak Attack (5d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 5d6' },
      { level: 11, name: 'Reliable Talent', type: 'passive', description: 'Treat any d20 roll of 9 or lower as 10 for skills you\'re proficient in' },
      { level: 11, name: 'Sneak Attack (6d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 6d6' },
      { level: 13, name: 'Sneak Attack (7d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 7d6' },
      { level: 14, name: 'Blindsense', type: 'passive', description: 'Know location of hidden/invisible creatures within 10 ft' },
      { level: 15, name: 'Slippery Mind', type: 'passive', description: 'Proficiency in WIS saving throws' },
      { level: 15, name: 'Sneak Attack (8d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 8d6' },
      { level: 17, name: 'Sneak Attack (9d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 9d6' },
      { level: 18, name: 'Elusive', type: 'passive', description: 'No attack has advantage against you while you\'re not incapacitated' },
      { level: 19, name: 'Sneak Attack (10d6)', type: 'action_modifier', description: 'Sneak Attack damage increases to 10d6' },
      { level: 20, name: 'Stroke of Luck', type: 'special', description: 'Turn a miss into a hit, or treat failed ability check as natural 20', uses: '1/short rest' }
    ]
  },

  sorcerer: {
    hit_die: 6,
    spellcasting: 'charisma',
    features: [
      { level: 1, name: 'Sorcerous Origin', type: 'passive', description: 'Choose a sorcerous origin that grants additional abilities' },
      { level: 2, name: 'Font of Magic', type: 'resource', description: 'Sorcery points = sorcerer level. Convert spell slots to points or points to slots', uses: 'Level/long rest' },
      { level: 2, name: 'Flexible Casting', type: 'bonus_action', description: 'Convert sorcery points to spell slots or vice versa' },
      { level: 3, name: 'Metamagic', type: 'action_modifier', description: 'Choose 2 Metamagic options to modify your spells (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned)' },
      { level: 10, name: 'Metamagic (3)', type: 'passive', description: 'Learn one additional Metamagic option' },
      { level: 17, name: 'Metamagic (4)', type: 'passive', description: 'Learn one additional Metamagic option' },
      { level: 20, name: 'Sorcerous Restoration', type: 'passive', description: 'Regain 4 sorcery points on short rest' }
    ]
  },

  warlock: {
    hit_die: 8,
    spellcasting: 'charisma',
    pact_magic: true,
    features: [
      { level: 1, name: 'Otherworldly Patron', type: 'passive', description: 'Choose a patron that grants additional abilities and expanded spells' },
      { level: 1, name: 'Pact Magic', type: 'passive', description: 'Cast warlock spells using Pact Magic slots (all same level, regain on short rest)' },
      { level: 2, name: 'Eldritch Invocations (2)', type: 'passive', description: 'Learn 2 Eldritch Invocations for passive abilities or cantrip enhancements' },
      { level: 3, name: 'Pact Boon', type: 'passive', description: 'Choose Pact of the Chain (familiar), Blade (weapon), or Tome (cantrips)' },
      { level: 5, name: 'Eldritch Invocations (3)', type: 'passive', description: 'Learn additional Eldritch Invocation' },
      { level: 7, name: 'Eldritch Invocations (4)', type: 'passive', description: 'Learn additional Eldritch Invocation' },
      { level: 9, name: 'Eldritch Invocations (5)', type: 'passive', description: 'Learn additional Eldritch Invocation' },
      { level: 11, name: 'Mystic Arcanum (6th)', type: 'special', description: 'Cast one 6th-level spell once per long rest without using a slot', uses: '1/long rest' },
      { level: 12, name: 'Eldritch Invocations (6)', type: 'passive', description: 'Learn additional Eldritch Invocation' },
      { level: 13, name: 'Mystic Arcanum (7th)', type: 'special', description: 'Cast one 7th-level spell once per long rest without using a slot', uses: '1/long rest' },
      { level: 15, name: 'Eldritch Invocations (7)', type: 'passive', description: 'Learn additional Eldritch Invocation' },
      { level: 15, name: 'Mystic Arcanum (8th)', type: 'special', description: 'Cast one 8th-level spell once per long rest without using a slot', uses: '1/long rest' },
      { level: 17, name: 'Mystic Arcanum (9th)', type: 'special', description: 'Cast one 9th-level spell once per long rest without using a slot', uses: '1/long rest' },
      { level: 18, name: 'Eldritch Invocations (8)', type: 'passive', description: 'Learn additional Eldritch Invocation' },
      { level: 20, name: 'Eldritch Master', type: 'special', description: 'Spend 1 minute entreating patron to regain all Pact Magic slots', uses: '1/long rest' }
    ]
  },

  wizard: {
    hit_die: 6,
    spellcasting: 'intelligence',
    features: [
      { level: 1, name: 'Arcane Recovery', type: 'special', description: 'Once per day during short rest, recover spell slots totaling up to half wizard level (rounded up)', uses: '1/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Learn spells from wizard spell list. INT is spellcasting ability' },
      { level: 2, name: 'Arcane Tradition', type: 'passive', description: 'Choose a school of magic for specialization bonuses' },
      { level: 18, name: 'Spell Mastery', type: 'passive', description: 'Choose one 1st-level and one 2nd-level spell to cast at will' },
      { level: 20, name: 'Signature Spells', type: 'passive', description: 'Choose two 3rd-level spells - always prepared, cast once each at 3rd level without using a slot, regain on short rest' }
    ]
  }
};

// Helper function to get all features for a class up to a given level
export function getClassFeatures(className, level) {
  const classData = CLASS_FEATURES[className?.toLowerCase()];
  if (!classData) return [];
  
  return classData.features.filter(f => f.level <= level);
}

// Helper to get features of a specific type
export function getFeaturesByType(className, level, type) {
  return getClassFeatures(className, level).filter(f => f.type === type);
}

// Get actions for combat
export function getClassActions(className, level) {
  const actions = getClassFeatures(className, level).filter(f => 
    f.type === 'action' || f.type === 'special'
  );
  return actions;
}

// Get bonus actions for combat  
export function getClassBonusActions(className, level) {
  return getClassFeatures(className, level).filter(f => f.type === 'bonus_action');
}

// Get reactions for combat
export function getClassReactions(className, level) {
  return getClassFeatures(className, level).filter(f => f.type === 'reaction');
}

// Get passive features
export function getClassPassives(className, level) {
  return getClassFeatures(className, level).filter(f => f.type === 'passive');
}

// Get action modifiers (like Sneak Attack, Divine Smite)
export function getClassActionModifiers(className, level) {
  return getClassFeatures(className, level).filter(f => f.type === 'action_modifier');
}

// Get the highest version of a scaling feature (e.g., Sneak Attack)
export function getHighestFeatureVersion(className, level, featureBaseName) {
  const features = getClassFeatures(className, level)
    .filter(f => f.name.startsWith(featureBaseName))
    .sort((a, b) => b.level - a.level);
  return features[0] || null;
}

// Export class hit dice
export function getClassHitDie(className) {
  return CLASS_FEATURES[className?.toLowerCase()]?.hit_die || 8;
}

// Check if class is a spellcaster
export function isSpellcaster(className) {
  return !!CLASS_FEATURES[className?.toLowerCase()]?.spellcasting;
}

// Get spellcasting ability
export function getSpellcastingAbility(className) {
  return CLASS_FEATURES[className?.toLowerCase()]?.spellcasting || null;
}
