"""
Pytest configuration for backend tests
"""
import pytest
import requests
import os

# Set BASE_URL for all tests - use localhost for local testing against the running backend
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def base_url():
    """Base URL for API calls"""
    return BASE_URL
