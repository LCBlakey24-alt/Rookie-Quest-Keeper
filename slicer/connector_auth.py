import base64
import hashlib
import hmac
import json
import secrets
import time
import uuid


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def issue_token(secret: str, label: str = "Shared connection", days: int = 7, now: int | None = None):
    if not secret:
        raise ValueError("signing secret is missing")
    if not 1 <= int(days) <= 30:
        raise ValueError("days must be between 1 and 30")
    now = int(time.time()) if now is None else int(now)
    payload = {
        "v": 1,
        "sub": "rqs-mcp",
        "label": (label or "Shared connection").strip()[:50],
        "iat": now,
        "exp": now + int(days) * 86400,
        "nonce": uuid.uuid4().hex[:12],
    }
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded = _b64url(raw)
    sig = _b64url(hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest())
    return f"rq1.{encoded}.{sig}", payload


def validate_token(secret: str, token: str, now: int | None = None):
    if not secret or not token or not token.startswith("rq1."):
        return False, None
    try:
        _, payload_b64, sig_b64 = token.split(".", 2)
        expected = _b64url(
            hmac.new(
                secret.encode("utf-8"),
                payload_b64.encode("ascii"),
                hashlib.sha256,
            ).digest()
        )
        if not secrets.compare_digest(sig_b64, expected):
            return False, None
        payload = json.loads(_b64decode(payload_b64).decode("utf-8"))
        now = int(time.time()) if now is None else int(now)
        valid = (
            payload.get("v") == 1
            and payload.get("sub") == "rqs-mcp"
            and int(payload.get("exp", 0)) > now
        )
        return bool(valid), payload if valid else None
    except Exception:
        return False, None
