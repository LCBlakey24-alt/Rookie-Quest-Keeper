import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')
TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c'

# Test user credentials
TEST_USER_EMAIL = 'stress_test_1772651200@test.com'
TEST_USER_PASSWORD = 'TestPass123!'


@pytest.fixture(scope='module')
def auth_token():
    """Get authentication token for test user."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json().get('token')


@pytest.fixture(scope='module')
def auth_headers(auth_token):
    """Authenticated headers."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestNPCEndpoints:
    """Test NPC-related API endpoints for NPC Quick Reference feature."""
    
    def test_get_campaign_npcs(self, auth_headers):
        """Test GET /api/campaigns/{id}/npcs endpoint returns list of NPCs."""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/npcs",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        npcs = response.json()
        assert isinstance(npcs, list), "NPCs should be a list"
        
        # If NPCs exist, verify structure
        if len(npcs) > 0:
            npc = npcs[0]
            assert 'id' in npc, "NPC should have an 'id' field"
            assert 'name' in npc, "NPC should have a 'name' field"

    def test_create_and_delete_npc(self, auth_headers):
        """Test creating and deleting an NPC via API."""
        # Create NPC
        npc_data = {
            "name": "TEST_NPC_Quick_Reference",
            "race": "Human",
            "occupation": "Merchant",
            "description": "A test NPC for Quick Reference feature testing",
            "personality": "Friendly and helpful",
            "notes": "Auto-generated test NPC"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/npcs",
            json=npc_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201, f"Failed to create NPC: {create_response.text}"
        
        created_npc = create_response.json()
        npc_id = created_npc.get('id')
        assert npc_id is not None, "Created NPC should have an ID"
        
        # Verify NPC appears in list
        list_response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/npcs",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        npcs = list_response.json()
        npc_ids = [n['id'] for n in npcs]
        assert npc_id in npc_ids, "Created NPC should appear in list"
        
        # Clean up - delete NPC
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/npcs/{npc_id}",
            headers=auth_headers
        )
        assert delete_response.status_code in [200, 204], f"Failed to delete NPC: {delete_response.text}"


class TestLocationEndpoints:
    """Test Location API endpoints used in NPC Quick Reference for filtering."""
    
    def test_get_campaign_locations(self, auth_headers):
        """Test GET /api/campaigns/{id}/locations endpoint."""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/locations",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        locations = response.json()
        assert isinstance(locations, list), "Locations should be a list"
        
        # If locations exist, verify structure
        if len(locations) > 0:
            location = locations[0]
            assert 'id' in location, "Location should have an 'id' field"
            assert 'name' in location, "Location should have a 'name' field"


class TestCampaignEndpoints:
    """Test Campaign endpoints for Dashboard features."""
    
    def test_get_campaigns(self, auth_headers):
        """Test GET /api/campaigns endpoint returns list of campaigns."""
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Campaigns should be a list"
        
        # Should have at least the test campaign
        campaign_ids = [c['id'] for c in campaigns]
        assert TEST_CAMPAIGN_ID in campaign_ids, "Test campaign should be in list"

    def test_get_campaign_details(self, auth_headers):
        """Test GET /api/campaigns/{id} endpoint."""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        campaign = response.json()
        assert campaign.get('id') == TEST_CAMPAIGN_ID
        assert 'name' in campaign


class TestCharacterEndpoints:
    """Test Character endpoints for Dashboard features."""
    
    def test_get_characters(self, auth_headers):
        """Test GET /api/characters endpoint returns list of characters."""
        response = requests.get(
            f"{BASE_URL}/api/characters",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        characters = response.json()
        assert isinstance(characters, list), "Characters should be a list"
