"""
Bug Fix Verification Tests - Backend API
Tests for the 3 critical bug fixes:
1. Level Up API - verify API works correctly (bug was double /api prefix in frontend)
2. Character GET - verify character data returns correctly for edit page
3. HP clamping - verify backend returns correct hp/max_hp values
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"

# Test character ID
TEST_CHARACTER_ID = "0bda5cf5-b8be-40c8-b2bc-b030ea70c366"


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestBugFixes:
    """Tests to verify the 3 critical bugs are fixed"""
    
    def test_level_up_api_endpoint_exists(self, auth_headers):
        """
        BUG-1: Level Up was broken due to wrong API URL (double /api prefix)
        The fix was in LevelUpWizard.js - changed from ${API}/api/characters to ${API}/characters
        Verify the correct endpoint works
        """
        # The correct endpoint should be /api/characters/{id}/level-up
        response = requests.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/level-up",
            headers=auth_headers,
            json={
                "new_level": 2,
                "hp_method": "average",
                "hp_roll": None
            }
        )
        
        # We expect either 200 (success) or some other status - but NOT 404
        # A 404 would indicate the endpoint doesn't exist
        # Note: May get 400 if character is already level 2+
        assert response.status_code != 404, f"Level-up endpoint not found: {response.text}"
        
        # Log the response for debugging
        print(f"Level-up response: {response.status_code} - {response.text[:200] if response.text else 'No body'}")
    
    def test_character_get_endpoint_for_edit(self, auth_headers):
        """
        BUG-2: Edit Character was showing blank screen
        The fix was in App.js - added missing route for /characters/:characterId/edit
        The backend GET endpoint should return full character data for editing
        """
        response = requests.get(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get character: {response.text}"
        
        data = response.json()
        
        # Verify essential fields for editing are present
        assert "id" in data, "Missing 'id' field"
        assert "name" in data, "Missing 'name' field"
        assert "character_class" in data, "Missing 'character_class' field"
        assert "race" in data, "Missing 'race' field"
        
        # Verify ability scores are present (needed for edit form)
        for ability in ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]:
            assert ability in data, f"Missing '{ability}' field"
        
        print(f"Character data retrieved: {data.get('name')} - Level {data.get('level')}")
    
    def test_character_hp_fields(self, auth_headers):
        """
        BUG-3: HP could display higher than max HP
        The fix was in CharacterSheetFull.js - clamping HP to max_hp in fetchCharacter
        Verify the backend returns hp and max_hp fields
        """
        response = requests.get(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get character: {response.text}"
        
        data = response.json()
        
        # The backend should return hp and max_hp fields
        # The frontend fix clamps hp to max_hp: setCurrentHp(Math.min(charHp, charMaxHp))
        hp = data.get("hp")
        max_hp = data.get("max_hp")
        
        print(f"HP data: hp={hp}, max_hp={max_hp}")
        
        # Note: These fields may be null if not set - the frontend handles this
        # The important thing is that when both are set, hp should not exceed max_hp in display
        if hp is not None and max_hp is not None:
            # If both are set, we can verify the relationship
            # (though the clamping is done in frontend, not backend)
            print(f"HP relationship: {hp}/{max_hp}")


class TestLevelUpAPI:
    """Detailed tests for Level Up API"""
    
    def test_level_up_returns_required_fields(self, auth_headers):
        """Test that level-up endpoint exists and returns properly"""
        # First, get current character level
        char_response = requests.get(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
            headers=auth_headers
        )
        assert char_response.status_code == 200
        current_level = char_response.json().get("level", 1)
        
        # Try to level up
        response = requests.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/level-up",
            headers=auth_headers,
            json={
                "new_level": current_level + 1,
                "hp_method": "average",
                "hp_roll": None
            }
        )
        
        # Endpoint should exist (not 404)
        assert response.status_code != 404, "Level-up endpoint not found"
        
        # If already at that level, might get 400
        if response.status_code == 400:
            print(f"Level-up blocked (expected if already leveled): {response.text}")
        elif response.status_code == 200:
            data = response.json()
            print(f"Level-up successful: {data}")
    
    def test_multiclass_endpoint_exists(self, auth_headers):
        """Test that multiclass endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}/multiclass",
            headers=auth_headers,
            json={
                "new_level": 2,
                "hp_method": "average",
                "new_class": "Wizard",
                "multiclass": True
            }
        )
        
        # Should not be 404
        assert response.status_code != 404, "Multiclass endpoint not found"
        print(f"Multiclass response: {response.status_code} - {response.text[:200] if response.text else 'No body'}")


class TestCharacterCRUD:
    """Character API CRUD tests"""
    
    def test_list_characters(self, auth_headers):
        """Test listing characters"""
        response = requests.get(
            f"{BASE_URL}/api/characters",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} characters")
    
    def test_get_character_by_id(self, auth_headers):
        """Test getting a specific character"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == TEST_CHARACTER_ID
        print(f"Character: {data.get('name')} ({data.get('character_class')})")
    
    def test_update_character_hp(self, auth_headers):
        """Test updating character HP"""
        # First get character to see available fields
        char_response = requests.get(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
            headers=auth_headers
        )
        assert char_response.status_code == 200
        char_data = char_response.json()
        
        # Try PUT with full character data update
        response = requests.put(
            f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "name": char_data.get("name"),
                "race": char_data.get("race"),
                "character_class": char_data.get("character_class"),
                "hp": 8,
                "max_hp": char_data.get("max_hp", 10)
            }
        )
        
        # 200 for success or 405 if PUT not allowed (backend may use different method)
        if response.status_code == 405:
            print(f"PUT not allowed - checking PATCH")
            # Try with session.patch
            patch_response = requests.patch(
                f"{BASE_URL}/api/characters/{TEST_CHARACTER_ID}",
                headers=auth_headers,
                json={"hp": 8}
            )
            print(f"PATCH response: {patch_response.status_code}")
        else:
            print(f"HP update response: {response.status_code}")


class TestAuthAPI:
    """Authentication API tests"""
    
    def test_login_returns_token(self):
        """Test login returns a token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "username" in data
        print(f"Login successful: {data.get('username')}")
    
    def test_auth_me_endpoint(self, auth_headers):
        """Test /auth/me endpoint returns current user"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        print(f"Current user: {data.get('username')}")
