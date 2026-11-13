import { traitSections } from './traitsModel';
import { srdTraitSummary, traitKey } from '@/data/srdTraitSummaries';

const elf = {
  character_class: 'Wizard', level: 3, subclass: 'School of Evocation',
  race: 'Elf', subrace: 'High Elf', speed: 30, languages: ['Common', 'Elvish'],
  feats: ['Grappler', { name: 'Homebrew Grit', description: 'Our table\'s own feat.', level: 4 }],
  background: 'Acolyte',
};
const snapshotRace = { name: 'Elf', speed: 30, size: 'Medium', traits: ['Darkvision 60ft', 'Keen Senses (Perception proficiency)', 'Fey Ancestry', 'Trance', 'Cantrip (Wizard list)'] };
const classFeatures = [
  { name: 'Arcane Recovery', level: 1, type: 'passive', description: 'Recover spell slots on a short rest.' },
  { name: 'Spellcasting', level: 1, description: 'Cast wizard spells.' },
];

describe('traitSections', () => {
  const [klass, race, feats, background] = traitSections(elf, { classFeatures, snapshotRace, rulesEdition: '2014' });

  it('lists class features with their level, and the subclass', () => {
    expect(klass.items.map((item) => item.name)).toEqual(['Arcane Recovery', 'Spellcasting']);
    expect(klass.items[0].tag).toBe('Level 1');
    expect(klass.facts).toEqual(expect.arrayContaining([{ label: 'Subclass', value: 'School of Evocation' }]));
  });

  it('explains each race trait from the SRD when the character saved only its name', () => {
    expect(race.label).toBe('Race');
    expect(race.items.map((item) => item.name)).toEqual(['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance', 'Cantrip']);
    expect(race.items[0]).toMatchObject({ tag: '60 ft', description: expect.stringMatching(/dim light/) });
    expect(race.items[1].description).toBe('You are proficient in Perception.');
    expect(race.facts).toEqual(expect.arrayContaining([
      { label: 'Race', value: 'Elf (High Elf)' },
      { label: 'Darkvision', value: '60 ft' },
      { label: 'Languages', value: 'Common, Elvish' },
    ]));
  });

  it('keeps a trait description the character saved', () => {
    const custom = { ...elf, racial_traits: [{ name: 'Fey Ancestry', description: 'Table wording.' }] };
    expect(traitSections(custom, { snapshotRace })[1].items).toEqual([{ name: 'Fey Ancestry', tag: '', description: 'Table wording.' }]);
  });

  it('describes SRD feats and keeps a homebrew feat\'s own text', () => {
    expect(feats.items[0]).toMatchObject({ name: 'Grappler', description: expect.stringMatching(/grappl/) });
    expect(feats.items[1]).toEqual({ name: 'Homebrew Grit', tag: 'Level 4', description: 'Our table\'s own feat.' });
  });

  it('shows the background, its skills and its feature', () => {
    expect(background.facts).toEqual(expect.arrayContaining([{ label: 'Background', value: 'Acolyte' }, { label: 'Skills', value: 'Insight, Religion' }]));
    expect(background.items[0]).toMatchObject({ name: 'Shelter of the Faithful' });
  });

  it('calls it Species, with the 2024 wording, under the 2024 rules', () => {
    const [, species] = traitSections(elf, { snapshotRace, rulesEdition: '2024' });
    expect(species.label).toBe('Species');
    expect(species.items.find((item) => item.name === 'Keen Senses').description).toMatch(/Insight, Perception or Survival/);
  });
});

describe('edition-specific rules text', () => {
  it('gives a 2014 character the 2014 Grappler text, and no text for a 2024-only feat', () => {
    const fighter = { character_class: 'Fighter', level: 4, feats: ['Grappler', 'Alert'] };
    const [, , older] = traitSections(fighter, { rulesEdition: '2014' });
    expect(older.items[0].description).toMatch(/pin a grappled creature/);
    expect(older.items[1]).toEqual({ name: 'Alert', tag: '', description: '' });
    const [, , newer] = traitSections(fighter, { rulesEdition: '2024' });
    expect(newer.items[0].description).toMatch(/Unarmed Strike/);
    expect(newer.items[1].description).toMatch(/initiative/);
  });

  it('does not promise a 2014 Human the 2024 Versatile origin feat', () => {
    const human = { character_class: 'Fighter', level: 1, race: 'Human' };
    const snapshotRace = { name: 'Human', traits: ['Extra Language', 'Versatile (feat in 2024)'] };
    const [, race] = traitSections(human, { snapshotRace, rulesEdition: '2014' });
    expect(race.items.find((item) => item.name === 'Versatile').description).toBe('');
    const [, species] = traitSections(human, { snapshotRace, rulesEdition: '2024' });
    expect(species.items.find((item) => item.name === 'Versatile').description).toMatch(/Origin feat/);
  });
});

describe('srdTraitSummary', () => {
  it('files traits under their plain name', () => {
    expect(traitKey('Dwarven Resilience (poison advantage)')).toBe('dwarven resilience');
    expect(traitKey('Superior Darkvision 120ft')).toBe('superior darkvision');
    expect(srdTraitSummary('Made Up Trait')).toBe('');
  });
});
