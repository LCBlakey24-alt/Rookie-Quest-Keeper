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



def pytest_addoption(parser):
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="run tests marked as integration",
    )


def pytest_collection_modifyitems(config, items):
    if config.getoption("--run-integration"):
        return

    skip_integration = pytest.mark.skip(reason="need --run-integration option to run")
    for item in items:
        module_file = getattr(getattr(item, "module", None), "__file__", "") or ""
        module_text = ""
        if module_file:
            try:
                with open(module_file, "r", encoding="utf-8") as handle:
                    module_text = handle.read(2000)
            except OSError:
                module_text = ""

        # Older smoke suites use the real requests library and require a live
        # backend URL/seeded data. Treat them as integration tests by default so
        # the local unit run stays deterministic.
        if "integration" in item.keywords or "requests" in module_text:
            item.add_marker(skip_integration)
