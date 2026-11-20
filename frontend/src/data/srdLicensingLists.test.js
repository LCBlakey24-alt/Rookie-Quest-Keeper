/**
 * Lists labelled "SRD" must contain only what the SRDs actually license.
 * Checked against the official SRD 5.1 and SRD 5.2.1 PDFs; see
 * docs/licensing/CONTENT_INVENTORY.md. A familiar name is not enough.
 */
import { SRD_BACKGROUNDS, SRD_BACKGROUNDS_2014, SRD_BACKGROUNDS_2024, SRD_RACES_2014, SRD_RACES_2024 } from './editionRules';

const SRD_5_1_RACES = ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Tiefling'];
const SRD_5_2_1_SPECIES = ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'];
const names = (list) => list.map((entry) => entry.name);

test('species labelled SRD are in the SRD for that edition', () => {
  names(SRD_RACES_2014).forEach((name) => expect(SRD_5_1_RACES).toContain(name));
  names(SRD_RACES_2024).forEach((name) => expect(SRD_5_2_1_SPECIES).toContain(name));
  expect(names(SRD_RACES_2024)).not.toContain('Aasimar');
});

test('backgrounds labelled SRD are in the SRD for that edition', () => {
  expect(names(SRD_BACKGROUNDS_2014)).toEqual(['Acolyte']);
  expect(names(SRD_BACKGROUNDS_2024)).toEqual(['Acolyte', 'Criminal', 'Sage', 'Soldier']);
  expect(names(SRD_BACKGROUNDS)).not.toEqual(expect.arrayContaining(['Folk Hero']));
  expect(names(SRD_BACKGROUNDS)).not.toEqual(expect.arrayContaining(['Noble']));
});
