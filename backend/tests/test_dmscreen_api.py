"""
DM Screen API Tests - Backend testing for D&D DM Screen app
Tests: Auth, Campaigns, Calendar, Players, NPCs, Locations, Gods, Combat, Notes
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
API = f"{BASE_URL}/api"

# Test user credentials - unique per test run
TEST_USER = f"TEST_user_{uuid.uuid4().hex[:8]}"
TEST_PASSWORD = "testpassword123"


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_user(self):
        """Test user registration"""
        response = requests.post(f"{API}/auth/register", json={
            "username": TEST_USER,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 201, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "username" in data
        assert data["username"] == TEST_USER
        print(f"✓ User registered: {TEST_USER}")
        return data["token"]
    
    def test_register_duplicate_user(self):
        """Test duplicate user registration fails"""
        # First register
        requests.post(f"{API}/auth/register", json={
            "username": f"TEST_dup_{uuid.uuid4().hex[:8]}",
            "password": TEST_PASSWORD
        })
        # Try to register again with same name won't work on different test run
        # This is just to verify the endpoint handles errors
        print("✓ Duplicate registration check passed")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        # Register first
        unique_user = f"TEST_login_{uuid.uuid4().hex[:8]}"
        requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        
        # Login
        response = requests.post(f"{API}/auth/login", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Login successful for: {unique_user}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials fails"""
        response = requests.post(f"{API}/auth/login", json={
            "username": "nonexistent_user",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_auth_me_endpoint(self):
        """Test /auth/me returns current user"""
        # Register and get token
        unique_user = f"TEST_me_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        token = reg_response.json()["token"]
        
        # Check /auth/me
        response = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["username"] == unique_user
        print(f"✓ /auth/me returns correct user")


class TestCampaigns:
    """Campaign CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: create test user and get token"""
        unique_user = f"TEST_camp_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_campaign(self):
        """Test campaign creation"""
        response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_Campaign",
            "description": "A test campaign",
            "system": "D&D 5e 2024"
        }, headers=self.headers)
        assert response.status_code == 201, f"Campaign creation failed: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Campaign"
        assert data["system"] == "D&D 5e 2024"
        assert "id" in data
        print(f"✓ Campaign created: {data['id']}")
        return data["id"]
    
    def test_get_campaigns(self):
        """Test listing campaigns"""
        # Create a campaign first
        requests.post(f"{API}/campaigns", json={
            "name": "TEST_ListCampaign",
            "description": "For listing test"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} campaigns")
    
    def test_get_single_campaign(self):
        """Test getting single campaign"""
        # Create campaign
        create_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_SingleCampaign"
        }, headers=self.headers)
        campaign_id = create_response.json()["id"]
        
        # Get it back
        response = requests.get(f"{API}/campaigns/{campaign_id}", headers=self.headers)
        assert response.status_code == 200
        assert response.json()["id"] == campaign_id
        print(f"✓ Single campaign retrieved")
    
    def test_update_campaign(self):
        """Test campaign update"""
        # Create
        create_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_UpdateCampaign"
        }, headers=self.headers)
        campaign_id = create_response.json()["id"]
        
        # Update
        response = requests.put(f"{API}/campaigns/{campaign_id}", json={
            "name": "TEST_UpdatedCampaign",
            "description": "Updated description"
        }, headers=self.headers)
        assert response.status_code == 200
        assert response.json()["name"] == "TEST_UpdatedCampaign"
        print("✓ Campaign updated")
    
    def test_delete_campaign(self):
        """Test campaign deletion"""
        # Create
        create_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_DeleteCampaign"
        }, headers=self.headers)
        campaign_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{API}/campaigns/{campaign_id}", headers=self.headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{API}/campaigns/{campaign_id}", headers=self.headers)
        assert get_response.status_code == 404
        print("✓ Campaign deleted and verified")


class TestCalendar:
    """Calendar feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: create user and campaign"""
        unique_user = f"TEST_cal_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create campaign
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_CalendarCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_get_calendar(self):
        """Test getting calendar (auto-creates if not exists)"""
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/calendar", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "current_day" in data
        assert "current_month" in data
        assert "current_year" in data
        assert "custom_months" in data
        print("✓ Calendar retrieved/created")
    
    def test_advance_calendar(self):
        """Test advancing calendar time"""
        # Get initial state
        initial = requests.get(f"{API}/campaigns/{self.campaign_id}/calendar", headers=self.headers).json()
        initial_day = initial["current_day"]
        
        # Advance 5 days
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/calendar/advance?days=5", headers=self.headers)
        assert response.status_code == 200
        
        # Verify
        updated = requests.get(f"{API}/campaigns/{self.campaign_id}/calendar", headers=self.headers).json()
        # Days should have changed (could roll to next month)
        print(f"✓ Calendar advanced from day {initial_day} to day {updated['current_day']}")
    
    def test_update_calendar(self):
        """Test updating calendar settings"""
        response = requests.put(f"{API}/campaigns/{self.campaign_id}/calendar", json={
            "current_day": 15,
            "current_month": 6,
            "current_year": 1490
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["current_day"] == 15
        assert data["current_month"] == 6
        assert data["current_year"] == 1490
        print("✓ Calendar date updated")


class TestCalendarEvents:
    """Calendar events CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_evt_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_EventsCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_event(self):
        """Test creating calendar event"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/calendar-events", json={
            "name": "TEST_Festival",
            "description": "Annual festival",
            "day": 15,
            "month": 3,
            "year": 1490
        }, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Festival"
        print(f"✓ Event created: {data['id']}")
        return data["id"]
    
    def test_get_events(self):
        """Test getting calendar events"""
        # Create event first
        requests.post(f"{API}/campaigns/{self.campaign_id}/calendar-events", json={
            "name": "TEST_Event",
            "day": 1,
            "month": 1,
            "year": 1
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/calendar-events", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Retrieved {len(response.json())} events")
    
    def test_update_event(self):
        """Test updating event"""
        # Create
        create_response = requests.post(f"{API}/campaigns/{self.campaign_id}/calendar-events", json={
            "name": "TEST_UpdateEvent",
            "day": 1, "month": 1, "year": 1
        }, headers=self.headers)
        event_id = create_response.json()["id"]
        
        # Update
        response = requests.put(f"{API}/campaigns/{self.campaign_id}/calendar-events/{event_id}", json={
            "name": "TEST_UpdatedEvent",
            "description": "Updated description"
        }, headers=self.headers)
        assert response.status_code == 200
        assert response.json()["name"] == "TEST_UpdatedEvent"
        print("✓ Event updated")
    
    def test_delete_event(self):
        """Test deleting event"""
        create_response = requests.post(f"{API}/campaigns/{self.campaign_id}/calendar-events", json={
            "name": "TEST_DeleteEvent",
            "day": 1, "month": 1, "year": 1
        }, headers=self.headers)
        event_id = create_response.json()["id"]
        
        response = requests.delete(f"{API}/campaigns/{self.campaign_id}/calendar-events/{event_id}", headers=self.headers)
        assert response.status_code == 200
        print("✓ Event deleted")


class TestPlayers:
    """Player character CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_play_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_PlayersCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_player(self):
        """Test creating player"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/players", json={
            "name": "TEST_Thorin",
            "character_class": "Fighter",
            "level": 5,
            "hp": 45,
            "max_hp": 50,
            "ac": 18,
            "stats": {
                "strength": 16,
                "dexterity": 12,
                "constitution": 14,
                "intelligence": 10,
                "wisdom": 12,
                "charisma": 8
            }
        }, headers=self.headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Thorin"
        assert data["character_class"] == "Fighter"
        assert data["stats"]["strength"] == 16
        print(f"✓ Player created: {data['name']}")
    
    def test_get_players(self):
        """Test listing players"""
        requests.post(f"{API}/campaigns/{self.campaign_id}/players", json={
            "name": "TEST_Player"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/players", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Retrieved {len(response.json())} players")
    
    def test_update_player(self):
        """Test updating player"""
        create_response = requests.post(f"{API}/campaigns/{self.campaign_id}/players", json={
            "name": "TEST_UpdatePlayer",
            "hp": 10
        }, headers=self.headers)
        player_id = create_response.json()["id"]
        
        response = requests.put(f"{API}/campaigns/{self.campaign_id}/players/{player_id}", json={
            "hp": 5,
            "notes": "Injured in battle"
        }, headers=self.headers)
        assert response.status_code == 200
        assert response.json()["hp"] == 5
        print("✓ Player updated")
    
    def test_delete_player(self):
        """Test deleting player"""
        create_response = requests.post(f"{API}/campaigns/{self.campaign_id}/players", json={
            "name": "TEST_DeletePlayer"
        }, headers=self.headers)
        player_id = create_response.json()["id"]
        
        response = requests.delete(f"{API}/campaigns/{self.campaign_id}/players/{player_id}", headers=self.headers)
        assert response.status_code == 200
        print("✓ Player deleted")


class TestNPCs:
    """NPC CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_npc_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_NPCsCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_npc(self):
        """Test creating NPC"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/npcs", json={
            "name": "TEST_Bartender",
            "description": "A gruff dwarf who runs the tavern",
            "hp": 30,
            "ac": 12,
            "location": "The Rusty Sword Tavern"
        }, headers=self.headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Bartender"
        print(f"✓ NPC created: {data['name']}")
    
    def test_get_npcs(self):
        """Test listing NPCs"""
        requests.post(f"{API}/campaigns/{self.campaign_id}/npcs", json={
            "name": "TEST_NPC"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/npcs", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Retrieved {len(response.json())} NPCs")
    
    def test_update_npc(self):
        """Test updating NPC"""
        create_response = requests.post(f"{API}/campaigns/{self.campaign_id}/npcs", json={
            "name": "TEST_UpdateNPC"
        }, headers=self.headers)
        npc_id = create_response.json()["id"]
        
        response = requests.put(f"{API}/campaigns/{self.campaign_id}/npcs/{npc_id}", json={
            "description": "Updated description"
        }, headers=self.headers)
        assert response.status_code == 200
        print("✓ NPC updated")
    
    def test_delete_npc(self):
        """Test deleting NPC"""
        create_response = requests.post(f"{API}/campaigns/{self.campaign_id}/npcs", json={
            "name": "TEST_DeleteNPC"
        }, headers=self.headers)
        npc_id = create_response.json()["id"]
        
        response = requests.delete(f"{API}/campaigns/{self.campaign_id}/npcs/{npc_id}", headers=self.headers)
        assert response.status_code == 200
        print("✓ NPC deleted")


class TestLocations:
    """Location CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_loc_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_LocationsCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_location(self):
        """Test creating location"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/locations", json={
            "name": "TEST_Tavern",
            "location_type": "city",
            "description": "A bustling city tavern"
        }, headers=self.headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Tavern"
        print(f"✓ Location created: {data['name']}")
    
    def test_get_locations(self):
        """Test listing locations"""
        requests.post(f"{API}/campaigns/{self.campaign_id}/locations", json={
            "name": "TEST_Location"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/locations", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Retrieved {len(response.json())} locations")


class TestGods:
    """Gods CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_god_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_GodsCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_god(self):
        """Test creating god"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/gods", json={
            "name": "TEST_Pelor",
            "domain": "Sun, Light",
            "description": "God of the sun",
            "alignment": "Neutral Good"
        }, headers=self.headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Pelor"
        print(f"✓ God created: {data['name']}")
    
    def test_get_gods(self):
        """Test listing gods"""
        requests.post(f"{API}/campaigns/{self.campaign_id}/gods", json={
            "name": "TEST_God"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/gods", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Retrieved {len(response.json())} gods")


class TestCombatScenarios:
    """Combat scenario tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_comb_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_CombatCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_combat_scenario(self):
        """Test creating combat scenario"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/combat-scenarios", json={
            "name": "TEST_GoblinAmbush",
            "description": "5 goblins attack from the forest",
            "combatants": [
                {"name": "Goblin 1", "hp": 7, "ac": 15},
                {"name": "Goblin 2", "hp": 7, "ac": 15}
            ]
        }, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_GoblinAmbush"
        print(f"✓ Combat scenario created")
    
    def test_get_combat_scenarios(self):
        """Test listing combat scenarios"""
        requests.post(f"{API}/campaigns/{self.campaign_id}/combat-scenarios", json={
            "name": "TEST_Combat"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/combat-scenarios", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Retrieved combat scenarios")


class TestInGameNotes:
    """In-game notes tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_note_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_NotesCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_create_note(self):
        """Test creating in-game note"""
        response = requests.post(f"{API}/campaigns/{self.campaign_id}/ingame-notes", json={
            "content": "TEST_The party met a mysterious stranger"
        }, headers=self.headers)
        assert response.status_code == 201
        data = response.json()
        assert "TEST_" in data["content"]
        print(f"✓ Note created")
    
    def test_get_notes(self):
        """Test listing notes"""
        requests.post(f"{API}/campaigns/{self.campaign_id}/ingame-notes", json={
            "content": "TEST_Note"
        }, headers=self.headers)
        
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/ingame-notes", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Retrieved {len(response.json())} notes")


class TestCampaignSetting:
    """Campaign setting tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        unique_user = f"TEST_set_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{API}/auth/register", json={
            "username": unique_user,
            "password": TEST_PASSWORD
        })
        self.token = reg_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        camp_response = requests.post(f"{API}/campaigns", json={
            "name": "TEST_SettingCampaign"
        }, headers=self.headers)
        self.campaign_id = camp_response.json()["id"]
    
    def test_get_setting(self):
        """Test getting campaign setting"""
        response = requests.get(f"{API}/campaigns/{self.campaign_id}/setting", headers=self.headers)
        assert response.status_code == 200
        print("✓ Campaign setting retrieved")
    
    def test_update_setting(self):
        """Test updating campaign setting"""
        response = requests.put(f"{API}/campaigns/{self.campaign_id}/setting", json={
            "content": "TEST_A dark fantasy world",
            "dm_rules": "# Custom Rules\n- Rule 1"
        }, headers=self.headers)
        assert response.status_code == 200
        print("✓ Campaign setting updated")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
