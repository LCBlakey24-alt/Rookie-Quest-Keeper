"""Four endpoints in campaigns.py identify the caller the wrong way.

get_current_user returns a USERNAME (the JWT subject, looked up as
{'username': ...}). verify_campaign_ownership matches campaigns on
dm_user_id == username. But these four look the caller up with
{'email': username}, and then compare campaign.dm_user_id against
str(user['_id']).

Both translations are wrong, so the endpoints cannot succeed: the lookup
returns nothing and raises 404, and on the rare account whose email equals
their username the GM check then compares a username against a Mongo id and
raises 403.

share-rulesets has a third mismatch on top. custom_rulesets.shared_with is
READ in rule_systems.py as str(user['_id']), but share-rulesets WRITES
campaign_members.user_id into it, which is a username. Fixing only the
lookup would still share nothing with anybody.

It also takes every member row regardless of status, so a pending applicant
or a removed player would be handed the GM's private rule set.

These routes are not reachable from the current interface -- the UI uses
/campaign-invites/* throughout -- so this is correctness and latent exposure
rather than a live outage. The translations still have to be right before
anything is wired to them.
"""

import os
import re
import sys

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from utils.ruleset_sharing import account_ids_for_usernames, active_member_usernames  # noqa: E402


def route_source():
    with open(os.path.join(BACKEND, 'routes', 'campaigns.py'), encoding='utf-8') as handle:
        return re.sub(r'^\s*#.*$', '', handle.read(), flags=re.M)


def body_of(decorator_fragment):
    """The source of one route handler, decorator to the next decorator."""
    source = route_source()
    start = source.find(decorator_fragment)
    assert start != -1, f'route not found: {decorator_fragment}'
    nxt = source.find('\n@router.', start + len(decorator_fragment))
    return source[start:nxt if nxt != -1 else len(source)]


ROUTES = [
    '@router.post("/campaigns/{campaign_id}/invite")',
    '@router.post("/campaigns/join/{invite_code}")',
    '@router.post("/campaigns/{campaign_id}/share-rulesets")',
    '@router.post("/rulesets/upload-file")',
]


def test_the_caller_is_never_looked_up_by_email():
    # username is a username. Looking it up in the email field finds nobody.
    assert 'find_one({"email": username})' not in route_source()


def test_every_affected_route_resolves_the_caller_by_username():
    for route in ROUTES:
        body = body_of(route)
        assert 'db.users.find_one({"username": username})' in body, route


def test_gm_ownership_is_checked_against_the_username():
    # campaigns.dm_user_id holds the username; see utils/auth.py
    # verify_campaign_ownership.
    for route in ['@router.post("/campaigns/{campaign_id}/invite")',
                  '@router.post("/campaigns/{campaign_id}/share-rulesets")']:
        body = body_of(route)
        assert 'dm_user_id") != str(user.get("_id"))' not in body, route
        assert 'dm_user_id") != username' in body, route


def test_the_route_no_longer_builds_the_share_list_by_hand():
    body = body_of('@router.post("/campaigns/{campaign_id}/share-rulesets")')
    # The raw list comprehension stored usernames in a field read as ids, and
    # raised on a membership row that had no user_id at all.
    assert 'member_ids = [m["user_id"] for m in members]' not in body
    assert 'm["user_id"]' not in body
    assert 'account_ids_for_usernames' in body
    assert 'ACTIVE_MEMBER_QUERY' in body
    # Both the rule set grant and the member write are filtered.
    assert body.count('ACTIVE_MEMBER_QUERY') >= 2


# --- what the translation actually does -----------------------------------

class _Users:
    def __init__(self, rows):
        self._rows = rows

    def find(self, query, _projection=None):
        wanted = set(query.get('username', {}).get('$in', []))
        rows = [row for row in self._rows if row.get('username') in wanted]

        class _Cursor:
            async def to_list(self, _limit):
                return rows
        return _Cursor()


class _Db:
    def __init__(self, rows):
        self.users = _Users(rows)


ACCOUNTS = [
    {'_id': 'objid-lewis', 'username': 'lewis'},
    {'_id': 'objid-rina', 'username': 'rina'},
    {'_id': 'objid-orren', 'username': 'orren'},
]


def test_only_approved_members_are_offered_the_rule_set():
    members = [
        {'user_id': 'rina', 'status': 'active'},
        {'user_id': 'orren'},                        # legacy row, no status
        {'user_id': 'mallory', 'status': 'pending'},  # applied, not approved
        {'user_id': 'gone', 'status': 'removed'},     # shown the door
    ]
    assert active_member_usernames(members) == ['rina', 'orren']


def test_a_membership_row_with_no_user_id_costs_only_that_row():
    members = [{'status': 'active'}, {'user_id': 'rina', 'status': 'active'}, None, 'nonsense']
    assert active_member_usernames(members) == ['rina']


def test_the_same_person_twice_is_offered_it_once():
    members = [{'user_id': 'rina', 'status': 'active'}, {'user_id': 'rina'}]
    assert active_member_usernames(members) == ['rina']


def test_usernames_become_the_account_ids_that_sharing_is_read_by():
    import asyncio
    ids = asyncio.run(account_ids_for_usernames(_Db(ACCOUNTS), ['rina', 'orren']))
    # rule_systems.py lists shared rule sets with
    # db.custom_rulesets.find({"shared_with": str(user["_id"])}).
    assert ids == ['objid-rina', 'objid-orren']
    assert 'rina' not in ids


def test_a_member_whose_account_is_gone_is_dropped_not_fatal():
    import asyncio
    ids = asyncio.run(account_ids_for_usernames(_Db(ACCOUNTS), ['rina', 'deleted-person']))
    assert ids == ['objid-rina']


def test_no_members_means_no_lookup_and_no_share_list():
    import asyncio
    assert asyncio.run(account_ids_for_usernames(_Db(ACCOUNTS), [])) == []


def test_ruleset_owner_id_still_uses_the_account_id():
    """Not everything here was wrong: rulesets really are owned by _id."""
    for route in ['@router.post("/campaigns/{campaign_id}/share-rulesets")',
                  '@router.post("/rulesets/upload-file")']:
        assert 'str(user.get("_id"))' in body_of(route), route


def test_rule_systems_is_left_alone_because_it_is_already_consistent():
    with open(os.path.join(BACKEND, 'routes', 'rule_systems.py'), encoding='utf-8') as handle:
        source = handle.read()
    assert 'find_one({"email": username})' not in source
    assert source.count('db.users.find_one({"username": username})') >= 6
