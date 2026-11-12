"""Which collections a campaign clean-up may delete from, and which it must not.

Shared by campaign deletion (routes/campaigns.py) and account deletion
(routes/auth.py), so the two can never disagree about what belongs to a
campaign and what belongs to its players.
"""

# Campaign deletion deliberately sweeps records by campaign_id so newly-added
# campaign-owned collections are cleaned up without another hand-maintained list.
# These collections are excluded because the records belong to a user/site and
# may only reference a campaign.
CAMPAIGN_SWEEP_EXCLUSIONS = {
    'campaigns',
    'users',
    'password_resets',
    'site_settings',
    'layout_settings',
    'player_characters',
    'player_notes',
    'player_journal',
    'custom_rulesets',
    'reviews',
    'improvement_feedback',
    'ai_usage',
    'user_rulesets',
    'user_playtest_packs',
    'user_playtest_content',
    'user_races',
    'user_classes',
    'user_subclasses',
    'user_backgrounds',
    'user_feats',
    'user_spells',
    'user_magic_items',
    'user_monsters',
    'user_npcs',
    'user_custom_rules',
    'homebrew_items',
    'character_templates',
}

USER_HOMEBREW_CAMPAIGN_REFERENCES = (
    'user_rulesets',
    'user_races',
    'user_classes',
    'user_subclasses',
    'user_backgrounds',
    'user_feats',
    'user_spells',
    'user_magic_items',
    'user_monsters',
    'user_npcs',
    'user_custom_rules',
    'homebrew_items',
)

USER_PLAYTEST_CAMPAIGN_REFERENCES = (
    'user_playtest_packs',
    'user_playtest_content',
)
