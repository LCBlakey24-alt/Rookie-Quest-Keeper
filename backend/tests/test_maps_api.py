"""
Test suite for Map Builder API endpoints
Tests CRUD operations for campaign maps including terrain, walls, fog of war
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test campaign and user
TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c'
TEST_USER_EMAIL = 'stress_test_1772651200@test.com'
TEST_USER_PASSWORD = 'TestPass123!'


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
    pytest.skip(f"Authentication failed: {response.text}")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture
def test_map_data():
    """Generate unique test map data"""
    timestamp = int(datetime.now().timestamp())
    return {
        "name": f"TEST_Map_{timestamp}",
        "width": 25,
        "height": 20,
        "terrain": [["stone"] * 25 for _ in range(20)],
        "walls": [{"x1": 0, "y1": 0, "x2": 5, "y2": 0, "type": "stone"}],
        "doors": [{"x": 2, "y": 0, "orientation": "horizontal", "isOpen": False}],
        "objects": [],
        "fog_of_war": [[True] * 25 for _ in range(20)],
        "tokens": []
    }


@pytest.fixture
def created_map(authenticated_client, test_map_data):
    """Create a map and clean up after test"""
    response = authenticated_client.post(
        f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps",
        json=test_map_data
    )
    assert response.status_code == 200, f"Failed to create map: {response.text}"
    map_data = response.json()
    
    yield map_data
    
    # Cleanup: delete the map
    authenticated_client.delete(
        f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{map_data['id']}"
    )


class TestMapsAPI:
    """Test suite for Maps CRUD API"""
    
    def test_get_maps_empty(self, authenticated_client):
        """Test GET maps returns list (may be empty or with existing maps)"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_map_basic(self, authenticated_client, test_map_data):
        """Test POST creates a new map with basic data"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps",
            json=test_map_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert 'id' in data
        assert data['name'] == test_map_data['name']
        assert data['width'] == test_map_data['width']
        assert data['height'] == test_map_data['height']
        assert data['campaign_id'] == TEST_CAMPAIGN_ID
        
        # Cleanup
        authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{data['id']}"
        )
    
    def test_create_map_with_terrain(self, authenticated_client):
        """Test creating map with terrain data"""
        map_data = {
            "name": f"TEST_Terrain_Map_{uuid.uuid4().hex[:8]}",
            "width": 10,
            "height": 10,
            "terrain": [
                ["grass", "grass", "grass", "water", "water", "water", "grass", "grass", "grass", "grass"],
                ["grass", "stone", "stone", "water", "water", "water", "stone", "stone", "grass", "grass"],
                ["grass", "stone", "stone", "stone", "stone", "stone", "stone", "stone", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"],
                ["grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"]
            ],
            "walls": [],
            "doors": [],
            "fog_of_war": [],
            "tokens": []
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps",
            json=map_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify terrain is saved
        assert len(data['terrain']) == 10
        assert len(data['terrain'][0]) == 10
        assert data['terrain'][0][3] == 'water'
        assert data['terrain'][1][1] == 'stone'
        
        # Cleanup
        authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{data['id']}"
        )
    
    def test_create_map_with_walls_and_doors(self, authenticated_client):
        """Test creating map with walls and doors"""
        map_data = {
            "name": f"TEST_Walls_Map_{uuid.uuid4().hex[:8]}",
            "width": 15,
            "height": 15,
            "terrain": [],
            "walls": [
                {"x1": 0, "y1": 5, "x2": 10, "y2": 5, "type": "stone"},
                {"x1": 10, "y1": 5, "x2": 10, "y2": 15, "type": "brick"}
            ],
            "doors": [
                {"x": 5, "y": 5, "orientation": "horizontal", "isOpen": False},
                {"x": 10, "y": 10, "orientation": "vertical", "isOpen": True}
            ],
            "fog_of_war": [],
            "tokens": []
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps",
            json=map_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify walls and doors
        assert len(data['walls']) == 2
        assert data['walls'][0]['type'] == 'stone'
        assert len(data['doors']) == 2
        assert data['doors'][0]['isOpen'] == False
        assert data['doors'][1]['isOpen'] == True
        
        # Cleanup
        authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{data['id']}"
        )
    
    def test_create_map_with_fog_of_war(self, authenticated_client):
        """Test creating map with fog of war data"""
        fog = [[True if (x + y) % 2 == 0 else False for x in range(10)] for y in range(10)]
        
        map_data = {
            "name": f"TEST_Fog_Map_{uuid.uuid4().hex[:8]}",
            "width": 10,
            "height": 10,
            "terrain": [],
            "walls": [],
            "doors": [],
            "fog_of_war": fog,
            "tokens": []
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps",
            json=map_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify fog of war pattern
        assert len(data['fog_of_war']) == 10
        assert data['fog_of_war'][0][0] == True
        assert data['fog_of_war'][0][1] == False
        
        # Cleanup
        authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{data['id']}"
        )
    
    def test_get_map_after_create(self, authenticated_client, created_map):
        """Test GET maps returns newly created map"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps"
        )
        assert response.status_code == 200
        maps = response.json()
        
        # Find our created map
        found = next((m for m in maps if m['id'] == created_map['id']), None)
        assert found is not None
        assert found['name'] == created_map['name']
    
    def test_update_map_name(self, authenticated_client, created_map):
        """Test PUT updates map name"""
        new_name = f"UPDATED_Map_{uuid.uuid4().hex[:8]}"
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{created_map['id']}",
            json={"name": new_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == new_name
        
        # Verify via GET
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps"
        )
        maps = get_response.json()
        found = next((m for m in maps if m['id'] == created_map['id']), None)
        assert found['name'] == new_name
    
    def test_update_map_dimensions(self, authenticated_client, created_map):
        """Test PUT updates map dimensions"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{created_map['id']}",
            json={"width": 50, "height": 40}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['width'] == 50
        assert data['height'] == 40
    
    def test_update_map_terrain(self, authenticated_client, created_map):
        """Test PUT updates map terrain"""
        new_terrain = [["lava"] * 25 for _ in range(20)]
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{created_map['id']}",
            json={"terrain": new_terrain}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['terrain'][0][0] == 'lava'
    
    def test_delete_map(self, authenticated_client, test_map_data):
        """Test DELETE removes map"""
        # Create a map to delete
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps",
            json=test_map_data
        )
        map_id = create_response.json()['id']
        
        # Delete the map
        delete_response = authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{map_id}"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()['message'] == 'Map deleted successfully'
        
        # Verify it's gone
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps"
        )
        maps = get_response.json()
        found = next((m for m in maps if m['id'] == map_id), None)
        assert found is None
    
    def test_delete_nonexistent_map(self, authenticated_client):
        """Test DELETE returns 404 for non-existent map"""
        fake_id = str(uuid.uuid4())
        response = authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps/{fake_id}"
        )
        assert response.status_code == 404
    
    def test_unauthorized_access(self, api_client):
        """Test API requires authentication"""
        response = api_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps"
        )
        # Should be 401 or 403
        assert response.status_code in [401, 403]
