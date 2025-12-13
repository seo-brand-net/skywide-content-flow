import { test, expect } from '@playwright/test';

async function login(page: any) {
    await page.goto('/login');
    const email = process.env.TEST_EMAIL || 'samuel@seobrand.net';
    const password = process.env.TEST_PASSWORD || 'Farrahdc12@';

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });
    await page.waitForURL(/dashboard/i, { timeout: 20000 });
}

test.describe('Settings Page', () => {
    test.setTimeout(60000);
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/settings');
    });

    test('loads successfully', async ({ page }) => {
        // Using text match to be safer if semantic heading is missing or different level
        await expect(page.getByText(/settings/i).first()).toBeVisible();
        await expect(page.getByText(/coming soon/i).first()).toBeVisible();
    });
});
