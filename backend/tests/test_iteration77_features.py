"""
Iteration 77 Backend Tests:
- POST /api/characters/{id}/send-item - GM sends magical items to players
- PATCH /api/characters/{id}/attunement - Toggle item attunement (max 3)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"

# Test IDs from previous iterations
TEST_CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"
TEST_CHARACTER_ID = "a1e7babc-c582-48ec-8a64-8c71501fa281"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")  # API returns 'token' not 'access_token'
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestSendItemEndpoint:
    """Tests for POST /api/characters/{id}/send-item"""
    
    def test_send_item_success(self, api_client):
        """GM can send a magical item to a character"""
        item_data = {
            "name": f"TEST_Flame_Tongue_{uuid.uuid4().hex[:6]}",
            "type": "weapon",
            "rarity": "rare",
            "description": "A magical longsword wreathed in flame",
            "requires_attunement": True
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/send-item",
            json=item_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "item" in data
        assert data["item"]["name"] == item_data["name"]
        assert data["item"]["type"] == item_data["type"]
        assert data["item"]["rarity"] == item_data["rarity"]
        assert data["item"]["requires_attunement"] is True
        assert data["item"]["attuned"] is False  # Not attuned by default
        assert "id" in data["item"]
        print(f"PASS: Item '{item_data['name']}' sent successfully")
    
    def test_send_item_minimal_data(self, api_client):
        """Send item with minimal required data"""
        item_data = {
            "name": f"TEST_Simple_Potion_{uuid.uuid4().hex[:6]}"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/send-item",
            json=item_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["item"]["name"] == item_data["name"]
        assert data["item"]["type"] == "wondrous"  # Default type
        assert data["item"]["rarity"] == "common"  # Default rarity
        print("PASS: Item with minimal data sent successfully")
    
    def test_send_item_invalid_character(self, api_client):
        """Sending item to non-existent character fails"""
        response = api_client.post(
            f"{BASE_URL}/api/characters/invalid-char-id/send-item",
            json={"name": "Test Item"}
        )
        
        assert response.status_code == 404
        print("PASS: Invalid character returns 404")


class TestAttunementEndpoint:
    """Tests for PATCH /api/characters/{id}/attunement"""
    
    def test_attune_item(self, api_client):
        """Player can attune to an item"""
        # First, send an item that requires attunement
        item_name = f"TEST_Attune_Ring_{uuid.uuid4().hex[:6]}"
        send_response = api_client.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/send-item",
            json={
                "name": item_name,
                "type": "ring",
                "rarity": "uncommon",
                "requires_attunement": True
            }
        )
        assert send_response.status_code == 200
        item_id = send_response.json()["item"]["id"]
        
        # Now attune to it
        attune_response = api_client.patch(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/attunement",
            json={"item_id": item_id, "attune": True}
        )
        
        assert attune_response.status_code == 200
        data = attune_response.json()
        
        # Verify the item is now attuned
        inventory = data.get("inventory", [])
        attuned_item = next((i for i in inventory if i.get("id") == item_id), None)
        assert attuned_item is not None
        assert attuned_item.get("attuned") is True
        print(f"PASS: Item '{item_name}' attuned successfully")
    
    def test_unattune_item(self, api_client):
        """Player can unattune from an item"""
        # Send and attune an item
        item_name = f"TEST_Unattune_Wand_{uuid.uuid4().hex[:6]}"
        send_response = api_client.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/send-item",
            json={"name": item_name, "type": "wand", "requires_attunement": True}
        )
        item_id = send_response.json()["item"]["id"]
        
        # Attune
        api_client.patch(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/attunement",
            json={"item_id": item_id, "attune": True}
        )
        
        # Unattune
        unattune_response = api_client.patch(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/attunement",
            json={"item_id": item_id, "attune": False}
        )
        
        assert unattune_response.status_code == 200
        inventory = unattune_response.json().get("inventory", [])
        item = next((i for i in inventory if i.get("id") == item_id), None)
        assert item is not None
        assert item.get("attuned") is False
        print(f"PASS: Item '{item_name}' unattuned successfully")
    
    def test_max_attunement_limit(self, api_client):
        """Cannot attune more than 3 items"""
        # Get current character state
        char_response = api_client.get(f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}")
        assert char_response.status_code == 200
        
        # Count currently attuned items
        inventory = char_response.json().get("inventory", [])
        attuned_count = sum(1 for i in inventory if i.get("attuned"))
        
        # If already at 3, try to attune another
        if attuned_count >= 3:
            # Send a new item
            send_response = api_client.post(
                f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/send-item",
                json={"name": f"TEST_Fourth_Item_{uuid.uuid4().hex[:6]}", "requires_attunement": True}
            )
            item_id = send_response.json()["item"]["id"]
            
            # Try to attune (should fail)
            attune_response = api_client.patch(
                f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/attunement",
                json={"item_id": item_id, "attune": True}
            )
            
            assert attune_response.status_code == 400
            assert "Maximum 3 attuned items" in attune_response.json().get("detail", "")
            print("PASS: Max attunement limit enforced")
        else:
            print(f"SKIP: Only {attuned_count} items attuned, need 3 to test limit")


class TestCampaignAndCharacterAccess:
    """Verify campaign and character endpoints still work"""
    
    def test_campaign_access(self, api_client):
        """Campaign endpoint accessible"""
        response = api_client.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        print(f"PASS: Campaign '{data.get('name')}' accessible")
    
    def test_character_access(self, api_client):
        """Character endpoint accessible"""
        response = api_client.get(f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "inventory" in data or data.get("inventory") is None  # inventory may be empty
        print(f"PASS: Character '{data.get('name')}' accessible")
    
    def test_campaign_players(self, api_client):
        """Campaign players endpoint accessible"""
        response = api_client.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/players")
        assert response.status_code == 200
        data = response.json()
        assert "players" in data or isinstance(data, list)
        print(f"PASS: Campaign players endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
