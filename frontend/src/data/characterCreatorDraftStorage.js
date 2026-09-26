export const CHARACTER_CREATOR_DRAFT_KEY = 'rqk.full_character_creator_v2.safe';
export const CHARACTER_CREATOR_LEVEL_KEY = 'rqk.full_character_creator_v2.starting_level';
export const CHARACTER_CREATOR_SUBCLASS_KEY = 'rqk.full_character_creator_v2.starting_subclass';
export const CHARACTER_CREATOR_CHOICES_KEY = 'rqk.full_character_creator_v2.level_choices';
export const CHARACTER_CREATOR_DETAIL_CHOICES_KEY = 'rqk.full_character_creator_v2.detail_choices';

export const CHARACTER_CREATOR_SESSION_KEYS = [
  CHARACTER_CREATOR_LEVEL_KEY,
  CHARACTER_CREATOR_SUBCLASS_KEY,
  CHARACTER_CREATOR_CHOICES_KEY,
  CHARACTER_CREATOR_DETAIL_CHOICES_KEY,
];

export function clearCharacterCreatorDraftStorage(runtime = globalThis) {
  try {
    runtime?.localStorage?.removeItem(CHARACTER_CREATOR_DRAFT_KEY);
  } catch {}

  CHARACTER_CREATOR_SESSION_KEYS.forEach((key) => {
    try {
      runtime?.sessionStorage?.removeItem(key);
    } catch {}
  });
}
