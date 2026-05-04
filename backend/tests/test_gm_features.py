"""
Tests for Yellow Tier GM Features:
1. Session Timeline API
2. NPC Relationship Web API
"""
import pytest
import requests
import uuid
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test credentials
GM_TEST_EMAIL = "gmtest@test.com"
GM_TEST_PASSWORD = "test123"
CAMPAIGN_ID = "0bd14e3c-9cec-4dda-a2f9-bc0efe58ebb5"


@pytest.fixture
def auth_token():
    """Get authentication token for GM test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": GM_TEST_EMAIL, "password": GM_TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    """Auth headers for API requests"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ==================== SESSION TIMELINE TESTS ====================

class TestSessionTimeline:
    """Tests for Session Timeline API"""

    def test_get_timeline_events(self, auth_headers):
        """GET /api/campaigns/{id}/timeline - returns events list"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)

    def test_create_timeline_event_session_type(self, auth_headers):
        """POST /api/campaigns/{id}/timeline - creates session event"""
        unique_title = f"TEST_Session_{uuid.uuid4().hex[:8]}"
        event_data = {
            "type": "session",
            "title": unique_title,
            "description": "Test session event description",
            "session_number": 99,
            "in_game_date": "Day 99, Test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers,
            json=event_data
        )
        assert response.status_code == 201, f"Failed: {response.text}"
        
        created = response.json()
        assert created["title"] == unique_title
        assert created["type"] == "session"
        assert created["session_number"] == 99
        assert "id" in created
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline/{created['id']}",
            headers=auth_headers
        )

    def test_create_timeline_event_combat_type(self, auth_headers):
        """POST /api/campaigns/{id}/timeline - creates combat event"""
        unique_title = f"TEST_Combat_{uuid.uuid4().hex[:8]}"
        event_data = {
            "type": "combat",
            "title": unique_title,
            "description": "Party fought goblins",
            "session_number": 5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers,
            json=event_data
        )
        assert response.status_code == 201
        
        created = response.json()
        assert created["type"] == "combat"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline/{created['id']}",
            headers=auth_headers
        )

    def test_create_timeline_event_npc_met(self, auth_headers):
        """POST /api/campaigns/{id}/timeline - creates npc_met event"""
        unique_title = f"TEST_NPC_Met_{uuid.uuid4().hex[:8]}"
        event_data = {
            "type": "npc_met",
            "title": unique_title,
            "description": "Met Lord Blackwood",
            "session_number": 1,
            "in_game_date": "Day 1"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers,
            json=event_data
        )
        assert response.status_code == 201
        
        created = response.json()
        assert created["type"] == "npc_met"
        
        # Verify in GET
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers
        )
        events = get_response.json()["events"]
        assert any(e["id"] == created["id"] for e in events)
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline/{created['id']}",
            headers=auth_headers
        )

    def test_create_timeline_event_all_types(self, auth_headers):
        """Test all event types: quest, death, level_up, major, milestone, location"""
        event_types = ["quest", "death", "level_up", "major", "milestone", "location"]
        created_ids = []
        
        for event_type in event_types:
            event_data = {
                "type": event_type,
                "title": f"TEST_{event_type}_{uuid.uuid4().hex[:6]}",
                "description": f"Testing {event_type} event"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
                headers=auth_headers,
                json=event_data
            )
            assert response.status_code == 201, f"Failed for type {event_type}: {response.text}"
            created_ids.append(response.json()["id"])
        
        # Cleanup
        for event_id in created_ids:
            requests.delete(
                f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline/{event_id}",
                headers=auth_headers
            )

    def test_delete_timeline_event(self, auth_headers):
        """DELETE /api/campaigns/{id}/timeline/{event_id} - removes event"""
        # Create event to delete
        event_data = {
            "type": "session",
            "title": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "description": "Will be deleted"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers,
            json=event_data
        )
        assert create_response.status_code == 201
        event_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline/{event_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deleted (should not be in list)
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers
        )
        events = get_response.json()["events"]
        assert not any(e["id"] == event_id for e in events)

    def test_delete_nonexistent_event_returns_404(self, auth_headers):
        """DELETE non-existent event returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_timeline_requires_auth(self):
        """Timeline endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline")
        assert response.status_code in [401, 403]

    def test_timeline_event_without_title_fails(self, auth_headers):
        """Creating event without title should fail validation"""
        event_data = {
            "type": "session",
            "description": "No title provided"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/timeline",
            headers=auth_headers,
            json=event_data
        )
        assert response.status_code == 422  # Validation error


# ==================== NPC RELATIONSHIP WEB TESTS ====================

class TestNPCRelationshipWeb:
    """Tests for NPC Relationship Web API"""
    
    # Using existing NPCs from the test campaign
    NPC_LORD_BLACKWOOD = "1821df61-b590-4d4e-a4f3-1d590dab49ce"
    NPC_LADY_ROSE = "eb4b56b3-68c6-4b00-8ce8-c5891f43b23f"

    def test_get_npc_relationships(self, auth_headers):
        """GET /api/campaigns/{id}/npc-relationships - returns list"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_existing_relationship(self, auth_headers):
        """Verify existing relationship data structure"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        )
        assert response.status_code == 200
        relationships = response.json()
        
        if len(relationships) > 0:
            rel = relationships[0]
            assert "id" in rel
            assert "source_id" in rel
            assert "target_id" in rel
            assert "relationship_type" in rel
            assert "campaign_id" in rel

    def test_create_npc_relationship_ally(self, auth_headers):
        """POST /api/campaigns/{id}/npc-relationships - creates ally relationship"""
        # First delete any existing relationship between these NPCs
        existing = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        ).json()
        
        for rel in existing:
            if (rel["source_id"] == self.NPC_LORD_BLACKWOOD and rel["target_id"] == self.NPC_LADY_ROSE) or \
               (rel["source_id"] == self.NPC_LADY_ROSE and rel["target_id"] == self.NPC_LORD_BLACKWOOD):
                requests.delete(
                    f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{rel['id']}",
                    headers=auth_headers
                )
        
        # Create new relationship
        rel_data = {
            "source_id": self.NPC_LORD_BLACKWOOD,
            "target_id": self.NPC_LADY_ROSE,
            "relationship_type": "ally",
            "description": "TEST alliance"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers,
            json=rel_data
        )
        assert response.status_code == 201, f"Failed: {response.text}"
        
        created = response.json()
        assert created["source_id"] == self.NPC_LORD_BLACKWOOD
        assert created["target_id"] == self.NPC_LADY_ROSE
        assert created["relationship_type"] == "ally"
        
        # Verify in GET
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        )
        relationships = get_response.json()
        assert any(r["id"] == created["id"] for r in relationships)
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{created['id']}",
            headers=auth_headers
        )

    def test_relationship_types(self, auth_headers):
        """Test various relationship types: enemy, family, romantic, business, rival, neutral, servant"""
        relationship_types = ["enemy", "family", "romantic", "business", "rival", "neutral", "servant"]
        
        for rel_type in relationship_types:
            # Delete any existing relationship first
            existing = requests.get(
                f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
                headers=auth_headers
            ).json()
            
            for rel in existing:
                if (rel["source_id"] == self.NPC_LORD_BLACKWOOD and rel["target_id"] == self.NPC_LADY_ROSE) or \
                   (rel["source_id"] == self.NPC_LADY_ROSE and rel["target_id"] == self.NPC_LORD_BLACKWOOD):
                    requests.delete(
                        f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{rel['id']}",
                        headers=auth_headers
                    )
            
            rel_data = {
                "source_id": self.NPC_LORD_BLACKWOOD,
                "target_id": self.NPC_LADY_ROSE,
                "relationship_type": rel_type,
                "description": f"TEST {rel_type} relationship"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
                headers=auth_headers,
                json=rel_data
            )
            assert response.status_code == 201, f"Failed for type {rel_type}: {response.text}"
            created_id = response.json()["id"]
            
            # Cleanup immediately
            requests.delete(
                f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{created_id}",
                headers=auth_headers
            )

    def test_delete_npc_relationship(self, auth_headers):
        """DELETE /api/campaigns/{id}/npc-relationships/{id} - removes relationship"""
        # Delete any existing relationship first
        existing = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        ).json()
        
        for rel in existing:
            if (rel["source_id"] == self.NPC_LORD_BLACKWOOD and rel["target_id"] == self.NPC_LADY_ROSE) or \
               (rel["source_id"] == self.NPC_LADY_ROSE and rel["target_id"] == self.NPC_LORD_BLACKWOOD):
                requests.delete(
                    f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{rel['id']}",
                    headers=auth_headers
                )
        
        # Create relationship to delete
        rel_data = {
            "source_id": self.NPC_LORD_BLACKWOOD,
            "target_id": self.NPC_LADY_ROSE,
            "relationship_type": "neutral",
            "description": "Will be deleted"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers,
            json=rel_data
        )
        assert create_response.status_code == 201
        rel_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{rel_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        )
        relationships = get_response.json()
        assert not any(r["id"] == rel_id for r in relationships)

    def test_duplicate_relationship_fails(self, auth_headers):
        """Creating duplicate relationship between same NPCs should fail"""
        # Delete any existing relationship first
        existing = requests.get(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers
        ).json()
        
        for rel in existing:
            if (rel["source_id"] == self.NPC_LORD_BLACKWOOD and rel["target_id"] == self.NPC_LADY_ROSE) or \
               (rel["source_id"] == self.NPC_LADY_ROSE and rel["target_id"] == self.NPC_LORD_BLACKWOOD):
                requests.delete(
                    f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{rel['id']}",
                    headers=auth_headers
                )
        
        # Create first relationship
        rel_data = {
            "source_id": self.NPC_LORD_BLACKWOOD,
            "target_id": self.NPC_LADY_ROSE,
            "relationship_type": "ally",
            "description": "First relationship"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers,
            json=rel_data
        )
        assert response1.status_code == 201
        created_id = response1.json()["id"]
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers,
            json=rel_data
        )
        assert response2.status_code == 400  # Should fail
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{created_id}",
            headers=auth_headers
        )

    def test_relationship_with_invalid_npc_fails(self, auth_headers):
        """Creating relationship with non-existent NPC should fail"""
        rel_data = {
            "source_id": str(uuid.uuid4()),  # Non-existent NPC
            "target_id": self.NPC_LADY_ROSE,
            "relationship_type": "ally"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships",
            headers=auth_headers,
            json=rel_data
        )
        assert response.status_code == 404

    def test_relationships_require_auth(self):
        """NPC relationships endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships")
        assert response.status_code in [401, 403]

    def test_delete_nonexistent_relationship_returns_404(self, auth_headers):
        """DELETE non-existent relationship returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/npc-relationships/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
