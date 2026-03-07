"""
Party Location Tracker Backend API Tests
Tests the world-map endpoints used by PartyLocationTracker:
- World maps list
- Nearby locations 
- Travel calculation
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - use existing test user
TEST_EMAIL = "stress_test_1772651200@test.com"
TEST_PASSWORD = "TestPass123!"

# Will be set during test
TEST_CAMPAIGN_ID = None
TEST_WORLD_MAP_ID = None
TEST_PIN_1_ID = None
TEST_PIN_2_ID = None
TEST_PATH_ID = None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token") or response.json().get("token")
    
    # Try to register if login fails
    reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "username": f"TestUser_{uuid.uuid4().hex[:6]}",
        "password": TEST_PASSWORD
    })
    if reg_response.status_code in [200, 201]:
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            return login_response.json().get("access_token") or login_response.json().get("token")
    
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_campaign(authenticated_client):
    """Create a test campaign for party location tests"""
    global TEST_CAMPAIGN_ID
    
    unique_id = uuid.uuid4().hex[:6]
    campaign_data = {
        "name": f"TEST_PartyLocation_{unique_id}",
        "description": "Test campaign for party location tracker"
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
    assert response.status_code in [200, 201], f"Failed to create campaign: {response.text}"
    
    campaign = response.json()
    TEST_CAMPAIGN_ID = campaign['id']
    
    yield campaign
    
    # Cleanup - delete campaign
    authenticated_client.delete(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}")


@pytest.fixture(scope="module")
def test_world_map(authenticated_client, test_campaign):
    """Create a test world map with pins and paths"""
    global TEST_WORLD_MAP_ID, TEST_PIN_1_ID, TEST_PIN_2_ID, TEST_PATH_ID
    
    unique_id = uuid.uuid4().hex[:6]
    map_data = {
        "name": f"TEST_WorldMap_{unique_id}",
        "map_type": "world",
        "scale_value": 100,
        "scale_unit": "miles",
        "notes": "Test world map for party location tracker"
    }
    
    response = authenticated_client.post(
        f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
        json=map_data
    )
    assert response.status_code in [200, 201], f"Failed to create world map: {response.text}"
    
    world_map = response.json()
    TEST_WORLD_MAP_ID = world_map['id']
    
    # Create two pins (locations)
    pin1_data = {
        "name": "Capital City",
        "pin_type": "capital",
        "x": 100,
        "y": 100,
        "description": "The great capital"
    }
    pin1_response = authenticated_client.post(
        f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/pins",
        json=pin1_data
    )
    assert pin1_response.status_code in [200, 201], f"Failed to create pin 1: {pin1_response.text}"
    TEST_PIN_1_ID = pin1_response.json()['id']
    
    pin2_data = {
        "name": "Port Town",
        "pin_type": "port",
        "x": 300,
        "y": 200,
        "description": "A busy port"
    }
    pin2_response = authenticated_client.post(
        f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/pins",
        json=pin2_data
    )
    assert pin2_response.status_code in [200, 201], f"Failed to create pin 2: {pin2_response.text}"
    TEST_PIN_2_ID = pin2_response.json()['id']
    
    # Create a path between the pins
    path_data = {
        "from_pin_id": TEST_PIN_1_ID,
        "to_pin_id": TEST_PIN_2_ID,
        "distance_value": 120,
        "distance_unit": "miles",
        "terrain_type": "road",
        "terrain_modifier": 1.0,
        "is_bidirectional": True
    }
    path_response = authenticated_client.post(
        f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/paths",
        json=path_data
    )
    assert path_response.status_code in [200, 201], f"Failed to create path: {path_response.text}"
    TEST_PATH_ID = path_response.json()['id']
    
    yield world_map
    
    # Cleanup handled by campaign deletion


# ==================== WORLD MAP LIST TESTS ====================

class TestWorldMapsList:
    """Test world maps list endpoint used by PartyLocationTracker"""
    
    def test_get_world_maps_returns_list(self, authenticated_client, test_world_map):
        """World maps endpoint returns a list"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_world_map_has_required_fields(self, authenticated_client, test_world_map):
        """World map has fields needed by PartyLocationTracker"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for PartyLocationTracker
        assert 'id' in data
        assert 'name' in data
        assert 'pins' in data
        assert isinstance(data['pins'], list)
    
    def test_world_map_pins_have_required_fields(self, authenticated_client, test_world_map):
        """World map pins have fields needed by PartyLocationTracker"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        
        pins = data.get('pins', [])
        assert len(pins) >= 2, "Should have at least 2 pins"
        
        for pin in pins:
            assert 'id' in pin
            assert 'name' in pin
            assert 'pin_type' in pin


# ==================== NEARBY LOCATIONS TESTS ====================

class TestNearbyLocations:
    """Test nearby locations endpoint used for travel distances"""
    
    def test_get_nearby_locations(self, authenticated_client, test_world_map):
        """Nearby locations endpoint returns reachable locations"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/nearby",
            params={"pin_id": TEST_PIN_1_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'nearby_locations' in data
        nearby = data['nearby_locations']
        assert isinstance(nearby, list)
    
    def test_nearby_includes_connected_location(self, authenticated_client, test_world_map):
        """Nearby includes locations connected by paths"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/nearby",
            params={"pin_id": TEST_PIN_1_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        nearby = data['nearby_locations']
        # Should include Port Town connected via path
        pin_ids = [loc.get('pin_id') for loc in nearby]
        assert TEST_PIN_2_ID in pin_ids, "Should include connected location"
    
    def test_nearby_location_has_travel_info(self, authenticated_client, test_world_map):
        """Nearby locations include distance and terrain info"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/nearby",
            params={"pin_id": TEST_PIN_1_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        nearby = data['nearby_locations']
        assert len(nearby) > 0, "Should have at least one nearby location"
        
        location = nearby[0]
        assert 'name' in location
        assert 'distance' in location
        assert 'terrain_type' in location
    
    def test_bidirectional_path_works_both_ways(self, authenticated_client, test_world_map):
        """Bidirectional paths show from both pins"""
        # Check from pin 1
        response1 = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/nearby",
            params={"pin_id": TEST_PIN_1_ID}
        )
        assert response1.status_code == 200
        nearby1 = response1.json()['nearby_locations']
        pin_ids_1 = [loc.get('pin_id') for loc in nearby1]
        
        # Check from pin 2
        response2 = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/nearby",
            params={"pin_id": TEST_PIN_2_ID}
        )
        assert response2.status_code == 200
        nearby2 = response2.json()['nearby_locations']
        pin_ids_2 = [loc.get('pin_id') for loc in nearby2]
        
        # Both should show the other as nearby
        assert TEST_PIN_2_ID in pin_ids_1, "Pin 2 should be nearby from Pin 1"
        assert TEST_PIN_1_ID in pin_ids_2, "Pin 1 should be nearby from Pin 2"


# ==================== TRAVEL CALCULATION TESTS ====================

class TestTravelCalculation:
    """Test travel time calculation endpoint"""
    
    def test_calculate_travel_walking(self, authenticated_client, test_world_map):
        """Calculate travel time on foot"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/calculate-travel",
            json={
                "from_pin_id": TEST_PIN_1_ID,
                "to_pin_id": TEST_PIN_2_ID,
                "travel_mode": "walking"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'distance' in data
        assert 'travel_mode' in data
        assert data['travel_mode'] == 'walking'
        assert 'travel_days' in data
        assert 'formatted_time' in data
    
    def test_calculate_travel_horseback(self, authenticated_client, test_world_map):
        """Calculate travel time on horseback (should be faster)"""
        # Walking
        walk_response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/calculate-travel",
            json={
                "from_pin_id": TEST_PIN_1_ID,
                "to_pin_id": TEST_PIN_2_ID,
                "travel_mode": "walking"
            }
        )
        walk_data = walk_response.json()
        
        # Horseback
        horse_response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/calculate-travel",
            json={
                "from_pin_id": TEST_PIN_1_ID,
                "to_pin_id": TEST_PIN_2_ID,
                "travel_mode": "horseback"
            }
        )
        horse_data = horse_response.json()
        
        # Horseback should be faster (less travel days)
        assert horse_data['travel_days'] < walk_data['travel_days'], "Horseback should be faster than walking"
    
    def test_calculate_travel_returns_location_names(self, authenticated_client, test_world_map):
        """Travel calculation returns human-readable location names"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/calculate-travel",
            json={
                "from_pin_id": TEST_PIN_1_ID,
                "to_pin_id": TEST_PIN_2_ID,
                "travel_mode": "walking"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'from_location' in data
        assert 'to_location' in data
        assert data['from_location'] == 'Capital City'
        assert data['to_location'] == 'Port Town'
    
    def test_calculate_travel_no_path_returns_404(self, authenticated_client, test_world_map):
        """Travel calculation fails when no path exists"""
        # Create a third pin with no path
        pin3_data = {
            "name": "Isolated Village",
            "pin_type": "village",
            "x": 500,
            "y": 500
        }
        pin3_response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/pins",
            json=pin3_data
        )
        pin3_id = pin3_response.json()['id']
        
        # Try to calculate travel to isolated pin
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{TEST_WORLD_MAP_ID}/calculate-travel",
            json={
                "from_pin_id": TEST_PIN_1_ID,
                "to_pin_id": pin3_id,
                "travel_mode": "walking"
            }
        )
        assert response.status_code == 404, "Should return 404 when no path exists"


# ==================== LOCAL MAPS / PLACES OF INTEREST TESTS ====================

class TestLocalMapsIntegration:
    """Test local maps endpoint used for places of interest"""
    
    def test_get_local_maps(self, authenticated_client, test_campaign):
        """Local maps endpoint returns list"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/local-maps"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_local_map_with_pins(self, authenticated_client, test_campaign):
        """Create local map with places of interest"""
        unique_id = uuid.uuid4().hex[:6]
        
        # First create a location to link the local map to
        location_data = {
            "name": f"TEST_Location_{unique_id}",
            "type": "city"
        }
        loc_response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/locations",
            json=location_data
        )
        assert loc_response.status_code in [200, 201], f"Failed to create location: {loc_response.text}"
        location_id = loc_response.json()['id']
        
        local_map_data = {
            "name": f"TEST_LocalMap_{unique_id}",
            "map_type": "city",
            "location_id": location_id
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/local-maps",
            json=local_map_data
        )
        assert response.status_code in [200, 201], f"Failed to create local map: {response.text}"
        
        local_map = response.json()
        local_map_id = local_map['id']
        
        # Add a place of interest pin
        poi_data = {
            "name": "The Rusty Tankard",
            "pin_type": "tavern",
            "x": 150,
            "y": 150,
            "description": "A popular tavern"
        }
        poi_response = authenticated_client.post(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/local-maps/{local_map_id}/pins",
            json=poi_data
        )
        assert poi_response.status_code in [200, 201], f"Failed to create POI: {poi_response.text}"
        
        # Verify local map has pins
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/local-maps/{local_map_id}"
        )
        assert get_response.status_code == 200
        local_map_data = get_response.json()
        
        assert 'pins' in local_map_data
        assert len(local_map_data['pins']) >= 1
        
        # Cleanup
        authenticated_client.delete(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/local-maps/{local_map_id}"
        )


# ==================== LOCATIONS ENDPOINT TEST ====================

class TestLocationsEndpoint:
    """Test locations endpoint used by PartyLocationTracker"""
    
    def test_get_locations(self, authenticated_client, test_campaign):
        """Locations endpoint returns list"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/locations"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
