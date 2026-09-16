"""Shared configuration, database, and constants for the ROOK backend."""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.security import HTTPBearer

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('rook')


def require_env(name: str) -> str:
    """Return a required environment variable or fail loudly on startup."""
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


# MongoDB
mongo_url = require_env('MONGO_URL')
db_name = require_env('DB_NAME')


class _LazyMongoState:
    """Create Motor/PyMongo objects only when a database operation needs them.

    PyMongo resolves mongodb+srv DNS records while constructing MongoClient.
    Doing that at module import means a paused/unavailable Atlas cluster can
    prevent FastAPI from starting at all. Deferring construction keeps health
    and public service-status routes available while database operations still
    fail normally until Atlas is reachable again.
    """

    def __init__(self, url: str, name: str):
        self.url = url
        self.name = name
        self._client = None
        self._db = None

    def get_client(self):
        if self._client is None:
            self._client = AsyncIOMotorClient(self.url)
        return self._client

    def get_db(self):
        if self._db is None:
            self._db = self.get_client()[self.name]
        return self._db

    def close(self):
        if self._client is not None:
            self._client.close()


class _LazyMongoClient:
    def __init__(self, state: _LazyMongoState):
        self._state = state

    def __getattr__(self, name):
        return getattr(self._state.get_client(), name)

    def close(self):
        self._state.close()


class _LazyMongoDatabase:
    def __init__(self, state: _LazyMongoState):
        self._state = state

    def __getattr__(self, name):
        return getattr(self._state.get_db(), name)

    def __getitem__(self, name):
        return self._state.get_db()[name]


_mongo_state = _LazyMongoState(mongo_url, db_name)
client = _LazyMongoClient(_mongo_state)
db = _LazyMongoDatabase(_mongo_state)

# JWT
JWT_SECRET = require_env('JWT_SECRET_KEY')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))
security = HTTPBearer()

# App / CORS
APP_URL = require_env('APP_URL')
CORS_ORIGINS = require_env('CORS_ORIGINS')
CORS_ORIGIN_LIST = [origin.strip() for origin in CORS_ORIGINS.split(',') if origin.strip()]
if not CORS_ORIGIN_LIST or '*' in CORS_ORIGIN_LIST:
    raise RuntimeError("CORS_ORIGINS must list explicit trusted origins; wildcard origins are not allowed.")

# Email
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@rookiequestkeeper.com')

# Admin
ADMIN_USERNAMES = [name.strip().lower() for name in os.environ.get('ADMIN_USERNAMES', 'lcblakey24').split(',') if name.strip()]

# AI usage limits (monthly per-user cap; 0 = unlimited)
AI_MONTHLY_LIMIT = int(os.environ.get('AI_MONTHLY_LIMIT', '0'))
RESERVED_USERNAMES = sorted(set(ADMIN_USERNAMES + [
    'admin',
    'administrator',
    'rookiequestadmin',
    'criticalfusion',
]))

# D&D Constants
SUBCLASS_LEVELS_2014 = {
    'Barbarian': 3, 'Bard': 3, 'Cleric': 1, 'Druid': 2, 'Fighter': 3,
    'Monk': 3, 'Paladin': 3, 'Ranger': 3, 'Rogue': 3, 'Sorcerer': 1,
    'Warlock': 1, 'Wizard': 2
}
SUBCLASS_LEVELS_2024 = {
    'Barbarian': 3, 'Bard': 3, 'Cleric': 3, 'Druid': 3, 'Fighter': 3,
    'Monk': 3, 'Paladin': 3, 'Ranger': 3, 'Rogue': 3, 'Sorcerer': 3,
    'Warlock': 3, 'Wizard': 3
}
HOMEBREW_SUBCLASS_UNLOCK_LEVEL = int(os.environ.get('HOMEBREW_SUBCLASS_UNLOCK_LEVEL', '1'))
HIT_DICE = {
    'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
    'Bard': 8, 'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Warlock': 8,
    'Sorcerer': 6, 'Wizard': 6
}


def get_subclass_unlock_level(class_name: str, edition: str = "2014") -> int:
    """Return subclass unlock level, keeping standard classes strict and custom classes flexible."""
    if edition == "2024":
        return SUBCLASS_LEVELS_2024.get(class_name, HOMEBREW_SUBCLASS_UNLOCK_LEVEL)
    return SUBCLASS_LEVELS_2014.get(class_name, HOMEBREW_SUBCLASS_UNLOCK_LEVEL)
