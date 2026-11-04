"""Every route that generates text must carry the campaign source boundary.

A GM who starts a campaign set in someone else's world and saves nothing
into it should get back original material, not that world's canon. The
instruction that says so already exists in routes/ai.py; what was missing
was a check that it reaches every call site.

Three did not have it -- session recaps, homebrew draft completion, and the
premade-character rationale -- which is the kind of gap that appears one
route at a time rather than all at once. This test enumerates the call
sites from the source rather than from a list someone has to remember to
update, so a new generative route without the boundary fails here.

What this does not do: a prompt is an instruction, not a guarantee. A model
can still reach for what it was trained on. This closes the gap where we
were not even asking.
"""

import os
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "boundary-coverage-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

ROUTES_DIR = BACKEND_DIR / 'routes'

# A module sends something to a model if it builds a chat or passes a system
# message. Matching the source keeps this honest when a new route is added.
CALLS_MODEL = re.compile(r'LlmChat\(|system_message\s*=|_llm_json\(')
HAS_BOUNDARY = re.compile(r'source_boundary|SOURCE_BOUNDARY', re.IGNORECASE)


def model_calling_modules():
    found = []
    for path in sorted(ROUTES_DIR.glob('*.py')):
        text = path.read_text(encoding='utf-8')
        if CALLS_MODEL.search(text):
            found.append((path.name, text))
    return found


def test_the_scan_finds_the_known_generative_routes():
    """Guards the scan itself.

    If the regex stops matching, every assertion below would pass over an
    empty list and this file would protect nothing.
    """
    names = [name for name, _ in model_calling_modules()]
    assert 'rook_chat.py' in names
    assert 'rook_studio.py' in names
    assert 'notes.py' in names
    assert len(names) >= 6


def test_every_model_calling_route_carries_the_source_boundary():
    missing = [name for name, text in model_calling_modules() if not HAS_BOUNDARY.search(text)]
    assert missing == [], (
        'These routes send prompts to a model without the campaign source '
        'boundary, so they may answer from training data rather than from '
        'the GM\'s saved campaign: ' + ', '.join(missing)
    )


def test_the_boundary_still_refuses_published_settings():
    """The wording is the whole protection, so changes to it are deliberate."""
    from routes.ai import ai_source_boundary_fragment

    boundary = ai_source_boundary_fragment().lower()
    assert 'actual-play' in boundary
    assert 'third-party ip' in boundary
    assert 'published settings' in boundary
    # Thin context must lead to a question or original material, never to
    # known lore filling the gap. This is the Wildemount case exactly.
    assert 'thin' in boundary


def test_the_boundary_tells_the_model_what_it_may_use():
    from routes.ai import ai_source_boundary_fragment

    boundary = ai_source_boundary_fragment().lower()
    assert 'saved campaign data' in boundary
    assert 'srd' in boundary


def test_a_genre_label_is_mood_not_licence():
    """Picking "high fantasy" must not import a named world's lore."""
    from routes.ai import ai_source_boundary_fragment

    assert 'mood only' in ai_source_boundary_fragment().lower()


def test_session_recaps_carry_the_boundary():
    """The most exposed route: a storyteller prompt over a thin campaign."""
    from routes import notes

    assert 'actual-play' in notes._source_boundary().lower()


def test_homebrew_completion_carries_the_boundary():
    from routes import homebrew

    assert 'third-party ip' in homebrew._source_boundary().lower()
