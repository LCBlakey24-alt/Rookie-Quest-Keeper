"""Explicit public fields: GM notes and private character data never leave here."""

CAMPAIGN_FIELDS = (
    'id', 'name', 'description', 'system', 'rules_edition', 'world_name',
    'world_genre', 'allow_exploding_dice', 'allow_epic_levels',
    'max_character_level', 'available_classes', 'created_at',
)
ENVIRONMENT_FIELDS = ('weather', 'time_of_day', 'season', 'terrain', 'temperature', 'background_image')
PARTY_FIELDS = ('id', 'name', 'character_name', 'character_class', 'class_name', 'level')


def player_campaign_summary(campaign):
    result = {key: campaign[key] for key in CAMPAIGN_FIELDS if key in campaign}
    environment = campaign.get('environment') or {}
    result['environment'] = {key: environment[key] for key in ENVIRONMENT_FIELDS if key in environment}
    return result


def player_party_member(character):
    return {key: character[key] for key in PARTY_FIELDS if key in character}
