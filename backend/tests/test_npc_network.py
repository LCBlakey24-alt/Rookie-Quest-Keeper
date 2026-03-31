"""
Test NPC Network API endpoints for the NPC Relationship Map feature.
Tests CRUD operations for NPCs with expanded stat blocks and AI generation.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"


class TestNPCNetworkAPI:
    """Test NPC Network API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        yield
        
        # Cleanup: Delete test NPCs created during tests
        try:
            npcs = self.session.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs").json()
            for npc in npcs:
                if npc.get('name', '').startswith('TEST_'):
                    self.session.delete(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs/{npc['id']}")
        except:
            pass
    
    def test_get_npcs_list(self):
        """Test GET /api/campaigns/{id}/npcs returns list of NPCs"""
        response = self.session.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET NPCs returned {len(data)} NPCs")
    
    def test_create_npc_basic(self):
        """Test POST /api/campaigns/{id}/npcs creates a basic NPC"""
        npc_data = {
            "name": "TEST_Basic_NPC",
            "race": "Human",
            "class_name": "Fighter",
            "level": 3,
            "hp": 25,
            "max_hp": 25,
            "ac": 16,
            "description": "A test NPC"
        }
        
        response = self.session.post(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs", json=npc_data)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Basic_NPC"
        assert data["race"] == "Human"
        assert data["class_name"] == "Fighter"
        assert data["level"] == 3
        assert data["hp"] == 25
        assert data["ac"] == 16
        assert "id" in data
        print(f"✓ Created basic NPC with ID: {data['id']}")
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs")
        npcs = get_response.json()
        created_npc = next((n for n in npcs if n["id"] == data["id"]), None)
        assert created_npc is not None, "Created NPC should be in list"
        print("✓ NPC persisted in database")
    
    def test_create_npc_with_full_stat_block(self):
        """Test POST /api/campaigns/{id}/npcs with full stat block including attacks, abilities, spells"""
        npc_data = {
            "name": "TEST_Full_Stat_NPC",
            "race": "Elf",
            "class_name": "Wizard",
            "level": 5,
            "alignment": "Neutral Good",
            "hp": 22,
            "max_hp": 22,
            "ac": 12,
            "speed": "30 ft.",
            "proficiency_bonus": 3,
            "stats": {
                "strength": 8,
                "dexterity": 14,
                "constitution": 12,
                "intelligence": 18,
                "wisdom": 13,
                "charisma": 10
            },
            "saving_throws": ["intelligence", "wisdom"],
            "skills": ["arcana", "history", "investigation"],
            "attacks": [
                {"name": "Quarterstaff", "bonus": "+1", "damage": "1d6-1 bludgeoning", "notes": "Versatile (1d8-1)"},
                {"name": "Fire Bolt", "bonus": "+7", "damage": "2d10 fire", "notes": "Cantrip, 120 ft range"}
            ],
            "abilities": [
                {"name": "Arcane Recovery", "description": "Recover spell slots on short rest"},
                {"name": "Evocation Savant", "description": "Copy evocation spells at half cost"}
            ],
            "spells": {
                "casting_ability": "Intelligence",
                "spell_save_dc": 15,
                "spell_attack_bonus": 7,
                "cantrips": ["Fire Bolt", "Mage Hand", "Prestidigitation"],
                "slot_level": 3,
                "slot_count": 2,
                "known_spells": ["Shield", "Magic Missile", "Fireball", "Counterspell"]
            },
            "appearance": "Tall elf with silver hair",
            "personality": "Curious and studious",
            "backstory": "Former academy student",
            "role": "Ally",
            "location": "Wizard Tower",
            "notes": "Knows secrets about the artifact"
        }
        
        response = self.session.post(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs", json=npc_data)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all fields
        assert data["name"] == "TEST_Full_Stat_NPC"
        assert data["race"] == "Elf"
        assert data["class_name"] == "Wizard"
        assert data["level"] == 5
        assert data["stats"]["intelligence"] == 18
        assert len(data["attacks"]) == 2
        assert len(data["abilities"]) == 2
        assert data["spells"] is not None
        assert data["spells"]["casting_ability"] == "Intelligence"
        assert "Fireball" in data["spells"]["known_spells"]
        print(f"✓ Created full stat block NPC with ID: {data['id']}")
        print(f"  - Stats: STR {data['stats']['strength']}, INT {data['stats']['intelligence']}")
        print(f"  - Attacks: {[a['name'] for a in data['attacks']]}")
        print(f"  - Spells: {data['spells']['known_spells']}")
    
    def test_update_npc(self):
        """Test PUT /api/campaigns/{id}/npcs/{npc_id} updates NPC"""
        # First create an NPC
        create_response = self.session.post(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs", json={
            "name": "TEST_Update_NPC",
            "race": "Dwarf",
            "class_name": "Cleric",
            "level": 4,
            "hp": 30,
            "ac": 18
        })
        assert create_response.status_code == 201
        npc_id = create_response.json()["id"]
        
        # Update the NPC
        update_data = {
            "name": "TEST_Update_NPC_Modified",
            "level": 5,
            "hp": 38,
            "stats": {
                "strength": 14,
                "dexterity": 10,
                "constitution": 16,
                "intelligence": 10,
                "wisdom": 18,
                "charisma": 12
            },
            "attacks": [
                {"name": "Warhammer", "bonus": "+5", "damage": "1d8+2 bludgeoning", "notes": ""}
            ],
            "spells": {
                "casting_ability": "Wisdom",
                "spell_save_dc": 15,
                "spell_attack_bonus": 7,
                "cantrips": ["Sacred Flame", "Guidance"],
                "slot_level": 3,
                "slot_count": 3,
                "known_spells": ["Cure Wounds", "Bless", "Spirit Guardians"]
            }
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs/{npc_id}", json=update_data)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        
        assert data["name"] == "TEST_Update_NPC_Modified"
        assert data["level"] == 5
        assert data["hp"] == 38
        assert data["stats"]["wisdom"] == 18
        assert len(data["attacks"]) == 1
        assert data["spells"]["casting_ability"] == "Wisdom"
        print(f"✓ Updated NPC {npc_id}")
        print(f"  - New level: {data['level']}, HP: {data['hp']}")
        print(f"  - Spells: {data['spells']['known_spells']}")
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs")
        npcs = get_response.json()
        updated_npc = next((n for n in npcs if n["id"] == npc_id), None)
        assert updated_npc is not None
        assert updated_npc["name"] == "TEST_Update_NPC_Modified"
        print("✓ Update persisted in database")
    
    def test_delete_npc(self):
        """Test DELETE /api/campaigns/{id}/npcs/{npc_id} removes NPC"""
        # First create an NPC
        create_response = self.session.post(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs", json={
            "name": "TEST_Delete_NPC",
            "race": "Halfling",
            "class_name": "Rogue",
            "level": 2,
            "hp": 15,
            "ac": 14
        })
        assert create_response.status_code == 201
        npc_id = create_response.json()["id"]
        
        # Delete the NPC
        delete_response = self.session.delete(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs/{npc_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print(f"✓ Deleted NPC {npc_id}")
        
        # Verify removal
        get_response = self.session.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs")
        npcs = get_response.json()
        deleted_npc = next((n for n in npcs if n["id"] == npc_id), None)
        assert deleted_npc is None, "Deleted NPC should not be in list"
        print("✓ NPC removed from database")
    
    def test_ai_generate_npc(self):
        """Test POST /api/campaigns/{id}/npcs/generate creates AI-generated NPC with full stats"""
        generate_data = {
            "prompt": "A level 5 human fighter guard captain",
            "race": "Human",
            "class_name": "Fighter",
            "level": 5,
            "role": "Ally"
        }
        
        response = self.session.post(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs/generate", json=generate_data)
        
        # AI generation may take time, allow for 403 if limit reached
        if response.status_code == 403:
            pytest.skip("AI generation limit reached - skipping AI test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify AI generated NPC has required fields
        assert "id" in data, "Generated NPC should have ID"
        assert "name" in data, "Generated NPC should have name"
        assert data.get("race") == "Human" or "Human" in str(data.get("race", "")), "Race should be Human"
        assert data.get("class_name") == "Fighter" or "Fighter" in str(data.get("class_name", "")), "Class should be Fighter"
        assert data.get("level", 0) >= 1, "Level should be set"
        assert data.get("hp", 0) > 0, "HP should be positive"
        assert data.get("ac", 0) > 0, "AC should be positive"
        assert "stats" in data, "Should have stats"
        
        print(f"✓ AI Generated NPC: {data.get('name')}")
        print(f"  - Race: {data.get('race')}, Class: {data.get('class_name')}, Level: {data.get('level')}")
        print(f"  - HP: {data.get('hp')}, AC: {data.get('ac')}")
        
        if data.get("stats"):
            print(f"  - Stats: STR {data['stats'].get('strength')}, DEX {data['stats'].get('dexterity')}, CON {data['stats'].get('constitution')}")
        
        if data.get("attacks"):
            print(f"  - Attacks: {[a.get('name') for a in data['attacks']]}")
        
        if data.get("abilities"):
            print(f"  - Abilities: {[a.get('name') for a in data['abilities']]}")
        
        if data.get("spells"):
            print(f"  - Spells: {data['spells'].get('known_spells', [])}")
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs")
        npcs = get_response.json()
        generated_npc = next((n for n in npcs if n["id"] == data["id"]), None)
        assert generated_npc is not None, "Generated NPC should be persisted"
        print("✓ AI Generated NPC persisted in database")
        
        # Cleanup - delete the generated NPC
        self.session.delete(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs/{data['id']}")
    
    def test_npc_stats_model_structure(self):
        """Test that NPC stats model has all 6 ability scores"""
        npc_data = {
            "name": "TEST_Stats_Model_NPC",
            "race": "Human",
            "class_name": "Fighter",
            "level": 1,
            "hp": 10,
            "ac": 10,
            "stats": {
                "strength": 15,
                "dexterity": 14,
                "constitution": 13,
                "intelligence": 12,
                "wisdom": 11,
                "charisma": 10
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npcs", json=npc_data)
        assert response.status_code == 201
        data = response.json()
        
        # Verify all 6 ability scores are present
        stats = data.get("stats", {})
        assert "strength" in stats, "Stats should have strength"
        assert "dexterity" in stats, "Stats should have dexterity"
        assert "constitution" in stats, "Stats should have constitution"
        assert "intelligence" in stats, "Stats should have intelligence"
        assert "wisdom" in stats, "Stats should have wisdom"
        assert "charisma" in stats, "Stats should have charisma"
        
        assert stats["strength"] == 15
        assert stats["dexterity"] == 14
        assert stats["constitution"] == 13
        assert stats["intelligence"] == 12
        assert stats["wisdom"] == 11
        assert stats["charisma"] == 10
        
        print("✓ NPC stats model has all 6 ability scores")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
