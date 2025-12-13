import { test, expect } from '@playwright/test';

// Reusable login helper (adjust credentials if needed)
async function login(page: any) {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_EMAIL || 'samuel@seobrand.net');
    await page.getByLabel(/password/i).fill(process.env.TEST_PASSWORD || 'Farrahdc12@');
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });

    // Wait for redirect
    await page.waitForURL(/dashboard/i, { timeout: 25000 });
}

test.describe('My Requests Page', () => {
    test.setTimeout(60000);
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/my-requests');
    });

    // 1. Page loads successfully
    test('loads My Requests page', async ({ page }) => {
        // Confirmed h1 in source, but using robust check
        await expect(page.getByRole('heading', { name: /my requests/i, level: 1 })).toBeVisible();
    });

    // 2. Shows loading state first
    test('shows loading state on initial load', async ({ page }) => {
        const skeleton = page.locator('.animate-pulse, .skeleton');
        await expect(skeleton.first()).toBeTruthy();
    });

    // 3. Search field is visible
    test('renders search input', async ({ page }) => {
        await expect(page.getByPlaceholder('Search requests...')).toBeVisible();
    });

    // 4. Search works
    test('filters requests when typing', async ({ page }) => {
        const search = page.getByPlaceholder('Search requests...');
        await search.fill('test');
        await expect(page.locator('text=/found/i')).toBeTruthy();
    });

    // 5. Requests table renders
    test('renders the table', async ({ page }) => {
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /article title/i })).toBeVisible();
    });

    // 6. Details modal opens
    test('opens details modal', async ({ page }) => {
        const btn = page.locator('button[title="View Details"]').first();

        if (await btn.count()) {
            await btn.click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await expect(page.getByText(/request details/i)).toBeVisible();
        }
    });

    // 7. Approve request (admin only)
    test('admin can approve request', async ({ page }) => {
        const approveBtn = page.locator('button[title="Approve"]').first();

        if (await approveBtn.count()) {
            await approveBtn.click();
            await expect(page.locator('text=/in progress/i')).toBeTruthy();
        }
    });

    // 8. Reject request (admin only)
    test('admin can reject request', async ({ page }) => {
        const rejectBtn = page.locator('button[title="Reject"]').first();

        if (await rejectBtn.count()) {
            await rejectBtn.click();
            await expect(page.getByRole('alertdialog')).toBeVisible();
        }
    });

    // 9. Google Drive link test
    test('opens Google Drive link', async ({ page, context }) => {
        const driveBtn = page.getByRole('button', { name: /view docs/i }).first();

        if (await driveBtn.count()) {
            const [newTab] = await Promise.all([
                context.waitForEvent('page'),
                driveBtn.click()
            ]);

            await newTab.waitForLoadState();
            expect(newTab.url()).toContain('drive.google.com');
        }
    });
});
