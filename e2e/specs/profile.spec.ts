import { test, expect } from '@playwright/test';

/**
 * Profile Page E2E Tests
 * 
 * Tests for the main user flows on the Profile page including:
 * - Page loading and display
 * - Name editing (success and error cases)
 * - ID copy functionality
 * - Logout flow
 */

test.describe('Profile Page', () => {

    // ============================================
    // 正常系テスト (Success Cases)
    // ============================================

    /**
     * Test Case 1: プロフィールページ表示
     * Purpose: ページが正しくロードされ、ユーザー情報が表示されることを確認
     * Expected: ユーザープロフィールカードが表示される
     */
    test('displays profile page correctly', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load (loading skeleton should disappear)
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // User profile card should be visible
        await expect(page.getByText(/USER PROFILE|ユーザー/i)).toBeVisible();

        // Stats grid should be visible
        await expect(page.getByText(/ROBOTS|ロボット/i)).toBeVisible();
    });

    /**
     * Test Case 2: 名前編集・保存成功
     * Purpose: 名前変更フローが正しく動作することを確認
     * Expected: 成功トースト表示、名前が更新される
     */
    test('edits and saves name successfully', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Click edit button (Edit2 icon button)
        const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit-2') }).first();
        await editButton.click();

        // Input field should appear
        const nameInput = page.locator('input[placeholder]').first();
        await expect(nameInput).toBeVisible();

        // Generate unique name with timestamp
        const newName = `TestUser${Date.now().toString().slice(-6)}`;
        await nameInput.fill(newName);

        // Click save button
        const saveButton = page.locator('button').filter({ has: page.locator('svg.lucide-save') });
        await saveButton.click();

        // Wait for success toast or name update
        // Note: Toast may appear briefly, check if name appears in UI
        await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 });
    });

    /**
     * Test Case 5: IDコピー成功
     * Purpose: クリップボードコピー機能が動作することを確認
     * Expected: 成功トースト表示（クリップボードへコピー成功のメッセージ）
     */
    test('copies user ID to clipboard', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Find and click copy button (near ID display)
        const copyButton = page.locator('button').filter({ has: page.locator('svg.lucide-copy') });
        await copyButton.click();

        // Check for success toast
        await expect(page.getByText(/copied|コピー/i)).toBeVisible({ timeout: 3000 });
    });

    /**
     * Test Case 6: ログアウト
     * Purpose: ログアウトフローが正しく動作することを確認
     * Expected: ホームページにリダイレクト
     */
    test('logs out and redirects to home', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Find and click logout button
        const logoutButton = page.locator('button').filter({ has: page.locator('svg.lucide-log-out') });
        await logoutButton.click();

        // Should redirect to home or auth page
        await expect(page).toHaveURL(/\/(auth|login)?$/i, { timeout: 5000 });
    });

    // ============================================
    // 異常系テスト (Error Cases)
    // ============================================

    /**
     * Test Case 3: 名前編集・空入力
     * Purpose: 空の名前での保存が防止されることを確認
     * Expected: 保存されない（入力が空のまま）
     */
    test('prevents saving empty name', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Click edit button
        const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit-2') }).first();
        await editButton.click();

        // Clear input and try to save
        const nameInput = page.locator('input[placeholder]').first();
        await nameInput.fill('');

        // Click save button
        const saveButton = page.locator('button').filter({ has: page.locator('svg.lucide-save') });
        await saveButton.click();

        // Input should still be visible (not saved)
        await expect(nameInput).toBeVisible();
    });

    /**
     * Test Case 4: 名前編集・長すぎる入力
     * Purpose: 20文字を超える名前でエラーが表示されることを確認
     * Expected: エラートースト表示
     */
    test('shows error for name exceeding 20 characters', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Click edit button
        const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit-2') }).first();
        await editButton.click();

        // Input very long name (over 20 characters)
        const nameInput = page.locator('input[placeholder]').first();
        const longName = 'A'.repeat(25); // 25 characters
        await nameInput.fill(longName);

        // Click save button
        const saveButton = page.locator('button').filter({ has: page.locator('svg.lucide-save') });
        await saveButton.click();

        // Error toast should appear
        await expect(page.getByText(/20文字以内|too long/i)).toBeVisible({ timeout: 3000 });
    });

    /**
     * Test Case: 名前に特殊文字を含む入力
     * Purpose: 禁止文字を含む名前でエラーが表示されることを確認
     * Expected: エラートースト表示
     */
    test('shows error for name with invalid characters', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Click edit button
        const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit-2') }).first();
        await editButton.click();

        // Input name with special characters
        const nameInput = page.locator('input[placeholder]').first();
        await nameInput.fill('<script>alert(1)</script>');

        // Click save button
        const saveButton = page.locator('button').filter({ has: page.locator('svg.lucide-save') });
        await saveButton.click();

        // Error toast should appear
        await expect(page.getByText(/使用できない文字|invalid/i)).toBeVisible({ timeout: 3000 });
    });

    // ============================================
    // ページナビゲーションテスト
    // ============================================

    /**
     * Test: Settings links are clickable
     * Purpose: 設定リンクがクリック可能であることを確認
     */
    test('settings links are clickable', async ({ page }) => {
        await page.goto('/profile');

        // Wait for page to load
        await expect(page.locator('h1')).toContainText(/PROFILE|プロフィール/i, { timeout: 10000 });

        // Check that guide link exists and is clickable
        const guideLink = page.locator('a[href="/guide"]');
        await expect(guideLink).toBeVisible();

        // Check that premium link exists
        const premiumLink = page.locator('a[href="/premium"]');
        await expect(premiumLink).toBeVisible();

        // Check that privacy link exists
        const privacyLink = page.locator('a[href="/privacy"]');
        await expect(privacyLink).toBeVisible();
    });

});
