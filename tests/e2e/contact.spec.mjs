// Contact form: the Formspree POST is intercepted so tests never hit the
// network. Success shows a thank-you; failure falls back to the direct email.
import { test, expect } from '@playwright/test';

const FALLBACK_EMAIL = 'peterson.cody16@gmail.com';

async function fillForm(page) {
    await page.locator('#contactName').fill('Test User');
    await page.locator('#contactEmail').fill('test@example.com');
    await page.locator('#contactMessage').fill('Hello, this is an automated Playwright test message.');
}

test.describe('contact form', () => {
    test('successful submission shows the thank-you status', async ({ page }) => {
        await page.route('**/formspree.io/**', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        }));

        await page.goto('/contact.html');
        await fillForm(page);
        await page.locator('#contactForm button[type="submit"]').click();

        const status = page.locator('#formStatus');
        await expect(status).toBeVisible();
        await expect(status).toContainText('Thanks');
    });

    test('failed submission falls back to the direct email address', async ({ page }) => {
        await page.route('**/formspree.io/**', route => route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' }),
        }));

        await page.goto('/contact.html');
        await fillForm(page);
        await page.locator('#contactForm button[type="submit"]').click();

        const status = page.locator('#formStatus');
        await expect(status).toBeVisible();
        await expect(status).toContainText(FALLBACK_EMAIL);
    });

    test('direct mailto link is visible', async ({ page }) => {
        await page.goto('/contact.html');
        await expect(
            page.locator(`a[href="mailto:${FALLBACK_EMAIL}"]`).first()
        ).toBeVisible();
    });
});
