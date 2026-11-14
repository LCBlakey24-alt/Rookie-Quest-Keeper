"""Regression checks for the stable, non-destructive Word import format."""
from io import BytesIO
from zipfile import ZipFile

import pytest
from docx import Document

from utils.campaign_workbook import (
    FORMAT, WorkbookError, generate_template, parse_workbook,
)


def _save(doc):
    out = BytesIO()
    doc.save(out)
    return out.getvalue()


def _fill(doc, section, label, value):
    current = None
    for block in doc.iter_inner_content():
        if hasattr(block, "style"):
            if block.style.name.startswith("Heading 1"):
                current = block.text.strip().upper()
            continue
        if current == section:
            for row in block.rows:
                if row.cells[0].text.strip() == label:
                    row.cells[1].text = value
                    return
    raise AssertionError(f"Could not locate {section}: {label}")


def test_generated_template_is_a_valid_empty_docx():
    data = generate_template()
    with ZipFile(BytesIO(data)) as archive:
        assert "word/document.xml" in archive.namelist()
    with pytest.raises(WorkbookError, match="blank"):
        parse_workbook(data)


def test_ai_can_fill_table_values_without_changing_headings_or_labels():
    doc = Document(BytesIO(generate_template()))
    _fill(doc, "CAMPAIGN", "Campaign name", "The Glass Archipelago")
    _fill(doc, "CAMPAIGN", "Rules edition", "2024")
    _fill(doc, "NPC", "Name", "Tara of the Tides")
    _fill(doc, "NPC", "Backstory", "Former harbour captain.\nKnown for hidden charts.")
    _fill(doc, "LOCATION", "Name", "Port Aurora")
    _fill(doc, "QUEST", "Title", "The Lighthouse")
    _fill(doc, "QUEST", "Objectives", "Find the key\nInvestigate the tower")
    _fill(doc, "CALENDAR", "Custom months", "Sunswake: 24\nRainfall: 28")
    parsed = parse_workbook(_save(doc))
    assert parsed["format"] == FORMAT
    assert parsed["records"]["CAMPAIGN"][0]["name"] == "The Glass Archipelago"
    assert parsed["records"]["NPC"][0]["backstory"] == "Former harbour captain.\nKnown for hidden charts."
    assert parsed["records"]["QUEST"][0]["objectives"] == "Find the key\nInvestigate the tower"
    assert parsed["records"]["CALENDAR"][0]["custom_months"] == "Sunswake: 24\nRainfall: 28"
    assert parsed["total_records"] == 5


def test_more_than_one_npc_can_be_entered_without_section_overwrite():
    doc = Document(BytesIO(generate_template()))
    _fill(doc, "NPC", "Name", "Tara")
    doc.add_heading("NPC", level=1)
    table = doc.add_table(rows=2, cols=2)
    table.cell(1, 0).text = "Name"
    table.cell(1, 1).text = "Borun"
    parsed = parse_workbook(_save(doc))
    assert [item["name"] for item in parsed["records"]["NPC"]] == ["Tara", "Borun"]


def test_partial_record_requires_an_identity_instead_of_silently_dropping_lore():
    doc = Document(BytesIO(generate_template()))
    _fill(doc, "LOCATION", "Description", "A location with no name")
    with pytest.raises(WorkbookError, match="Name"):
        parse_workbook(_save(doc))


def test_unrecognised_heading_not_imported_as_other_campaign_lore():
    doc = Document(BytesIO(generate_template()))
    _fill(doc, "CAMPAIGN", "Campaign name", "Hidden Port")
    doc.add_heading("SECRET ACCOUNT DATA", level=1)
    table = doc.add_table(rows=1, cols=2)
    table.cell(0, 0).text = "Password"
    table.cell(0, 1).text = "Never import"
    parsed = parse_workbook(_save(doc))
    assert parsed["total_records"] == 1
    assert "SECRET ACCOUNT DATA" not in parsed["records"]


def test_invalid_docx_rejected_without_parsing_external_content():
    with pytest.raises(WorkbookError, match="valid Word"):
        parse_workbook(b"this is not a zip")
