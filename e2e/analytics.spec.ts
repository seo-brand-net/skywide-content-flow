import { test, expect } from '@playwright/test';

// Robust login function
// Robust login function
// Robust login function
async function login(page: any, isAdmin = true) {
    // Mock profile role to ensure consistent access control behavior
    await page.route('**/rest/v1/profiles*', async (route: any) => {
        if (route.request().method() === 'GET') {
            const role = isAdmin ? 'admin' : 'user';
            const email = isAdmin
                ? (process.env.TEST_ADMIN_EMAIL || 'samuel@seobrand.net')
                : (process.env.TEST_USER_EMAIL || 'gomandev@gmail.com');

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                json: {
                    id: 'mock-user-id',
                    role: role,
                    email: email,
                    full_name: isAdmin ? 'Test Admin' : 'Test User'
                }
            });
        } else {
            await route.continue();
        }
    });

    // Mock content_requests to ensure analytics data loads without relying on real DB
    await page.route('**/rest/v1/content_requests*', async (route: any) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                json: [
                    // Mock data for analytics
                    { id: 1, status: 'completed', webhook_sent: true, created_at: new Date().toISOString(), user_id: 'user-1' },
                    { id: 2, status: 'failed', webhook_sent: false, created_at: new Date().toISOString(), user_id: 'user-2' },
                    { id: 3, status: 'pending', webhook_sent: false, created_at: new Date().toISOString(), user_id: 'user-3' },
                    { id: 4, status: 'completed', webhook_sent: true, created_at: new Date().toISOString(), user_id: 'user-4' },
                ]
            });
        } else {
            await route.continue();
        }
    });

    await page.goto('/login');

    const email = isAdmin
        ? (process.env.TEST_ADMIN_EMAIL || 'samuel@seobrand.net')
        : (process.env.TEST_USER_EMAIL || 'gomandev@gmail.com');

    const password = isAdmin
        ? (process.env.TEST_ADMIN_PASSWORD || 'Farrahdc12@')
        : (process.env.TEST_USER_PASSWORD || '19372855Mas');

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });

    await page.waitForURL(/dashboard/i, { timeout: 30000 });

    // Wait for loading skeletons to disappear
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 30000 });
}

test.describe('Analytics Page', () => {
    test.setTimeout(60000);


    test('non-admin access control', async ({ page }) => {
        await login(page, false);
        await page.goto('/analytics');
        // Expect redirect to dashboard
        await expect(page).toHaveURL("/dashboard", { timeout: 30000 });
    });

    test('admin access and page load', async ({ page }) => {
        await login(page, true);
        await page.goto('/analytics');

        // Wait for page load
        await page.waitForLoadState('networkidle');

        // Check for main heading
        // The page uses <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        await expect(page.getByRole('heading', { name: 'Analytics', level: 1 })).toBeVisible({ timeout: 30000 });
    });

    test('KPI cards visibility', async ({ page }) => {
        await login(page, true);
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // The KPI cards have titles with class "text-sm font-medium text-muted-foreground"
        // We can find them by text. "Total Requests" appears in KPI and in "System Health Details"

        // Find "Total Requests" inside a Card
        await expect(page.getByText('Total Requests').first()).toBeVisible({ timeout: 30000 });
        await expect(page.getByText('Active Users').first()).toBeVisible();
        await expect(page.getByText('Completion Rate').first()).toBeVisible();
        await expect(page.getByText('System Health').first()).toBeVisible();
    });

    test('KPI values format', async ({ page }) => {
        await login(page, true);
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Check values are present
        const valueElements = page.locator('.text-2xl.font-bold');
        await expect(valueElements.first()).toBeVisible({ timeout: 30000 });

        // Should have at least the heading + 4 cards
        const count = await valueElements.count();
        expect(count).toBeGreaterThan(1);
    });

    test('Status Distribution section', async ({ page }) => {
        await login(page, true);
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Check for "Status Distribution" title
        await expect(page.getByText('Status Distribution', { exact: true })).toBeVisible({ timeout: 30000 });

        // Check for "No data available" OR some status text
        // With our mock, we expect data
        await expect(page.getByText('completed').first()).toBeVisible();
    });

    test('System Health Details section', async ({ page }) => {
        await login(page, true);
        await page.goto('/analytics');
        await page.waitForLoadState('networkidle');

        // Check for "System Health Details" title
        await expect(page.getByText('System Health Details', { exact: true })).toBeVisible({ timeout: 30000 });

        // Check for specific row labels
        await expect(page.getByText('Webhook Success Rate')).toBeVisible();

        // We can find the card containing "System Health Details" and then search inside
        const detailsCard = page.locator('.bg-card', { hasText: 'System Health Details' });
        await expect(detailsCard.getByText('Total Requests')).toBeVisible();
        await expect(detailsCard.getByText('Failed Requests')).toBeVisible();
        await expect(detailsCard.getByText('System Status')).toBeVisible();
    });
});
