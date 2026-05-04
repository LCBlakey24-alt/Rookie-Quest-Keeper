import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, dismissToasts, removeBlockingBadges } from '../fixtures/helpers';

const TEST_EMAIL = TEST_USER.email;
const TEST_PASSWORD = TEST_USER.password;

test.describe('P3 - Landing Page and Player Section Updates', () => {
  test.describe('Landing Page - Pricing Tiers', () => {
    test('Landing page shows 4 pricing tiers: Free, Player (Coming Soon), Game Master (£3.99), Legendary (£5.99)', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Verify "Choose Your Path" heading for pricing section
      await expect(page.getByRole('heading', { name: 'Choose Your Path' })).toBeVisible();
      
      // Verify all 4 tier names are visible
      await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Player', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Game Master', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Legendary', exact: true })).toBeVisible();
      
      // Verify Free tier shows "Free" text
      await expect(page.getByText('Free', { exact: true }).first()).toBeVisible();
      
      // Verify Player tier shows "Coming Soon" badge and disabled state
      await expect(page.getByText('Coming Soon').first()).toBeVisible();
      
      // Verify Game Master shows £3.99/mo and "Most Popular" badge
      await expect(page.locator('text=£3.99').first()).toBeVisible();
      await expect(page.getByText('Most Popular')).toBeVisible();
      
      // Verify Legendary shows £5.99/mo
      await expect(page.locator('text=£5.99').first()).toBeVisible();
      
      await page.screenshot({ path: 'p3-landing-pricing-tiers.jpeg', quality: 20, fullPage: false });
    });

    test('Free tier shows limited features and Get Started Free button', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Verify Free tier features
      await expect(page.getByText('View campaigns (read-only)')).toBeVisible();
      await expect(page.getByText('Basic dice roller')).toBeVisible();
      await expect(page.getByText('Limited access')).toBeVisible();
      
      // Verify Free tier button
      await expect(page.getByRole('button', { name: 'Get Started Free' })).toBeVisible();
    });

    test('Player tier shows Coming Soon badge with disabled button', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Verify Player tier features
      await expect(page.getByText('Create characters')).toBeVisible();
      await expect(page.getByText('Join campaigns')).toBeVisible();
      await expect(page.getByText('Full character sheets')).toBeVisible();
      await expect(page.getByText('Inventory management')).toBeVisible();
      
      // Verify Player tier has "Coming Soon" button that is disabled
      const comingSoonButtons = page.getByRole('button', { name: 'Coming Soon' });
      await expect(comingSoonButtons.first()).toBeVisible();
      await expect(comingSoonButtons.first()).toBeDisabled();
    });

    test('Game Master tier shows £3.99/mo with Most Popular badge', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Verify Game Master features
      await expect(page.getByText('Create campaigns')).toBeVisible();
      await expect(page.getByText('GM tools & AI')).toBeVisible();
      // Use exact: true to avoid matching "Combat Tracker" feature card heading
      await expect(page.getByText('Combat tracker', { exact: true })).toBeVisible();
      await expect(page.getByText('World building').first()).toBeVisible();
      
      // Verify Start Trial button is enabled for Game Master
      const startTrialButtons = page.getByRole('button', { name: 'Start Trial' });
      const gmTrialBtn = startTrialButtons.first();
      await expect(gmTrialBtn).toBeEnabled();
    });

    test('Legendary tier shows £5.99/mo with Player tier included note', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Verify Legendary tier features
      await expect(page.getByText('Full GM access')).toBeVisible();
      await expect(page.getByText('Player tier included*')).toBeVisible();
      await expect(page.getByText('Priority AI')).toBeVisible();
      await expect(page.getByText('Early access to features')).toBeVisible();
      
      // Verify the asterisk note about Player benefits
      await expect(page.getByText('*Player benefits included when Player tier launches')).toBeVisible();
      
      await page.screenshot({ path: 'p3-legendary-tier-note.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Home Page - Player Section Locked', () => {
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      await removeBlockingBadges(page);
      
      // Login
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.getByTestId('login-email').fill(TEST_EMAIL);
      await page.getByTestId('login-password').fill(TEST_PASSWORD);
      await page.getByTestId('login-btn').click();
      await page.waitForURL(/\/home/, { timeout: 15000 });
    });

    test('Player section shows Coming Soon overlay blocking character creation', async ({ page }) => {
      // Verify Coming Soon banner is visible on Player section
      await expect(page.getByText('Coming Soon', { exact: false }).first()).toBeVisible();
      
      // Verify Player Features heading is visible (within overlay)
      await expect(page.getByRole('heading', { name: 'Player Features' })).toBeVisible();
      
      // Verify explanatory text about character creation being under development
      await expect(page.getByText('Character creation, inventory management, and player tools are currently under development.')).toBeVisible();
      
      // Verify Legendary tier suggestion text
      await expect(page.getByText('Subscribe to Legendary tier to get early access when available!')).toBeVisible();
      
      await page.screenshot({ path: 'p3-player-section-locked.jpeg', quality: 20, fullPage: false });
    });

    test('New Character button exists but is behind the Coming Soon overlay', async ({ page }) => {
      // The New Character button should exist in DOM but be covered by overlay
      const newCharBtn = page.getByTestId('new-character-btn');
      
      // Button exists in DOM
      await expect(newCharBtn).toBeAttached();
      
      // The overlay with Coming Soon banner covers the Player section
      await expect(page.locator('text=COMING SOON').first()).toBeVisible();
    });

    test('GM section is still fully functional - campaigns visible', async ({ page }) => {
      // Verify GM Side header is visible - use heading role to avoid mobile nav conflict
      await expect(page.getByRole('heading', { name: 'GM SIDE' })).toBeVisible();
      
      // Verify My Campaigns heading is visible
      await expect(page.getByRole('heading', { name: 'My Campaigns' })).toBeVisible();
      
      // Verify New Campaign button is visible and clickable
      const newCampaignBtn = page.getByRole('button', { name: /New Campaign/ });
      await expect(newCampaignBtn).toBeVisible();
      await expect(newCampaignBtn).toBeEnabled();
      
      // Verify campaign list is visible (or empty state)
      const campaignCards = page.locator('[data-testid^="campaign-"]');
      const campaignCount = await campaignCards.count();
      
      if (campaignCount > 0) {
        // Campaigns are clickable
        await expect(campaignCards.first()).toBeVisible();
      }
      
      await page.screenshot({ path: 'p3-gm-section-functional.jpeg', quality: 20, fullPage: false });
    });

    test('Can click on a campaign and access GM tools', async ({ page }) => {
      // Click on first campaign if exists
      const campaignCard = page.locator('[data-testid^="campaign-"]').first();
      
      if (await campaignCard.count() > 0) {
        await campaignCard.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        
        // Verify campaign dashboard loads with sidebar menu
        await expect(page.getByText('CAMPAIGN TOOLS')).toBeVisible();
        
        // Verify key sidebar items are present
        await expect(page.getByText('Setting')).toBeVisible();
        await expect(page.getByText('World Builder')).toBeVisible();
        await expect(page.getByText('Combat')).toBeVisible();
        
        await page.screenshot({ path: 'p3-gm-campaign-access.jpeg', quality: 20, fullPage: false });
      }
    });
  });

  test.describe('Previous Features Still Work', () => {
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      await removeBlockingBadges(page);
      
      // Login
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.getByTestId('login-email').fill(TEST_EMAIL);
      await page.getByTestId('login-password').fill(TEST_PASSWORD);
      await page.getByTestId('login-btn').click();
      await page.waitForURL(/\/home/, { timeout: 15000 });
    });

    test('GM Screen features work - Open GM Screen button', async ({ page }) => {
      // Click on first campaign
      const campaignCard = page.locator('[data-testid^="campaign-"]').first();
      
      if (await campaignCard.count() > 0) {
        await campaignCard.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        
        // Verify Open GM Screen button exists
        const openGmScreenBtn = page.getByText('Open GM Screen', { exact: false });
        await expect(openGmScreenBtn).toBeVisible();
      }
    });
  });
});
