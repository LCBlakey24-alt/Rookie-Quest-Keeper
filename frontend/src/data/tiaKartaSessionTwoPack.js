const section = ({ id, destinations, title, eyebrow, summary, cards = [] }) => ({
  id,
  destinations,
  title,
  eyebrow,
  summary,
  cards,
});

const card = ({ title, category, playerSummary = '', gmNotes = '', bullets = [], mechanics = [], tbd = '' }) => ({
  title,
  category,
  playerSummary,
  gmNotes,
  bullets,
  mechanics,
  tbd,
});

export const tiaKartaSessionTwoPack = {
  campaignName: 'Tia-Karta',
  currentArc: 'Act 1: The Crownless City',
  currentChapter: 'Arc 1.1: The Scarab Beneath Hollowmere',
  sourceNote: 'Session 2 update pack, player-facing recap, current party status, divine lore update, Chaos/Fate token rules, and uploaded D&D Beyond sheet snapshots.',
  sections: [
    section({
      id: 'current-campaign-state',
      destinations: ['storyArcs', 'sessionNotes', 'chronicle'],
      eyebrow: 'Current campaign state',
      title: 'Act 1: The Crownless City',
      summary: 'The party has escaped Akara’s tomb with Princess Marithra alive, Vaelis changed by the Scarab, and Azrael newly chosen as Corova’s Champion.',
      cards: [
        card({
          title: 'Arc 1.1: The Scarab Beneath Hollowmere',
          category: 'Active Arc',
          playerSummary: 'The hidden casino beneath Hollowmere Manor led to Corvin Hale, Akara’s scarab, a teleportation leap to the island, and the discovery of Princess Marithra beneath Akara’s tomb.',
          gmNotes: 'This arc now has three hot threads: Vaelis as Akara’s conduit, Princess Marithra as the living heir of Balderin, and Edwin/Corvin’s ring-and-letter secret sitting in the party’s hands.',
          bullets: [
            'Campaign name: Tia-Karta',
            'Current act: Act 1: The Crownless City',
            'Current arc: Arc 1.1: The Scarab Beneath Hollowmere',
            'Session 2 ended after the party escaped Akara’s tomb with Princess Marithra alive.',
          ],
        }),
        card({
          title: 'Session 2 Ending State',
          category: 'Table Position',
          playerSummary: 'The party escaped the cave with Princess Marithra, knowing that the child they found is not simply a lost girl but the missing heir of Balderin.',
          gmNotes: 'The next session can open with the immediate fallout: Marithra’s fading pendant, Edwin and Corvin’s emotional state, Akara’s anger, Vaelis’s new powers, and Azrael’s new divine responsibility.',
          bullets: [
            'Vaelis accepted Akara’s power but did not become Akara’s vessel.',
            'Opian protected the loophole in the agreement.',
            'Azrael sacrificed life force to keep Princess Marithra alive.',
            'Corvin does not know the party has her ring and love letter.',
            'Edwin used his one teleportation ring to follow Corvin.',
          ],
        }),
      ],
    }),

    section({
      id: 'party-status',
      destinations: ['sessionNotes', 'npcs', 'campaignRules'],
      eyebrow: 'Current party status',
      title: 'Changed by Gods, Scars, and Loopholes',
      summary: 'Vaelis and Azrael both crossed a line in Session 2: one became Akara’s awakened conduit, the other became Corova’s new Last Feather.',
      cards: [
        card({
          title: 'Vaelis Duskryn — Awakened Conduit',
          category: 'Player Status / Scarab Bearer',
          playerSummary: 'Vaelis carries the Scarab of Akara inside his body, embedded into his chest and hand like black-gold chitin beneath the skin.',
          gmNotes: 'Vaelis accepted Akara’s power and severed his previous connection to the patron of death. Opian’s intervention stopped Akara turning that agreement into full vesselhood. Vaelis keeps free will, but Akara is watching.',
          bullets: [
            'Scarab Charges equal Vaelis’s Warlock level.',
            'Charges return after a long rest.',
            'Scarab Save DC equals Vaelis’s spell save DC.',
            'If all charges are spent before a long rest, Akara’s voice becomes much clearer.',
            'Akara’s influence should become more visible whenever charges are spent.',
          ],
          mechanics: [
            'Scarab Shell: Reaction when hit. Spend 1 or more charges. AC increases by +1 per charge until the start of Vaelis’s next turn, including against the triggering attack.',
            'Akara’s Hunger: Once per turn when Vaelis hits with a weapon or spell attack, spend 1 charge for +1d8 necrotic damage and temporary HP equal to proficiency bonus.',
            'Command of the Buried King: Bonus action, spend 1 charge. One creature within 60 feet makes a Wisdom save. Fail: speed 0 and no reactions until Vaelis’s next turn. Success: speed reduced by 10 feet.',
            'Whisper Beneath the Sand: Once per long rest, ask Akara one useful question about a creature, place, relic, curse, secret, or danger. The answer is truthful/useful but always bent toward Akara’s goals.',
          ],
        }),
        card({
          title: 'Azrael Thorn — The Last Feather',
          category: 'Player Status / Corova Champion',
          playerSummary: 'Azrael accepted Corova’s offer and became her Champion: a Paladin 6, Oath of the Ancients, with divine magic visually appearing as teal light, black feathers, spectral crows, and crow-shaped energy.',
          gmNotes: 'Do not rename official D&D spell and feature names on the sheet. Keep official mechanics clean, and use Corova as the visual/divine story layer.',
          bullets: [
            'Class: Paladin 6',
            'Subclass: Oath of the Ancients',
            'Race: Tiefling',
            'Background: Haunted One',
            'Strength: 16',
            'Fighting Style: Defence',
            'Azrael is now the new Last Feather.',
          ],
          mechanics: [
            'Blessing of the Crow: Crows and ravens are naturally drawn to Azrael and may guide, warn, or watch on Corova’s behalf.',
            'Eyes of the Murder: At the end of each long rest, roll 1d4 to see how many crows answer Azrael’s call that day.',
            'Each crow can scout one area, path, building, camp, or location.',
            'Crow Investigation 1-5: confused or unclear. 6-10: basic information. 11-15: useful information. 16-20: strong information. 21+: complete scouting or a strong warning from Corova.',
          ],
        }),
        card({
          title: 'Party Sheet Snapshot',
          category: 'Uploaded Sheet Reference',
          playerSummary: 'Uploaded PDFs show the current table party as Vaelis Duskryn, Azrael Thorn, Valo Astralyn, and Zephir Whisperwind.',
          gmNotes: 'Use this as a quick GM reference only. The live character sheets remain the source of truth if players update them later.',
          bullets: [
            'Vaelis Duskryn: Half-Elf Sorcerer 4 / Warlock 2, AC 19, HP 58, CHA 20, spell save DC 16, carrying the Scarab of Akara.',
            'Azrael Thorn: Tiefling Paladin 6, AC 18, HP 68, CHA 18, spell save DC 15, Aura of Protection +4.',
            'Valo Astralyn: Half-Elf Warlock 3 / Sorcerer 2, AC 15, HP 49, CHA 18, Pact of the Tome and Dao Genie/Aberrant Mind features.',
            'Zephir Whisperwind: Half-Elf Warlock 2 / Bard 3, AC 17, HP 43, College of Swords and Hexblade features.',
          ],
        }),
      ],
    }),

    section({
      id: 'session-two-recap',
      destinations: ['sessionNotes', 'chronicle', 'handouts'],
      eyebrow: 'Session 2 recap',
      title: 'The Scarab Beneath Hollowmere',
      summary: 'A searchable recap of the session that moved the campaign from Hollowmere’s hidden casino to Akara’s tomb and Princess Marithra’s reveal.',
      cards: [
        card({
          title: 'Hollowmere Aftermath',
          category: 'Recap Beat',
          playerSummary: 'After surviving the creatures beneath Hollowmere Manor, the party searched the hidden casino chamber and gathered every useful item and material they could find.',
          gmNotes: 'Valo uncovered hidden valuables and details. Zephir and Azrael harvested from the defeated creatures. The most important finds were Corvin’s missing ring, her severed ring finger clue, the safe key, and her love letter to Edwin.',
          bullets: [
            'Corvin’s ring was found, but her ring finger was missing.',
            'Corvin was discovered alive but barely surviving.',
            'Vaelis stabilised and healed Corvin just in time.',
            'The party found a letter Corvin had written to Edwin Hollowmere.',
          ],
        }),
        card({
          title: 'The Scarab Chooses Vaelis',
          category: 'Recap Beat / Curse Event',
          playerSummary: 'Time froze around Vaelis. He opened the safe behind the painting and found the Scarab of Akara waiting inside.',
          gmNotes: 'To the party, Vaelis went blank before slamming the scarab into himself as if compelled. In his vision, the scarab burrowed into hand and chest, showing pale trees, pink leaves, a cave, a tomb, and a jackal-headed figure whispering for return and release.',
          bullets: [
            'Azrael and Zephir tried to take the scarab and were violently pushed back.',
            'Corvin and Edwin both recognised the danger and warned Vaelis had seven days at most, likely less.',
            'This was the bridge from Hollowmere Manor to the island and Akara’s tomb.',
          ],
        }),
        card({
          title: 'Edwin and Corvin’s Rings',
          category: 'Recap Beat / Relationship Secret',
          playerSummary: 'The party used the Stone of Teleportation to reach the island, accidentally dragging Corvin with them and leaving Edwin behind.',
          gmNotes: 'Edwin appeared moments later after using his one and only ring. The rings teleport the wearer to their heart’s truest desire, or to the person their heart truly belongs to. Corvin does not know the party still has her ring and letter.',
          bullets: [
            'Edwin’s ring is now gone from his finger.',
            'Corvin’s ring and love letter are still with the party.',
            'This is both a romance reveal and a ticking social grenade.',
          ],
        }),
        card({
          title: 'Akara’s Bargain and Opian’s Loophole',
          category: 'Recap Beat / Divine Bargain',
          playerSummary: 'Vaelis confronted Akara and accepted his power, becoming a conduit of Akara rather than merely a cursed victim.',
          gmNotes: 'Akara attempted to claim Vaelis as a vessel, but Opian used the party’s Chaos Tokens and the wording of the agreement to interfere: Vaelis agreed to use Akara’s power, not to become Akara’s vessel. Akara cannot possess him or simply take the power back.',
          bullets: [
            'Akara is furious.',
            'Vaelis has power but not safety.',
            'Opian has proven he can turn wording into divine leverage.',
          ],
        }),
        card({
          title: 'The Coffin Below and Princess Marithra',
          category: 'Recap Beat / Major Reveal',
          playerSummary: 'During the undead horde escape, a crow guided Azrael down stairs to a hidden room with a coffin slightly ajar.',
          gmNotes: 'Inside was a young girl in tattered clothes, sustained by a pendant with a fading red spark. Azrael sacrificed life force into the pendant, buying her more time. The party escaped with her and learned she is Princess Marithra of Balderin.',
          bullets: [
            'Princess Marithra is alive.',
            'She should have died long ago.',
            'Her survival threatens the future of Balderin, Neremore, the Court of Crowns, and the wider world.',
          ],
        }),
      ],
    }),

    section({
      id: 'current-npcs',
      destinations: ['npcs', 'sessionNotes', 'handouts'],
      eyebrow: 'Important current NPCs',
      title: 'People Who Matter Right Now',
      summary: 'These are the session-active NPCs and divine figures most likely to matter in the next session.',
      cards: [
        card({
          title: 'Corvin Hale',
          category: 'Survivor / Edwin’s Beloved',
          playerSummary: 'Corvin Hale is Edwin Hollowmere’s beloved and a major survivor of the Hollowmere Manor disaster.',
          gmNotes: 'Corvin is around seven foot four, very pale, with long blonde hair in a ponytail, shaved back and sides, and a black bow tie suit. She is built like a noble bodyguard carved from stone, deeply connected to Edwin, and missing her ring finger.',
          bullets: [
            'The party saved Corvin from death beneath Hollowmere Manor.',
            'The party has her missing ring and love letter without her knowing.',
            'Her ring was likely torn away when her ring finger was ripped off.',
          ],
        }),
        card({
          title: 'Edwin Hollowmere',
          category: 'Manor Owner / Corvin’s Beloved',
          playerSummary: 'Edwin Hollowmere owns Hollowmere Manor and is tied to Corvin through powerful teleportation rings.',
          gmNotes: 'Edwin used his only ring to teleport to Corvin when she was taken to the island without him. This confirms the rings move the wearer to their heart’s true desire or the one their heart belongs to.',
          bullets: [
            'Edwin’s ring is gone now.',
            'He followed Corvin into danger immediately.',
            'His relationship with Corvin is now a major emotional anchor for the arc.',
          ],
        }),
        card({
          title: 'Princess Marithra',
          category: 'Hidden Heir / Living Revelation',
          playerSummary: 'Princess Marithra is the missing heir of Balderin, found alive in a coffin beneath Akara’s tomb.',
          gmNotes: 'She was sustained by a fading pendant. Azrael gave life force to strengthen it. She is not safe yet, and her survival could rewrite Tiamina’s politics.',
          bullets: [
            'Alive, but only because the pendant is still holding.',
            'Connected to Balderin’s lost royal line.',
            'Her return can challenge Neremore’s capital claim.',
          ],
        }),
        card({
          title: 'Akara',
          category: 'Forgotten God of Greed',
          playerSummary: 'Akara offers people what they desire so they willingly worship him. Through worship, he gains power.',
          gmNotes: 'Akara is associated with greed, desire, buried power, promises, vessels, tombs, scarabs, jackal-headed imagery, and ancient forbidden power. He tried to make Vaelis his vessel and is furious that Opian blocked him.',
          bullets: [
            'Akara is dangerous because he offers, tempts, and gives people reasons to kneel willingly.',
            'The Scarab is now inside Vaelis.',
            'Akara’s influence has reached the world again.',
          ],
        }),
        card({
          title: 'Opian',
          category: 'Divine Jester / Loophole God',
          playerSummary: 'Opian is one of the Twelve Scions: god of trickery, laughter, theatre, games, entertainment, luck, chaos, loopholes, and bending fate.',
          gmNotes: 'Opian is not usually seen as evil, but he is dangerous because he treats destiny like something to be mocked, challenged, and cheated. His magic is tied to Chaos Tokens.',
          bullets: [
            'Opian protected Vaelis from becoming Akara’s vessel.',
            'Chaos Tokens are now a major table mechanic.',
            'His help solves one problem while handing fate a receipt.',
          ],
        }),
        card({
          title: 'Corova',
          category: 'Scion / Crow-Warden',
          playerSummary: 'Corova is the Crow-Warden: goddess of sacrifice, crows, omens, protection, duty, and those who willingly give of themselves for others.',
          gmNotes: 'Her signs are black feathers, teal light, watchful crows, and dreams of wings. Her champion is known as The Last Feather. Azrael is now the new Last Feather.',
          bullets: [
            'Black feathers and teal light are Corova’s visual language.',
            'Crows may guide or warn Azrael.',
            'Corova stands thematically against selfish greed by rewarding willing sacrifice.',
          ],
        }),
      ],
    }),

    section({
      id: 'current-secrets',
      destinations: ['handouts', 'sessionNotes', 'storyArcs'],
      eyebrow: 'Important current secrets',
      title: 'Secrets Sitting on the Table',
      summary: 'These are the facts currently loaded with dramatic potential and ready to be revealed, hidden, twisted, or weaponised.',
      cards: [
        card({
          title: 'Corvin’s Ring and Letter',
          category: 'Secret / Relationship Handout',
          gmNotes: 'The party has Corvin’s missing ring and love letter to Edwin. Corvin does not know they still have either. The ring was likely torn away when her ring finger was ripped off.',
          bullets: [
            'Ring pair links to true heart’s desire.',
            'Love letter proves Corvin and Edwin’s bond.',
            'Keeping it secret could damage trust later.',
          ],
        }),
        card({
          title: 'Edwin’s Spent Ring',
          category: 'Secret / Item Consequence',
          gmNotes: 'Edwin used his one and only teleportation ring to follow Corvin. The party noticed his ring was gone after he appeared.',
          bullets: [
            'The rings have one-use or limited-use implications unless later changed.',
            'Edwin has already spent his way back to Corvin.',
            'This shows his priorities clearly.',
          ],
        }),
        card({
          title: 'Princess Marithra Lives',
          category: 'Secret / Political Bombshell',
          gmNotes: 'Princess Marithra is alive, hidden in Akara’s tomb and sustained by a fading pendant. Her survival can change Balderin, Neremore, and the Court of Crowns.',
          bullets: [
            'The world likely believes her dead or lost.',
            'Neremore’s rise could be threatened by her return.',
            'The pendant may still be a timer.',
          ],
        }),
        card({
          title: 'Vaelis and Akara’s Loophole',
          category: 'Secret / Divine Contract',
          gmNotes: 'Vaelis accepted Akara’s power but did not agree to become his vessel. Opian protected the loophole, and Akara cannot simply take the power back.',
          bullets: [
            'Vaelis has power and agency.',
            'Akara has influence and anger.',
            'Opian has made himself part of the bargain’s future consequences.',
          ],
        }),
      ],
    }),

    section({
      id: 'inventory-and-gifts',
      destinations: ['inventory', 'handouts', 'campaignRules'],
      eyebrow: 'Inventory, gifts, and relics',
      title: 'Items That Now Matter',
      summary: 'Corova’s gifts, Akara’s scarab, and Edwin/Corvin’s rings now carry mechanical and story weight.',
      cards: [
        card({
          title: 'Scarab of Akara — Awakened Conduit',
          category: 'Embedded Relic / Player Power',
          playerSummary: 'The Scarab of Akara is no longer merely carried. It is embedded into Vaelis’s chest and hand like black-gold chitin beneath the skin.',
          gmNotes: 'Track Scarab Charges and visible Akara influence. The item is also a roleplay pressure tool, not just a combat boost.',
          mechanics: [
            'Charges equal Vaelis’s Warlock level and return after a long rest.',
            'Scarab Save DC equals Vaelis’s spell save DC.',
            'Use Scarab Shell, Akara’s Hunger, Command of the Buried King, and Whisper Beneath the Sand as current feature set.',
          ],
        }),
        card({
          title: 'Corova’s Mercy',
          category: 'Magic Longsword / Requires Attunement',
          playerSummary: 'A black onyx longsword shaped like one long extended crow feather, with feather patterns along the blade and a teal gem at the hilt.',
          gmNotes: 'A clean Corova item: duty, mercy, sacrifice, protection, black feathers, teal light.',
          mechanics: [
            '+1 longsword, magical.',
            'Once per long rest on hit: extra 1d8 radiant or necrotic damage.',
            'If an ally within 30 feet drops to 0 HP, the gem flares. Until the end of the wielder’s next turn, their next hit deals +1d8 radiant damage.',
          ],
        }),
        card({
          title: 'Crow-Warden Armour',
          category: 'Half Plate / Requires Attunement',
          playerSummary: 'Black onyx-like half plate edged with faint teal veins of light, folded crow-wing shoulders, and a cloak of black feathers.',
          gmNotes: 'This is Azrael’s protector identity made physical.',
          mechanics: [
            'Functions as half plate.',
            'Walking speed increases by 10 feet.',
            '+2 to saving throws against being frightened.',
            'Once per long rest, reaction when a creature within 30 feet takes damage: reduce that damage by 1d10 + Charisma modifier.',
          ],
        }),
        card({
          title: 'Edwin and Corvin’s Teleportation Rings',
          category: 'Relationship Relic / Secret Item',
          playerSummary: 'A pair of rings that carry the wearer toward their heart’s truest desire, or the person their heart truly belongs to.',
          gmNotes: 'Edwin spent his ring to follow Corvin. The party still has Corvin’s ring, plus her love letter, and Corvin does not know.',
          mechanics: [
            'Confirmed effect: teleport to true heart’s desire / beloved.',
            'Known cost: Edwin’s ring is now gone from his finger after use.',
            'Open question: one-use, recharge, destroyed-on-use, or hidden deeper cost.',
          ],
          tbd: 'Final ring rules: range, plane limits, cost, whether it can be restored, and what happens with divided desires.',
        }),
      ],
    }),

    section({
      id: 'chaos-and-fate',
      destinations: ['campaignRules', 'sessionNotes'],
      eyebrow: 'Table rules',
      title: 'Chaos Tokens and Fate Tokens',
      summary: 'Opian’s Chaos Tokens let players bend the moment, but each spent token gives the DM Fate Tokens as the universe pushes back.',
      cards: [
        card({
          title: 'Chaos Token Sources',
          category: 'Player Resource',
          gmNotes: 'Chaos Tokens are gifts from Opian. Award them for natural 20s, strong roleplay, big character moments, or creative dramatic choices.',
          bullets: [
            'When a player spends a Chaos Token, it becomes a DM Fate Token.',
            'Only one Chaos Token effect can normally be used on the same roll unless the DM allows otherwise.',
            'Chaos Token rerolls cannot generate another Chaos Token.',
          ],
        }),
        card({
          title: 'Spend 1 Chaos Token',
          category: 'Player Resource / Minor Fate Bend',
          mechanics: [
            'Add 1d4 to a d20 roll.',
            'Upgrade one non-d20 die one size.',
            'Make one non-d20 die explode.',
            'Downgrade one incoming damage die one size.',
            'Remove one incoming damage die, as long as at least one die remains.',
          ],
        }),
        card({
          title: 'Spend 2 Chaos Tokens',
          category: 'Player Resource / Strong Fate Bend',
          mechanics: [
            'Reroll one d20 and use the new result.',
            'Cancel disadvantage before rolling.',
            'Turn an enemy critical hit into a normal hit.',
            'Call on Opian for minor help, usually a reroll or +1d4, gaining 1 Quirk of Fate until next long rest.',
          ],
        }),
        card({
          title: 'Spend 3 Chaos Tokens',
          category: 'Player Resource / Major Fate Bend',
          mechanics: [
            'Gain advantage before rolling.',
            'After rolling with disadvantage, cancel disadvantage and use the higher die.',
            'Upgrade a non-d20 die and make it explode.',
            'Call on Opian for major help, such as turning a failed ability check or saving throw into a success with complication. This gives 2 Quirks of Fate.',
          ],
        }),
        card({
          title: 'Fate Tokens',
          category: 'DM Resource / Universe Pushback',
          gmNotes: 'Fate Tokens represent the world pushing back after Opian meddles with fate. Recommended limit: maximum one Fate Token effect per round.',
          mechanics: [
            '1 Fate Token: add 1d4 to enemy roll, move enemy 10 feet without opportunity attacks, give enemy 10 temp HP, or add a small environmental complication.',
            '2 Fate Tokens: enemy reroll, retaliating attack after being hit, enemy ends one condition, or minor reinforcement appears.',
            '3 Fate Tokens: boss attack after a player turn, recharge special ability, major lair effect, battlefield shift, or boss gains 30 temp HP.',
          ],
        }),
      ],
    }),

    section({
      id: 'divine-lore-update',
      destinations: ['worldOverview', 'powers', 'storyArcs', 'chronicle'],
      eyebrow: 'Divine lore update',
      title: 'Prima, Aevon, Koltoro, and the Twelve Scions',
      summary: 'The creation myth is now clearer: Prima and Aevon were lovers, Koltoro was their first child, and the Twelve Scions were born from the creators’ final sacrifice after The First Schism.',
      cards: [
        card({
          title: 'Prima and Aevon',
          category: 'Creator Myth',
          playerSummary: 'Prima believed mortals should be guided and protected when their need was true. Aevon believed in free will, consequence, and the right for mortals to shape their own destiny.',
          gmNotes: 'They were lovers before enemies. The tragedy is not that they hated each other, but that Koltoro made each believe the other would destroy the world they loved.',
          bullets: [
            'Prima: guidance, compassion, divine support, protection.',
            'Aevon: free will, independence, consequence, mortal choice.',
            'The First Schism is also called The Lovers’ Sundering.',
          ],
        }),
        card({
          title: 'Koltoro, First Child',
          category: 'Forbidden Origin',
          playerSummary: 'Koltoro was the first child of Prima and Aevon, darkened by jealousy and hunger for control.',
          gmNotes: 'He twisted Prima’s compassion into accusation and Aevon’s belief in freedom into suspicion. Neither creator truly wanted war, but Koltoro made each believe the other would destroy the world.',
          bullets: [
            'Associated with domination, manipulation, corruption, control, and betrayal.',
            'Sealed away after the First Schism because he was too dangerous to destroy and too dangerous to leave free.',
          ],
        }),
        card({
          title: 'The Origin of Magic',
          category: 'Magic Lore',
          playerSummary: 'Magic is the spilled essence of the first creators, left behind when their love, grief, and conflict broke the world open.',
          gmNotes: 'Arcane power, divine miracles, wild magic, ancient curses, and relics can all trace back to that first wound in creation.',
        }),
        card({
          title: 'The Twelve Scions',
          category: 'Recognised Pantheon',
          playerSummary: 'After the war, Prima and Aevon separated forever and gave up the last of their divine power. From that sacrifice came the Twelve Scions.',
          gmNotes: 'The Twelve were created so no single god could claim all power. Each carries a different part of divine responsibility in Prima and Aevon’s absence.',
          bullets: [
            'Asus, the Everlight — healing, mercy, restoration, medicine, renewal, second chances. Champion: Hand of Mercy.',
            'Barkera, the Deepwood — nature, forests, beasts, plants, wild places. Champion: Thornspeaker.',
            'Kargan, the Red Blade — war, battle, soldiers, courage, tactics, honourable combat. Champion: Red Commander.',
            'Naskin, the Stoneheart — strength, endurance, stone, protection, labour, resilience. Champion: Mountain-Bearer.',
            'Otia, the Starfall — wisdom, stars, prophecy, fate, knowledge, divine order. Champion: Star-Seer.',
            'Opian, the Divine Jester — trickery, laughter, theatre, games, entertainment, luck, chaos, loopholes. Champion: Laughing Blade.',
            'Corova, the Crow-Warden — sacrifice, crows, omens, protection, duty, willing self-sacrifice. Champion: Last Feather.',
            'Inorr, the Forgefire — fire, craft, invention, smithing, tools, weapons, industry. Champion: First Hammer.',
            'Weaver, the Tidebringer — sea, rivers, tides, sailors, emotional change, grief, long journeys. Champion: Tidewalker.',
            'Kutos, the Skyfire — storms, lightning, wind, freedom, travel, rebellion, sudden change. Champion: Stormrunner.',
            'Saerin, the Shadow Weaver — shadows, secrets, stealth, hidden truths, illusion, spies. Champion: Veiled Knife.',
            'Yena, the Lifeweaver — life, birth, growth, families, fertility, souls, natural cycles. Champion: Soulseed.',
          ],
        }),
        card({
          title: 'The Severing of the Crowns',
          category: 'Champion History',
          playerSummary: 'The mortal world eventually rejected divine champions, choosing its own laws, kings, failures, and freedom.',
          gmNotes: 'This was, in many ways, mortals choosing Aevon’s belief over Prima’s. Azrael becoming The Last Feather is therefore historically massive.',
          bullets: [
            'Champions were mortal vessels/passengers for divine will.',
            'They once ended plagues, slew monsters, defended sacred places, and fought Koltoro’s remnants.',
            'Mortals later drove them out, exiled them, sealed them away, or let them fade into legend.',
          ],
        }),
      ],
    }),

    section({
      id: 'forbidden-gods-update',
      destinations: ['powers', 'storyArcs', 'handouts'],
      eyebrow: 'Forbidden gods',
      title: 'Koltoro, Morwen, and Akara',
      summary: 'Not every forbidden divine name is evil. Morwen is forbidden by origin. Akara is forbidden by temptation. Koltoro is forbidden because he broke the first family of creation.',
      cards: [
        card({
          title: 'Morwen, the Gentle Passing',
          category: 'Forbidden God / Mercy Death',
          playerSummary: 'Morwen guides souls into peaceful rest and watches over the dead who deserve gentleness after suffering.',
          gmNotes: 'She is believed to be one of Koltoro’s children, possibly his first, but she rejects domination, fear, and power. She is forbidden because of where she comes from, not because she is evil.',
          bullets: [
            'The Fields are her quiet pocket realm of soft grass, still skies, warm light, and rest.',
            'Her symbol is a silver hand holding a black feather.',
            'Azrael previously served Morwen before accepting Corova’s offer.',
          ],
        }),
        card({
          title: 'Akara, Forgotten God of Greed',
          category: 'Forbidden God / Temptation',
          playerSummary: 'Akara is tied to greed, desire, promises, buried wealth, ambition, and the hunger for more.',
          gmNotes: 'Akara is dangerous because he offers. He grants people what they desire, or claims he can, so they worship him. Through worship, he gains power.',
          bullets: [
            'Associated with scarabs, tombs, jackal-headed imagery, vessels, buried wealth, and forbidden power.',
            'The more people want from him, the stronger he becomes.',
            'His influence has reached the world again through Vaelis and the Scarab.',
          ],
        }),
      ],
    }),

    section({
      id: 'project-notes',
      destinations: ['handouts'],
      eyebrow: 'Other project notes found',
      title: 'Side Material to Keep Separate',
      summary: 'These notes are useful, but should not be mixed into the Tia-Karta campaign canon unless deliberately imported later.',
      cards: [
        card({
          title: 'Rookie Quest Keeper Print-Ready Pack',
          category: 'Separate Project Track',
          gmNotes: 'A separate project track included a print-ready PDF pack with quick start rules, version 0.9 reference rules, printing guide, Echo Cave map, Grumblepaw art/tokens, Bramblewood Forest map, Bramblehorn art/tokens, Frozen Ridge map, marker/token sheet, and playtest sheet.',
          bullets: ['Keep this as Rookie Quest Keeper product/playtest material, not Tia-Karta campaign lore by default.'],
        }),
        card({
          title: 'Punch’s Kensei Arc',
          category: 'Separate Character Note',
          gmNotes: 'Punch rejected the brute-force identity tied to his tribe, no longer wants to be called Punch, discovered painting, and chose Way of the Kensei with quarterstaff, hand crossbow, and painter’s supplies.',
          bullets: ['Useful character-development note, but keep separate unless Punch enters this campaign.'],
        }),
      ],
    }),
  ],
};

export function getTiaKartaUpdateSectionsForDestination(destination) {
  return tiaKartaSessionTwoPack.sections.filter(section => section.destinations.includes(destination));
}

export function hasTiaKartaUpdateSectionsForDestination(destination) {
  return getTiaKartaUpdateSectionsForDestination(destination).length > 0;
}

export default tiaKartaSessionTwoPack;
