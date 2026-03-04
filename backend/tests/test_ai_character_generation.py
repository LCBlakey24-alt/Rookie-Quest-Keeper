"""
Tests for AI Character Generation API endpoint - Unseen Servant in Character Builder
Tests POST /api/ai/generate-character
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAICharacterGeneration:
    """Test AI Character Generation endpoint for Character Builder"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test user"""
        unique_id = f"TEST_char_gen_{uuid.uuid4().hex[:8]}"
        self.email = f"{unique_id}@test.com"
        self.username = unique_id
        self.password = "testpass123456"
        
        # Register test user
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
        
        yield
        
        # Cleanup - no characters to delete since we're only testing generation
    
    def test_ai_character_endpoint_exists(self):
        """Test that the /api/ai/generate-character endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/ai/generate-character", json={
            "description": "test"
        })
        # Without auth, should get 401/403, not 404
        assert response.status_code != 404, "AI character generation endpoint should exist"
    
    def test_ai_character_requires_authentication(self):
        """Test that endpoint requires valid auth token"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            json={"description": "A brave warrior"}
        )
        assert response.status_code in [401, 403], f"Should require authentication, got {response.status_code}"
    
    def test_ai_character_validates_description_length(self):
        """Test that endpoint requires minimum description length"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "short"}
        )
        assert response.status_code == 400, f"Should reject short description, got {response.status_code}"
        assert "too short" in response.text.lower() or "at least 10" in response.text.lower()
    
    def test_ai_character_rejects_empty_description(self):
        """Test that endpoint rejects empty description"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": ""}
        )
        assert response.status_code == 400, f"Should reject empty description, got {response.status_code}"
    
    def test_ai_character_rejects_whitespace_only(self):
        """Test that endpoint rejects whitespace-only description"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "        "}
        )
        assert response.status_code == 400, f"Should reject whitespace-only, got {response.status_code}"
    
    def test_ai_character_generation_success(self):
        """Test successful AI character generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A sneaky rogue who uses a bow and has a dark past"},
            timeout=120  # AI generation can be slow
        )
        
        assert response.status_code == 200, f"Character generation should succeed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get('success') == True, "Response should indicate success"
        assert 'character' in data, "Response should contain character data"
        assert 'message' in data, "Response should contain message"
    
    def test_ai_character_has_required_fields(self):
        """Test that generated character has all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A holy warrior seeking redemption for past sins"},
            timeout=120
        )
        
        assert response.status_code == 200, f"Character generation should succeed: {response.text}"
        data = response.json()
        character = data.get('character', {})
        
        # Required basic fields
        required_fields = ['name', 'race', 'character_class', 'background', 'alignment', 'level']
        for field in required_fields:
            assert field in character, f"Character should have {field}"
            assert character[field], f"Character {field} should not be empty"
        
        # Required ability scores
        ability_scores = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
        for score in ability_scores:
            assert score in character, f"Character should have {score}"
            assert isinstance(character[score], int), f"{score} should be an integer"
            assert 1 <= character[score] <= 30, f"{score} should be between 1-30"
        
        # Character details
        detail_fields = ['personality_traits', 'ideals', 'bonds', 'flaws', 'backstory']
        for field in detail_fields:
            assert field in character, f"Character should have {field}"
    
    def test_ai_character_race_is_valid(self):
        """Test that generated character has valid race"""
        valid_races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling']
        
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A scholarly wizard obsessed with ancient secrets"},
            timeout=120
        )
        
        assert response.status_code == 200
        character = response.json().get('character', {})
        assert character.get('race') in valid_races, f"Race '{character.get('race')}' should be valid"
    
    def test_ai_character_class_is_valid(self):
        """Test that generated character has valid class"""
        valid_classes = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
        
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A charming bard collecting tales of adventure"},
            timeout=120
        )
        
        assert response.status_code == 200
        character = response.json().get('character', {})
        assert character.get('character_class') in valid_classes, f"Class '{character.get('character_class')}' should be valid"
    
    def test_ai_character_background_is_valid(self):
        """Test that generated character has valid background"""
        valid_backgrounds = ['Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero', 'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin']
        
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A nature-loving druid protecting their homeland"},
            timeout=120
        )
        
        assert response.status_code == 200
        character = response.json().get('character', {})
        assert character.get('background') in valid_backgrounds, f"Background '{character.get('background')}' should be valid"
    
    def test_ai_character_alignment_is_valid(self):
        """Test that generated character has valid alignment"""
        valid_alignments = [
            'Lawful Good', 'Neutral Good', 'Chaotic Good',
            'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
            'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A mysterious thief who steals from the rich"},
            timeout=120
        )
        
        assert response.status_code == 200
        character = response.json().get('character', {})
        assert character.get('alignment') in valid_alignments, f"Alignment '{character.get('alignment')}' should be valid"
    
    def test_ai_character_message_contains_name(self):
        """Test that success message mentions character name"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-character",
            headers=self.headers,
            json={"description": "A fierce barbarian from the northern mountains"},
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        character_name = data.get('character', {}).get('name', '')
        message = data.get('message', '')
        
        assert character_name in message, "Success message should contain character name"
        assert "Unseen Servant" in message, "Message should mention Unseen Servant"
