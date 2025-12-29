import { test, expect } from '@playwright/test';

// Reset storage state to simulate unauthenticated user
test.use({ storageState: { cookies: [], origins: [] } });

test('redirects to auth when not logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
});
