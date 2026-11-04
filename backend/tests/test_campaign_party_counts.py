"""Campaign library must report GM-managed characters even without joined accounts."""
from utils.campaign_party_counts import calculate_character_counts


def test_wednesday_three_sheets_and_duplicate_legacy_rows_count_as_three():
    cid = "spilsby-wednesday"
    sheets = [
        {'campaign_id': cid, 'id': 'sheet-rina', 'name': 'Rina Ironside'},
        {'campaign_id': cid, 'id': 'sheet-orren', 'name': 'Orren Oakenshade'},
        {'campaign_id': cid, 'id': 'sheet-josh', 'name': 'Josh'},
    ]
    legacy = [
        {'campaign_id': cid, 'id': 'legacy-rina', 'name': 'Rina Ironside'},
        {'campaign_id': cid, 'id': 'legacy-orren', 'name': 'Orren Oakenshade'},
    ]
    assert calculate_character_counts([cid], [], sheets, legacy)[cid] == 3


def test_player_membership_and_legacy_roster_deduplicated_without_hiding_characters():
    cid = 'campaign'
    members = [{'campaign_id': cid, 'character_id': 's-1', 'status': 'active'}]
    sheets = [{'campaign_id': cid, 'id': 's-1', 'name': 'First'}]
    legacy = [
        {'campaign_id': cid, 'id': 'legacy-first', 'name': 'first'},
        {'campaign_id': cid, 'id': 'legacy-second', 'name': 'Second'},
    ]
    assert calculate_character_counts([cid], members, sheets, legacy)[cid] == 2


def test_removed_members_do_not_create_phantom_characters():
    cid = 'campaign'
    members = [{'campaign_id': cid, 'character_id': 'old', 'status': 'removed'}]
    assert calculate_character_counts([cid], members, [], [])[cid] == 0
