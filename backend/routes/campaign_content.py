"""Campaign content routes: races, classes, subclasses, backgrounds, feats, bulk upload."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership, verify_campaign_membership
from models import (
    BulkContentUpload, CampaignRuleset, CampaignRulesetCreate,
    CampaignRace, CampaignRaceCreate, CampaignClass, CampaignClassCreate,
    CampaignSubclass, CampaignSubclassCreate, CampaignBackground, CampaignBackgroundCreate,
    CampaignFeat, CampaignFeatCreate
)
from typing import Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.post("/campaigns/{campaign_id}/content/bulk-upload")
async def bulk_upload_campaign_content(campaign_id: str, data: BulkContentUpload, username: str = Depends(get_current_user)):
    """Upload a complete ruleset with races, classes, subclasses, backgrounds, and feats"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Check for potential duplicates and warn the user
    warnings = []
    
    # Check existing race names
    existing_races = await db.campaign_races.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_race_names = {r['name'].lower() for r in existing_races}
    for race_data in data.races:
        if race_data.name.lower() in existing_race_names:
            warnings.append(f"Race '{race_data.name}' already exists - will create duplicate")
    
    # Check existing class names
    existing_classes = await db.campaign_classes.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_class_names = {c['name'].lower() for c in existing_classes}
    
    # Check existing subclasses
    existing_subclasses = await db.campaign_subclasses.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_subclass_names = {s['name'].lower() for s in existing_subclasses}
    
    # Check existing backgrounds  
    existing_backgrounds = await db.campaign_backgrounds.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_background_names = {b['name'].lower() for b in existing_backgrounds}
    
    # Check existing feats
    existing_feats = await db.campaign_feats.find({'campaign_id': campaign_id}, {'name': 1, '_id': 0}).to_list(1000)
    existing_feat_names = {f['name'].lower() for f in existing_feats}
    
    # Track skipped items
    skipped = {"races": [], "classes": [], "subclasses": [], "backgrounds": [], "feats": []}
    
    # Create the ruleset
    ruleset = CampaignRuleset(
        campaign_id=campaign_id,
        name=data.ruleset_name,
        description=data.ruleset_description,
        created_by=username
    )
    await db.campaign_rulesets.insert_one(ruleset.model_dump())
    ruleset_id = ruleset.id
    
    counts = {"races": 0, "classes": 0, "subclasses": 0, "backgrounds": 0, "feats": 0}
    
    # Add races (skip duplicates)
    for race_data in data.races:
        if race_data.name.lower() in existing_race_names:
            skipped["races"].append(race_data.name)
            continue
        race_dict = race_data.model_dump()
        race_dict.pop('ruleset_id', None)
        race = CampaignRace(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **race_dict
        )
        await db.campaign_races.insert_one(race.model_dump())
        counts["races"] += 1
    
    # Add classes (skip duplicates)
    for class_data in data.classes:
        if class_data.name.lower() in existing_class_names:
            skipped["classes"].append(class_data.name)
            continue
        class_dict = class_data.model_dump()
        class_dict.pop('ruleset_id', None)
        cls = CampaignClass(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **class_dict
        )
        await db.campaign_classes.insert_one(cls.model_dump())
        counts["classes"] += 1
    
    # Add subclasses (skip duplicates)
    for subclass_data in data.subclasses:
        if subclass_data.name.lower() in existing_subclass_names:
            skipped["subclasses"].append(subclass_data.name)
            continue
        subclass_dict = subclass_data.model_dump()
        subclass_dict.pop('ruleset_id', None)
        subclass = CampaignSubclass(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **subclass_dict
        )
        await db.campaign_subclasses.insert_one(subclass.model_dump())
        counts["subclasses"] += 1
    
    # Add backgrounds (skip duplicates)
    for bg_data in data.backgrounds:
        if bg_data.name.lower() in existing_background_names:
            skipped["backgrounds"].append(bg_data.name)
            continue
        bg_dict = bg_data.model_dump()
        bg_dict.pop('ruleset_id', None)
        background = CampaignBackground(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **bg_dict
        )
        await db.campaign_backgrounds.insert_one(background.model_dump())
        counts["backgrounds"] += 1
    
    # Add feats (skip duplicates)
    for feat_data in data.feats:
        if feat_data.name.lower() in existing_feat_names:
            skipped["feats"].append(feat_data.name)
            continue
        feat_dict = feat_data.model_dump()
        feat_dict.pop('ruleset_id', None)
        feat = CampaignFeat(
            campaign_id=campaign_id,
            ruleset_id=ruleset_id,
            created_by=username,
            **feat_dict
        )
        await db.campaign_feats.insert_one(feat.model_dump())
        counts["feats"] += 1
    
    # Build skipped message
    skipped_items = []
    category_singular = {"races": "race", "classes": "class", "subclasses": "subclass", "backgrounds": "background", "feats": "feat"}
    for category, items in skipped.items():
        if items:
            skipped_items.extend([f"{name} ({category_singular[category]})" for name in items])
    
    # Calculate total uploaded vs skipped
    total_uploaded = sum(counts.values())
    total_skipped = len(skipped_items)
    
    return {
        "message": f"Ruleset '{data.ruleset_name}' uploaded! {total_uploaded} items added" + (f", {total_skipped} duplicates skipped" if total_skipped > 0 else ""),
        "ruleset_id": ruleset_id,
        "counts": counts,
        "skipped": skipped if total_skipped > 0 else None,
        "skipped_summary": skipped_items if total_skipped > 0 else None
    }

@router.get("/campaigns/{campaign_id}/content")
async def get_campaign_content(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all available character creation content for a campaign (for players and GMs)"""
    await verify_campaign_membership(campaign_id, username)
    
    # Get all rulesets
    rulesets = []
    async for rs in db.campaign_rulesets.find({'campaign_id': campaign_id, 'is_active': True}, {'_id': 0}):
        rulesets.append(rs)
    
    # Get all races
    races = []
    async for race in db.campaign_races.find({'campaign_id': campaign_id}, {'_id': 0}):
        races.append(race)
    
    # Get all classes
    classes = []
    async for cls in db.campaign_classes.find({'campaign_id': campaign_id}, {'_id': 0}):
        classes.append(cls)
    
    # Get all subclasses
    subclasses = []
    async for sub in db.campaign_subclasses.find({'campaign_id': campaign_id}, {'_id': 0}):
        subclasses.append(sub)
    
    # Get all backgrounds
    backgrounds = []
    async for bg in db.campaign_backgrounds.find({'campaign_id': campaign_id}, {'_id': 0}):
        backgrounds.append(bg)
    
    # Get all feats
    feats = []
    async for feat in db.campaign_feats.find({'campaign_id': campaign_id}, {'_id': 0}):
        feats.append(feat)
    
    return {
        "rulesets": rulesets,
        "races": races,
        "classes": classes,
        "subclasses": subclasses,
        "backgrounds": backgrounds,
        "feats": feats,
        "has_custom_content": len(races) > 0 or len(classes) > 0
    }

@router.get("/campaigns/{campaign_id}/content/races")
async def get_campaign_races(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all races available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    races = []
    async for race in db.campaign_races.find({'campaign_id': campaign_id}, {'_id': 0}):
        races.append(race)
    
    return {"races": races, "count": len(races)}

@router.get("/campaigns/{campaign_id}/content/classes")
async def get_campaign_classes(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all classes available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    classes = []
    async for cls in db.campaign_classes.find({'campaign_id': campaign_id}, {'_id': 0}):
        classes.append(cls)
    
    return {"classes": classes, "count": len(classes)}

@router.get("/campaigns/{campaign_id}/content/subclasses")
async def get_campaign_subclasses(campaign_id: str, parent_class: Optional[str] = None, username: str = Depends(get_current_user)):
    """Get all subclasses available in a campaign, optionally filtered by parent class"""
    await verify_campaign_membership(campaign_id, username)
    
    query = {'campaign_id': campaign_id}
    if parent_class:
        query['parent_class'] = parent_class
    
    subclasses = []
    async for sub in db.campaign_subclasses.find(query, {'_id': 0}):
        subclasses.append(sub)
    
    return {"subclasses": subclasses, "count": len(subclasses)}

@router.get("/campaigns/{campaign_id}/content/backgrounds")
async def get_campaign_backgrounds(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all backgrounds available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    backgrounds = []
    async for bg in db.campaign_backgrounds.find({'campaign_id': campaign_id}, {'_id': 0}):
        backgrounds.append(bg)
    
    return {"backgrounds": backgrounds, "count": len(backgrounds)}

@router.get("/campaigns/{campaign_id}/content/feats")
async def get_campaign_feats(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all feats available in a campaign"""
    await verify_campaign_membership(campaign_id, username)
    
    feats = []
    async for feat in db.campaign_feats.find({'campaign_id': campaign_id}, {'_id': 0}):
        feats.append(feat)
    
    return {"feats": feats, "count": len(feats)}

# Individual content addition endpoints (for adding one at a time)
@router.post("/campaigns/{campaign_id}/content/races")
async def add_campaign_race(campaign_id: str, data: CampaignRaceCreate, username: str = Depends(get_current_user)):
    """Add a custom race to a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    race = CampaignRace(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_races.insert_one(race.model_dump())
    
    return {"message": f"Race '{data.name}' added", "id": race.id}

@router.post("/campaigns/{campaign_id}/content/classes")
async def add_campaign_class(campaign_id: str, data: CampaignClassCreate, username: str = Depends(get_current_user)):
    """Add a custom class to a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    cls = CampaignClass(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_classes.insert_one(cls.model_dump())
    
    return {"message": f"Class '{data.name}' added", "id": cls.id}

@router.post("/campaigns/{campaign_id}/content/subclasses")
async def add_campaign_subclass(campaign_id: str, data: CampaignSubclassCreate, username: str = Depends(get_current_user)):
    """Add a custom subclass to a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    subclass = CampaignSubclass(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_subclasses.insert_one(subclass.model_dump())
    
    return {"message": f"Subclass '{data.name}' added for {data.parent_class}", "id": subclass.id}

@router.post("/campaigns/{campaign_id}/content/backgrounds")
async def add_campaign_background(campaign_id: str, data: CampaignBackgroundCreate, username: str = Depends(get_current_user)):
    """Add a custom background to a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    background = CampaignBackground(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_backgrounds.insert_one(background.model_dump())
    
    return {"message": f"Background '{data.name}' added", "id": background.id}

@router.post("/campaigns/{campaign_id}/content/feats")
async def add_campaign_feat(campaign_id: str, data: CampaignFeatCreate, username: str = Depends(get_current_user)):
    """Add a custom feat to a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    feat = CampaignFeat(
        campaign_id=campaign_id,
        created_by=username,
        **data.model_dump()
    )
    await db.campaign_feats.insert_one(feat.model_dump())
    
    return {"message": f"Feat '{data.name}' added", "id": feat.id}

# Delete content (GM or creator only)
@router.delete("/campaigns/{campaign_id}/content/{content_type}/{content_id}")
async def delete_campaign_content(campaign_id: str, content_type: str, content_id: str, username: str = Depends(get_current_user)):
    """Delete campaign content (races, classes, subclasses, backgrounds, feats, or rulesets)"""
    campaign = await verify_campaign_membership(campaign_id, username)
    
    collection_map = {
        'races': db.campaign_races,
        'classes': db.campaign_classes,
        'subclasses': db.campaign_subclasses,
        'backgrounds': db.campaign_backgrounds,
        'feats': db.campaign_feats,
        'rulesets': db.campaign_rulesets
    }
    
    if content_type not in collection_map:
        raise HTTPException(status_code=400, detail=f"Invalid content type. Must be one of: {', '.join(collection_map.keys())}")
    
    collection = collection_map[content_type]
    
    # Check if user is GM or creator
    content = await collection.find_one({'id': content_id, 'campaign_id': campaign_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    is_gm = campaign.get('dm_user_id') == username
    is_creator = content.get('created_by') == username
    
    if not is_gm and not is_creator:
        raise HTTPException(status_code=403, detail="Only the GM or creator can delete this content")
    
    # If deleting a ruleset, also delete all associated content
    if content_type == 'rulesets':
        ruleset_id = content_id
        await db.campaign_races.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_classes.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_subclasses.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_backgrounds.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
        await db.campaign_feats.delete_many({'campaign_id': campaign_id, 'ruleset_id': ruleset_id})
    
    await collection.delete_one({'id': content_id, 'campaign_id': campaign_id})
    
    return {"message": f"{content_type[:-1].title()} deleted successfully"}

# ==================== GODS ROUTES ====================
