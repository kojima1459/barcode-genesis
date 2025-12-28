import { test, expect } from '@playwright/test';

test.describe('Barcode Genesis E2E Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Mock authentication or use a test account
        // For this example, we assume local dev server allows bypass or we login
        await page.goto('/');
    });

    test('User can login and see Home', async ({ page }) => {
        // Perform login (Mocked or Real)
        await page.click('text=Login with Google');
        // Wait for redirect
        await expect(page).toHaveURL('/');
        await expect(page.locator('text=BARCODE GENESIS')).toBeVisible();
    });

    test('User can generate a robot', async ({ page }) => {
        // Navigate to scan/generate
        await page.click('[aria-label="Generate Robot"]');

        // Simulate barcode input
        await page.fill('input[name="barcode"]', '1234567890123');
        await page.click('button:has-text("Generate")');

        // Expect loading
        await expect(page.locator('.animate-spin')).toBeVisible();

        // Expect result
        await expect(page.locator('text=Robot Generated')).toBeVisible({ timeout: 10000 });
    });

    test('User can simulate a battle', async ({ page }) => {
        await page.goto('/battle');

        // Select Robot
        await page.click('text=MyRobot');

        // Find Opponent
        await page.click('text=Find Opponent');

        // Start Battle
        await page.click('text=START BATTLE');

        // Check for battle logs
        await expect(page.locator('.battle-log')).toBeVisible();

        // Check for result
        await expect(page.locator('text=WIN'), { hasText: /WIN|LOSE/ }).toBeVisible({ timeout: 30000 });
    });

    test('User can view Premium page and see plans', async ({ page }) => {
        await page.goto('/premium');
        await expect(page.locator('text=プレミアム会員')).toBeVisible();
        await expect(page.locator('text=クレジットパック')).toBeVisible();
    });

});
