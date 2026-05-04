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
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT
JWT_SECRET = require_env('JWT_SECRET_KEY')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))
security = HTTPBearer()

# App / CORS
APP_URL = require_env('APP_URL')
CORS_ORIGINS = require_env('CORS_ORIGINS')

# Email
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@rookiequestkeeper.com')

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_ENABLED = bool(STRIPE_API_KEY)

# Admin
ADMIN_USERNAMES = ["lcblakey24"]

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
HIT_DICE = {
    'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
    'Bard': 8, 'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Warlock': 8,
    'Sorcerer': 6, 'Wizard': 6
}

def get_subclass_unlock_level(class_name: str, edition: str = "2014") -> int:
    if edition == "2024":
        return SUBCLASS_LEVELS_2024.get(class_name, 3)
    return SUBCLASS_LEVELS_2014.get(class_name, 3)
