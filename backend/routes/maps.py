"""Map routes: game maps, world maps, local maps with pins and paths."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership
from models import (
    GameMap, GameMapCreate, GameMapUpdate,
    WorldMap, WorldMapCreate, WorldMapUpdate,
    LocalMap, LocalMapCreate, LocalMapUpdate,
    MapPin, TravelPath, TravelCalculateRequest
)
from typing import Optional, Dict, Any, List
import uuid
import math
from datetime import datetime, timezone

router = APIRouter()

@router.post("/campaigns/{campaign_id}/maps", response_model=GameMap)
async def create_map(campaign_id: str, map_data: GameMapCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    map_dict = map_data.model_dump()
    map_obj = GameMap(campaign_id=campaign_id, **map_dict)
    doc = map_obj.model_dump()
    await db.maps.insert_one(doc)
    return map_obj

@router.get("/campaigns/{campaign_id}/maps", response_model=List[GameMap])
async def get_maps(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    maps = await db.maps.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return maps

@router.put("/campaigns/{campaign_id}/maps/{map_id}", response_model=GameMap)
async def update_map(campaign_id: str, map_id: str, map_data: GameMapUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in map_data.model_dump().items() if v is not None}
    result = await db.maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Map not found")
    
    game_map = await db.maps.find_one({'id': map_id}, {'_id': 0})
    return game_map

@router.delete("/campaigns/{campaign_id}/maps/{map_id}")
async def delete_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Map not found")
    return {'message': 'Map deleted successfully'}


# ==================== WORLD MAP ROUTES ====================

@router.post("/campaigns/{campaign_id}/world-maps")
async def create_world_map(campaign_id: str, map_data: WorldMapCreate, username: str = Depends(get_current_user)):
    """Create a new world/region map"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Default travel speeds
    default_travel_speeds = {
        "walking": 24,
        "horseback": 48,
        "cart": 16,
        "ship": 72,
        "flying": 96
    }
    
    world_map = WorldMap(
        campaign_id=campaign_id,
        name=map_data.name,
        map_type=map_data.map_type,
        image_data=map_data.image_data,
        image_url=map_data.image_url,
        scale_value=map_data.scale_value,
        scale_unit=map_data.scale_unit,
        travel_speeds=map_data.travel_speeds or default_travel_speeds,
        notes=map_data.notes
    )
    
    await db.world_maps.insert_one(world_map.model_dump())
    return {**world_map.model_dump(), '_id': None}

@router.get("/campaigns/{campaign_id}/world-maps")
async def get_world_maps(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all world maps for a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    maps = await db.world_maps.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
    return maps

@router.get("/campaigns/{campaign_id}/world-maps/{map_id}")
async def get_world_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Get a specific world map"""
    await verify_campaign_ownership(campaign_id, username)
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    return world_map

@router.put("/campaigns/{campaign_id}/world-maps/{map_id}")
async def update_world_map(campaign_id: str, map_id: str, update_data: WorldMapUpdate, username: str = Depends(get_current_user)):
    """Update a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.world_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="World map not found")
    
    updated = await db.world_maps.find_one({'id': map_id}, {'_id': 0})
    return updated

@router.delete("/campaigns/{campaign_id}/world-maps/{map_id}")
async def delete_world_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Delete a world map"""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.world_maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="World map not found")
    return {'message': 'World map deleted'}

@router.post("/campaigns/{campaign_id}/world-maps/{map_id}/pins")
async def add_map_pin(campaign_id: str, map_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a pin to a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    new_pin = {
        'id': str(uuid.uuid4()),
        'x': pin_data.get('x', 50),
        'y': pin_data.get('y', 50),
        'name': pin_data.get('name', 'New Location'),
        'pin_type': pin_data.get('pin_type', 'location'),
        'linked_location_id': pin_data.get('linked_location_id'),
        'linked_place_id': pin_data.get('linked_place_id'),
        'description': pin_data.get('description', ''),
        'icon': pin_data.get('icon', 'MapPin'),
        'color': pin_data.get('color', '#E11D48')
    }
    
    pins = world_map.get('pins', [])
    pins.append(new_pin)
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_pin

@router.put("/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}")
async def update_map_pin(campaign_id: str, map_id: str, pin_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a pin on a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    pins = world_map.get('pins', [])
    pin_index = next((i for i, p in enumerate(pins) if p.get('id') == pin_id), None)
    
    if pin_index is None:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    # Update pin fields
    for key, value in pin_data.items():
        if key != 'id':
            pins[pin_index][key] = value
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return pins[pin_index]

@router.delete("/campaigns/{campaign_id}/world-maps/{map_id}/pins/{pin_id}")
async def delete_map_pin(campaign_id: str, map_id: str, pin_id: str, username: str = Depends(get_current_user)):
    """Delete a pin from a world map"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    pins = [p for p in world_map.get('pins', []) if p.get('id') != pin_id]
    # Also remove any paths connected to this pin
    paths = [p for p in world_map.get('paths', []) if p.get('from_pin_id') != pin_id and p.get('to_pin_id') != pin_id]
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Pin deleted'}

@router.post("/campaigns/{campaign_id}/world-maps/{map_id}/paths")
async def add_travel_path(campaign_id: str, map_id: str, path_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a travel path between two pins"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    new_path = {
        'id': str(uuid.uuid4()),
        'from_pin_id': path_data.get('from_pin_id'),
        'to_pin_id': path_data.get('to_pin_id'),
        'distance_value': path_data.get('distance_value', 0),
        'distance_unit': path_data.get('distance_unit', 'miles'),
        'terrain_type': path_data.get('terrain_type', 'road'),
        'terrain_modifier': path_data.get('terrain_modifier', 1.0),
        'notes': path_data.get('notes', ''),
        'is_bidirectional': path_data.get('is_bidirectional', True)
    }
    
    paths = world_map.get('paths', [])
    paths.append(new_path)
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_path

@router.put("/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}")
async def update_travel_path(campaign_id: str, map_id: str, path_id: str, path_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a travel path"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    paths = world_map.get('paths', [])
    path_index = next((i for i, p in enumerate(paths) if p.get('id') == path_id), None)
    
    if path_index is None:
        raise HTTPException(status_code=404, detail="Path not found")
    
    for key, value in path_data.items():
        if key != 'id':
            paths[path_index][key] = value
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return paths[path_index]

@router.delete("/campaigns/{campaign_id}/world-maps/{map_id}/paths/{path_id}")
async def delete_travel_path(campaign_id: str, map_id: str, path_id: str, username: str = Depends(get_current_user)):
    """Delete a travel path"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    paths = [p for p in world_map.get('paths', []) if p.get('id') != path_id]
    
    await db.world_maps.update_one(
        {'id': map_id},
        {'$set': {'paths': paths, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Path deleted'}

@router.post("/campaigns/{campaign_id}/world-maps/{map_id}/calculate-travel")
async def calculate_travel_time(campaign_id: str, map_id: str, request: TravelCalculateRequest, username: str = Depends(get_current_user)):
    """Calculate travel time between two pins"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    # Find the path between the two pins
    paths = world_map.get('paths', [])
    direct_path = next((p for p in paths if 
        (p.get('from_pin_id') == request.from_pin_id and p.get('to_pin_id') == request.to_pin_id) or
        (p.get('is_bidirectional') and p.get('from_pin_id') == request.to_pin_id and p.get('to_pin_id') == request.from_pin_id)
    ), None)
    
    if not direct_path:
        raise HTTPException(status_code=404, detail="No path exists between these locations")
    
    # Get travel speed for mode
    travel_speeds = world_map.get('travel_speeds', {'walking': 24, 'horseback': 48, 'cart': 16, 'ship': 72, 'flying': 96})
    speed = travel_speeds.get(request.travel_mode, 24)  # miles per day
    
    # Calculate base travel time
    distance = direct_path.get('distance_value', 0)
    terrain_modifier = direct_path.get('terrain_modifier', 1.0)
    
    # Effective distance considering terrain
    effective_distance = distance * terrain_modifier
    
    # Calculate time
    if speed > 0:
        travel_days = effective_distance / speed
        travel_hours = travel_days * 8  # Assuming 8 hours of travel per day
    else:
        travel_days = 0
        travel_hours = 0
    
    # Get pin names
    pins = world_map.get('pins', [])
    from_pin = next((p for p in pins if p.get('id') == request.from_pin_id), {})
    to_pin = next((p for p in pins if p.get('id') == request.to_pin_id), {})
    
    return {
        'from_location': from_pin.get('name', 'Unknown'),
        'to_location': to_pin.get('name', 'Unknown'),
        'distance': distance,
        'distance_unit': direct_path.get('distance_unit', 'miles'),
        'terrain_type': direct_path.get('terrain_type', 'road'),
        'terrain_modifier': terrain_modifier,
        'effective_distance': effective_distance,
        'travel_mode': request.travel_mode,
        'speed_per_day': speed,
        'travel_days': round(travel_days, 1),
        'travel_hours': round(travel_hours, 1),
        'formatted_time': f"{int(travel_days)} days, {int((travel_days % 1) * 8)} hours" if travel_days >= 1 else f"{round(travel_hours, 1)} hours"
    }

@router.get("/campaigns/{campaign_id}/world-maps/{map_id}/nearby")
async def get_nearby_locations(campaign_id: str, map_id: str, pin_id: str, username: str = Depends(get_current_user)):
    """Get all locations reachable from a given pin with travel times"""
    await verify_campaign_ownership(campaign_id, username)
    
    world_map = await db.world_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not world_map:
        raise HTTPException(status_code=404, detail="World map not found")
    
    paths = world_map.get('paths', [])
    pins = world_map.get('pins', [])
    travel_speeds = world_map.get('travel_speeds', {'walking': 24})
    
    # Find all paths from/to this pin
    connected_paths = [p for p in paths if 
        p.get('from_pin_id') == pin_id or 
        (p.get('is_bidirectional') and p.get('to_pin_id') == pin_id)
    ]
    
    nearby = []
    for path in connected_paths:
        # Determine the destination pin
        dest_pin_id = path.get('to_pin_id') if path.get('from_pin_id') == pin_id else path.get('from_pin_id')
        dest_pin = next((p for p in pins if p.get('id') == dest_pin_id), None)
        
        if dest_pin:
            distance = path.get('distance_value', 0)
            terrain_mod = path.get('terrain_modifier', 1.0)
            walking_days = (distance * terrain_mod) / travel_speeds.get('walking', 24)
            
            nearby.append({
                'pin_id': dest_pin_id,
                'name': dest_pin.get('name', 'Unknown'),
                'pin_type': dest_pin.get('pin_type', 'location'),
                'distance': distance,
                'distance_unit': path.get('distance_unit', 'miles'),
                'terrain_type': path.get('terrain_type', 'road'),
                'walking_time': f"{int(walking_days)} days" if walking_days >= 1 else f"{round(walking_days * 8, 1)} hours",
                'walking_days': round(walking_days, 1)
            })
    
    # Sort by distance
    nearby.sort(key=lambda x: x.get('distance', 0))
    
    return {
        'current_location': next((p.get('name') for p in pins if p.get('id') == pin_id), 'Unknown'),
        'nearby_locations': nearby
    }

# ==================== LOCAL MAP ROUTES ====================

@router.post("/campaigns/{campaign_id}/local-maps")
async def create_local_map(campaign_id: str, map_data: LocalMapCreate, username: str = Depends(get_current_user)):
    """Create a local map for a city/town/village"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = LocalMap(
        campaign_id=campaign_id,
        location_id=map_data.location_id,
        name=map_data.name,
        map_type=map_data.map_type,
        image_data=map_data.image_data,
        notes=map_data.notes
    )
    
    await db.local_maps.insert_one(local_map.model_dump())
    return {**local_map.model_dump(), '_id': None}

@router.get("/campaigns/{campaign_id}/local-maps")
async def get_local_maps(campaign_id: str, location_id: Optional[str] = None, username: str = Depends(get_current_user)):
    """Get all local maps, optionally filtered by location"""
    await verify_campaign_ownership(campaign_id, username)
    
    query = {'campaign_id': campaign_id}
    if location_id:
        query['location_id'] = location_id
    
    maps = await db.local_maps.find(query, {'_id': 0}).to_list(100)
    return maps

@router.get("/campaigns/{campaign_id}/local-maps/{map_id}")
async def get_local_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Get a specific local map"""
    await verify_campaign_ownership(campaign_id, username)
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    return local_map

@router.put("/campaigns/{campaign_id}/local-maps/{map_id}")
async def update_local_map(campaign_id: str, map_id: str, update_data: LocalMapUpdate, username: str = Depends(get_current_user)):
    """Update a local map"""
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.local_maps.update_one(
        {'id': map_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    updated = await db.local_maps.find_one({'id': map_id}, {'_id': 0})
    return updated

@router.delete("/campaigns/{campaign_id}/local-maps/{map_id}")
async def delete_local_map(campaign_id: str, map_id: str, username: str = Depends(get_current_user)):
    """Delete a local map"""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.local_maps.delete_one({'id': map_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Local map not found")
    return {'message': 'Local map deleted'}

@router.post("/campaigns/{campaign_id}/local-maps/{map_id}/pins")
async def add_local_map_pin(campaign_id: str, map_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Add a pin to a local map (place of interest)"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    new_pin = {
        'id': str(uuid.uuid4()),
        'x': pin_data.get('x', 50),
        'y': pin_data.get('y', 50),
        'name': pin_data.get('name', 'New Place'),
        'pin_type': pin_data.get('pin_type', 'poi'),
        'linked_place_id': pin_data.get('linked_place_id'),
        'description': pin_data.get('description', ''),
        'icon': pin_data.get('icon', 'MapPin'),
        'color': pin_data.get('color', '#E11D48')
    }
    
    pins = local_map.get('pins', [])
    pins.append(new_pin)
    
    await db.local_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_pin

@router.put("/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}")
async def update_local_map_pin(campaign_id: str, map_id: str, pin_id: str, pin_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a pin on a local map"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    pins = local_map.get('pins', [])
    pin_index = next((i for i, p in enumerate(pins) if p.get('id') == pin_id), None)
    
    if pin_index is None:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    for key, value in pin_data.items():
        if key != 'id':
            pins[pin_index][key] = value
    
    await db.local_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return pins[pin_index]

@router.delete("/campaigns/{campaign_id}/local-maps/{map_id}/pins/{pin_id}")
async def delete_local_map_pin(campaign_id: str, map_id: str, pin_id: str, username: str = Depends(get_current_user)):
    """Delete a pin from a local map"""
    await verify_campaign_ownership(campaign_id, username)
    
    local_map = await db.local_maps.find_one({'id': map_id, 'campaign_id': campaign_id})
    if not local_map:
        raise HTTPException(status_code=404, detail="Local map not found")
    
    pins = [p for p in local_map.get('pins', []) if p.get('id') != pin_id]
    
    await db.local_maps.update_one(
        {'id': map_id},
        {'$set': {'pins': pins, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Pin deleted'}


# ==================== AI ROUTES ====================
