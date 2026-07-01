import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.campaign_invites import router


def route_endpoint(path, method):
    for route in router.routes:
        if method in getattr(route, 'methods', set()) and getattr(route, 'path', '') == path:
            return route.endpoint.__name__
    return ''


def test_join_routes_are_registered_before_dynamic_campaign_invite_routes():
    route_order = [getattr(route, 'path', '') for route in router.routes]

    assert route_endpoint('/campaign-invites/join', 'POST') == 'join_campaign_by_code'
    assert route_endpoint('/campaign-invites/joined/list', 'GET') == 'get_joined_campaigns'
    assert route_order.index('/campaign-invites/join') < route_order.index('/campaign-invites/{campaign_id}')
    assert route_order.index('/campaign-invites/joined/list') < route_order.index('/campaign-invites/{campaign_id}')
