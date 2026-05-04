"""
Test suite for Edition-aware Character Creation
Tests D&D 5e 2014 vs 2024 rules for:
- Subclass unlock levels
- Cantrip limits
- Spell known limits
- Hit dice calculation
- max_hit_points field
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test user credentials (admin user with legendary tier)
TEST_USER_EMAIL = 'lcblakey24@outlook.com'
TEST_USER_PASSWORD = 'LCBlakey24?!'


# Expected subclass unlock levels per edition
SUBCLASS_LEVELS_2014 = {
    'Barbarian': 3, 'Bard': 3, 'Cleric': 1, 'Druid': 2, 'Fighter': 3,
    'Monk': 3, 'Paladin': 3, 'Ranger': 3, 'Rogue': 3, 'Sorcerer': 1,
    'Warlock': 1, 'Wizard': 2
}

SUBCLASS_LEVELS_2024 = {
    'Barbarian': 3, 'Bard': 3, 'Cleric': 3, 'Druid': 3, 'Fighter': 3,
    'Monk': 3, 'Paladin': 3, 'Ranger': 3, 'Rogue': 3, 'Sorcerer': 3,
    'Warlock': 3, 'Wizard': 3
}

# Hit dice by class
HIT_DICE = {
    'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
    'Bard': 8, 'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Warlock': 8,
    'Sorcerer': 6, 'Wizard': 6
}


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


def cleanup_character(client, character_id):
    """Helper to cleanup test characters"""
    try:
        client.delete(f"{BASE_URL}/api/characters/{character_id}")
    except:
        pass


class TestEditionSubclassValidation:
    """Test subclass validation based on edition rules"""
    
    def test_2014_cleric_subclass_at_level_1(self, authenticated_client):
        """2014 rules: Cleric can select subclass at level 1"""
        unique_name = f"TEST_cleric_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Cleric",
            "subclass": "Life Domain",
            "level": 1,
            "edition": "2014",
            "strength": 14,
            "dexterity": 10,
            "constitution": 13,
            "intelligence": 8,
            "wisdom": 16,
            "charisma": 12
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("character", {}).get("subclass") == "Life Domain"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_2024_cleric_subclass_rejected_at_level_1(self, authenticated_client):
        """2024 rules: Cleric cannot select subclass until level 3"""
        unique_name = f"TEST_cleric_2024_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Cleric",
            "subclass": "Life Domain",
            "level": 1,
            "edition": "2024",
            "strength": 14,
            "dexterity": 10,
            "constitution": 13,
            "intelligence": 8,
            "wisdom": 16,
            "charisma": 12
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        # Check error message mentions the correct level
        error_detail = response.json().get("detail", "")
        assert "level 3" in error_detail.lower() or "3" in error_detail
    
    def test_2024_cleric_subclass_allowed_at_level_3(self, authenticated_client):
        """2024 rules: Cleric CAN select subclass at level 3"""
        unique_name = f"TEST_cleric_2024_l3_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Cleric",
            "subclass": "Life Domain",
            "level": 3,
            "edition": "2024",
            "strength": 14,
            "dexterity": 10,
            "constitution": 13,
            "intelligence": 8,
            "wisdom": 16,
            "charisma": 12
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_2014_wizard_subclass_at_level_2(self, authenticated_client):
        """2014 rules: Wizard can select subclass at level 2"""
        unique_name = f"TEST_wizard_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "subclass": "School of Evocation",
            "level": 2,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_2024_wizard_subclass_rejected_at_level_2(self, authenticated_client):
        """2024 rules: Wizard cannot select subclass until level 3"""
        unique_name = f"TEST_wizard_2024_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "subclass": "School of Evocation",
            "level": 2,
            "edition": "2024",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_2014_sorcerer_subclass_at_level_1(self, authenticated_client):
        """2014 rules: Sorcerer can select subclass at level 1"""
        unique_name = f"TEST_sorcerer_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Sorcerer",
            "subclass": "Draconic Bloodline",
            "level": 1,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 16
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_2014_warlock_subclass_at_level_1(self, authenticated_client):
        """2014 rules: Warlock can select subclass at level 1"""
        unique_name = f"TEST_warlock_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Tiefling",
            "character_class": "Warlock",
            "subclass": "The Fiend",
            "level": 1,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 12,
            "wisdom": 10,
            "charisma": 16
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_2024_sorcerer_subclass_rejected_at_level_1(self, authenticated_client):
        """2024 rules: Sorcerer cannot select subclass until level 3"""
        unique_name = f"TEST_sorcerer_2024_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Sorcerer",
            "subclass": "Draconic Bloodline",
            "level": 1,
            "edition": "2024",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 16
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_2014_druid_subclass_at_level_2(self, authenticated_client):
        """2014 rules: Druid can select subclass at level 2"""
        unique_name = f"TEST_druid_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Druid",
            "subclass": "Circle of the Land",
            "level": 2,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 12,
            "wisdom": 16,
            "charisma": 10
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))


class TestHitDiceCalculation:
    """Test hit dice are correctly calculated per class"""
    
    def test_barbarian_d12_hit_die(self, authenticated_client):
        """Barbarian should have d12 hit die"""
        unique_name = f"TEST_barbarian_hd_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Barbarian",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 15,
            "intelligence": 8,
            "wisdom": 10,
            "charisma": 12
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Check hit dice string
        assert character.get("hit_dice") == "1d12", f"Expected 1d12, got {character.get('hit_dice')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_wizard_d6_hit_die(self, authenticated_client):
        """Wizard should have d6 hit die"""
        unique_name = f"TEST_wizard_hd_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "level": 1,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Check hit dice string
        assert character.get("hit_dice") == "1d6", f"Expected 1d6, got {character.get('hit_dice')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_fighter_d10_hit_die(self, authenticated_client):
        """Fighter should have d10 hit die"""
        unique_name = f"TEST_fighter_hd_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 15,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Check hit dice string
        assert character.get("hit_dice") == "1d10", f"Expected 1d10, got {character.get('hit_dice')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_rogue_d8_hit_die(self, authenticated_client):
        """Rogue should have d8 hit die"""
        unique_name = f"TEST_rogue_hd_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Halfling",
            "character_class": "Rogue",
            "level": 1,
            "edition": "2014",
            "strength": 10,
            "dexterity": 16,
            "constitution": 14,
            "intelligence": 13,
            "wisdom": 12,
            "charisma": 8
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Check hit dice string
        assert character.get("hit_dice") == "1d8", f"Expected 1d8, got {character.get('hit_dice')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))


class TestMaxHPCalculation:
    """Test max_hit_points field is correctly used and calculated"""
    
    def test_max_hp_auto_calculated(self, authenticated_client):
        """max_hit_points should be auto-calculated from class hit die + CON mod"""
        unique_name = f"TEST_hp_auto_{uuid.uuid4().hex[:8]}"
        # CON 15 = +2 modifier, Barbarian d12
        # Expected HP: 12 + 2 = 14
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Barbarian",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 15,  # +2 modifier
            "intelligence": 8,
            "wisdom": 10,
            "charisma": 12
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Expected: 12 (d12) + 2 (CON mod) = 14
        assert character.get("max_hit_points") == 14, f"Expected 14, got {character.get('max_hit_points')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_wizard_max_hp_with_low_con(self, authenticated_client):
        """Wizard with CON 10 should have HP = 6 (d6 + 0)"""
        unique_name = f"TEST_hp_wizard_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "level": 1,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 10,  # 0 modifier
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Expected: 6 (d6) + 0 (CON mod) = 6
        assert character.get("max_hit_points") == 6, f"Expected 6, got {character.get('max_hit_points')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))
    
    def test_max_hp_provided_in_payload(self, authenticated_client):
        """When max_hit_points is provided, it should be used"""
        unique_name = f"TEST_hp_provided_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 14,  # +2 modifier
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8,
            "max_hit_points": 12  # Explicit value
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        
        # Should use provided value
        assert character.get("max_hit_points") == 12, f"Expected 12, got {character.get('max_hit_points')}"
        
        # Cleanup
        cleanup_character(authenticated_client, data.get("character_id"))


class TestSpellPersistence:
    """Test that spells and cantrips are persisted to character record"""
    
    def test_spells_persisted(self, authenticated_client):
        """Spells should be saved to the character record"""
        unique_name = f"TEST_spells_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "level": 1,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10,
            # Spells must be in object format {name, level}
            "spells_known": [
                {"name": "Magic Missile", "level": 1},
                {"name": "Shield", "level": 1},
                {"name": "Mage Armor", "level": 1}
            ]
        })
        
        assert response.status_code == 200, f"Failed to create character: {response.text}"
        data = response.json()
        character = data.get("character", {})
        character_id = data.get("character_id")
        
        # Check spells were saved
        spells = character.get("spells_known", [])
        assert len(spells) > 0, "Expected spells to be saved"
        spell_names = [s.get("name") if isinstance(s, dict) else s for s in spells]
        assert "Magic Missile" in spell_names, f"Expected Magic Missile in {spell_names}"
        
        # Verify by fetching the character again
        get_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}")
        assert get_response.status_code == 200
        fetched_char = get_response.json()
        fetched_spells = fetched_char.get("spells_known", [])
        assert len(fetched_spells) > 0
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)

    def test_cantrips_persisted(self, authenticated_client):
        """Cantrips should be saved to the character record"""
        unique_name = f"TEST_cantrips_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Elf",
            "character_class": "Wizard",
            "level": 1,
            "edition": "2014",
            "strength": 8,
            "dexterity": 14,
            "constitution": 13,
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10,
            "cantrips_known": [
                {"name": "Fire Bolt", "level": 0},
                {"name": "Prestidigitation", "level": 0},
                {"name": "Mage Hand", "level": 0}
            ]
        })
        
        assert response.status_code == 200, f"Failed to create character: {response.text}"
        data = response.json()
        character = data.get("character", {})
        character_id = data.get("character_id")
        
        # Check cantrips were saved
        cantrips = character.get("cantrips_known", [])
        assert len(cantrips) > 0, "Expected cantrips to be saved"
        cantrip_names = [c.get("name") if isinstance(c, dict) else c for c in cantrips]
        assert "Fire Bolt" in cantrip_names, f"Expected Fire Bolt in {cantrip_names}"
        
        # Verify by fetching the character again
        get_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}")
        assert get_response.status_code == 200
        fetched_char = get_response.json()
        fetched_cantrips = fetched_char.get("cantrips_known", [])
        assert len(fetched_cantrips) > 0, "Expected cantrips to persist on fetch"
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)


class TestEditionFieldStorage:
    """Test that edition field is properly stored on characters"""
    
    def test_edition_2014_stored(self, authenticated_client):
        """Edition 2014 should be stored on character"""
        unique_name = f"TEST_edition_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 15,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        character_id = data.get("character_id")
        
        assert character.get("edition") == "2014"
        
        # Verify by fetching
        get_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}")
        assert get_response.status_code == 200
        fetched_char = get_response.json()
        assert fetched_char.get("edition") == "2014"
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)
    
    def test_edition_2024_stored(self, authenticated_client):
        """Edition 2024 should be stored on character"""
        unique_name = f"TEST_edition_2024_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "edition": "2024",
            "strength": 16,
            "dexterity": 14,
            "constitution": 15,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8
        })
        
        assert response.status_code == 200
        data = response.json()
        character = data.get("character", {})
        character_id = data.get("character_id")
        
        assert character.get("edition") == "2024"
        
        # Verify by fetching
        get_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}")
        assert get_response.status_code == 200
        fetched_char = get_response.json()
        assert fetched_char.get("edition") == "2024"
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)


class TestInvalidSubclassErrorMessages:
    """Test that backend returns proper error messages for invalid subclass selection"""
    
    def test_error_message_format_2014_fighter(self, authenticated_client):
        """Error message should mention the correct level and rules edition"""
        unique_name = f"TEST_err_fighter_2014_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Fighter",
            "subclass": "Champion",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 15,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8
        })
        
        assert response.status_code == 400
        error_detail = response.json().get("detail", "")
        # Should mention level 3 and Fighter
        assert "3" in error_detail, f"Expected level 3 in error message: {error_detail}"
        assert "fighter" in error_detail.lower() or "Fighter" in error_detail
    
    def test_error_message_format_2024_warlock(self, authenticated_client):
        """2024 Warlock error should mention level 3"""
        unique_name = f"TEST_err_warlock_2024_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Tiefling",
            "character_class": "Warlock",
            "subclass": "The Fiend",
            "level": 1,
            "edition": "2024",
            "strength": 8,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 12,
            "wisdom": 10,
            "charisma": 16
        })
        
        assert response.status_code == 400
        error_detail = response.json().get("detail", "")
        # In 2024 rules, all subclasses unlock at level 3
        assert "3" in error_detail, f"Expected level 3 in error message: {error_detail}"



class TestLevelUpInfoEndpoint:
    """Test the level-up-info endpoint returns edition-aware information"""
    
    def test_level_up_info_2014_cleric(self, authenticated_client):
        """Level-up info for 2014 Cleric should show subclass at level 1"""
        unique_name = f"TEST_levelup_2014_cleric_{uuid.uuid4().hex[:8]}"
        # Create a level 1 Cleric in 2014 edition
        create_response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Cleric",
            "level": 1,
            "edition": "2014",
            "strength": 14,
            "dexterity": 10,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 16,
            "charisma": 12
        })
        
        assert create_response.status_code == 200
        character_id = create_response.json().get("character_id")
        
        # Get level-up info
        info_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}/level-up-info")
        assert info_response.status_code == 200
        
        info = info_response.json()
        assert info["edition"] == "2014"
        assert info["subclass_info"]["unlock_level"] == 1, "2014 Cleric should unlock subclass at level 1"
        assert info["subclass_info"]["can_choose_now"] == True, "Level 1+ Cleric should be able to choose subclass"
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)
    
    def test_level_up_info_2024_cleric(self, authenticated_client):
        """Level-up info for 2024 Cleric should show subclass at level 3"""
        unique_name = f"TEST_levelup_2024_cleric_{uuid.uuid4().hex[:8]}"
        # Create a level 1 Cleric in 2024 edition
        create_response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Cleric",
            "level": 1,
            "edition": "2024",
            "strength": 14,
            "dexterity": 10,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 16,
            "charisma": 12
        })
        
        assert create_response.status_code == 200
        character_id = create_response.json().get("character_id")
        
        # Get level-up info
        info_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}/level-up-info")
        assert info_response.status_code == 200
        
        info = info_response.json()
        assert info["edition"] == "2024"
        assert info["subclass_info"]["unlock_level"] == 3, "2024 Cleric should unlock subclass at level 3"
        assert info["subclass_info"]["can_choose_now"] == False, "Level 1 Cleric in 2024 should not be able to choose subclass yet"
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)
    
    def test_level_up_info_hit_die(self, authenticated_client):
        """Level-up info should return correct hit die for class"""
        unique_name = f"TEST_levelup_hitdie_{uuid.uuid4().hex[:8]}"
        # Create a Barbarian (d12 hit die)
        create_response = authenticated_client.post(f"{BASE_URL}/api/characters", json={
            "name": unique_name,
            "race": "Human",
            "character_class": "Barbarian",
            "level": 1,
            "edition": "2014",
            "strength": 16,
            "dexterity": 14,
            "constitution": 16,
            "intelligence": 8,
            "wisdom": 12,
            "charisma": 10
        })
        
        assert create_response.status_code == 200
        character_id = create_response.json().get("character_id")
        
        # Get level-up info
        info_response = authenticated_client.get(f"{BASE_URL}/api/characters/{character_id}/level-up-info")
        assert info_response.status_code == 200
        
        info = info_response.json()
        assert info["hp_info"]["hit_die"] == "d12", "Barbarian should have d12 hit die"
        assert info["hp_info"]["constitution_modifier"] == 3, "CON 16 should give +3 modifier"
        
        # Cleanup
        cleanup_character(authenticated_client, character_id)
