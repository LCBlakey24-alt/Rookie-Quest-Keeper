#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class DNDBackendTester:
    def __init__(self, base_url="https://dungeonmaster-tool.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.username = None
        self.campaign_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if success else {}, response.status_code
        except Exception as e:
            return False, {}, f"Exception: {str(e)}"

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        self.username = f"testuser_{timestamp}"
        password = "TestPass123!"
        
        success, response, status = self.make_request(
            'POST', 'auth/register',
            {'username': self.username, 'password': password},
            201
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("User Registration", True)
            return True
        else:
            self.log_test("User Registration", False, f"Status: {status}")
            return False

    def test_user_login(self):
        """Test user login"""
        success, response, status = self.make_request(
            'POST', 'auth/login',
            {'username': self.username, 'password': 'TestPass123!'},
            200
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("User Login", True)
            return True
        else:
            self.log_test("User Login", False, f"Status: {status}")
            return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        success, response, status = self.make_request('GET', 'auth/me')
        
        if success and response.get('username') == self.username:
            self.log_test("Auth Me", True)
            return True
        else:
            self.log_test("Auth Me", False, f"Status: {status}")
            return False

    def test_campaign_creation(self):
        """Test campaign creation"""
        campaign_data = {
            'name': 'Test Campaign',
            'description': 'A test D&D campaign for automated testing'
        }
        
        success, response, status = self.make_request(
            'POST', 'campaigns', campaign_data, 201
        )
        
        if success and 'id' in response:
            self.campaign_id = response['id']
            self.log_test("Campaign Creation", True)
            return True
        else:
            self.log_test("Campaign Creation", False, f"Status: {status}")
            return False

    def test_campaign_list(self):
        """Test getting campaign list"""
        success, response, status = self.make_request('GET', 'campaigns')
        
        if success and isinstance(response, list) and len(response) > 0:
            self.log_test("Campaign List", True)
            return True
        else:
            self.log_test("Campaign List", False, f"Status: {status}")
            return False

    def test_campaign_setting(self):
        """Test campaign setting CRUD"""
        # Get setting (should create default)
        success, response, status = self.make_request(
            'GET', f'campaigns/{self.campaign_id}/setting'
        )
        
        if not success:
            self.log_test("Campaign Setting Get", False, f"Status: {status}")
            return False
        
        # Update setting
        setting_data = {'content': 'This is a test campaign world with dragons and magic.'}
        success, response, status = self.make_request(
            'PUT', f'campaigns/{self.campaign_id}/setting', setting_data
        )
        
        if success:
            self.log_test("Campaign Setting Update", True)
            return True
        else:
            self.log_test("Campaign Setting Update", False, f"Status: {status}")
            return False

    def test_gods_crud(self):
        """Test Gods CRUD operations"""
        # Create god
        god_data = {
            'name': 'Bahamut',
            'domain': 'Justice, Protection',
            'description': 'The Platinum Dragon, god of justice and protection',
            'symbol': 'Dragon head in profile',
            'alignment': 'Lawful Good',
            'notes': 'Test god for automated testing'
        }
        
        success, response, status = self.make_request(
            'POST', f'campaigns/{self.campaign_id}/gods', god_data, 201
        )
        
        if not success:
            self.log_test("Gods Create", False, f"Status: {status}")
            return False
        
        god_id = response['id']
        
        # Get gods list
        success, response, status = self.make_request(
            'GET', f'campaigns/{self.campaign_id}/gods'
        )
        
        if not success or len(response) == 0:
            self.log_test("Gods List", False, f"Status: {status}")
            return False
        
        # Update god
        update_data = {'description': 'Updated description for testing'}
        success, response, status = self.make_request(
            'PUT', f'campaigns/{self.campaign_id}/gods/{god_id}', update_data
        )
        
        if not success:
            self.log_test("Gods Update", False, f"Status: {status}")
            return False
        
        # Delete god
        success, response, status = self.make_request(
            'DELETE', f'campaigns/{self.campaign_id}/gods/{god_id}', expected_status=200
        )
        
        if success:
            self.log_test("Gods CRUD", True)
            return True
        else:
            self.log_test("Gods Delete", False, f"Status: {status}")
            return False

    def test_npcs_crud(self):
        """Test NPCs CRUD operations"""
        # Create NPC
        npc_data = {
            'name': 'Garrick the Merchant',
            'description': 'A mysterious traveling merchant with valuable information',
            'hp': 25,
            'ac': 12,
            'location': 'The Prancing Pony Tavern',
            'notes': 'Test NPC for automated testing'
        }
        
        success, response, status = self.make_request(
            'POST', f'campaigns/{self.campaign_id}/npcs', npc_data, 201
        )
        
        if not success:
            self.log_test("NPCs Create", False, f"Status: {status}")
            return False
        
        npc_id = response['id']
        
        # Get NPCs list
        success, response, status = self.make_request(
            'GET', f'campaigns/{self.campaign_id}/npcs'
        )
        
        if not success or len(response) == 0:
            self.log_test("NPCs List", False, f"Status: {status}")
            return False
        
        # Update NPC
        update_data = {'hp': 30, 'notes': 'Updated for testing'}
        success, response, status = self.make_request(
            'PUT', f'campaigns/{self.campaign_id}/npcs/{npc_id}', update_data
        )
        
        if not success:
            self.log_test("NPCs Update", False, f"Status: {status}")
            return False
        
        self.log_test("NPCs CRUD", True)
        return True

    def test_locations_crud(self):
        """Test Locations CRUD operations"""
        # Create location
        location_data = {
            'name': 'Thornhold Ruins',
            'location_type': 'Ancient Ruins',
            'description': 'Mysterious ruins blessed by ancient gods',
            'notable_npcs': 'Ancient spirits, Guardian constructs',
            'notes': 'Test location for automated testing'
        }
        
        success, response, status = self.make_request(
            'POST', f'campaigns/{self.campaign_id}/locations', location_data, 201
        )
        
        if not success:
            self.log_test("Locations Create", False, f"Status: {status}")
            return False
        
        location_id = response['id']
        
        # Get locations list
        success, response, status = self.make_request(
            'GET', f'campaigns/{self.campaign_id}/locations'
        )
        
        if not success or len(response) == 0:
            self.log_test("Locations List", False, f"Status: {status}")
            return False
        
        # Update location
        update_data = {'description': 'Updated ruins description for testing'}
        success, response, status = self.make_request(
            'PUT', f'campaigns/{self.campaign_id}/locations/{location_id}', update_data
        )
        
        if success:
            self.log_test("Locations CRUD", True)
            return True
        else:
            self.log_test("Locations Update", False, f"Status: {status}")
            return False

    def test_players_crud(self):
        """Test Players CRUD operations"""
        # Create player
        player_data = {
            'name': 'Thorin Ironforge',
            'character_class': 'Fighter',
            'level': 3,
            'hp': 28,
            'max_hp': 30,
            'ac': 16,
            'stats': {
                'strength': 16,
                'dexterity': 12,
                'constitution': 14,
                'intelligence': 10,
                'wisdom': 13,
                'charisma': 8
            },
            'notes': 'Test player character for automated testing'
        }
        
        success, response, status = self.make_request(
            'POST', f'campaigns/{self.campaign_id}/players', player_data, 201
        )
        
        if not success:
            self.log_test("Players Create", False, f"Status: {status}")
            return False
        
        player_id = response['id']
        
        # Get players list
        success, response, status = self.make_request(
            'GET', f'campaigns/{self.campaign_id}/players'
        )
        
        if not success or len(response) == 0:
            self.log_test("Players List", False, f"Status: {status}")
            return False
        
        # Update player
        update_data = {'hp': 25, 'level': 4}
        success, response, status = self.make_request(
            'PUT', f'campaigns/{self.campaign_id}/players/{player_id}', update_data
        )
        
        if success:
            self.log_test("Players CRUD", True)
            return True
        else:
            self.log_test("Players Update", False, f"Status: {status}")
            return False

    def test_ingame_notes_and_ai(self):
        """Test In-Game Notes and AI processing"""
        # Create in-game note
        note_data = {
            'content': '''Session 1 Notes:
- The party met a mysterious merchant named Garrick in the tavern
- They learned about the ancient ruins of Thornhold
- Garrick mentioned the goddess Selune might have blessed the ruins
- The party agreed to investigate tomorrow
- They also heard rumors about a dragon named Pyraxis terrorizing nearby villages'''
        }
        
        success, response, status = self.make_request(
            'POST', f'campaigns/{self.campaign_id}/ingame-notes', note_data, 201
        )
        
        if not success:
            self.log_test("In-Game Notes Create", False, f"Status: {status}")
            return False
        
        note_id = response['id']
        
        # Get notes list
        success, response, status = self.make_request(
            'GET', f'campaigns/{self.campaign_id}/ingame-notes'
        )
        
        if not success or len(response) == 0:
            self.log_test("In-Game Notes List", False, f"Status: {status}")
            return False
        
        # Test AI processing
        print("🤖 Testing AI processing (this may take a few seconds)...")
        success, response, status = self.make_request(
            'POST', f'campaigns/{self.campaign_id}/ingame-notes/{note_id}/process-ai',
            expected_status=200
        )
        
        if success and 'suggestions' in response:
            suggestions = response['suggestions']
            has_suggestions = (
                (suggestions.get('new_npcs') and len(suggestions['new_npcs']) > 0) or
                (suggestions.get('new_locations') and len(suggestions['new_locations']) > 0) or
                (suggestions.get('new_gods') and len(suggestions['new_gods']) > 0)
            )
            
            if has_suggestions:
                self.log_test("AI Processing", True)
                print(f"   📝 AI found suggestions: {json.dumps(suggestions, indent=2)}")
                return True
            else:
                self.log_test("AI Processing", False, "No suggestions generated")
                return False
        else:
            self.log_test("AI Processing", False, f"Status: {status}")
            return False

    def test_ai_generation(self):
        """Test AI content generation"""
        generation_data = {
            'prompt': 'Create a dangerous trap for a dungeon',
            'generation_type': 'trap'
        }
        
        print("🤖 Testing AI content generation (this may take a few seconds)...")
        success, response, status = self.make_request(
            'POST', 'ai/generate', generation_data
        )
        
        if success and 'content' in response and len(response['content']) > 50:
            self.log_test("AI Content Generation", True)
            print(f"   📝 Generated content: {response['content'][:100]}...")
            return True
        else:
            self.log_test("AI Content Generation", False, f"Status: {status}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting D&D Backend API Tests")
        print("=" * 50)
        
        # Authentication tests
        if not self.test_user_registration():
            return False
        
        if not self.test_user_login():
            return False
        
        if not self.test_auth_me():
            return False
        
        # Campaign tests
        if not self.test_campaign_creation():
            return False
        
        if not self.test_campaign_list():
            return False
        
        if not self.test_campaign_setting():
            return False
        
        # CRUD tests for all entities
        self.test_gods_crud()
        self.test_npcs_crud()
        self.test_locations_crud()
        self.test_players_crud()
        
        # AI functionality tests
        self.test_ingame_notes_and_ai()
        self.test_ai_generation()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Backend Tests Complete")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🚨 Failed Tests:")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        return len(self.failed_tests) == 0

def main():
    tester = DNDBackendTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())