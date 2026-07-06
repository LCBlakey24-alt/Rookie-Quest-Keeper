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

export const tiaKartaLucianGreyPack = {
  campaignName: 'Tia-Karta',
  currentArc: 'Act 1: The Crownless City',
  currentChapter: 'Arc 1.2: Return to Balderin Palace',
  sourceNote: 'War Room update: Grey is Lucian Grey, a secretly vampiric world-scale manipulator who begins as the party’s right-hand ally after being restored to life.',
  sections: [
    section({
      id: 'lucian-grey-war-room-reveal',
      destinations: ['sessionNotes', 'npcs', 'storyArcs', 'handouts'],
      eyebrow: 'War Room reveal update',
      title: 'Lucian Grey Returns',
      summary: 'The petrified figure in the War Room is Lucian Grey. Speaking his full name restores him to life, and he initially becomes the group’s right-hand guide.',
      cards: [
        card({
          title: 'Lucian Grey',
          category: 'Secret Villain / Right-Hand Ally',
          playerSummary: 'Lucian Grey is found petrified in the hidden War Room beneath Balderin Palace. When his full name is spoken, the magic breaks and he returns to life.',
          gmNotes: 'Lucian Grey is secretly a vampire with ambitions to take over the world. At first, he should present himself as helpful, informed, loyal to Balderin’s restoration, and useful enough that the group naturally treats him as their right-hand adviser.',
          bullets: [
            'Full name: Lucian Grey.',
            'Current state at discovery: magically petrified in the War Room.',
            'Trigger: speaking his full name restores him to life.',
            'Starting role: right hand to the party/group.',
            'True secret: vampire trying to take over the world.',
            'Public mask: loyal adviser, survivor, war-room keeper, or royal strategist.',
          ],
          mechanics: [
            'Arcana DC 14: the petrification is conditional and tied to identity/name magic.',
            'Investigation DC 15: find “Lucian Grey” in the War Room records, nameplate, sealed letter, or council roster.',
            'History DC 14: Lucian Grey was connected to Balderin’s old inner circle, but records about him are strangely incomplete.',
            'Insight DC 18 after revival: something about him feels too controlled, too hungry, or too calm for someone freshly restored.',
          ],
        }),
        card({
          title: 'Lucian’s First Scene',
          category: 'Roleplay Beat',
          playerSummary: 'As the final syllable of his name is spoken, cracks spread through the stone. Dust falls away from his face. Lucian Grey inhales for the first time in years and immediately asks if the princess lives.',
          gmNotes: 'Play him as useful first. He should know enough to help the party find ex-council members, understand the War Room, and prepare for the Court of Crowns. The vampire reveal should stay buried for later unless the players become suspicious quickly.',
          bullets: [
            'First priority he claims: protect Princess Marithra and restore Balderin.',
            'First useful information: the War Room letters are not enough without living witnesses.',
            'First advice: gather former council members before Neremore controls the vote.',
            'First lie: he frames his survival as royal protection magic, not vampiric preservation.',
          ],
        }),
        card({
          title: 'The Vampire Secret',
          category: 'GM Secret / Long Con',
          gmNotes: 'Lucian Grey should not look like the villain immediately. His goal is influence. If he can become the party’s trusted adviser, he can steer Marithra, the council search, the Court of Crowns, and eventually Balderin itself.',
          bullets: [
            'Lucian wants power through legitimacy, not just violence.',
            'He may support Marithra because she gives him a path back into politics.',
            'He may help the party defeat smaller threats to remove rivals.',
            'He may know more about the ancient vampire servant or Balderin’s vampire nest than he admits.',
            'He should feel like a solution before he becomes the problem.',
          ],
          tbd: 'Confirm whether Lucian Grey is connected to the ancient vampire servant, created the palace nest, served the royal family, or belongs to a separate vampire faction.',
        }),
      ],
    }),
  ],
};

export function getTiaKartaLucianGreySectionsForDestination(destination) {
  return tiaKartaLucianGreyPack.sections.filter(section => section.destinations.includes(destination));
}

export default tiaKartaLucianGreyPack;
