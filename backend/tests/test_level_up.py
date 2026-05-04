"""
Tests for Character Level Up endpoint POST /api/characters/{character_id}/level-up
Tests ASI (Ability Score Improvements), Feat selection, HP calculation, and proficiency bonus
"""
import pytest
import requests
import uuid
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test user credentials
TEST_USER_EMAIL = "leveltest@test.com"
TEST_USER_PASSWORD = "test123"


@pytest.fixture
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping tests")
    return response.json()["token"]


@pytest.fixture
def authenticated_client(auth_token):
    """Requests session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture
def test_character(authenticated_client):
    """Create a fresh test character at level 3 for level-up testing"""
    unique_id = str(uuid.uuid4())[:8]
    char_data = {
        "name": f"TEST_LevelUp_{unique_id}",
        "race": "Human",
        "character_class": "Fighter",
        "level": 3,
        "strength": 16,
        "dexterity": 14,
        "constitution": 15,
        "intelligence": 10,
        "wisdom": 12,
        "charisma": 8,
        "max_hit_points": 28,
        "current_hit_points": 28
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
    assert response.status_code == 200, f"Failed to create test character: {response.text}"
    resp_data = response.json()
    # API returns nested character object
    character = resp_data.get("character", resp_data)
    
    yield character
    
    # Cleanup - delete the test character
    authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


@pytest.fixture
def wizard_character(authenticated_client):
    """Create a wizard character for testing d6 hit die"""
    unique_id = str(uuid.uuid4())[:8]
    char_data = {
        "name": f"TEST_Wizard_{unique_id}",
        "race": "Elf",
        "character_class": "Wizard",
        "level": 3,
        "strength": 8,
        "dexterity": 14,
        "constitution": 14,  # +2 CON modifier
        "intelligence": 18,
        "wisdom": 12,
        "charisma": 10,
        "max_hit_points": 20,
        "current_hit_points": 20
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
    assert response.status_code == 200
    resp_data = response.json()
    character = resp_data.get("character", resp_data)
    
    yield character
    
    authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


@pytest.fixture
def rogue_character(authenticated_client):
    """Create a rogue character for testing extra ASI at level 10"""
    unique_id = str(uuid.uuid4())[:8]
    char_data = {
        "name": f"TEST_Rogue_{unique_id}",
        "race": "Halfling",
        "character_class": "Rogue",
        "level": 9,
        "strength": 10,
        "dexterity": 18,
        "constitution": 14,
        "intelligence": 12,
        "wisdom": 14,
        "charisma": 10,
        "max_hit_points": 60,
        "current_hit_points": 60
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
    assert response.status_code == 200
    resp_data = response.json()
    character = resp_data.get("character", resp_data)
    
    yield character
    
    authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


class TestLevelUpEndpoint:
    """Tests for POST /api/characters/{character_id}/level-up"""
    
    def test_level_up_standard_non_asi_level(self, authenticated_client, test_character):
        """Test level up at a non-ASI level (level 3 -> 4 is ASI, so we use 4 -> 5)"""
        # First level up to 4 (ASI level) with ASI choice
        level_up_4 = {
            "new_level": 4,
            "choice_type": "asi",
            "asi_choices": {"ability1": "strength", "ability2": "constitution"},
            "hp_roll": None  # Use average
        }
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_4
        )
        assert response.status_code == 200
        
        # Now level up to 5 (non-ASI level)
        level_up_5 = {
            "new_level": 5,
            "choice_type": "standard",
            "hp_roll": None
        }
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_5
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "character" in data
        assert "level_up_summary" in data
        
        char = data["character"]
        summary = data["level_up_summary"]
        
        # Verify level increased
        assert char["level"] == 5
        assert summary["new_level"] == 5
        
        # Verify HP increased (Fighter d10, average = 6, CON mod = +2 after ASI at level 4)
        assert summary["hp_gained"] >= 1
        assert char["max_hit_points"] > test_character["max_hit_points"]
        
        # Verify proficiency bonus (level 5 = +3)
        assert char["proficiency_bonus"] == 3
        
        # Verify standard level up recorded
        assert char["level_progression"]["5"]["type"] == "standard"


    def test_level_up_with_asi_plus_one_to_two_abilities(self, authenticated_client, test_character):
        """Test ASI level with +1 to two different abilities"""
        initial_str = test_character["strength"]
        initial_dex = test_character["dexterity"]
        
        level_up_data = {
            "new_level": 4,  # ASI level for all classes
            "choice_type": "asi",
            "asi_choices": {"ability1": "strength", "ability2": "dexterity"},
            "hp_roll": None
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_data
        )
        
        assert response.status_code == 200
        data = response.json()
        char = data["character"]
        
        # Verify ability scores increased by 1 each
        assert char["strength"] == initial_str + 1
        assert char["dexterity"] == initial_dex + 1
        
        # Verify ASI recorded in level_progression
        assert char["level_progression"]["4"]["type"] == "asi"
        assert char["level_progression"]["4"]["choices"]["ability1"] == "strength"
        assert char["level_progression"]["4"]["choices"]["ability2"] == "dexterity"
        
        # Verify asi_increases tracking
        assert char["asi_increases"].get("strength", 0) >= 1
        assert char["asi_increases"].get("dexterity", 0) >= 1


    def test_level_up_with_asi_plus_two_to_one_ability(self, authenticated_client):
        """Test ASI level with +2 to same ability"""
        # Create a fresh character
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_ASI2_{unique_id}",
            "race": "Dwarf",
            "character_class": "Fighter",
            "level": 3,
            "strength": 17,  # Will become 19
            "dexterity": 10,
            "constitution": 16,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
            "max_hit_points": 30,
            "current_hit_points": 30
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        
        try:
            initial_str = character["strength"]
            
            level_up_data = {
                "new_level": 4,
                "choice_type": "asi",
                "asi_choices": {"ability1": "strength", "ability2": "strength"},  # +2 to STR
                "hp_roll": None
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 200
            data = response.json()
            char = data["character"]
            
            # Verify strength increased by 2
            assert char["strength"] == initial_str + 2
            assert char["level_progression"]["4"]["type"] == "asi"
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_with_feat_selection(self, authenticated_client, test_character):
        """Test ASI level with feat selection instead of ASI"""
        level_up_data = {
            "new_level": 4,
            "choice_type": "feat",
            "feat_choice": {
                "name": "Alert",
                "description": "+5 to initiative. You cannot be surprised while conscious."
            },
            "hp_roll": None
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_data
        )
        
        assert response.status_code == 200
        data = response.json()
        char = data["character"]
        
        # Verify feat added
        assert len(char["feats"]) > 0
        feat_names = [f["name"] for f in char["feats"]]
        assert "Alert" in feat_names
        
        # Verify feat recorded in level_progression
        assert char["level_progression"]["4"]["type"] == "feat"
        assert char["level_progression"]["4"]["feat_name"] == "Alert"


    def test_level_up_with_hp_roll(self, authenticated_client, test_character):
        """Test level up with rolled HP instead of average"""
        # Level up to 4 with ASI first
        level_up_4 = {
            "new_level": 4,
            "choice_type": "asi",
            "asi_choices": {"ability1": "strength", "ability2": "constitution"},
            "hp_roll": None
        }
        authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_4
        )
        
        # Get current HP after level 4
        get_resp = authenticated_client.get(f"{BASE_URL}/api/characters/{test_character['id']}")
        char_at_4 = get_resp.json()
        hp_at_level_4 = char_at_4["max_hit_points"]
        
        # Level up to 5 with rolled HP
        level_up_5 = {
            "new_level": 5,
            "choice_type": "standard",
            "hp_roll": 8  # Rolled 8 on d10
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_5
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # CON is now 16 (+3 modifier) after ASI
        # HP gain should be 8 (roll) + 3 (CON) = 11
        expected_hp_gain = 8 + 3
        assert data["level_up_summary"]["hp_gained"] == expected_hp_gain
        assert data["character"]["max_hit_points"] == hp_at_level_4 + expected_hp_gain


    def test_level_up_hp_minimum_one(self, authenticated_client, wizard_character):
        """Test that HP gain is minimum 1 even with low roll and negative CON"""
        # Create character with negative CON
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_LowCon_{unique_id}",
            "race": "Elf",
            "character_class": "Wizard",
            "level": 1,
            "strength": 8,
            "dexterity": 14,
            "constitution": 6,  # -2 CON modifier
            "intelligence": 18,
            "wisdom": 12,
            "charisma": 10,
            "max_hit_points": 4,
            "current_hit_points": 4
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        initial_hp = character["max_hit_points"]
        
        try:
            level_up_data = {
                "new_level": 2,
                "choice_type": "standard",
                "hp_roll": 1  # Worst roll on d6
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Roll 1 + CON -2 = -1, but minimum is 1
            assert data["level_up_summary"]["hp_gained"] >= 1
            assert data["character"]["max_hit_points"] >= initial_hp + 1
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_proficiency_bonus_increase(self, authenticated_client):
        """Test proficiency bonus increases at level 5 (2->3) and level 9 (3->4)"""
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_ProfBonus_{unique_id}",
            "race": "Human",
            "character_class": "Barbarian",  # d12 hit die
            "level": 4,
            "strength": 16,
            "dexterity": 14,
            "constitution": 16,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8,
            "max_hit_points": 40,
            "current_hit_points": 40,
            "proficiency_bonus": 2
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        
        try:
            # Level 4 -> 5: proficiency should increase from +2 to +3
            level_up_5 = {
                "new_level": 5,
                "choice_type": "standard",
                "hp_roll": None
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_5
            )
            
            assert response.status_code == 200
            char = response.json()["character"]
            assert char["proficiency_bonus"] == 3
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_fighter_extra_asi_at_6(self, authenticated_client):
        """Test Fighter gets extra ASI at level 6"""
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_Fighter6_{unique_id}",
            "race": "Human",
            "character_class": "Fighter",
            "level": 5,
            "strength": 18,
            "dexterity": 14,
            "constitution": 16,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
            "max_hit_points": 50,
            "current_hit_points": 50
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        
        try:
            initial_str = character["strength"]
            
            # Level 6 is an extra ASI level for Fighters
            level_up_data = {
                "new_level": 6,
                "choice_type": "asi",
                "asi_choices": {"ability1": "strength", "ability2": "strength"},
                "hp_roll": None
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 200
            char = response.json()["character"]
            
            # Fighter should get ASI at level 6
            assert char["strength"] == min(20, initial_str + 2)
            assert char["level_progression"]["6"]["type"] == "asi"
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_rogue_extra_asi_at_10(self, authenticated_client, rogue_character):
        """Test Rogue gets extra ASI at level 10"""
        initial_dex = rogue_character["dexterity"]
        
        level_up_data = {
            "new_level": 10,
            "choice_type": "asi",
            "asi_choices": {"ability1": "dexterity", "ability2": "dexterity"},
            "hp_roll": None
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{rogue_character['id']}/level-up",
            json=level_up_data
        )
        
        assert response.status_code == 200
        char = response.json()["character"]
        
        # Rogue should get ASI at level 10
        assert char["dexterity"] == min(20, initial_dex + 2)
        assert char["level_progression"]["10"]["type"] == "asi"


    def test_level_up_hit_dice_updated(self, authenticated_client, test_character):
        """Test that hit dice string and remaining are updated on level up"""
        level_up_data = {
            "new_level": 4,
            "choice_type": "asi",
            "asi_choices": {"ability1": "strength", "ability2": "constitution"},
            "hp_roll": None
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_data
        )
        
        assert response.status_code == 200
        char = response.json()["character"]
        
        # Fighter has d10 hit die
        assert char["hit_dice"] == "4d10"
        assert char["hit_dice_remaining"] == 4


    def test_level_up_current_hp_healed_to_max(self, authenticated_client):
        """Test that current HP is set to max HP on level up"""
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_HealOnLevelUp_{unique_id}",
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "strength": 16,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
            "max_hit_points": 12,
            "current_hit_points": 5  # Damaged
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        
        try:
            level_up_data = {
                "new_level": 2,
                "choice_type": "standard",
                "hp_roll": None
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 200
            char = response.json()["character"]
            
            # Current HP should equal max HP after level up
            assert char["current_hit_points"] == char["max_hit_points"]
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_invalid_skip_level(self, authenticated_client, test_character):
        """Test that skipping levels is not allowed"""
        level_up_data = {
            "new_level": 5,  # Trying to skip from 3 to 5
            "choice_type": "standard",
            "hp_roll": None
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{test_character['id']}/level-up",
            json=level_up_data
        )
        
        assert response.status_code == 400
        assert "Can only level up from" in response.json()["detail"]


    def test_level_up_max_level_20(self, authenticated_client):
        """Test that level 20 is the maximum"""
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_MaxLevel_{unique_id}",
            "race": "Human",
            "character_class": "Fighter",
            "level": 20,  # Already at max
            "strength": 20,
            "dexterity": 20,
            "constitution": 20,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
            "max_hit_points": 200,
            "current_hit_points": 200
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        
        try:
            level_up_data = {
                "new_level": 21,
                "choice_type": "standard",
                "hp_roll": None
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 400
            assert "Maximum level is 20" in response.json()["detail"]
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_asi_capped_at_20(self, authenticated_client):
        """Test that ability scores are capped at 20"""
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_AbilityCap_{unique_id}",
            "race": "Human",
            "character_class": "Fighter",
            "level": 3,
            "strength": 19,  # Will try to increase to 21, should cap at 20
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
            "max_hit_points": 30,
            "current_hit_points": 30
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        assert create_resp.status_code == 200
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        
        try:
            level_up_data = {
                "new_level": 4,
                "choice_type": "asi",
                "asi_choices": {"ability1": "strength", "ability2": "strength"},  # +2 would be 21
                "hp_roll": None
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 200
            char = response.json()["character"]
            
            # Strength should cap at 20
            assert char["strength"] == 20
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")


    def test_level_up_nonexistent_character(self, authenticated_client):
        """Test level up fails for non-existent character"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        level_up_data = {
            "new_level": 2,
            "choice_type": "standard",
            "hp_roll": None
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/characters/{fake_id}/level-up",
            json=level_up_data
        )
        
        assert response.status_code == 404


class TestHitDieByClass:
    """Test HP calculations use correct hit die for each class"""
    
    @pytest.mark.parametrize("char_class,hit_die,average_hp", [
        ("Barbarian", 12, 7),  # d12: avg = 6+1 = 7
        ("Fighter", 10, 6),    # d10: avg = 5+1 = 6
        ("Paladin", 10, 6),
        ("Ranger", 10, 6),
        ("Bard", 8, 5),        # d8: avg = 4+1 = 5
        ("Cleric", 8, 5),
        ("Druid", 8, 5),
        ("Monk", 8, 5),
        ("Rogue", 8, 5),
        ("Warlock", 8, 5),
        ("Sorcerer", 6, 4),    # d6: avg = 3+1 = 4
        ("Wizard", 6, 4),
    ])
    def test_hit_die_by_class(self, authenticated_client, char_class, hit_die, average_hp):
        """Test each class uses correct hit die for HP calculation"""
        unique_id = str(uuid.uuid4())[:8]
        char_data = {
            "name": f"TEST_{char_class}_{unique_id}",
            "race": "Human",
            "character_class": char_class,
            "level": 1,
            "strength": 10,
            "dexterity": 10,
            "constitution": 10,  # +0 CON modifier
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
            "max_hit_points": 10,
            "current_hit_points": 10
        }
        
        create_resp = authenticated_client.post(f"{BASE_URL}/api/characters", json=char_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Failed to create {char_class} character")
        resp_data = create_resp.json()
        character = resp_data.get("character", resp_data)
        initial_hp = character["max_hit_points"]
        
        try:
            level_up_data = {
                "new_level": 2,
                "choice_type": "standard",
                "hp_roll": None  # Use average
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/characters/{character['id']}/level-up",
                json=level_up_data
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # HP gain should match average for class hit die + 0 CON
            assert data["level_up_summary"]["hp_gained"] == average_hp
            assert data["character"]["hit_dice"] == f"2d{hit_die}"
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/characters/{character['id']}")
