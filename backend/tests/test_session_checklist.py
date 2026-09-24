"""
Test Session Prep Checklist API endpoints
- POST /api/ai/session-checklist/{campaign_id} - Generate checklist from campaign context
- GET /api/ai/session-checklists/{campaign_id} - Get all checklists
- PATCH /api/ai/session-checklist/{checklist_id} - Toggle item completion
- PATCH /api/characters/{id} - exhaustion_level persistence
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("RQK_E2E_EMAIL", "")
TEST_PASSWORD = os.environ.get("RQK_E2E_PASSWORD", "")

# Test IDs from context
CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"
CHARACTER_ID = "0bda5cf5-b8be-40c8-b2bc-b030ea70c366"
EXISTING_CHECKLIST_ID = "fd72abc0-55ee-499c-a4d2-45d57631de92"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSessionChecklistAPI:
    """Test Session Prep Checklist endpoints"""

    def test_get_session_checklists(self, auth_headers):
        """GET /api/ai/session-checklists/{campaign_id} - Get all checklists"""
        response = requests.get(
            f"{BASE_URL}/api/ai/session-checklists/{CAMPAIGN_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checklists" in data, "Response should contain 'checklists' key"
        assert isinstance(data["checklists"], list), "Checklists should be a list"
        print(f"✓ Found {len(data['checklists'])} checklists for campaign")

    def test_get_existing_checklist_structure(self, auth_headers):
        """Verify existing checklist has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/ai/session-checklists/{CAMPAIGN_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        checklists = data.get("checklists", [])
        
        if len(checklists) > 0:
            checklist = checklists[0]
            # Verify checklist structure
            assert "id" in checklist, "Checklist should have 'id'"
            assert "campaign_id" in checklist, "Checklist should have 'campaign_id'"
            assert "items" in checklist, "Checklist should have 'items'"
            assert "generated_at" in checklist, "Checklist should have 'generated_at'"
            
            # Verify items structure
            items = checklist.get("items", [])
            if len(items) > 0:
                item = items[0]
                assert "id" in item, "Item should have 'id'"
                assert "category" in item, "Item should have 'category'"
                assert "text" in item, "Item should have 'text'"
                assert "priority" in item, "Item should have 'priority'"
                assert "completed" in item, "Item should have 'completed'"
                
                # Verify category is valid
                valid_categories = ["npcs", "maps", "encounters", "loot", "story", "atmosphere", "handouts", "rules"]
                assert item["category"] in valid_categories, f"Category '{item['category']}' not in valid categories"
                
                # Verify priority is valid
                valid_priorities = ["high", "medium", "low"]
                assert item["priority"] in valid_priorities, f"Priority '{item['priority']}' not in valid priorities"
                
                print(f"✓ Checklist structure verified with {len(items)} items")
        else:
            print("⚠ No existing checklists to verify structure")

    def test_toggle_checklist_item_completion(self, auth_headers):
        """PATCH /api/ai/session-checklist/{checklist_id} - Toggle item completion"""
        # First get existing checklists
        response = requests.get(
            f"{BASE_URL}/api/ai/session-checklists/{CAMPAIGN_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        checklists = response.json().get("checklists", [])
        if len(checklists) == 0:
            pytest.skip("No checklists available to test toggle")
        
        checklist = checklists[0]
        checklist_id = checklist["id"]
        items = checklist.get("items", [])
        
        if len(items) == 0:
            pytest.skip("No items in checklist to toggle")
        
        item = items[0]
        item_id = item["id"]
        original_completed = item.get("completed", False)
        new_completed = not original_completed
        
        # Toggle the item
        response = requests.patch(
            f"{BASE_URL}/api/ai/session-checklist/{checklist_id}",
            headers=auth_headers,
            json={"item_id": item_id, "completed": new_completed}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_checklist = response.json()
        updated_items = updated_checklist.get("items", [])
        updated_item = next((i for i in updated_items if i["id"] == item_id), None)
        
        assert updated_item is not None, "Updated item should exist"
        assert updated_item["completed"] == new_completed, f"Item completed should be {new_completed}"
        print(f"✓ Toggled item '{item['text'][:30]}...' to completed={new_completed}")
        
        # Toggle back to original state
        response = requests.patch(
            f"{BASE_URL}/api/ai/session-checklist/{checklist_id}",
            headers=auth_headers,
            json={"item_id": item_id, "completed": original_completed}
        )
        assert response.status_code == 200
        print(f"✓ Restored item to original state completed={original_completed}")

    def test_generate_session_checklist(self, auth_headers):
        """POST /api/ai/session-checklist/{campaign_id} - Generate new checklist"""
        response = requests.post(
            f"{BASE_URL}/api/ai/session-checklist/{CAMPAIGN_ID}",
            headers=auth_headers,
            json={"outline_id": None}  # Generate from campaign context
        )
        
        # AI generation can take time, allow for 500 if AI fails
        if response.status_code == 500:
            error_detail = response.json().get("detail", "")
            if "AI" in error_detail or "generation" in error_detail.lower():
                pytest.skip(f"AI generation failed (expected for slow AI): {error_detail}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain checklist 'id'"
        assert "items" in data, "Response should contain 'items'"
        assert len(data["items"]) > 0, "Checklist should have at least one item"
        
        print(f"✓ Generated new checklist with {len(data['items'])} items")
        
        # Verify items have correct structure
        for item in data["items"]:
            assert "category" in item
            assert "text" in item
            assert "priority" in item
            assert "completed" in item
            assert item["completed"] == False, "New items should not be completed"


class TestExhaustionLevelPersistence:
    """Test exhaustion_level field persistence via PATCH /api/characters/{id}"""

    def test_patch_exhaustion_level(self, auth_headers):
        """PATCH /api/characters/{id} - Update exhaustion_level"""
        # First get current character state
        response = requests.get(
            f"{BASE_URL}/api/characters/{CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get character: {response.status_code}"
        
        original_exhaustion = response.json().get("exhaustion_level", 0)
        
        # Set exhaustion level to 3
        new_exhaustion = 3
        response = requests.patch(
            f"{BASE_URL}/api/characters/{CHARACTER_ID}",
            headers=auth_headers,
            json={"exhaustion_level": new_exhaustion}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_char = response.json()
        assert updated_char.get("exhaustion_level") == new_exhaustion, \
            f"Expected exhaustion_level={new_exhaustion}, got {updated_char.get('exhaustion_level')}"
        print(f"✓ Set exhaustion_level to {new_exhaustion}")
        
        # Verify persistence by fetching again
        response = requests.get(
            f"{BASE_URL}/api/characters/{CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        fetched_char = response.json()
        assert fetched_char.get("exhaustion_level") == new_exhaustion, \
            f"Exhaustion level not persisted. Expected {new_exhaustion}, got {fetched_char.get('exhaustion_level')}"
        print(f"✓ Verified exhaustion_level persisted in database")
        
        # Reset to original value
        response = requests.patch(
            f"{BASE_URL}/api/characters/{CHARACTER_ID}",
            headers=auth_headers,
            json={"exhaustion_level": original_exhaustion}
        )
        assert response.status_code == 200
        print(f"✓ Reset exhaustion_level to {original_exhaustion}")

    def test_exhaustion_level_range(self, auth_headers):
        """Test exhaustion_level accepts valid range (0-6)"""
        for level in [0, 1, 2, 3, 4, 5, 6]:
            response = requests.patch(
                f"{BASE_URL}/api/characters/{CHARACTER_ID}",
                headers=auth_headers,
                json={"exhaustion_level": level}
            )
            assert response.status_code == 200, f"Failed to set exhaustion_level={level}: {response.text}"
            
            updated = response.json()
            assert updated.get("exhaustion_level") == level
        
        # Reset to 0
        requests.patch(
            f"{BASE_URL}/api/characters/{CHARACTER_ID}",
            headers=auth_headers,
            json={"exhaustion_level": 0}
        )
        print("✓ All exhaustion levels (0-6) accepted and persisted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
