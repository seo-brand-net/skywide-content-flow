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

test.describe('Research Page', () => {
    test.setTimeout(60000);
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/research');
    });

    test('loads successfully', async ({ page }) => {
        // CardTitle might not be a semantic heading, using getByText is safer
        await expect(page.getByText(/website research/i).first()).toBeVisible();
        await expect(page.getByText(/submit a website url/i)).toBeVisible();
    });

    test('renders url input', async ({ page }) => {
        await expect(page.getByLabel(/website url/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /submit research request/i })).toBeVisible();
    });

    test('validates url format', async ({ page }) => {
        await page.getByLabel(/website url/i).fill('invalid-url');
        await page.getByRole('button', { name: /submit research request/i }).click();
        // Expect validation error
        await expect(page.getByText(/please enter a valid url/i)).toBeVisible();
    });

    test('can fill valid url', async ({ page }) => {
        await page.getByLabel(/website url/i).fill('https://example.com');
        // We do not submit to avoid hitting external APIs or backend logic in this simple test suite.
        // Just verifying input interaction works.
        await expect(page.getByLabel(/website url/i)).toHaveValue('https://example.com');
    });
});
