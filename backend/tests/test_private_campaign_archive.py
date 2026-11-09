"""Private Tiacarta backups are never exposed across signed-in accounts."""
import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "rookiequestkeeper_test",
    "JWT_SECRET_KEY": "test-only-secret",
    "APP_URL": "http://localhost:3000",
    "CORS_ORIGINS": "http://localhost:3000",
}.items():
    os.environ.setdefault(key, value)

spec = importlib.util.spec_from_file_location(
    "private_archive_test_route", ROOT / "routes" / "private_campaign_archive.py"
)
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)

SHA = "c" * 40
RECORD = {
    "owner_user_id": "private-gm",
    "archive_set": archive.ARCHIVE_SET,
    "visibility": "private",
    "source_blob_sha": SHA,
    "path": "frontend/src/data/tiaKartaCampaignPack.js",
    "source_text": "This is inert archived source, never executed.",
    "source_format": "javascript",
}


def run(coroutine):
    return asyncio.run(coroutine)


class FakeCollection:
    def __init__(self):
        self.queries = []

    def find(self, filter, projection):
        self.queries.append(("list", filter, projection))
        return self

    def sort(self, *args):
        return self

    async def to_list(self, _limit):
        filter = self.queries[-1][1]
        return [{key: value for key, value in RECORD.items()
                 if key in self.queries[-1][2] and self.queries[-1][2][key]}
                ] if filter["owner_user_id"] == RECORD["owner_user_id"] else []

    async def find_one(self, filter, projection):
        self.queries.append(("detail", filter, projection))
        if filter["owner_user_id"] != RECORD["owner_user_id"] or filter["source_blob_sha"] != SHA:
            return None
        return {key: value for key, value in RECORD.items()
                if key in projection and projection[key]}


@pytest.fixture
def fake(monkeypatch):
    collection = FakeCollection()
    monkeypatch.setattr(archive, "db", SimpleNamespace(private_campaign_source_archives=collection))

    async def check(campaign_id, username):
        if campaign_id != f"owned-by-{username}":
            raise HTTPException(status_code=404, detail="Campaign not found")
    monkeypatch.setattr(archive, "verify_campaign_ownership", check)
    return collection


def test_archive_list_returns_only_the_logged_in_owners_entries(fake):
    result = run(archive.list_private_campaign_archive("owned-by-private-gm", username="private-gm"))
    assert result["count"] == 1
    assert result["files"][0]["path"].endswith("tiaKartaCampaignPack.js")
    assert "source_text" not in result["files"][0]
    assert fake.queries[-1][1]["owner_user_id"] == "private-gm"


@pytest.mark.parametrize("endpoint", ["list", "read"])
def test_other_account_cannot_read_private_archive_even_with_a_guessed_campaign_id(fake, endpoint):
    with pytest.raises(HTTPException) as denied:
        if endpoint == "list":
            run(archive.list_private_campaign_archive("owned-by-private-gm", username="outsider"))
        else:
            run(archive.get_private_campaign_archive("owned-by-private-gm", SHA, username="outsider"))
    assert denied.value.status_code == 404
    assert not fake.queries


def test_owner_cannot_read_a_private_archive_record_belonging_to_another_user(fake):
    with pytest.raises(HTTPException) as denied:
        run(archive.get_private_campaign_archive("owned-by-outsider", SHA, username="outsider"))
    assert denied.value.status_code == 404
    assert fake.queries[-1][1]["owner_user_id"] == "outsider"


def test_owner_can_read_own_inert_source_text(fake):
    doc = run(archive.get_private_campaign_archive("owned-by-private-gm", SHA, username="private-gm"))
    assert doc["source_text"] == RECORD["source_text"]


def test_unstructured_source_identifiers_are_rejected_before_database_access(fake):
    with pytest.raises(HTTPException) as denied:
        run(archive.get_private_campaign_archive("owned-by-private-gm", "../secrets", username="private-gm"))
    assert denied.value.status_code == 404
    assert not fake.queries
