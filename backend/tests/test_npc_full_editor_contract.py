"""NPC updates must round-trip the full campaign-owned stat block.

The GM editor is not allowed to silently discard homebrew recharge, actions,
bonus actions, lore, challenge rating or other fields from existing NPCs.
"""
from models import NPC, NPCAttack, NPCUpdate


def test_update_schema_accepts_full_statblock_and_lore_fields():
    patch = NPCUpdate(
        cr="4", armor="Chain mail and shield", size="Medium",
        backstory="Served the Shield", appearance="Grey skin and black horns",
        stats={"strength": 20, "dexterity": 12, "constitution": 18,
               "intelligence": 10, "wisdom": 14, "charisma": 14},
        skills=["Athletics +9"], saving_throws=["STR +9"],
        actions=[{"name": "Multiattack", "description": "Two attacks"}],
        bonus_actions=[{"name": "Shield-Line Order", "description": "Move 10 ft"}],
        reactions=[{"name": "Intercept", "description": "Reduce damage"}],
        legendary_actions=[{"name": "Fated Strike", "uses": "once"}],
        special_abilities=[{"name": "Corova's Stand", "uses": "1/long rest"}],
        damage_resistances=["fire"], mechanics_status="DM DRAFT",
        canon_status="CANON", statblock_source="Campaign compendium",
        statblock_notes="Stat block awaiting table confirmation"
    )
    payload = patch.model_dump(exclude_none=True)
    assert payload["cr"] == "4"
    assert payload["armor"] == "Chain mail and shield"
    assert payload["bonus_actions"][0]["name"] == "Shield-Line Order"
    assert payload["special_abilities"][0]["uses"] == "1/long rest"
    assert payload["stats"]["strength"] == 20
    assert payload["statblock_notes"].startswith("Stat block")


def test_attack_recharge_and_custom_fields_roundtrip():
    source = {"name": "Infernal Breaker", "bonus": "+9", "damage": "4d6+5",
              "recharge": "5-6", "uses": "until the next turn"}
    assert NPCAttack.model_validate(source).model_dump() == {**source, "notes": ""}

    npc = NPC(
        campaign_id="wednesday", name="Jordan Crow", hp=168, ac=19,
        attacks=[source],
    )
    payload = NPCUpdate(attacks=npc.model_dump()["attacks"]).model_dump(exclude_none=True)
    assert payload["attacks"][0]["recharge"] == "5-6"
    assert payload["attacks"][0]["uses"] == "until the next turn"
