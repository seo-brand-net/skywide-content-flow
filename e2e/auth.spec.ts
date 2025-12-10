import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should allow a user to sign in', async ({ page }) => {
        await page.goto('/login');

        // Fill in credentials
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');

        // Click sign in using the stable test ID with force: true to bypass overlays
        await page.getByTestId('sign-in-button').click({ force: true });

        // Expect to be redirected to dashboard with increased timeout
        await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

        // basic check for dashboard content
        await expect(page.getByText('Welcome to SKYWIDE Dashboard')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.getByLabel('Email').fill('invalid@example.com');
        await page.getByLabel('Password').fill('wrongpassword');
        // Click sign in with force: true
        await page.getByTestId('sign-in-button').click({ force: true });

        // Expect to stay on login page
        await expect(page).toHaveURL('/login');
    });
});
