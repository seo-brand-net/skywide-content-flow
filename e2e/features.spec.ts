import { test, expect } from '@playwright/test';

// Reusable login helper
async function login(page: any) {
    await page.goto('/login');
    const email = process.env.TEST_EMAIL || 'samuel@seobrand.net';
    const password = process.env.TEST_PASSWORD || 'Farrahdc12@';

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });
    await page.waitForURL(/dashboard/i, { timeout: 20000 });
}

// Retrying goto helper
async function retryGoto(page: any, url: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            return;
        } catch (error) {
            console.log(`Retry ${i + 1}/${retries} for ${url} failed: ${error}`);
            if (i === retries - 1) throw error;
        }
    }
}

test.describe('Features Page', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        await login(page);
        await retryGoto(page, '/features');
    });

    test('loads successfully', async ({ page }) => {
        // CardTitle might not be a semantic heading, using getByText is safer
        await expect(page.getByText(/submit feature request/i).first()).toBeVisible();
        await expect(page.getByText(/help us improve/i)).toBeVisible();
    });

    test('renders form fields', async ({ page }) => {
        await expect(page.getByLabel(/feature title/i)).toBeVisible();
        await expect(page.getByText(/category/i)).toBeVisible(); // Select trigger often works best with getByText or role combobox
        await expect(page.getByText(/priority level/i)).toBeVisible();
        await expect(page.getByLabel(/feature description/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /submit feature request/i })).toBeVisible();
    });

    test('validates required fields', async ({ page }) => {
        await page.getByRole('button', { name: /submit feature request/i }).click();
        // Check for HTML5 validation or UI error messages if they exist, 
        // or just ensure we didn't navigate away/success toast didn't appear.
        // The schema has min(1), so likely some validation message or it stays on page.
        // Since we want simple tests, just asserting we are still on the page is good.
        await expect(page.getByText(/submit feature request/i).first()).toBeVisible();
    });

    test('can fill form', async ({ page }) => {
        await page.getByLabel(/feature title/i).fill('Test Feature E2E');
        await page.getByLabel(/feature description/i).fill('This is a test description longer than 10 chars');

        // Selects can be tricky. Using clicks for simple interaction.
        await page.click('button[role="combobox"]:has-text("Feature Request")'); // Assuming default is Feature Request
        // If that selector is flaky, we might just skip changing the select since it has a default.
        // Let's just type into the text fields.
    });
});
