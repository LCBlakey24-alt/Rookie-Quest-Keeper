"""The campaign world document: a Word template a GM fills in (by hand, or by
pasting it into an AI assistant), and the reader that turns a filled copy
back into draft campaign records.

The document has one fixed shape so both people and AI assistants can fill it
in reliably:

    Heading 2  section       (World Overview, Places, People, Factions,
                              Quests, Lore & History)
    Heading 3  one entry     (its name)
    paragraphs "Field: value" lines, then any free text

Nothing here writes to the database. ``parse_world_document`` returns drafts
only; the GM reviews them and saving is a separate, explicit step. Only what
the GM wrote is kept: no field is invented or filled in.
"""
from __future__ import annotations

import io
import re
from typing import Any, Dict, List, Optional

from docx import Document
from docx.shared import Pt

MAX_DOCUMENT_BYTES = 2 * 1024 * 1024

# Section headings, and the other names a person or an AI might use for them.
SECTIONS = {
    'overview': ('World Overview', ['overview', 'world', 'setting', 'world overview', 'the world']),
    'locations': ('Places', ['places', 'locations', 'location', 'regions', 'settlements']),
    'npcs': ('People', ['people', 'npcs', 'npc', 'characters', 'non-player characters']),
    'factions': ('Factions', ['factions', 'faction', 'organisations', 'organizations', 'groups']),
    'quests': ('Quests', ['quests', 'quest', 'adventures', 'plot hooks', 'hooks']),
    'lore': ('Lore & History', ['lore', 'history', 'lore & history', 'lore and history', 'legends']),
}

# Field labels per section, mapped to the record field they fill.
FIELDS = {
    'locations': {
        'type': 'location_type', 'kind': 'location_type',
        'description': 'description', 'notable people': 'notable_npcs', 'notable npcs': 'notable_npcs',
        'notes': 'notes', 'gm notes': 'notes',
    },
    'npcs': {
        'role': 'role', 'occupation': 'role', 'race': 'race', 'species': 'race', 'ancestry': 'race',
        'where to find them': 'location', 'location': 'location', 'found at': 'location',
        'personality': 'personality', 'appearance': 'appearance', 'description': 'description',
        'backstory': 'backstory', 'history': 'backstory', 'alignment': 'alignment',
    },
    'factions': {
        'goal': 'goal', 'goals': 'goal', 'leader': 'leader', 'base': 'base', 'headquarters': 'base',
        'description': 'description', 'allies': 'allies', 'enemies': 'enemies',
    },
    'quests': {
        'hook': 'hook', 'summary': 'summary', 'objectives': 'objectives', 'objective': 'objectives',
        'gm notes': 'gm_notes', 'notes': 'gm_notes', 'reward': 'reward', 'rewards': 'reward',
    },
}

FIELD_ORDER = {
    'locations': ['Type', 'Description', 'Notable people', 'Notes'],
    'npcs': ['Role', 'Race', 'Where to find them', 'Personality', 'Appearance', 'Description'],
    'factions': ['Goal', 'Leader', 'Base', 'Description'],
    'quests': ['Hook', 'Summary', 'Objectives', 'Reward', 'GM notes'],
}

AI_PROMPT = (
    'You are helping a Game Master record their own tabletop campaign world. Fill in this document '
    'using ONLY the information I give you below. Keep every heading exactly as it is. Under each '
    'section, give each entry its own Heading 3 with its name, then one "Field: value" line per '
    'field shown in the example. Leave out any field you have no information for; do not invent '
    'names, places, history or game statistics. For quest objectives, write one objective per line '
    'starting with "- ". Here is my world:'
)


def normalise_name(value: Any) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', str(value or '').lower()).strip()


def _section_for(heading: str) -> Optional[str]:
    key = normalise_name(heading)
    for section, (title, aliases) in SECTIONS.items():
        if key == normalise_name(title) or key in {normalise_name(alias) for alias in aliases}:
            return section
    return None


def _heading_level(paragraph) -> int:
    style = (paragraph.style.name if paragraph.style is not None else '') or ''
    match = re.match(r'heading\s*(\d)', style.strip().lower())
    if match:
        return int(match.group(1))
    if style.strip().lower() == 'title':
        return 1
    return 0


def build_world_template(campaign_name: str = '') -> bytes:
    """The blank world document, as .docx bytes."""
    document = Document()
    document.add_heading(f"{campaign_name.strip() or 'My Campaign'}: World Document", level=1)
    intro = document.add_paragraph()
    intro.add_run('Fill this in by hand, or paste it into ChatGPT, Claude or another AI assistant with the prompt below. ').bold = True
    intro.add_run('Then upload it in Rookie: Rook reads it and shows you every place, person, faction and quest as a draft. '
                  'Nothing is added to your campaign until you choose what to keep.')
    document.add_paragraph('How to fill it in', style='Heading 2')
    for line in (
        'Keep the section headings (World Overview, Places, People, Factions, Quests, Lore & History).',
        'Give each entry its own Heading 3 with its name.',
        'Under it, write one "Field: value" line per field, like the examples. Leave out anything you do not know.',
        'Delete the example entries, or replace them with your own.',
    ):
        document.add_paragraph(line, style='List Bullet')
    document.add_paragraph('Prompt for an AI assistant', style='Heading 2')
    prompt = document.add_paragraph(AI_PROMPT)
    prompt.runs[0].italic = True

    document.add_heading('World Overview', level=2)
    document.add_paragraph('A few paragraphs about your world: its tone, its big conflict, what the players know at the start.')

    examples = {
        'locations': ('Example Town', {'Type': 'Town', 'Description': 'A harbour town where the story begins.', 'Notable people': 'Example Innkeeper', 'Notes': 'Anything only the GM should know.'}),
        'npcs': ('Example Innkeeper', {'Role': 'Innkeeper', 'Race': 'Human', 'Where to find them': 'Example Town', 'Personality': 'Warm, nosy, keeps every secret but her own.', 'Appearance': 'Flour on her apron, a silver ring.', 'Description': 'Knows everyone who comes through the harbour.'}),
        'factions': ('Example Guild', {'Goal': 'Control the harbour trade.', 'Leader': 'Example Innkeeper', 'Base': 'Example Town', 'Description': 'Merchants who protect their own.'}),
        'quests': ('Example Quest', {'Hook': 'A ship comes in with no crew.', 'Summary': 'Find out what happened at sea.', 'Objectives': None, 'Reward': '50 gold from the harbour master.', 'GM notes': 'The crew are hiding in the caves.'}),
    }
    for section in ('locations', 'npcs', 'factions', 'quests'):
        document.add_heading(SECTIONS[section][0], level=2)
        name, fields = examples[section]
        document.add_heading(name, level=3)
        for label in FIELD_ORDER[section]:
            if section == 'quests' and label == 'Objectives':
                document.add_paragraph('Objectives:')
                document.add_paragraph('- Search the empty ship')
                document.add_paragraph('- Follow the trail to the caves')
                continue
            document.add_paragraph(f'{label}: {fields[label]}')

    document.add_heading('Lore & History', level=2)
    document.add_paragraph('Myths, history, religions and anything else worth remembering.')

    for paragraph in document.paragraphs:
        for run in paragraph.runs:
            if run.font.size is None and _heading_level(paragraph) == 0:
                run.font.size = Pt(11)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _new_entry(section: str, name: str) -> Dict[str, Any]:
    return {'name': name.strip(), 'fields': {}, 'extra': [], 'objectives': []}


def _finish_entry(section: str, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    name = entry['name'].strip()
    if not name or normalise_name(name).startswith('example'):
        return None
    fields = dict(entry['fields'])
    extra = '\n'.join(line for line in entry['extra'] if line).strip()
    if extra:
        key = 'gm_notes' if section == 'quests' else 'description'
        fields[key] = '\n'.join(part for part in (fields.get(key, ''), extra) if part).strip()
    if section == 'quests':
        return {
            'title': name,
            'hook': fields.get('hook', ''),
            'summary': fields.get('summary', ''),
            'gm_notes': '\n'.join(part for part in (fields.get('gm_notes', ''), f"Reward: {fields['reward']}" if fields.get('reward') else '') if part),
            'objectives': entry['objectives'],
        }
    return {'name': name, **fields}


def parse_world_document(content: bytes) -> Dict[str, Any]:
    """Read a filled world document into draft records. Raises ValueError for a
    file that is not a readable .docx."""
    if not content:
        raise ValueError('The file is empty.')
    if len(content) > MAX_DOCUMENT_BYTES:
        raise ValueError('The document is larger than 2 MB.')
    try:
        document = Document(io.BytesIO(content))
    except Exception as error:  # python-docx raises several types for a bad file
        raise ValueError('This file could not be read as a Word document (.docx).') from error

    drafts: Dict[str, Any] = {'overview': '', 'lore': '', 'locations': [], 'npcs': [], 'factions': [], 'quests': []}
    free_text = {'overview': [], 'lore': []}
    section: Optional[str] = None
    entry: Optional[Dict[str, Any]] = None
    last_field: Optional[str] = None

    def close_entry():
        nonlocal entry
        if entry is not None and section in ('locations', 'npcs', 'factions', 'quests'):
            finished = _finish_entry(section, entry)
            if finished:
                drafts[section].append(finished)
        entry = None

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        level = _heading_level(paragraph)
        if level in (1, 2):
            matched = _section_for(text)
            if matched:
                close_entry()
                section, last_field = matched, None
            continue
        if section is None:
            continue
        if section in ('overview', 'lore'):
            if level == 0:
                free_text[section].append(text)
            continue
        if level >= 3:
            close_entry()
            entry, last_field = _new_entry(section, text), None
            continue
        field_match = re.match(r'^([A-Za-z][A-Za-z &/-]{0,30}):\s*(.*)$', text)
        if entry is None:
            # A "Name: ..." line can start an entry when no Heading 3 was used.
            if field_match and normalise_name(field_match.group(1)) in ('name', 'title'):
                entry, last_field = _new_entry(section, field_match.group(2)), None
            continue
        if field_match:
            label = normalise_name(field_match.group(1))
            if label in ('name', 'title'):
                close_entry()
                entry, last_field = _new_entry(section, field_match.group(2)), None
                continue
            target = FIELDS[section].get(label)
            if target:
                value = field_match.group(2).strip()
                if target == 'objectives':
                    if value:
                        entry['objectives'].append(value.lstrip('-•* ').strip())
                else:
                    entry['fields'][target] = value
                last_field = target
                continue
        if section == 'quests' and (text.startswith(('-', '•', '*')) or last_field == 'objectives'):
            entry['objectives'].append(text.lstrip('-•* ').strip())
            continue
        entry['extra'].append(text)
    close_entry()

    drafts['overview'] = '\n\n'.join(line for line in free_text['overview'] if not line.startswith('A few paragraphs about your world')).strip()
    drafts['lore'] = '\n\n'.join(line for line in free_text['lore'] if not line.startswith('Myths, history, religions')).strip()
    return drafts


def mark_existing(drafts: Dict[str, Any], existing: Dict[str, List[str]]) -> Dict[str, Any]:
    """Flag each draft whose name is already a record in the campaign."""
    names = {key: {normalise_name(value) for value in values} for key, values in existing.items()}
    for section, key in (('locations', 'name'), ('npcs', 'name'), ('quests', 'title')):
        for item in drafts.get(section, []):
            item['exists'] = normalise_name(item.get(key)) in names.get(section, set())
    return drafts
