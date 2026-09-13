const text = (value = '') => String(value ?? '');

export function buildCharacterProfileDraft(character = {}) {
  return {
    name: text(character.name),
    alignment: text(character.alignment),
    personalityTrait: text(character.personality_trait || character.personality_traits),
    ideal: text(character.ideal || character.ideals),
    bond: text(character.bond || character.bonds),
    flaw: text(character.flaw || character.flaws),
    backstory: text(character.backstory),
    appearance: text(character.appearance),
    portraitUrl: text(character.portrait_url),
    notes: text(character.notes),
  };
}

export function buildCharacterProfilePatch(draft = {}) {
  const name = text(draft.name).trim();
  const personalityTrait = text(draft.personalityTrait);
  const ideal = text(draft.ideal);
  const bond = text(draft.bond);
  const flaw = text(draft.flaw);

  return {
    name,
    alignment: text(draft.alignment).trim(),
    portrait_url: text(draft.portraitUrl).trim(),
    personality_trait: personalityTrait,
    personality_traits: personalityTrait,
    ideal,
    ideals: ideal,
    bond,
    bonds: bond,
    flaw,
    flaws: flaw,
    backstory: text(draft.backstory),
    appearance: text(draft.appearance),
    notes: text(draft.notes),
  };
}

export function characterClassSummary(character = {}) {
  const classLevels = character.class_levels || character.multiclass_levels || {};
  const parts = Object.entries(classLevels)
    .filter(([, level]) => Number(level) > 0)
    .map(([className, level]) => `${className} ${Number(level)}`);

  if (parts.length) return parts.join(' / ');

  const classes = Array.isArray(character.classes) ? character.classes : [];
  const classParts = classes
    .filter((entry) => entry && Number(entry.level) > 0)
    .map((entry) => `${entry.name || entry.class_name || entry.character_class || 'Class'} ${Number(entry.level)}`);

  if (classParts.length) return classParts.join(' / ');
  return `${character.character_class || 'Adventurer'} ${Number(character.level || 1)}`;
}

export function protectedStateSummary(character = {}) {
  return {
    level: Number(character.level || 1),
    classSummary: characterClassSummary(character),
    currentHp: Number(character.current_hit_points ?? character.max_hit_points ?? 0),
    maxHp: Number(character.max_hit_points || 0),
    armorClass: Number(character.armor_class || 10),
    inventoryCount: Array.isArray(character.inventory) ? character.inventory.length : 0,
    resourceCount: Object.keys(character.resources || {}).length,
    spellSlotLevels: Object.keys(character.spell_slots || {}).length,
  };
}
