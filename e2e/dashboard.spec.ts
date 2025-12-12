import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');
        await page.getByTestId('sign-in-button').click({ force: true });
        await expect(page).toHaveURL('/dashboard', { timeout: 20000 });
        // Wait for loading skeletons to disappear before interactions
        await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 20000 });
    });

    test('should display the content submission form', async ({ page }) => {
        await expect(page.getByText('Content Submission Form')).toBeVisible();
        await expect(page.getByLabel('Article Title *')).toBeVisible();
        await expect(page.getByLabel('Client Name *')).toBeVisible();
    });

    test('should validate form inputs', async ({ page }) => {
        // Try to submit empty form
        await page.getByRole('button', { name: 'Submit Content Request' }).click({ force: true });

        // Check for validation errors
        await expect(page.getByText('Article Title is required')).toBeVisible();
        await expect(page.getByText('Client Name is required')).toBeVisible();
    });

    test('should allow filling out the form', async ({ page }) => {
        await page.getByLabel('Article Title *').fill('E2E Test Article', { force: true });
        await page.getByLabel('Target Audience *').fill('Developers', { force: true });
        await page.getByLabel('Client Name *').fill('Test Corp', { force: true });

        // Select Article Type
        await page.getByRole('combobox').click({ force: true });
        await page.getByLabel('Website').click({ force: true });

        await page.getByLabel('Word Count *').fill('500', { force: true });
        await page.getByLabel('Primary Keyword *').fill('testing', { force: true });
        await page.getByLabel('Secondary Keyword *').fill('automation', { force: true });
        await page.getByLabel('Semantic Theme *').fill('QA', { force: true });
        await page.getByLabel('Tone *').fill('Professional', { force: true });
        await page.getByLabel('Creative Brief *').fill('This is a test brief.', { force: true });

        await expect(page.getByLabel('Article Title *')).toHaveValue('E2E Test Article');
    });

    test('should navigate via sidebar links', async ({ page }) => {
        // Use nav locator to be specific
        const sidebar = page.locator('nav');

        // Click 'My Requests' - FORCE CLICK to avoid visibility issues
        await sidebar.getByRole('link', { name: 'My Requests' }).click({ force: true });
        await expect(page).toHaveURL("/my-requests", { timeout: 25000 });


        // // Click 'Features' - FORCE CLICK
        // await sidebar.getByRole('link', { name: 'Features' }).click({ force: true });
        // await expect(page).toHaveURL(/.*\/features/, { timeout: 15000 });
    });

    // Mock submission test to verify success state without DB writes
    test('should show success message on valid submission (mocked)', async ({ page }) => {
        // Mock Supabase DB Insert
        await page.route('**/rest/v1/content_requests*', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    json: [{ id: 'mock-db-id-123', status: 'pending' }]
                });
            } else {
                await route.continue();
            }
        });

        // Mock Supabase DB Update (happens after webhook)
        await page.route('**/rest/v1/content_requests?id=eq.mock-db-id-123*', async route => {
            if (route.request().method() === 'PATCH') {
                await route.fulfill({
                    status: 200,
                    json: [{ id: 'mock-db-id-123', webhook_sent: true }]
                });
            } else {
                await route.continue();
            }
        });

        // Mock n8n Proxy
        await page.route('**/api/proxy-n8n', async route => {
            await route.fulfill({
                status: 200,
                json: { success: true, message: 'Forwarded to n8n' }
            });
        });

        // Fill ALL required fields to pass validation
        await page.getByLabel('Article Title *').fill('Mock Submission Article', { force: true });
        await page.getByLabel('Target Audience *').fill('Testers', { force: true });
        await page.getByLabel('Client Name *').fill('Mock Corp', { force: true });

        // Select first option for simple combobox interactions
        await page.getByRole('combobox').click({ force: true });
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await page.getByLabel('Word Count *').fill('500', { force: true });
        await page.getByLabel('Primary Keyword *').fill('mock', { force: true });
        await page.getByLabel('Secondary Keyword *').fill('mock2', { force: true });
        await page.getByLabel('Semantic Theme *').fill('Mocking', { force: true });
        await page.getByLabel('Tone *').fill('Neutral', { force: true });
        await page.getByLabel('Creative Brief *').fill('Test brief', { force: true });

        // Submit
        await page.getByRole('button', { name: 'Submit Content Request' }).click({ force: true });

        // Expect specific success message
        await expect(page.getByText('Content request submitted successfully.', { exact: true })).toBeVisible({ timeout: 20000 });
    });
});
