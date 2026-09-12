import os
import sys
import unittest
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


class CampaignInviteRouteRegistrationTests(unittest.TestCase):
    def test_player_join_and_leave_routes_are_registered_before_dynamic_campaign_invite_routes(self):
        route_order = [getattr(route, 'path', '') for route in router.routes]

        self.assertEqual(route_endpoint('/campaign-invites/join', 'POST'), 'join_campaign_by_code')
        self.assertEqual(route_endpoint('/campaign-invites/joined/list', 'GET'), 'get_joined_campaigns')
        self.assertEqual(route_endpoint('/campaign-invites/{campaign_id}/membership', 'DELETE'), 'leave_campaign')
        self.assertLess(route_order.index('/campaign-invites/join'), route_order.index('/campaign-invites/{campaign_id}'))
        self.assertLess(route_order.index('/campaign-invites/joined/list'), route_order.index('/campaign-invites/{campaign_id}'))
        self.assertLess(route_order.index('/campaign-invites/{campaign_id}/membership'), route_order.index('/campaign-invites/{campaign_id}'))


if __name__ == '__main__':
    unittest.main()
