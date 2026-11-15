"""Account-boundary checks for campaign workbook preview and import."""

import asyncio

import pytest
from fastapi import HTTPException

from routes import campaign_workbook_import as workbook_routes


@pytest.mark.parametrize(
    "handler",
    [workbook_routes.preview_campaign_workbook, workbook_routes.import_campaign_workbook],
)
def test_existing_campaign_requires_ownership_before_workbook_is_read(monkeypatch, handler):
    async def deny(campaign_id, username):
        assert campaign_id == "private-campaign"
        assert username == "unrelated-user"
        raise HTTPException(status_code=404, detail="Campaign not found")

    async def should_not_read(_file):
        raise AssertionError("The uploaded workbook was read before ownership was verified")

    monkeypatch.setattr(workbook_routes, "verify_campaign_ownership", deny)
    monkeypatch.setattr(workbook_routes, "_file_payload", should_not_read)

    with pytest.raises(HTTPException) as denied:
        asyncio.run(handler(file=object(), campaign_id="private-campaign", username="unrelated-user"))

    assert denied.value.status_code == 404

