"""Lightweight in-memory rate limiting helpers.

This is intentionally dependency-free so it works in the current deployment
without adding Redis or a new package. It is best-effort protection for a single
backend process. If the app scales horizontally, replace this with Redis-backed
limits.
"""
from __future__ import annotations

from collections import defaultdict, deque
from time import monotonic
from typing import Deque, Dict, Tuple

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    """Simple sliding-window request limiter keyed by client + route bucket."""

    def __init__(self) -> None:
        self._events: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        now = monotonic()
        events = self._events[key]
        cutoff = now - window_seconds

        while events and events[0] <= cutoff:
            events.popleft()

        remaining = max(0, limit - len(events))
        if len(events) >= limit:
            return False, remaining

        events.append(now)
        return True, max(0, limit - len(events))


RATE_LIMITS = [
    # Auth-sensitive routes.
    ("/api/auth/login", 8, 15 * 60),
    ("/api/auth/register", 10, 60 * 60),
    ("/api/auth/forgot-password", 5, 60 * 60),
    ("/api/auth/reset-password", 8, 60 * 60),
    ("/api/account/change-password", 8, 60 * 60),
    ("/api/account/update", 10, 60 * 60),
    ("/api/account/delete", 3, 60 * 60),
    # AI and expensive parsing routes.
    ("/api/ai", 60, 60 * 60),
    ("/api/homebrew/parse", 20, 60 * 60),
    ("/api/homebrew/parse-docx", 20, 60 * 60),
    ("/api/homebrew/parse-text", 30, 60 * 60),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply coarse route-based limits before requests hit route handlers."""

    def __init__(self, app):
        super().__init__(app)
        self.limiter = SlidingWindowRateLimiter()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        matched = next((rule for rule in RATE_LIMITS if path.startswith(rule[0])), None)
        if not matched:
            return await call_next(request)

        prefix, limit, window_seconds = matched
        client_ip = request.client.host if request.client else "unknown"
        user_hint = request.headers.get("authorization", "anonymous")[-16:]
        key = f"{client_ip}:{user_hint}:{prefix}"
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
