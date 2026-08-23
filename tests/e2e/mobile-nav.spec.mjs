// Mobile hamburger navigation behavior (script.js) at a phone viewport,
// plus the desktop case where the hamburger must be hidden.
import { test, expect } from '@playwright/test';

test.describe('mobile navigation (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('hamburger opens the menu and reports aria-expanded', async ({ page }) => {
        await page.goto('/index.html');
        const hamburger = page.locator('.hamburger');
        const navMenu = page.locator('.nav-menu');

        await expect(hamburger).toBeVisible();
        await expect(hamburger).toHaveAttribute('aria-expanded', 'false');

        await hamburger.click();
        await expect(navMenu).toHaveClass(/active/);
        await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    });

    test('clicking a nav link closes the menu', async ({ page }) => {
        await page.goto('/index.html');
        const hamburger = page.locator('.hamburger');
        const navMenu = page.locator('.nav-menu');

        await hamburger.click();
        await expect(navMenu).toHaveClass(/active/);

        // The Home link points at the current page, so any navigation lands
        // back here; either way the menu must no longer be open.
        await navMenu.getByRole('link', { name: 'Home' }).click();
        await expect(navMenu).not.toHaveClass(/active/);
        await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    test('clicking outside the open menu closes it', async ({ page }) => {
        await page.goto('/index.html');
        const hamburger = page.locator('.hamburger');
        const navMenu = page.locator('.nav-menu');

        await hamburger.click();
        await expect(navMenu).toHaveClass(/active/);

        // Click in the page area below the open menu panel.
        const box = await navMenu.boundingBox();
        const y = Math.min(box.y + box.height + 20, 660);
        await page.mouse.click(187, y);

        await expect(navMenu).not.toHaveClass(/active/);
        await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });
});

test.describe('desktop navigation (1280x800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('hamburger is hidden and nav links are inline', async ({ page }) => {
        await page.goto('/index.html');
        await expect(page.locator('.hamburger')).toBeHidden();
        await expect(page.locator('.nav-menu .nav-link')).toHaveCount(6);
        await expect(page.locator('.nav-menu .nav-link').first()).toBeVisible();
    });
});
