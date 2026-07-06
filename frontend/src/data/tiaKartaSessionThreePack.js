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

export const tiaKartaSessionThreePack = {
  campaignName: 'Tia-Karta',
  currentArc: 'Act 1: The Crownless City',
  currentChapter: 'Arc 1.2: Return to Balderin Palace',
  sourceNote: 'Next-session prep pack: Princess Marithra returns toward Balderin, bandits guard the ruined palace, and the Queen’s Chair begins the clue trail to the Library and War Room.',
  sections: [
    section({
      id: 'next-session-overview',
      destinations: ['sessionNotes', 'storyArcs', 'chronicle'],
      eyebrow: 'Next session plan',
      title: 'Return to Balderin Palace',
      summary: 'The party takes Princess Marithra toward Balderin and finds the palace guarded by paid bandits. The session trail moves from the palace front, to the Queen’s Chair, to the Library, and finally into the hidden War Room.',
      cards: [
        card({
          title: 'Session 3 Table Flow',
          category: 'Running Order',
          playerSummary: 'The party returns to Balderin with Princess Marithra and finds the old palace blocked by armed strangers who clearly should not be there.',
          gmNotes: 'This session is designed as a palace infiltration and clue trail. The party should discover that someone is actively paying people to keep the palace sealed, then uncover the War Room and the first real plan to rebuild Balderin’s claim before the Court of Crowns.',
          bullets: [
            'Start: travelling with Princess Marithra toward Balderin Palace.',
            'Beat 1: bandits at the palace front.',
            'Beat 2: overheard paid orders if the party listens carefully.',
            'Beat 3: Queen’s Chair outside the palace with a hidden compartment.',
            'Beat 4: letter and riddle point toward the Library.',
            'Beat 5: Library puzzle opens the way to the War Room.',
            'End: party finds War Room, letters about rebuilding Balderin, and Lucy and Grey.',
          ],
        }),
        card({
          title: 'Session Goal',
          category: 'GM Objective',
          playerSummary: 'The party begins to learn that Princess Marithra’s survival is not just a rescue. It is a political mission.',
          gmNotes: 'By the end, the players should understand their next larger objective: find as many surviving former council members as possible, gather whoever they can, and take them to the Court of Crowns to support Balderin’s return as a capital power.',
          bullets: [
            'Make Marithra feel important without forcing her into command yet.',
            'Let the bandits prove someone outside the party is trying to control access to the palace.',
            'Use the riddles to make the players feel like they are opening the royal past, not just looting ruins.',
            'End on the War Room reveal and Grey’s petrification mystery.',
          ],
        }),
      ],
    }),

    section({
      id: 'balderin-palace-approach',
      destinations: ['encounters', 'sessionNotes', 'worldAtlas'],
      eyebrow: 'Encounter setup',
      title: 'Bandits at the Palace Front',
      summary: 'Paid bandits are stationed at the front of Balderin Palace. They have been told to stop anyone entering and kill intruders if they must.',
      cards: [
        card({
          title: 'Paid Bandit Guard Post',
          category: 'Social / Combat Encounter',
          playerSummary: 'The front of the palace is not empty. Bandits linger around the ruined approach, armed and restless, guarding a place that should already be abandoned.',
          gmNotes: 'The bandits are not loyal zealots. They have been paid to stay there and keep people out. Their job is simple: make sure no one gets inside the palace, beat intruders if they can, and kill them if they have to.',
          bullets: [
            'The bandits are discussing their orders if the party listens before engaging.',
            'They know they are being paid, but may not know the true employer.',
            'They can be fought, frightened, questioned, or possibly bribed, depending on player choices.',
            'Their presence should make the palace feel actively suppressed, not merely forgotten.',
          ],
          mechanics: [
            'Suggested Perception DC 13: hear low voices and catch that they are being paid to guard the entrance.',
            'Suggested Perception DC 16: hear the exact order: keep everyone out, rough up anyone who tries, kill persistent intruders.',
            'Suggested Insight DC 13: the bandits are nervous hired muscle, not true believers.',
            'Suggested Intimidation/Persuasion DC 15: one bandit may reveal that the payment came through a middleman.',
          ],
          tbd: 'Bandit count, stat blocks, employer identity, and whether any bandit carries a payment token or written order.',
        }),
        card({
          title: 'Bandit Clues',
          category: 'Clue List',
          gmNotes: 'Use these as flexible clues if the party searches, interrogates, or listens well.',
          bullets: [
            'A pouch of fresh coin that looks too new for scavengers living around ruins.',
            'A rough spoken order: “No one gets in. Doesn’t matter who they say they are.”',
            'A complaint that the job was meant to be easy money because “no one comes back here.”',
            'A nervous comment about “the chair being creepy” after they moved it outside.',
            'A possible reference to a middleman, masked courier, or contract mark if you want to seed Neremore or another faction later.',
          ],
        }),
      ],
    }),

    section({
      id: 'queens-chair-clue',
      destinations: ['sessionNotes', 'handouts', 'inventory'],
      eyebrow: 'Clue trail',
      title: 'The Queen’s Chair',
      summary: 'The Queen’s Chair has been moved from the throne room to the front of the palace. Hidden inside is a secret compartment containing a letter and a riddle pointing to the Library.',
      cards: [
        card({
          title: 'The Queen’s Chair Outside the Palace',
          category: 'Secret Compartment / Palace Clue',
          playerSummary: 'Near the palace front sits an ornate royal chair that clearly does not belong outside in the weather. It looks like it was dragged from somewhere important.',
          gmNotes: 'This is the Queen’s Chair from the throne room. It was moved outside by the bandits or whoever hired them. It contains a secret compartment with a letter and the first riddle.',
          bullets: [
            'The chair should feel wrong immediately: royal, exposed, and out of place.',
            'Marithra may recognise it faintly or react emotionally, even if her memory is unclear.',
            'A hidden compartment is worked into the underside, arm, or back panel.',
          ],
          mechanics: [
            'Investigation DC 13: spot scratches and signs the chair was dragged from inside.',
            'Investigation DC 15: find the hidden compartment.',
            'History DC 12: identify it as royal furniture, not ordinary palace salvage.',
          ],
        }),
        card({
          title: 'Handout: Letter Hidden in the Queen’s Chair',
          category: 'Player Handout / Palace Secret',
          playerSummary: 'To whoever still carries Balderin in their heart: not every crown is worn, and not every throne is seen. If our line survives, let them seek what kings forget and queens remember. The city’s future was never kept in gold, but in words, maps, names, and promises.',
          gmNotes: 'This letter points toward the Library and then the War Room. It should sound like a royal safeguard left behind for someone loyal enough to look deeper.',
          bullets: [
            'Keep the writer unnamed for now unless you want it to be the Queen, Prime Minister, or royal council.',
            'The line “maps, names, and promises” foreshadows the War Room and ex-council member objective.',
          ],
        }),
        card({
          title: 'Riddle 1: To the Library',
          category: 'Riddle / Handout',
          playerSummary: 'I have no tongue, yet keep every voice. I have no crown, yet counsel every king. I do not march, yet wars are won through me. Find me where silence teaches the dead to speak.',
          gmNotes: 'Answer: the Library. The dead speaking means old records, histories, royal letters, and council names. If players struggle, Marithra can react to “silence teaches” or a palace map can show the Library near the throne wing.',
          mechanics: [
            'Answer: Library.',
            'Optional Intelligence/History DC 12: connect “counsel every king” with royal records.',
            'Optional Investigation DC 12: palace dust trails or drag marks lead inward toward the library wing.',
          ],
        }),
      ],
    }),

    section({
      id: 'library-puzzle',
      destinations: ['sessionNotes', 'encounters', 'handouts'],
      eyebrow: 'Puzzle room',
      title: 'The Library Opens the War Room',
      summary: 'Inside the palace library, the party solves a second clue/puzzle to access the hidden War Room.',
      cards: [
        card({
          title: 'Library Puzzle Setup',
          category: 'Exploration / Puzzle',
          playerSummary: 'The Library is dusty, half-ruined, and strangely untouched in places. Shelves sag under old histories, battle records, family names, and council ledgers.',
          gmNotes: 'The Library puzzle should point to the War Room without feeling like a random escape room. It should be about Balderin’s memory: crown, council, map, and oath.',
          bullets: [
            'Look for four marked books or records: Crown, Council, Map, Oath.',
            'Putting them in the correct order opens the wall route to the War Room.',
            'The correct order can be hinted by the chair letter: words, maps, names, promises.',
          ],
          mechanics: [
            'Investigation DC 13: find unusual wear on four books or shelves.',
            'History DC 14: know Balderin’s old council order: Crown, Map, Council, Oath — or use the riddle order below instead.',
            'Arcana DC 13: sense dormant royal warding magic behind one wall.',
          ],
        }),
        card({
          title: 'Riddle 2: To the War Room',
          category: 'Puzzle / Handout',
          playerSummary: 'Before the crown can rise, the city must remember: first the land, then the names, then the promise. Place the realm before the rulers, and the oath after both.',
          gmNotes: 'Answer/order: Map, Council, Oath. The “crown can rise” line tells them this is about rebuilding Balderin, not crowning Marithra immediately. If you want four objects, use Crown last as the final seal after Map, Council, Oath.',
          mechanics: [
            'Three-object version: Map → Council → Oath.',
            'Four-object version: Map → Council → Oath → Crown.',
            'Success opens a hidden wall, stair, or sliding shelf into the War Room.',
            'Failure can trigger a harmless warning: teal/royal light, dust burst, or a whispered “Balderin remembers.”',
          ],
        }),
        card({
          title: 'Library Clues',
          category: 'Flexible Clues',
          gmNotes: 'Use these if players search instead of solving directly.',
          bullets: [
            'A map book has cleaner edges than the others.',
            'A council ledger is missing several names, as if pages were removed in a hurry.',
            'An oath book opens by itself near Marithra or near Azrael’s Corova-touched light.',
            'A crown history has a hollow spine containing a tiny metal key, signet, or old council seal.',
            'One wall contains no shelves but has faint rectangular seams like a sealed doorway.',
          ],
        }),
      ],
    }),

    section({
      id: 'war-room-reveal',
      destinations: ['sessionNotes', 'storyArcs', 'handouts', 'npcs'],
      eyebrow: 'Session ending',
      title: 'The Hidden War Room',
      summary: 'The party discovers the War Room: letters, plans, council names, and the first practical path toward rebuilding Balderin’s claim before the Court of Crowns.',
      cards: [
        card({
          title: 'War Room Discovery',
          category: 'Major Reveal / Campaign Objective',
          playerSummary: 'Behind the Library lies a hidden War Room filled with maps, letters, old council marks, and plans for how Balderin could one day return to power.',
          gmNotes: 'This is the real turn of the session. The party’s mission expands from protecting Marithra to rebuilding a political case. The War Room should make the players feel like they have uncovered a royal resistance plan that never got to happen.',
          bullets: [
            'Letters explain how Balderin could be rebuilt as the capital.',
            'The next major job is to find as many surviving former council members as possible.',
            'The party must gather whoever they can and take them to the Court of Crowns.',
            'This gives the campaign a clear political quest chain after the palace session.',
          ],
        }),
        card({
          title: 'War Room Letters',
          category: 'Handout / Political Evidence',
          playerSummary: 'The letters describe old council seats, hidden loyalists, emergency succession plans, and the legal argument that Balderin cannot truly be declared dead while its heir lives.',
          gmNotes: 'These letters are the bridge from dungeon mystery to political campaign. They should give names, partial locations, and enough hope to make the Court of Crowns objective feel possible but difficult.',
          bullets: [
            'Some council members may be dead, missing, hiding, bought off, or afraid.',
            'Some names can be damaged, coded, or incomplete so you can fill them in later.',
            'Neremore or another faction may already be hunting the same people.',
          ],
          tbd: 'Need final list of ex-council members, their names, locations, and which ones are loyal, compromised, or dead.',
        }),
        card({
          title: 'Lucy and Grey',
          category: 'War Room NPC Reveal',
          playerSummary: 'Inside the War Room, the party finds Lucy and Grey. Grey has been magically petrified, frozen in place as though caught between a warning and a final order.',
          gmNotes: 'Grey can be restored if someone says his full name. This should feel like a royal safeguard, a curse condition, or an emergency seal. Keep the full name hidden until the players earn it from letters, nameplates, council records, or Marithra’s memory.',
          bullets: [
            'Lucy is present in the War Room and should immediately raise questions about how she survived or got there.',
            'Grey is magically petrified and can return if his full name is spoken.',
            'The War Room reveal can end the session on Grey beginning to crack, breathe, or speak.',
          ],
          mechanics: [
            'Arcana DC 14: identify Grey’s petrification as magical and conditional, not normal stone curse.',
            'Investigation DC 15: find hints toward Grey’s full name in the War Room records.',
            'History DC 14: connect Grey to Balderin’s former council, guard, or royal staff depending on your final choice.',
          ],
          tbd: 'Confirm Lucy’s full name, Grey’s full name, their roles, and whether Grey returns to life, age eleven, level eleven, or another specific state.',
        }),
        card({
          title: 'Suggested Cliffhanger',
          category: 'Session End Beat',
          playerSummary: 'As the hidden room wakes around you, the stone figure’s face cracks. Dust falls from Grey’s lips. Somewhere beneath the palace, something answers the sound of his name.',
          gmNotes: 'End as Grey begins to return, or immediately after he gasps one warning: “Do not trust the vote.” That line points straight at the Court of Crowns and keeps the political tension hot.',
          bullets: [
            'Option A: Grey wakes and says, “Find the council.”',
            'Option B: Grey wakes and says, “Do not trust the vote.”',
            'Option C: Grey wakes, sees Marithra, and kneels before the players can ask anything.',
          ],
        }),
      ],
    }),

    section({
      id: 'council-quest-chain',
      destinations: ['storyArcs', 'chronicle', 'handouts'],
      eyebrow: 'Future quest chain',
      title: 'Find the Former Council',
      summary: 'The War Room reveals the campaign’s next political objective: locate surviving former council members and bring enough of them to the Court of Crowns to support Marithra and Balderin.',
      cards: [
        card({
          title: 'Council Member Objective',
          category: 'Campaign Objective',
          playerSummary: 'Balderin cannot stand on bloodline alone. Marithra needs witnesses, councillors, records, and political proof if she is to challenge the future of the Crownless City.',
          gmNotes: 'This gives the party a flexible quest chain. Each ex-council member can become a mini-adventure: rescue, persuasion, mystery, betrayal, protection, or proof-gathering.',
          bullets: [
            'Find surviving former council members.',
            'Work out who still supports Balderin’s royal line.',
            'Protect or persuade them before rival factions reach them.',
            'Bring enough support to the Court of Crowns.',
          ],
          tbd: 'Need names and locations for the ex-council member list.',
        }),
        card({
          title: 'Possible Council Member Types',
          category: 'Planning Aid',
          gmNotes: 'Use these as placeholders until final NPCs are named.',
          bullets: [
            'The Loyalist: still believes in Balderin but is in hiding.',
            'The Coward: knows the truth but fears Neremore or another faction.',
            'The Bought Vote: has accepted money or protection to stay silent.',
            'The Broken Witness: traumatised by the catastrophe and hard to convince.',
            'The Dead Seat: their records or heir must stand in their place.',
            'The Traitor: helped bury the truth and may still be active.',
          ],
        }),
      ],
    }),
  ],
};

export function getTiaKartaNextSessionSectionsForDestination(destination) {
  return tiaKartaSessionThreePack.sections.filter(section => section.destinations.includes(destination));
}

export default tiaKartaSessionThreePack;
