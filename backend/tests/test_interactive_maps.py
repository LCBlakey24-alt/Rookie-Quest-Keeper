"""
Backend API tests for Interactive Maps (World Maps and Local Maps)
Tests world map CRUD, pins, paths, and travel calculator
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = 'stress_test_1772651200@test.com'
TEST_PASSWORD = 'TestPass123!'
TEST_CAMPAIGN_ID = '1e6a6d0d-ad88-4b8a-9cc5-a1672119343c'


@pytest.fixture(scope='module')
def auth_token():
    """Get auth token for test user"""
    response = requests.post(f"{API}/auth/login", json={
        'email': TEST_EMAIL,
        'password': TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get('token')
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope='module')
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }


class TestWorldMapsAPI:
    """Test World Map API endpoints"""
    
    def test_get_world_maps(self, auth_headers):
        """Should retrieve world maps for a campaign"""
        response = requests.get(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_world_map(self, auth_headers):
        """Should create a new world map"""
        unique_id = str(uuid.uuid4())[:8]
        map_data = {
            'name': f'TEST_WorldMap_{unique_id}',
            'scale_value': 50,
            'scale_unit': 'miles',
            'image_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
            headers=auth_headers,
            json=map_data
        )
        
        assert response.status_code == 200
        created = response.json()
        assert created['name'] == map_data['name']
        assert created['scale_value'] == map_data['scale_value']
        assert 'id' in created
        
        # Cleanup
        requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{created['id']}",
            headers=auth_headers
        )
    
    def test_get_single_world_map(self, auth_headers):
        """Should retrieve a specific world map"""
        # First get all maps to find one
        response = requests.get(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
            headers=auth_headers
        )
        maps = response.json()
        
        if len(maps) == 0:
            pytest.skip("No world maps exist to test")
        
        map_id = maps[0]['id']
        
        response = requests.get(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{map_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == map_id
    
    def test_update_world_map(self, auth_headers):
        """Should update a world map"""
        # Create a test map first
        unique_id = str(uuid.uuid4())[:8]
        map_data = {
            'name': f'TEST_UpdateMap_{unique_id}',
            'scale_value': 50,
            'scale_unit': 'miles',
            'image_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
        
        create_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
            headers=auth_headers,
            json=map_data
        )
        created = create_response.json()
        map_id = created['id']
        
        # Update the map
        update_data = {'name': f'TEST_UpdatedMap_{unique_id}'}
        response = requests.put(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{map_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated['name'] == update_data['name']
        
        # Cleanup
        requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{map_id}",
            headers=auth_headers
        )


class TestWorldMapPinsAPI:
    """Test World Map Pins API endpoints"""
    
    @pytest.fixture(scope='class')
    def test_map(self, auth_headers):
        """Create a test map for pin tests"""
        unique_id = str(uuid.uuid4())[:8]
        map_data = {
            'name': f'TEST_PinTestMap_{unique_id}',
            'scale_value': 50,
            'scale_unit': 'miles',
            'image_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
            headers=auth_headers,
            json=map_data
        )
        created = response.json()
        yield created
        
        # Cleanup
        requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{created['id']}",
            headers=auth_headers
        )
    
    def test_add_pin_to_world_map(self, auth_headers, test_map):
        """Should add a location pin to world map"""
        pin_data = {
            'name': 'TEST_City_Bouldering',
            'pin_type': 'city',
            'description': 'A test city',
            'x': 50.5,
            'y': 30.2
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map['id']}/pins",
            headers=auth_headers,
            json=pin_data
        )
        
        assert response.status_code == 200
        created = response.json()
        assert created['name'] == pin_data['name']
        assert created['pin_type'] == pin_data['pin_type']
        assert 'id' in created
    
    def test_update_pin(self, auth_headers, test_map):
        """Should update a pin"""
        # First add a pin
        pin_data = {
            'name': 'TEST_UpdatePin',
            'pin_type': 'town',
            'x': 25.0,
            'y': 25.0
        }
        
        create_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map['id']}/pins",
            headers=auth_headers,
            json=pin_data
        )
        created = create_response.json()
        pin_id = created['id']
        
        # Update the pin
        update_data = {
            'name': 'TEST_UpdatedPin',
            'description': 'Updated description'
        }
        
        response = requests.put(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map['id']}/pins/{pin_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated['name'] == update_data['name']
        assert updated['description'] == update_data['description']
    
    def test_delete_pin(self, auth_headers, test_map):
        """Should delete a pin"""
        # First add a pin
        pin_data = {
            'name': 'TEST_DeletePin',
            'pin_type': 'village',
            'x': 75.0,
            'y': 75.0
        }
        
        create_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map['id']}/pins",
            headers=auth_headers,
            json=pin_data
        )
        created = create_response.json()
        pin_id = created['id']
        
        # Delete the pin
        response = requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map['id']}/pins/{pin_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestWorldMapPathsAPI:
    """Test World Map Paths and Travel Calculator API"""
    
    @pytest.fixture(scope='class')
    def test_map_with_pins(self, auth_headers):
        """Create a test map with pins for path tests"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create map
        map_data = {
            'name': f'TEST_PathTestMap_{unique_id}',
            'scale_value': 50,
            'scale_unit': 'miles',
            'image_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
        
        map_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps",
            headers=auth_headers,
            json=map_data
        )
        created_map = map_response.json()
        map_id = created_map['id']
        
        # Add two pins
        pin1_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{map_id}/pins",
            headers=auth_headers,
            json={'name': 'City_A', 'pin_type': 'city', 'x': 20, 'y': 30}
        )
        pin1 = pin1_response.json()
        
        pin2_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{map_id}/pins",
            headers=auth_headers,
            json={'name': 'City_B', 'pin_type': 'city', 'x': 80, 'y': 70}
        )
        pin2 = pin2_response.json()
        
        yield {
            'map': created_map,
            'map_id': map_id,
            'pin1_id': pin1['id'],
            'pin2_id': pin2['id']
        }
        
        # Cleanup
        requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{map_id}",
            headers=auth_headers
        )
    
    def test_create_path_between_pins(self, auth_headers, test_map_with_pins):
        """Should create a travel path between two pins"""
        path_data = {
            'from_pin_id': test_map_with_pins['pin1_id'],
            'to_pin_id': test_map_with_pins['pin2_id'],
            'distance_value': 100,
            'distance_unit': 'miles',
            'terrain_type': 'road',
            'terrain_modifier': 1.0,
            'notes': 'Main road'
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map_with_pins['map_id']}/paths",
            headers=auth_headers,
            json=path_data
        )
        
        assert response.status_code == 200
        created = response.json()
        assert created['distance_value'] == path_data['distance_value']
        assert created['terrain_type'] == path_data['terrain_type']
        assert 'id' in created
    
    def test_calculate_travel_time(self, auth_headers, test_map_with_pins):
        """Should calculate travel time between two pins with existing path"""
        # First create a path
        path_data = {
            'from_pin_id': test_map_with_pins['pin1_id'],
            'to_pin_id': test_map_with_pins['pin2_id'],
            'distance_value': 48,
            'distance_unit': 'miles',
            'terrain_type': 'road',
            'terrain_modifier': 1.0
        }
        
        requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map_with_pins['map_id']}/paths",
            headers=auth_headers,
            json=path_data
        )
        
        # Calculate travel time
        travel_data = {
            'from_pin_id': test_map_with_pins['pin1_id'],
            'to_pin_id': test_map_with_pins['pin2_id'],
            'travel_mode': 'walking'
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/world-maps/{test_map_with_pins['map_id']}/calculate-travel",
            headers=auth_headers,
            json=travel_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert 'formatted_time' in result
        assert 'distance' in result
        assert 'travel_mode' in result


class TestLocalMapsAPI:
    """Test Local Map API endpoints"""
    
    @pytest.fixture(scope='class')
    def test_location(self, auth_headers):
        """Get or create a test location for local maps"""
        # Get existing locations
        response = requests.get(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/locations",
            headers=auth_headers
        )
        locations = response.json()
        
        if len(locations) > 0:
            return locations[0]
        
        # Create a new location if none exist
        unique_id = str(uuid.uuid4())[:8]
        loc_data = {
            'name': f'TEST_Location_{unique_id}',
            'location_type': 'city',
            'description': 'Test city for local maps'
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/locations",
            headers=auth_headers,
            json=loc_data
        )
        return response.json()
    
    def test_get_local_maps(self, auth_headers):
        """Should retrieve local maps for a campaign"""
        response = requests.get(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/local-maps",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_local_map(self, auth_headers, test_location):
        """Should create a new local map"""
        unique_id = str(uuid.uuid4())[:8]
        map_data = {
            'name': f'TEST_LocalMap_{unique_id}',
            'location_id': test_location['id'],
            'map_type': 'city',
            'image_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/local-maps",
            headers=auth_headers,
            json=map_data
        )
        
        assert response.status_code == 200
        created = response.json()
        assert created['name'] == map_data['name']
        assert created['location_id'] == test_location['id']
        assert 'id' in created
        
        # Cleanup
        requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/local-maps/{created['id']}",
            headers=auth_headers
        )
    
    def test_add_pin_to_local_map(self, auth_headers, test_location):
        """Should add a POI pin to local map"""
        # Create a test local map
        unique_id = str(uuid.uuid4())[:8]
        map_data = {
            'name': f'TEST_POIMap_{unique_id}',
            'location_id': test_location['id'],
            'map_type': 'city',
            'image_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
        
        map_response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/local-maps",
            headers=auth_headers,
            json=map_data
        )
        created_map = map_response.json()
        
        # Add a pin
        pin_data = {
            'name': 'The Golden Dragon Inn',
            'pin_type': 'tavern',
            'description': 'A cozy tavern',
            'x': 45.5,
            'y': 55.2
        }
        
        response = requests.post(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/local-maps/{created_map['id']}/pins",
            headers=auth_headers,
            json=pin_data
        )
        
        assert response.status_code == 200
        created = response.json()
        assert created['name'] == pin_data['name']
        assert created['pin_type'] == pin_data['pin_type']
        
        # Cleanup
        requests.delete(
            f"{API}/campaigns/{TEST_CAMPAIGN_ID}/local-maps/{created_map['id']}",
            headers=auth_headers
        )


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
