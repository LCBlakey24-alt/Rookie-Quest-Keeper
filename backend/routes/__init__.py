"""Route module - import all routers for inclusion in the main app."""
from routes.auth import router as auth_router
from routes.admin_feedback import router as admin_feedback_router
from routes.admin import router as admin_router
from routes.site_updates import router as site_updates_router
from routes.admin_audit import router as admin_audit_router
from routes.admin_metrics import router as admin_metrics_router
from routes.layout_settings import router as layout_settings_router
from routes.campaign_invites import router as campaign_invites_router
from routes.campaign_display import router as campaign_display_router
from routes.campaign_setup import router as campaign_setup_router
from routes.campaigns import router as campaigns_router
from routes.campaign_content import router as campaign_content_router
from routes.world import router as world_router
from routes.notes import router as notes_router
from routes.npcs import router as npcs_router
from routes.live_state import router as live_state_router
from routes.live_party import router as live_party_router
from routes.combat import router as combat_router
from routes.combat_initiative_submissions import router as combat_initiative_submissions_router
from routes.players import router as players_router
from routes.maps import router as maps_router
from routes.tables import router as tables_router
from routes.ai import router as ai_router
from routes.rook_chat import router as rook_chat_router, remove_legacy_rook_chat_route
from routes.rook_form_fill import router as rook_form_fill_router, remove_legacy_rook_form_fill_route
from routes.rook_studio import router as rook_studio_router
from routes.inventory import router as inventory_router
from routes.offline_inventory_sync import router as offline_inventory_sync_router
from routes.user_content import router as user_content_router
from routes.player_rules import router as player_rules_router
from routes.character_import import router as character_import_router
from routes.character_recovery import router as character_recovery_router
from routes.character_spell_migration import router as character_spell_migration_router
from routes.character_progression_preflight import router as character_progression_preflight_router
from routes.character_progression_state import router as character_progression_state_router
from routes.character_creation_state import router as character_creation_state_router
from routes.character_edit_state import router as character_edit_state_router
from routes.character_patch import router as character_patch_router
from routes.characters import router as characters_router
from routes.srd import router as srd_router
from routes.progression import router as progression_router
from routes.rule_systems import router as rule_systems_router
from routes.events import router as events_router
from routes.character_templates import router as character_templates_router
from routes.homebrew import router as homebrew_router
from routes.player_handout_summary import router as player_handout_summary_router
from routes.handouts import router as handouts_router
from routes.story_arcs import router as story_arcs_router
from routes.quests import router as quests_router
from routes.roll_events import router as roll_events_router

# Focused shared-brain routes own their specific Rook endpoints. Every other
# legacy AI route remains intact on ai_router.
remove_legacy_rook_chat_route(ai_router)
remove_legacy_rook_form_fill_route(ai_router)

all_routers = [
    auth_router,
    # Register focused admin feedback reads before the legacy admin router so
    # separated feedback/testing list and export endpoints take precedence.
    admin_feedback_router,
    admin_router,
    site_updates_router,
    admin_audit_router,
    admin_metrics_router,
    layout_settings_router,
    campaign_invites_router,
    campaign_display_router,
    # Register the setup router before the legacy campaigns router so the
    # modern campaign creation/list/detail routes keep their richer setup data.
    campaign_setup_router,
    campaigns_router,
    campaign_content_router,
    world_router,
    notes_router,
    npcs_router,
    live_state_router,
    live_party_router,
    combat_router,
    combat_initiative_submissions_router,
    players_router,
    maps_router,
    tables_router,
    # Shared-brain Rook endpoints are registered before the remaining legacy
    # AI routes so each focused path has one authoritative implementation.
    rook_chat_router,
    rook_form_fill_router,
    ai_router,
    rook_studio_router,  # Draft-first create/review/save workflow for GM content.
    inventory_router,
    # Narrow retry-safe create endpoint used only by explicitly queued offline combat loot.
    offline_inventory_sync_router,
    user_content_router,
    # Player rules feeds sit beside user content so builders can consume uploaded options.
    player_rules_router,
    # Player-side review-first extraction for uploaded PDF/image character sheets.
    character_import_router,
    # Server-authoritative short/long rest recovery must win before legacy character routes.
    character_recovery_router,
    # Non-destructive repair path for early 2024 saves with legacy known-spell storage.
    character_spell_migration_router,
    # Class-aware progression preflight must shadow the primary-class-only legacy route.
    character_progression_preflight_router,
    # Preserve damage, spent Hit Dice and spent spell slots when a character levels.
    character_progression_state_router,
    # Canonicalize builder/import payloads into immediately playable sheet state.
    character_creation_state_router,
    # Prevent the creation-shaped full builder from refilling/overwriting a live character on edit.
    character_edit_state_router,
    # Keep lenient PATCH before the legacy strict characters router so
    # PATCH /characters/{id} accepts current builder/sheet fields.
    character_patch_router,
    characters_router,
    srd_router,
    progression_router,
    rule_systems_router,
    events_router,
    character_templates_router,
    # Paid image-generation routes intentionally not registered for now.
    homebrew_router,
    # Lightweight summary sits beside the full handout routes so Player Home
    # can render unread counts without downloading handout bodies.
    player_handout_summary_router,
    handouts_router,
    story_arcs_router,
    quests_router,
    roll_events_router,
]
