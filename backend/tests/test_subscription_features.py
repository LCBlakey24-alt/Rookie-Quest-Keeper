"""
Tests for new subscription features:
- Dashboard subscription tier badge with campaign limits
- Campaign creation limit check before showing modal
- Verify campaigns_limit field in subscription status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test credentials for admin/legendary user
TEST_USER = {
    'email': 'lcblakey24@outlook.com',
    'password': 'LCBlakey24?!'
}


@pytest.fixture
def auth_token():
    """Get authentication token for test user with legendary tier"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER['email'], "password": TEST_USER['password']}
    )
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping tests")
    return response.json()["token"]


class TestSubscriptionStatusCampaignsLimit:
    """Test subscription status includes campaigns_limit field"""
    
    def test_subscription_status_has_campaigns_limit(self, auth_token):
        """Test GET /api/subscription/status returns campaigns_limit"""
        response = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        status = response.json()
        # Verify campaigns_limit field exists
        assert 'campaigns_limit' in status, "campaigns_limit field should be in subscription status"
        
        # For legendary tier it should be -1 (unlimited)
        assert status['campaigns_limit'] == -1, f"Legendary tier should have campaigns_limit=-1, got {status['campaigns_limit']}"
    
    def test_subscription_status_has_tier_name(self, auth_token):
        """Test GET /api/subscription/status returns tier_name"""
        response = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        status = response.json()
        # Verify tier_name field exists
        assert 'tier_name' in status, "tier_name field should be in subscription status"
        assert status['tier_name'] == 'Legendary', f"Expected tier_name='Legendary', got {status['tier_name']}"
    
    def test_subscription_status_complete_structure(self, auth_token):
        """Test subscription status returns all required fields for dashboard badge"""
        response = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        status = response.json()
        
        # Required fields for dashboard tier badge
        required_fields = ['tier', 'tier_name', 'campaigns_limit', 'is_premium', 'subscription_status']
        for field in required_fields:
            assert field in status, f"Missing required field: {field}"


class TestCampaignLimits:
    """Test campaign creation limit enforcement"""
    
    def test_legendary_user_can_create_campaigns(self, auth_token):
        """Test legendary user can create campaigns (unlimited)"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"name": f"TEST_LegendaryCampaign_{unique_id}", "description": "Test campaign for limit check"}
        )
        
        # Legendary tier should be able to create campaigns
        assert response.status_code == 201, f"Legendary tier should create campaigns, got {response.status_code}: {response.text}"
        
        # Cleanup
        campaign = response.json()
        requests.delete(
            f"{BASE_URL}/api/campaigns/{campaign['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestSubscriptionPlansStructure:
    """Verify subscription plans have correct limits - check via features text"""
    
    def test_free_tier_features_mention_no_campaigns(self):
        """Test free tier features mention no campaign creation"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        free_plan = next((p for p in plans if p['id'] == 'free'), None)
        
        assert free_plan is not None
        features_text = ' '.join(free_plan.get('features', []))
        assert "can't create" in features_text.lower() or "join campaigns" in features_text.lower(), \
            "Free tier should mention can't create campaigns"
    
    def test_player_tier_is_for_players_not_gm(self):
        """Test player (Hero) tier target is player"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        player_plan = next((p for p in plans if p['id'] == 'player'), None)
        
        assert player_plan is not None
        assert player_plan.get('target') == 'player', "Player tier target should be 'player'"
    
    def test_gm_tier_is_for_gm(self):
        """Test GM (Quest Master) tier target is gm"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        gm_plan = next((p for p in plans if p['id'] == 'gm'), None)
        
        assert gm_plan is not None
        assert gm_plan.get('target') == 'gm', "GM tier target should be 'gm'"
        features_text = ' '.join(gm_plan.get('features', []))
        assert "unlimited campaigns" in features_text.lower(), "GM tier should mention unlimited campaigns"
    
    def test_legendary_tier_is_for_both(self):
        """Test Legendary tier target is both"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        legendary_plan = next((p for p in plans if p['id'] == 'legendary'), None)
        
        assert legendary_plan is not None
        assert legendary_plan.get('target') == 'both', "Legendary tier target should be 'both'"
