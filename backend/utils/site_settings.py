"""Server-side checks for the admin site switches.

The admin page saves these switches in ``site_settings`` (``id: 'global'``).
They used to be display-only; routes that create things now read them here.
"""
from fastapi import HTTPException, status

from config import db

SIGNUPS_PAUSED = "New sign-ups are paused right now. Existing players can still sign in."


async def signups_enabled() -> bool:
    """True unless an admin has switched new sign-ups off (default on)."""
    doc = await db.site_settings.find_one({'id': 'global'}, {'_id': 0, 'signup_enabled': 1})
    if not doc or 'signup_enabled' not in doc:
        return True
    return doc.get('signup_enabled') is not False


async def require_signups_enabled() -> None:
    if not await signups_enabled():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=SIGNUPS_PAUSED)
