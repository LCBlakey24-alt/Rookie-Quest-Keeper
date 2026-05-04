"""
Tests for Places of Interest API endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

class TestPlacesOfInterest:
    """Test CRUD operations for Places of Interest within Locations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test user, campaign, and location for each test"""
        # Register or login test user
        unique_id = f"TEST_places_{uuid.uuid4().hex[:8]}"
        self.username = f"{unique_id}"
        self.password = "testpass123"
        
        # Try to register, if fails try login
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": self.username,
            "password": self.password
        })
        
        if register_response.status_code == 201:
            self.token = register_response.json()['token']
        else:
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": self.username,
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
            json={"name": f"TEST_Campaign_{unique_id}", "description": "Test campaign for places"}
        )
        assert campaign_response.status_code == 201
        self.campaign_id = campaign_response.json()['id']
        
        # Create test location
        location_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations",
            headers=self.headers,
            json={
                "name": f"TEST_Location_{unique_id}",
                "location_type": "City",
                "description": "A test city"
            }
        )
        assert location_response.status_code == 201
        self.location_id = location_response.json()['id']
        
        # Track created place IDs for cleanup
        self.created_place_ids = []
        
        yield
        
        # Cleanup: delete campaign (which deletes locations and places)
        requests.delete(f"{BASE_URL}/api/campaigns/{self.campaign_id}", headers=self.headers)
    
    def test_add_place_of_interest(self):
        """Test adding a place of interest to a location"""
        place_data = {
            "name": "TEST_The Golden Goblet",
            "place_type": "tavern",
            "description": "A lively tavern known for its exotic drinks",
            "owner": "Greta the Half-Orc",
            "services": "Ale, Wine, Rooms, Hot meals",
            "notes": "Secret entrance to underground"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers,
            json=place_data
        )
        
        assert response.status_code == 200
        place = response.json()
        
        assert place['name'] == place_data['name']
        assert place['place_type'] == place_data['place_type']
        assert place['description'] == place_data['description']
        assert place['owner'] == place_data['owner']
        assert place['services'] == place_data['services']
        assert place['notes'] == place_data['notes']
        assert 'id' in place
        
        self.created_place_ids.append(place['id'])
    
    def test_get_places_of_interest(self):
        """Test getting all places of interest for a location"""
        # First add a place
        place_data = {
            "name": "TEST_Mystic Temple",
            "place_type": "temple",
            "description": "An ancient temple",
            "owner": "High Priestess Luna"
        }
        
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers,
            json=place_data
        )
        
        # Now get all places
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers
        )
        
        assert response.status_code == 200
        places = response.json()
        assert isinstance(places, list)
        assert len(places) >= 1
        
        # Verify the place we created is in the list
        place_names = [p['name'] for p in places]
        assert "TEST_Mystic Temple" in place_names
    
    def test_update_place_of_interest(self):
        """Test updating a place of interest"""
        # Create a place first
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers,
            json={
                "name": "TEST_Old Shop",
                "place_type": "shop",
                "description": "Original description"
            }
        )
        assert create_response.status_code == 200
        place_id = create_response.json()['id']
        
        # Update the place
        update_data = {
            "name": "TEST_New Shop Name",
            "description": "Updated description",
            "owner": "New Owner"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places/{place_id}",
            headers=self.headers,
            json=update_data
        )
        
        assert update_response.status_code == 200
        updated_place = update_response.json()
        
        assert updated_place['name'] == "TEST_New Shop Name"
        assert updated_place['description'] == "Updated description"
        assert updated_place['owner'] == "New Owner"
        # place_type should remain unchanged
        assert updated_place['place_type'] == "shop"
    
    def test_delete_place_of_interest(self):
        """Test deleting a place of interest"""
        # Create a place first
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers,
            json={"name": "TEST_To Be Deleted", "place_type": "guild"}
        )
        assert create_response.status_code == 200
        place_id = create_response.json()['id']
        
        # Delete the place
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places/{place_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        assert delete_response.json()['message'] == "Place deleted successfully"
        
        # Verify place is deleted by checking the list
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers
        )
        places = get_response.json()
        place_ids = [p['id'] for p in places]
        assert place_id not in place_ids
    
    def test_delete_nonexistent_place(self):
        """Test deleting a place that doesn't exist returns 404"""
        fake_place_id = str(uuid.uuid4())
        
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places/{fake_place_id}",
            headers=self.headers
        )
        
        assert response.status_code == 404
    
    def test_places_included_in_location_response(self):
        """Test that places_of_interest are included when fetching locations"""
        # Add a place
        requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers,
            json={"name": "TEST_Included Place", "place_type": "blacksmith"}
        )
        
        # Get the location
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations",
            headers=self.headers
        )
        
        assert response.status_code == 200
        locations = response.json()
        
        # Find our test location
        test_location = next((loc for loc in locations if loc['id'] == self.location_id), None)
        assert test_location is not None
        
        # Verify places_of_interest is included
        assert 'places_of_interest' in test_location
        assert isinstance(test_location['places_of_interest'], list)
        assert any(p['name'] == "TEST_Included Place" for p in test_location['places_of_interest'])
    
    def test_multiple_places_in_location(self):
        """Test adding multiple places of interest to a single location"""
        places_to_add = [
            {"name": "TEST_Place1", "place_type": "shop"},
            {"name": "TEST_Place2", "place_type": "tavern"},
            {"name": "TEST_Place3", "place_type": "temple"},
        ]
        
        for place_data in places_to_add:
            response = requests.post(
                f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
                headers=self.headers,
                json=place_data
            )
            assert response.status_code == 200
        
        # Verify all places are there
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{self.location_id}/places",
            headers=self.headers
        )
        
        places = get_response.json()
        place_names = [p['name'] for p in places]
        
        for place_data in places_to_add:
            assert place_data['name'] in place_names


class TestPlacesOfInterestEdgeCases:
    """Test edge cases and error handling for Places of Interest"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Use existing test user and campaign"""
        # Login with known test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "testdm1",
            "password": "testpass123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Test user not available")
        
        self.token = login_response.json()['token']
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        self.campaign_id = "32fe976f-1dd0-4b17-a23b-42dbd1023d50"  # Known test campaign
    
    def test_add_place_to_nonexistent_location(self):
        """Test adding a place to a location that doesn't exist"""
        fake_location_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{fake_location_id}/places",
            headers=self.headers,
            json={"name": "TEST_Impossible Place", "place_type": "shop"}
        )
        
        assert response.status_code == 404
    
    def test_update_nonexistent_place(self):
        """Test updating a place that doesn't exist"""
        # Get a real location ID first
        loc_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations",
            headers=self.headers
        )
        
        if loc_response.status_code != 200 or len(loc_response.json()) == 0:
            pytest.skip("No locations available for test")
        
        location_id = loc_response.json()[0]['id']
        fake_place_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{location_id}/places/{fake_place_id}",
            headers=self.headers,
            json={"name": "Updated Name"}
        )
        
        assert response.status_code == 404
    
    def test_place_with_all_types(self):
        """Test creating places with all supported place types"""
        place_types = ['shop', 'tavern', 'temple', 'blacksmith', 'guild', 'library', 'residence', 'other']
        
        # Get a location
        loc_response = requests.get(
            f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations",
            headers=self.headers
        )
        
        if loc_response.status_code != 200 or len(loc_response.json()) == 0:
            pytest.skip("No locations available for test")
        
        location_id = loc_response.json()[0]['id']
        
        for place_type in place_types:
            response = requests.post(
                f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{location_id}/places",
                headers=self.headers,
                json={
                    "name": f"TEST_TypeTest_{place_type}_{uuid.uuid4().hex[:4]}",
                    "place_type": place_type
                }
            )
            
            assert response.status_code == 200
            assert response.json()['place_type'] == place_type
            
            # Cleanup - delete the test place
            place_id = response.json()['id']
            requests.delete(
                f"{BASE_URL}/api/campaigns/{self.campaign_id}/locations/{location_id}/places/{place_id}",
                headers=self.headers
            )
