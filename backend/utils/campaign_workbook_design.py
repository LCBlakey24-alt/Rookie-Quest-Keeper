"""Guild-branded Word workbook template, driven by the exact import field contract.

Only the right-hand cells are editable content for the parser. Keep Heading 1
section titles exactly matching FIELDS, including when duplicating sections.
"""
from __future__ import annotations

from io import BytesIO
from math import cos, sin, pi
from PIL import Image, ImageDraw
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

NAVY = "0A2342"
PINK = "FF3D8B"
VIOLET = "B04DFF"
BLUE = "4FB3FF"
MUTED = "54657D"
PALE = "F1F5FC"
LINE = "C8D9E8"
WHITE = "FFFFFF"

SUBTITLES = {
    "CAMPAIGN": "Give this world its identity and core rules.",
    "NPC": "Characters, allies, villains and everyone in between.",
    "LOCATION": "Where adventures unfold.",
    "GOD": "Deities, powers and faiths within the setting.",
    "QUEST": "Hooks, objectives and secrets.",
    "STORY ARC": "The larger narrative connecting your sessions.",
    "CALENDAR": "The rules for time in your world.",
    "CALENDAR EVENT": "Dates, celebrations and memorable moments.",
    "SESSION NOTE": "Sessions, discoveries and what happened at the table.",
    "TIMELINE EVENT": "Plot the events and history of your campaign.",
}

NPC_GROUPS = {
    "Name": "IDENTITY & STORY",
    "Hit points": "COMBAT & DEFENCE",
    "Strength score": "CORE ABILITY SCORES",
    "Saving throw proficiencies": "PROFICIENCIES & ACTIONS",
    "Spellcasting ability": "SPELLCASTING",
}


def _rgb(value):
    return RGBColor.from_string(value)


def _run(paragraph, value, size=9, color=NAVY, bold=False):
    part = paragraph.add_run(value)
    part.font.name = "Aptos"
    part.font.size = Pt(size)
    part.font.color.rgb = _rgb(color)
    part.bold = bold
    return part


def _shade(cell, colour):
    fill = OxmlElement("w:shd")
    fill.set(qn("w:fill"), colour)
    cell._tc.get_or_add_tcPr().append(fill)


def _margins(cell):
    mar = OxmlElement("w:tcMar")
    for side in ("top", "start", "bottom", "end"):
        el = OxmlElement("w:" + side)
        el.set(qn("w:w"), "85" if side in ("top", "bottom") else "120")
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    cell._tc.get_or_add_tcPr().append(mar)


def _border(cell):
    borders = OxmlElement("w:tcBorders")
    bottom = OxmlElement("w:bottom")
    for key, value in (("val", "single"), ("sz", "5"), ("color", LINE)):
        bottom.set(qn("w:" + key), value)
    borders.append(bottom)
    cell._tc.get_or_add_tcPr().append(borders)


def _hex_mark():
    size = 440
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    for radius, colour in ((195, "#" + BLUE), (177, "#" + VIOLET), (159, "#" + PINK)):
        points = [
            (size/2 + radius*cos(pi*k/3 - pi/2), size/2 + radius*sin(pi*k/3 - pi/2))
            for k in range(6)
        ]
        draw.line(points + [points[0]], fill=colour, width=9, joint="curve")
    radius = 125
    points = [
        (size/2 + radius*cos(pi*k/3 - pi/2), size/2 + radius*sin(pi*k/3 - pi/2))
        for k in range(6)
    ]
    draw.polygon(points, fill="#" + NAVY)
    out = BytesIO()
    im.save(out, format="PNG")
    out.seek(0)
    return out


def build_design_template(fields, format_label):
    doc = Document()
    section = doc.sections[0]
    section.page_height = Inches(11.69)
    section.page_width = Inches(8.27)
    section.left_margin = section.right_margin = Inches(.82)
    section.top_margin = Inches(.74)
    section.bottom_margin = Inches(.76)
    section.header_distance = Inches(.30)
    section.footer_distance = Inches(.32)
    normal = doc.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(9)
    normal.font.color.rgb = _rgb(NAVY)
    normal.paragraph_format.space_after = Pt(5)
    for name, size in (("Heading 1", 22), ("Heading 2", 14), ("Title", 28)):
        style = doc.styles[name]
        style.font.name = "Aptos Display"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = _rgb(NAVY)
        style.paragraph_format.space_before = Pt(6)
        style.paragraph_format.space_after = Pt(10)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    _run(header, "R Q K   /   ROOKIE QUEST KEEPER", 8, NAVY, True)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    _run(footer, "UNIVERSAL CAMPAIGN WORKBOOK   •   ", 7, MUTED, True)
    page = OxmlElement("w:fldSimple")
    page.set(qn("w:instr"), "PAGE")
    footer._p.append(page)

    cover = doc.add_paragraph()
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover.paragraph_format.space_before = Pt(24)
    cover.add_run().add_picture(_hex_mark(), width=Inches(1.82))
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _run(title, "ROOKIE QUEST KEEPER", 13, VIOLET, True)
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _run(title, "THE CAMPAIGN\nWORKBOOK", 31, NAVY, True)
    strap = doc.add_paragraph()
    strap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _run(strap, "A universal, AI-friendly template for GMs", 12, MUTED)
    stripe = doc.add_table(rows=1, cols=3)
    for i, colour in enumerate((PINK, VIOLET, BLUE)):
        _shade(stripe.cell(0, i), colour)
        stripe.cell(0, i).text = " "
    intro = doc.add_paragraph()
    intro.paragraph_format.space_before = Pt(15)
    _run(intro, "01  HOW TO USE THIS WORKBOOK", 14, NAVY, True)

    instructions = (
        ("FILL THE RIGHT COLUMN",
         "Keep every Heading 1 section title and left-hand field label unchanged. Complete the right-hand cells only."),
        ("ADD MORE NPCs AND OTHER RECORDS",
         "Copy the entire NPC Heading 1 AND all of its field table, including rows extending over a page. "
         "Paste the complete block beneath the original. Repeat for any number of NPCs, locations, quests or other repeatable records."),
        ("WORK WITH CHATGPT",
         "Upload this document with your campaign notes. Ask ChatGPT to fill only right-hand cells, "
         "duplicate complete sections for every record, preserve exact labels, and avoid adding invented facts as established lore."),
        ("ROOK AND BLANK FIELDS",
         "Rook-assisted missing-field suggestions are planned: the more details you supply, the more useful proposals will be. "
         "Suggested alignments, abilities and combat statistics require GM review and approval. "
         "Currently, importing a blank field does not automatically generate or approve it."),
    )
    for heading, body in instructions:
        para = doc.add_paragraph()
        para.paragraph_format.space_after = Pt(7)
        _run(para, heading + "  ", 9, NAVY, True)
        _run(para, body, 9, MUTED)
    last = doc.add_paragraph()
    last.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _run(last, "FORMAT  " + format_label + "   •   GM DATA STAYS PRIVATE", 8, VIOLET, True)

    for index, (section_name, section_fields) in enumerate(fields.items(), start=1):
        doc.add_page_break()
        doc.add_heading(section_name, level=1)
        intro = doc.add_paragraph()
        intro.paragraph_format.space_after = Pt(4)
        _run(intro, f"{index:02d}   /   {SUBTITLES.get(section_name, '')}", 10, MUTED)
        hints = []
        if section_name == "NPC":
            hints = [
                "Duplicate this Heading 1 and the ENTIRE table (even across page breaks) for another NPC.",
                "Attacks: one per line: Longsword | +6 | 1d8+3 slashing | optional notes",
                "Features: one per line: Extra Attack | Attack twice using the Attack action",
                "Skills, saves and spells: separate entries with commas, semicolons or new lines.",
                "Unspecified scores remain unverified; do not treat suggested combat stats as established.",
            ]
        elif section_name == "CALENDAR":
            hints = ["Custom months: one per line: Sunswake: 30"]
        elif section_name == "QUEST":
            hints = ["Objectives: one objective on each line."]
        for hint in hints:
            line = doc.add_paragraph()
            line.paragraph_format.space_after = Pt(2)
            _run(line, "•  " + hint, 8, MUTED)

        table = doc.add_table(rows=1, cols=2)
        table.autofit = False
        table.columns[0].width = Inches(2.55)
        table.columns[1].width = Inches(4.0)
        labels = ("FIELD (KEEP THIS LABEL)", "YOUR CAMPAIGN INFORMATION")
        for i, label in enumerate(labels):
            cell = table.rows[0].cells[i]
            _margins(cell)
            _shade(cell, NAVY)
            _run(cell.paragraphs[0], label, 8, WHITE, True)

        for field_label in section_fields.values():
            if section_name == "NPC" and field_label in NPC_GROUPS:
                merged = table.add_row().cells[0]
                merged = merged.merge(table.rows[-1].cells[1])
                _margins(merged)
                _shade(merged, "DCE8F5")
                _run(merged.paragraphs[0], NPC_GROUPS[field_label], 8, NAVY, True)
            cells = table.add_row().cells
            for cell in cells:
                _margins(cell)
                _border(cell)
                cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            _shade(cells[0], PALE)
            _run(cells[0].paragraphs[0], field_label, 8.5, NAVY, True)
            cells[1].text = " "
            cells[1].paragraphs[0].paragraph_format.space_after = Pt(0)

        instruction = doc.add_paragraph()
        instruction.paragraph_format.space_before = Pt(6)
        _run(instruction, "DUPLICATION RULE   ", 7, VIOLET, True)
        _run(instruction, "Copy the full Heading 1 title and table for each additional record.", 7, MUTED)
    doc.core_properties.title = "Rookie Quest Keeper | Universal Campaign Workbook"
    doc.core_properties.subject = "AI-friendly editable campaign import template"
    output = BytesIO()
    doc.save(output)
    return output.getvalue()
