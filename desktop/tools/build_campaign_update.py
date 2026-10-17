#!/usr/bin/env python3
"""Build small, additive Rookie Quest Keeper campaign updates.

The input is a Keeper desktop workspace JSON export, NOT raw Google Drive
files. Convert Drive source documents into stable-ID Keeper records first.
This tool does not delete records from the installed campaign.
"""
import argparse
import base64
import json
import re
from datetime import datetime, timezone
from pathlib import Path

FORMAT = "rookie-quest-keeper-campaign-pack"
FIELDS = ("campaigns", "characters", "notes", "recaps", "homebrew")
MAPS = ("receipts", "objects")
EMPTY = {
    "version": 1, "campaigns": [], "characters": [], "notes": [],
    "recaps": [], "homebrew": [], "receipts": {}, "objects": {},
    "collections": {},
}


def read_workspace(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("version") != 1:
        raise ValueError("Expected a Rookie Quest Keeper version 1 workspace JSON")
    for field in FIELDS:
        if not isinstance(data.get(field), list):
            raise ValueError(f"Missing or invalid workspace array: {field}")
    for field in (*MAPS, "collections"):
        if not isinstance(data.get(field), dict):
            raise ValueError(f"Missing or invalid workspace object: {field}")
    return data


def changed_records(old, new):
    """Only send records that are new or have changed; never emit deletions."""
    old_by_id = {
        str(entry.get("id") or entry.get("_id")): entry
        for entry in old if isinstance(entry, dict) and (entry.get("id") or entry.get("_id"))
    }
    changed = []
    for entry in new:
        if not isinstance(entry, dict):
            raise ValueError("Each record must be an object")
        key = str(entry.get("id") or entry.get("_id") or "")
        if not key:
            raise ValueError("Every update record requires a stable id or _id")
        if old_by_id.get(key) != entry:
            changed.append(entry)
    return changed


def changed_map(old, new):
    return {key: value for key, value in new.items() if old.get(key) != value}


def make_delta(old, new):
    delta = json.loads(json.dumps(EMPTY))
    for field in FIELDS:
        delta[field] = changed_records(old.get(field, []), new[field])
    for field in MAPS:
        delta[field] = changed_map(old.get(field, {}), new[field])
    for campaign_id, groups in new["collections"].items():
        if not isinstance(groups, dict):
            raise ValueError("Campaign collection groups must be objects")
        old_groups = old.get("collections", {}).get(campaign_id, {})
        if not isinstance(old_groups, dict):
            old_groups = {}
        changed = {}
        for name, value in groups.items():
            before = old_groups.get(name)
            if isinstance(value, list):
                rows = changed_records(before if isinstance(before, list) else [], value)
                if rows:
                    changed[name] = rows
            elif isinstance(value, dict):
                mapping = changed_map(before if isinstance(before, dict) else {}, value)
                if mapping:
                    changed[name] = mapping
            elif value != before:
                raise ValueError(f"Unsupported collection value: {campaign_id}/{name}")
        if changed:
            delta["collections"][campaign_id] = changed
    return delta


def attachments_from_manifest(path):
    if not path:
        return []
    manifest_path = Path(path).resolve()
    entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        raise ValueError("Attachment manifest must contain an array")
    result, seen = [], set()
    for entry in entries:
        attachment_id = str(entry["id"])
        if not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", attachment_id) or attachment_id in seen:
            raise ValueError("Each attachment must have a unique safe id")
        seen.add(attachment_id)
        source = Path(entry["path"])
        if not source.is_absolute():
            source = manifest_path.parent / source
        raw = source.read_bytes()
        if len(raw) > 25 * 1024 * 1024:
            raise ValueError(f"Attachment too large: {source.name} (25 MiB maximum)")
        result.append({
            "id": attachment_id,
            "file_name": str(entry.get("file_name") or source.name),
            "base64": base64.b64encode(raw).decode("ascii"),
        })
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before", help="Optional last published workspace snapshot JSON")
    parser.add_argument("--after", required=True, help="New complete workspace snapshot JSON")
    parser.add_argument("--pack-id", required=True, help="Stable pack identifier, e.g. eldritch-heralds")
    parser.add_argument("--pack-name", required=True)
    parser.add_argument("--attachments-manifest", help="Optional JSON list with id, path, file_name")
    parser.add_argument("--output", required=True, help="Filename ending .rqkupdate")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", args.pack_id):
        parser.error("--pack-id must be a safe, stable identifier")
    if Path(args.output).suffix.lower() != ".rqkupdate":
        parser.error("--output must end in .rqkupdate")
    new = read_workspace(args.after)
    old = read_workspace(args.before) if args.before else json.loads(json.dumps(EMPTY))
    pack = {
        "format": FORMAT, "version": 1, "pack_type": "campaign-update",
        "pack_id": args.pack_id, "pack_name": args.pack_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "workspace": make_delta(old, new),
        "attachments": attachments_from_manifest(args.attachments_manifest),
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Created {output} ({output.stat().st_size:,} bytes): "
          f"{len(pack['workspace']['campaigns'])} campaign records, "
          f"{len(pack['workspace']['collections'])} changed collection groups, "
          f"{len(pack['attachments'])} attachments")


if __name__ == "__main__":
    main()
