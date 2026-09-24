"""
Test all 12 D&D classes for character creation and level-up functionality.
Tests subclass selection, fighting style selection, and level-up-info endpoint.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("RQK_E2E_EMAIL", "")
TEST_PASSWORD = os.environ.get("RQK_E2E_PASSWORD", "")

# All 12 D&D classes with their subclass unlock levels (2014 rules)
CLASS_CONFIG = {
    'Barbarian': {'subclass_level': 3, 'subclass': 'berserker', 'hit_die': 12},
    'Bard': {'subclass_level': 3, 'subclass': 'college_of_lore', 'hit_die': 8},
    'Cleric': {'subclass_level': 1, 'subclass': 'life_domain', 'hit_die': 8},
    'Druid': {'subclass_level': 2, 'subclass': 'circle_of_the_land', 'hit_die': 8},
    'Fighter': {'subclass_level': 3, 'subclass': 'champion', 'hit_die': 10, 'fighting_style_level': 1},
    'Monk': {'subclass_level': 3, 'subclass': 'way_of_the_open_hand', 'hit_die': 8},
    'Paladin': {'subclass_level': 3, 'subclass': 'oath_of_devotion', 'hit_die': 10, 'fighting_style_level': 2},
    'Ranger': {'subclass_level': 3, 'subclass': 'hunter', 'hit_die': 10, 'fighting_style_level': 2},
    'Rogue': {'subclass_level': 3, 'subclass': 'thief', 'hit_die': 8},
    'Sorcerer': {'subclass_level': 1, 'subclass': 'draconic_bloodline', 'hit_die': 6},
    'Warlock': {'subclass_level': 1, 'subclass': 'the_fiend', 'hit_die': 8},
    'Wizard': {'subclass_level': 2, 'subclass': 'school_of_evocation', 'hit_die': 6},
}

# Fighting styles available for Fighter, Paladin, Ranger
FIGHTING_STYLES = {
    'Fighter': ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'],
    'Paladin': ['Defense', 'Dueling', 'Great Weapon Fighting', 'Protection'],
    'Ranger': ['Archery', 'Defense', 'Dueling', 'Two-Weapon Fighting'],
}


@pytest.fixture(scope='module')
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get('token')


@pytest.fixture(scope='module')
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCharacterCreationAllClasses:
    """Test character creation for all 12 classes"""
    
    created_character_ids = []
    
    @pytest.mark.parametrize("character_class", list(CLASS_CONFIG.keys()))
    def test_create_character_each_class(self, api_client, character_class):
        """Create a character for each of the 12 classes"""
        config = CLASS_CONFIG[character_class]
        
        # Create character at level 1 (or level before subclass for testing level-up)
        payload = {
            "name": f"TEST_{character_class}_LevelUp",
            "race": "Human",
            "character_class": character_class,
            "level": 1,
            "strength": 14,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 14,
            "wisdom": 14,
            "charisma": 14
        }
        
        response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        
        assert response.status_code == 200, f"Failed to create {character_class}: {response.text}"
        data = response.json()
        
        assert data.get('success') == True, f"Character creation not successful for {character_class}"
        assert 'character_id' in data, f"No character_id returned for {character_class}"
        assert data['character']['character_class'] == character_class
        
        # Store for cleanup
        self.created_character_ids.append(data['character_id'])
        print(f"✓ Created {character_class} character: {data['character_id']}")


class TestLevelUpInfoEndpoint:
    """Test GET /api/characters/{id}/level-up-info for all classes"""
    
    @pytest.mark.parametrize("character_class,config", list(CLASS_CONFIG.items()))
    def test_level_up_info_returns_correct_subclass_level(self, api_client, character_class, config):
        """Verify level-up-info returns correct subclass_unlock_level for each class"""
        # Create a test character
        payload = {
            "name": f"TEST_{character_class}_Info",
            "race": "Human",
            "character_class": character_class,
            "level": 1,
            "strength": 14,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 14,
            "wisdom": 14,
            "charisma": 14
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200, f"Failed to create {character_class}"
        char_id = create_response.json()['character_id']
        
        # Get level-up info
        info_response = api_client.get(f"{BASE_URL}/api/characters/{char_id}/level-up-info")
        assert info_response.status_code == 200, f"Failed to get level-up-info for {character_class}"
        
        info = info_response.json()
        
        # Verify structure
        assert 'subclass_info' in info, f"Missing subclass_info for {character_class}"
        assert 'unlock_level' in info['subclass_info'], f"Missing unlock_level for {character_class}"
        
        # Verify correct subclass unlock level
        expected_level = config['subclass_level']
        actual_level = info['subclass_info']['unlock_level']
        assert actual_level == expected_level, \
            f"{character_class} subclass_unlock_level mismatch: expected {expected_level}, got {actual_level}"
        
        # Verify HP info
        assert 'hp_info' in info
        assert info['hp_info']['hit_die'] == f"d{config['hit_die']}"
        
        print(f"✓ {character_class}: subclass_unlock_level={actual_level}, hit_die=d{config['hit_die']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestBarbarianLevelUp:
    """Test Barbarian level-up from 2 to 3 (subclass at level 3)"""
    
    def test_barbarian_level_up_with_subclass(self, api_client):
        """Level up Barbarian from 2 to 3 with Berserker subclass"""
        # Create level 2 Barbarian
        payload = {
            "name": "TEST_Barbarian_Subclass",
            "race": "Human",
            "character_class": "Barbarian",
            "level": 2,
            "strength": 16,
            "dexterity": 14,
            "constitution": 16,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 8
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        initial_hp = create_response.json()['character']['max_hit_points']
        
        # Level up to 3 with Berserker subclass
        level_up_payload = {
            "new_level": 3,
            "hp_method": "average",
            "subclass": "berserker"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 3
        assert result['character']['subclass'] == 'berserker'
        assert result['character']['max_hit_points'] > initial_hp
        
        print(f"✓ Barbarian leveled to 3 with Berserker subclass, HP: {initial_hp} -> {result['character']['max_hit_points']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestBardLevelUp:
    """Test Bard level-up from 2 to 3 (subclass at level 3)"""
    
    def test_bard_level_up_with_college_of_lore(self, api_client):
        """Level up Bard from 2 to 3 with College of Lore"""
        payload = {
            "name": "TEST_Bard_Subclass",
            "race": "Half-Elf",
            "character_class": "Bard",
            "level": 2,
            "strength": 10,
            "dexterity": 14,
            "constitution": 12,
            "intelligence": 12,
            "wisdom": 10,
            "charisma": 16
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 3,
            "hp_method": "average",
            "subclass": "college_of_lore"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 3
        assert result['character']['subclass'] == 'college_of_lore'
        
        print(f"✓ Bard leveled to 3 with College of Lore")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestClericLevelUp:
    """Test Cleric - subclass at level 1"""
    
    def test_cleric_level_up_with_life_domain(self, api_client):
        """Cleric gets subclass at level 1, test level-up from 1 to 2"""
        # Create level 1 Cleric with Life Domain
        payload = {
            "name": "TEST_Cleric_Subclass",
            "race": "Dwarf",
            "character_class": "Cleric",
            "level": 1,
            "subclass": "life_domain",  # Cleric gets subclass at level 1
            "strength": 14,
            "dexterity": 10,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 16,
            "charisma": 12
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200, f"Failed to create Cleric: {create_response.text}"
        char_id = create_response.json()['character_id']
        
        # Level up to 2
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        
        print(f"✓ Cleric (Life Domain) leveled to 2")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestDruidLevelUp:
    """Test Druid level-up from 1 to 2 (subclass at level 2)"""
    
    def test_druid_level_up_with_circle_of_the_moon(self, api_client):
        """Level up Druid from 1 to 2 with Circle of the Moon"""
        payload = {
            "name": "TEST_Druid_Subclass",
            "race": "Wood Elf",
            "character_class": "Druid",
            "level": 1,
            "strength": 10,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 12,
            "wisdom": 16,
            "charisma": 10
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average",
            "subclass": "circle_of_the_moon"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        assert result['character']['subclass'] == 'circle_of_the_moon'
        
        print(f"✓ Druid leveled to 2 with Circle of the Moon")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestFighterLevelUp:
    """Test Fighter - fighting style at level 1, subclass at level 3"""
    
    def test_fighter_level_up_with_fighting_style_and_subclass(self, api_client):
        """Test Fighter level-up with fighting style and Champion subclass"""
        # Create level 1 Fighter
        payload = {
            "name": "TEST_Fighter_Full",
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "strength": 16,
            "dexterity": 14,
            "constitution": 16,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 10
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        # Level up to 2 with fighting style
        level_up_2 = {
            "new_level": 2,
            "hp_method": "average",
            "fighting_style": "Defense"
        }
        
        response_2 = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_2)
        assert response_2.status_code == 200, f"Level-up to 2 failed: {response_2.text}"
        
        # Level up to 3 with subclass
        level_up_3 = {
            "new_level": 3,
            "hp_method": "average",
            "subclass": "champion"
        }
        
        response_3 = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_3)
        assert response_3.status_code == 200, f"Level-up to 3 failed: {response_3.text}"
        
        result = response_3.json()
        assert result['character']['level'] == 3
        assert result['character']['subclass'] == 'champion'
        
        print(f"✓ Fighter leveled to 3 with Defense style and Champion subclass")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestMonkLevelUp:
    """Test Monk level-up from 2 to 3 (subclass at level 3)"""
    
    def test_monk_level_up_with_way_of_the_open_hand(self, api_client):
        """Level up Monk from 2 to 3 with Way of the Open Hand"""
        payload = {
            "name": "TEST_Monk_Subclass",
            "race": "Human",
            "character_class": "Monk",
            "level": 2,
            "strength": 12,
            "dexterity": 16,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 16,
            "charisma": 8
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 3,
            "hp_method": "average",
            "subclass": "way_of_the_open_hand"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 3
        assert result['character']['subclass'] == 'way_of_the_open_hand'
        
        print(f"✓ Monk leveled to 3 with Way of the Open Hand")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestPaladinLevelUp:
    """Test Paladin - fighting style at level 2, subclass at level 3"""
    
    def test_paladin_level_up_with_fighting_style(self, api_client):
        """Level up Paladin from 1 to 2 with fighting style"""
        payload = {
            "name": "TEST_Paladin_FightingStyle",
            "race": "Human",
            "character_class": "Paladin",
            "level": 1,
            "strength": 16,
            "dexterity": 10,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 16
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average",
            "fighting_style": "Defense"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        assert result['character'].get('fighting_style') == 'Defense'
        
        print(f"✓ Paladin leveled to 2 with Defense fighting style")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestRangerLevelUp:
    """Test Ranger - fighting style at level 2, subclass at level 3"""
    
    def test_ranger_level_up_with_fighting_style(self, api_client):
        """Level up Ranger from 1 to 2 with Archery fighting style"""
        payload = {
            "name": "TEST_Ranger_FightingStyle",
            "race": "Wood Elf",
            "character_class": "Ranger",
            "level": 1,
            "strength": 12,
            "dexterity": 16,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 14,
            "charisma": 10
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average",
            "fighting_style": "Archery"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        assert result['character'].get('fighting_style') == 'Archery'
        
        print(f"✓ Ranger leveled to 2 with Archery fighting style")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestRogueLevelUp:
    """Test Rogue level-up from 2 to 3 (subclass at level 3)"""
    
    def test_rogue_level_up_with_thief(self, api_client):
        """Level up Rogue from 2 to 3 with Thief subclass"""
        payload = {
            "name": "TEST_Rogue_Subclass",
            "race": "Halfling",
            "character_class": "Rogue",
            "level": 2,
            "strength": 10,
            "dexterity": 16,
            "constitution": 14,
            "intelligence": 12,
            "wisdom": 12,
            "charisma": 14
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 3,
            "hp_method": "average",
            "subclass": "thief"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 3
        assert result['character']['subclass'] == 'thief'
        
        print(f"✓ Rogue leveled to 3 with Thief subclass")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestSorcererLevelUp:
    """Test Sorcerer - subclass at level 1"""
    
    def test_sorcerer_with_draconic_bloodline(self, api_client):
        """Create Sorcerer with Draconic Bloodline at level 1"""
        payload = {
            "name": "TEST_Sorcerer_Subclass",
            "race": "Dragonborn",
            "character_class": "Sorcerer",
            "level": 1,
            "subclass": "draconic_bloodline",  # Sorcerer gets subclass at level 1
            "strength": 10,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 16
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200, f"Failed to create Sorcerer: {create_response.text}"
        char_id = create_response.json()['character_id']
        
        # Level up to 2
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        
        print(f"✓ Sorcerer (Draconic Bloodline) leveled to 2")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestWarlockLevelUp:
    """Test Warlock - patron (subclass) at level 1"""
    
    def test_warlock_with_the_fiend(self, api_client):
        """Create Warlock with The Fiend patron at level 1"""
        payload = {
            "name": "TEST_Warlock_Subclass",
            "race": "Tiefling",
            "character_class": "Warlock",
            "level": 1,
            "subclass": "the_fiend",  # Warlock gets patron at level 1
            "strength": 10,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 12,
            "wisdom": 10,
            "charisma": 16
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200, f"Failed to create Warlock: {create_response.text}"
        char_id = create_response.json()['character_id']
        
        # Level up to 2
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        
        print(f"✓ Warlock (The Fiend) leveled to 2")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestWizardLevelUp:
    """Test Wizard level-up from 1 to 2 (subclass at level 2)"""
    
    def test_wizard_level_up_with_school_of_evocation(self, api_client):
        """Level up Wizard from 1 to 2 with School of Evocation"""
        payload = {
            "name": "TEST_Wizard_Subclass",
            "race": "High Elf",
            "character_class": "Wizard",
            "level": 1,
            "strength": 8,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 16,
            "wisdom": 12,
            "charisma": 10
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average",
            "subclass": "school_of_evocation"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 2
        assert result['character']['subclass'] == 'school_of_evocation'
        
        print(f"✓ Wizard leveled to 2 with School of Evocation")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestHPIncrease:
    """Test HP increases correctly on level-up"""
    
    def test_hp_increases_on_level_up(self, api_client):
        """Verify HP increases correctly with average method"""
        # Create a Fighter (d10 hit die)
        payload = {
            "name": "TEST_HP_Increase",
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "strength": 16,
            "dexterity": 14,
            "constitution": 16,  # +3 CON mod
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 10
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        initial_hp = create_response.json()['character']['max_hit_points']
        
        # Level up with average HP
        level_up_payload = {
            "new_level": 2,
            "hp_method": "average"
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200
        
        result = level_up_response.json()
        new_hp = result['character']['max_hit_points']
        hp_gained = result['level_up_summary']['hp_gained']
        
        # Fighter d10: average = 6, +3 CON = 9 HP gained
        expected_gain = 6 + 3  # (10/2 + 1) + CON mod
        assert hp_gained == expected_gain, f"Expected {expected_gain} HP gain, got {hp_gained}"
        assert new_hp == initial_hp + hp_gained
        
        print(f"✓ HP increased correctly: {initial_hp} + {hp_gained} = {new_hp}")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestASILevel:
    """Test ASI/Feat at level 4"""
    
    def test_asi_at_level_4(self, api_client):
        """Test ASI choice at level 4"""
        # Create level 3 character
        payload = {
            "name": "TEST_ASI_Level4",
            "race": "Human",
            "character_class": "Fighter",
            "level": 3,
            "subclass": "champion",
            "strength": 16,
            "dexterity": 14,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 12,
            "charisma": 10
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/characters", json=payload)
        assert create_response.status_code == 200
        char_id = create_response.json()['character_id']
        
        # Level up to 4 with ASI
        level_up_payload = {
            "new_level": 4,
            "hp_method": "average",
            "choice_type": "asi",
            "asi_choices": {
                "ability1": "strength",
                "ability2": "constitution"
            }
        }
        
        level_up_response = api_client.post(f"{BASE_URL}/api/characters/{char_id}/level-up", json=level_up_payload)
        assert level_up_response.status_code == 200, f"Level-up failed: {level_up_response.text}"
        
        result = level_up_response.json()
        assert result['character']['level'] == 4
        assert result['character']['strength'] == 17  # 16 + 1
        assert result['character']['constitution'] == 15  # 14 + 1
        assert result['level_up_summary']['is_asi_level'] == True
        
        print(f"✓ ASI at level 4: STR 16->17, CON 14->15")
        
        api_client.delete(f"{BASE_URL}/api/characters/{char_id}")


class TestCleanup:
    """Cleanup any remaining test characters"""
    
    def test_cleanup_test_characters(self, api_client):
        """Delete any TEST_ prefixed characters"""
        # Get all characters
        response = api_client.get(f"{BASE_URL}/api/characters")
        if response.status_code == 200:
            characters = response.json()
            deleted = 0
            for char in characters:
                if char.get('name', '').startswith('TEST_'):
                    del_response = api_client.delete(f"{BASE_URL}/api/characters/{char['id']}")
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test characters")
