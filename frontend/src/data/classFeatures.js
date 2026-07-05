// Class Features Database - Actions, Bonus Actions, Reactions, and Passive abilities by class and level

export const CLASS_FEATURES = {
  barbarian: {
    hit_die: 12,
    spellcasting: null,
    subclass_level: 3,
    subclass_label: 'Primal Path',
    subclasses: {
      berserker: {
        name: 'Path of the Berserker',
        description: 'Channel unbridled fury in battle, entering a devastating frenzy at the cost of exhaustion.',
        features: [
          { level: 3, name: 'Frenzy', description: 'While raging, you can make a single melee weapon attack as a bonus action each turn. Gain 1 exhaustion when rage ends.' },
          { level: 6, name: 'Mindless Rage', description: 'While raging, you can\'t be charmed or frightened. If charmed/frightened when you rage, the effect is suspended.' },
          { level: 10, name: 'Intimidating Presence', description: 'Frighten a creature within 30 ft. WIS save or frightened until end of your next turn.' },
          { level: 14, name: 'Retaliation', description: 'When you take damage from a creature within 5 ft, you can use your reaction to make a melee weapon attack against it.' },
        ],
      },
    },
    features: [
      { level: 1, name: 'Rage', type: 'bonus_action', description: 'Enter a rage. +2 damage, resistance to physical damage, advantage on STR checks. Lasts 1 minute.', uses: '2/long rest' },
      { level: 1, name: 'Unarmored Defense', type: 'passive', description: 'AC = 10 + DEX + CON when not wearing armor' },
      { level: 2, name: 'Reckless Attack', type: 'action_modifier', description: 'Gain advantage on melee attacks this turn, but attacks against you have advantage until your next turn' },
      { level: 2, name: 'Danger Sense', type: 'passive', description: 'Advantage on DEX saves against effects you can see' },
      { level: 3, name: 'Primal Path', type: 'passive', description: 'Choose a Primal Path. Built-in automation is limited to public-license subclass data.', isChoice: true },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action' },
      { level: 5, name: 'Fast Movement', type: 'passive', description: '+10 ft speed when not wearing heavy armor' },
      { level: 7, name: 'Feral Instinct', type: 'passive', description: 'Advantage on initiative, can act normally if surprised by raging' },
      { level: 9, name: 'Brutal Critical', type: 'passive', description: 'Roll 1 additional weapon damage die on critical hits' },
      { level: 11, name: 'Relentless Rage', type: 'passive', description: 'If reduced to 0 HP while raging, DC 10 CON save to drop to 1 HP instead' },
      { level: 13, name: 'Brutal Critical (2)', type: 'passive', description: 'Roll 2 additional weapon damage dice on critical hits' },
      { level: 15, name: 'Persistent Rage', type: 'passive', description: 'Rage only ends early if you choose or fall unconscious' },
      { level: 17, name: 'Brutal Critical (3)', type: 'passive', description: 'Roll 3 additional weapon damage dice on critical hits' },
      { level: 18, name: 'Indomitable Might', type: 'passive', description: 'STR checks minimum equal to STR score' },
      { level: 20, name: 'Primal Champion', type: 'passive', description: '+4 STR, +4 CON (max 24)' },
    ],
    features_2024: [
      { level: 1, name: 'Rage', type: 'bonus_action', description: 'Enter a rage. Advantage STR checks/saves, resistance BPS damage, Rage Damage bonus. Uses scale with level.', uses: 'PB/long rest' },
      { level: 1, name: 'Unarmored Defense', type: 'passive', description: 'AC = 10 + DEX + CON when not wearing armor' },
      { level: 1, name: 'Weapon Mastery', type: 'passive', description: 'Master 2 simple/martial melee weapons' },
      { level: 2, name: 'Danger Sense', type: 'passive', description: 'Advantage on DEX saves vs effects you can see' },
      { level: 2, name: 'Reckless Attack', type: 'action_modifier', description: 'Advantage on STR attacks, attackers have advantage on you' },
      { level: 3, name: 'Primal Path', type: 'passive', description: 'Choose a Primal Path. Built-in automation is limited to public-license subclass data.', isChoice: true },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice per Attack action' },
      { level: 5, name: 'Fast Movement', type: 'passive', description: '+10 ft speed without heavy armor' },
      { level: 7, name: 'Feral Instinct', type: 'passive', description: 'Advantage on initiative' },
      { level: 9, name: 'Brutal Strike', type: 'passive', description: 'Replace one Reckless Attack hit with Forceful Blow (push 15ft) or Hamstring Blow (reduce speed 15ft)' },
      { level: 11, name: 'Relentless Rage', type: 'passive', description: 'Drop to 1 HP instead of 0 while raging (DC increases each use)' },
      { level: 13, name: 'Improved Brutal Strike', type: 'passive', description: 'Add Staggering Blow and Sundering Blow options' },
      { level: 15, name: 'Persistent Rage', type: 'passive', description: 'Rage doesn\'t end early; no concentration-like check' },
      { level: 17, name: 'Improved Brutal Strike (2)', type: 'passive', description: 'Brutal Strike deals 2d10 extra. New options available.' },
      { level: 18, name: 'Indomitable Might', type: 'passive', description: 'STR/CON checks minimum = ability score' },
      { level: 20, name: 'Primal Champion', type: 'passive', description: '+4 STR, +4 CON (max 25)' },
    ],
  },

  bard: {
    hit_die: 8,
    spellcasting: 'charisma',
    subclass_level: 3,
    subclass_label: 'Bard College',
    subclasses: {
      college_of_lore: {
        name: 'College of Lore',
        description: 'Pursue knowledge and collect bits of lore from every source. Cutting Words lets you diminish foes\' abilities.',
        features: [
          { level: 3, name: 'Bonus Proficiencies', description: 'Gain proficiency in three skills of your choice.' },
          { level: 3, name: 'Cutting Words', description: 'Use Bardic Inspiration reaction to subtract the die from an enemy\'s attack, ability check, or damage roll.' },
          { level: 6, name: 'Additional Magical Secrets', description: 'Learn two spells from any class. They count as bard spells for you.' },
          { level: 14, name: 'Peerless Skill', description: 'Expend one Bardic Inspiration use to add the die to your own ability check.' },
        ],
      },
      college_of_valor: {
        name: 'College of Valor',
        description: 'Inspire allies in battle. Gain martial training and embolden others with your Bardic Inspiration.',
        features: [
          { level: 3, name: 'Combat Inspiration', description: 'Allies can add Bardic Inspiration die to weapon damage roll or to AC as a reaction.' },
          { level: 3, name: 'Bonus Proficiencies', description: 'Gain proficiency with medium armor, shields, and martial weapons.' },
          { level: 6, name: 'Extra Attack', description: 'Attack twice when you take the Attack action.' },
          { level: 14, name: 'Battle Magic', description: 'When you cast a bard spell as an action, make one weapon attack as a bonus action.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Bardic Inspiration', type: 'bonus_action', description: 'Give ally a Bardic Inspiration die (d6). Uses = CHA modifier, regain on long rest.', uses: 'CHA mod/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast bard spells using CHA. Ritual casting. Spell preparation replaces spells known.' },
      { level: 2, name: 'Expertise', type: 'passive', description: 'Double proficiency bonus on two skills' },
      { level: 2, name: 'Jack of All Trades', type: 'passive', description: 'Add half proficiency bonus to any ability check not using proficiency' },
      { level: 3, name: 'Bard Subclass', type: 'passive', description: 'Choose a Bard subclass', isChoice: true },
      { level: 5, name: 'Bardic Inspiration (d8)', type: 'bonus_action', description: 'Inspiration die increases to d8', uses: 'CHA mod/short rest' },
      { level: 5, name: 'Font of Inspiration', type: 'passive', description: 'Regain all Bardic Inspiration on short or long rest' },
      { level: 7, name: 'Countercharm', type: 'reaction', description: 'Reaction when ally fails save vs charmed/frightened: reroll with Bardic Inspiration die' },
      { level: 9, name: 'Expertise (2)', type: 'passive', description: 'Double proficiency on two more skills' },
      { level: 10, name: 'Bardic Inspiration (d10)', type: 'bonus_action', description: 'Inspiration die increases to d10', uses: 'CHA mod/short rest' },
      { level: 10, name: 'Magical Secrets', type: 'passive', description: 'Learn 2 spells from any spell list' },
      { level: 14, name: 'Magical Secrets (2)', type: 'passive', description: 'Learn 2 more spells from any spell list' },
      { level: 15, name: 'Bardic Inspiration (d12)', type: 'bonus_action', description: 'Inspiration die increases to d12', uses: 'CHA mod/short rest' },
      { level: 18, name: 'Superior Inspiration', type: 'passive', description: 'Regain 2 Bardic Inspiration uses when you roll initiative and have none' },
      { level: 20, name: 'Words of Creation', type: 'passive', description: 'When you roll Bardic Inspiration, you can roll twice and use either result. Once per turn, impose disadvantage on a save.' },
    ],
  },

  cleric: {
    hit_die: 8,
    spellcasting: 'wisdom',
    subclass_level: 1,
    subclass_label: 'Divine Domain',
    subclasses: {
      life_domain: {
        name: 'Life Domain',
        description: 'Focus on the vibrant positive energy that sustains all life. Superior healing magic and heavy armor.',
        features: [
          { level: 1, name: 'Bonus Proficiency', description: 'Gain proficiency with heavy armor.' },
          { level: 1, name: 'Disciple of Life', description: 'Whenever you use a spell of 1st level or higher to restore HP, the creature regains additional HP equal to 2 + spell level.' },
          { level: 2, name: 'Preserve Life', description: 'Channel Divinity: Restore HP equal to 5x cleric level, split among creatures within 30 ft.' },
          { level: 6, name: 'Blessed Healer', description: 'When you cast a healing spell on another, you regain HP equal to 2 + spell level.' },
          { level: 8, name: 'Divine Strike', description: 'Once per turn, deal an extra 1d8 radiant damage with a weapon attack (2d8 at 14th level).' },
          { level: 17, name: 'Supreme Healing', description: 'When you roll to restore HP with a healing spell, use the maximum possible value instead of rolling.' },
        ],
      },
      light_domain: {
        name: 'Light Domain',
        description: 'Wield the power of light and fire, burning away darkness and punishing foes with radiant flame.',
        features: [
          { level: 1, name: 'Bonus Cantrip', description: 'Gain the Light cantrip if you don\'t already have it.' },
          { level: 1, name: 'Warding Flare', description: 'Impose disadvantage on an attack roll against you. Uses: WIS modifier per long rest.' },
          { level: 2, name: 'Radiance of the Dawn', description: 'Channel Divinity: Dispel magical darkness in 30 ft. Hostile creatures make CON save or take 2d10+cleric level radiant damage.' },
          { level: 6, name: 'Improved Flare', description: 'Use Warding Flare when a creature you can see attacks a creature other than you within 30 ft.' },
          { level: 8, name: 'Potent Spellcasting', description: 'Add WIS modifier to damage of cleric cantrips.' },
          { level: 17, name: 'Corona of Light', description: 'Emanate bright light 60 ft. Enemies in the light have disadvantage on saving throws vs fire and radiant spells.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Divine Order', type: 'passive', description: 'Choose Protector (+heavy armor, martial weapons) or Thaumaturge (+extra cantrip, Religion proficiency)', isChoice: true },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast cleric spells using WIS. Prepare spells from full cleric list each long rest.' },
      { level: 2, name: 'Channel Divinity', type: 'action', description: 'Divine Spark (heal or damage PBd8) and Turn Undead. Uses = PB per long rest.', uses: 'PB/long rest' },
      { level: 3, name: 'Cleric Subclass', type: 'passive', description: 'Choose a Cleric subclass', isChoice: true },
      { level: 5, name: 'Searing Light', type: 'passive', description: 'Turn Undead: destroyed if CR <= 2. Divine Spark damage adds to cantrips.' },
      { level: 7, name: 'Blessed Healer', type: 'passive', description: 'When you cast a healing spell on another, you also heal PB HP' },
      { level: 10, name: 'Divine Intervention', type: 'action', description: 'Cast any cleric spell of 5th level or lower without a slot as a Magic action', uses: '1/long rest' },
      { level: 11, name: 'Improved Destroy Undead', type: 'passive', description: 'Turn Undead destroys creatures CR 4 or lower' },
      { level: 14, name: 'Improved Blessed Healer', type: 'passive', description: 'Blessed Healer healing increases. Channel Divinity fully restores on short rest.' },
      { level: 18, name: 'Greater Divine Intervention', type: 'action', description: 'Cast Wish once via Divine Intervention (cannot use again for 2d4 days)', uses: '1/2d4 days' },
      { level: 20, name: 'Greater Channel Divinity', type: 'passive', description: 'Channel Divinity charges increase. Divine Spark deals/heals max dice.' },
    ],
  },

  druid: {
    hit_die: 8,
    spellcasting: 'wisdom',
    subclass_level: 2,
    subclass_label: 'Druid Circle',
    subclasses: {
      circle_of_the_land: {
        name: 'Circle of the Land',
        description: 'Mystical connection to the land empowers your spellcasting. Recover spell slots and gain terrain-specific spells.',
        features: [
          { level: 2, name: 'Bonus Cantrip', description: 'Learn one additional druid cantrip of your choice.' },
          { level: 2, name: 'Natural Recovery', description: 'During a short rest, recover spent spell slots with combined level up to half your druid level (rounded up). Once per long rest.' },
          { level: 3, name: 'Circle Spells', description: 'Gain access to circle spells based on the land type where you became a druid. These are always prepared.' },
          { level: 6, name: 'Land\'s Stride', description: 'Moving through nonmagical difficult terrain costs no extra movement. Pass through plants without slowing or taking damage.' },
          { level: 10, name: 'Nature\'s Ward', description: 'You can\'t be charmed or frightened by elementals or fey, and are immune to poison and disease.' },
          { level: 14, name: 'Nature\'s Sanctuary', description: 'Beasts and plant creatures that attack you must make a WIS save. On fail, they must choose a different target.' },
        ],
      },
      circle_of_the_moon: {
        name: 'Circle of the Moon',
        description: 'Powerful Wild Shape transformations. Take on more dangerous beast forms and gain combat abilities while shapeshifted.',
        features: [
          { level: 2, name: 'Combat Wild Shape', description: 'Wild Shape as a bonus action. While in beast form, expend a spell slot to regain 1d8 HP per slot level.' },
          { level: 2, name: 'Circle Forms', description: 'Wild Shape into beasts with CR up to 1 (scales with level: CR 2 at 6th, CR 3 at 9th, etc.).' },
          { level: 6, name: 'Primal Strike', description: 'Attacks in beast form count as magical for overcoming resistance and immunity.' },
          { level: 10, name: 'Elemental Wild Shape', description: 'Expend two Wild Shape uses to transform into an air, earth, fire, or water elemental.' },
          { level: 14, name: 'Thousand Forms', description: 'Cast Alter Self at will.' },
        ],
      },
    },
    features: [
      { level: 1, name: 'Druidic', type: 'passive', description: 'Know the secret Druidic language' },
      { level: 2, name: 'Wild Shape', type: 'action', description: 'Transform into a beast you\'ve seen (max CR 1/4, no flying/swimming). Lasts hours = druid level / 2', uses: '2/short rest' },
      { level: 4, name: 'Wild Shape (CR 1/2)', type: 'action', description: 'Transform into beasts up to CR 1/2, can swim', uses: '2/short rest' },
      { level: 8, name: 'Wild Shape (CR 1)', type: 'action', description: 'Transform into beasts up to CR 1, can fly', uses: '2/short rest' },
      { level: 18, name: 'Timeless Body', type: 'passive', description: 'Age 10x slower, can\'t be magically aged' },
      { level: 18, name: 'Beast Spells', type: 'passive', description: 'Can cast spells in Wild Shape form' },
      { level: 20, name: 'Archdruid', type: 'passive', description: 'Unlimited Wild Shape uses, ignore verbal/somatic components' }
    ],
    features_2024: [
      { level: 1, name: 'Primal Order', type: 'passive', description: 'Choose Magician (+extra cantrip) or Warden (+martial weapon proficiency, +medium armor)', isChoice: true },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast druid spells using WIS. Prepare from full druid list each long rest.' },
      { level: 2, name: 'Wild Shape', type: 'bonus_action', description: 'Transform as bonus action. Temp HP replaces beast stat block. Uses = PB per long rest.', uses: 'PB/long rest' },
      { level: 2, name: 'Wild Companion', type: 'action', description: 'Expend Wild Shape use to cast Find Familiar without material components' },
      { level: 3, name: 'Druid Subclass', type: 'passive', description: 'Choose a Druid subclass', isChoice: true },
      { level: 5, name: 'Wild Resurgence', type: 'passive', description: 'Once per turn, convert a Wild Shape use into a spell slot (level = PB/2 rounded up)' },
      { level: 7, name: 'Elemental Fury', type: 'passive', description: 'Add extra damage to one cantrip or weapon attack per turn' },
      { level: 9, name: 'Improved Wild Shape', type: 'passive', description: 'Wild Shape temp HP and forms improve' },
      { level: 15, name: 'Improved Elemental Fury', type: 'passive', description: 'Elemental Fury damage increases' },
      { level: 18, name: 'Beast Spells', type: 'passive', description: 'Cast spells while in Wild Shape form' },
      { level: 20, name: 'Archdruid', type: 'passive', description: 'Regain one Wild Shape use each turn. +PB to nature spell DCs.' },
    ],
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
      { level: 3, name: 'Martial Archetype', type: 'passive', description: 'Choose your Fighter subclass. Built-in automation is limited to public-license subclass data.', isChoice: true },
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
    },
    // 2024 PHB rules variant
    features_2024: [
      { level: 1, name: 'Fighting Style', type: 'passive', description: 'Choose a Fighting Style feat', isChoice: true },
      { level: 1, name: 'Second Wind', type: 'bonus_action', description: 'Regain 1d10 + fighter level HP. Uses equal to proficiency bonus per long rest.', uses: 'PB/long rest' },
      { level: 1, name: 'Weapon Mastery', type: 'passive', description: 'Choose weapon mastery properties for proficient weapons (number = 3)' },
      { level: 2, name: 'Action Surge', type: 'special', description: 'Take one additional action on your turn (1 use per short/long rest)', uses: '1/short rest' },
      { level: 2, name: 'Tactical Mind', type: 'special', description: 'When you fail an ability check, expend a Second Wind use to add 1d10 to the roll' },
      { level: 3, name: 'Martial Archetype', type: 'passive', description: 'Choose your Fighter subclass. Built-in automation is limited to public-license subclass data.', isChoice: true },
      { level: 4, name: 'Weapon Mastery (4)', type: 'passive', description: 'Master 4 weapons. Can change mastery on long rest.' },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice when you take the Attack action' },
      { level: 5, name: 'Tactical Shift', type: 'passive', description: 'When you use Second Wind, move up to half speed without opportunity attacks' },
      { level: 9, name: 'Indomitable', type: 'reaction', description: 'Reroll failed saving throw with +PB bonus (1 use per long rest)', uses: '1/long rest' },
      { level: 9, name: 'Tactical Master', type: 'passive', description: 'When you attack, you can replace one weapon mastery property with Push, Sap, or Slow' },
      { level: 11, name: 'Extra Attack (2)', type: 'passive', description: 'Attack three times when you take the Attack action', replaces: 'Extra Attack' },
      { level: 13, name: 'Indomitable (2 uses)', type: 'reaction', description: 'Reroll failed saving throw with +PB bonus (2 uses)', uses: '2/long rest', replaces: 'Indomitable' },
      { level: 13, name: 'Studied Attacks', type: 'passive', description: 'If you miss a creature, you have advantage on your next attack against it before end of next turn' },
      { level: 17, name: 'Action Surge (2 uses)', type: 'special', description: 'Use Action Surge twice between rests (not same turn)', uses: '2/short rest', replaces: 'Action Surge' },
      { level: 17, name: 'Indomitable (3 uses)', type: 'reaction', description: 'Reroll failed saving throw (3 uses)', uses: '3/long rest', replaces: 'Indomitable (2 uses)' },
      { level: 20, name: 'Extra Attack (3)', type: 'passive', description: 'Attack four times when you take the Attack action', replaces: 'Extra Attack (2)' },
    ],
  },

  monk: {
    hit_die: 8,
    spellcasting: null,
    subclass_level: 3,
    subclass_label: 'Monastic Tradition',
    subclasses: {
      way_of_the_open_hand: {
        name: 'Way of the Open Hand',
        description: 'Master the art of unarmed combat. Manipulate enemy movement and deliver devastating finishing blows.',
        features: [
          { level: 3, name: 'Open Hand Technique', description: 'When you hit with a Flurry of Blows attack, impose one effect: knocked prone (DEX save), pushed 15 ft (STR save), or can\'t take reactions until end of your next turn.' },
          { level: 6, name: 'Wholeness of Body', description: 'As an action, regain HP equal to 3x your monk level. Once per long rest.' },
          { level: 11, name: 'Tranquility', description: 'At the end of a long rest, gain the effect of a Sanctuary spell (WIS save) until the start of your next long rest.' },
          { level: 17, name: 'Quivering Palm', description: 'Spend 3 ki points when you hit with an unarmed strike. Within 14 days, reduce creature to 0 HP (CON save) or deal 10d10 necrotic damage.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Unarmored Defense', type: 'passive', description: 'AC = 10 + DEX + WIS when not wearing armor' },
      { level: 1, name: 'Martial Arts', type: 'bonus_action', description: 'Unarmed strikes use DEX, martial arts die (d6). Bonus action unarmed strike after Attack action.' },
      { level: 2, name: 'Discipline Points', type: 'resource', description: 'Discipline Points = monk level. Flurry of Blows, Patient Defense, Step of the Wind.', uses: 'Level/short rest' },
      { level: 2, name: 'Unarmored Movement', type: 'passive', description: '+10 ft speed when not wearing armor' },
      { level: 2, name: 'Uncanny Metabolism', type: 'passive', description: 'On initiative, regain all Discipline Points. Regain hit die = martial arts die once per long rest.' },
      { level: 3, name: 'Deflect Attacks', type: 'reaction', description: 'Reduce any attack damage by 1d10 + DEX + monk level. Spend 1 DP to redirect.' },
      { level: 3, name: 'Monk Subclass', type: 'passive', description: 'Choose a Monk subclass. Built-in automation is limited to public-license subclass data.', isChoice: true },
      { level: 4, name: 'Slow Fall', type: 'reaction', description: 'Reduce falling damage by 5 x monk level' },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice per Attack action' },
      { level: 5, name: 'Stunning Strike', type: 'action_modifier', description: 'Spend 1 DP on hit: target makes CON save or is Stunned until start of your next turn', uses: '1 DP' },
      { level: 6, name: 'Empowered Strikes', type: 'passive', description: 'Unarmed strikes count as magical' },
      { level: 7, name: 'Evasion', type: 'passive', description: 'DEX saves for half: no damage on success, half on fail' },
      { level: 9, name: 'Acrobatic Movement', type: 'passive', description: 'Move along vertical surfaces and across liquids without falling during move' },
      { level: 10, name: 'Heightened Discipline', type: 'passive', description: 'Martial arts die increases to d8. Self-Restoration: end Charmed/Frightened.' },
      { level: 13, name: 'Deflect Energy', type: 'reaction', description: 'Deflect Attacks now works against ranged spell attacks too' },
      { level: 14, name: 'Disciplined Survivor', type: 'passive', description: 'Proficiency in all saving throws. Spend 1 DP to reroll a failed save.' },
      { level: 15, name: 'Perfect Discipline', type: 'passive', description: 'Martial arts die becomes d10. Spend no DP for Patient Defense, Step of the Wind.' },
      { level: 18, name: 'Superior Defense', type: 'passive', description: 'Spend 3 DP at start of turn: resistance to all damage except Force for the round' },
      { level: 20, name: 'Body and Mind', type: 'passive', description: '+4 DEX, +4 WIS (max 25). Martial arts die becomes d12.' },
    ],
  },

  paladin: {
    hit_die: 10,
    spellcasting: 'charisma',
    spellcasting_start: 2,
    subclass_level: 3,
    subclass_label: 'Sacred Oath',
    fighting_style_level: 2,
    fighting_styles: [
      { name: 'Defense', description: '+1 AC while wearing armor' },
      { name: 'Dueling', description: '+2 damage when wielding a one-handed melee weapon and no other weapons' },
      { name: 'Great Weapon Fighting', description: 'Reroll 1s and 2s on damage dice for two-handed melee weapons' },
      { name: 'Protection', description: 'Use shield reaction to impose disadvantage on an attack against an adjacent ally' },
    ],
    subclasses: {
      oath_of_devotion: {
        name: 'Oath of Devotion',
        description: 'The archetypal paladin — honesty, courage, compassion, honor, and duty. Sacred Weapon and Turn the Unholy.',
        features: [
          { level: 3, name: 'Sacred Weapon', description: 'Channel Divinity: Add CHA modifier to attack rolls for 1 minute. Weapon emits bright light 20 ft.' },
          { level: 3, name: 'Turn the Unholy', description: 'Channel Divinity: Each fiend and undead within 30 ft must make WIS save or be turned for 1 minute.' },
          { level: 7, name: 'Aura of Devotion', description: 'You and friendly creatures within 10 ft can\'t be charmed while you\'re conscious.' },
          { level: 15, name: 'Purity of Spirit', description: 'You are always under the effects of Protection from Evil and Good.' },
          { level: 20, name: 'Holy Nimbus', description: 'Action: emanate bright light 30 ft for 1 minute. Enemies starting turn in light take 10 radiant damage.' },
        ],
      },
      oath_of_the_ancients: {
        name: 'Oath of the Ancients',
        description: 'Protect the light against darkness. Gain nature-based abilities and resistance to spell damage.',
        features: [
          { level: 3, name: 'Nature\'s Wrath', description: 'Channel Divinity: Spectral vines restrain a creature within 10 ft (STR/DEX save).' },
          { level: 3, name: 'Turn the Faithless', description: 'Channel Divinity: Turn fey and fiends within 30 ft (WIS save).' },
          { level: 7, name: 'Aura of Warding', description: 'You and allies within 10 ft have resistance to damage from spells.' },
          { level: 15, name: 'Undying Sentinel', description: 'When reduced to 0 HP, drop to 1 HP instead (once per long rest). Also don\'t suffer drawbacks of old age.' },
          { level: 20, name: 'Elder Champion', description: 'Transform for 1 minute: regain 10 HP/round, cast paladin spells as bonus action, enemies within 10 ft have disadvantage on saves.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Lay on Hands', type: 'bonus_action', description: 'Heal HP from pool = paladin level x 5, or expend 5 to cure poison/disease', uses: 'Level x 5/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast paladin spells using CHA. Prepare from paladin list each long rest.' },
      { level: 1, name: 'Weapon Mastery', type: 'passive', description: 'Master 2 weapons with mastery properties' },
      { level: 2, name: 'Divine Smite', type: 'bonus_action', description: 'Bonus action spell: deal 2d8 radiant on next melee hit (+1d8/slot above 1st, +1d8 vs fiends/undead)', uses: 'Spell slot' },
      { level: 2, name: 'Fighting Style', type: 'passive', description: 'Choose a Fighting Style feat', isChoice: true },
      { level: 3, name: 'Channel Divinity', type: 'action', description: 'Uses = PB per long rest. Divine Sense: detect celestials/fiends/undead.', uses: 'PB/long rest' },
      { level: 3, name: 'Paladin Subclass', type: 'passive', description: 'Choose a Paladin subclass', isChoice: true },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice per Attack action' },
      { level: 5, name: 'Faithful Steed', type: 'passive', description: 'Cast Find Steed without a spell slot once per long rest', uses: '1/long rest' },
      { level: 6, name: 'Aura of Protection', type: 'passive', description: 'You and allies within 10 ft add CHA modifier to saving throws' },
      { level: 9, name: 'Abjure Foes', type: 'action', description: 'Channel Divinity: creatures in 60ft must WIS save or be Frightened for 1 min' },
      { level: 10, name: 'Aura of Courage', type: 'passive', description: 'You and allies within 10 ft can\'t be frightened while you\'re conscious' },
      { level: 11, name: 'Radiant Strikes', type: 'passive', description: 'Melee weapon attacks deal extra 1d8 radiant damage' },
      { level: 14, name: 'Restoring Touch', type: 'action', description: 'Spend 5 Lay on Hands points to end one condition: Blinded, Charmed, Deafened, Frightened, Paralyzed, Stunned' },
      { level: 18, name: 'Aura Expansion', type: 'passive', description: 'All paladin auras extend to 30 ft' },
      { level: 20, name: 'Epic Boon', type: 'passive', description: 'Gain an Epic Boon feat of your choice' },
    ],
  },

  ranger: {
    hit_die: 10,
    spellcasting: 'wisdom',
    spellcasting_start: 2,
    subclass_level: 3,
    subclass_label: 'Ranger Archetype',
    fighting_style_level: 2,
    fighting_styles: [
      { name: 'Archery', description: '+2 bonus to attack rolls with ranged weapons' },
      { name: 'Defense', description: '+1 AC while wearing armor' },
      { name: 'Dueling', description: '+2 damage when wielding a one-handed melee weapon and no other weapons' },
      { name: 'Two-Weapon Fighting', description: 'Add ability modifier to damage of the second off-hand attack' },
    ],
    subclasses: {
      hunter: {
        name: 'Hunter',
        description: 'Accept the challenge of guarding civilization from predators and hordes. Specialize in slaying specific types of threats.',
        features: [
          { level: 3, name: 'Hunter\'s Prey', description: 'Choose: Colossus Slayer (+1d8 damage to wounded enemies), Giant Killer (reaction attack when Large+ creature misses), or Horde Breaker (attack a second creature within 5 ft of original target).' },
          { level: 7, name: 'Defensive Tactics', description: 'Choose: Escape the Horde (OAs have disadvantage), Multiattack Defense (+4 AC after being hit), or Steel Will (advantage on saves vs being frightened).' },
          { level: 11, name: 'Multiattack', description: 'Choose: Volley (ranged attack vs all creatures within 10 ft of a point in range) or Whirlwind Attack (melee attack vs all creatures within 5 ft).' },
          { level: 15, name: 'Superior Hunter\'s Defense', description: 'Choose: Evasion (no damage on DEX save success), Stand Against the Tide (redirect missed melee to another creature), or Uncanny Dodge (halve damage as reaction).' },
        ],
      },
      beast_master: {
        name: 'Beast Master',
        description: 'Bond with an animal companion that fights alongside you. Your beast acts on your initiative and follows your commands.',
        features: [
          { level: 3, name: 'Ranger\'s Companion', description: 'Gain a beast companion (CR 1/4 or lower). It obeys your commands, adds your proficiency bonus to AC, attack rolls, damage, and saves.' },
          { level: 7, name: 'Exceptional Training', description: 'Your beast can Dash, Disengage, Dodge, or Help as a bonus action. Its attacks count as magical.' },
          { level: 11, name: 'Bestial Fury', description: 'Your beast can make two attacks when you command it to Attack.' },
          { level: 15, name: 'Share Spells', description: 'When you cast a spell targeting yourself, it also affects your beast companion if within 30 ft.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Favored Enemy', type: 'bonus_action', description: 'Cast Hunter\'s Mark without a spell slot PB times per long rest', uses: 'PB/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast ranger spells using WIS. Prepare from ranger list each long rest.' },
      { level: 1, name: 'Weapon Mastery', type: 'passive', description: 'Master 2 weapons with mastery properties' },
      { level: 2, name: 'Deft Explorer', type: 'passive', description: 'Expertise in one skill. Gain additional at 6 and 10.' },
      { level: 2, name: 'Fighting Style', type: 'passive', description: 'Choose a Fighting Style feat', isChoice: true },
      { level: 3, name: 'Ranger Subclass', type: 'passive', description: 'Choose a Ranger subclass', isChoice: true },
      { level: 5, name: 'Extra Attack', type: 'passive', description: 'Attack twice per Attack action' },
      { level: 6, name: 'Roving', type: 'passive', description: '+10 ft speed, gain swimming & climbing speed equal to walking speed' },
      { level: 9, name: 'Expertise (2)', type: 'passive', description: 'Gain Expertise in another skill' },
      { level: 10, name: 'Tireless', type: 'passive', description: 'On short rest, reduce exhaustion by 1. PB times per long rest: gain temp HP = 1d8 + WIS.' },
      { level: 13, name: 'Relentless Hunter', type: 'passive', description: 'Hunter\'s Mark no longer requires concentration' },
      { level: 14, name: 'Nature\'s Veil', type: 'bonus_action', description: 'Become invisible until start of next turn', uses: 'PB/long rest' },
      { level: 17, name: 'Precise Hunter', type: 'passive', description: 'Hunter\'s Mark damage increases to 1d10' },
      { level: 18, name: 'Feral Senses', type: 'passive', description: 'Blindsight 30 ft' },
      { level: 20, name: 'Foe Slayer', type: 'passive', description: 'Hunter\'s Mark deals extra WIS modifier damage. Once per turn, no save needed for Favored Enemy.' },
    ],
  },

  rogue: {
    hit_die: 8,
    spellcasting: null,
    subclass_level: 3,
    subclass_label: 'Roguish Archetype',
    subclasses: {
      thief: {
        name: 'Thief',
        description: 'Hone your skills in larceny. Superior speed, stealth, and the ability to use magical items beyond normal limits.',
        features: [
          { level: 3, name: 'Fast Hands', description: 'Use Cunning Action to make a Sleight of Hand check, use thieves\' tools to disarm a trap or open a lock, or take the Use an Object action.' },
          { level: 3, name: 'Second-Story Work', description: 'Climbing costs no extra movement. Running jump distance increases by DEX modifier in feet.' },
          { level: 9, name: 'Supreme Stealth', description: 'You have advantage on Stealth checks if you move no more than half your speed on the same turn.' },
          { level: 13, name: 'Use Magic Device', description: 'Ignore all class, race, and level requirements on the use of magic items.' },
          { level: 17, name: 'Thief\'s Reflexes', description: 'Take two turns during the first round of combat. Second turn is at initiative minus 10.' },
        ],
      },
      assassin: {
        name: 'Assassin',
        description: 'Deadly focus on eliminating targets with ruthless efficiency. Master of poison and disguise.',
        features: [
          { level: 3, name: 'Bonus Proficiencies', description: 'Gain proficiency with disguise kit and poisoner\'s kit.' },
          { level: 3, name: 'Assassinate', description: 'Advantage on attacks against creatures that haven\'t acted yet. Any hit against a surprised creature is a critical hit.' },
          { level: 9, name: 'Infiltration Expertise', description: 'Spend 7 days and 25 gp to create a false identity with documentation, established acquaintances, and disguises.' },
          { level: 13, name: 'Impostor', description: 'Unerringly mimic another person\'s speech, writing, and behavior after studying them for 3 hours.' },
          { level: 17, name: 'Death Strike', description: 'When you hit a surprised creature, it must make a CON save or take double damage.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Expertise', type: 'passive', description: 'Double proficiency bonus on two skills' },
      { level: 1, name: 'Sneak Attack', type: 'action_modifier', description: 'Once per turn, deal extra 1d6 damage when you have advantage or an ally is within 5 ft of target' },
      { level: 1, name: 'Thieves\' Cant', type: 'passive', description: 'Secret mix of dialect, jargon, and code' },
      { level: 2, name: 'Cunning Action', type: 'bonus_action', description: 'Dash, Disengage, or Hide as a bonus action' },
      { level: 3, name: 'Rogue Subclass', type: 'passive', description: 'Choose a Rogue subclass', isChoice: true },
      { level: 3, name: 'Steady Aim', type: 'bonus_action', description: 'If you haven\'t moved, gain advantage on next attack. Speed becomes 0.' },
      { level: 5, name: 'Cunning Strike', type: 'action_modifier', description: 'On Sneak Attack, forgo 1d6 to apply Disarm, Poison, Trip, or Withdraw effects' },
      { level: 5, name: 'Uncanny Dodge', type: 'reaction', description: 'Halve the damage from one attack you can see' },
      { level: 7, name: 'Evasion', type: 'passive', description: 'DEX saves for half: no damage on success, half on fail' },
      { level: 7, name: 'Reliable Talent', type: 'passive', description: 'Minimum 10 on any ability check using proficient skills' },
      { level: 9, name: 'Expertise (2)', type: 'passive', description: 'Gain Expertise in two more skills' },
      { level: 11, name: 'Improved Cunning Strike', type: 'action_modifier', description: 'New Cunning Strike options: Daze, Knock Out, Obscure' },
      { level: 13, name: 'Subtle Strikes', type: 'passive', description: 'Don\'t need advantage when ally is within 5 ft. Sneak Attack now works with ranged.' },
      { level: 14, name: 'Devious Strikes', type: 'action_modifier', description: 'Forgo 2d6 Sneak Attack for powerful effects: Daze, Knock Out, Obscure' },
      { level: 15, name: 'Slippery Mind', type: 'passive', description: 'Proficiency in WIS and CHA saving throws' },
      { level: 18, name: 'Elusive', type: 'passive', description: 'No attack has advantage against you unless incapacitated' },
      { level: 20, name: 'Stroke of Luck', type: 'special', description: 'Turn any miss into a hit or any failed ability check into a 20', uses: '1/short rest' },
    ],
  },

  sorcerer: {
    hit_die: 6,
    spellcasting: 'charisma',
    subclass_level: 1,
    subclass_label: 'Sorcerous Origin',
    subclasses: {
      draconic_bloodline: {
        name: 'Draconic Bloodline',
        description: 'Your innate magic comes from draconic ancestry. Gain dragon-like resilience, elemental affinity, and eventually wings.',
        features: [
          { level: 1, name: 'Dragon Ancestor', description: 'Choose a dragon type. Double proficiency bonus on CHA checks to interact with dragons.' },
          { level: 1, name: 'Draconic Resilience', description: 'HP max increases by 1 per sorcerer level. Without armor, AC = 13 + DEX.' },
          { level: 6, name: 'Elemental Affinity', description: 'When you cast a spell dealing damage of your dragon type, add CHA modifier to one damage roll. Spend 1 sorcery point for resistance to that type for 1 hour.' },
          { level: 14, name: 'Dragon Wings', description: 'As a bonus action, sprout dragon wings gaining flying speed equal to your walking speed.' },
          { level: 18, name: 'Draconic Presence', description: 'Spend 5 sorcery points to exude an aura of awe or fear (60 ft). Creatures must make WIS save or be charmed/frightened for 1 minute.' },
        ],
      },
      wild_magic: {
        name: 'Wild Magic',
        description: 'Your spellcasting draws on wild magical forces that can produce unpredictable but powerful effects.',
        features: [
          { level: 1, name: 'Wild Magic Surge', description: 'After casting a sorcerer spell of 1st level or higher, DM can have you roll a d20. On a 1, roll on the Wild Magic Surge table.' },
          { level: 1, name: 'Tides of Chaos', description: 'Gain advantage on one attack, ability check, or save. Once per long rest (or DM triggers Wild Magic Surge to regain).' },
          { level: 6, name: 'Bend Luck', description: 'Spend 2 sorcery points as a reaction to roll 1d4 and add/subtract from a creature\'s attack, ability check, or save.' },
          { level: 14, name: 'Controlled Chaos', description: 'When you roll on Wild Magic Surge table, roll twice and choose which result to use.' },
          { level: 18, name: 'Spell Bombardment', description: 'When you roll damage, if any die shows the maximum value, choose one and reroll it, adding the result as extra damage.' },
        ],
      },
    },
    features: [
      { level: 1, name: 'Sorcerous Origin', type: 'passive', description: 'Choose a sorcerous origin that grants additional abilities' },
      { level: 2, name: 'Font of Magic', type: 'resource', description: 'Sorcery points = sorcerer level. Convert spell slots to points or points to slots', uses: 'Level/long rest' },
      { level: 2, name: 'Flexible Casting', type: 'bonus_action', description: 'Convert sorcery points to spell slots or vice versa' },
      { level: 3, name: 'Metamagic', type: 'action_modifier', description: 'Choose 2 Metamagic options to modify your spells (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned)' },
      { level: 10, name: 'Metamagic (3)', type: 'passive', description: 'Learn one additional Metamagic option' },
      { level: 17, name: 'Metamagic (4)', type: 'passive', description: 'Learn one additional Metamagic option' },
      { level: 20, name: 'Sorcerous Restoration', type: 'passive', description: 'Regain 4 sorcery points on short rest' }
    ],
    features_2024: [
      { level: 1, name: 'Innate Sorcery', type: 'bonus_action', description: 'Bonus action: +1 spell attack bonus, +1 spell save DC for 1 minute. Uses = PB/long rest.', uses: 'PB/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast sorcerer spells using CHA. Spells known replaced by spell preparation.' },
      { level: 2, name: 'Font of Magic', type: 'resource', description: 'Sorcery Points = sorcerer level. Create/convert spell slots.', uses: 'Level/long rest' },
      { level: 2, name: 'Metamagic', type: 'action_modifier', description: 'Choose 2 Metamagic options (Careful, Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle, Transmuted, Twinned)' },
      { level: 3, name: 'Sorcerer Subclass', type: 'passive', description: 'Choose a Sorcerer subclass', isChoice: true },
      { level: 5, name: 'Sorcerous Vitality', type: 'passive', description: 'On short rest, spend sorcery points equal to half level (rounded down) to regain hit dice' },
      { level: 7, name: 'Sorcery Incarnate', type: 'passive', description: 'While Innate Sorcery is active, use two Metamagic options on a single spell' },
      { level: 10, name: 'Metamagic (3)', type: 'passive', description: 'Learn one additional Metamagic option' },
      { level: 13, name: 'Arcane Eruption', type: 'passive', description: 'When you use Innate Sorcery, force each creature within 10 ft to make CON save or take damage' },
      { level: 17, name: 'Metamagic (4)', type: 'passive', description: 'Learn one additional Metamagic option' },
      { level: 20, name: 'Arcane Apotheosis', type: 'passive', description: 'While Innate Sorcery is active, spend 1 SP to use Metamagic you don\'t know. Once per turn, regain 1 SP when casting a sorcerer spell.' },
    ],
  },

  warlock: {
    hit_die: 8,
    spellcasting: 'charisma',
    pact_magic: true,
    subclass_level: 1,
    subclass_label: 'Otherworldly Patron',
    subclasses: {
      the_fiend: {
        name: 'The Fiend',
        description: 'Your patron is a fiend from the lower planes. Gain fire-themed abilities and dark fortune.',
        features: [
          { level: 1, name: 'Dark One\'s Blessing', description: 'When you reduce a hostile creature to 0 HP, gain temporary HP equal to CHA modifier + warlock level.' },
          { level: 6, name: 'Dark One\'s Own Luck', description: 'When you make an ability check or saving throw, add a d10 to the roll. Once per short or long rest.' },
          { level: 10, name: 'Fiendish Resilience', description: 'After a short or long rest, choose a damage type (not force). You have resistance to it until you choose a different type.' },
          { level: 14, name: 'Hurl Through Hell', description: 'When you hit a creature with an attack, you can send it through the lower planes. It takes 10d10 psychic damage. Once per long rest.' },
        ],
      },
      the_archfey: {
        name: 'The Archfey',
        description: 'Your patron is an archfey from the Feywild. Gain charms, illusions, and fey-themed abilities.',
        features: [
          { level: 1, name: 'Fey Presence', description: 'As an action, charm or frighten creatures in a 10-ft cube (WIS save). Once per short or long rest.' },
          { level: 6, name: 'Misty Escape', description: 'When you take damage, use reaction to turn invisible and teleport 60 ft. Until start of next turn.' },
          { level: 10, name: 'Beguiling Defenses', description: 'Immune to being charmed. When a creature tries, use reaction to charm them (WIS save) for 1 minute.' },
          { level: 14, name: 'Dark Delirium', description: 'As an action, charm or frighten a creature for 1 minute (WIS save). Once per short or long rest.' },
        ],
      },
    },
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
    ],
    features_2024: [
      { level: 1, name: 'Otherworldly Patron', type: 'passive', description: 'Choose a patron. Pact Magic: cast with CHA, slots regain on short rest.', isChoice: true },
      { level: 1, name: 'Eldritch Invocations (2)', type: 'passive', description: 'Learn 2 Eldritch Invocations' },
      { level: 1, name: 'Pact Magic', type: 'passive', description: 'All warlock spell slots are the same level and regain on short/long rest' },
      { level: 2, name: 'Magical Cunning', type: 'action', description: 'If you have no Pact Magic slots, regain half (round up) as a Magic action once per long rest', uses: '1/long rest' },
      { level: 3, name: 'Pact Boon', type: 'passive', description: 'Choose Pact of the Blade, Chain, or Tome', isChoice: true },
      { level: 5, name: 'Eldritch Invocations (3)', type: 'passive', description: 'Learn additional Invocation' },
      { level: 7, name: 'Eldritch Invocations (4)', type: 'passive', description: 'Learn additional Invocation' },
      { level: 9, name: 'Contact Patron', type: 'passive', description: 'Cast Contact Other Plane once per long rest without a spell slot', uses: '1/long rest' },
      { level: 9, name: 'Eldritch Invocations (5)', type: 'passive', description: 'Learn additional Invocation' },
      { level: 11, name: 'Mystic Arcanum (6th)', type: 'special', description: 'Cast one 6th-level spell once per long rest', uses: '1/long rest' },
      { level: 12, name: 'Eldritch Invocations (6)', type: 'passive', description: 'Learn additional Invocation' },
      { level: 13, name: 'Mystic Arcanum (7th)', type: 'special', description: 'Cast one 7th-level spell once per long rest', uses: '1/long rest' },
      { level: 15, name: 'Mystic Arcanum (8th)', type: 'special', description: 'Cast one 8th-level spell once per long rest', uses: '1/long rest' },
      { level: 15, name: 'Eldritch Invocations (7)', type: 'passive', description: 'Learn additional Invocation' },
      { level: 17, name: 'Mystic Arcanum (9th)', type: 'special', description: 'Cast one 9th-level spell once per long rest', uses: '1/long rest' },
      { level: 18, name: 'Eldritch Invocations (8)', type: 'passive', description: 'Learn additional Invocation' },
      { level: 20, name: 'Eldritch Master', type: 'special', description: 'Regain all Pact Magic slots and one Mystic Arcanum (6-9) per long rest', uses: '1/long rest' },
    ],
  },

  wizard: {
    hit_die: 6,
    spellcasting: 'intelligence',
    subclass_level: 2,
    subclass_label: 'Arcane Tradition',
    subclasses: {
      school_of_evocation: {
        name: 'School of Evocation',
        description: 'Focus on spells that create powerful elemental effects. Your offensive spells are enhanced and can protect allies.',
        features: [
          { level: 2, name: 'Evocation Savant', description: 'Halve the gold and time to copy evocation spells into your spellbook.' },
          { level: 2, name: 'Sculpt Spells', description: 'When you cast an evocation spell that affects others, choose a number of creatures equal to 1 + spell level to automatically succeed on their save and take no damage.' },
          { level: 6, name: 'Potent Cantrip', description: 'When a creature succeeds on a save against your cantrip, it still takes half damage but suffers no additional effects.' },
          { level: 10, name: 'Empowered Evocation', description: 'Add INT modifier to one damage roll of any evocation spell you cast.' },
          { level: 14, name: 'Overchannel', description: 'When you cast a 5th-level or lower spell that deals damage, deal maximum damage. After the first use, take 2d12 necrotic damage per spell level (increases each use).' },
        ],
      },
      school_of_abjuration: {
        name: 'School of Abjuration',
        description: 'Specialize in protective magic. Create magical wards that absorb damage and banish threats.',
        features: [
          { level: 2, name: 'Abjuration Savant', description: 'Halve the gold and time to copy abjuration spells into your spellbook.' },
          { level: 2, name: 'Arcane Ward', description: 'When you cast an abjuration spell of 1st level or higher, create a ward with HP equal to twice wizard level + INT modifier.' },
          { level: 6, name: 'Projected Ward', description: 'When an ally within 30 ft takes damage, use reaction to have your Arcane Ward absorb the damage instead.' },
          { level: 10, name: 'Improved Abjuration', description: 'Add proficiency bonus to ability checks for abjuration spells (like Counterspell or Dispel Magic).' },
          { level: 14, name: 'Spell Resistance', description: 'Advantage on saving throws against spells. Resistance against spell damage.' },
        ],
      },
    },
    features: [
      { level: 1, name: 'Arcane Recovery', type: 'special', description: 'Once per day during short rest, recover spell slots totaling up to half wizard level (rounded up)', uses: '1/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Learn spells from wizard spell list. INT is spellcasting ability' },
      { level: 2, name: 'Arcane Tradition', type: 'passive', description: 'Choose a school of magic for specialization bonuses' },
      { level: 18, name: 'Spell Mastery', type: 'passive', description: 'Choose one 1st-level and one 2nd-level spell to cast at will' },
      { level: 20, name: 'Signature Spells', type: 'passive', description: 'Choose two 3rd-level spells - always prepared, cast once each at 3rd level without using a slot, regain on short rest' }
    ],
    features_2024: [
      { level: 1, name: 'Arcane Recovery', type: 'special', description: 'Once per long rest during short rest, recover spell slot levels totaling up to half wizard level', uses: '1/long rest' },
      { level: 1, name: 'Spellcasting', type: 'passive', description: 'Cast wizard spells using INT. Learn spells by copying into spellbook.' },
      { level: 1, name: 'Ritual Adept', type: 'passive', description: 'Cast any spell in your spellbook as a ritual if it has the Ritual tag (no preparation needed)' },
      { level: 1, name: 'Scholar', type: 'passive', description: 'Gain Expertise in Arcana, History, Investigation, Nature, or Religion', isChoice: true },
      { level: 2, name: 'Memorize Spell', type: 'passive', description: 'On short rest, swap one prepared spell for another in your spellbook' },
      { level: 3, name: 'Wizard Subclass', type: 'passive', description: 'Choose a Wizard subclass', isChoice: true },
      { level: 5, name: 'Modify Spell', type: 'passive', description: 'When casting a spell, change its damage type to another listed type' },
      { level: 18, name: 'Spell Mastery', type: 'passive', description: 'Choose one 1st-level and one 2nd-level spell to cast at will without slots' },
      { level: 20, name: 'Signature Spells', type: 'passive', description: 'Two 3rd-level spells are always prepared and can be cast once per short rest without a slot' },
    ],
  }
};

// Helper function to get all features for a class up to a given level
export function getClassFeatures(className, level, edition = '2014') {
  const classData = CLASS_FEATURES[className?.toLowerCase()];
  if (!classData) return [];
  
  const featureList = (edition === '2024' && classData.features_2024) ? classData.features_2024 : classData.features;
  return featureList.filter(f => f.level <= level);
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
