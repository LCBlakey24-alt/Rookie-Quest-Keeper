"""Campaign routes: CRUD, settings, custom rules, invites, members."""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from config import db, logger
from utils.auth import (
    get_current_user, verify_campaign_ownership, verify_campaign_membership,
    get_user_subscription
)
from models import (
    Campaign, CampaignCreate, CampaignSetting, CampaignSettingUpdate,
    CampaignWorldSettingUpdate, CustomRulesUpload, CampaignInvite, CampaignMember,
    CustomRuleset, SUBSCRIPTION_PLANS
)
from typing import List, Optional, Dict, Any
import uuid
import secrets
import json
from datetime import datetime, timezone
from utils.ws_manager import ws_manager

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

router = APIRouter()

@router.post("/campaigns", response_model=Campaign, status_code=status.HTTP_201_CREATED)
async def create_campaign(campaign_data: CampaignCreate, username: str = Depends(get_current_user)):
    # Check subscription tier limits
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free') if subscription else 'free'
    tier_limits = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    # Count existing campaigns owned by user
    campaign_count = await db.campaigns.count_documents({'dm_user_id': username})
    
    # Check campaign limit (-1 means unlimited)
    campaign_limit = tier_limits.get('campaigns', 0)
    if campaign_limit != -1 and campaign_count >= campaign_limit:
        tier_name = tier_limits.get('name', 'Free')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "campaign_limit_reached",
                "message": f"Your {tier_name} plan allows {campaign_limit} campaign(s). Upgrade to Quest Master or Legendary for unlimited campaigns!",
                "current_count": campaign_count,
                "limit": campaign_limit,
                "upgrade_tier": "gm"
            }
        )
    
    campaign_dict = campaign_data.model_dump()
    campaign_obj = Campaign(dm_user_id=username, **campaign_dict)
    doc = campaign_obj.model_dump()
    await db.campaigns.insert_one(doc)
    return campaign_obj

@router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(username: str = Depends(get_current_user)):
    campaigns = await db.campaigns.find({'dm_user_id': username}, {'_id': 0}).to_list(1000)
    return campaigns

@router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign

@router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign_data: CampaignCreate, username: str = Depends(get_current_user)):
    result = await db.campaigns.update_one(
        {'id': campaign_id, 'dm_user_id': username},
        {'$set': campaign_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    return campaign

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, username: str = Depends(get_current_user)):
    result = await db.campaigns.delete_one({'id': campaign_id, 'dm_user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return {'message': 'Campaign deleted successfully'}

# ==================== CAMPAIGN SETTING ROUTES ====================

@router.get("/campaigns/{campaign_id}/setting", response_model=Optional[CampaignSetting])
async def get_campaign_setting(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    setting = await db.campaign_settings.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not setting:
        # Create default setting
        setting_obj = CampaignSetting(campaign_id=campaign_id, content="")
        doc = setting_obj.model_dump()
        await db.campaign_settings.insert_one(doc)
        return setting_obj
    # Ensure dm_rules has a default value if null in DB (for backward compatibility)
    if setting.get('dm_rules') is None:
        setting['dm_rules'] = ""
    if setting.get('content') is None:
        setting['content'] = ""
    return setting

@router.put("/campaigns/{campaign_id}/setting", response_model=CampaignSetting)
async def update_campaign_setting(campaign_id: str, setting_data: CampaignSettingUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    # Build update data, excluding None values
    update_data = {k: v for k, v in setting_data.model_dump().items() if v is not None}
    
    result = await db.campaign_settings.update_one(
        {'campaign_id': campaign_id},
        {
            '$set': update_data,
            '$setOnInsert': {
                'campaign_id': campaign_id,
                'id': str(uuid.uuid4()),
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    setting = await db.campaign_settings.find_one({'campaign_id': campaign_id}, {'_id': 0})
    # Ensure dm_rules and content have default values if null in DB
    if setting:
        if setting.get('dm_rules') is None:
            setting['dm_rules'] = ""
        if setting.get('content') is None:
            setting['content'] = ""
    return setting

@router.put("/campaigns/{campaign_id}/world-setting")
async def update_campaign_world_setting(campaign_id: str, data: CampaignWorldSettingUpdate, username: str = Depends(get_current_user)):
    """Update campaign's tone label and GM-provided AI context."""
    await verify_campaign_ownership(campaign_id, username)
    
    valid_settings = ['high_fantasy', 'magipunk_noir', 'classic_fantasy', 'epic_fantasy', 'gothic_horror', 'fantasy_space', 'planar_adventure', 'custom']
    if data.world_setting not in valid_settings:
        raise HTTPException(status_code=400, detail=f"Invalid world setting. Must be one of: {', '.join(valid_settings)}")
    
    await db.campaigns.update_one(
        {'id': campaign_id},
        {'$set': {
            'world_setting': data.world_setting,
            'world_setting_notes': data.world_setting_notes
        }}
    )
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    
    # Human-readable names for settings
    setting_names = {
        'high_fantasy': 'High Fantasy',
        'magipunk_noir': 'Magipunk/Noir',
        'classic_fantasy': 'Classic Sword & Sorcery',
        'epic_fantasy': 'Epic Fantasy',
        'gothic_horror': 'Gothic Horror',
        'fantasy_space': 'Fantasy Space',
        'planar_adventure': 'Planar Adventures',
        'custom': 'Custom Setting'
    }
    
    return {
        "message": f"World tone updated to {setting_names.get(data.world_setting, data.world_setting)}",
        "world_setting": data.world_setting,
        "world_setting_name": setting_names.get(data.world_setting, data.world_setting),
        "world_setting_notes": data.world_setting_notes
    }

# ==================== CUSTOM RULES UPLOAD ====================

@router.post("/campaigns/{campaign_id}/custom-rules")
async def upload_custom_rules(campaign_id: str, data: CustomRulesUpload, username: str = Depends(get_current_user)):
    """Upload custom rules/rulebook content for AI to reference - any campaign member can upload"""
    await verify_campaign_membership(campaign_id, username)
    
    # Check content size (limit to ~500KB of text to avoid huge AI context)
    max_chars = 500000
    if len(data.content) > max_chars:
        raise HTTPException(
            status_code=400, 
            detail=f"Rules content too large. Maximum {max_chars} characters (~500KB). Consider uploading key sections only."
        )
    
    rule_doc = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': data.name,
        'content': data.content,
        'source_type': data.source_type,
        'char_count': len(data.content),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': username
    }
    
    await db.campaign_custom_rules.insert_one(rule_doc)
    
    return {
        "message": f"Rules '{data.name}' uploaded successfully",
        "id": rule_doc['id'],
        "name": data.name,
        "char_count": len(data.content),
        "source_type": data.source_type,
        "uploaded_by": username
    }

@router.get("/campaigns/{campaign_id}/custom-rules")
async def get_custom_rules(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all custom rules for a campaign - any campaign member can view"""
    await verify_campaign_membership(campaign_id, username)
    
    rules = []
    async for rule in db.campaign_custom_rules.find({'campaign_id': campaign_id}, {'_id': 0, 'content': 0}):
        rules.append(rule)
    
    return {
        "rules": rules,
        "total_count": len(rules)
    }

@router.get("/campaigns/{campaign_id}/custom-rules/{rule_id}")
async def get_custom_rule_detail(campaign_id: str, rule_id: str, username: str = Depends(get_current_user)):
    """Get a specific custom rule with full content - any campaign member can view"""
    await verify_campaign_membership(campaign_id, username)
    
    rule = await db.campaign_custom_rules.find_one({'id': rule_id, 'campaign_id': campaign_id}, {'_id': 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rules not found")
    
    return rule

@router.delete("/campaigns/{campaign_id}/custom-rules/{rule_id}")
async def delete_custom_rules(campaign_id: str, rule_id: str, username: str = Depends(get_current_user)):
    """Delete custom rules - only the uploader or GM can delete"""
    campaign = await verify_campaign_membership(campaign_id, username)
    
    # Check if user is the uploader or the GM
    rule = await db.campaign_custom_rules.find_one({'id': rule_id, 'campaign_id': campaign_id}, {'_id': 0, 'created_by': 1})
    if not rule:
        raise HTTPException(status_code=404, detail="Rules not found")
    
    # Allow deletion if user is GM or the one who uploaded
    is_gm = campaign.get('dm_user_id') == username
    is_uploader = rule.get('created_by') == username
    
    if not is_gm and not is_uploader:
        raise HTTPException(status_code=403, detail="Only the uploader or GM can delete these rules")
    
    await db.campaign_custom_rules.delete_one({'id': rule_id, 'campaign_id': campaign_id})
    
    return {"message": "Rules deleted successfully"}

@router.post("/campaigns/{campaign_id}/custom-rules/upload-file")
async def upload_rules_file(campaign_id: str, file: UploadFile, username: str = Depends(get_current_user)):
    """Upload a rules file (TXT, MD, or PDF) - any campaign member can upload"""
    await verify_campaign_membership(campaign_id, username)
    
    # Check file type
    allowed_extensions = ['.txt', '.md', '.pdf']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 10MB)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")
    
    # Extract text based on file type
    if file_ext == '.pdf':
        try:
            import io
            # Try to extract text from PDF
            try:
                import fitz  # PyMuPDF
                pdf_doc = fitz.open(stream=content, filetype="pdf")
                text_content = ""
                for page in pdf_doc:
                    text_content += page.get_text()
                pdf_doc.close()
            except ImportError:
                # Fallback: store as base64 with note
                raise HTTPException(
                    status_code=400, 
                    detail="PDF extraction not available. Please copy/paste the text content manually, or upload a .txt file."
                )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {str(e)}")
    else:
        # TXT or MD file
        try:
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            text_content = content.decode('latin-1')
    
    # Check extracted content size
    max_chars = 500000
    if len(text_content) > max_chars:
        raise HTTPException(
            status_code=400,
            detail=f"Extracted content too large ({len(text_content)} chars). Maximum {max_chars} characters. Consider uploading key sections only."
        )
    
    # Save to database
    rule_doc = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'name': file.filename,
        'content': text_content,
        'source_type': 'file_upload',
        'original_filename': file.filename,
        'char_count': len(text_content),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': username
    }
    
    await db.campaign_custom_rules.insert_one(rule_doc)
    
    return {
        "message": f"Rules from '{file.filename}' uploaded successfully",
        "id": rule_doc['id'],
        "name": file.filename,
        "char_count": len(text_content),
        "source_type": "file_upload"
    }

@router.get("/campaigns/{campaign_id}/world-setting")
async def get_campaign_world_setting(campaign_id: str, username: str = Depends(get_current_user)):
    """Get campaign's world tone label and GM-provided context."""
    await verify_campaign_ownership(campaign_id, username)
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'world_setting': 1, 'world_setting_notes': 1, 'name': 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    setting_names = {
        'high_fantasy': 'High Fantasy',
        'magipunk_noir': 'Magipunk/Noir',
        'classic_fantasy': 'Classic Sword & Sorcery',
        'epic_fantasy': 'Epic Fantasy',
        'gothic_horror': 'Gothic Horror',
        'fantasy_space': 'Fantasy Space',
        'planar_adventure': 'Planar Adventures',
        'custom': 'Custom Setting'
    }
    
    world_setting = campaign.get('world_setting', 'custom')
    
    return {
        "world_setting": world_setting,
        "world_setting_name": setting_names.get(world_setting, 'Custom Setting'),
        "world_setting_notes": campaign.get('world_setting_notes', ''),
        "available_settings": [
            {"id": "high_fantasy", "name": "High Fantasy", "description": "Tone only - classic heroic fantasy"},
            {"id": "magipunk_noir", "name": "Magipunk/Noir", "description": "Tone only - magic, industry, intrigue"},
            {"id": "classic_fantasy", "name": "Classic Sword & Sorcery", "description": "Tone only - gritty adventure and ruins"},
            {"id": "epic_fantasy", "name": "Epic Fantasy", "description": "Tone only - grand stakes and heroic arcs"},
            {"id": "gothic_horror", "name": "Gothic Horror", "description": "Tone only - dread, tragedy, monsters"},
            {"id": "fantasy_space", "name": "Fantasy Space", "description": "Tone only - magical travel beyond one world"},
            {"id": "planar_adventure", "name": "Planar Adventures", "description": "Tone only - portals and strange realms"},
            {"id": "custom", "name": "Custom Setting", "description": "Use only your saved homebrew notes"}
        ]
    }

@router.post("/campaigns/{campaign_id}/invite")
async def create_campaign_invite(campaign_id: str, invite_data: Dict[str, Any] = None, username: str = Depends(get_current_user)):
    """Create an invite link for a campaign (GM only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("dm_user_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only GM can create invites")
    
    invite_data = invite_data or {}
    
    invite = CampaignInvite(
        campaign_id=campaign_id,
        created_by=str(user.get("_id")),
        max_uses=invite_data.get("max_uses"),
        expires_at=(datetime.now(timezone.utc) + timedelta(days=invite_data.get("expires_days", 7))).isoformat() if invite_data.get("expires_days") else None
    )
    
    await db.campaign_invites.insert_one(invite.model_dump())
    
    return {
        "invite_code": invite.code,
        "invite_url": f"/join/{invite.code}",
        "expires_at": invite.expires_at
    }

@router.post("/campaigns/join/{invite_code}")
async def join_campaign_by_invite(invite_code: str, username: str = Depends(get_current_user)):
    """Join a campaign using an invite code"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user.get("_id"))
    
    invite = await db.campaign_invites.find_one({"code": invite_code})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Check expiration
    if invite.get("expires_at"):
        if datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invite has expired")
    
    # Check max uses
    if invite.get("max_uses") and invite.get("uses", 0) >= invite["max_uses"]:
        raise HTTPException(status_code=400, detail="Invite has reached max uses")
    
    campaign_id = invite["campaign_id"]
    
    # Check if already a member
    existing = await db.campaign_members.find_one({"campaign_id": campaign_id, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this campaign")
    
    # Get campaign details
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Can't join your own campaign as a player
    if campaign.get("dm_user_id") == user_id:
        raise HTTPException(status_code=400, detail="You are the GM of this campaign")
    
    # Get rulesets shared with this campaign
    shared_rulesets = await db.custom_rulesets.find({"shared_campaigns": campaign_id}).to_list(50)
    shared_ruleset_ids = [r["id"] for r in shared_rulesets]
    
    # Create membership
    member = CampaignMember(
        campaign_id=campaign_id,
        user_id=user_id,
        username=user.get("username", user.get("email")),
        shared_rulesets=shared_ruleset_ids
    )
    
    await db.campaign_members.insert_one(member.model_dump())
    
    # Update invite uses
    await db.campaign_invites.update_one({"code": invite_code}, {"$inc": {"uses": 1}})
    
    # Copy shared rulesets to user's shared list
    for ruleset_id in shared_ruleset_ids:
        await db.custom_rulesets.update_one(
            {"id": ruleset_id},
            {"$addToSet": {"shared_with": user_id}}
        )
    
    # Notify GM via WebSocket if connected
    await ws_manager.send_to_user(campaign.get("dm_user_id"), {
        "type": "player_joined",
        "campaign_id": campaign_id,
        "player": {
            "user_id": user_id,
            "username": user.get("username")
        }
    })
    
    return {
        "message": "Successfully joined campaign",
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "shared_rulesets": shared_ruleset_ids
    }

@router.get("/campaigns/{campaign_id}/members")
async def get_campaign_members(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all members of a campaign"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    members = await db.campaign_members.find({"campaign_id": campaign_id}).to_list(100)
    for m in members:
        m.pop("_id", None)
    
    # Add GM info
    gm_user = await db.users.find_one({"_id": campaign.get("dm_user_id")}) if campaign.get("dm_user_id") else None
    
    return {
        "gm": {
            "user_id": campaign.get("dm_user_id"),
            "username": gm_user.get("username") if gm_user else "Unknown"
        },
        "members": members,
        "online_users": list(ws_manager.get_campaign_users(campaign_id))
    }

@router.post("/campaigns/{campaign_id}/share-rulesets")
async def share_rulesets_with_campaign(campaign_id: str, data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Share rulesets with all members of a campaign (GM only)"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("dm_user_id") != str(user.get("_id")):
        raise HTTPException(status_code=403, detail="Only GM can share rulesets")
    
    ruleset_ids = data.get("ruleset_ids", [])
    
    # Verify ownership of rulesets
    for ruleset_id in ruleset_ids:
        ruleset = await db.custom_rulesets.find_one({"id": ruleset_id})
        if not ruleset or ruleset.get("owner_id") != str(user.get("_id")):
            raise HTTPException(status_code=403, detail=f"Cannot share ruleset {ruleset_id}")
    
    # Get all campaign members
    members = await db.campaign_members.find({"campaign_id": campaign_id}).to_list(100)
    member_ids = [m["user_id"] for m in members]
    
    # Share rulesets with campaign and all members
    for ruleset_id in ruleset_ids:
        await db.custom_rulesets.update_one(
            {"id": ruleset_id},
            {
                "$addToSet": {
                    "shared_campaigns": campaign_id,
                    "shared_with": {"$each": member_ids}
                }
            }
        )
        
        # Update each member's shared_rulesets
        await db.campaign_members.update_many(
            {"campaign_id": campaign_id},
            {"$addToSet": {"shared_rulesets": ruleset_id}}
        )
    
    # Notify all members via WebSocket
    await ws_manager.broadcast_to_campaign(campaign_id, {
        "type": "rulesets_shared",
        "ruleset_ids": ruleset_ids,
        "from_gm": True
    })
    
    return {"message": f"Shared {len(ruleset_ids)} rulesets with campaign members"}

@router.post("/rulesets/upload-file")
async def upload_ruleset_file(file: UploadFile = File(...), username: str = Depends(get_current_user)):
    """Upload a JSON file containing custom rules"""
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be a JSON file")
    
    # Read and parse the file
    try:
        content = await file.read()
        rules_data = json.loads(content.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    
    # Determine rules type from content
    rules_type = "full"
    if "classes" in rules_data and len(rules_data) == 1:
        rules_type = "classes"
    elif "races" in rules_data and len(rules_data) == 1:
        rules_type = "races"
    elif "spells" in rules_data and len(rules_data) == 1:
        rules_type = "spells"
    elif "feats" in rules_data and len(rules_data) == 1:
        rules_type = "feats"
    elif "backgrounds" in rules_data and len(rules_data) == 1:
        rules_type = "backgrounds"
    elif "monsters" in rules_data and len(rules_data) == 1:
        rules_type = "monsters"
    
    # Create the ruleset
    new_ruleset = CustomRuleset(
        owner_id=str(user.get("_id")),
        name=file.filename.replace('.json', ''),
        description=f"Uploaded from {file.filename}",
        rules_type=rules_type,
        content=rules_data,
        is_public=False
    )
    
    await db.custom_rulesets.insert_one(new_ruleset.model_dump())
    
    return {
        "message": "Ruleset uploaded successfully",
        "ruleset_id": new_ruleset.id,
        "rules_type": rules_type,
        "name": new_ruleset.name
    }
