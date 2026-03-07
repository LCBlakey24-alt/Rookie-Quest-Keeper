import { test, expect } from '@playwright/test';

// Test the billing toggle feature on the landing page pricing section
test.describe('Billing Toggle - Landing Page Pricing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display Monthly as default billing cycle', async ({ page }) => {
    // Scroll to pricing section
    const monthlyBtn = page.getByTestId('billing-monthly-btn');
    await monthlyBtn.scrollIntoViewIfNeeded();
    
    // Monthly should be selected by default (has red background #E11D48)
    await expect(monthlyBtn).toBeVisible();
    
    // Monthly prices should be displayed
    await expect(page.getByText('£3.99')).toHaveCount(2); // Hero and Quest Master
    await expect(page.getByText('£5.99').first()).toBeVisible(); // Legendary
    
    // Check /month suffix
    await expect(page.getByText('/month').first()).toBeVisible();
  });

  test('should toggle to Yearly billing and show yearly prices', async ({ page }) => {
    // Scroll to pricing section
    const yearlyBtn = page.getByTestId('billing-yearly-btn');
    await yearlyBtn.scrollIntoViewIfNeeded();
    
    // Click Yearly button
    await yearlyBtn.click();
    
    // Wait for prices to update
    await page.waitForTimeout(300);
    
    // Yearly prices: Hero £39.99, Quest Master £39.99, Legendary £59.99
    await expect(page.getByText('£39.99').first()).toBeVisible();
    await expect(page.getByText('£59.99').first()).toBeVisible();
    
    // Check /year suffix
    await expect(page.getByText('/year').first()).toBeVisible();
  });

  test('should show monthly equivalent when Yearly is selected', async ({ page }) => {
    const yearlyBtn = page.getByTestId('billing-yearly-btn');
    await yearlyBtn.scrollIntoViewIfNeeded();
    
    // Click Yearly
    await yearlyBtn.click();
    await page.waitForTimeout(300);
    
    // Monthly equivalents: Hero £3.33/month, Quest Master £3.33/month, Legendary £5.00/month
    await expect(page.getByText('(£3.33/month)').first()).toBeVisible();
    await expect(page.getByText('(£5.00/month)')).toBeVisible();
  });

  test('should toggle back to Monthly from Yearly', async ({ page }) => {
    const monthlyBtn = page.getByTestId('billing-monthly-btn');
    const yearlyBtn = page.getByTestId('billing-yearly-btn');
    await yearlyBtn.scrollIntoViewIfNeeded();
    
    // First select Yearly
    await yearlyBtn.click();
    await page.waitForTimeout(300);
    
    // Confirm yearly prices shown
    await expect(page.getByText('£39.99').first()).toBeVisible();
    
    // Toggle back to Monthly
    await monthlyBtn.click();
    await page.waitForTimeout(300);
    
    // Confirm monthly prices restored
    await expect(page.getByText('£3.99').first()).toBeVisible();
    await expect(page.getByText('£5.99').first()).toBeVisible();
  });

  test('should display Save ~17% badge on Yearly button', async ({ page }) => {
    const yearlyBtn = page.getByTestId('billing-yearly-btn');
    await yearlyBtn.scrollIntoViewIfNeeded();
    
    // The yearly button should have "SAVE ~17%" badge
    await expect(yearlyBtn.getByText('SAVE ~17%')).toBeVisible();
  });

  test('should verify all pricing tiers are displayed', async ({ page }) => {
    const monthlyBtn = page.getByTestId('billing-monthly-btn');
    await monthlyBtn.scrollIntoViewIfNeeded();
    
    // Free tier - always £0/forever
    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('£0')).toBeVisible();
    await expect(page.getByText('/forever')).toBeVisible();
    
    // Hero tier - FOR PLAYERS
    await expect(page.getByText('Hero').first()).toBeVisible();
    await expect(page.getByText('FOR PLAYERS', { exact: true })).toBeVisible();
    
    // Quest Master tier - FOR GMs
    await expect(page.getByRole('heading', { name: 'Quest Master' })).toBeVisible();
    await expect(page.getByText('FOR GMs', { exact: true })).toBeVisible();
    
    // Legendary tier - BEST VALUE
    await expect(page.getByRole('heading', { name: 'Legendary' })).toBeVisible();
    await expect(page.getByText('BEST VALUE')).toBeVisible();
  });
});
