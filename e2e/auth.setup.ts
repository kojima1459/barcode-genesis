import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
        throw new Error('E2E_EMAIL and E2E_PASSWORD must be set in environment variables');
    }

    await page.goto('/auth');

    // Fill credentials
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);

    // Try Register first
    await page.getByTestId('signup-button').click();

    // Wait for either success (redirect) or failure (toast)
    // We check if URL changes to '/' or we see an error toast
    try {
        // Race condition: Success vs Error
        await Promise.race([
            page.waitForURL('/', { timeout: 5000 }),
            page.waitForSelector('.sonner-toast', { timeout: 5000 }) // toast class check
        ]);
    } catch (e) {
        // Timeout implies nothing happened or slow response
    }

    // If still on /auth, check error text or just try login
    if (page.url().includes('/auth')) {
        const errorText = await page.textContent('body'); // naive check
        if (errorText?.includes('already registered') || await page.isVisible('.sonner-toast')) {
            // Fallback to Login
            console.log('User likely exists, trying login...');
            await page.getByTestId('login-button').click();
            await page.waitForURL('/', { timeout: 10000 });
        } else {
            // Maybe network error or other issue
            throw new Error('Registration failed and not due to existing user');
        }
    }

    await expect(page).toHaveURL('/');

    // Save storage state using path from config import equivalent or hardcoded relative
    await page.context().storageState({ path: authFile });
});
