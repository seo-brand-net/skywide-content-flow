import { test, expect } from '@playwright/test';

test.describe('Invitation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin before each test
        await page.goto('/login');
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');
        await page.getByTestId('sign-in-button').click({ force: true });
        await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    });

    test('should navigate to invite users page', async ({ page }) => {
        // Navigate to Invite Users page
        await page.getByRole('link', { name: 'Invite Users' }).click();
        await expect(page).toHaveURL('/invite-users');
        await expect(page.getByRole('heading', { name: 'Invite Users' })).toBeVisible();
    });

    test('should validate empty form submission', async ({ page }) => {
        await page.goto('/invite-users');

        // Check that inputs have required attribute, ensuring browser validation is active
        await expect(page.getByLabel('Full Name *')).toHaveAttribute('required', '');
        await expect(page.getByLabel('Email Address *')).toHaveAttribute('required', '');

        // Try to submit empty form
        await page.getByRole('button', { name: 'Send Invitation' }).click({ force: true });

        // Since browser validation blocks submission, we just verify we are still on the same page
        await expect(page).toHaveURL('/invite-users');
    });

    test('should send an invitation successfully', async ({ page }) => {
        await page.goto('/invite-users');

        const testEmail = `e2e-test-${Date.now()}@example.com`;
        const testName = 'E2E Test User';

        await page.getByLabel('Full Name *').fill(testName, { force: true });
        await page.getByLabel('Email Address *').fill(testEmail, { force: true });

        await page.getByRole('button', { name: 'Send Invitation' }).click({ force: true });

        // Expect success toast with exact match to avoid strict mode violation
        await expect(page.getByText('Invitation Sent!', { exact: true })).toBeVisible();

        // Verify the new invitation appears in the table using precise selector
        await expect(page.getByRole('cell', { name: testEmail })).toBeVisible();
    });
});
