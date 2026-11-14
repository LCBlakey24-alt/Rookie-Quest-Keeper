"""Authenticated privacy-rights request intake and admin review.

Submitting a request is not automatic erasure, legal completion, identity
verification or a substitute for other valid request channels.
"""
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from config import db
from utils.auth import get_current_user
from utils.admin_identity import require_admin

router = APIRouter()

RightType = Literal[
    'access', 'correction', 'deletion', 'portability',
    'restriction', 'objection', 'other',
]
ReviewStatus = Literal['received', 'in_review', 'needs_information', 'responded', 'closed']

class PrivacyRightsRequestCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_type: RightType
    # Store the minimum possible context; never request identity documents
    # or credential information through this unencrypted free-text field.
    details: str = Field(default='', max_length=1000)

class PrivacyRightsRequestUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    status: ReviewStatus
    admin_notes: str = Field(default='', max_length=1200)
    public_note: str = Field(default='', max_length=500)

def visible_request(doc: dict) -> dict:
    """Public response allowlist: no admin notes, staff names or database ids."""
    return {key: doc.get(key) for key in (
        'id', 'request_type', 'details', 'status', 'created_at',
        'updated_at', 'public_note', 'responded_at',
    )}

def admin_request(doc: dict) -> dict:
    """The staff-only review view remains narrow (no unrelated user records)."""
    return {key: doc.get(key) for key in (
        'id', 'username', 'request_type', 'details', 'status',
        'created_at', 'updated_at', 'admin_notes', 'public_note',
        'responded_at', 'updated_by',
    )}

@router.post('/privacy/requests', status_code=status.HTTP_202_ACCEPTED)
async def create_privacy_request(
    payload: PrivacyRightsRequestCreate,
    username: str = Depends(get_current_user),
):
    """Request receipt requires the real signed-in identity, never a body user id."""
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        'id': str(uuid.uuid4()),
        'username': username,
        'request_type': payload.request_type,
        'details': payload.details.strip(),
        'status': 'received',
        'created_at': now,
        'updated_at': now,
        'admin_notes': '',
        'public_note': '',
        'responded_at': None,
        'updated_by': None,
    }
    await db.privacy_rights_requests.insert_one(doc)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            'message': 'Your request has been received for review. This is not a decision or completed action.',
            'request': visible_request(doc),
        },
        headers={'Cache-Control': 'private, no-store', 'Pragma': 'no-cache'},
    )

@router.get('/privacy/requests')
async def list_my_privacy_requests(username: str = Depends(get_current_user)):
    """Never trust a username supplied by the browser or expose other accounts."""
    docs = await db.privacy_rights_requests.find(
        {'username': username}, {'_id': 0},
    ).sort('created_at', -1).to_list(100)
    return JSONResponse(
        content=[visible_request(doc) for doc in docs],
        headers={'Cache-Control': 'private, no-store', 'Pragma': 'no-cache'},
    )

@router.get('/admin/privacy/requests/summary')
async def admin_privacy_request_summary(username: str = Depends(get_current_user)):
    """A safe administrative action counter; no requester names are exposed."""
    await require_admin(username)
    pending = await db.privacy_rights_requests.count_documents({
        'status': {'$in': ['received', 'in_review', 'needs_information']},
    })
    return JSONResponse(
        content={'pending_count': pending},
        headers={'Cache-Control': 'private, no-store', 'Pragma': 'no-cache'},
    )

@router.get('/admin/privacy/requests')
async def list_admin_privacy_requests(username: str = Depends(get_current_user)):
    await require_admin(username)
    docs = await db.privacy_rights_requests.find(
        {}, {'_id': 0},
    ).sort('created_at', -1).to_list(200)
    return JSONResponse(
        content=[admin_request(doc) for doc in docs],
        headers={'Cache-Control': 'private, no-store', 'Pragma': 'no-cache'},
    )

@router.patch('/admin/privacy/requests/{request_id}')
async def update_admin_privacy_request(
    request_id: str,
    payload: PrivacyRightsRequestUpdate,
    username: str = Depends(get_current_user),
):
    await require_admin(username)
    now = datetime.now(timezone.utc).isoformat()
    update = {
        'status': payload.status,
        'admin_notes': payload.admin_notes.strip(),
        'public_note': payload.public_note.strip(),
        'updated_by': username,
        'updated_at': now,
        'responded_at': now if payload.status == 'responded' else None,
    }
    result = await db.privacy_rights_requests.update_one(
        {'id': request_id}, {'$set': update},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Privacy request not found')
    doc = await db.privacy_rights_requests.find_one(
        {'id': request_id}, {'_id': 0},
    )
    return JSONResponse(
        content=admin_request(doc),
        headers={'Cache-Control': 'private, no-store', 'Pragma': 'no-cache'},
    )
