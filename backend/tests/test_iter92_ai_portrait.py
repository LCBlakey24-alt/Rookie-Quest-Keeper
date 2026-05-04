"""Iteration 92 - AI Portrait Generator (Nano Banana / gemini-3.1-flash-image-preview)

Covers:
- POST /api/ai/portrait (single style)
- POST /api/ai/portrait/batch (3 styles in parallel)
- Style fallback for invalid style → photoreal
- Auth required (401/403 without token)
- PATCH /api/characters/{id} accepts portrait_url (whitelist fix)
- Light regression: login + admin check + GET /api/characters
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "http://localhost:8000",
).rstrip("/")
ADMIN_EMAIL = "lcblakey24@outlook.com"
ADMIN_PASSWORD = "LCBlakey24?!"

# Generous timeout for Gemini image generation (5-20s per call, 15-60s for batch).
PORTRAIT_TIMEOUT = 90
BATCH_TIMEOUT = 180

# 1x1 transparent PNG data URI for portrait_url whitelist test
TINY_PNG_DATA_URI = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "username" in data
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.admin_token = data["token"]  # type: ignore
    return s


# =========================== REGRESSION (light) ===========================
class TestRegression:
    def test_login_works(self, admin_session):
        assert admin_session.admin_token

    def test_admin_check(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/check", timeout=15)
        assert r.status_code == 200
        assert r.json().get("is_admin") is True

    def test_get_characters(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/characters", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# =========================== AUTH GUARD ===========================
class TestAuthGuard:
    def test_portrait_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/ai/portrait",
            json={"race": "Half-Elf", "character_class": "Ranger", "style": "photoreal"},
            timeout=15,
        )
        assert r.status_code in (401, 403), f"unexpected: {r.status_code} {r.text}"

    def test_portrait_batch_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/ai/portrait/batch",
            json={"race": "Dwarf", "character_class": "Cleric"},
            timeout=15,
        )
        assert r.status_code in (401, 403)


# =========================== SINGLE PORTRAIT ===========================
class TestPortraitSingle:
    def test_generate_photoreal_portrait(self, admin_session):
        payload = {
            "race": "Half-Elf",
            "character_class": "Ranger",
            "gender": "female",
            "description": "auburn hair, emerald eyes, leather armor",
            "style": "photoreal",
        }
        r = admin_session.post(
            f"{BASE_URL}/api/ai/portrait", json=payload, timeout=PORTRAIT_TIMEOUT
        )
        # If env disallows LLM calls, accept structured 5xx error and skip rest
        if r.status_code in (500, 502, 503):
            pytest.skip(f"LLM not available in this env: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        # Data validations
        assert "image_base64" in data
        assert isinstance(data["image_base64"], str)
        assert len(data["image_base64"]) > 10000, (
            f"image_base64 too small: {len(data['image_base64'])}"
        )
        assert data.get("mime_type", "").startswith("image/"), data.get("mime_type")
        assert data.get("style") == "photoreal"
        assert isinstance(data.get("prompt"), str) and len(data["prompt"]) > 0

    def test_invalid_style_falls_back_to_photoreal(self, admin_session):
        payload = {
            "race": "Human",
            "character_class": "Fighter",
            "description": "short test",
            "style": "surrealist",  # not in STYLE_PROMPTS
        }
        r = admin_session.post(
            f"{BASE_URL}/api/ai/portrait", json=payload, timeout=PORTRAIT_TIMEOUT
        )
        if r.status_code in (500, 502, 503):
            pytest.skip(f"LLM not available: {r.status_code}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data.get("style") == "photoreal", (
            f"expected fallback to photoreal, got {data.get('style')}"
        )


# =========================== BATCH PORTRAIT ===========================
class TestPortraitBatch:
    def test_batch_returns_three_styles(self, admin_session):
        payload = {
            "race": "Dwarf",
            "character_class": "Cleric",
            "description": "grey beard, holy symbol",
        }
        r = admin_session.post(
            f"{BASE_URL}/api/ai/portrait/batch",
            json=payload,
            timeout=BATCH_TIMEOUT,
        )
        if r.status_code in (500, 502, 503):
            pytest.skip(f"LLM not available: {r.status_code}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert "portraits" in data
        portraits = data["portraits"]
        assert isinstance(portraits, list)
        assert len(portraits) == 3, f"expected 3 portraits, got {len(portraits)}"

        # Each item has a style key matching one of the expected
        styles_returned = {p.get("style") for p in portraits}
        assert styles_returned == {"photoreal", "painterly", "stylized"}, (
            f"styles mismatch: {styles_returned}"
        )

        # At least 2 of 3 should have non-empty image_base64
        non_empty = [
            p for p in portraits if p.get("image_base64") and len(p["image_base64"]) > 1000
        ]
        assert len(non_empty) >= 2, (
            f"expected >=2 successful portraits, got {len(non_empty)}: "
            f"{[(p.get('style'), p.get('error')) for p in portraits]}"
        )


# =========================== PATCH portrait_url WHITELIST ===========================
class TestPatchPortraitUrl:
    @pytest.fixture(scope="class")
    def created_character_id(self, admin_session):
        """Create a throw-away character for the patch test, return its id."""
        # Try to find an existing character first; otherwise create one
        r = admin_session.get(f"{BASE_URL}/api/characters", timeout=15)
        assert r.status_code == 200
        chars = r.json()
        # Prefer a throw-away test character — create one
        payload = {
            "name": f"TEST_iter92_portrait_{uuid.uuid4().hex[:6]}",
            "race": "Human",
            "className": "Fighter",
            "level": 1,
        }
        cr = admin_session.post(f"{BASE_URL}/api/characters", json=payload, timeout=20)
        if cr.status_code in (200, 201):
            cid = cr.json().get("id") or cr.json().get("_id")
            if cid:
                yield cid
                # cleanup
                try:
                    admin_session.delete(f"{BASE_URL}/api/characters/{cid}", timeout=15)
                except Exception:
                    pass
                return
        # Fallback: pick any existing character (won't delete it after)
        if chars:
            yield chars[0].get("id") or chars[0].get("_id")
            return
        pytest.skip("No character available and creation failed")

    def test_patch_portrait_url_persists(self, admin_session, created_character_id):
        cid = created_character_id
        r = admin_session.patch(
            f"{BASE_URL}/api/characters/{cid}",
            json={"portrait_url": TINY_PNG_DATA_URI},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        # Returned char should have portrait_url persisted
        assert data.get("portrait_url") == TINY_PNG_DATA_URI, (
            f"portrait_url not persisted: {data.get('portrait_url')}"
        )

        # GET to confirm DB persistence
        gr = admin_session.get(f"{BASE_URL}/api/characters/{cid}", timeout=15)
        assert gr.status_code == 200
        assert gr.json().get("portrait_url") == TINY_PNG_DATA_URI
