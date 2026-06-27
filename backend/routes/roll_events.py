"""Campaign roll event routes for player-focused session stats."""
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from config import db
from utils.auth import get_current_user, verify_campaign_membership, verify_campaign_ownership

router = APIRouter()


class RollEventPayload(BaseModel):
    actor: str = "Player"
    actor_type: str = "player"
    character_id: str = ""
    character_name: str = ""
    label: str = "Roll"
    notation: str = ""
    total: int = 0
    modifier: int = 0
    rolls: List[Dict[str, Any]] = Field(default_factory=list)
    visibleRolls: List[Dict[str, Any]] = Field(default_factory=list)
    isCrit: bool = False
    isFumble: bool = False
    explosionCount: int = 0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def d20s_for(event: Dict[str, Any]) -> List[Dict[str, Any]]:
    rolls = event.get("visibleRolls") or event.get("rolls") or []
    return [roll for roll in rolls if int(roll.get("sides") or 0) == 20 and not roll.get("dropped")]


def summarise(events: List[Dict[str, Any]], player_focus: bool = True) -> Dict[str, Any]:
    player_events = [event for event in events if event.get("actor_type") == "player"]
    gm_events = [event for event in events if event.get("actor_type") != "player"]
    focus_events = player_events if player_focus and player_events else events
    by_actor: Dict[str, Dict[str, Any]] = {}
    total_dice = 0
    nat20s = 0
    nat1s = 0
    explosions = 0
    highest_total = None
    biggest_d20 = None

    for event in focus_events:
        actor = event.get("character_name") or event.get("actor") or "Player"
        if actor not in by_actor:
            by_actor[actor] = {
                "name": actor,
                "rolls": 0,
                "dice": 0,
                "nat20s": 0,
                "nat1s": 0,
                "explosions": 0,
                "highestTotal": 0,
            }
        actor_stats = by_actor[actor]
        visible = event.get("visibleRolls") or event.get("rolls") or []
        actor_stats["rolls"] += 1
        actor_stats["dice"] += len(visible)
        actor_stats["explosions"] += int(event.get("explosionCount") or 0)
        actor_stats["highestTotal"] = max(actor_stats["highestTotal"], int(event.get("total") or 0))
        total_dice += len(visible)
        explosions += int(event.get("explosionCount") or 0)

        if highest_total is None or int(event.get("total") or 0) > int(highest_total.get("total") or 0):
            highest_total = event

        for roll in d20s_for(event):
            result = int(roll.get("result") or 0)
            if result == 20:
                nat20s += 1
                actor_stats["nat20s"] += 1
            if result == 1:
                nat1s += 1
                actor_stats["nat1s"] += 1
            if biggest_d20 is None or result > int(biggest_d20.get("result") or 0):
                biggest_d20 = {**roll, "actor": actor, "label": event.get("label") or "Roll"}

    actors = sorted(by_actor.values(), key=lambda item: (-item["rolls"], -item["nat20s"], item["name"]))
    most_crits = max(actors, key=lambda item: item["nat20s"], default=None)
    most_fumbles = max(actors, key=lambda item: item["nat1s"], default=None)
    busiest = actors[0] if actors else None
    awards = []
    if most_crits and most_crits["nat20s"]:
        awards.append({"title": "Crit Goblin", "name": most_crits["name"], "value": f"{most_crits['nat20s']} Nat 20{'s' if most_crits['nat20s'] != 1 else ''}"})
    if most_fumbles and most_fumbles["nat1s"]:
        awards.append({"title": "Dice Betrayal", "name": most_fumbles["name"], "value": f"{most_fumbles['nat1s']} Nat 1{'s' if most_fumbles['nat1s'] != 1 else ''}"})
    if busiest and busiest["rolls"]:
        awards.append({"title": "Button Masher", "name": busiest["name"], "value": f"{busiest['rolls']} player roll{'s' if busiest['rolls'] != 1 else ''}"})
    if highest_total:
        awards.append({"title": "Big Number Energy", "name": highest_total.get("character_name") or highest_total.get("actor") or "Player", "value": f"{highest_total.get('total', 0)} on {highest_total.get('label') or highest_total.get('notation') or 'a roll'}"})

    return {
        "totalRolls": len(focus_events),
        "playerRolls": len(player_events),
        "gmRolls": len(gm_events),
        "totalDice": total_dice,
        "nat20s": nat20s,
        "nat1s": nat1s,
        "explosions": explosions,
        "highestTotal": highest_total,
        "biggestD20": biggest_d20,
        "actors": actors,
        "awards": awards,
    }


async def build_summary(campaign_id: str) -> Dict[str, Any]:
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0, "name": 1}) or {}
    active = await db.roll_events.find({"campaign_id": campaign_id, "archived": {"$ne": True}}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    all_time = await db.roll_events.find({"campaign_id": campaign_id}, {"_id": 0}).sort("created_at", 1).to_list(10000)
    return {
        "campaignName": campaign.get("name") or "Campaign",
        "generated_at": now_iso(),
        "session": summarise(active, player_focus=True),
        "allTime": summarise(all_time, player_focus=True),
    }


@router.post("/campaigns/{campaign_id}/roll-events")
async def record_roll_event(campaign_id: str, payload: RollEventPayload, username: str = Depends(get_current_user)):
    """Record a virtual dice roll from a campaign member."""
    await verify_campaign_membership(campaign_id, username)
    event = payload.model_dump()
    event.update({
        "id": f"roll-{uuid4().hex}",
        "campaign_id": campaign_id,
        "user_id": username,
        "actor": event.get("actor") or event.get("character_name") or username,
        "actor_type": event.get("actor_type") or "player",
        "archived": False,
        "created_at": now_iso(),
    })
    await db.roll_events.insert_one(event)
    event.pop("_id", None)
    return event


@router.get("/campaigns/{campaign_id}/roll-events/summary")
async def get_roll_summary(campaign_id: str, username: str = Depends(get_current_user)):
    """Preview current session and all-time roll stats."""
    await verify_campaign_ownership(campaign_id, username)
    return await build_summary(campaign_id)


@router.post("/campaigns/{campaign_id}/roll-events/end-session")
async def end_session_roll_summary(campaign_id: str, username: str = Depends(get_current_user)):
    """Build the end-session roll summary and archive the current session rolls."""
    await verify_campaign_ownership(campaign_id, username)
    summary = await build_summary(campaign_id)
    await db.roll_events.update_many(
        {"campaign_id": campaign_id, "archived": {"$ne": True}},
        {"$set": {"archived": True, "archived_at": now_iso()}},
    )
    await db.roll_session_summaries.insert_one({**summary, "campaign_id": campaign_id, "id": f"roll-summary-{uuid4().hex}"})
    return summary
