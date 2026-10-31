from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.rate_limit import RATE_LIMITS, SlidingWindowRateLimiter


def test_sliding_window_allows_until_limit():
    limiter = SlidingWindowRateLimiter()
    allowed, remaining = limiter.allow("client:login", limit=2, window_seconds=60)
    assert allowed is True
    assert remaining == 1

    allowed, remaining = limiter.allow("client:login", limit=2, window_seconds=60)
    assert allowed is True
    assert remaining == 0


def test_sliding_window_blocks_after_limit():
    limiter = SlidingWindowRateLimiter()
    limiter.allow("client:login", limit=1, window_seconds=60)

    allowed, remaining = limiter.allow("client:login", limit=1, window_seconds=60)
    assert allowed is False
    assert remaining == 0


def test_sliding_window_uses_separate_keys():
    limiter = SlidingWindowRateLimiter()
    limiter.allow("client-a:login", limit=1, window_seconds=60)

    allowed, remaining = limiter.allow("client-b:login", limit=1, window_seconds=60)
    assert allowed is True
    assert remaining == 0


def test_account_delete_route_matches_account_rate_limit_prefix():
    prefixes = [prefix for prefix, _limit, _window in RATE_LIMITS]
    assert "/api/account" in prefixes
    assert "/api/account/delete" not in prefixes
    assert any("/api/account".startswith(prefix) for prefix in prefixes)


def test_live_change_password_route_is_rate_limited():
    prefixes = [prefix for prefix, _limit, _window in RATE_LIMITS]
    assert "/api/auth/change-password" in prefixes


def test_rook_ai_routes_are_rate_limited():
    prefixes = [prefix for prefix, _limit, _window in RATE_LIMITS]
    assert "/api/rook" in prefixes
    assert any("/api/rook/generate".startswith(prefix) for prefix in prefixes)
    assert any("/api/rook/form-fill".startswith(prefix) for prefix in prefixes)
    assert any("/api/rook/draft".startswith(prefix) for prefix in prefixes)
    assert "/api/unseen-servant/generate" in prefixes


# --- Keys must not be chosen by the caller -------------------------------------------------

import os

import asyncio

import jwt as _jwt
from starlette.requests import Request
from starlette.responses import JSONResponse

from utils import rate_limit
from utils.rate_limit import (
    RateLimitMiddleware,
    client_ip,
    match_rule,
    rate_limit_key,
)

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookiequestkeeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")


def _request(path="/api/auth/login", method="POST", client=("8.8.4.4", 5000), headers=None):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "method": method, "path": path, "headers": raw, "client": client, "query_string": b""})


async def _ok(_request):
    return JSONResponse({"ok": True})


def _send(middleware, method, path, authorization=None):
    headers = {"Authorization": authorization} if authorization else {}
    request = _request(path=path, method=method, headers=headers)
    return asyncio.run(middleware.dispatch(request, _ok)).status_code


def _middleware():
    async def app(scope, receive, send):  # never reached; dispatch is called directly
        raise AssertionError("downstream app should not be called")
    return RateLimitMiddleware(app)


def test_rotating_authorization_header_does_not_reset_login_limit():
    middleware = _middleware()
    codes = [
        _send(middleware, "POST", "/api/auth/login", f"Bearer random-{i:04d}")
        for i in range(10)
    ]
    assert codes[:8] == [200] * 8
    assert codes[8:] == [429, 429]


def test_reading_own_account_is_not_limited_but_deleting_it_is():
    middleware = _middleware()
    assert all(_send(middleware, "GET", "/api/auth/me") == 200 for _ in range(10))
    codes = [_send(middleware, "DELETE", "/api/auth/me") for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    assert match_rule("GET", "/api/auth/me") is None


def test_forwarded_for_is_used_only_behind_an_internal_proxy():
    behind_proxy = _request(client=("10.0.4.2", 443), headers={"X-Forwarded-For": "1.1.1.1, 9.9.9.9"})
    assert client_ip(behind_proxy) == "9.9.9.9"

    proxy_chain = _request(client=("10.0.4.2", 443), headers={"X-Forwarded-For": "9.9.9.9, 10.1.1.1"})
    assert client_ip(proxy_chain) == "9.9.9.9"

    direct_spoof = _request(client=("8.8.4.4", 5000), headers={"X-Forwarded-For": "1.1.1.1"})
    assert client_ip(direct_spoof) == "8.8.4.4"


def test_trusted_client_ip_header_can_be_configured(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_CLIENT_IP_HEADER", "cf-connecting-ip")
    request = _request(client=("10.0.4.2", 443), headers={"CF-Connecting-IP": "1.0.0.1"})
    assert client_ip(request) == "1.0.0.1"


def test_signed_in_routes_are_keyed_on_the_verified_user():
    token = _jwt.encode({"sub": "Rook"}, os.environ["JWT_SECRET_KEY"], algorithm="HS256")
    signed_in = _request(path="/api/ai/generate", headers={"Authorization": f"Bearer {token}"})
    assert rate_limit_key(signed_in, "/api/ai") == "user:Rook:/api/ai"

    forged = _request(path="/api/ai/generate", headers={"Authorization": "Bearer not-a-real-token"})
    assert rate_limit_key(forged, "/api/ai") == "ip:8.8.4.4:/api/ai"

    login_with_token = _request(headers={"Authorization": f"Bearer {token}"})
    assert rate_limit_key(login_with_token, "/api/auth/login") == "ip:8.8.4.4:/api/auth/login"


def test_prune_forgets_expired_keys():
    limiter = SlidingWindowRateLimiter()
    limiter.allow("old", limit=5, window_seconds=1)
    limiter.allow("fresh", limit=5, window_seconds=3600)
    limiter.prune(now=rate_limit.monotonic() + 10)
    assert len(limiter) == 1
