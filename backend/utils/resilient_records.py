"""Send stored campaign records without letting one bad row hide the rest.

A list endpoint declared ``response_model=List[Model]`` validates every
document before FastAPI will send any of them. One record whose stored shape
has drifted from the model -- an ``ac`` of ``null``, an ``hp`` of
``"41 (6d8+12)"``, a ``cr`` stored as a number rather than a string -- raises
ResponseValidationError, and the whole request becomes a 500. The GM is then
told their NPCs "could not be loaded" while all 32 of them are sitting safely
in the database.

That trade is wrong for a read path. A campaign is fed by importers, by PDF
extraction and by whatever a GM pastes in, so a record drifting from the
model is ordinary rather than exceptional. It should cost that one record
some polish, not the entire roster.

Nothing here writes to the database. A repair applies to the copy being sent
to the browser and the stored document is left exactly as it was, so the
original is still there to be corrected. Repaired records say so, through
``needs_repair`` and ``repaired_fields``, rather than quietly presenting a
guess as campaign canon. No value is invented: a field that cannot be read is
dropped so the model's own documented default applies.
"""

import re
from typing import Any, Dict, List, Type

from pydantic import BaseModel, ValidationError

# Marks a record whose stored shape had to be worked around on the way out.
REPAIR_FLAG = 'needs_repair'
REPAIR_FIELDS = 'repaired_fields'

_LEADING_INT = re.compile(r'^\s*(-?\d+)')


def _leading_int(value: Any):
    """Read the number a stat block leads with: "41 (6d8+12)" is 41 hit points.

    Only a leading integer counts. Anything else is left for the caller to
    drop, because guessing at "about a dozen" would be inventing a statistic.
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    match = _LEADING_INT.match(str(value or ''))
    return int(match.group(1)) if match else None


def _repair(error_type: str, value: Any):
    """Return (handled, replacement) for one failing field.

    handled=False means the field is dropped and the model's default applies.
    """
    if value is None:
        return False, None
    if error_type in ('int_parsing', 'int_type', 'float_parsing', 'float_type'):
        parsed = _leading_int(value)
        return (True, parsed) if parsed is not None else (False, None)
    if error_type in ('string_type', 'string_pattern_mismatch'):
        # A number that should have been text reads back as itself; a list or
        # dict does not, so it is dropped rather than stringified into noise.
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return True, str(value)
        return False, None
    if error_type in ('bool_parsing', 'bool_type'):
        text = str(value).strip().lower()
        if text in ('true', 'yes', '1'):
            return True, True
        if text in ('false', 'no', '0'):
            return True, False
        return False, None
    # Lists, nested models and everything else: drop to the documented default.
    return False, None


def serialise_record(model: Type[BaseModel], document: Dict[str, Any],
                     required: Dict[str, Any] = None) -> Dict[str, Any]:
    """Validate one stored document, repairing whatever stops it validating.

    ``required`` supplies values for fields the model demands but the document
    cannot provide -- the campaign id, which the caller queried by and so
    already knows, and a placeholder name so a nameless row is still visible
    and editable rather than silently missing.
    """
    required = required or {}
    working = dict(document)
    repaired: List[str] = []

    # Each pass either fixes a field, drops one, or supplies a missing
    # required one, so the number of fields bounds the work.
    for _ in range(len(working) + len(required) + 3):
        try:
            validated = model(**working).model_dump()
        except ValidationError as error:
            progressed = False
            for item in error.errors():
                location = item.get('loc') or ()
                if not location:
                    continue
                field = str(location[0])
                if item.get('type') == 'missing':
                    if field in required:
                        working[field] = required[field]
                        progressed = True
                    continue
                if field not in working:
                    continue
                handled, replacement = _repair(str(item.get('type')), working[field])
                if handled:
                    working[field] = replacement
                else:
                    working.pop(field, None)
                if field not in repaired:
                    repaired.append(field)
                progressed = True
            if not progressed:
                break
            continue
        if repaired:
            validated[REPAIR_FLAG] = True
            validated[REPAIR_FIELDS] = sorted(repaired)
        return validated

    # Unreachable for any model whose non-required fields all have defaults,
    # but a read path must not raise even when that stops being true.
    fallback = dict(document)
    fallback[REPAIR_FLAG] = True
    fallback[REPAIR_FIELDS] = sorted(repaired) or ['unknown']
    return fallback


def serialise_records(model: Type[BaseModel], documents, required: Dict[str, Any] = None):
    """Serialise a whole list. One unreadable record never hides the others."""
    return [serialise_record(model, document, required) for document in (documents or [])]
