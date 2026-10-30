"""Rule system routes: CRUD, content management, bulk upload, rulesets."""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from utils.uploads import read_upload_capped
from config import db, logger
from utils.auth import get_current_user, is_admin, verify_campaign_ownership
from models import (
    RuleSystem, RuleSystemCreate, GameClass, GameSubclass, GameRace,
    ClassLevelFeature, GameSpell, GameItem, GameFeat, GameMonster,
    ContentUpload, RulesetUpload, CustomRuleset
)
from typing import Optional, Dict, Any, List
import uuid
import json
from datetime import datetime, timezone

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

router = APIRouter()


async def initialize_rule_systems():
    """Create default generic rule systems if none exist."""
    existing = await db.rule_systems.count_documents({})
    if existing > 0:
        return
    
    generic_skills = [
        {"name": "Acrobatics", "ability": "Dexterity"},
        {"name": "Animal Handling", "ability": "Wisdom"},
        {"name": "Arcana", "ability": "Intelligence"},
        {"name": "Athletics", "ability": "Strength"},
        {"name": "Deception", "ability": "Charisma"},
        {"name": "History", "ability": "Intelligence"},
        {"name": "Insight", "ability": "Wisdom"},
        {"name": "Intimidation", "ability": "Charisma"},
        {"name": "Investigation", "ability": "Intelligence"},
        {"name": "Medicine", "ability": "Wisdom"},
        {"name": "Nature", "ability": "Intelligence"},
        {"name": "Perception", "ability": "Wisdom"},
        {"name": "Performance", "ability": "Charisma"},
        {"name": "Persuasion", "ability": "Charisma"},
        {"name": "Religion", "ability": "Intelligence"},
        {"name": "Sleight of Hand", "ability": "Dexterity"},
        {"name": "Stealth", "ability": "Dexterity"},
        {"name": "Survival", "ability": "Wisdom"},
    ]
    
    starter_system = RuleSystem(
        id="starter-fantasy",
        name="Fantasy d20 System",
        short_code="fantasy_d20",
        description="A generic d20 fantasy rule system. Upload your own classes, races, spells, and more!",
        is_official=False,
        owner_id=None,
        skills=generic_skills,
    )
    
    await db.rule_systems.insert_one(starter_system.model_dump())
    from config import logger
    logger.info("Initialized starter rule system (Fantasy d20)")

@router.get("/rule-systems")
async def get_rule_systems(username: str = Depends(get_current_user)):
    """Get all available rule systems (official + user's custom)"""
    systems = await db.rule_systems.find(
        {'$or': [{'is_official': True}, {'owner_id': username}]},
        {'_id': 0}
    ).to_list(100)
    return {"systems": systems}

@router.get("/rule-systems/{system_id}")
async def get_rule_system(system_id: str, username: str = Depends(get_current_user)):
    """Get a specific rule system with all its content counts"""
    system = await db.rule_systems.find_one({'id': system_id}, {'_id': 0})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    
    counts = {
        'classes': await db.game_classes.count_documents({'system_id': system_id}),
        'subclasses': await db.game_subclasses.count_documents({'system_id': system_id}),
        'races': await db.game_races.count_documents({'system_id': system_id}),
        'spells': await db.game_spells.count_documents({'system_id': system_id}),
        'items': await db.game_items.count_documents({'system_id': system_id}),
        'feats': await db.game_feats.count_documents({'system_id': system_id}),
        'monsters': await db.game_monsters.count_documents({'system_id': system_id}),
        'features': await db.class_level_features.count_documents({'system_id': system_id}),
    }
    return {"system": system, "content_counts": counts}

@router.post("/rule-systems", status_code=status.HTTP_201_CREATED)
async def create_rule_system(system_data: RuleSystemCreate, username: str = Depends(get_current_user)):
    """Create a new custom rule system"""
    existing = await db.rule_systems.find_one({'short_code': system_data.short_code})
    if existing:
        raise HTTPException(status_code=400, detail="A system with this short code already exists")
    
    system = RuleSystem(**system_data.model_dump(), is_official=False, owner_id=username)
    doc = system.model_dump()
    await db.rule_systems.insert_one(doc)
    doc.pop('_id', None)
    return doc

@router.put("/rule-systems/{system_id}")
async def update_rule_system(system_id: str, update_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a custom rule system (only owner can update)"""
    system = await db.rule_systems.find_one({'id': system_id})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    if system.get('is_official'):
        raise HTTPException(status_code=403, detail="Cannot modify official rule systems")
    if system.get('owner_id') != username:
        raise HTTPException(status_code=403, detail="Only the owner can modify this rule system")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.rule_systems.update_one({'id': system_id}, {'$set': update_data})
    updated = await db.rule_systems.find_one({'id': system_id}, {'_id': 0})
    return updated


# ==================== CONTENT ROUTES ====================

@router.get("/rule-systems/{system_id}/classes")
async def get_system_classes(system_id: str, username: str = Depends(get_current_user)):
    classes = await db.game_classes.find({'system_id': system_id}, {'_id': 0}).to_list(100)
    return {"classes": classes}

@router.get("/rule-systems/{system_id}/classes/{class_id}")
async def get_class_details(system_id: str, class_id: str, username: str = Depends(get_current_user)):
    game_class = await db.game_classes.find_one({'id': class_id, 'system_id': system_id}, {'_id': 0})
    if not game_class:
        raise HTTPException(status_code=404, detail="Class not found")
    subclasses = await db.game_subclasses.find({'class_id': class_id, 'system_id': system_id}, {'_id': 0}).to_list(50)
    features = await db.class_level_features.find({'class_id': class_id, 'system_id': system_id}, {'_id': 0}).sort('level', 1).to_list(100)
    return {"class": game_class, "subclasses": subclasses, "features": features}

@router.get("/rule-systems/{system_id}/races")
async def get_system_races(system_id: str, username: str = Depends(get_current_user)):
    races = await db.game_races.find({'system_id': system_id}, {'_id': 0}).to_list(100)
    return {"races": races}

@router.get("/rule-systems/{system_id}/spells")
async def get_system_spells(system_id: str, class_name: Optional[str] = None, level: Optional[int] = None, username: str = Depends(get_current_user)):
    query = {'system_id': system_id}
    if class_name:
        query['classes'] = class_name
    if level is not None:
        query['level'] = level
    spells = await db.game_spells.find(query, {'_id': 0}).sort('level', 1).to_list(1000)
    return {"spells": spells}

@router.get("/rule-systems/{system_id}/items")
async def get_system_items(system_id: str, item_type: Optional[str] = None, username: str = Depends(get_current_user)):
    query = {'system_id': system_id}
    if item_type:
        query['type'] = item_type
    items = await db.game_items.find(query, {'_id': 0}).to_list(1000)
    return {"items": items}

@router.get("/rule-systems/{system_id}/feats")
async def get_system_feats(system_id: str, username: str = Depends(get_current_user)):
    feats = await db.game_feats.find({'system_id': system_id}, {'_id': 0}).to_list(200)
    return {"feats": feats}

@router.get("/rule-systems/{system_id}/monsters")
async def get_system_monsters(system_id: str, cr: Optional[str] = None, username: str = Depends(get_current_user)):
    query = {'system_id': system_id}
    if cr:
        query['challenge_rating'] = cr
    monsters = await db.game_monsters.find(query, {'_id': 0}).to_list(1000)
    return {"monsters": monsters}


# ==================== BULK UPLOAD ROUTES ====================

@router.post("/rule-systems/{system_id}/upload")
async def bulk_upload_content(system_id: str, upload: ContentUpload, username: str = Depends(get_current_user)):
    """Bulk upload content to a rule system"""
    system = await db.rule_systems.find_one({'id': system_id})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    
    # Only the owner or an admin may write into a rule system. Unowned systems
    # (such as the seeded starter system) are shared with everyone, so they are
    # admin-only: otherwise any account could overwrite rules all users see.
    is_admin_user = await is_admin(username)
    is_owner = bool(system.get('owner_id')) and system.get('owner_id') == username

    if not (is_admin_user or is_owner):
        raise HTTPException(status_code=403, detail="You don't have permission to upload to this rule system")
    
    collection_map = {
        'classes': db.game_classes,
        'subclasses': db.game_subclasses,
        'races': db.game_races,
        'spells': db.game_spells,
        'items': db.game_items,
        'feats': db.game_feats,
        'monsters': db.game_monsters,
        'features': db.class_level_features,
    }
    
    if upload.content_type not in collection_map:
        raise HTTPException(status_code=400, detail=f"Invalid content type: {upload.content_type}")
    
    collection = collection_map[upload.content_type]
    created, updated, errors = 0, 0, []
    
    for i, item in enumerate(upload.data):
        try:
            item['system_id'] = system_id
            if 'id' not in item:
                item['id'] = str(uuid.uuid4())
            if 'created_at' not in item:
                item['created_at'] = datetime.now(timezone.utc).isoformat()
            
            existing = await collection.find_one({'system_id': system_id, 'name': item.get('name', '')})
            if existing:
                if upload.overwrite_existing:
                    await collection.update_one({'system_id': system_id, 'name': item['name']}, {'$set': item})
                    updated += 1
                else:
                    errors.append(f"Item {i}: '{item.get('name', 'Unknown')}' already exists")
            else:
                await collection.insert_one(item)
                created += 1
        except Exception as e:
            errors.append(f"Item {i}: {str(e)}")
    
    return {"success": len(errors) == 0, "content_type": upload.content_type, "total_records": len(upload.data), "created": created, "updated": updated, "errors": errors}

@router.post("/rule-systems/{system_id}/upload-file")
async def upload_content_file(system_id: str, content_type: str, file: UploadFile = File(...), overwrite: bool = False, username: str = Depends(get_current_user)):
    """Upload content from a JSON or CSV file"""
    system = await db.rule_systems.find_one({'id': system_id})
    if not system:
        raise HTTPException(status_code=404, detail="Rule system not found")
    
    # Only the owner or an admin may write into a rule system. Unowned systems
    # (such as the seeded starter system) are shared with everyone, so they are
    # admin-only: otherwise any account could overwrite rules all users see.
    is_admin_user = await is_admin(username)
    is_owner = bool(system.get('owner_id')) and system.get('owner_id') == username

    if not (is_admin_user or is_owner):
        raise HTTPException(status_code=403, detail="You don't have permission to upload to this rule system")
    
    content = await read_upload_capped(file)
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
        elif filename.endswith('.csv'):
            import csv
            import io
            reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
            data = list(reader)
            for item in data:
                for key, value in item.items():
                    if isinstance(value, str):
                        if value.isdigit():
                            item[key] = int(value)
                        elif value.replace('.', '').isdigit():
                            item[key] = float(value)
                        elif value.lower() == 'true':
                            item[key] = True
                        elif value.lower() == 'false':
                            item[key] = False
        else:
            raise HTTPException(status_code=400, detail="File must be .json or .csv")
        
        if not isinstance(data, list):
            data = [data]
        
        upload = ContentUpload(system_id=system_id, content_type=content_type, data=data, overwrite_existing=overwrite)
        return await bulk_upload_content(system_id, upload, username)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")


# ==================== AI WITH RULE SYSTEM AWARENESS ====================

@router.post("/rulesets")
async def upload_custom_ruleset(ruleset: RulesetUpload, username: str = Depends(get_current_user)):
    """Upload a custom ruleset (classes, races, spells, etc.)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate rules_type
    valid_types = ["classes", "races", "spells", "items", "feats", "backgrounds", "full", "monsters"]
    if ruleset.rules_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid rules_type. Must be one of: {valid_types}")
    
    new_ruleset = CustomRuleset(
        owner_id=str(user.get("_id")),
        name=ruleset.name,
        description=ruleset.description,
        rules_type=ruleset.rules_type,
        content=ruleset.content,
        is_public=ruleset.is_public
    )
    
    await db.custom_rulesets.insert_one(new_ruleset.model_dump())
    
    return {"message": "Ruleset uploaded successfully", "ruleset_id": new_ruleset.id}

@router.get("/rulesets")
async def get_user_rulesets(username: str = Depends(get_current_user)):
    """Get all rulesets available to the user (owned + shared + public)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user.get("_id"))
    
    # Get owned rulesets
    owned = await db.custom_rulesets.find({"owner_id": user_id}).to_list(100)
    
    # Get rulesets shared with user
    shared = await db.custom_rulesets.find({"shared_with": user_id}).to_list(100)
    
    # Get public rulesets
    public = await db.custom_rulesets.find({"is_public": True, "owner_id": {"$ne": user_id}}).to_list(50)
    
    # Clean _id from results
    for r in owned + shared + public:
        r.pop("_id", None)
    
    return {
        "owned": owned,
        "shared": shared,
        "public": public
    }

@router.get("/rulesets/{ruleset_id}")
async def get_ruleset(ruleset_id: str, username: str = Depends(get_current_user)):
    """Get a specific ruleset"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user.get("_id"))
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    # Check access
    is_owner = ruleset.get("owner_id") == user_id
    is_shared = user_id in ruleset.get("shared_with", [])
    is_public = ruleset.get("is_public", False)
    
    if not (is_owner or is_shared or is_public):
        raise HTTPException(status_code=403, detail="Access denied")
    
    ruleset.pop("_id", None)
    return ruleset

@router.put("/rulesets/{ruleset_id}")
async def update_ruleset(ruleset_id: str, updates: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update a ruleset (owner only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    if ruleset.get("owner_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only owner can update ruleset")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.custom_rulesets.update_one({"id": ruleset_id}, {"$set": updates})
    
    return {"message": "Ruleset updated"}

@router.delete("/rulesets/{ruleset_id}")
async def delete_ruleset(ruleset_id: str, username: str = Depends(get_current_user)):
    """Delete a ruleset (owner only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    if ruleset.get("owner_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only owner can delete ruleset")
    
    await db.custom_rulesets.delete_one({"id": ruleset_id})
    return {"message": "Ruleset deleted"}

@router.post("/rulesets/{ruleset_id}/share")
async def share_ruleset(ruleset_id: str, share_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Share a ruleset with users or campaigns"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
    if not ruleset:
        raise HTTPException(status_code=404, detail="Ruleset not found")
    
    if ruleset.get("owner_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only owner can share ruleset")
    
    updates = {}
    
    # Share with specific users
    if "user_ids" in share_data:
        current_shared = ruleset.get("shared_with", [])
        new_shared = list(set(current_shared + share_data["user_ids"]))
        updates["shared_with"] = new_shared
    
    # Share with campaigns
    if "campaign_ids" in share_data:
        current_campaigns = ruleset.get("shared_campaigns", [])
        new_campaigns = list(set(current_campaigns + share_data["campaign_ids"]))
        updates["shared_campaigns"] = new_campaigns
    
    if updates:
        await db.custom_rulesets.update_one({"id": ruleset_id}, {"$set": updates})
    
    return {"message": "Ruleset sharing updated"}


# ==================== CAMPAIGN INVITE/JOIN ENDPOINTS ====================
