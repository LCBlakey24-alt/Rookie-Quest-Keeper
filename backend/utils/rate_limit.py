"""Lightweight in-memory rate limiting helpers.

This is intentionally dependency-free so it works in the current deployment
without adding Redis or a new package. It is best-effort protection for a single
backend process. If the app scales horizontally, replace this with Redis-backed
limits.

Keys never include anything the caller can choose freely:

* Sign-in, sign-up and password-recovery routes are limited per client IP.
  The ``Authorization`` header is ignored there, because an unauthenticated
  caller could otherwise send a new random header to get a fresh bucket.
* Signed-in routes (AI, parsing, password change) are limited per verified
  user. An invalid or missing token falls back to the client IP.
"""
from __future__ import annotations

import ipaddress
import os
from collections import defaultdict, deque
from time import monotonic
from typing import Deque, Dict, Optional, Tuple

import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    """Simple sliding-window request limiter keyed by client + route bucket."""

    PRUNE_EVERY = 1000

    def __init__(self) -> None:
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        self._windows: Dict[str, int] = {}
        self._calls = 0

    def allow(self, key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        now = monotonic()
        self._calls += 1
        if self._calls % self.PRUNE_EVERY == 0:
            self.prune(now)

        events = self._events[key]
        self._windows[key] = window_seconds
        cutoff = now - window_seconds

        while events and events[0] <= cutoff:
            events.popleft()

        remaining = max(0, limit - len(events))
        if len(events) >= limit:
            return False, remaining

        events.append(now)
        return True, max(0, limit - len(events))

    def prune(self, now: Optional[float] = None) -> None:
        """Forget keys with no events inside their window so memory stays bounded."""
        now = monotonic() if now is None else now
        for key in list(self._events):
            window = self._windows.get(key, 0)
            events = self._events[key]
            if not events or events[-1] <= now - window:
                del self._events[key]
                self._windows.pop(key, None)

    def __len__(self) -> int:
        return len(self._events)


RATE_LIMITS = [
    # Auth-sensitive routes.
    ("/api/auth/login", 8, 15 * 60),
    ("/api/auth/google", 12, 15 * 60),
    ("/api/auth/register", 10, 60 * 60),
    ("/api/auth/forgot-password", 5, 60 * 60),
    ("/api/auth/reset-password", 8, 60 * 60),
    ("/api/auth/change-password", 8, 60 * 60),
    # Legacy account aliases; current clients reach /api/auth/me instead (see
    # METHOD_RATE_LIMITS below).
    ("/api/account/change-password", 8, 60 * 60),
    ("/api/account/update", 10, 60 * 60),
    ("/api/account", 3, 60 * 60),
    # AI and expensive parsing routes.
    ("/api/ai", 60, 60 * 60),
    ("/api/rook", 60, 60 * 60),
    ("/api/unseen-servant/generate", 40, 60 * 60),
    ("/api/homebrew/parse", 20, 60 * 60),
    ("/api/homebrew/parse-docx", 20, 60 * 60),
    ("/api/homebrew/parse-text", 30, 60 * 60),
]

# Exact path + method rules for routes whose read method must stay unlimited.
# The frontend maps /account/update and /account/delete onto these.
METHOD_RATE_LIMITS = {
    ("PATCH", "/api/auth/me"): ("/api/auth/me:update", 10, 60 * 60),
    ("DELETE", "/api/auth/me"): ("/api/auth/me:delete", 3, 60 * 60),
}

# Routes used before the caller has a session. Keyed on IP only.
ANONYMOUS_PREFIXES = (
    "/api/auth/login",
    "/api/auth/google",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
)


def match_rule(method: str, path: str) -> Optional[Tuple[str, int, int]]:
    exact = METHOD_RATE_LIMITS.get((method.upper(), path.rstrip("/") or "/"))
    if exact:
        return exact
    return next((rule for rule in RATE_LIMITS if path.startswith(rule[0])), None)


def _is_internal(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    # Anything not publicly routable (private, loopback, link-local, carrier
    # NAT ranges) is a hosting proxy rather than a visitor.
    return not ip.is_global


def client_ip(request: Request) -> str:
    """Best-effort client IP that a caller cannot pick freely.

    ``RATE_LIMIT_CLIENT_IP_HEADER`` (for example ``cf-connecting-ip``) names a
    header set by a trusted proxy. Otherwise, when the direct peer is an
    internal address (a hosting load balancer such as Render's), the rightmost
    public entry in ``X-Forwarded-For`` is used: that is the one the proxy
    appended, not one the client typed. A public direct peer is used as-is, and
    forwarded headers are ignored.
    """
    peer = request.client.host if request.client else ""
    trusted_header = os.environ.get("RATE_LIMIT_CLIENT_IP_HEADER", "").strip().lower()
    if trusted_header:
        value = request.headers.get(trusted_header, "").split(",")[0].strip()
        if value:
            return value

    if peer and _is_internal(peer):
        forwarded = request.headers.get("x-forwarded-for", "")
        hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
        for hop in reversed(hops):
            if not _is_internal(hop):
                return hop
    return peer or "unknown"


def verified_username(request: Request) -> Optional[str]:
    """Return the JWT subject when the bearer token verifies, else None."""
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    try:
        from config import JWT_ALGORITHM, JWT_SECRET
        payload = jwt.decode(token.strip(), JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None
    subject = payload.get("sub")
    return str(subject) if subject else None


def rate_limit_key(request: Request, bucket: str) -> str:
    path = request.url.path
    if not path.startswith(ANONYMOUS_PREFIXES):
        username = verified_username(request)
        if username:
            return f"user:{username}:{bucket}"
    return f"ip:{client_ip(request)}:{bucket}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply coarse route-based limits before requests hit route handlers."""

    def __init__(self, app):
        super().__init__(app)
        self.limiter = SlidingWindowRateLimiter()

    async def dispatch(self, request: Request, call_next):
        matched = match_rule(request.method, request.url.path)
        if not matched:
            return await call_next(request)

        bucket, limit, window_seconds = matched
        key = rate_limit_key(request, bucket)
        allowed, remaining = self.limiter.allow(key, limit, window_seconds)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please wait before trying again.",
                    "retry_after_seconds": window_seconds,
                },
                headers={
                    "Retry-After": str(window_seconds),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
