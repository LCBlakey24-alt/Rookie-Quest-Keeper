"""Combat routes: scenarios, initiative tracker."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership
from models import (
    CombatScenario, CombatScenarioCreate, CombatScenarioUpdate,
    Initiative, InitiativeCreate, InitiativeUpdate, InitiativeEntry
)
from typing import Optional, List
import uuid
from datetime import datetime, timezone
from utils.resilient_records import serialise_records

router = APIRouter()

@router.post("/campaigns/{campaign_id}/combat-scenarios", response_model=CombatScenario)
async def create_combat_scenario(campaign_id: str, scenario_data: CombatScenarioCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    scenario_dict = scenario_data.model_dump()
    scenario_obj = CombatScenario(campaign_id=campaign_id, **scenario_dict)
    doc = scenario_obj.model_dump()
    await db.combat_scenarios.insert_one(doc)
    return scenario_obj

# Validated per record rather than as a list; see utils/resilient_records.
# response_model=List[...] made one drifted record a 500 for the whole
# collection, which is how a campaign's NPCs went missing (#740).
@router.get("/campaigns/{campaign_id}/combat-scenarios")
async def get_combat_scenarios(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    scenarios = await db.combat_scenarios.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return serialise_records(CombatScenario, scenarios, required={'campaign_id': campaign_id, 'name': 'Untitled encounter'})

@router.get("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}", response_model=CombatScenario)
async def get_combat_scenario(campaign_id: str, scenario_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    scenario = await db.combat_scenarios.find_one({'id': scenario_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return scenario

@router.put("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}", response_model=CombatScenario)
async def update_combat_scenario(campaign_id: str, scenario_id: str, scenario_data: CombatScenarioUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    # A null map_url is an intentional removal (switching from an image to
    # textured terrain). Unset optional fields still mean "leave unchanged".
    # Preserve the previous partial-update contract for other nullable keys.
    update_dict = {
        key: value for key, value in scenario_data.model_dump(exclude_unset=True).items()
        if value is not None or key == 'map_url'
    }
    result = await db.combat_scenarios.update_one(
        {'id': scenario_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    
    scenario = await db.combat_scenarios.find_one({'id': scenario_id}, {'_id': 0})
    return scenario

@router.delete("/campaigns/{campaign_id}/combat-scenarios/{scenario_id}")
async def delete_combat_scenario(campaign_id: str, scenario_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.combat_scenarios.delete_one({'id': scenario_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return {'message': 'Combat scenario deleted successfully'}

# ==================== LOCATIONS ROUTES ====================


@router.post("/campaigns/{campaign_id}/initiative", response_model=Initiative)
async def create_initiative(campaign_id: str, init_data: InitiativeCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    # Set previous initiatives to inactive
    await db.initiatives.update_many(
        {'campaign_id': campaign_id},
        {'$set': {'is_active': False}}
    )
    
    init_dict = init_data.model_dump()
    init_obj = Initiative(campaign_id=campaign_id, **init_dict)
    doc = init_obj.model_dump()
    await db.initiatives.insert_one(doc)
    return init_obj

@router.get("/campaigns/{campaign_id}/initiative", response_model=Optional[Initiative])
async def get_active_initiative(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    initiative = await db.initiatives.find_one(
        {'campaign_id': campaign_id, 'is_active': True},
        {'_id': 0}
    )
    return initiative

@router.put("/campaigns/{campaign_id}/initiative/{initiative_id}", response_model=Initiative)
async def update_initiative(campaign_id: str, initiative_id: str, init_data: InitiativeUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in init_data.model_dump().items() if v is not None}
    result = await db.initiatives.update_one(
        {'id': initiative_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    
    initiative = await db.initiatives.find_one({'id': initiative_id}, {'_id': 0})
    return initiative

@router.delete("/campaigns/{campaign_id}/initiative/{initiative_id}")
async def delete_initiative(campaign_id: str, initiative_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.initiatives.delete_one({'id': initiative_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    return {'message': 'Initiative deleted successfully'}

# ==================== MAP ROUTES ====================
