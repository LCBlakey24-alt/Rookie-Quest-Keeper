"""
Events & Location Economy routes.
Manages city/area events (horse racing, boxing, festivals, etc.),
tracks financial impact, population changes, and day-by-day economy.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from config import db, logger
from utils.auth import get_current_user

router = APIRouter(tags=["events"])


# ─── Models ───────────────────────────────────────────────────────────

class EventConfig(BaseModel):
    entry_fee: float = 10
    venue_cost: float = 50
    prize_pool: float = 100
    marketing_cost: float = 20
    staff_cost: float = 15
    security_cost: float = 10
    expected_participants: int = 20
    quality_level: str = "medium"  # low, medium, high, legendary


class EventCreate(BaseModel):
    location: str
    event_type: str = "major"  # major or minor
    name: str
    category: str = "custom"  # horse_racing, boxing, tournament, festival, market, custom, arm_wrestling, drinking_contest, card_game, knife_throwing, riddle_challenge
    description: str = ""
    skill_checks: List[str] = []
    config: EventConfig = EventConfig()
    scheduled_day: Optional[int] = None


class EventUpdate(BaseModel):
    config: Optional[EventConfig] = None
    status: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


class LocationCreate(BaseModel):
    name: str
    region: str = ""
    population: int = 500
    gold_treasury: float = 5000
    reputation: int = 50  # 0-100


class LocationUpdate(BaseModel):
    population: Optional[int] = None
    gold_treasury: Optional[float] = None
    reputation: Optional[int] = None


# ─── Financial Engine ─────────────────────────────────────────────────

def calculate_event_economics(config: dict, location_data: dict) -> dict:
    """
    Realistic financial model: changing one cost ripples through everything.
    Quality affects attendance, attendance affects revenue, costs affect profit,
    profit affects city treasury and reputation, reputation affects population.
    """
    entry_fee = config.get("entry_fee", 10)
    venue_cost = config.get("venue_cost", 50)
    prize_pool = config.get("prize_pool", 100)
    marketing_cost = config.get("marketing_cost", 20)
    staff_cost = config.get("staff_cost", 15)
    security_cost = config.get("security_cost", 10)
    expected_participants = config.get("expected_participants", 20)
    quality_level = config.get("quality_level", "medium")

    population = location_data.get("population", 500)
    reputation = location_data.get("reputation", 50)

    # Quality multiplier affects attendance and satisfaction
    quality_mult = {"low": 0.5, "medium": 1.0, "high": 1.5, "legendary": 2.5}.get(quality_level, 1.0)

    # Marketing effectiveness: higher spend = more attendees (diminishing returns)
    marketing_mult = min(2.0, 0.5 + (marketing_cost / 50))

    # Security affects safety perception
    security_mult = min(1.5, 0.7 + (security_cost / 30))

    # Attendance calculation: base from expected, modified by quality, marketing, reputation, population cap
    max_attendees = int(population * 0.15)  # Max 15% of population attends
    base_attendance = expected_participants
    actual_attendance = int(base_attendance * quality_mult * marketing_mult * (reputation / 50))
    actual_attendance = max(1, min(actual_attendance, max_attendees))

    # Spectators (come to watch but don't pay entry, boost local economy)
    spectators = int(actual_attendance * 1.5 * quality_mult)

    # Revenue
    entry_revenue = actual_attendance * entry_fee
    spectator_spending = spectators * 2  # Food, drinks, betting
    total_revenue = entry_revenue + spectator_spending

    # Total costs
    total_costs = venue_cost + prize_pool + marketing_cost + staff_cost + security_cost

    # Profit
    profit = total_revenue - total_costs

    # Satisfaction score (0-100): quality, security, prize attractiveness
    prize_attractiveness = min(40, (prize_pool / max(1, entry_fee)) * 5)
    satisfaction = min(100, int(quality_mult * 30 + security_mult * 20 + prize_attractiveness + 10))

    # Reputation change: based on profit and satisfaction
    rep_change = 0
    if satisfaction >= 80:
        rep_change = 3
    elif satisfaction >= 60:
        rep_change = 1
    elif satisfaction >= 40:
        rep_change = 0
    elif satisfaction >= 20:
        rep_change = -1
    else:
        rep_change = -3

    if profit > 0:
        rep_change += 1
    elif profit < -100:
        rep_change -= 2

    # Population change: positive events attract people, negative drive them away
    pop_change = 0
    if satisfaction >= 70 and profit >= 0:
        pop_change = int(actual_attendance * 0.05 * quality_mult)  # Some attendees settle
    elif satisfaction < 30:
        pop_change = -int(population * 0.005)  # Bad events drive people away

    # Treasury impact
    treasury_change = profit

    return {
        "actual_attendance": actual_attendance,
        "spectators": spectators,
        "entry_revenue": round(entry_revenue, 1),
        "spectator_spending": round(spectator_spending, 1),
        "total_revenue": round(total_revenue, 1),
        "total_costs": round(total_costs, 1),
        "profit": round(profit, 1),
        "satisfaction": satisfaction,
        "reputation_change": rep_change,
        "population_change": pop_change,
        "treasury_change": round(treasury_change, 1),
        "quality_multiplier": quality_mult,
        "marketing_effectiveness": round(marketing_mult, 2),
        "breakdown": {
            "venue": venue_cost,
            "prizes": prize_pool,
            "marketing": marketing_cost,
            "staff": staff_cost,
            "security": security_cost,
        }
    }


# ─── Location Economy Endpoints ──────────────────────────────────────

@router.get("/campaigns/{campaign_id}/event-locations")
async def get_locations(campaign_id: str, user=Depends(get_current_user)):
    locations = await db.location_economy.find(
        {"campaign_id": campaign_id}, {"_id": 0}
    ).to_list(100)
    return locations


@router.post("/campaigns/{campaign_id}/event-locations")
async def create_location(campaign_id: str, data: LocationCreate, user=Depends(get_current_user)):
    doc = {
        "campaign_id": campaign_id,
        "location_id": str(ObjectId()),
        "name": data.name,
        "region": data.region,
        "population": data.population,
        "gold_treasury": data.gold_treasury,
        "reputation": data.reputation,
        "history": [{
            "day": 1,
            "gold": data.gold_treasury,
            "population": data.population,
            "reputation": data.reputation,
            "event": "Founded",
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.location_economy.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/campaigns/{campaign_id}/event-locations/{location_id}")
async def update_location(campaign_id: str, location_id: str, data: LocationUpdate, user=Depends(get_current_user)):
    update_fields = {k: v for k, v in data.dict().items() if v is not None}
    if not update_fields:
        raise HTTPException(400, "No fields to update")
    await db.location_economy.update_one(
        {"campaign_id": campaign_id, "location_id": location_id},
        {"$set": update_fields}
    )
    loc = await db.location_economy.find_one(
        {"campaign_id": campaign_id, "location_id": location_id}, {"_id": 0}
    )
    return loc


@router.delete("/campaigns/{campaign_id}/event-locations/{location_id}")
async def delete_location(campaign_id: str, location_id: str, user=Depends(get_current_user)):
    result = await db.location_economy.delete_one(
        {"campaign_id": campaign_id, "location_id": location_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Location not found")
    # Also delete associated events
    await db.campaign_events.delete_many(
        {"campaign_id": campaign_id, "location_id": location_id}
    )
    return {"deleted": True}


# ─── Event Endpoints ─────────────────────────────────────────────────

@router.get("/campaigns/{campaign_id}/events")
async def get_events(campaign_id: str, location_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {"campaign_id": campaign_id}
    if location_id:
        query["location_id"] = location_id
    events = await db.campaign_events.find(query, {"_id": 0}).to_list(200)
    return events


@router.post("/campaigns/{campaign_id}/events")
async def create_event(campaign_id: str, data: EventCreate, user=Depends(get_current_user)):
    # Find the location
    loc = await db.location_economy.find_one(
        {"campaign_id": campaign_id, "name": data.location}, {"_id": 0}
    )
    if not loc:
        raise HTTPException(404, f"Location '{data.location}' not found. Create it first.")

    event_id = str(ObjectId())
    doc = {
        "campaign_id": campaign_id,
        "event_id": event_id,
        "location_id": loc["location_id"],
        "location": data.location,
        "event_type": data.event_type,
        "name": data.name,
        "category": data.category,
        "description": data.description,
        "skill_checks": data.skill_checks,
        "config": data.config.dict(),
        "status": "planned",
        "scheduled_day": data.scheduled_day,
        "results": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.campaign_events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/campaigns/{campaign_id}/events/{event_id}")
async def update_event(campaign_id: str, event_id: str, data: EventUpdate, user=Depends(get_current_user)):
    update_fields = {}
    if data.config:
        update_fields["config"] = data.config.dict()
    if data.status:
        update_fields["status"] = data.status
    if data.name:
        update_fields["name"] = data.name
    if data.description is not None:
        update_fields["description"] = data.description
    if not update_fields:
        raise HTTPException(400, "No fields to update")
    await db.campaign_events.update_one(
        {"campaign_id": campaign_id, "event_id": event_id},
        {"$set": update_fields}
    )
    event = await db.campaign_events.find_one(
        {"campaign_id": campaign_id, "event_id": event_id}, {"_id": 0}
    )
    return event


@router.delete("/campaigns/{campaign_id}/events/{event_id}")
async def delete_event(campaign_id: str, event_id: str, user=Depends(get_current_user)):
    result = await db.campaign_events.delete_one(
        {"campaign_id": campaign_id, "event_id": event_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"deleted": True}


@router.post("/campaigns/{campaign_id}/events/{event_id}/preview")
async def preview_event_economics(campaign_id: str, event_id: str, user=Depends(get_current_user)):
    """Preview the financial impact without actually running the event."""
    event = await db.campaign_events.find_one(
        {"campaign_id": campaign_id, "event_id": event_id}, {"_id": 0}
    )
    if not event:
        raise HTTPException(404, "Event not found")
    loc = await db.location_economy.find_one(
        {"campaign_id": campaign_id, "location_id": event["location_id"]}, {"_id": 0}
    )
    if not loc:
        raise HTTPException(404, "Location not found")

    projection = calculate_event_economics(event["config"], loc)
    return {"event": event, "projection": projection, "location": loc}


@router.post("/campaigns/{campaign_id}/events/{event_id}/run")
async def run_event(campaign_id: str, event_id: str, user=Depends(get_current_user)):
    """Execute the event: calculate results, update location economy, add to history."""
    event = await db.campaign_events.find_one(
        {"campaign_id": campaign_id, "event_id": event_id}, {"_id": 0}
    )
    if not event:
        raise HTTPException(404, "Event not found")
    if event.get("status") == "completed":
        raise HTTPException(400, "Event already completed")

    loc = await db.location_economy.find_one(
        {"campaign_id": campaign_id, "location_id": event["location_id"]}, {"_id": 0}
    )
    if not loc:
        raise HTTPException(404, "Location not found")

    # Calculate results
    results = calculate_event_economics(event["config"], loc)

    # Apply random variance (±15%) for realism
    import random
    variance = random.uniform(0.85, 1.15)
    results["actual_attendance"] = max(1, int(results["actual_attendance"] * variance))
    results["entry_revenue"] = round(results["actual_attendance"] * event["config"]["entry_fee"], 1)
    results["spectators"] = max(0, int(results["spectators"] * variance))
    results["spectator_spending"] = round(results["spectators"] * 2, 1)
    results["total_revenue"] = round(results["entry_revenue"] + results["spectator_spending"], 1)
    results["profit"] = round(results["total_revenue"] - results["total_costs"], 1)
    results["treasury_change"] = results["profit"]

    # Recalculate satisfaction with variance
    sat_var = random.randint(-5, 5)
    results["satisfaction"] = max(0, min(100, results["satisfaction"] + sat_var))

    # Update location economy
    new_gold = round(loc["gold_treasury"] + results["treasury_change"], 1)
    new_pop = max(1, loc["population"] + results["population_change"])
    new_rep = max(0, min(100, loc["reputation"] + results["reputation_change"]))

    # Determine the current day from history
    current_day = len(loc.get("history", [])) + 1
    if event.get("scheduled_day"):
        current_day = event["scheduled_day"]

    history_entry = {
        "day": current_day,
        "gold": new_gold,
        "population": new_pop,
        "reputation": new_rep,
        "event": event["name"],
        "profit": results["profit"],
        "attendance": results["actual_attendance"],
    }

    await db.location_economy.update_one(
        {"campaign_id": campaign_id, "location_id": event["location_id"]},
        {
            "$set": {
                "gold_treasury": new_gold,
                "population": new_pop,
                "reputation": new_rep,
            },
            "$push": {"history": history_entry}
        }
    )

    # Mark event as completed with results
    results["ran_on_day"] = current_day
    await db.campaign_events.update_one(
        {"campaign_id": campaign_id, "event_id": event_id},
        {"$set": {"status": "completed", "results": results}}
    )

    # Re-fetch updated data
    updated_event = await db.campaign_events.find_one(
        {"campaign_id": campaign_id, "event_id": event_id}, {"_id": 0}
    )
    updated_loc = await db.location_economy.find_one(
        {"campaign_id": campaign_id, "location_id": event["location_id"]}, {"_id": 0}
    )

    return {
        "event": updated_event,
        "results": results,
        "location": updated_loc,
    }


@router.post("/campaigns/{campaign_id}/events/{event_id}/preview-config")
async def preview_with_config(campaign_id: str, event_id: str, config: EventConfig, user=Depends(get_current_user)):
    """Preview economics with a modified config (for real-time slider adjustments)."""
    event = await db.campaign_events.find_one(
        {"campaign_id": campaign_id, "event_id": event_id}, {"_id": 0}
    )
    if not event:
        raise HTTPException(404, "Event not found")
    loc = await db.location_economy.find_one(
        {"campaign_id": campaign_id, "location_id": event["location_id"]}, {"_id": 0}
    )
    if not loc:
        raise HTTPException(404, "Location not found")

    projection = calculate_event_economics(config.dict(), loc)
    return {"projection": projection}
