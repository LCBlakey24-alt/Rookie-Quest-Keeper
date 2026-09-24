import os
import pytest

if not os.environ.get("RQK_E2E_EMAIL") or not os.environ.get("RQK_E2E_PASSWORD"):
    pytest.skip("Requires RQK_E2E_EMAIL and RQK_E2E_PASSWORD", allow_module_level=True)

"""
Tests for POST /api/ai/generate-token endpoint
Tests token generation for combat map tokens.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": os.environ.get("RQK_E2E_EMAIL", ""),
        "password": os.environ.get("RQK_E2E_PASSWORD", "")
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed — skipping authenticated tests")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client

class TestTokenGenerationAPI:
    """Tests for POST /api/ai/generate-token"""
    
    def test_generate_token_endpoint_exists(self, api_client):
        """Test that the token generation endpoint exists (returns 401 without auth)"""
        response = api_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_id": "test-123",
            "entity_name": "Test Creature",
            "entity_type": "enemy",
            "campaign_id": "test-campaign"
        })
        # Should return 401 Unauthorized without auth, not 404
        assert response.status_code in [401, 403], f"Expected 401/403 but got {response.status_code}"

    def test_generate_token_requires_auth(self, api_client):
        """Test that token generation requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_id": "test-entity-auth",
            "entity_name": "Auth Test Creature",
            "entity_type": "enemy",
            "campaign_id": "1e6a6d0d-ad88-4b8a-9cc5-a1672119343c"
        })
        assert response.status_code in [401, 403], "Should require authentication"

    def test_generate_token_success(self, authenticated_client):
        """Test successful token generation with valid data"""
        import uuid
        test_entity_id = f"test-{uuid.uuid4()}"
        
        response = authenticated_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_id": test_entity_id,
            "entity_name": "Test Goblin Warrior",
            "entity_type": "enemy",
            "campaign_id": "1e6a6d0d-ad88-4b8a-9cc5-a1672119343c"
        })
        
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True, "Expected success: true"
        assert data.get("entity_id") == test_entity_id, "Entity ID should match"
        assert "image_url" in data, "Should return image_url"
        assert data["image_url"].startswith("data:image/png;base64,"), "Image should be base64 encoded PNG"
        assert "message" in data, "Should return success message"

    def test_generate_token_different_entity_types(self, authenticated_client):
        """Test token generation for different entity types (player, ally, enemy)"""
        import uuid
        
        for entity_type in ["player", "ally", "enemy"]:
            test_entity_id = f"test-{entity_type}-{uuid.uuid4()}"
            
            response = authenticated_client.post(f"{BASE_URL}/api/ai/generate-token", json={
                "entity_id": test_entity_id,
                "entity_name": f"Test {entity_type.capitalize()}",
                "entity_type": entity_type,
                "campaign_id": "1e6a6d0d-ad88-4b8a-9cc5-a1672119343c"
            })
            
            assert response.status_code == 200, f"Token generation failed for {entity_type}: {response.text}"
            data = response.json()
            assert data.get("success") is True, f"Expected success for {entity_type}"

    def test_generate_token_with_custom_prompt(self, authenticated_client):
        """Test token generation with custom prompt"""
        import uuid
        test_entity_id = f"test-prompt-{uuid.uuid4()}"
        
        custom_prompt = "A fearsome orc warrior with green skin, red eyes, and battle scars"
        
        response = authenticated_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_id": test_entity_id,
            "entity_name": "Orc Warrior",
            "entity_type": "enemy",
            "campaign_id": "1e6a6d0d-ad88-4b8a-9cc5-a1672119343c",
            "prompt": custom_prompt
        })
        
        assert response.status_code == 200, f"Custom prompt token generation failed: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "image_url" in data

    def test_generate_token_missing_required_fields(self, authenticated_client):
        """Test that missing required fields return validation error"""
        # Missing entity_name
        response = authenticated_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_id": "test-missing",
            "entity_type": "enemy",
            "campaign_id": "test-campaign"
        })
        assert response.status_code == 422, "Should return 422 for missing required field"

        # Missing entity_id
        response = authenticated_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_name": "Test Creature",
            "entity_type": "enemy",
            "campaign_id": "test-campaign"
        })
        assert response.status_code == 422, "Should return 422 for missing entity_id"

        # Missing campaign_id
        response = authenticated_client.post(f"{BASE_URL}/api/ai/generate-token", json={
            "entity_id": "test-id",
            "entity_name": "Test Creature",
            "entity_type": "enemy"
        })
        assert response.status_code == 422, "Should return 422 for missing campaign_id"

    def test_combat_scenarios_with_abilities(self, authenticated_client):
        """Test that combat scenarios can have abilities field"""
        campaign_id = "1e6a6d0d-ad88-4b8a-9cc5-a1672119343c"
        response = authenticated_client.get(f"{BASE_URL}/api/campaigns/{campaign_id}/combat-scenarios")
        
        assert response.status_code == 200, f"Failed to get scenarios: {response.text}"
        scenarios = response.json()
        
        # Find Shadow Wolf Hunt scenario
        shadow_wolf = next((s for s in scenarios if s.get("name") == "Shadow Wolf Hunt"), None)
        assert shadow_wolf is not None, "Shadow Wolf Hunt scenario should exist"
        
        # Verify combatants have abilities
        combatants = shadow_wolf.get("combatants", [])
        assert len(combatants) > 0, "Should have combatants"
        
        # Check first combatant has abilities
        first_combatant = combatants[0]
        assert "abilities" in first_combatant, "Combatant should have abilities field"
        assert "Multiattack" in first_combatant["abilities"], "Should have Multiattack ability"
        assert "2d6+4" in first_combatant["abilities"], "Should have dice notation in abilities"

    def test_custom_creatures_endpoint(self, authenticated_client):
        """Test that custom creatures endpoint returns creatures with abilities"""
        campaign_id = "1e6a6d0d-ad88-4b8a-9cc5-a1672119343c"
        response = authenticated_client.get(f"{BASE_URL}/api/campaigns/{campaign_id}/custom-creatures")
        
        assert response.status_code == 200, f"Failed to get creatures: {response.text}"
        creatures = response.json()
        
        # Should have at least one creature
        assert len(creatures) >= 1, "Should have at least one custom creature"
        
        # Find Shadow Wolf creature
        shadow_wolf = next((c for c in creatures if c.get("name") == "Shadow Wolf"), None)
        assert shadow_wolf is not None, "Shadow Wolf creature should exist"
        assert "abilities" in shadow_wolf, "Creature should have abilities field"
        assert shadow_wolf.get("abilities"), "Abilities should not be empty"
