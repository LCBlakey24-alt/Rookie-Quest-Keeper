"""Who may hold a live campaign socket, and for how long.

The campaign WebSocket used to authenticate once, at connect, with
`verify_token` -- signature and expiry only. That accepted tokens the HTTP
API had already retired (password change, password reset, deleted account),
and once accepted a socket stayed authorised for as long as it stayed open,
even after the token expired or the player was removed from the campaign.
A socket that only listens never sends anything, so a check on incoming
messages would not have protected it either.

The policy here is the HTTP policy, applied to sockets:

* Connect: `authenticate_session_token` (the same function behind
  `get_current_user`) and `verify_campaign_membership`. Child accounts are
  refused: their access is deny-by-default and the live campaign channel is
  not on their allowlist (the HTTP child gate never sees WebSocket traffic,
  so without this the socket would be an accidental exception).
* While open: `watch_session` re-runs exactly the same checks every
  `REVALIDATE_SECONDS` and closes the socket at the token's own expiry
  without waiting for the next tick. A failed check removes the socket from
  the manager *before* closing it, so no broadcast reaches it afterwards.
* Immediately, where this process can see it: password change/reset and a
  GM changing a member's status close the affected sockets at once via
  `ws_manager`. Those hooks only reach sockets held by the same process; the
  periodic recheck is the guarantee across processes.

Revocation window: at most REVALIDATE_SECONDS (default 60s, bounded to
15-300s by `WS_REVALIDATE_SECONDS`). If the database cannot be reached for a
recheck the socket is given one more interval, then closed -- a brief blip
does not drop every table, and an outage cannot extend access indefinitely.
Cost: one indexed user lookup and one membership lookup per open socket per
interval.
"""
import asyncio
import os
import time
from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException

from utils.auth import authenticate_session_token, verify_campaign_membership
from utils.child_access import ACCOUNT_TYPE_CLAIM, CHILD_ACCOUNT_TYPE

# Application close codes (4000-4999 are reserved for applications).
CLOSE_UNAUTHENTICATED = 4001   # token missing, invalid, expired or revoked
CLOSE_FORBIDDEN = 4003         # signed in, but not allowed in this campaign
CLOSE_TRY_AGAIN = 1013         # server could not verify access right now

# Close reasons are fixed text: never the token, never an exception message.
REASON_UNAUTHENTICATED = "Sign in again to rejoin live play."
REASON_FORBIDDEN = "You no longer have access to this campaign's live play."
REASON_TRY_AGAIN = "Live play access could not be checked. Reconnecting."


def _revalidate_seconds() -> float:
    try:
        value = float(os.environ.get('WS_REVALIDATE_SECONDS', '60'))
    except ValueError:
        value = 60.0
    return max(15.0, min(300.0, value))


REVALIDATE_SECONDS = _revalidate_seconds()


# How long an accepted socket may stay unauthenticated. The token arrives as
# the first message (never in the URL, which access logs record), so the
# socket must be accepted before it can be read; this bounds that window.
def _auth_deadline_seconds() -> float:
    try:
        value = float(os.environ.get('WS_AUTH_DEADLINE_SECONDS', '5'))
    except ValueError:
        value = 5.0
    return max(1.0, min(15.0, value))


AUTH_DEADLINE_SECONDS = _auth_deadline_seconds()
REASON_AUTH_REQUIRED = "Send credentials in the first message."
REASON_ORIGIN = "This site may not open live play connections."


def origin_allowed(origin, allowed_origins) -> bool:
    """Cross-site WebSocket hijacking guard.

    Browsers always send Origin on a WebSocket handshake and page scripts
    cannot forge it, so only pages served from an origin the API already
    trusts for CORS may open a live socket. A missing Origin is refused too:
    the live channel exists for the web app, not for arbitrary clients.
    """
    if not origin:
        return False
    return str(origin).rstrip('/') in {str(item).rstrip('/') for item in allowed_origins or ()}


def first_message_token(raw):
    """The token from a first message shaped {"type": "auth", "token": "..."}.

    Anything else -- wrong type, extra nesting, oversized, not JSON -- yields
    None. The token is never echoed back or logged.
    """
    from utils.ws_messages import parse_client_message
    data = parse_client_message(raw)
    if not data or data.get('type') != 'auth':
        return None
    token = data.get('token')
    if not isinstance(token, str) or not token or len(token) > 4096:
        return None
    return token


class SocketRejected(Exception):
    def __init__(self, code: int, reason: str):
        super().__init__(reason)
        self.code = code
        self.reason = reason


@dataclass
class SocketSession:
    username: str
    campaign_id: str
    is_gm: bool
    expires_at: Optional[float]
    revoked: bool = field(default=False)


async def authorise_campaign_socket(token: Optional[str], campaign_id: str) -> SocketSession:
    """Run the HTTP session policy plus campaign membership for a socket."""
    try:
        claims = await authenticate_session_token(token)
    except HTTPException:
        raise SocketRejected(CLOSE_UNAUTHENTICATED, REASON_UNAUTHENTICATED)

    if str(claims.get(ACCOUNT_TYPE_CLAIM) or '') == CHILD_ACCOUNT_TYPE:
        raise SocketRejected(CLOSE_FORBIDDEN, REASON_FORBIDDEN)

    username = claims['sub']
    try:
        campaign = await verify_campaign_membership(campaign_id, username)
    except HTTPException:
        raise SocketRejected(CLOSE_FORBIDDEN, REASON_FORBIDDEN)

    exp = claims.get('exp')
    try:
        expires_at = float(exp) if exp is not None else None
    except (TypeError, ValueError):
        expires_at = None
    return SocketSession(
        username=username,
        campaign_id=campaign_id,
        is_gm=(campaign or {}).get('dm_user_id') == username,
        expires_at=expires_at,
    )


async def watch_session(websocket, token: str, session: SocketSession, manager,
                        interval: Optional[float] = None, clock=time.time) -> None:
    """Keep a socket authorised, or end it.

    Runs as a background task for the lifetime of the socket, whether or not
    the client ever sends anything. Returns once the socket has been revoked
    (removed from `manager` and closed); the endpoint cancels it otherwise.
    """
    period = REVALIDATE_SECONDS if interval is None else interval
    infrastructure_failures = 0
    while not session.revoked:
        wait = period
        if session.expires_at is not None:
            wait = max(0.0, min(wait, session.expires_at - clock()))
        await asyncio.sleep(wait)
        if session.revoked:
            return

        if session.expires_at is not None and clock() >= session.expires_at:
            await revoke(websocket, session, manager, CLOSE_UNAUTHENTICATED, REASON_UNAUTHENTICATED)
            return

        try:
            fresh = await authorise_campaign_socket(token, session.campaign_id)
        except SocketRejected as rejection:
            await revoke(websocket, session, manager, rejection.code, rejection.reason)
            return
        except Exception:
            # Database unreachable or similar. Allow one more interval, not
            # an open-ended pass.
            infrastructure_failures += 1
            if infrastructure_failures >= 2:
                await revoke(websocket, session, manager, CLOSE_TRY_AGAIN, REASON_TRY_AGAIN)
                return
            continue

        infrastructure_failures = 0
        if fresh.username != session.username:
            await revoke(websocket, session, manager, CLOSE_UNAUTHENTICATED, REASON_UNAUTHENTICATED)
            return
        # The GM of a campaign can change; GM-only messages follow it.
        session.is_gm = fresh.is_gm


async def revoke(websocket, session: SocketSession, manager, code: int, reason: str) -> None:
    """Stop delivering to this socket first, then close it."""
    session.revoked = True
    manager.disconnect(websocket, session.username, session.campaign_id)
    try:
        await websocket.close(code=code, reason=reason)
    except Exception:
        pass  # already closed by the client or the transport


async def end_live_sessions(user_id: Optional[str], campaign_id: Optional[str] = None, *,
                            code: int = CLOSE_UNAUTHENTICATED,
                            reason: str = REASON_UNAUTHENTICATED) -> int:
    """Close this process's live sockets for a user, never failing the caller.

    Called after the database change that revokes access has been written,
    so a socket that reconnects immediately is refused by the normal checks.
    """
    if not user_id:
        return 0
    from utils.ws_manager import ws_manager
    try:
        return await ws_manager.revoke_user(user_id, code, reason, campaign_id=campaign_id)
    except Exception:
        return 0
