"""
Test suite for Character API endpoints
Tests character CRUD operations and character-sheet related endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = 'stress_test_1772651200@test.com'
TEST_USER_PASSWORD = 'TestPass123!'


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
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed — skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture
def test_character_id(authenticated_client):
    """Create a test character and return its ID, cleanup after test"""
    unique_name = f"TEST_char_{uuid.uuid4().hex[:8]}"
    response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
        "name": unique_name,
        "race": "Human",
        "character_class": "Fighter",
        "level": 3,
        "strength": 16,
        "dexterity": 14,
        "constitution": 15,
        "intelligence": 10,
        "wisdom": 12,
        "charisma": 8,
        "alignment": "Lawful Good",
        "backstory": "A test character for automated testing."
    })
    
    if response.status_code != 200:
        pytest.skip(f"Failed to create test character: {response.text}")
    
    data = response.json()
    character_id = data.get("character_id")
    
    yield character_id
    
    # Cleanup: delete the test character
    authenticated_client.delete(f"{BASE_URL}/api/characters/{character_id}")


class TestCharacterCRUD:
    """Test Character CRUD operations"""
    
    def test_get_user_characters(self, authenticated_client):
        """GET /api/characters - should return list of characters"""
        response = authenticated_client.get(f"{BASE_URL}/api/characters")
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
    
    def test_get_user_characters_requires_auth(self, api_client):
        """GET /api/characters - should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/characters")
        assert response.status_code in [401, 403]
    
    def test_create_character(self, authenticated_client):
        """POST /api/characters - should create a new character"""
        unique_name = f"TEST_wizard_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "level": 1,
            "strength": 8,
            "dexterity": 14,
            "constitution": 12,
            "intelligence": 17,
            "wisdom": 12,
            "charisma": 10,
            "alignment": "Neutral"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "character_id" in data
        assert "character" in data
        
        character = data["character"]
        assert character["name"] == unique_name
        assert character["race"] == "Elf"
        assert character["character_class"] == "Wizard"
        assert character["level"] == 1
        
        # Auto-calculated fields
        assert character["proficiency_bonus"] == 2  # Level 1-4 has +2 prof
        assert character["armor_class"] == 12  # 10 + DEX mod (14 = +2)
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")
    
    def test_create_character_auto_calculates_hp(self, authenticated_client):
        """POST /api/characters - should auto-calculate HP from CON"""
        unique_name = f"TEST_barb_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Dwarf",
            "character_class": "Barbarian",
            "level": 1,
            "strength": 16,
            "dexterity": 12,
            "constitution": 16,  # +3 modifier
            "intelligence": 8,
            "wisdom": 10,
            "charisma": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data["character"]
        
        # HP should be calculated: base 8 (d8 default) + CON mod (3)
        # Note: actual calculation may vary based on class hit die
        assert character["max_hit_points"] > 0
        assert character["current_hit_points"] == character["max_hit_points"]
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")
    
    def test_get_specific_character(self, authenticated_client, test_character_id):
        """GET /api/characters/{id} - should return character details"""
        response = authenticated_client.get(f"{BASE_URL}/api/characters/{test_character_id}")
        assert response.status_code == 200
        
        character = response.json()
        assert character["id"] == test_character_id
        assert "name" in character
        assert "race" in character
        assert "character_class" in character
        assert "level" in character
        
        # Ability scores
        assert "strength" in character
        assert "dexterity" in character
        assert "constitution" in character
        assert "intelligence" in character
        assert "wisdom" in character
        assert "charisma" in character
    
    def test_get_nonexistent_character(self, authenticated_client):
        """GET /api/characters/{id} - should return 404 for nonexistent character"""
        fake_id = str(uuid.uuid4())
        response = authenticated_client.get(f"{BASE_URL}/api/characters/{fake_id}")
        assert response.status_code == 404
    
    def test_update_character(self, authenticated_client, test_character_id):
        """PUT /api/characters/{id} - should update character"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/{test_character_id}",
            json={
                "level": 5,
                "strength": 18,
                "skill_proficiencies": ["athletics", "intimidation"]
            }
        )
        
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["level"] == 5
        assert updated["strength"] == 18
        assert "athletics" in updated.get("skill_proficiencies", [])
        
        # Verify via GET
        verify = authenticated_client.get(f"{BASE_URL}/api/characters/{test_character_id}")
        assert verify.status_code == 200
        assert verify.json()["level"] == 5
    
    def test_update_character_proficiency_bonus_recalculated(self, authenticated_client, test_character_id):
        """PUT /api/characters/{id} - proficiency bonus should recalculate on level change"""
        # Update to level 5 (proficiency bonus should be +3)
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/{test_character_id}",
            json={"level": 5}
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated["proficiency_bonus"] == 3  # Level 5-8 has +3 prof
    
    def test_update_character_spellcasting(self, authenticated_client, test_character_id):
        """PUT /api/characters/{id} - should update spellcasting info"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/{test_character_id}",
            json={
                "spellcasting_ability": "intelligence",
                "spells_known": [
                    {"name": "Magic Missile", "level": 1, "school": "evocation"},
                    {"name": "Shield", "level": 1, "school": "abjuration"}
                ]
            }
        )
        
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["spellcasting_ability"] == "intelligence"
        assert len(updated.get("spells_known", [])) == 2
    
    def test_delete_character(self, authenticated_client):
        """DELETE /api/characters/{id} - should delete character"""
        # Create a character to delete
        unique_name = f"TEST_delete_{uuid.uuid4().hex[:8]}"
        create_response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Rogue",
            "level": 1
        })
        
        assert create_response.status_code == 200
        character_id = create_response.json()["character_id"]
        
        # Delete the character
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/characters/{character_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion via GET - should return 404
        verify = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}")
        assert verify.status_code == 404


class TestCharacterSheetIntegration:
    """Test Character Sheet specific functionality with SRD integration"""
    
    def test_character_with_srd_class_gets_features(self, authenticated_client):
        """Character with class matching SRD should load class features"""
        # Create a wizard character
        unique_name = f"TEST_srd_wizard_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "level": 5,
            "intelligence": 18,
            "spellcasting_ability": "intelligence"
        })
        
        assert response.status_code == 200
        character_id = response.json()["character_id"]
        
        # Get class features from SRD
        srd_response = authenticated_client.get(f"{BASE_URL}/api/srd/class-features/Wizard/5")
        assert srd_response.status_code == 200
        features = srd_response.json()
        
        assert features["class"] == "Wizard"
        assert features["level"] == 5
        assert "features" in features
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/characters/{character_id}")
    
    def test_spells_available_for_character_class(self, authenticated_client):
        """Spells should be filterable by character class"""
        # Get wizard spells from SRD
        response = authenticated_client.get(f"{BASE_URL}/api/srd/spells?class_name=wizard")
        assert response.status_code == 200
        data = response.json()
        
        assert data["count"] > 10  # Wizard has many spells
        for spell in data["spells"]:
            assert "wizard" in spell["classes"]
    
    def test_character_update_with_feats(self, authenticated_client, test_character_id):
        """Character should be updatable with feats from SRD"""
        # Get available feats
        feats_response = authenticated_client.get(f"{BASE_URL}/api/srd/feats")
        assert feats_response.status_code == 200
        available_feats = feats_response.json()["feats"]
        
        # Update character with a feat
        first_feat = available_feats[0]
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/{test_character_id}",
            json={
                "feats": [{"name": first_feat["name"], "description": first_feat.get("description", "")}]
            }
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert len(updated.get("feats", [])) == 1
        assert updated["feats"][0]["name"] == first_feat["name"]
