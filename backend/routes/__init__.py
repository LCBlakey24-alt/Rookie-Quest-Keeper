"""Route module - import all routers for inclusion in the main app."""
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.site_updates import router as site_updates_router
from routes.campaign_invites import router as campaign_invites_router
from routes.campaign_display import router as campaign_display_router
from routes.campaign_setup import router as campaign_setup_router
from routes.campaigns import router as campaigns_router
from routes.campaign_content import router as campaign_content_router
from routes.world import router as world_router
from routes.notes import router as notes_router
from routes.npcs import router as npcs_router
from routes.combat import router as combat_router
from routes.players import router as players_router
from routes.maps import router as maps_router
from routes.ai import router as ai_router
from routes.inventory import router as inventory_router
from routes.user_content import router as user_content_router
from routes.player_rules import router as player_rules_router
from routes.character_patch import router as character_patch_router
from routes.characters import router as characters_router
from routes.srd import router as srd_router
from routes.progression import router as progression_router
from routes.rule_systems import router as rule_systems_router
from routes.events import router as events_router
from routes.character_templates import router as character_templates_router
from routes.homebrew import router as homebrew_router
from routes.handouts import router as handouts_router
from routes.story_arcs import router as story_arcs_router
from routes.roll_events import router as roll_events_router

all_routers = [
    auth_router,
    admin_router,
    site_updates_router,
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
    combat_router,
    players_router,
    maps_router,
    ai_router,  # Text-based Rook AI helpers stay enabled.
    inventory_router,
    user_content_router,
    # Player rules feeds sit beside user content so builders can consume uploaded options.
    player_rules_router,
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
    handouts_router,
    story_arcs_router,
    roll_events_router,
]
