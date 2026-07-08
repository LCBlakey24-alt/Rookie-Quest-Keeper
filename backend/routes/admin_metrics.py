"""Richer admin overview metrics for Mission Control."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from config import ADMIN_USERNAMES, db
from utils.auth import get_current_user

router = APIRouter()


async def verify_admin(username: str):
    admins = {name.lower() for name in ADMIN_USERNAMES}
    if not username or username.lower() not in admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


testing_note_query = {
    '$or': [
        {'category': 'testing'},
        {'area': {'$in': ['testing', 'mobile-testing']}},
        {'title': {'$regex': r'\[test\]', '$options': 'i'}},
    ]
}

user_feedback_query = {
    '$and': [
        {'category': {'$ne': 'testing'}},
        {'area': {'$nin': ['testing', 'mobile-testing']}},
        {'title': {'$not': {'$regex': r'\[test\]', '$options': 'i'}}},
    ]
}


@router.get("/admin/mission-overview")
async def admin_mission_overview(username: str = Depends(get_current_user)):
    """Admin-only metrics used by the Mission Control landing area."""
    await verify_admin(username)

    users_count = await db.users.count_documents({})
    campaigns_count = await db.campaigns.count_documents({})
    characters_count = await db.player_characters.count_documents({})
    reviews_count = await db.reviews.count_documents({})
    approved_reviews_count = await db.reviews.count_documents({'is_approved': True})
    hidden_reviews_count = max(reviews_count - approved_reviews_count, 0)

    feedback_count = await db.improvement_feedback.count_documents(user_feedback_query)
    new_feedback_count = await db.improvement_feedback.count_documents({**user_feedback_query, 'status': 'new'})
    active_feedback_count = await db.improvement_feedback.count_documents({**user_feedback_query, 'status': {'$in': ['reviewing', 'planned', 'in_progress']}})
    done_feedback_count = await db.improvement_feedback.count_documents({**user_feedback_query, 'status': 'done'})

    testing_notes_count = await db.improvement_feedback.count_documents(testing_note_query)
    new_testing_notes_count = await db.improvement_feedback.count_documents({**testing_note_query, 'status': 'new'})
    active_testing_notes_count = await db.improvement_feedback.count_documents({**testing_note_query, 'status': {'$in': ['reviewing', 'planned', 'in_progress']}})
    done_testing_notes_count = await db.improvement_feedback.count_documents({**testing_note_query, 'status': 'done'})

    site_updates_count = await db.site_updates.count_documents({})
    published_site_updates_count = await db.site_updates.count_documents({'is_published': True, 'is_archived': {'$ne': True}})
    draft_site_updates_count = await db.site_updates.count_documents({'is_published': {'$ne': True}, 'is_archived': {'$ne': True}})
    pinned_site_updates_count = await db.site_updates.count_documents({'is_pinned': True, 'is_archived': {'$ne': True}})
    archived_site_updates_count = await db.site_updates.count_documents({'is_archived': True})

    audit_log_count = await db.admin_audit_log.count_documents({})
    recent_since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent_audit_count = await db.admin_audit_log.count_documents({'created_at': {'$gte': recent_since}})

    return {
        'users_count': users_count,
        'campaigns_count': campaigns_count,
        'characters_count': characters_count,
        'reviews_count': reviews_count,
        'approved_reviews_count': approved_reviews_count,
        'hidden_reviews_count': hidden_reviews_count,
        'feedback_count': feedback_count,
        'new_feedback_count': new_feedback_count,
        'active_feedback_count': active_feedback_count,
        'done_feedback_count': done_feedback_count,
        'testing_notes_count': testing_notes_count,
        'new_testing_notes_count': new_testing_notes_count,
        'active_testing_notes_count': active_testing_notes_count,
        'done_testing_notes_count': done_testing_notes_count,
        'site_updates_count': site_updates_count,
        'published_site_updates_count': published_site_updates_count,
        'draft_site_updates_count': draft_site_updates_count,
        'pinned_site_updates_count': pinned_site_updates_count,
        'archived_site_updates_count': archived_site_updates_count,
        'audit_log_count': audit_log_count,
        'recent_audit_count': recent_audit_count,
    }
