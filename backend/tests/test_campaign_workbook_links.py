"""Loot, handouts and quest links in the campaign workbook."""
import pytest

from routes.campaign_workbook_import import _models, quest_link_names, unmatched_links
from utils.campaign_workbook import FIELDS, WorkbookError, generate_template, parse_workbook
from tests.test_campaign_workbook import _fill, _save
from docx import Document
from io import BytesIO


def test_template_has_loot_handout_and_quest_link_fields():
    doc = Document(BytesIO(generate_template()))
    headings = [p.text.strip() for p in doc.paragraphs if p.style.name.startswith("Heading 1")]
    assert {"LOOT", "HANDOUT", "QUEST"} <= set(headings)
    # People, places, loot and handouts come before quests, as the importer saves them.
    assert headings.index("LOOT") < headings.index("QUEST")
    assert "Quest giver" in FIELDS["QUEST"].values()


def test_filled_loot_and_handout_are_read():
    doc = Document(BytesIO(generate_template()))
    _fill(doc, "LOOT", "Name", "Silver Bell")
    _fill(doc, "LOOT", "Quantity", "2")
    _fill(doc, "LOOT", "Magical (yes or no)", "yes")
    _fill(doc, "HANDOUT", "Title", "Captain's log")
    _fill(doc, "HANDOUT", "Text the players read", "Day 9: the fog sang.")
    records = parse_workbook(_save(doc))["records"]
    assert records["LOOT"] == [{"name": "Silver Bell", "quantity": "2", "is_magical": "yes"}]
    assert records["HANDOUT"][0]["title"] == "Captain's log"


def test_loot_becomes_an_inventory_item_with_checked_values():
    item = _models("LOOT", {"name": "Silver Bell", "quantity": "2", "is_magical": "yes", "attunement_required": "no"})
    assert (item.name, item.quantity, item.is_magical, item.attunement_required) == ("Silver Bell", 2, True, False)
    with pytest.raises(WorkbookError):
        _models("LOOT", {"name": "Bell", "is_magical": "maybe"})
    with pytest.raises(WorkbookError):
        _models("LOOT", {"name": "Bell", "quantity": "lots"})


def test_handout_is_saved_for_the_gm_only():
    handout = _models("HANDOUT", {"title": "Captain's log", "content": "Day 9"})
    assert handout == {"title": "Captain's log", "category": "clue", "content": "Day 9"}


def test_quest_links_are_kept_out_of_the_quest_text():
    raw = {"title": "The Empty Ship", "quest_giver": "Mara Quill", "related_npcs": "Brother Oswin, mara quill",
           "locations": "Port Ashen\nThe Grey Lantern", "rewards": "Silver Bell", "handouts": "Captain's log"}
    quest = _models("QUEST", raw)
    assert quest.title == "The Empty Ship"
    assert quest.linked_npc_ids == [] and "Mara" not in quest.gm_notes
    assert quest_link_names(raw) == {
        "NPC": ["Mara Quill", "Brother Oswin"],
        "LOCATION": ["Port Ashen", "The Grey Lantern"],
        "LOOT": ["Silver Bell"],
        "HANDOUT": ["Captain's log"],
    }


def test_names_that_match_nothing_are_reported_not_invented():
    records = {
        "NPC": [{"name": "Mara Quill"}],
        "QUEST": [{"title": "The Empty Ship", "quest_giver": "Mara Quill", "locations": "Port Ashen, Nowhere"}],
    }
    warnings = unmatched_links(records, {"LOCATION": {"port ashen"}})
    assert warnings == ['Quest "The Empty Ship": no place called "Nowhere", so it will not be linked.']
