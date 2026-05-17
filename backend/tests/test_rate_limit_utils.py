from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.rate_limit import SlidingWindowRateLimiter


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
