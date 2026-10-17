"""D&D Beyond share link metadata, not a scraping or sync integration.

D&D Beyond does not provide an authorised public character API. These helpers
only validate and save a player's chosen public share URL. They deliberately
make no requests to D&D Beyond, do not use undocumented endpoints, and never
claim to have imported or synchronized a character.
"""
from urllib.parse import urlsplit
import re

CHARACTER_PATH = re.compile(r"^/characters/(?P<id>[1-9][0-9]{0,19})/?$", re.IGNORECASE)
PROFILE_PATH = re.compile(r"^/profile/[^/]+/characters/(?P<id>[1-9][0-9]{0,19})/?$", re.IGNORECASE)


def parse_dndbeyond_share_link(value: str) -> dict:
    url = str(value or "").strip()
    if not url or len(url) > 1024 or any(c in url for c in "\\r\\n\\t"):
        raise ValueError("Paste a D&D Beyond character share URL.")
    try:
        target = urlsplit(url)
        host = target.hostname or ""
        if target.scheme != "https" or host.lower() not in ("dndbeyond.com", "www.dndbeyond.com"):
            raise ValueError("Only HTTPS D&D Beyond character links are accepted.")
        if target.username or target.password or target.port is not None:
            raise ValueError("Only HTTPS D&D Beyond character links are accepted.")
        match = CHARACTER_PATH.fullmatch(target.path) or PROFILE_PATH.fullmatch(target.path)
        if not match:
            raise ValueError("Use the Share link for a specific D&D Beyond character.")
    except (TypeError, ValueError) as exc:
        if str(exc).startswith(("Paste ", "Only ", "Use ")):
            raise
        raise ValueError("Enter a valid HTTPS D&D Beyond character URL.") from exc

    identifier = match.group("id")
    return {
        "url": f"https://www.dndbeyond.com/characters/{identifier}",
        "character_id": identifier,
        "import_status": "link_only_manual_import_required",
        "sync_status": "not_available",
    }
