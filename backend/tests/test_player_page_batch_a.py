"""
Test Player Page Improvements - Batch A
Tests for:
- PATCH /api/characters/{id} - partial updates (HP, conditions, inspiration, death_saves, used_spell_slots)
- PUT /api/characters/{id}/resources - class resources update
- POST /api/characters/{id}/short-rest - short rest with hit dice spending
- POST /api/characters/{id}/long-rest - long rest restores all HP, spell slots, resources
- POST /api/characters/{id}/level-up - level up with new_spells and new_cantrips fields
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("RQK_E2E_EMAIL", "")
TEST_PASSWORD = os.environ.get("RQK_E2E_PASSWORD", "")

# Character IDs from test data
WIZARD_CHARACTER_ID = "9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7"  # Wizard lvl 1
FIGHTER_CHARACTER_ID = "0bda5cf5-b8be-40c8-b2bc-b030ea70c366"  # Fighter lvl 1


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


class TestPatchCharacterEndpoint:
    """Tests for PATCH /api/characters/{id} - partial character updates"""
    
    def test_patch_hp(self, auth_headers):
        """Test updating HP via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"hp": 5}
        )
        assert response.status_code == 200, f"PATCH HP failed: {response.text}"
        data = response.json()
        assert data.get("current_hit_points") == 5, "HP not updated correctly"
        print(f"✓ PATCH HP: current_hit_points = {data.get('current_hit_points')}")
    
    def test_patch_conditions(self, auth_headers):
        """Test updating conditions via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"conditions": ["poisoned", "frightened"]}
        )
        assert response.status_code == 200, f"PATCH conditions failed: {response.text}"
        data = response.json()
        assert "poisoned" in data.get("conditions", []), "Conditions not updated"
        print(f"✓ PATCH conditions: {data.get('conditions')}")
    
    def test_patch_inspiration(self, auth_headers):
        """Test updating inspiration via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"inspiration": True}
        )
        assert response.status_code == 200, f"PATCH inspiration failed: {response.text}"
        data = response.json()
        assert data.get("inspiration") == True, "Inspiration not updated"
        print(f"✓ PATCH inspiration: {data.get('inspiration')}")
    
    def test_patch_death_saves(self, auth_headers):
        """Test updating death saves via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"death_saves_successes": 2, "death_saves_failures": 1}
        )
        assert response.status_code == 200, f"PATCH death saves failed: {response.text}"
        data = response.json()
        assert data.get("death_saves_successes") == 2, "Death saves successes not updated"
        assert data.get("death_saves_failures") == 1, "Death saves failures not updated"
        print(f"✓ PATCH death saves: successes={data.get('death_saves_successes')}, failures={data.get('death_saves_failures')}")
    
    def test_patch_used_spell_slots(self, auth_headers):
        """Test updating used spell slots via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"used_spell_slots": {"1": 1, "2": 0}}
        )
        assert response.status_code == 200, f"PATCH used_spell_slots failed: {response.text}"
        data = response.json()
        assert data.get("used_spell_slots") == {"1": 1, "2": 0}, "Used spell slots not updated"
        print(f"✓ PATCH used_spell_slots: {data.get('used_spell_slots')}")
    
    def test_patch_concentrating_on(self, auth_headers):
        """Test updating concentrating_on via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"concentrating_on": "Mage Armor"}
        )
        assert response.status_code == 200, f"PATCH concentrating_on failed: {response.text}"
        data = response.json()
        assert data.get("concentrating_on") == "Mage Armor", "Concentrating on not updated"
        print(f"✓ PATCH concentrating_on: {data.get('concentrating_on')}")
    
    def test_patch_invalid_field_rejected(self, auth_headers):
        """Test that invalid fields are rejected"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"invalid_field": "should_fail"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid field, got {response.status_code}"
        print("✓ PATCH invalid field correctly rejected")
    
    def test_patch_hit_dice_remaining(self, auth_headers):
        """Test updating hit_dice_remaining via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"hit_dice_remaining": 0}
        )
        assert response.status_code == 200, f"PATCH hit_dice_remaining failed: {response.text}"
        data = response.json()
        assert data.get("hit_dice_remaining") == 0, "Hit dice remaining not updated"
        print(f"✓ PATCH hit_dice_remaining: {data.get('hit_dice_remaining')}")


class TestResourcesEndpoint:
    """Tests for PUT /api/characters/{id}/resources"""
    
    def test_update_resources(self, auth_headers):
        """Test updating class resources"""
        response = requests.put(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/resources",
            headers=auth_headers,
            json={"second_wind": 0, "action_surge": 1}
        )
        assert response.status_code == 200, f"PUT resources failed: {response.text}"
        data = response.json()
        assert "resources" in data, "Resources not in response"
        print(f"✓ PUT resources: {data.get('resources')}")
    
    def test_update_resources_empty(self, auth_headers):
        """Test updating resources to empty dict"""
        response = requests.put(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/resources",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 200, f"PUT empty resources failed: {response.text}"
        print("✓ PUT empty resources accepted")


class TestShortRestEndpoint:
    """Tests for POST /api/characters/{id}/short-rest"""
    
    def test_short_rest_no_hit_dice(self, auth_headers):
        """Test short rest without spending hit dice"""
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/short-rest",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Short rest failed: {response.text}"
        data = response.json()
        assert "id" in data, "Character data not returned"
        print(f"✓ Short rest (no hit dice): character returned")
    
    def test_short_rest_with_hit_dice(self, auth_headers):
        """Test short rest spending 1 hit die"""
        # First, set HP to less than max
        requests.patch(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers,
            json={"hp": 5, "hit_dice_remaining": 2}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/short-rest?hit_dice_to_spend=1",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Short rest with hit dice failed: {response.text}"
        data = response.json()
        # HP should have increased
        assert data.get("current_hit_points", 0) > 5, "HP should have increased after spending hit die"
        # Hit dice remaining should have decreased
        assert data.get("hit_dice_remaining", 2) < 2, "Hit dice remaining should have decreased"
        print(f"✓ Short rest (1 hit die): HP={data.get('current_hit_points')}, hit_dice_remaining={data.get('hit_dice_remaining')}")


class TestLongRestEndpoint:
    """Tests for POST /api/characters/{id}/long-rest"""
    
    def test_long_rest_restores_hp(self, auth_headers):
        """Test long rest restores HP to max"""
        # First, set HP to less than max
        requests.patch(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers,
            json={"hp": 1}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/long-rest",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Long rest failed: {response.text}"
        data = response.json()
        max_hp = data.get("max_hit_points", 10)
        current_hp = data.get("current_hit_points", 0)
        assert current_hp == max_hp, f"HP not restored to max: {current_hp} != {max_hp}"
        print(f"✓ Long rest: HP restored to {current_hp}/{max_hp}")
    
    def test_long_rest_restores_hit_dice(self, auth_headers):
        """Test long rest restores half hit dice (min 1)"""
        # First, set hit dice to 0
        requests.patch(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers,
            json={"hit_dice_remaining": 0}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/long-rest",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Long rest failed: {response.text}"
        data = response.json()
        hit_dice = data.get("hit_dice_remaining", 0)
        assert hit_dice >= 1, f"Hit dice not restored: {hit_dice}"
        print(f"✓ Long rest: hit_dice_remaining = {hit_dice}")
    
    def test_long_rest_clears_resources(self, auth_headers):
        """Test long rest clears resources (frontend re-initializes to max)"""
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/long-rest",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Long rest failed: {response.text}"
        data = response.json()
        # Resources should be empty dict (frontend re-initializes)
        assert data.get("resources") == {}, f"Resources not cleared: {data.get('resources')}"
        print("✓ Long rest: resources cleared for frontend re-init")


class TestLevelUpEndpoint:
    """Tests for POST /api/characters/{id}/level-up with new_spells and new_cantrips"""
    
    def test_level_up_basic(self, auth_headers):
        """Test basic level up (no spells)"""
        # Get current level
        get_response = requests.get(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers
        )
        current_level = get_response.json().get("level", 1)
        
        # Skip if already at max level
        if current_level >= 20:
            pytest.skip("Character already at max level")
        
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/level-up",
            headers=auth_headers,
            json={
                "new_level": current_level + 1,
                "hp_method": "average"
            }
        )
        assert response.status_code == 200, f"Level up failed: {response.text}"
        data = response.json()
        assert "character" in data or "level" in data, "Level up response missing character data"
        print(f"✓ Level up: Fighter {current_level} -> {current_level + 1}")
    
    def test_level_up_with_new_spells(self, auth_headers):
        """Test level up with new_spells field (for Wizard)"""
        # Get current level
        get_response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        current_level = get_response.json().get("level", 1)
        
        # Skip if already at max level
        if current_level >= 20:
            pytest.skip("Character already at max level")
        
        response = requests.post(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}/level-up",
            headers=auth_headers,
            json={
                "new_level": current_level + 1,
                "hp_method": "average",
                "new_spells": [
                    {"name": "Magic Missile", "level": 1, "school": "Evocation"},
                    {"name": "Shield", "level": 1, "school": "Abjuration"}
                ]
            }
        )
        assert response.status_code == 200, f"Level up with spells failed: {response.text}"
        data = response.json()
        character = data.get("character", data)
        spells_known = character.get("spells_known", [])
        spell_names = [s.get("name") for s in spells_known]
        assert "Magic Missile" in spell_names or "Shield" in spell_names, f"New spells not added: {spell_names}"
        print(f"✓ Level up with new_spells: spells_known = {spell_names}")
    
    def test_level_up_with_new_cantrips(self, auth_headers):
        """Test level up with new_cantrips field"""
        # Get current level
        get_response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        current_level = get_response.json().get("level", 1)
        
        # Skip if already at max level
        if current_level >= 20:
            pytest.skip("Character already at max level")
        
        response = requests.post(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}/level-up",
            headers=auth_headers,
            json={
                "new_level": current_level + 1,
                "hp_method": "average",
                "new_cantrips": [
                    {"name": "Fire Bolt", "level": 0, "school": "Evocation"}
                ]
            }
        )
        assert response.status_code == 200, f"Level up with cantrips failed: {response.text}"
        data = response.json()
        character = data.get("character", data)
        cantrips_known = character.get("cantrips_known", [])
        cantrip_names = [c.get("name") for c in cantrips_known]
        assert "Fire Bolt" in cantrip_names, f"New cantrip not added: {cantrip_names}"
        print(f"✓ Level up with new_cantrips: cantrips_known = {cantrip_names}")


class TestCharacterDataPersistence:
    """Tests to verify data persists correctly after PATCH"""
    
    def test_patch_and_get_verify(self, auth_headers):
        """Test that PATCH changes persist when fetched via GET"""
        # PATCH the character
        patch_response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "inspiration": True,
                "conditions": ["blinded"],
                "concentrating_on": "Detect Magic"
            }
        )
        assert patch_response.status_code == 200
        
        # GET the character
        get_response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify persistence
        assert data.get("inspiration") == True, "Inspiration not persisted"
        assert "blinded" in data.get("conditions", []), "Conditions not persisted"
        assert data.get("concentrating_on") == "Detect Magic", "Concentrating on not persisted"
        print("✓ PATCH changes persisted and verified via GET")


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_reset_wizard_state(self, auth_headers):
        """Reset wizard character to clean state"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "hp": 8,
                "conditions": [],
                "inspiration": False,
                "death_saves_successes": 0,
                "death_saves_failures": 0,
                "used_spell_slots": {},
                "concentrating_on": "",
                "hit_dice_remaining": 1
            }
        )
        assert response.status_code == 200
        print("✓ Wizard character reset to clean state")
    
    def test_reset_fighter_state(self, auth_headers):
        """Reset fighter character to clean state"""
        # Long rest to restore everything
        response = requests.post(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}/long-rest",
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✓ Fighter character reset via long rest")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
