"""
Tests for World Map and Local Map API endpoints
Tests CRUD operations for world maps, pins, paths, travel calculations, and local maps
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


class TestWorldMaps:
    """Test World Map CRUD and related operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test user, campaign for each test"""
        unique_id = f"TEST_worldmap_{uuid.uuid4().hex[:8]}"
        self.email = f"{unique_id}@test.com"
        self.username = unique_id
        self.password = "TestPass123!"
        
        # Try to register, if fails try login
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "username": self.username,
            "password": self.password
        })
        
        if register_response.status_code == 201:
            self.token = register_response.json()['token']
        else:
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.email,
                "password": self.password
            })
            if login_response.status_code != 200:
                pytest.skip("Could not authenticate for test")
            self.token = login_response.json()['token']
        
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Create test campaign
        campaign_response = requests.post(
            f"{BASE_URL}/api/campaigns",
            headers=self.headers,
            json={"name": f"TEST_Campaign_{unique_id}", "description": "Test campaign for world maps"}
        )
        assert campaign_response.status_code == 201, f"Campaign creation failed: {campaign_response.text}"
        self.campaign_id = campaign_response.json()['id']
        
        # Cleanup created resources after test
        def cleanup():
            # Delete campaign (which should cascade)
            requests.delete(f"{BASE_URL}/api/campaigns/{self.campaign_id}", headers=self.headers)
        
        request.addfinalizer(cleanup)
    
    # ==================== WORLD MAP CRUD TESTS ====================
    
    def test_create_world_map(self):
        """Test creating a world map"""
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        
        assert response.status_code == 200, f"Create world map failed: {response.text}"
        result = response.json()
        assert result['name'] == map_data['name']
        assert result['scale_value'] == map_data['scale_value']
        assert result['scale_unit'] == map_data['scale_unit']
        assert 'id' in result
        assert result['campaign_id'] == self.campaign_id
    
    def test_get_world_maps(self):
        """Test getting all world maps for a campaign"""
        # Create a world map first
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 100,
            "scale_unit": "km",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        
        # Get all world maps
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers
        )
        
        assert response.status_code == 200
        maps = response.json()
        assert isinstance(maps, list)
        assert len(maps) >= 1
        assert any(m['name'] == map_data['name'] for m in maps)
    
    def test_get_single_world_map(self):
        """Test getting a specific world map"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 75,
            "scale_unit": "leagues",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Get the specific world map
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['id'] == map_id
        assert result['name'] == map_data['name']
    
    def test_update_world_map(self):
        """Test updating a world map"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Update the world map
        update_data = {
            "name": f"UPDATED_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 100,
            "notes": "Updated notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['name'] == update_data['name']
        assert result['scale_value'] == update_data['scale_value']
        
        # Verify with GET
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 200
        assert verify_response.json()['name'] == update_data['name']
    
    def test_delete_world_map(self):
        """Test deleting a world map"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Delete the world map
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        
        # Verify deletion with GET - should return 404
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 404
    
    # ==================== PIN MANAGEMENT TESTS ====================
    
    def test_add_pin_to_world_map(self):
        """Test adding a pin to a world map"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Add a pin
        pin_data = {
            "name": "Test Capital City",
            "pin_type": "capital",
            "x": 25.5,
            "y": 45.3,
            "description": "The main capital city",
            "color": "#EAB308"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json=pin_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['name'] == pin_data['name']
        assert result['pin_type'] == pin_data['pin_type']
        assert 'id' in result
        
        # Verify pin is in map
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 200
        map_data = verify_response.json()
        assert len(map_data['pins']) == 1
        assert map_data['pins'][0]['name'] == pin_data['name']
    
    def test_update_pin_on_world_map(self):
        """Test updating a pin on a world map"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Add a pin
        pin_data = {
            "name": "Original City",
            "pin_type": "city",
            "x": 30.0,
            "y": 50.0,
            "description": "Original description"
        }
        
        pin_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json=pin_data
        )
        assert pin_response.status_code == 200
        pin_id = pin_response.json()['id']
        
        # Update the pin
        update_data = {
            "name": "Updated City Name",
            "description": "Updated description",
            "x": 35.0,
            "y": 55.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins/{pin_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['name'] == update_data['name']
    
    def test_delete_pin_from_world_map(self):
        """Test deleting a pin from a world map"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Add a pin
        pin_data = {
            "name": "Pin to Delete",
            "pin_type": "town",
            "x": 40.0,
            "y": 60.0
        }
        
        pin_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json=pin_data
        )
        assert pin_response.status_code == 200
        pin_id = pin_response.json()['id']
        
        # Delete the pin
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins/{pin_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        
        # Verify pin is removed
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 200
        assert len(verify_response.json()['pins']) == 0
    
    # ==================== TRAVEL PATH TESTS ====================
    
    def test_create_travel_path(self):
        """Test creating a travel path between pins"""
        # Create a world map
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        assert create_response.status_code == 200
        map_id = create_response.json()['id']
        
        # Add two pins
        pin1_data = {"name": "City A", "pin_type": "city", "x": 20.0, "y": 30.0}
        pin2_data = {"name": "City B", "pin_type": "city", "x": 60.0, "y": 70.0}
        
        pin1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json=pin1_data
        )
        assert pin1_response.status_code == 200
        pin1_id = pin1_response.json()['id']
        
        pin2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json=pin2_data
        )
        assert pin2_response.status_code == 200
        pin2_id = pin2_response.json()['id']
        
        # Create path between pins
        path_data = {
            "from_pin_id": pin1_id,
            "to_pin_id": pin2_id,
            "distance_value": 100,
            "distance_unit": "miles",
            "terrain_type": "road",
            "terrain_modifier": 1.0,
            "notes": "Main trade route"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json=path_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['from_pin_id'] == pin1_id
        assert result['to_pin_id'] == pin2_id
        assert result['distance_value'] == 100
        assert 'id' in result
    
    def test_update_travel_path(self):
        """Test updating a travel path"""
        # Create a world map with pins and path
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add pins
        pin1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "City A", "pin_type": "city", "x": 20.0, "y": 30.0}
        )
        pin1_id = pin1_response.json()['id']
        
        pin2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "City B", "pin_type": "city", "x": 60.0, "y": 70.0}
        )
        pin2_id = pin2_response.json()['id']
        
        # Create path
        path_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json={
                "from_pin_id": pin1_id,
                "to_pin_id": pin2_id,
                "distance_value": 100,
                "terrain_type": "road"
            }
        )
        path_id = path_response.json()['id']
        
        # Update path
        update_data = {
            "distance_value": 150,
            "terrain_type": "mountain",
            "terrain_modifier": 2.5,
            "notes": "Mountain pass - difficult terrain"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths/{path_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['distance_value'] == 150
        assert result['terrain_type'] == "mountain"
    
    def test_delete_travel_path(self):
        """Test deleting a travel path"""
        # Create a world map with pins and path
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add pins
        pin1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "City A", "pin_type": "city", "x": 20.0, "y": 30.0}
        )
        pin1_id = pin1_response.json()['id']
        
        pin2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "City B", "pin_type": "city", "x": 60.0, "y": 70.0}
        )
        pin2_id = pin2_response.json()['id']
        
        # Create path
        path_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json={"from_pin_id": pin1_id, "to_pin_id": pin2_id, "distance_value": 100}
        )
        path_id = path_response.json()['id']
        
        # Delete path
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths/{path_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        
        # Verify path is removed
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}",
            headers=self.headers
        )
        assert len(verify_response.json()['paths']) == 0
    
    # ==================== TRAVEL CALCULATOR TESTS ====================
    
    def test_calculate_travel_time_walking(self):
        """Test travel time calculation for walking"""
        # Create a world map with connected pins
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add pins
        pin1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Start Town", "pin_type": "town", "x": 10.0, "y": 10.0}
        )
        pin1_id = pin1_response.json()['id']
        
        pin2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "End Town", "pin_type": "town", "x": 90.0, "y": 90.0}
        )
        pin2_id = pin2_response.json()['id']
        
        # Create path with 48 miles distance (2 days walking at 24 miles/day)
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json={
                "from_pin_id": pin1_id,
                "to_pin_id": pin2_id,
                "distance_value": 48,
                "distance_unit": "miles",
                "terrain_type": "road",
                "terrain_modifier": 1.0
            }
        )
        
        # Calculate travel time
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/calculate-travel",
            headers=self.headers,
            json={
                "from_pin_id": pin1_id,
                "to_pin_id": pin2_id,
                "travel_mode": "walking"
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert 'from_location' in result
        assert 'to_location' in result
        assert 'distance' in result
        assert 'formatted_time' in result
        assert 'travel_mode' in result
        assert result['travel_mode'] == 'walking'
    
    def test_calculate_travel_time_horseback(self):
        """Test travel time calculation for horseback"""
        # Create a world map with connected pins
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add pins
        pin1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Capital", "pin_type": "capital", "x": 50.0, "y": 50.0}
        )
        pin1_id = pin1_response.json()['id']
        
        pin2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Border Town", "pin_type": "town", "x": 80.0, "y": 80.0}
        )
        pin2_id = pin2_response.json()['id']
        
        # Create path with 96 miles distance (2 days horseback at 48 miles/day)
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json={
                "from_pin_id": pin1_id,
                "to_pin_id": pin2_id,
                "distance_value": 96,
                "distance_unit": "miles",
                "terrain_type": "road"
            }
        )
        
        # Calculate travel time for horseback
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/calculate-travel",
            headers=self.headers,
            json={
                "from_pin_id": pin1_id,
                "to_pin_id": pin2_id,
                "travel_mode": "horseback"
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['travel_mode'] == 'horseback'
    
    def test_calculate_travel_no_path(self):
        """Test travel calculation when no path exists"""
        # Create a world map with pins but no path
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add pins without creating a path
        pin1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Isolated City", "pin_type": "city", "x": 10.0, "y": 10.0}
        )
        pin1_id = pin1_response.json()['id']
        
        pin2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Remote Village", "pin_type": "village", "x": 90.0, "y": 90.0}
        )
        pin2_id = pin2_response.json()['id']
        
        # Try to calculate travel time - should fail or return error
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/calculate-travel",
            headers=self.headers,
            json={
                "from_pin_id": pin1_id,
                "to_pin_id": pin2_id,
                "travel_mode": "walking"
            }
        )
        
        # Should return 404 or indicate no path exists
        assert response.status_code in [404, 400], f"Expected 404/400 for no path, got {response.status_code}"
    
    # ==================== NEARBY LOCATIONS TESTS ====================
    
    def test_get_nearby_locations(self):
        """Test getting nearby locations from a pin"""
        # Create a world map with connected pins
        map_data = {
            "name": f"TEST_WorldMap_{uuid.uuid4().hex[:6]}",
            "scale_value": 50,
            "scale_unit": "miles",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add central hub and connected locations
        hub_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Central Hub", "pin_type": "capital", "x": 50.0, "y": 50.0}
        )
        hub_id = hub_response.json()['id']
        
        nearby1_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Nearby Town 1", "pin_type": "town", "x": 30.0, "y": 30.0}
        )
        nearby1_id = nearby1_response.json()['id']
        
        nearby2_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Nearby Town 2", "pin_type": "town", "x": 70.0, "y": 70.0}
        )
        nearby2_id = nearby2_response.json()['id']
        
        # Create paths from hub to nearby locations
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json={"from_pin_id": hub_id, "to_pin_id": nearby1_id, "distance_value": 20}
        )
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/paths",
            headers=self.headers,
            json={"from_pin_id": hub_id, "to_pin_id": nearby2_id, "distance_value": 30}
        )
        
        # Get nearby locations from hub
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/world-maps/{map_id}/nearby?pin_id={hub_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert 'nearby_locations' in result
        assert len(result['nearby_locations']) >= 2


class TestLocalMaps:
    """Test Local Map CRUD and pin operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test user, campaign and location for each test"""
        unique_id = f"TEST_localmap_{uuid.uuid4().hex[:8]}"
        self.email = f"{unique_id}@test.com"
        self.username = unique_id
        self.password = "TestPass123!"
        
        # Try to register, if fails try login
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "username": self.username,
            "password": self.password
        })
        
        if register_response.status_code == 201:
            self.token = register_response.json()['token']
        else:
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.email,
                "password": self.password
            })
            if login_response.status_code != 200:
                pytest.skip("Could not authenticate for test")
            self.token = login_response.json()['token']
        
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Create test campaign
        campaign_response = requests.post(
            f"{BASE_URL}/api/campaigns",
            headers=self.headers,
            json={"name": f"TEST_Campaign_{unique_id}", "description": "Test campaign for local maps"}
        )
        assert campaign_response.status_code == 201
        self.campaign_id = campaign_response.json()['id']
        
        # Create a test location (city) for local maps
        location_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations",
            headers=self.headers,
            json={
                "name": f"TEST_City_{unique_id}",
                "location_type": "city",
                "description": "A test city for local map testing"
            }
        )
        assert location_response.status_code in [200, 201], f"Location creation failed: {location_response.text}"
        self.location_id = location_response.json()['id']
        
        # Cleanup
        def cleanup():
            requests.delete(f"{BASE_URL}/api/campaigns/{self.campaign_id}", headers=self.headers)
        
        request.addfinalizer(cleanup)
    
    def test_create_local_map(self):
        """Test creating a local map"""
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        
        assert response.status_code == 200, f"Create local map failed: {response.text}"
        result = response.json()
        assert result['name'] == map_data['name']
        assert result['location_id'] == self.location_id
        assert result['map_type'] == 'city'
        assert 'id' in result
    
    def test_get_local_maps(self):
        """Test getting all local maps for a campaign"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        
        # Get all local maps
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers
        )
        
        assert response.status_code == 200
        maps = response.json()
        assert isinstance(maps, list)
        assert len(maps) >= 1
    
    def test_get_local_maps_by_location(self):
        """Test filtering local maps by location ID"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        
        # Get local maps filtered by location
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps?location_id={self.location_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        maps = response.json()
        assert all(m['location_id'] == self.location_id for m in maps)
    
    def test_get_single_local_map(self):
        """Test getting a specific local map"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "town",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Get specific local map
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['id'] == map_id
        assert result['name'] == map_data['name']
    
    def test_update_local_map(self):
        """Test updating a local map"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Update the local map
        update_data = {
            "name": f"UPDATED_CityMap_{uuid.uuid4().hex[:6]}",
            "notes": "Updated with new notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['name'] == update_data['name']
        
        # Verify with GET
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}",
            headers=self.headers
        )
        assert verify_response.json()['name'] == update_data['name']
    
    def test_delete_local_map(self):
        """Test deleting a local map"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Delete the local map
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 404
    
    # ==================== LOCAL MAP PIN TESTS ====================
    
    def test_add_pin_to_local_map(self):
        """Test adding a place of interest pin to a local map"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add a pin (place of interest)
        pin_data = {
            "name": "The Golden Dragon Inn",
            "pin_type": "tavern",
            "x": 45.0,
            "y": 55.0,
            "description": "A popular inn known for its dragon-themed decor",
            "color": "#F97316"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}/pins",
            headers=self.headers,
            json=pin_data
        )
        
        assert response.status_code == 200, f"Add pin failed: {response.text}"
        result = response.json()
        assert result['name'] == pin_data['name']
        assert result['pin_type'] == pin_data['pin_type']
        assert 'id' in result
    
    def test_update_pin_on_local_map(self):
        """Test updating a pin on a local map"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add a pin
        pin_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Original Shop", "pin_type": "shop", "x": 30.0, "y": 40.0}
        )
        pin_id = pin_response.json()['id']
        
        # Update pin
        update_data = {
            "name": "Ye Olde Magic Shoppe",
            "description": "Sells magical items and components",
            "x": 35.0,
            "y": 45.0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}/pins/{pin_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result['name'] == update_data['name']
    
    def test_delete_pin_from_local_map(self):
        """Test deleting a pin from a local map"""
        # Create a local map
        map_data = {
            "name": f"TEST_CityMap_{uuid.uuid4().hex[:6]}",
            "location_id": self.location_id,
            "map_type": "city",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps",
            headers=self.headers,
            json=map_data
        )
        map_id = create_response.json()['id']
        
        # Add a pin
        pin_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}/pins",
            headers=self.headers,
            json={"name": "Pin to Delete", "pin_type": "temple", "x": 50.0, "y": 50.0}
        )
        pin_id = pin_response.json()['id']
        
        # Delete pin
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}/pins/{pin_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        
        # Verify pin is removed
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/local-maps/{map_id}",
            headers=self.headers
        )
        assert len(verify_response.json()['pins']) == 0


class TestWorldMapAuthentication:
    """Test authentication requirements for world map endpoints"""
    
    def test_world_maps_require_auth(self):
        """Test that world map endpoints require authentication"""
        # Try to access without auth
        response = requests.get(f"{BASE_URL}/api/campaigns/some-id/world-maps")
        assert response.status_code == 401 or response.status_code == 403
    
    def test_local_maps_require_auth(self):
        """Test that local map endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/campaigns/some-id/local-maps")
        assert response.status_code == 401 or response.status_code == 403
