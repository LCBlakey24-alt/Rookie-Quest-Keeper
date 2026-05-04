"""
Test Session Journal CRUD API
Tests player journal endpoint operations.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
TEST_EMAIL = 'stress_test_1772651200@test.com'
TEST_PASSWORD = 'TestPass123!'


@pytest.fixture
def auth_token():
    """Get auth token for test user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def authenticated_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestJournalCRUD:
    """Test Journal CRUD operations"""

    def test_get_journal_entries(self, authenticated_headers):
        """Test fetching journal entries"""
        response = requests.get(
            f"{BASE_URL}/api/player/journal",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

    def test_create_journal_entry(self, authenticated_headers):
        """Test creating a journal entry"""
        unique_id = str(uuid.uuid4())[:8]
        entry_data = {
            "title": f"TEST_Journal_{unique_id}",
            "content": "Test content for automated testing",
            "type": "session",
            "session_number": 1,
            "tags": ["test", "automated"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/player/journal",
            headers=authenticated_headers,
            json=entry_data
        )
        assert response.status_code == 200, f"Failed to create: {response.text}"
        created = response.json()
        
        assert created["title"] == entry_data["title"]
        assert created["content"] == entry_data["content"]
        assert created["type"] == entry_data["type"]
        assert "id" in created
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/player/journal/{created['id']}",
            headers=authenticated_headers
        )
        assert delete_response.status_code == 200

    def test_update_journal_entry(self, authenticated_headers):
        """Test updating a journal entry"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create entry
        create_response = requests.post(
            f"{BASE_URL}/api/player/journal",
            headers=authenticated_headers,
            json={
                "title": f"TEST_Update_{unique_id}",
                "content": "Original content",
                "type": "note"
            }
        )
        assert create_response.status_code == 200
        entry = create_response.json()
        entry_id = entry["id"]
        
        # Update entry
        update_response = requests.put(
            f"{BASE_URL}/api/player/journal/{entry_id}",
            headers=authenticated_headers,
            json={
                "title": f"TEST_Update_{unique_id}",
                "content": "Updated content",
                "type": "note"
            }
        )
        assert update_response.status_code == 200
        
        # Verify update by fetching
        get_response = requests.get(
            f"{BASE_URL}/api/player/journal",
            headers=authenticated_headers
        )
        entries = get_response.json()
        updated_entry = next((e for e in entries if e["id"] == entry_id), None)
        assert updated_entry is not None
        assert updated_entry["content"] == "Updated content"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/player/journal/{entry_id}",
            headers=authenticated_headers
        )

    def test_delete_journal_entry(self, authenticated_headers):
        """Test deleting a journal entry"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create entry
        create_response = requests.post(
            f"{BASE_URL}/api/player/journal",
            headers=authenticated_headers,
            json={
                "title": f"TEST_Delete_{unique_id}",
                "content": "To be deleted",
                "type": "note"
            }
        )
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Delete entry
        delete_response = requests.delete(
            f"{BASE_URL}/api/player/journal/{entry_id}",
            headers=authenticated_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion - entry should not be in list
        get_response = requests.get(
            f"{BASE_URL}/api/player/journal",
            headers=authenticated_headers
        )
        entries = get_response.json()
        deleted_entry = next((e for e in entries if e["id"] == entry_id), None)
        assert deleted_entry is None, "Entry was not deleted"

    def test_journal_entry_types(self, authenticated_headers):
        """Test creating entries with different types"""
        types_to_test = ["session", "combat", "npc", "location", "loot", "note"]
        created_ids = []
        
        for entry_type in types_to_test:
            unique_id = str(uuid.uuid4())[:8]
            response = requests.post(
                f"{BASE_URL}/api/player/journal",
                headers=authenticated_headers,
                json={
                    "title": f"TEST_Type_{entry_type}_{unique_id}",
                    "content": f"Testing {entry_type} type",
                    "type": entry_type
                }
            )
            assert response.status_code == 200, f"Failed to create {entry_type} entry: {response.text}"
            entry = response.json()
            assert entry["type"] == entry_type
            created_ids.append(entry["id"])
        
        # Cleanup
        for entry_id in created_ids:
            requests.delete(
                f"{BASE_URL}/api/player/journal/{entry_id}",
                headers=authenticated_headers
            )

    def test_journal_requires_auth(self):
        """Test that journal endpoints require authentication"""
        # GET without auth
        response = requests.get(f"{BASE_URL}/api/player/journal")
        assert response.status_code in [401, 403]
        
        # POST without auth
        response = requests.post(
            f"{BASE_URL}/api/player/journal",
            json={"title": "Test", "content": "Test", "type": "note"}
        )
        assert response.status_code in [401, 403]


class TestCampaignNPCLocationCRUD:
    """Test Campaign, NPC, and Location CRUD via API"""
    
    TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c'

    def test_create_npc(self, authenticated_headers):
        """Test creating an NPC in a campaign"""
        unique_id = str(uuid.uuid4())[:8]
        npc_data = {
            "name": f"TEST_NPC_{unique_id}",
            "role": "Merchant",
            "description": "Test NPC for automated testing",
            "location": "Test Town"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.TEST_CAMPAIGN_ID}/npcs",
            headers=authenticated_headers,
            json=npc_data
        )
        assert response.status_code in [200, 201], f"Failed to create NPC: {response.text}"
        npc = response.json()
        
        assert npc["name"] == npc_data["name"]
        assert "id" in npc
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.TEST_CAMPAIGN_ID}/npcs/{npc['id']}",
            headers=authenticated_headers
        )
        assert delete_response.status_code == 200

    def test_create_location(self, authenticated_headers):
        """Test creating a location in a campaign"""
        unique_id = str(uuid.uuid4())[:8]
        location_data = {
            "name": f"TEST_Location_{unique_id}",
            "location_type": "City",
            "description": "Test location for automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.TEST_CAMPAIGN_ID}/locations",
            headers=authenticated_headers,
            json=location_data
        )
        assert response.status_code in [200, 201], f"Failed to create location: {response.text}"
        location = response.json()
        
        assert location["name"] == location_data["name"]
        assert "id" in location
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.TEST_CAMPAIGN_ID}/locations/{location['id']}",
            headers=authenticated_headers
        )
        assert delete_response.status_code == 200

    def test_get_campaign_npcs(self, authenticated_headers):
        """Test fetching NPCs for a campaign"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.TEST_CAMPAIGN_ID}/npcs",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        npcs = response.json()
        assert isinstance(npcs, list)

    def test_get_campaign_locations(self, authenticated_headers):
        """Test fetching locations for a campaign"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.TEST_CAMPAIGN_ID}/locations",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        locations = response.json()
        assert isinstance(locations, list)


class TestCharacterAPI:
    """Test Character CRUD API"""

    def test_get_characters(self, authenticated_headers):
        """Test fetching user's characters"""
        response = requests.get(
            f"{BASE_URL}/api/characters",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        characters = response.json()
        assert isinstance(characters, list)

    def test_get_character_details(self, authenticated_headers):
        """Test fetching a specific character"""
        # First get list of characters
        list_response = requests.get(
            f"{BASE_URL}/api/characters",
            headers=authenticated_headers
        )
        characters = list_response.json()
        
        if len(characters) > 0:
            character_id = characters[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/characters/{character_id}",
                headers=authenticated_headers
            )
            assert response.status_code == 200
            character = response.json()
            assert character["id"] == character_id
            
            # Verify character has ability scores
            assert "strength" in character
            assert "dexterity" in character
            assert "constitution" in character
            assert "intelligence" in character
            assert "wisdom" in character
            assert "charisma" in character
