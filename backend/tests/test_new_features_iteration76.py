"""
Test new features for iteration 76:
1. PATCH /api/characters/{id} - backstory field in whitelist
2. Rest Panel functionality (frontend-only, but we test the short-rest and long-rest endpoints)
3. Initiative Tracker (frontend-only)
4. Session Timer (frontend-only)
5. Quick NPC Generator (frontend-only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("RQK_E2E_EMAIL", "")
TEST_PASSWORD = os.environ.get("RQK_E2E_PASSWORD", "")

# Character IDs from test data
WIZARD_CHARACTER_ID = "a1e7babc-c582-48ec-8a64-8c71501fa281"  # Test_Orc_Wiz
CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestBackstoryPatch:
    """Test PATCH /api/characters/{id} with backstory field"""
    
    def test_patch_backstory_field(self, auth_headers):
        """Test that backstory field is accepted in PATCH request"""
        # Test PATCH with backstory object
        backstory_data = {
            "backstory": {
                "personality_traits": "Test personality traits from iteration 76",
                "ideals": "Test ideals",
                "bonds": "Test bonds",
                "flaws": "Test flaws",
                "backstory_text": "Test backstory text",
                "allies_organizations": "Test allies",
                "appearance": "Test appearance"
            }
        }
        
        patch_response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json=backstory_data
        )
        
        assert patch_response.status_code == 200, f"PATCH backstory failed: {patch_response.text}"
        
        # Verify backstory was saved
        updated_char = patch_response.json()
        assert "backstory" in updated_char, "Backstory field not in response"
        assert updated_char["backstory"].get("personality_traits") == "Test personality traits from iteration 76"
        print(f"✓ PASS: Backstory PATCH works correctly for character {WIZARD_CHARACTER_ID}")
    
    def test_patch_exhaustion_level(self, auth_headers):
        """Test that exhaustion_level field is accepted in PATCH request"""
        # Test PATCH with exhaustion_level
        patch_response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"exhaustion_level": 2}
        )
        
        assert patch_response.status_code == 200, f"PATCH exhaustion_level failed: {patch_response.text}"
        
        updated_char = patch_response.json()
        assert updated_char.get("exhaustion_level") == 2, "Exhaustion level not updated"
        print(f"✓ PASS: Exhaustion level PATCH works correctly")
        
        # Reset exhaustion level
        requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"exhaustion_level": 0}
        )


class TestRestEndpoints:
    """Test short-rest and long-rest endpoints used by RestPanel"""
    
    def test_short_rest_endpoint(self, auth_headers):
        """Test POST /api/characters/{id}/short-rest"""
        # Test short rest with hit dice
        rest_response = requests.post(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}/short-rest?hit_dice_to_spend=1",
            headers=auth_headers
        )
        
        assert rest_response.status_code == 200, f"Short rest failed: {rest_response.text}"
        print(f"✓ PASS: Short rest endpoint works correctly")
    
    def test_long_rest_endpoint(self, auth_headers):
        """Test POST /api/characters/{id}/long-rest"""
        # Test long rest
        rest_response = requests.post(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}/long-rest",
            headers=auth_headers
        )
        
        assert rest_response.status_code == 200, f"Long rest failed: {rest_response.text}"
        
        # Verify HP is restored to max
        updated_char = rest_response.json()
        assert updated_char.get("current_hit_points") == updated_char.get("max_hit_points"), \
            "HP not fully restored after long rest"
        print(f"✓ PASS: Long rest endpoint works correctly, HP restored to max")


class TestGMScreenEndpoints:
    """Test GM Screen related endpoints"""
    
    def test_campaign_access(self, auth_headers):
        """Test that campaign endpoints work for GM Screen"""
        # Test campaign fetch
        campaign_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}",
            headers=auth_headers
        )
        assert campaign_response.status_code == 200, f"Campaign fetch failed: {campaign_response.text}"
        print(f"✓ PASS: Campaign endpoint works")
    
    def test_campaign_npcs(self, auth_headers):
        """Test NPCs endpoint for GM Screen"""
        npcs_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs",
            headers=auth_headers
        )
        assert npcs_response.status_code == 200, f"NPCs fetch failed: {npcs_response.text}"
        print(f"✓ PASS: NPCs endpoint works")
    
    def test_campaign_combat_scenarios(self, auth_headers):
        """Test combat scenarios endpoint for GM Screen"""
        scenarios_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/combat-scenarios",
            headers=auth_headers
        )
        assert scenarios_response.status_code == 200, f"Combat scenarios fetch failed: {scenarios_response.text}"
        print(f"✓ PASS: Combat scenarios endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
