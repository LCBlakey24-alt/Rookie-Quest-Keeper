"""
Test P1 Feature Batch: Session Journal, World Map, Combat Creator, Party Inventory
Tests for backend PATCH endpoint with currency and attuned_items fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("RQK_E2E_EMAIL", "")
TEST_PASSWORD = os.environ.get("RQK_E2E_PASSWORD", "")
WIZARD_CHARACTER_ID = "9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7"
FIGHTER_CHARACTER_ID = "0bda5cf5-b8be-40c8-b2bc-b030ea70c366"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPatchEndpointCurrencyAndAttunement:
    """Test PATCH /api/characters/{id} with currency and attuned_items fields"""
    
    def test_patch_currency_dict(self, auth_headers):
        """Test PATCH with currency dict containing all coin types"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "currency": {
                    "copper": 100,
                    "silver": 50,
                    "electrum": 10,
                    "gold": 25,
                    "platinum": 5
                }
            }
        )
        assert response.status_code == 200, f"PATCH currency failed: {response.text}"
        data = response.json()
        assert "currency" in data, "Response should contain currency field"
        assert data["currency"]["copper"] == 100
        assert data["currency"]["silver"] == 50
        assert data["currency"]["electrum"] == 10
        assert data["currency"]["gold"] == 25
        assert data["currency"]["platinum"] == 5
        print("PASSED: PATCH currency dict with all coin types")
    
    def test_patch_gold_shorthand(self, auth_headers):
        """Test PATCH with gold field directly (shorthand)"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"gold": 100}
        )
        assert response.status_code == 200, f"PATCH gold failed: {response.text}"
        data = response.json()
        # Gold should be stored - check if it's in currency or as gold field
        assert data.get("gold") == 100 or data.get("currency", {}).get("gold") == 100, \
            "Gold should be updated"
        print("PASSED: PATCH gold shorthand field")
    
    def test_patch_attuned_items_single(self, auth_headers):
        """Test PATCH with single attuned item"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "attuned_items": ["Cloak of Protection"]
            }
        )
        assert response.status_code == 200, f"PATCH attuned_items failed: {response.text}"
        data = response.json()
        assert "attuned_items" in data, "Response should contain attuned_items field"
        assert "Cloak of Protection" in data["attuned_items"]
        print("PASSED: PATCH attuned_items with single item")
    
    def test_patch_attuned_items_max_three(self, auth_headers):
        """Test PATCH with maximum 3 attuned items"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "attuned_items": [
                    "Cloak of Protection",
                    "Ring of Protection",
                    "Amulet of Health"
                ]
            }
        )
        assert response.status_code == 200, f"PATCH attuned_items max 3 failed: {response.text}"
        data = response.json()
        assert len(data.get("attuned_items", [])) == 3
        print("PASSED: PATCH attuned_items with max 3 items")
    
    def test_patch_attuned_items_clear(self, auth_headers):
        """Test PATCH to clear attuned items"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"attuned_items": []}
        )
        assert response.status_code == 200, f"PATCH clear attuned_items failed: {response.text}"
        data = response.json()
        assert data.get("attuned_items") == [] or data.get("attuned_items") is None
        print("PASSED: PATCH clear attuned_items")
    
    def test_patch_combined_currency_and_attunement(self, auth_headers):
        """Test PATCH with both currency and attuned_items"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "currency": {"gold": 50, "silver": 100},
                "attuned_items": ["Staff of Power"]
            }
        )
        assert response.status_code == 200, f"PATCH combined failed: {response.text}"
        data = response.json()
        assert "currency" in data or "gold" in data
        assert "attuned_items" in data
        print("PASSED: PATCH combined currency and attuned_items")


class TestJournalEndpoints:
    """Test Player Journal endpoints for Session Journal feature"""
    
    def test_get_journal_entries(self, auth_headers):
        """Test GET /api/player/journal"""
        response = requests.get(
            f"{BASE_URL}/api/player/journal",
            headers=auth_headers,
            params={"character_id": WIZARD_CHARACTER_ID}
        )
        assert response.status_code == 200, f"GET journal failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Journal entries should be a list"
        print(f"PASSED: GET journal entries - found {len(data)} entries")
    
    def test_create_journal_entry_with_tags(self, auth_headers):
        """Test POST /api/player/journal with auto-detected tags"""
        response = requests.post(
            f"{BASE_URL}/api/player/journal",
            headers=auth_headers,
            json={
                "character_id": WIZARD_CHARACTER_ID,
                "title": "Battle at the Goblin Cave",
                "content": "We fought the goblins and found treasure. The quest continues!",
                "type": "session",
                "session_number": 1,
                "tags": ["combat", "loot", "quest"]  # Auto-detected tags
            }
        )
        assert response.status_code == 200, f"POST journal failed: {response.text}"
        data = response.json()
        assert data.get("title") == "Battle at the Goblin Cave"
        assert "tags" in data
        assert "combat" in data["tags"]
        assert "loot" in data["tags"]
        assert "quest" in data["tags"]
        print("PASSED: POST journal entry with tags")
        return data.get("id")
    
    def test_update_journal_entry(self, auth_headers):
        """Test PUT /api/player/journal/{id}"""
        # First create an entry
        create_response = requests.post(
            f"{BASE_URL}/api/player/journal",
            headers=auth_headers,
            json={
                "character_id": WIZARD_CHARACTER_ID,
                "title": "Test Entry for Update",
                "content": "Original content",
                "type": "note",
                "tags": []
            }
        )
        assert create_response.status_code == 200
        entry_id = create_response.json().get("id")
        
        # Update the entry
        update_response = requests.put(
            f"{BASE_URL}/api/player/journal/{entry_id}",
            headers=auth_headers,
            json={
                "title": "Updated Entry",
                "content": "Updated content with combat and magic keywords",
                "type": "combat",
                "tags": ["combat", "magic"]
            }
        )
        assert update_response.status_code == 200, f"PUT journal failed: {update_response.text}"
        print("PASSED: PUT journal entry update")
    
    def test_delete_journal_entry(self, auth_headers):
        """Test DELETE /api/player/journal/{id}"""
        # First create an entry
        create_response = requests.post(
            f"{BASE_URL}/api/player/journal",
            headers=auth_headers,
            json={
                "character_id": WIZARD_CHARACTER_ID,
                "title": "Entry to Delete",
                "content": "This will be deleted",
                "type": "note",
                "tags": []
            }
        )
        assert create_response.status_code == 200
        entry_id = create_response.json().get("id")
        
        # Delete the entry
        delete_response = requests.delete(
            f"{BASE_URL}/api/player/journal/{entry_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"DELETE journal failed: {delete_response.text}"
        print("PASSED: DELETE journal entry")


class TestCampaignInventoryEndpoints:
    """Test Campaign Inventory endpoints for Party Inventory feature"""
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_headers):
        """Get a campaign ID for testing"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=auth_headers)
        assert response.status_code == 200
        campaigns = response.json()
        if campaigns:
            return campaigns[0].get("id")
        pytest.skip("No campaigns available for testing")
    
    def test_get_campaign_inventory(self, auth_headers, campaign_id):
        """Test GET /api/campaigns/{id}/inventory"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/inventory",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET inventory failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Inventory should be a list"
        print(f"PASSED: GET campaign inventory - found {len(data)} items")
    
    def test_get_campaign_currency(self, auth_headers, campaign_id):
        """Test GET /api/campaigns/{id}/currency"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/currency",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET currency failed: {response.text}"
        data = response.json()
        # Currency should have coin types
        assert isinstance(data, dict), "Currency should be a dict"
        print(f"PASSED: GET campaign currency")
    
    def test_update_campaign_currency(self, auth_headers, campaign_id):
        """Test PUT /api/campaigns/{id}/currency"""
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/currency",
            headers=auth_headers,
            json={"gold": 100}
        )
        assert response.status_code == 200, f"PUT currency failed: {response.text}"
        print("PASSED: PUT campaign currency")
    
    def test_add_inventory_item(self, auth_headers, campaign_id):
        """Test POST /api/campaigns/{id}/inventory"""
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/inventory",
            headers=auth_headers,
            json={
                "name": "Test Potion of Healing",
                "quantity": 2,
                "item_type": "potion",
                "value": "50 gp",
                "is_magical": False
            }
        )
        assert response.status_code in [200, 201], f"POST inventory failed: {response.text}"
        data = response.json()
        assert data.get("name") == "Test Potion of Healing"
        print("PASSED: POST inventory item")
        return data.get("id")


class TestCombatScenarioEndpoints:
    """Test Combat Scenario endpoints for Combat Creator feature"""
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_headers):
        """Get a campaign ID for testing"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=auth_headers)
        assert response.status_code == 200
        campaigns = response.json()
        if campaigns:
            return campaigns[0].get("id")
        pytest.skip("No campaigns available for testing")
    
    def test_get_combat_scenarios(self, auth_headers, campaign_id):
        """Test GET /api/campaigns/{id}/combat-scenarios"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/combat-scenarios",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET combat scenarios failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Combat scenarios should be a list"
        print(f"PASSED: GET combat scenarios - found {len(data)} scenarios")
    
    def test_get_campaign_npcs(self, auth_headers, campaign_id):
        """Test GET /api/campaigns/{id}/npcs for Quick NPC Bar"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/npcs",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET NPCs failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "NPCs should be a list"
        print(f"PASSED: GET campaign NPCs - found {len(data)} NPCs")


class TestWorldMapEndpoints:
    """Test World Map endpoints for pin hover preview feature"""
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_headers):
        """Get a campaign ID for testing"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=auth_headers)
        assert response.status_code == 200
        campaigns = response.json()
        if campaigns:
            return campaigns[0].get("id")
        pytest.skip("No campaigns available for testing")
    
    def test_get_world_maps(self, auth_headers, campaign_id):
        """Test GET /api/campaigns/{id}/world-maps"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/world-maps",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET world maps failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "World maps should be a list"
        print(f"PASSED: GET world maps - found {len(data)} maps")
        
        # Check if maps have pins with description for hover preview
        for map_data in data:
            if map_data.get("pins"):
                for pin in map_data["pins"]:
                    # Pins should have name, pin_type, and optionally description
                    assert "name" in pin, "Pin should have name"
                    assert "pin_type" in pin or "type" in pin, "Pin should have type"
                    print(f"  - Pin: {pin.get('name')} ({pin.get('pin_type', pin.get('type'))})")


class TestCleanup:
    """Cleanup test data"""
    
    def test_reset_wizard_character(self, auth_headers):
        """Reset wizard character to clean state"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "currency": {"copper": 0, "silver": 0, "electrum": 0, "gold": 0, "platinum": 0},
                "attuned_items": []
            }
        )
        assert response.status_code == 200
        print("PASSED: Reset wizard character")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
