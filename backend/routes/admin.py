"""Admin routes: user management, reviews, custom creatures."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, ADMIN_USERNAMES, logger
from utils.auth import get_current_user
from models import (
    Review, ReviewCreate, CustomCreature, CustomCreatureCreate, SiteSettingsUpdate,
)

router = APIRouter()


async def verify_admin(username: str):
    # Case-insensitive match so capitalized usernames (e.g. "LCBlakey24") still pass
    admins = {a.lower() for a in ADMIN_USERNAMES}
    if not username or username.lower() not in admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

@router.get("/admin/users")
async def admin_get_users(username: str = Depends(get_current_user)):
    """Admin endpoint to list all users."""
    await verify_admin(username)
    
    users = []
    async for user in db.users.find({}, {'_id': 0, 'password_hash': 0}):
        users.append({
            'username': user.get('username'),
            'email': user.get('email'),
            'created_at': user.get('created_at')
        })
    
    return users

# ============== REVIEWS ==============

@router.post("/reviews")
async def create_review(review_data: ReviewCreate, username: str = Depends(get_current_user)):
    """Submit a review (authenticated users only)"""
    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user already submitted a review
    existing = await db.reviews.find_one({'username': username})
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a review. You can edit your existing review.")
    
    # Auto-approve 4-5 star reviews
    is_approved = review_data.rating >= 4
    is_featured = review_data.rating >= 4  # Auto-feature high ratings
    
    review = Review(
        username=username,
        rating=review_data.rating,
        comment=review_data.comment,
        is_approved=is_approved,
        is_featured=is_featured
    )
    
    await db.reviews.insert_one(review.model_dump())
    return {"message": "Thank you for your review!", "is_featured": is_featured}

@router.put("/reviews")
async def update_review(review_data: ReviewCreate, username: str = Depends(get_current_user)):
    """Update user's own review"""
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    existing = await db.reviews.find_one({'username': username})
    if not existing:
        raise HTTPException(status_code=404, detail="You haven't submitted a review yet")
    
    # Re-evaluate approval based on new rating
    is_approved = review_data.rating >= 4
    is_featured = review_data.rating >= 4
    
    await db.reviews.update_one(
        {'username': username},
        {'$set': {
            'rating': review_data.rating,
            'comment': review_data.comment,
            'is_approved': is_approved,
            'is_featured': is_featured
        }}
    )
    return {"message": "Review updated!", "is_featured": is_featured}

@router.get("/reviews/mine")
async def get_my_review(username: str = Depends(get_current_user)):
    """Get the current user's review if they have one"""
    review = await db.reviews.find_one({'username': username}, {'_id': 0})
    return review

@router.get("/reviews/featured")
async def get_featured_reviews():
    """Get featured reviews for landing page (public endpoint)"""
    reviews = await db.reviews.find(
        {'is_featured': True, 'is_approved': True},
        {'_id': 0, 'username': 1, 'rating': 1, 'comment': 1, 'created_at': 1}
    ).sort('created_at', -1).limit(6).to_list(6)
    return reviews

@router.get("/reviews/all")
async def get_all_reviews(username: str = Depends(get_current_user)):
    """Get all reviews (admin only)"""
    await verify_admin(username)
    reviews = await db.reviews.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return reviews

@router.put("/reviews/{review_id}/approve")
async def toggle_review_approval(review_id: str, username: str = Depends(get_current_user)):
    """Toggle review approval status (admin only)"""
    await verify_admin(username)
    
    review = await db.reviews.find_one({'id': review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    new_status = not review.get('is_approved', False)
    await db.reviews.update_one(
        {'id': review_id},
        {'$set': {'is_approved': new_status, 'is_featured': new_status}}
    )
    return {"message": f"Review {'approved' if new_status else 'hidden'}", "is_approved": new_status}

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, username: str = Depends(get_current_user)):
    """Delete a review (admin only)"""
    await verify_admin(username)
    
    result = await db.reviews.delete_one({'id': review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

# ============== CUSTOM CREATURES ==============

@router.get("/campaigns/{campaign_id}/custom-creatures")
async def get_custom_creatures(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all custom creatures for a campaign"""
    creatures = await db.custom_creatures.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('name', 1).to_list(500)
    return creatures

@router.post("/campaigns/{campaign_id}/custom-creatures")
async def create_custom_creature(campaign_id: str, creature_data: CustomCreatureCreate, username: str = Depends(get_current_user)):
    """Create a new custom creature"""
    creature = CustomCreature(
        campaign_id=campaign_id,
        name=creature_data.name,
        cr=creature_data.cr,
        hp=creature_data.hp,
        ac=creature_data.ac,
        type=creature_data.type,
        size=creature_data.size,
        speed=creature_data.speed,
        abilities=creature_data.abilities,
        description=creature_data.description,
        created_by=username
    )
    await db.custom_creatures.insert_one(creature.model_dump())
    return {"message": "Custom creature created!", "creature": creature.model_dump()}

@router.put("/campaigns/{campaign_id}/custom-creatures/{creature_id}")
async def update_custom_creature(campaign_id: str, creature_id: str, creature_data: CustomCreatureCreate, username: str = Depends(get_current_user)):
    """Update a custom creature"""
    result = await db.custom_creatures.update_one(
        {'id': creature_id, 'campaign_id': campaign_id},
        {'$set': {
            'name': creature_data.name,
            'cr': creature_data.cr,
            'hp': creature_data.hp,
            'ac': creature_data.ac,
            'type': creature_data.type,
            'size': creature_data.size,
            'speed': creature_data.speed,
            'abilities': creature_data.abilities,
            'description': creature_data.description
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Creature not found")
    return {"message": "Creature updated!"}

@router.delete("/campaigns/{campaign_id}/custom-creatures/{creature_id}")
async def delete_custom_creature(campaign_id: str, creature_id: str, username: str = Depends(get_current_user)):
    """Delete a custom creature"""
    result = await db.custom_creatures.delete_one({'id': creature_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Creature not found")
    return {"message": "Creature deleted!"}

@router.post("/campaigns/{campaign_id}/custom-creatures/import")
async def import_custom_creatures(campaign_id: str, creatures: list[CustomCreatureCreate], username: str = Depends(get_current_user)):
    """Import multiple custom creatures from CSV/JSON data"""
    imported = []
    for creature_data in creatures:
        creature = CustomCreature(
            campaign_id=campaign_id,
            name=creature_data.name,
            cr=creature_data.cr,
            hp=creature_data.hp,
            ac=creature_data.ac,
            type=creature_data.type,
            size=creature_data.size,
            speed=creature_data.speed,
            abilities=creature_data.abilities,
            description=creature_data.description,
            created_by=username
        )
        await db.custom_creatures.insert_one(creature.model_dump())
        imported.append(creature.name)
    return {"message": f"Imported {len(imported)} creatures!", "imported": imported}

# ==================== ADMIN ROUTES ====================





@router.get("/site-settings")
async def get_public_site_settings():
    """Public subset of site settings for runtime UX controls."""
    doc = await db.site_settings.find_one({'id': 'global'}, {'_id': 0}) or {}
    return {
        'announcement_enabled': bool(doc.get('announcement_enabled', False)),
        'announcement_text': str(doc.get('announcement_text', ''))[:240],
        'maintenance_mode': bool(doc.get('maintenance_mode', False)),
    }

@router.get("/admin/overview")
async def admin_overview(username: str = Depends(get_current_user)):
    """Admin-only high-level site metrics for dashboard controls."""
    await verify_admin(username)
    users_count = await db.users.count_documents({})
    campaigns_count = await db.campaigns.count_documents({})
    characters_count = await db.characters.count_documents({})
    reviews_count = await db.reviews.count_documents({})
    approved_reviews_count = await db.reviews.count_documents({'is_approved': True})
    return {
        'users_count': users_count,
        'campaigns_count': campaigns_count,
        'characters_count': characters_count,
        'reviews_count': reviews_count,
        'approved_reviews_count': approved_reviews_count,
    }


@router.get("/admin/site-settings")
async def get_admin_site_settings(username: str = Depends(get_current_user)):
    """Admin-only site settings control panel."""
    await verify_admin(username)
    doc = await db.site_settings.find_one({'id': 'global'}, {'_id': 0})
    return doc or {
        'id': 'global',
        'announcement_enabled': False,
        'announcement_text': '',
        'maintenance_mode': False,
    }


@router.put("/admin/site-settings")
async def update_admin_site_settings(payload: SiteSettingsUpdate, username: str = Depends(get_current_user)):
    """Admin-only update for site-level runtime settings."""
    await verify_admin(username)
    allowed = {
        'announcement_enabled': payload.announcement_enabled,
        'announcement_text': payload.announcement_text.strip()[:240],
        'maintenance_mode': payload.maintenance_mode,
        'updated_by': username,
    }
    await db.site_settings.update_one({'id': 'global'}, {'$set': allowed, '$setOnInsert': {'id': 'global'}}, upsert=True)
    doc = await db.site_settings.find_one({'id': 'global'}, {'_id': 0})
    return {'message': 'Site settings updated', 'settings': doc}

@router.get("/admin/check")
async def check_admin_status(username: str = Depends(get_current_user)):
    """Check if current user is admin"""
    admins = {a.lower() for a in ADMIN_USERNAMES}
    return {"is_admin": username.lower() in admins}

# ==================== IMPERSONATION ====================

@router.post("/admin/users/{target_username}/impersonate")
async def admin_impersonate_user(target_username: str, username: str = Depends(get_current_user)):
    """Admin-only: issue a short-lived JWT for the target user so support can
    reproduce their view. The client should stash its current token before swapping."""
    await verify_admin(username)
    target = await db.users.find_one({'username': target_username}, {'_id': 0})
    if not target:
        # Try by email as a fallback for convenience
        target = await db.users.find_one({'email': target_username}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    from utils.auth import create_token
    token = create_token(target['username'])
    logger.info(f"Admin {username} impersonating {target['username']}")
    return {
        "token": token,
        "username": target['username'],
        "email": target.get('email'),
        "impersonated_by": username
    }


# ==================== CSV EXPORT ====================

def _csv_escape(value) -> str:
    if value is None:
        return ""
    s = str(value)
    if any(ch in s for ch in [',', '"', '\n', '\r']):
        return '"' + s.replace('"', '""') + '"'
    return s


@router.get("/admin/export/users.csv")
async def admin_export_users_csv(username: str = Depends(get_current_user)):
    """Admin-only: stream a CSV of all users."""
    from fastapi.responses import StreamingResponse
    await verify_admin(username)

    async def gen():
        header = ["username", "email", "created_at"]
        yield ",".join(header) + "\n"
        async for user in db.users.find({}, {'_id': 0, 'password_hash': 0}):
            row = [
                _csv_escape(user.get('username')),
                _csv_escape(user.get('email')),
                _csv_escape(user.get('created_at')),
            ]
            yield ",".join(row) + "\n"

    return StreamingResponse(
        gen(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="rook-users.csv"'}
    )


@router.get("/admin/export/campaigns.csv")
async def admin_export_campaigns_csv(username: str = Depends(get_current_user)):
    """Admin-only: stream a CSV of all campaigns."""
    from fastapi.responses import StreamingResponse
    await verify_admin(username)

    async def gen():
        header = ["id", "name", "dm_user_id", "system", "rules_edition",
                  "setting", "player_count", "created_at", "updated_at"]
        yield ",".join(header) + "\n"
        async for c in db.campaigns.find({}, {'_id': 0}):
            players = c.get('players') or []
            row = [
                _csv_escape(c.get('id')),
                _csv_escape(c.get('name')),
                _csv_escape(c.get('dm_user_id')),
                _csv_escape(c.get('system')),
                _csv_escape(c.get('rules_edition', '2024')),
                _csv_escape(c.get('setting')),
                _csv_escape(len(players) if isinstance(players, list) else 0),
                _csv_escape(c.get('created_at')),
                _csv_escape(c.get('updated_at')),
            ]
            yield ",".join(row) + "\n"

    return StreamingResponse(
        gen(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="rook-campaigns.csv"'}
    )

