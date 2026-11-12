"""A player in a campaign sees only the GM rules content shared with that campaign.

/player/rules/options used to return every document the GM owned in the rules
collections, so a player could read the GM's private homebrew and content made
for the GM's other campaigns.
"""
import asyncio
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routes.player_rules as player_rules  # noqa: E402
from routes.player_rules import shared_with_player  # noqa: E402

PLAYER, GM, CAMPAIGN, OTHER = 'player', 'gm', 'camp-1', 'camp-2'


@pytest.mark.parametrize('doc, expected', [
    ({'user_id': PLAYER, 'visibility': 'private'}, True),
    ({'user_id': GM, 'visibility': 'public'}, True),
    ({'user_id': GM, 'visibility': 'campaign', 'campaign_id': CAMPAIGN}, True),
    ({'user_id': GM, 'visibility': 'campaign', 'campaign_id': OTHER}, False),
    ({'user_id': GM, 'visibility': 'private'}, False),
    ({'user_id': GM, 'visibility': 'private', 'campaign_id': CAMPAIGN}, False),
    ({'user_id': GM, 'visibility': 'shared_copy'}, False),
    ({'user_id': GM}, True),  # older ruleset upload, made to share with players
    ({'user_id': GM, 'campaign_id': OTHER}, False),
])
def test_sharing_rule(doc, expected):
    assert shared_with_player(doc, PLAYER, CAMPAIGN) is expected


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit):
        return [dict(doc) for doc in self.docs]


class _Collection:
    def __init__(self, docs):
        self.docs = docs

    def find(self, query, _projection=None):
        owners = set(query.get('user_id', {}).get('$in', []))
        edition = query.get('edition')
        return _Cursor([d for d in self.docs if d.get('user_id') in owners and (not edition or d.get('edition') == edition)])


class _Db(dict):
    def __getitem__(self, name):
        return self.setdefault(name, _Collection([]))


def test_endpoint_hides_private_and_other_campaign_gm_content(monkeypatch):
    fake = _Db()
    fake['user_races'] = _Collection([
        {'id': 'r1', 'user_id': GM, 'name': 'Shared Here', 'visibility': 'campaign', 'campaign_id': CAMPAIGN, 'ruleset_id': 'rs-shared'},
        {'id': 'r2', 'user_id': GM, 'name': 'Secret Race', 'visibility': 'private', 'ruleset_id': 'rs-private'},
        {'id': 'r3', 'user_id': GM, 'name': 'Other Table Race', 'visibility': 'campaign', 'campaign_id': OTHER, 'ruleset_id': 'rs-private'},
        {'id': 'r4', 'user_id': PLAYER, 'name': 'My Own Race', 'visibility': 'private'},
    ])
    fake['user_rulesets'] = _Collection([
        {'id': 'rs-shared', 'user_id': GM, 'name': 'Shared Book'},
        {'id': 'rs-private', 'user_id': GM, 'name': 'GM Private Notes'},
    ])
    monkeypatch.setattr(player_rules, 'db', fake)

    async def membership(campaign_id, username):
        return {'id': campaign_id, 'dm_user_id': GM, 'name': 'Table'}
    monkeypatch.setattr(player_rules, 'verify_campaign_membership', membership)

    out = asyncio.run(player_rules.get_player_rules_options(edition=None, campaign_id=CAMPAIGN, username=PLAYER))
    assert sorted(race['name'] for race in out['races']) == ['My Own Race', 'Shared Here']
    assert [ruleset['name'] for ruleset in out['rulesets']] == ['Shared Book']
