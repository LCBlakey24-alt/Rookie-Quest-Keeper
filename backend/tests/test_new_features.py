"""
Backend API tests for DM Screen new features:
- Custom calendar builder (add/remove months, set days)
- Character creator (players CRUD with stats)
- Session notes (in-game notes CRUD + delete)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

class TestAuth:
    """Test user registration and login"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a unique test user for the test class"""
        username = f"TEST_user_{uuid.uuid4().hex[:8]}"
        password = "testpassword123"
        return {"username": username, "password": password}
    
    @pytest.fixture(scope="class") 
    def auth_token(self, test_user):
        """Register and get auth token"""
        # Register user
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=test_user
        )
        assert response.status_code == 201, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_register_success(self, test_user):
        """Test user registration returns token"""
        new_user = {"username": f"TEST_reg_{uuid.uuid4().hex[:8]}", "password": "password123"}
        response = requests.post(f"{BASE_URL}/api/auth/register", json=new_user)
        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["username"] == new_user["username"]
    
    def test_login_success(self, test_user, auth_token):
        """Test login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=test_user)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data


class TestCustomCalendarBuilder:
    """Test custom calendar builder with add/remove months"""
    
    @pytest.fixture(scope="class")
    def auth_header(self):
        """Create user and get auth header"""
        user = {"username": f"TEST_cal_{uuid.uuid4().hex[:8]}", "password": "testpass123"}
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user)
        assert response.status_code == 201
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_header):
        """Create test campaign"""
        campaign_data = {
            "name": f"TEST_Campaign_{uuid.uuid4().hex[:6]}",
            "description": "Test campaign for calendar",
            "system": "D&D 5e 2024"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers=auth_header
        )
        assert response.status_code == 201
        return response.json()["id"]
    
    def test_get_default_calendar(self, auth_header, campaign_id):
        """Test getting default calendar (gregorian)"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["calendar_type"] == "gregorian"
        assert len(data["custom_months"]) == 12  # Default gregorian months
        assert data["custom_months"][0]["name"] == "January"
        assert data["custom_months"][0]["days"] == 31
    
    def test_update_to_custom_calendar(self, auth_header, campaign_id):
        """Test creating custom calendar with custom months"""
        custom_months = [
            {"name": "FirstMonth", "days": 30},
            {"name": "SecondMonth", "days": 25},
            {"name": "ThirdMonth", "days": 35},
        ]
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            json={"calendar_type": "custom", "custom_months": custom_months},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["calendar_type"] == "custom"
        assert len(data["custom_months"]) == 3
        assert data["custom_months"][0]["name"] == "FirstMonth"
        assert data["custom_months"][1]["days"] == 25
        assert data["custom_months"][2]["days"] == 35
    
    def test_update_calendar_add_month(self, auth_header, campaign_id):
        """Test adding a month to custom calendar"""
        # First get current calendar
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            headers=auth_header
        )
        current_months = response.json()["custom_months"]
        
        # Add new month
        new_months = current_months + [{"name": "FourthMonth", "days": 28}]
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            json={"custom_months": new_months},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["custom_months"]) == 4
        assert data["custom_months"][3]["name"] == "FourthMonth"
        assert data["custom_months"][3]["days"] == 28
    
    def test_update_calendar_remove_month(self, auth_header, campaign_id):
        """Test removing a month from custom calendar"""
        # First get current calendar
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            headers=auth_header
        )
        current_months = response.json()["custom_months"]
        
        # Remove first month
        new_months = current_months[1:]  # Remove first month
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            json={"custom_months": new_months},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["custom_months"]) == len(current_months) - 1
    
    def test_update_calendar_set_days(self, auth_header, campaign_id):
        """Test setting days for a month"""
        # Create calendar with specific days
        custom_months = [
            {"name": "TestMonth", "days": 42}  # Custom days
        ]
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            json={"custom_months": custom_months},
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["custom_months"][0]["days"] == 42
    
    def test_advance_calendar(self, auth_header, campaign_id):
        """Test advancing time in calendar"""
        # Reset calendar
        requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar",
            json={
                "current_day": 1,
                "current_month": 1,
                "current_year": 1,
                "custom_months": [{"name": "TestMonth", "days": 30}]
            },
            headers=auth_header
        )
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar/advance?days=5",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["current_day"] == 6


class TestCharacterCreator:
    """Test D&D Beyond style character creator (Players CRUD)"""
    
    @pytest.fixture(scope="class")
    def auth_header(self):
        """Create user and get auth header"""
        user = {"username": f"TEST_char_{uuid.uuid4().hex[:8]}", "password": "testpass123"}
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user)
        assert response.status_code == 201
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_header):
        """Create test campaign"""
        campaign_data = {
            "name": f"TEST_CharCampaign_{uuid.uuid4().hex[:6]}",
            "description": "Test campaign for character creator",
            "system": "D&D 5e 2024"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers=auth_header
        )
        assert response.status_code == 201
        return response.json()["id"]
    
    def test_create_character_with_full_stats(self, auth_header, campaign_id):
        """Test creating character with race, class, background, stats (D&D Beyond style)"""
        character_data = {
            "name": "TEST_Aragorn",
            "character_class": "Fighter (Battle Master)",
            "level": 5,
            "hp": 45,
            "max_hp": 45,
            "ac": 16,
            "stats": {
                "strength": 16,
                "dexterity": 14,
                "constitution": 15,
                "intelligence": 10,
                "wisdom": 12,
                "charisma": 11
            },
            "notes": "Race: Human\nBackground: Soldier\nTraits: +1 to all abilities"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players",
            json=character_data,
            headers=auth_header
        )
        assert response.status_code == 201
        data = response.json()
        
        # Verify all fields
        assert data["name"] == "TEST_Aragorn"
        assert data["character_class"] == "Fighter (Battle Master)"
        assert data["level"] == 5
        assert data["hp"] == 45
        assert data["max_hp"] == 45
        assert data["ac"] == 16
        assert data["stats"]["strength"] == 16
        assert data["stats"]["dexterity"] == 14
        assert "Human" in data["notes"]
        assert "Soldier" in data["notes"]
        return data["id"]
    
    def test_create_wizard_character(self, auth_header, campaign_id):
        """Test creating wizard character with subclass"""
        character_data = {
            "name": "TEST_Gandalf",
            "character_class": "Wizard (School of Evocation)",
            "level": 10,
            "hp": 40,
            "max_hp": 40,
            "ac": 12,
            "stats": {
                "strength": 8,
                "dexterity": 14,
                "constitution": 12,
                "intelligence": 18,
                "wisdom": 14,
                "charisma": 10
            },
            "notes": "Race: Elf (High Elf)\nBackground: Sage\nTraits: Darkvision, Fey Ancestry, Trance"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players",
            json=character_data,
            headers=auth_header
        )
        assert response.status_code == 201
        data = response.json()
        assert "Wizard" in data["character_class"]
        assert "Evocation" in data["character_class"]
        assert data["stats"]["intelligence"] == 18
    
    def test_list_players(self, auth_header, campaign_id):
        """Test listing all players in campaign"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2  # At least the 2 characters we created
    
    def test_update_character(self, auth_header, campaign_id):
        """Test updating character stats"""
        # First create a character
        char_data = {
            "name": "TEST_ToUpdate",
            "character_class": "Rogue",
            "level": 1,
            "hp": 8,
            "max_hp": 8,
            "ac": 14,
            "stats": {"strength": 10, "dexterity": 16, "constitution": 12, "intelligence": 14, "wisdom": 10, "charisma": 14}
        }
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players",
            json=char_data,
            headers=auth_header
        )
        player_id = create_response.json()["id"]
        
        # Update level and HP
        update_data = {
            "level": 3,
            "hp": 20,
            "max_hp": 20,
            "character_class": "Rogue (Swashbuckler)"
        }
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players/{player_id}",
            json=update_data,
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["level"] == 3
        assert data["hp"] == 20
        assert "Swashbuckler" in data["character_class"]
    
    def test_delete_character(self, auth_header, campaign_id):
        """Test deleting a character"""
        # Create character to delete
        char_data = {
            "name": "TEST_ToDelete",
            "character_class": "Barbarian",
            "level": 1
        }
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players",
            json=char_data,
            headers=auth_header
        )
        player_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players/{player_id}",
            headers=auth_header
        )
        assert response.status_code == 200
        
        # Verify deleted - should get empty list for this player
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/players",
            headers=auth_header
        )
        player_ids = [p["id"] for p in get_response.json()]
        assert player_id not in player_ids


class TestSessionNotes:
    """Test DM Screen session notes (in-game notes)"""
    
    @pytest.fixture(scope="class")
    def auth_header(self):
        """Create user and get auth header"""
        user = {"username": f"TEST_notes_{uuid.uuid4().hex[:8]}", "password": "testpass123"}
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user)
        assert response.status_code == 201
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_header):
        """Create test campaign"""
        campaign_data = {
            "name": f"TEST_NotesCampaign_{uuid.uuid4().hex[:6]}",
            "description": "Test campaign for session notes",
            "system": "D&D 5e 2024"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers=auth_header
        )
        assert response.status_code == 201
        return response.json()["id"]
    
    def test_create_session_note(self, auth_header, campaign_id):
        """Test adding session note"""
        note_data = {
            "content": "The party met Eldrin the blacksmith in Thornwood village."
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/ingame-notes",
            json=note_data,
            headers=auth_header
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content"] == note_data["content"]
        assert "id" in data
        assert "created_at" in data
        return data["id"]
    
    def test_list_session_notes(self, auth_header, campaign_id):
        """Test listing session notes"""
        # Add a few notes
        notes = [
            "Party fought goblin ambush",
            "Found mysterious map in old chest",
            "Long rest at the tavern"
        ]
        for note in notes:
            requests.post(
                f"{BASE_URL}/api/campaigns/{campaign_id}/ingame-notes",
                json={"content": note},
                headers=auth_header
            )
        
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/ingame-notes",
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        # Verify notes are returned (sorted by created_at desc)
        note_contents = [n["content"] for n in data]
        assert any("goblin" in c for c in note_contents)
    
    def test_delete_session_note(self, auth_header, campaign_id):
        """Test deleting session note"""
        # Create note to delete
        note_data = {"content": "TEST_DeleteMe - This note should be deleted"}
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/ingame-notes",
            json=note_data,
            headers=auth_header
        )
        note_id = create_response.json()["id"]
        
        # Delete note
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{campaign_id}/ingame-notes/{note_id}",
            headers=auth_header
        )
        assert response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/ingame-notes",
            headers=auth_header
        )
        note_ids = [n["id"] for n in get_response.json()]
        assert note_id not in note_ids


class TestCalendarEvents:
    """Test calendar events CRUD"""
    
    @pytest.fixture(scope="class")
    def auth_header(self):
        """Create user and get auth header"""
        user = {"username": f"TEST_events_{uuid.uuid4().hex[:8]}", "password": "testpass123"}
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user)
        assert response.status_code == 201
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def campaign_id(self, auth_header):
        """Create test campaign"""
        campaign_data = {
            "name": f"TEST_EventsCampaign_{uuid.uuid4().hex[:6]}",
            "description": "Test campaign for events",
            "system": "D&D 5e 2024"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers=auth_header
        )
        assert response.status_code == 201
        return response.json()["id"]
    
    def test_create_event(self, auth_header, campaign_id):
        """Test creating calendar event"""
        event_data = {
            "name": "TEST_Festival",
            "description": "Annual harvest festival",
            "day": 15,
            "month": 3,
            "year": 1,
            "is_recurring": True,
            "recurrence_type": "annual"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar-events",
            json=event_data,
            headers=auth_header
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Festival"
        assert data["is_recurring"] == True
        assert data["recurrence_type"] == "annual"
    
    def test_delete_event(self, auth_header, campaign_id):
        """Test deleting calendar event"""
        # Create event
        event_data = {"name": "TEST_ToDelete", "day": 1, "month": 1, "year": 1}
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar-events",
            json=event_data,
            headers=auth_header
        )
        event_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{campaign_id}/calendar-events/{event_id}",
            headers=auth_header
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
