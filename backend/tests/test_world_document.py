"""The campaign world document: template, reading drafts, and saving them
draft-first and idempotently."""
import asyncio
import io
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

from unittest.mock import AsyncMock, patch  # noqa: E402

import pytest  # noqa: E402
from docx import Document  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.world_document import build_world_template, parse_world_document  # noqa: E402


def filled_document(blocks):
    document = Document()
    for kind, text in blocks:
        if kind == 'h2':
            document.add_heading(text, level=2)
        elif kind == 'h3':
            document.add_heading(text, level=3)
        else:
            document.add_paragraph(text)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


WORLD = [
    ('h2', 'World Overview'), ('p', 'The Shattered Coast, where the sea took the old kingdom.'),
    ('h2', 'Places'),
    ('h3', 'Saltmere'), ('p', 'Type: Port town'), ('p', 'Description: Fog and fish markets.'), ('p', 'Notable people: Old Brannoc'),
    ('h3', 'The Drowned Abbey'), ('p', 'Type: Ruin'), ('p', 'A bell still rings under the water.'),
    ('h2', 'NPCs'),
    ('h3', 'Old Brannoc'), ('p', 'Role: Harbour master'), ('p', 'Race: Dwarf'), ('p', 'Where to find them: Saltmere'), ('p', 'Personality: Gruff, fair.'),
    ('h2', 'Factions'),
    ('h3', 'The Tide Wardens'), ('p', 'Goal: Keep the sea wall standing.'), ('p', 'Leader: Old Brannoc'),
    ('h2', 'Quests'),
    ('h3', 'The Bell Beneath'), ('p', 'Hook: Fishermen hear a bell at night.'), ('p', 'Objectives:'), ('p', '- Dive to the abbey'), ('p', '- Silence the bell'), ('p', 'Reward: 100 gold'),
    ('h2', 'Lore & History'), ('p', 'The kingdom sank in a single night.'),
]


def test_the_blank_template_reads_back_as_empty_drafts():
    drafts = parse_world_document(build_world_template('Shattered Coast'))
    assert drafts['locations'] == [] and drafts['npcs'] == [] and drafts['factions'] == [] and drafts['quests'] == []
    assert drafts['overview'] == '' and drafts['lore'] == ''


def test_a_filled_document_becomes_drafts_with_only_what_was_written():
    drafts = parse_world_document(filled_document(WORLD))
    assert drafts['overview'].startswith('The Shattered Coast')
    assert drafts['lore'] == 'The kingdom sank in a single night.'
    saltmere, abbey = drafts['locations']
    assert saltmere == {'name': 'Saltmere', 'location_type': 'Port town', 'description': 'Fog and fish markets.', 'notable_npcs': 'Old Brannoc'}
    assert abbey['description'] == 'A bell still rings under the water.'
    assert drafts['npcs'] == [{'name': 'Old Brannoc', 'role': 'Harbour master', 'race': 'Dwarf', 'location': 'Saltmere', 'personality': 'Gruff, fair.'}]
    assert drafts['factions'] == [{'name': 'The Tide Wardens', 'goal': 'Keep the sea wall standing.', 'leader': 'Old Brannoc'}]
    quest = drafts['quests'][0]
    assert quest['title'] == 'The Bell Beneath' and quest['objectives'] == ['Dive to the abbey', 'Silence the bell']
    assert 'Reward: 100 gold' in quest['gm_notes']


def test_name_lines_work_without_entry_headings():
    drafts = parse_world_document(filled_document([
        ('h2', 'People'), ('p', 'Name: Sela'), ('p', 'Role: Smuggler'), ('p', 'Name: Tam'), ('p', 'Role: Lookout'),
    ]))
    assert [npc['name'] for npc in drafts['npcs']] == ['Sela', 'Tam']


def test_a_file_that_is_not_a_word_document_is_refused():
    with pytest.raises(ValueError):
        parse_world_document(b'not a docx at all')


# --- saving -----------------------------------------------------------------

def _matches(doc, query):
    return all(doc.get(key) == value for key, value in query.items())


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit):
        return [dict(doc) for doc in self.docs]


class _Collection:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    def find(self, query, _projection=None):
        return _Cursor([doc for doc in self.docs if _matches(doc, query)])

    async def find_one(self, query, _projection=None):
        return next((dict(doc) for doc in self.docs if _matches(doc, query)), None)

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, query, update, upsert=False):
        doc = next((doc for doc in self.docs if _matches(doc, query)), None)
        if doc is None and upsert:
            doc = {**query, **update.get('$setOnInsert', {})}
            self.docs.append(doc)
        if doc is not None:
            doc.update(update.get('$set', {}))


class _Db:
    def __init__(self):
        self.locations = _Collection()
        self.npcs = _Collection([{'campaign_id': 'c1', 'name': 'Old Brannoc'}])
        self.quests = _Collection()
        self.campaign_settings = _Collection([{'campaign_id': 'c1', 'content': 'My own notes about the coast.'}])
        self.campaigns = _Collection([{'id': 'c1', 'name': 'Shattered Coast', 'dm_user_id': 'gm'}])


def _save(db, drafts):
    from routes import world_document
    payload = world_document.WorldDocumentSave(**drafts)
    with patch.object(world_document, 'db', db), patch.object(world_document, 'verify_campaign_ownership', AsyncMock()):
        return asyncio.run(world_document.save_world_document('c1', payload, username='gm'))


def test_saving_adds_new_records_skips_existing_names_and_keeps_the_gms_text():
    db = _Db()
    drafts = parse_world_document(filled_document(WORLD))
    result = _save(db, drafts)
    assert result['created'] == {'locations': 2, 'npcs': 0, 'quests': 1, 'world_text': 3}
    assert result['skipped']['npcs'] == 1  # Old Brannoc was already in the campaign
    content = db.campaign_settings.docs[0]['content']
    # The GM's own text stays the Public Overview; the document's world text
    # goes into Import Parking, never into the public overview.
    public = content.split('## Public Overview\n', 1)[1].split('\n## ', 1)[0]
    parking = content.split('## Import Parking\n', 1)[1]
    assert public.strip() == 'My own notes about the coast.'
    assert 'Faction: The Tide Wardens' in parking and 'The kingdom sank in a single night.' in parking
    quest = db.quests.docs[0]
    assert quest['status'] == 'draft' and [o['title'] for o in quest['objectives']] == ['Dive to the abbey', 'Silence the bell']


def test_saving_the_same_document_twice_adds_nothing_the_second_time():
    db = _Db()
    drafts = parse_world_document(filled_document(WORLD))
    _save(db, drafts)
    again = _save(db, drafts)
    assert again['created'] == {'locations': 0, 'npcs': 0, 'quests': 0, 'world_text': 0}
    assert len(db.locations.docs) == 2 and len(db.quests.docs) == 1


def test_a_structured_world_setting_gets_the_text_under_import_parking():
    db = _Db()
    db.campaign_settings.docs[0]['content'] = '# World Overview\n\n## Public Overview\nThe coast.\n\n## Import Parking\nOld notes.'
    _save(db, {'lore': 'Bells under water.'})
    content = db.campaign_settings.docs[0]['content']
    assert content.endswith('Old notes.\n\nLore & history\nBells under water.')
    assert content.count('## Import Parking') == 1

