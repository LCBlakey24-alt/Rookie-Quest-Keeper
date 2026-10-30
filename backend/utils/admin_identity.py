"""One place that decides who is an admin and which usernames can be claimed.

Admin names in ``ADMIN_USERNAMES`` are compared without case, so an existing
``LCBlakey24`` account matches a configured ``lcblakey24``. Usernames used to
be unique only with exact case, which let a new account register a look-alike
such as ``lcblakey24`` and inherit admin rights. Two rules close that gap:

* New sign-ups must not match a reserved name or an existing username in any
  letter case.
* For accounts created before that rule existed, only the earliest-created
  account holding an admin name is treated as the admin. A later look-alike
  account gets no admin rights even if it already exists.
"""
import re
from typing import Optional

from fastapi import HTTPException, status

from config import ADMIN_USERNAMES, RESERVED_USERNAMES, db

USERNAME_UNAVAILABLE = "Username already taken"


def username_key(username: Optional[str]) -> str:
    """Normalise a username for case-insensitive comparison."""
    return str(username or '').strip().lower()


def admin_name_matches(username: Optional[str]) -> bool:
    """True when the name is a configured admin name, ignoring case."""
    key = username_key(username)
    return bool(key) and key in {username_key(name) for name in ADMIN_USERNAMES}


def is_reserved_username(username: Optional[str]) -> bool:
    """True for admin names and other names nobody may register, ignoring case."""
    key = username_key(username)
    return bool(key) and key in {username_key(name) for name in RESERVED_USERNAMES}


def case_insensitive_username_query(username: str) -> dict:
    """Exact-name query that ignores letter case (the name is regex-escaped)."""
    return {'username': {'$regex': f'^{re.escape(str(username).strip())}$', '$options': 'i'}}


async def username_is_available(username: str) -> bool:
    """False when the name is reserved or already used in any letter case."""
    if is_reserved_username(username):
        return False
    existing = await db.users.find_one(case_insensitive_username_query(username), {'_id': 1})
    return existing is None


async def is_admin_username(username: Optional[str]) -> bool:
    """Return whether this exact account is the admin for its admin name.

    Only the earliest-created account whose name matches an admin name (in any
    case) counts. Accounts without ``created_at`` predate that field and are
    treated as the oldest.
    """
    if not admin_name_matches(username):
        return False
    holders = await db.users.find(
        case_insensitive_username_query(username),
        {'_id': 0, 'username': 1, 'created_at': 1},
    ).to_list(25)
    if not holders:
        return False
    canonical = min(holders, key=lambda user: str(user.get('created_at') or ''))
    return canonical.get('username') == username


async def require_admin(username: Optional[str]) -> None:
    """Raise 403 unless the user is the admin account."""
    if not await is_admin_username(username):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
