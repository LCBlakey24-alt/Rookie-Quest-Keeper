"""World routes: gods, calendar, locations, places of interest, world builder."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership
from models import (
    God, GodCreate, GodUpdate, Calendar, CalendarUpdate,
    CalendarEvent, CalendarEventCreate, CalendarEventUpdate,
    Location, LocationCreate, LocationUpdate,
    PlaceOfInterest, PlaceOfInterestCreate, PlaceOfInterestUpdate
)
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime, timezone
from utils.custom_calendar_rules import check_calendar, validate_day, advance_calendar_date

router = APIRouter()

@router.post("/campaigns/{campaign_id}/gods", response_model=God, status_code=status.HTTP_201_CREATED)
async def create_god(campaign_id: str, god_data: GodCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    god_dict = god_data.model_dump()
    god_obj = God(campaign_id=campaign_id, **god_dict)
    doc = god_obj.model_dump()
    await db.gods.insert_one(doc)
    return god_obj

@router.get("/campaigns/{campaign_id}/gods", response_model=List[God])
async def get_gods(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    gods = await db.gods.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return gods

@router.put("/campaigns/{campaign_id}/gods/{god_id}", response_model=God)
async def update_god(campaign_id: str, god_id: str, god_data: GodUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in god_data.model_dump().items() if v is not None}
    result = await db.gods.update_one(
        {'id': god_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="God not found")
    
    god = await db.gods.find_one({'id': god_id}, {'_id': 0})
    return god

@router.delete("/campaigns/{campaign_id}/gods/{god_id}")
async def delete_god(campaign_id: str, god_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.gods.delete_one({'id': god_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="God not found")
    return {'message': 'God deleted successfully'}

# ==================== CALENDAR ROUTES ====================

@router.get("/campaigns/{campaign_id}/calendar", response_model=Optional[Calendar])
async def get_calendar(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    calendar = await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not calendar:
        # Create default calendar
        default_months = [
            {"name": "January", "days": 31}, {"name": "February", "days": 28},
            {"name": "March", "days": 31}, {"name": "April", "days": 30},
            {"name": "May", "days": 31}, {"name": "June", "days": 30},
            {"name": "July", "days": 31}, {"name": "August", "days": 31},
            {"name": "September", "days": 30}, {"name": "October", "days": 31},
            {"name": "November", "days": 30}, {"name": "December", "days": 31}
        ]
        calendar_obj = Calendar(campaign_id=campaign_id, calendar_type="gregorian", custom_months=default_months)
        doc = calendar_obj.model_dump()
        await db.calendars.insert_one(doc)
        return calendar_obj
    return calendar

@router.put("/campaigns/{campaign_id}/calendar", response_model=Calendar)
async def update_calendar(campaign_id: str, calendar_data: CalendarUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)

    patch = calendar_data.model_dump(exclude_none=True)
    existing = await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})
    baseline = existing or Calendar(
        campaign_id=campaign_id, calendar_type="custom", current_day=1,
        current_month=1, current_year=1, custom_months=[]
    ).model_dump()
    next_calendar = {**baseline, **patch}
    check_calendar(next_calendar)
    # Do not permit changing the structure so that existing events land on
    # nonexistent dates. The GM can edit affected events first.
    saved_events = await db.calendar_events.find(
        {'campaign_id': campaign_id}, {'_id': 0}
    ).to_list(1000)
    for event in saved_events:
        validate_day(next_calendar, event['year'], event['month'], event['day'])

    if existing:
        await db.calendars.update_one(
            {'campaign_id': campaign_id}, {'$set': patch}
        )
    else:
        await db.calendars.insert_one(next_calendar)
    return await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})


@router.post("/campaigns/{campaign_id}/calendar/advance")
async def advance_calendar(campaign_id: str, days: int, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    calendar = await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    next_date = advance_calendar_date(calendar, days)
    await db.calendars.update_one(
        {'campaign_id': campaign_id}, {'$set': next_date}
    )
    return await db.calendars.find_one({'campaign_id': campaign_id}, {'_id': 0})


# ==================== CALENDAR EVENT ROUTES ====================

@router.post("/campaigns/{campaign_id}/calendar-events", response_model=CalendarEvent)
async def create_calendar_event(campaign_id: str, event_data: CalendarEventCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    event_dict = event_data.model_dump()
    event_obj = CalendarEvent(campaign_id=campaign_id, **event_dict)
    doc = event_obj.model_dump()
    await db.calendar_events.insert_one(doc)
    return event_obj

@router.get("/campaigns/{campaign_id}/calendar-events", response_model=List[CalendarEvent])
async def get_calendar_events(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    events = await db.calendar_events.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return events

@router.put("/campaigns/{campaign_id}/calendar-events/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(campaign_id: str, event_id: str, event_data: CalendarEventUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in event_data.model_dump().items() if v is not None}
    result = await db.calendar_events.update_one(
        {'id': event_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    event = await db.calendar_events.find_one({'id': event_id}, {'_id': 0})
    return event

@router.delete("/campaigns/{campaign_id}/calendar-events/{event_id}")
async def delete_calendar_event(campaign_id: str, event_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.calendar_events.delete_one({'id': event_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return {'message': 'Event deleted successfully'}


@router.post("/campaigns/{campaign_id}/locations", response_model=Location, status_code=status.HTTP_201_CREATED)
async def create_location(campaign_id: str, location_data: LocationCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    location_dict = location_data.model_dump()
    location_obj = Location(campaign_id=campaign_id, **location_dict)
    doc = location_obj.model_dump()
    await db.locations.insert_one(doc)
    return location_obj

@router.get("/campaigns/{campaign_id}/locations", response_model=List[Location])
async def get_locations(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return locations

@router.put("/campaigns/{campaign_id}/locations/{location_id}", response_model=Location)
async def update_location(campaign_id: str, location_id: str, location_data: LocationUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in location_data.model_dump().items() if v is not None}
    result = await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    location = await db.locations.find_one({'id': location_id}, {'_id': 0})
    return location

@router.delete("/campaigns/{campaign_id}/locations/{location_id}")
async def delete_location(campaign_id: str, location_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.locations.delete_one({'id': location_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return {'message': 'Location deleted successfully'}

# ==================== PLACES OF INTEREST ROUTES ====================

@router.post("/campaigns/{campaign_id}/locations/{location_id}/places")
async def add_place_of_interest(
    campaign_id: str, 
    location_id: str, 
    place_data: PlaceOfInterestCreate, 
    username: str = Depends(get_current_user)
):
    """Add a place of interest to a location (shop, tavern, temple, etc.)"""
    await verify_campaign_ownership(campaign_id, username)
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    # Create new place
    new_place = PlaceOfInterest(**place_data.model_dump())
    place_dict = new_place.model_dump()
    
    # Add to location's places_of_interest array
    places = location.get('places_of_interest', [])
    places.append(place_dict)
    
    await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': {'places_of_interest': places}}
    )
    
    return place_dict

@router.get("/campaigns/{campaign_id}/locations/{location_id}/places")
async def get_places_of_interest(
    campaign_id: str, 
    location_id: str, 
    username: str = Depends(get_current_user)
):
    """Get all places of interest within a location"""
    await verify_campaign_ownership(campaign_id, username)
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    return location.get('places_of_interest', [])

@router.put("/campaigns/{campaign_id}/locations/{location_id}/places/{place_id}")
async def update_place_of_interest(
    campaign_id: str, 
    location_id: str, 
    place_id: str,
    place_data: PlaceOfInterestUpdate,
    username: str = Depends(get_current_user)
):
    """Update a place of interest"""
    await verify_campaign_ownership(campaign_id, username)
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    places = location.get('places_of_interest', [])
    place_index = next((i for i, p in enumerate(places) if p.get('id') == place_id), None)
    
    if place_index is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    
    # Update the place with new data
    update_dict = {k: v for k, v in place_data.model_dump().items() if v is not None}
    places[place_index].update(update_dict)
    
    await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': {'places_of_interest': places}}
    )
    
    return places[place_index]

@router.delete("/campaigns/{campaign_id}/locations/{location_id}/places/{place_id}")
async def delete_place_of_interest(
    campaign_id: str, 
    location_id: str, 
    place_id: str,
    username: str = Depends(get_current_user)
):
    """Delete a place of interest"""
    await verify_campaign_ownership(campaign_id, username)
    
    location = await db.locations.find_one({'id': location_id, 'campaign_id': campaign_id})
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    places = location.get('places_of_interest', [])
    original_length = len(places)
    places = [p for p in places if p.get('id') != place_id]
    
    if len(places) == original_length:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    
    await db.locations.update_one(
        {'id': location_id, 'campaign_id': campaign_id},
        {'$set': {'places_of_interest': places}}
    )
    
    return {'message': 'Place deleted successfully'}

# ==================== WORLD BUILDER ROUTES ====================

@router.get("/campaigns/{campaign_id}/world")
async def get_world_data(campaign_id: str, username: str = Depends(get_current_user)):
    """Get complete world hierarchy for a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Get all continents
    continents = await db.world_continents.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
    
    # Build hierarchy
    for continent in continents:
        regions = await db.world_regions.find({'parent_id': continent['id']}, {'_id': 0}).to_list(100)
        for region in regions:
            settlements = await db.world_settlements.find({'parent_id': region['id']}, {'_id': 0}).to_list(100)
            for settlement in settlements:
                places = await db.world_places.find({'parent_id': settlement['id']}, {'_id': 0}).to_list(100)
                settlement['places'] = places
            region['settlements'] = settlements
        continent['regions'] = regions
    
    return {'continents': continents}

@router.post("/campaigns/{campaign_id}/world/continent")
async def create_continent(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new continent/landmass"""
    await verify_campaign_ownership(campaign_id, username)
    
    continent = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': data.get('name', 'New Continent'),
        'continent_type': data.get('type', 'continent'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_continents.insert_one(continent)
    continent.pop('_id', None)
    return continent

@router.put("/campaigns/{campaign_id}/world/continent/{continent_id}")
async def update_continent(campaign_id: str, continent_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a continent"""
    await verify_campaign_ownership(campaign_id, username)
    
    update_data = {
        'name': data.get('name'),
        'continent_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    await db.world_continents.update_one({'id': continent_id}, {'$set': update_data})
    continent = await db.world_continents.find_one({'id': continent_id}, {'_id': 0})
    return continent

@router.delete("/campaigns/{campaign_id}/world/continent/{continent_id}")
async def delete_continent(campaign_id: str, continent_id: str, username: str = Depends(get_current_user)):
    """Delete a continent and all nested items"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Delete nested items
    regions = await db.world_regions.find({'parent_id': continent_id}, {'id': 1}).to_list(100)
    for region in regions:
        settlements = await db.world_settlements.find({'parent_id': region['id']}, {'id': 1}).to_list(100)
        for settlement in settlements:
            await db.world_places.delete_many({'parent_id': settlement['id']})
        await db.world_settlements.delete_many({'parent_id': region['id']})
    await db.world_regions.delete_many({'parent_id': continent_id})
    await db.world_continents.delete_one({'id': continent_id})
    
    return {'message': 'Continent deleted'}

@router.post("/campaigns/{campaign_id}/world/region")
async def create_region(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new country/region"""
    await verify_campaign_ownership(campaign_id, username)
    
    region = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': data.get('parent_id'),  # Continent ID
        'name': data.get('name', 'New Region'),
        'region_type': data.get('type', 'kingdom'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_regions.insert_one(region)
    return {k: v for k, v in region.items() if k != '_id'}

@router.put("/campaigns/{campaign_id}/world/region/{region_id}")
async def update_region(campaign_id: str, region_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a region"""
    update_data = {k: v for k, v in {
        'name': data.get('name'),
        'region_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }.items() if v is not None}
    
    await db.world_regions.update_one({'id': region_id}, {'$set': update_data})
    return await db.world_regions.find_one({'id': region_id}, {'_id': 0})

@router.delete("/campaigns/{campaign_id}/world/region/{region_id}")
async def delete_region(campaign_id: str, region_id: str, username: str = Depends(get_current_user)):
    """Delete a region and all nested items"""
    settlements = await db.world_settlements.find({'parent_id': region_id}, {'id': 1}).to_list(100)
    for settlement in settlements:
        await db.world_places.delete_many({'parent_id': settlement['id']})
    await db.world_settlements.delete_many({'parent_id': region_id})
    await db.world_regions.delete_one({'id': region_id})
    return {'message': 'Region deleted'}

@router.post("/campaigns/{campaign_id}/world/settlement")
async def create_settlement(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new city/town/village"""
    await verify_campaign_ownership(campaign_id, username)
    
    settlement = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': data.get('parent_id'),  # Region ID
        'name': data.get('name', 'New Settlement'),
        'settlement_type': data.get('type', 'town'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_settlements.insert_one(settlement)
    return {k: v for k, v in settlement.items() if k != '_id'}

@router.put("/campaigns/{campaign_id}/world/settlement/{settlement_id}")
async def update_settlement(campaign_id: str, settlement_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a settlement"""
    update_data = {k: v for k, v in {
        'name': data.get('name'),
        'settlement_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }.items() if v is not None}
    
    await db.world_settlements.update_one({'id': settlement_id}, {'$set': update_data})
    return await db.world_settlements.find_one({'id': settlement_id}, {'_id': 0})

@router.delete("/campaigns/{campaign_id}/world/settlement/{settlement_id}")
async def delete_settlement(campaign_id: str, settlement_id: str, username: str = Depends(get_current_user)):
    """Delete a settlement and all places"""
    await db.world_places.delete_many({'parent_id': settlement_id})
    await db.world_settlements.delete_one({'id': settlement_id})
    return {'message': 'Settlement deleted'}

@router.post("/campaigns/{campaign_id}/world/place")
async def create_world_place(campaign_id: str, data: dict, username: str = Depends(get_current_user)):
    """Create a new place of interest"""
    await verify_campaign_ownership(campaign_id, username)
    
    place = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'parent_id': data.get('parent_id'),  # Settlement ID
        'name': data.get('name', 'New Place'),
        'place_type': data.get('type', 'shop'),
        'description': data.get('description', ''),
        'notes': data.get('notes', ''),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.world_places.insert_one(place)
    return {k: v for k, v in place.items() if k != '_id'}

@router.put("/campaigns/{campaign_id}/world/place/{place_id}")
async def update_world_place(campaign_id: str, place_id: str, data: dict, username: str = Depends(get_current_user)):
    """Update a place"""
    update_data = {k: v for k, v in {
        'name': data.get('name'),
        'place_type': data.get('type'),
        'description': data.get('description'),
        'notes': data.get('notes')
    }.items() if v is not None}
    
    await db.world_places.update_one({'id': place_id}, {'$set': update_data})
    return await db.world_places.find_one({'id': place_id}, {'_id': 0})

@router.delete("/campaigns/{campaign_id}/world/place/{place_id}")
async def delete_world_place(campaign_id: str, place_id: str, username: str = Depends(get_current_user)):
    """Delete a place"""
    await db.world_places.delete_one({'id': place_id})
    return {'message': 'Place deleted'}

# ==================== IN-GAME NOTES ROUTES ====================
