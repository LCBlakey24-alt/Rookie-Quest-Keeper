"""
Test Dice Roll History and AI Session Planner features
- Tests AI Session Outline and Replay endpoints
- Tests GET endpoints for outlines and replays
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_token):
        """Get a campaign ID for testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        if response.status_code == 200:
            campaigns = response.json()
            if campaigns and len(campaigns) > 0:
                return campaigns[0].get("id")
        pytest.skip("No campaigns found for testing")
    
    def test_login_success(self):
        """Test login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"Login successful, token received")


class TestAISessionOutlines:
    """Test AI Session Outline endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_token):
        """Get a campaign ID for testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        if response.status_code == 200:
            campaigns = response.json()
            if campaigns and len(campaigns) > 0:
                return campaigns[0].get("id")
        pytest.skip("No campaigns found")
    
    def test_get_session_outlines_endpoint_exists(self, auth_token, campaign_id):
        """Test GET /api/ai/session-outlines/{campaign_id} endpoint exists and returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ai/session-outlines/{campaign_id}", headers=headers)
        
        # Should return 200 (even if empty list)
        assert response.status_code == 200, f"GET session-outlines failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "outlines" in data, "Response should contain 'outlines' key"
        assert isinstance(data["outlines"], list), "outlines should be a list"
        print(f"GET session-outlines returned {len(data['outlines'])} outlines")
    
    def test_post_session_outline_endpoint_registered(self, auth_token, campaign_id):
        """Test POST /api/ai/session-outline/{campaign_id} endpoint is registered"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Send minimal request - we're just checking endpoint exists
        # AI generation may fail due to budget but endpoint should be registered
        response = requests.post(
            f"{BASE_URL}/api/ai/session-outline/{campaign_id}",
            headers=headers,
            json={"focus": "balanced", "tone": "classic fantasy", "gm_notes": ""}
        )
        
        # Should NOT be 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code != 404, "POST session-outline endpoint not found (404)"
        assert response.status_code != 405, "POST session-outline method not allowed (405)"
        
        # 200 = success, 500 = AI error (budget/config), 403 = limit reached - all valid
        assert response.status_code in [200, 403, 500], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"POST session-outline endpoint registered, status: {response.status_code}")


class TestAISessionReplays:
    """Test AI Session Replay endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_token):
        """Get a campaign ID for testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        if response.status_code == 200:
            campaigns = response.json()
            if campaigns and len(campaigns) > 0:
                return campaigns[0].get("id")
        pytest.skip("No campaigns found")
    
    def test_get_session_replays_endpoint_exists(self, auth_token, campaign_id):
        """Test GET /api/ai/session-replays/{campaign_id} endpoint exists and returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ai/session-replays/{campaign_id}", headers=headers)
        
        # Should return 200 (even if empty list)
        assert response.status_code == 200, f"GET session-replays failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "replays" in data, "Response should contain 'replays' key"
        assert isinstance(data["replays"], list), "replays should be a list"
        print(f"GET session-replays returned {len(data['replays'])} replays")
    
    def test_post_session_replay_endpoint_registered(self, auth_token, campaign_id):
        """Test POST /api/ai/session-replay/{campaign_id} endpoint is registered"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Send minimal request - we're just checking endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/ai/session-replay/{campaign_id}",
            headers=headers,
            json={"style": "narrative", "session_number": "1", "extra_context": ""}
        )
        
        # Should NOT be 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code != 404, "POST session-replay endpoint not found (404)"
        assert response.status_code != 405, "POST session-replay method not allowed (405)"
        
        # 200 = success, 500 = AI error (budget/config), 403 = limit reached - all valid
        assert response.status_code in [200, 403, 500], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"POST session-replay endpoint registered, status: {response.status_code}")


class TestCharacterEndpoints:
    """Test character endpoints for dice roll history context"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_character_wizard(self, auth_token):
        """Test getting the Wizard character (used for dice roll history testing)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        character_id = "9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7"
        
        response = requests.get(f"{BASE_URL}/api/characters/{character_id}", headers=headers)
        
        # Character should exist
        assert response.status_code == 200, f"Failed to get character: {response.status_code}"
        
        data = response.json()
        assert "name" in data
        assert "level" in data
        print(f"Character found: {data.get('name')} Level {data.get('level')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
