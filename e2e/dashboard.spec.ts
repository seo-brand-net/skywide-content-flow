import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');
        await page.getByTestId('sign-in-button').click({ force: true });
        await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
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
        await page.getByLabel('Website').click({ force: true }); // Assuming 'Website' is an option in the dropdown

        await page.getByLabel('Word Count *').fill('500', { force: true });
        await page.getByLabel('Primary Keyword *').fill('testing', { force: true });
        await page.getByLabel('Secondary Keyword *').fill('automation', { force: true });
        await page.getByLabel('Semantic Theme *').fill('QA', { force: true });
        await page.getByLabel('Tone *').fill('Professional', { force: true });
        await page.getByLabel('Creative Brief *').fill('This is a test brief.', { force: true });

        // We won't submit to avoid creating real data in the DB during every test run
        // unless we have a cleanup mechanism. 
        // For now, checks that we can fill it is enough.
        await expect(page.getByLabel('Article Title *')).toHaveValue('E2E Test Article');
    });
});
