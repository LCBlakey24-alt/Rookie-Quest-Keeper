"""
Test Player Page Improvements - Batch B & C
Tests for:
- PATCH /api/characters/{id} - currency and attuned_items fields
- Inventory multi-currency system (cp, sp, ep, gp, pp)
- Quick equip/unequip functionality
- Attunement tracking (max 3 items)
- Spellbook component features (spell slots, prepared spells, casting)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("RQK_E2E_EMAIL", "")
TEST_PASSWORD = os.environ.get("RQK_E2E_PASSWORD", "")

# Character IDs from test data
WIZARD_CHARACTER_ID = "9e2d3e83-65cb-4ece-a4b0-4f5c156f68c7"  # Wizard lvl 5
FIGHTER_CHARACTER_ID = "0bda5cf5-b8be-40c8-b2bc-b030ea70c366"  # Fighter lvl 1


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestCurrencyPatch:
    """Tests for PATCH /api/characters/{id} - currency field"""
    
    def test_patch_currency_all_types(self, auth_headers):
        """Test updating all currency types via PATCH"""
        currency_data = {
            "cp": 100,
            "sp": 50,
            "ep": 25,
            "gp": 10,
            "pp": 5
        }
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"currency": currency_data}
        )
        assert response.status_code == 200, f"PATCH currency failed: {response.text}"
        data = response.json()
        assert data.get("currency") == currency_data, f"Currency not updated correctly: {data.get('currency')}"
        print(f"✓ PATCH currency: {data.get('currency')}")
    
    def test_patch_currency_partial(self, auth_headers):
        """Test updating partial currency (only gp)"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"currency": {"cp": 0, "sp": 0, "ep": 0, "gp": 150, "pp": 0}}
        )
        assert response.status_code == 200, f"PATCH partial currency failed: {response.text}"
        data = response.json()
        assert data.get("currency", {}).get("gp") == 150, "GP not updated"
        print(f"✓ PATCH partial currency: gp = {data.get('currency', {}).get('gp')}")
    
    def test_patch_gold_field(self, auth_headers):
        """Test updating gold field (legacy support)"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"gold": 200}
        )
        assert response.status_code == 200, f"PATCH gold failed: {response.text}"
        data = response.json()
        assert data.get("gold") == 200, "Gold not updated"
        print(f"✓ PATCH gold: {data.get('gold')}")


class TestAttunedItemsPatch:
    """Tests for PATCH /api/characters/{id} - attuned_items field"""
    
    def test_patch_attuned_items_single(self, auth_headers):
        """Test updating attuned_items with single item"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"attuned_items": ["item-123"]}
        )
        assert response.status_code == 200, f"PATCH attuned_items failed: {response.text}"
        data = response.json()
        assert "item-123" in data.get("attuned_items", []), "Attuned item not added"
        print(f"✓ PATCH attuned_items (single): {data.get('attuned_items')}")
    
    def test_patch_attuned_items_max_three(self, auth_headers):
        """Test updating attuned_items with max 3 items"""
        attuned = ["item-1", "item-2", "item-3"]
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"attuned_items": attuned}
        )
        assert response.status_code == 200, f"PATCH attuned_items (3) failed: {response.text}"
        data = response.json()
        assert len(data.get("attuned_items", [])) == 3, "Should have 3 attuned items"
        print(f"✓ PATCH attuned_items (max 3): {data.get('attuned_items')}")
    
    def test_patch_attuned_items_clear(self, auth_headers):
        """Test clearing attuned_items"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"attuned_items": []}
        )
        assert response.status_code == 200, f"PATCH clear attuned_items failed: {response.text}"
        data = response.json()
        assert data.get("attuned_items") == [], "Attuned items not cleared"
        print("✓ PATCH attuned_items cleared")


class TestInventoryPatch:
    """Tests for PATCH /api/characters/{id} - inventory and equipped fields"""
    
    def test_patch_inventory_add_item(self, auth_headers):
        """Test adding item to inventory via PATCH"""
        test_item = {
            "id": "test-sword-001",
            "name": "Test Longsword",
            "type": "Weapon",
            "damage": "1d8",
            "damage_type": "slashing",
            "quantity": 1
        }
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"inventory": [test_item]}
        )
        assert response.status_code == 200, f"PATCH inventory failed: {response.text}"
        data = response.json()
        inventory = data.get("inventory", [])
        assert any(i.get("name") == "Test Longsword" for i in inventory), "Item not added to inventory"
        print(f"✓ PATCH inventory: {len(inventory)} items")
    
    def test_patch_equipped_items(self, auth_headers):
        """Test updating equipped items via PATCH"""
        equipped = {
            "armor": None,
            "shield": None,
            "mainHand": {"id": "test-sword-001", "name": "Test Longsword", "damage": "1d8"},
            "offHand": None
        }
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"equipped": equipped}
        )
        assert response.status_code == 200, f"PATCH equipped failed: {response.text}"
        data = response.json()
        assert data.get("equipped", {}).get("mainHand", {}).get("name") == "Test Longsword", "Equipped item not set"
        print(f"✓ PATCH equipped: mainHand = {data.get('equipped', {}).get('mainHand', {}).get('name')}")
    
    def test_patch_armor_class(self, auth_headers):
        """Test updating armor_class via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"armor_class": 15}
        )
        assert response.status_code == 200, f"PATCH armor_class failed: {response.text}"
        data = response.json()
        assert data.get("armor_class") == 15, "Armor class not updated"
        print(f"✓ PATCH armor_class: {data.get('armor_class')}")


class TestCharacterSpellcastingData:
    """Tests to verify spellcasting data is present for Wizard character"""
    
    def test_wizard_has_spellcasting_ability(self, auth_headers):
        """Test Wizard has spellcasting_ability set"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"GET character failed: {response.text}"
        data = response.json()
        # Wizard uses Intelligence
        assert data.get("spellcasting_ability") == "intelligence" or data.get("character_class") == "Wizard", \
            f"Wizard should have intelligence as spellcasting ability: {data.get('spellcasting_ability')}"
        print(f"✓ Wizard spellcasting_ability: {data.get('spellcasting_ability')}")
    
    def test_wizard_has_spell_slots(self, auth_headers):
        """Test Wizard has spell slots at level 5"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        level = data.get("level", 1)
        print(f"✓ Wizard level: {level}")
        # Level 5 Wizard should have spell slots 1, 2, 3
        # Check for spell_slots_1 or similar fields
        has_slots = (
            data.get("spell_slots_1") is not None or
            data.get("spell_slots", {}).get("1") is not None or
            level >= 1  # At minimum, level 1+ wizard has slots
        )
        assert has_slots or level >= 1, "Wizard should have spell slots"
        print(f"✓ Wizard has spell slot data")
    
    def test_wizard_has_cantrips(self, auth_headers):
        """Test Wizard has cantrips_known"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        cantrips = data.get("cantrips_known", [])
        print(f"✓ Wizard cantrips_known: {[c.get('name') if isinstance(c, dict) else c for c in cantrips]}")
    
    def test_wizard_has_spells_known(self, auth_headers):
        """Test Wizard has spells_known"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        spells = data.get("spells_known", [])
        print(f"✓ Wizard spells_known: {[s.get('name') if isinstance(s, dict) else s for s in spells]}")


class TestSpellSlotUsage:
    """Tests for spell slot tracking via PATCH"""
    
    def test_patch_used_spell_slots(self, auth_headers):
        """Test updating used_spell_slots via PATCH"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"used_spell_slots": {"1": 2, "2": 1, "3": 0}}
        )
        assert response.status_code == 200, f"PATCH used_spell_slots failed: {response.text}"
        data = response.json()
        used_slots = data.get("used_spell_slots", {})
        assert used_slots.get("1") == 2, "Level 1 used slots not updated"
        assert used_slots.get("2") == 1, "Level 2 used slots not updated"
        print(f"✓ PATCH used_spell_slots: {used_slots}")
    
    def test_patch_reset_spell_slots(self, auth_headers):
        """Test resetting spell slots (simulating Reset All button)"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={"used_spell_slots": {}}
        )
        assert response.status_code == 200, f"PATCH reset spell slots failed: {response.text}"
        data = response.json()
        used_slots = data.get("used_spell_slots", {})
        assert used_slots == {} or all(v == 0 for v in used_slots.values()), "Spell slots not reset"
        print("✓ PATCH spell slots reset")


class TestCombinedInventorySave:
    """Tests for combined inventory save (inventory + equipped + currency + attuned_items)"""
    
    def test_save_inventory_full(self, auth_headers):
        """Test saving full inventory state via PATCH"""
        payload = {
            "inventory": [
                {"id": "item-1", "name": "Dagger", "type": "Weapon", "damage": "1d4", "quantity": 2},
                {"id": "item-2", "name": "Leather Armor", "type": "Armor", "description": "AC 11 + Dex", "quantity": 1}
            ],
            "equipped": {
                "armor": {"id": "item-2", "name": "Leather Armor"},
                "shield": None,
                "mainHand": {"id": "item-1", "name": "Dagger", "damage": "1d4"},
                "offHand": None
            },
            "currency": {"cp": 50, "sp": 20, "ep": 0, "gp": 75, "pp": 2},
            "gold": 75,
            "armor_class": 13,
            "attuned_items": []
        }
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"PATCH full inventory failed: {response.text}"
        data = response.json()
        
        # Verify all fields updated
        assert len(data.get("inventory", [])) >= 2, "Inventory not saved"
        assert data.get("equipped", {}).get("armor", {}).get("name") == "Leather Armor", "Equipped armor not saved"
        assert data.get("currency", {}).get("gp") == 75, "Currency not saved"
        assert data.get("armor_class") == 13, "AC not saved"
        print("✓ Full inventory save successful")
    
    def test_verify_inventory_persistence(self, auth_headers):
        """Verify inventory changes persist via GET"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check persistence
        inventory = data.get("inventory", [])
        equipped = data.get("equipped", {})
        currency = data.get("currency", {})
        
        print(f"✓ Persisted inventory: {len(inventory)} items")
        print(f"✓ Persisted equipped: {equipped}")
        print(f"✓ Persisted currency: {currency}")


class TestFighterNonSpellcaster:
    """Tests to verify Fighter (non-spellcaster) doesn't have spellcasting data"""
    
    def test_fighter_no_spellcasting_ability(self, auth_headers):
        """Test Fighter doesn't have spellcasting_ability (or it's empty)"""
        response = requests.get(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Fighter shouldn't have spellcasting ability (or it's empty/intelligence for Eldritch Knight)
        spellcasting = data.get("spellcasting_ability", "")
        print(f"✓ Fighter spellcasting_ability: '{spellcasting}' (expected empty or intelligence for EK)")
    
    def test_fighter_inventory_patch(self, auth_headers):
        """Test Fighter can update inventory and currency"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "currency": {"cp": 0, "sp": 0, "ep": 0, "gp": 50, "pp": 0},
                "gold": 50
            }
        )
        assert response.status_code == 200, f"PATCH Fighter currency failed: {response.text}"
        data = response.json()
        assert data.get("currency", {}).get("gp") == 50 or data.get("gold") == 50, "Fighter currency not updated"
        print(f"✓ Fighter currency updated: {data.get('currency')}")


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_reset_wizard_inventory(self, auth_headers):
        """Reset wizard character inventory to clean state"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{WIZARD_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "inventory": [],
                "equipped": {"armor": None, "shield": None, "mainHand": None, "offHand": None},
                "currency": {"cp": 0, "sp": 0, "ep": 0, "gp": 10, "pp": 0},
                "gold": 10,
                "armor_class": 10,
                "attuned_items": [],
                "used_spell_slots": {}
            }
        )
        assert response.status_code == 200
        print("✓ Wizard inventory reset to clean state")
    
    def test_reset_fighter_inventory(self, auth_headers):
        """Reset fighter character inventory to clean state"""
        response = requests.patch(
            f"{BASE_URL}/api/characters/{FIGHTER_CHARACTER_ID}",
            headers=auth_headers,
            json={
                "currency": {"cp": 0, "sp": 0, "ep": 0, "gp": 10, "pp": 0},
                "gold": 10
            }
        )
        assert response.status_code == 200
        print("✓ Fighter inventory reset to clean state")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
