import asyncio

from utils.session_note_sync import apply_session_note_world_sync


class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit):
        return [doc.copy() for doc in self.docs]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []
        self.updates = []
        self.inserts = []

    def find(self, query, projection=None):
        docs = []
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                if projection and projection.get("_id") == 0:
                    docs.append({key: value for key, value in doc.items() if key != "_id"})
                else:
                    docs.append(doc)
        return FakeCursor(docs)

    async def update_one(self, query, update):
        self.updates.append((query, update))
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                doc.update(update.get("$set", {}))
                break

    async def insert_one(self, doc):
        self.inserts.append(doc)
        self.docs.append(doc)


class FakeDb:
    def __init__(self, note_text="Aria has died. Bran has chosen to move to Moonfall."):
        self.player_characters = FakeCollection([
            {"id": "char-1", "campaign_id": "camp-1", "name": "Aria", "current_hit_points": 12, "conditions": [], "notes": ""}
        ])
        self.npcs = FakeCollection([
            {"id": "npc-1", "campaign_id": "camp-1", "name": "Bran", "location": "Old Road", "notes": ""}
        ])
        self.locations = FakeCollection([])
        self.ingame_notes = FakeCollection([
            {"id": "note-1", "campaign_id": "camp-1", "content": note_text}
        ])


def test_session_note_sync_marks_dead_character_and_moves_npc():
    db = FakeDb()
    note = db.ingame_notes.docs[0]

    result = asyncio.run(apply_session_note_world_sync(db, "camp-1", note))

    assert "player_characters" in result["touched_collections"]
    assert "npcs" in result["touched_collections"]
    assert "locations" in result["touched_collections"]
    assert db.player_characters.docs[0]["current_hit_points"] == 0
    assert "dead" in db.player_characters.docs[0]["conditions"]
    assert db.npcs.docs[0]["location"] == "Moonfall"
    assert db.locations.docs[0]["name"] == "Moonfall"
    assert db.ingame_notes.docs[0]["world_synced"] is True


def test_session_note_sync_ignores_negated_death_phrases():
    db = FakeDb("Aria nearly died fighting goblins. Bran stayed on the Old Road.")
    note = db.ingame_notes.docs[0]

    result = asyncio.run(apply_session_note_world_sync(db, "camp-1", note))

    assert "player_characters" not in result["touched_collections"]
    assert result["applied_updates"] == []
    assert db.player_characters.docs[0]["current_hit_points"] == 12
    assert db.player_characters.docs[0]["conditions"] == []
    assert db.ingame_notes.docs[0]["world_synced"] is True
