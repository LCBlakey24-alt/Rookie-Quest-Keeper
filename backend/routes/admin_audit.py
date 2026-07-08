"""Admin audit log routes for owner/admin actions."""
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import ADMIN_USERNAMES, db
from utils.auth import get_current_user

router = APIRouter()


class AuditLogCreate(BaseModel):
    action: str = Field(..., min_length=3, max_length=120)
    area: str = Field(default="admin", max_length=80)
    target_id: str = Field(default="", max_length=180)
    target_label: str = Field(default="", max_length=180)
    detail: str = Field(default="", max_length=1200)


async def verify_admin(username: str):
    admins = {name.lower() for name in ADMIN_USERNAMES}
    if not username or username.lower() not in admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def safe_audit_entry(doc: dict) -> dict:
    safe = dict(doc or {})
    safe.pop('_id', None)
    safe.setdefault('id', '')
    safe.setdefault('action', '')
    safe.setdefault('area', 'admin')
    safe.setdefault('target_id', '')
    safe.setdefault('target_label', '')
    safe.setdefault('detail', '')
    safe.setdefault('admin_username', '')
    safe.setdefault('created_at', '')
    return safe


@router.get("/admin/audit-log")
async def get_admin_audit_log(limit: int = 100, area: str = "all", username: str = Depends(get_current_user)):
    await verify_admin(username)
    safe_limit = max(10, min(limit, 300))
    query = {}
    if area and area != "all":
        query["area"] = area
    entries = await db.admin_audit_log.find(query, {'_id': 0}).sort('created_at', -1).to_list(safe_limit)
    return [safe_audit_entry(entry) for entry in entries]


@router.post("/admin/audit-log")
async def create_admin_audit_log(payload: AuditLogCreate, username: str = Depends(get_current_user)):
    await verify_admin(username)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        'id': str(uuid.uuid4()),
        'admin_username': username,
        'action': payload.action.strip(),
        'area': payload.area.strip() or 'admin',
        'target_id': payload.target_id.strip(),
        'target_label': payload.target_label.strip(),
        'detail': payload.detail.strip(),
        'created_at': now,
    }
    await db.admin_audit_log.insert_one(doc)
    return safe_audit_entry(doc)
