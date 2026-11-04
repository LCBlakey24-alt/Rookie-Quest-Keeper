"""Deny-by-default route access for child accounts.

A child account is created by a parent, has no email, and is meant to reach
its own character sheet and the table it is playing at -- nothing else.

Enforcing that per route would not hold. `get_current_user` returns only a
username, so nothing downstream knows a child is calling, and there are
several hundred authenticated routes across dozens of files. Listing what a
child may *not* reach means missing some today and leaving every route added
later open by default.

So the rule is inverted here, in one place: a child's token reaches only
what this module names. A new route is closed to children until someone
adds it below, with a test. That is the failure mode worth having.

Two properties of this gate matter:

* It only ever removes access. A request it permits still goes through the
  route's own authentication and ownership checks exactly as before, so
  allowing a path here does not hand a child somebody else's data -- the
  character routes already match on `user_id`.
* It is fail-closed for children and fail-open for authentication. A token
  it cannot read is passed along untouched for the route to reject, because
  this gate must never be the thing that decides someone is signed in.
"""

from typing import Iterable, Optional, Tuple

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from config import JWT_ALGORITHM, JWT_SECRET

CHILD_ACCOUNT_TYPE = 'child'
ADULT_ACCOUNT_TYPE = 'adult'

# Claim name kept short because it rides on every request.
ACCOUNT_TYPE_CLAIM = 'typ'

READ = ('GET', 'HEAD', 'OPTIONS')
WRITE = ('POST', 'PUT', 'PATCH')

# (path prefix, allowed methods). A child's request must match one of these.
#
# This list is deliberately short. Nothing here is load-bearing for an adult
# account, and no child accounts exist yet, so starting closed costs nothing
# and opening it one feature at a time is reviewable. Anything absent is
# denied, including routes that do not exist yet.
CHILD_ALLOWED: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    # Signing in and out, and changing their own password. Account
    # management proper -- email, deletion, anything that spends money --
    # lives under /user and /admin and is not here.
    ('/auth/login', WRITE),
    ('/auth/logout', WRITE),
    ('/auth/me', READ),
    ('/auth/change-password', WRITE),

    # Their own character sheets. The handlers already match on user_id, so
    # a child cannot read or edit anyone else's through these.
    ('/characters', READ + WRITE),
    ('/progression', READ + WRITE),

    # Reference data needed to build and level a character. Read-only.
    ('/srd', READ),
    ('/rule-systems', READ),
    ('/rulesets', READ),
    ('/character-templates', READ),

    # The table: following Live Play and confirming what the shared screen
    # showed them. Publishing to that screen stays with the GM.
    ('/campaigns/display-state', READ),
    ('/player', READ),
    ('/dashboard', READ),
)

# Named so the reason for each refusal can be logged or tested without
# re-deriving it from the allowlist.
CHILD_DENIED_REASON = 'This account cannot use that part of Rookie Quest Keeper.'


def _normalise(path: str) -> str:
    """Strip the /api mount and any trailing slash, so rules read cleanly."""
    trimmed = path or '/'
    if trimmed.startswith('/api/'):
        trimmed = trimmed[4:]
    elif trimmed == '/api':
        trimmed = '/'
    return trimmed.rstrip('/') or '/'


def _display_state_path(path: str) -> bool:
    """`/campaigns/{id}/display-state` and its ack, for any campaign id.

    Live Play is read through a campaign-scoped path, so a plain prefix
    cannot express it without also opening the other 240-odd campaign
    routes.
    """
    parts = [part for part in path.split('/') if part]
    if len(parts) < 3 or parts[0] != 'campaigns':
        return False
    tail = parts[2:]
    return tail == ['display-state'] or tail == ['display-state', 'ack']


def child_may_reach(method: str, path: str) -> bool:
    """True when a child account is allowed to make this request."""
    verb = (method or '').upper()
    target = _normalise(path)

    if _display_state_path(target):
        # The ack is a write; reading the state is not.
        return verb in READ or (verb in WRITE and target.endswith('/ack'))

    for prefix, methods in CHILD_ALLOWED:
        if prefix == '/campaigns/display-state':
            continue
        if verb not in methods:
            continue
        if target == prefix or target.startswith(prefix + '/'):
            return True
    return False


def account_type_from_token(token: Optional[str]) -> Optional[str]:
    """The account type a bearer token claims, or None if it cannot be read.

    No database lookup: the type is a claim, so the gate costs nothing per
    request. A converted account is handled the same way a password change
    already is -- `token_version` invalidates the old token.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    claimed = payload.get(ACCOUNT_TYPE_CLAIM)
    return str(claimed) if claimed else ADULT_ACCOUNT_TYPE


def bearer_token(headers) -> Optional[str]:
    raw = headers.get('authorization') or headers.get('Authorization') or ''
    scheme, _, value = raw.partition(' ')
    if scheme.lower() != 'bearer':
        return None
    return value.strip() or None


class ChildAccountMiddleware(BaseHTTPMiddleware):
    """Refuse anything a child account is not explicitly allowed to reach."""

    async def dispatch(self, request: Request, call_next):
        token = bearer_token(request.headers)
        if account_type_from_token(token) != CHILD_ACCOUNT_TYPE:
            return await call_next(request)

        if child_may_reach(request.method, request.url.path):
            return await call_next(request)

        return JSONResponse(status_code=403, content={'detail': CHILD_DENIED_REASON})


def allowed_prefixes() -> Iterable[str]:
    """For tests and for showing a parent what a child account can do."""
    return tuple(prefix for prefix, _ in CHILD_ALLOWED)
