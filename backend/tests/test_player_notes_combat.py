"""
Backend API Tests for Player Notes and Combat Scenarios
Tests the player notes CRUD operations and combat scenario endpoints.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = 'stress_test_1772651200@test.com'
TEST_USER_PASSWORD = 'TestPass123!'
TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c'
TEST_SCENARIO_ID = '7bd4be2a-2821-4daf-97d7-af5ddbe34968'

@pytest.fixture
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()['token']

@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestPlayerNotesAPI:
    """Tests for player notes CRUD operations"""
    
    def test_get_player_notes(self, auth_headers):
        """Test GET /api/player/notes returns list of notes"""
        response = requests.get(f"{BASE_URL}/api/player/notes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_player_note(self, auth_headers):
        """Test POST /api/player/notes creates a new note"""
        unique_id = str(uuid.uuid4())[:8]
        note_data = {
            "title": f"TEST_Note_{unique_id}",
            "content": f"Test note content created at {datetime.now().isoformat()}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/player/notes",
            json=note_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert 'id' in data
        
        # Clean up - delete the note
        note_id = data['id']
        delete_response = requests.delete(
            f"{BASE_URL}/api/player/notes/{note_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
    
    def test_create_player_note_with_campaign(self, auth_headers):
        """Test creating a note linked to a campaign"""
        unique_id = str(uuid.uuid4())[:8]
        note_data = {
            "title": f"TEST_CampaignNote_{unique_id}",
            "content": "Note linked to campaign",
            "campaign_id": TEST_CAMPAIGN_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/api/player/notes",
            json=note_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert 'id' in data
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/player/notes/{data['id']}", headers=auth_headers)
    
    def test_update_player_note(self, auth_headers):
        """Test PUT /api/player/notes/{id} updates a note"""
        # First create a note
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/player/notes",
            json={"title": f"TEST_Update_{unique_id}", "content": "Original content"},
            headers=auth_headers
        )
        assert create_response.status_code == 201
        note_id = create_response.json()['id']
        
        # Update the note
        update_response = requests.put(
            f"{BASE_URL}/api/player/notes/{note_id}",
            json={"title": "Updated Title", "content": "Updated content"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify update by getting all notes
        get_response = requests.get(f"{BASE_URL}/api/player/notes", headers=auth_headers)
        notes = get_response.json()
        updated_note = next((n for n in notes if n['id'] == note_id), None)
        assert updated_note is not None
        assert updated_note['title'] == "Updated Title"
        assert updated_note['content'] == "Updated content"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/player/notes/{note_id}", headers=auth_headers)
    
    def test_delete_player_note(self, auth_headers):
        """Test DELETE /api/player/notes/{id} deletes a note"""
        # Create a note
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/player/notes",
            json={"title": f"TEST_Delete_{unique_id}", "content": "To be deleted"},
            headers=auth_headers
        )
        note_id = create_response.json()['id']
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/player/notes/{note_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/player/notes", headers=auth_headers)
        notes = get_response.json()
        assert not any(n['id'] == note_id for n in notes)


class TestSessionRecapsAPI:
    """Tests for session recaps endpoint"""
    
    def test_get_session_recaps(self, auth_headers):
        """Test GET /api/player/session-recaps returns list"""
        response = requests.get(f"{BASE_URL}/api/player/session-recaps", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCombatScenariosAPI:
    """Tests for combat scenarios endpoint"""
    
    def test_get_combat_scenarios(self, auth_headers):
        """Test GET /api/campaigns/{id}/combat-scenarios"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/combat-scenarios",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # We have test scenario
    
    def test_get_combat_scenario_by_id(self, auth_headers):
        """Test GET /api/campaigns/{id}/combat-scenarios/{scenario_id}"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/combat-scenarios/{TEST_SCENARIO_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'Goblin Ambush'
        assert 'combatants' in data
        assert len(data['combatants']) == 2
    
    def test_combat_scenario_has_correct_combatants(self, auth_headers):
        """Test that combat scenario has Goblin Chief and Goblin Shaman"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/combat-scenarios/{TEST_SCENARIO_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        combatants = data['combatants']
        names = [c['name'] for c in combatants]
        assert 'Goblin Chief' in names
        assert 'Goblin Shaman' in names
        
        # Verify stats
        chief = next(c for c in combatants if c['name'] == 'Goblin Chief')
        assert chief['hp'] == 35
        assert chief['ac'] == 15
        
        shaman = next(c for c in combatants if c['name'] == 'Goblin Shaman')
        assert shaman['hp'] == 20
        assert shaman['ac'] == 12


class TestCampaignPlayersAPI:
    """Tests for campaign players endpoint"""
    
    def test_get_campaign_players(self, auth_headers):
        """Test GET /api/campaigns/{id}/players"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/players",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # Fighter and Wizard
    
    def test_campaign_has_fighter_and_wizard(self, auth_headers):
        """Test that campaign has Fighter and Wizard characters"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/players",
            headers=auth_headers
        )
        data = response.json()
        
        names = [p['name'] for p in data]
        assert 'Fighter' in names
        assert 'Wizard' in names


class TestInGameNotesAPI:
    """Tests for in-game notes (GM session notes)"""
    
    def test_get_ingame_notes(self, auth_headers):
        """Test GET /api/campaigns/{id}/ingame-notes"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/ingame-notes",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_ingame_note(self, auth_headers):
        """Test POST /api/campaigns/{id}/ingame-notes"""
        unique_id = str(uuid.uuid4())[:8]
        note_data = {"content": f"TEST_InGameNote_{unique_id}"}
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/ingame-notes",
            json=note_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert 'id' in data
        
        # Clean up
        requests.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/ingame-notes/{data['id']}",
            headers=auth_headers
        )


class TestAuthAPI:
    """Tests for authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'username' in data
        assert 'email' in data
    
    def test_login_invalid_password(self):
        """Test login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": "wrong_password"}
        )
        assert response.status_code == 401
    
    def test_auth_me(self, auth_headers):
        """Test GET /api/auth/me returns user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'username' in data
