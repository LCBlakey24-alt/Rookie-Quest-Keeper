"""
Backend tests for Campaign Content API (Structured Ruleset Integration)
Tests the /api/campaigns/{id}/content endpoints for custom races, classes, subclasses, backgrounds, and feats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "Trigger24?!"
TEST_CAMPAIGN_ID = "eabd4ae0-d1d8-40a5-858e-f7772af1d2ce"


@pytest.fixture
def auth_token():
    """Get auth token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture
def authenticated_session(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCampaignContentAPI:
    """Tests for /api/campaigns/{id}/content endpoint"""

    def test_get_campaign_content_returns_custom_content(self, authenticated_session):
        """Test that GET /api/campaigns/{id}/content returns custom races, classes, etc."""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "rulesets" in data, "Response should contain 'rulesets'"
        assert "races" in data, "Response should contain 'races'"
        assert "classes" in data, "Response should contain 'classes'"
        assert "subclasses" in data, "Response should contain 'subclasses'"
        assert "backgrounds" in data, "Response should contain 'backgrounds'"
        assert "feats" in data, "Response should contain 'feats'"
        assert "has_custom_content" in data, "Response should contain 'has_custom_content'"
        
        # Verify has_custom_content flag is set when content exists
        if len(data["races"]) > 0 or len(data["classes"]) > 0:
            assert data["has_custom_content"] is True, "has_custom_content should be True when custom content exists"

    def test_custom_races_contain_required_fields(self, authenticated_session):
        """Test that custom races have required fields including ability_bonuses"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content")
        assert response.status_code == 200
        
        data = response.json()
        races = data.get("races", [])
        
        if len(races) == 0:
            pytest.skip("No custom races found in campaign")
        
        for race in races:
            assert "name" in race, "Race should have 'name'"
            assert "id" in race, "Race should have 'id'"
            assert "campaign_id" in race, "Race should have 'campaign_id'"
            assert race["campaign_id"] == TEST_CAMPAIGN_ID, "Race campaign_id should match"
            
            # Verify ability_bonuses field exists and is properly formatted
            if "ability_bonuses" in race:
                bonuses = race["ability_bonuses"]
                assert isinstance(bonuses, dict), "ability_bonuses should be a dict"
                # Common stat names
                valid_stats = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
                for stat in bonuses:
                    assert stat.lower() in valid_stats, f"Unknown stat: {stat}"

    def test_custom_classes_contain_required_fields(self, authenticated_session):
        """Test that custom classes have required fields"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content")
        assert response.status_code == 200
        
        data = response.json()
        classes = data.get("classes", [])
        
        if len(classes) == 0:
            pytest.skip("No custom classes found in campaign")
        
        for cls in classes:
            assert "name" in cls, "Class should have 'name'"
            assert "id" in cls, "Class should have 'id'"
            assert "campaign_id" in cls, "Class should have 'campaign_id'"
            assert cls["campaign_id"] == TEST_CAMPAIGN_ID, "Class campaign_id should match"
            
            # Verify hit_die field
            if "hit_die" in cls:
                hit_die = cls["hit_die"]
                assert hit_die.startswith("d"), f"hit_die should start with 'd', got {hit_die}"

    def test_get_campaign_content_races_endpoint(self, authenticated_session):
        """Test GET /api/campaigns/{id}/content/races"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content/races")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "races" in data
        assert "count" in data
        assert data["count"] == len(data["races"])

    def test_get_campaign_content_classes_endpoint(self, authenticated_session):
        """Test GET /api/campaigns/{id}/content/classes"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content/classes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "classes" in data
        assert "count" in data
        assert data["count"] == len(data["classes"])

    def test_get_campaign_content_subclasses_endpoint(self, authenticated_session):
        """Test GET /api/campaigns/{id}/content/subclasses"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content/subclasses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subclasses" in data
        assert "count" in data

    def test_get_campaign_content_backgrounds_endpoint(self, authenticated_session):
        """Test GET /api/campaigns/{id}/content/backgrounds"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content/backgrounds")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "backgrounds" in data
        assert "count" in data

    def test_get_campaign_content_feats_endpoint(self, authenticated_session):
        """Test GET /api/campaigns/{id}/content/feats"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content/feats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "feats" in data
        assert "count" in data


class TestCampaignContentAccess:
    """Tests for campaign content access control"""

    def test_unauthenticated_access_returns_401(self):
        """Test that unauthenticated requests return 401/403"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content")
        # Should fail without authentication
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_campaign_info_returns_name(self, authenticated_session):
        """Test that GET /api/campaigns/{id} returns campaign name"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "name" in data, "Campaign should have 'name'"
        assert "id" in data, "Campaign should have 'id'"
        assert data["id"] == TEST_CAMPAIGN_ID, "Campaign ID should match"
        # Verify name is not empty
        assert len(data["name"]) > 0, "Campaign name should not be empty"


class TestAbilityBonusesFormat:
    """Tests specifically for ability_bonuses field formatting"""

    def test_ability_bonuses_object_format(self, authenticated_session):
        """Test that ability_bonuses is returned as an object that can be formatted"""
        response = authenticated_session.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/content")
        assert response.status_code == 200
        
        data = response.json()
        races = data.get("races", [])
        
        if len(races) == 0:
            pytest.skip("No custom races found")
        
        for race in races:
            if "ability_bonuses" in race:
                bonuses = race["ability_bonuses"]
                # Should be a dict like {"strength": 2, "charisma": 1}
                assert isinstance(bonuses, dict), f"ability_bonuses should be dict, got {type(bonuses)}"
                
                # Values should be integers
                for stat, value in bonuses.items():
                    assert isinstance(value, int), f"Bonus value should be int, got {type(value)} for {stat}"
                    
                # Test that it can be formatted to string like "+2 STR, +1 CHA"
                stat_map = {
                    'strength': 'STR', 'dexterity': 'DEX', 'constitution': 'CON',
                    'intelligence': 'INT', 'wisdom': 'WIS', 'charisma': 'CHA'
                }
                parts = []
                for stat, value in bonuses.items():
                    if value:
                        abbrev = stat_map.get(stat.lower(), stat.upper())
                        parts.append(f"+{value} {abbrev}")
                formatted = ', '.join(parts)
                assert len(formatted) > 0, "Formatted string should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
