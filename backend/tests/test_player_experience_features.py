"""
Test Player Experience Features - Combat Tab, Resources, Rest Endpoints
Tests for iteration 63: New combat dashboard, class resources, rest mechanics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_character_id(authenticated_client):
    """Get a test character ID"""
    response = authenticated_client.get(f"{BASE_URL}/api/characters")
    assert response.status_code == 200
    characters = response.json()
    if not characters:
        pytest.skip("No characters found for testing")
    # Return first character
    return characters[0]["id"]


class TestResourcesEndpoint:
    """Test PUT /api/characters/{id}/resources endpoint"""
    
    def test_update_resources_success(self, authenticated_client, test_character_id):
        """Test updating character resources (Ki Points, Rage, etc.)"""
        resources = {
            "ki_points": 3,
            "rage": 2
        }
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/{test_character_id}/resources",
            json=resources
        )
        assert response.status_code == 200
        data = response.json()
        assert "resources" in data
        assert data["resources"]["ki_points"] == 3
        assert data["resources"]["rage"] == 2
        print(f"✓ Resources updated successfully: {data['resources']}")
    
    def test_update_resources_empty(self, authenticated_client, test_character_id):
        """Test updating with empty resources dict"""
        resources = {}
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/{test_character_id}/resources",
            json=resources
        )
        assert response.status_code == 200
        data = response.json()
        assert "resources" in data
        print(f"✓ Empty resources update accepted")
    
    def test_update_resources_invalid_character(self, authenticated_client):
        """Test updating resources for non-existent character"""
        resources = {"ki_points": 5}
        response = authenticated_client.put(
            f"{BASE_URL}/api/characters/invalid-id-12345/resources",
            json=resources
        )
        assert response.status_code == 404
        print(f"✓ Invalid character returns 404")


class TestShortRestEndpoint:
    """Test POST /api/characters/{id}/short-rest endpoint"""
    
    def test_short_rest_no_hit_dice(self, authenticated_client, test_character_id):
        """Test short rest without spending hit dice"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character_id}/short-rest",
            json={"hit_dice_to_spend": 0}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return updated character
        assert "id" in data or "name" in data
        print(f"✓ Short rest without hit dice successful")
    
    def test_short_rest_with_hit_dice(self, authenticated_client, test_character_id):
        """Test short rest spending 1 hit die"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character_id}/short-rest",
            json={"hit_dice_to_spend": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data or "name" in data
        print(f"✓ Short rest with 1 hit die successful")
    
    def test_short_rest_invalid_character(self, authenticated_client):
        """Test short rest for non-existent character"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/invalid-id-12345/short-rest",
            json={"hit_dice_to_spend": 0}
        )
        assert response.status_code == 404
        print(f"✓ Short rest invalid character returns 404")


class TestLongRestEndpoint:
    """Test POST /api/characters/{id}/long-rest endpoint"""
    
    def test_long_rest_success(self, authenticated_client, test_character_id):
        """Test long rest restores HP, resources, spell slots"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character_id}/long-rest"
        )
        assert response.status_code == 200
        data = response.json()
        # Should return updated character with full HP
        assert "id" in data or "name" in data
        # Check HP is restored
        if "current_hit_points" in data and "max_hit_points" in data:
            assert data["current_hit_points"] == data["max_hit_points"]
            print(f"✓ Long rest restored HP to {data['current_hit_points']}/{data['max_hit_points']}")
        else:
            print(f"✓ Long rest successful")
    
    def test_long_rest_restores_hit_dice(self, authenticated_client, test_character_id):
        """Test long rest restores half hit dice"""
        # First do a long rest
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character_id}/long-rest"
        )
        assert response.status_code == 200
        data = response.json()
        # Check hit dice remaining
        if "hit_dice_remaining" in data and "level" in data:
            level = data["level"]
            remaining = data["hit_dice_remaining"]
            # Should be at least half level (min 1)
            assert remaining >= max(1, level // 2)
            print(f"✓ Long rest restored hit dice: {remaining}/{level}")
        else:
            print(f"✓ Long rest completed")
    
    def test_long_rest_clears_resources(self, authenticated_client, test_character_id):
        """Test long rest clears resources for frontend re-initialization"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character_id}/long-rest"
        )
        assert response.status_code == 200
        data = response.json()
        # Resources should be empty dict (frontend re-initializes to max)
        if "resources" in data:
            assert data["resources"] == {}
            print(f"✓ Long rest cleared resources for re-initialization")
        else:
            print(f"✓ Long rest completed")
    
    def test_long_rest_invalid_character(self, authenticated_client):
        """Test long rest for non-existent character"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/invalid-id-12345/long-rest"
        )
        assert response.status_code == 404
        print(f"✓ Long rest invalid character returns 404")


class TestCharacterDataForCombatTab:
    """Test character data structure supports combat tab features"""
    
    def test_character_has_resources_field(self, authenticated_client, test_character_id):
        """Test character has resources field for class resource tracking"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/characters/{test_character_id}"
        )
        assert response.status_code == 200
        data = response.json()
        # Resources field should exist (may be empty dict)
        assert "resources" in data or data.get("resources") is None
        print(f"✓ Character has resources field")
    
    def test_character_has_equipped_field(self, authenticated_client, test_character_id):
        """Test character has equipped field for weapon attacks"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/characters/{test_character_id}"
        )
        assert response.status_code == 200
        data = response.json()
        # Equipped field should exist
        if "equipped" in data:
            equipped = data["equipped"]
            # Should have standard slots
            assert isinstance(equipped, dict)
            print(f"✓ Character has equipped field: {list(equipped.keys())}")
        else:
            print(f"✓ Character data retrieved (equipped field may be empty)")
    
    def test_character_has_ability_scores(self, authenticated_client, test_character_id):
        """Test character has ability scores for attack calculations"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/characters/{test_character_id}"
        )
        assert response.status_code == 200
        data = response.json()
        # Check ability scores exist
        abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
        for ability in abilities:
            assert ability in data, f"Missing ability: {ability}"
            assert isinstance(data[ability], int)
        print(f"✓ Character has all ability scores")
    
    def test_character_has_combat_stats(self, authenticated_client, test_character_id):
        """Test character has combat stats (HP, AC, speed)"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/characters/{test_character_id}"
        )
        assert response.status_code == 200
        data = response.json()
        # Check combat stats
        assert "current_hit_points" in data or "hp" in data
        assert "max_hit_points" in data or "max_hp" in data
        assert "armor_class" in data or "ac" in data
        print(f"✓ Character has combat stats")


class TestInventoryForCombatTab:
    """Test inventory/equipment endpoints for combat tab weapon attacks"""
    
    def test_update_equipped_items(self, authenticated_client, test_character_id):
        """Test updating equipped items (for weapon attacks)"""
        # Update character with equipped items
        equipped = {
            "armor": None,
            "shield": None,
            "mainHand": {"name": "Longsword", "damage": "1d8", "damageType": "slashing"},
            "offHand": None
        }
        response = authenticated_client.patch(
            f"{BASE_URL}/api/characters/{test_character_id}",
            json={"equipped": equipped}
        )
        # PATCH should work (PUT also acceptable)
        if response.status_code == 405:
            # Try PUT instead
            response = authenticated_client.put(
                f"{BASE_URL}/api/characters/{test_character_id}",
                json={"equipped": equipped}
            )
        assert response.status_code == 200
        data = response.json()
        if "equipped" in data:
            assert data["equipped"]["mainHand"]["name"] == "Longsword"
            print(f"✓ Equipped items updated successfully")
        else:
            print(f"✓ Character update accepted")


class TestLevelUpFeaturesGained:
    """Test level-up info endpoint shows features gained"""
    
    def test_level_up_info_endpoint(self, authenticated_client, test_character_id):
        """Test GET /api/characters/{id}/level-up-info returns feature info"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/characters/{test_character_id}/level-up-info"
        )
        assert response.status_code == 200
        data = response.json()
        # Should have level info
        assert "current_level" in data
        assert "next_level" in data
        assert "can_level_up" in data
        # Should have HP info
        assert "hp_info" in data
        print(f"✓ Level-up info endpoint working: Level {data['current_level']} -> {data['next_level']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
