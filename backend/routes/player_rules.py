"""Player-facing rules option routes."""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from config import db
from utils.auth import get_current_user, verify_campaign_membership

router = APIRouter()

VALID_EDITIONS = {"2014", "2024"}
CONTENT_COLLECTIONS = {
    "races": "user_races",
    "classes": "user_classes",
    "subclasses": "user_subclasses",
    "backgrounds": "user_backgrounds",
    "feats": "user_feats",
    "spells": "user_spells",
}


def clean_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    item = dict(doc or {})
    item.pop("_id", None)
    return item


def owner_scope(owner: str, username: str) -> str:
    return "personal" if owner == username else "campaign"


def label_doc(doc: Dict[str, Any], username: str, rulesets: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    item = clean_doc(doc)
    owner = item.get("user_id", "")
    ruleset = rulesets.get(item.get("ruleset_id") or "", {})
    item["source_scope"] = owner_scope(owner, username)
    item["source_label"] = ruleset.get("name") or item.get("source") or "Homebrew"
    item["is_homebrew"] = True
    item["is_campaign_content"] = owner != username
    return item


async def find_docs(collection: str, owners: List[str], edition: Optional[str]) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {"user_id": {"$in": owners}}
    if edition:
        query["edition"] = edition
    return [clean_doc(item) for item in await db[collection].find(query, {"_id": 0}).to_list(1000)]


@router.get("/player/rules/options")
async def get_player_rules_options(
    edition: Optional[str] = None,
    campaign_id: Optional[str] = None,
    username: str = Depends(get_current_user),
):
    if edition and edition not in VALID_EDITIONS:
        raise HTTPException(status_code=400, detail="edition must be '2014' or '2024'")

    owners = [username]
    campaign_summary = None
    if campaign_id:
        campaign = await verify_campaign_membership(campaign_id, username)
        dm_user_id = campaign.get("dm_user_id")
        if dm_user_id and dm_user_id not in owners:
            owners.append(dm_user_id)
        campaign_summary = {
            "id": campaign.get("id") or campaign_id,
            "name": campaign.get("name", ""),
            "dm_user_id": dm_user_id,
            "rules_edition": campaign.get("rules_edition") or campaign.get("edition"),
        }

    rulesets = await find_docs("user_rulesets", owners, edition)
    ruleset_lookup = {item.get("id", ""): item for item in rulesets}

    out: Dict[str, Any] = {
        "edition_filter": edition,
        "campaign": campaign_summary,
        "owners": [{"user_id": owner, "scope": owner_scope(owner, username)} for owner in owners],
        "rulesets": [
            {
                **item,
                "source_scope": owner_scope(item.get("user_id", ""), username),
                "is_campaign_content": item.get("user_id") != username,
            }
            for item in rulesets
        ],
    }

    counts: Dict[str, int] = {}
    for key, collection in CONTENT_COLLECTIONS.items():
        items = [label_doc(item, username, ruleset_lookup) for item in await find_docs(collection, owners, edition)]
        items.sort(key=lambda item: (item.get("name") or "").lower())
        out[key] = items
        counts[key] = len(items)

    out["counts"] = counts
    out["has_custom_content"] = any(counts.values())
    return out
