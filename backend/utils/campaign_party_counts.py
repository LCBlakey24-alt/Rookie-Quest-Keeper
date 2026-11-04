"""Campaign-card character counts include GM-owned sheets, without fabricating player accounts."""
import asyncio


def _name_key(name):
    return " ".join(str(name or "").casefold().split())


def calculate_character_counts(campaign_ids, members, sheets, legacy_players):
    """Count unique campaign characters; preserve separate real membership counts."""
    counted = {cid: set() for cid in campaign_ids}
    sheet_names = {cid: set() for cid in campaign_ids}

    for member in members:
        cid = member.get('campaign_id')
        character_id = member.get('character_id')
        if cid in counted and character_id and str(member.get('status') or 'active').lower() != 'removed':
            counted[cid].add(('character', str(character_id)))

    for character in sheets:
        cid = character.get('campaign_id')
        if cid not in counted:
            continue
        identifier = character.get('id') or character.get('name')
        if identifier:
            counted[cid].add(('character', str(identifier)))
        name = _name_key(character.get('name') or character.get('character_name'))
        if name:
            sheet_names[cid].add(name)

    for player in legacy_players:
        cid = player.get('campaign_id')
        if cid not in counted:
            continue
        name = _name_key(player.get('name') or player.get('character_name'))
        if name and name in sheet_names[cid]:
            continue  # Legacy GM roster row already represented by an actual sheet.
        identifier = player.get('id') or name
        if identifier:
            counted[cid].add(('legacy', str(identifier)))

    return {cid: len(rows) for cid, rows in counted.items()}


async def count_campaign_characters(database, campaign_ids, members):
    """Two batched small projections, independent of number of campaign cards."""
    if not campaign_ids:
        return {}
    query = {'campaign_id': {'$in': campaign_ids}}
    sheets, legacy = await asyncio.gather(
        database.player_characters.find(
            query, {'_id': 0, 'campaign_id': 1, 'id': 1, 'name': 1, 'character_name': 1}
        ).to_list(5000),
        database.players.find(
            query, {'_id': 0, 'campaign_id': 1, 'id': 1, 'name': 1, 'character_name': 1}
        ).to_list(5000),
    )
    return calculate_character_counts(campaign_ids, members, sheets, legacy)
