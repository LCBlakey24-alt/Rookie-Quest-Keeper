"""Focused regressions for the review-first character sheet importer."""

import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# config.py deliberately fails fast without runtime configuration. Unit tests
# only exercise pure import helpers, so safe local values are sufficient here.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-import-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_import import (  # noqa: E402
    CHARACTER_FIELDS,
    _build_model_content,
    _character_schema,
    _normalise_extraction,
    _resolved_content_type,
    _safe_filename,
)


class TestCharacterImportHelpers(unittest.TestCase):
    def test_safe_filename_removes_parent_path(self):
        self.assertEqual(_safe_filename("../../private/Javen Sheet.pdf"), "Javen Sheet.pdf")
        self.assertEqual(_safe_filename(""), "character-sheet")

    def test_content_type_falls_back_to_extension(self):
        upload = SimpleNamespace(content_type="application/octet-stream", filename="hero.PDF")
        self.assertEqual(_resolved_content_type(upload), "application/pdf")

        jpeg = SimpleNamespace(content_type="image/jpg", filename="photo.unknown")
        self.assertEqual(_resolved_content_type(jpeg), "image/jpeg")

    def test_schema_requires_every_supported_character_field(self):
        schema = _character_schema()
        character_schema = schema["properties"]["character"]
        self.assertEqual(set(character_schema["required"]), set(CHARACTER_FIELDS))
        self.assertFalse(character_schema["additionalProperties"])

    def test_normalise_extraction_clamps_and_filters_model_output(self):
        payload = {
            "character": {"name": "  Javen  ", "character_class": " Warlock 8 "},
            "confidence": 7,
            "warnings": ["  Check handwritten HP  ", ""],
            "needs_review": ["max_hit_points", "not_a_character_field"],
        }
        result = _normalise_extraction(payload, "javen.pdf")

        self.assertEqual(result["character"]["name"], "Javen")
        self.assertEqual(result["character"]["character_class"], "Warlock 8")
        self.assertEqual(result["character"]["race"], "")
        self.assertEqual(result["confidence"], 1.0)
        self.assertEqual(result["warnings"], ["Check handwritten HP"])
        self.assertEqual(result["needs_review"], ["max_hit_points"])

    def test_pdf_is_sent_as_file_and_image_as_data_url(self):
        pdf_content = _build_model_content(b"%PDF-test", "application/pdf", "sheet.pdf")
        self.assertEqual(pdf_content[1]["type"], "input_file")
        self.assertEqual(pdf_content[1]["filename"], "sheet.pdf")
        self.assertTrue(pdf_content[1]["file_data"])

        image_content = _build_model_content(b"image-bytes", "image/png", "sheet.png")
        self.assertEqual(image_content[1]["type"], "input_image")
        self.assertTrue(image_content[1]["image_url"].startswith("data:image/png;base64,"))
        self.assertEqual(image_content[1]["detail"], "high")


if __name__ == "__main__":
    unittest.main()
