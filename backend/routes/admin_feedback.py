"""Focused admin feedback reads and exports with feedback/testing separation."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from config import ADMIN_USERNAMES, db
from utils.auth import get_current_user

router = APIRouter()


testing_note_query = {
    '$or': [
        {'category': 'testing'},
        {'area': {'$in': ['testing', 'mobile-testing']}},
        {'title': {'$regex': r'\[test\]', '$options': 'i'}},
    ]
}

user_feedback_query = {
    '$nor': [
        {'category': 'testing'},
        {'area': {'$in': ['testing', 'mobile-testing']}},
        {'title': {'$regex': r'\[test\]', '$options': 'i'}},
    ]
}


async def verify_admin(username: str):
    admins = {name.lower() for name in ADMIN_USERNAMES}
    if not username or username.lower() not in admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def build_feedback_query(status_filter: Optional[str] = None, kind: str = "all") -> dict:
    query = {}
    if kind == "feedback":
        query.update(user_feedback_query)
    elif kind == "testing":
        query.update(testing_note_query)

    if status_filter and status_filter != 'all':
        query['status'] = status_filter
    return query


def _csv_escape(value) -> str:
    if value is None:
        return ""
    s = str(value)
    if any(ch in s for ch in [',', '"', '\n', '\r']):
        return '"' + s.replace('"', '""') + '"'
    return s


@router.get("/admin/feedback")
async def admin_get_feedback(status_filter: Optional[str] = None, kind: str = "all", username: str = Depends(get_current_user)):
    """Admin-only list of feedback, optionally separated into user feedback or testing notes."""
    await verify_admin(username)
    query = build_feedback_query(status_filter, kind)
    items = await db.improvement_feedback.find(query, {'_id': 0}).sort('created_at', -1).to_list(300)
    return items


@router.get("/admin/export/feedback.csv")
async def admin_export_feedback_csv(kind: str = "feedback", username: str = Depends(get_current_user)):
    """Admin-only CSV export for user feedback by default, or testing/all when requested."""
    await verify_admin(username)
    query = build_feedback_query('all', kind)
    filename = "rook-feedback.csv" if kind == "feedback" else "rook-testing-notes.csv" if kind == "testing" else "rook-feedback-all.csv"

    async def gen():
        header = ["id", "created_at", "username", "category", "area", "priority", "status", "page_path", "title", "message", "admin_notes"]
        yield ",".join(header) + "\n"
        async for item in db.improvement_feedback.find(query, {'_id': 0}).sort('created_at', -1):
            row = [
                _csv_escape(item.get('id')),
                _csv_escape(item.get('created_at')),
                _csv_escape(item.get('username')),
                _csv_escape(item.get('category')),
                _csv_escape(item.get('area')),
                _csv_escape(item.get('priority')),
                _csv_escape(item.get('status')),
                _csv_escape(item.get('page_path')),
                _csv_escape(item.get('title')),
                _csv_escape(item.get('message')),
                _csv_escape(item.get('admin_notes')),
            ]
            yield ",".join(row) + "\n"

    return StreamingResponse(
        gen(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
