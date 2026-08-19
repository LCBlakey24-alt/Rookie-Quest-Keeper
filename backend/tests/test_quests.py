from fastapi import HTTPException
import pytest

from routes.quests import normalise_objective, validate_quest_status


def test_quest_status_accepts_persistent_campaign_states():
    for value in ("draft", "available", "active", "completed", "failed", "archived"):
        assert validate_quest_status(value) == value


def test_quest_status_rejects_session_only_or_unknown_states():
    with pytest.raises(HTTPException):
        validate_quest_status("tonight")


def test_objective_is_normalised_for_live_checklist_use():
    objective = normalise_objective({
        "title": "Find the hidden entrance",
        "status": "upcoming",
        "optional": False,
        "linked_encounter_id": "encounter-1",
    })

    assert objective["id"].startswith("objective-")
    assert objective["title"] == "Find the hidden entrance"
    assert objective["status"] == "upcoming"
    assert objective["linked_encounter_id"] == "encounter-1"
    assert objective["dependency_ids"] == []


def test_invalid_objective_status_falls_back_to_upcoming():
    objective = normalise_objective({"title": "Unexpected path", "status": "tonight"})
    assert objective["status"] == "upcoming"
