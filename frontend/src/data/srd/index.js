// SRD scaffold — safe, non-copyrighted support for DnD 5e SRD data
// This file provides a place to load the System Reference Document (SRD)
// data (open content) or to connect to a backend that can serve licensed
// sourcebook content when you have the proper rights.

const SRD = {
  meta: {
    note: 'This repository includes only SRD scaffolding. Full proprietary sourcebooks are NOT included.',
    versions: ['2014-srd', '2024-srd-compatible'],
  },

  // Small safe sample data to demonstrate usage. Replace or extend by
  // importing SRD JSON files or fetching from your backend that holds the
  // licensed content.
  sample: {
    skills: [
      { id: 'acrobatics', name: 'Acrobatics', ability: 'dexterity' },
      { id: 'animal-handling', name: 'Animal Handling', ability: 'wisdom' },
      { id: 'arcana', name: 'Arcana', ability: 'intelligence' }
    ],
    races: [
      { id: 'human', name: 'Human' },
      { id: 'elf', name: 'Elf' },
      { id: 'dwarf', name: 'Dwarf' }
    ],
    classes: [
      { id: 'fighter', name: 'Fighter' },
      { id: 'wizard', name: 'Wizard' },
      { id: 'cleric', name: 'Cleric' }
    ]
  }
};

export async function fetchSrdFromBackend(apiBase) {
  if (!apiBase) {
    return SRD.sample;
  }
  try {
    const res = await fetch(`${apiBase.replace(/\/+$/,'')}/srd`);
    if (!res.ok) throw new Error('Failed to fetch SRD');
    return await res.json();
  } catch (err) {
    console.warn('SRD fetch failed, falling back to sample:', err.message);
    return SRD.sample;
  }
}

export default SRD;
