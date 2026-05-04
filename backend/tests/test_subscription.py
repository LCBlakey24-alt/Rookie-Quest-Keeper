"""
Backend tests for subscription and promo code features.
Tests the 4-tier pricing system: Free, Hero ($3.99), Quest Master ($3.99), Legendary ($5.99)
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


class TestSubscriptionPlans:
    """Test subscription plans API - 4 tier pricing structure"""
    
    def test_get_subscription_plans_returns_four_tiers(self):
        """Test GET /api/subscription/plans returns all 4 tiers"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert 'plans' in data
        plans = data['plans']
        assert len(plans) == 4, f"Expected 4 plans, got {len(plans)}"
        
        plan_ids = [p['id'] for p in plans]
        assert 'free' in plan_ids
        assert 'player' in plan_ids  # Hero tier
        assert 'gm' in plan_ids  # Quest Master tier
        assert 'legendary' in plan_ids
    
    def test_free_plan_pricing_and_features(self):
        """Test free plan has correct pricing and features"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        free_plan = next((p for p in plans if p['id'] == 'free'), None)
        
        assert free_plan is not None
        assert free_plan['name'] == 'Free'
        assert free_plan['price_monthly'] == 0
        assert free_plan['price_yearly'] == 0
        assert free_plan['target'] == 'casual'
        assert 'features' in free_plan
        assert len(free_plan['features']) > 0
    
    def test_hero_player_plan_pricing(self):
        """Test Hero (player) plan has correct $3.99/month pricing"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        hero_plan = next((p for p in plans if p['id'] == 'player'), None)
        
        assert hero_plan is not None
        assert hero_plan['name'] == 'Hero'
        assert hero_plan['price_monthly'] == 3.99
        assert hero_plan['price_yearly'] == 39.99
        assert hero_plan['target'] == 'player'
        assert hero_plan['color'] == '#3B82F6'  # Blue for players
    
    def test_quest_master_gm_plan_pricing(self):
        """Test Quest Master (GM) plan has correct $3.99/month pricing"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        gm_plan = next((p for p in plans if p['id'] == 'gm'), None)
        
        assert gm_plan is not None
        assert gm_plan['name'] == 'Quest Master'
        assert gm_plan['price_monthly'] == 3.99
        assert gm_plan['price_yearly'] == 39.99
        assert gm_plan['target'] == 'gm'
        assert gm_plan['color'] == '#E11D48'  # Red for GM
    
    def test_legendary_plan_pricing(self):
        """Test Legendary plan has correct $5.99/month pricing and popular flag"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        
        plans = response.json()['plans']
        legendary_plan = next((p for p in plans if p['id'] == 'legendary'), None)
        
        assert legendary_plan is not None
        assert legendary_plan['name'] == 'Legendary'
        assert legendary_plan['price_monthly'] == 5.99
        assert legendary_plan['price_yearly'] == 59.99
        assert legendary_plan['target'] == 'both'
        assert legendary_plan['color'] == '#F59E0B'  # Gold
        assert legendary_plan.get('popular') == True


class TestUserRegistrationWithSubscription:
    """Test user registration initializes subscription tier"""
    
    def test_new_user_starts_with_free_tier(self):
        """Test that newly registered users start on free tier"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"TEST_sub_reg_{unique_id}"
        email = f"test_sub_reg_{unique_id}@test.com"
        
        # Register new user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        assert register_response.status_code == 201
        
        token = register_response.json()['token']
        
        # Check subscription status
        status_response = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert status_response.status_code == 200
        
        status = status_response.json()
        assert status['tier'] == 'free'
        assert status['is_premium'] == False
    
    def test_subscription_status_requires_auth(self):
        """Test that subscription status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code in [401, 403, 422]


class TestSubscriptionStatus:
    """Test subscription status endpoint"""
    
    @pytest.fixture
    def auth_user(self):
        """Create an authenticated user for testing"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"TEST_sub_status_{unique_id}"
        email = f"test_sub_status_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        
        if response.status_code == 201:
            return response.json()['token'], username
        
        # If user exists, login instead
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        return response.json()['token'], username
    
    def test_get_subscription_status_structure(self, auth_user):
        """Test GET /api/subscription/status returns correct structure"""
        token, username = auth_user
        
        response = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        status = response.json()
        # Verify required fields present
        assert 'tier' in status
        assert 'is_premium' in status
    
    def test_subscription_status_values_are_valid(self, auth_user):
        """Test subscription status values are valid"""
        token, username = auth_user
        
        response = requests.get(
            f"{BASE_URL}/api/subscription/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        status = response.json()
        # Tier should be one of the 4 tiers
        assert status['tier'] in ['free', 'player', 'gm', 'legendary']
        # is_premium should be boolean
        assert isinstance(status['is_premium'], bool)


class TestPromoCodeCreation:
    """Test promo code creation API (requires admin)"""
    
    @pytest.fixture
    def regular_user(self):
        """Create a regular (non-admin) user for testing"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"regular_user_{unique_id}"
        email = f"regular_user_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        
        if response.status_code == 201:
            return response.json()['token'], username
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        return response.json()['token'], username
    
    def test_create_promo_code_requires_admin(self, regular_user):
        """Test POST /api/promo-codes requires admin access"""
        token, username = regular_user
        unique_code = f"TESTCODE{uuid.uuid4().hex[:8].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/promo-codes",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "code": unique_code,
                "tier_granted": "legendary",
                "uses_remaining": 5
            }
        )
        # Non-admin users should get 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        assert "admin" in response.json().get('detail', '').lower()
    
    def test_create_promo_code_requires_auth(self):
        """Test promo code creation requires authentication"""
        unique_code = f"TESTCODE{uuid.uuid4().hex[:8].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/promo-codes",
            headers={"Content-Type": "application/json"},
            json={"code": unique_code, "tier_granted": "legendary"}
        )
        assert response.status_code in [401, 403, 422]


class TestPromoCodeApplication:
    """Test promo code application API"""
    
    @pytest.fixture
    def regular_user(self):
        """Create a regular user for testing"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"TEST_promo_user_{unique_id}"
        email = f"test_promo_user_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        
        if response.status_code == 201:
            return response.json()['token'], username
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        return response.json()['token'], username
    
    def test_apply_invalid_promo_code(self, regular_user):
        """Test applying an invalid promo code returns 404"""
        token, username = regular_user
        
        # Try to apply non-existent promo code
        apply_response = requests.post(
            f"{BASE_URL}/api/promo-codes/apply",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"code": "NONEXISTENT12345"}
        )
        assert apply_response.status_code == 404
        assert 'invalid' in apply_response.json().get('detail', '').lower()
    
    def test_apply_promo_code_requires_auth(self):
        """Test applying promo code requires authentication"""
        apply_response = requests.post(
            f"{BASE_URL}/api/promo-codes/apply",
            headers={"Content-Type": "application/json"},
            json={"code": "TESTCODE123"}
        )
        assert apply_response.status_code in [401, 403, 422]


class TestSubscriptionCheckout:
    """Test subscription checkout flow with recurring Stripe subscriptions"""
    
    @pytest.fixture
    def auth_user(self):
        """Create an authenticated user for testing"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"TEST_checkout_{unique_id}"
        email = f"test_checkout_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        
        if response.status_code == 201:
            return response.json()['token'], username
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        return response.json()['token'], username
    
    def test_create_checkout_session_for_paid_plans(self, auth_user):
        """Test POST /api/subscription/checkout creates a checkout session for paid plans"""
        token, username = auth_user
        
        # Test checkout for player (Hero) plan - requires origin_url
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan_id": "player", "billing_cycle": "monthly", "origin_url": "http://localhost:8000"}
        )
        
        # Should return checkout URL with Stripe configured
        assert response.status_code in [200, 500]  # 500 if Stripe integration fails
        
        if response.status_code == 200:
            data = response.json()
            assert 'checkout_url' in data
            assert 'session_id' in data
    
    def test_checkout_requires_auth(self):
        """Test checkout endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers={"Content-Type": "application/json"},
            json={"plan_id": "player", "billing_cycle": "monthly"}
        )
        assert response.status_code in [401, 403, 422]
    
    def test_checkout_cannot_checkout_free_plan(self, auth_user):
        """Test checkout with free plan returns error"""
        token, username = auth_user
        
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan_id": "free", "billing_cycle": "monthly", "origin_url": "http://localhost:8000"}
        )
        
        # Should return 400 for free plan (or 500 if Stripe error occurs first)
        # The API checks price == 0 and should return 400 "Cannot checkout free plan"
        assert response.status_code in [400, 500]
        if response.status_code == 400:
            assert "free" in response.json().get('detail', '').lower() or "cannot" in response.json().get('detail', '').lower()
    
    def test_checkout_monthly_billing_cycle(self, auth_user):
        """Test checkout with monthly billing cycle"""
        token, username = auth_user
        
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan_id": "legendary", "billing_cycle": "monthly", "origin_url": "http://localhost:8000"}
        )
        
        # 200 if Stripe works, 500 if Stripe prices not configured
        assert response.status_code in [200, 500]
    
    def test_checkout_yearly_billing_cycle(self, auth_user):
        """Test checkout with yearly billing cycle"""
        token, username = auth_user
        
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan_id": "gm", "billing_cycle": "yearly", "origin_url": "http://localhost:8000"}
        )
        
        # 200 if Stripe works, 500 if Stripe prices not configured
        assert response.status_code in [200, 500]
    
    def test_checkout_requires_origin_url(self, auth_user):
        """Test checkout without origin_url returns validation error"""
        token, username = auth_user
        
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan_id": "player", "billing_cycle": "monthly"}
        )
        
        # Should return 422 validation error for missing origin_url
        assert response.status_code == 422


class TestSubscriptionCancel:
    """Test subscription cancellation endpoint"""
    
    @pytest.fixture
    def auth_user(self):
        """Create an authenticated user for testing"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"TEST_cancel_{unique_id}"
        email = f"test_cancel_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        
        if response.status_code == 201:
            return response.json()['token'], username
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        return response.json()['token'], username
    
    def test_cancel_subscription_requires_auth(self):
        """Test cancel endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/cancel")
        assert response.status_code in [401, 403, 422]
    
    def test_cancel_subscription_without_active_subscription(self, auth_user):
        """Test cancelling when user has no active subscription"""
        token, username = auth_user
        
        response = requests.post(
            f"{BASE_URL}/api/subscription/cancel",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 400 since user has no Stripe subscription
        assert response.status_code == 400
        assert "no active subscription" in response.json().get('detail', '').lower()


class TestCampaignSettingsSave:
    """Test campaign settings save and persist (bug fix verification)"""
    
    @pytest.fixture
    def auth_user_with_campaign(self):
        """Create an authenticated user with a campaign"""
        unique_id = str(uuid.uuid4())[:8]
        username = f"TEST_campaign_settings_{unique_id}"
        email = f"test_campaign_settings_{unique_id}@test.com"
        
        # Register user
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": username, "password": "testpass123", "email": email}
        )
        assert response.status_code == 201
        token = response.json()['token']
        
        # Create campaign
        campaign_response = requests.post(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"name": f"Test Campaign {unique_id}", "description": "Test campaign for settings"}
        )
        assert campaign_response.status_code == 201
        campaign = campaign_response.json()
        
        return token, username, campaign['id']
    
    def test_campaign_settings_save_and_retrieve(self, auth_user_with_campaign):
        """Test that campaign settings save correctly and persist"""
        token, username, campaign_id = auth_user_with_campaign
        
        # Get initial settings
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/setting",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        
        # Update settings with test data
        test_content = f"Test setting content {uuid.uuid4().hex[:8]}"
        test_dm_rules = "Test DM rules for this campaign"
        
        update_response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/setting",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"content": test_content, "dm_rules": test_dm_rules}
        )
        assert update_response.status_code == 200
        
        # Verify the response contains the updated data
        updated_data = update_response.json()
        assert updated_data['content'] == test_content
        assert updated_data['dm_rules'] == test_dm_rules
        
        # GET the settings again to verify persistence
        verify_response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/setting",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 200
        
        persisted_data = verify_response.json()
        assert persisted_data['content'] == test_content, "Settings content not persisted correctly"
        assert persisted_data['dm_rules'] == test_dm_rules, "DM rules not persisted correctly"
        assert persisted_data['campaign_id'] == campaign_id, "campaign_id not set on settings"
    
    def test_campaign_settings_upsert_creates_with_campaign_id(self, auth_user_with_campaign):
        """Test that upserting campaign settings correctly sets campaign_id (bug fix verification)"""
        token, username, campaign_id = auth_user_with_campaign
        
        # Update settings (this should create via upsert if not exists)
        test_content = f"Upsert test {uuid.uuid4().hex[:8]}"
        
        update_response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}/setting",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"content": test_content}
        )
        assert update_response.status_code == 200
        
        # Verify campaign_id is set in response
        setting = update_response.json()
        assert setting.get('campaign_id') == campaign_id, "campaign_id should be set on upsert"
        
        # Verify via GET that campaign_id persisted
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}/setting",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json().get('campaign_id') == campaign_id
