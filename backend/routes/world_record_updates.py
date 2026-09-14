"""Focused campaign-scoped update routes for core world-prep records."""
from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import God, GodUpdate, CalendarEvent, CalendarEventUpdate, Location, LocationUpdate
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()

WORLD_RECORD_UPDATE_ROUTE_KEYS = {
    ('PUT', '/campaigns/{campaign_id}/gods/{god_id}'),
    ('PUT', '/campaigns/{campaign_id}/calendar-events/{event_id}'),
    ('PUT', '/campaigns/{campaign_id}/locations/{location_id}'),
}


def remove_legacy_world_record_update_routes(legacy_router) -> int:
    kept = []
    removed = 0
    for route in list(getattr(legacy_router, 'routes', [])):
        path = getattr(route, 'path', '')
        methods = getattr(route, 'methods', set()) or set()
        if any((method, path) in WORLD_RECORD_UPDATE_ROUTE_KEYS for method in methods):
            removed += 1
            continue
        kept.append(route)
    legacy_router.routes[:] = kept
    return removed


async def _scoped_update(collection, *, campaign_id: str, record_id: str, update_dict: dict, not_found: str):
    result = await collection.update_one(
        {'id': record_id, 'campaign_id': campaign_id},
        {'$set': update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)

    updated = await collection.find_one(
        {'id': record_id, 'campaign_id': campaign_id},
        {'_id': 0},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)
    return updated


@router.put('/campaigns/{campaign_id}/gods/{god_id}', response_model=God)
async def update_god_record(
    campaign_id: str,
    god_id: str,
    god_data: GodUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in god_data.model_dump().items() if value is not None}
    return await _scoped_update(
        db.gods,
        campaign_id=campaign_id,
        record_id=god_id,
        update_dict=update_dict,
        not_found='God not found',
    )


@router.put('/campaigns/{campaign_id}/calendar-events/{event_id}', response_model=CalendarEvent)
async def update_calendar_event_record(
    campaign_id: str,
    event_id: str,
    event_data: CalendarEventUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in event_data.model_dump().items() if value is not None}
    return await _scoped_update(
        db.calendar_events,
        campaign_id=campaign_id,
        record_id=event_id,
        update_dict=update_dict,
        not_found='Event not found',
    )


@router.put('/campaigns/{campaign_id}/locations/{location_id}', response_model=Location)
async def update_location_record(
    campaign_id: str,
    location_id: str,
    location_data: LocationUpdate,
    username: str = Depends(get_current_user),
):
    await verify_campaign_ownership(campaign_id, username)
    update_dict = {key: value for key, value in location_data.model_dump().items() if value is not None}
    return await _scoped_update(
        db.locations,
        campaign_id=campaign_id,
        record_id=location_id,
        update_dict=update_dict,
        not_found='Location not found',
    )
