import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.playtest_import import iter_supported_records, validate_playtest_pack


def test_validate_playtest_pack_accepts_supported_private_content():
    payload = {
        "pack_name": "Friday Playtest Pack",
        "edition": "2024",
        "content": {
            "classes": [{"name": "Test Warden", "hit_die": "d10", "features": [{"level": 1, "name": "Guard"}]}],
            "subclasses": [{"name": "Iron Path", "parent_class": "Test Warden", "subclass_level": 3, "features": []}],
            "creatures": [{"name": "Clockwork Wolf", "armor_class": 14, "hit_points": 22, "actions": [{"name": "Bite"}]}],
            "spells": [{"name": "Safe Test Spark", "level": 1, "school": "Evocation"}],
            "items": [{"name": "Playtest Charm", "item_type": "wondrous", "description": "Private test item"}],
        },
    }

    result = validate_playtest_pack(payload)

    assert result["valid"] is True
    assert result["total_records"] == 5
    assert result["counts"]["classes"] == 1
    assert result["counts"]["creatures"] == 1
    assert result["errors"] == []


def test_validate_playtest_pack_reports_required_field_errors():
    payload = {
        "pack_name": "Broken Pack",
        "edition": "2024",
        "content": {
            "subclasses": [{"name": "No Parent"}],
            "creatures": [{"armor_class": 12}],
        },
    }

    result = validate_playtest_pack(payload)

    assert result["valid"] is False
    messages = {error["message"] for error in result["errors"]}
    assert "Required field 'parent_class' is missing." in messages
    assert "A non-empty name is required." in messages


def test_iter_supported_records_ignores_unknown_sections():
    payload = {
        "pack_name": "Mixed Pack",
        "edition": "2014",
        "content": {
            "classes": [{"name": "Known Class"}],
            "not_supported": [{"name": "Ignore Me"}],
        },
    }

    records = list(iter_supported_records(payload))

    assert records == [("classes", {"name": "Known Class"})]
