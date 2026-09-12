"""Register safe class-choice fields with the lenient character persistence layer.

Character creation already collects several class-specific choices that are not
part of the older strict PlayerCharacter models. Importing this module extends
only the existing explicit allow-lists; unknown browser fields are still ignored.
"""
from routes.character_patch import (
    ALLOWED_CHARACTER_PATCH_FIELDS,
    DICT_FIELDS,
    LIST_FIELDS,
    NUMERIC_FIELDS,
)

CLASS_CHOICE_LIST_FIELDS = {
    'fighting_styles',
    'expertise_choices',
    'expertise',
    'expertise_skills',
    'metamagic_options',
    'metamagic',
    'combat_maneuvers',
    'battle_master_maneuvers',
    'maneuvers',
    'mystic_arcanum',
    'eldritch_invocations',
    'invocations',
}

CLASS_CHOICE_DICT_FIELDS = {
    'superiority_dice',
}

CLASS_CHOICE_NUMERIC_FIELDS = {
    'sorcery_points',
    'sorcery_points_remaining',
}

CLASS_CHOICE_TEXT_FIELDS = {
    'pact_boon',
    'pactBoon',
}

ALLOWED_CHARACTER_PATCH_FIELDS.update(
    CLASS_CHOICE_LIST_FIELDS
    | CLASS_CHOICE_DICT_FIELDS
    | CLASS_CHOICE_NUMERIC_FIELDS
    | CLASS_CHOICE_TEXT_FIELDS
)
LIST_FIELDS.update(CLASS_CHOICE_LIST_FIELDS)
DICT_FIELDS.update(CLASS_CHOICE_DICT_FIELDS)
NUMERIC_FIELDS.update(CLASS_CHOICE_NUMERIC_FIELDS)
