"""
Backend integration tests for Account Management API
Tests email-based auth, forgot/reset password, and account settings
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data with unique identifiers
def generate_test_email():
    return f"test_{uuid.uuid4().hex[:8]}@test.com"

def generate_test_username():
    return f"TEST_user_{uuid.uuid4().hex[:8]}"


class TestAuthAPI:
    """Test authentication endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = self.session.get(f"{BASE_URL}/")
        assert response.status_code == 200
    
    def test_register_new_user_with_email(self):
        """Test user registration with email"""
        email = generate_test_email()
        username = generate_test_username()
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username,
            "password": "Test123!"
        })
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["username"] == username
        assert data["email"] == email.lower()
    
    def test_register_duplicate_email_fails(self):
        """Test that duplicate email registration fails"""
        email = generate_test_email()
        username1 = generate_test_username()
        username2 = generate_test_username()
        
        # Register first user
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username1,
            "password": "Test123!"
        })
        assert response.status_code == 201
        
        # Try registering with same email
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username2,
            "password": "Test123!"
        })
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    def test_register_duplicate_username_fails(self):
        """Test that duplicate username registration fails"""
        email1 = generate_test_email()
        email2 = generate_test_email()
        username = generate_test_username()
        
        # Register first user
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email1,
            "username": username,
            "password": "Test123!"
        })
        assert response.status_code == 201
        
        # Try registering with same username
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email2,
            "username": username,
            "password": "Test123!"
        })
        assert response.status_code == 400
        assert "Username already taken" in response.json()["detail"]
    
    def test_login_with_email(self):
        """Test login with email and password"""
        email = generate_test_email()
        username = generate_test_username()
        password = "Test123!"
        
        # Register user
        self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username,
            "password": password
        })
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["username"] == username
        assert data["email"] == email.lower()
    
    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        email = generate_test_email()
        username = generate_test_username()
        
        # Register user
        self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username,
            "password": "Test123!"
        })
        
        # Try login with wrong password
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "WrongPassword!"
        })
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_nonexistent_email(self):
        """Test login with nonexistent email returns 401"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "Test123!"
        })
        
        assert response.status_code == 401


class TestForgotPasswordAPI:
    """Test password reset flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_forgot_password_existing_email(self):
        """Test forgot password for existing email returns success message"""
        email = generate_test_email()
        username = generate_test_username()
        
        # Register user
        self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username,
            "password": "Test123!"
        })
        
        # Request password reset
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": email
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "reset link has been sent" in data["message"].lower()
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password for nonexistent email still returns success (security)"""
        response = self.session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        
        # Should still return success to prevent email enumeration
        assert response.status_code == 200
        data = response.json()
        assert "reset link has been sent" in data["message"].lower()
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token fails"""
        response = self.session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_123",
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 400
        assert "Invalid or expired" in response.json()["detail"]


class TestAccountAPI:
    """Test account management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authenticated user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test user and get token
        self.email = generate_test_email()
        self.username = generate_test_username()
        self.password = "Test123!"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "username": self.username,
            "password": self.password
        })
        
        if response.status_code == 201:
            self.token = response.json()["token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to create test user")
    
    def test_get_profile(self):
        """Test getting account profile"""
        response = self.session.get(f"{BASE_URL}/api/account/profile")
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == self.username
        assert data["email"] == self.email.lower()
        assert "password_hash" not in data  # Should not expose password hash
    
    def test_get_profile_unauthenticated(self):
        """Test getting profile without auth fails"""
        unauthenticated_session = requests.Session()
        unauthenticated_session.headers.update({"Content-Type": "application/json"})
        
        response = unauthenticated_session.get(f"{BASE_URL}/api/account/profile")
        assert response.status_code in [401, 403]
    
    def test_update_username(self):
        """Test updating username"""
        new_username = generate_test_username()
        
        response = self.session.put(f"{BASE_URL}/api/account/update", json={
            "username": new_username
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == new_username
        assert "token" in data  # Should return new token
        
        # Verify via GET profile
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        profile_response = self.session.get(f"{BASE_URL}/api/account/profile")
        assert profile_response.json()["username"] == new_username
    
    def test_update_email(self):
        """Test updating email"""
        new_email = generate_test_email()
        
        response = self.session.put(f"{BASE_URL}/api/account/update", json={
            "email": new_email
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == new_email.lower()
        
        # Verify via GET profile
        profile_response = self.session.get(f"{BASE_URL}/api/account/profile")
        assert profile_response.json()["email"] == new_email.lower()
    
    def test_update_to_existing_username_fails(self):
        """Test updating to existing username fails"""
        # Create another user
        other_username = generate_test_username()
        other_session = requests.Session()
        other_session.headers.update({"Content-Type": "application/json"})
        other_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": generate_test_email(),
            "username": other_username,
            "password": "Test123!"
        })
        
        # Try to update to that username
        response = self.session.put(f"{BASE_URL}/api/account/update", json={
            "username": other_username
        })
        
        assert response.status_code == 400
        assert "Username already taken" in response.json()["detail"]
    
    def test_change_password(self):
        """Test changing password"""
        new_password = "NewPassword456!"
        
        response = self.session.post(f"{BASE_URL}/api/account/change-password", json={
            "current_password": self.password,
            "new_password": new_password
        })
        
        assert response.status_code == 200
        assert "Password changed successfully" in response.json()["message"]
        
        # Verify old password no longer works
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        assert login_response.status_code == 401
        
        # Verify new password works
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": new_password
        })
        assert login_response.status_code == 200
    
    def test_change_password_wrong_current(self):
        """Test changing password with wrong current password fails"""
        response = self.session.post(f"{BASE_URL}/api/account/change-password", json={
            "current_password": "WrongPassword!",
            "new_password": "NewPassword456!"
        })
        
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]
    
    def test_delete_account(self):
        """Test deleting account"""
        response = self.session.delete(f"{BASE_URL}/api/account/delete")
        
        assert response.status_code == 200
        assert "Account deleted successfully" in response.json()["message"]
        
        # Verify user can no longer login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        assert login_response.status_code == 401


class TestAuthMeAPI:
    """Test the auth/me endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_me_authenticated(self):
        """Test getting current user info"""
        email = generate_test_email()
        username = generate_test_username()
        
        # Register and get token
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username,
            "password": "Test123!"
        })
        token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get me
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == username
        assert data["email"] == email.lower()
        assert "password_hash" not in data
    
    def test_get_me_unauthenticated(self):
        """Test getting current user without auth fails"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
