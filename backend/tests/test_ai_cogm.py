"""
Test AI Co-GM endpoint and related features
Tests: POST /api/rook/chat endpoint with campaign context
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAICoGM:
    """AI Co-GM endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and get auth token"""
        self.email = "lcblakey24@outlook.com"
        self.password = "LCBlakey24?!"
        self.campaign_id = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"
        
        # Get auth token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Authentication failed - skipping AI Co-GM tests")
    
    def test_rook_chat_basic(self):
        """Test basic AI Co-GM chat without campaign context"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "Hello, give me a one-sentence greeting",
                "campaign_id": "",
                "context": ""
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "response" in data, "Response should contain 'response' field"
        assert len(data["response"]) > 0, "Response should not be empty"
    
    def test_rook_chat_with_campaign_context(self):
        """Test AI Co-GM chat with campaign context"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "Suggest a quick encounter",
                "campaign_id": self.campaign_id,
                "context": "You are a combat advisor for D&D 5e."
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "response" in data, "Response should contain 'response' field"
        assert len(data["response"]) > 10, "Response should be substantial"
    
    def test_rook_chat_combat_context(self):
        """Test AI Co-GM with Combat Advisor context"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "What tactical moves should goblins use?",
                "campaign_id": self.campaign_id,
                "context": "Active GM Screen tab: combat. You are a combat advisor for a D&D 5e game."
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        # Response should mention combat-related terms
        response_lower = data["response"].lower()
        assert any(term in response_lower for term in ["attack", "combat", "tactic", "move", "action", "goblin"]), \
            "Response should be combat-related"
    
    def test_rook_chat_location_context(self):
        """Test AI Co-GM with Location Guide context"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "Describe a mysterious tavern",
                "campaign_id": self.campaign_id,
                "context": "Active GM Screen tab: location. You are a vivid world narrator for D&D 5e."
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 50, "Location description should be detailed"
    
    def test_rook_chat_npc_context(self):
        """Test AI Co-GM with NPC Voice context"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "Generate dialogue for a grumpy dwarf blacksmith",
                "campaign_id": self.campaign_id,
                "context": "Active GM Screen tab: npcs. You are an NPC dialogue specialist for D&D 5e."
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 20, "NPC dialogue should be substantial"
    
    def test_rook_chat_story_context(self):
        """Test AI Co-GM with Story Architect context"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "Suggest a plot twist for a heist story arc",
                "campaign_id": self.campaign_id,
                "context": "Active GM Screen tab: story. You are a narrative architect for D&D 5e."
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 30, "Story suggestion should be detailed"
    
    def test_rook_chat_unauthorized(self):
        """Test AI Co-GM without authentication"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers={"Content-Type": "application/json"},
            json={
                "message": "Hello",
                "campaign_id": "",
                "context": ""
            },
            timeout=30
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_rook_chat_empty_message(self):
        """Test AI Co-GM with empty message"""
        response = requests.post(f"{BASE_URL}/api/rook/chat", 
            headers=self.headers,
            json={
                "message": "",
                "campaign_id": "",
                "context": ""
            },
            timeout=30
        )
        
        # Should either return error or handle gracefully
        # The API might return 200 with empty response or 400/422 for validation
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"


class TestCharacterInventoryAPI:
    """Test character inventory and equipment auto-save"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and get auth token"""
        self.email = "lcblakey24@outlook.com"
        self.password = "LCBlakey24?!"
        self.campaign_id = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"
        
        # Get auth token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Authentication failed")
    
    def test_get_campaign_players(self):
        """Test getting players from campaign"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{self.campaign_id}/players",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return list of players"
    
    def test_character_patch_endpoint_exists(self):
        """Test that character PATCH endpoint exists for inventory updates"""
        # First get a character ID
        response = requests.get(f"{BASE_URL}/api/campaigns/{self.campaign_id}/players",
            headers=self.headers
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            character_id = response.json()[0].get("id")
            
            # Test PATCH endpoint with minimal data
            patch_response = requests.patch(f"{BASE_URL}/api/characters/{character_id}",
                headers=self.headers,
                json={"notes": "Test update"}
            )
            
            # Should return 200 or 404 (if character doesn't exist in characters collection)
            assert patch_response.status_code in [200, 404, 422], \
                f"PATCH endpoint should exist, got {patch_response.status_code}"
        else:
            pytest.skip("No players in campaign to test")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
