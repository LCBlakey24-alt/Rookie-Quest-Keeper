"""Character-sheet import helpers.

Players can upload a PDF or image of an existing character sheet. The file is
sent directly to OpenAI for a one-shot extraction and is not persisted by RQK.
The response is deliberately review-first: imported values are returned to the
client for confirmation before a character is created.
"""

import base64
import json
import mimetypes
import os
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from openai import AsyncOpenAI

from config import logger
from utils.auth import get_current_user
from utils.llm_provider import get_llm_api_key


router = APIRouter()

MAX_CHARACTER_SHEET_BYTES = 10 * 1024 * 1024
ALLOWED_CHARACTER_SHEET_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
}

CHARACTER_FIELDS = [
    "name",
    "race",
    "subrace",
    "character_class",
    "subclass",
    "background",
    "level",
    "edition",
    "hit_die",
    "armor_class",
    "speed",
    "max_hit_points",
    "current_hit_points",
    "temporary_hit_points",
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
    "skills_text",
    "saving_throws_text",
    "languages_text",
    "racial_traits_text",
    "class_features_text",
    "feats_text",
    "equipment_text",
    "spells_text",
    "cantrips_text",
    "backstory",
]


def _safe_filename(filename: str) -> str:
    """Keep a harmless display filename for model context and the response."""
    cleaned = Path(filename or "character-sheet").name.strip()
    return cleaned[:180] or "character-sheet"


def _resolved_content_type(upload: UploadFile) -> str:
    """Resolve browser MIME quirks without accepting arbitrary file types."""
    declared = (upload.content_type or "").lower().split(";")[0].strip()
    if declared in ALLOWED_CHARACTER_SHEET_TYPES:
        return declared

    guessed, _ = mimetypes.guess_type(upload.filename or "")
    guessed = (guessed or "").lower()
    if guessed in ALLOWED_CHARACTER_SHEET_TYPES:
        return guessed

    # Some clients still label JPEGs as image/jpg.
    if declared == "image/jpg":
        return "image/jpeg"
    return declared


def _character_schema() -> Dict:
    """Structured-output schema used by the extraction model.

    Sheet values are strings on purpose. A blank string means the source did
    not clearly contain the value; the frontend's existing importer then
    normalises numbers and applies defaults only during the review step.
    """
    character_properties = {
        field: {
            "type": "string",
            "description": f"Character-sheet value for {field}; use an empty string when unreadable or absent.",
        }
        for field in CHARACTER_FIELDS
    }

    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "character": {
                "type": "object",
                "additionalProperties": False,
                "properties": character_properties,
                "required": CHARACTER_FIELDS,
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Overall confidence that the character sheet was read correctly.",
            },
            "warnings": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Short, player-facing warnings about anything ambiguous or unreadable.",
            },
            "needs_review": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Names of fields that the player should verify manually.",
            },
        },
        "required": ["character", "confidence", "warnings", "needs_review"],
    }


def _normalise_extraction(payload: Dict, filename: str) -> Dict:
    """Constrain model output to the importer contract before returning it."""
    raw_character = payload.get("character") if isinstance(payload, dict) else {}
    raw_character = raw_character if isinstance(raw_character, dict) else {}
    character = {field: str(raw_character.get(field) or "").strip() for field in CHARACTER_FIELDS}

    try:
        confidence = float(payload.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    warnings = payload.get("warnings") if isinstance(payload, dict) else []
    warnings = [str(item).strip() for item in warnings or [] if str(item).strip()][:12]

    needs_review = payload.get("needs_review") if isinstance(payload, dict) else []
    valid_fields = set(CHARACTER_FIELDS)
    needs_review = [
        str(item).strip()
        for item in needs_review or []
        if str(item).strip() in valid_fields
    ][:20]

    return {
        "character": character,
        "confidence": confidence,
        "warnings": warnings,
        "needs_review": needs_review,
        "source_file_name": filename,
    }


def _build_model_content(data: bytes, content_type: str, filename: str) -> List[Dict]:
    encoded = base64.b64encode(data).decode("ascii")
    prompt = {
        "type": "input_text",
        "text": (
            "Read this tabletop RPG character sheet and extract the character exactly as written. "
            "This importer is primarily for D&D 5e sheets, including 2014, 2024, multiclass, and homebrew characters. "
            "Never invent a value just because it would normally exist on a D&D sheet. If a field is absent, blank, or unreadable, return an empty string for that field and add the field name to needs_review when useful. "
            "Preserve custom/homebrew names verbatim. For multiclass characters, keep the class breakdown in character_class (for example 'Fighter 3 / Rogue 2') and only provide total level when it is visible or unambiguous on the sheet. "
            "For skills, saves, languages, traits, features, feats, equipment, spells, and cantrips, return newline-separated plain text. "
            "For edition use only '2014', '2024', or an empty string. For hit_die use d6, d8, d10, d12, or an empty string. "
            "Do not calculate missing HP, AC, ability scores, proficiency bonus, spell slots, or modifiers. "
            "The player will review every extracted value before saving it."
        ),
    }

    if content_type == "application/pdf":
        source = {
            "type": "input_file",
            "filename": filename,
            "file_data": encoded,
        }
    else:
        source = {
            "type": "input_image",
            "image_url": f"data:{content_type};base64,{encoded}",
            "detail": "high",
        }

    return [prompt, source]


@router.post("/character-import/extract")
async def extract_character_sheet(
    file: UploadFile = File(...),
    username: str = Depends(get_current_user),
):
    """Extract reviewable character data from a player-supplied PDF or image."""
    del username  # Authentication is required; no account data is sent to the model.

    content_type = _resolved_content_type(file)
    if content_type not in ALLOWED_CHARACTER_SHEET_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PDF, PNG, JPG, or WEBP character sheet.",
        )

    data = await file.read(MAX_CHARACTER_SHEET_BYTES + 1)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded character sheet is empty.")
    if len(data) > MAX_CHARACTER_SHEET_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Character sheets must be 10 MB or smaller.",
        )

    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character-sheet scanning is temporarily unavailable. You can still enter the character manually.",
        )

    filename = _safe_filename(file.filename)
    client = AsyncOpenAI(api_key=api_key)
    model = os.environ.get("CHARACTER_IMPORT_MODEL", "gpt-5.6-luna")

    try:
        response = await client.responses.create(
            model=model,
            store=False,
            input=[
                {
                    "role": "user",
                    "content": _build_model_content(data, content_type, filename),
                }
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "character_sheet_extraction",
                    "strict": True,
                    "schema": _character_schema(),
                }
            },
        )
        raw_text = response.output_text or ""
        parsed = json.loads(raw_text)
        return _normalise_extraction(parsed, filename)
    except json.JSONDecodeError as exc:
        logger.warning("Character import returned invalid JSON for %s: %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The sheet was read, but the extracted character data could not be understood. Please try again or enter it manually.",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Character sheet extraction failed for %s", filename)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We could not scan that character sheet. Try a clearer PDF/image or enter the character manually.",
        ) from exc
