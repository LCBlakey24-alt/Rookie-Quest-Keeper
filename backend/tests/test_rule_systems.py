"""
Tests for Rule Systems, Content Management, Bulk Upload and AI with Rules APIs
"""
import pytest
import requests
import json
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test credentials - admin user
ADMIN_EMAIL = 'gmtest@test.com'
ADMIN_PASSWORD = 'test123'
TEST_CAMPAIGN_ID = '0bd14e3c-9cec-4dda-a2f9-bc0efe58ebb5'


@pytest.fixture
def admin_session():
    """Create authenticated admin session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json().get('token')
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


class TestRuleSystemsAPI:
    """Tests for GET /api/rule-systems endpoints"""
    
    def test_get_rule_systems(self, admin_session):
        """Test getting all rule systems"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems")
        assert response.status_code == 200
        data = response.json()
        assert 'systems' in data
        systems = data['systems']
        assert len(systems) >= 2, "Should have at least 5e-2014 and 5e-2024"
        
        # Verify expected systems exist
        system_ids = [s['id'] for s in systems]
        assert '5e-2014' in system_ids or '5e-2024' in system_ids
    
    def test_get_rule_system_by_id(self, admin_session):
        """Test getting specific rule system with content counts"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024")
        assert response.status_code == 200
        data = response.json()
        
        assert 'system' in data
        assert 'content_counts' in data
        
        system = data['system']
        assert system['id'] == '5e-2024'
        assert 'name' in system
        
        counts = data['content_counts']
        assert 'classes' in counts
        assert 'races' in counts
        assert 'spells' in counts
        assert 'items' in counts
        assert 'feats' in counts
        assert 'monsters' in counts
    
    def test_get_nonexistent_rule_system(self, admin_session):
        """Test 404 for nonexistent system"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/nonexistent-system")
        assert response.status_code == 404


class TestContentAPIs:
    """Tests for content retrieval endpoints"""
    
    def test_get_classes(self, admin_session):
        """Test GET /rule-systems/{id}/classes"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024/classes")
        assert response.status_code == 200
        data = response.json()
        assert 'classes' in data
    
    def test_get_races(self, admin_session):
        """Test GET /rule-systems/{id}/races"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024/races")
        assert response.status_code == 200
        data = response.json()
        assert 'races' in data
    
    def test_get_spells(self, admin_session):
        """Test GET /rule-systems/{id}/spells"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024/spells")
        assert response.status_code == 200
        data = response.json()
        assert 'spells' in data
    
    def test_get_items(self, admin_session):
        """Test GET /rule-systems/{id}/items"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024/items")
        assert response.status_code == 200
        data = response.json()
        assert 'items' in data
    
    def test_get_feats(self, admin_session):
        """Test GET /rule-systems/{id}/feats"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024/feats")
        assert response.status_code == 200
        data = response.json()
        assert 'feats' in data
    
    def test_get_monsters(self, admin_session):
        """Test GET /rule-systems/{id}/monsters"""
        response = admin_session.get(f"{BASE_URL}/api/rule-systems/5e-2024/monsters")
        assert response.status_code == 200
        data = response.json()
        assert 'monsters' in data


class TestBulkUploadAPI:
    """Tests for POST /api/rule-systems/{id}/upload endpoint"""
    
    def test_upload_class(self, admin_session):
        """Test uploading a class definition"""
        unique_name = f"TEST_Class_{uuid.uuid4().hex[:8]}"
        upload_data = {
            'system_id': '5e-2024',
            'content_type': 'classes',
            'data': [{
                'name': unique_name,
                'description': 'A test class for testing',
                'hit_die': 10,
                'primary_ability': 'Strength',
                'saving_throw_proficiencies': ['Strength', 'Constitution'],
                'multiclass_requirements': {'Strength': 13}
            }],
            'overwrite_existing': False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['content_type'] == 'classes'
        assert data['created'] == 1
        assert len(data['errors']) == 0
    
    def test_upload_race(self, admin_session):
        """Test uploading a race definition"""
        unique_name = f"TEST_Race_{uuid.uuid4().hex[:8]}"
        upload_data = {
            'system_id': '5e-2024',
            'content_type': 'races',
            'data': [{
                'name': unique_name,
                'description': 'A test race',
                'size': 'Medium',
                'speed': 30,
                'ability_score_increases': {'Strength': 2},
                'languages': ['Common']
            }],
            'overwrite_existing': False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['created'] == 1
    
    def test_upload_spell(self, admin_session):
        """Test uploading a spell definition"""
        unique_name = f"TEST_Spell_{uuid.uuid4().hex[:8]}"
        upload_data = {
            'system_id': '5e-2024',
            'content_type': 'spells',
            'data': [{
                'name': unique_name,
                'level': 3,
                'school': 'Evocation',
                'casting_time': '1 action',
                'range': '150 feet',
                'components': 'V, S, M',
                'duration': 'Instantaneous',
                'description': 'A test spell',
                'classes': ['Wizard', 'Sorcerer']
            }],
            'overwrite_existing': False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
    
    def test_upload_multiple_items(self, admin_session):
        """Test uploading multiple items at once"""
        unique_prefix = f"TEST_{uuid.uuid4().hex[:6]}"
        upload_data = {
            'system_id': '5e-2024',
            'content_type': 'items',
            'data': [
                {'name': f'{unique_prefix}_Sword', 'type': 'weapon', 'damage': '1d8', 'damage_type': 'slashing'},
                {'name': f'{unique_prefix}_Shield', 'type': 'armor', 'armor_class': 2},
                {'name': f'{unique_prefix}_Potion', 'type': 'consumable', 'description': 'Heals 2d4+2 HP'}
            ],
            'overwrite_existing': False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data['total_records'] == 3
        assert data['created'] == 3
    
    def test_upload_duplicate_fails(self, admin_session):
        """Test that uploading duplicate item fails without overwrite"""
        unique_name = f"TEST_Dup_{uuid.uuid4().hex[:8]}"
        upload_data = {
            'system_id': '5e-2024',
            'content_type': 'feats',
            'data': [{'name': unique_name, 'description': 'First upload'}],
            'overwrite_existing': False
        }
        
        # First upload
        response1 = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response1.status_code == 200
        assert response1.json()['created'] == 1
        
        # Second upload should fail
        upload_data['data'][0]['description'] = 'Second upload'
        response2 = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response2.status_code == 200
        data = response2.json()
        assert data['created'] == 0
        assert len(data['errors']) > 0
    
    def test_upload_invalid_content_type(self, admin_session):
        """Test uploading with invalid content type"""
        upload_data = {
            'system_id': '5e-2024',
            'content_type': 'invalid_type',
            'data': [{'name': 'Test'}],
            'overwrite_existing': False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems/5e-2024/upload", json=upload_data)
        assert response.status_code == 400
    
    def test_upload_to_nonexistent_system(self, admin_session):
        """Test uploading to nonexistent system"""
        upload_data = {
            'system_id': 'nonexistent',
            'content_type': 'classes',
            'data': [{'name': 'Test'}],
            'overwrite_existing': False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems/nonexistent/upload", json=upload_data)
        assert response.status_code == 404


class TestAIGenerateWithRules:
    """Tests for POST /api/ai/generate-with-rules endpoint"""
    
    def test_ai_generate_npc(self, admin_session):
        """Test AI NPC generation with rule awareness"""
        request_data = {
            'campaign_id': TEST_CAMPAIGN_ID,
            'type': 'npc',
            'context': 'Create a tavern keeper for a small village'
        }
        
        response = admin_session.post(f"{BASE_URL}/api/ai/generate-with-rules", json=request_data)
        assert response.status_code == 200
        data = response.json()
        
        assert 'result' in data
        assert 'rule_system' in data
        assert len(data['result']) > 50  # Should have meaningful content
    
    def test_ai_generate_encounter(self, admin_session):
        """Test AI encounter generation"""
        request_data = {
            'campaign_id': TEST_CAMPAIGN_ID,
            'type': 'encounter',
            'context': 'Forest ambush for level 3 party'
        }
        
        response = admin_session.post(f"{BASE_URL}/api/ai/generate-with-rules", json=request_data)
        assert response.status_code == 200
        data = response.json()
        
        assert 'result' in data
        assert 'rule_system' in data
    
    def test_ai_generate_requires_campaign_id(self, admin_session):
        """Test that campaign_id is required"""
        request_data = {
            'type': 'npc',
            'context': 'A test NPC'
        }
        
        response = admin_session.post(f"{BASE_URL}/api/ai/generate-with-rules", json=request_data)
        assert response.status_code == 400
        assert 'campaign_id' in response.json().get('detail', '').lower()
    
    def test_ai_generate_invalid_campaign(self, admin_session):
        """Test AI generation with invalid campaign ID"""
        request_data = {
            'campaign_id': 'nonexistent-campaign-id',
            'type': 'npc',
            'context': 'Test'
        }
        
        response = admin_session.post(f"{BASE_URL}/api/ai/generate-with-rules", json=request_data)
        assert response.status_code == 404


class TestMulticlassAPI:
    """Tests for multiclass endpoints - documents BUG with db.characters vs db.player_characters"""
    
    def test_multiclass_endpoint_exists(self, admin_session):
        """Test that multiclass endpoint exists and returns 404 for invalid character"""
        # This tests the endpoint works, even though it uses wrong collection
        response = admin_session.post(
            f"{BASE_URL}/api/characters/nonexistent-char-id/multiclass",
            json={'class_name': 'Fighter'}
        )
        # Should be 404 not found, not 500 or route not found
        assert response.status_code == 404
        assert 'not found' in response.json().get('detail', '').lower()
    
    def test_level_up_class_endpoint_exists(self, admin_session):
        """Test that level-up-class endpoint exists"""
        response = admin_session.post(
            f"{BASE_URL}/api/characters/nonexistent-char-id/level-up-class",
            json={'class_name': 'Fighter'}
        )
        assert response.status_code == 404
    
    def test_multiclass_requires_class_name(self, admin_session):
        """Test that class_name is required for multiclass"""
        response = admin_session.post(
            f"{BASE_URL}/api/characters/test-char-id/multiclass",
            json={}
        )
        # Will be 404 (char not found) or 400 (class_name required)
        assert response.status_code in [400, 404]


class TestCreateRuleSystem:
    """Tests for creating custom rule systems"""
    
    def test_create_custom_rule_system(self, admin_session):
        """Test creating a custom rule system"""
        unique_code = f"test_{uuid.uuid4().hex[:8]}"
        system_data = {
            'name': f'Test System {unique_code}',
            'short_code': unique_code,
            'description': 'A test custom rule system'
        }
        
        response = admin_session.post(f"{BASE_URL}/api/rule-systems", json=system_data)
        assert response.status_code == 201
        data = response.json()
        
        assert data['name'] == system_data['name']
        assert data['short_code'] == unique_code
        assert data['is_official'] == False
    
    def test_create_duplicate_short_code_fails(self, admin_session):
        """Test that duplicate short codes are rejected"""
        unique_code = f"dup_{uuid.uuid4().hex[:8]}"
        system_data = {
            'name': f'First System {unique_code}',
            'short_code': unique_code,
            'description': 'First'
        }
        
        # First creation
        response1 = admin_session.post(f"{BASE_URL}/api/rule-systems", json=system_data)
        assert response1.status_code == 201
        
        # Second creation should fail
        system_data['name'] = 'Different Name'
        response2 = admin_session.post(f"{BASE_URL}/api/rule-systems", json=system_data)
        assert response2.status_code == 400


class TestAuthRequired:
    """Test that authentication is required for all endpoints"""
    
    def test_rule_systems_requires_auth(self):
        """Test that /rule-systems requires authentication"""
        response = requests.get(f"{BASE_URL}/api/rule-systems")
        assert response.status_code in [401, 403]
    
    def test_upload_requires_auth(self):
        """Test that upload requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/rule-systems/5e-2024/upload",
            json={'content_type': 'classes', 'data': []}
        )
        assert response.status_code in [401, 403]
    
    def test_ai_generate_requires_auth(self):
        """Test that AI generate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-with-rules",
            json={'campaign_id': 'test', 'type': 'npc'}
        )
        assert response.status_code in [401, 403]
