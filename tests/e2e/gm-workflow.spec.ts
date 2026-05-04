import { test, expect } from '@playwright/test';
import { 
  removeBlockingBadges, 
  loginTestUser,
  TEST_USER,
  TEST_CAMPAIGN_ID
} from '../fixtures/helpers';

/**
 * GM Workflow Tests
 * Tests the full GM workflow including:
 * - Campaign dashboard access
 * - NPC management via sidebar
 * - Location management via sidebar
 */

test.describe('Campaign Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    
    // Navigate to campaign dashboard
    await page.goto(`/campaign/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Stress Test Campaign').first()).toBeVisible({ timeout: 10000 });
  });

  test('Campaign dashboard loads with sidebar navigation', async ({ page }) => {
    // Verify sidebar menu items exist
    await expect(page.getByText('SETTING').first()).toBeVisible();
    await expect(page.getByText('NPCS').first()).toBeVisible();
    await expect(page.getByText('LOCATIONS').first()).toBeVisible();
  });

  test('NPCs section is accessible from sidebar', async ({ page }) => {
    // Click on NPCs in sidebar
    await page.getByText('NPCS').first().click();
    
    // Should show NPC content area
    await expect(page.getByText(/NPC|Non-Player Characters/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Locations section is accessible from sidebar', async ({ page }) => {
    // Click on Locations in sidebar
    await page.getByText('LOCATIONS').first().click();
    
    // Should show Locations content area
    await expect(page.getByText(/Location/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('GM Screen button is present on campaign dashboard', async ({ page }) => {
    // Verify the Open GM Screen button exists
    const gmScreenButton = page.getByRole('button', { name: /Open GM Screen/i });
    await expect(gmScreenButton).toBeVisible();
  });
});

test.describe('GM Screen', () => {
  test('GM Screen loads with combat controls', async ({ page }) => {
    await removeBlockingBadges(page);
    await loginTestUser(page);
    
    // Navigate directly to GM Screen
    await page.goto(`/gm-screen/${TEST_CAMPAIGN_ID}`, { waitUntil: 'domcontentloaded' });
    
    // Verify GM Screen loads
    await expect(page.getByRole('heading', { name: /Combat Control/i })).toBeVisible({ timeout: 15000 });
  });
});

test.describe('API-based GM Workflow', () => {
  test('Create NPC via API', async ({ request }) => {
    const uniqueId = Date.now().toString(36);
    const npcName = `TEST_NPC_${uniqueId}`;
    
    // Get auth token
    const loginRes = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    
    // Create NPC via API
    const createRes = await request.post(`http://localhost:8000/api/campaigns/${TEST_CAMPAIGN_ID}/npcs`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: npcName,
        role: 'Merchant',
        description: 'Test NPC for automated testing',
        location: 'Test Town'
      }
    });
    expect(createRes.status()).toBe(201);
    const npc = await createRes.json();
    
    // Verify NPC was created
    expect(npc.name).toBe(npcName);
    expect(npc.id).toBeDefined();
    
    // Cleanup - Delete NPC
    const deleteRes = await request.delete(`http://localhost:8000/api/campaigns/${TEST_CAMPAIGN_ID}/npcs/${npc.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteRes.ok()).toBeTruthy();
  });

  test('Create Location via API', async ({ request }) => {
    const uniqueId = Date.now().toString(36);
    const locationName = `TEST_Location_${uniqueId}`;
    
    // Get auth token
    const loginRes = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    
    // Create Location via API
    const createRes = await request.post(`http://localhost:8000/api/campaigns/${TEST_CAMPAIGN_ID}/locations`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: locationName,
        location_type: 'City',
        description: 'Test location for automated testing'
      }
    });
    expect(createRes.status()).toBe(201);
    const location = await createRes.json();
    
    // Verify location was created
    expect(location.name).toBe(locationName);
    expect(location.id).toBeDefined();
    
    // Cleanup - Delete Location
    const deleteRes = await request.delete(`http://localhost:8000/api/campaigns/${TEST_CAMPAIGN_ID}/locations/${location.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteRes.ok()).toBeTruthy();
  });

  test('Create Campaign via API', async ({ request }) => {
    const uniqueId = Date.now().toString(36);
    const campaignName = `TEST_Campaign_${uniqueId}`;
    
    // Get auth token
    const loginRes = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    
    // Create Campaign via API
    const createRes = await request.post(`http://localhost:8000/api/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: campaignName,
        description: 'Test campaign for automated testing',
        system: '5e 2024 Compatible'
      }
    });
    expect(createRes.status()).toBe(201);
    const campaign = await createRes.json();
    
    // Verify campaign was created
    expect(campaign.name).toBe(campaignName);
    expect(campaign.id).toBeDefined();
    
    // Cleanup - Delete Campaign
    const deleteRes = await request.delete(`http://localhost:8000/api/campaigns/${campaign.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteRes.ok()).toBeTruthy();
  });
});
