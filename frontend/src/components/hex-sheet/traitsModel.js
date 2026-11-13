/**
 * The data behind the hexagon sheet's Traits page, kept free of React: a
 * wheel of Class, Race (Species in the 2024 rules), Feats and Background,
 * each with its traits as name, a short tag line and a description.
 *
 * Only what the character has saved, or the built-in SRD rules data for
 * their choices, is shown: nothing is invented.
 */
import { BACKGROUNDS } from '@/data/characterRules5e';
import { FEATS } from '@/data/levelUpData';
import { srdTraitSummary, traitKey } from '@/data/srdTraitSummaries';
import { featureTypeLabel } from '@/components/clean-sheet/cleanSheetUtils';

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const oneOrList = (value) => (Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []);
const text = (value) => String(value ?? '').trim();
const is2024 = (edition) => String(edition || '').includes('2024');

/** A trait saved as text or as an object, as { name, note, description }. */
function readTrait(trait) {
  if (!trait) return null;
  if (typeof trait === 'string') {
    const note = (trait.match(/\(([^)]+)\)/) || [])[1] || (trait.match(/(\d+\s*(?:ft|feet)\.?)/i) || [])[1] || '';
    const name = text(trait.replace(/\(.*?\)/g, '').replace(/\d+\s*(ft|feet)\.?/gi, '')) || text(trait);
    return { name, note: text(note).replace(/^(\d+)\s*(?:ft|feet)\.?$/i, '$1 ft'), description: '' };
  }
  const name = text(trait.name || trait.title || trait.label);
  if (!name) return null;
  return { name, note: text(trait.note || trait.range), description: text(trait.description || trait.desc || trait.summary || trait.text) };
}

function classSection(character, classFeatures) {
  const items = asList(classFeatures).map((feature) => {
    const type = featureTypeLabel(feature.type);
    const tags = [feature.level ? `Level ${feature.level}` : '', type && type !== 'Passive' ? type : '', text(feature.uses)].filter(Boolean);
    return { name: text(feature.name), tag: tags.join(' · '), description: text(feature.description) };
  }).filter((item) => item.name);
  const choices = [
    ['Fighting Style', oneOrList(character.fighting_styles).length ? character.fighting_styles : oneOrList(character.fighting_style)],
    ['Expertise', oneOrList(character.expertise_choices).length ? character.expertise_choices : oneOrList(character.expertise)],
    ['Metamagic', oneOrList(character.metamagic_options).length ? character.metamagic_options : oneOrList(character.metamagic)],
    ['Maneuvers', oneOrList(character.combat_maneuvers).length ? character.combat_maneuvers : oneOrList(character.maneuvers)],
    ['Pact Boon', oneOrList(character.pact_boon || character.pactBoon)],
    ['Eldritch Invocations', oneOrList(character.eldritch_invocations).length ? character.eldritch_invocations : oneOrList(character.invocations)],
  ].map(([label, values]) => ({ label, value: oneOrList(values).map((value) => text(value?.name || value)).filter(Boolean).join(', ') }))
    .filter((fact) => fact.value);
  const subclass = text(character.subclass || character.archetype);
  const facts = [
    { label: 'Class', value: `${text(character.character_class || character.class_name) || 'Class'} ${Number(character.level) || 1}` },
    ...(subclass ? [{ label: 'Subclass', value: subclass }] : []),
    ...choices,
  ];
  return { id: 'class', label: 'Class', items, facts };
}

function raceSection(character, snapshotRace = {}, edition) {
  const label = is2024(edition) ? 'Species' : 'Race';
  const saved = asList(character.racial_traits || character.species_traits);
  const source = saved.length ? saved : asList(snapshotRace.traits);
  const seen = new Set();
  const items = source.map(readTrait).filter(Boolean).filter((trait) => {
    const key = traitKey(trait.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((trait) => ({
    name: trait.name,
    tag: trait.note,
    description: trait.description || srdTraitSummary(trait.name, edition),
  }));
  const name = text(character.race || character.species || snapshotRace.name);
  const sub = text(character.subrace || character.subspecies || character.lineage);
  const darkvision = source.map((trait) => (typeof trait === 'string' ? trait : text(trait?.name)))
    .map((entry) => entry.match(/darkvision\D*(\d+)/i)).find(Boolean);
  const languages = asList(character.languages).map((language) => text(language?.name || language)).filter(Boolean);
  const facts = [
    { label, value: sub ? `${name} (${sub})` : name },
    { label: 'Speed', value: `${Number(character.speed || snapshotRace.speed) || 30} ft` },
    ...(snapshotRace.size || character.size ? [{ label: 'Size', value: text(character.size || snapshotRace.size) }] : []),
    ...(darkvision ? [{ label: 'Darkvision', value: `${darkvision[1]} ft` }] : []),
    ...(languages.length ? [{ label: 'Languages', value: languages.join(', ') }] : []),
  ].filter((fact) => fact.value);
  return { id: 'race', label, items, facts };
}

const FEAT_INDEX = new Map(FEATS.flatMap((feat) => [feat.name, ...asList(feat.aliases)].map((name) => [traitKey(name), feat])));

function featsSection(character) {
  const items = asList(character.feats).map((feat) => {
    const name = text(typeof feat === 'string' ? feat : feat.name || feat.title || feat.label);
    if (!name) return null;
    const known = FEAT_INDEX.get(traitKey(name));
    const level = typeof feat === 'object' ? feat.level || feat.gained_at_level : '';
    const source = typeof feat === 'object' ? text(feat.source || feat.category) : '';
    const description = (typeof feat === 'object' && text(feat.description || feat.desc || feat.summary || feat.text)) || text(known?.description);
    return { name, tag: [level ? `Level ${level}` : '', source && !/^srd/i.test(source) ? source : ''].filter(Boolean).join(' · '), description };
  }).filter(Boolean);
  return { id: 'feats', label: 'Feats', items, facts: [] };
}

function backgroundSection(character, edition) {
  const name = text(character.background);
  const data = BACKGROUNDS[name] || null;
  const saved = asList(character.background_features).map(readTrait).filter(Boolean);
  const items = saved.length
    ? saved.map((trait) => ({ name: trait.name, tag: trait.note, description: trait.description }))
    : (data?.feature && !is2024(edition) ? [{ name: data.feature, tag: 'Background feature', description: '' }] : []);
  const skills = asList(character.background_skills).length ? character.background_skills : asList(data?.skillProficiencies);
  const facts = [
    ...(name ? [{ label: 'Background', value: name }] : []),
    ...(skills.length ? [{ label: 'Skills', value: skills.join(', ') }] : []),
    ...(is2024(edition) && data?.originFeat2024 ? [{ label: 'Origin feat', value: data.originFeat2024 }] : []),
  ];
  return { id: 'background', label: 'Background', items, facts };
}

/**
 * @param {object} character
 * @param {{ classFeatures?: object[], snapshotRace?: object, rulesEdition?: string }} options
 */
export function traitSections(character = {}, { classFeatures = [], snapshotRace = {}, rulesEdition = '2014' } = {}) {
  return [
    classSection(character, classFeatures),
    raceSection(character, snapshotRace, rulesEdition),
    featsSection(character),
    backgroundSection(character, rulesEdition),
  ];
}
