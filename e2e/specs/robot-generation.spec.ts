import { test, expect } from '@playwright/test';

// Generate a random 13-digit barcode (starts with 49 for JAN)
const generateRandomBarcode = () => {
    const timestamp = Date.now().toString().slice(-9);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `49${timestamp}${random}`;
};

test.describe('Robot Generation', () => {
    // Shared barcode for duplication test
    const sharedBarcode = generateRandomBarcode();

    test('generates a new robot with valid barcode', async ({ page }) => {
        // Go to scan page
        await page.goto('/scan');

        // Fill barcode
        const input = page.getByPlaceholder('例: 4901234567890');
        await input.fill(sharedBarcode);

        // Click Submit (決定)
        const submitBtn = page.getByRole('button', { name: '決定' });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // Wait for generation animation (approx 7s)
        // Check for "GENERATE ANOTHER" button or robot name
        // We can increase timeout for this step
        await expect(page.getByText('GENERATE ANOTHER')).toBeVisible({ timeout: 15000 });

        // Use Japanese text check or English depending on locale? 
        // Default locale might be JA based on system or code. "GENERATE ANOTHER" is hardcoded in Scan.tsx line 184.
    });

    test('shows error for already existing barcode', async ({ page }) => {
        await page.goto('/scan');
        const input = page.getByPlaceholder('例: 4901234567890');
        await input.fill(sharedBarcode);
        await page.getByRole('button', { name: '決定' }).click();

        // Expect error toast or message
        // Scan.tsx handles 'already-exists' -> "このバーコードのロボットは既に持っています。"
        await expect(page.getByText('このバーコードのロボットは既に持っています')).toBeVisible({ timeout: 15000 });
    });

    test('UI error for invalid length (too short)', async ({ page }) => {
        await page.goto('/scan');
        const input = page.getByPlaceholder('例: 4901234567890');
        await input.fill('123'); // Too short

        // Button should be disabled
        const submitBtn = page.getByRole('button', { name: '決定' });
        await expect(submitBtn).toBeDisabled();
    });
});
