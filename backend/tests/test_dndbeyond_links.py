"""Tests for safe, metadata-only D&D Beyond character sheet links."""
import unittest
from utils.dndbeyond_links import parse_dndbeyond_share_link


class DndBeyondShareLinkTests(unittest.TestCase):
    def test_supported_public_character_share_link(self):
        link = parse_dndbeyond_share_link("https://www.dndbeyond.com/characters/12345678?utm_source=share")
        self.assertEqual(link, {
            "url": "https://www.dndbeyond.com/characters/12345678",
            "character_id": "12345678",
            "import_status": "link_only_manual_import_required",
            "sync_status": "not_available",
        })

    def test_preserves_share_code_at_end_of_character_link(self):
        link = parse_dndbeyond_share_link("https://www.dndbeyond.com/characters/150614396/B9Mp61?foo=bar")
        self.assertEqual(link["url"], "https://www.dndbeyond.com/characters/150614396/B9Mp61")
        self.assertEqual(link["character_id"], "150614396")

    def test_profile_style_url_resolves_to_same_character(self):
        link = parse_dndbeyond_share_link(
            "https://www.dndbeyond.com/profile/example-user/characters/90001234"
        )
        self.assertEqual(link["character_id"], "90001234")

    def test_blocks_fake_domains_private_hosts_and_non_characters(self):
        forbidden = [
            "", "file:///etc/hosts", "http://www.dndbeyond.com/characters/12",
            "https://www.dndbeyond.com.evil.test/characters/12",
            "https://dndbeyond.com@evil.test/characters/12",
            "https://www.dndbeyond.com@evil.test/characters/12",
            "https://www.dndbeyond.com:8021/characters/12",
            "https://www.dndbeyond.com/characters/not-a-number",
            "https://www.dndbeyond.com/characters/0",
            "https://www.dndbeyond.com/marketplace/characters/123",
            "https://www.dndbeyond.com/characters/123/../../private",
            "https://www.dndbeyond.com/characters/123\r\nOther: injected",
        ]
        for value in forbidden:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    parse_dndbeyond_share_link(value)

    def test_cannot_capture_credentials_or_private_profile_data(self):
        raw = "https://www.dndbeyond.com/profile/player_name/characters/87654321?secret=abc"
        result = parse_dndbeyond_share_link(raw)
        self.assertEqual(result["url"], "https://www.dndbeyond.com/characters/87654321")
        self.assertNotIn("secret", str(result))
        self.assertNotIn("player_name", str(result))


if __name__ == "__main__":
    unittest.main()
