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
