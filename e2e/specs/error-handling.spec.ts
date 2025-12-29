import { test, expect } from '@playwright/test';

test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/scan');

    const barcode = '4988000000000'; // Any dummy barcode
    await page.getByPlaceholder('例: 4901234567890').fill(barcode);

    // Abort requests to Cloud Functions / GenerateRobot
    await page.route('**/generateRobot', route => route.abort());
    // Also catch broader pattern just in case SDK uses different path
    // Google Cloud Functions often use complex URLs. 
    // Playwright route matching might need adjustment if using Firebase SDK internal endpoints.
    // For safety, we can route all XHR/fetch if needed, but that kills the app.
    // Let's rely on the operation name appearing in the URL which is common.

    await page.getByRole('button', { name: '決定' }).click();

    // Expect generic error
    // "生成に失敗しました" (t('scan_failed')) is used in lines 62 if data.robot is missing but no error thrown?
    // If callGenerateRobot throws, line 65 catch block runs.
    // "Error: ..." or "サーバーエラー..."

    // We expect *some* error toast.
    await expect(page.locator('.sonner-toast')).toBeVisible({ timeout: 10000 });
});
