"""Integration tests for campaign ownership and membership boundaries.

These tests are intentionally marked as integration because they expect a
running backend and database. Run with:

    pytest --run-integration -m integration
"""
import uuid

import pytest
import requests


pytestmark = pytest.mark.integration


def _unique_user(prefix: str) -> dict:
    suffix = uuid.uuid4().hex[:10]
    return {
        "email": f"{prefix}_{suffix}@example.test",
        "username": f"{prefix}_{suffix}",
        "password": "testpassword123",
    }


def _register(base_url: str, user: dict) -> dict:
    response = requests.post(f"{base_url}/api/auth/register", json=user)
    assert response.status_code == 201, response.text
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _create_campaign(base_url: str, headers: dict, name: str = "Permission Test Campaign") -> str:
    response = requests.post(
        f"{base_url}/api/campaigns",
        headers=headers,
        json={
            "name": f"{name} {uuid.uuid4().hex[:6]}",
            "description": "Created by permission integration tests",
            "system": "5e 2024 Compatible",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_user_cannot_read_or_update_another_users_campaign(base_url):
    owner_headers = _register(base_url, _unique_user("perm_owner"))
    outsider_headers = _register(base_url, _unique_user("perm_outsider"))
    campaign_id = _create_campaign(base_url, owner_headers)

    read_response = requests.get(
        f"{base_url}/api/campaigns/{campaign_id}",
        headers=outsider_headers,
    )
    assert read_response.status_code == 404

    update_response = requests.put(
        f"{base_url}/api/campaigns/{campaign_id}",
        headers=outsider_headers,
        json={
            "name": "Should Not Update",
            "description": "Outsider update attempt",
            "system": "5e 2024 Compatible",
        },
    )
    assert update_response.status_code == 404


def test_non_member_cannot_upload_custom_rules(base_url):
    owner_headers = _register(base_url, _unique_user("rules_owner"))
    outsider_headers = _register(base_url, _unique_user("rules_outsider"))
    campaign_id = _create_campaign(base_url, owner_headers)

    response = requests.post(
        f"{base_url}/api/campaigns/{campaign_id}/custom-rules",
        headers=outsider_headers,
        json={
            "name": "Forbidden Rules Upload",
            "content": "A non-member should not be able to add rules to this campaign.",
            "source_type": "text",
        },
    )
    assert response.status_code in (403, 404)


def test_non_member_cannot_delete_campaign_custom_rules(base_url):
    owner_headers = _register(base_url, _unique_user("delete_rules_owner"))
    outsider_headers = _register(base_url, _unique_user("delete_rules_outsider"))
    campaign_id = _create_campaign(base_url, owner_headers)

    create_response = requests.post(
        f"{base_url}/api/campaigns/{campaign_id}/custom-rules",
        headers=owner_headers,
        json={
            "name": "Owner Rules",
            "content": "Only the GM/uploader should be able to delete this.",
            "source_type": "text",
        },
    )
    assert create_response.status_code == 200, create_response.text
    rule_id = create_response.json()["id"]

    delete_response = requests.delete(
        f"{base_url}/api/campaigns/{campaign_id}/custom-rules/{rule_id}",
        headers=outsider_headers,
    )
    assert delete_response.status_code in (403, 404)

    owner_delete_response = requests.delete(
        f"{base_url}/api/campaigns/{campaign_id}/custom-rules/{rule_id}",
        headers=owner_headers,
    )
    assert owner_delete_response.status_code == 200, owner_delete_response.text
