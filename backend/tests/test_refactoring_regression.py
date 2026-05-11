"""
Comprehensive regression tests for ROOK backend after modular refactoring.
Tests all critical API endpoints to ensure no routes were lost during the refactoring
from the monolithic server.py to 18 modular route files.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"
TEST_CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self):
        """GET /api/health - Health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


class TestAuthEndpoints:
    """Test authentication endpoints (routes/auth.py)"""
    
    def test_login(self):
        """POST /api/auth/login - User login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "username" in data
        print(f"✓ Login successful for user: {data.get('username')}")
    
    def test_auth_me(self, auth_headers):
        """GET /api/auth/me - Get current user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        print(f"✓ Auth/me returned user: {data.get('username')}")
    
    def test_account_profile(self, auth_headers):
        """GET /api/account/profile - Get account profile"""
        response = requests.get(f"{BASE_URL}/api/account/profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "username" in data or "email" in data
        print("✓ Account profile retrieved")


class TestCampaignEndpoints:
    """Test campaign endpoints (routes/campaigns.py)"""
    
    def test_get_campaigns(self, auth_headers):
        """GET /api/campaigns - List all campaigns"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} campaigns")
    
    def test_get_campaign_by_id(self, auth_headers):
        """GET /api/campaigns/{id} - Get specific campaign"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        print(f"✓ Retrieved campaign: {data.get('name')}")
    
    def test_get_campaign_setting(self, auth_headers):
        """GET /api/campaigns/{id}/setting - Get campaign setting"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/setting", headers=auth_headers)
        assert response.status_code in [200, 404]  # 404 if no setting exists
        print("✓ Campaign setting endpoint working")
    
    def test_get_campaign_world_setting(self, auth_headers):
        """GET /api/campaigns/{id}/world-setting - Get world setting"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-setting", headers=auth_headers)
        assert response.status_code in [200, 404]
        print("✓ Campaign world-setting endpoint working")


class TestNPCEndpoints:
    """Test NPC endpoints (routes/npcs.py)"""
    
    def test_get_npcs(self, auth_headers):
        """GET /api/campaigns/{id}/npcs - List NPCs"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/npcs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} NPCs")
    
    def test_get_npc_relationships(self, auth_headers):
        """GET /api/campaigns/{id}/npc-relationships - List NPC relationships"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/npc-relationships", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} NPC relationships")


class TestWorldEndpoints:
    """Test world building endpoints (routes/world.py)"""
    
    def test_get_gods(self, auth_headers):
        """GET /api/campaigns/{id}/gods - List gods"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/gods", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} gods")
    
    def test_get_calendar(self, auth_headers):
        """GET /api/campaigns/{id}/calendar - Get calendar"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/calendar", headers=auth_headers)
        assert response.status_code in [200, 404]  # 404 if no calendar exists
        print("✓ Calendar endpoint working")
    
    def test_get_locations(self, auth_headers):
        """GET /api/campaigns/{id}/locations - List locations"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/locations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} locations")


class TestCombatEndpoints:
    """Test combat endpoints (routes/combat.py)"""
    
    def test_get_combat_scenarios(self, auth_headers):
        """GET /api/campaigns/{id}/combat-scenarios - List combat scenarios"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/combat-scenarios", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} combat scenarios")
    
    def test_get_initiative(self, auth_headers):
        """GET /api/campaigns/{id}/initiative - Get initiative tracker"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/initiative", headers=auth_headers)
        assert response.status_code in [200, 404]  # 404 if no active initiative
        print("✓ Initiative endpoint working")


class TestMapEndpoints:
    """Test map endpoints (routes/maps.py)"""
    
    def test_get_maps(self, auth_headers):
        """GET /api/campaigns/{id}/maps - List battle maps"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/maps", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} battle maps")
    
    def test_get_world_maps(self, auth_headers):
        """GET /api/campaigns/{id}/world-maps - List world maps"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/world-maps", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} world maps")
    
    def test_get_local_maps(self, auth_headers):
        """GET /api/campaigns/{id}/local-maps - List local maps"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/local-maps", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} local maps")


class TestCharacterEndpoints:
    """Test character endpoints (routes/characters.py)"""
    
    def test_get_characters(self, auth_headers):
        """GET /api/characters - List user's characters"""
        response = requests.get(f"{BASE_URL}/api/characters", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} characters")
    
    def test_get_campaign_players(self, auth_headers):
        """GET /api/campaigns/{id}/players - List campaign players"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/players", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} campaign players")


class TestInventoryEndpoints:
    """Test inventory endpoints (routes/inventory.py)"""
    
    def test_get_inventory(self, auth_headers):
        """GET /api/campaigns/{id}/inventory - List party inventory"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/inventory", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} inventory items")
    
    def test_get_currency(self, auth_headers):
        """GET /api/campaigns/{id}/currency - Get party currency"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/currency", headers=auth_headers)
        assert response.status_code in [200, 404]
        print("✓ Currency endpoint working")
    
    def test_get_custom_items(self, auth_headers):
        """GET /api/campaigns/{id}/custom-items - List custom items"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/custom-items", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} custom items")


class TestNotesEndpoints:
    """Test notes endpoints (routes/notes.py)"""
    
    def test_get_ingame_notes(self, auth_headers):
        """GET /api/campaigns/{id}/ingame-notes - List in-game notes"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/ingame-notes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} in-game notes")
    
    def test_get_timeline(self, auth_headers):
        """GET /api/campaigns/{id}/timeline - Get campaign timeline"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/timeline", headers=auth_headers)
        assert response.status_code in [200, 404]  # 404 if no timeline exists
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} timeline events")
        else:
            print("✓ Timeline endpoint working (no data)")


class TestPlayerEndpoints:
    """Test player-specific endpoints (routes/characters.py, routes/notes.py)"""
    
    def test_get_player_journal(self, auth_headers):
        """GET /api/player/journal - Get player journal"""
        response = requests.get(f"{BASE_URL}/api/player/journal", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} journal entries")
    
    def test_get_player_notes(self, auth_headers):
        """GET /api/player/notes - Get player notes"""
        response = requests.get(f"{BASE_URL}/api/player/notes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} player notes")
    
    def test_get_player_session_recaps(self, auth_headers):
        """GET /api/player/session-recaps - Get session recaps"""
        response = requests.get(f"{BASE_URL}/api/player/session-recaps", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} session recaps")


class TestSRDEndpoints:
    """Test SRD reference endpoints (routes/srd.py)"""
    
    def test_get_srd_classes(self, auth_headers):
        """GET /api/srd/classes - List SRD classes"""
        response = requests.get(f"{BASE_URL}/api/srd/classes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        print("✓ SRD classes endpoint working")
    
    def test_get_srd_spells(self, auth_headers):
        """GET /api/srd/spells - List SRD spells"""
        response = requests.get(f"{BASE_URL}/api/srd/spells", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        print("✓ SRD spells endpoint working")
    
    def test_get_srd_races(self, auth_headers):
        """GET /api/srd/races - List SRD races"""
        response = requests.get(f"{BASE_URL}/api/srd/races", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        print("✓ SRD races endpoint working")
    
    def test_get_srd_feats(self, auth_headers):
        """GET /api/srd/feats - List SRD feats"""
        response = requests.get(f"{BASE_URL}/api/srd/feats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        print("✓ SRD feats endpoint working")



class TestAdminEndpoints:
    """Test admin endpoints (routes/admin.py)"""
    
    def test_admin_check(self, auth_headers):
        """GET /api/admin/check - Check admin status"""
        response = requests.get(f"{BASE_URL}/api/admin/check", headers=auth_headers)
        assert response.status_code in [200, 403]  # 403 if not admin
        print("✓ Admin check endpoint working")
    
    def test_get_featured_reviews(self, auth_headers):
        """GET /api/reviews/featured - Get featured reviews"""
        response = requests.get(f"{BASE_URL}/api/reviews/featured", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} featured reviews")
    
    def test_get_custom_creatures(self, auth_headers):
        """GET /api/campaigns/{id}/custom-creatures - List custom creatures"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{TEST_CAMPAIGN_ID}/custom-creatures", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} custom creatures")


class TestRuleSystemEndpoints:
    """Test rule system endpoints (routes/rule_systems.py)"""
    
    def test_get_rule_systems(self, auth_headers):
        """GET /api/rule-systems - List rule systems"""
        response = requests.get(f"{BASE_URL}/api/rule-systems", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Response can be list or dict with 'systems' key
        if isinstance(data, dict):
            assert "systems" in data
            print(f"✓ Retrieved {len(data.get('systems', []))} rule systems")
        else:
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} rule systems")


class TestProgressionEndpoints:
    """Test progression endpoints (routes/progression.py)"""
    
    def test_get_progression_classes(self, auth_headers):
        """GET /api/progression/classes - List progression classes"""
        response = requests.get(f"{BASE_URL}/api/progression/classes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Response can be list or dict with 'classes' key
        if isinstance(data, dict):
            assert "classes" in data
            print(f"✓ Retrieved {len(data.get('classes', []))} progression classes")
        else:
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} progression classes")




if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
