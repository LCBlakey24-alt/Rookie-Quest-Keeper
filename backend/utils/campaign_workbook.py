"""Versioned, AI-friendly Word campaign workbook: generation and strict parsing.

The field-label contract is intentionally stable. ChatGPT can fill the right
column without rewriting the template's Heading 1 sections or left labels.
"""
from __future__ import annotations

from collections import defaultdict
from io import BytesIO
from zipfile import BadZipFile, ZipFile
import re

from docx import Document
from docx.text.paragraph import Paragraph
from docx.shared import Inches, Pt, RGBColor

FORMAT = "RQK-WORKBOOK-V1"
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_EXPANDED_BYTES = 12 * 1024 * 1024
MAX_RECORDS = 300
MAX_TEXT_CHARS = 250_000

# Key -> exact visible label in the two-column Word tables.
FIELDS = {
    "CAMPAIGN": {
        "name": "Campaign name",
        "description": "Description",
        "system": "Game system",
        "rules_edition": "Rules edition",
        "world_name": "World name",
        "world_genre": "World genre",
        "world_setting_notes": "World setting notes",
        "dm_rules": "GM rules",
    },
    "NPC": {
        "name": "Name", "role": "Role", "race": "Race", "class_name": "Class",
        "level": "Level", "alignment": "Alignment", "description": "Description",
        "appearance": "Appearance", "personality": "Personality",
        "backstory": "Backstory", "location": "Location", "notes": "GM notes",
        "image_url": "Image URL",
        "hp": "Hit points", "max_hp": "Maximum hit points", "ac": "Armour class",
        "speed": "Movement speed", "proficiency_bonus": "Proficiency bonus",
        "strength": "Strength score", "dexterity": "Dexterity score",
        "constitution": "Constitution score", "intelligence": "Intelligence score",
        "wisdom": "Wisdom score", "charisma": "Charisma score",
        "saving_throws": "Saving throw proficiencies",
        "skills": "Skill proficiencies",
        "attacks": "Attacks (one per line)",
        "abilities": "Abilities and features (one per line)",
        "casting_ability": "Spellcasting ability",
        "spell_save_dc": "Spell save DC",
        "spell_attack_bonus": "Spell attack bonus",
        "cantrips": "Cantrips",
        "known_spells": "Known spells",
        "slot_level": "Spell slot level", "slot_count": "Spell slot count",
    },
    "LOCATION": {
        "name": "Name", "location_type": "Location type",
        "description": "Description", "notable_npcs": "Notable NPCs",
        "notes": "Notes",
    },
    "GOD": {
        "name": "Name", "domain": "Domain", "description": "Description",
        "symbol": "Symbol", "alignment": "Alignment", "notes": "Notes",
    },
    "QUEST": {
        "title": "Title", "summary": "Summary", "hook": "Hook",
        "status": "Status", "gm_notes": "GM notes", "objectives": "Objectives",
    },
    "STORY ARC": {
        "title": "Title", "description": "Description", "status": "Status",
        "arc_type": "Arc type", "gm_notes": "GM notes",
    },
    "CALENDAR": {
        "calendar_type": "Calendar type", "days_per_week": "Days per week",
        "current_day": "Current day", "current_month": "Current month",
        "current_year": "Current year", "custom_months": "Custom months",
    },
    "CALENDAR EVENT": {
        "name": "Name", "description": "Description", "day": "Day",
        "month": "Month", "year": "Year", "recurrence_type": "Recurrence type",
    },
    "SESSION NOTE": {"content": "Content", "session_date": "Session date"},
    "TIMELINE EVENT": {
        "title": "Title", "event_type": "Event type",
        "description": "Description", "session_number": "Session number",
        "in_game_date": "In-game date",
    },
}
SINGLETONS = {"CAMPAIGN", "CALENDAR"}
IDENTITY = {
    "NPC": "name", "LOCATION": "name", "GOD": "name", "QUEST": "title",
    "STORY ARC": "title", "CALENDAR EVENT": "name",
    "SESSION NOTE": "content", "TIMELINE EVENT": "title",
}


class WorkbookError(ValueError):
    """A deliberately user-readable invalid workbook error."""


def _label(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip()).casefold()


def _guard_zip(data: bytes) -> None:
    if not data or len(data) > MAX_FILE_BYTES:
        raise WorkbookError("Use a .docx file smaller than 2 MB.")
    try:
        with ZipFile(BytesIO(data)) as archive:
            members = archive.infolist()
            if len(members) > 500 or sum(m.file_size for m in members) > MAX_EXPANDED_BYTES:
                raise WorkbookError("This Word file expands beyond the safe limit.")
            if "word/document.xml" not in archive.namelist():
                raise WorkbookError("This is not a valid Word .docx document.")
    except BadZipFile as exc:
        raise WorkbookError("This is not a valid Word .docx document.") from exc


def parse_workbook(data: bytes) -> dict:
    """Read Heading 1 record types followed by fixed-label two-column tables.

    Unknown heading types and fields are not imported. Empty placeholders do
    not create records. No macros, images, hyperlinks or external content are
    executed, fetched or stored by this parser.
    """
    _guard_zip(data)
    try:
        doc = Document(BytesIO(data))
    except Exception as exc:
        raise WorkbookError("Could not open this Word workbook.") from exc
    buckets = defaultdict(list)
    seen_sections = set()
    current = None
    entry = None
    labels = {
        section: {_label(label): key for key, label in mapping.items()}
        for section, mapping in FIELDS.items()
    }
    text_chars = 0
    for block in doc.iter_inner_content():
        # Word Tables also expose a .style property. Discriminate by type,
        # otherwise every populated table is accidentally skipped.
        if isinstance(block, Paragraph):
            if block.style.name.lower().startswith("heading 1"):
                heading = block.text.strip().upper()
                current = heading if heading in FIELDS else None
                if current:
                    seen_sections.add(current)
                    if current in SINGLETONS and buckets[current]:
                        raise WorkbookError(f"Only one {current} section is allowed.")
                    entry = {}
                    buckets[current].append(entry)
                else:
                    entry = None
            continue
        if current is None or entry is None:
            continue
        for row in block.rows:
            if len(row.cells) < 2:
                continue
            key = labels[current].get(_label(row.cells[0].text))
            if not key:
                continue
            value = row.cells[1].text.strip()
            text_chars += len(value)
            if text_chars > MAX_TEXT_CHARS:
                raise WorkbookError("Too much text in the workbook (250,000-character limit).")
            if value and value not in {"—", "-", "N/A", "[blank]"}:
                entry[key] = value

    if not seen_sections:
        raise WorkbookError("No recognised workbook sections. Keep Heading 1 section labels from the official template.")

    # Reject partially populated named records instead of silently discarding
    # user-supplied data that an AI may have put in the wrong field.
    result = {}
    count = 0
    for section in FIELDS:
        prepared = []
        for raw in buckets.get(section, []):
            if not raw:
                continue
            required = IDENTITY.get(section)
            if required and not raw.get(required):
                raise WorkbookError(f"{section} has information but no {FIELDS[section][required]}.")
            prepared.append(raw)
        if section in SINGLETONS and len(prepared) > 1:
            raise WorkbookError(f"Only one populated {section} section is allowed.")
        if prepared:
            result[section] = prepared
            count += len(prepared)
    if count > MAX_RECORDS:
        raise WorkbookError(f"The workbook supports at most {MAX_RECORDS} populated sections per import.")
    if not result:
        raise WorkbookError("Every import field is blank. Fill in at least one campaign field or record.")
    return {
        "format": FORMAT,
        "records": result,
        "counts": {key: len(value) for key, value in result.items()},
        "total_records": count,
        "warnings": [],
    }


def generate_template() -> bytes:
    """Create the downloadable version of the same import contract."""
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(.70)
    section.bottom_margin = Inches(.68)
    section.left_margin = Inches(.82)
    section.right_margin = Inches(.82)
    doc.styles["Normal"].font.name = "Aptos"
    doc.styles["Normal"].font.size = Pt(10)
    for sty in ("Title", "Heading 1", "Heading 2"):
        doc.styles[sty].font.color.rgb = RGBColor(10, 35, 66)
    doc.add_heading("ROOKIE QUEST KEEPER", 0)
    doc.add_paragraph("UNIVERSAL CAMPAIGN IMPORT WORKBOOK  •  " + FORMAT)
    doc.add_heading("How to complete this workbook", level=2)
    doc.add_paragraph(
        "Enter your information into the right column of each table. Leave unknown values blank. "
        "Duplicate a Heading 1 section and its table for additional NPCs, locations, quests, notes or events. "
        "For AI assistance, upload this workbook and your campaign materials to ChatGPT, asking it to fill "
        "the right-hand column only, use established facts, and preserve all labels and headings."
    )
    doc.add_paragraph(
        "Private GM content stays private. Keep your own copy. Review the preview in Keeper "
        "before importing; the site never overwrites existing records during a workbook import."
    )
    for section_name, fields in FIELDS.items():
        doc.add_page_break()
        doc.add_heading(section_name, level=1)
        table = doc.add_table(rows=1, cols=2)
        table.style = "Light Shading Accent 1"
        table.cell(0, 0).text = "FIELD (DO NOT EDIT)"
        table.cell(0, 1).text = "YOUR INFORMATION / AI-ASSISTED ENTRY"
        for field_name in fields.values():
            cells = table.add_row().cells
            cells[0].text = field_name
            cells[1].text = ""
    result = BytesIO()
    doc.save(result)
    return result.getvalue()
