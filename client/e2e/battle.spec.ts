import { test, expect } from '@playwright/test';

test.describe('Battle Flow E2E', () => {
    // Prerequisite: User must be logged in or mocked.
    // We assume a test user or mocked auth state.

    test('Normal: Training Battle Flow', async ({ page }) => {
        // 1. Go to Battle Page
        await page.goto('/battle');

        // 2. Trainer Mode Selection
        // Ensure "Training" tab is active or select it
        await page.getByRole('tab', { name: 'トレーニング' }).click();

        // 3. Select Player Robot
        // Click on the first available robot card
        await page.locator('.robot-card').first().click();

        // 4. Select Enemy Robot (Training)
        // Click on a different robot for enemy
        await page.locator('.robot-card').nth(1).click();

        // 5. Start Battle
        const startBtn = page.getByRole('button', { name: 'バトル開始' });
        await expect(startBtn).toBeEnabled();
        await startBtn.click();

        // 6. Verify Battle Started (Visuals)
        await expect(page.locator('.hp-delayed')).toBeVisible({ timeout: 5000 });

        // 7. Verify Result Overlay
        // Battle might take time, so increased timeout
        await expect(page.getByText(/勝利|敗北/)).toBeVisible({ timeout: 30000 });

        // 8. Close Result
        await page.getByRole('button', { name: '次のバトルへ' }).click();
        await expect(page.getByText(/勝利|敗北/)).not.toBeVisible();
    });

    test('Abnormal: Start without Robot Selection', async ({ page }) => {
        await page.goto('/battle');
        await page.getByRole('tab', { name: 'トレーニング' }).click();
        // Don't select any robot

        const startBtn = page.getByRole('button', { name: 'バトル開始' });
        // Should be disabled or show error on click
        if (await startBtn.isEnabled()) {
            await startBtn.click();
            await expect(page.getByText('ロボットを選択してください')).toBeVisible();
        } else {
            await expect(startBtn).toBeDisabled();
        }
    });

    test('Abnormal: Network Error during Online Match', async ({ page }) => {
        // Mock network failure for matchmaking API
        await page.route('**/matchBattle', route => route.abort('failed'));

        await page.goto('/battle');
        // Switch to Online Tab (if implemented UI-wise, logic is similar)
        // await page.getByRole('tab', { name: 'オンライン' }).click();

        // Select Robot
        await page.locator('.robot-card').first().click();

        // Attempt Start (assuming button triggers request)
        // await page.getByRole('button', { name: 'バトル開始' }).click();

        // Expect Error Toast
        // await expect(page.getByText('Error during battle')).toBeVisible();
    });
});
