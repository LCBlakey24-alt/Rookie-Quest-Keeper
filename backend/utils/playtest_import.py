"""Validation helpers for private playtest content packs.

These helpers intentionally do not contain game-rule text. They validate the
shape of user-uploaded/private content so the app can support playtesting without
committing protected book content into the repository.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Tuple

SUPPORTED_PLAYTEST_CONTENT_TYPES: Dict[str, Tuple[str, ...]] = {
    "races": ("name",),
    "species": ("name",),
    "classes": ("name",),
    "subclasses": ("name", "parent_class"),
    "backgrounds": ("name",),
    "feats": ("name",),
    "features": ("name",),
    "spells": ("name",),
    "creatures": ("name",),
    "items": ("name",),
    "conditions": ("name",),
    "rules_references": ("name",),
}

RECOMMENDED_FIELDS: Dict[str, Tuple[str, ...]] = {
    "classes": ("hit_die", "features"),
    "subclasses": ("subclass_level", "features"),
    "spells": ("level", "school"),
    "creatures": ("armor_class", "hit_points", "actions"),
    "items": ("item_type", "description"),
    "features": ("level", "description"),
}


def normalize_content_list(value: Any) -> List[Dict[str, Any]]:
    """Coerce a user-provided section into a list of object records."""
    if value is None:
        return []
    if isinstance(value, dict):
        return [value]
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def validate_playtest_pack(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a playtest pack and return counts/errors/warnings.

    The function allows unknown top-level keys but only imports supported content
    sections. It checks names/required fields and duplicate names per section.
    """
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    counts = {content_type: 0 for content_type in SUPPORTED_PLAYTEST_CONTENT_TYPES}

    edition = str(payload.get("edition", "")).strip()
    if edition not in {"2014", "2024"}:
        errors.append({"path": "edition", "message": "Edition must be '2014' or '2024'."})

    pack_name = str(payload.get("pack_name") or payload.get("ruleset_name") or "").strip()
    if not pack_name:
        errors.append({"path": "pack_name", "message": "A pack_name is required."})

    content = payload.get("content") if isinstance(payload.get("content"), dict) else payload
    unsupported_sections = [
        key for key, value in content.items()
        if isinstance(value, list) and key not in SUPPORTED_PLAYTEST_CONTENT_TYPES
    ]
    for section in unsupported_sections:
        warnings.append({"path": section, "message": "Unsupported content section will be ignored."})

    for content_type, required_fields in SUPPORTED_PLAYTEST_CONTENT_TYPES.items():
        records = normalize_content_list(content.get(content_type))
        counts[content_type] = len(records)
        seen_names = set()
        for index, record in enumerate(records):
            path = f"{content_type}[{index}]"
            name = str(record.get("name", "")).strip()
            if not name:
                errors.append({"path": f"{path}.name", "message": "A non-empty name is required."})
            else:
                key = name.lower()
                if key in seen_names:
                    warnings.append({"path": f"{path}.name", "message": f"Duplicate name in section: {name}"})
                seen_names.add(key)

            for field in required_fields:
                value = record.get(field)
                if value in (None, "", []):
                    errors.append({"path": f"{path}.{field}", "message": f"Required field '{field}' is missing."})

            for field in RECOMMENDED_FIELDS.get(content_type, ()): 
                value = record.get(field)
                if value in (None, "", []):
                    warnings.append({"path": f"{path}.{field}", "message": f"Recommended field '{field}' is missing; the app may have less detail to use."})

    total_records = sum(counts.values())
    if total_records == 0:
        errors.append({"path": "content", "message": "Pack must include at least one supported content record."})

    return {
        "valid": not errors,
        "counts": counts,
        "total_records": total_records,
        "errors": errors,
        "warnings": warnings,
        "supported_content_types": sorted(SUPPORTED_PLAYTEST_CONTENT_TYPES.keys()),
    }


def iter_supported_records(payload: Dict[str, Any]) -> Iterable[Tuple[str, Dict[str, Any]]]:
    """Yield supported content records from a validated payload."""
    content = payload.get("content") if isinstance(payload.get("content"), dict) else payload
    for content_type in SUPPORTED_PLAYTEST_CONTENT_TYPES:
        for record in normalize_content_list(content.get(content_type)):
            yield content_type, record
