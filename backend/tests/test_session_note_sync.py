import asyncio

from utils.session_note_sync import (
    apply_session_note_world_sync,
    propose_session_note_world_sync,
)


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
                for field, spec in (update.get("$addToSet") or {}).items():
                    values = spec.get("$each", [spec]) if isinstance(spec, dict) else [spec]
                    current = list(doc.get(field) or [])
                    for value in values:
                        if value not in current:
                            current.append(value)
                    doc[field] = current
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



def run(coro):
    # asyncio.run, not get_event_loop(): the latter raises "no current event
    # loop" once any earlier test in the session has closed one, so these
    # passed alone and failed in the full suite.
    return asyncio.run(coro)


def note_of(db):
    return db.ingame_notes.docs[0]


def preview(db):
    return run(propose_session_note_world_sync(db, "camp-1", note_of(db)))


def apply(db, approved_ids):
    return run(apply_session_note_world_sync(db, "camp-1", note_of(db), approved_ids))


# --- saving a note must change nothing ------------------------------------

def test_a_note_saying_a_character_died_does_not_touch_their_hit_points():
    db = FakeDb("Aria has died.")
    before = dict(db.player_characters.docs[0])

    result = preview(db)

    assert db.player_characters.docs[0] == before
    assert db.player_characters.updates == []
    # It is still detected -- it is offered, not applied.
    assert any(item["type"] == "player_character_status" for item in result["proposals"])


def test_a_note_about_an_npc_travelling_creates_no_location():
    db = FakeDb("Bran has chosen to move to Moonfall.")

    result = preview(db)

    assert db.locations.docs == []
    assert db.locations.inserts == []
    assert db.npcs.updates == []
    proposal = next(item for item in result["proposals"] if item["type"] == "npc_location")
    assert proposal["destination"] == "Moonfall"
    assert proposal["creates_location"] is True


def test_a_negated_death_is_not_detected_at_all():
    # Preserved from the original suite: "nearly died" is not a death.
    db = FakeDb("Aria nearly died fighting goblins. Bran stayed on the Old Road.")
    assert preview(db)["proposals"] == []
    assert db.player_characters.updates == []


def test_a_rumour_changes_no_permanent_state_even_if_it_is_misread():
    # The detector is not perfect -- it reads "has not died after all" as a
    # death. That used to rewrite a real character. Now the worst it can do is
    # offer a suggestion, which is the whole point of requiring approval.
    db = FakeDb("The party heard a rumour that Aria has not died after all.")
    before = dict(db.player_characters.docs[0])

    preview(db)

    assert db.player_characters.docs[0] == before
    assert db.player_characters.updates == []
    assert db.locations.inserts == []


def test_previewing_twice_changes_nothing_and_offers_the_same_ids():
    db = FakeDb("Aria has died.")
    first = preview(db)
    second = preview(db)

    assert [item["id"] for item in first["proposals"]] == [item["id"] for item in second["proposals"]]
    assert db.player_characters.updates == []


# --- nothing applies without an explicit approval -------------------------

def test_calling_apply_with_no_approval_applies_nothing():
    db = FakeDb("Aria has died. Bran has chosen to move to Moonfall.")
    before = dict(db.player_characters.docs[0])

    result = apply(db, [])

    assert result["applied_updates"] == []
    assert db.player_characters.docs[0] == before
    assert db.locations.inserts == []


def test_an_unknown_proposal_id_applies_nothing():
    db = FakeDb("Aria has died.")
    before = dict(db.player_characters.docs[0])

    result = apply(db, ["not-a-real-proposal"])

    assert result["applied_updates"] == []
    assert db.player_characters.docs[0] == before


def test_approving_one_proposal_applies_only_that_one():
    db = FakeDb("Aria has died. Bran has chosen to move to Moonfall.")
    proposals = preview(db)["proposals"]
    death = next(item for item in proposals if item["type"] == "player_character_status")

    result = apply(db, [death["id"]])

    assert [item["type"] for item in result["applied_updates"]] == ["player_character_status"]
    assert db.player_characters.docs[0]["current_hit_points"] == 0
    assert "dead" in db.player_characters.docs[0]["conditions"]
    # The NPC move was offered but not approved, so nothing moved and no
    # location was invented.
    assert db.locations.inserts == []
    assert db.npcs.docs[0]["location"] == "Old Road"


def test_an_approved_npc_move_creates_the_location_and_moves_them():
    db = FakeDb("Bran has chosen to move to Moonfall.")
    move = next(item for item in preview(db)["proposals"] if item["type"] == "npc_location")

    apply(db, [move["id"]])

    assert db.npcs.docs[0]["location"] == "Moonfall"
    assert [doc["name"] for doc in db.locations.inserts] == ["Moonfall"]


# --- a retry must not apply the same change twice -------------------------

def test_applying_the_same_approval_twice_mutates_once():
    db = FakeDb("Aria has died.")
    death = preview(db)["proposals"][0]

    apply(db, [death["id"]])
    character_writes = len(db.player_characters.updates)

    second = apply(db, [death["id"]])

    assert second["applied_updates"] == []
    assert second["skipped_already_applied"] == [death["id"]]
    assert len(db.player_characters.updates) == character_writes


def test_a_retried_npc_move_does_not_create_the_location_twice():
    db = FakeDb("Bran has chosen to move to Moonfall.")
    move = next(item for item in preview(db)["proposals"] if item["type"] == "npc_location")

    apply(db, [move["id"]])
    apply(db, [move["id"]])

    assert len(db.locations.inserts) == 1


# --- what is written when something IS approved ---------------------------

def test_an_approved_change_is_recorded_on_the_note():
    db = FakeDb("Aria has died.")
    death = preview(db)["proposals"][0]

    apply(db, [death["id"]])

    note = db.ingame_notes.docs[0]
    assert note["world_synced"] is True
    assert death["id"] in note["world_sync_applied_ids"]


def test_an_empty_note_proposes_nothing():
    db = FakeDb("")
    assert preview(db)["proposals"] == []
