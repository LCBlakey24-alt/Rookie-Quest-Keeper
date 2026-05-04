"""
Block B tests: Character templates, character creation with new fields,
HP/temp HP updates, SRD spells filtering.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
TEST_EMAIL = "lcblakey24@outlook.com"
TEST_PASSWORD = "LCBlakey24?!"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_character_ids():
    return []


# =========== Character Templates ===========
class TestCharacterTemplates:
    def test_list_templates_returns_12(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/character-templates", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "templates" in data
        assert len(data["templates"]) == 12, f"expected 12 got {len(data['templates'])}"
        # Ensure each has required summary fields
        for t in data["templates"]:
            for k in ("id", "name", "character_class", "race", "ruleset_id", "playstyle_tags"):
                assert k in t

    def test_list_templates_filter_ruleset(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/character-templates?ruleset_id=dnd5e_2014",
                         headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data["templates"]) == 12
        for t in data["templates"]:
            assert t["ruleset_id"] == "dnd5e_2014"

    def test_list_templates_filter_empty_ruleset(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/character-templates?ruleset_id=nonexistent",
                         headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["templates"] == []

    def test_get_template_full_wizard(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/character-templates/tmpl-elara-wizard",
                         headers=auth_headers)
        assert r.status_code == 200
        t = r.json()
        assert t["character_class"] == "Wizard"
        assert "ability_scores" in t
        assert t["ability_scores"]["intelligence"] == 15
        assert "skill_proficiencies" in t
        assert "Arcana" in t["skill_proficiencies"]
        assert "cantrips_known" in t and len(t["cantrips_known"]) == 3
        assert "spells_known" in t and len(t["spells_known"]) == 6

    def test_get_template_fighter(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/character-templates/tmpl-thorne-fighter",
                         headers=auth_headers)
        assert r.status_code == 200
        t = r.json()
        assert t["fighting_style"] == "Defense"
        assert t["character_class"] == "Fighter"

    def test_get_template_not_found(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/character-templates/does-not-exist",
                         headers=auth_headers)
        assert r.status_code == 404

    def test_ai_match_tank(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/character-templates/ai-match",
                          headers=auth_headers,
                          json={"description": "I want to be a tank melee frontline defender",
                                "ruleset_id": "dnd5e_2014"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "best_match" in data
        assert "rationale" in data
        assert "alternatives" in data
        # Tank keywords should prefer Fighter, Paladin, or Barbarian
        assert data["best_match"]["character_class"] in ("Fighter", "Paladin", "Barbarian")

    def test_ai_match_caster(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/character-templates/ai-match",
                          headers=auth_headers,
                          json={"description": "magic caster ranged scholar with fire",
                                "ruleset_id": "dnd5e_2014"})
        assert r.status_code == 200
        data = r.json()
        assert data["best_match"]["character_class"] in (
            "Wizard", "Sorcerer", "Warlock", "Bard", "Druid", "Cleric")

    def test_ai_match_empty_desc(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/character-templates/ai-match",
                          headers=auth_headers,
                          json={"description": "", "ruleset_id": "dnd5e_2014"})
        assert r.status_code == 400


# =========== Character create with new fields ===========
class TestCharacterCreate:
    def _payload(self, name="TEST_BlockB_Wizard"):
        return {
            "name": name,
            "character_class": "Wizard",
            "race": "Half-Elf",
            "subrace": "",
            "background": "Sage",
            "level": 1,
            "alignment": "Neutral Good",
            "ruleset_id": "dnd5e_2014",
            "strength": 8, "dexterity": 14, "constitution": 13,
            "intelligence": 15, "wisdom": 12, "charisma": 10,
            "hit_points": 7, "max_hit_points": 7, "current_hit_points": 7,
            "temporary_hit_points": 0,
            "armor_class": 12, "initiative": 2, "speed": 30,
            "skill_proficiencies": ["Arcana", "Investigation", "Persuasion", "Insight"],
            "saving_throw_proficiencies": ["intelligence", "wisdom"],
            "tool_proficiencies": [],
            "languages": ["Common", "Elvish", "Draconic"],
            "racial_traits": [{"name": "Darkvision", "description": "60ft"},
                              {"name": "Fey Ancestry", "description": "Advantage vs charm"},
                              {"name": "Skill Versatility", "description": "Pick 2 skills"}],
            "class_features": [{"name": "Spellcasting", "description": "Wizard spellcasting"},
                               {"name": "Arcane Recovery", "description": "Once per day"}],
            "cantrips_known": [{"name": "Fire Bolt"}, {"name": "Mage Hand"},
                               {"name": "Prestidigitation"}],
            "spells_known": [{"name": "Magic Missile"}, {"name": "Shield"},
                             {"name": "Mage Armor"}, {"name": "Detect Magic"},
                             {"name": "Sleep"}, {"name": "Burning Hands"}],
            "spells_prepared": [],
            "fighting_style": "",
            "equipment_choice": "A"
        }

    def test_create_with_new_fields_and_verify_persist(self, auth_headers, created_character_ids):
        payload = self._payload()
        r = requests.post(f"{BASE_URL}/api/characters", headers=auth_headers, json=payload)
        assert r.status_code in (200, 201), r.text
        char = r.json()
        char_id = char.get("id") or char.get("_id") or char.get("character_id")
        assert char_id, f"no id in response: {char}"
        created_character_ids.append(char_id)

        # GET back and verify new fields persisted
        g = requests.get(f"{BASE_URL}/api/characters/{char_id}", headers=auth_headers)
        assert g.status_code == 200
        fetched = g.json()
        assert fetched["name"] == payload["name"]
        assert fetched["character_class"] == "Wizard"
        assert fetched["race"] == "Half-Elf"
        assert set(fetched.get("skill_proficiencies", [])) >= {"Arcana", "Investigation"}
        assert set(fetched.get("languages", [])) >= {"Common", "Elvish"}
        traits_names = {t.get("name") if isinstance(t, dict) else t
                        for t in fetched.get("racial_traits", [])}
        assert "Darkvision" in traits_names
        feat_names = {f.get("name") if isinstance(f, dict) else f
                      for f in fetched.get("class_features", [])}
        assert "Spellcasting" in feat_names
        cantrip_names = {c.get("name") if isinstance(c, dict) else c
                         for c in fetched.get("cantrips_known", [])}
        assert "Fire Bolt" in cantrip_names
        spell_names = {s.get("name") if isinstance(s, dict) else s
                       for s in fetched.get("spells_known", [])}
        assert "Magic Missile" in spell_names

    def test_patch_temp_hp_and_current_hp_clamp(self, auth_headers, created_character_ids):
        if not created_character_ids:
            pytest.skip("no created character")
        cid = created_character_ids[0]

        # Add temp HP
        r = requests.patch(f"{BASE_URL}/api/characters/{cid}",
                           headers=auth_headers,
                           json={"temporary_hit_points": 5})
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE_URL}/api/characters/{cid}", headers=auth_headers)
        assert g.json().get("temporary_hit_points") == 5

        # Set current HP higher than max -> should clamp
        r = requests.patch(f"{BASE_URL}/api/characters/{cid}",
                           headers=auth_headers,
                           json={"current_hit_points": 999})
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/characters/{cid}", headers=auth_headers)
        fetched = g.json()
        max_hp = fetched.get("max_hit_points", 7)
        assert fetched.get("current_hit_points") <= max_hp, f"should clamp to {max_hp}"

        # Lower current HP to 3 -> should persist
        r = requests.patch(f"{BASE_URL}/api/characters/{cid}",
                           headers=auth_headers,
                           json={"current_hit_points": 3})
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/characters/{cid}", headers=auth_headers)
        assert g.json().get("current_hit_points") == 3


# =========== SRD spells filtering ===========
class TestSRDSpellsFilter:
    def test_wizard_only(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/srd/spells?class_name=Wizard", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        spells = data if isinstance(data, list) else data.get("spells", data)
        assert len(spells) > 0
        # Ensure all returned spells list Wizard as a class
        for s in spells[:20]:
            classes = s.get("classes") or []
            classes_lower = [c.lower() for c in classes]
            assert any("wizard" in c for c in classes_lower), f"non-wizard spell: {s.get('name')}"

    def test_cleric_level_1(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/srd/spells?class_name=Cleric&level=1",
                         headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        spells = data if isinstance(data, list) else data.get("spells", data)
        assert len(spells) > 0
        for s in spells[:20]:
            assert s.get("level") == 1, f"wrong level: {s.get('name')}={s.get('level')}"
            classes = [c.lower() for c in (s.get("classes") or [])]
            assert any("cleric" in c for c in classes)


# =========== Cleanup ===========
def test_zzz_cleanup(auth_headers, created_character_ids):
    for cid in created_character_ids:
        try:
            requests.delete(f"{BASE_URL}/api/characters/{cid}", headers=auth_headers)
        except Exception:
            pass
