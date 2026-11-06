"""Working out who may receive a GM's private rule set, and under which name.

Three different identities meet in this one operation and they are not
interchangeable:

  * get_current_user returns a USERNAME, the JWT subject.
  * campaigns.dm_user_id and campaign_members.user_id are usernames too.
  * custom_rulesets.owner_id and custom_rulesets.shared_with are the Mongo
    account id as a string -- that is how rule_systems.py writes them when a
    rule set is created and how it reads them back when listing what has been
    shared with someone.

So a share has to translate member usernames into account ids on the way in.
Writing usernames into shared_with stores something no reader looks for, and
the rule set silently reaches nobody.

Membership is filtered the same way the live party is: a row counts when its
status is active, or absent on a legacy row. A pending applicant has not been
approved and a removed player has been shown the door; neither should be
handed the GM's private content.
"""

ACTIVE_MEMBER_QUERY = {"$in": ["active", None]}


def active_member_usernames(members):
    """Usernames of the members who may receive shared content.

    Rows without a user_id are skipped rather than raising: a half-written
    membership should cost that one row, not the whole share.
    """
    seen = []
    for member in members or []:
        if not isinstance(member, dict):
            continue
        status = member.get("status")
        if status is not None and str(status).strip().lower() != "active":
            continue
        username = str(member.get("user_id") or member.get("username") or "").strip()
        if username and username not in seen:
            seen.append(username)
    return seen


async def account_ids_for_usernames(database, usernames):
    """Translate usernames into the account-id strings sharing is read by.

    A username with no account is dropped. Returning a partial list is right:
    the members who do exist should still receive the rule set.
    """
    names = [name for name in (usernames or []) if name]
    if not names:
        return []
    rows = await database.users.find(
        {"username": {"$in": names}}, {"_id": 1, "username": 1}
    ).to_list(len(names))
    by_name = {str(row.get("username")): str(row.get("_id")) for row in rows if row.get("_id")}
    return [by_name[name] for name in names if name in by_name]
