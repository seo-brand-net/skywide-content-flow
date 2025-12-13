import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.setTimeout(60000);
    test('should allow a user to sign in', async ({ page }) => {
        await page.goto('/login');

        // Fill in credentials
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');

        // Click sign in using the stable test ID with force: true to bypass overlays
        await page.getByTestId('sign-in-button').click({ force: true });

        // Expect to be redirected to dashboard with increased timeout
        await expect(page).toHaveURL('/dashboard', { timeout: 20000 });

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

    test('should allow user to log out', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');
        await page.getByTestId('sign-in-button').click({ force: true });
        await expect(page).toHaveURL('/dashboard', { timeout: 20000 });

        // Click Sign Out
        await page.getByTestId('sign-out-button').click({ force: true });

        // Expect to be redirected to login
        await expect(page).toHaveURL('/login');
    });

    test('should redirect unauthenticated access to login', async ({ page }) => {
        // Try to go to dashboard without logging in
        await page.goto('/dashboard');
        await expect(page).toHaveURL('/login');
    });

    test('should persist session on reload', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.getByLabel('Email').fill('samuel@seobrand.net');
        await page.getByLabel('Password').fill('Farrahdc12@');
        await page.getByTestId('sign-in-button').click({ force: true });
        await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

        // Reload page
        await page.reload();

        // Should still be on dashboard
        await expect(page).toHaveURL('/dashboard');
    });
});
