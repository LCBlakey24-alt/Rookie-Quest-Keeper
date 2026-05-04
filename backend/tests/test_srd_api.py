"""
Test suite for SRD (System Reference Document) API endpoints
Tests spell, class, race data retrieval from D&D 5e SRD
Updated to match actual data structure
"""
import pytest
import requests
import os

# Use conftest.py value or default
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestSRDSpellsAPI:
    """Test /api/srd/spells endpoints"""
    
    def test_get_all_spells_returns_319(self, api_client):
        """GET /api/srd/spells - should return 319 spells"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells")
        assert response.status_code == 200
        data = response.json()
        
        assert "spells" in data
        assert "count" in data
        assert "source" in data
        assert data["count"] == 319  # Exactly 319 spells
        assert "SRD" in data["source"]
        
        # Verify spell structure
        spell = data["spells"][0]
        assert "name" in spell
        assert "level" in spell
        assert "school" in spell
        assert "casting_time" in spell
        assert "range" in spell
        assert "description" in spell
        assert "classes" in spell
    
    def test_filter_spells_by_level_cantrips(self, api_client):
        """GET /api/srd/spells?level=0 - should return only cantrips"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells?level=0")
        assert response.status_code == 200
        data = response.json()
        
        assert data["count"] > 0
        for spell in data["spells"]:
            assert spell["level"] == 0  # All should be cantrips
    
    def test_filter_spells_by_school_evocation(self, api_client):
        """GET /api/srd/spells?school=evocation - should return Evocation spells"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells?school=evocation")
        assert response.status_code == 200
        data = response.json()
        
        assert data["count"] > 0
        for spell in data["spells"]:
            assert spell["school"].lower() == "evocation"  # Case-insensitive check
    
    def test_filter_spells_by_class_wizard(self, api_client):
        """GET /api/srd/spells?class_name=wizard - should return wizard spells"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells?class_name=wizard")
        assert response.status_code == 200
        data = response.json()
        
        assert data["count"] > 0
        for spell in data["spells"]:
            # Check case-insensitive
            class_names_lower = [c.lower() for c in spell["classes"]]
            assert "wizard" in class_names_lower
    
    def test_get_specific_spell_fireball(self, api_client):
        """GET /api/srd/spells/Fireball - should return Fireball spell details"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells/Fireball")
        assert response.status_code == 200
        spell = response.json()
        
        assert spell["name"] == "Fireball"
        assert spell["level"] == 3
        assert spell["school"].lower() == "evocation"
        assert "classes" in spell
    
    def test_get_specific_spell_magic_missile(self, api_client):
        """GET /api/srd/spells/Magic Missile - should return Magic Missile"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells/Magic%20Missile")
        assert response.status_code == 200
        spell = response.json()
        
        assert spell["name"] == "Magic Missile"
        assert spell["level"] == 1
    
    def test_get_nonexistent_spell_returns_404(self, api_client):
        """GET /api/srd/spells/NonExistentSpell - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells/NonExistentSpell123")
        assert response.status_code == 404


class TestSRDClassesAPI:
    """Test /api/srd/classes endpoints"""
    
    def test_get_all_classes_returns_12(self, api_client):
        """GET /api/srd/classes - should return 12 classes"""
        response = api_client.get(f"{BASE_URL}/api/srd/classes")
        assert response.status_code == 200
        data = response.json()
        
        assert "classes" in data
        assert "source" in data
        assert len(data["classes"]) == 12  # Exactly 12 classes
        
        # Verify class structure
        cls = data["classes"][0]
        assert "name" in cls
        assert "hit_die" in cls
        assert "proficiencies" in cls
        assert "saving_throws" in cls
    
    def test_get_specific_class_fighter(self, api_client):
        """GET /api/srd/classes/Fighter - should return Fighter class"""
        response = api_client.get(f"{BASE_URL}/api/srd/classes/Fighter")
        assert response.status_code == 200
        cls = response.json()
        
        assert cls["name"] == "Fighter"
        assert cls["hit_die"] == "d10"
        assert "proficiencies" in cls
        assert "saving_throws" in cls
    
    def test_get_specific_class_wizard(self, api_client):
        """GET /api/srd/classes/Wizard - should return Wizard class"""
        response = api_client.get(f"{BASE_URL}/api/srd/classes/Wizard")
        assert response.status_code == 200
        cls = response.json()
        
        assert cls["name"] == "Wizard"
        assert cls["hit_die"] == "d6"
        assert "proficiencies" in cls
    
    def test_get_nonexistent_class_returns_404(self, api_client):
        """GET /api/srd/classes/NonExistentClass - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/srd/classes/NonExistentClass123")
        assert response.status_code == 404
    
    def test_all_standard_classes_present(self, api_client):
        """Verify all standard D&D 5e classes are present"""
        response = api_client.get(f"{BASE_URL}/api/srd/classes")
        assert response.status_code == 200
        data = response.json()
        
        class_names = [c["name"] for c in data["classes"]]
        expected_classes = [
            "Barbarian", "Bard", "Cleric", "Druid", "Fighter",
            "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer",
            "Warlock", "Wizard"
        ]
        for expected in expected_classes:
            assert expected in class_names, f"Missing class: {expected}"


class TestSRDRacesAPI:
    """Test /api/srd/races endpoint"""
    
    def test_get_all_races_returns_9(self, api_client):
        """GET /api/srd/races - should return 9 races"""
        response = api_client.get(f"{BASE_URL}/api/srd/races")
        assert response.status_code == 200
        data = response.json()
        
        assert "races" in data
        assert "source" in data
        assert len(data["races"]) == 9  # Exactly 9 races
    
    def test_race_structure(self, api_client):
        """Verify race data structure is correct"""
        response = api_client.get(f"{BASE_URL}/api/srd/races")
        assert response.status_code == 200
        data = response.json()
        
        # Check first race structure
        race = data["races"][0]
        assert "name" in race
        assert "ability_bonuses" in race
        assert "traits" in race
        assert "speed" in race
        assert "size" in race
        
        # ability_bonuses is a string in the current format
        assert isinstance(race["ability_bonuses"], str)
    
    def test_standard_races_present(self, api_client):
        """Verify standard races are present"""
        response = api_client.get(f"{BASE_URL}/api/srd/races")
        assert response.status_code == 200
        data = response.json()
        
        race_names = [r["name"] for r in data["races"]]
        expected_races = ["Dwarf", "Elf", "Halfling", "Human", "Dragonborn", "Gnome", "Half-Elf", "Half-Orc", "Tiefling"]
        for expected in expected_races:
            assert expected in race_names, f"Missing race: {expected}"
    
    def test_race_has_traits(self, api_client):
        """Verify races have traits array"""
        response = api_client.get(f"{BASE_URL}/api/srd/races")
        assert response.status_code == 200
        data = response.json()
        
        for race in data["races"]:
            assert "traits" in race
            assert isinstance(race["traits"], list)


class TestSRDSpellFiltering:
    """Test complex spell filtering scenarios"""
    
    def test_filter_level_3_evocation_spells(self, api_client):
        """Filter by both level and school"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells?level=3&school=evocation")
        assert response.status_code == 200
        data = response.json()
        
        for spell in data["spells"]:
            assert spell["level"] == 3
            assert spell["school"].lower() == "evocation"
    
    def test_spell_has_components(self, api_client):
        """Verify spells have components"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells")
        assert response.status_code == 200
        data = response.json()
        
        spell = data["spells"][0]
        assert "components" in spell
        assert isinstance(spell["components"], list)
    
    def test_spell_has_duration(self, api_client):
        """Verify spells have duration"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells")
        assert response.status_code == 200
        data = response.json()
        
        spell = data["spells"][0]
        assert "duration" in spell
    
    def test_concentration_spells_flagged(self, api_client):
        """Verify concentration spells have concentration flag"""
        response = api_client.get(f"{BASE_URL}/api/srd/spells")
        assert response.status_code == 200
        data = response.json()
        
        # Find a concentration spell
        concentration_spells = [s for s in data["spells"] if s.get("concentration")]
        assert len(concentration_spells) > 0, "Should have some concentration spells"
