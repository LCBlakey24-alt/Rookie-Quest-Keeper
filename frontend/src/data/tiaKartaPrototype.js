export const TIA_KARTA_PROTOTYPE = {
  campaign: {
    id: 'prototype-tia-karta',
    name: 'Tia-Karta',
    tagline: 'A fractured fantasy world of politics, divine secrets, rebuilding cities, and ancient primordial danger.',
    system: 'D&D 5e 2014 / homebrew friendly',
  },
  cosmology: [
    { name: 'Prima', role: 'Original primordial', notes: 'Believes life should be guided toward the right path.' },
    { name: 'Aevon', role: 'Original primordial', notes: 'Believes free will is sacred and non-interference is beautiful.' },
    { name: 'Koltoro', role: 'Third primordial / hidden threat', notes: 'Sowed discord between Prima and Aevon. Banished and later sealed by the neutral spire.' },
    { name: 'The Spark of Creation', role: 'World origin', notes: 'The divine spark that formed the world, life, gods, and eventually magic itself.' },
    { name: 'The Neutral Spire', role: 'Ancient lock', notes: 'Created by twelve champions to hold Koltoro in stasis.' },
  ],
  gods: [
    { name: 'Anya, the Weaver of Lies', domains: 'Trickery, Illusion, Deception, Secrets, Shadows', symbol: 'Silver mask with one eye' },
    { name: 'Asus, The Everlight', domains: 'Light, Life, Healing, Growth, Nature, Renewal', symbol: 'Radiant sunburst or stylised tree' },
    { name: 'Naskin, The Stoneheart', domains: 'Earth, Strength, Endurance, Stability, Craft, Protection', symbol: 'Mountain peak or rune stone' },
    { name: 'Kutos, The Skyfire', domains: 'Sky, Storms, Thunder, Lightning, Freedom, Travel, Change', symbol: 'Lightning bolt with wings' },
    { name: 'Yena, The Lifeweaver', domains: 'Life, Death, Rebirth, Cycles, Balance, Soul', symbol: 'Ouroboros or butterfly' },
    { name: 'Barkera, The Deepwood', domains: 'Forests, Nature, Secrets, Mystery, Hidden Knowledge, Wild Magic', symbol: 'Tree with hidden roots' },
    { name: 'Weaver, The Tidebringer', domains: 'Sea, Oceans, Water, Emotions, Change, Travel, Mysteries', symbol: 'Stylised wave' },
    { name: 'Inorr, The Forgefire', domains: 'Fire, Creation, Craftsmanship, Industry, Innovation, Transformation', symbol: 'Hammer, anvil, or flame' },
    { name: 'Otia, The Starfall', domains: 'Stars, Fate, Destiny, Prophecy, Knowledge, Cosmos', symbol: 'Constellation or falling star' },
    { name: 'Saerin, The Shadow Weaver', domains: 'Shadows, Secrets, Mystery, Illusion, Stealth, Unseen', symbol: 'Spiderweb or shrouded figure' },
    { name: 'Opian, The Jester', domains: 'Trickery, Tomfoolery, Chaos, Mischief', symbol: 'Large smiling mask' },
    { name: 'Morwen, The Gentle Passing', domains: 'Death, Rest, Remembrance', symbol: 'Silver hand holding a black feather' },
    { name: 'Akara', domains: 'Forgotten divine power', symbol: 'Unknown / sealed tomb marker' },
  ],
  continents: [
    { name: 'Tiamina', region: 'West', notes: 'Mostly human and mixed-race lands. Welcomes many peoples. Home to Balderin, Neremore, Fortia, Gragone, Edgeacre, Stone Port, and Drymere.' },
    { name: 'Balgura', region: 'North', notes: 'Northern continent. Details still open for expansion.' },
    { name: 'Fetura', region: 'East', notes: 'Eastern continent. Details still open for expansion.' },
    { name: 'The Cursed Lands', region: 'South', notes: 'Dangerous southern region tied to wilds, monsters, and mystery.' },
    { name: 'Pixie Islands', region: 'Island chain', notes: 'Houses Akara’s tomb and the sleeping princess protected by the pendant.' },
    { name: 'Okuku Island', region: 'Island', notes: 'Bottom-left island on the world map.' },
    { name: 'Isle of the Damned', region: 'Island', notes: 'Bottom-right island, likely dark and dangerous.' },
  ],
  locations: [
    { name: 'Balderin', type: 'Ruined former capital', notes: 'Destroyed by a magical explosion beneath the palace. Royal family believed dead. Secretly tied to a vampire nest and the sleeping princess.' },
    { name: 'The City of Neremore', type: 'Rising city power', notes: 'Technically advanced city rising after Balderin’s fall. Seeking capital status and influence.' },
    { name: 'Fortia', type: 'Craft city', notes: 'Avoids politics. Known for blacksmithing, trade, and fair prices.' },
    { name: 'Gragone', type: 'Fishing town', notes: 'Fishing town in Tiamina.' },
    { name: 'Edgeacre', type: 'Woodland town', notes: 'Main source of wood.' },
    { name: 'Stone Port', type: 'Mining town', notes: 'Main source of stone.' },
    { name: 'Drymere', type: 'Low-income town', notes: 'Basic settlement with poorer conditions.' },
    { name: 'Court of Crowns', type: 'Floating political hall', notes: 'Stone castle hovering above the central lake. Leaders meet here yearly.' },
    { name: 'Skyward', type: 'Player-connected city', notes: 'Linked to Javen’s backstory and a secret hideout attacked by devils and demons.' },
  ],
  factions: [
    { name: 'Neremore Leadership', stance: 'Ambitious', notes: 'Wants Neremore named capital and may exploit Balderin’s weakness.' },
    { name: 'Balderin Survivors', stance: 'Desperate / loyal', notes: 'Need rebuilding, morale, food, safety, and proof their city still matters.' },
    { name: 'Court of Crowns', stance: 'Political', notes: 'Annual votes decide capital status, trade, war, alliances, and crisis response.' },
    { name: 'The Twelve Champions', stance: 'Ancient legacy', notes: 'Their neutral spire keeps Koltoro sealed.' },
    { name: 'Vampiric Remnants', stance: 'Hidden danger', notes: 'Connected to the ancient vampire plot beneath Balderin.' },
  ],
  campaignHooks: [
    'Balderin appears to offer unlimited vault gold, but rebuilding can burn through it fast.',
    'Lucian Grey secretly funnels gold out of Balderin’s vault for nefarious reasons.',
    'Neremore’s mayor may attempt to steal from Balderin’s vault.',
    'Balderin must maintain enough gold to regain or retain capital status.',
    'The party can create city income through horse racing, boxing, wrestling, and public events.',
    'The sleeping princess on Pixie Isle may be the last true Balderin heir.',
    'The illusion mountain arc reveals cracks in reality and hints at Koltoro’s return.',
    'Opian offers fate-bending aid with strange consequences through the Grinning Mask contract.',
  ],
  rebuildOptions: [
    { tier: 'Cheap', effect: 'Fast to start but risks poor quality, low morale, or future repairs.' },
    { tier: 'Standard', effect: 'Balanced cost, speed, and stability.' },
    { tier: 'Premium', effect: 'Uses specialists, mages, and better materials for faster or longer-term results.' },
    { tier: 'Local Workforce', effect: 'Improves morale and loyalty but may be slower or require training.' },
    { tier: 'Outside Specialists', effect: 'Faster and higher quality but sends money out and may create political/security risks.' },
  ],
};

export const TIA_KARTA_GM_STORAGE_KEY = 'rq.prototype.tia-karta.gm-notes';

export function loadTiaKartaGmNotes() {
  try {
    return JSON.parse(localStorage.getItem(TIA_KARTA_GM_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveTiaKartaGmNotes(notes) {
  localStorage.setItem(TIA_KARTA_GM_STORAGE_KEY, JSON.stringify(notes || {}));
  return notes || {};
}
