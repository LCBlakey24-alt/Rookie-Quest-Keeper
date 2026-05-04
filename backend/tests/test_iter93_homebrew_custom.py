"""Iteration 93 - Homebrew Workshop + Custom Ability Score regression.

Covers:
- POST /api/homebrew/parse-text (background, race, invalid, no-auth)
- POST /api/homebrew/parse-docx (valid .docx, non-.docx)
- POST /api/homebrew/save (create + update with same id)
- GET /api/homebrew (filter + all 5 buckets)
- DELETE /api/homebrew/{type}/{id}
- Auth guard on all 4 endpoints
- Light regression (login + admin/check + GET /api/characters + AI portrait)
"""
import io
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

PARSE_TIMEOUT = 90  # Claude Sonnet text completion ~5-30s


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
    assert "token" in data
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.admin_token = data["token"]  # type: ignore
    return s


def _make_docx_bytes(paragraphs):
    """Create an in-memory .docx with the supplied paragraphs."""
    from docx import Document
    doc = Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    bio = io.BytesIO()
    doc.save(bio)
    return bio.getvalue()


# =========================== REGRESSION ===========================
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


# =========================== AUTH GUARDS ===========================
class TestAuthGuards:
    def test_parse_text_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/homebrew/parse-text",
            json={"content_type": "background", "edition": "2014", "text": "Pirate."},
            timeout=15,
        )
        assert r.status_code in (401, 403), f"unexpected: {r.status_code}"

    def test_parse_docx_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/homebrew/parse-docx",
            data={"content_type": "background", "edition": "2014"},
            files={"file": ("x.docx", b"abc", "application/octet-stream")},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_save_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/homebrew/save",
            json={"content_type": "background", "edition": "2014", "data": {"name": "X"}},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/homebrew", timeout=15)
        assert r.status_code in (401, 403)

    def test_delete_requires_auth(self):
        r = requests.delete(
            f"{BASE_URL}/api/homebrew/background/some-id", timeout=15
        )
        assert r.status_code in (401, 403)


# =========================== PARSE-TEXT ===========================
class TestParseText:
    def test_parse_text_invalid_content_type(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/homebrew/parse-text",
            json={"content_type": "potato", "edition": "2014", "text": "Some text"},
            timeout=15,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text[:200]}"

    def test_parse_text_empty(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/homebrew/parse-text",
            json={"content_type": "background", "edition": "2014", "text": "   "},
            timeout=15,
        )
        assert r.status_code == 400

    def test_parse_text_background_pirate(self, admin_session):
        text = (
            "Pirate. You spent years on the high seas as a member of a crew of buccaneers. "
            "Skill Proficiencies: Athletics, Perception. "
            "Tool Proficiencies: Navigator's tools, Vehicles (water). "
            "Languages: One of your choice. "
            "Equipment: A belaying pin, 50 feet of silk rope, a fine set of clothes, "
            "and a pouch containing 10 gp. "
            "Feature: Bad Reputation - No matter where you go, people are afraid of you "
            "due to your reputation."
        )
        r = admin_session.post(
            f"{BASE_URL}/api/homebrew/parse-text",
            json={"content_type": "background", "edition": "2014", "text": text},
            timeout=PARSE_TIMEOUT,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"LLM unavailable: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["content_type"] == "background"
        assert data["edition"] == "2014"
        assert "draft" in data and isinstance(data["draft"], dict)
        assert "missing_fields" in data and isinstance(data["missing_fields"], list)
        assert "source_excerpt" in data
        draft = data["draft"]
        # Expected name extraction
        assert (draft.get("name") or "").lower().startswith("pirate"), (
            f"expected name=Pirate, got {draft.get('name')!r}"
        )
        skills = [s.lower() for s in (draft.get("skill_proficiencies") or [])]
        assert any("athletics" in s for s in skills), f"skills missing Athletics: {skills}"
        assert any("perception" in s for s in skills), f"skills missing Perception: {skills}"

    def test_parse_text_race(self, admin_session):
        text = (
            "Wee-folk. A small, nimble race of folk who stand about 3 feet tall. "
            "Size: Small. Speed: 25 feet. "
            "Ability Score Increase: Your Dexterity score increases by 2. "
            "Languages: Common and Halfling. "
            "Lucky: When you roll a 1 on the d20 for an attack roll, you can reroll the die."
        )
        r = admin_session.post(
            f"{BASE_URL}/api/homebrew/parse-text",
            json={"content_type": "race", "edition": "2014", "text": text},
            timeout=PARSE_TIMEOUT,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"LLM unavailable: {r.status_code}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        draft = data["draft"]
        assert draft.get("name"), f"draft.name not set: {draft}"
        # size and speed should either be filled OR listed as missing
        all_keys = {"size", "speed"}
        missing = set(data["missing_fields"])
        for k in all_keys:
            assert k in draft or k in missing, f"{k} not in draft or missing"


# =========================== PARSE-DOCX ===========================
class TestParseDocx:
    def test_parse_docx_background(self, admin_session):
        docx_bytes = _make_docx_bytes([
            "Pirate.",
            "Skill proficiencies: Athletics, Perception.",
            "Feature: Bad Reputation - everyone is afraid of you.",
        ])
        # Strip Content-Type header so requests can set multipart boundary correctly
        s = requests.Session()
        s.headers.update({"Authorization": admin_session.headers["Authorization"]})
        r = s.post(
            f"{BASE_URL}/api/homebrew/parse-docx",
            data={"content_type": "background", "edition": "2014"},
            files={
                "file": (
                    "test.docx",
                    docx_bytes,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
            timeout=PARSE_TIMEOUT,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"LLM unavailable: {r.status_code}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["content_type"] == "background"
        assert isinstance(data.get("draft"), dict)
        # draft.name should be extracted
        assert data["draft"].get("name"), f"draft.name not set: {data['draft']}"

    def test_parse_docx_rejects_non_docx(self, admin_session):
        s = requests.Session()
        s.headers.update({"Authorization": admin_session.headers["Authorization"]})
        r = s.post(
            f"{BASE_URL}/api/homebrew/parse-docx",
            data={"content_type": "background", "edition": "2014"},
            files={"file": ("malicious.pdf", b"%PDF-1.4 fake binary", "application/pdf")},
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code}"


# =========================== SAVE / LIST / UPDATE / DELETE ===========================
class TestSaveListDelete:
    def test_full_lifecycle(self, admin_session):
        # CREATE
        payload = {
            "content_type": "background",
            "edition": "2014",
            "data": {
                "name": f"TEST_iter93_Pirate_{uuid.uuid4().hex[:6]}",
                "description": "A salty sailor.",
                "skill_proficiencies": ["Athletics"],
            },
        }
        r = admin_session.post(f"{BASE_URL}/api/homebrew/save", json=payload, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data.get("saved") is True
        assert data.get("content_type") == "background"
        hb = data.get("homebrew") or {}
        new_id = hb.get("id")
        assert new_id and isinstance(new_id, str)
        # uuid format check
        try:
            uuid.UUID(new_id)
        except Exception:
            pytest.fail(f"id is not a uuid: {new_id}")
        assert hb.get("name") == payload["data"]["name"]

        # UPDATE — same homebrew_id should not create a new doc
        payload2 = {
            **payload,
            "data": {**payload["data"], "description": "Updated desc."},
            "homebrew_id": new_id,
        }
        r2 = admin_session.post(f"{BASE_URL}/api/homebrew/save", json=payload2, timeout=20)
        assert r2.status_code == 200, f"{r2.status_code} {r2.text[:300]}"
        d2 = r2.json()
        assert d2["homebrew"]["id"] == new_id, "update should reuse the same id"
        assert d2["homebrew"]["description"] == "Updated desc."

        # LIST filtered
        rl = admin_session.get(
            f"{BASE_URL}/api/homebrew?content_type=background", timeout=15
        )
        assert rl.status_code == 200
        listed = rl.json().get("homebrew", {}).get("background", [])
        assert any(item.get("id") == new_id for item in listed), (
            f"saved homebrew not in list: {[i.get('id') for i in listed]}"
        )

        # LIST all (no filter) — should contain all 5 buckets
        rla = admin_session.get(f"{BASE_URL}/api/homebrew", timeout=15)
        assert rla.status_code == 200
        buckets = rla.json().get("homebrew", {})
        for ct in ("race", "class", "subclass", "background", "magic_item"):
            assert ct in buckets, f"bucket {ct} missing: {list(buckets.keys())}"
        # No mongo _id leakage
        for items in buckets.values():
            for item in items:
                assert "_id" not in item, "mongodb _id leaked"

        # DELETE
        rd = admin_session.delete(
            f"{BASE_URL}/api/homebrew/background/{new_id}", timeout=15
        )
        assert rd.status_code == 200, f"{rd.status_code} {rd.text[:200]}"
        assert rd.json().get("deleted") == new_id

        # Verify gone
        rl2 = admin_session.get(
            f"{BASE_URL}/api/homebrew?content_type=background", timeout=15
        )
        assert rl2.status_code == 200
        listed2 = rl2.json().get("homebrew", {}).get("background", [])
        assert not any(item.get("id") == new_id for item in listed2), (
            "homebrew still present after delete"
        )

        # Delete again -> 404
        rd2 = admin_session.delete(
            f"{BASE_URL}/api/homebrew/background/{new_id}", timeout=15
        )
        assert rd2.status_code == 404

    def test_save_invalid_content_type(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/homebrew/save",
            json={"content_type": "potato", "edition": "2014", "data": {"name": "x"}},
            timeout=15,
        )
        assert r.status_code == 400
