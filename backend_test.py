#!/usr/bin/env python3
"""
Backend Test Suite for N+1 Database Query Pattern Fix
Tests campaign authorization across multiple endpoints to ensure:
1. Users can access their own campaigns (valid access)
2. Users cannot access other users' campaigns (invalid access)
3. Non-existent campaigns return proper 404 errors
"""

import asyncio
import json
import sys
from typing import Dict, Any, Optional
import aiohttp
import uuid

# Backend URL configuration
BACKEND_URL = "http://localhost:8000/api"

class BackendTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
        # Test user credentials
        self.test_email_1 = "test_n_plus_1@example.com"
        self.test_password = "TestPass123!"
        self.test_username_1 = "TestUser1NPlusOne"
        
        self.test_email_2 = "test_n_plus_1_user2@example.com"
        self.test_username_2 = "TestUser2NPlusOne"
        
        # Tokens and campaign IDs
        self.token_1 = None
        self.token_2 = None
        self.campaign_1_id = None
        self.campaign_2_id = None
        
        # Resource IDs for testing
        self.god_id = None
        self.npc_id = None
        self.location_id = None

    async def setup(self):
        """Setup HTTP session"""
        self.session = aiohttp.ClientSession()

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")

    async def register_user(self, email: str, username: str, password: str) -> Optional[str]:
        """Register a new user and return token"""
        try:
            async with self.session.post(f"{BACKEND_URL}/auth/register", json={
                "email": email,
                "username": username,
                "password": password
            }) as response:
                if response.status == 201:
                    data = await response.json()
                    return data.get('token')
                else:
                    text = await response.text()
                    print(f"Registration failed for {username}: {text}")
                    return None
        except Exception as e:
            print(f"Registration error for {username}: {e}")
            return None

    async def create_campaign(self, token: str, name: str) -> Optional[str]:
        """Create a campaign and return its ID"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            async with self.session.post(f"{BACKEND_URL}/campaigns", 
                                       headers=headers,
                                       json={
                                           "name": name,
                                           "description": "Test campaign for N+1 fix testing",
                                           "system": "5e 2024 Compatible"
                                       }) as response:
                if response.status == 201:
                    data = await response.json()
                    return data.get('id')
                else:
                    text = await response.text()
                    print(f"Campaign creation failed: {text}")
                    return None
        except Exception as e:
            print(f"Campaign creation error: {e}")
            return None

    async def test_endpoint(self, method: str, endpoint: str, token: str, 
                          expected_status: int, json_data: Optional[Dict] = None) -> bool:
        """Test an endpoint and check expected status"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            
            async with self.session.request(method, f"{BACKEND_URL}{endpoint}", 
                                          headers=headers, json=json_data) as response:
                return response.status == expected_status
        except Exception as e:
            print(f"Error testing {method} {endpoint}: {e}")
            return False

    async def test_endpoint_with_response(self, method: str, endpoint: str, token: str, 
                                        json_data: Optional[Dict] = None) -> tuple[int, Any]:
        """Test an endpoint and return status code and response data"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            
            async with self.session.request(method, f"{BACKEND_URL}{endpoint}", 
                                          headers=headers, json=json_data) as response:
                try:
                    data = await response.json()
                except:
                    data = await response.text()
                return response.status, data
        except Exception as e:
            print(f"Error testing {method} {endpoint}: {e}")
            return 500, str(e)

    async def test_user_setup(self):
        """Test 1: Setup test users and campaigns"""
        print("\n=== Test 1: User Setup ===")
        
        # Register user 1
        self.token_1 = await self.register_user(self.test_email_1, self.test_username_1, self.test_password)
        if self.token_1:
            self.log_test("User 1 Registration", True, f"Successfully registered {self.test_username_1}")
        else:
            self.log_test("User 1 Registration", False, "Failed to register test user 1")
            return False

        # Register user 2
        self.token_2 = await self.register_user(self.test_email_2, self.test_username_2, self.test_password)
        if self.token_2:
            self.log_test("User 2 Registration", True, f"Successfully registered {self.test_username_2}")
        else:
            self.log_test("User 2 Registration", False, "Failed to register test user 2")
            return False

        # Create campaign for user 1
        self.campaign_1_id = await self.create_campaign(self.token_1, "Test Campaign User 1")
        if self.campaign_1_id:
            self.log_test("Campaign 1 Creation", True, f"Created campaign: {self.campaign_1_id}")
        else:
            self.log_test("Campaign 1 Creation", False, "Failed to create campaign for user 1")
            return False

        # Create campaign for user 2
        self.campaign_2_id = await self.create_campaign(self.token_2, "Test Campaign User 2")
        if self.campaign_2_id:
            self.log_test("Campaign 2 Creation", True, f"Created campaign: {self.campaign_2_id}")
        else:
            self.log_test("Campaign 2 Creation", False, "Failed to create campaign for user 2")
            return False

        return True

    async def test_valid_campaign_access(self):
        """Test 2: Valid campaign access - user accessing their own campaign"""
        print("\n=== Test 2: Valid Campaign Access ===")
        
        # Test campaign settings endpoint
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/setting", 
                                         self.token_1, 200)
        self.log_test("GET Campaign Setting (Valid)", success, 
                     "User can access their own campaign settings")

        # Test gods endpoints
        # Create a god first
        status, data = await self.test_endpoint_with_response("POST", f"/campaigns/{self.campaign_1_id}/gods", 
                                                           self.token_1, {
                                                               "name": "Test God of Testing",
                                                               "domain": "Testing",
                                                               "description": "A deity for testing purposes",
                                                               "alignment": "Neutral"
                                                           })
        if status == 201:
            self.god_id = data.get('id') if isinstance(data, dict) else None
            self.log_test("POST Campaign Gods (Valid)", True, "Successfully created god")
        else:
            self.log_test("POST Campaign Gods (Valid)", False, f"Failed to create god: {status}")

        # Get gods
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/gods", 
                                         self.token_1, 200)
        self.log_test("GET Campaign Gods (Valid)", success, 
                     "User can fetch gods from their own campaign")

        # Test NPCs endpoints
        # Create an NPC first
        status, data = await self.test_endpoint_with_response("POST", f"/campaigns/{self.campaign_1_id}/npcs", 
                                                           self.token_1, {
                                                               "name": "Test NPC Merchant",
                                                               "description": "A helpful merchant for testing",
                                                               "hp": 25,
                                                               "ac": 12,
                                                               "location": "Test Town"
                                                           })
        if status == 201:
            self.npc_id = data.get('id') if isinstance(data, dict) else None
            self.log_test("POST Campaign NPCs (Valid)", True, "Successfully created NPC")
        else:
            self.log_test("POST Campaign NPCs (Valid)", False, f"Failed to create NPC: {status}")

        # Get NPCs
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/npcs", 
                                         self.token_1, 200)
        self.log_test("GET Campaign NPCs (Valid)", success, 
                     "User can fetch NPCs from their own campaign")

        # Test Locations endpoints
        # Create a location first
        status, data = await self.test_endpoint_with_response("POST", f"/campaigns/{self.campaign_1_id}/locations", 
                                                           self.token_1, {
                                                               "name": "Test Town Market",
                                                               "location_type": "town",
                                                               "description": "A bustling market town for testing",
                                                               "notable_npcs": "Various merchants and traders"
                                                           })
        if status == 201:
            self.location_id = data.get('id') if isinstance(data, dict) else None
            self.log_test("POST Campaign Locations (Valid)", True, "Successfully created location")
        else:
            self.log_test("POST Campaign Locations (Valid)", False, f"Failed to create location: {status}")

        # Get locations
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/locations", 
                                         self.token_1, 200)
        self.log_test("GET Campaign Locations (Valid)", success, 
                     "User can fetch locations from their own campaign")

        return True

    async def test_invalid_campaign_access(self):
        """Test 3: Invalid campaign access - user trying to access other user's campaign"""
        print("\n=== Test 3: Invalid Campaign Access ===")
        
        # User 2 trying to access User 1's campaign
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/setting", 
                                         self.token_2, 404)
        self.log_test("GET Campaign Setting (Invalid)", success, 
                     "User cannot access another user's campaign settings")

        # User 2 trying to access User 1's gods
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/gods", 
                                         self.token_2, 404)
        self.log_test("GET Campaign Gods (Invalid)", success, 
                     "User cannot access another user's campaign gods")

        # User 2 trying to create god in User 1's campaign
        success = await self.test_endpoint("POST", f"/campaigns/{self.campaign_1_id}/gods", 
                                         self.token_2, 404, {
                                             "name": "Unauthorized God",
                                             "domain": "Hacking"
                                         })
        self.log_test("POST Campaign Gods (Invalid)", success, 
                     "User cannot create gods in another user's campaign")

        # User 2 trying to access User 1's NPCs
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/npcs", 
                                         self.token_2, 404)
        self.log_test("GET Campaign NPCs (Invalid)", success, 
                     "User cannot access another user's campaign NPCs")

        # User 2 trying to create NPC in User 1's campaign
        success = await self.test_endpoint("POST", f"/campaigns/{self.campaign_1_id}/npcs", 
                                         self.token_2, 404, {
                                             "name": "Unauthorized NPC",
                                             "description": "Should not be created"
                                         })
        self.log_test("POST Campaign NPCs (Invalid)", success, 
                     "User cannot create NPCs in another user's campaign")

        # User 2 trying to access User 1's locations
        success = await self.test_endpoint("GET", f"/campaigns/{self.campaign_1_id}/locations", 
                                         self.token_2, 404)
        self.log_test("GET Campaign Locations (Invalid)", success, 
                     "User cannot access another user's campaign locations")

        # User 2 trying to create location in User 1's campaign
        success = await self.test_endpoint("POST", f"/campaigns/{self.campaign_1_id}/locations", 
                                         self.token_2, 404, {
                                             "name": "Unauthorized Location",
                                             "description": "Should not be created"
                                         })
        self.log_test("POST Campaign Locations (Invalid)", success, 
                     "User cannot create locations in another user's campaign")

        return True

    async def test_nonexistent_campaign_access(self):
        """Test 4: Non-existent campaign access"""
        print("\n=== Test 4: Non-existent Campaign Access ===")
        
        fake_campaign_id = str(uuid.uuid4())
        
        # Test campaign settings with fake ID
        success = await self.test_endpoint("GET", f"/campaigns/{fake_campaign_id}/setting", 
                                         self.token_1, 404)
        self.log_test("GET Fake Campaign Setting", success, 
                     "Non-existent campaign returns 404")

        # Test gods with fake ID
        success = await self.test_endpoint("GET", f"/campaigns/{fake_campaign_id}/gods", 
                                         self.token_1, 404)
        self.log_test("GET Fake Campaign Gods", success, 
                     "Non-existent campaign gods returns 404")

        # Test NPCs with fake ID
        success = await self.test_endpoint("GET", f"/campaigns/{fake_campaign_id}/npcs", 
                                         self.token_1, 404)
        self.log_test("GET Fake Campaign NPCs", success, 
                     "Non-existent campaign NPCs returns 404")

        # Test locations with fake ID
        success = await self.test_endpoint("GET", f"/campaigns/{fake_campaign_id}/locations", 
                                         self.token_1, 404)
        self.log_test("GET Fake Campaign Locations", success, 
                     "Non-existent campaign locations returns 404")

        return True

    async def test_update_and_delete_operations(self):
        """Test 5: UPDATE and DELETE operations with authorization"""
        print("\n=== Test 5: Update and Delete Operations ===")
        
        if not self.god_id or not self.npc_id or not self.location_id:
            self.log_test("Update/Delete Test Setup", False, "Missing resource IDs from previous tests")
            return False

        # Test updating god (valid access)
        success = await self.test_endpoint("PUT", f"/campaigns/{self.campaign_1_id}/gods/{self.god_id}", 
                                         self.token_1, 200, {
                                             "name": "Updated Test God",
                                             "description": "Updated description"
                                         })
        self.log_test("PUT Campaign God (Valid)", success, 
                     "User can update god in their own campaign")

        # Test updating god (invalid access)
        success = await self.test_endpoint("PUT", f"/campaigns/{self.campaign_1_id}/gods/{self.god_id}", 
                                         self.token_2, 404, {
                                             "name": "Unauthorized Update"
                                         })
        self.log_test("PUT Campaign God (Invalid)", success, 
                     "User cannot update god in another user's campaign")

        # Test updating NPC (valid access)
        success = await self.test_endpoint("PUT", f"/campaigns/{self.campaign_1_id}/npcs/{self.npc_id}", 
                                         self.token_1, 200, {
                                             "name": "Updated Test NPC",
                                             "hp": 30
                                         })
        self.log_test("PUT Campaign NPC (Valid)", success, 
                     "User can update NPC in their own campaign")

        # Test updating NPC (invalid access)
        success = await self.test_endpoint("PUT", f"/campaigns/{self.campaign_1_id}/npcs/{self.npc_id}", 
                                         self.token_2, 404, {
                                             "name": "Unauthorized NPC Update"
                                         })
        self.log_test("PUT Campaign NPC (Invalid)", success, 
                     "User cannot update NPC in another user's campaign")

        # Test updating location (valid access)
        success = await self.test_endpoint("PUT", f"/campaigns/{self.campaign_1_id}/locations/{self.location_id}", 
                                         self.token_1, 200, {
                                             "name": "Updated Test Location",
                                             "description": "Now with more details"
                                         })
        self.log_test("PUT Campaign Location (Valid)", success, 
                     "User can update location in their own campaign")

        # Test updating location (invalid access)
        success = await self.test_endpoint("PUT", f"/campaigns/{self.campaign_1_id}/locations/{self.location_id}", 
                                         self.token_2, 404, {
                                             "name": "Unauthorized Location Update"
                                         })
        self.log_test("PUT Campaign Location (Invalid)", success, 
                     "User cannot update location in another user's campaign")

        # Test deleting resources (invalid access first to preserve for valid test)
        success = await self.test_endpoint("DELETE", f"/campaigns/{self.campaign_1_id}/gods/{self.god_id}", 
                                         self.token_2, 404)
        self.log_test("DELETE Campaign God (Invalid)", success, 
                     "User cannot delete god from another user's campaign")

        success = await self.test_endpoint("DELETE", f"/campaigns/{self.campaign_1_id}/npcs/{self.npc_id}", 
                                         self.token_2, 404)
        self.log_test("DELETE Campaign NPC (Invalid)", success, 
                     "User cannot delete NPC from another user's campaign")

        success = await self.test_endpoint("DELETE", f"/campaigns/{self.campaign_1_id}/locations/{self.location_id}", 
                                         self.token_2, 404)
        self.log_test("DELETE Campaign Location (Invalid)", success, 
                     "User cannot delete location from another user's campaign")

        # Test deleting resources (valid access)
        success = await self.test_endpoint("DELETE", f"/campaigns/{self.campaign_1_id}/gods/{self.god_id}", 
                                         self.token_1, 200)
        self.log_test("DELETE Campaign God (Valid)", success, 
                     "User can delete god from their own campaign")

        success = await self.test_endpoint("DELETE", f"/campaigns/{self.campaign_1_id}/npcs/{self.npc_id}", 
                                         self.token_1, 200)
        self.log_test("DELETE Campaign NPC (Valid)", success, 
                     "User can delete NPC from their own campaign")

        success = await self.test_endpoint("DELETE", f"/campaigns/{self.campaign_1_id}/locations/{self.location_id}", 
                                         self.token_1, 200)
        self.log_test("DELETE Campaign Location (Valid)", success, 
                     "User can delete location from their own campaign")

        return True

    async def run_all_tests(self):
        """Run all test suites"""
        print("🧪 Starting N+1 Database Query Pattern Fix Tests")
        print("=" * 60)
        
        try:
            await self.setup()
            
            # Run test suites
            if not await self.test_user_setup():
                print("❌ User setup failed - cannot continue")
                return False
                
            await self.test_valid_campaign_access()
            await self.test_invalid_campaign_access() 
            await self.test_nonexistent_campaign_access()
            await self.test_update_and_delete_operations()
            
            # Print summary
            print("\n" + "=" * 60)
            print("🏁 Test Summary")
            print("=" * 60)
            
            passed = sum(1 for result in self.test_results if "✅ PASS" in result)
            failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
            
            for result in self.test_results:
                print(result)
            
            print(f"\nTotal: {len(self.test_results)} tests")
            print(f"✅ Passed: {passed}")
            print(f"❌ Failed: {failed}")
            
            if failed == 0:
                print("\n🎉 All tests passed! N+1 fix is working correctly.")
                return True
            else:
                print(f"\n⚠️  {failed} test(s) failed. N+1 fix needs attention.")
                return False
                
        except Exception as e:
            print(f"\n💥 Test suite error: {e}")
            return False
        finally:
            await self.cleanup()

async def main():
    """Main test runner"""
    tester = BackendTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())