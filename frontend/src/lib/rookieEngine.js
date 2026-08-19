// Rook Engine local generation helpers (legacy filename kept for compatibility).
//
// This layer is deliberately deterministic rather than AI. It combines curated
// knowledge packs with relationship rules so common GM generation tasks are
// instant, explainable, available offline, and do not spend an AI request.

const pick = (items = []) => items[Math.floor(Math.random() * items.length)];
const unique = (items = []) => [...new Set(items.filter(Boolean))];

const HUMAN_FIRST = {
  male: ['Aldric', 'Alwyn', 'Bastian', 'Bennett', 'Bram', 'Cedric', 'Corin', 'Darian', 'Edric', 'Elias', 'Evren', 'Finn', 'Gareth', 'Harlan', 'Jareth', 'Jonas', 'Kael', 'Leif', 'Lucan', 'Marek', 'Nolan', 'Oren', 'Pavel', 'Quillan', 'Ronan', 'Soren', 'Tarin', 'Ulric', 'Varen', 'Wystan'],
  female: ['Adela', 'Brenna', 'Celia', 'Daria', 'Elara', 'Elise', 'Faye', 'Gwen', 'Helena', 'Isolde', 'Keira', 'Liora', 'Maren', 'Mira', 'Nessa', 'Orla', 'Rhea', 'Sabine', 'Thea', 'Vera', 'Wren', 'Xara', 'Ysolde', 'Zara'],
  neutral: ['Ash', 'Briar', 'Celyn', 'Ember', 'Hale', 'Lark', 'Linden', 'Quinn', 'Reed', 'Robin', 'Rowan', 'Vale', 'Wren'],
};

const ELF_FIRST = {
  male: ['Aelar', 'Aerandir', 'Caelen', 'Elandor', 'Elion', 'Faelar', 'Ilarion', 'Kaelen', 'Laeroth', 'Lethar', 'Naelor', 'Orym', 'Paelias', 'Rolen', 'Silvar', 'Thalion', 'Vaeril', 'Aerendyl', 'Calithor', 'Daerion', 'Eryndor', 'Ithalen', 'Maerion', 'Saereth', 'Theravel', 'Valanor'],
  female: ['Aeris', 'Althaea', 'Caelynn', 'Elara', 'Enna', 'Ilyana', 'Laeriel', 'Lethira', 'Liora', 'Maelis', 'Naivara', 'Serelis', 'Sylra', 'Thia', 'Vaella', 'Aelira', 'Cyrene', 'Elariel', 'Ithilwen', 'Mireth', 'Nuala', 'Saelira', 'Thessara', 'Vaerissa'],
  neutral: ['Ari', 'Eir', 'Leth', 'Nyel', 'Ryn', 'Sael', 'Syl', 'Vael', 'Aerin', 'Cael', 'Ithri', 'Nym', 'Sorael'],
};

const DWARF_FIRST = {
  male: ['Adrik', 'Baern', 'Barend', 'Brom', 'Dain', 'Darrak', 'Eberk', 'Fargrim', 'Flint', 'Garrik', 'Harbek', 'Kildrak', 'Orsik', 'Rurik', 'Taklinn', 'Thoradin', 'Torrin'],
  female: ['Amber', 'Artin', 'Audhild', 'Bardryn', 'Dagnal', 'Diesa', 'Eldeth', 'Falkrunn', 'Gunnloda', 'Helja', 'Hlin', 'Kathra', 'Kristryd', 'Riswynn', 'Sannl', 'Torbera', 'Vistra'],
  neutral: ['Anvil', 'Bryn', 'Ember', 'Flint', 'Korr', 'Slate', 'Tarn'],
};

const HALFLING_FIRST = {
  male: ['Alton', 'Ander', 'Cade', 'Corrin', 'Eldon', 'Errich', 'Finnan', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Perrin', 'Roscoe', 'Wellby'],
  female: ['Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia', 'Seraphina', 'Verna'],
  neutral: ['Bramble', 'Clover', 'Merry', 'Pip', 'Robin', 'Tansy', 'Willow'],
};

const GNOME_FIRST = {
  male: ['Alston', 'Boddynock', 'Brocc', 'Dimble', 'Fonkin', 'Frug', 'Gerbo', 'Gimble', 'Glim', 'Jebeddo', 'Namfoodle', 'Roondar', 'Seebo', 'Warryn', 'Zook'],
  female: ['Bimpnottin', 'Breena', 'Caramip', 'Donella', 'Duvamil', 'Ella', 'Ellyjobell', 'Ellywick', 'Lilli', 'Loopmottin', 'Lorilla', 'Mardnab', 'Nissa', 'Nyx', 'Oda', 'Orla', 'Roywyn', 'Shamil', 'Waywocket'],
  neutral: ['Bim', 'Fizz', 'Nim', 'Pock', 'Tink', 'Wizzle', 'Zib'],
};

const TIEFLING_FIRST = {
  male: ['Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon', 'Leucis', 'Melech', 'Mordai', 'Morthos', 'Pelaios', 'Skamos', 'Therai'],
  female: ['Akta', 'Anakis', 'Bryseis', 'Criella', 'Damaia', 'Ea', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna', 'Phelaia', 'Rieta'],
  neutral: ['Ash', 'Creed', 'Despair', 'Glory', 'Hope', 'Music', 'Quest', 'Reverence', 'Sorrow', 'Temperance', 'Torment', 'Weary'],
};

const ORC_FIRST = {
  male: ['Baggi', 'Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren', 'Ront', 'Shump', 'Thokk'],
  female: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka', 'Shautha', 'Sutha', 'Vola', 'Volen', 'Yevelda'],
  neutral: ['Gash', 'Korr', 'Ruk', 'Thar', 'Vek', 'Zug'],
};

const DRAGONBORN_FIRST = {
  male: ['Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash', 'Mehen', 'Nadarr', 'Pandjed', 'Patrin', 'Rhogar', 'Shamash', 'Shedinn', 'Tarhun', 'Torinn'],
  female: ['Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Havilar', 'Jheri', 'Kava', 'Korinn', 'Mishann', 'Nala', 'Perra', 'Raiann', 'Sora', 'Surina', 'Thava', 'Uadjit'],
  neutral: ['Ashar', 'Kava', 'Rhaz', 'Sora', 'Vyr', 'Zhar'],
};

const GOLIATH_FIRST = {
  male: ['Aruk', 'Bramak', 'Davor', 'Gorun', 'Hekar', 'Kovan', 'Marn', 'Orvek', 'Rokan', 'Tarak', 'Vurak', 'Zoren'],
  female: ['Avara', 'Dessa', 'Hara', 'Kalla', 'Mavek', 'Nori', 'Orra', 'Rava', 'Surna', 'Talia', 'Veka', 'Zhara'],
  neutral: ['Ashka', 'Dorn', 'Hale', 'Korr', 'Rime', 'Stone', 'Vale', 'Varn'],
};

const AASIMAR_FIRST = {
  male: ['Arel', 'Cassiel', 'Darian', 'Elion', 'Ilyr', 'Lucen', 'Orien', 'Rafael', 'Sareth', 'Tavian'],
  female: ['Arielle', 'Celene', 'Elira', 'Ilyra', 'Lumira', 'Neriel', 'Seren', 'Thalia', 'Vaela', 'Ysara'],
  neutral: ['Aster', 'Dawn', 'Halo', 'Lumen', 'Sol', 'Vesper', 'Wyn'],
};

const GOBLIN_FIRST = {
  male: ['Bik', 'Crik', 'Gazz', 'Kib', 'Mog', 'Nib', 'Rikk', 'Skab', 'Togg', 'Vizz'],
  female: ['Bikka', 'Dizzi', 'Grimma', 'Kazza', 'Mikka', 'Narra', 'Pikka', 'Rizza', 'Tikka', 'Zibba'],
  neutral: ['Boggle', 'Fizz', 'Grub', 'Murk', 'Pipzip', 'Skrit', 'Snag', 'Wizzle'],
};

const KOBOLD_FIRST = {
  male: ['Drix', 'Kep', 'Nix', 'Rik', 'Siv', 'Tekk', 'Varn', 'Zek'],
  female: ['Axi', 'Kira', 'Nessa', 'Rixi', 'Sava', 'Tika', 'Vexa', 'Ziri'],
  neutral: ['Chit', 'Krik', 'Nib', 'Pek', 'Razz', 'Tik', 'Zik'],
};

const FIRBOLG_FIRST = {
  male: ['Bren', 'Cairn', 'Doran', 'Eamon', 'Farren', 'Loran', 'Oran', 'Ronan', 'Toren'],
  female: ['Aila', 'Brena', 'Eira', 'Fara', 'Mara', 'Nessa', 'Orla', 'Sena', 'Tara'],
  neutral: ['Briar', 'Cedar', 'Fern', 'Moss', 'River', 'Rowan', 'Stone', 'Willow'],
};

const COMMON_SURNAMES = ['Ashburn', 'Barrow', 'Blackwood', 'Brightwater', 'Crow', 'Dawnmere', 'Embervale', 'Fairwind', 'Frost', 'Goldcrest', 'Grey', 'Hawke', 'Hollow', 'Ironwood', 'Marrow', 'Nightwell', 'Raven', 'Redmane', 'Reed', 'Stone', 'Storm', 'Thorn', 'Vale', 'Westbrook', 'Whitehall', 'Wildmere'];
const ELF_SURNAMES = ['Amastacia', 'Evenwood', 'Ilphelkiir', 'Liadon', 'Meliamne', 'Moonwhisper', 'Nailo', 'Siannodel', 'Silverfrond', 'Starbloom', 'Xiloscient', 'Dawnbranch', 'Mistweave', 'Nightbloom', 'Riverglass', 'Sunmere'];
const DWARF_SURNAMES = ['Battlehammer', 'Brawnanvil', 'Deepforge', 'Fireforge', 'Frostbeard', 'Goldfinder', 'Gorunn', 'Holderhek', 'Ironfist', 'Loderr', 'Lutgehr', 'Rumnaheim', 'Strakeln', 'Torunn', 'Ungart'];
const HALFLING_SURNAMES = ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Highhill', 'Hilltopple', 'Leagallow', 'Meadowfoot', 'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough'];
const GNOME_SURNAMES = ['Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Ningel', 'Raulnor', 'Scheppen', 'Timbers', 'Turen'];
const DRAGONBORN_CLANS = ['Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Drachedandion', 'Fenkenkabradon', 'Kepeshkmolik', 'Kerrhylon', 'Kimbatuul', 'Linxakasendalor', 'Myastan', 'Nemmonis', 'Norixius', 'Ophinshtalajiir', 'Prexijandilin', 'Shestendeliath', 'Turnuroth', 'Verthisathurgiesh', 'Yarjerit'];
const GOLIATH_BYNAMES = ['Bearstep', 'Cloudshoulder', 'Coldpeak', 'Dawnrunner', 'Flintheart', 'Highstone', 'Ironstride', 'Longclimb', 'Rimewalker', 'Skywatcher', 'Stonebreaker', 'Stormvoice'];
const CELESTIAL_SURNAMES = ['Dawnward', 'Goldveil', 'Lightmere', 'Morningstar', 'Radiant', 'Silverhalo', 'Skyborn', 'Sunward', 'Vesperlight'];
const GOBLIN_SURNAMES = ['Bentnail', 'Candlechew', 'Cranktoe', 'Greasewink', 'Grubgrin', 'Rattlebag', 'Rustspoon', 'Skitter', 'Snips', 'Wetmatch'];
const KOBOLD_CLANS = ['Ashscale', 'Copperclaw', 'Deepcoil', 'Embertooth', 'Redtail', 'Scalefoot', 'Sootsnout', 'Tunnelborn'];
const FIRBOLG_BYNAMES = ['Barkwarden', 'Cloudherd', 'Fernspeaker', 'Mosswalker', 'Riverfriend', 'Stonequiet', 'Willowhand', 'Woodlistener'];

export const ROOKIE_NAME_PACKS = {
  human: { label: 'Human', first: HUMAN_FIRST, surnames: COMMON_SURNAMES, fragments: { starts: ['Al', 'Ar', 'Bel', 'Cor', 'Dar', 'El', 'Gar', 'Hal', 'Jar', 'Kel', 'Mar', 'Nor', 'Ren', 'Sor', 'Val'], ends: ['a', 'an', 'en', 'eth', 'ian', 'ik', 'in', 'is', 'or', 'ra', 'ric', 'yn'] } },
  elf: { label: 'Elf', first: ELF_FIRST, surnames: ELF_SURNAMES, fragments: { starts: ['Ae', 'Cae', 'Ela', 'Fae', 'Ila', 'Lae', 'Mae', 'Nae', 'Sae', 'Syl', 'Thae', 'Vae'], ends: ['dir', 'el', 'en', 'ion', 'ira', 'ith', 'riel', 'rin', 'thar', 'wyn'] } },
  dwarf: { label: 'Dwarf', first: DWARF_FIRST, surnames: DWARF_SURNAMES, fragments: { starts: ['Ad', 'Bar', 'Brom', 'Dor', 'Far', 'Gar', 'Har', 'Kil', 'Mor', 'Rur', 'Thor', 'Tor'], ends: ['a', 'ak', 'din', 'drik', 'grim', 'in', 'ra', 'rik', 'run', 'unn'] } },
  halfling: { label: 'Halfling', first: HALFLING_FIRST, surnames: HALFLING_SURNAMES, fragments: { starts: ['Al', 'Bel', 'Cor', 'El', 'Fin', 'Gar', 'Lil', 'Mer', 'Per', 'Ros', 'Tan', 'Wil'], ends: ['a', 'by', 'da', 'do', 'in', 'la', 'lo', 'na', 'rin', 'sy'] } },
  gnome: { label: 'Gnome', first: GNOME_FIRST, surnames: GNOME_SURNAMES, fragments: { starts: ['Bim', 'Dim', 'Fizz', 'Fon', 'Gim', 'Jeb', 'Nim', 'Pock', 'Roon', 'Tink', 'Wiz'], ends: ['bin', 'ble', 'dle', 'kin', 'mott', 'nock', 'wick', 'zzle'] } },
  tiefling: { label: 'Tiefling', first: TIEFLING_FIRST, surnames: COMMON_SURNAMES, fragments: { starts: ['Ak', 'Dam', 'Ek', 'Kai', 'Ler', 'Mak', 'Mor', 'Nem', 'Ori', 'Pel', 'Ther'], ends: ['ai', 'ia', 'ios', 'ira', 'kos', 'mon', 'os', 'rai', 'thos'] } },
  orc: { label: 'Orc', first: ORC_FIRST, surnames: COMMON_SURNAMES, fragments: { starts: ['Bag', 'Fen', 'Gor', 'Hol', 'Keth', 'Kr', 'Mhur', 'Ront', 'Sh', 'Th', 'Vol'], ends: ['a', 'ak', 'en', 'g', 'ka', 'ok', 'ra', 'uk'] } },
  half_orc: { label: 'Half-Orc', first: ORC_FIRST, surnames: COMMON_SURNAMES, fragments: { starts: ['Bag', 'Fen', 'Gor', 'Hol', 'Keth', 'Kr', 'Mhur', 'Ront', 'Sh', 'Th', 'Vol'], ends: ['a', 'ak', 'en', 'g', 'ka', 'ok', 'ra', 'uk'] } },
  half_elf: { label: 'Half-Elf', first: { male: unique([...HUMAN_FIRST.male, ...ELF_FIRST.male]), female: unique([...HUMAN_FIRST.female, ...ELF_FIRST.female]), neutral: unique([...HUMAN_FIRST.neutral, ...ELF_FIRST.neutral]) }, surnames: unique([...COMMON_SURNAMES, ...ELF_SURNAMES]), fragments: { starts: ['Ae', 'Al', 'Cae', 'Cor', 'Ela', 'Jar', 'Lae', 'Mar', 'Sae', 'Val'], ends: ['an', 'el', 'en', 'ian', 'ion', 'ira', 'ric', 'riel', 'yn'] } },
  dragonborn: { label: 'Dragonborn', first: DRAGONBORN_FIRST, surnames: DRAGONBORN_CLANS, fragments: { starts: ['Arj', 'Bhar', 'Daar', 'Ghe', 'Hes', 'Kor', 'Med', 'Nad', 'Rho', 'Sha', 'Tar'], ends: ['aan', 'ash', 'esh', 'in', 'inn', 'orr', 'ra', 'rin', 'un'] } },
  goliath: { label: 'Goliath', first: GOLIATH_FIRST, surnames: GOLIATH_BYNAMES, fragments: { starts: ['Ar', 'Bra', 'Dav', 'Gor', 'Har', 'Kor', 'Mar', 'Or', 'Rok', 'Sur', 'Tar', 'Vor'], ends: ['a', 'ak', 'an', 'ar', 'en', 'or', 'ra', 'un'] } },
  aasimar: { label: 'Aasimar', first: AASIMAR_FIRST, surnames: CELESTIAL_SURNAMES, fragments: { starts: ['Ae', 'Cel', 'El', 'Ily', 'Lum', 'Ori', 'Raph', 'Ser', 'Sol', 'Val'], ends: ['ael', 'ara', 'el', 'iel', 'ira', 'on', 'or', 'yn'] } },
  goblin: { label: 'Goblin', first: GOBLIN_FIRST, surnames: GOBLIN_SURNAMES, fragments: { starts: ['Bik', 'Cr', 'Fizz', 'Gaz', 'Kib', 'Mik', 'Nib', 'Rik', 'Sk', 'Tik', 'Viz'], ends: ['a', 'ik', 'it', 'ka', 'ki', 'ok', 'za'] } },
  kobold: { label: 'Kobold', first: KOBOLD_FIRST, surnames: KOBOLD_CLANS, fragments: { starts: ['Dr', 'K', 'N', 'R', 'S', 'T', 'V', 'Z'], ends: ['ax', 'ek', 'ik', 'ix', 'ra', 'ri', 'va'] } },
  firbolg: { label: 'Firbolg', first: FIRBOLG_FIRST, surnames: FIRBOLG_BYNAMES, fragments: { starts: ['Bren', 'Cair', 'Dor', 'Eir', 'Far', 'Lor', 'Mor', 'Or', 'Tor'], ends: ['a', 'an', 'en', 'in', 'ra', 'ren'] } },
};

export const ROOKIE_RELATIONSHIPS = [
  { id: 'sibling', label: 'Sibling', backendType: 'family', shareFamilyName: true },
  { id: 'child', label: 'Child', backendType: 'family', shareFamilyName: true },
  { id: 'parent', label: 'Parent', backendType: 'family', shareFamilyName: true },
  { id: 'cousin', label: 'Cousin', backendType: 'family', shareFamilyName: true },
  { id: 'spouse', label: 'Spouse / Partner', backendType: 'romantic', shareFamilyName: false },
  { id: 'friend', label: 'Friend / Ally', backendType: 'ally', shareFamilyName: false },
  { id: 'rival', label: 'Rival', backendType: 'rival', shareFamilyName: false },
  { id: 'enemy', label: 'Enemy', backendType: 'enemy', shareFamilyName: false },
  { id: 'employee', label: 'Employee / Colleague', backendType: 'business', shareFamilyName: false },
  { id: 'companion', label: 'Travelling Companion', backendType: 'ally', shareFamilyName: false },
];

export const ROOKIE_ANCESTRY_OPTIONS = Object.entries(ROOKIE_NAME_PACKS).map(([id, pack]) => ({ id, label: pack.label }));

export function normaliseRookieAncestry(value = '') {
  const raw = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (!raw) return 'human';
  if (raw === 'half_orc' || raw === 'halforc') return 'half_orc';
  if (raw === 'half_elf' || raw === 'halfelf') return 'half_elf';
  if (raw.includes('orc')) return raw.includes('half') ? 'half_orc' : 'orc';
  if (raw.includes('elf') && raw.includes('half')) return 'half_elf';
  if (raw.includes('dragon')) return 'dragonborn';
  if (raw.includes('goliath')) return 'goliath';
  if (raw.includes('aasimar')) return 'aasimar';
  if (raw.includes('goblin')) return 'goblin';
  if (raw.includes('kobold')) return 'kobold';
  if (raw.includes('firbolg')) return 'firbolg';
  return ROOKIE_NAME_PACKS[raw] ? raw : 'human';
}

export function extractFamilyName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function resolveGender(gender = 'any') {
  const normalised = String(gender || 'any').toLowerCase();
  if (['male', 'female', 'neutral'].includes(normalised)) return normalised;
  return pick(['male', 'female', 'neutral']);
}

function smoothJoin(start = '', end = '') {
  if (!start) return end;
  if (!end) return start;
  const last = start.slice(-1).toLowerCase();
  const first = end.slice(0, 1).toLowerCase();
  const joined = last === first ? `${start}${end.slice(1)}` : `${start}${end}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}`;
}

function blendedFirstName(pack, gender) {
  const starts = pack.fragments?.starts || [];
  const ends = pack.fragments?.ends || [];
  if (!starts.length || !ends.length) return pick(pack.first?.[gender] || pack.first?.neutral || HUMAN_FIRST.neutral);
  return smoothJoin(pick(starts), pick(ends));
}

function relationshipRule(relationship = '') {
  return ROOKIE_RELATIONSHIPS.find(item => item.id === relationship) || null;
}

export function generateRookieName({
  ancestry = '',
  gender = 'any',
  familyName = '',
  relatedNpc = null,
  relationship = '',
  blendChance = 0.32,
} = {}) {
  const ancestryId = normaliseRookieAncestry(ancestry || relatedNpc?.race || relatedNpc?.ancestry || 'human');
  const pack = ROOKIE_NAME_PACKS[ancestryId] || ROOKIE_NAME_PACKS.human;
  const resolvedGender = resolveGender(gender);
  const names = pack.first?.[resolvedGender]?.length ? pack.first[resolvedGender] : pack.first?.neutral || HUMAN_FIRST.neutral;
  const useBlend = Math.random() < Math.max(0, Math.min(1, Number(blendChance) || 0));
  const firstName = useBlend ? blendedFirstName(pack, resolvedGender) : pick(names);
  const relRule = relationshipRule(relationship);
  const inheritedFamily = relRule?.shareFamilyName ? extractFamilyName(relatedNpc?.name) : '';
  const surname = String(familyName || inheritedFamily || pick(pack.surnames || COMMON_SURNAMES) || '').trim();
  const fullName = [firstName, surname].filter(Boolean).join(' ');

  return {
    firstName,
    surname,
    fullName,
    gender: resolvedGender,
    ancestry: ancestryId,
    race: pack.label,
    generationSource: 'rookie-engine',
    generationMethod: useBlend ? 'blended' : 'curated',
    inheritedFamilyName: Boolean(inheritedFamily),
  };
}

export function relationshipDescription(relationship = '', sourceNpc = null, targetName = 'This NPC') {
  const label = relationshipRule(relationship)?.label || 'Connection';
  const sourceName = sourceNpc?.name || 'the selected NPC';
  return `${targetName} is the ${label.toLowerCase()} of ${sourceName}.`;
}

export function buildRookieRelationshipPayload({ sourceNpc, targetNpc, relationship = 'friend' } = {}) {
  if (!sourceNpc?.id || !targetNpc?.id) return null;
  const rule = relationshipRule(relationship) || ROOKIE_RELATIONSHIPS.find(item => item.id === 'friend');
  return {
    source_id: sourceNpc.id,
    target_id: targetNpc.id,
    relationship_type: rule.backendType,
    description: relationshipDescription(relationship, sourceNpc, targetNpc.name || 'This NPC'),
  };
}

export function generateRelatedNpcName({ sourceNpc, relationship = 'sibling', gender = 'any', ancestry = '' } = {}) {
  if (!sourceNpc) return generateRookieName({ ancestry, gender });
  return generateRookieName({
    ancestry: ancestry || sourceNpc.race || sourceNpc.ancestry,
    gender,
    relatedNpc: sourceNpc,
    relationship,
  });
}
